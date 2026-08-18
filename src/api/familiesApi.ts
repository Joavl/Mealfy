import { apiRequest } from './apiClient';

export const familiesApi = {
  getMapFamilies: (filters?: { state?: string }) => {
    const qs = filters?.state ? `?state=${encodeURIComponent(filters.state)}` : '';
    return apiRequest(`/families/map${qs}`, 'GET');
  },
  getFamilyById: (id: string) => apiRequest(`/families/${id}`, 'GET'),

  /** Lista role-aware: admin/entidade recebem a visão de gestão (toManagedFamily). */
  getManagedFamilies: () => apiRequest('/families', 'GET'),

  // ─── Moderação (admin) — rotas reais do backend ───
  approveFamily: (id: string) => apiRequest(`/families/${id}/approve`, 'POST'),
  rejectFamily: (id: string) => apiRequest(`/families/${id}/reject`, 'POST'),
  blockFamily: (id: string) => apiRequest(`/families/${id}/block`, 'POST'),

  /**
   * Lista de famílias visíveis ao usuário autenticado. É a MESMA rota
   * `GET /families` (role-aware): para doador o backend já devolve só as
   * aprovadas, sem CPF/NIS/endereço completo.
   *
   * Substitui o antigo `getPublicFamilies`, que apontava para `/families/public`
   * — rota inexistente que caía em `/:id` e respondia 404, forçando o app a
   * usar mock. Os filtros são aplicados no cliente porque a rota ainda não
   * aceita query params.
   */
  listFamilies: () => apiRequest<{ families: any[] }>('/families', 'GET'),

  /**
   * Solicitação de apoio do dia. Vale por um ciclo (reset 08h SP) e expira
   * sozinha — a família precisa pedir de novo no dia seguinte para voltar ao
   * mapa. Quem chama é o próprio beneficiário (ou a entidade responsável).
   */
  requestDailySupport: (familyId: string, provider: string) =>
    apiRequest(`/families/${familyId}/request-daily-support`, 'POST', { provider }),
};
