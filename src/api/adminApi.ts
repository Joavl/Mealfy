import { apiRequest } from './apiClient';

export const adminApi = {
  getPendingEntities: () => apiRequest('/admin/entities/pending', 'GET'),
  approveEntity: (id: string) => apiRequest(`/admin/entities/${id}/approve`, 'PATCH'),
  rejectEntity: (id: string) => apiRequest(`/admin/entities/${id}/reject`, 'PATCH'),
  getFeaturedDonors: () => apiRequest('/admin/featured-donors', 'GET'),
  saveFeaturedDonors: (donorIds: string[]) =>
    apiRequest('/admin/featured-donors', 'PUT', { donorIds }),
  listDonorsForFeatured: () => apiRequest('/admin/donors', 'GET'),
};
