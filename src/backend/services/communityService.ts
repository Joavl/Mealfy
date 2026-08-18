import type { Community } from '../types';
import { mockCommunities } from '../mockData/communities';
import { storage } from '../utils/storage';
import { regionsApi, type Region } from '../../api/regionsApi';
import { handleApiError } from '../utils/fallback';

const COMMUNITIES_KEY = 'communities_db';

/**
 * Urgência derivada da proporção de famílias pedindo apoio agora.
 * Antes era um campo fixo no mock, sem relação com a realidade.
 */
function urgencyOf(inNeed: number, total: number): Community['urgencyColor'] {
  if (total === 0 || inNeed === 0) return 'success';
  const ratio = inNeed / total;
  if (ratio >= 0.6) return 'error';
  if (ratio >= 0.3) return 'warning';
  return 'success';
}

/**
 * Adapta a região da API ao formato `Community` que as telas já consomem.
 *
 * `description`, `distance` e `imageUrl` não existem no modelo real — eram
 * texto decorativo do mock. Ficam derivados ou vazios em vez de inventados.
 */
function toCommunity(r: Region): Community {
  return {
    id: r.id,
    name: r.name,
    region: r.state,
    description: r.familiesInNeed > 0
      ? `${r.familiesInNeed} família(s) aguardando apoio hoje.`
      : 'Nenhuma família aguardando apoio hoje.',
    distance: '',
    familiesTotal: r.familiesTotal,
    familiesInNeed: r.familiesInNeed,
    priority: r.familiesInNeed > 0 ? 'Apoio necessário hoje' : 'Sem pedidos hoje',
    urgencyColor: urgencyOf(r.familiesInNeed, r.familiesTotal),
  };
}

export const communityService = {
  initDB: () => {
    if (!storage.get(COMMUNITIES_KEY, null)) {
      storage.set(COMMUNITIES_KEY, mockCommunities);
    }
  },

  /**
   * Regiões onde a rede atua. Vem da API (municípios do IBGE com famílias).
   *
   * Antes esta função nunca chamava o backend: devolvia 4 comunidades fixas no
   * código, que não batiam com os dados reais. O doador podia escolher uma
   * região sem nenhuma família cadastrada.
   */
  getCommunities: async (): Promise<Community[]> => {
    try {
      const { regions } = await regionsApi.getRegions();
      // Lista vazia é resposta válida (nenhuma região com família ainda) —
      // tratá-la como falha traria de volta as comunidades fictícias.
      if (Array.isArray(regions)) return regions.map(toCommunity);
    } catch (e) {
      handleApiError(e, 'Get Communities'); // lança em modo API-only
    }

    communityService.initDB();
    return storage.get<Community[]>(COMMUNITIES_KEY, mockCommunities);
  },

  getCommunityById: async (id: string): Promise<Community | undefined> => {
    const communities = await communityService.getCommunities();
    return communities.find((c) => c.id === id);
  },
};
