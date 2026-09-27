import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('E2E requires DATABASE_URL from the root Docker Compose runner. Use: npm run test:e2e');
}

const runId = process.env.E2E_RUN_ID;
if (!runId || !/^mealfy-e2e-[a-zA-Z0-9-]+$/.test(runId)) {
  throw new Error('E2E requires the ownership token created by the root Docker Compose runner.');
}

const parsedDatabaseUrl = new URL(databaseUrl);
if (
  process.env.NODE_ENV !== 'test'
  || parsedDatabaseUrl.hostname !== '127.0.0.1'
  || parsedDatabaseUrl.pathname !== '/mealfy_e2e'
) {
  throw new Error(
    'Refusing to run E2E outside the isolated local PostgreSQL database mealfy_e2e on 127.0.0.1.',
  );
}

// Runtime modules must be loaded only after the runner configures the isolated database and JWT.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApp } = require('../src/app') as typeof import('../src/app');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');

let server: http.Server | undefined;
let baseUrl: string;

async function cleanDatabase(): Promise<void> {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`
    SELECT tablename
    FROM pg_tables
    WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')
  `;

  if (tables.length === 0) {
    throw new Error('E2E database has no application tables. Did Prisma migrations run?');
  }

  const quotedTables = tables
    .map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`)
    .join(', ');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${quotedTables} RESTART IDENTITY CASCADE`);
}

before(async () => {
  const ownership = await prisma.$queryRaw<Array<{ run_id: string; database: string }>>`
    SELECT run_id, current_database() AS database FROM "_e2e_runner"
  `;
  assert.deepEqual(ownership, [{ run_id: runId, database: 'mealfy_e2e' }]);
});

beforeEach(async () => {
  await cleanDatabase();
  await new Promise<void>((resolve) => {
    server = createApp().listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => {
    server!.close((error) => (error ? reject(error) : resolve()));
  });
  server = undefined;
});

after(async () => {
  await prisma.$disconnect();
});

async function registerDonor() {
  return fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      name: 'Doadora E2E',
      email: 'doadora.e2e@example.test',
      password: 'Senha-E2E-segura-123',
      role: 'donor',
    }),
  });
}

test('authenticated HTTP persists a registered donor and reads it from PostgreSQL', async () => {
  const registration = await registerDonor();
  assert.equal(registration.status, 201);

  const registered = await registration.json() as {
    user: { id: string; email: string; role: string };
  };
  assert.equal(registered.user.email, 'doadora.e2e@example.test');
  assert.equal(registered.user.role, 'donor');

  const login = await fetch(`${baseUrl}/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      email: 'doadora.e2e@example.test',
      password: 'Senha-E2E-segura-123',
    }),
  });
  assert.equal(login.status, 200);
  const authenticated = await login.json() as { token: string };

  const update = await fetch(`${baseUrl}/me`, {
    method: 'PATCH',
    headers: {
      authorization: `Bearer ${authenticated.token}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify({ name: 'Doadora Persistida' }),
  });
  assert.equal(update.status, 200);

  const persisted = await fetch(`${baseUrl}/me`, {
    headers: { authorization: `Bearer ${authenticated.token}` },
  });
  assert.equal(persisted.status, 200);
  const persistedBody = await persisted.json() as { user: { id: string; name: string; email: string } };
  assert.equal(persistedBody.user.id, registered.user.id);
  assert.equal(persistedBody.user.name, 'Doadora Persistida');
  assert.equal(persistedBody.user.email, 'doadora.e2e@example.test');

  const databaseUser = await prisma.user.findUniqueOrThrow({ where: { id: registered.user.id } });
  assert.equal(databaseUser.name, 'Doadora Persistida');
});

test('failed PostgreSQL transaction does not leak partial state', async () => {
  await assert.rejects(
    prisma.$transaction(async (tx) => {
      await tx.user.create({
        data: {
          name: 'Transação incompleta',
          email: 'rollback.e2e@example.test',
          role: 'donor',
        },
      });
      throw new Error('force rollback');
    }),
    /force rollback/,
  );

  assert.equal(await prisma.user.count({ where: { email: 'rollback.e2e@example.test' } }), 0);
});

test('database cleanup prevents state leaking between E2E scenarios', async () => {
  const registration = await registerDonor();
  assert.equal(registration.status, 201);

  const body = await registration.json() as { user: { email: string } };
  assert.equal(body.user.email, 'doadora.e2e@example.test');
});
