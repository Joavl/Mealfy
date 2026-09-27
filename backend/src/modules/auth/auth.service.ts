import { createHash, randomBytes } from 'node:crypto';
import type { UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { hashPassword, verifyPassword } from '../../shared/utils/password';
import { signToken } from '../../shared/utils/jwt';
import {
  assertEmailVerificationMailerConfigured,
  assertPasswordResetMailerConfigured,
  sendEmailVerificationEmail,
  sendPasswordResetEmail,
} from '../../shared/services/mailer';
import { AppError } from '../../shared/errors/AppError';
import { env } from '../../config/env';
import type {
  RegisterInput, LoginInput, EmailVerificationRequestInput, EmailVerificationConfirmInput,
  PasswordResetRequestInput, PasswordResetConfirmInput,
} from './auth.validator';

function issue(user: { id: string; role: UserRole; sessionVersion: number }): string {
  return signToken({ sub: user.id, role: user.role, sv: user.sessionVersion });
}

function tokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export async function register(input: RegisterInput) {
  const email = input.email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw new AppError('E-mail já cadastrado', 409, 'email_taken');

  const user = await prisma.user.create({
    data: {
      name: input.name.trim(),
      email,
      role: input.role,
      passwordHash: await hashPassword(input.password),
      phone: input.phone?.trim() || null,
      status: input.role === 'entity' ? 'pending' : 'active',
    },
  });

  return { user, token: issue(user) };
}

export async function login(input: LoginInput) {
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) {
    throw new AppError('E-mail ou senha incorretos', 401, 'invalid_credentials');
  }
  if (user.status === 'blocked' || user.status === 'suspended') {
    throw new AppError('Conta indisponível. Contate o suporte.', 403, 'account_unavailable');
  }
  return { user, token: issue(user) };
}

async function issueAndDeliverEmailVerification(user: { id: string; email: string }): Promise<void> {
  const rawToken = randomBytes(32).toString('base64url');
  const digest = tokenHash(rawToken);
  const expiresAt = new Date(Date.now() + env.EMAIL_VERIFICATION_TTL_MINUTES * 60 * 1000);
  // Mark the newest proof deliverable in the same locked transaction. This keeps
  // concurrent resends to one usable generation even before their detached mail
  // jobs settle; a failed send removes only its own still-current generation.
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id}))`;
    await tx.emailVerificationToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await tx.emailVerificationToken.create({ data: { userId: user.id, tokenHash: digest, expiresAt, deliveredAt: new Date() } });
  });

  try {
    await sendEmailVerificationEmail(user.email, rawToken);
  } catch {
    await prisma.emailVerificationToken.deleteMany({
      where: { userId: user.id, tokenHash: digest, usedAt: null },
    });
    console.error('[email-verification] delivery_failed');
  }
}

/** Public and neutral: delivery is detached so mailbox latency cannot reveal account state. */
export async function requestEmailVerification(input: EmailVerificationRequestInput): Promise<void> {
  assertEmailVerificationMailerConfigured();
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerifiedAt: true } });
  if (!user || user.emailVerifiedAt) return;
  setImmediate(() => {
    void issueAndDeliverEmailVerification(user).catch(() => console.error('[email-verification] issuance_failed'));
  });
}

/** Consumes one owner-bound proof using a compare-and-set update. */
export async function confirmEmailVerification(userId: string, input: EmailVerificationConfirmInput) {
  const digest = tokenHash(input.token);
  const now = new Date();
  return prisma.$transaction(async (tx) => {
    const token = await tx.emailVerificationToken.findUnique({ where: { tokenHash: digest } });
    if (!token || token.userId !== userId || !token.deliveredAt || token.usedAt || token.expiresAt <= now) {
      throw new AppError('O link de verificação é inválido ou expirou.', 400, 'invalid_email_verification_token');
    }
    const consumed = await tx.emailVerificationToken.updateMany({
      where: { id: token.id, userId, deliveredAt: { not: null }, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) {
      throw new AppError('O link de verificação é inválido ou expirou.', 400, 'invalid_email_verification_token');
    }
    const user = await tx.user.update({ where: { id: userId }, data: { emailVerifiedAt: now } });
    await tx.emailVerificationToken.deleteMany({ where: { userId, id: { not: token.id } } });
    return user;
  });
}

/** Never reveals whether an address exists. Tokens are random, hashed at rest, and short lived. */
export async function requestPasswordReset(input: PasswordResetRequestInput): Promise<void> {
  // Fail uniformly before lookup when mail delivery is not configured.
  assertPasswordResetMailerConfigured();
  const email = input.email.trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, passwordHash: true } });
  if (!user?.passwordHash) return;

  const rawToken = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60 * 1000);
  await prisma.$transaction(async (tx) => {
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id, usedAt: null } });
    await tx.passwordResetToken.create({ data: { userId: user.id, tokenHash: tokenHash(rawToken), expiresAt } });
  });

  try {
    await sendPasswordResetEmail(email, rawToken);
  } catch {
    await prisma.passwordResetToken.deleteMany({ where: { userId: user.id, tokenHash: tokenHash(rawToken), usedAt: null } });
    // Do not reveal a delivery failure to the requester; it could become an
    // account-enumeration oracle. Operations retains the server-side error.
    console.error('[password-reset] delivery_failed');
  }
}

/** Consumes exactly one valid token and revokes every pre-reset JWT session. */
export async function confirmPasswordReset(input: PasswordResetConfirmInput): Promise<void> {
  const digest = tokenHash(input.token);
  const now = new Date();
  const reset = await prisma.passwordResetToken.findUnique({ where: { tokenHash: digest } });
  if (!reset || reset.usedAt || reset.expiresAt <= now) {
    throw new AppError('O link de redefinição é inválido ou expirou.', 400, 'invalid_reset_token');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const consumed = await tx.passwordResetToken.updateMany({
      where: { id: reset.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now },
    });
    if (consumed.count !== 1) throw new AppError('O link de redefinição é inválido ou expirou.', 400, 'invalid_reset_token');

    await tx.passwordResetToken.deleteMany({ where: { userId: reset.userId, id: { not: reset.id } } });
    await tx.stepUpChallenge.updateMany({ where: { userId: reset.userId, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: now } });
    await tx.stepUpAuthorization.updateMany({ where: { userId: reset.userId, revokedAt: null }, data: { revokedAt: now } });
    return tx.user.update({
      where: { id: reset.userId },
      data: { passwordHash: await hashPassword(input.password), sessionVersion: { increment: 1 } },
    });
  });

  if (!updated) throw new AppError('O link de redefinição é inválido ou expirou.', 400, 'invalid_reset_token');
}
