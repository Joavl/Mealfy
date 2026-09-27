import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';

const RETENTION_GRANT_MS = 24 * 60 * 60 * 1000;
type Client = PrismaClient | Prisma.TransactionClient;

/** Keeps deactivated people out of Direct Pix only; legacy payment aggregates are not consulted. */
export async function assertDirectPixPrivacyActive(userId: string, client: Client = prisma): Promise<void> {
  const request = await client.directPixPrivacyDeactivation.findUnique({ where: { userId }, select: { id: true } });
  if (request) throw new AppError('A conta está desativada para Pix direto.', 403, 'direct_pix_deactivated');
}

function timestamp(value: Date | null): string | null { return value?.toISOString() ?? null; }

/** Owner-only portable Direct Pix record. Never emits EVP, grant tokens/hashes, or third-party profiles. */
export async function exportOwnDirectPixData(userId: string) {
  const [user, terms, intents, submittedKeys, declaredReceipts, deactivation, holds] = await Promise.all([
    prisma.user.findUniqueOrThrow({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, createdAt: true } }),
    prisma.directPixTermsAcceptance.findMany({ where: { actorUserId: userId }, select: { version: true, channel: true, acceptedAt: true }, orderBy: { acceptedAt: 'asc' } }),
    prisma.directPixIntent.findMany({ where: { donorId: userId }, select: { id: true, familyId: true, amountCents: true, status: true, createdAt: true, declaredAt: true, confirmationDeadlineAt: true, declaration: { select: { declaredAt: true, cancellation: { select: { reason: true, canceledAt: true } } }, }, receiptConfirmation: { select: { outcome: true, receivedAmountCents: true, respondedAt: true } } }, orderBy: { createdAt: 'asc' } }),
    prisma.directPixEvpKeyVersion.findMany({ where: { submittedByUserId: userId }, select: { id: true, familyId: true, assignmentId: true, version: true, status: true, submittedAt: true }, orderBy: { submittedAt: 'asc' } }),
    prisma.directPixReceiptConfirmation.findMany({ where: { declaredByResponsibleUserId: userId }, select: { intentId: true, outcome: true, receivedAmountCents: true, respondedAt: true }, orderBy: { respondedAt: 'asc' } }),
    prisma.directPixPrivacyDeactivation.findUnique({ where: { userId }, select: { requestedAt: true, completedAt: true } }),
    prisma.directPixLegalHold.findMany({ where: { subjectUserId: userId, releasedAt: null }, select: { createdAt: true }, orderBy: { createdAt: 'asc' } }),
  ]);
  await prisma.auditLog.create({ data: { actorUserId: userId, actorRole: user.role, action: 'direct_pix.privacy.exported', entityType: 'direct_pix_privacy_export', entityId: userId, channel: 'web_pwa', result: 'exported', metadata: { intentCount: intents.length, keyVersionCount: submittedKeys.length, receiptCount: declaredReceipts.length } } });
  return {
    schemaVersion: 'direct-pix-lgpd-export-v1', exportedAt: new Date().toISOString(),
    account: { id: user.id, name: user.name, email: user.email, role: user.role, createdAt: user.createdAt.toISOString() },
    termsAcceptances: terms.map((x) => ({ version: x.version, channel: x.channel, acceptedAt: x.acceptedAt.toISOString() })),
    donorIntents: intents.map((x) => ({ id: x.id, familyId: x.familyId, amountCents: x.amountCents, status: x.status, createdAt: x.createdAt.toISOString(), declaredAt: timestamp(x.declaredAt), confirmationDeadlineAt: timestamp(x.confirmationDeadlineAt), declaration: x.declaration ? { declaredAt: x.declaration.declaredAt.toISOString(), cancellation: x.declaration.cancellation ? { reason: x.declaration.cancellation.reason, canceledAt: x.declaration.cancellation.canceledAt.toISOString() } : null } : null, receiptConfirmation: x.receiptConfirmation ? { outcome: x.receiptConfirmation.outcome, receivedAmountCents: x.receiptConfirmation.receivedAmountCents, respondedAt: x.receiptConfirmation.respondedAt.toISOString() } : null })),
    submittedEvpKeyVersions: submittedKeys.map((x) => ({ id: x.id, familyId: x.familyId, assignmentId: x.assignmentId, version: x.version, status: x.status, submittedAt: x.submittedAt.toISOString() })),
    receiptConfirmationsDeclared: declaredReceipts.map((x) => ({ intentId: x.intentId, outcome: x.outcome, receivedAmountCents: x.receivedAmountCents, respondedAt: x.respondedAt.toISOString() })),
    deactivation: deactivation ? { requestedAt: deactivation.requestedAt.toISOString(), completedAt: timestamp(deactivation.completedAt) } : null,
    legalHold: { active: holds.length > 0 },
  };
}

/** Immediate Direct Pix-only deactivation: invalidate disclosure/proof material and suspend current EVP versions. */
export async function deactivateOwnDirectPix(userId: string) {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.directPixPrivacyDeactivation.findUnique({ where: { userId }, select: { requestedAt: true, completedAt: true } });
    if (existing) return { requestedAt: existing.requestedAt.toISOString(), completedAt: timestamp(existing.completedAt), replayed: true };
    const now = new Date();
    const deactivation = await tx.directPixPrivacyDeactivation.create({ data: { userId, requestedAt: now, completedAt: now } });
    await tx.pixDisclosureGrant.updateMany({ where: { actorUserId: userId, revokedAt: null }, data: { revokedAt: now } });
    await tx.stepUpAuthorization.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
    await tx.stepUpChallenge.updateMany({ where: { userId, consumedAt: null, invalidatedAt: null }, data: { invalidatedAt: now } });
    await tx.directPixEvpKeyVersion.updateMany({ where: { assignment: { responsibleUserId: userId, endedAt: null }, status: { in: ['AWAITING_RESPONSIBLE_CONFIRMATION', 'PENDING_REVIEW', 'SECOND_APPROVAL_REQUIRED', 'ACTIVE'] } }, data: { status: 'SUSPENDED' } });
    await tx.auditLog.create({ data: { actorUserId: userId, action: 'direct_pix.privacy.deactivated', entityType: 'direct_pix_privacy_deactivation', entityId: deactivation.id, channel: 'web_pwa', result: 'deactivated', metadata: {} } });
    return { requestedAt: deactivation.requestedAt.toISOString(), completedAt: timestamp(deactivation.completedAt), replayed: false };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

/** Idempotent retention pass for ephemeral disclosure evidence; active legal holds prevent deletion. */
export class DirectPixPrivacyRetentionWorker {
  private timer: NodeJS.Timeout | undefined;
  constructor(private readonly client: PrismaClient = prisma, private readonly now: () => Date = () => new Date()) {}
  start(intervalMs = 60 * 60 * 1000): void { if (this.timer) return; this.timer = setInterval(() => { void this.runOnce(); }, intervalMs); this.timer.unref(); void this.runOnce(); }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }
  async runOnce(): Promise<{ deletedDisclosureGrants: number }> {
    const cutoff = new Date(this.now().getTime() - RETENTION_GRANT_MS);
    const deleted = await this.client.pixDisclosureGrant.deleteMany({ where: { expiresAt: { lt: cutoff }, actorUser: { directPixPrivacyDeactivation: { isNot: null }, directPixLegalHolds: { none: { releasedAt: null } } } } });
    return { deletedDisclosureGrants: deleted.count };
  }
}
