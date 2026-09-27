import assert from 'node:assert/strict';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

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
const { signToken } = require('../src/shared/utils/jwt') as typeof import('../src/shared/utils/jwt');

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
  await new Promise<void>((resolve) => { server = createApp().listen(0, '127.0.0.1', resolve); });
  baseUrl = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
});

afterEach(async () => {
  if (server) await new Promise<void>((resolve, reject) => server!.close((error) => error ? reject(error) : resolve()));
  server = undefined;
});

after(async () => { await prisma.$disconnect(); });

async function createEntityOwner(suffix: string) {
  const user = await prisma.user.create({
    data: {
      name: `Gestor ${suffix}`,
      email: `gestor-${suffix}@example.test`,
      emailVerifiedAt: new Date(),
      role: 'entity',
      status: 'active',
    },
  });
  const entity = await prisma.entity.create({
    data: {
      userId: user.id,
      name: `Entidade ${suffix}`,
      cnpj: suffix.padStart(14, '0').slice(-14),
      responsibleName: user.name,
      email: user.email,
      status: 'active',
    },
  });
  await prisma.entityOperatorMembership.create({
    data: {
      entityId: entity.id,
      userId: user.id,
      permissions: ['operators.manage', 'families.read', 'families.write', 'pix.submit', 'pix.review', 'pix.follow_up', 'audit.read'],
    },
  });
  return { user, entity, token: signToken({ sub: user.id, role: user.role, sv: user.sessionVersion }) };
}

test('entity manager lists only operator identities and explicit permissions for its own entity', async () => {
  const owner = await createEntityOwner('1');
  const other = await createEntityOwner('2');
  await fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${other.token}` } });
  const response = await fetch(`${baseUrl}/entity/operators`, {
    headers: { authorization: `Bearer ${owner.token}` },
  });

  assert.equal(response.status, 200);
  const body = await response.json() as { operators: Array<{ user: { id: string; name: string; email: string; emailVerifiedAt: string }; [key: string]: unknown }>; availablePermissions: string[] };
  assert.equal(body.operators.length, 1);
  assert.deepEqual(body.operators[0].user, {
    id: owner.user.id,
    name: owner.user.name,
    email: owner.user.email,
    emailVerifiedAt: owner.user.emailVerifiedAt!.toISOString(),
  });
  assert.ok(body.availablePermissions.includes('operators.manage'));
  assert.equal(JSON.stringify(body).includes(other.user.email), false);
  assert.equal(JSON.stringify(body).match(/pixKey|evp|bank|account|agency/gi), null);
  assert.deepEqual(Object.keys(body.operators[0]).sort(), ['createdAt', 'id', 'permissions', 'status', 'updatedAt', 'user']);
});

test('permission checks, cross-entity 404 and revocation are enforced from current memberships', async () => {
  const owner = await createEntityOwner('11');
  const other = await createEntityOwner('22');
  await fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${owner.token}` } });
  await fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${other.token}` } });
  const operatorUser = await prisma.user.create({ data: {
    name: 'Operador limitado', email: 'operador-limitado@example.test', emailVerifiedAt: new Date(), role: 'entity', status: 'active',
  } });
  const membership = await prisma.entityOperatorMembership.create({ data: {
    entityId: owner.entity.id, userId: operatorUser.id, permissions: ['families.read'],
  } });
  const operatorToken = signToken({ sub: operatorUser.id, role: operatorUser.role, sv: operatorUser.sessionVersion });

  const deniedInvite = await fetch(`${baseUrl}/entity/operators/invitations`, {
    method: 'POST', headers: { authorization: `Bearer ${operatorToken}`, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'new@example.test', permissions: ['families.read'] }),
  });
  assert.equal(deniedInvite.status, 403);
  assert.equal((await deniedInvite.json() as { code: string }).code, 'insufficient_entity_permission');

  const foreign = await fetch(`${baseUrl}/entity/operators/${membership.id}`, {
    method: 'PATCH', headers: { authorization: `Bearer ${other.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'suspended' }),
  });
  assert.equal(foreign.status, 404);
  assert.equal((await foreign.json() as { code: string }).code, 'operator_not_found');

  const revoked = await fetch(`${baseUrl}/entity/operators/${membership.id}`, {
    method: 'PATCH', headers: { authorization: `Bearer ${owner.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'revoked' }),
  });
  assert.equal(revoked.status, 200);
  const oldSession = await fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${operatorToken}` } });
  assert.equal(oldSession.status, 401);
  const audit = await prisma.auditLog.findFirst({ where: { action: 'entity.operator.revoked', entityId: membership.id } });
  assert.equal((audit!.metadata as Record<string, unknown>).authorityEntityId, owner.entity.id);
});

test('entity family resources are scoped through membership and foreign ids return 404', async () => {
  const owner = await createEntityOwner('111');
  const other = await createEntityOwner('222');
  await fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${owner.token}` } });
  await fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${other.token}` } });
  const family = await prisma.family.create({ data: {
    responsibleName: 'Responsável', displayName: 'Família de outra entidade', entityId: other.entity.id, city: 'São Paulo', state: 'SP',
  } });
  const response = await fetch(`${baseUrl}/families/${family.id}`, { headers: { authorization: `Bearer ${owner.token}` } });
  assert.equal(response.status, 404);
  assert.equal((await response.json() as { code: string }).code, 'family_not_found');
});

test('maker-checker actions distinguish operator memberships and reject self-review', async () => {
  const owner = await createEntityOwner('333');
  await fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${owner.token}` } });
  const reviewerUser = await prisma.user.create({ data: {
    name: 'Revisor', email: 'revisor@example.test', emailVerifiedAt: new Date(), role: 'entity', status: 'active',
  } });
  await prisma.entityOperatorMembership.create({ data: {
    entityId: owner.entity.id, userId: reviewerUser.id, permissions: ['pix.review'],
  } });
  const { recordDirectPixOperatorAction } = require('../src/modules/entities/directPixOperatorAuthority.service') as typeof import('../src/modules/entities/directPixOperatorAuthority.service');
  await prisma.$transaction((tx) => recordDirectPixOperatorAction(tx, {
    actorUserId: owner.user.id, requiredPermission: 'pix.submit', resourceType: 'pix_key_version', resourceId: 'version-1', action: 'submit',
  }));
  await assert.rejects(
    prisma.$transaction((tx) => recordDirectPixOperatorAction(tx, {
      actorUserId: owner.user.id, requiredPermission: 'pix.review', resourceType: 'pix_key_version', resourceId: 'version-1', action: 'review',
    })),
    (error: unknown) => (error as { code?: string }).code === 'maker_checker_conflict',
  );
  await prisma.$transaction((tx) => recordDirectPixOperatorAction(tx, {
    actorUserId: reviewerUser.id, requiredPermission: 'pix.review', resourceType: 'pix_key_version', resourceId: 'version-1', action: 'review',
  }));
  const actors = await prisma.directPixOperatorAction.findMany({ where: { resourceId: 'version-1' }, orderBy: { createdAt: 'asc' } });
  assert.equal(actors.length, 2);
  assert.notEqual(actors[0].membershipId, actors[1].membershipId);
});

test('concurrent revocation removes authority even when an operator request races it', async () => {
  const owner = await createEntityOwner('444');
  await fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${owner.token}` } });
  const operatorUser = await prisma.user.create({ data: {
    name: 'Operador concorrente', email: 'operador-concorrente@example.test', emailVerifiedAt: new Date(), role: 'entity', status: 'active',
  } });
  const membership = await prisma.entityOperatorMembership.create({ data: {
    entityId: owner.entity.id, userId: operatorUser.id, permissions: ['families.read'],
  } });
  const operatorToken = signToken({ sub: operatorUser.id, role: operatorUser.role, sv: operatorUser.sessionVersion });
  const [revoked, raced] = await Promise.all([
    fetch(`${baseUrl}/entity/operators/${membership.id}`, {
      method: 'PATCH', headers: { authorization: `Bearer ${owner.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'revoked' }),
    }),
    fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${operatorToken}` } }),
  ]);
  assert.equal(revoked.status, 200);
  assert.ok([200, 401, 403].includes(raced.status));
  const after = await fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${operatorToken}` } });
  assert.equal(after.status, 401);
});

test('operator invitations never expose their bearer token to the manager response', async () => {
  const owner = await createEntityOwner('555');
  await fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${owner.token}` } });
  const response = await fetch(`${baseUrl}/entity/operators/invitations`, {
    method: 'POST', headers: { authorization: `Bearer ${owner.token}`, 'content-type': 'application/json' },
    body: JSON.stringify({ email: 'convidado@example.test', permissions: ['families.read'] }),
  });
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  const body = await response.json() as Record<string, unknown>;
  assert.equal(Object.prototype.hasOwnProperty.call(body, 'token'), false);
  assert.equal(JSON.stringify(body).match(/tokenHash|invitationToken|bearer/gi), null);
});

test('a revoked membership cannot reactivate after its user becomes active elsewhere', async () => {
  const firstOwner = await createEntityOwner('666');
  const secondOwner = await createEntityOwner('777');
  await Promise.all([
    fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${firstOwner.token}` } }),
    fetch(`${baseUrl}/entity/operators`, { headers: { authorization: `Bearer ${secondOwner.token}` } }),
  ]);
  const operator = await prisma.user.create({ data: {
    name: 'Operador migrado', email: 'operador-migrado@example.test', emailVerifiedAt: new Date(), role: 'entity', status: 'active',
  } });
  const former = await prisma.entityOperatorMembership.create({ data: {
    entityId: firstOwner.entity.id, userId: operator.id, status: 'revoked', permissions: ['families.read'],
  } });
  await prisma.entityOperatorMembership.create({ data: {
    entityId: secondOwner.entity.id, userId: operator.id, status: 'active', permissions: ['families.read'],
  } });
  const response = await fetch(`${baseUrl}/entity/operators/${former.id}`, {
    method: 'PATCH', headers: { authorization: `Bearer ${firstOwner.token}`, 'content-type': 'application/json' }, body: JSON.stringify({ status: 'active' }),
  });
  assert.equal(response.status, 409);
  assert.equal((await response.json() as { code: string }).code, 'operator_already_linked');
});
