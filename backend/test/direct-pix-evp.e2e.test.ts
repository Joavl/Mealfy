import assert from 'node:assert/strict';
import { createDecipheriv } from 'node:crypto';
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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { evpAad } = require('../src/modules/directPix/evpKey.crypto') as typeof import('../src/modules/directPix/evpKey.crypto');
let server: http.Server | undefined;
let baseUrl: string;
const password = 'Senha-E2E-segura-123';
const evp = '00000000-0000-0000-0000-000000000001';

async function cleanDatabase() { const rows = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')`; await prisma.$executeRawUnsafe('TRUNCATE TABLE ' + rows.map(({ tablename }) => '"' + tablename + '"').join(', ') + ' RESTART IDENTITY CASCADE'); }
async function register(email: string) { const r = await fetch(baseUrl + '/auth/register', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'Responsável', email, password, role: 'donor' }) }); assert.equal(r.status, 201); const account = await r.json() as { token: string; user: { id: string } }; await prisma.user.update({ where: { id: account.user.id }, data: { role: 'beneficiary', emailVerifiedAt: new Date() } }); return account; }
async function setup() { const account = await register('evp@example.test'); const family = await prisma.family.create({ data: { responsibleName: 'Responsável', displayName: 'Família EVP', city: 'São Paulo', state: 'SP', approvalStatus: 'approved' } }); const assignment = await prisma.familyResponsibleAssignment.create({ data: { familyId: family.id, responsibleUserId: account.user.id, invitedByUserId: account.user.id } }); const token = signToken({ sub: account.user.id, role: 'beneficiary', sv: 0 }); return { account, family, assignment, token }; }
async function proof(userId: string, familyId: string) { const raw = require('node:crypto').randomBytes(32).toString('base64url'); await prisma.stepUpAuthorization.create({ data: { userId, purpose: 'change_pix_key', resourceId: familyId, tokenHash: require('node:crypto').createHash('sha256').update(raw + ':' + process.env.JWT_SECRET).digest('hex'), sessionVersion: 0, expiresAt: new Date(Date.now() + 60_000) } }); return raw; }
function submit(token: string, authorization: string | undefined, key = 'evp-idempotency-key', value = evp) { return fetch(baseUrl + '/direct-pix/responsible/evp-key-versions', { method: 'POST', headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json', 'idempotency-key': key, ...(authorization ? { 'x-step-up-authorization': authorization } : {}) }, body: JSON.stringify({ keyType: 'EVP', evp: value }) }); }

before(async () => { assert.deepEqual(await prisma.$queryRaw<Array<{ run_id: string; database: string }>>`SELECT run_id,current_database() AS database FROM "_e2e_runner"`, [{ run_id: runId, database: 'mealfy_e2e' }]); });
beforeEach(async () => { await cleanDatabase(); await new Promise<void>((resolve) => { server = createApp().listen(0, '127.0.0.1', resolve); }); baseUrl = 'http://127.0.0.1:' + (server!.address() as AddressInfo).port; });
afterEach(async () => { if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve())); });
after(async () => prisma.$disconnect());

test('canonical EVP is encrypted and submitted as masked immutable pending review', async () => { const x = await setup(); const p = await proof(x.account.user.id, x.family.id); const r = await submit(x.token, p, 'canonical-evp-key', evp.toUpperCase()); assert.equal(r.status, 201); const body = await r.json() as { keyVersion: Record<string, unknown> }; assert.equal(body.keyVersion.status, 'PENDING_REVIEW'); assert.match(String(body.keyVersion.evpMasked), /^••••/); assert.doesNotMatch(JSON.stringify(body), new RegExp(evp)); const row = await prisma.directPixEvpKeyVersion.findFirstOrThrow(); assert.notEqual(row.ciphertext, evp); assert.equal(row.nonce.length > 8, true); assert.equal(row.tag.length > 8, true); assert.equal(row.encryptionKid, 'e2e-aes-2026-01'); assert.equal(row.fingerprintKid, 'e2e-hmac-2026-01'); const decipher = createDecipheriv('aes-256-gcm', Buffer.from(process.env.DIRECT_PIX_EVP_ENCRYPTION_KEY!, 'hex'), Buffer.from(row.nonce, 'base64url')); decipher.setAAD(evpAad({ recordId: row.id, familyId: row.familyId, assignmentId: row.assignmentId, version: row.version })); decipher.setAuthTag(Buffer.from(row.tag, 'base64url')); assert.equal(Buffer.concat([decipher.update(Buffer.from(row.ciphertext, 'base64url')), decipher.final()]).toString(), evp); });

test('invalid EVP and missing or mismatched step-up do not create secrets', async () => { const x = await setup(); assert.equal((await submit(x.token, undefined)).status, 422); const p = await proof(x.account.user.id, x.family.id); assert.equal((await submit(x.token, p, 'invalid-evp-key', 'user@example.test')).status, 422); const wrong = await proof(x.account.user.id, 'other-family'); assert.equal((await submit(x.token, wrong, 'wrong-scope-key')).status, 401); assert.equal(await prisma.directPixEvpKeyVersion.count(), 0); });

test('stale responsibility is rejected and ciphertext/AAD tampering fails authentication', async () => { const x = await setup(); await prisma.familyResponsibleAssignment.update({ where: { id: x.assignment.id }, data: { endedAt: new Date(), endReason: 'reassigned' } }); const p = await proof(x.account.user.id, x.family.id); assert.equal((await submit(x.token, p, 'stale-assignment-key')).status, 403); const row = await prisma.directPixEvpKeyVersion.create({ data: { id: '11111111-1111-1111-1111-111111111111', familyId: x.family.id, assignmentId: x.assignment.id, submittedByUserId: x.account.user.id, version: 99, encryptionKid: 'e2e-aes-2026-01', nonce: 'AAAAAAAAAAAAAAAA', ciphertext: 'AA', tag: 'AAAAAAAAAAAAAAAAAAAAAA', fingerprintKid: 'e2e-hmac-2026-01', fingerprint: 'masked' } }); const decipher = createDecipheriv('aes-256-gcm', Buffer.from(process.env.DIRECT_PIX_EVP_ENCRYPTION_KEY!, 'hex'), Buffer.from(row.nonce, 'base64url')); decipher.setAAD(Buffer.from('tampered')); decipher.setAuthTag(Buffer.from(row.tag, 'base64url')); assert.throws(() => { decipher.update(Buffer.from(row.ciphertext, 'base64url')); decipher.final(); }); });

test('idempotency race creates one version/audit/outbox and secret never enters surfaces', async () => { const x = await setup(); const p = await proof(x.account.user.id, x.family.id); const [a, b] = await Promise.all([submit(x.token, p, 'race-idempotency-key'), submit(x.token, p, 'race-idempotency-key')]); assert.deepEqual([a.status, b.status].sort(), [201, 201]); assert.equal(await prisma.directPixEvpKeyVersion.count(), 1); assert.equal(await prisma.auditLog.count({ where: { action: 'direct_pix.evp.submitted' } }), 1); assert.equal(await prisma.outboxEvent.count({ where: { eventType: 'direct_pix.evp.submitted' } }), 1); const stored = JSON.stringify({ audit: await prisma.auditLog.findMany(), outbox: await prisma.outboxEvent.findMany(), idem: await prisma.idempotencyRecord.findMany() }); assert.doesNotMatch(stored, new RegExp(evp)); });
