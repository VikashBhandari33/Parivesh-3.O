import { Router } from 'express';
import { z } from 'zod';
import { UserRole } from '@prisma/client';
import { prisma } from '../utils/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { auditChainService } from '../services/auditChain';

const router = Router();

// Apply auth + ADMIN role to all admin routes
router.use(authenticate, requireRole(['ADMIN']));

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
router.get('/users', asyncHandler(async (_req, res) => {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, organization: true, isActive: true, createdAt: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json({ success: true, data: users });
}));

// ─── PATCH /api/admin/users/:id/role ─────────────────────────────────────────
router.patch('/users/:id/role', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const { role } = z.object({ role: z.nativeEnum(UserRole) }).parse(req.body);

  const user = await prisma.user.update({
    where: { id: req.params.id },
    data: { role },
    select: { id: true, email: true, name: true, role: true },
  });

  await auditChainService.log({
    eventType: 'USER_ROLE_CHANGED',
    actorId: req.user!.id,
    payload: { targetUserId: req.params.id, newRole: role },
  });

  res.json({ success: true, data: user });
}));

// ─── PATCH /api/admin/users/:id/toggle ───────────────────────────────────────
router.patch('/users/:id/toggle', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.params.id } });
  if (!user) throw new AppError(404, 'NOT_FOUND', 'User not found');

  const updated = await prisma.user.update({
    where: { id: req.params.id },
    data: { isActive: !user.isActive },
    select: { id: true, email: true, name: true, isActive: true },
  });

  await auditChainService.log({
    eventType: updated.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
    actorId: req.user!.id,
    payload: { targetUserId: req.params.id },
  });

  res.json({ success: true, data: updated });
}));

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
router.get('/stats', asyncHandler(async (_req, res) => {
  const [
    totalApplications,
    byStatus,
    totalUsers,
    byRole,
    recentApplications,
  ] = await Promise.all([
    prisma.application.count(),
    prisma.application.groupBy({ by: ['status'], _count: { status: true } }),
    prisma.user.count(),
    prisma.user.groupBy({ by: ['role'], _count: { role: true } }),
    prisma.application.findMany({
      take: 5,
      orderBy: { createdAt: 'desc' },
      include: { proponent: { select: { name: true } } },
    }),
  ]);

  res.json({
    success: true,
    data: {
      totalApplications,
      byStatus: Object.fromEntries(byStatus.map((s) => [s.status, s._count.status])),
      totalUsers,
      byRole: Object.fromEntries(byRole.map((r) => [r.role, r._count.role])),
      recentApplications,
    },
  });
}));

// ─── GET/POST /api/admin/templates ───────────────────────────────────────────
router.get('/templates', asyncHandler(async (_req, res) => {
  const templates = await prisma.momTemplate.findMany({ where: { isActive: true } });
  res.json({ success: true, data: templates });
}));

router.post('/templates', asyncHandler(async (req: AuthenticatedRequest, res) => {
  const body = z.object({ name: z.string(), sector: z.string().optional(), content: z.string() }).parse(req.body);
  const template = await prisma.momTemplate.create({ data: body });
  res.status(201).json({ success: true, data: template });
}));

export default router;
