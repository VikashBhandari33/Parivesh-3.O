import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { auditChainService } from '../services/auditChain';
import { aiAuditService } from '../services/aiAuditService';
import { PQCManager } from '../utils/pqc';

const router = Router();

// ─── Local storage (fallback when S3 not configured) ─────────────────────────
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(400, 'INVALID_FILE_TYPE', 'Only PDF, images, and Word documents are allowed'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const docTypeSchema = z.enum(['FORM_1', 'FORM_1A', 'ENVIRONMENTAL_IMPACT_ASSESSMENT',
  'PRE_FEASIBILITY_REPORT', 'MAP_TOPOSHEET', 'FOREST_CLEARANCE', 'WATER_CONSENT', 'NOC', 'OTHER']);

// ─── POST /api/documents/:applicationId — upload ──────────────────────────────
router.post('/:applicationId', authenticate, requireRole(['PROPONENT']),
  upload.single('file'),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    if (!req.file) throw new AppError(400, 'NO_FILE', 'No file uploaded');

    const { applicationId } = req.params;
    const docType = docTypeSchema.parse(req.body.docType || 'OTHER');

    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');
    if (app.proponentId !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Access denied');

    // Compute file hash (SHA256)
    const fileBuffer = fs.readFileSync(req.file.path);
    const fileHash = crypto.createHash('sha256').update(fileBuffer).digest('hex');

    // ClamAV stub — in production, scan with node-clamav
    const scanResult = await stubClamAVScan(req.file.path);
    if (!scanResult.clean) {
      fs.unlinkSync(req.file.path);
      throw new AppError(400, 'VIRUS_DETECTED', 'File failed security scan');
    }

    const fileUrl = process.env.USE_LOCAL_STORAGE === 'true'
      ? `/uploads/${req.file.filename}`
      : req.file.path; // In production: upload to S3 and return URL

    // Generate PQC hybrid keys and create a post-quantum signature of the fileHash
    const { publicKey: pqcPublicKey, privateKey } = await PQCManager.generateKyberKeyPair();
    const pqcSignature = await PQCManager.signDocument(fileHash, privateKey);

    const document = await prisma.document.create({
      data: {
        applicationId,
        docType,
        fileName: req.file.originalname,
        fileUrl,
        fileHash,
        fileSizeBytes: req.file.size,
        mimeType: req.file.mimetype,
        scanned: true,
        pqcSignature,
        pqcPublicKey,
      },
    });

    await auditChainService.log({
      eventType: 'DOCUMENT_UPLOADED',
      actorId: req.user!.id,
      applicationId,
      payload: { docType, fileName: req.file.originalname, fileHash },
    });

    res.status(201).json({ success: true, data: document });
  })
);

// ─── GET /api/documents/:applicationId — list ─────────────────────────────────
router.get('/:applicationId', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await prisma.application.findUnique({ where: { id: req.params.applicationId } });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');
  if (req.user!.role === 'PROPONENT' && app.proponentId !== req.user!.id) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied');
  }

  const documents = await prisma.document.findMany({
    where: { applicationId: req.params.applicationId },
    orderBy: { uploadedAt: 'desc' },
  });

  res.json({ success: true, data: documents });
}));

// ─── DELETE /api/documents/:docId ─────────────────────────────────────────────
router.delete('/:docId', authenticate, requireRole(['PROPONENT', 'ADMIN']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const doc = await prisma.document.findUnique({
      where: { id: req.params.docId },
      include: { application: true },
    });
    if (!doc) throw new AppError(404, 'NOT_FOUND', 'Document not found');

    if (req.user!.role === 'PROPONENT' && doc.application.proponentId !== req.user!.id) {
      throw new AppError(403, 'FORBIDDEN', 'Access denied');
    }
    if (doc.application.status !== 'DRAFT' && doc.application.status !== 'EDS') {
      throw new AppError(400, 'IMMUTABLE', 'Documents cannot be deleted after submission');
    }

    // Delete file from disk
    const filePath = path.join(UPLOAD_DIR, path.basename(doc.fileUrl));
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await prisma.document.delete({ where: { id: req.params.docId } });

    res.json({ success: true, data: { message: 'Document deleted' } });
  })
);

// ─── PATCH /api/documents/:docId/verify ───────────────────────────────────────
router.patch('/:docId/verify', authenticate, requireRole(['SCRUTINY', 'ADMIN']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const doc = await prisma.document.findUnique({ where: { id: req.params.docId } });
    if (!doc) throw new AppError(404, 'NOT_FOUND', 'Document not found');

    const updated = await prisma.document.update({
      where: { id: req.params.docId },
      data: { verified: true },
    });

    await auditChainService.log({
      eventType: 'DOCUMENT_VERIFIED',
      actorId: req.user!.id,
      applicationId: doc.applicationId,
      payload: { docId: doc.id, docType: doc.docType },
    });

    res.json({ success: true, data: updated });
  })
);

// ─── POST /api/documents/:docId/ai-audit ─────────────────────────────────────
router.post('/:docId/ai-audit', authenticate, requireRole(['SCRUTINY', 'ADMIN']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { docId } = req.params;
    const result = await aiAuditService.auditDocument(docId);
    
    if (!result) {
      throw new AppError(500, 'AI_AUDIT_FAILED', 'AI document audit failed or no data available');
    }

    res.json({ success: true, data: result });
  })
);

// ─── ClamAV stub ──────────────────────────────────────────────────────────────
async function stubClamAVScan(_filePath: string): Promise<{ clean: boolean }> {
  // TODO: Replace with actual ClamAV scan:
  // const clamscan = new NodeClam().init({ clamdscan: { host: process.env.CLAMAV_HOST } });
  // const { isInfected } = await clamscan.scanFile(filePath);
  // return { clean: !isInfected };
  return { clean: true };
}

export default router;
