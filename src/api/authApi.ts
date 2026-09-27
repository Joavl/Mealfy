import { apiRequest } from './apiClient';

export interface BackendPublicUser {
  id: string;
  name: string;
  email: string;
  emailVerifiedAt: string | null;
  role: 'donor' | 'entity' | 'beneficiary' | 'admin';
  avatarUrl: string | null;
  instagram: string | null;
  phone: string | null;
  status: 'active' | 'pending' | 'suspended' | 'blocked';
  privacySettings?: { showOnRanking: boolean; showInstagram: boolean; anonymousMode: boolean };
  createdAt: string;
}

export interface AuthResponse { user: BackendPublicUser; token: string; }
export type OAuthProvider = 'google' | 'facebook' | 'apple';
export type StepUpPurpose = 'view_pix_key' | 'change_pix_key' | 'revoke_pix_key';
export interface StepUpAuthorization { authorizationToken: string; expiresAt: string; purpose: StepUpPurpose; resourceId: string | null; }
export interface OAuthResponse extends AuthResponse { isNew: boolean; }

export const authApi = {
  register: (data: { name: string; email: string; password: string; role: 'donor' | 'entity'; phone?: string }) =>
    apiRequest<AuthResponse>('/auth/register', 'POST', data),
  login: (email: string, password: string) =>
    apiRequest<AuthResponse>('/auth/login', 'POST', { email, password }),
  getMe: () => apiRequest<{ user: BackendPublicUser }>('/me', 'GET'),
  requestEmailVerification: (email: string) =>
    apiRequest<{ message: string }>('/auth/email-verification/request', 'POST', { email }),
  confirmEmailVerification: (token: string) =>
    apiRequest<{ message: string; user: BackendPublicUser }>('/auth/email-verification/confirm', 'POST', { token }),
  createStepUpChallenge: (password: string, purpose: StepUpPurpose, resourceId?: string) =>
    apiRequest<{ challengeId: string; expiresAt: string }>('/auth/step-up/challenges', 'POST', { password, purpose, ...(resourceId ? { resourceId } : {}) }),
  confirmStepUpChallenge: (challengeId: string, code: string, purpose: StepUpPurpose, resourceId?: string) =>
    apiRequest<StepUpAuthorization>('/auth/step-up/confirmations', 'POST', { challengeId, code, purpose, ...(resourceId ? { resourceId } : {}) }),
  validateStepUpAuthorization: (authorizationToken: string, purpose: StepUpPurpose, resourceId?: string) =>
    apiRequest<void>('/auth/step-up/authorizations/validate', 'POST', { authorizationToken, purpose, ...(resourceId ? { resourceId } : {}) }),
  requestPasswordReset: (email: string) =>
    apiRequest<{ message: string }>('/auth/password-reset/request', 'POST', { email }),
  resetPassword: (token: string, password: string) =>
    apiRequest<{ message: string }>('/auth/password-reset/confirm', 'POST', { token, password }),
  oauth: (provider: OAuthProvider, token: string, name?: string) =>
    apiRequest<OAuthResponse>(`/auth/oauth/${provider}`, 'POST', { token, name }),
};
