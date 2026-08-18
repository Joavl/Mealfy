import type { User, UserRole, AuthorizingEntity } from '../types';
import { mockAuthProvider, AuthError, type RegisterData } from './authProvider';
import { mockEntities } from '../mockData/users';
import { storage } from '../utils/storage';
import { randomDelay } from '../utils/delay';
import { authApi, type BackendPublicUser, type OAuthProvider } from '../../api/authApi';
import { ApiError, ApiNetworkError } from '../../api/apiClient';
import { getToken, setToken, clearToken } from '../../api/tokenStorage';

// Re-exporta para uso pelos consumidores
export { AuthError, type AuthErrorCode } from './authProvider';

const SESSION_KEY = 'current_user';
const USERS_DB_KEY = 'users_db';
const ENTITIES_KEY = 'entities_db';

/** Fallback mock só vale em DEV — nunca em build de staging/produção (inclusive o APK). */
function isDevFallbackAllowed(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DISABLE_LOCAL_FALLBACK !== 'true';
}

function mapBackendStatus(status: BackendPublicUser['status']): User['status'] {
  return status === 'blocked' ? 'suspended' : status;
}

/**
 * O backend é a fonte de verdade pra identidade (id/nome/e-mail/role/status/privacySettings).
 * Preferências que o backend ainda não modela (savedFamilyIds, impactPreferences,
 * totalDonated/ranking) continuam vindo do cache local.
 */
function mapBackendUser(backendUser: BackendPublicUser): User {
  const sessionCache = storage.get<User | null>(SESSION_KEY, null);
  const cached =
    sessionCache?.id === backendUser.id
      ? sessionCache
      : storage.get<User[]>(USERS_DB_KEY, []).find((u) => u.id === backendUser.id) || null;

  return {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    role: backendUser.role as UserRole,
    phone: backendUser.phone ?? undefined,
    avatar: backendUser.avatarUrl ?? undefined,
    instagram: backendUser.instagram ?? undefined,
    status: mapBackendStatus(backendUser.status),
    totalDonated: cached?.totalDonated ?? 0,
    rankingPosition: cached?.rankingPosition ?? 0,
    rankingPercentile: cached?.rankingPercentile ?? '',
    savedFamilyIds: cached?.savedFamilyIds,
    // Backend é autoritativo para privacySettings; cache como fallback (usuários antigos)
    privacySettings: backendUser.privacySettings ?? cached?.privacySettings ?? {
      showOnRanking: false,
      showInstagram: false,
      anonymousMode: false,
    },
    impactPreferences: cached?.impactPreferences,
    entityId: cached?.entityId,
    beneficiaryId: cached?.beneficiaryId,
  };
}

function persistSession(user: User): void {
  storage.set(SESSION_KEY, user);
  const users = storage.get<User[]>(USERS_DB_KEY, []);
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx !== -1) {
    users[idx] = user;
  } else {
    users.push(user);
  }
  storage.set(USERS_DB_KEY, users);
}

export const authService = {
  // ─── Autenticação real (com fallback mock só em DEV + API inalcançável) ────

  signInWithEmail: async (email: string, password: string): Promise<User> => {
    try {
      const { user, token } = await authApi.login(email, password);
      await setToken(token);
      const mapped = mapBackendUser(user);
      persistSession(mapped);
      return mapped;
    } catch (err) {
      if (err instanceof ApiError) {
        throw new AuthError(
          err.code === 'account_unavailable' ? 'account_suspended' : 'invalid_credentials',
          err.message
        );
      }
      if (err instanceof ApiNetworkError && isDevFallbackAllowed()) {
        console.warn('[AUTH FALLBACK - DEV ONLY] API indisponível, usando login mock local.', err);
        return mockAuthProvider.signInWithEmail(email, password);
      }
      throw new AuthError('network_error', 'Não foi possível conectar ao servidor. Tente novamente.');
    }
  },

  /**
   * Login social real (Google/Facebook/Apple). Recebe o token que o SDK nativo
   * do provedor devolveu, envia ao backend para verificação e persiste a sessão.
   * Sem fallback mock: login social só faz sentido contra a API real.
   */
  signInWithOAuth: async (provider: OAuthProvider, token: string, name?: string): Promise<User> => {
    try {
      const { user, token: jwt } = await authApi.oauth(provider, token, name);
      await setToken(jwt);
      const mapped = mapBackendUser(user);
      persistSession(mapped);
      return mapped;
    } catch (err) {
      if (err instanceof ApiError) {
        throw new AuthError(
          err.code === 'account_unavailable' ? 'account_suspended' : 'invalid_credentials',
          err.message,
        );
      }
      throw new AuthError('network_error', 'Não foi possível conectar ao servidor. Tente novamente.');
    }
  },

  /**
   * Login com Google (simulado, só em DEV — não existe OAuth real no backend).
   */
  signInWithGoogle: (selectedUser: User): Promise<User> =>
    mockAuthProvider.signInWithGoogle(selectedUser),

  /**
   * Retorna usuários mockados ativos para o seletor Google (DEV).
   */
  getActiveMockUsers: (): User[] => mockAuthProvider.getActiveMockUsers(),

  /**
   * Recuperação de senha (mock — backend ainda não tem endpoint de reset).
   * Sempre resolve — nunca revela se o e-mail existe.
   */
  resetPassword: (email: string): Promise<void> => mockAuthProvider.resetPassword(email),

  /**
   * Cadastro de novo usuário. Backend só aceita auto-cadastro de donor/entity;
   * demais roles (ex.: beneficiary, criado por esta tela como placeholder) seguem mock.
   */
  registerUser: async (data: RegisterData): Promise<User> => {
    if (data.role !== 'donor' && data.role !== 'entity') {
      return mockAuthProvider.registerUser(data);
    }

    try {
      const { user, token } = await authApi.register({
        name: data.name,
        email: data.email,
        password: data.password,
        role: data.role,
        phone: data.phone,
      });
      await setToken(token);
      const mapped = mapBackendUser(user);
      persistSession(mapped);
      return mapped;
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      if (err instanceof ApiNetworkError && isDevFallbackAllowed()) {
        console.warn('[AUTH FALLBACK - DEV ONLY] API indisponível, usando cadastro mock local.', err);
        return mockAuthProvider.registerUser(data);
      }
      throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
    }
  },

  // ─── Recuperação de sessão ─────────────────────────────────────────────────

  getCurrentSession: async (): Promise<User | null> => {
    const token = await getToken();
    if (!token) return null;

    try {
      const { user } = await authApi.getMe();
      const mapped = mapBackendUser(user);
      persistSession(mapped);
      return mapped;
    } catch (err) {
      if (err instanceof ApiNetworkError && isDevFallbackAllowed()) {
        console.warn('[AUTH FALLBACK - DEV ONLY] API indisponível, retomando sessão em cache local.', err);
        return storage.get<User | null>(SESSION_KEY, null);
      }
      if (!(err instanceof ApiError)) {
        console.error('[AUTH] Não foi possível verificar a sessão (API inalcançável).', err);
      }
      // Token inválido/expirado (ou API inalcançável fora de DEV) — encerra a sessão.
      await clearToken();
      storage.remove(SESSION_KEY);
      return null;
    }
  },

  logout: async (): Promise<void> => {
    await clearToken();
    storage.remove(SESSION_KEY);
  },

  // ─── Métodos legados — mantidos para compatibilidade com Register.tsx ──────

  /**
   * @deprecated Usado somente por fluxos legados (Register.tsx).
   */
  registerEntity: async (data: Partial<AuthorizingEntity>): Promise<User> => {
    let realUser: User | null = null;
    try {
      const { user, token } = await authApi.register({
        name: data.responsibleName || data.name || 'Entidade',
        email: data.email || '',
        password: '123456',
        role: 'entity',
      });
      await setToken(token);
      realUser = mapBackendUser(user);
      persistSession(realUser);
    } catch (err) {
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      if (!(err instanceof ApiNetworkError) || !isDevFallbackAllowed()) {
        throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
      }
      console.warn('[AUTH FALLBACK - DEV ONLY] API indisponível ao registrar entidade.', err);
    }

    await randomDelay(400, 700);

    // Cria entidade no storage local para o EntityDashboard (ainda não conectado à API real).
    const entities = storage.get<AuthorizingEntity[]>(ENTITIES_KEY, mockEntities);
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
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    entities.push(newEntity);
    storage.set(ENTITIES_KEY, entities);

    if (realUser) {
      const withEntity = { ...realUser, entityId: newEntity.id };
      persistSession(withEntity);
      return withEntity;
    }

    const mockUser = await mockAuthProvider.registerUser({
      name: data.responsibleName || data.name || 'Entidade',
      email: data.email || '',
      password: '123456',
      role: 'entity',
      phone: data.phone,
    });
    return { ...mockUser, entityId: newEntity.id };
  },
};
