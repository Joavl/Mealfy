import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';
import { randomUUID } from 'node:crypto';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('E2E requires DATABASE_URL from the root Docker Compose runner. Use: npm run test:e2e');
const runId = process.env.E2E_RUN_ID;
if (!runId || !/^mealfy-e2e-[a-zA-Z0-9-]+$/.test(runId)) throw new Error('E2E requires the ownership token created by the root Docker Compose runner.');
const parsed = new URL(databaseUrl);
if (process.env.NODE_ENV !== 'test' || parsed.hostname !== '127.0.0.1' || parsed.pathname !== '/mealfy_e2e') throw new Error('Refusing to run E2E outside isolated PostgreSQL.');
const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');
const { DirectPixFollowUpScheduler } = require('../src/modules/directPix/followUpScheduler.service') as typeof import('../src/modules/directPix/followUpScheduler.service');
const { reportOldQrDeclaration } = require('../src/modules/directPix/oldQrDeclaration.service') as typeof import('../src/modules/directPix/oldQrDeclaration.service');

let sequence = 0;
async function clean() { const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')`; await prisma.$executeRawUnsafe('TRUNCATE TABLE ' + tables.map((x) => '"' + x.tablename + '"').join(', ') + ' RESTART IDENTITY CASCADE'); }
async function user(role: 'donor' | 'entity' | 'beneficiary', name: string) { const n = ++sequence; return prisma.user.create({ data: { name, email: name + n + '@example.test', role, status: 'active', emailVerifiedAt: new Date() } }); }
async function fixture(declaredAt: Date) {
  const owner = await user('entity', 'owner'); const entity = await prisma.entity.create({ data: { userId: owner.id, name: 'Entity', cnpj: String(++sequence).padStart(14, '0'), responsibleName: 'Owner', email: owner.email, status: 'active' } });
  await prisma.directPixFeatureFlag.create({ data: { key: 'JOBS', scope: 'GLOBAL', enabled: true, updatedByUserId: owner.id } });
  await prisma.directPixFeatureFlag.create({ data: { key: 'KILL_SWITCH', scope: 'GLOBAL', enabled: false, updatedByUserId: owner.id } });
  const donor = await user('donor', 'donor'); const responsible = await user('beneficiary', 'responsible'); const family = await prisma.family.create({ data: { entityId: entity.id, responsibleName: 'Responsible', displayName: 'Family', city: 'São Paulo', state: 'SP', approvalStatus: 'approved' } });
  const assignment = await prisma.familyResponsibleAssignment.create({ data: { familyId: family.id, responsibleUserId: responsible.id, invitedByUserId: owner.id } });
  const key = await prisma.directPixEvpKeyVersion.create({ data: { id: randomUUID(), familyId: family.id, assignmentId: assignment.id, submittedByUserId: responsible.id, version: 1, status: 'ACTIVE', encryptionKid: 'e2e', nonce: 'AAAAAAAAAAAAAAAA', ciphertext: 'AA', tag: 'AAAAAAAAAAAAAAAAAAAAAA', fingerprintKid: 'e2e', fingerprint: 'fp-' + ++sequence } });
  const intent = await prisma.directPixIntent.create({ data: { donorId: donor.id, familyId: family.id, responsibleAssignmentId: assignment.id, pixKeyVersionId: key.id, amountCents: 5000, txid: randomUUID().replaceAll('-', '').slice(0, 25), status: 'DONOR_DECLARED', cycleStartAt: declaredAt, cycleEndAt: new Date(declaredAt.getTime() + 86400000), declarationDeadlineAt: declaredAt, declaredAt, confirmationDeadlineAt: new Date(declaredAt.getTime() + 48 * 3600000) } });
  await prisma.directPixDeclaration.create({ data: { intentId: intent.id, declaredByUserId: donor.id, declaredAt } });
  return { donor, family, intent };
}
before(async () => assert.deepEqual(await prisma.$queryRaw<Array<{ run_id: string; database: string }>>`SELECT run_id,current_database() AS database FROM "_e2e_runner"`, [{ run_id: runId, database: 'mealfy_e2e' }]));
beforeEach(clean); after(async () => prisma.$disconnect());

test('scheduler durably deduplicates 24h/44h reminders then times out unconfirmed declaration', async () => {
  const now = new Date('2026-09-01T12:00:00.000Z'); const x = await fixture(new Date(now.getTime() - 47 * 3600000)); const scheduler = new DirectPixFollowUpScheduler({ client: prisma, now: () => now });
  assert.deepEqual(await scheduler.runOnce(), { reminders24h: 1, reminders44h: 1, timedOut: 0, escalated: 0 });
  assert.deepEqual(await scheduler.runOnce(), { reminders24h: 0, reminders44h: 0, timedOut: 0, escalated: 0 });
  const deadline = new Date(now.getTime() + 2 * 3600000); const timeoutScheduler = new DirectPixFollowUpScheduler({ client: prisma, now: () => deadline });
  assert.equal((await timeoutScheduler.runOnce()).timedOut, 1); assert.equal((await prisma.directPixIntent.findUniqueOrThrow({ where: { id: x.intent.id } })).status, 'FOLLOW_UP_REQUIRED');
  assert.equal(await prisma.directPixFollowUpCase.count({ where: { intentId: x.intent.id, reason: 'CONFIRMATION_TIMEOUT' } }), 1);
  assert.equal(await prisma.outboxEvent.count({ where: { dedupeKey: 'direct-pix-confirmation-timeout:' + x.intent.id } }), 1);
  assert.equal(await prisma.donation.count(), 0); assert.equal(await prisma.payment.count(), 0);
});

test('late prior-code report is owned, idempotent and does not alter the current intent', async () => {
  const now = new Date(); const x = await fixture(new Date(now.getTime() - 49 * 3600000)); await prisma.directPixIntent.update({ where: { id: x.intent.id }, data: { status: 'OPEN' } });
  const input = { amountCents: 5000, approximatePaidAt: new Date(now.getTime() - 2 * 3600000), reasonCode: 'SAVED_QR_CODE' as const, idempotencyKey: 'old-qr-key', correlationId: randomUUID() };
  const first = await reportOldQrDeclaration(x.donor.id, x.intent.id, input); assert.equal(first.replayed, false); const replay = await reportOldQrDeclaration(x.donor.id, x.intent.id, input); assert.equal(replay.replayed, true);
  assert.equal(await prisma.directPixOldQrDeclaration.count(), 1); assert.equal(await prisma.directPixFollowUpCase.count({ where: { intentId: x.intent.id, reason: 'OLD_QR_DECLARATION' } }), 1);
  assert.equal((await prisma.directPixIntent.findUniqueOrThrow({ where: { id: x.intent.id } })).status, 'OPEN'); assert.equal(await prisma.donation.count(), 0); assert.equal(await prisma.payment.count(), 0);
  await assert.rejects(() => reportOldQrDeclaration(x.donor.id, x.intent.id, { ...input, amountCents: 5100 }), { code: 'idempotency_conflict' });
});
