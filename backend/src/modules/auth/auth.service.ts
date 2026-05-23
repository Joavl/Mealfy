import { v4 as uuidv4 } from 'uuid';
import { MockDatabase } from '../../database/mock-db';
import { AppError } from '../../shared/errors/AppError';
import { User, Family } from '../../shared/types';
import { FamiliesService } from '../families/families.service';

const REGION_COORDS: Record<string, [number, number]> = {
  'Heliópolis': [-23.612, -46.593],
  'Paraisópolis': [-23.617, -46.728],
  'Cidade Tiradentes': [-23.58, -46.74],
  'Grajaú': [-23.75, -46.68],
};

function coordsForRegion(region: string): [number, number] {
  const base = REGION_COORDS[region] ?? [-23.5505, -46.6333];
  const j = () => (Math.random() - 0.5) * 0.012;
  return [base[0] + j(), base[1] + j()];
}

export class AuthService {
  static async registerDonor(data: any): Promise<User> {
    const users = await MockDatabase.read<User>('users');
    
    if (users.find(u => u.email === data.email)) {
      throw new AppError('Email already registered', 409);
    }

    const newUser: User = {
      id: `u-${uuidv4()}`,
      name: data.name,
      email: data.email,
      role: 'donor',
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      totalDonated: 0,
      status: 'active',
      privacySettings: {
        showOnRanking: true,
        showInstagram: false,
        anonymousMode: false
      }
    };

    users.push(newUser);
    await MockDatabase.write('users', users);
    await MockDatabase.appendAuditLog({ type: 'REGISTER_DONOR', userId: newUser.id });
    
    return newUser;
  }

  static async registerEntity(data: any): Promise<User> {
    const users = await MockDatabase.read<User>('users');
    const entities = await MockDatabase.read<any>('entities');

    if (users.find(u => u.email === data.email)) {
      throw new AppError('Email already registered', 409);
    }

    const entityId = `e-${uuidv4()}`;
    const userId = `u-${uuidv4()}`;

    const newEntity = {
      id: entityId,
      name: data.name,
      cnpj: data.cnpj,
      region: data.region,
      type: data.type,
      responsibleName: data.responsibleName,
      email: data.email,
      phone: data.phone,
      addressOrDistrict: data.addressOrDistrict,
      websiteOrInstagram: data.websiteOrInstagram,
      shortDescription: data.shortDescription,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    const newUser: User = {
      id: userId,
      name: data.responsibleName || data.name,
      email: data.email,
      role: 'entity',
      entityId: entityId,
      phone: data.phone,
      totalDonated: 0,
      status: 'pending'
    };

    users.push(newUser);
    entities.push(newEntity);

    await MockDatabase.write('users', users);
    await MockDatabase.write('entities', entities);
    await MockDatabase.appendAuditLog({ type: 'REGISTER_ENTITY', userId, entityId });

    return newUser;
  }

  static async login(email: string, password: string): Promise<User> {
    const normalizedEmail = email.trim().toLowerCase();
    const demoPassword = process.env.DEMO_PASSWORD ?? 'mealfy123';

    if (normalizedEmail.endsWith('@mealfy.com') && password !== demoPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    const users = await MockDatabase.read<User>('users');
    const user = users.find((u) => u.email?.toLowerCase() === normalizedEmail);

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    return user;
  }

  static async registerBeneficiary(data: any): Promise<{ user: User; family: Family }> {
    const users = await MockDatabase.read<User>('users');
    const cpf = data.responsibleCpf;

    if (users.find((u) => u.documentNumber === cpf)) {
      throw new AppError('CPF já cadastrado', 409);
    }

    const [lat, lng] = coordsForRegion(data.region);
    const children = data.childrenNames.map((name: string, i: number) => ({
      id: `ch-${i}`,
      name,
      age: 0,
      school: 'A informar',
    }));

    const familyPayload = {
      representativeName: data.familyName,
      familyName: data.familyName,
      responsibleName: data.responsibleName,
      responsibleCpf: cpf,
      neighborhood: data.neighborhood || data.region,
      region: data.region,
      city: data.city || 'São Paulo',
      state: data.state || 'SP',
      shortAddress: data.shortAddress || data.neighborhood || data.region,
      description: `Família ${data.familyName}, responsável ${data.responsibleName}. ${data.childrenCount} criança(s).`,
      childrenCount: data.childrenCount,
      children,
      mainNeed: 'Alimentação básica',
      latitude: lat,
      longitude: lng,
      photoUrl: data.photoUrl,
      sourceType: 'beneficiary_self' as const,
      sourceLabel: 'Cadastro direto da família',
      status: 'approved' as const,
      supportStatus: 'needs_help' as const,
      needsEntitySupport: true,
      priorityLevel: 4,
    };

    const systemUser = { id: 'system', role: 'admin', name: 'Sistema', status: 'active' };
    const family = await FamiliesService.createFamily(familyPayload, systemUser);

    const userId = `u-${uuidv4()}`;
    const newUser: User = {
      id: userId,
      name: data.responsibleName,
      email: `beneficiario+${cpf.slice(-4)}@mealfy.local`,
      role: 'beneficiary',
      documentType: 'cpf',
      documentNumber: cpf,
      beneficiaryId: family.id,
      totalDonated: 0,
      status: 'active',
    };

    users.push(newUser);
    await MockDatabase.write('users', users);
    await MockDatabase.appendAuditLog({ type: 'REGISTER_BENEFICIARY', userId, familyId: family.id });

    return { user: newUser, family, token: userId };
  }

  static async updatePreferences(userId: string, preferences: any): Promise<User> {
    const users = await MockDatabase.read<User>('users');
    const userIndex = users.findIndex(u => u.id === userId);
    
    if (userIndex === -1) {
      throw new AppError('User not found', 404);
    }
    
    if (users[userIndex].role !== 'donor') {
      throw new AppError('Only donors can have impact preferences', 403);
    }

    users[userIndex].impactPreferences = {
      ...users[userIndex].impactPreferences,
      ...preferences
    };

    await MockDatabase.write('users', users);
    return users[userIndex];
  }
}
