import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import { randomUUID } from 'node:crypto';

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
let server: http.Server | undefined; let baseUrl: string; let sequence = 0;

async function cleanDatabase() { const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')`; await prisma.$executeRawUnsafe('TRUNCATE TABLE ' + rows.map(({ tablename }) => '"' + tablename + '"').join(', ') + ' RESTART IDENTITY CASCADE'); }
async function operator(entityId: string, label: string, permissions = ['pix.review']) {
  const id = ++sequence; const user = await prisma.user.create({ data: { name: label, email: label.toLowerCase().replaceAll(' ', '-') + '-' + id + '@example.test', emailVerifiedAt: new Date(), role: 'entity', status: 'active' } });
  const membership = await prisma.entityOperatorMembership.create({ data: { entityId, userId: user.id, permissions } });
  return { user, membership, token: signToken({ sub: user.id, role: 'entity', sv: 0 }) };
}
async function context(label: string) {
  const owner = await prisma.user.create({ data: { name: 'Owner ' + label, email: 'owner-' + label + '@example.test', emailVerifiedAt: new Date(), role: 'entity', status: 'active' } });
  const entity = await prisma.entity.create({ data: { userId: owner.id, name: 'Entity ' + label, cnpj: String(++sequence).padStart(14, '0'), responsibleName: owner.name, email: owner.email, status: 'active' } });
  const maker = await operator(entity.id, 'Maker ' + label, ['pix.submit', 'pix.review']); const reviewer = await operator(entity.id, 'Reviewer ' + label); const second = await operator(entity.id, 'Second ' + label);
  const responsible = await prisma.user.create({ data: { name: 'Responsible ' + label, email: 'responsible-' + label + '@example.test', role: 'beneficiary', status: 'active' } });
  const family = await prisma.family.create({ data: { entityId: entity.id, responsibleName: responsible.name, displayName: 'Family ' + label, city: 'São Paulo', state: 'SP', approvalStatus: 'approved' } });
  const assignment = await prisma.familyResponsibleAssignment.create({ data: { familyId: family.id, responsibleUserId: responsible.id, invitedByUserId: owner.id } });
  return { entity, maker, reviewer, second, family, assignment };
}
async function version(x: Awaited<ReturnType<typeof context>>, attrs: { fingerprint?: string; status?: 'PENDING_REVIEW' | 'ACTIVE' } = {}) {
  const count = await prisma.directPixEvpKeyVersion.count({ where: { familyId: x.family.id } });
  const row = await prisma.directPixEvpKeyVersion.create({ data: { id: randomUUID(), familyId: x.family.id, assignmentId: x.assignment.id, submittedByUserId: x.maker.user.id, version: count + 1, status: attrs.status ?? 'PENDING_REVIEW', encryptionKid: 'e2e-aes-2026-01', nonce: 'AAAAAAAAAAAAAAAA', ciphertext: 'AA', tag: 'AAAAAAAAAAAAAAAAAAAAAA', fingerprintKid: 'e2e-hmac-2026-01', fingerprint: attrs.fingerprint ?? 'fp-' + ++sequence } });
  await prisma.directPixOperatorAction.create({ data: { entityId: x.entity.id, membershipId: x.maker.membership.id, actorUserId: x.maker.user.id, resourceType: 'direct_pix_evp_key_version', resourceId: row.id, action: 'submit' } });
  return row;
}
function post(token: string, path: string, body: unknown, key: string) { return fetch(baseUrl + path, { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify(body) }); }
const approval = { decision: 'APPROVE', reason: 'EXACT_NAME_MATCH', expectedCivilName: 'Maria da Silva' };

before(async () => { assert.deepEqual(await prisma.$queryRaw<Array<{ run_id: string; database: string }>>`SELECT run_id,current_database() AS database FROM "_e2e_runner"`, [{ run_id: runId, database: 'mealfy_e2e' }]); });
beforeEach(async () => { await cleanDatabase(); await new Promise<void>((resolve) => { server = createApp().listen(0, '127.0.0.1', resolve); }); baseUrl = 'http://127.0.0.1:' + (server!.address() as AddressInfo).port; });
afterEach(async () => { if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve())); }); after(async () => prisma.$disconnect());

test('review queue is entity-scoped and self-submitter is denied while normal approval atomically supersedes the prior active version', async () => {
  const x = await context('scope'); const foreign = await context('foreign'); const pending = await version(x); const oldActive = await version(x, { status: 'ACTIVE' }); const outside = await version(foreign);
  const queue = await fetch(baseUrl + '/direct-pix/evp-key-reviews/queue', { headers: { authorization: 'Bearer ' + x.reviewer.token } }); assert.equal(queue.status, 200); const payload = await queue.json() as { queue: Array<{ id: string; evpMasked: string }> }; assert.deepEqual(payload.queue.map((item) => item.id), [pending.id]); assert.equal(JSON.stringify(payload).includes(outside.id), false); assert.match(payload.queue[0].evpMasked, /^••••/);
  const self = await post(x.maker.token, '/direct-pix/evp-key-versions/' + pending.id + '/reviews', approval, 'self-review-key'); assert.equal(self.status, 409); assert.equal((await self.json() as { code: string }).code, 'maker_checker_conflict');
  const accepted = await post(x.reviewer.token, '/direct-pix/evp-key-versions/' + pending.id + '/reviews', approval, 'normal-review-key'); assert.equal(accepted.status, 201); const body = await accepted.json() as { keyVersion: { status: string } }; assert.equal(body.keyVersion.status, 'ACTIVE');
  assert.equal((await prisma.directPixEvpKeyVersion.findUniqueOrThrow({ where: { id: oldActive.id } })).status, 'SUPERSEDED'); assert.equal(await prisma.directPixEvpKeyVersion.count({ where: { familyId: x.family.id, status: 'ACTIVE' } }), 1);
  const stored = JSON.stringify(await prisma.directPixEvpKeyReview.findMany()); assert.equal(stored.includes('Maria da Silva'), false); assert.equal(await prisma.auditLog.count({ where: { action: 'direct_pix.evp.reviewed' } }), 1); assert.equal(await prisma.outboxEvent.count({ where: { eventType: 'direct_pix.evp.reviewed' } }), 1);
});

test('fingerprint reuse requires a distinct second reviewer and idempotent concurrent approval activates only one version', async () => {
  const x = await context('risk'); const active = await version(x, { fingerprint: 'duplicate-hmac', status: 'ACTIVE' }); const risky = await version(x, { fingerprint: 'duplicate-hmac' });
  const first = await post(x.reviewer.token, '/direct-pix/evp-key-versions/' + risky.id + '/reviews', approval, 'first-risk-review'); assert.equal(first.status, 201); const firstBody = await first.json() as { keyVersion: { status: string }; riskCode: string }; assert.equal(firstBody.keyVersion.status, 'SECOND_APPROVAL_REQUIRED'); assert.equal(firstBody.riskCode, 'duplicate_evp_review_required'); assert.equal((await prisma.directPixEvpKeyVersion.findUniqueOrThrow({ where: { id: active.id } })).status, 'ACTIVE');
  const repeated = await post(x.reviewer.token, '/direct-pix/evp-key-versions/' + risky.id + '/second-approval', { reason: 'EXACT_NAME_MATCH', expectedCivilName: 'Maria da Silva' }, 'invalid-second'); assert.equal(repeated.status, 409); assert.equal((await repeated.json() as { code: string }).code, 'maker_checker_conflict');
  const payload = { reason: 'EXACT_NAME_MATCH', expectedCivilName: 'Maria da Silva' }; const [a, b] = await Promise.all([post(x.second.token, '/direct-pix/evp-key-versions/' + risky.id + '/second-approval', payload, 'same-second-review'), post(x.second.token, '/direct-pix/evp-key-versions/' + risky.id + '/second-approval', payload, 'same-second-review')]); assert.deepEqual([a.status, b.status].sort(), [200, 201]);
  assert.equal((await prisma.directPixEvpKeyVersion.findUniqueOrThrow({ where: { id: risky.id } })).status, 'ACTIVE'); assert.equal((await prisma.directPixEvpKeyVersion.findUniqueOrThrow({ where: { id: active.id } })).status, 'SUPERSEDED'); assert.equal(await prisma.directPixEvpKeyReview.count({ where: { keyVersionId: risky.id } }), 2); assert.equal(await prisma.directPixEvpKeyVersion.count({ where: { familyId: x.family.id, status: 'ACTIVE' } }), 1);
});
