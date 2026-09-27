import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
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
const evp = '00000000-0000-0000-0000-000000000001';

async function cleanDatabase() { const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')`; await prisma.$executeRawUnsafe('TRUNCATE TABLE ' + rows.map(({ tablename }) => '"' + tablename + '"').join(', ') + ' RESTART IDENTITY CASCADE'); }
function token(id: string, role: 'admin' | 'beneficiary' | 'entity') { return signToken({ sub: id, role, sv: 0 }); }
async function proof(userId: string, familyId: string) { const raw = randomBytes(32).toString('base64url'); await prisma.stepUpAuthorization.create({ data: { userId, purpose: 'change_pix_key', resourceId: familyId, tokenHash: createHash('sha256').update(raw + ':' + process.env.JWT_SECRET).digest('hex'), sessionVersion: 0, expiresAt: new Date(Date.now() + 60_000) } }); return raw; }
async function createUser(role: 'admin' | 'beneficiary' | 'entity', suffix: string) { return prisma.user.create({ data: { name: role, email: role + '-' + suffix + '@example.test', role, emailVerifiedAt: new Date() } }); }
function headers(accessToken: string, idempotencyKey = 'feature-flag-key') { return { authorization: 'Bearer ' + accessToken, 'content-type': 'application/json', 'Idempotency-Key': idempotencyKey }; }
async function patchFlag(adminToken: string, key: string, body: object) { return fetch(baseUrl + '/admin/direct-pix/feature-flags/' + key, { method: 'PATCH', headers: { authorization: 'Bearer ' + adminToken, 'content-type': 'application/json', 'X-Correlation-Id': 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' }, body: JSON.stringify(body) }); }

before(async () => { const owner = await prisma.$queryRaw<Array<{ run_id: string }>>`SELECT run_id FROM "_e2e_runner"`; assert.deepEqual(owner, [{ run_id: runId }]); });
beforeEach(async () => { await cleanDatabase(); await new Promise<void>((resolve) => { server = createApp().listen(0, '127.0.0.1', resolve); }); baseUrl = 'http://127.0.0.1:' + (server!.address() as AddressInfo).port; });
afterEach(async () => { if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve())); server = undefined; });
after(async () => { await prisma.$disconnect(); });

test('fails closed, enables at global scope, and kill switch blocks a new key submit', async () => {
  const admin = await createUser('admin', 'flags');
  const responsible = await createUser('beneficiary', 'responsible');
  const family = await prisma.family.create({ data: { responsibleName: 'Flag family', displayName: 'Flag family', city: 'São Paulo', state: 'SP', approvalStatus: 'approved' } });
  await prisma.familyResponsibleAssignment.create({ data: { familyId: family.id, responsibleUserId: responsible.id, invitedByUserId: admin.id } });
  const submit = async (key: string) => fetch(baseUrl + '/direct-pix/responsible/evp-key-versions', { method: 'POST', headers: { ...headers(token(responsible.id, 'beneficiary'), key), 'X-Step-Up-Authorization': await proof(responsible.id, family.id) }, body: JSON.stringify({ keyType: 'EVP', evp }) });
  const disabled = await patchFlag(token(admin.id, 'admin'), 'CREATION', { scope: 'GLOBAL', enabled: false, expectedVersion: 0, reason: { code: 'DARK_LAUNCH' } });
  assert.equal(disabled.status, 200);
  assert.equal((await submit('flag-closed-key')).status, 423);
  const global = await patchFlag(token(admin.id, 'admin'), 'CREATION', { scope: 'GLOBAL', enabled: true, expectedVersion: 1, reason: { code: 'PILOT_APPROVED' } });
  assert.equal(global.status, 200);
  assert.equal(global.headers.get('cache-control'), 'no-store');
  assert.equal((await submit('flag-enabled-key')).status, 201);
  const kill = await patchFlag(token(admin.id, 'admin'), 'KILL_SWITCH', { scope: 'GLOBAL', enabled: true, expectedVersion: 0, reason: { code: 'INCIDENT_CONTAINMENT', note: 'Security incident' } });
  assert.equal(kill.status, 200);
  assert.equal((await submit('flag-killed-key')).status, 423);
  const audit = await prisma.auditLog.findMany({ where: { action: 'direct_pix.feature_flag.updated' }, orderBy: { createdAt: 'asc' } });
  assert.equal(audit.length, 3);
  assert.deepEqual((audit[2].metadata as { reason: { code: string }; version: number }).reason.code, 'INCIDENT_CONTAINMENT');
  assert.equal((audit[2].metadata as { version: number }).version, 1);
});

test('enforces structured reason, optimistic version, and ten-family pilot hard cap', async () => {
  const admin = await createUser('admin', 'cohort');
  const entityUser = await createUser('entity', 'cohort');
  const entity = await prisma.entity.create({ data: { userId: entityUser.id, name: 'Entity cohort', cnpj: '12345678000199', responsibleName: 'Entity', email: entityUser.email, status: 'active' } });
  const first = await prisma.family.create({ data: { entityId: entity.id, responsibleName: 'One', displayName: 'One', city: 'SP', state: 'SP', approvalStatus: 'approved' } });
  const invalid = await patchFlag(token(admin.id, 'admin'), 'ONBOARDING', { scope: 'FAMILY', entityId: entity.id, familyId: first.id, enabled: true, config: { pilot: true }, expectedVersion: 0, reason: { code: 'bad' } });
  assert.equal(invalid.status, 422);
  const families = [first, ...await Promise.all(Array.from({ length: 10 }, (_, index) => prisma.family.create({ data: { entityId: entity.id, responsibleName: 'Family ' + index, displayName: 'Family ' + index, city: 'SP', state: 'SP', approvalStatus: 'approved' } })))];
  for (const family of families.slice(0, 10)) {
    const response = await patchFlag(token(admin.id, 'admin'), 'ONBOARDING', { scope: 'FAMILY', entityId: entity.id, familyId: family.id, enabled: true, config: { pilot: true }, expectedVersion: 0, reason: { code: 'PILOT_APPROVED' } });
    assert.equal(response.status, 200);
  }
  const capped = await patchFlag(token(admin.id, 'admin'), 'ONBOARDING', { scope: 'FAMILY', entityId: entity.id, familyId: families[10].id, enabled: true, config: { pilot: true }, expectedVersion: 0, reason: { code: 'PILOT_APPROVED' } });
  assert.equal(capped.status, 409);
  const stale = await patchFlag(token(admin.id, 'admin'), 'ONBOARDING', { scope: 'FAMILY', entityId: entity.id, familyId: first.id, enabled: false, expectedVersion: 0, reason: { code: 'PAUSED' } });
  assert.equal(stale.status, 409);
});
