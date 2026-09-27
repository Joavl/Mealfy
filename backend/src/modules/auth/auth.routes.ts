import { createHash } from 'node:crypto';
import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { authGuard } from '../../shared/middlewares/authGuard';
import {
  register, login, requestEmailVerification, confirmEmailVerification, requestPasswordReset, confirmPasswordReset,
} from './auth.controller';

export const authRoutes = Router();
authRoutes.post('/register', register);
authRoutes.post('/login', login);
authRoutes.post('/email-verification/request', rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 3,
  keyGenerator: (req) => createHash('sha256').update(String(req.body?.email ?? '').trim().toLowerCase()).digest('hex'),
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Aguarde alguns minutos.', code: 'rate_limited' },
}), requestEmailVerification);
authRoutes.post('/email-verification/confirm', authGuard, rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  keyGenerator: (req) => req.auth!.userId,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Muitas tentativas. Aguarde alguns minutos.', code: 'rate_limited' },
}), confirmEmailVerification);
authRoutes.post('/password-reset/request', requestPasswordReset);
authRoutes.post('/password-reset/confirm', confirmPasswordReset);
