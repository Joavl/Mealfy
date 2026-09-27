import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('E2E requires DATABASE_URL from the root Docker Compose runner. Use: npm run test:e2e');
const runId = process.env.E2E_RUN_ID;
if (!runId || !/^mealfy-e2e-[a-zA-Z0-9-]+$/.test(runId)) throw new Error('E2E requires the ownership token created by the root Docker Compose runner.');
const parsedDatabaseUrl = new URL(databaseUrl);
if (process.env.NODE_ENV !== 'test' || parsedDatabaseUrl.hostname !== '127.0.0.1' || parsedDatabaseUrl.pathname !== '/mealfy_e2e') throw new Error('Refusing to run E2E outside isolated PostgreSQL.');

const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');
const { DirectPixOutboxWorker } = require('../src/modules/directPix/outbox.worker') as typeof import('../src/modules/directPix/outbox.worker');

async function cleanDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')
  `;
  await prisma.$executeRawUnsafe('TRUNCATE TABLE ' + tables.map(({ tablename }) => '\"' + tablename.replaceAll('\"', '\"\"') + '\"').join(', ') + ' RESTART IDENTITY CASCADE');
}
async function user(suffix: string) { return prisma.user.create({ data: { name: 'Test user', email: 'outbox-' + suffix + '@example.test', role: 'beneficiary', status: 'active', emailVerifiedAt: new Date() } }); }
async function event(aggregateId: string, suffix: string) { return prisma.outboxEvent.create({ data: { eventType: 'direct_pix.test', aggregateType: 'direct_pix_terms_acceptance', aggregateId, dedupeKey: 'outbox-test-' + suffix } }); }

before(async () => { assert.deepEqual(await prisma.$queryRaw<Array<{ run_id: string; database: string }>>`
  SELECT run_id, current_database() AS database FROM "_e2e_runner"
`, [{ run_id: runId, database: 'mealfy_e2e' }]); });
beforeEach(cleanDatabase);
after(async () => prisma.$disconnect());

test('PostgreSQL SKIP LOCKED claims each event exactly once across concurrent workers', async () => {
  const recipient = await user('claim');
  const acceptance = await prisma.directPixTermsVersion.create({ data: { version: 'outbox-claim', title: 'Test', statements: [], publishedAt: new Date(), effectiveAt: new Date(), isCurrent: true } }).then((terms) => prisma.directPixTermsAcceptance.create({ data: { termsVersionId: terms.id, version: terms.version, actorUserId: recipient.id, actorRole: 'beneficiary', channel: 'test', correlationId: 'test' } }));
  const row = await event(acceptance.id, 'claim');
  let sends = 0;
  const port = { async send() { sends += 1; } };
  const [first, second] = await Promise.all([
    new DirectPixOutboxWorker({ client: prisma, workerId: 'worker_one', emailPort: port }).runOnce(),
    new DirectPixOutboxWorker({ client: prisma, workerId: 'worker_two', emailPort: port }).runOnce(),
  ]);
  assert.equal(first.claimed + second.claimed, 1);
  assert.equal(sends, 1);
  assert.equal((await prisma.outboxEvent.findUniqueOrThrow({ where: { id: row.id } })).state, 'PROCESSED');
  assert.equal(await prisma.inAppNotification.count({ where: { outboxEventId: row.id } }), 1);
  assert.equal(await prisma.jobRun.count({ where: { outboxEventId: row.id, status: 'PROCESSED' } }), 1);
});

test('expired lease is reclaimed and processed', async () => {
  const recipient = await user('lease');
  const terms = await prisma.directPixTermsVersion.create({ data: { version: 'outbox-lease', title: 'Test', statements: [], publishedAt: new Date(), effectiveAt: new Date(), isCurrent: true } });
  const acceptance = await prisma.directPixTermsAcceptance.create({ data: { termsVersionId: terms.id, version: terms.version, actorUserId: recipient.id, actorRole: 'beneficiary', channel: 'test', correlationId: 'test' } });
  const row = await event(acceptance.id, 'lease');
  await prisma.outboxEvent.update({ where: { id: row.id }, data: { state: 'PROCESSING', lockedBy: 'crashed_worker', lockedAt: new Date(Date.now() - 60_000), leaseExpiresAt: new Date(Date.now() - 1_000) } });
  const result = await new DirectPixOutboxWorker({ client: prisma, workerId: 'recovery_worker' }).runOnce();
  assert.equal(result.processed, 1);
  const stored = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: row.id } });
  assert.equal(stored.state, 'PROCESSED'); assert.equal(stored.attempts, 1);
  assert.equal(await prisma.jobRun.count({ where: { outboxEventId: row.id, leaseOwner: 'recovery_worker' } }), 1);
});

test('delivery failure uses jittered retry then dead letters with safe metadata only', async () => {
  const recipient = await user('failure');
  const terms = await prisma.directPixTermsVersion.create({ data: { version: 'outbox-failure', title: 'Test', statements: [], publishedAt: new Date(), effectiveAt: new Date(), isCurrent: true } });
  const acceptance = await prisma.directPixTermsAcceptance.create({ data: { termsVersionId: terms.id, version: terms.version, actorUserId: recipient.id, actorRole: 'beneficiary', channel: 'test', correlationId: 'test' } });
  const row = await event(acceptance.id, 'failure');
  const port = { async send() { throw Object.assign(new Error('contains no persisted PII'), { code: 'smtp_unavailable' }); } };
  const worker = new DirectPixOutboxWorker({ client: prisma, workerId: 'failure_worker', emailPort: port, maxAttempts: 2, baseRetryMs: 1, random: () => 0 });
  assert.deepEqual(await worker.runOnce(), { claimed: 1, processed: 0, retried: 1, deadLettered: 0 });
  const retry = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: row.id } });
  assert.equal(retry.state, 'PENDING'); assert.equal(retry.attempts, 1); assert.equal(retry.lastErrorCode, 'smtp_unavailable');
  await prisma.outboxEvent.update({ where: { id: row.id }, data: { availableAt: new Date(Date.now() - 1) } });
  assert.deepEqual(await worker.runOnce(), { claimed: 1, processed: 0, retried: 0, deadLettered: 1 });
  const dlq = await prisma.outboxEvent.findUniqueOrThrow({ where: { id: row.id } });
  assert.equal(dlq.state, 'DEAD_LETTER'); assert.equal(dlq.attempts, 2); assert.equal(dlq.lastErrorCode, 'smtp_unavailable');
  const runs = await prisma.jobRun.findMany({ where: { outboxEventId: row.id }, orderBy: { attempt: 'asc' } });
  assert.deepEqual(runs.map((run) => [run.status, run.errorCode, run.leaseOwner]), [['RETRIED', 'smtp_unavailable', 'failure_worker'], ['DEAD_LETTER', 'smtp_unavailable', 'failure_worker']]);
  const metadata = JSON.stringify({ dlq, runs });
  assert.equal(metadata.includes(recipient.email), false); assert.equal(metadata.includes('contains no persisted PII'), false);
});
