import { createHash } from 'node:crypto';
import { Prisma } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import type { OldQrDeclarationInput } from './oldQrDeclaration.validator';

const OPERATION = 'direct_pix.report_old_qr_declaration';
const RESOURCE_TYPE = 'direct_pix_old_qr_declaration';
const CASE_TYPE = 'direct_pix_follow_up_case';
const TTL_MS = 24 * 60 * 60 * 1000;

function hash(value: unknown) { return createHash('sha256').update(JSON.stringify(value)).digest('hex'); }
function fail(message: string, status: number, code: string): never { throw new AppError(message, status, code); }
function retryable(error: unknown) { return error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2002' || error.code === 'P2034'); }
function dto(row: { id: string; sourceIntentId: string; amountCents: number; approximateSentAt: Date; reasonCode: string; createdAt: Date }) { return { id: row.id, sourceIntentId: row.sourceIntentId, amountCents: row.amountCents, approximatePaidAt: row.approximateSentAt.toISOString(), reasonCode: row.reasonCode, createdAt: row.createdAt.toISOString() }; }

async function replay(actorUserId: string, key: string, requestHash: string) {
  const row = await prisma.idempotencyRecord.findUnique({ where: { actorUserId_operation_idempotencyKey: { actorUserId, operation: OPERATION, idempotencyKey: key } } });
  if (!row) return null;
  if (row.requestHash !== requestHash) fail('A chave de idempotência já foi usada com outra requisição.', 409, 'idempotency_conflict');
  if (row.status !== 'completed' || !row.resourceId) fail('A operação idempotente ainda está em processamento.', 409, 'idempotency_in_progress');
  const declaration = await prisma.directPixOldQrDeclaration.findUnique({ where: { id: row.resourceId } });
  if (!declaration) throw new Error('Missing old QR declaration replay resource');
  return declaration;
}

/** Records a donor statement about a saved QR without creating a payment or affecting current eligibility. */
export async function reportOldQrDeclaration(actorUserId: string, sourceIntentId: string, input: OldQrDeclarationInput & { idempotencyKey: string; correlationId: string }) {
  const requestHash = hash({ sourceIntentId, amountCents: input.amountCents, approximatePaidAt: input.approximatePaidAt.toISOString(), reasonCode: input.reasonCode });
  const prior = await replay(actorUserId, input.idempotencyKey, requestHash);
  if (prior) return { declaration: dto(prior), replayed: true };
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const declaration = await prisma.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'direct-pix-intent:' + sourceIntentId}))`;
        const existing = await tx.idempotencyRecord.findUnique({ where: { actorUserId_operation_idempotencyKey: { actorUserId, operation: OPERATION, idempotencyKey: input.idempotencyKey } } });
        if (existing) {
          if (existing.requestHash !== requestHash) fail('A chave de idempotência já foi usada com outra requisição.', 409, 'idempotency_conflict');
          if (existing.status !== 'completed' || !existing.resourceId) fail('A operação idempotente ainda está em processamento.', 409, 'idempotency_in_progress');
          const row = await tx.directPixOldQrDeclaration.findUnique({ where: { id: existing.resourceId } });
          if (!row) throw new Error('Missing old QR declaration replay resource');
          return { row, replayed: true };
        }
        const intent = await tx.directPixIntent.findFirst({ where: { id: sourceIntentId, donorId: actorUserId }, select: { id: true, pixKeyVersionId: true, cycleId: true, declarationDeadlineAt: true } });
        if (!intent) fail('Intenção Pix direto não encontrada.', 404, 'intent_not_found');
        const now = new Date();
        if (intent.declarationDeadlineAt > now) fail('A declaração normal ainda está disponível para esta intenção.', 409, 'old_qr_not_available');
        if (input.approximatePaidAt > now) fail('A data aproximada não pode estar no futuro.', 422, 'invalid_approximate_paid_at');
        if (await tx.directPixOldQrDeclaration.findUnique({ where: { sourceIntentId: intent.id }, select: { id: true } })) fail('O Pix com código anterior já foi informado para esta intenção.', 409, 'old_qr_already_reported');
        const idem = await tx.idempotencyRecord.create({ data: { actorUserId, operation: OPERATION, idempotencyKey: input.idempotencyKey, requestHash, status: 'processing', expiresAt: new Date(now.getTime() + TTL_MS) } });
        const row = await tx.directPixOldQrDeclaration.create({ data: { sourceIntentId: intent.id, declaredByUserId: actorUserId, amountCents: input.amountCents, approximateSentAt: input.approximatePaidAt, pixKeyVersionId: intent.pixKeyVersionId, sourceCycleId: intent.cycleId, reasonCode: input.reasonCode } });
        const family = await tx.directPixIntent.findUniqueOrThrow({ where: { id: intent.id }, select: { familyId: true } });
        const followUp = await tx.directPixFollowUpCase.findFirst({ where: { intentId: intent.id, status: 'OPEN' } }) ?? await tx.directPixFollowUpCase.create({ data: { intentId: intent.id, familyId: family.familyId, reason: 'OLD_QR_DECLARATION', slaStartedAt: now } });
        await tx.auditLog.create({ data: { actorUserId, actorRole: 'donor', action: 'direct_pix.old_qr.declared', entityType: RESOURCE_TYPE, entityId: row.id, channel: 'web_pwa', correlationId: input.correlationId, idempotencyKey: input.idempotencyKey, result: 'follow_up_required', metadata: { sourceIntentId: intent.id, followUpCaseId: followUp.id, pixKeyVersionId: intent.pixKeyVersionId, sourceCycleId: intent.cycleId, reasonCode: input.reasonCode } } });
        await tx.outboxEvent.create({ data: { eventType: 'direct_pix.old_qr.declared', aggregateType: CASE_TYPE, aggregateId: followUp.id, dedupeKey: 'direct-pix-old-qr-declaration:' + intent.id } });
        await tx.idempotencyRecord.update({ where: { id: idem.id }, data: { resourceType: RESOURCE_TYPE, resourceId: row.id, status: 'completed', completedAt: now } });
        return { row, replayed: false };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return { declaration: dto(declaration.row), replayed: declaration.replayed };
    } catch (error) {
      if (!retryable(error)) throw error;
      const completed = await replay(actorUserId, input.idempotencyKey, requestHash);
      if (completed) return { declaration: dto(completed), replayed: true };
    }
  }
  fail('A operação concorrente não pôde ser concluída. Tente novamente.', 409, 'concurrent_operation');
}
