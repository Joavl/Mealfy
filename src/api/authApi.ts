import { apiRequest } from './apiClient';

export interface BackendPublicUser {
  id: string;
  name: string;
  email: string;
  role: 'donor' | 'entity' | 'beneficiary' | 'admin';
  avatarUrl: string | null;
  instagram: string | null;
  phone: string | null;
  status: 'active' | 'pending' | 'suspended' | 'blocked';
  privacySettings?: { showOnRanking: boolean; showInstagram: boolean; anonymousMode: boolean };
  createdAt: string;
}

export interface AuthResponse {
  user: BackendPublicUser;
  token: string;
}

export type OAuthProvider = 'google' | 'facebook' | 'apple';

/**
 * Quais logins sociais o servidor tem credencial para atender. Sem isso o app
 * ofereceria botões que falham com 501 — o usuário só descobriria tentando.
 */
export interface AuthProvidersInfo {
  google: { enabled: boolean; clientId: string | null };
  facebook: { enabled: boolean; appId: string | null };
  apple: { enabled: boolean; clientId: string | null };
  govbr: { enabled: boolean; env: string };
}

export interface OAuthResponse extends AuthResponse {
  isNew: boolean;
}

export const authApi = {
  register: (data: {
    name: string;
    email: string;
    password: string;
    role: 'donor' | 'entity';
    /** Coletado no formulário de cadastro; o backend persiste em users.phone. */
    phone?: string;
  }) => apiRequest<AuthResponse>('/auth/register', 'POST', data),

  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login', 'POST', { email, password }),

  getMe: () => apiRequest<{ user: BackendPublicUser }>('/me', 'GET'),

  /**
   * Login social baseado em token. O app nativo obtém o token via SDK do provedor
   * (Google/Apple = ID token; Facebook = access token) e o backend o verifica.
   * `name` só é útil no primeiro login Apple (Apple não reenvia o nome depois).
   */
  oauth: (provider: OAuthProvider, token: string, name?: string) =>
    apiRequest<OAuthResponse>(`/auth/oauth/${provider}`, 'POST', { token, name }),

  /** Provedores sociais realmente configurados no servidor (público). */
  getProviders: () => apiRequest<{ providers: AuthProvidersInfo }>('/auth/providers', 'GET'),
};
