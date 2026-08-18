import type { Request, Response } from 'express';
import { registerSchema, loginSchema } from './auth.validator';
import * as authService from './auth.service';
import { toPublicUser } from '../users/users.dto';

export async function register(req: Request, res: Response): Promise<Response> {
  const data = registerSchema.parse(req.body);
  const { user, token } = await authService.register(data);
  return res.status(201).json({ token, user: toPublicUser(user) });
}

export async function login(req: Request, res: Response): Promise<Response> {
  const data = loginSchema.parse(req.body);
  const { user, token } = await authService.login(data);
  return res.json({ token, user: toPublicUser(user) });
}
