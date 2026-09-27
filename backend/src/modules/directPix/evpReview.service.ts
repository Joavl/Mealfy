import { createHash, randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { resolveEntityAuthority } from '../entities/entityAuthority.service';
import { encryptExpectedCivilName } from './evpReview.crypto';
import type { ReviewEvpKeyInput, SecondApproveEvpKeyInput } from './evpReview.validator';

const VERSION_TYPE = 'direct_pix_evp_key_version';
const REVIEW_TYPE = 'direct_pix_evp_key_review';
const FIRST_OPERATION = 'direct_pix.review_evp_key';
const SECOND_OPERATION = 'direct_pix.second_approve_evp_key';
const TTL_MS = 24 * 60 * 60 * 1000;
const ATTEMPTS = 4;
type ReviewInput = ReviewEvpKeyInput | (SecondApproveEvpKeyInput & { decision: 'APPROVE' });

function requestHash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function retryable(error: unknown) { return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034'); }
function notFound(): never { throw new AppError('Versão de chave não encontrada.', 404, 'evp_key_version_not_found'); }
function conflict(code: string, message: string): never { throw new AppError(message, 409, code); }

function versionDto(row: { id: string; familyId: string; version: number; status: string; submittedAt: Date }) {
  return { id: row.id, familyId: row.familyId, version: row.version, status: row.status, submittedAt: row.submittedAt.toISOString(), evpMasked: '••••••••-••••-••••-••••-••••••••••••' };
}
function reviewDto(row: { id: string; sequence: number; decision: string; reason: string; createdAt: Date }) {
  return { id: row.id, sequence: row.sequence, decision: row.decision, reason: row.reason, reviewedAt: row.createdAt.toISOString() };
}

async function replay(actorUserId: string, operation: string, key: string, hash: string) {
  const record = await prisma.idempotencyRecord.findUnique({ where: { actorUserId_operation_idempotencyKey: { actorUserId, operation, idempotencyKey: key } } });
  if (!record) return null;
  if (record.requestHash !== hash) conflict('idempotency_conflict', 'A chave de idempotência já foi usada com outra requisição.');
  if (record.expiresAt <= new Date()) conflict('idempotency_expired', 'A chave de idempotência expirou.');
  if (record.status !== 'completed' || record.resourceType !== REVIEW_TYPE || !record.resourceId) conflict('idempotency_in_progress', 'A operação idempotente ainda está em processamento.');
  const review = await prisma.directPixEvpKeyReview.findUnique({ where: { id: record.resourceId }, include: { keyVersion: true } });
  if (!review) throw new Error('Completed EVP review idempotency record is missing its review');
  const authority = await resolveEntityAuthority(actorUserId, 'pix.review');
  if (review.reviewerMembershipId !== authority.membershipId || review.keyVersion.familyId === '') notFound();
  const owned = await prisma.family.findFirst({ where: { id: review.keyVersion.familyId, entityId: authority.entityId }, select: { id: true } });
  if (!owned) notFound();
  return { keyVersion: versionDto(review.keyVersion), review: reviewDto(review), replayed: true };
}

export async function listEvpReviewQueue(actorUserId: string) {
  const authority = await resolveEntityAuthority(actorUserId, 'pix.review');
  const rows = await prisma.directPixEvpKeyVersion.findMany({
    where: { family: { entityId: authority.entityId }, status: { in: ['PENDING_REVIEW', 'SECOND_APPROVAL_REQUIRED'] } },
    select: { id: true, familyId: true, version: true, status: true, submittedAt: true },
    orderBy: { submittedAt: 'asc' }, take: 100,
  });
  return rows.map(versionDto);
}

async function validateScopeAndSeparation(tx: Prisma.TransactionClient, actorUserId: string, versionId: string, requiredStatus: 'PENDING_REVIEW' | 'SECOND_APPROVAL_REQUIRED', expectedSequence: number) {
  const authority = await resolveEntityAuthority(actorUserId, 'pix.review', tx);
  const version = await tx.directPixEvpKeyVersion.findFirst({
    where: { id: versionId, family: { entityId: authority.entityId } },
    select: { id: true, familyId: true, version: true, status: true, submittedAt: true, submittedByUserId: true, fingerprintKid: true, fingerprint: true },
  });
  if (!version) notFound();
  if (version.submittedByUserId === actorUserId) conflict('maker_checker_conflict', 'Quem submeteu não pode revisar a mesma versão.');
  if (version.status !== requiredStatus) conflict('evp_key_version_not_reviewable', 'A versão não está disponível para esta revisão.');
  const reviews = await tx.directPixEvpKeyReview.findMany({ where: { keyVersionId: version.id }, select: { sequence: true, reviewerMembershipId: true, reviewerUserId: true } });
  if (reviews.some((review) => review.reviewerUserId === actorUserId || review.reviewerMembershipId === authority.membershipId)) conflict('maker_checker_conflict', 'O revisor já registrou uma decisão nesta versão.');
  if (reviews.length !== expectedSequence - 1) conflict('evp_key_version_not_reviewable', 'A sequência de revisão é inválida.');
  const operatorSubmit = await tx.directPixOperatorAction.findFirst({ where: { entityId: authority.entityId, resourceType: VERSION_TYPE, resourceId: version.id, action: 'submit' }, select: { membershipId: true } });
  if (operatorSubmit?.membershipId === authority.membershipId) conflict('maker_checker_conflict', 'Quem submeteu não pode revisar a mesma versão.');
  return { authority, version };
}

async function performReview(actorUserId: string, versionId: string, input: ReviewInput, idempotencyKey: string, correlationId: string, second: boolean) {
  const operation = second ? SECOND_OPERATION : FIRST_OPERATION;
  const hash = requestHash({ operation, versionId, decision: input.decision, reason: input.reason, expectedCivilName: input.expectedCivilName });
  const prior = await replay(actorUserId, operation, idempotencyKey, hash);
  if (prior) return prior;
  for (let attempt = 0; attempt < ATTEMPTS; attempt += 1) {
    try {
      const result = await prisma.$transaction(async (tx) => {
        // Lock by immutable version id before the first MVCC read. Under SERIALIZABLE,
        // this makes a racing same-key request obtain its snapshot only after the winner
        // commits, so it can return the completed idempotent decision.
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'direct-pix-evp-version:' + versionId}))`;
        const initial = await tx.directPixEvpKeyVersion.findUnique({ where: { id: versionId }, select: { familyId: true } });
        if (!initial) notFound();
        // Resolve present authority before considering a completed replay, then serialize
        // the idempotency re-check with the family transition.
        const currentAuthority = await resolveEntityAuthority(actorUserId, 'pix.review', tx);
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'direct-pix-evp:' + initial.familyId}))`;
        const existingIdempotency = await tx.idempotencyRecord.findUnique({ where: { actorUserId_operation_idempotencyKey: { actorUserId, operation, idempotencyKey } } });
        if (existingIdempotency) {
          if (existingIdempotency.requestHash !== hash) conflict('idempotency_conflict', 'A chave de idempotência já foi usada com outra requisição.');
          if (existingIdempotency.status === 'completed' && existingIdempotency.resourceType === REVIEW_TYPE && existingIdempotency.resourceId) {
            const existingReview = await tx.directPixEvpKeyReview.findUnique({ where: { id: existingIdempotency.resourceId }, include: { keyVersion: true } });
            if (!existingReview || existingReview.reviewerMembershipId !== currentAuthority.membershipId || existingReview.keyVersion.familyId !== initial.familyId) notFound();
            return { replay: true as const, keyVersion: existingReview.keyVersion, review: existingReview, riskCode: null };
          }
          conflict('idempotency_in_progress', 'A operação idempotente ainda está em processamento.');
        }
        const { authority, version } = await validateScopeAndSeparation(tx, actorUserId, versionId, second ? 'SECOND_APPROVAL_REQUIRED' : 'PENDING_REVIEW', second ? 2 : 1);
        const idem = await tx.idempotencyRecord.create({ data: { actorUserId, operation, idempotencyKey, requestHash: hash, status: 'processing', expiresAt: new Date(Date.now() + TTL_MS) } });
        const reviewId = randomUUID();
        const decision = input.decision;
        let nextStatus: 'ACTIVE' | 'REJECTED' | 'SECOND_APPROVAL_REQUIRED';
        let riskCode: string | null = null;
        if (decision === 'REJECT') nextStatus = 'REJECTED';
        else if (second) nextStatus = 'ACTIVE';
        else {
          // Pair KID and digest: matching unrelated KIDs must never count as a duplicate.
          const indexes = await tx.directPixEvpKeyFingerprint.findMany({ where: { keyVersionId: version.id }, select: { fingerprintKid: true, fingerprint: true } });
          const reused = indexes.length === 0
            ? await tx.directPixEvpKeyVersion.findFirst({ where: { id: { not: version.id }, fingerprintKid: version.fingerprintKid, fingerprint: version.fingerprint }, select: { id: true } })
            : await tx.directPixEvpKeyVersion.findFirst({ where: { id: { not: version.id }, fingerprints: { some: { OR: indexes.map((entry) => ({ fingerprintKid: entry.fingerprintKid, fingerprint: entry.fingerprint })) } } }, select: { id: true } });
          if (reused) { nextStatus = 'SECOND_APPROVAL_REQUIRED'; riskCode = 'duplicate_evp_review_required'; }
          else nextStatus = 'ACTIVE';
        }
        const sealedName = encryptExpectedCivilName(input.expectedCivilName, { reviewId, versionId: version.id, sequence: second ? 2 : 1 });
        const review = await tx.directPixEvpKeyReview.create({ data: { id: reviewId, keyVersionId: version.id, reviewerUserId: actorUserId, reviewerMembershipId: authority.membershipId, sequence: second ? 2 : 1, decision, reason: input.reason, ...sealedName } });
        if (nextStatus === 'ACTIVE') {
          await tx.directPixEvpKeyVersion.updateMany({ where: { familyId: version.familyId, status: 'ACTIVE' }, data: { status: 'SUPERSEDED' } });
        }
        const changed = await tx.directPixEvpKeyVersion.updateMany({ where: { id: version.id, status: version.status }, data: { status: nextStatus } });
        if (changed.count !== 1) conflict('evp_key_version_not_reviewable', 'A versão não está disponível para esta revisão.');
        await tx.directPixOperatorAction.create({ data: { entityId: authority.entityId, membershipId: authority.membershipId, actorUserId, resourceType: VERSION_TYPE, resourceId: version.id, action: 'review' } });
        await tx.auditLog.create({ data: { actorUserId, actorRole: 'entity', action: second ? 'direct_pix.evp.second_approved' : 'direct_pix.evp.reviewed', entityType: REVIEW_TYPE, entityId: review.id, channel: 'web_pwa', correlationId, idempotencyKey, result: nextStatus.toLowerCase(), metadata: { familyId: version.familyId, keyVersionId: version.id, sequence: review.sequence, decision, reason: input.reason, reviewerMembershipId: authority.membershipId, previousStatus: version.status, nextStatus, riskCode } } });
        await tx.outboxEvent.create({ data: { eventType: second ? 'direct_pix.evp.second_approved' : 'direct_pix.evp.reviewed', aggregateType: REVIEW_TYPE, aggregateId: review.id, dedupeKey: 'direct-pix-evp-review:' + review.id } });
        await tx.idempotencyRecord.update({ where: { id: idem.id }, data: { resourceType: REVIEW_TYPE, resourceId: review.id, status: 'completed', completedAt: new Date() } });
        return { keyVersion: { ...version, status: nextStatus }, review, riskCode };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      if (result.replay) return { keyVersion: versionDto(result.keyVersion), review: reviewDto(result.review), riskCode: result.riskCode, replayed: true };
      return { keyVersion: versionDto(result.keyVersion), review: reviewDto(result.review), riskCode: result.riskCode, replayed: false };
    } catch (error) {
      // A competing second approval may observe the terminal status after waiting on
      // the family lock (not a serialization failure). Its same idempotency key must
      // still replay the committed immutable review rather than report a transition error.
      if (second) {
        const completed = await replay(actorUserId, operation, idempotencyKey, hash);
        if (completed) return completed;
      }
      if (!retryable(error)) throw error;
      const completed = await replay(actorUserId, operation, idempotencyKey, hash);
      if (completed) return completed;
    }
  }
  conflict('concurrent_operation', 'A operação concorrente não pôde ser concluída. Tente novamente.');
}

export function reviewEvpKey(actorUserId: string, versionId: string, input: ReviewEvpKeyInput & { idempotencyKey: string; correlationId: string }) { return performReview(actorUserId, versionId, input, input.idempotencyKey, input.correlationId, false); }
export function secondApproveEvpKey(actorUserId: string, versionId: string, input: SecondApproveEvpKeyInput & { idempotencyKey: string; correlationId: string }) { return performReview(actorUserId, versionId, { ...input, decision: 'APPROVE' }, input.idempotencyKey, input.correlationId, true); }
