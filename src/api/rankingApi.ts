import { apiRequest } from './apiClient';

// Contrato REAL do backend (montado em /ranking):
//   GET /ranking      → { donors: [...] }  (público — carrossel de stories)
//   GET /ranking/me   → { rankingPosition, rankingPercentile, totalDonated (CENTAVOS), supportsCount }
export const rankingApi = {
  getRanking: () => apiRequest('/ranking', 'GET'),
  getMyRanking: () => apiRequest('/ranking/me', 'GET'),
};
