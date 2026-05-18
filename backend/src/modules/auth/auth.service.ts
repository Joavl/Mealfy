import { v4 as uuidv4 } from 'uuid';
import { MockDatabase } from '../../database/mock-db';
import { AppError } from '../../shared/errors/AppError';
import { User } from '../../shared/types';

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

  static async login(email: string): Promise<User> {
    const users = await MockDatabase.read<User>('users');
    const user = users.find(u => u.email === email);

    if (!user) {
      throw new AppError('Invalid credentials', 401);
    }

    return user;
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
