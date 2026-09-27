import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';
import path from 'node:path';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('E2E requires DATABASE_URL from the root Docker Compose runner. Use: npm run test:e2e');
const runId = process.env.E2E_RUN_ID;
if (!runId || !/^mealfy-e2e-[a-zA-Z0-9-]+$/.test(runId)) throw new Error('E2E requires the ownership token created by the root Docker Compose runner.');
const parsedDatabaseUrl = new URL(databaseUrl);
if (process.env.NODE_ENV !== 'test' || parsedDatabaseUrl.hostname !== '127.0.0.1' || parsedDatabaseUrl.pathname !== '/mealfy_e2e') {
  throw new Error('Refusing to run E2E outside the isolated local PostgreSQL database mealfy_e2e on 127.0.0.1.');
}

// Runtime modules load only after the root runner configures isolated PostgreSQL and JWT.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApp } = require('../src/app') as typeof import('../src/app');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');

const captureDir = path.resolve(process.env.EMAIL_CAPTURE_DIR ?? '.tmp/e2e-mail');
let server: http.Server | undefined;
let baseUrl: string;

async function cleanDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')
  `;
  const quoted = tables.map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`).join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`);
}

before(async () => {
  const ownership = await prisma.$queryRaw<Array<{ run_id: string; database: string }>>`
    SELECT run_id, current_database() AS database FROM "_e2e_runner"
  `;
  assert.deepEqual(ownership, [{ run_id: runId, database: 'mealfy_e2e' }]);
});

beforeEach(async () => {
  await cleanDatabase();
  await rm(captureDir, { recursive: true, force: true });
  await new Promise<void>((resolve) => { server = createApp().listen(0, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
});

afterEach(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  server = undefined;
  await rm(captureDir, { recursive: true, force: true });
});
after(async () => { await prisma.$disconnect(); });

async function register(email: string): Promise<{ token: string; user: { id: string; emailVerifiedAt: string | null } }> {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Conta de teste', email, password: 'Senha-E2E-segura-123', role: 'donor' }),
  });
  assert.equal(response.status, 201);
  return response.json() as Promise<{ token: string; user: { id: string; emailVerifiedAt: string | null } }>;
}

async function capturedVerificationTokens(expectedMinimum = 1): Promise<string[]> {
  let files: string[] = [];
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try { files = await readdir(captureDir); } catch { files = []; }
    if (files.length >= expectedMinimum) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  return Promise.all(files.map(async (file) => {
    const capture = JSON.parse(await readFile(path.join(captureDir, file), 'utf8')) as { kind: string; verificationToken: string };
    assert.equal(capture.kind, 'email_verification');
    return capture.verificationToken;
  }));
}

async function capturedVerificationToken(): Promise<string> {
  const tokens = await capturedVerificationTokens();
  assert.equal(tokens.length, 1);
  return tokens[0];
}

function requestVerification(email: string) {
  return fetch(`${baseUrl}/auth/email-verification/request`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ email }),
  });
}

function confirmVerification(token: string, accessToken: string) {
  return fetch(`${baseUrl}/auth/email-verification/confirm`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ token }),
  });
}

test('new and legacy accounts stay unverified until a hash-only email token is confirmed', async () => {
  const account = await register('verify-me@example.test');
  assert.equal(account.user.emailVerifiedAt, null);

  const blockedTerms = await fetch(`${baseUrl}/direct-pix/terms/current`, { headers: { authorization: `Bearer ${account.token}` } });
  assert.equal(blockedTerms.status, 403);

  const readinessBefore = await fetch(`${baseUrl}/direct-pix/readiness`, { headers: { authorization: `Bearer ${account.token}` } });
  assert.equal(readinessBefore.status, 200);
  assert.deepEqual(await readinessBefore.json(), { ready: false, blockers: ['email_not_verified'] });

  const requested = await requestVerification('VERIFY-ME@example.test');
  assert.equal(requested.status, 202);
  assert.deepEqual(await requested.json(), { message: 'Se houver uma conta vinculada ao e-mail, você receberá instruções em breve.' });

  const rawToken = await capturedVerificationToken();
  const rows = await prisma.$queryRaw<Array<{ tokenHash: string }>>`SELECT "tokenHash" FROM email_verification_tokens`;
  assert.deepEqual(rows, [{ tokenHash: createHash('sha256').update(rawToken).digest('hex') }]);
  assert.notEqual(rows[0].tokenHash, rawToken);

  const confirmed = await confirmVerification(rawToken, account.token);
  assert.equal(confirmed.status, 200);
  const confirmedBody = await confirmed.json() as { user: { emailVerifiedAt: string | null } };
  assert.ok(confirmedBody.user.emailVerifiedAt);

  const readinessAfter = await fetch(`${baseUrl}/direct-pix/readiness`, { headers: { authorization: `Bearer ${account.token}` } });
  assert.equal(readinessAfter.status, 200);
  assert.deepEqual(await readinessAfter.json(), { ready: true, blockers: [] });
});

test('resend invalidates prior proof and expired, tampered, replayed or other-owner tokens are rejected', async () => {
  const owner = await register('owner@example.test');
  const other = await register('other@example.test');

  assert.equal((await requestVerification('owner@example.test')).status, 202);
  const [first] = await capturedVerificationTokens();
  assert.equal((await requestVerification('owner@example.test')).status, 202);
  const tokens = await capturedVerificationTokens(2);
  const second = tokens.find((token) => token !== first)!;

  for (const [token, accessToken] of [[first, owner.token], [second + 'x', owner.token], [second, other.token]] as const) {
    const response = await confirmVerification(token, accessToken);
    assert.equal(response.status, 400);
  }

  await prisma.emailVerificationToken.updateMany({ data: { expiresAt: new Date(Date.now() - 1_000) } });
  assert.equal((await confirmVerification(second, owner.token)).status, 400);

  const beforeFresh = new Set(await capturedVerificationTokens());
  await requestVerification('owner@example.test');
  const fresh = (await capturedVerificationTokens(beforeFresh.size + 1)).find((token) => !beforeFresh.has(token))!;
  assert.equal((await confirmVerification(fresh, owner.token)).status, 200);
  assert.equal((await confirmVerification(fresh, owner.token)).status, 400);
});

test('concurrent resends leave only the newest proof usable', async () => {
  const account = await register('parallel-resend@example.test');
  const responses = await Promise.all([
    requestVerification('parallel-resend@example.test'),
    requestVerification('parallel-resend@example.test'),
  ]);
  assert.deepEqual(responses.map(({ status }) => status), [202, 202]);
  const tokens = await capturedVerificationTokens(2);
  assert.equal(tokens.length, 2);
  const active = await prisma.emailVerificationToken.findMany({ where: { userId: account.user.id, deliveredAt: { not: null }, usedAt: null } });
  assert.equal(active.length, 1);
  const activeToken = tokens.find((token) => createHash('sha256').update(token).digest('hex') === active[0].tokenHash)!;
  const invalidToken = tokens.find((token) => token !== activeToken)!;
  assert.equal((await confirmVerification(invalidToken, account.token)).status, 400);
  assert.equal((await confirmVerification(activeToken, account.token)).status, 200);
});

test('concurrent confirmation has exactly one winner', async () => {
  const account = await register('concurrent@example.test');
  await requestVerification('concurrent@example.test');
  const token = await capturedVerificationToken();
  const responses = await Promise.all([confirmVerification(token, account.token), confirmVerification(token, account.token)]);
  assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 400]);
});

test('public requests stay neutral for missing, unverified and verified accounts', async () => {
  const account = await register('neutral@example.test');
  const expected = { message: 'Se houver uma conta vinculada ao e-mail, você receberá instruções em breve.' };
  const missing = await requestVerification('missing@example.test');
  const unverified = await requestVerification('neutral@example.test');
  const token = await capturedVerificationToken();
  await confirmVerification(token, account.token);
  const verified = await requestVerification('neutral@example.test');
  for (const response of [missing, unverified, verified]) {
    assert.equal(response.status, 202);
    assert.deepEqual(await response.json(), expected);
  }
});

test('delivery failure stays neutral and removes the unusable proof', async () => {
  const account = await register('delivery-failure@example.test');
  await writeFile(captureDir, 'block mailbox directory creation');
  const response = await requestVerification('delivery-failure@example.test');
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { message: 'Se houver uma conta vinculada ao e-mail, você receberá instruções em breve.' });
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.equal(await prisma.emailVerificationToken.count({ where: { userId: account.user.id } }), 0);
});

test('verification requests are rate limited by normalized account identity', async () => {
  const account = await register('rate-limit@example.test');
  const responses = [];
  for (let attempt = 0; attempt < 4; attempt += 1) responses.push(await requestVerification(' RATE-LIMIT@example.test '));
  assert.deepEqual(responses.map(({ status }) => status), [202, 202, 202, 429]);
  await capturedVerificationTokens(3);
  assert.equal(await prisma.emailVerificationToken.count({ where: { userId: account.user.id, deliveredAt: { not: null }, usedAt: null } }), 1);
});
