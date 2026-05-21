import { MockDatabase } from './mock-db';

const seed = async () => {
  console.log('🌱 Seeding database...');

  const users = [
    {
      id: 'admin-1',
      name: 'Admin Mealfy',
      email: 'admin@mealfy.com',
      role: 'admin',
      status: 'active',
      totalDonated: 0
    },
    {
      id: 'donor-1',
      name: 'Doador Demo',
      email: 'doador@mealfy.com',
      role: 'donor',
      status: 'active',
      totalDonated: 150,
      facebook: 'mealfy.doadores',
      instagram: '@doadordemo',
      privacySettings: {
        showOnRanking: true,
        showInstagram: true,
        anonymousMode: false
      }
    },
    {
      id: 'entity-user-1',
      name: 'Entidade Aprovada',
      email: 'entidade@mealfy.com',
      role: 'entity',
      status: 'approved',
      entityId: 'entity-1'
    },
    {
      id: 'entity-user-pending',
      name: 'Entidade Pendente',
      email: 'entidadependente@mealfy.com',
      role: 'entity',
      status: 'pending',
      entityId: 'entity-pending-1'
    },
    {
      id: 'beneficiary-1',
      name: 'Beneficiário Teste',
      email: 'beneficiario@mealfy.com',
      role: 'beneficiary',
      status: 'active',
      beneficiaryId: 'family-1'
    }
  ];

  const families = [
    // Heliópolis
    { id: 'f-helio-1', representativeName: 'Família Silva (Helio)', region: 'Heliópolis', childrenCount: 2, status: 'approved', supportStatus: 'needs_help', sourceType: 'entity', sourceLabel: 'Cadastrado por Admin', latitude: -23.612, longitude: -46.593 },
    { id: 'f-helio-2', representativeName: 'Família Souza (Helio Fed)', region: 'Heliópolis', childrenCount: 1, status: 'approved', supportStatus: 'fed', sourceType: 'entity', sourceLabel: 'Cadastrado por Admin', latitude: -23.613, longitude: -46.594 },
    { id: 'f-helio-3', representativeName: 'Família Lima (Helio Pend)', region: 'Heliópolis', childrenCount: 3, status: 'pending', supportStatus: 'needs_help', sourceType: 'donor_indication', sourceLabel: 'Indicado', latitude: -23.614, longitude: -46.595 },
    
    // Paraisópolis
    { id: 'f-paraiso-1', representativeName: 'Família Oliveira (Para)', region: 'Paraisópolis', childrenCount: 4, status: 'approved', supportStatus: 'needs_help', sourceType: 'entity', sourceLabel: 'Cadastrado por Admin', latitude: -23.615, longitude: -46.728 },
    { id: 'f-paraiso-2', representativeName: 'Família Pereira (Para Fed)', region: 'Paraisópolis', childrenCount: 2, status: 'approved', supportStatus: 'fed', sourceType: 'entity', sourceLabel: 'Cadastrado por Admin', latitude: -23.616, longitude: -46.729 },
    { id: 'f-paraiso-3', representativeName: 'Família Costa (Para Pend)', region: 'Paraisópolis', childrenCount: 1, status: 'pending', supportStatus: 'needs_help', sourceType: 'donor_indication', sourceLabel: 'Indicado', latitude: -23.617, longitude: -46.730 },
    
    // Brasilândia
    { id: 'f-brasi-1', representativeName: 'Família Santos (Brasi)', region: 'Brasilândia', childrenCount: 3, status: 'approved', supportStatus: 'needs_help', sourceType: 'entity', sourceLabel: 'Cadastrado por Admin', latitude: -23.456, longitude: -46.689 },
    { id: 'f-brasi-2', representativeName: 'Família Ferreira (Brasi Fed)', region: 'Brasilândia', childrenCount: 1, status: 'approved', supportStatus: 'fed', sourceType: 'entity', sourceLabel: 'Cadastrado por Admin', latitude: -23.457, longitude: -46.690 },
    { id: 'f-brasi-3', representativeName: 'Família Alves (Brasi Pend)', region: 'Brasilândia', childrenCount: 2, status: 'pending', supportStatus: 'needs_help', sourceType: 'donor_indication', sourceLabel: 'Indicado', latitude: -23.458, longitude: -46.691 }
  ];

  await MockDatabase.write('users', users);
  await MockDatabase.write('families', families);
  await MockDatabase.write('indications', []);
  await MockDatabase.write('donations', []);
  await MockDatabase.write('giftcards', []);
  await MockDatabase.write('entities', []);
  await MockDatabase.write('featured-donors', { donorIds: [] });
  await MockDatabase.write('audit-logs', []);

  console.log('✅ Seed completed!');
};

seed();
