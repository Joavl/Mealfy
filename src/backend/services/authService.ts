import type { User, UserRole, AuthorizingEntity } from '../types';
import { storage } from '../utils/storage';
import { authApi, type BackendPublicUser, type OAuthProvider } from '../../api/authApi';
import { ApiError } from '../../api/apiClient';
import { getToken, setToken, clearToken } from '../../api/tokenStorage';

export type AuthErrorCode =
  | 'invalid_credentials'
  | 'admin_blocked'
  | 'account_pending'
  | 'account_suspended'
  | 'provider_unavailable'
  | 'network_error';

export class AuthError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  role: UserRole;
  phone?: string;
}

export interface EntityRegistrationData extends Partial<AuthorizingEntity> {
  password: string;
}

const SESSION_KEY = 'current_user';
const USERS_DB_KEY = 'users_db';

// Remove data left by older releases that stored demo credentials in localStorage.
// Authentication itself never reads local credentials or falls back to a mock.
storage.remove('mock_credentials');
storage.remove('registered_users');

function mapBackendStatus(status: BackendPublicUser['status']): User['status'] {
  return status === 'blocked' ? 'suspended' : status;
}

/** The backend is authoritative for identity and account state. */
function mapBackendUser(backendUser: BackendPublicUser): User {
  const sessionCache = storage.get<User | null>(SESSION_KEY, null);
  const cached = sessionCache?.id === backendUser.id
    ? sessionCache
    : storage.get<User[]>(USERS_DB_KEY, []).find((user) => user.id === backendUser.id) || null;

  return {
    id: backendUser.id,
    name: backendUser.name,
    email: backendUser.email,
    emailVerifiedAt: backendUser.emailVerifiedAt,
    role: backendUser.role as UserRole,
    phone: backendUser.phone ?? undefined,
    avatar: backendUser.avatarUrl ?? undefined,
    instagram: backendUser.instagram ?? undefined,
    status: mapBackendStatus(backendUser.status),
    totalDonated: cached?.totalDonated ?? 0,
    rankingPosition: cached?.rankingPosition ?? 0,
    rankingPercentile: cached?.rankingPercentile ?? '',
    savedFamilyIds: cached?.savedFamilyIds,
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

/** Cache contains only non-secret display/profile data; never passwords or credentials. */
function persistSession(user: User): void {
  storage.set(SESSION_KEY, user);
  const users = storage.get<User[]>(USERS_DB_KEY, []);
  const index = users.findIndex((candidate) => candidate.id === user.id);
  if (index === -1) users.push(user);
  else users[index] = user;
  storage.set(USERS_DB_KEY, users);
}

function authCodeFor(err: ApiError): AuthErrorCode {
  if (err.code === 'account_unavailable') return 'account_suspended';
  if (err.status >= 500) return 'provider_unavailable';
  return 'invalid_credentials';
}

export const authService = {
  signInWithEmail: async (email: string, password: string): Promise<User> => {
    try {
      const { user, token } = await authApi.login(email, password);
      await setToken(token);
      const mapped = mapBackendUser(user);
      persistSession(mapped);
      return mapped;
    } catch (err) {
      if (err instanceof ApiError) throw new AuthError(authCodeFor(err), err.message);
      throw new AuthError('network_error', 'Não foi possível conectar ao servidor. Tente novamente.');
    }
  },

  signInWithOAuth: async (provider: OAuthProvider, token: string, name?: string): Promise<User> => {
    try {
      const { user, token: jwt } = await authApi.oauth(provider, token, name);
      await setToken(jwt);
      const mapped = mapBackendUser(user);
      persistSession(mapped);
      return mapped;
    } catch (err) {
      if (err instanceof ApiError) throw new AuthError(authCodeFor(err), err.message);
      throw new AuthError('network_error', 'Não foi possível conectar ao servidor. Tente novamente.');
    }
  },

  requestEmailVerification: async (email: string): Promise<void> => {
    try { await authApi.requestEmailVerification(email); }
    catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
    }
  },

  confirmEmailVerification: async (token: string): Promise<User> => {
    try {
      const { user } = await authApi.confirmEmailVerification(token);
      const mapped = mapBackendUser(user);
      persistSession(mapped);
      return mapped;
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
    }
  },

  /** Always resolves on accepted server response; server never reveals account existence. */
  requestPasswordReset: async (email: string): Promise<void> => {
    try {
      await authApi.requestPasswordReset(email);
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
    }
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    try {
      await authApi.resetPassword(token, password);
    } catch (err) {
      if (err instanceof ApiError) throw new Error(err.message);
      throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
    }
  },

  registerUser: async (data: RegisterData): Promise<User> => {
    if (data.role !== 'donor' && data.role !== 'entity') {
      throw new Error('Contas de beneficiário são criadas e vinculadas por uma entidade parceira.');
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
      if (err instanceof ApiError) throw new Error(err.message);
      throw new Error('Não foi possível conectar ao servidor. Tente novamente.');
    }
  },

  /** Entity registration uses the password chosen in the form; it never creates local credentials. */
  registerEntity: async (data: EntityRegistrationData): Promise<User> => {
    if (!data.password) throw new Error('Informe uma senha para continuar.');
    return authService.registerUser({
      name: data.responsibleName || data.name || 'Entidade',
      email: data.email || '',
      password: data.password,
      role: 'entity',
      phone: data.phone,
    });
  },

  getCurrentSession: async (): Promise<User | null> => {
    if (!(await getToken())) return null;
    try {
      const { user } = await authApi.getMe();
      const mapped = mapBackendUser(user);
      persistSession(mapped);
      return mapped;
    } catch (err) {
      if (!(err instanceof ApiError)) console.error('[AUTH] Não foi possível verificar a sessão.', err);
      await clearToken();
      storage.remove(SESSION_KEY);
      return null;
    }
  },

  logout: async (): Promise<void> => {
    await clearToken();
    storage.remove(SESSION_KEY);
  },
};
