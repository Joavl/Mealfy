import type { Request, Response } from 'express';
import {
  registerSchema, loginSchema, emailVerificationRequestSchema, emailVerificationConfirmSchema,
  passwordResetRequestSchema, passwordResetConfirmSchema,
} from './auth.validator';
import * as authService from './auth.service';
import { toPublicUser } from '../users/users.dto';

export async function register(req: Request, res: Response): Promise<Response> {
  const { user, token } = await authService.register(registerSchema.parse(req.body));
  return res.status(201).json({ token, user: toPublicUser(user) });
}

export async function login(req: Request, res: Response): Promise<Response> {
  const { user, token } = await authService.login(loginSchema.parse(req.body));
  return res.json({ token, user: toPublicUser(user) });
}

export async function requestEmailVerification(req: Request, res: Response): Promise<Response> {
  await authService.requestEmailVerification(emailVerificationRequestSchema.parse(req.body));
  return res.status(202).json({ message: 'Se houver uma conta vinculada ao e-mail, você receberá instruções em breve.' });
}

export async function confirmEmailVerification(req: Request, res: Response): Promise<Response> {
  if (!req.auth) throw new Error('Authenticated route missing auth context');
  const user = await authService.confirmEmailVerification(req.auth.userId, emailVerificationConfirmSchema.parse(req.body));
  return res.json({ message: 'E-mail verificado com sucesso.', user: toPublicUser(user) });
}

export async function requestPasswordReset(req: Request, res: Response): Promise<Response> {
  await authService.requestPasswordReset(passwordResetRequestSchema.parse(req.body));
  return res.status(202).json({ message: 'Se houver uma conta vinculada ao e-mail, você receberá instruções em breve.' });
}

export async function confirmPasswordReset(req: Request, res: Response): Promise<Response> {
  await authService.confirmPasswordReset(passwordResetConfirmSchema.parse(req.body));
  return res.json({ message: 'Senha redefinida com sucesso. Entre novamente.' });
}
