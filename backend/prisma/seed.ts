import { PrismaClient, UserRole, AccountStatus, FamilyStatus, SupportStatus, EntityType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding PostgreSQL database...');

  // 1. Clean existing records (in order of dependencies)
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.highlight.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.donation.deleteMany();
  await prisma.donationBatch.deleteMany();
  await prisma.familyValidation.deleteMany();
  await prisma.familyIndication.deleteMany();
  await prisma.user.deleteMany();
  await prisma.donorProfile.deleteMany();
  await prisma.family.deleteMany();
  await prisma.organization.deleteMany();

  // 2. Create organizations
  const org1 = await prisma.organization.create({
    data: {
      id: 'entity-1',
      name: 'Instituto Esperança',
      cnpj: '12345678000199',
      type: EntityType.ONG,
      responsibleName: 'Entidade Aprovada',
      email: 'entidade@mealfy.com',
      phone: '11999999999',
      region: 'Recife · PE',
      status: AccountStatus.APPROVED,
    },
  });

  const orgPending = await prisma.organization.create({
    data: {
      id: 'entity-pending-1',
      name: 'Associação Heliópolis Viva',
      cnpj: '98765432000188',
      type: EntityType.INSTITUTO,
      responsibleName: 'Entidade Pendente',
      email: 'entidadependente@mealfy.com',
      phone: '11988888888',
      region: 'Heliópolis',
      status: AccountStatus.PENDING,
    },
  });

  // 3. Create Families
  const fam1 = await prisma.family.create({
    data: {
      id: 'family-1',
      representativeName: 'Ana Costa',
      familyName: 'Ana Costa',
      region: 'Recife · PE',
      neighborhood: 'Boa Viagem',
      childrenCount: 2,
      status: FamilyStatus.APPROVED,
      supportStatus: SupportStatus.NEEDS_HELP,
      sourceType: 'entity',
      sourceLabel: 'Instituto Esperança',
      latitude: -8.05,
      longitude: -34.88,
      createdByEntityId: org1.id,
      childrenNamesJson: JSON.stringify(['Pedro Costa', 'Mariana Costa']),
    },
  });

  await prisma.family.create({
    data: {
      id: 'f-helio-1',
      representativeName: 'Família Silva (Helio)',
      familyName: 'Silva',
      region: 'Heliópolis',
      neighborhood: 'Heliópolis',
      childrenCount: 2,
      status: FamilyStatus.APPROVED,
      supportStatus: SupportStatus.NEEDS_HELP,
      sourceType: 'entity',
      sourceLabel: 'Cadastrado por Admin',
      latitude: -23.612,
      longitude: -46.593,
    },
  });

  await prisma.family.create({
    data: {
      id: 'f-helio-2',
      representativeName: 'Família Souza (Helio Fed)',
      familyName: 'Souza',
      region: 'Heliópolis',
      neighborhood: 'Heliópolis',
      childrenCount: 1,
      status: FamilyStatus.APPROVED,
      supportStatus: SupportStatus.FED,
      sourceType: 'entity',
      sourceLabel: 'Cadastrado por Admin',
      latitude: -23.613,
      longitude: -46.594,
      lastFedAt: new Date(),
    },
  });

  await prisma.family.create({
    data: {
      id: 'f-helio-3',
      representativeName: 'Família Lima (Helio Pend)',
      familyName: 'Lima',
      region: 'Heliópolis',
      neighborhood: 'Heliópolis',
      childrenCount: 3,
      status: FamilyStatus.PENDING,
      supportStatus: SupportStatus.NEEDS_HELP,
      sourceType: 'donor_indication',
      sourceLabel: 'Indicado',
      latitude: -23.614,
      longitude: -46.595,
    },
  });

  // 4. Create Users
  // Admin
  await prisma.user.create({
    data: {
      id: 'admin-1',
      name: 'Admin Mealfy',
      email: 'admin@mealfy.com',
      role: UserRole.ADMIN,
      status: AccountStatus.ACTIVE,
      firebaseUid: 'admin-uid-mock',
    },
  });

  // Donor
  await prisma.user.create({
    data: {
      id: 'donor-1',
      name: 'Doador Demo',
      email: 'doador@mealfy.com',
      role: UserRole.DONOR,
      status: AccountStatus.ACTIVE,
      firebaseUid: 'donor-uid-mock',
      phone: '11977777777',
      donorProfile: {
        create: {
          totalDonated: 150.00,
          showOnRanking: true,
          showInstagram: true,
          anonymousMode: false,
          instagram: '@doadordemo',
          facebook: 'mealfy.doadores',
        },
      },
    },
  });

  // Approved Entity User
  await prisma.user.create({
    data: {
      id: 'entity-user-1',
      name: 'Entidade Aprovada',
      email: 'entidade@mealfy.com',
      role: UserRole.ENTITY,
      status: AccountStatus.ACTIVE,
      organizationId: org1.id,
      firebaseUid: 'entity-uid-mock',
    },
  });

  // Pending Entity User
  await prisma.user.create({
    data: {
      id: 'entity-user-pending',
      name: 'Entidade Pendente',
      email: 'entidadependente@mealfy.com',
      role: UserRole.ENTITY,
      status: AccountStatus.PENDING,
      organizationId: orgPending.id,
      firebaseUid: 'entity-pending-uid-mock',
    },
  });

  // Beneficiary User
  await prisma.user.create({
    data: {
      id: 'beneficiary-1',
      name: 'Beneficiário Teste',
      email: 'beneficiario@mealfy.com',
      role: UserRole.BENEFICIARY,
      status: AccountStatus.ACTIVE,
      beneficiaryId: fam1.id,
      documentType: 'cpf',
      documentNumber: '11122233344',
      firebaseUid: 'beneficiary-uid-mock',
    },
  });

  console.log('✅ Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
