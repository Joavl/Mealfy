import { apiRequest } from './apiClient';

// ──────────────────────────────────────────────────────────────────────────────
// Contrato REAL do backend (montado em /admin — somente role admin):
//
//   Entidades (admin.routes):
//     POST /admin/entities/:id/approve   → { entity }   (:id = ID da ENTIDADE)
//     POST /admin/entities/:id/block     → { entity }
//     GET  /admin/audit-logs?limit=N     → { logs }
//
//   Gift cards — operação MANUAL de estoque (giftCards.routes, fulfillment
//   manual do roadmap; a automação futura entra via provider sem mudar a API):
//     POST /admin/gift-cards/import          { provider, batchName, amount, expiresAt?, codes[] }
//     GET  /admin/gift-cards/stock           estoque por provider (available/reserved/used/...)
//     GET  /admin/gift-cards?provider&status&batchId&page&limit
//     GET  /admin/gift-card-batches
//     POST /admin/gift-cards/:id/invalidate  { reason? }
//     GET  /admin/gift-card-orders
//     POST /admin/gift-card-orders/:id/retry
//
// ⚠️ NÃO existem no backend: listar entidades pendentes nem "reject" de entidade
// (o modelo usa approve/block). Os métodos correspondentes ficam MOCK-ONLY abaixo.
// ──────────────────────────────────────────────────────────────────────────────

export interface ImportGiftCardsPayload {
  provider: 'ifood' | 'ninetynine' | 'carrefour';
  batchName: string;
  amount: number; // centavos
  expiresAt?: string;
  codes: string[];
}

export const adminApi = {
  // ─── Entidades ───
  listEntities: () => apiRequest('/admin/entities', 'GET'),
  approveEntity: (entityId: string) => apiRequest(`/admin/entities/${entityId}/approve`, 'POST'),
  blockEntity: (entityId: string) => apiRequest(`/admin/entities/${entityId}/block`, 'POST'),
  getAuditLogs: (limit = 100) => apiRequest(`/admin/audit-logs?limit=${limit}`, 'GET'),

  // ─── Usuários ───
  listUsers: () => apiRequest('/admin/users', 'GET'),

  // ─── Gift cards (estoque manual) ───
  importGiftCards: (payload: ImportGiftCardsPayload) => apiRequest('/admin/gift-cards/import', 'POST', payload),
  getGiftCardStock: () => apiRequest('/admin/gift-cards/stock', 'GET'),
  listGiftCards: (query = '') => apiRequest(`/admin/gift-cards${query}`, 'GET'),
  listGiftCardBatches: () => apiRequest('/admin/gift-card-batches', 'GET'),
  invalidateGiftCard: (id: string, reason?: string) =>
    apiRequest(`/admin/gift-cards/${id}/invalidate`, 'POST', { reason }),
  listGiftCardOrders: () => apiRequest('/admin/gift-card-orders', 'GET'),
  retryGiftCardOrder: (id: string) => apiRequest(`/admin/gift-card-orders/${id}/retry`, 'POST'),

  // ─── MOCK-ONLY (sem rota real no backend — mantidos p/ fallback de dev) ───
  /** MOCK-ONLY: backend não lista entidades pendentes. */
  getPendingEntities: () => apiRequest('/admin/entities/pending', 'GET'),
  /** MOCK-ONLY: backend usa approve/block; não existe reject. */
  rejectEntity: (id: string) => apiRequest(`/admin/entities/${id}/reject`, 'PATCH'),
};
