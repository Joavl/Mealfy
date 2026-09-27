import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, before, beforeEach, test } from 'node:test';
import { getCurrentCycleStart } from '../src/shared/utils/feedCycle';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('E2E requires DATABASE_URL from the root Docker Compose runner. Use: npm run test:e2e');
const runId = process.env.E2E_RUN_ID;
if (!runId || !/^mealfy-e2e-[a-zA-Z0-9-]+$/.test(runId)) throw new Error('E2E requires the ownership token created by the root Docker Compose runner.');
const parsedDatabaseUrl = new URL(databaseUrl);
if (process.env.NODE_ENV !== 'test' || parsedDatabaseUrl.hostname !== '127.0.0.1' || parsedDatabaseUrl.pathname !== '/mealfy_e2e') throw new Error('Refusing to run E2E outside the isolated local PostgreSQL database mealfy_e2e on 127.0.0.1.');

// Loaded only after the isolated runner checks above.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { getDirectPixPublicFamilyProjection } = require('../src/modules/directPix/publicFamilyProjection.service') as typeof import('../src/modules/directPix/publicFamilyProjection.service');

async function cleanDatabase() {
  const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')`;
  const quoted = tables.map(({ tablename }) => `"${tablename.replaceAll('"', '""')}"`).join(', ');
  await prisma.$executeRawUnsafe('TRUNCATE TABLE ' + quoted + ' RESTART IDENTITY CASCADE');
}

async function createFixture(approvalStatus: 'approved' | 'pending' = 'approved') {
  const admin = await prisma.user.create({ data: { name: 'Admin civil name', email: `admin-${randomUUID()}@example.test`, role: 'admin', status: 'active', emailVerifiedAt: new Date() } });
  const responsible = await prisma.user.create({ data: { name: 'Responsible civil name', email: `responsible-${randomUUID()}@example.test`, role: 'beneficiary', status: 'active', emailVerifiedAt: new Date() } });
  const family = await prisma.family.create({ data: { responsibleName: 'Civil family name', displayName: 'Display family', city: 'São Paulo', state: 'SP', approximateAddress: 'Secret address', approvalStatus } });
  const assignment = await prisma.familyResponsibleAssignment.create({ data: { familyId: family.id, responsibleUserId: responsible.id, invitedByUserId: admin.id } });
  await prisma.directPixEvpKeyVersion.create({ data: {
    id: randomUUID(), familyId: family.id, assignmentId: assignment.id, submittedByUserId: responsible.id, version: 1, status: 'ACTIVE',
    encryptionKid: 'test-kid', nonce: 'nonce', ciphertext: 'ciphertext', tag: 'tag', fingerprintKid: 'fingerprint-kid', fingerprint: 'fingerprint',
  } });
  return { admin, responsible, family, assignment };
}

async function enableDisclosureAndCreation(adminId: string) {
  for (const key of ['CREATION', 'DISCLOSURE'] as const) {
    await prisma.directPixFeatureFlag.create({ data: { id: randomUUID(), key, scope: 'GLOBAL', enabled: true, updatedByUserId: adminId } });
  }
}

before(async () => {
  assert.deepEqual(await prisma.$queryRaw<Array<{ run_id: string; database: string }>>`SELECT run_id,current_database() AS database FROM "_e2e_runner"`, [{ run_id: runId, database: 'mealfy_e2e' }]);
});
beforeEach(cleanDatabase);
after(async () => prisma.$disconnect());

test('fails generic-unavailable without every approved, active-authority, key, and flag prerequisite', async () => {
  const scenarios = [
    async (fixture: Awaited<ReturnType<typeof createFixture>>) => {
      await prisma.family.update({ where: { id: fixture.family.id }, data: { approvalStatus: 'pending' } });
    },
    async (fixture: Awaited<ReturnType<typeof createFixture>>) => {
      await prisma.familyResponsibleAssignment.update({ where: { id: fixture.assignment.id }, data: { endedAt: new Date(), endReason: 'relationship_ended' } });
    },
    async (fixture: Awaited<ReturnType<typeof createFixture>>) => {
      await prisma.directPixEvpKeyVersion.updateMany({ where: { familyId: fixture.family.id }, data: { status: 'SUSPENDED' } });
    },
  ];

  for (const removePrerequisite of scenarios) {
    await cleanDatabase();
    const fixture = await createFixture();
    await enableDisclosureAndCreation(fixture.admin.id);
    await removePrerequisite(fixture);
    const result = await getDirectPixPublicFamilyProjection(fixture.family.id);
    assert.deepEqual(result, { id: fixture.family.id, availability: 'UNAVAILABLE' });
    assert.deepEqual(Object.keys(result).sort(), ['availability', 'id']);
    assert.doesNotMatch(JSON.stringify(result), /reason|assignment|key|civil|address|responsible/i);
  }

  await cleanDatabase();
  const withoutFlags = await createFixture();
  assert.deepEqual(await getDirectPixPublicFamilyProjection(withoutFlags.family.id), { id: withoutFlags.family.id, availability: 'UNAVAILABLE' });
});

test('requires active responsibility and ACTIVE key, then projects available only after both flags enable', async () => {
  const fixture = await createFixture();
  await enableDisclosureAndCreation(fixture.admin.id);
  assert.equal((await getDirectPixPublicFamilyProjection(fixture.family.id)).availability, 'AVAILABLE');

  await prisma.familyResponsibleAssignment.update({ where: { id: fixture.assignment.id }, data: { endedAt: new Date(), endReason: 'reassigned' } });
  assert.deepEqual(await getDirectPixPublicFamilyProjection(fixture.family.id), { id: fixture.family.id, availability: 'UNAVAILABLE' });
});

test('maps donor-safe Direct Pix lifecycle states without exposing payment internals', async () => {
  const fixture = await createFixture();
  await enableDisclosureAndCreation(fixture.admin.id);
  const cycleStart = getCurrentCycleStart();
  const cycleEnd = new Date(cycleStart);
  cycleEnd.setUTCDate(cycleEnd.getUTCDate() + 1);
  await prisma.familySupportCycle.create({ data: {
    familyId: fixture.family.id,
    cycleStartAt: cycleStart,
    cycleEndAt: cycleEnd,
    blockedAt: new Date(),
  } });
  assert.equal((await getDirectPixPublicFamilyProjection(fixture.family.id)).availability, 'IN_PROGRESS');
  await prisma.family.update({ where: { id: fixture.family.id }, data: { lastFedAt: new Date() } });
  assert.equal((await getDirectPixPublicFamilyProjection(fixture.family.id)).availability, 'SERVED_THIS_CYCLE');
});

test('unknown family is indistinguishable from other unavailable states', async () => {
  const missingId = randomUUID();
  assert.deepEqual(await getDirectPixPublicFamilyProjection(missingId), { id: missingId, availability: 'UNAVAILABLE' });
});
