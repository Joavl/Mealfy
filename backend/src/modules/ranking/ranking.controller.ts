import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import * as rankingService from './ranking.service';

/** GET /ranking — público; carrossel de stories e ranking global. */
export async function getTopDonors(_req: Request, res: Response): Promise<Response> {
  const donors = await rankingService.getTopDonors();
  return res.json({ donors });
}

/** GET /ranking/me — posição do doador logado. */
export async function getMyRanking(req: Request, res: Response): Promise<Response> {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  const ranking = await rankingService.getDonorRanking(req.auth.userId);
  return res.json(ranking);
}
