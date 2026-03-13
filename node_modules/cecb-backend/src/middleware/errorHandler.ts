import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../utils/logger';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public error: string,
    message: string
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<unknown>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  logger.error(err.message, { stack: err.stack });

  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.error,
      message: err.message,
    });
    return;
  }

  if (err instanceof ZodError) {
    res.status(422).json({
      success: false,
      error: 'VALIDATION_ERROR',
      message: 'Request validation failed',
      details: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  // Prisma errors
  if ((err as { code?: string }).code === 'P2002') {
    res.status(409).json({
      success: false,
      error: 'CONFLICT',
      message: 'A record with this data already exists',
    });
    return;
  }

  if ((err as { code?: string }).code === 'P2025') {
    res.status(404).json({
      success: false,
      error: 'NOT_FOUND',
      message: 'Record not found',
    });
    return;
  }

  // Generic
  res.status(500).json({
    success: false,
    error: 'INTERNAL_SERVER_ERROR',
    message: process.env.NODE_ENV === 'production' ? 'An unexpected error occurred' : err.message,
  });
}
