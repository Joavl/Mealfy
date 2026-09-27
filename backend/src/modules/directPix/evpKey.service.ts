import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { dataSafetyPolicy } from '../../config/dataSafetyPolicy';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { requireStepUpAuthorization } from '../auth/stepUp.service';
import { encryptEvp } from './evpKey.crypto';
import { assertDirectPixCreationAllowed } from './featureFlags.service';

const OPERATION = 'direct_pix.submit_evp_key';
const REVOKE_OPERATION = 'direct_pix.revoke_evp_key';
const RESOURCE_TYPE = 'direct_pix_evp_key_version';
const TTL_MS = 24 * 60 * 60 * 1000;
const ATTEMPTS = 4;
const REVOCABLE_STATUSES = ['AWAITING_RESPONSIBLE_CONFIRMATION', 'PENDING_REVIEW', 'SECOND_APPROVAL_REQUIRED', 'ACTIVE', 'SUSPENDED'] as const;
export type SubmitEvpInput = { evp: string; idempotencyKey: string; correlationId: string; stepUpAuthorization: string };
export type RevokeEvpInput = { idempotencyKey: string; correlationId: string; stepUpAuthorization: string; reason: string };

type VersionRow = { id: string; familyId: string; assignmentId: string; version: number; status: string; submittedAt: Date };

function requestHash(evp: string): string { return createHash('sha256').update(JSON.stringify({ operation: OPERATION, evp })).digest('hex'); }
function revokeRequestHash(versionId: string, reason: string): string { return createHash('sha256').update(JSON.stringify({ operation: REVOKE_OPERATION, versionId, reason })).digest('hex'); }
function conflict(): never { throw new AppError('A chave de idempotência já foi usada com outra requisição.', 409, 'idempotency_conflict'); }
function retryable(error: unknown): boolean { return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034'); }
function unavailable(): never { throw new AppError('Responsável familiar ativo não encontrado.', 403, 'active_family_responsible_required'); }
function notFound(): never { throw new AppError('Versão de chave não encontrada.', 404, 'evp_key_version_not_found'); }

function dto(row: VersionRow) {
  // Deliberately fixed: response consumers never receive raw EVP or a derived suffix.
  return { id: row.id, familyId: row.familyId, assignmentId: row.assignmentId, version: row.version, status: row.status, submittedAt: row.submittedAt.toISOString(), evpMasked: '••••••••-••••-••••-••••-••••••••••••' };
}

/** Atomically kills all scoped proof and disclosure material after a lifecycle boundary. */
export async function revokeFamilyPixStepUpGrants(tx: Prisma.TransactionClient, familyId: string, now = new Date()): Promise<void> {
  await tx.stepUpAuthorization.updateMany({
    where: { resourceId: familyId, revokedAt: null },
    data: { revokedAt: now },
  });
  await tx.stepUpChallenge.updateMany({
    where: { resourceId: familyId, consumedAt: null, invalidatedAt: null },
    data: { invalidatedAt: now },
  });
  await tx.pixDisclosureGrant.updateMany({
    where: { revokedAt: null, intent: { familyId } },
    data: { revokedAt: now },
  });
}

async function replay(actorUserId: string, operation: string, key: string, hash: string) {
  const record = await prisma.idempotencyRecord.findUnique({ where: { actorUserId_operation_idempotencyKey: { actorUserId, operation, idempotencyKey: key } } });
  if (!record) return null;
  if (record.requestHash !== hash) conflict();
  if (record.expiresAt <= new Date()) throw new AppError('A chave de idempotência expirou.', 409, 'idempotency_expired');
  if (record.status !== 'completed' || record.resourceType !== RESOURCE_TYPE || !record.resourceId) throw new AppError('A operação idempotente ainda está em processamento.', 409, 'idempotency_in_progress');
  // A replay is not secret-bearing, but it still requires present-time responsibility.
  const version = await prisma.directPixEvpKeyVersion.findFirst({
    where: {
      id: record.resourceId,
      assignment: { responsibleUserId: actorUserId, endedAt: null, responsibleUser: { status: 'active', role: 'beneficiary' } },
      family: { approvalStatus: 'approved' },
    },
    select: { id: true, familyId: true, assignmentId: true, version: true, status: true, submittedAt: true },
  });
  if (!version) unavailable();
  return dto(version);
}

export async function readCurrentEvpKey(actorUserId: string, stepUpAuthorization: string) {
  return prisma.$transaction(async (tx) => {
    const assignment = await tx.familyResponsibleAssignment.findFirst({
      where: { responsibleUserId: actorUserId, endedAt: null, responsibleUser: { status: 'active', role: 'beneficiary' }, family: { approvalStatus: 'approved' } },
      select: { id: true, familyId: true },
    });
    if (!assignment) unavailable();
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'direct-pix-evp:' + assignment.familyId}))`;
    const currentAssignment = await tx.familyResponsibleAssignment.findFirst({ where: { id: assignment.id, familyId: assignment.familyId, responsibleUserId: actorUserId, endedAt: null }, select: { id: true } });
    if (!currentAssignment) unavailable();
    await requireStepUpAuthorization({ userId: actorUserId, token: stepUpAuthorization, purpose: 'view_pix_key', resourceId: assignment.familyId, client: tx });
    const version = await tx.directPixEvpKeyVersion.findFirst({
      where: { familyId: assignment.familyId, assignmentId: assignment.id, status: 'ACTIVE' },
      select: { id: true, familyId: true, assignmentId: true, version: true, status: true, submittedAt: true },
      orderBy: { version: 'desc' },
    });
    if (!version) throw new AppError('Nenhuma chave Pix ativa está disponível.', 404, 'active_evp_key_not_found');
    await tx.auditLog.create({ data: { actorUserId, actorRole: 'beneficiary', action: 'direct_pix.evp.masked_viewed', entityType: RESOURCE_TYPE, entityId: version.id, channel: 'web_pwa', result: 'masked_viewed', metadata: { familyId: assignment.familyId, assignmentId: assignment.id, version: version.version } } });
    return dto(version);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

export async function submitEvpKey(actorUserId: string, input: SubmitEvpInput) {
  dataSafetyPolicy.assertEvpAllowed(input.evp);
  const hash = requestHash(input.evp);
  const existing = await replay(actorUserId, OPERATION, input.idempotencyKey, hash);
  if (existing) return { version: existing, replayed: true };
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const version = await prisma.$transaction(async (tx) => {
        const assignment = await tx.familyResponsibleAssignment.findFirst({ where: { responsibleUserId: actorUserId, endedAt: null, responsibleUser: { status: 'active' }, family: { approvalStatus: 'approved' } }, select: { id: true, familyId: true } });
        if (!assignment) unavailable();
        const family = await tx.family.findUnique({ where: { id: assignment.familyId }, select: { entityId: true } });
        await assertDirectPixCreationAllowed(assignment.familyId, family?.entityId ?? null, tx);
        await tx.$executeRawUnsafe('SELECT pg_advisory_xact_lock(hashtext($1))', 'direct-pix-evp:' + assignment.familyId);
        const current = await tx.familyResponsibleAssignment.findFirst({ where: { id: assignment.id, familyId: assignment.familyId, responsibleUserId: actorUserId, endedAt: null }, select: { id: true } });
        if (!current) unavailable();
        // Claim idempotency before consuming the one-time step-up proof. A racing retry
        // then replays the committed version rather than failing with a spent proof.
        const idempotency = await tx.idempotencyRecord.create({ data: { actorUserId, operation: OPERATION, idempotencyKey: input.idempotencyKey, requestHash: hash, status: 'processing', expiresAt: new Date(Date.now() + TTL_MS) } });
        await requireStepUpAuthorization({ userId: actorUserId, token: input.stepUpAuthorization, purpose: 'change_pix_key', resourceId: assignment.familyId, consume: true, client: tx });
        const latest = await tx.directPixEvpKeyVersion.aggregate({ where: { familyId: assignment.familyId }, _max: { version: true } });
        const number = (latest._max.version ?? 0) + 1;
        const id = randomUUID();
        const sealed = encryptEvp(input.evp, { recordId: id, familyId: assignment.familyId, assignmentId: assignment.id, version: number });
        const created = await tx.directPixEvpKeyVersion.create({ data: { id, familyId: assignment.familyId, assignmentId: assignment.id, submittedByUserId: actorUserId, version: number, status: 'PENDING_REVIEW', ...sealed } });
        await tx.auditLog.create({ data: { actorUserId, action: 'direct_pix.evp.submitted', entityType: RESOURCE_TYPE, entityId: created.id, channel: 'web_pwa', correlationId: input.correlationId, idempotencyKey: input.idempotencyKey, result: 'pending_review', metadata: { familyId: assignment.familyId, assignmentId: assignment.id, version: number } } });
        await tx.outboxEvent.create({ data: { eventType: 'direct_pix.evp.submitted', aggregateType: RESOURCE_TYPE, aggregateId: created.id, dedupeKey: 'direct-pix-evp-submitted:' + created.id } });
        await tx.idempotencyRecord.update({ where: { id: idempotency.id }, data: { resourceType: RESOURCE_TYPE, resourceId: created.id, status: 'completed', completedAt: new Date() } });
        return created;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { version: dto(version), replayed: false };
    } catch (error) {
      if (!retryable(error)) throw error;
      const completed = await replay(actorUserId, OPERATION, input.idempotencyKey, hash);
      if (completed) return { version: completed, replayed: true };
    }
  }
  throw new AppError('A operação concorrente não pôde ser concluída. Tente novamente.', 409, 'concurrent_operation');
}

export async function revokeOwnEvpKey(actorUserId: string, versionId: string, input: RevokeEvpInput) {
  const hash = revokeRequestHash(versionId, input.reason);
  const existing = await replay(actorUserId, REVOKE_OPERATION, input.idempotencyKey, hash);
  if (existing) return { version: existing, replayed: true };
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const version = await prisma.$transaction(async (tx) => {
        const requested = await tx.directPixEvpKeyVersion.findUnique({ where: { id: versionId }, select: { id: true, familyId: true, assignmentId: true } });
        if (!requested) notFound();
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'direct-pix-evp:' + requested.familyId}))`;
        const assignment = await tx.familyResponsibleAssignment.findFirst({
          where: { id: requested.assignmentId, familyId: requested.familyId, responsibleUserId: actorUserId, endedAt: null, responsibleUser: { status: 'active', role: 'beneficiary' } },
          select: { id: true, familyId: true },
        });
        if (!assignment) unavailable();
        const idempotency = await tx.idempotencyRecord.create({ data: { actorUserId, operation: REVOKE_OPERATION, idempotencyKey: input.idempotencyKey, requestHash: hash, status: 'processing', expiresAt: new Date(Date.now() + TTL_MS) } });
        await requireStepUpAuthorization({ userId: actorUserId, token: input.stepUpAuthorization, purpose: 'revoke_pix_key', resourceId: assignment.familyId, consume: true, client: tx });
        const revoked = await tx.directPixEvpKeyVersion.updateMany({
          where: { familyId: assignment.familyId, assignmentId: assignment.id, status: { in: [...REVOCABLE_STATUSES] } },
          data: { status: 'REVOKED' },
        });
        if (revoked.count === 0) throw new AppError('A versão de chave não pode ser revogada no estado atual.', 409, 'evp_key_version_not_revocable');
        await revokeFamilyPixStepUpGrants(tx, assignment.familyId);
        const row = await tx.directPixEvpKeyVersion.findUniqueOrThrow({ where: { id: requested.id }, select: { id: true, familyId: true, assignmentId: true, version: true, status: true, submittedAt: true } });
        await tx.auditLog.create({ data: { actorUserId, actorRole: 'beneficiary', action: 'direct_pix.evp.revoked', entityType: RESOURCE_TYPE, entityId: row.id, channel: 'web_pwa', correlationId: input.correlationId, idempotencyKey: input.idempotencyKey, result: 'revoked', metadata: { familyId: assignment.familyId, assignmentId: assignment.id, version: row.version, reason: input.reason, revokedUsableVersionCount: revoked.count } } });
        await tx.outboxEvent.create({ data: { eventType: 'direct_pix.evp.revoked', aggregateType: RESOURCE_TYPE, aggregateId: row.id, dedupeKey: 'direct-pix-evp-revoked:' + idempotency.id } });
        await tx.idempotencyRecord.update({ where: { id: idempotency.id }, data: { resourceType: RESOURCE_TYPE, resourceId: row.id, status: 'completed', completedAt: new Date() } });
        return row;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { version: dto(version), replayed: false };
    } catch (error) {
      if (!retryable(error)) throw error;
      const completed = await replay(actorUserId, REVOKE_OPERATION, input.idempotencyKey, hash);
      if (completed) return { version: completed, replayed: true };
    }
  }
  throw new AppError('A operação concorrente não pôde ser concluída. Tente novamente.', 409, 'concurrent_operation');
}
