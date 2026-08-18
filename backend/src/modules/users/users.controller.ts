import type { Request, Response } from 'express';
import { z } from 'zod';
import * as usersService from './users.service';
import { toPublicUser } from './users.dto';
import { AppError } from '../../shared/errors/AppError';

const updateMeSchema = z.object({
  name: z.string().min(2).optional(),
  avatarUrl: z.string().url().nullable().optional(),
  instagram: z.string().max(60).nullable().optional(),
  phone: z.string().max(30).nullable().optional(),
});

export async function getMe(req: Request, res: Response): Promise<Response> {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  const user = await usersService.getUserById(req.auth.userId);
  return res.json({ user: toPublicUser(user) });
}

export async function updateMe(req: Request, res: Response): Promise<Response> {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  const data = updateMeSchema.parse(req.body);
  const user = await usersService.updateUser(req.auth.userId, data);
  return res.json({ user: toPublicUser(user) });
}

const updatePrivacySchema = z.object({
  showOnRanking: z.boolean().optional(),
  showInstagram: z.boolean().optional(),
  anonymousMode: z.boolean().optional(),
});

export async function updatePrivacy(req: Request, res: Response): Promise<Response> {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  const data = updatePrivacySchema.parse(req.body);
  const user = await usersService.updatePrivacy(req.auth.userId, data);
  return res.json({ user: toPublicUser(user) });
}

/** DELETE /me — exclusão de conta pelo próprio usuário (Play Store/LGPD). */
export async function deleteMe(req: Request, res: Response): Promise<Response> {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  await usersService.deleteUser(req.auth.userId);
  return res.json({ message: 'Conta excluída com sucesso.' });
}
