import type { User, PublicDonorProfile } from '../types';
import { storage } from '../utils/storage';
import { randomDelay } from '../utils/delay';
import { mockDonors } from '../mockData/users';

import { rankingApi } from '../../api/rankingApi';
import { handleApiError } from '../utils/fallback';

// Tamanho estimado da base total de apoiadores — usado apenas para escalar a
// posição/percentil do usuário logado em relação aos doadores públicos mockados.
const TOTAL_DONOR_POOL = 1500;

export const rankingService = {
  getUserRanking: async (userId: string): Promise<Pick<User, 'rankingPosition' | 'rankingPercentile' | 'totalDonated'>> => {
    // ── API real: GET /ranking/me (posição calculada no backend sobre doações completed) ──
    try {
      const res = await rankingApi.getMyRanking();
      if (res && typeof res.rankingPosition === 'number') {
        return {
          rankingPosition: res.rankingPosition,
          rankingPercentile: res.rankingPercentile ?? '',
          // Backend trabalha em centavos; o front exibe em reais.
          totalDonated: (res.totalDonated ?? 0) / 100,
        };
      }
    } catch (e) {
      handleApiError(e, 'Get My Ranking');
    }

    // ── Fallback mock (somente dev, sem backend no ar) ──
    // Atenção: a posição abaixo é DERIVADA DA BASE FICTÍCIA — não é um número
    // real. Só existe para a tela não ficar vazia trabalhando offline; com a
    // API no ar este trecho nunca roda.
    await randomDelay(300, 600);
    const sessionUser = storage.get<User>('current_user', {} as User);
    if (sessionUser && sessionUser.id === userId) {
      // Usuário ainda não fez nenhum apoio: sem posição no ranking.
      if (!sessionUser.totalDonated || sessionUser.totalDonated <= 0) {
        return {
          rankingPosition: 0,
          rankingPercentile: '',
          totalDonated: 0
        };
      }

      const donorTotals = mockDonors.map((d) => d.totalDonated);
      const betterCount = donorTotals.filter((t) => t > sessionUser.totalDonated).length;
      const scale = TOTAL_DONOR_POOL / (donorTotals.length + 1);
      const position = Math.max(1, Math.round(betterCount * scale) + 1);
      const percentile = `Top ${Math.max(1, Math.round((position / TOTAL_DONOR_POOL) * 100))}%`;

      return {
        rankingPosition: position,
        rankingPercentile: percentile,
        totalDonated: sessionUser.totalDonated
      };
    }

    return {
      rankingPosition: 0,
      rankingPercentile: '',
      totalDonated: 0
    };
  },

  getTopDonors: async (): Promise<PublicDonorProfile[]> => {
    try {
      const res = await rankingApi.getRanking();
      // Backend retorna { donors: [...] }
      const donors = res?.donors ?? res;
      // Lista VAZIA é resposta válida (ninguém optou por aparecer ainda) — não é
      // falha. Tratá-la como erro fazia o app exibir doadores fictícios como se
      // fossem reais, que é pior do que mostrar um carrossel vazio.
      if (Array.isArray(donors)) return donors as PublicDonorProfile[];
    } catch (e) {
      handleApiError(e, 'Get Ranking'); // lança em modo API-only
    }

    // DEV fallback — só alcançável se o backend não estiver disponível
    await randomDelay(300, 700);
    return mockDonors.filter((d) => d.privacySettings?.showOnRanking);
  }
};
