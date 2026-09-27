import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('E2E requires DATABASE_URL from the root Docker Compose runner. Use: npm run test:e2e');
const runId = process.env.E2E_RUN_ID;
if (!runId || !/^mealfy-e2e-[a-zA-Z0-9-]+$/.test(runId)) {
  throw new Error('E2E requires the ownership token created by the root Docker Compose runner.');
}

const parsedDatabaseUrl = new URL(databaseUrl);
if (process.env.NODE_ENV !== 'test' || parsedDatabaseUrl.hostname !== '127.0.0.1' || parsedDatabaseUrl.pathname !== '/mealfy_e2e') {
  throw new Error('Refusing to run E2E outside the isolated local PostgreSQL database mealfy_e2e on 127.0.0.1.');
}

// Runtime modules load only after the root runner configures isolated PostgreSQL and JWT.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApp } = require('../src/app') as typeof import('../src/app');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');

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
  await prisma.directPixTermsVersion.create({
    data: {
      id: '6bb813fe-619e-4218-a475-733421b2a19b',
      version: '2026-08-22',
      title: 'Termos do Pix direto',
      statements: [
        'O dinheiro vai diretamente ao responsável familiar.',
        'A Mealfy não verifica a realização ou a liquidação do Pix.',
        'A transferência direta não gera recibo fiscal pela Mealfy.',
      ],
      publishedAt: new Date('2026-08-22T00:00:00.000Z'),
      effectiveAt: new Date('2026-08-22T00:00:00.000Z'),
      isCurrent: true,
    },
  });
  await new Promise<void>((resolve) => { server = createApp().listen(0, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
});

afterEach(async () => {
  if (!server) return;
  await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  server = undefined;
});

after(async () => { await prisma.$disconnect(); });

async function register(role: 'donor' | 'entity', email: string): Promise<{ token: string; user: { id: string } }> {
  const response = await fetch(`${baseUrl}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ name: `Conta ${role}`, email, password: 'Senha-E2E-segura-123', role }),
  });
  assert.equal(response.status, 201);
  return response.json() as Promise<{ token: string; user: { id: string } }>;
}

async function currentTerms(token: string) {
  const response = await fetch(`${baseUrl}/direct-pix/terms/current`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return { response, body: await response.json() as { terms: { version: string; statements: string[] } } };
}

function acceptTerms(token: string, version: string, idempotencyKey: string, correlationId = '2f7c26e6-d063-48e8-8898-2f2b903c562e') {
  return fetch(`${baseUrl}/direct-pix/terms/acceptances`, {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      'idempotency-key': idempotencyKey,
      'x-correlation-id': correlationId,
    },
    body: JSON.stringify({ version }),
  });
}

async function transactionalCounts() {
  const [row] = await prisma.$queryRaw<Array<{ acceptances: bigint; audits: bigint; outbox: bigint; idempotency: bigint }>>`
    SELECT
      (SELECT COUNT(*) FROM "direct_pix_terms_acceptances") AS acceptances,
      (SELECT COUNT(*) FROM "audit_logs" WHERE action = 'direct_pix.terms.accepted') AS audits,
      (SELECT COUNT(*) FROM "outbox_events" WHERE event_type = 'direct_pix.terms.accepted') AS outbox,
      (SELECT COUNT(*) FROM "idempotency_records" WHERE operation = 'direct_pix.accept_terms') AS idempotency
  `;
  return Object.fromEntries(Object.entries(row).map(([key, value]) => [key, Number(value)]));
}

test('authenticated donor reads current direct Pix terms and accepts with server-owned metadata', async () => {
  const donor = await register('donor', 'terms-donor@example.test');
  const { response: termsResponse, body: termsBody } = await currentTerms(donor.token);
  assert.equal(termsResponse.status, 200);
  assert.ok(termsBody.terms.version);
  assert.deepEqual(termsBody.terms.statements, [
    'O dinheiro vai diretamente ao responsável familiar.',
    'A Mealfy não verifica a realização ou a liquidação do Pix.',
    'A transferência direta não gera recibo fiscal pela Mealfy.',
  ]);

  const correlationId = '7800343a-8117-4828-8981-e160fc34dd94';
  const accepted = await acceptTerms(donor.token, termsBody.terms.version, 'accept-terms-first', correlationId);
  assert.equal(accepted.status, 201);
  assert.equal(accepted.headers.get('x-correlation-id'), correlationId);
  const body = await accepted.json() as { acceptance: Record<string, unknown> };
  assert.equal(body.acceptance.version, termsBody.terms.version);
  assert.equal(body.acceptance.actorUserId, donor.user.id);
  assert.equal(body.acceptance.actorRole, 'donor');
  assert.equal(body.acceptance.channel, 'web_pwa');
  assert.equal(body.acceptance.correlationId, correlationId);
  assert.ok(Date.parse(String(body.acceptance.acceptedAt)));
  assert.deepEqual(await transactionalCounts(), { acceptances: 1, audits: 1, outbox: 1, idempotency: 1 });
});

test('same idempotency key and body replays the original result without duplicate side effects', async () => {
  const donor = await register('donor', 'terms-replay@example.test');
  const { body: terms } = await currentTerms(donor.token);
  const first = await acceptTerms(donor.token, terms.terms.version, 'accept-terms-replay');
  const firstBody = await first.json();
  const replay = await acceptTerms(donor.token, terms.terms.version, 'accept-terms-replay');
  const replayBody = await replay.json();

  assert.equal(first.status, 201);
  assert.equal(replay.status, 201);
  assert.equal(replay.headers.get('idempotency-replayed'), 'true');
  assert.deepEqual(replayBody, firstBody);
  assert.deepEqual(await transactionalCounts(), { acceptances: 1, audits: 1, outbox: 1, idempotency: 1 });
});

test('same idempotency key with a different body returns idempotency_conflict', async () => {
  const donor = await register('donor', 'terms-conflict@example.test');
  const { body: terms } = await currentTerms(donor.token);
  assert.equal((await acceptTerms(donor.token, terms.terms.version, 'accept-terms-conflict')).status, 201);

  const conflict = await acceptTerms(donor.token, 'different-version', 'accept-terms-conflict');
  assert.equal(conflict.status, 409);
  assert.deepEqual(await conflict.json(), { message: 'A chave de idempotência já foi usada com outra requisição.', code: 'idempotency_conflict' });
  assert.deepEqual(await transactionalCounts(), { acceptances: 1, audits: 1, outbox: 1, idempotency: 1 });
});

test('concurrent requests with one idempotency key create one acceptance, audit and outbox event', async () => {
  const donor = await register('donor', 'terms-race@example.test');
  const { body: terms } = await currentTerms(donor.token);
  const responses = await Promise.all([
    acceptTerms(donor.token, terms.terms.version, 'accept-terms-race'),
    acceptTerms(donor.token, terms.terms.version, 'accept-terms-race'),
  ]);
  assert.deepEqual(responses.map(({ status }) => status).sort(), [201, 201]);
  assert.deepEqual(await Promise.all(responses.map((response) => response.json())), [
    await (await acceptTerms(donor.token, terms.terms.version, 'accept-terms-race')).json(),
    await (await acceptTerms(donor.token, terms.terms.version, 'accept-terms-race')).json(),
  ]);
  assert.deepEqual(await transactionalCounts(), { acceptances: 1, audits: 1, outbox: 1, idempotency: 1 });
});

test('outbox failure rolls back acceptance, audit and idempotency together', async () => {
  const donor = await register('donor', 'terms-rollback@example.test');
  const { body: terms } = await currentTerms(donor.token);
  await prisma.$executeRawUnsafe(`
    CREATE FUNCTION fail_direct_pix_outbox() RETURNS trigger AS $$
    BEGIN
      IF NEW.event_type = 'direct_pix.terms.accepted' THEN RAISE EXCEPTION 'forced outbox failure'; END IF;
      RETURN NEW;
    END; $$ LANGUAGE plpgsql
  `);
  await prisma.$executeRawUnsafe(`
    CREATE TRIGGER force_direct_pix_outbox_failure BEFORE INSERT ON outbox_events
    FOR EACH ROW EXECUTE FUNCTION fail_direct_pix_outbox()
  `);
  try {
    const failed = await acceptTerms(donor.token, terms.terms.version, 'accept-terms-rollback');
    assert.equal(failed.status, 500);
    assert.deepEqual(await transactionalCounts(), { acceptances: 0, audits: 0, outbox: 0, idempotency: 0 });
  } finally {
    await prisma.$executeRawUnsafe('DROP TRIGGER IF EXISTS force_direct_pix_outbox_failure ON outbox_events');
    await prisma.$executeRawUnsafe('DROP FUNCTION IF EXISTS fail_direct_pix_outbox()');
  }
});

test('non-donor actor cannot read or accept direct Pix terms', async () => {
  const entity = await register('entity', 'terms-entity@example.test');
  const read = await currentTerms(entity.token);
  assert.equal(read.response.status, 403);
  const write = await acceptTerms(entity.token, '2026-08-01', 'accept-terms-forbidden');
  assert.equal(write.status, 403);
  assert.deepEqual(await transactionalCounts(), { acceptances: 0, audits: 0, outbox: 0, idempotency: 0 });
});

test('idempotency storage keeps only request hash and resource reference, and audit is append-only', async () => {
  const donor = await register('donor', 'terms-storage@example.test');
  const { body: terms } = await currentTerms(donor.token);
  assert.equal((await acceptTerms(donor.token, terms.terms.version, 'accept-terms-storage')).status, 201);

  const [record] = await prisma.$queryRaw<Array<Record<string, unknown>>>`SELECT * FROM idempotency_records`;
  assert.match(String(record.request_hash), /^[a-f0-9]{64}$/);
  assert.equal(record.resource_type, 'direct_pix_terms_acceptance');
  assert.ok(record.resource_id);
  assert.equal(Object.keys(record).some((key) => /response|secret|payload/i.test(key)), false);

  const [audit] = await prisma.$queryRaw<Array<{ id: string }>>`SELECT id FROM audit_logs WHERE action = 'direct_pix.terms.accepted'`;
  await assert.rejects(
    prisma.$executeRawUnsafe("UPDATE audit_logs SET action = 'tampered' WHERE id = $1", audit.id),
    /append-only/,
  );
});
