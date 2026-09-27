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
if (process.env.NODE_ENV !== 'test' || parsed.hostname !== '127.0.0.1' || parsed.pathname !== '/mealfy_e2e') throw new Error('Refusing to run E2E outside the isolated local PostgreSQL database mealfy_e2e on 127.0.0.1.');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApp } = require('../src/app') as typeof import('../src/app');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { signToken } = require('../src/shared/utils/jwt') as typeof import('../src/shared/utils/jwt');

let server: http.Server | undefined;
let baseUrl: string;
const password = 'Senha-E2E-segura-123';

async function cleanDatabase() { const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')`; await prisma.$executeRawUnsafe('TRUNCATE TABLE ' + rows.map(({ tablename }) => '"' + tablename + '"').join(', ') + ' RESTART IDENTITY CASCADE'); }
async function register(email: string) { const r = await fetch(baseUrl + '/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Responsável', email, password, role: 'donor' }) }); assert.equal(r.status, 201); const account = await r.json() as { token: string; user: { id: string } }; await prisma.user.update({ where: { id: account.user.id }, data: { role: 'beneficiary', emailVerifiedAt: new Date() } }); return account; }
async function proof(userId: string, familyId: string, purpose: 'view_pix_key' | 'revoke_pix_key') { const raw = randomBytes(32).toString('base64url'); await prisma.stepUpAuthorization.create({ data: { userId, purpose, resourceId: familyId, tokenHash: createHash('sha256').update(raw + ':' + process.env.JWT_SECRET).digest('hex'), sessionVersion: 0, expiresAt: new Date(Date.now() + 60_000) } }); return raw; }
async function setup() {
  const account = await register('lifecycle@example.test');
  const family = await prisma.family.create({ data: { responsibleName: 'Responsável', displayName: 'Família Lifecycle', city: 'São Paulo', state: 'SP', approvalStatus: 'approved' } });
  const assignment = await prisma.familyResponsibleAssignment.create({ data: { familyId: family.id, responsibleUserId: account.user.id, invitedByUserId: account.user.id } });
  const key = await prisma.directPixEvpKeyVersion.create({ data: { id: randomBytes(16).toString('hex'), familyId: family.id, assignmentId: assignment.id, submittedByUserId: account.user.id, version: 1, status: 'ACTIVE', encryptionKid: 'e2e-aes-2026-01', nonce: 'AAAAAAAAAAAAAAAA', ciphertext: 'AA', tag: 'AAAAAAAAAAAAAAAAAAAAAA', fingerprintKid: 'e2e-hmac-2026-01', fingerprint: 'fixture-fingerprint' } });
  const token = signToken({ sub: account.user.id, role: 'beneficiary', sv: 0 });
  return { account, family, assignment, key, token };
}
function headers(token: string, stepUp?: string) { return { authorization: 'Bearer ' + token, ...(stepUp ? { 'x-step-up-authorization': stepUp } : {}) }; }

before(async () => { assert.deepEqual(await prisma.$queryRaw<Array<{ run_id: string; database: string }>>`SELECT run_id,current_database() AS database FROM "_e2e_runner"`, [{ run_id: runId, database: 'mealfy_e2e' }]); });
beforeEach(async () => { await cleanDatabase(); await new Promise<void>((resolve) => { server = createApp().listen(0, '127.0.0.1', resolve); }); baseUrl = 'http://127.0.0.1:' + (server!.address() as AddressInfo).port; });
afterEach(async () => { if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve())); });
after(async () => prisma.$disconnect());

test('current key read is view-step-up-gated, masked, no-store, and audited', async () => {
  const x = await setup();
  assert.equal((await fetch(baseUrl + '/direct-pix/responsible/evp-key-versions/current', { headers: headers(x.token) })).status, 422);
  const wrong = await proof(x.account.user.id, x.family.id, 'revoke_pix_key');
  assert.equal((await fetch(baseUrl + '/direct-pix/responsible/evp-key-versions/current', { headers: headers(x.token, wrong) })).status, 401);
  const view = await proof(x.account.user.id, x.family.id, 'view_pix_key');
  const r = await fetch(baseUrl + '/direct-pix/responsible/evp-key-versions/current', { headers: headers(x.token, view) });
  assert.equal(r.status, 200); assert.match(r.headers.get('cache-control') ?? '', /no-store/);
  const body = await r.json() as { keyVersion: { id: string; evpMasked: string; status: string } };
  assert.equal(body.keyVersion.id, x.key.id); assert.equal(body.keyVersion.status, 'ACTIVE'); assert.match(body.keyVersion.evpMasked, /^••••/); assert.doesNotMatch(JSON.stringify(body), /fixture-fingerprint|AAAAAAAA/);
  assert.equal(await prisma.auditLog.count({ where: { action: 'direct_pix.evp.masked_viewed', entityId: x.key.id } }), 1);
});

test('revocation atomically revokes usable versions, scoped grants, and records audit/outbox', async () => {
  const x = await setup();
  const otherFamily = await prisma.family.create({ data: { responsibleName: 'Outra', displayName: 'Outra família', city: 'São Paulo', state: 'SP', approvalStatus: 'approved' } });
  await prisma.stepUpAuthorization.create({ data: { userId: x.account.user.id, purpose: 'view_pix_key', resourceId: otherFamily.id, tokenHash: createHash('sha256').update('other:' + process.env.JWT_SECRET).digest('hex'), sessionVersion: 0, expiresAt: new Date(Date.now() + 60_000) } });
  const revoke = await proof(x.account.user.id, x.family.id, 'revoke_pix_key');
  const r = await fetch(baseUrl + '/direct-pix/responsible/evp-key-versions/' + x.key.id + '/revoke', { method: 'POST', headers: { ...headers(x.token, revoke), 'content-type': 'application/json', 'idempotency-key': 'revoke-lifecycle-key' }, body: JSON.stringify({ reason: 'KEY_COMPROMISED' }) });
  assert.equal(r.status, 200); const body = await r.json() as { keyVersion: { status: string } }; assert.equal(body.keyVersion.status, 'REVOKED');
  assert.equal((await prisma.directPixEvpKeyVersion.findUniqueOrThrow({ where: { id: x.key.id } })).status, 'REVOKED');
  const familyGrants = await prisma.stepUpAuthorization.findMany({ where: { resourceId: x.family.id } }); assert.equal(familyGrants.every((grant) => grant.revokedAt !== null), true);
  assert.equal((await prisma.stepUpAuthorization.findFirstOrThrow({ where: { resourceId: otherFamily.id } })).revokedAt, null);
  assert.equal(await prisma.auditLog.count({ where: { action: 'direct_pix.evp.revoked', entityId: x.key.id } }), 1);
  assert.equal(await prisma.outboxEvent.count({ where: { eventType: 'direct_pix.evp.revoked', aggregateId: x.key.id } }), 1);
  assert.equal((await fetch(baseUrl + '/direct-pix/responsible/evp-key-versions/current', { headers: headers(x.token, await proof(x.account.user.id, x.family.id, 'view_pix_key')) })).status, 404);
});

test('ending an assignment revokes its usable key and all family-scoped step-up grants', async () => {
  const x = await setup();
  const admin = await prisma.user.create({ data: { name: 'Admin', email: 'lifecycle-admin@example.test', passwordHash: 'unused', role: 'admin', emailVerifiedAt: new Date() } });
  const adminToken = signToken({ sub: admin.id, role: 'admin', sv: 0 });
  const futureView = await proof(x.account.user.id, x.family.id, 'view_pix_key');
  const r = await fetch(baseUrl + '/direct-pix/families/' + x.family.id + '/responsible-assignments/' + x.assignment.id + '/end', { method: 'POST', headers: { authorization: 'Bearer ' + adminToken, 'content-type': 'application/json', 'idempotency-key': 'end-lifecycle-key' }, body: JSON.stringify({ endReason: 'reassigned' }) });
  assert.equal(r.status, 200); assert.equal((await prisma.directPixEvpKeyVersion.findUniqueOrThrow({ where: { id: x.key.id } })).status, 'REVOKED');
  assert.notEqual((await prisma.stepUpAuthorization.findUniqueOrThrow({ where: { tokenHash: createHash('sha256').update(futureView + ':' + process.env.JWT_SECRET).digest('hex') } })).revokedAt, null);
  const endAudit = await prisma.auditLog.findFirst({ where: { action: 'direct_pix.family_responsible.ended' } });
  assert.equal((endAudit?.metadata as { revokedUsableKeyVersionCount?: number } | null)?.revokedUsableKeyVersionCount, 1);
  assert.equal(await prisma.outboxEvent.count({ where: { eventType: 'direct_pix.evp.revoked_by_assignment_end', aggregateId: x.assignment.id } }), 1);
});
