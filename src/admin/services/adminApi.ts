import { apiRequest } from '../../api/apiClient';

export const adminApi = {
  // Retorna os dados agregados para a dashboard (KPIs)
  getOverview: () => apiRequest('/admin/overview', 'GET'),
  
  // Moderação de entidades parceiras (ONGS)
  getPendingEntities: () => apiRequest('/admin/entities/pending', 'GET'),
  approveEntity: (id: string) => apiRequest(`/admin/entities/${id}/approve`, 'PATCH'),
  rejectEntity: (id: string, reason: string) => apiRequest(`/admin/entities/${id}/reject`, 'PATCH', { reason }),

  // Logs de auditoria administrativa
  getAuditLogs: (page = 1, limit = 20) => apiRequest(`/admin/audit-logs?page=${page}&limit=${limit}`, 'GET'),
};
export default adminApi;
