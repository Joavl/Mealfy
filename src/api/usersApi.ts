import { apiRequest } from './apiClient';

export interface UpdateMeInput {
  name?: string;
  /** Foto de perfil. Aceita URL http(s) ou data URL (foto enviada pelo usuário). */
  avatarUrl?: string | null;
  instagram?: string | null;
  phone?: string | null;
}

export const usersApi = {
  /**
   * Persiste o perfil no backend (PATCH /me). A rota já existia mas o app nunca
   * a chamava — foto, Instagram e telefone ficavam só no localStorage e sumiam
   * ao trocar de aparelho.
   */
  updateMe: (data: UpdateMeInput) => apiRequest('/me', 'PATCH', data),

  updateImpactPreferences: (preferences: any) => apiRequest('/auth/me/preferences', 'PATCH', preferences),
  updatePrivacy: (settings: { showOnRanking?: boolean; showInstagram?: boolean; anonymousMode?: boolean }) =>
    apiRequest('/me/privacy', 'PATCH', settings),
  // DELETE /me — exclusão definitiva da conta (exigência Play Store / LGPD)
  deleteMe: () => apiRequest('/me', 'DELETE'),
};
