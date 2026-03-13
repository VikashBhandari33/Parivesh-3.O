import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../utils/prisma';
import { UserRole } from '@prisma/client';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
    name: string;
  };
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Access token required' });
      return;
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET not configured');

    const payload = jwt.verify(token, secret) as { sub: string; email: string; role: UserRole; name: string };

    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      name: payload.name,
    };

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, error: 'TOKEN_EXPIRED', message: 'Token has expired' });
    } else if (err instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ success: false, error: 'INVALID_TOKEN', message: 'Invalid access token' });
    } else {
      next(err);
    }
  }
}

export function requireRole(roles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'UNAUTHORIZED', message: 'Authentication required' });
      return;
    }

    if (!roles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        error: 'FORBIDDEN',
        message: `Access restricted to: ${roles.join(', ')}`,
      });
      return;
    }

    next();
  };
}

export function optionalAuth(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    next();
    return;
  }

  try {
    const secret = process.env.JWT_SECRET!;
    const payload = jwt.verify(token, secret) as { sub: string; email: string; role: UserRole; name: string };
    req.user = { id: payload.sub, email: payload.email, role: payload.role, name: payload.name };
  } catch {
    // ignore — optional
  }

  next();
}
