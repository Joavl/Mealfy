import { createPublicKey, createVerify } from 'node:crypto';
import { env } from '../../../config/env';
import { AppError } from '../../../shared/errors/AppError';
import type { OAuthProvider } from '@prisma/client';

/**
 * Identidade normalizada devolvida por qualquer provedor social.
 * O restante do fluxo (find-or-create + linking) só conhece este formato.
 */
export interface OAuthIdentity {
  provider: OAuthProvider;
  /** ID estável do usuário no provedor (`sub` do ID token / id do Graph). */
  providerUserId: string;
  email: string | null;
  name: string | null;
  avatarUrl: string | null;
  /** CPF verificado — só o Gov.br preenche. */
  cpf: string | null;
}

function notConfigured(provider: string): never {
  throw new AppError(
    `Login com ${provider} ainda não está configurado no servidor.`,
    501,
    'provider_not_configured',
  );
}

function invalidToken(detail = 'Token social inválido ou expirado.'): never {
  throw new AppError(detail, 401, 'invalid_oauth_token');
}

// ─── JWKS: verificação de ID token (RS256) sem dependências externas ──────────

interface Jwk { kid: string; kty: string; n: string; e: string; alg?: string; use?: string }

const jwksCache = new Map<string, { keys: Jwk[]; fetchedAt: number }>();
const JWKS_TTL_MS = 60 * 60 * 1000; // 1h

async function getJwks(jwksUri: string): Promise<Jwk[]> {
  const cached = jwksCache.get(jwksUri);
  if (cached && Date.now() - cached.fetchedAt < JWKS_TTL_MS) return cached.keys;

  const res = await fetch(jwksUri).catch(() => null);
  if (!res || !res.ok) invalidToken('Não foi possível obter as chaves do provedor.');
  const body = (await res.json()) as { keys: Jwk[] };
  jwksCache.set(jwksUri, { keys: body.keys, fetchedAt: Date.now() });
  return body.keys;
}

function b64urlToJson<T>(segment: string): T {
  return JSON.parse(Buffer.from(segment, 'base64url').toString('utf8')) as T;
}

/**
 * Verifica um ID token JWT (RS256) contra o JWKS do provedor e valida `aud`/`iss`/`exp`.
 * Retorna o payload já decodificado. Implementação própria para não adicionar libs.
 */
async function verifyIdToken(
  idToken: string,
  opts: { jwksUri: string; issuers: string[]; audience: string },
): Promise<Record<string, any>> {
  const parts = idToken.split('.');
  if (parts.length !== 3) invalidToken();
  const [headerB64, payloadB64, signatureB64] = parts;

  const header = b64urlToJson<{ kid?: string; alg?: string }>(headerB64);
  if (header.alg !== 'RS256') invalidToken('Algoritmo de assinatura não suportado.');

  const keys = await getJwks(opts.jwksUri);
  const jwk = keys.find((k) => k.kid === header.kid) ?? keys[0];
  if (!jwk) invalidToken();

  const publicKey = createPublicKey({ key: jwk as any, format: 'jwk' });
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${headerB64}.${payloadB64}`);
  verifier.end();
  const ok = verifier.verify(publicKey, Buffer.from(signatureB64, 'base64url'));
  if (!ok) invalidToken('Assinatura do token inválida.');

  const payload = b64urlToJson<Record<string, any>>(payloadB64);

  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) invalidToken('Token expirado.');
  if (!opts.issuers.includes(payload.iss)) invalidToken('Emissor do token inesperado.');

  const aud = Array.isArray(payload.aud) ? payload.aud : [payload.aud];
  if (!aud.includes(opts.audience)) invalidToken('Token emitido para outro aplicativo.');

  return payload;
}

// ─── Google ───────────────────────────────────────────────────────────────
// Verifica o ID token do Google contra o JWKS oficial. `aud` == GOOGLE_CLIENT_ID.
async function verifyGoogle(idToken: string): Promise<OAuthIdentity> {
  if (!env.GOOGLE_CLIENT_ID) notConfigured('Google');
  const payload = await verifyIdToken(idToken, {
    jwksUri: 'https://www.googleapis.com/oauth2/v3/certs',
    issuers: ['https://accounts.google.com', 'accounts.google.com'],
    audience: env.GOOGLE_CLIENT_ID,
  });
  if (payload.email_verified === false) invalidToken('E-mail do Google não verificado.');
  return {
    provider: 'google',
    providerUserId: String(payload.sub),
    email: payload.email ?? null,
    name: payload.name ?? null,
    avatarUrl: payload.picture ?? null,
    cpf: null,
  };
}

// ─── Apple ──────────────────────────────────────────────────────────────────
// ID token JWT assinado pela Apple. `aud` == APPLE_CLIENT_ID (Services ID).
// Apple só envia nome no PRIMEIRO login — o app deve repassá-lo à parte se tiver.
async function verifyApple(idToken: string, name: string | null): Promise<OAuthIdentity> {
  if (!env.APPLE_CLIENT_ID) notConfigured('Apple');
  const payload = await verifyIdToken(idToken, {
    jwksUri: 'https://appleid.apple.com/auth/keys',
    issuers: ['https://appleid.apple.com'],
    audience: env.APPLE_CLIENT_ID,
  });
  return {
    provider: 'apple',
    providerUserId: String(payload.sub),
    email: payload.email ?? null,
    name: name ?? null,
    avatarUrl: null,
    cpf: null,
  };
}

// ─── Facebook / Meta ─────────────────────────────────────────────────────────
// Valida o access token via debug_token (contra o app) e busca o perfil no Graph.
async function verifyFacebook(accessToken: string): Promise<OAuthIdentity> {
  if (!env.FACEBOOK_APP_ID || !env.FACEBOOK_APP_SECRET) notConfigured('Facebook');
  const appToken = `${env.FACEBOOK_APP_ID}|${env.FACEBOOK_APP_SECRET}`;

  const debugRes = await fetch(
    `https://graph.facebook.com/debug_token?input_token=${encodeURIComponent(accessToken)}&access_token=${encodeURIComponent(appToken)}`,
  ).catch(() => null);
  if (!debugRes || !debugRes.ok) invalidToken();
  const debug = (await debugRes.json()) as { data?: { is_valid?: boolean; app_id?: string } };
  if (!debug.data?.is_valid || debug.data.app_id !== env.FACEBOOK_APP_ID) invalidToken();

  const profileRes = await fetch(
    `https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${encodeURIComponent(accessToken)}`,
  ).catch(() => null);
  if (!profileRes || !profileRes.ok) invalidToken();
  const profile = (await profileRes.json()) as {
    id: string;
    name?: string;
    email?: string;
    picture?: { data?: { url?: string } };
  };

  return {
    provider: 'facebook',
    providerUserId: profile.id,
    email: profile.email ?? null, // Facebook pode omitir e-mail — tratado a jusante.
    name: profile.name ?? null,
    avatarUrl: profile.picture?.data?.url ?? null,
    cpf: null,
  };
}

/**
 * Ponto único de verificação para provedores baseados em token (app envia o token).
 * Gov.br usa o fluxo de authorization code (ver oauth.govbr.ts) e não passa por aqui.
 */
export async function verifyProviderToken(
  provider: 'google' | 'facebook' | 'apple',
  token: string,
  extra?: { name?: string | null },
): Promise<OAuthIdentity> {
  switch (provider) {
    case 'google':
      return verifyGoogle(token);
    case 'apple':
      return verifyApple(token, extra?.name ?? null);
    case 'facebook':
      return verifyFacebook(token);
    default:
      throw new AppError('Provedor social desconhecido.', 422, 'unknown_provider');
  }
}
