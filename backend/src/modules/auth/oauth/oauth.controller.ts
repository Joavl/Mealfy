import type { Request, Response } from 'express';
import { env } from '../../../config/env';
import { oauthTokenSchema, oauthProviderParam, govbrCallbackSchema } from './oauth.validator';
import { verifyProviderToken } from './oauth.providers';
import { buildAuthorizationUrl, exchangeCode, isGovBrConfigured } from './oauth.govbr';
import { signInWithOAuth } from './oauth.service';
import { toPublicUser } from '../../users/users.dto';

/**
 * GET /auth/providers — quais logins sociais estão REALMENTE configurados.
 *
 * Existe para o app não oferecer um botão que vai falhar: sem isto, a única
 * forma de descobrir que falta credencial é o usuário tentar e tomar 501.
 * Só devolve identificadores públicos (client id já vai no app de qualquer
 * forma) — nunca secrets.
 */
export async function listProviders(_req: Request, res: Response): Promise<Response> {
  return res.json({
    providers: {
      google: { enabled: Boolean(env.GOOGLE_CLIENT_ID), clientId: env.GOOGLE_CLIENT_ID ?? null },
      facebook: { enabled: Boolean(env.FACEBOOK_APP_ID), appId: env.FACEBOOK_APP_ID ?? null },
      apple: { enabled: Boolean(env.APPLE_CLIENT_ID), clientId: env.APPLE_CLIENT_ID ?? null },
      govbr: { enabled: isGovBrConfigured(), env: env.GOVBR_ENV },
    },
  });
}

/**
 * POST /auth/oauth/:provider   (provider ∈ google | facebook | apple)
 * Corpo: { token, name? }. Verifica o token no provedor e devolve JWT Mealfy + usuário.
 */
export async function loginWithToken(req: Request, res: Response): Promise<Response> {
  const provider = oauthProviderParam.parse(req.params.provider);
  const { token, name } = oauthTokenSchema.parse(req.body);

  const identity = await verifyProviderToken(provider, token, { name });
  const { user, token: jwt, isNew } = await signInWithOAuth(identity);

  return res.status(isNew ? 201 : 200).json({ token: jwt, user: toPublicUser(user), isNew });
}

/**
 * GET /auth/govbr/start → redireciona o navegador para a tela de login do Gov.br.
 * O `state` volta no callback; o app confere para prevenir CSRF.
 */
export async function govbrStart(_req: Request, res: Response): Promise<void> {
  const { url, state } = buildAuthorizationUrl();
  // Repassa o state ao cliente via cookie httpOnly de curta duração.
  res.cookie?.('govbr_state', state, { httpOnly: true, maxAge: 5 * 60 * 1000, sameSite: 'lax' });
  res.redirect(url);
}

/**
 * GET /auth/govbr/callback?code=...&state=...
 * Troca o code por tokens, resolve a conta (por CPF) e devolve JWT Mealfy.
 */
export async function govbrCallback(req: Request, res: Response): Promise<Response> {
  const { code } = govbrCallbackSchema.parse(req.query);
  const identity = await exchangeCode(code);
  const { user, token: jwt, isNew } = await signInWithOAuth(identity);
  return res.status(isNew ? 201 : 200).json({ token: jwt, user: toPublicUser(user), isNew });
}
