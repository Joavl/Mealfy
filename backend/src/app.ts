import 'express-async-errors';
import express, { type Application } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';

import { env } from './config/env';
import { healthRoutes } from './modules/health/health.routes';
import { authRoutes } from './modules/auth/auth.routes';
import { oauthRoutes } from './modules/auth/oauth/oauth.routes';
import { usersRoutes } from './modules/users/users.routes';
import { entitiesRoutes } from './modules/entities/entities.routes';
import { familiesRoutes } from './modules/families/families.routes';
import { adminRoutes } from './modules/admin/admin.routes';
import { giftCardsRoutes } from './modules/giftCards/giftCards.routes';
import { donationsRoutes } from './modules/donations/donations.routes';
import { beneficiaryRoutes } from './modules/beneficiary/beneficiary.routes';
import { paymentsRoutes } from './modules/payments/payments.routes';
import { rankingRoutes } from './modules/ranking/ranking.routes';
import { regionsRoutes } from './modules/regions/regions.routes';
import { notFoundHandler } from './shared/middlewares/notFound';
import { errorHandler } from './shared/middlewares/errorHandler';

/**
 * Monta a aplicação Express (sem dar listen — facilita testes).
 * Cada módulo registra suas rotas aqui conforme as fases avançam.
 */
export function createApp(): Application {
  const app = express();

  // ── Segurança HTTP ────────────────────────────────────────────────────────
  // Railway/Render ficam atrás de proxy: necessário p/ IP correto no rate limit.
  app.set('trust proxy', 1);
  app.use(helmet());

  // Rate limit global leve (anti-abuso geral)
  app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Muitas requisições. Tente novamente em alguns minutos.', code: 'rate_limited' },
  }));

  // Rate limit agressivo em auth (anti brute-force de senha)
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Muitas tentativas de autenticação. Aguarde alguns minutos.', code: 'rate_limited' },
  });
  app.use('/auth/login', authLimiter);
  app.use('/auth/register', authLimiter);

  // Rate limit no webhook Pix (é público; a autenticação real é a assinatura HMAC)
  const webhookLimiter = rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Rate limit excedido.', code: 'rate_limited' },
  });
  app.use('/payments/webhook', webhookLimiter);

  const corsOrigin =
    env.CORS_ORIGIN === '*' ? true : env.CORS_ORIGIN.split(',').map((o) => o.trim());
  app.use(cors({ origin: corsOrigin }));
  // captura o body cru p/ verificação de assinatura de webhook.
  // limit acima do padrão (100kb) porque a foto de perfil trafega como data URL
  // base64 em PATCH /me e estouraria com 413. O ideal a médio prazo é subir a
  // imagem para um storage e guardar só a URL.
  app.use(express.json({
    limit: '2mb',
    verify: (req, _res, buf) => { (req as express.Request).rawBody = buf; },
  }));

  // Módulos
  app.use('/health', healthRoutes);
  app.use('/auth', authRoutes);
  app.use('/auth', oauthRoutes);
  app.use('/me', usersRoutes);
  app.use('/entity', entitiesRoutes);
  app.use('/families', familiesRoutes);
  app.use('/donations', donationsRoutes);
  app.use('/payments', paymentsRoutes);
  app.use('/beneficiary', beneficiaryRoutes);
  app.use('/ranking', rankingRoutes);
  app.use('/regions', regionsRoutes);
  app.use('/admin', adminRoutes);
  app.use('/admin', giftCardsRoutes);

  // 404 + erro global (sempre por último)
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
