import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { auditChainService } from '../services/auditChain';

const router = Router();

// ─── GET /api/audit/:applicationId ───────────────────────────────────────────
router.get('/:applicationId', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const app = await prisma.application.findUnique({ where: { id: req.params.applicationId } });
  if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');

  if (req.user!.role === 'PROPONENT' && app.proponentId !== req.user!.id) {
    throw new AppError(403, 'FORBIDDEN', 'Access denied');
  }

  const events = await prisma.auditChain.findMany({
    where: { applicationId: req.params.applicationId },
    include: { actor: { select: { id: true, name: true, role: true } } },
    orderBy: { createdAt: 'asc' },
  });

  res.json({ success: true, data: events, meta: { total: events.length } });
}));

// ─── GET /api/audit/verify ────────────────────────────────────────────────────
router.get('/chain/verify', authenticate, requireRole(['ADMIN']),
  asyncHandler(async (_req, res) => {
    const result = await auditChainService.verify();
    res.json({
      success: true,
      data: {
        ...result,
        message: result.valid
          ? 'Blockchain audit chain integrity verified — no tampering detected'
          : `Chain integrity BROKEN at entry ID: ${result.brokenAt}`,
      },
    });
  })
);

export default router;
