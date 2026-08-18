import type { User, AuthorizingEntity, PublicDonorProfile } from '../types';

// ──────────────────────────────────────────────────────────────────────────────
// Senha centralizada — exclusivamente para o ambiente de demonstração (mock).
// Nunca expor em componentes de UI nem em mealfy_current_user.
// ──────────────────────────────────────────────────────────────────────────────
export const MOCK_PASSWORD = '123456';

// Identidades públicas dos usuários de demonstração.
// O tipo User não contém senha.
export const mockUsers: User[] = [
  {
    id: 'u-12345',
    name: 'Alexandre Doador',
    email: 'doador@mealfy.com',
    role: 'donor',
    phone: '+5511999998888',
    avatar: 'A',
    instagram: '@alexandre.doador',
    personalMessage: 'Acredito que pequenos apoios constantes mudam a vida de uma família inteira.',
    totalDonated: 130,
    rankingPosition: 142,
    rankingPercentile: 'Top 5%',
    favoriteCommunityId: 'c1',
    savedFamilyIds: ['f1', 'f5'],
    status: 'active',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'u-entity-1',
    name: 'Maria Silva',
    email: 'entidade@mealfy.com',
    role: 'entity',
    phone: '+5511988887777',
    avatar: 'M',
    totalDonated: 0,
    rankingPosition: 0,
    rankingPercentile: '',
    entityId: 'e-esperanca',
    status: 'active',
  },
  {
    id: 'u-beneficiary-1',
    name: 'João Beneficiário',
    email: 'beneficiario@mealfy.com',
    role: 'beneficiary',
    phone: '+5511977776666',
    avatar: 'J',
    totalDonated: 0,
    rankingPosition: 0,
    rankingPercentile: '',
    status: 'active',
  },
  {
    id: 'u-admin-1',
    name: 'Admin Mealfy',
    email: 'admin@mealfy.com',
    role: 'admin',
    phone: '+5511900000000',
    avatar: 'A',
    totalDonated: 0,
    rankingPosition: 0,
    rankingPercentile: '',
    status: 'active',
  },
];

// Credenciais separadas das identidades.
// Usadas apenas pelo MockAuthProvider — nunca por componentes ou contexto.
export interface MockUserCredential {
  userId: string;
  email: string;
  password: string;
}

export const mockCredentials: MockUserCredential[] = [
  { userId: 'u-12345',        email: 'doador@mealfy.com',       password: MOCK_PASSWORD },
  { userId: 'u-entity-1',     email: 'entidade@mealfy.com',     password: MOCK_PASSWORD },
  { userId: 'u-beneficiary-1',email: 'beneficiario@mealfy.com', password: MOCK_PASSWORD },
  { userId: 'u-admin-1',      email: 'admin@mealfy.com',        password: MOCK_PASSWORD },
];

// ──────────────────────────────────────────────────────────────────────────────
// Diretório público de doadores — fonte única usada pelo carrossel da Home,
// pelo rankingService e pela página de perfil de terceiros (/profile/:id).
// ──────────────────────────────────────────────────────────────────────────────
export const mockDonors: PublicDonorProfile[] = [
  {
    id: 'd-1', name: 'Marina R.', avatar: 'https://i.pravatar.cc/150?img=47',
    totalDonated: 12500, rankingPosition: 1, instagram: '@marina.rm',
    personalMessage: 'Cada prato servido é uma vitória contra a fome infantil.',
    supportsCount: 50, focusRegion: 'Heliópolis',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-2', name: 'Carlos S.', avatar: 'https://i.pravatar.cc/150?img=12',
    totalDonated: 9400, rankingPosition: 2, instagram: '@csilva',
    supportsCount: 38, focusRegion: 'Paraisópolis',
    privacySettings: { showOnRanking: true, showInstagram: false, anonymousMode: false },
  },
  {
    id: 'd-3', name: 'Doador Solidário', avatar: '',
    totalDonated: 8200, rankingPosition: 3, isAnonymous: true,
    supportsCount: 33, focusRegion: 'Cidade Tiradentes',
    privacySettings: { showOnRanking: true, showInstagram: false, anonymousMode: true },
  },
  {
    id: 'd-4', name: 'João H.', avatar: 'https://i.pravatar.cc/150?img=15',
    totalDonated: 5100, rankingPosition: 4, instagram: '@joao_he',
    personalMessage: 'Acredito que pequenas ações somam grandes mudanças.',
    supportsCount: 20, focusRegion: 'São Paulo - SP',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-5', name: 'Alessandra M.', avatar: 'https://i.pravatar.cc/150?img=45',
    totalDonated: 4050, rankingPosition: 5, instagram: '@ale_mm',
    supportsCount: 16, focusRegion: 'Heliópolis',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-6', name: 'Alexandre A.', avatar: 'https://i.pravatar.cc/150?img=51',
    totalDonated: 1500, rankingPosition: 6, instagram: '@alex_melf',
    supportsCount: 6, focusRegion: 'Heliópolis',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-7', name: 'Bernardo S.', avatar: 'https://i.pravatar.cc/150?img=33',
    totalDonated: 1200, rankingPosition: 7, instagram: '@bernardo_s',
    supportsCount: 5, focusRegion: 'Paraisópolis',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-8', name: 'Clara C.', avatar: 'https://i.pravatar.cc/150?img=44',
    totalDonated: 950, rankingPosition: 8, instagram: '@clara_c',
    personalMessage: 'Apoiar a Mealfy virou parte da minha rotina.',
    supportsCount: 4, focusRegion: 'Cidade Tiradentes',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-9', name: 'Daniel M.', avatar: 'https://i.pravatar.cc/150?img=14',
    totalDonated: 800, rankingPosition: 9, instagram: '@danielm',
    supportsCount: 3, focusRegion: 'São Paulo - SP',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-10', name: 'Eduarda L.', avatar: 'https://i.pravatar.cc/150?img=29',
    totalDonated: 750, rankingPosition: 10, instagram: '@eduarda_l',
    supportsCount: 3, focusRegion: 'Heliópolis',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-11', name: 'Felipe S.', avatar: 'https://i.pravatar.cc/150?img=22',
    totalDonated: 700, rankingPosition: 11, instagram: '@felipe_s',
    supportsCount: 3, focusRegion: 'Paraisópolis',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-12', name: 'Gabriela L.', avatar: 'https://i.pravatar.cc/150?img=25',
    totalDonated: 650, rankingPosition: 12, instagram: '@gabi_lima',
    supportsCount: 2, focusRegion: 'Cidade Tiradentes',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-13', name: 'Apoiador Anônimo', avatar: '',
    totalDonated: 600, rankingPosition: 13, isAnonymous: true,
    supportsCount: 2, focusRegion: 'São Paulo - SP',
    privacySettings: { showOnRanking: true, showInstagram: false, anonymousMode: true },
  },
  {
    id: 'd-14', name: 'Igor G.', avatar: 'https://i.pravatar.cc/150?img=8',
    totalDonated: 550, rankingPosition: 14, instagram: '@igor_g',
    supportsCount: 2, focusRegion: 'Heliópolis',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-15', name: 'Julia M.', avatar: 'https://i.pravatar.cc/150?img=24',
    totalDonated: 500, rankingPosition: 15, instagram: '@ju_martins',
    supportsCount: 2, focusRegion: 'Paraisópolis',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-16', name: 'Kleber C.', avatar: 'https://i.pravatar.cc/150?img=53',
    totalDonated: 450, rankingPosition: 16, instagram: '@kleber_c',
    supportsCount: 1, focusRegion: 'Cidade Tiradentes',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-17', name: 'Luiza R.', avatar: 'https://i.pravatar.cc/150?img=36',
    totalDonated: 400, rankingPosition: 17, instagram: '@luiza_r',
    supportsCount: 1, focusRegion: 'São Paulo - SP',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-18', name: 'Matheus N.', avatar: 'https://i.pravatar.cc/150?img=58',
    totalDonated: 350, rankingPosition: 18, instagram: '@matheus_n',
    supportsCount: 1, focusRegion: 'Heliópolis',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-19', name: 'Natália S.', avatar: 'https://i.pravatar.cc/150?img=49',
    totalDonated: 300, rankingPosition: 19, instagram: '@nat_s',
    supportsCount: 1, focusRegion: 'Paraisópolis',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
  {
    id: 'd-20', name: 'Otávio F.', avatar: 'https://i.pravatar.cc/150?img=60',
    totalDonated: 250, rankingPosition: 20, instagram: '@otavio_f',
    supportsCount: 1, focusRegion: 'Cidade Tiradentes',
    privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
  },
];

// Busca um perfil público de doador pelo id (usado por /profile/:id)
export const getDonorById = (id: string): PublicDonorProfile | undefined =>
  mockDonors.find((d) => d.id === id);

// Entidades de demonstração (não mudam)
export const mockEntities: AuthorizingEntity[] = [
  {
    id: 'e-esperanca',
    name: 'Instituto Esperança',
    cnpj: '00.000.000/0001-00',
    type: 'instituto',
    responsibleName: 'Maria Silva',
    email: 'contato@institutoesperanca.org',
    phone: '+5511988887777',
    region: 'São Paulo - SP',
    status: 'approved',
    createdAt: new Date().toISOString(),
  },
];
