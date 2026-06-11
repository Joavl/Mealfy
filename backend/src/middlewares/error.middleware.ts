import { Request, Response, NextFunction } from 'express';
import { AppError } from '../shared/errors/AppError';
import { ZodError } from 'zod';

export const errorMiddleware = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message,
    });
  }

  if (err instanceof ZodError) {
    return res.status(400).json({
      status: 'error',
      message: 'Validation error',
      issues: err.issues,
    });
  }

  console.error('[Unhandled Error]', err);

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
  });
};
