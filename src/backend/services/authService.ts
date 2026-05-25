import type { User, UserRole, AuthorizingEntity, Family } from '../types';
import { coordsForRegion } from '../utils/regionCoords';
import { familyService } from './familyService';
import { mockUsers, mockEntities } from '../mockData/users';
import { storage } from '../utils/storage';
import { randomDelay } from '../utils/delay';

import { authApi } from '../../api/authApi';
import { handleApiError, shouldFallback } from '../utils/fallback';
import {
  isFirebaseConfigured,
  registerWithEmail,
  loginWithEmail,
  loginWithGoogle,
  logoutFirebase,
  saveUserProfileToFirestore,
  ensureFirestoreAuth,
  getFirebaseIdToken,
  FIREBASE_ID_TOKEN_KEY,
  type FirestoreUserProfile,
} from '../../lib/firebaseAuth';
import {
  saveUserCadastroToFirestore,
  saveEntityCadastroToFirestore,
  saveFamilyCadastroToFirestore,
} from '../../lib/firestoreCadastros';

const SESSION_KEY = 'current_user';
const USERS_KEY = 'users_db';
const ENTITIES_KEY = 'entities_db';

/** Senha das contas demo @mealfy.com (seed do banco). Contas reais usam Firebase. */
const DEMO_PASSWORD = import.meta.env.VITE_DEMO_PASSWORD ?? 'mealfy123';

const DEMO_EMAIL_BY_ROLE: Record<UserRole, string> = {
  donor: 'doador@mealfy.com',
  entity: 'entidade@mealfy.com',
  beneficiary: 'beneficiario@mealfy.com',
  admin: 'admin@mealfy.com',
};

function isDemoEmail(email: string): boolean {
  return email.trim().toLowerCase().endsWith('@mealfy.com');
}

function assertPasswordForEmailLogin(role: UserRole, identifier: string, password?: string): void {
  if (role === 'beneficiary' && !identifier.includes('@')) return;
  if (!password || password.length < 6) {
    throw new Error('Informe sua senha (mínimo 6 caracteres).');
  }
}

function assertRoleMatch(user: User, expectedRole: UserRole): void {
  if (user.role !== expectedRole) {
    throw new Error('Este login não corresponde ao perfil selecionado.');
  }
}

export type RegisterDonorPayload = Partial<User> & { password?: string };
export type RegisterEntityPayload = Partial<AuthorizingEntity> & { password?: string };

async function persistFirebaseToken(): Promise<string | null> {
  const token = await getFirebaseIdToken();
  if (token) storage.set(FIREBASE_ID_TOKEN_KEY, token);
  return token;
}

async function syncSessionFromFirebase(role: UserRole): Promise<User | null> {
  const idToken = await persistFirebaseToken();
  if (!idToken) return null;

  try {
    const response = await authApi.loginFirebase(idToken);
    if (response?.user) {
      if (response.user.role !== role && role !== 'donor') {
        // login/firebase cria como donor por padrão; perfil já definido no register
      }
      storage.set(SESSION_KEY, response.user);
      return response.user;
    }
  } catch (e) {
    handleApiError(e, 'Firebase Login Sync');
  }
  return null;
}

export const authService = {
  initDB: () => {
    const users = storage.get(USERS_KEY, null);
    if (!users) storage.set(USERS_KEY, mockUsers);
    const entities = storage.get(ENTITIES_KEY, null);
    if (!entities) storage.set(ENTITIES_KEY, mockEntities);
  },

  getCurrentSession: async (): Promise<User | null> => {
    await randomDelay(100, 200);

    if (isFirebaseConfigured) {
      const synced = await syncSessionFromFirebase('donor');
      if (synced) return synced;
    }

    return storage.get(SESSION_KEY, null);
  },

  loginWithGoogle: async (role: UserRole = 'donor'): Promise<User> => {
    if (isFirebaseConfigured) {
      try {
        const fbUser = await loginWithGoogle();
        await saveUserProfileToFirestore({
          uid: fbUser.uid,
          email: fbUser.email ?? '',
          name: fbUser.displayName ?? fbUser.email?.split('@')[0] ?? 'Usuário',
          role,
        });
        const synced = await syncSessionFromFirebase(role);
        if (synced) return synced;

        const idToken = await persistFirebaseToken();
        if (idToken) {
          const res = await authApi.loginFirebase(idToken);
          if (res?.user) {
            storage.set(SESSION_KEY, res.user);
            return res.user;
          }
        }
      } catch (e) {
        if (!shouldFallback()) throw e;
        handleApiError(e, 'Google Login Firebase');
      }
    }

    await randomDelay(800, 1200);
    authService.initDB();
    const users = storage.get<User[]>(USERS_KEY, mockUsers);
    const user = users.find((u) => u.role === role) || {
      ...users[0],
      role,
      id: `u-${role}-${Date.now()}`,
    };
    storage.set(SESSION_KEY, user);
    return user;
  },

  loginWithEmailPassword: async (
    email: string,
    password: string,
    role: UserRole,
  ): Promise<User> => {
    if (!isFirebaseConfigured) {
      throw new Error('Firebase não configurado.');
    }

    const fbUser = await loginWithEmail(email, password);
    await saveUserProfileToFirestore({
      uid: fbUser.uid,
      email: fbUser.email ?? email,
      name: fbUser.displayName ?? email.split('@')[0],
      role,
    });

    const idToken = await persistFirebaseToken();
    if (!idToken) throw new Error('Não foi possível obter token de sessão.');

    try {
      const res = await authApi.loginFirebase(idToken);
      if (res?.user) {
        storage.set(SESSION_KEY, res.user);
        return res.user;
      }
    } catch (e) {
      handleApiError(e, 'Email Login API');
      if (!shouldFallback()) throw e;
    }

    const fallbackUser: User = {
      id: fbUser.uid,
      name: fbUser.displayName ?? email.split('@')[0],
      email: fbUser.email ?? email,
      role,
      totalDonated: 0,
      rankingPosition: 0,
      rankingPercentile: '',
      status: 'active',
    };
    storage.set(SESSION_KEY, fallbackUser);
    return fallbackUser;
  },

  loginAsRole: async (role: UserRole, identifier: string, password?: string): Promise<User> => {
    const trimmedId = identifier.trim();
    const targetEmail = trimmedId.includes('@')
      ? trimmedId.toLowerCase()
      : DEMO_EMAIL_BY_ROLE[role];

    // Beneficiário: CPF ou telefone (sem senha)
    if (role === 'beneficiary' && !trimmedId.includes('@')) {
      const cpfDigits = trimmedId.replace(/\D/g, '');

      await randomDelay(400, 800);
      authService.initDB();
      const users = storage.get<User[]>(USERS_KEY, mockUsers);
      const user = users.find(
        (u) =>
          u.role === 'beneficiary' &&
          (u.documentNumber?.replace(/\D/g, '') === cpfDigits ||
            u.phone?.replace(/\D/g, '') === cpfDigits),
      );
      if (!user) {
        throw new Error('CPF ou telefone não encontrado. Faça o cadastro da família.');
      }
      storage.set(SESSION_KEY, user);
      return user;
    }

    assertPasswordForEmailLogin(role, trimmedId, password);
    const pwd = password!;

    if (isDemoEmail(targetEmail) && pwd !== DEMO_PASSWORD) {
      throw new Error('Senha incorreta.');
    }

    // Contas demo @mealfy.com usam API local (nao Firebase)
    if (isDemoEmail(targetEmail)) {
      try {
        const response = await authApi.loginMock(targetEmail, pwd);
        if (response?.user) {
          assertRoleMatch(response.user, role);
          storage.set(SESSION_KEY, response.user);
          return response.user;
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : '';
        if (msg.includes('Invalid credentials') || msg.includes('401') || msg.includes('500')) {
          // tenta fallback local abaixo
        } else if (msg && !msg.includes('API-ONLY')) {
          handleApiError(e, 'Auth Login Demo');
          if (!shouldFallback()) throw e;
        } else {
          handleApiError(e, 'Auth Login Demo');
        }
      }

      await randomDelay(400, 800);
      authService.initDB();
      const localUsers = storage.get<User[]>(USERS_KEY, mockUsers);
      const localUser = localUsers.find((u) => u.role === role && u.email?.toLowerCase() === targetEmail);
      if (localUser) {
        assertRoleMatch(localUser, role);
        storage.set(SESSION_KEY, localUser);
        return localUser;
      }
      throw new Error('E-mail ou senha incorretos.');
    }

    if (isFirebaseConfigured && trimmedId.includes('@')) {
      return authService.loginWithEmailPassword(targetEmail, pwd, role);
    }

    try {
      const response = await authApi.loginMock(targetEmail, pwd);
      if (response?.user) {
        assertRoleMatch(response.user, role);
        storage.set(SESSION_KEY, response.user);
        return response.user;
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg.includes('Invalid credentials') || msg.includes('401')) {
        throw new Error('E-mail ou senha incorretos.');
      }
      if (msg && !msg.includes('API-ONLY') && !msg.includes('Fallback')) {
        throw e instanceof Error ? e : new Error('E-mail ou senha incorretos.');
      }
      handleApiError(e, 'Auth Login');
      if (!shouldFallback()) throw e;
    }

    if (!isDemoEmail(targetEmail)) {
      throw new Error(
        'Não foi possível validar o login. Configure o Firebase ou use uma conta @mealfy.com de demonstração.',
      );
    }

    await randomDelay(400, 800);
    authService.initDB();
    const users = storage.get<User[]>(USERS_KEY, mockUsers);
    const user = users.find((u) => u.role === role && u.email?.toLowerCase() === targetEmail);

    if (!user) {
      throw new Error('E-mail ou senha incorretos.');
    }

    assertRoleMatch(user, role);
    storage.set(SESSION_KEY, user);
    return user;
  },

  registerDonor: async (data: RegisterDonorPayload): Promise<User> => {
    if (!data.email || !data.password) {
      throw new Error('E-mail e senha são obrigatórios.');
    }

    if (isFirebaseConfigured) {
      const fbUser = await registerWithEmail(data.email, data.password, data.name || '');
      const idToken = await fbUser.getIdToken();

      const firestoreProfile: FirestoreUserProfile = {
        uid: fbUser.uid,
        email: data.email,
        name: data.name || '',
        role: 'donor',
        phone: data.phone,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        instagram: data.instagram,
        privacySettings: data.privacySettings,
      };
      await saveUserProfileToFirestore(firestoreProfile);
      storage.set(FIREBASE_ID_TOKEN_KEY, idToken);

      try {
        const newUser = await authApi.registerDonor({
          name: data.name,
          email: data.email,
          documentType: data.documentType || 'cpf',
          documentNumber: data.documentNumber || '',
          phone: data.phone,
          instagram: data.instagram,
          showOnRanking: data.privacySettings?.showOnRanking ?? true,
          showInstagram: data.privacySettings?.showInstagram ?? false,
          anonymousMode: data.privacySettings?.anonymousMode ?? false,
          idToken,
        });
        if (newUser) {
          await saveUserCadastroToFirestore(fbUser.uid, { ...newUser, id: fbUser.uid });
          storage.set(SESSION_KEY, { ...newUser, id: fbUser.uid });
          return { ...newUser, id: fbUser.uid };
        }
      } catch (e) {
        handleApiError(e, 'Register Donor API');
        if (!shouldFallback()) throw e;
      }

      const fallbackUser: User = {
        id: fbUser.uid,
        name: data.name || 'Doador',
        email: data.email,
        role: 'donor',
        phone: data.phone,
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        instagram: data.instagram,
        privacySettings: data.privacySettings,
        totalDonated: 0,
        rankingPosition: 0,
        rankingPercentile: 'Top 100%',
        status: 'active',
      };
      await saveUserCadastroToFirestore(fbUser.uid, fallbackUser);
      storage.set(SESSION_KEY, fallbackUser);
      return fallbackUser;
    }

    try {
      const newUser = await authApi.registerDonor(data);
      if (newUser) {
        try {
          const fb = await ensureFirestoreAuth();
          const uid = fb?.uid ?? newUser.id;
          await saveUserCadastroToFirestore(uid, { ...newUser, id: uid });
          storage.set(SESSION_KEY, { ...newUser, id: uid });
          return { ...newUser, id: uid };
        } catch {
          storage.set(SESSION_KEY, newUser);
          return newUser;
        }
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
      status: 'active',
    };

    users.push(newUser);
    storage.set(USERS_KEY, users);
    storage.set(SESSION_KEY, newUser);
    try {
      const fb = await ensureFirestoreAuth();
      const uid = fb?.uid ?? newUser.id;
      newUser.id = uid;
      await saveUserCadastroToFirestore(uid, newUser);
    } catch (e) {
      console.warn('[Firestore] Cadastro doador (fallback local):', e);
    }
    return newUser;
  },

  registerEntity: async (data: RegisterEntityPayload): Promise<User> => {
    if (!data.email || !data.password) {
      throw new Error('E-mail e senha são obrigatórios.');
    }

    if (isFirebaseConfigured) {
      const fbUser = await registerWithEmail(
        data.email,
        data.password,
        data.responsibleName || data.name || '',
      );
      const idToken = await fbUser.getIdToken();

      const entityId = `e-${fbUser.uid}`;
      await saveUserProfileToFirestore({
        uid: fbUser.uid,
        email: data.email,
        name: data.responsibleName || data.name || '',
        role: 'entity',
        phone: data.phone,
        entityId,
      });
      await saveEntityCadastroToFirestore({
        id: entityId,
        name: data.name || '',
        cnpj: data.cnpj || '',
        type: (data.type as AuthorizingEntity['type']) || 'ONG',
        responsibleName: data.responsibleName || '',
        email: data.email || '',
        phone: data.phone || '',
        region: data.region || '',
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      storage.set(FIREBASE_ID_TOKEN_KEY, idToken);

      try {
        const newUser = await authApi.registerEntity({
          name: data.name,
          cnpj: data.cnpj,
          region: data.region,
          type: data.type,
          responsibleName: data.responsibleName,
          email: data.email,
          phone: data.phone,
          idToken,
        });
        if (newUser) {
          await saveUserCadastroToFirestore(fbUser.uid, { ...newUser, id: fbUser.uid, entityId });
          storage.set(SESSION_KEY, { ...newUser, id: fbUser.uid, entityId });
          return { ...newUser, id: fbUser.uid, entityId };
        }
      } catch (e) {
        handleApiError(e, 'Register Entity API');
        if (!shouldFallback()) throw e;
      }
    }

    try {
      const newUser = await authApi.registerEntity({
        ...data,
        cnpj: data.cnpj,
        region: data.region,
        type: data.type,
      });
      if (newUser) {
        try {
          const fb = await ensureFirestoreAuth();
          const uid = fb?.uid ?? newUser.id;
          const entId = newUser.entityId ?? `e-${uid}`;
          await saveEntityCadastroToFirestore({
            id: entId,
            name: data.name || '',
            cnpj: data.cnpj || '',
            type: (data.type as AuthorizingEntity['type']) || 'ONG',
            responsibleName: data.responsibleName || '',
            email: data.email || '',
            phone: data.phone || '',
            region: data.region || '',
            status: 'pending',
            createdAt: new Date().toISOString(),
          });
          await saveUserCadastroToFirestore(uid, { ...newUser, id: uid, entityId: entId });
          storage.set(SESSION_KEY, { ...newUser, id: uid, entityId: entId });
          return { ...newUser, id: uid, entityId: entId };
        } catch {
          storage.set(SESSION_KEY, newUser);
          return newUser;
        }
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
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    entities.push(newEntity);
    storage.set(ENTITIES_KEY, entities);

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
      status: 'pending',
    };

    users.push(newUser);
    storage.set(USERS_KEY, users);
    storage.set(SESSION_KEY, newUser);
    try {
      const fb = await ensureFirestoreAuth();
      const uid = fb?.uid ?? newUser.id;
      newUser.id = uid;
      await saveUserCadastroToFirestore(uid, { ...newUser, entityId: newEntity.id });
      await saveEntityCadastroToFirestore(newEntity);
    } catch (e) {
      console.warn('[Firestore] Cadastro entidade (fallback local):', e);
    }
    return newUser;
  },

  registerBeneficiary: async (data: {
    familyName: string;
    responsibleName: string;
    responsibleCpf: string;
    childrenCount: number;
    childrenNames: string[];
    photoUrl: string;
    region: string;
    neighborhood?: string;
    shortAddress?: string;
  }): Promise<User> => {
    const cpf = data.responsibleCpf.replace(/\D/g, '');
    const [lat, lng] = coordsForRegion(data.region);
    const children = data.childrenNames.map((name, i) => ({
      id: `ch-${i}`,
      name,
      age: 0,
      school: 'A informar',
    }));

    const familyId = `f-${Date.now()}-${cpf.slice(-4)}`;
    let firestoreUid: string | null = null;
    try {
      const fbUser = await ensureFirestoreAuth();
      firestoreUid = fbUser?.uid ?? null;
    } catch (e) {
      console.warn('[Firestore] Auth para beneficiário:', e);
    }

    const familyDraft: Family = {
      id: familyId,
      communityId: 'c1',
      representativeName: data.familyName,
      familyName: data.familyName,
      responsibleName: data.responsibleName,
      responsibleCpf: cpf,
      neighborhood: data.neighborhood || data.region,
      region: data.region,
      city: 'São Paulo',
      state: 'SP',
      shortAddress: data.shortAddress || data.neighborhood || data.region,
      description: `Família ${data.familyName}, responsável ${data.responsibleName}.`,
      childrenCount: data.childrenCount,
      children,
      mainNeed: 'Alimentação básica',
      supportStatus: 'needs_help',
      distanceToUser: '—',
      priorityLevel: 4,
      latitude: lat,
      longitude: lng,
      photoUrl: data.photoUrl,
      sourceType: 'beneficiary_self',
      sourceLabel: 'Cadastro direto da família',
      needsEntitySupport: true,
      status: 'approved',
    };

    try {
      await saveFamilyCadastroToFirestore(familyDraft);
      if (firestoreUid) {
        await saveUserCadastroToFirestore(firestoreUid, {
          id: firestoreUid,
          name: data.responsibleName,
          email: `beneficiario+${cpf.slice(-4)}@mealfy.local`,
          role: 'beneficiary',
          documentType: 'cpf',
          documentNumber: cpf,
          beneficiaryId: familyId,
          totalDonated: 0,
          rankingPosition: 0,
          rankingPercentile: '',
          status: 'active',
        });
      }
    } catch (e) {
      console.warn('[Firestore] Cadastro beneficiário:', e);
      if (!shouldFallback()) throw e;
    }

    try {
      const res = await authApi.registerBeneficiary({
        ...data,
        responsibleCpf: cpf,
        city: 'São Paulo',
        state: 'SP',
      });
      if (res?.user) {
        const sessionUser = firestoreUid ? { ...res.user, id: firestoreUid, beneficiaryId: res.family?.id ?? familyId } : res.user;
        storage.set(SESSION_KEY, sessionUser);
        if (res.family) {
          await saveFamilyCadastroToFirestore(res.family as Family);
          familyService.persistFamilyLocally(res.family as Family);
        }
        return sessionUser;
      }
    } catch (e) {
      handleApiError(e, 'Register Beneficiary');
      if (!shouldFallback()) throw e;
    }

    await randomDelay();
    authService.initDB();
    const users = storage.get<User[]>(USERS_KEY, mockUsers);
    if (users.some((u) => u.documentNumber === cpf)) {
      throw new Error('CPF já cadastrado.');
    }

    const { id: _draftFamilyId, ...familyPayload } = familyDraft;
    const family = await familyService.addFamily(familyPayload);

    const newUser: User = {
      id: firestoreUid ?? `u-ben-${Date.now()}`,
      name: data.responsibleName,
      email: `beneficiario+${cpf.slice(-4)}@mealfy.local`,
      role: 'beneficiary',
      documentType: 'cpf',
      documentNumber: cpf,
      beneficiaryId: family.id,
      totalDonated: 0,
      rankingPosition: 0,
      rankingPercentile: '',
      status: 'active',
    };

    users.push(newUser);
    storage.set(USERS_KEY, users);
    storage.set(SESSION_KEY, newUser);
    try {
      await saveUserCadastroToFirestore(newUser.id, newUser);
      await saveFamilyCadastroToFirestore({ ...family, id: family.id });
    } catch {
      /* já tentado acima */
    }
    return newUser;
  },

  logout: async (): Promise<void> => {
    await randomDelay(200, 400);
    if (isFirebaseConfigured) {
      try {
        await logoutFirebase();
      } catch {
        /* ignore */
      }
    }
    storage.remove(SESSION_KEY);
    storage.remove(FIREBASE_ID_TOKEN_KEY);
  },
};
