import type { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { AppError } from '../errors/AppError';

/** Exige um Bearer token válido e popula req.auth. */
export function authGuard(req: Request, _res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    throw new AppError('Não autenticado', 401, 'unauthenticated');
  }
  const token = header.slice('Bearer '.length).trim();
  const payload = verifyToken(token);
  req.auth = { userId: payload.sub, role: payload.role };
  next();
}
