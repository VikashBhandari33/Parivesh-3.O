import { Router } from 'express';
import { prisma } from '../utils/prisma';
import { asyncHandler } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// ─── GET /api/notifications ───────────────────────────────────────────────────
router.get('/', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user!.id },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const unreadCount = await prisma.notification.count({
    where: { userId: req.user!.id, read: false },
  });

  res.json({ success: true, data: notifications, meta: { unreadCount } });
}));

// ─── PATCH /api/notifications/:id/read ────────────────────────────────────────
router.patch('/:id/read', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const notification = await prisma.notification.updateMany({
    where: { id: req.params.id, userId: req.user!.id },
    data: { read: true },
  });

  res.json({ success: true, data: { updated: notification.count } });
}));

// ─── PATCH /api/notifications/read-all ────────────────────────────────────────
router.patch('/read-all', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await prisma.notification.updateMany({
    where: { userId: req.user!.id, read: false },
    data: { read: true },
  });

  res.json({ success: true, data: { message: 'All notifications marked as read' } });
}));

export default router;
