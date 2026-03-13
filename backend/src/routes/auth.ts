import { Router } from 'express';
import jwt from 'jsonwebtoken';
import argon2 from 'argon2';
import { z } from 'zod';
import { prisma } from '../utils/prisma';
import { asyncHandler, AppError } from '../middleware/errorHandler';
import { authenticate, AuthenticatedRequest } from '../middleware/auth';
import { auditChainService } from '../services/auditChain';
import { UserRole } from '@prisma/client';

const router = Router();

// ─── Validation schemas ───────────────────────────────────────────────────────
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(2),
  organization: z.string().optional(),
  phone: z.string().optional(),
  role: z.enum(['PROPONENT', 'SCRUTINY', 'MOM_TEAM']).default('PROPONENT'),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateTokens(user: { id: string; email: string; role: UserRole; name: string }) {
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET!,
    { expiresIn: '15m' }
  );

  const refreshToken = jwt.sign(
    { sub: user.id },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  return { accessToken, refreshToken };
}

// ─── POST /api/auth/register ──────────────────────────────────────────────────
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: User registered successfully
 */
router.post('/register', asyncHandler(async (req, res) => {
  const body = registerSchema.parse(req.body);

  const existing = await prisma.user.findUnique({ where: { email: body.email } });
  if (existing) throw new AppError(409, 'EMAIL_IN_USE', 'Email already registered');

  // Argon2id — memory: 64MB, iterations: 3
  const passwordHash = await argon2.hash(body.password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB
    timeCost: 3,
    parallelism: 4,
  });

  // Admins can only be created by other admins — default to PROPONENT
  const role: UserRole = (body.role as UserRole) || 'PROPONENT';

  const user = await prisma.user.create({
    data: {
      email: body.email,
      passwordHash,
      name: body.name,
      organization: body.organization,
      phone: body.phone,
      role,
    },
    select: { id: true, email: true, name: true, role: true, organization: true, createdAt: true },
  });

  const { accessToken, refreshToken } = generateTokens({ ...user, role: user.role });

  // Write audit entry
  await auditChainService.log({
    eventType: 'USER_REGISTERED',
    actorId: user.id,
    payload: { email: user.email, role: user.role },
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.status(201).json({
    success: true,
    data: { user, accessToken },
  });
}));

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
router.post('/login', asyncHandler(async (req, res) => {
  const body = loginSchema.parse(req.body);

  const user = await prisma.user.findUnique({ where: { email: body.email } });
  if (!user || !user.isActive) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const valid = await argon2.verify(user.passwordHash, body.password);
  if (!valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password');

  const { accessToken, refreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  await auditChainService.log({
    eventType: 'USER_LOGIN',
    actorId: user.id,
    payload: { email: user.email, ip: req.ip },
  });

  res.cookie('refreshToken', refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({
    success: true,
    data: {
      accessToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organization: user.organization,
      },
    },
  });
}));

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
router.post('/refresh', asyncHandler(async (req, res) => {
  const token = req.cookies?.refreshToken;
  if (!token) throw new AppError(401, 'NO_REFRESH_TOKEN', 'Refresh token not found');

  let payload: { sub: string };
  try {
    payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { sub: string };
  } catch {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user || !user.isActive) throw new AppError(401, 'USER_NOT_FOUND', 'User not found');

  const { accessToken, refreshToken: newRefreshToken } = generateTokens({
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
  });

  res.cookie('refreshToken', newRefreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });

  res.json({ success: true, data: { accessToken } });
}));

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
router.post('/logout', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  await auditChainService.log({
    eventType: 'USER_LOGOUT',
    actorId: req.user!.id,
    payload: {},
  });

  res.clearCookie('refreshToken');
  res.json({ success: true, data: { message: 'Logged out successfully' } });
}));

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
router.get('/me', authenticate, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: { id: true, email: true, name: true, role: true, organization: true, phone: true, createdAt: true },
  });

  if (!user) throw new AppError(404, 'USER_NOT_FOUND', 'User not found');
  res.json({ success: true, data: user });
}));

export default router;
