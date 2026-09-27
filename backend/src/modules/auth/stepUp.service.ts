import { createHash, createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { Prisma, type StepUpPurpose } from '@prisma/client';
import { env } from '../../config/env';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { sendStepUpCodeEmail } from '../../shared/services/mailer';
import { verifyPassword } from '../../shared/utils/password';
import type { ConfirmStepUpChallengeInput, CreateStepUpChallengeInput } from './stepUp.validator';

const CHALLENGE_TTL_MS = 10 * 60 * 1000;
const AUTHORIZATION_TTL_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const invalidProof = () => new AppError('Não foi possível validar a autenticação reforçada.', 401, 'step_up_failed');

function digest(value: string): string {
  if (!env.JWT_SECRET) throw new AppError('Autenticação reforçada indisponível.', 503, 'step_up_unavailable');
  return createHash('sha256').update(value + ':' + env.JWT_SECRET).digest('hex');
}
function codeDigest(challengeId: string, code: string): string {
  const key = env.STEP_UP_OTP_HMAC_KEY ?? env.JWT_SECRET;
  if (!key) throw new AppError('Autenticação reforçada indisponível.', 503, 'step_up_unavailable');
  return createHmac('sha256', key).update(challengeId + ':' + code).digest('hex');
}
function sameDigest(left: string, right: string): boolean {
  const a = Buffer.from(left, 'hex'); const b = Buffer.from(right, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
function sameResource(left: string | null, right: string | undefined): boolean { return left === (right ?? null); }

export async function createStepUpChallenge(userId: string, input: CreateStepUpChallengeInput) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, emailVerifiedAt: true, passwordHash: true, sessionVersion: true },
  });
  if (!user?.emailVerifiedAt || !user.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) throw invalidProof();

  const challengeId = randomUUID();
  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${userId + ':' + input.purpose}))`;
    await tx.stepUpChallenge.updateMany({
      where: { userId, purpose: input.purpose, consumedAt: null, invalidatedAt: null },
      data: { invalidatedAt: new Date() },
    });
    await tx.stepUpChallenge.create({ data: {
      id: challengeId, userId, purpose: input.purpose, resourceId: input.resourceId,
      codeHash: codeDigest(challengeId, code), sessionVersion: user.sessionVersion, expiresAt,
    } });
  });

  try {
    await sendStepUpCodeEmail(user.email, code);
    const activated = await prisma.stepUpChallenge.updateMany({
      where: { id: challengeId, invalidatedAt: null, consumedAt: null, deliveredAt: null }, data: { deliveredAt: new Date() },
    });
    // A concurrent resend may invalidate this just-created challenge after mail
    // delivery. The request is still accepted; only the newest challenge can
    // be confirmed, preventing a false authentication failure for the caller.
    if (activated.count !== 1) return { challengeId, expiresAt };
  } catch (cause) {
    await prisma.stepUpChallenge.updateMany({ where: { id: challengeId, deliveredAt: null }, data: { invalidatedAt: new Date() } });
    if (cause instanceof AppError && cause.code === 'step_up_failed') throw cause;
    throw new AppError('Não foi possível enviar o código agora.', 503, 'step_up_delivery_failed');
  }
  return { challengeId, expiresAt };
}

export async function confirmStepUpChallenge(userId: string, input: ConfirmStepUpChallengeInput) {
  const now = new Date();
  const rawToken = randomBytes(32).toString('base64url');
  const challenge = await prisma.stepUpChallenge.findUnique({ where: { id: input.challengeId } });
  const validScope = challenge && challenge.userId === userId && challenge.purpose === input.purpose
    && sameResource(challenge.resourceId, input.resourceId);
  if (!validScope || !challenge.deliveredAt || challenge.consumedAt || challenge.invalidatedAt
    || challenge.expiresAt <= now || challenge.failedAttempts >= MAX_ATTEMPTS) throw invalidProof();

  if (!sameDigest(challenge.codeHash, codeDigest(challenge.id, input.code))) {
    const failed = await prisma.stepUpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, invalidatedAt: null, failedAttempts: { lt: MAX_ATTEMPTS } },
      data: { failedAttempts: { increment: 1 } },
    });
    if (failed.count === 1 && challenge.failedAttempts + 1 >= MAX_ATTEMPTS) {
      await prisma.stepUpChallenge.updateMany({ where: { id: challenge.id, consumedAt: null }, data: { invalidatedAt: now } });
    }
    throw invalidProof();
  }

  return prisma.$transaction(async (tx) => {
    const consumed = await tx.stepUpChallenge.updateMany({
      where: { id: challenge.id, consumedAt: null, invalidatedAt: null, expiresAt: { gt: now }, failedAttempts: { lt: MAX_ATTEMPTS } },
      data: { consumedAt: now },
    });
    if (consumed.count !== 1) throw invalidProof();
    const user = await tx.user.findUnique({ where: { id: userId }, select: { sessionVersion: true } });
    if (!user || user.sessionVersion !== challenge.sessionVersion) throw invalidProof();
    const expiresAt = new Date(now.getTime() + AUTHORIZATION_TTL_MS);
    await tx.stepUpAuthorization.create({ data: {
      userId, purpose: input.purpose, resourceId: input.resourceId, tokenHash: digest(rawToken),
      sessionVersion: user.sessionVersion, expiresAt,
    } });
    return { authorizationToken: rawToken, expiresAt, purpose: input.purpose, resourceId: input.resourceId ?? null };
  });
}

export async function requireStepUpAuthorization(input: {
  userId: string; token: string; purpose: StepUpPurpose; resourceId?: string; consume?: boolean; client?: Prisma.TransactionClient;
}): Promise<void> {
  const client = input.client ?? prisma;
  const now = new Date();
  const authorization = await client.stepUpAuthorization.findUnique({ where: { tokenHash: digest(input.token) } });
  if (!authorization || authorization.userId !== input.userId || authorization.purpose !== input.purpose
    || !sameResource(authorization.resourceId, input.resourceId) || authorization.revokedAt || authorization.expiresAt <= now || (input.consume && authorization.consumedAt)) throw invalidProof();
  const user = await client.user.findUnique({ where: { id: input.userId }, select: { sessionVersion: true } });
  if (!user || user.sessionVersion !== authorization.sessionVersion) throw invalidProof();
  if (input.consume) {
    const consumed = await client.stepUpAuthorization.updateMany({ where: { id: authorization.id, consumedAt: null, revokedAt: null, expiresAt: { gt: now } }, data: { consumedAt: now } });
    if (consumed.count !== 1) throw invalidProof();
  }
}
