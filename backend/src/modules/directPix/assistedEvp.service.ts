import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type UserRole } from '@prisma/client';
import { dataSafetyPolicy } from '../../config/dataSafetyPolicy';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { requireStepUpAuthorization } from '../auth/stepUp.service';
import { recordDirectPixOperatorAction } from '../entities/directPixOperatorAuthority.service';
import { resolveEntityAuthority } from '../entities/entityAuthority.service';
import { encryptEvp } from './evpKey.crypto';
import { assertDirectPixCreationAllowed } from './featureFlags.service';

const RESOURCE_TYPE = 'direct_pix_evp_key_version';
const SUBMIT_OPERATION = 'direct_pix.submit_assisted_evp_key';
const CONFIRM_OPERATION = 'direct_pix.confirm_assisted_evp_key';
const TTL_MS = 24 * 60 * 60 * 1000;
const ATTEMPTS = 4;

type VersionRow = { id: string; familyId: string; assignmentId: string; version: number; status: string; submittedAt: Date };
type AssistedVersionRow = VersionRow & { family: { entity: { id: string; name: string } | null } };

export type SubmitAssistedEvpInput = { evp: string; idempotencyKey: string; correlationId: string };
export type ConfirmAssistedEvpInput = { idempotencyKey: string; correlationId: string; stepUpAuthorization: string };

function hash(value: unknown): string { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function retryable(error: unknown): boolean { return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034'); }
function idempotencyConflict(): never { throw new AppError('A chave de idempotência já foi usada com outra requisição.', 409, 'idempotency_conflict'); }
function activeResponsibleRequired(): never { throw new AppError('Responsável familiar ativo não encontrado.', 403, 'active_family_responsible_required'); }
function notFound(): never { throw new AppError('Versão de chave não encontrada.', 404, 'evp_key_version_not_found'); }
function unavailableTransition(): never { throw new AppError('A versão não aguarda confirmação do responsável.', 409, 'evp_key_version_not_awaiting_confirmation'); }

function maskedVersionDto(row: VersionRow) {
  return {
    id: row.id,
    familyId: row.familyId,
    assignmentId: row.assignmentId,
    version: row.version,
    status: row.status,
    submittedAt: row.submittedAt.toISOString(),
    evpMasked: '••••••••-••••-••••-••••-••••••••••••',
  };
}

function awaitingConfirmationDto(row: AssistedVersionRow) {
  return {
    ...maskedVersionDto(row),
    submittedByEntity: row.family.entity ? { id: row.family.entity.id, name: row.family.entity.name } : null,
  };
}

async function replay<T>(actorUserId: string, operation: string, idempotencyKey: string, requestHash: string, load: (resourceId: string) => Promise<T | null>): Promise<T | null> {
  const record = await prisma.idempotencyRecord.findUnique({ where: { actorUserId_operation_idempotencyKey: { actorUserId, operation, idempotencyKey } } });
  if (!record) return null;
  if (record.requestHash !== requestHash) idempotencyConflict();
  if (record.status !== 'completed' || record.resourceType !== RESOURCE_TYPE || !record.resourceId) {
    throw new AppError('A operação idempotente ainda está em processamento.', 409, 'idempotency_in_progress');
  }
  const resource = await load(record.resourceId);
  if (!resource) throw new Error('Completed idempotency record is missing its EVP version');
  return resource;
}

async function createIdempotencyRecord(tx: Prisma.TransactionClient, actorUserId: string, operation: string, idempotencyKey: string, requestHash: string) {
  return tx.idempotencyRecord.create({ data: {
    actorUserId, operation, idempotencyKey, requestHash, status: 'processing', expiresAt: new Date(Date.now() + TTL_MS),
  } });
}

export async function submitAssistedEvpKey(actorUserId: string, familyId: string, input: SubmitAssistedEvpInput) {
  dataSafetyPolicy.assertEvpAllowed(input.evp);
  const requestHash = hash({ operation: SUBMIT_OPERATION, familyId, evp: input.evp });
  const prior = await replay(actorUserId, SUBMIT_OPERATION, input.idempotencyKey, requestHash, async (id) => {
    const row = await prisma.directPixEvpKeyVersion.findUnique({ where: { id }, include: { family: { include: { entity: { select: { id: true, name: true } } } } } });
    return row ? awaitingConfirmationDto(row) : null;
  });
  if (prior) return { keyVersion: prior, replayed: true };

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const created = await prisma.$transaction(async (tx) => {
        const authority = await resolveEntityAuthority(actorUserId, 'pix.submit', tx);
        const family = await tx.family.findFirst({
          where: { id: familyId, entityId: authority.entityId, approvalStatus: 'approved' },
          select: { id: true, entityId: true },
        });
        // Cross-entity objects deliberately look absent.
        if (!family) throw new AppError('Família não encontrada.', 404, 'family_not_found');
        // Evaluate inside this transaction and never cache controls: a kill switch
        // takes effect before any new EVP material is persisted.
        await assertDirectPixCreationAllowed(family.id, family.entityId, tx);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'direct-pix-evp:' + family.id}))`;
        const assignment = await tx.familyResponsibleAssignment.findFirst({
          where: { familyId: family.id, endedAt: null, responsibleUser: { status: 'active' } },
          select: { id: true, familyId: true, responsibleUserId: true },
        });
        if (!assignment) activeResponsibleRequired();
        const idempotency = await createIdempotencyRecord(tx, actorUserId, SUBMIT_OPERATION, input.idempotencyKey, requestHash);
        const latest = await tx.directPixEvpKeyVersion.aggregate({ where: { familyId: family.id }, _max: { version: true } });
        const version = (latest._max.version ?? 0) + 1;
        const id = randomUUID();
        const sealed = encryptEvp(input.evp, { recordId: id, familyId: family.id, assignmentId: assignment.id, version });
        const row = await tx.directPixEvpKeyVersion.create({ data: {
          id, familyId: family.id, assignmentId: assignment.id, submittedByUserId: actorUserId, version,
          status: 'AWAITING_RESPONSIBLE_CONFIRMATION', ...sealed,
        }, include: { family: { include: { entity: { select: { id: true, name: true } } } } } });
        await recordDirectPixOperatorAction(tx, { actorUserId, requiredPermission: 'pix.submit', resourceType: RESOURCE_TYPE, resourceId: row.id, action: 'submit' });
        await tx.auditLog.create({ data: {
          actorUserId, actorRole: 'entity', action: 'direct_pix.evp.assisted_submitted', entityType: RESOURCE_TYPE, entityId: row.id,
          channel: 'assisted_web', correlationId: input.correlationId, idempotencyKey: input.idempotencyKey, result: 'awaiting_responsible_confirmation',
          metadata: { familyId: family.id, assignmentId: assignment.id, submittedByEntityId: authority.entityId, submitterMembershipId: authority.membershipId, version, previousStatus: null, nextStatus: 'AWAITING_RESPONSIBLE_CONFIRMATION' },
        } });
        await tx.outboxEvent.create({ data: { eventType: 'direct_pix.evp.assisted_submitted', aggregateType: RESOURCE_TYPE, aggregateId: row.id, dedupeKey: 'direct-pix-assisted-evp-submitted:' + row.id } });
        await tx.idempotencyRecord.update({ where: { id: idempotency.id }, data: { resourceType: RESOURCE_TYPE, resourceId: row.id, status: 'completed', completedAt: new Date() } });
        return row;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { keyVersion: awaitingConfirmationDto(created), replayed: false };
    } catch (error) {
      if (!retryable(error)) throw error;
      const completed = await replay(actorUserId, SUBMIT_OPERATION, input.idempotencyKey, requestHash, async (id) => {
        const row = await prisma.directPixEvpKeyVersion.findUnique({ where: { id }, include: { family: { include: { entity: { select: { id: true, name: true } } } } } });
        return row ? awaitingConfirmationDto(row) : null;
      });
      if (completed) return { keyVersion: completed, replayed: true };
    }
  }
  throw new AppError('A operação concorrente não pôde ser concluída. Tente novamente.', 409, 'concurrent_operation');
}

export async function listOwnAwaitingAssistedEvpKeys(actorUserId: string) {
  const rows = await prisma.directPixEvpKeyVersion.findMany({
    where: {
      status: 'AWAITING_RESPONSIBLE_CONFIRMATION',
      assignment: { responsibleUserId: actorUserId, endedAt: null, responsibleUser: { status: 'active' } },
    },
    include: { family: { include: { entity: { select: { id: true, name: true } } } } },
    orderBy: { submittedAt: 'desc' },
  });
  return rows.map(awaitingConfirmationDto);
}

export async function confirmAssistedEvpKey(actorUserId: string, actorRole: UserRole, versionId: string, input: ConfirmAssistedEvpInput) {
  if (actorRole !== 'beneficiary') throw new AppError('Acesso negado.', 403, 'forbidden');
  const requestHash = hash({ operation: CONFIRM_OPERATION, versionId });
  const prior = await replay(actorUserId, CONFIRM_OPERATION, input.idempotencyKey, requestHash, async (id) => {
    const row = await prisma.directPixEvpKeyVersion.findUnique({ where: { id } });
    return row ? maskedVersionDto(row) : null;
  });
  if (prior) return { keyVersion: prior, replayed: true };

  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const updated = await prisma.$transaction(async (tx) => {
        const version = await tx.directPixEvpKeyVersion.findUnique({ where: { id: versionId }, select: { id: true, familyId: true, assignmentId: true, version: true, status: true, submittedAt: true, submittedByUserId: true } });
        if (!version) notFound();
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'direct-pix-evp:' + version.familyId}))`;
        // The assignment check is deliberately after the lock and inside this serializable transaction.
        const assignment = await tx.familyResponsibleAssignment.findFirst({
          where: { id: version.assignmentId, familyId: version.familyId, responsibleUserId: actorUserId, endedAt: null, responsibleUser: { status: 'active' } },
          select: { id: true },
        });
        if (!assignment) activeResponsibleRequired();
        if (version.status !== 'AWAITING_RESPONSIBLE_CONFIRMATION') unavailableTransition();
        const idempotency = await createIdempotencyRecord(tx, actorUserId, CONFIRM_OPERATION, input.idempotencyKey, requestHash);
        await requireStepUpAuthorization({ userId: actorUserId, token: input.stepUpAuthorization, purpose: 'change_pix_key', resourceId: version.familyId, consume: true, client: tx });
        const changed = await tx.directPixEvpKeyVersion.updateMany({
          where: { id: version.id, assignmentId: assignment.id, status: 'AWAITING_RESPONSIBLE_CONFIRMATION' },
          data: { status: 'PENDING_REVIEW' },
        });
        if (changed.count !== 1) unavailableTransition();
        const row = await tx.directPixEvpKeyVersion.findUniqueOrThrow({ where: { id: version.id } });
        await tx.auditLog.create({ data: {
          actorUserId, actorRole: 'beneficiary', action: 'direct_pix.evp.assisted_confirmed', entityType: RESOURCE_TYPE, entityId: row.id,
          channel: 'web_pwa', correlationId: input.correlationId, idempotencyKey: input.idempotencyKey, result: 'pending_review',
          metadata: { familyId: row.familyId, assignmentId: row.assignmentId, declarantUserId: actorUserId, assistedSubmitterUserId: version.submittedByUserId, version: row.version, previousStatus: 'AWAITING_RESPONSIBLE_CONFIRMATION', nextStatus: 'PENDING_REVIEW' },
        } });
        await tx.outboxEvent.create({ data: { eventType: 'direct_pix.evp.assisted_confirmed', aggregateType: RESOURCE_TYPE, aggregateId: row.id, dedupeKey: 'direct-pix-assisted-evp-confirmed:' + row.id } });
        await tx.idempotencyRecord.update({ where: { id: idempotency.id }, data: { resourceType: RESOURCE_TYPE, resourceId: row.id, status: 'completed', completedAt: new Date() } });
        return row;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { keyVersion: maskedVersionDto(updated), replayed: false };
    } catch (error) {
      if (!retryable(error)) throw error;
      const completed = await replay(actorUserId, CONFIRM_OPERATION, input.idempotencyKey, requestHash, async (id) => {
        const row = await prisma.directPixEvpKeyVersion.findUnique({ where: { id } });
        return row ? maskedVersionDto(row) : null;
      });
      if (completed) return { keyVersion: completed, replayed: true };
    }
  }
  throw new AppError('A operação concorrente não pôde ser concluída. Tente novamente.', 409, 'concurrent_operation');
}
