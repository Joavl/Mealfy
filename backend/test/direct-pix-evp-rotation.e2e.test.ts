import assert from 'node:assert/strict';
import { after, before, beforeEach, test } from 'node:test';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('E2E requires DATABASE_URL from the root Docker Compose runner. Use: npm run test:e2e');
const runId = process.env.E2E_RUN_ID;
if (!runId || !/^mealfy-e2e-[a-zA-Z0-9-]+$/.test(runId)) throw new Error('E2E requires the ownership token created by the root Docker Compose runner.');
const parsedDatabaseUrl = new URL(databaseUrl);
if (process.env.NODE_ENV !== 'test' || parsedDatabaseUrl.hostname !== '127.0.0.1' || parsedDatabaseUrl.pathname !== '/mealfy_e2e') throw new Error('Refusing to run E2E outside isolated PostgreSQL.');

const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');
const crypto = require('../src/modules/directPix/evpKey.crypto') as typeof import('../src/modules/directPix/evpKey.crypto');
const rotation = require('../src/modules/directPix/evpKeyRotation.service') as typeof import('../src/modules/directPix/evpKeyRotation.service');
const { env } = require('../src/config/env') as typeof import('../src/config/env');
const EVP = '00000000-0000-0000-0000-000000000001';
const oldKeyring = env.DIRECT_PIX_EVP_KEYRING;
const keyring = JSON.stringify({ encryption: [
  { kid: 'e2e-aes-2026-01', key: process.env.DIRECT_PIX_EVP_ENCRYPTION_KEY, write: false },
  { kid: 'e2e-aes-2026-02', key: 'f1'.repeat(32), write: true },
], fingerprints: [
  { kid: 'e2e-hmac-2026-01', key: process.env.DIRECT_PIX_EVP_FINGERPRINT_KEY, write: false },
  { kid: 'e2e-hmac-2026-02', key: 'e2'.repeat(32), write: true },
] });

async function cleanDatabase(): Promise<void> { const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')`; await prisma.$executeRawUnsafe('TRUNCATE TABLE ' + tables.map(({ tablename }) => '"' + tablename.replaceAll('"', '""') + '"').join(', ') + ' RESTART IDENTITY CASCADE'); }
async function seeded(index: number) {
  const user = await prisma.user.create({ data: { name: 'Rotation', email: 'rotation-' + index + '@example.test', role: 'beneficiary', status: 'active', emailVerifiedAt: new Date() } });
  const family = await prisma.family.create({ data: { responsibleName: 'Rotation', displayName: 'Rotation ' + index, city: 'São Paulo', state: 'SP', approvalStatus: 'approved' } });
  const assignment = await prisma.familyResponsibleAssignment.create({ data: { familyId: family.id, responsibleUserId: user.id, invitedByUserId: user.id } });
  const id = '10000000-0000-0000-0000-' + String(index).padStart(12, '0'); const context = { recordId: id, familyId: family.id, assignmentId: assignment.id, version: 1 }; const sealed = crypto.encryptEvp(EVP, context);
  return prisma.directPixEvpKeyVersion.create({ data: { id, familyId: family.id, assignmentId: assignment.id, submittedByUserId: user.id, version: 1, status: 'ACTIVE', ...sealed } });
}

before(async () => { assert.deepEqual(await prisma.$queryRaw<Array<{ run_id: string; database: string }>>`SELECT run_id,current_database() AS database FROM "_e2e_runner"`, [{ run_id: runId, database: 'mealfy_e2e' }]); });
beforeEach(async () => { env.DIRECT_PIX_EVP_KEYRING = undefined; await cleanDatabase(); });
after(async () => { env.DIRECT_PIX_EVP_KEYRING = oldKeyring; await prisma.$disconnect(); });

test('rotation resumes in bounded batches, dual-writes HMAC, and audit remains opaque', async () => {
  const rows = await Promise.all([seeded(1), seeded(2), seeded(3)]);
  env.DIRECT_PIX_EVP_KEYRING = keyring;
  const job = await rotation.startEvpRotation({ encryptionKid: 'e2e-aes-2026-02', fingerprintKid: 'e2e-hmac-2026-02' });
  const partial = await rotation.runEvpRotationBatch(job.id, 1); assert.equal(partial.status, 'RUNNING'); assert.equal(partial.processedCount, 1);
  const resumed = await rotation.runEvpRotationBatch(job.id, 2); assert.equal(resumed.status, 'RUNNING'); assert.equal(resumed.processedCount, 3);
  const done = await rotation.runEvpRotationBatch(job.id, 2); assert.equal(done.status, 'COMPLETED'); assert.equal(done.processedCount, 3);
  for (const row of rows) {
    const latest = await prisma.directPixEvpKeyEnvelope.findFirstOrThrow({ where: { keyVersionId: row.id }, orderBy: { generation: 'desc' } });
    assert.equal(latest.encryptionKid, 'e2e-aes-2026-02');
    assert.equal(crypto.decryptEvp(latest, { recordId: row.id, familyId: row.familyId, assignmentId: row.assignmentId, version: row.version }), EVP);
    assert.deepEqual((await prisma.directPixEvpKeyFingerprint.findMany({ where: { keyVersionId: row.id }, orderBy: { fingerprintKid: 'asc' } })).map((entry) => entry.fingerprintKid), ['e2e-hmac-2026-02']);
  }
  const audit = JSON.stringify(await prisma.auditLog.findMany({ where: { entityType: 'direct_pix_evp_rotation_job' } }));
  assert.equal(audit.includes(EVP), false); assert.equal(audit.includes('ciphertext'), false); assert.equal(audit.includes('f1'.repeat(8)), false);
});

test('concurrent rotations serialize safely and AEAD rejects unknown KID, AAD, tag, and swapped ciphertext', async () => {
  const first = await seeded(4); const second = await seeded(5); env.DIRECT_PIX_EVP_KEYRING = keyring;
  const [a, b] = await Promise.all([rotation.startEvpRotation({ encryptionKid: 'e2e-aes-2026-02' }), rotation.startEvpRotation({ fingerprintKid: 'e2e-hmac-2026-02' })]);
  await Promise.all([rotation.runEvpRotationBatch(a.id, 20), rotation.runEvpRotationBatch(b.id, 20)]);
  const envelope = await prisma.directPixEvpKeyEnvelope.findFirstOrThrow({ where: { keyVersionId: first.id }, orderBy: { generation: 'desc' } });
  const context = { recordId: first.id, familyId: first.familyId, assignmentId: first.assignmentId, version: first.version };
  for (const corrupted of [{ ...envelope, encryptionKid: 'missing' }, { ...envelope, tag: envelope.tag.slice(1) + 'A' }, { ...envelope, ciphertext: (await prisma.directPixEvpKeyEnvelope.findFirstOrThrow({ where: { keyVersionId: second.id }, orderBy: { generation: 'desc' } })).ciphertext }]) assert.throws(() => crypto.decryptEvp(corrupted, context), { code: 'evp_envelope_invalid' });
});
