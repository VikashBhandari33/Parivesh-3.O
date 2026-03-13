import { Router } from 'express';
import QRCode from 'qrcode';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { auditChainService } from '../services/auditChain';

const router = Router();

const CECB_UPI_ID = 'cecb.cg@sbi';

const verifySchema = z.object({
  utrNumber: z.string().min(12).max(22),
  amount: z.number().positive(),
});

// ─── POST /api/payments/initiate ─────────────────────────────────────────────
router.post('/initiate', authenticate, requireRole(['PROPONENT']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { applicationId } = z.object({ applicationId: z.string().uuid() }).parse(req.body);

    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');
    if (app.proponentId !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Access denied');
    if (app.feePaid) throw new AppError(400, 'ALREADY_PAID', 'Fee already paid');

    // Calculate fee based on sector/area
    const feeAmount = app.feeAmount || calculateFee(app.sector, app.areaHa || 0);

    // Generate UPI QR code
    const upiString = `upi://pay?pa=${CECB_UPI_ID}&pn=CECB+Chhattisgarh&am=${feeAmount.toFixed(2)}&tn=ENV+CLEARANCE+${app.id.slice(0, 8).toUpperCase()}&cu=INR`;
    const qrCodeDataUrl = await QRCode.toDataURL(upiString, { width: 300, margin: 2 });

    // Save or update payment record
    const payment = await prisma.payment.upsert({
      where: { applicationId },
      create: { applicationId, amount: feeAmount, qrCodeUrl: qrCodeDataUrl, upiId: CECB_UPI_ID },
      update: { amount: feeAmount, qrCodeUrl: qrCodeDataUrl },
    });

    await prisma.application.update({
      where: { id: applicationId },
      data: { feeAmount },
    });

    res.json({ success: true, data: { payment, qrCode: qrCodeDataUrl, upiId: CECB_UPI_ID, amount: feeAmount } });
  })
);

// ─── POST /api/payments/verify ────────────────────────────────────────────────
router.post('/verify', authenticate, requireRole(['PROPONENT']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const { applicationId, utrNumber, amount } = z.object({
      applicationId: z.string().uuid(),
      ...verifySchema.shape,
    }).parse(req.body);

    const app = await prisma.application.findUnique({ where: { id: applicationId } });
    if (!app) throw new AppError(404, 'NOT_FOUND', 'Application not found');
    if (app.proponentId !== req.user!.id) throw new AppError(403, 'FORBIDDEN', 'Access denied');

    const payment = await prisma.payment.update({
      where: { applicationId },
      data: { utrNumber, verifiedAt: new Date(), verifiedById: req.user!.id },
    });

    await prisma.application.update({
      where: { id: applicationId },
      data: { feePaid: true },
    });

    await auditChainService.log({
      eventType: 'PAYMENT_SUBMITTED',
      actorId: req.user!.id,
      applicationId,
      payload: { utrNumber, amount },
    });

    res.json({ success: true, data: payment });
  })
);

// ─── GET /api/payments/:applicationId ────────────────────────────────────────
router.get('/:applicationId', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const payment = await prisma.payment.findUnique({
    where: { applicationId: req.params.applicationId },
    include: { verifiedBy: { select: { id: true, name: true } } },
  });

  if (!payment) throw new AppError(404, 'NOT_FOUND', 'Payment record not found');
  res.json({ success: true, data: payment });
}));

// ─── POST /api/payments/:applicationId/approve (scrutiny confirms UTR) ─────────
router.post('/:applicationId/approve', authenticate, requireRole(['SCRUTINY', 'ADMIN']),
  asyncHandler(async (req: AuthenticatedRequest, res) => {
    const payment = await prisma.payment.update({
      where: { applicationId: req.params.applicationId },
      data: { verifiedById: req.user!.id, verifiedAt: new Date() },
    });

    await prisma.application.update({
      where: { id: req.params.applicationId },
      data: { feePaid: true },
    });

    await auditChainService.log({
      eventType: 'PAYMENT_APPROVED',
      actorId: req.user!.id,
      applicationId: req.params.applicationId,
      payload: { utrNumber: payment.utrNumber },
    });

    res.json({ success: true, data: payment });
  })
);

function calculateFee(sector: string, areaHa: number): number {
  const baseFee: Record<string, number> = {
    mining: 25000,
    thermal: 50000,
    industry: 15000,
    infrastructure: 10000,
    river: 20000,
    default: 5000,
  };
  const sectorKey = Object.keys(baseFee).find(k => sector.toLowerCase().includes(k)) || 'default';
  const base = baseFee[sectorKey];
  const areaMultiplier = Math.max(1, Math.floor(areaHa / 100));
  return Math.min(base * areaMultiplier, 500000); // Cap at ₹5 lakh
}

export default router;
