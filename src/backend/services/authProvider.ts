import type { User, UserRole } from '../types';
import { mockUsers, mockCredentials, mockEntities, type MockUserCredential } from '../mockData/users';
import { storage } from '../utils/storage';

// ──────────────────────────────────────────────────────────────────────────────
// Chaves de armazenamento local
// ──────────────────────────────────────────────────────────────────────────────
const SESSION_KEY = 'current_user';           // mealfy_current_user  — NUNCA contém senha
const REGISTERED_USERS_KEY = 'registered_users'; // mealfy_registered_users — perfis criados localmente
const MOCK_CREDS_KEY = 'mock_credentials';       // mealfy_mock_credentials — credenciais locais separadas

// ──────────────────────────────────────────────────────────────────────────────
// Tipos de erro padronizados
// ──────────────────────────────────────────────────────────────────────────────
export type AuthErrorCode =
  | 'invalid_credentials'
  | 'admin_blocked'
  | 'account_pending'
  | 'account_suspended'
  | 'provider_unavailable'
  | 'network_error';

export class AuthError extends Error {
  code: AuthErrorCode;
  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = 'AuthError';
  }
}

// ──────────────────────────────────────────────────────────────────────────────
// Dados de registro (sem senha pública)
// ──────────────────────────────────────────────────────────────────────────────
export interface RegisterData {
  name: string;
  email: string;
  password: string;        // armazenado separadamente — nunca no User
  role: UserRole;
  phone?: string;
  entityName?: string;
  cnpj?: string;
  entityType?: string;
  region?: string;
}

// ──────────────────────────────────────────────────────────────────────────────
// Contrato de autenticação
// Toda tela e contexto consomem apenas esta interface.
// TODO: substituir MockAuthProvider por SupabaseAuthProvider
// ──────────────────────────────────────────────────────────────────────────────
export interface AuthProvider {
  signInWithEmail(email: string, password: string): Promise<User>;
  signInWithGoogle(selectedUser: User): Promise<User>;
  signOut(): Promise<void>;
  getCurrentUser(): Promise<User | null>;
  resetPassword(email: string): Promise<void>;
  registerUser(data: RegisterData): Promise<User>;
  getActiveMockUsers(): User[];
}

// ──────────────────────────────────────────────────────────────────────────────
// Utilitários internos
// ──────────────────────────────────────────────────────────────────────────────
const simulateDelay = (min = 600, max = 1000): Promise<void> =>
  new Promise<void>((resolve) => {
    const duration = Math.floor(Math.random() * (max - min + 1)) + min;
    window.setTimeout(resolve, duration);
  });

/** Lê todos os usuários: mockados fixos + registrados localmente (sem duplicar por e-mail) */
function getAllUsers(): User[] {
  const registered = storage.get<User[]>(REGISTERED_USERS_KEY, []);
  const registeredEmails = new Set(registered.map((u) => u.email.toLowerCase()));
  const base = mockUsers.filter((u) => !registeredEmails.has(u.email.toLowerCase()));
  return [...base, ...registered];
}

/** Lê todas as credenciais: fixas + criadas localmente */
function getAllCredentials(): MockUserCredential[] {
  const localCreds = storage.get<MockUserCredential[]>(MOCK_CREDS_KEY, []);
  const localEmails = new Set(localCreds.map((c) => c.email.toLowerCase()));
  const base = mockCredentials.filter((c) => !localEmails.has(c.email.toLowerCase()));
  return [...base, ...localCreds];
}

// ──────────────────────────────────────────────────────────────────────────────
// Implementação mock
// ──────────────────────────────────────────────────────────────────────────────
export class MockAuthProvider implements AuthProvider {
  async signInWithEmail(email: string, password: string): Promise<User> {
    await simulateDelay(600, 1000);

    const normalizedEmail = email.trim().toLowerCase();
    const allCredentials = getAllCredentials();
    const credential = allCredentials.find(
      (c) => c.email.toLowerCase() === normalizedEmail
    );

    if (!credential || credential.password !== password) {
      throw new AuthError('invalid_credentials', 'E-mail ou senha incorretos.');
    }

    const allUsers = getAllUsers();
    const user = allUsers.find((u) => u.id === credential.userId);

    if (!user) {
      throw new AuthError('invalid_credentials', 'E-mail ou senha incorretos.');
    }

    if (user.status === 'pending') {
      throw new AuthError('account_pending', 'Sua conta ainda está em análise.');
    }

    if (user.status === 'suspended' || user.status === 'rejected') {
      throw new AuthError('account_suspended', 'Sua conta foi suspensa. Contate o suporte.');
    }

    // Salva a sessão sem senha
    storage.set(SESSION_KEY, user);
    return user;
  }

  async signInWithGoogle(selectedUser: User): Promise<User> {
    await simulateDelay(600, 900);

    if (selectedUser.role === 'admin') {
      throw new AuthError('admin_blocked', 'Esta conta não possui acesso ao aplicativo Mealfy.');
    }

    storage.set(SESSION_KEY, selectedUser);
    return selectedUser;
  }

  async signOut(): Promise<void> {
    await simulateDelay(200, 400);
    storage.remove(SESSION_KEY);
  }

  async getCurrentUser(): Promise<User | null> {
    // Pequeno delay para simular verificação de sessão
    await simulateDelay(100, 300);
    const user = storage.get<User | null>(SESSION_KEY, null);
    if (!user) return null;

    // Verifica se o usuário ainda existe (pode ter sido removido)
    const allUsers = getAllUsers();
    const stillExists = allUsers.find((u) => u.id === user.id);
    if (!stillExists) {
      storage.remove(SESSION_KEY);
      return null;
    }

    return user;
  }

  async resetPassword(_email: string): Promise<void> {
    // Sempre resolve com sucesso — nunca revelamos se o e-mail existe ou não
    await simulateDelay(800, 1400);
    console.info(`[MockAuth] Password reset requested`);
  }

  async registerUser(data: RegisterData): Promise<User> {
    await simulateDelay(800, 1200);

    const normalizedEmail = data.email.trim().toLowerCase();

    // Verificar duplicidade
    const allCredentials = getAllCredentials();
    if (allCredentials.some((c) => c.email.toLowerCase() === normalizedEmail)) {
      throw new AuthError('invalid_credentials', 'Este e-mail já está cadastrado.');
    }

    // Determinar status inicial conforme regra de negócio:
    // donor → active; entity/beneficiary → pending (aguardam aprovação)
    const status = data.role === 'donor' ? 'active' : 'pending';

    const newUser: User = {
      id: `u-local-${Date.now()}`,
      name: data.name,
      email: normalizedEmail,
      role: data.role,
      phone: data.phone,
      totalDonated: 0,
      rankingPosition: 0,
      rankingPercentile: '',
      status,
      privacySettings: { showOnRanking: true, showInstagram: true, anonymousMode: false },
    };

    // Armazenar perfil e credencial separadamente
    const registered = storage.get<User[]>(REGISTERED_USERS_KEY, []);
    registered.push(newUser);
    storage.set(REGISTERED_USERS_KEY, registered);

    const localCreds = storage.get<MockUserCredential[]>(MOCK_CREDS_KEY, []);
    localCreds.push({ userId: newUser.id, email: normalizedEmail, password: data.password });
    storage.set(MOCK_CREDS_KEY, localCreds);

    return newUser;
  }

  /** Retorna contas disponíveis para o seletor do modal Google (DEV) */
  getActiveMockUsers(): User[] {
    return mockUsers.filter((u) => u.role !== 'admin' && u.status === 'active');
  }
}

// Instância singleton exportada — TODO: substituir por SupabaseAuthProvider
export const mockAuthProvider = new MockAuthProvider();

// Tipos de entidade re-exportados para uso em Register.tsx via authService
export type { MockUserCredential };
export { mockEntities };
