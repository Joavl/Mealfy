import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('E2E requires DATABASE_URL from the root Docker Compose runner. Use: npm run test:e2e');
const runId = process.env.E2E_RUN_ID;
if (!runId || !/^mealfy-e2e-[a-zA-Z0-9-]+$/.test(runId)) throw new Error('E2E requires the ownership token created by the root Docker Compose runner.');
const parsed = new URL(databaseUrl);
if (process.env.NODE_ENV !== 'test' || parsed.hostname !== '127.0.0.1' || parsed.pathname !== '/mealfy_e2e') throw new Error('Refusing to run E2E outside isolated local PostgreSQL.');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApp } = require('../src/app') as typeof import('../src/app');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { signToken } = require('../src/shared/utils/jwt') as typeof import('../src/shared/utils/jwt');

let server: http.Server | undefined;
let baseUrl: string;
let sequence = 0;

async function cleanDatabase() {
  const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')`;
  await prisma.$executeRawUnsafe('TRUNCATE TABLE ' + rows.map(({ tablename }) => '"' + tablename + '"').join(', ') + ' RESTART IDENTITY CASCADE');
}

function token(id: string, role: 'admin' | 'donor') { return signToken({ sub: id, role, sv: 0 }); }
function adminHeaders(accessToken: string, idempotencyKey?: string) {
  return { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json', 'X-Correlation-Id': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}) };
}

async function fixture() {
  const suffix = ++sequence;
  const admin = await prisma.user.create({ data: { name: 'Admin', email: 'admin-cutover-' + suffix + '@example.test', role: 'admin', emailVerifiedAt: new Date() } });
  const donor = await prisma.user.create({ data: { name: 'Donor', email: 'donor-cutover-' + suffix + '@example.test', role: 'donor', emailVerifiedAt: new Date() } });
  const entityUser = await prisma.user.create({ data: { name: 'Entity', email: 'entity-cutover-' + suffix + '@example.test', role: 'entity', emailVerifiedAt: new Date() } });
  const entity = await prisma.entity.create({ data: { userId: entityUser.id, name: 'Cutover entity', cnpj: String(suffix).padStart(14, '0'), responsibleName: 'Entity', email: entityUser.email, status: 'active' } });
  const family = await prisma.family.create({ data: { entityId: entity.id, responsibleName: 'Cutover family', displayName: 'Cutover family', city: 'São Paulo', state: 'SP', approvalStatus: 'approved', preferredGiftCardProvider: 'ifood' } });
  await prisma.familyDependent.create({ data: { familyId: family.id, name: 'Child', age: 8, isEligibleMinor: true } });
  return { admin, donor, family };
}

async function post(path: string, headers: Record<string, string>, body: unknown) {
  return fetch(baseUrl + path, { method: 'POST', headers, body: JSON.stringify(body) });
}

before(async () => {
  const owner = await prisma.$queryRaw<Array<{ run_id: string }>>`SELECT run_id FROM "_e2e_runner"`;
  assert.deepEqual(owner, [{ run_id: runId }]);
});
beforeEach(async () => { await cleanDatabase(); await new Promise<void>((resolve) => { server = createApp().listen(0, '127.0.0.1', resolve); }); baseUrl = 'http://127.0.0.1:' + (server!.address() as AddressInfo).port; });
afterEach(async () => { if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve())); server = undefined; });
after(async () => { await prisma.$disconnect(); });

test('admin dry run blocks undrained scope, applies idempotently, stops scoped legacy creation, and preserves reads', async () => {
  const { admin, donor, family } = await fixture();
  const adminToken = token(admin.id, 'admin');
  const donorToken = token(donor.id, 'donor');
  await prisma.donation.create({ data: { donorId: donor.id, familyId: family.id, amount: 5000, provider: 'ifood', status: 'pending_payment' } });

  const incomplete = await post('/admin/direct-pix/legacy-drain/dry-run', adminHeaders(adminToken), { scope: 'FAMILY', entityId: family.entityId, familyId: family.id });
  assert.equal(incomplete.status, 200);
  assert.deepEqual((await incomplete.json() as { report: { ready: boolean; blockers: { donations: number } } }).report, { scope: 'FAMILY', entityId: family.entityId, familyId: family.id, ready: false, blockers: { donations: 1, payments: 0, giftCardOrders: 0 } });

  const refused = await post('/admin/direct-pix/legacy-drain/apply', adminHeaders(adminToken, 'legacy-drain-key-0001'), { scope: 'FAMILY', entityId: family.entityId, familyId: family.id, expectedVersion: 0, reason: { code: 'DRAIN_COMPLETE' } });
  assert.equal(refused.status, 409);
  assert.equal((await refused.json() as { code: string }).code, 'legacy_drain_incomplete');

  const legacyDonation = await prisma.donation.findFirstOrThrow({ where: { familyId: family.id } });
  await prisma.donation.update({ where: { id: legacyDonation.id }, data: { status: 'completed', completedAt: new Date() } });
  const applyBody = { scope: 'FAMILY', entityId: family.entityId, familyId: family.id, expectedVersion: 0, reason: { code: 'DRAIN_COMPLETE' } };
  const applied = await post('/admin/direct-pix/legacy-drain/apply', adminHeaders(adminToken, 'legacy-drain-key-0001'), applyBody);
  assert.equal(applied.status, 200);
  const appliedJson = await applied.json() as { flag: { enabled: boolean; version: number }; replayed: boolean };
  assert.equal(appliedJson.flag.enabled, true);
  assert.equal(appliedJson.flag.version, 1);
  assert.equal(appliedJson.replayed, false);
  assert.equal(await prisma.directPixIntent.count(), 0);

  const replay = await post('/admin/direct-pix/legacy-drain/apply', adminHeaders(adminToken, 'legacy-drain-key-0001'), applyBody);
  assert.equal(replay.status, 200);
  assert.equal(replay.headers.get('idempotency-replayed'), 'true');
  assert.equal((await replay.json() as { replayed: boolean }).replayed, true);
  assert.equal(await prisma.auditLog.count({ where: { action: 'direct_pix.legacy_drain.applied' } }), 1);

  const blocked = await post('/donations', { authorization: 'Bearer ' + donorToken, 'content-type': 'application/json' }, { familyId: family.id, amount: 5000, provider: 'ifood' });
  assert.equal(blocked.status, 410);
  assert.equal((await blocked.json() as { code: string }).code, 'legacy_write_cutover');
  assert.equal(await prisma.donation.count(), 1);
  assert.equal(await prisma.payment.count(), 0);
  assert.equal(await prisma.giftCard.count(), 0);

  const read = await fetch(baseUrl + '/donations/' + legacyDonation.id, { headers: { authorization: 'Bearer ' + donorToken } });
  assert.equal(read.status, 200);
  const readJson = await read.json() as { donation: { status: string; providerLabel: string | null; message: string | null } };
  assert.equal(readJson.donation.status, 'completed');
  assert.equal(readJson.donation.providerLabel, 'Vale iFood enviado para a família.');
  assert.equal(readJson.donation.message, 'Família recebeu o apoio.');
});
