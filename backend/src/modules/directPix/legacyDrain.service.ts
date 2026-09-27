import { createHash } from 'node:crypto';
import { Prisma, type DirectPixFeatureFlagScope } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';

const OPERATION = 'direct_pix.legacy_drain.apply';
const RESOURCE_TYPE = 'direct_pix_feature_flag';
const TTL_MS = 24 * 60 * 60 * 1000;

type Scope = DirectPixFeatureFlagScope;
type Reason = { code: string; note?: string };
export type LegacyDrainInput = {
  scope: Scope;
  entityId?: string;
  familyId?: string;
  expectedVersion: number;
  reason: Reason;
};
type Target = { entityId: string | null; familyId: string | null };
type Client = Prisma.TransactionClient | typeof prisma;

export type LegacyDrainReport = {
  scope: Scope;
  entityId: string | null;
  familyId: string | null;
  ready: boolean;
  blockers: { donations: number; payments: number; giftCardOrders: number };
};

function targetFor(scope: Scope, entityId?: string, familyId?: string): Target {
  if (scope === 'GLOBAL') {
    if (entityId || familyId) throw new AppError('O escopo global não aceita entidade ou família.', 422, 'invalid_feature_flag_scope');
    return { entityId: null, familyId: null };
  }
  if (scope === 'ENTITY') {
    if (!entityId || familyId) throw new AppError('O escopo de entidade exige somente entityId.', 422, 'invalid_feature_flag_scope');
    return { entityId, familyId: null };
  }
  if (!entityId || !familyId) throw new AppError('O escopo de família exige entidade e família.', 422, 'invalid_feature_flag_scope');
  return { entityId, familyId };
}

function assertReason(reason: Reason): void {
  if (!reason || !/^[A-Z][A-Z0-9_]{2,63}$/.test(reason.code) || (reason.note !== undefined && (reason.note.length < 1 || reason.note.length > 500))) {
    throw new AppError('Motivo estruturado inválido.', 422, 'invalid_feature_flag_reason');
  }
}

async function validateTarget(target: Target, client: Client): Promise<void> {
  if (target.entityId) {
    const entity = await client.entity.findUnique({ where: { id: target.entityId }, select: { id: true } });
    if (!entity) throw new AppError('Entidade não encontrada.', 404, 'entity_not_found');
  }
  if (target.familyId) {
    const family = await client.family.findUnique({ where: { id: target.familyId }, select: { entityId: true } });
    if (!family || family.entityId !== target.entityId) throw new AppError('Família não encontrada.', 404, 'family_not_found');
  }
}

async function donationIdsForTarget(target: Target, client: Client): Promise<string[] | undefined> {
  if (target.familyId) return undefined;
  if (!target.entityId) return undefined;
  const families = await client.family.findMany({ where: { entityId: target.entityId }, select: { id: true } });
  return families.map((family) => family.id);
}

/**
 * Counts unfinished legacy work only. It deliberately performs no conversion and
 * returns opaque aggregate counts, so an administrator can safely decide whether
 * a scope is drained before the old write path is closed.
 */
async function report(target: Target, client: Client): Promise<LegacyDrainReport> {
  const familyIds = await donationIdsForTarget(target, client);
  const donationWhere: Prisma.DonationWhereInput = target.familyId
    ? { familyId: target.familyId }
    : familyIds ? { familyId: { in: familyIds } } : {};
  const donationsInScope = await client.donation.findMany({
    where: donationWhere,
    select: { id: true, status: true },
  });
  const donationIds = donationsInScope.map((donation) => donation.id);
  const [payments, giftCardOrders] = await Promise.all([
    client.payment.count({ where: { donationId: { in: donationIds }, status: { notIn: ['paid', 'expired', 'canceled', 'failed'] } } }),
    client.giftCardOrder.count({ where: { donationId: { in: donationIds }, status: { notIn: ['issued', 'canceled'] } } }),
  ]);
  const donations = donationsInScope.filter((donation) => !['completed', 'canceled', 'failed'].includes(donation.status)).length;
  return {
    scope: target.familyId ? 'FAMILY' : target.entityId ? 'ENTITY' : 'GLOBAL',
    entityId: target.entityId,
    familyId: target.familyId,
    ready: donations === 0 && payments === 0 && giftCardOrders === 0,
    blockers: { donations, payments, giftCardOrders },
  };
}

export async function dryRunLegacyDrain(input: Omit<LegacyDrainInput, 'expectedVersion' | 'reason'> & Partial<Pick<LegacyDrainInput, 'expectedVersion' | 'reason'>>): Promise<LegacyDrainReport> {
  const target = targetFor(input.scope, input.entityId, input.familyId);
  await validateTarget(target, prisma);
  return report(target, prisma);
}

function requestHash(input: LegacyDrainInput): string {
  return createHash('sha256').update(JSON.stringify({
    operation: OPERATION,
    scope: input.scope,
    entityId: input.entityId ?? null,
    familyId: input.familyId ?? null,
    expectedVersion: input.expectedVersion,
    reason: input.reason,
  })).digest('hex');
}

function isRetriable(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034');
}

function flagDto(row: { id: string; scope: Scope; entityId: string | null; familyId: string | null; enabled: boolean; version: number; updatedAt: Date }) {
  return { id: row.id, key: 'LEGACY_WRITE' as const, scope: row.scope, entityId: row.entityId, familyId: row.familyId, enabled: row.enabled, version: row.version, updatedAt: row.updatedAt.toISOString() };
}

async function replay(actorUserId: string, idempotencyKey: string, hash: string) {
  const record = await prisma.idempotencyRecord.findUnique({ where: { actorUserId_operation_idempotencyKey: { actorUserId, operation: OPERATION, idempotencyKey } } });
  if (!record) return null;
  if (record.requestHash !== hash) throw new AppError('A chave de idempotência já foi usada com outra requisição.', 409, 'idempotency_conflict');
  if (record.status !== 'completed' || record.resourceType !== RESOURCE_TYPE || !record.resourceId) throw new AppError('A operação idempotente ainda está em processamento.', 409, 'idempotency_in_progress');
  const flag = await prisma.directPixFeatureFlag.findUnique({ where: { id: record.resourceId } });
  if (!flag) throw new Error('Completed legacy drain has no feature flag');
  return { report: await dryRunLegacyDrain({ scope: flag.scope, entityId: flag.entityId ?? undefined, familyId: flag.familyId ?? undefined }), flag: flagDto(flag), replayed: true };
}

/**
 * Atomically verifies that the selected legacy scope is drained and turns on the
 * scoped cutover flag. This is a terminal write gate: it never copies, converts,
 * or dual-writes Donation, Payment, GiftCard, or Direct Pix aggregates.
 */
export async function applyLegacyDrain(actorUserId: string, input: LegacyDrainInput & { idempotencyKey: string; correlationId: string }) {
  assertReason(input.reason);
  const target = targetFor(input.scope, input.entityId, input.familyId);
  const hash = requestHash(input);
  const previous = await replay(actorUserId, input.idempotencyKey, hash);
  if (previous) return previous;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const existingIdempotency = await tx.idempotencyRecord.findUnique({ where: { actorUserId_operation_idempotencyKey: { actorUserId, operation: OPERATION, idempotencyKey: input.idempotencyKey } } });
        if (existingIdempotency) {
          if (existingIdempotency.requestHash !== hash) throw new AppError('A chave de idempotência já foi usada com outra requisição.', 409, 'idempotency_conflict');
          if (existingIdempotency.status !== 'completed' || existingIdempotency.resourceType !== RESOURCE_TYPE || !existingIdempotency.resourceId) throw new AppError('A operação idempotente ainda está em processamento.', 409, 'idempotency_in_progress');
          const flag = await tx.directPixFeatureFlag.findUnique({ where: { id: existingIdempotency.resourceId } });
          if (!flag) throw new Error('Completed legacy drain has no feature flag');
          return { report: await report(target, tx), flag: flagDto(flag), replayed: true };
        }
        await validateTarget(target, tx);
        const drain = await report(target, tx);
        if (!drain.ready) throw new AppError('O escopo legado ainda possui operações pendentes.', 409, 'legacy_drain_incomplete');
        const existing = await tx.directPixFeatureFlag.findFirst({ where: { key: 'LEGACY_WRITE', scope: input.scope, entityId: target.entityId, familyId: target.familyId } });
        if (existing && existing.version !== input.expectedVersion) throw new AppError('A versão da flag está desatualizada.', 409, 'feature_flag_version_conflict');
        if (!existing && input.expectedVersion !== 0) throw new AppError('A flag ainda não existe; use versão esperada zero.', 409, 'feature_flag_version_conflict');
        const record = await tx.idempotencyRecord.create({ data: { actorUserId, operation: OPERATION, idempotencyKey: input.idempotencyKey, requestHash: hash, status: 'processing', expiresAt: new Date(Date.now() + TTL_MS) } });
        const flag = existing
          ? await tx.directPixFeatureFlag.update({ where: { id: existing.id }, data: { enabled: true, updatedByUserId: actorUserId, version: { increment: 1 } } })
          : await tx.directPixFeatureFlag.create({ data: { key: 'LEGACY_WRITE', scope: input.scope, ...target, enabled: true, updatedByUserId: actorUserId } });
        await tx.auditLog.create({ data: { actorUserId, actorRole: 'admin', action: 'direct_pix.legacy_drain.applied', entityType: RESOURCE_TYPE, entityId: flag.id, channel: 'admin_api', correlationId: input.correlationId, idempotencyKey: input.idempotencyKey, result: 'cutover_enabled', metadata: { scope: input.scope, entityId: target.entityId, familyId: target.familyId, previousVersion: existing?.version ?? 0, version: flag.version, reason: input.reason, blockers: drain.blockers } } });
        await tx.idempotencyRecord.update({ where: { id: record.id }, data: { resourceType: RESOURCE_TYPE, resourceId: flag.id, status: 'completed', completedAt: new Date() } });
        return { report: drain, flag: flagDto(flag), replayed: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!isRetriable(error)) throw error;
      const completed = await replay(actorUserId, input.idempotencyKey, hash);
      if (completed) return completed;
    }
  }
  throw new AppError('A operação concorrente não pôde ser concluída. Tente novamente.', 409, 'concurrent_operation');
}
