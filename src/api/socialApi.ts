import { apiRequest } from './apiClient';

export type SocialRedirect = {
  platform: string;
  url: string;
  userId?: string;
  userName?: string;
  source: string;
};

export const socialApi = {
  resolveMealfyFacebook: () => apiRequest<SocialRedirect>('/social/resolve/facebook', 'GET'),
  resolveDonorFacebook: (userId: string) =>
    apiRequest<SocialRedirect>(`/social/resolve/facebook/${userId}`, 'GET'),
};
