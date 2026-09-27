import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('E2E requires DATABASE_URL from the root Docker Compose runner.');
const runId = process.env.E2E_RUN_ID;
if (!runId) throw new Error('E2E runner ownership missing.');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApp } = require('../src/app') as typeof import('../src/app');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { signToken } = require('../src/shared/utils/jwt') as typeof import('../src/shared/utils/jwt');

let server: http.Server | undefined;
let baseUrl = '';
let serial = 0;

async function clean(): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')`;
  await prisma.$executeRawUnsafe('TRUNCATE TABLE ' + tables.map((x) => '"' + x.tablename + '"').join(', ') + ' RESTART IDENTITY CASCADE');
}
function token(user: { id: string; role: string }): string { return signToken({ sub: user.id, role: user.role as 'admin' | 'donor' | 'beneficiary', sv: 0 }); }
async function user(role: 'admin' | 'donor' | 'beneficiary', name: string) {
  const id = ++serial;
  return prisma.user.create({ data: { name, email: name.toLowerCase() + '-' + id + '@example.test', role, status: 'active', emailVerifiedAt: new Date() } });
}
async function intentFixture() {
  const donor = await user('donor', 'Donor');
  const responsible = await user('beneficiary', 'Responsible');
  const owner = await user('admin', 'Entity owner');
  const entity = await prisma.entity.create({ data: { userId: owner.id, name: 'Entity', cnpj: String(++serial).padStart(14, '0'), responsibleName: 'Entity', email: 'entity-' + serial + '@example.test', status: 'active' } });
  const family = await prisma.family.create({ data: { entityId: entity.id, responsibleName: responsible.name, displayName: 'Family', city: 'São Paulo', state: 'SP', approvalStatus: 'approved' } });
  const assignment = await prisma.familyResponsibleAssignment.create({ data: { familyId: family.id, responsibleUserId: responsible.id, invitedByUserId: responsible.id } });
  const key = await prisma.directPixEvpKeyVersion.create({ data: { id: randomUUID(), familyId: family.id, assignmentId: assignment.id, submittedByUserId: responsible.id, version: 1, status: 'ACTIVE', encryptionKid: 'e2e-aes-2026-01', nonce: 'AAAAAAAAAAAAAAAA', ciphertext: 'AA', tag: 'AAAAAAAAAAAAAAAAAAAAAA', fingerprintKid: 'e2e-hmac-2026-01', fingerprint: 'safe-fp-' + serial } });
  const intent = await prisma.directPixIntent.create({ data: { donorId: donor.id, familyId: family.id, responsibleAssignmentId: assignment.id, pixKeyVersionId: key.id, amountCents: 5000, txid: randomUUID().replaceAll('-', '').slice(0, 25), cycleStartAt: new Date(), cycleEndAt: new Date(Date.now() + 86_400_000), declarationDeadlineAt: new Date(Date.now() + 86_400_000) } });
  const grant = await prisma.pixDisclosureGrant.create({ data: { intentId: intent.id, actorUserId: donor.id, purpose: 'DIRECT_PIX_DISCLOSURE', tokenHash: 'grant-' + randomUUID(), expiresAt: new Date(Date.now() + 900_000) } });
  return { donor, responsible, family, key, intent, grant };
}
function post(auth: string, path: string, body: unknown, idempotencyKey: string) {
  return fetch(baseUrl + path, { method: 'POST', headers: { authorization: 'Bearer ' + auth, 'content-type': 'application/json', 'Idempotency-Key': idempotencyKey, 'X-Correlation-Id': randomUUID() }, body: JSON.stringify(body) });
}

before(async () => assert.deepEqual(await prisma.$queryRaw<Array<{ run_id: string }>>`SELECT run_id FROM "_e2e_runner"`, [{ run_id: runId }]));
beforeEach(async () => { await clean(); await new Promise<void>((resolve) => { server = createApp().listen(0, '127.0.0.1', resolve); }); baseUrl = 'http://127.0.0.1:' + (server!.address() as AddressInfo).port; });
afterEach(async () => { if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve())); });
after(async () => prisma.$disconnect());

test('donor divergent-holder report suspends the destination and revokes the disclosure grant', async () => {
  const x = await intentFixture();
  const response = await post(token(x.donor), '/direct-pix/intents/' + x.intent.id + '/reports/divergent-holder', { reasonCode: 'BANK_HOLDER_MISMATCH' }, 'holder-report-key');
  assert.equal(response.status, 201);
  assert.equal((await response.json() as { case: { reason: string } }).case.reason, 'HOLDER_DIVERGENT');
  assert.equal((await prisma.directPixEvpKeyVersion.findUniqueOrThrow({ where: { id: x.key.id } })).status, 'SUSPENDED');
  assert.notEqual((await prisma.pixDisclosureGrant.findUniqueOrThrow({ where: { id: x.grant.id } })).revokedAt, null);
  assert.equal(await prisma.directPixFollowUpCase.count({ where: { intentId: x.intent.id, reason: 'HOLDER_DIVERGENT' } }), 1);
});

test('privacy export redacts EVP material and deactivation blocks subsequent Direct Pix use', async () => {
  const x = await intentFixture();
  const beforeDeactivation = await fetch(baseUrl + '/direct-pix/privacy/export', { headers: { authorization: 'Bearer ' + token(x.donor) } });
  assert.equal(beforeDeactivation.status, 200);
  assert.match(beforeDeactivation.headers.get('cache-control') ?? '', /no-store/);
  const exported = JSON.stringify(await beforeDeactivation.json());
  for (const forbidden of ['ciphertext', 'nonce', 'tag', 'fingerprint', 'grant-']) assert.equal(exported.includes(forbidden), false);
  const deactivation = await post(token(x.donor), '/direct-pix/privacy/deactivation', {}, 'deactivation-key');
  assert.equal(deactivation.status, 202);
  const blocked = await fetch(baseUrl + '/direct-pix/readiness', { headers: { authorization: 'Bearer ' + token(x.donor) } });
  assert.equal(blocked.status, 403);
  assert.equal((await blocked.json() as { code: string }).code, 'direct_pix_deactivated');
});
