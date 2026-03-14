import { Router } from 'express';
import { z } from 'zod';
import { ApplicationStatus } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { logger } from '../utils/logger';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { auditChainService } from '../services/auditChain';
import { io } from '../server';
import { generateEdsPdf } from '../services/pdfService';
import { sendSMS } from '../services/smsService';

const router = Router();

// ─── Status transition map ────────────────────────────────────────────────────
const ALLOWED_TRANSITIONS: Record<ApplicationStatus, ApplicationStatus[]> = {
  DRAFT:          ['SUBMITTED'],
  SUBMITTED:      ['UNDER_SCRUTINY'],
  UNDER_SCRUTINY: ['EDS', 'REFERRED'],
  EDS:            ['UNDER_SCRUTINY'],
  REFERRED:       ['MOM_GENERATED'],
  MOM_GENERATED:  ['FINALIZED'],
  FINALIZED:      [],
};

function assertValidTransition(current: ApplicationStatus, next: ApplicationStatus): void {
  const allowed = ALLOWED_TRANSITIONS[current];
  if (!allowed.includes(next)) {
    throw new AppError(
      400,
      'INVALID_STATUS_TRANSITION',
      `Cannot transition from ${current} to ${next}. Allowed: ${allowed.join(', ') || 'none'}`
    );
  }
}

// ─── Schemas ──────────────────────────────────────────────────────────────────
const createApplicationSchema = z.object({
  projectName: z.string().min(3),
  sector: z.string().min(2),
  description: z.string().optional(),
  district: z.string().optional(),
  state: z.string().default('Chhattisgarh'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  areaHa: z.number().positive().optional(),
  investmentCr: z.number().positive().optional(),
  employmentCount: z.number().int().nonnegative().optional(),
  feeAmount: z.number().positive().optional(),
  contactPhone: z.string().optional(),
});

const updateApplicationSchema = createApplicationSchema.partial();

const edsSchema = z.object({
  deficiencies: z.array(z.object({
    field: z.string(),
    reason: z.string(),
    required: z.boolean().default(true),
  })).min(1),
  remarks: z.string().optional(),
});

// ─── GET /api/applications — list (role-filtered) ─────────────────────────────
router.get('/', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { status, page = '1', limit = '20' } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, parseInt(limit));

  const where: Record<string, unknown> = {};

  // Role-based filtering
  if (req.user!.role === 'PROPONENT') {
    where.proponentId = req.user!.id;
  } else if (req.user!.role === 'SCRUTINY') {
    where.status = { in: ['SUBMITTED', 'UNDER_SCRUTINY', 'EDS', 'REFERRED'] };
  } else if (req.user!.role === 'MOM_TEAM') {
    where.status = { in: ['REFERRED', 'MOM_GENERATED', 'FINALIZED'] };
  }

  if (status) where.status = status;

  const [applications, total] = await Promise.all([
    prisma.application.findMany({
      where,
      include: {
        proponent: { select: { id: true, name: true, email: true, organization: true } },
        _count: { select: { documents: true, edsNotices: true } },
      },
      orderBy: { updatedAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
    }),
    prisma.application.count({ where }),
  ]);

  res.json({
    success: true,
    data: applications,
    meta: { total, page: pageNum, limit: limitNum, pages: Math.ceil(total / limitNum) },
  });
}));

// ─── POST /api/applications — create draft ────────────────────────────────────
router.post('/', authenticate, requireRole(['PROPONENT']), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const body = createApplicationSchema.parse(req.body);

  const application = await prisma.application.create({
    data: {
      ...body,
      proponentId: req.user!.id,
      status: 'DRAFT',
    },
    include: {
      proponent: { select: { id: true, name: true, email: true } },
    },
  });

  await auditChainService.log({
    eventType: 'APPLICATION_CREATED',
    actorId: req.user!.id,
    applicationId: application.id,
    payload: { projectName: application.projectName, sector: application.sector },
  });

  res.status(201).json({ success: true, data: application });
}));

// ─── GET /api/applications/:id ────────────────────────────────────────────────
router.get('/:id', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  logger.info(`[DEBUG] Request for application ID: ${req.params.id}`);
  
  const application = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: {
      proponent: { select: { id: true, name: true, email: true, organization: true, phone: true } },
      documents: {
        select: {
          id: true,
          applicationId: true,
          docType: true,
          fileName: true,
          fileUrl: true,
          fileHash: true,
          fileSizeBytes: true,
          mimeType: true,
          ocrText: true,
          verified: true,
          scanned: true,
          uploadedAt: true
        },
        orderBy: { uploadedAt: 'desc' }
      },
      payment: true,
      edsNotices: {
        orderBy: { issuedAt: 'desc' },
        include: { issuedBy: { select: { id: true, name: true } } },
      },
      gisRiskFlags: true,
      auditEvents: {
        orderBy: { createdAt: 'asc' },
        include: { actor: { select: { id: true, name: true, role: true } } },
        take: 50,
      },
    },
  });

  if (!application) {
    logger.warn(`[DEBUG] Application NOT FOUND in DB for ID: ${req.params.id}`);
    const count = await prisma.application.count();
    logger.info(`[DEBUG] Total applications in current DB: ${count}`);
    throw new AppError(404, 'NOT_FOUND', 'Application not found');
  }

  logger.info(`[DEBUG] Application FOUND: ${application.projectName} (Status: ${application.status})`);

  // Access control: proponents can only see their own
  if (req.user!.role === 'PROPONENT' && application.proponentId !== req.user!.id) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied');
  }

  res.json({ success: true, data: application });
}));

// ─── PATCH /api/applications/:id — update draft ───────────────────────────────
router.patch('/:id', authenticate, requireRole(['PROPONENT']), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const body = updateApplicationSchema.parse(req.body);

  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');
  if (app.proponentId !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Access denied');
  if (app.status !== 'DRAFT' && app.status !== 'EDS') {
    throw new AppError(400, 'IMMUTABLE', 'Only DRAFT or EDS applications can be edited');
  }

  const updated = await prisma.application.update({
    where: { id: req.params.id },
    data: body,
  });

  res.json({ success: true, data: updated });
}));

// ─── POST /api/applications/:id/submit ────────────────────────────────────────
router.post('/:id/submit', authenticate, requireRole(['PROPONENT']), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await prisma.application.findUnique({
    where: { id: req.params.id },
    include: { documents: true },
  });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');
  if (app.proponentId !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Access denied');

  assertValidTransition(app.status, 'SUBMITTED');

  /* 
  if (app.documents.length === 0) {
    throw new AppError(400, 'MISSING_DOCUMENTS', 'At least one document must be uploaded before submission');
  }
  */

  const updated = await prisma.application.update({
    where: { id: req.params.id },
    data: { status: 'SUBMITTED', submittedAt: new Date() },
  });

  await auditChainService.log({
    eventType: 'APPLICATION_SUBMITTED',
    actorId: req.user!.id,
    applicationId: app.id,
    payload: { from: 'DRAFT', to: 'SUBMITTED' },
  });

  io.to(`application:${app.id}`).emit('status:changed', { applicationId: app.id, status: 'SUBMITTED' });

  res.json({ success: true, data: updated });
}));

// ─── POST /api/applications/:id/start-scrutiny ────────────────────────────────
router.post('/:id/start-scrutiny', authenticate, requireRole(['SCRUTINY', 'ADMIN']), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');

  assertValidTransition(app.status, 'UNDER_SCRUTINY');

  const updated = await prisma.application.update({
    where: { id: req.params.id },
    data: {
      status: 'UNDER_SCRUTINY',
      slaDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    },
  });

  await auditChainService.log({
    eventType: 'SCRUTINY_STARTED',
    actorId: req.user!.id,
    applicationId: app.id,
    payload: { from: 'SUBMITTED', to: 'UNDER_SCRUTINY' },
  });

  io.to(`application:${app.id}`).emit('status:changed', { applicationId: app.id, status: 'UNDER_SCRUTINY' });
  res.json({ success: true, data: updated });
}));

// ─── POST /api/applications/:id/eds ───────────────────────────────────────────
router.post('/:id/eds', authenticate, requireRole(['SCRUTINY', 'ADMIN']), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const body = edsSchema.parse(req.body);
  const app = await prisma.application.findUnique({ 
    where: { id: req.params.id },
    include: { proponent: true }
  });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');

  assertValidTransition(app.status, 'EDS');

  const pdfUrl = await generateEdsPdf(
    app.id,
    app.projectName,
    app.proponent?.name || 'Proponent',
    body.deficiencies,
    body.remarks
  );

  const [updated, notice] = await prisma.$transaction([
    prisma.application.update({
      where: { id: req.params.id },
      data: { status: 'EDS' },
    }),
    prisma.edsNotice.create({
      data: {
        applicationId: app.id,
        deficiencies: body.deficiencies,
        issuedById: req.user!.id,
        remarks: body.remarks,
        pdfUrl: pdfUrl,
      },
    }),
  ]);

  await auditChainService.log({
    eventType: 'EDS_ISSUED',
    actorId: req.user!.id,
    applicationId: app.id,
    payload: { deficiencyCount: body.deficiencies.length },
  });

  io.to(`application:${app.id}`).emit('status:changed', { applicationId: app.id, status: 'EDS' });
  io.to(`user:${app.proponentId}`).emit('notification', { type: 'EDS', applicationId: app.id });

  if (app.proponent?.phone) {
    await sendSMS(
      app.proponent.phone,
      `URGENT: An Essential Details Sought (EDS) Notice has been issued for your project "${app.projectName}". Please login to CECB portal to download the EDS PDF and resubmit.`
    );
  }

  res.json({ success: true, data: { application: updated, notice } });
}));

// ─── POST /api/applications/:id/refer ────────────────────────────────────────
router.post('/:id/refer', authenticate, requireRole(['SCRUTINY', 'ADMIN']), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');

  assertValidTransition(app.status, 'REFERRED');

  const updated = await prisma.application.update({
    where: { id: req.params.id },
    data: { status: 'REFERRED' },
  });

  await auditChainService.log({
    eventType: 'APPLICATION_REFERRED',
    actorId: req.user!.id,
    applicationId: app.id,
    payload: { from: 'UNDER_SCRUTINY', to: 'REFERRED' },
  });

  // Trigger AI gist generation via Bull queue
  const { gistQueue } = await import('../services/gistQueue');
  await gistQueue.add({ applicationId: app.id }, { attempts: 3, backoff: { type: 'exponential', delay: 2000 } });

  io.to(`application:${app.id}`).emit('status:changed', { applicationId: app.id, status: 'REFERRED' });

  res.json({ success: true, data: updated });
}));

// ─── POST /api/applications/:id/finalize ──────────────────────────────────────
router.post('/:id/finalize', authenticate, requireRole(['MOM_TEAM', 'ADMIN']), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await prisma.application.findUnique({ 
    where: { id: req.params.id },
    include: { proponent: true }
  });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');

  assertValidTransition(app.status, 'FINALIZED');

  if (!app.momText) throw new AppError(400, 'MISSING_MOM', 'MoM text must be set before finalizing');

  const updated = await prisma.application.update({
    where: { id: req.params.id },
    data: { status: 'FINALIZED', momLocked: true, momLockedAt: new Date() },
  });

  await auditChainService.log({
    eventType: 'MOM_FINALIZED',
    actorId: req.user!.id,
    applicationId: app.id,
    payload: { from: 'MOM_GENERATED', to: 'FINALIZED' },
  });

  io.to(`application:${app.id}`).emit('status:changed', { applicationId: app.id, status: 'FINALIZED' });
  io.to(`user:${app.proponentId}`).emit('notification', { type: 'FINALIZED', applicationId: app.id });

  if (app.proponent?.phone) {
    await sendSMS(
      app.proponent.phone,
      `CONGRATULATIONS! Your application for "${app.projectName}" has been officially FINALIZED and approved. Please log in to download the clearance certificate.`
    );
  }

  res.json({ success: true, data: updated });
}));

// ─── POST /api/applications/:id/resubmit (EDS → UNDER_SCRUTINY) ────────────────
router.post('/:id/resubmit', authenticate, requireRole(['PROPONENT']), asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await prisma.application.findUnique({ where: { id: req.params.id } });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');
  if (app.proponentId !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Access denied');

  assertValidTransition(app.status, 'UNDER_SCRUTINY');

  await prisma.edsNotice.updateMany({
    where: { applicationId: app.id, resolvedAt: null },
    data: { resolvedAt: new Date() },
  });

  const updated = await prisma.application.update({
    where: { id: req.params.id },
    data: { status: 'UNDER_SCRUTINY' },
  });

  await auditChainService.log({
    eventType: 'APPLICATION_RESUBMITTED',
    actorId: req.user!.id,
    applicationId: app.id,
    payload: { from: 'EDS', to: 'UNDER_SCRUTINY' },
  });

  io.to(`application:${app.id}`).emit('status:changed', { applicationId: app.id, status: 'UNDER_SCRUTINY' });

  res.json({ success: true, data: updated });
}));

export default router;
