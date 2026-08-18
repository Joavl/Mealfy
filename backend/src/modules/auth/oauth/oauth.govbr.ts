import { randomBytes, createPublicKey, createVerify } from 'node:crypto';
import { env } from '../../../config/env';
import { AppError } from '../../../shared/errors/AppError';
import type { OAuthIdentity } from './oauth.providers';

/**
 * Gov.br — OpenID Connect (Authorization Code).
 * Docs: acesso.gov.br → "Serviços" → login único (SSO).
 * Homologação: sso.staging.acesso.gov.br · Produção: sso.acesso.gov.br
 *
 * Fluxo:
 *  1. /auth/govbr/start  → redireciona o navegador para a tela do Gov.br (com state).
 *  2. usuário autentica no Gov.br → volta para GOVBR_REDIRECT_URI com ?code&state.
 *  3. /auth/govbr/callback → troca o code por tokens, valida o id_token e extrai o CPF.
 *
 * O `sub` do Gov.br é o CPF do cidadão — identidade forte para KYC de beneficiários.
 */

function base(): string {
  return env.GOVBR_ENV === 'production'
    ? 'https://sso.acesso.gov.br'
    : 'https://sso.staging.acesso.gov.br';
}

export function isGovBrConfigured(): boolean {
  return Boolean(env.GOVBR_CLIENT_ID && env.GOVBR_CLIENT_SECRET && env.GOVBR_REDIRECT_URI);
}

function requireConfig() {
  if (!isGovBrConfigured()) {
    throw new AppError('Login com Gov.br ainda não está configurado no servidor.', 501, 'provider_not_configured');
  }
}

/** Gera a URL de autorização + um `state` aleatório (anti-CSRF) que o caller deve guardar. */
export function buildAuthorizationUrl(): { url: string; state: string; nonce: string } {
  requireConfig();
  const state = randomBytes(16).toString('hex');
  const nonce = randomBytes(16).toString('hex');
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: env.GOVBR_CLIENT_ID!,
    scope: 'openid email phone profile',
    redirect_uri: env.GOVBR_REDIRECT_URI!,
    state,
    nonce,
  });
  return { url: `${base()}/authorize?${params.toString()}`, state, nonce };
}

interface GovBrTokenResponse { access_token: string; id_token: string; token_type: string }

/** Troca o authorization code por tokens e devolve a identidade normalizada (com CPF). */
export async function exchangeCode(code: string): Promise<OAuthIdentity> {
  requireConfig();

  const basicAuth = Buffer.from(`${env.GOVBR_CLIENT_ID}:${env.GOVBR_CLIENT_SECRET}`).toString('base64');
  const tokenRes = await fetch(`${base()}/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: env.GOVBR_REDIRECT_URI!,
    }).toString(),
  }).catch(() => null);

  if (!tokenRes || !tokenRes.ok) {
    throw new AppError('Falha ao trocar o código do Gov.br por tokens.', 401, 'invalid_oauth_token');
  }
  const tokens = (await tokenRes.json()) as GovBrTokenResponse;

  const claims = await verifyGovBrIdToken(tokens.id_token);

  // O Gov.br pode expor dados adicionais no userinfo; buscamos nome/e-mail/foto.
  const userinfo = await fetchUserinfo(tokens.access_token);

  const cpf = String(claims.sub).replace(/\D/g, '') || null;
  return {
    provider: 'govbr',
    providerUserId: String(claims.sub),
    email: userinfo.email ?? claims.email ?? null,
    name: userinfo.name ?? claims.name ?? null,
    avatarUrl: userinfo.picture ?? null,
    cpf,
  };
}

async function fetchUserinfo(accessToken: string): Promise<Record<string, any>> {
  const res = await fetch(`${base()}/userinfo`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  }).catch(() => null);
  if (!res || !res.ok) return {};
  return (await res.json()) as Record<string, any>;
}

// Verificação do id_token do Gov.br (RS256 via JWKS). Espelha oauth.providers para
// manter o Gov.br autocontido (ele não passa pelo verifyProviderToken).
interface Jwk { kid: string; kty: string; n: string; e: string }
let jwksCache: { keys: Jwk[]; at: number } | null = null;

async function govbrJwks(): Promise<Jwk[]> {
  if (jwksCache && Date.now() - jwksCache.at < 60 * 60 * 1000) return jwksCache.keys;
  const res = await fetch(`${base()}/jwk`).catch(() => null);
  if (!res || !res.ok) throw new AppError('Não foi possível obter as chaves do Gov.br.', 401, 'invalid_oauth_token');
  const body = (await res.json()) as { keys: Jwk[] };
  jwksCache = { keys: body.keys, at: Date.now() };
  return body.keys;
}

async function verifyGovBrIdToken(idToken: string): Promise<Record<string, any>> {
  const parts = idToken.split('.');
  if (parts.length !== 3) throw new AppError('id_token do Gov.br malformado.', 401, 'invalid_oauth_token');
  const [h, p, s] = parts;
  const header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8')) as { kid?: string };
  const keys = await govbrJwks();
  const jwk = keys.find((k) => k.kid === header.kid) ?? keys[0];
  if (!jwk) throw new AppError('Chave do Gov.br não encontrada.', 401, 'invalid_oauth_token');

  const publicKey = createPublicKey({ key: jwk as any, format: 'jwk' });
  const verifier = createVerify('RSA-SHA256');
  verifier.update(`${h}.${p}`);
  verifier.end();
  if (!verifier.verify(publicKey, Buffer.from(s, 'base64url'))) {
    throw new AppError('Assinatura do id_token do Gov.br inválida.', 401, 'invalid_oauth_token');
  }
  const payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8')) as Record<string, any>;
  if (typeof payload.exp === 'number' && payload.exp * 1000 < Date.now()) {
    throw new AppError('id_token do Gov.br expirado.', 401, 'invalid_oauth_token');
  }
  if (payload.aud !== env.GOVBR_CLIENT_ID) {
    throw new AppError('id_token do Gov.br emitido para outro cliente.', 401, 'invalid_oauth_token');
  }
  return payload;
}
