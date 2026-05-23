import { apiRequest } from './apiClient';

export const familiesApi = {
  getPublicFamilies: (filters?: { region?: string; communityId?: string }) => {
    let query = '';
    if (filters?.region) query += `region=${encodeURIComponent(filters.region)}&`;
    if (filters?.communityId) query += `communityId=${encodeURIComponent(filters.communityId)}&`;
    return apiRequest(`/families/public${query ? '?' + query : ''}`, 'GET');
  },
  getFamilyById: (id: string) => apiRequest(`/families/${id}`, 'GET'),
  createFamily: (data: any) => apiRequest('/families', 'POST', data),
  updateFamilyStatus: (id: string, data: any) => apiRequest(`/families/${id}/status`, 'PATCH', data),
  getFamiliesAwaitingEntity: (region?: string) =>
    apiRequest(`/families/awaiting-entity${region ? `?region=${encodeURIComponent(region)}` : ''}`, 'GET'),
  assignEntityToFamily: (id: string) => apiRequest(`/families/${id}/assign-entity`, 'PATCH', {}),
};
