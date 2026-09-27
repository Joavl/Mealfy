import { randomUUID } from 'node:crypto';
import { type PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma';

const JOB_NAME = 'direct_pix_outbox';
const SAFE_ERROR_CODE = /^[a-z0-9_]{1,64}$/;
const SAFE_WORKER_ID = /^[A-Za-z0-9_-]{1,64}$/;

export type DirectPixOutboxEmail = Readonly<{ recipientUserId: string; template: 'direct_pix_notification'; notificationId: string; eventType: string; aggregateType: string; aggregateId: string }>;
/** Port payload has opaque IDs only: no email address, name, EVP, QR or free text. */
export interface DirectPixOutboxEmailPort { send(notification: DirectPixOutboxEmail): Promise<void>; }
export class NoopDirectPixOutboxEmailPort implements DirectPixOutboxEmailPort { async send(_notification: DirectPixOutboxEmail): Promise<void> {} }

type ClaimedEvent = { id: string; event_type: string; aggregate_type: string; aggregate_id: string; available_at: Date; attempts: number; lease_expires_at: Date };
type Claim = ClaimedEvent & { jobRunId: string; startedAt: Date };
export type DirectPixOutboxWorkerOptions = Readonly<{ client?: PrismaClient; emailPort?: DirectPixOutboxEmailPort; workerId?: string; leaseMs?: number; maxAttempts?: number; baseRetryMs?: number; maxRetryMs?: number; random?: () => number; now?: () => Date; logger?: Pick<Console, 'warn' | 'error'> }>;
export type DirectPixOutboxRunResult = Readonly<{ claimed: number; processed: number; retried: number; deadLettered: number }>;

function safePositive(value: number, fallback: number): number { return Number.isSafeInteger(value) && value > 0 ? value : fallback; }
function errorCode(error: unknown): string { const candidate = typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string' ? error.code.toLowerCase() : 'delivery_failed'; return SAFE_ERROR_CODE.test(candidate) ? candidate : 'delivery_failed'; }
/** Exponential backoff with bounded full jitter. */
export function retryDelayMs(attempt: number, baseRetryMs = 1_000, maxRetryMs = 300_000, random = Math.random): number { const cap = Math.min(maxRetryMs, baseRetryMs * (2 ** Math.min(Math.max(1, attempt) - 1, 20))); return Math.floor(Math.max(0, Math.min(0.999999999, random())) * cap); }

export class DirectPixOutboxWorker {
  private readonly client: PrismaClient;
  private readonly emailPort: DirectPixOutboxEmailPort;
  private readonly workerId: string;
  private readonly leaseMs: number;
  private readonly maxAttempts: number;
  private readonly baseRetryMs: number;
  private readonly maxRetryMs: number;
  private readonly random: () => number;
  private readonly now: () => Date;
  private readonly logger: Pick<Console, 'warn' | 'error'>;
  private timer: NodeJS.Timeout | undefined;
  private running = false;

  constructor(options: DirectPixOutboxWorkerOptions = {}) {
    this.client = options.client ?? prisma;
    this.emailPort = options.emailPort ?? new NoopDirectPixOutboxEmailPort();
    const workerId = options.workerId ?? randomUUID();
    if (!SAFE_WORKER_ID.test(workerId)) throw new Error('invalid outbox worker ID');
    this.workerId = workerId;
    this.leaseMs = safePositive(options.leaseMs ?? 30_000, 30_000);
    this.maxAttempts = safePositive(options.maxAttempts ?? 5, 5);
    this.baseRetryMs = safePositive(options.baseRetryMs ?? 1_000, 1_000);
    this.maxRetryMs = safePositive(options.maxRetryMs ?? 300_000, 300_000);
    this.random = options.random ?? Math.random;
    this.now = options.now ?? (() => new Date());
    this.logger = options.logger ?? console;
  }

  start(intervalMs = 5_000): void { if (this.timer) return; this.timer = setInterval(() => { void this.runOnce().catch((error) => this.logger.error('[direct-pix-outbox] run failed', error)); }, safePositive(intervalMs, 5_000)); this.timer.unref(); void this.runOnce().catch((error) => this.logger.error('[direct-pix-outbox] initial run failed', error)); }
  stop(): void { if (this.timer) clearInterval(this.timer); this.timer = undefined; }

  async runOnce(batchSize = 20): Promise<DirectPixOutboxRunResult> {
    if (this.running) return { claimed: 0, processed: 0, retried: 0, deadLettered: 0 };
    this.running = true;
    try {
      const claims = await this.claim(safePositive(batchSize, 20));
      const result = { claimed: claims.length, processed: 0, retried: 0, deadLettered: 0 };
      for (const claim of claims) {
        try { await this.deliver(claim); result.processed += 1; }
        catch (error) { if (await this.fail(claim, errorCode(error)) === 'DEAD_LETTER') result.deadLettered += 1; else result.retried += 1; }
      }
      return result;
    } finally { this.running = false; }
  }

  /** Atomic PostgreSQL claim: SKIP LOCKED allows independent workers to make progress. */
  private async claim(limit: number): Promise<Claim[]> {
    const now = this.now(); const leaseExpiresAt = new Date(now.getTime() + this.leaseMs);
    const nowSql = now.toISOString(); const leaseSql = leaseExpiresAt.toISOString();
    return this.client.$transaction(async (tx) => {
      const rows = await tx.$queryRawUnsafe<ClaimedEvent[]>(
        "WITH candidates AS (SELECT id FROM outbox_events WHERE (state = 'PENDING' AND available_at <= '" + nowSql + "'::timestamp) OR (state = 'PROCESSING' AND lease_expires_at <= '" + nowSql + "'::timestamp) ORDER BY available_at ASC, created_at ASC FOR UPDATE SKIP LOCKED LIMIT " + limit + "), claimed AS (UPDATE outbox_events event SET state = 'PROCESSING'::\"OutboxEventState\", locked_at = '" + nowSql + "'::timestamp, locked_by = '" + this.workerId + "', lease_expires_at = '" + leaseSql + "'::timestamp, attempts = event.attempts + 1, last_error_code = NULL FROM candidates WHERE event.id = candidates.id RETURNING event.id, event.event_type, event.aggregate_type, event.aggregate_id, event.available_at, event.attempts, event.lease_expires_at) SELECT * FROM claimed"
      );
      return Promise.all(rows.map(async (row) => { const run = await tx.jobRun.create({ data: { jobName: JOB_NAME, outboxEventId: row.id, scheduledFor: row.available_at, leaseOwner: this.workerId, leaseExpiresAt: row.lease_expires_at, attempt: row.attempts } }); return { ...row, jobRunId: run.id, startedAt: run.startedAt }; }));
    });
  }

  private async recipientFor(event: ClaimedEvent): Promise<string | null> {
    if (event.aggregate_type === 'direct_pix_terms_acceptance') return (await this.client.directPixTermsAcceptance.findUnique({ where: { id: event.aggregate_id }, select: { actorUserId: true } }))?.actorUserId ?? null;
    if (event.aggregate_type === 'direct_pix_evp_key_version') return (await this.client.directPixEvpKeyVersion.findUnique({ where: { id: event.aggregate_id }, select: { submittedByUserId: true } }))?.submittedByUserId ?? null;
    if (event.aggregate_type === 'direct_pix_evp_key_review') return (await this.client.directPixEvpKeyReview.findUnique({ where: { id: event.aggregate_id }, select: { reviewerUserId: true } }))?.reviewerUserId ?? null;
    if (event.aggregate_type === 'family_responsible_assignment') return (await this.client.familyResponsibleAssignment.findUnique({ where: { id: event.aggregate_id }, select: { responsibleUserId: true } }))?.responsibleUserId ?? null;
    return null;
  }

  private async deliver(claim: Claim): Promise<void> {
    const recipientUserId = await this.recipientFor(claim);
    let notificationId: string | null = null;
    if (recipientUserId) {
      const notification = await this.client.$transaction(async (tx) => {
        const event = await tx.outboxEvent.findFirst({ where: { id: claim.id, state: 'PROCESSING', lockedBy: this.workerId }, select: { id: true } });
        if (!event) throw Object.assign(new Error('lease_lost'), { code: 'lease_lost' });
        return tx.inAppNotification.upsert({ where: { outboxEventId: claim.id }, create: { outboxEventId: claim.id, recipientUserId, eventType: claim.event_type, aggregateType: claim.aggregate_type, aggregateId: claim.aggregate_id }, update: {} });
      });
      notificationId = notification.id;
      await this.emailPort.send({ recipientUserId, template: 'direct_pix_notification', notificationId, eventType: claim.event_type, aggregateType: claim.aggregate_type, aggregateId: claim.aggregate_id });
    }
    await this.complete(claim, notificationId);
  }

  private async complete(claim: Claim, notificationId: string | null): Promise<void> {
    const completedAt = this.now(); const durationMs = Math.max(0, completedAt.getTime() - claim.startedAt.getTime());
    await this.client.$transaction(async (tx) => {
      const update = await tx.outboxEvent.updateMany({ where: { id: claim.id, state: 'PROCESSING', lockedBy: this.workerId }, data: { state: 'PROCESSED', processedAt: completedAt, lockedAt: null, lockedBy: null, leaseExpiresAt: null, lastErrorCode: null } });
      if (update.count !== 1) throw Object.assign(new Error('lease_lost'), { code: 'lease_lost' });
      await tx.jobRun.update({ where: { id: claim.jobRunId }, data: { status: 'PROCESSED', completedAt, durationMs } });
      if (notificationId) await tx.inAppNotification.update({ where: { id: notificationId }, data: { emailSentAt: completedAt } });
    });
  }

  private async fail(claim: Claim, code: string): Promise<'RETRIED' | 'DEAD_LETTER'> {
    const completedAt = this.now(); const durationMs = Math.max(0, completedAt.getTime() - claim.startedAt.getTime()); const deadLetter = claim.attempts >= this.maxAttempts;
    const availableAt = deadLetter ? completedAt : new Date(completedAt.getTime() + retryDelayMs(claim.attempts, this.baseRetryMs, this.maxRetryMs, this.random));
    return this.client.$transaction(async (tx) => {
      const update = await tx.outboxEvent.updateMany({ where: { id: claim.id, state: 'PROCESSING', lockedBy: this.workerId }, data: deadLetter ? { state: 'DEAD_LETTER', lockedAt: null, lockedBy: null, leaseExpiresAt: null, lastErrorCode: code } : { state: 'PENDING', availableAt, lockedAt: null, lockedBy: null, leaseExpiresAt: null, lastErrorCode: code } });
      if (update.count !== 1) return 'RETRIED';
      await tx.jobRun.update({ where: { id: claim.jobRunId }, data: { status: deadLetter ? 'DEAD_LETTER' : 'RETRIED', completedAt, durationMs, errorCode: code } });
      this.logger.warn('[direct-pix-outbox] event delivery failed', { eventId: claim.id, attempt: claim.attempts, errorCode: code, deadLetter });
      return deadLetter ? 'DEAD_LETTER' : 'RETRIED';
    });
  }
}

/** Fail closed: no persisted enabled jobs flag means no worker scheduling. */
export async function directPixJobsEnabled(client: PrismaClient = prisma): Promise<boolean> { try { const [jobs, killSwitch] = await Promise.all([client.directPixFeatureFlag.findFirst({ where: { key: 'JOBS', scope: 'GLOBAL' }, select: { enabled: true } }), client.directPixFeatureFlag.findFirst({ where: { key: 'KILL_SWITCH', scope: 'GLOBAL' }, select: { enabled: true } })]); return jobs?.enabled === true && killSwitch?.enabled !== true; } catch { return false; } }
