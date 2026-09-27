import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { after, afterEach, before, beforeEach, test } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

const databaseUrl = process.env.DATABASE_URL;
const runId = process.env.E2E_RUN_ID;
if (!databaseUrl || !runId) throw new Error('Use npm run test:e2e');
const parsed = new URL(databaseUrl);
if (process.env.NODE_ENV !== 'test' || parsed.hostname !== '127.0.0.1' || parsed.pathname !== '/mealfy_e2e') throw new Error('Refusing unisolated E2E execution.');
// Loaded only after the runner ownership guard.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { createApp } = require('../src/app') as typeof import('../src/app');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { signToken } = require('../src/shared/utils/jwt') as typeof import('../src/shared/utils/jwt');

let server: http.Server; let baseUrl = ''; let sequence = 0;
async function clean() { const tables = await prisma.$queryRaw<Array<{ tablename: string }>>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations', '_e2e_runner')`; await prisma.$executeRawUnsafe('TRUNCATE TABLE ' + tables.map(({ tablename }) => '"' + tablename + '"').join(', ') + ' RESTART IDENTITY CASCADE'); }
function auth(user: { id: string; role: 'donor' | 'beneficiary' }) { return signToken({ sub: user.id, role: user.role, sv: 0 }); }
function get(path: string, token?: string) { return fetch(baseUrl + path, { headers: token ? { authorization: 'Bearer ' + token } : {} }); }

async function fixture() {
  const suffix = ++sequence;
  const owner = await prisma.user.create({ data: { name: 'Entity owner', email: 'owner-' + suffix + '@example.test', role: 'entity', status: 'active' } });
  const entity = await prisma.entity.create({ data: { userId: owner.id, name: 'Entity', cnpj: String(suffix).padStart(14, '0'), responsibleName: 'Entity owner', email: owner.email, status: 'active' } });
  const donor = await prisma.user.create({ data: { name: 'Donor secret name', email: 'donor-' + suffix + '@example.test', phone: '+5511999999999', role: 'donor', status: 'active' } });
  const stranger = await prisma.user.create({ data: { name: 'Other donor', email: 'other-' + suffix + '@example.test', role: 'donor', status: 'active' } });
  const responsible = await prisma.user.create({ data: { name: 'Responsible civil name', email: 'responsible-' + suffix + '@example.test', role: 'beneficiary', status: 'active' } });
  const outsider = await prisma.user.create({ data: { name: 'Unrelated responsible', email: 'outsider-' + suffix + '@example.test', role: 'beneficiary', status: 'active' } });
  const family = await prisma.family.create({ data: { entityId: entity.id, responsibleName: 'Responsible civil name', displayName: 'Family', city: 'São Paulo', state: 'SP', approximateAddress: 'Rua secreta 123', approvalStatus: 'approved' } });
  const assignment = await prisma.familyResponsibleAssignment.create({ data: { familyId: family.id, responsibleUserId: responsible.id, invitedByUserId: owner.id } });
  const key = await prisma.directPixEvpKeyVersion.create({ data: { id: randomUUID(), familyId: family.id, assignmentId: assignment.id, submittedByUserId: responsible.id, version: 1, status: 'ACTIVE', encryptionKid: 'history-test', nonce: 'nonce', ciphertext: 'ciphertext', tag: 'tag', fingerprintKid: 'history-test', fingerprint: 'fingerprint' } });
  const base = Date.parse('2026-01-01T12:00:00.000Z');
  async function intent(status: 'OPEN' | 'DONOR_DECLARED' | 'CANCELED_BY_DONOR' | 'FAMILY_CONFIRMED' | 'FOLLOW_UP_REQUIRED', offset: number) {
    const createdAt = new Date(base + offset * 1000);
    const declaredAt = status === 'OPEN' ? null : new Date(createdAt.getTime() + 100);
    const row = await prisma.directPixIntent.create({ data: { donorId: donor.id, familyId: family.id, responsibleAssignmentId: assignment.id, pixKeyVersionId: key.id, amountCents: 5000 + offset, txid: randomUUID().replaceAll('-', '').slice(0, 25), status, cycleStartAt: createdAt, cycleEndAt: new Date(createdAt.getTime() + 86400000), declarationDeadlineAt: new Date(createdAt.getTime() + 86400000), createdAt, declaredAt, confirmationDeadlineAt: declaredAt ? new Date(declaredAt.getTime() + 86400000) : null } });
    if (declaredAt) { const declaration = await prisma.directPixDeclaration.create({ data: { intentId: row.id, declaredByUserId: donor.id, declaredAt } }); if (status === 'CANCELED_BY_DONOR') await prisma.directPixDeclarationCancellation.create({ data: { declarationId: declaration.id, canceledByUserId: donor.id, reason: 'TRANSFER_NOT_SENT', canceledAt: new Date(createdAt.getTime() + 200) } }); }
    if (status === 'FAMILY_CONFIRMED' || status === 'FOLLOW_UP_REQUIRED') await prisma.directPixReceiptConfirmation.create({ data: { intentId: row.id, responsibleAssignmentId: assignment.id, outcome: status === 'FAMILY_CONFIRMED' ? 'RECEIVED_EXACT' : 'NOT_LOCATED', declaredByResponsibleUserId: responsible.id, respondedAt: new Date(createdAt.getTime() + 300) } });
    return row;
  }
  await intent('OPEN', 1); await intent('DONOR_DECLARED', 2); await intent('CANCELED_BY_DONOR', 3); await intent('FAMILY_CONFIRMED', 4); await intent('FOLLOW_UP_REQUIRED', 5);
  await prisma.donation.create({ data: { donorId: donor.id, familyId: family.id, amount: 3000, provider: 'ifood', status: 'completed', createdAt: new Date(base + 6000) } });
  return { donor, stranger, responsible, outsider, family };
}

before(async () => assert.deepEqual(await prisma.$queryRaw<Array<{ run_id: string; database: string }>>`SELECT run_id,current_database() AS database FROM "_e2e_runner"`, [{ run_id: runId, database: 'mealfy_e2e' }]));
beforeEach(async () => { await clean(); await new Promise<void>((resolve) => { server = createApp().listen(0, '127.0.0.1', resolve); }); baseUrl = 'http://127.0.0.1:' + (server.address() as AddressInfo).port; });
afterEach(async () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
after(async () => prisma.$disconnect());

test('private timelines expose only canonical minimized role views with exact legacy label', async () => {
  const x = await fixture();
  const donorResponse = await get('/direct-pix/timeline?limit=20', auth(x.donor));
  assert.equal(donorResponse.status, 200);
  const donor = await donorResponse.json() as { items: Array<Record<string, unknown>>; nextCursor: string | null };
  assert.equal(donor.items.length, 6); assert.equal(donor.nextCursor, null);
  assert.deepEqual(new Set(donor.items.map((item) => item.status)), new Set(['INTENCAO_CRIADA', 'AGUARDANDO_RESPOSTA_FAMILIA', 'DECLARACAO_CANCELADA', 'RECEBIMENTO_CONFIRMADO_PELA_FAMILIA', 'EM_ACOMPANHAMENTO', 'MODELO_ANTERIOR']));
  assert.equal(donor.items.find((item) => item.kind === 'VALE_PRESENTE_LEGADO')?.label, 'Vale-presente — modelo anterior');
  assert.match(JSON.stringify(donor), /Declaração de envio — aguardando resposta da família/);
  assert.doesNotMatch(JSON.stringify(donor), /paid|verified|ciphertext|nonce|fingerprint|txid|Donor secret name|@example|551199|Rua secreta|Responsible civil/i);
  assert.ok(donor.items.every((item) => !('donorAlias' in item)));

  const responsibleResponse = await get('/direct-pix/responsible/timeline?limit=20', auth(x.responsible));
  assert.equal(responsibleResponse.status, 200);
  const responsible = await responsibleResponse.json() as { items: Array<Record<string, unknown>> };
  assert.equal(responsible.items.length, 6);
  assert.ok(responsible.items.every((item) => item.donorAlias === 'Doador' && !('familyId' in item)));
  assert.doesNotMatch(JSON.stringify(responsible), /Donor secret name|@example|551199|ciphertext|nonce|fingerprint|txid|reason/i);

  assert.equal((await get('/direct-pix/timeline', auth(x.stranger))).status, 200);
  assert.equal((await (await get('/direct-pix/timeline', auth(x.stranger))).json() as { items: unknown[] }).items.length, 0);
  assert.equal((await (await get('/direct-pix/responsible/timeline', auth(x.outsider))).json() as { items: unknown[] }).items.length, 0);
});

test('timeline cursor is bounded and public route uses the safe projection service', async () => {
  const x = await fixture();
  const first = await get('/direct-pix/timeline?limit=2', auth(x.donor));
  assert.equal(first.status, 200); const one = await first.json() as { items: Array<{ id: string }>; nextCursor: string | null };
  assert.equal(one.items.length, 2); assert.ok(one.nextCursor);
  const second = await get('/direct-pix/timeline?limit=2&cursor=' + encodeURIComponent(one.nextCursor!), auth(x.donor));
  assert.equal(second.status, 200); const two = await second.json() as { items: Array<{ id: string }> };
  assert.equal(two.items.length, 2); assert.deepEqual(new Set([...one.items, ...two.items].map(({ id }) => id)).size, 4);
  assert.equal((await get('/direct-pix/timeline?limit=51', auth(x.donor))).status, 422);
  assert.equal((await get('/direct-pix/timeline?cursor=not-a-cursor', auth(x.donor))).status, 422);
  const projection = await get('/direct-pix/families/' + x.family.id + '/public-projection');
  assert.deepEqual(await projection.json(), { id: x.family.id, availability: 'UNAVAILABLE' });
  const missing = randomUUID();
  assert.deepEqual(await (await get('/direct-pix/families/' + missing + '/public-projection')).json(), { id: missing, availability: 'UNAVAILABLE' });
});
