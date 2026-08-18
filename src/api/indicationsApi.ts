import { apiRequest } from './apiClient';

export const indicationsApi = {
  createIndication: (data: any) => apiRequest('/indications', 'POST', data),
  getIndications: () => apiRequest('/indications', 'GET'),
  updateIndicationStatus: (id: string, status: string) => apiRequest(`/indications/${id}/status`, 'PATCH', { status }),
  convertIndication: (id: string) => apiRequest(`/indications/${id}/convert`, 'POST'),
};
