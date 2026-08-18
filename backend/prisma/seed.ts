/**
 * Seed de DEV/STAGING do Mealfy — NUNCA rodar em produção.
 *
 * Idempotente: usa upsert por chaves únicas / ids fixos, então pode ser
 * reexecutado sem duplicar dados.
 *
 * ⚠️ Gift cards aqui são fictícios (apenas teste). O `codeEncrypted` usa um
 * encoding PLACEHOLDER (base64) — a criptografia real (AES-256-GCM com
 * ENCRYPTION_KEY) entra na Fase 3. O `codeHash` (sha256) já é real e garante
 * anti-duplicidade na importação.
 */
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  PrismaClient,
  GiftCardProvider,
  type Prisma,
} from '@prisma/client';
import { encryptGiftCardCode } from '../src/shared/crypto/crypto.service';

const prisma = new PrismaClient();

// Senha única de DEV para todas as contas seedadas (nunca usar em produção).
const DEV_PASSWORD = '123456';

const maskCode = (code: string): string => `****-${code.slice(-4)}`;
const hashCode = (code: string): string => crypto.createHash('sha256').update(code).digest('hex');

async function seedUsers() {
  const passwordHash = await bcrypt.hash(DEV_PASSWORD, 10);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@mealfy.com' },
    update: { passwordHash },
    create: { name: 'Admin Mealfy', email: 'admin@mealfy.com', role: 'admin', status: 'active', passwordHash },
  });

  const entityUser = await prisma.user.upsert({
    where: { email: 'entidade@mealfy.com' },
    update: { passwordHash },
    create: { name: 'ONG Exemplo', email: 'entidade@mealfy.com', role: 'entity', status: 'active', passwordHash },
  });

  const entity = await prisma.entity.upsert({
    where: { userId: entityUser.id },
    update: {},
    create: {
      userId: entityUser.id,
      name: 'ONG Exemplo',
      cnpj: '12345678000199',
      responsibleName: 'Maria Responsável',
      email: 'entidade@mealfy.com',
      phone: '11999990000',
      status: 'active', // entidade aprovada/operacional
    },
  });

  const donorUser = await prisma.user.upsert({
    where: { email: 'doador@mealfy.com' },
    update: { passwordHash },
    create: {
      name: 'Alexandre Doador',
      email: 'doador@mealfy.com',
      role: 'donor',
      status: 'active',
      instagram: '@alexandre.doador',
      passwordHash,
    },
  });

  await prisma.donorProfile.upsert({
    where: { userId: donorUser.id },
    update: {},
    create: { userId: donorUser.id, publicSlug: 'alexandre-doador' },
  });

  const beneficiaryUser = await prisma.user.upsert({
    where: { email: 'beneficiario@mealfy.com' },
    update: { passwordHash },
    create: {
      name: 'Família Silva (beneficiário)',
      email: 'beneficiario@mealfy.com',
      role: 'beneficiary',
      status: 'active',
      passwordHash,
    },
  });

  return { admin, entity, donorUser, beneficiaryUser };
}

async function upsertFamily(
  id: string,
  data: Omit<Prisma.FamilyCreateInput, 'id'>,
  dependents: { id: string; name: string; age: number; relationship?: string }[],
) {
  await prisma.family.upsert({
    where: { id },
    // Reconecta a entidade em famílias que já existem.
    //
    // `update: {}` deixava o seed sem efeito sobre linhas antigas: se a entidade
    // for recriada (o usuário dela é apagado e o cascade leva a entidade junto),
    // `Family.entityId` vira NULL e nunca mais era religado — a conta de entidade
    // passava a enxergar zero famílias. Só o vínculo é atualizado de propósito:
    // status de aprovação, `lastFedAt` e afins são estado operacional e não devem
    // ser sobrescritos por reexecução do seed.
    update: { entity: data.entity },
    create: { id, ...data },
  });

  for (const dep of dependents) {
    await prisma.familyDependent.upsert({
      where: { id: dep.id },
      update: {},
      create: {
        id: dep.id,
        familyId: id,
        name: dep.name,
        age: dep.age,
        relationship: dep.relationship ?? 'filho(a)',
        isEligibleMinor: dep.age >= 0 && dep.age <= 17,
      },
    });
  }
}

async function seedFamilies(entityId: string) {
  // Aprovada (SP) com dependente 0–17 → elegível para doação
  await upsertFamily(
    'seed-fam-approved-sp',
    {
      responsibleName: 'João da Silva',
      displayName: 'Família Silva',
      entity: { connect: { id: entityId } },
      nisMasked: '***.***.**1-23',
      cpfMasked: '123.***.***-09',
      city: 'São Paulo',
      state: 'SP',
      neighborhood: 'Heliópolis',
      community: 'Heliópolis',
      approximateAddress: 'Próximo à praça central de Heliópolis',
      latitude: -23.6181,
      longitude: -46.5972,
      preferredGiftCardProvider: 'ifood',
      todayRequestedProvider: 'ifood',
      supportStatus: 'needs_help',
      verificationStatus: 'manual',
      approvalStatus: 'approved',
      dataSource: 'manual',
      socialDescription: 'Família com duas crianças em idade escolar.',
    },
    [
      { id: 'seed-dep-sp-1', name: 'Pedro', age: 8 },
      { id: 'seed-dep-sp-2', name: 'Ana', age: 14 },
    ],
  );

  // Aprovada (RJ) com dependente 0–17
  await upsertFamily(
    'seed-fam-approved-rj',
    {
      responsibleName: 'Marta Souza',
      displayName: 'Família Souza',
      entity: { connect: { id: entityId } },
      city: 'Rio de Janeiro',
      state: 'RJ',
      neighborhood: 'Maré',
      community: 'Maré',
      latitude: -22.8585,
      longitude: -43.2398,
      preferredGiftCardProvider: 'carrefour',
      todayRequestedProvider: 'ninetynine',
      supportStatus: 'needs_help',
      verificationStatus: 'manual',
      approvalStatus: 'approved',
      dataSource: 'manual',
    },
    [{ id: 'seed-dep-rj-1', name: 'Lucas', age: 5 }],
  );

  // Pendente de aprovação
  await upsertFamily(
    'seed-fam-pending-sp',
    {
      responsibleName: 'Carlos Pereira',
      displayName: 'Família Pereira',
      entity: { connect: { id: entityId } },
      city: 'São Paulo',
      state: 'SP',
      neighborhood: 'Paraisópolis',
      community: 'Paraisópolis',
      latitude: -23.6204,
      longitude: -46.7197,
      preferredGiftCardProvider: 'ninetynine',
      supportStatus: 'needs_help',
      verificationStatus: 'unverified',
      approvalStatus: 'pending',
      dataSource: 'manual',
    },
    [{ id: 'seed-dep-pending-1', name: 'Sofia', age: 10 }],
  );

  // Bloqueada/rejeitada (ex.: sem dependente elegível) — NÃO deve aparecer p/ doação
  await upsertFamily(
    'seed-fam-blocked-sp',
    {
      responsibleName: 'Rita Gomes',
      displayName: 'Família Gomes',
      entity: { connect: { id: entityId } },
      city: 'São Paulo',
      state: 'SP',
      neighborhood: 'Cidade Tiradentes',
      community: 'Cidade Tiradentes',
      latitude: -23.6,
      longitude: -46.4,
      supportStatus: 'needs_help',
      verificationStatus: 'unverified',
      approvalStatus: 'blocked',
      dataSource: 'manual',
    },
    [{ id: 'seed-dep-blocked-1', name: 'José', age: 25, relationship: 'irmão' }],
  );
}

async function seedGiftCards(adminUserId: string) {
  const providers: GiftCardProvider[] = ['ifood', 'ninetynine', 'carrefour'];
  const AMOUNT = 2500; // R$ 25,00 em centavos
  const CODES_PER_PROVIDER = 5;

  for (const provider of providers) {
    const batchId = `seed-batch-${provider}`;
    await prisma.giftCardBatch.upsert({
      where: { id: batchId },
      update: {},
      create: {
        id: batchId,
        provider,
        batchName: `Lote de teste ${provider}`,
        importedByUserId: adminUserId,
        totalCodes: CODES_PER_PROVIDER,
        amount: AMOUNT,
      },
    });

    for (let i = 1; i <= CODES_PER_PROVIDER; i++) {
      const code = `${provider.toUpperCase()}-TEST-${String(i).padStart(4, '0')}`;
      await prisma.giftCard.upsert({
        where: { codeHash: hashCode(code) },
        update: {},
        create: {
          provider,
          codeEncrypted: encryptGiftCardCode(code),
          codeMasked: maskCode(code),
          codeHash: hashCode(code),
          amount: AMOUNT,
          status: 'available',
          batchId,
        },
      });
    }
  }
}

async function main() {
  console.log('[seed] iniciando…');
  const { admin, entity, beneficiaryUser } = await seedUsers();
  await seedFamilies(entity.id);
  await seedGiftCards(admin.id);

  // Vincula o beneficiário de teste à família aprovada (SP) — permite testar
  // GET /beneficiary/gift-cards de ponta a ponta após uma doação nessa família.
  await prisma.family.update({
    where: { id: 'seed-fam-approved-sp' },
    data: { beneficiaryUserId: beneficiaryUser.id },
  });

  const counts = {
    users: await prisma.user.count(),
    entities: await prisma.entity.count(),
    families: await prisma.family.count(),
    dependents: await prisma.familyDependent.count(),
    giftCards: await prisma.giftCard.count(),
  };
  console.log('[seed] concluído:', counts);
}

main()
  .catch((e) => {
    console.error('[seed] erro:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
