import { createHash } from 'node:crypto';
import { Prisma, type DirectPixTermsAcceptance, type UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';

const OPERATION = 'direct_pix.accept_terms';
const RESOURCE_TYPE = 'direct_pix_terms_acceptance';
const CHANNEL = 'web_pwa';
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const MAX_CONCURRENCY_ATTEMPTS = 4;

type Actor = { userId: string; role: UserRole };
type AcceptInput = {
  actor: Actor;
  version: string;
  idempotencyKey: string;
  correlationId: string;
};

export type AcceptanceResult = { acceptance: DirectPixTermsAcceptance; replayed: boolean };

function requestHash(version: string): string {
  return createHash('sha256')
    .update(JSON.stringify({ operation: OPERATION, version }))
    .digest('hex');
}

function conflict(): never {
  throw new AppError('A chave de idempotência já foi usada com outra requisição.', 409, 'idempotency_conflict');
}

function isRetriable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError
    && (error.code === 'P2002' || error.code === 'P2034');
}

async function replay(actorUserId: string, idempotencyKey: string, hash: string): Promise<AcceptanceResult | null> {
  const record = await prisma.idempotencyRecord.findUnique({
    where: { actorUserId_operation_idempotencyKey: { actorUserId, operation: OPERATION, idempotencyKey } },
  });
  if (!record) return null;
  if (record.requestHash !== hash) conflict();
  if (record.status !== 'completed' || record.resourceType !== RESOURCE_TYPE || !record.resourceId) {
    throw new AppError('A operação idempotente ainda está em processamento.', 409, 'idempotency_in_progress');
  }
  const acceptance = await prisma.directPixTermsAcceptance.findUnique({ where: { id: record.resourceId } });
  if (!acceptance) throw new Error('Completed idempotency record has no acceptance resource');
  return { acceptance, replayed: true };
}

export async function currentTerms(actorUserId: string) {
  const terms = await prisma.directPixTermsVersion.findFirst({
    where: { isCurrent: true, effectiveAt: { lte: new Date() } },
    orderBy: [{ effectiveAt: 'desc' }, { version: 'desc' }],
  });
  if (!terms) throw new AppError('Os termos do Pix direto estão indisponíveis.', 503, 'direct_pix_terms_unavailable');
  const acceptance = await prisma.directPixTermsAcceptance.findUnique({
    where: { actorUserId_termsVersionId: { actorUserId, termsVersionId: terms.id } },
    select: { acceptedAt: true },
  });
  return { terms, acceptedAt: acceptance?.acceptedAt ?? null };
}

export async function acceptTerms(input: AcceptInput): Promise<AcceptanceResult> {
  const hash = requestHash(input.version);
  const previous = await replay(input.actor.userId, input.idempotencyKey, hash);
  if (previous) return previous;

  for (let attempt = 0; attempt < MAX_CONCURRENCY_ATTEMPTS; attempt += 1) {
    try {
      const acceptance = await prisma.$transaction(async (tx) => {
        const terms = await tx.directPixTermsVersion.findFirst({
          where: { version: input.version, isCurrent: true, effectiveAt: { lte: new Date() } },
        });
        if (!terms) throw new AppError('A versão informada não é a versão vigente.', 409, 'terms_version_not_current');

        const idempotency = await tx.idempotencyRecord.create({
          data: {
            actorUserId: input.actor.userId,
            operation: OPERATION,
            idempotencyKey: input.idempotencyKey,
            requestHash: hash,
            status: 'processing',
            expiresAt: new Date(Date.now() + IDEMPOTENCY_TTL_MS),
          },
        });

        const accepted = await tx.directPixTermsAcceptance.upsert({
          where: { actorUserId_termsVersionId: { actorUserId: input.actor.userId, termsVersionId: terms.id } },
          create: {
            termsVersionId: terms.id,
            version: terms.version,
            actorUserId: input.actor.userId,
            actorRole: input.actor.role,
            channel: CHANNEL,
            correlationId: input.correlationId,
          },
          update: {},
        });

        await tx.auditLog.create({
          data: {
            actorUserId: input.actor.userId,
            actorRole: input.actor.role,
            action: 'direct_pix.terms.accepted',
            entityType: RESOURCE_TYPE,
            entityId: accepted.id,
            channel: CHANNEL,
            correlationId: input.correlationId,
            idempotencyKey: input.idempotencyKey,
            result: 'accepted',
            metadata: { termsVersion: terms.version },
          },
        });
        await tx.outboxEvent.create({
          data: {
            eventType: 'direct_pix.terms.accepted',
            aggregateType: RESOURCE_TYPE,
            aggregateId: accepted.id,
            dedupeKey: idempotency.id,
          },
        });
        await tx.idempotencyRecord.update({
          where: { id: idempotency.id },
          data: {
            resourceType: RESOURCE_TYPE,
            resourceId: accepted.id,
            status: 'completed',
            completedAt: new Date(),
          },
        });
        return accepted;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { acceptance, replayed: false };
    } catch (error) {
      if (!isRetriable(error)) throw error;
      const completed = await replay(input.actor.userId, input.idempotencyKey, hash);
      if (completed) return completed;
    }
  }
  throw new AppError('A operação concorrente não pôde ser concluída. Tente novamente.', 409, 'concurrent_operation');
}
