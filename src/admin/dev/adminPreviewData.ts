export interface OverviewData {
  totalUsers: number;
  donors: number;
  beneficiaries: number;
  entities: number;
  pendingEntities: number;
  totalFamilies: number;
  pendingFamilies: number;
  pendingIndications: number;
  totalDonations: number;
  totalAmountDonated: number;
  activeCampaigns: number;
}

export interface PreviewIndication {
  id: string;
  representativeName: string;
  region: string;
  childrenCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'converted';
  observation: string;
  contact?: string;
  indicatedByName: string;
  createdAt: string;
}

export interface PreviewFamily {
  id: string;
  representativeName: string;
  region: string;
  childrenCount: number;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  supportStatus: 'needs_help' | 'supported' | 'fed';
  description: string;
  createdAt: string;
}

export interface PreviewEntity {
  id: string;
  name: string;
  cnpj: string;
  responsibleName: string;
  email: string;
  region: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface PreviewUser {
  id: string;
  name: string;
  email: string;
  role: 'donor' | 'entity' | 'beneficiary' | 'admin';
  status: 'active' | 'pending' | 'rejected';
  createdAt: string;
}

export interface PreviewDonation {
  id: string;
  donorName: string;
  familyRepresentative: string;
  amount: number;
  message?: string;
  createdAt: string;
}

export interface PreviewAuditLog {
  id: string;
  adminName: string;
  action: string;
  entityType: string;
  entityName: string;
  reason?: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

export const previewOverview: OverviewData = {
  totalUsers: 1240,
  donors: 850,
  beneficiaries: 310,
  entities: 80,
  pendingEntities: 3,
  totalFamilies: 155,
  pendingFamilies: 8,
  pendingIndications: 5,
  totalDonations: 432,
  totalAmountDonated: 21600.0,
  activeCampaigns: 4
};

export const previewIndications: PreviewIndication[] = [
  {
    id: 'ind-101',
    representativeName: 'Francisca Maria dos Santos',
    region: 'Heliópolis',
    childrenCount: 4,
    status: 'pending',
    observation: 'Mãe solo desempregada morando de aluguel social. Necessita de ajuda básica urgente.',
    contact: '11988887777',
    indicatedByName: 'Carlos Doador Exemplo',
    createdAt: '2026-06-09T14:30:00-03:00'
  },
  {
    id: 'ind-102',
    representativeName: 'Severino Ramos Barbosa',
    region: 'Grajaú',
    childrenCount: 3,
    status: 'pending',
    observation: 'Família sem renda fixa, o pai trabalha com reciclagem e a mãe cuida das crianças.',
    contact: '11977776666',
    indicatedByName: 'Ana Silva Doadora',
    createdAt: '2026-06-09T09:15:00-03:00'
  },
  {
    id: 'ind-103',
    representativeName: 'Cláudia Regina de Souza',
    region: 'Paraisópolis',
    childrenCount: 5,
    status: 'approved',
    observation: 'Residência precária. Cadastrada na triagem regional inicial.',
    contact: '11966665555',
    indicatedByName: 'Roberto Souza',
    createdAt: '2026-06-08T16:45:00-03:00'
  },
  {
    id: 'ind-104',
    representativeName: 'Marcos Antônio Lima',
    region: 'Cidade Tiradentes',
    childrenCount: 2,
    status: 'converted',
    observation: 'Moradia compartilhada com familiares idosos. Já integrada ao app.',
    contact: '11955554444',
    indicatedByName: 'Aline Oliveira',
    createdAt: '2026-06-07T11:20:00-03:00'
  },
  {
    id: 'ind-105',
    representativeName: 'Maria de Fátima Alves',
    region: 'Heliópolis',
    childrenCount: 1,
    status: 'rejected',
    observation: 'Dados incorretos e contato inexistente durante a validação prévia.',
    contact: '11944443333',
    indicatedByName: 'Carlos Doador Exemplo',
    createdAt: '2026-06-06T15:10:00-03:00'
  }
];

export const previewFamilies: PreviewFamily[] = [
  {
    id: 'f-201',
    representativeName: 'Juliana Mendes Pereira',
    region: 'Heliópolis',
    childrenCount: 3,
    status: 'approved',
    supportStatus: 'needs_help',
    description: 'Família acolhida pelo Instituto Esperança.',
    createdAt: '2026-06-05T10:00:00-03:00'
  },
  {
    id: 'f-202',
    representativeName: 'Pedro Cavalcanti Neto',
    region: 'Paraisópolis',
    childrenCount: 2,
    status: 'approved',
    supportStatus: 'supported',
    description: 'Apoiado com cestas mensais por doador recorrente.',
    createdAt: '2026-06-04T14:30:00-03:00'
  },
  {
    id: 'f-203',
    representativeName: 'Antônia Lúcia da Silva',
    region: 'Grajaú',
    childrenCount: 4,
    status: 'pending',
    supportStatus: 'needs_help',
    description: 'Aguardando validação de documentos de moradia pela ONG local.',
    createdAt: '2026-06-08T11:00:00-03:00'
  }
];

export const previewEntities: PreviewEntity[] = [
  {
    id: 'e-301',
    name: 'Instituto Esperança Heliópolis',
    cnpj: '12.345.678/0001-99',
    responsibleName: 'Maria Silva Costa',
    email: 'contato@institutoesperanca.org',
    region: 'Heliópolis',
    status: 'approved',
    createdAt: '2026-05-15T09:00:00-03:00'
  },
  {
    id: 'e-302',
    name: 'Mãos Unidas Paraisópolis',
    cnpj: '98.765.432/0001-11',
    responsibleName: 'João Ferreira Melo',
    email: 'paraisopolis@maosunidas.org.br',
    region: 'Paraisópolis',
    status: 'pending',
    createdAt: '2026-06-08T10:20:00-03:00'
  }
];

export const previewUsers: PreviewUser[] = [
  {
    id: 'u-401',
    name: 'Admin Geral Mealfy',
    email: 'admin@mealfy.com',
    role: 'admin',
    status: 'active',
    createdAt: '2026-01-01T08:00:00-03:00'
  },
  {
    id: 'u-402',
    name: 'Carlos Doador Exemplo',
    email: 'doador@mealfy.com',
    role: 'donor',
    status: 'active',
    createdAt: '2026-03-10T12:00:00-03:00'
  },
  {
    id: 'u-403',
    name: 'Maria Silva Costa',
    email: 'entidade@mealfy.com',
    role: 'entity',
    status: 'active',
    createdAt: '2026-05-15T09:00:00-03:00'
  }
];

export const previewDonations: PreviewDonation[] = [
  {
    id: 'd-501',
    donorName: 'Carlos Doador Exemplo',
    familyRepresentative: 'Juliana Mendes Pereira',
    amount: 50.00,
    message: 'Que esta cesta traga esperança!',
    createdAt: '2026-06-09T18:22:00-03:00'
  },
  {
    id: 'd-502',
    donorName: 'Ana Silva Doadora',
    familyRepresentative: 'Pedro Cavalcanti Neto',
    amount: 100.00,
    createdAt: '2026-06-08T20:10:00-03:00'
  }
];

export const previewAuditLogs: PreviewAuditLog[] = [
  {
    id: 'log-601',
    adminName: 'Admin Geral Mealfy',
    action: 'CONVERT_INDICATION',
    entityType: 'Indication',
    entityName: 'Marcos Antônio Lima',
    reason: 'Conversão em família oficial pós-validação de CPF.',
    ipAddress: '192.168.0.21',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0',
    createdAt: '2026-06-07T11:20:00-03:00'
  },
  {
    id: 'log-602',
    adminName: 'Admin Geral Mealfy',
    action: 'APPROVE_ENTITY',
    entityType: 'AuthorizingEntity',
    entityName: 'Instituto Esperança Heliópolis',
    reason: 'Documentação CNPJ e convênio validados.',
    ipAddress: '192.168.0.21',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/125.0.0.0',
    createdAt: '2026-05-15T10:15:00-03:00'
  }
];
