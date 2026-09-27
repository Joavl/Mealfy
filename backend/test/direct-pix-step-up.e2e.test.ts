import assert from 'node:assert/strict';
import { createHash, createHmac } from 'node:crypto';
import { readdir, readFile, rm } from 'node:fs/promises';
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
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { requireStepUpAuthorization } = require('../src/modules/auth/stepUp.service') as typeof import('../src/modules/auth/stepUp.service');

const captureDir = path.resolve(process.env.EMAIL_CAPTURE_DIR ?? '.tmp/e2e-mail');
const password = 'Senha-E2E-segura-123';
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

async function register(email: string) {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: 'Responsável de teste', email, password, role: 'donor' }),
  });
  assert.equal(response.status, 201);
  const account = await response.json() as { token: string; user: { id: string } };
  await prisma.user.update({ where: { id: account.user.id }, data: { emailVerifiedAt: new Date() } });
  return account;
}

type Purpose = 'view_pix_key' | 'change_pix_key' | 'revoke_pix_key';

function requestChallenge(accessToken: string, purpose: Purpose = 'change_pix_key', resourceId = 'family-123', suppliedPassword = password) {
  return fetch(`${baseUrl}/auth/step-up/challenges`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ password: suppliedPassword, purpose, resourceId }),
  });
}

function confirmChallenge(accessToken: string, challengeId: string, code: string, purpose: Purpose = 'change_pix_key', resourceId = 'family-123') {
  return fetch(`${baseUrl}/auth/step-up/confirmations`, {
    method: 'POST',
    headers: { authorization: `Bearer ${accessToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ challengeId, code, purpose, resourceId }),
  });
}

async function capturedPasswordResetToken(): Promise<string> {
  let files: string[] = [];
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { files = await readdir(captureDir); } catch { files = []; }
    for (const file of files) {
      const capture = JSON.parse(await readFile(path.join(captureDir, file), 'utf8')) as { kind: string; resetToken?: string };
      if (capture.kind === 'password_reset' && capture.resetToken) return capture.resetToken;
    }
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error('Password reset capture not found');
}

async function capturedOtp(expectedMinimum = 1): Promise<string[]> {
  let files: string[] = [];
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { files = await readdir(captureDir); } catch { files = []; }
    if (files.length >= expectedMinimum) break;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  const captures = await Promise.all(files.map(async (file) => JSON.parse(await readFile(path.join(captureDir, file), 'utf8')) as { kind: string; code?: string }));
  return captures.filter(({ kind }) => kind === 'direct_pix_step_up').map(({ code }) => code!);
}

test('password plus delivered OTP creates a hash-only, purpose-bound ten-minute challenge', async () => {
  const account = await register('step-up@example.test');
  const response = await requestChallenge(account.token);
  assert.equal(response.status, 202);
  const body = await response.json() as { challengeId: string; expiresAt: string };
  assert.ok(body.challengeId);

  const [code] = await capturedOtp();
  assert.match(code, /^\d{6}$/);
  const row = await prisma.stepUpChallenge.findUniqueOrThrow({ where: { id: body.challengeId } });
  assert.equal(row.userId, account.user.id);
  assert.equal(row.purpose, 'change_pix_key');
  assert.equal(row.resourceId, 'family-123');
  assert.notEqual(row.codeHash, code);
  assert.equal(row.codeHash, createHmac('sha256', process.env.STEP_UP_OTP_HMAC_KEY!).update(`${body.challengeId}:${code}`).digest('hex'));
  assert.ok(row.deliveredAt);
  assert.equal(row.failedAttempts, 0);
  assert.ok(Math.abs(row.expiresAt.getTime() - new Date(body.expiresAt).getTime()) < 10);
  const ttl = row.expiresAt.getTime() - row.createdAt.getTime();
  assert.ok(ttl >= 599_000 && ttl <= 601_000);

  const wrongPassword = await requestChallenge(account.token, 'change_pix_key', 'family-123', 'senha-incorreta');
  assert.equal(wrongPassword.status, 401);
  assert.equal((await wrongPassword.json() as { code: string }).code, 'step_up_failed');
});

test('resend invalidates the previous challenge and successful confirmation cannot be replayed or cross-scoped', async () => {
  const account = await register('scope@example.test');
  const first = await requestChallenge(account.token);
  const firstBody = await first.json() as { challengeId: string };
  const [firstCode] = await capturedOtp();

  const second = await requestChallenge(account.token);
  const secondBody = await second.json() as { challengeId: string };
  const codes = await capturedOtp(2);
  const secondCode = codes.find((code) => code !== firstCode)!;
  assert.equal((await confirmChallenge(account.token, firstBody.challengeId, firstCode)).status, 401);
  assert.equal((await confirmChallenge(account.token, secondBody.challengeId, secondCode, 'revoke_pix_key')).status, 401);
  assert.equal((await confirmChallenge(account.token, secondBody.challengeId, secondCode, 'change_pix_key', 'family-other')).status, 401);

  const confirmed = await confirmChallenge(account.token, secondBody.challengeId, secondCode);
  assert.equal(confirmed.status, 200);
  const authorization = await confirmed.json() as { authorizationToken: string; expiresAt: string };
  assert.ok(authorization.authorizationToken);
  assert.equal((await confirmChallenge(account.token, secondBody.challengeId, secondCode)).status, 401);
  const stored = await prisma.stepUpAuthorization.findFirstOrThrow({ where: { userId: account.user.id } });
  assert.notEqual(stored.tokenHash, authorization.authorizationToken);
  assert.ok(stored.expiresAt.getTime() - stored.createdAt.getTime() >= 899_000);
  await requireStepUpAuthorization({ userId: account.user.id, token: authorization.authorizationToken, purpose: 'change_pix_key', resourceId: 'family-123' });
  await assert.rejects(
    requireStepUpAuthorization({ userId: account.user.id, token: authorization.authorizationToken, purpose: 'revoke_pix_key', resourceId: 'family-123' }),
    /autenticação reforçada/,
  );
  await assert.rejects(
    requireStepUpAuthorization({ userId: account.user.id, token: authorization.authorizationToken, purpose: 'change_pix_key', resourceId: 'family-other' }),
    /autenticação reforçada/,
  );
  const reusable = await fetch(`${baseUrl}/auth/step-up/authorizations/validate`, {
    method: 'POST', headers: { authorization: `Bearer ${account.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ authorizationToken: authorization.authorizationToken, purpose: 'change_pix_key', resourceId: 'family-123' }),
  });
  assert.equal(reusable.status, 204);
  assert.equal(reusable.headers.get('cache-control'), 'no-store');
  assert.equal(confirmed.headers.get('cache-control'), 'no-store');
  await prisma.stepUpAuthorization.update({ where: { id: stored.id }, data: { expiresAt: new Date() } });
  await assert.rejects(
    requireStepUpAuthorization({ userId: account.user.id, token: authorization.authorizationToken, purpose: 'change_pix_key', resourceId: 'family-123' }),
    /autenticação reforçada/,
  );
});

test('exact expiry, bounded attempts and concurrent confirmation are enforced', async () => {
  const account = await register('attempts@example.test');
  const requested = await requestChallenge(account.token);
  const { challengeId } = await requested.json() as { challengeId: string };
  const [code] = await capturedOtp();

  await prisma.stepUpChallenge.update({ where: { id: challengeId }, data: { expiresAt: new Date() } });
  assert.equal((await confirmChallenge(account.token, challengeId, code)).status, 401);

  const fresh = await requestChallenge(account.token);
  const { challengeId: freshId } = await fresh.json() as { challengeId: string };
  const freshCodes = await capturedOtp(2);
  const freshCode = freshCodes.find((candidate) => candidate !== code)!;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    assert.equal((await confirmChallenge(account.token, freshId, '000000')).status, 401);
  }
  const exhausted = await prisma.stepUpChallenge.findUniqueOrThrow({ where: { id: freshId } });
  assert.equal(exhausted.failedAttempts, 5);
  assert.ok(exhausted.invalidatedAt);
  assert.equal((await confirmChallenge(account.token, freshId, freshCode)).status, 401);

  const concurrent = await requestChallenge(account.token, 'view_pix_key', 'family-concurrent');
  const { challengeId: concurrentId } = await concurrent.json() as { challengeId: string };
  const latestCodes = await capturedOtp(3);
  const concurrentCode = latestCodes.find((candidate) => candidate !== code && candidate !== freshCode)!;
  const responses = await Promise.all([
    confirmChallenge(account.token, concurrentId, concurrentCode, 'view_pix_key', 'family-concurrent'),
    confirmChallenge(account.token, concurrentId, concurrentCode, 'view_pix_key', 'family-concurrent'),
  ]);
  assert.deepEqual(responses.map(({ status }) => status).sort(), [200, 401]);
});


test('concurrent resends leave one usable generation and concurrent guesses stop at five', async () => {
  const account = await register('concurrent-step-up@example.test');
  const requests = await Promise.all([
    requestChallenge(account.token, 'revoke_pix_key', 'family-race'),
    requestChallenge(account.token, 'revoke_pix_key', 'family-race'),
  ]);
  assert.deepEqual(requests.map(({ status }) => status), [202, 202]);
  const bodies = await Promise.all(requests.map((response) => response.json() as Promise<{ challengeId: string }>));
  const rows = await prisma.stepUpChallenge.findMany({ where: { userId: account.user.id, purpose: 'revoke_pix_key' } });
  assert.equal(rows.filter(({ deliveredAt, invalidatedAt }) => deliveredAt && !invalidatedAt).length, 1);
  const codes = await capturedOtp(2);
  const active = rows.find(({ deliveredAt, invalidatedAt }) => deliveredAt && !invalidatedAt)!;
  const activeCode = codes.find((candidate) => createHmac('sha256', process.env.STEP_UP_OTP_HMAC_KEY!).update(active.id + ':' + candidate).digest('hex') === active.codeHash)!;
  assert.ok(activeCode);
  for (const body of bodies.filter(({ challengeId }) => challengeId !== active.id)) {
    assert.equal((await confirmChallenge(account.token, body.challengeId, codes.find((code) => code !== activeCode)!, 'revoke_pix_key', 'family-race')).status, 401);
  }

  const guesses = await Promise.all(Array.from({ length: 5 }, () =>
    confirmChallenge(account.token, active.id, '000000', 'revoke_pix_key', 'family-race')));
  assert.deepEqual(guesses.map(({ status }) => status), [401, 401, 401, 401, 401]);
  const exhausted = await prisma.stepUpChallenge.findUniqueOrThrow({ where: { id: active.id } });
  assert.equal(exhausted.failedAttempts, 5);
  assert.equal((await confirmChallenge(account.token, active.id, activeCode, 'revoke_pix_key', 'family-race')).status, 401);
});

test('durable rate limit is shared across app instances and keyed by purpose', async () => {
  const account = await register('rate-limit-step-up@example.test');
  const secondServer = createApp().listen(0, '127.0.0.1');
  await new Promise<void>((resolve) => secondServer.once('listening', resolve));
  const secondBaseUrl = `http://127.0.0.1:${(secondServer.address() as AddressInfo).port}`;
  try {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const url = attempt % 2 === 0 ? baseUrl : secondBaseUrl;
      const response = await fetch(`${url}/auth/step-up/challenges`, {
        method: 'POST', headers: { authorization: `Bearer ${account.token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ password: 'wrong-password', purpose: 'change_pix_key', resourceId: 'family-rate' }),
      });
      assert.equal(response.status, 401);
    }
    assert.equal((await requestChallenge(account.token, 'change_pix_key', 'family-rate', 'wrong-password')).status, 429);
    assert.equal((await requestChallenge(account.token, 'revoke_pix_key', 'family-rate', 'wrong-password')).status, 401);
  } finally {
    await new Promise<void>((resolve, reject) => secondServer.close((error) => error ? reject(error) : resolve()));
  }
});

test('password reset revokes sessions, open challenges and issued authorizations', async () => {
  const account = await register('revocation@example.test');
  const requested = await requestChallenge(account.token);
  const { challengeId } = await requested.json() as { challengeId: string };
  const [code] = await capturedOtp();
  const confirmed = await confirmChallenge(account.token, challengeId, code);
  assert.equal(confirmed.status, 200);
  const authorization = await confirmed.json() as { authorizationToken: string };

  const resetRequested = await fetch(`${baseUrl}/auth/password-reset/request`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'revocation@example.test' }),
  });
  assert.equal(resetRequested.status, 202);
  const resetToken = await capturedPasswordResetToken();
  assert.equal((await confirmChallenge(account.token, challengeId, resetToken)).status, 422);
  const resetConfirmed = await fetch(`${baseUrl}/auth/password-reset/confirm`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ token: resetToken, password: 'Nova-Senha-E2E-456' }),
  });
  assert.equal(resetConfirmed.status, 200);
  assert.equal((await requestChallenge(account.token)).status, 401);
  await assert.rejects(
    requireStepUpAuthorization({ userId: account.user.id, token: authorization.authorizationToken, purpose: 'change_pix_key', resourceId: 'family-123' }),
    /autenticação reforçada/,
  );
  assert.equal(await prisma.stepUpAuthorization.count({ where: { userId: account.user.id, revokedAt: null } }), 0);
});
