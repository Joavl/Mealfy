import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { getDirectPixReadiness } from './readiness.service';

export async function getReadiness(req: Request, res: Response): Promise<Response> {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  return res.json(await getDirectPixReadiness(req.auth.userId));
}
