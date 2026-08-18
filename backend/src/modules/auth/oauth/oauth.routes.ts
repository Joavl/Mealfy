import { Router } from 'express';
import { loginWithToken, govbrStart, govbrCallback, listProviders } from './oauth.controller';

/**
 * Rotas de login social, montadas sob /auth (ver app.ts):
 *   GET  /auth/providers            → quais provedores estão configurados
 *   POST /auth/oauth/google
 *   POST /auth/oauth/facebook
 *   POST /auth/oauth/apple
 *   GET  /auth/govbr/start
 *   GET  /auth/govbr/callback
 */
export const oauthRoutes = Router();

// Público: o app precisa saber quais botões oferecer ANTES de autenticar.
oauthRoutes.get('/providers', listProviders);
oauthRoutes.post('/oauth/:provider', loginWithToken);
oauthRoutes.get('/govbr/start', govbrStart);
oauthRoutes.get('/govbr/callback', govbrCallback);
