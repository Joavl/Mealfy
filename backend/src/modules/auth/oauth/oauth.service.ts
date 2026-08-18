import { prisma } from '../../../database/prisma';
import { signToken } from '../../../shared/utils/jwt';
import { AppError } from '../../../shared/errors/AppError';
import { env } from '../../../config/env';
import type { User } from '@prisma/client';
import type { OAuthIdentity } from './oauth.providers';

/**
 * Resolve uma identidade social em uma conta Mealfy, emitindo um JWT próprio.
 *
 * Regras de vínculo (find-or-create):
 *  1. Já existe OAuthAccount (provider + providerUserId) → login direto.
 *  2. Existe usuário com o mesmo e-mail → VINCULA o provedor a essa conta.
 *  3. Existe usuário com o mesmo CPF (Gov.br) → VINCULA por CPF.
 *  4. Caso contrário → cria usuário novo (papel = OAUTH_DEFAULT_ROLE, status active).
 *
 * `passwordHash` fica nulo em contas puramente sociais (schema já permite).
 */
export async function signInWithOAuth(identity: OAuthIdentity): Promise<{ user: User; token: string; isNew: boolean }> {
  // 1. Vínculo social já existente
  const existingLink = await prisma.oAuthAccount.findUnique({
    where: { provider_providerUserId: { provider: identity.provider, providerUserId: identity.providerUserId } },
    include: { user: true },
  });
  if (existingLink) {
    assertUsable(existingLink.user);
    return { user: existingLink.user, token: issue(existingLink.user), isNew: false };
  }

  // 2/3. Reaproveita conta existente por e-mail ou CPF
  const matchByEmail = identity.email
    ? await prisma.user.findUnique({ where: { email: identity.email.toLowerCase() } })
    : null;
  const matchByCpf = !matchByEmail && identity.cpf
    ? await prisma.user.findUnique({ where: { cpf: identity.cpf } })
    : null;
  const existingUser = matchByEmail ?? matchByCpf;

  if (existingUser) {
    assertUsable(existingUser);
    await linkAccount(existingUser.id, identity);
    // Gov.br traz CPF verificado — preenche se a conta ainda não tinha.
    const patched = identity.cpf && !existingUser.cpf
      ? await prisma.user.update({ where: { id: existingUser.id }, data: { cpf: identity.cpf } })
      : existingUser;
    return { user: patched, token: issue(patched), isNew: false };
  }

  // 4. Cria conta nova
  if (!identity.email && !identity.cpf) {
    // Facebook sem e-mail e sem CPF: não dá para criar conta com segurança.
    throw new AppError(
      'O provedor não forneceu e-mail. Cadastre-se por e-mail ou autorize o compartilhamento do e-mail.',
      422,
      'oauth_email_required',
    );
  }

  const created = await prisma.user.create({
    data: {
      name: identity.name?.trim() || fallbackName(identity),
      email: identity.email?.toLowerCase() ?? syntheticEmail(identity),
      role: env.OAUTH_DEFAULT_ROLE,
      status: 'active',
      avatarUrl: identity.avatarUrl,
      cpf: identity.cpf,
      oauthAccounts: {
        create: { provider: identity.provider, providerUserId: identity.providerUserId, email: identity.email },
      },
    },
  });
  return { user: created, token: issue(created), isNew: true };
}

async function linkAccount(userId: string, identity: OAuthIdentity): Promise<void> {
  await prisma.oAuthAccount.create({
    data: {
      userId,
      provider: identity.provider,
      providerUserId: identity.providerUserId,
      email: identity.email,
    },
  });
}

function assertUsable(user: User): void {
  if (user.status === 'blocked' || user.status === 'suspended') {
    throw new AppError('Conta indisponível. Contate o suporte.', 403, 'account_unavailable');
  }
}

function issue(user: User): string {
  return signToken({ sub: user.id, role: user.role });
}

function fallbackName(identity: OAuthIdentity): string {
  return identity.email?.split('@')[0] || `Usuário ${identity.provider}`;
}

/**
 * Gov.br pode não expor e-mail; usamos um e-mail sintético estável baseado no CPF
 * só para satisfazer a coluna única. O CPF continua sendo a identidade real.
 */
function syntheticEmail(identity: OAuthIdentity): string {
  const local = identity.cpf ?? identity.providerUserId;
  return `${identity.provider}_${local}@users.mealfy.app`;
}
