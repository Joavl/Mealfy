import type { NextFunction, Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { getDirectPixReadiness } from './readiness.service';

export async function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
    if (!(await getDirectPixReadiness(req.auth.userId)).ready) {
      throw new AppError('Confirme seu e-mail antes de continuar no Pix direto.', 403, 'email_not_verified');
    }
    next();
  } catch (error) { next(error); }
}
