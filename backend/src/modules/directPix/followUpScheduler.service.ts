import { type PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma';

const HOUR = 60 * 60 * 1000;
const CASE_TYPE = 'direct_pix_follow_up_case';
const INTENT_TYPE = 'direct_pix_intent';

export type DirectPixFollowUpSchedulerOptions = Readonly<{
  client?: PrismaClient;
  now?: () => Date;
  logger?: Pick<Console, 'error'>;
}>;
export type DirectPixFollowUpRunResult = Readonly<{ reminders24h: number; reminders44h: number; timedOut: number; escalated: number }>;

/**
 * Database-backed follow-up projection. Intent timestamps and status guards are
 * authoritative; this worker only makes overdue work visible through deduped
 * outbox events and never confirms or unblocks a family.
 */
export class DirectPixFollowUpScheduler {
  private readonly client: PrismaClient;
  private readonly now: () => Date;
  private readonly logger: Pick<Console, 'error'>;
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(options: DirectPixFollowUpSchedulerOptions = {}) {
    this.client = options.client ?? prisma;
    this.now = options.now ?? (() => new Date());
    this.logger = options.logger ?? console;
  }

  start(intervalMs = 60_000): void {
    if (this.timer) return;
    const period = Number.isSafeInteger(intervalMs) && intervalMs > 0 ? intervalMs : 60_000;
    this.timer = setInterval(() => { void this.runOnce().catch((error) => this.logger.error('[direct-pix-follow-up] run failed', error)); }, period);
    this.timer.unref();
    void this.runOnce().catch((error) => this.logger.error('[direct-pix-follow-up] initial run failed', error));
  }

  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }

  async runOnce(): Promise<DirectPixFollowUpRunResult> {
    if (this.running) return { reminders24h: 0, reminders44h: 0, timedOut: 0, escalated: 0 };
    this.running = true;
    try {
      // Re-check persisted flags on each tick so disabling JOBS or enabling the
      // kill switch takes effect without a process restart.
      const [jobs, killSwitch] = await Promise.all([
        this.client.directPixFeatureFlag.findFirst({ where: { key: 'JOBS', scope: 'GLOBAL' }, select: { enabled: true } }),
        this.client.directPixFeatureFlag.findFirst({ where: { key: 'KILL_SWITCH', scope: 'GLOBAL' }, select: { enabled: true } }),
      ]);
      if (jobs?.enabled !== true || killSwitch?.enabled === true) return { reminders24h: 0, reminders44h: 0, timedOut: 0, escalated: 0 };
      const now = this.now();
      const [reminders24h, reminders44h, timedOut, escalated] = await Promise.all([
        this.enqueueReminder(now, 24), this.enqueueReminder(now, 44), this.timeoutDeclarations(now), this.escalateCases(now),
      ]);
      return { reminders24h, reminders44h, timedOut, escalated };
    } finally { this.running = false; }
  }

  private async enqueueReminder(now: Date, ageHours: number): Promise<number> {
    const dueBefore = new Date(now.getTime() - ageHours * HOUR);
    const rows = await this.client.directPixIntent.findMany({
      where: { status: 'DONOR_DECLARED', declaredAt: { lte: dueBefore }, confirmationDeadlineAt: { gt: now } },
      select: { id: true }, take: 200,
    });
    let created = 0;
    for (const row of rows) {
      const result = await this.client.outboxEvent.createMany({ data: [{
        eventType: ageHours === 24 ? 'direct_pix.receipt.reminder_24h' : 'direct_pix.receipt.reminder_44h',
        aggregateType: INTENT_TYPE, aggregateId: row.id,
        dedupeKey: 'direct-pix-receipt-reminder-' + ageHours + 'h:' + row.id,
      }], skipDuplicates: true });
      created += result.count;
    }
    return created;
  }

  private async timeoutDeclarations(now: Date): Promise<number> {
    const rows = await this.client.directPixIntent.findMany({
      where: { status: 'DONOR_DECLARED', confirmationDeadlineAt: { lte: now } }, select: { id: true }, take: 200,
    });
    let timedOut = 0;
    for (const row of rows) {
      const changed = await this.client.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'direct-pix-intent:' + row.id}))`;
        const intent = await tx.directPixIntent.findUnique({ where: { id: row.id }, select: { id: true, familyId: true, status: true, confirmationDeadlineAt: true } });
        if (!intent || intent.status !== 'DONOR_DECLARED' || !intent.confirmationDeadlineAt || intent.confirmationDeadlineAt > now) return false;
        const updated = await tx.directPixIntent.updateMany({ where: { id: intent.id, status: 'DONOR_DECLARED' }, data: { status: 'FOLLOW_UP_REQUIRED' } });
        if (updated.count !== 1) return false;
        const followUp = await tx.directPixFollowUpCase.create({ data: { intentId: intent.id, familyId: intent.familyId, reason: 'CONFIRMATION_TIMEOUT', slaStartedAt: now } });
        await tx.auditLog.create({ data: { actorRole: 'admin', action: 'direct_pix.receipt.timed_out', entityType: CASE_TYPE, entityId: followUp.id, channel: 'scheduler', correlationId: 'scheduler:' + intent.id, result: 'follow_up_required', metadata: { intentId: intent.id, previousStatus: 'DONOR_DECLARED', nextStatus: 'FOLLOW_UP_REQUIRED', reason: 'CONFIRMATION_TIMEOUT' } } });
        await tx.outboxEvent.create({ data: { eventType: 'direct_pix.receipt.timed_out', aggregateType: CASE_TYPE, aggregateId: followUp.id, dedupeKey: 'direct-pix-confirmation-timeout:' + intent.id } });
        return true;
      });
      if (changed) timedOut += 1;
    }
    return timedOut;
  }

  private async escalateCases(now: Date): Promise<number> {
    const dueBefore = new Date(now.getTime() - 48 * HOUR);
    const rows = await this.client.directPixFollowUpCase.findMany({ where: { status: 'OPEN', slaStartedAt: { lte: dueBefore }, escalatedAt: null }, select: { id: true }, take: 200 });
    let escalated = 0;
    for (const row of rows) {
      const changed = await this.client.$transaction(async (tx) => {
        const update = await tx.directPixFollowUpCase.updateMany({ where: { id: row.id, status: 'OPEN', escalatedAt: null, slaStartedAt: { lte: dueBefore } }, data: { escalatedAt: now } });
        if (update.count !== 1) return false;
        await tx.auditLog.create({ data: { actorRole: 'admin', action: 'direct_pix.follow_up.escalated', entityType: CASE_TYPE, entityId: row.id, channel: 'scheduler', correlationId: 'scheduler:' + row.id, result: 'escalated', metadata: { followUpCaseId: row.id } } });
        await tx.outboxEvent.create({ data: { eventType: 'direct_pix.follow_up.escalated', aggregateType: CASE_TYPE, aggregateId: row.id, dedupeKey: 'direct-pix-follow-up-escalated:' + row.id } });
        return true;
      });
      if (changed) escalated += 1;
    }
    return escalated;
  }
}
