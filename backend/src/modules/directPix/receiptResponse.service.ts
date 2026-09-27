import { createHash, randomUUID } from 'node:crypto';
import { Prisma, type UserRole } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { requireStepUpAuthorization } from '../auth/stepUp.service';
import { resolveEntityAuthority } from '../entities/entityAuthority.service';
import type { AssistedReceiptResponseInput, CancelDeclarationInput, ResponsibleReceiptResponseInput } from './receiptResponse.validator';

const TTL_MS = 24 * 60 * 60 * 1000;
const CONFIRMATION_TYPE = 'direct_pix_receipt_confirmation';
const CANCELLATION_TYPE = 'direct_pix_declaration_cancellation';
const CASE_TYPE = 'direct_pix_follow_up_case';

function hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function conflict(code: string, message: string): never { throw new AppError(message, 409, code); }
function notFound(): never { throw new AppError('Recurso Pix direto não encontrado.', 404, 'direct_pix_resource_not_found'); }
function retryable(error: unknown) { return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034'); }

function intentDto(intent: { id: string; status: string; amountCents: number; declaredAt: Date | null; confirmationDeadlineAt: Date | null }) {
  return { id: intent.id, status: intent.status, amountCents: intent.amountCents, declaredAt: intent.declaredAt?.toISOString() ?? null, confirmationDeadlineAt: intent.confirmationDeadlineAt?.toISOString() ?? null };
}
function receiptDto(receipt: { id: string; outcome: string; receivedAmountCents: number | null; respondedAt: Date; recordedByOperatorUserId: string | null; assistedChannel: string | null }) {
  return { id: receipt.id, outcome: receipt.outcome, receivedAmountCents: receipt.receivedAmountCents, respondedAt: receipt.respondedAt.toISOString(), assisted: receipt.recordedByOperatorUserId !== null, assistedChannel: receipt.assistedChannel };
}
function caseDto(row: { id: string; intentId: string; reason: string; status: string; openedAt: Date }) { return { id: row.id, intentId: row.intentId, reason: row.reason, status: row.status, openedAt: row.openedAt.toISOString() }; }

async function prior(actorUserId: string, operation: string, key: string, requestHash: string) {
  const record = await prisma.idempotencyRecord.findUnique({ where: { actorUserId_operation_idempotencyKey: { actorUserId, operation, idempotencyKey: key } } });
  if (!record) return null;
  if (record.requestHash !== requestHash) conflict('idempotency_conflict', 'A chave de idempotência já foi usada com outra requisição.');
  if (record.expiresAt <= new Date()) conflict('idempotency_expired', 'A chave de idempotência expirou.');
  if (record.status !== 'completed' || !record.resourceId) conflict('idempotency_in_progress', 'A operação idempotente ainda está em processamento.');
  return record;
}

async function run<T>(actorUserId: string, operation: string, idempotencyKey: string, requestHash: string, task: (tx: Prisma.TransactionClient, record: { id: string }) => Promise<T>): Promise<{ value: T; replayed: boolean }> {
  const existing = await prior(actorUserId, operation, idempotencyKey, requestHash);
  if (existing) return { value: await replayValue(existing), replayed: true } as { value: T; replayed: boolean };
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const locked = await tx.idempotencyRecord.findUnique({ where: { actorUserId_operation_idempotencyKey: { actorUserId, operation, idempotencyKey } } });
        if (locked) {
          if (locked.requestHash !== requestHash) conflict('idempotency_conflict', 'A chave de idempotência já foi usada com outra requisição.');
          if (locked.status !== 'completed' || !locked.resourceId) conflict('idempotency_in_progress', 'A operação idempotente ainda está em processamento.');
          return { value: await replayValue(locked, tx), replayed: true } as { value: T; replayed: boolean };
        }
        const record = await tx.idempotencyRecord.create({ data: { actorUserId, operation, idempotencyKey, requestHash, status: 'processing', expiresAt: new Date(Date.now() + TTL_MS) } });
        const value = await task(tx, record);
        return { value, replayed: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!retryable(error)) throw error;
      const completed = await prior(actorUserId, operation, idempotencyKey, requestHash);
      if (completed) return { value: await replayValue(completed), replayed: true } as { value: T; replayed: boolean };
    }
  }
  conflict('concurrent_operation', 'A operação concorrente não pôde ser concluída. Tente novamente.');
}

async function replayValue(record: { resourceType: string | null; resourceId: string | null }, tx: Prisma.TransactionClient | typeof prisma = prisma): Promise<unknown> {
  if (record.resourceType === CANCELLATION_TYPE) {
    const cancellation = await tx.directPixDeclarationCancellation.findUnique({ where: { id: record.resourceId! }, include: { declaration: { include: { intent: true } } } });
    if (!cancellation) throw new Error('Missing cancellation replay resource');
    return { intent: intentDto(cancellation.declaration.intent), cancellation: { id: cancellation.id, reason: cancellation.reason, canceledAt: cancellation.canceledAt.toISOString() } };
  }
  if (record.resourceType === CONFIRMATION_TYPE) {
    const receipt = await tx.directPixReceiptConfirmation.findUnique({ where: { id: record.resourceId! }, include: { intent: true } });
    if (!receipt) throw new Error('Missing receipt replay resource');
    const followUp = await tx.directPixFollowUpCase.findFirst({ where: { intentId: receipt.intentId, status: 'OPEN' } });
    return { intent: intentDto(receipt.intent), receipt: receiptDto(receipt), followUpCase: followUp ? caseDto(followUp) : null };
  }
  throw new Error('Unexpected replay resource type');
}

export async function cancelDonorDeclaration(actorUserId: string, intentId: string, input: CancelDeclarationInput & { idempotencyKey: string; correlationId: string }) {
  const operation = 'direct_pix.cancel_declaration'; const requestHash = hash({ intentId, reason: input.reason });
  const result = await run(actorUserId, operation, input.idempotencyKey, requestHash, async (tx, record) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'direct-pix-intent:' + intentId}))`;
    const intent = await tx.directPixIntent.findFirst({ where: { id: intentId, donorId: actorUserId }, include: { declaration: { include: { cancellation: true } }, receiptConfirmation: true } });
    if (!intent) notFound();
    if (intent.status !== 'DONOR_DECLARED' || !intent.declaration || intent.declaration.cancellation || intent.receiptConfirmation) conflict('declaration_not_cancelable', 'A declaração não pode mais ser cancelada.');
    const changed = await tx.directPixIntent.updateMany({ where: { id: intent.id, status: 'DONOR_DECLARED' }, data: { status: 'CANCELED_BY_DONOR' } });
    if (changed.count !== 1) conflict('declaration_not_cancelable', 'A declaração não pode mais ser cancelada.');
    const cancellation = await tx.directPixDeclarationCancellation.create({ data: { declarationId: intent.declaration.id, canceledByUserId: actorUserId, reason: input.reason } });
    const updated = { ...intent, status: 'CANCELED_BY_DONOR' };
    await tx.auditLog.create({ data: { actorUserId, actorRole: 'donor', action: 'direct_pix.declaration.canceled_by_donor', entityType: CANCELLATION_TYPE, entityId: cancellation.id, channel: 'web_pwa', correlationId: input.correlationId, idempotencyKey: input.idempotencyKey, result: 'canceled', metadata: { intentId: intent.id, previousStatus: 'DONOR_DECLARED', nextStatus: 'CANCELED_BY_DONOR', reason: input.reason } } });
    await tx.outboxEvent.create({ data: { eventType: 'direct_pix.declaration.canceled_by_donor', aggregateType: CANCELLATION_TYPE, aggregateId: cancellation.id, dedupeKey: 'direct-pix-declaration-cancel:' + cancellation.id } });
    await tx.idempotencyRecord.update({ where: { id: record.id }, data: { resourceType: CANCELLATION_TYPE, resourceId: cancellation.id, status: 'completed', completedAt: new Date() } });
    return { intent: intentDto(updated), cancellation: { id: cancellation.id, reason: cancellation.reason, canceledAt: cancellation.canceledAt.toISOString() } };
  });
  return { ...result.value as object, replayed: result.replayed };
}

type ReceiptInput = ResponsibleReceiptResponseInput | AssistedReceiptResponseInput;
async function recordReceipt(actorUserId: string, actorRole: UserRole, intentId: string, input: ReceiptInput & { idempotencyKey: string; correlationId: string; stepUpAuthorization?: string }, assisted: boolean) {
  const operation = assisted ? 'direct_pix.record_assisted_receipt_response' : 'direct_pix.confirm_receipt_response';
  // Correlation and one-time step-up tokens are transport metadata, not request identity.
  const requestHash = hash({ intentId, outcome: input.outcome, receivedAmountCents: input.outcome === 'RECEIVED_DIFFERENT' ? input.receivedAmountCents : null, assistedChannel: assisted ? (input as AssistedReceiptResponseInput).assistedChannel : null });
  const result = await run(actorUserId, operation, input.idempotencyKey, requestHash, async (tx, record) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'direct-pix-intent:' + intentId}))`;
    const intent = await tx.directPixIntent.findUnique({ where: { id: intentId }, include: { declaration: { include: { cancellation: true } }, receiptConfirmation: true, family: { select: { entityId: true } } } });
    if (!intent) notFound();
    if (intent.status !== 'DONOR_DECLARED' || !intent.declaration || intent.declaration.cancellation || intent.receiptConfirmation) conflict('receipt_not_recordable', 'A resposta de recebimento não está disponível.');
    const assignment = await tx.familyResponsibleAssignment.findFirst({ where: { id: intent.responsibleAssignmentId, familyId: intent.familyId, endedAt: null, responsibleUser: { status: 'active', role: 'beneficiary' } }, select: { id: true, responsibleUserId: true } });
    if (!assignment) conflict('responsible_assignment_inactive', 'O vínculo do responsável não está ativo.');
    let authority: { entityId: string; membershipId: string } | null = null;
    if (assisted) {
      authority = await resolveEntityAuthority(actorUserId, 'pix.follow_up', tx);
      if (authority.entityId !== intent.family.entityId) notFound();
    } else {
      if (actorRole !== 'beneficiary' || assignment.responsibleUserId !== actorUserId) notFound();
      if (!input.stepUpAuthorization) throw new AppError('X-Step-Up-Authorization é obrigatório.', 422, 'step_up_authorization_required');
      await requireStepUpAuthorization({ userId: actorUserId, token: input.stepUpAuthorization, purpose: 'confirm_direct_pix_receipt', resourceId: intentId, consume: true, client: tx });
    }
    const outcome = input.outcome;
    const needsFollowUp = outcome !== 'RECEIVED_EXACT';
    const nextStatus = needsFollowUp ? 'FOLLOW_UP_REQUIRED' : 'FAMILY_CONFIRMED';
    const changed = await tx.directPixIntent.updateMany({ where: { id: intent.id, status: 'DONOR_DECLARED' }, data: { status: nextStatus } });
    if (changed.count !== 1) conflict('receipt_not_recordable', 'A resposta de recebimento não está disponível.');
    const receipt = await tx.directPixReceiptConfirmation.create({ data: { intentId: intent.id, responsibleAssignmentId: assignment.id, outcome, receivedAmountCents: outcome === 'RECEIVED_DIFFERENT' ? input.receivedAmountCents : null, declaredByResponsibleUserId: assignment.responsibleUserId, recordedByOperatorUserId: assisted ? actorUserId : null, assistedChannel: assisted ? (input as AssistedReceiptResponseInput).assistedChannel : null } });
    let followUp: { id: string; intentId: string; reason: string; status: string; openedAt: Date } | null = null;
    if (needsFollowUp) {
      const reason = outcome === 'RECEIVED_DIFFERENT' ? 'RECEIVED_DIFFERENT' : 'NOT_LOCATED';
      // The intent advisory lock serializes response writes; the partial unique index is a database backstop.
      followUp = await tx.directPixFollowUpCase.create({ data: { intentId: intent.id, familyId: intent.familyId, reason } });
    }
    if (assisted && authority) await tx.directPixOperatorAction.create({ data: { entityId: authority.entityId, membershipId: authority.membershipId, actorUserId, resourceType: CONFIRMATION_TYPE, resourceId: receipt.id, action: 'follow_up' } });
    await tx.auditLog.create({ data: { actorUserId, actorRole: assisted ? 'entity' : 'beneficiary', action: assisted ? 'direct_pix.receipt.recorded_assisted' : 'direct_pix.receipt.confirmed_by_responsible', entityType: CONFIRMATION_TYPE, entityId: receipt.id, channel: assisted ? 'assisted' : 'web_pwa', correlationId: input.correlationId, idempotencyKey: input.idempotencyKey, result: nextStatus.toLowerCase(), metadata: { intentId: intent.id, responsibleAssignmentId: assignment.id, declaredByResponsibleUserId: assignment.responsibleUserId, recordedByOperatorUserId: assisted ? actorUserId : null, outcome, previousStatus: 'DONOR_DECLARED', nextStatus, followUpCaseId: followUp?.id ?? null } } });
    await tx.outboxEvent.create({ data: { eventType: needsFollowUp ? 'direct_pix.follow_up.opened' : 'direct_pix.receipt.confirmed_by_family', aggregateType: needsFollowUp ? CASE_TYPE : CONFIRMATION_TYPE, aggregateId: needsFollowUp ? followUp!.id : receipt.id, dedupeKey: 'direct-pix-receipt:' + receipt.id } });
    await tx.idempotencyRecord.update({ where: { id: record.id }, data: { resourceType: CONFIRMATION_TYPE, resourceId: receipt.id, status: 'completed', completedAt: new Date() } });
    return { intent: intentDto({ ...intent, status: nextStatus }), receipt: receiptDto(receipt), followUpCase: followUp ? caseDto(followUp) : null };
  });
  return { ...result.value as object, replayed: result.replayed };
}

export function confirmReceiptByResponsible(actorUserId: string, actorRole: UserRole, intentId: string, input: ResponsibleReceiptResponseInput & { idempotencyKey: string; correlationId: string; stepUpAuthorization: string }) { return recordReceipt(actorUserId, actorRole, intentId, input, false); }
export function recordAssistedReceiptResponse(actorUserId: string, actorRole: UserRole, intentId: string, input: AssistedReceiptResponseInput & { idempotencyKey: string; correlationId: string }) { return recordReceipt(actorUserId, actorRole, intentId, input, true); }

export async function listEntityFollowUpCases(actorUserId: string) {
  const authority = await resolveEntityAuthority(actorUserId, 'pix.follow_up');
  const rows = await prisma.directPixFollowUpCase.findMany({ where: { family: { entityId: authority.entityId }, status: 'OPEN' }, orderBy: { openedAt: 'asc' }, take: 100 });
  return rows.map(caseDto);
}
