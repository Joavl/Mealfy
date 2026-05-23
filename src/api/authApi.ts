import { apiRequest } from './apiClient';

export const authApi = {
  registerDonor: (data: Record<string, unknown>) =>
    apiRequest('/auth/register/donor', 'POST', data),
  registerEntity: (data: Record<string, unknown>) =>
    apiRequest('/auth/register/entity', 'POST', data),
  registerBeneficiary: (data: Record<string, unknown>) =>
    apiRequest<{ user: import('../backend/types').User; family: import('../backend/types').Family; token?: string }>(
      '/auth/register/beneficiary',
      'POST',
      data,
    ),
  loginMock: (email: string, password: string) =>
    apiRequest('/auth/login/mock', 'POST', { email, password }),
  loginFirebase: (idToken: string) =>
    apiRequest<{ token: string; user: import('../backend/types').User }>(
      '/auth/login/firebase',
      'POST',
      { idToken },
    ),
  getMe: () => apiRequest('/auth/me', 'GET'),
};
