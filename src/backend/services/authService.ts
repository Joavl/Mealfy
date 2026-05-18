import type { User, UserRole, AuthorizingEntity } from '../types';
import { mockUsers, mockEntities } from '../mockData/users';
import { storage } from '../utils/storage';
import { randomDelay } from '../utils/delay';

import { authApi } from '../../api/authApi';
import { handleApiError, shouldFallback } from '../utils/fallback';

const SESSION_KEY = 'current_user';
const USERS_KEY = 'users_db';
const ENTITIES_KEY = 'entities_db';

export const authService = {
  // Initiates our DB in localStorage if it doesn't exist
  initDB: () => {
    const users = storage.get(USERS_KEY, null);
    if (!users) {
      storage.set(USERS_KEY, mockUsers);
    }
    const entities = storage.get(ENTITIES_KEY, null);
    if (!entities) {
      storage.set(ENTITIES_KEY, mockEntities);
    }
  },

  getCurrentSession: async (): Promise<User | null> => {
    await randomDelay(200, 500);
    return storage.get(SESSION_KEY, null);
  },

  loginWithGoogle: async (role: UserRole = 'donor'): Promise<User> => {
    await randomDelay(800, 1200);
    authService.initDB();
    const users = storage.get<User[]>(USERS_KEY, mockUsers);
    // Find first user with that role or use mock
    const user = users.find(u => u.role === role) || {
      ...users[0],
      role: role,
      id: `u-${role}-${Date.now()}`
    };
    storage.set(SESSION_KEY, user);
    return user;
  },

  loginAsRole: async (role: UserRole, identifier: string): Promise<User> => {
    const demoEmailByRole: Record<string, string> = {
      donor: 'doador@mealfy.com',
      entity: 'entidade@mealfy.com',
      beneficiary: 'beneficiario@mealfy.com',
      admin: 'admin@mealfy.com'
    };
    const targetEmail = identifier.includes('@') ? identifier : demoEmailByRole[role];

    try {
      const response = await authApi.loginMock(targetEmail);
      if (response && response.user) {
        storage.set(SESSION_KEY, response.user);
        return response.user;
      }
    } catch (e) {
      handleApiError(e, 'Auth Login');
    }

    await randomDelay(800, 1500);
    authService.initDB();
    const users = storage.get<User[]>(USERS_KEY, mockUsers);
    
    // Simulate finding
    let user = users.find(u => u.role === role && (u.email === identifier || u.phone === identifier || u.documentNumber === identifier));
    
    // Fallback para login rápido durante desenvolvimento
    if (!user) {
      user = {
        id: `u-${role}-${Date.now()}`,
        name: identifier.split('@')[0] || identifier,
        email: identifier.includes('@') ? identifier : `${identifier}@mealfy.org`,
        role: role,
        totalDonated: 0,
        rankingPosition: 0,
        rankingPercentile: '',
        status: role === 'entity' ? 'pending' : 'active'
      };
      if (role === 'entity') {
         // Auto-create a mock entity to link
         const entityId = `e-${Date.now()}`;
         const entities = storage.get<AuthorizingEntity[]>(ENTITIES_KEY, mockEntities);
         entities.push({
           id: entityId,
           name: user.name,
           cnpj: identifier,
           type: 'ONG',
           responsibleName: user.name,
           email: user.email,
           phone: '',
           region: 'Local',
           status: 'pending',
           createdAt: new Date().toISOString()
         });
         storage.set(ENTITIES_KEY, entities);
         user.entityId = entityId;
      }
      users.push(user);
      storage.set(USERS_KEY, users);
    }

    storage.set(SESSION_KEY, user);
    return user;
  },

  registerDonor: async (data: Partial<User>): Promise<User> => {
    try {
      const newUser = await authApi.registerDonor(data);
      if (newUser) {
        storage.set(SESSION_KEY, newUser);
        return newUser;
      }
    } catch (e) {
      handleApiError(e, 'Register Donor');
      if (!shouldFallback()) throw e;
    }

    await randomDelay(800, 1200);
    authService.initDB();
    const users = storage.get<User[]>(USERS_KEY, mockUsers);

    if (data.email && users.some((u) => u.email === data.email)) {
      throw new Error('Este e-mail já está cadastrado.');
    }
    
    const newUser: User = {
      id: `u-donor-${Date.now()}`,
      name: data.name || 'Doador Novo',
      email: data.email || '',
      role: 'donor',
      phone: data.phone,
      documentType: data.documentType,
      documentNumber: data.documentNumber,
      instagram: data.instagram,
      privacySettings: data.privacySettings,
      totalDonated: 0,
      rankingPosition: 0,
      rankingPercentile: 'Top 100%',
      status: 'active'
    };

    users.push(newUser);
    storage.set(USERS_KEY, users);
    storage.set(SESSION_KEY, newUser);
    return newUser;
  },

  registerEntity: async (data: Partial<AuthorizingEntity>): Promise<User> => {
    try {
      const newUser = await authApi.registerEntity({
        ...data,
        cnpj: data.cnpj,
        region: data.region,
        type: data.type
      });
      if (newUser) {
        storage.set(SESSION_KEY, newUser);
        return newUser;
      }
    } catch (e) {
      handleApiError(e, 'Register Entity');
      if (!shouldFallback()) throw e;
    }

    await randomDelay(800, 1200);
    authService.initDB();
    const users = storage.get<User[]>(USERS_KEY, mockUsers);
    const entities = storage.get<AuthorizingEntity[]>(ENTITIES_KEY, mockEntities);

    if (data.email && users.some((u) => u.email === data.email)) {
      throw new Error('Este e-mail já está cadastrado.');
    }
    
    const newEntity: AuthorizingEntity = {
      id: `e-${Date.now()}`,
      name: data.name || 'Nova Entidade',
      cnpj: data.cnpj || '',
      type: data.type || 'ONG',
      responsibleName: data.responsibleName || '',
      email: data.email || '',
      phone: data.phone || '',
      region: data.region || '',
      addressOrDistrict: data.addressOrDistrict,
      websiteOrInstagram: data.websiteOrInstagram,
      shortDescription: data.shortDescription,
      status: 'pending', // Regra: toda entidade entra pending
      createdAt: new Date().toISOString()
    };

    entities.push(newEntity);
    storage.set(ENTITIES_KEY, entities);

    // O usuário atrelado à entidade
    const newUser: User = {
      id: `u-entity-${Date.now()}`,
      name: newEntity.responsibleName,
      email: newEntity.email,
      role: 'entity',
      phone: newEntity.phone,
      entityId: newEntity.id,
      totalDonated: 0,
      rankingPosition: 0,
      rankingPercentile: '',
      status: 'pending' // Entidade pending, usuário pending
    };

    users.push(newUser);
    storage.set(USERS_KEY, users);
    storage.set(SESSION_KEY, newUser);
    
    return newUser;
  },

  logout: async (): Promise<void> => {
    await randomDelay(500, 1000);
    storage.remove(SESSION_KEY);
  }
};
