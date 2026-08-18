import type { Family, GiftCardProvider, SupportStatus } from '../types';

// ──────────────────────────────────────────────────────────────────────────────
// FONTE ÚNICA de famílias (semeada em families_db / localStorage).
// Consumida por familyService -> Mapa, Explorar, FamilyDetails, doação, painel.
//
// PRIVACIDADE: o doador vê apenas localização APROXIMADA (comunidade, bairro,
// cidade/UF, zona, endereço aproximado e ponto de referência). NUNCA número da
// casa / complemento / coordenada exata da residência. As coordenadas abaixo são
// centros aproximados das comunidades (praça, UBS, associação), nunca de casas.
// Todos os nomes são FICTÍCIOS.
// ──────────────────────────────────────────────────────────────────────────────

interface Seed {
  id: string;
  communityId: string;
  resp: string;
  community: string;
  neighborhood: string;
  city: string;
  state: string;
  zone: string;
  lat: number;
  lng: number;
  approx: string;
  ref: string;
  desc: string;
  deps: Array<[string, number, string?]>; // [nome, idade, parentesco?]
  need: string;
  provider: GiftCardProvider;
  status?: SupportStatus;       // supportStatus (default needs_help)
  fed?: boolean;                // true => alimentada hoje
  priority?: number;
  distance: string;
  nis: string;
  entity: string;
  dataSource?: 'gov' | 'manual';
  income?: string;
  vuln?: string[];
}

const mk = (s: Seed): Family => ({
  id: s.id,
  communityId: s.communityId,
  representativeName: s.resp,
  neighborhood: s.neighborhood,
  city: s.city,
  state: s.state,
  shortAddress: s.approx, // mantém compat; guardamos apenas o aproximado (sem nº)
  description: s.desc,
  childrenCount: s.deps.length,
  children: s.deps.map((d, i) => ({
    id: `${s.id}-c${i + 1}`,
    name: d[0],
    age: d[1],
    school: 'Escola/Creche da comunidade',
    relationship: d[2] || 'filho(a)',
  })),
  mainNeed: s.need,
  supportStatus: s.fed ? 'fed' : (s.status || 'needs_help'),
  lastFedAt: s.fed ? new Date().toISOString() : undefined,
  distanceToUser: s.distance,
  priorityLevel: s.priority ?? 4,
  latitude: s.lat,
  longitude: s.lng,
  sourceEntityName: s.entity,
  preferredGiftCardProvider: s.provider,
  verificationStatus: (s.dataSource || 'gov') === 'gov' ? 'verified' : 'pending',
  approvalStatus: 'approved',
  dataSource: s.dataSource || 'gov',
  community: s.community,
  zone: s.zone,
  approximateAddress: s.approx,
  referencePoint: s.ref,
  nis: s.nis,
  incomeApprox: s.income,
  vulnerabilities: s.vuln,
});

const seeds: Seed[] = [
  // ─────────────── SÃO PAULO ───────────────
  { id: 'f1', communityId: 'c1', resp: 'Maria Silva', community: 'Heliópolis', neighborhood: 'Sacomã', city: 'São Paulo', state: 'SP', zone: 'Zona Sudeste',
    lat: -23.6151, lng: -46.5912, approx: 'Região da Estrada das Lágrimas', ref: 'Próximo à UBS Heliópolis',
    desc: 'Mãe solo, desempregada temporariamente, com 2 filhos em idade de creche.', deps: [['Lucas', 7], ['Ana', 4]],
    need: 'Alimentação infantil e fraldas', provider: 'ifood', priority: 5, distance: '1.2 km', nis: '12345678901',
    entity: 'Coletivo Heliópolis Solidário', dataSource: 'gov', income: 'Até R$ 600/mês', vuln: ['Mãe solo', 'Desemprego'] },
  { id: 'f2', communityId: 'c1', resp: 'Dona Cida', community: 'Heliópolis', neighborhood: 'Sacomã', city: 'São Paulo', state: 'SP', zone: 'Zona Sudeste',
    lat: -23.6180, lng: -46.5940, approx: 'Região central da comunidade', ref: 'Próximo à associação de moradores',
    desc: 'Aposentada que cuida sozinha de 3 netos após o falecimento da filha.', deps: [['Pedro', 10, 'neto(a)'], ['Carla', 8, 'neto(a)'], ['Júlia', 5, 'neto(a)']],
    need: 'Cesta de alimentos frescos', provider: 'carrefour', priority: 4, distance: '1.4 km', nis: '23456789012',
    entity: 'Coletivo Heliópolis Solidário', dataSource: 'gov', income: 'Aposentadoria mínima', vuln: ['Idosa responsável', 'Insegurança alimentar'] },
  { id: 'f3', communityId: 'c3', resp: 'Roberto e Sônia', community: 'Cidade Tiradentes', neighborhood: 'Cidade Tiradentes', city: 'São Paulo', state: 'SP', zone: 'Zona Leste',
    lat: -23.5855, lng: -46.4011, approx: 'Região do Setor G', ref: 'Próximo ao terminal de ônibus',
    desc: 'Casal com 3 filhos; ambos faziam bicos mas perderam renda nas últimas semanas.', deps: [['Tiago', 12], ['Mateus', 9], ['Lia', 6]],
    need: 'Suplementação alimentar para crianças', provider: '99', priority: 4, distance: '8.1 km', nis: '34567890123',
    entity: 'Associação Tiradentes Viva', dataSource: 'manual', income: 'Renda informal', vuln: ['Trabalho informal'] },
  { id: 'f4', communityId: 'c2', resp: 'Joana Prado', community: 'Paraisópolis', neighborhood: 'Vila Andrade', city: 'São Paulo', state: 'SP', zone: 'Zona Sul',
    lat: -23.6145, lng: -46.7289, approx: 'Região da Rua Ernest Renan', ref: 'Próximo à praça central',
    desc: 'Trabalha em faxinas, mas o salário não cobre alimentação e aluguel.', deps: [['Miguel', 2]],
    need: 'Leite especial e papinhas', provider: 'ifood', fed: true, priority: 2, distance: '3.6 km', nis: '45678901234',
    entity: 'União Paraisópolis', dataSource: 'gov', income: 'Até R$ 900/mês', vuln: ['Mãe solo', 'Trabalho informal'] },
  { id: 'f5', communityId: 'c2', resp: 'Alice Rocha', community: 'Paraisópolis', neighborhood: 'Vila Andrade', city: 'São Paulo', state: 'SP', zone: 'Zona Sul',
    lat: -23.6110, lng: -46.7260, approx: 'Região da Rua Pasquale Gallupi', ref: 'Próximo à escola municipal',
    desc: 'Família em extrema vulnerabilidade com 4 filhos pequenos.', deps: [['Guilherme', 9], ['Bruno', 7], ['Yasmin', 5], ['Alice', 3]],
    need: 'Alimentação infantil diária', provider: 'carrefour', priority: 5, distance: '3.3 km', nis: '56789012345',
    entity: 'União Paraisópolis', dataSource: 'gov', income: 'Até R$ 700/mês', vuln: ['Moradia precária', 'Insegurança alimentar'] },
  { id: 'f6', communityId: 'c4', resp: 'Regina Santos', community: 'Brasilândia', neighborhood: 'Brasilândia', city: 'São Paulo', state: 'SP', zone: 'Zona Norte',
    lat: -23.4688, lng: -46.6997, approx: 'Região da Rua do Morro', ref: 'Próximo à UBS Vila Penteado',
    desc: 'Mãe solo, diarista desempregada, cuidando de 3 crianças.', deps: [['Enzo', 8], ['Valentina', 6], ['Gabriel', 2]],
    need: 'Alimento básico e leite', provider: '99', priority: 5, distance: '12.4 km', nis: '67890123456',
    entity: 'Brasilândia Unida', dataSource: 'gov', income: 'Sem renda fixa', vuln: ['Mãe solo', 'Desemprego'] },
  { id: 'f7', communityId: 'c4', resp: 'Francisca Lima', community: 'Brasilândia', neighborhood: 'Brasilândia', city: 'São Paulo', state: 'SP', zone: 'Zona Norte',
    lat: -23.4710, lng: -46.7020, approx: 'Região da Viela da Paz', ref: 'Próximo à cozinha comunitária',
    desc: 'Família numerosa apoiada ativamente pela cozinha comunitária local.', deps: [['Mariana', 14], ['Samuel', 12], ['Ester', 9], ['Rafaela', 7], ['Daví', 4]],
    need: 'Cesta básica completa', provider: 'ifood', fed: true, priority: 1, distance: '12.8 km', nis: '78901234567',
    entity: 'Brasilândia Unida', dataSource: 'manual', income: 'Renda informal', vuln: ['Família numerosa'] },
  { id: 'f8', communityId: 'c1', resp: 'Cleusa Aparecida', community: 'Capão Redondo', neighborhood: 'Capão Redondo', city: 'São Paulo', state: 'SP', zone: 'Zona Sul',
    lat: -23.6680, lng: -46.7760, approx: 'Região da Estrada de Itapecerica', ref: 'Próximo ao CEU Capão Redondo',
    desc: 'Mãe de dois filhos, trabalha como ajudante de cozinha em meio período.', deps: [['Kauã', 11], ['Sophia', 6]],
    need: 'Cesta básica e material escolar', provider: 'carrefour', priority: 4, distance: '15.2 km', nis: '89012345678',
    entity: 'Rede Sul Solidária', dataSource: 'gov', income: 'Até R$ 1.000/mês', vuln: ['Trabalho informal'] },
  { id: 'f9', communityId: 'c1', resp: 'Marcos Vinícius', community: 'Grajaú', neighborhood: 'Grajaú', city: 'São Paulo', state: 'SP', zone: 'Zona Sul',
    lat: -23.7680, lng: -46.7000, approx: 'Região da Av. Dona Belmira Marin', ref: 'Próximo à estação Grajaú (CPTM)',
    desc: 'Pai viúvo com filho com deficiência; renda comprometida com tratamento.', deps: [['Heitor', 9, 'filho(a)']],
    need: 'Alimentação especial e itens de higiene', provider: 'ifood', priority: 5, distance: '22.0 km', nis: '90123456789',
    entity: 'Instituto Grajaú Vivo', dataSource: 'gov', income: 'BPC', vuln: ['PCD na família', 'Pai solo'] },
  { id: 'f10', communityId: 'c2', resp: 'Benedita Souza', community: 'Jardim Ângela', neighborhood: 'Jardim Ângela', city: 'São Paulo', state: 'SP', zone: 'Zona Sul',
    lat: -23.7030, lng: -46.7620, approx: 'Região da Estrada do M’Boi Mirim', ref: 'Próximo à paróquia local',
    desc: 'Avó responsável por 2 netos; complementa renda com reciclagem.', deps: [['Lorena', 13, 'neto(a)'], ['Vitor', 8, 'neto(a)']],
    need: 'Cesta básica mensal', provider: '99', status: 'supported', priority: 3, distance: '20.5 km', nis: '01234567890',
    entity: 'M’Boi Mirim Solidário', dataSource: 'manual', income: 'Renda da reciclagem', vuln: ['Idosa responsável'] },
  { id: 'f11', communityId: 'c3', resp: 'Tânia Ferreira', community: 'Sapopemba', neighborhood: 'Sapopemba', city: 'São Paulo', state: 'SP', zone: 'Zona Leste',
    lat: -23.6090, lng: -46.5120, approx: 'Região da Av. Sapopemba', ref: 'Próximo ao mercado municipal',
    desc: 'Mãe solo com 3 filhos; trabalha como diarista informal.', deps: [['Isabela', 15], ['Murilo', 10], ['Léo', 5]],
    need: 'Alimentos e itens de higiene', provider: 'carrefour', priority: 4, distance: '11.0 km', nis: '11223344556',
    entity: 'Sapopemba em Rede', dataSource: 'gov', income: 'Até R$ 800/mês', vuln: ['Mãe solo'] },
  { id: 'f12', communityId: 'c3', resp: 'Edna e José', community: 'São Miguel Paulista', neighborhood: 'Jardim Pantanal', city: 'São Paulo', state: 'SP', zone: 'Zona Leste',
    lat: -23.4980, lng: -46.4430, approx: 'Região do Jardim Pantanal', ref: 'Próximo à escola estadual',
    desc: 'Casal afetado por enchentes recorrentes; perderam móveis e mantimentos.', deps: [['Caio', 7], ['Bianca', 3]],
    need: 'Cesta básica e água potável', provider: 'ifood', fed: true, priority: 5, distance: '18.4 km', nis: '22334455667',
    entity: 'SOS São Miguel', dataSource: 'gov', income: 'Renda informal', vuln: ['Moradia precária', 'Área de enchente'] },

  // ─────────────── RIO DE JANEIRO ───────────────
  { id: 'r1', communityId: 'rj1', resp: 'Jurema Conceição', community: 'Rocinha', neighborhood: 'São Conrado', city: 'Rio de Janeiro', state: 'RJ', zone: 'Zona Sul',
    lat: -22.9880, lng: -43.2450, approx: 'Estrada da Gávea, região central da comunidade', ref: 'Próximo à passarela principal',
    desc: 'Mãe solo com 2 filhos; trabalha como manicure autônoma.', deps: [['Rafael', 10], ['Letícia', 6]],
    need: 'Cesta básica e leite', provider: 'ifood', priority: 4, distance: '2.1 km', nis: '33445566778',
    entity: 'Rocinha Mais Forte', dataSource: 'gov', income: 'Até R$ 900/mês', vuln: ['Mãe solo', 'Trabalho informal'] },
  { id: 'r2', communityId: 'rj2', resp: 'Antônia Barros', community: 'Complexo da Maré', neighborhood: 'Maré', city: 'Rio de Janeiro', state: 'RJ', zone: 'Zona Norte',
    lat: -22.8600, lng: -43.2450, approx: 'Região da Nova Holanda', ref: 'Próximo ao Centro de Artes da Maré',
    desc: 'Família com 3 crianças; principal provedor desempregado há 6 meses.', deps: [['Davi', 12], ['Sara', 9], ['Pietro', 4]],
    need: 'Alimentos básicos e higiene', provider: 'carrefour', priority: 5, distance: '3.4 km', nis: '44556677889',
    entity: 'Maré Viva', dataSource: 'gov', income: 'Sem renda fixa', vuln: ['Desemprego', 'Insegurança alimentar'] },
  { id: 'r3', communityId: 'rj3', resp: 'Sebastião Rocha', community: 'Complexo do Alemão', neighborhood: 'Alemão', city: 'Rio de Janeiro', state: 'RJ', zone: 'Zona Norte',
    lat: -22.8660, lng: -43.2760, approx: 'Região da Grota', ref: 'Próximo à estação do teleférico',
    desc: 'Avô criando 2 netos; renda apenas da aposentadoria.', deps: [['Enzo', 8, 'neto(a)'], ['Maria', 5, 'neto(a)']],
    need: 'Cesta básica mensal', provider: '99', fed: true, priority: 3, distance: '4.0 km', nis: '55667788990',
    entity: 'Alemão Solidário', dataSource: 'gov', income: 'Aposentadoria mínima', vuln: ['Idoso responsável'] },
  { id: 'r4', communityId: 'rj4', resp: 'Cláudia Nunes', community: 'Rio das Pedras', neighborhood: 'Jacarepaguá', city: 'Rio de Janeiro', state: 'RJ', zone: 'Zona Oeste',
    lat: -22.9850, lng: -43.3550, approx: 'Região da Rua Tirol', ref: 'Próximo ao posto de saúde',
    desc: 'Mãe solo de 2 filhas; trabalha em telemarketing temporário.', deps: [['Helena', 11], ['Lara', 7]],
    need: 'Alimentos e material escolar', provider: 'ifood', priority: 4, distance: '5.2 km', nis: '66778899001',
    entity: 'Rio das Pedras Unida', dataSource: 'manual', income: 'Até R$ 1.100/mês', vuln: ['Mãe solo'] },
  { id: 'r5', communityId: 'rj5', resp: 'Marlene Tavares', community: 'Cidade de Deus', neighborhood: 'Jacarepaguá', city: 'Rio de Janeiro', state: 'RJ', zone: 'Zona Oeste',
    lat: -22.9480, lng: -43.3620, approx: 'Região da Praça da Cidade de Deus', ref: 'Próximo à praça principal',
    desc: 'Família numerosa; mãe é a única provedora, faz faxina.', deps: [['Gabriel', 14], ['Nicole', 10], ['Théo', 6], ['Ravi', 2]],
    need: 'Cesta básica completa', provider: 'carrefour', priority: 5, distance: '6.0 km', nis: '77889900112',
    entity: 'CDD Solidária', dataSource: 'gov', income: 'Até R$ 1.000/mês', vuln: ['Família numerosa', 'Mãe solo'] },
  { id: 'r6', communityId: 'rj6', resp: 'Joaquim Pereira', community: 'Jacarezinho', neighborhood: 'Jacarezinho', city: 'Rio de Janeiro', state: 'RJ', zone: 'Zona Norte',
    lat: -22.8810, lng: -43.2620, approx: 'Região da Av. Dom Hélder Câmara', ref: 'Próximo à estação Triagem',
    desc: 'Casal com filho adolescente; renda reduzida após acidente de trabalho.', deps: [['Wesley', 16]],
    need: 'Cesta básica e remédios', provider: '99', priority: 4, distance: '4.8 km', nis: '88990011223',
    entity: 'Jacaré em Ação', dataSource: 'gov', income: 'Auxílio-doença', vuln: ['PCD na família'] },
  { id: 'r7', communityId: 'rj7', resp: 'Vanessa Lopes', community: 'Vila Vintém', neighborhood: 'Padre Miguel', city: 'Rio de Janeiro', state: 'RJ', zone: 'Zona Oeste',
    lat: -22.8780, lng: -43.3780, approx: 'Região da Estrada do Maranga', ref: 'Próximo à quadra da escola de samba',
    desc: 'Mãe solo com 2 filhos pequenos; vende doces na rua.', deps: [['Arthur', 5], ['Cecília', 3]],
    need: 'Leite, fraldas e alimentos', provider: 'ifood', priority: 5, distance: '7.5 km', nis: '99001122334',
    entity: 'Vintém Solidário', dataSource: 'manual', income: 'Renda informal', vuln: ['Mãe solo', 'Trabalho informal'] },
  { id: 'r8', communityId: 'rj8', resp: 'Raimunda Alves', community: 'Acari', neighborhood: 'Acari', city: 'Rio de Janeiro', state: 'RJ', zone: 'Zona Norte',
    lat: -22.8230, lng: -43.3390, approx: 'Região da Rua Coqueiros', ref: 'Próximo ao mercado popular',
    desc: 'Avó cuidando de 3 netos; complementa renda lavando roupa.', deps: [['Isaac', 12, 'neto(a)'], ['Lavínia', 8, 'neto(a)'], ['Bento', 4, 'neto(a)']],
    need: 'Cesta básica e higiene', provider: 'carrefour', status: 'supported', priority: 3, distance: '9.1 km', nis: '10111213141',
    entity: 'Acari Presente', dataSource: 'gov', income: 'Renda informal', vuln: ['Idosa responsável'] },
  { id: 'r9', communityId: 'rj9', resp: 'Patrícia Gomes', community: 'Borel', neighborhood: 'Tijuca', city: 'Rio de Janeiro', state: 'RJ', zone: 'Zona Norte',
    lat: -22.9280, lng: -43.2360, approx: 'Região da Rua Engenheiro Adel', ref: 'Próximo à UPA da Tijuca',
    desc: 'Mãe solo com filha; trabalha como cuidadora de idosos.', deps: [['Manuela', 9]],
    need: 'Cesta básica mensal', provider: 'ifood', priority: 4, distance: '3.9 km', nis: '12131415161',
    entity: 'Borel Comunidade', dataSource: 'gov', income: 'Até R$ 1.200/mês', vuln: ['Mãe solo'] },
  { id: 'r10', communityId: 'rj10', resp: 'Geni Cardoso', community: 'Manguinhos', neighborhood: 'Manguinhos', city: 'Rio de Janeiro', state: 'RJ', zone: 'Zona Norte',
    lat: -22.8750, lng: -43.2470, approx: 'Região da Av. Leopoldo Bulhões', ref: 'Próximo à estação Manguinhos',
    desc: 'Família com 3 crianças; insegurança alimentar grave.', deps: [['Yuri', 11], ['Alana', 7], ['Noah', 3]],
    need: 'Alimentos básicos urgentes', provider: '99', fed: true, priority: 5, distance: '5.6 km', nis: '13141516171',
    entity: 'Manguinhos Vivo', dataSource: 'gov', income: 'Sem renda fixa', vuln: ['Insegurança alimentar grave'] },
  { id: 'r11', communityId: 'rj11', resp: 'Dalva Ribeiro', community: 'Vidigal', neighborhood: 'Leblon', city: 'Rio de Janeiro', state: 'RJ', zone: 'Zona Sul',
    lat: -22.9930, lng: -43.2320, approx: 'Região da Av. João Goulart', ref: 'Próximo ao mirante do Vidigal',
    desc: 'Mãe solo com 2 filhos; perdeu o emprego no comércio local.', deps: [['Theodoro', 10], ['Liz', 6]],
    need: 'Cesta básica e leite', provider: 'carrefour', priority: 4, distance: '2.8 km', nis: '14151617181',
    entity: 'Vidigal Solidário', dataSource: 'manual', income: 'Sem renda fixa', vuln: ['Mãe solo', 'Desemprego'] },
];

export const mockFamilies: Family[] = seeds.map(mk);
