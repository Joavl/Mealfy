import type { Family, DonorIndication } from '../types';
import { mockFamilies } from '../mockData/families';
import { storage } from '../utils/storage';
import { randomDelay } from '../utils/delay';
import { normalizeString } from '../utils/normalizeUtils';
import { toFrontendProvider, type BackendGiftCardProvider } from '../utils/giftCardProvider';

import { familiesApi } from '../../api/familiesApi';
import { indicationsApi } from '../../api/indicationsApi';
import { handleApiError } from '../utils/fallback';
import { ApiError, ApiNetworkError } from '../../api/apiClient';

const FAMILIES_KEY = 'families_db';
const INDICATIONS_KEY = 'donor_indications_db';
const SEED_VERSION_KEY = 'families_seed_version';
const SEED_VERSION = 3; // bump para re-semear (fonte única SP + RJ com localização segura)

/** Fallback mock só vale em DEV — nunca em build de staging/produção (inclusive o APK). */
function isDevFallbackAllowed(): boolean {
  return import.meta.env.DEV && import.meta.env.VITE_DISABLE_LOCAL_FALLBACK !== 'true';
}

interface BackendDonorFamily {
  id: string;
  displayName: string;
  city: string;
  state: string;
  neighborhood: string | null;
  community: string | null;
  approximateAddress: string | null;
  latitude: number | null;
  longitude: number | null;
  supportStatus: 'needs_help' | 'supported' | 'fed';
  requestedProvider: BackendGiftCardProvider | null;
  childrenCount: number;
  socialDescription: string | null;
  needToday: boolean;
  lastFedAt: string | null;
  lastGiftCardProvider: BackendGiftCardProvider | null;
  lastDonorName: string | null;
  lastDonorInstagram: string | null;
}

/**
 * Backend -> Family do front. Só recebe a "visão doador" (sem PII): nunca
 * inclui CPF/NIS/endereço completo/nomes de dependentes — o backend já garante
 * isso (rotas /families/map e /families/:id servem essa view pra role donor).
 * priorityLevel não existe no backend; aproximado a partir de needToday (sinal
 * real, controlado pela entidade) só para manter a linguagem visual do mapa.
 */
function mapDonorFamily(f: BackendDonorFamily): Family {
  return {
    id: f.id,
    communityId: f.community || f.neighborhood || f.city,
    representativeName: f.displayName,
    neighborhood: f.neighborhood || '',
    city: f.city,
    state: f.state,
    shortAddress: f.approximateAddress || f.neighborhood || '',
    description: f.socialDescription || '',
    childrenCount: f.childrenCount,
    children: [],
    mainNeed: f.socialDescription || 'Apoio alimentar',
    supportStatus: f.supportStatus,
    distanceToUser: '',
    priorityLevel: f.needToday ? 4 : 2,
    latitude: f.latitude ?? 0,
    longitude: f.longitude ?? 0,
    preferredGiftCardProvider: toFrontendProvider(f.requestedProvider),
    lastFedAt: f.lastFedAt ?? undefined,
    lastGiftCardProvider: toFrontendProvider(f.lastGiftCardProvider),
    lastFedByName: f.lastDonorName ?? undefined,
    lastFedByInstagram: f.lastDonorInstagram ?? undefined,
    community: f.community ?? undefined,
    approximateAddress: f.approximateAddress ?? undefined,
    approvalStatus: 'approved', // estas rotas só entregam família já aprovada
  };
}

export const familyService = {
  initDB: () => {
    const existing = storage.get<Family[]>(FAMILIES_KEY, null as any);
    const version = storage.get<number>(SEED_VERSION_KEY, 0);
    // Re-semeia se vazio, schema antigo, ou versão de seed desatualizada.
    // Depois disso o estado (ex.: famílias alimentadas) persiste normalmente.
    if (!existing || (existing.length > 0 && existing[0].latitude === undefined) || version < SEED_VERSION) {
      storage.set(FAMILIES_KEY, mockFamilies);
      storage.set(SEED_VERSION_KEY, SEED_VERSION);
    }
  },

  /**
   * Famílias para o mapa do doador. Backend é a fonte de verdade: já filtra
   * só aprovadas + com coordenadas (GET /families/map). Fallback mock só em
   * DEV e só se a API estiver inalcançável — nunca em produção/staging, e
   * nunca para mascarar uma lista vazia legítima.
   */
  getMapFamilies: async (filters?: { state?: string }): Promise<Family[]> => {
    try {
      const data = await familiesApi.getMapFamilies(filters);
      return (data.families as BackendDonorFamily[]).map(mapDonorFamily);
    } catch (err) {
      if (err instanceof ApiNetworkError && isDevFallbackAllowed()) {
        console.warn('[FAMILIES FALLBACK - DEV ONLY] API indisponível, usando famílias mock locais.', err);
        familyService.initDB();
        const families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);
        return families.filter(f =>
          typeof f.latitude === 'number' &&
          typeof f.longitude === 'number' &&
          f.status !== 'pending' && f.status !== 'rejected' && f.status !== 'suspended'
        );
      }
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw new Error('Não foi possível carregar o mapa. Verifique sua conexão e tente novamente.');
    }
  },

  /**
   * Marca uma família como ALIMENTADA HOJE (fonte de verdade da regra diária).
   * Persiste em families_db: supportStatus 'fed', lastFedAt e metadados do vale.
   * Utilitário único para evitar duplicação entre os fluxos de doação.
   */
  markFamilyFed: async (
    familyId: string,
    meta?: {
      donationId?: string;
      provider?: Family['lastGiftCardProvider'];
      code?: string;
      donorName?: string;
      donorInstagram?: string;
      donorAvatar?: string;
    }
  ): Promise<Family | null> => {
    familyService.initDB();
    const families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);
    const idx = families.findIndex(f => f.id === familyId);
    if (idx === -1) return null;
    families[idx] = {
      ...families[idx],
      supportStatus: 'fed',
      lastFedAt: new Date().toISOString(),
      ...(meta?.donationId ? { lastDonationId: meta.donationId } : {}),
      ...(meta?.provider ? { lastGiftCardProvider: meta.provider } : {}),
      ...(meta?.code ? { lastGiftCardCode: meta.code } : {}),
      ...(meta?.donorName ? { lastFedByName: meta.donorName } : {}),
      ...(meta?.donorInstagram ? { lastFedByInstagram: meta.donorInstagram } : {}),
      ...(meta?.donorAvatar ? { lastFedByAvatar: meta.donorAvatar } : {}),
    };
    storage.set(FAMILIES_KEY, families);
    return families[idx];
  },

  /**
   * Lista de fam\u00edlias. Backend \u00e9 a fonte de verdade (`GET /families`,
   * role-aware). Os filtros s\u00e3o aplicados aqui porque a rota ainda n\u00e3o os
   * aceita como query params.
   */
  getFamilies: async (filters?: { region?: string; communityId?: string }): Promise<Family[]> => {
    try {
      const data = await familiesApi.listFamilies();
      let families = (data.families as BackendDonorFamily[]).map(mapDonorFamily);

      if (filters?.region) {
        const normalize = (v: string) =>
          v.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const query = normalize(filters.region);
        families = families.filter((f) => normalize(f.neighborhood || (f as any).region || '') === query);
      }
      if (filters?.communityId) {
        families = families.filter((f) => f.communityId === filters.communityId);
      }
      return families;
    } catch (e) {
      handleApiError(e, 'Get Families');
    }

    await randomDelay();
    familyService.initDB();
    let families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);

    if (filters?.region) {
      const normalizedQuery = filters.region.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      families = families.filter(f => {
        const fReg = (f.neighborhood || (f as any).region || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return fReg === normalizedQuery;
      });
    }

    if (filters?.communityId) {
      families = families.filter(f => f.communityId === filters.communityId);
    }

    return families;
  },

  getFamiliesByCommunity: async (communityId: string): Promise<Family[]> => {
    try {
      const data = await familiesApi.listFamilies();
      return (data.families as BackendDonorFamily[])
        .map(mapDonorFamily)
        .filter((f) => f.communityId === communityId);
    } catch (e) {
      handleApiError(e, 'Get Families by Community');
    }

    await randomDelay();
    const families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);
    return families.filter(f => f.communityId === communityId);
  },

  /**
   * Ficha de uma família. Backend é a fonte de verdade — para role donor, a
   * rota GET /families/:id já só responde para famílias aprovadas (404 se
   * pending/blocked/rejected) e nunca inclui CPF/NIS/endereço completo.
   */
  getFamilyById: async (id: string): Promise<Family | null> => {
    try {
      const data = await familiesApi.getFamilyById(id);
      return mapDonorFamily(data.family as BackendDonorFamily);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        return null;
      }
      if (err instanceof ApiNetworkError && isDevFallbackAllowed()) {
        console.warn('[FAMILIES FALLBACK - DEV ONLY] API indisponível, usando família mock local.', err);
        await randomDelay(100, 200);
        const families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);
        return families.find(f => f.id === id) || null;
      }
      if (err instanceof ApiError) {
        throw new Error(err.message);
      }
      throw new Error('Não foi possível carregar esta família. Verifique sua conexão e tente novamente.');
    }
  },

  updateFamilyStatus: async (familyId: string, newStatus: 'needs_help' | 'supported'): Promise<Family> => {
    await randomDelay(200, 400); 
    const families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);
    const idx = families.findIndex(f => f.id === familyId);
    if (idx !== -1) {
      families[idx].supportStatus = newStatus;
      storage.set(FAMILIES_KEY, families);
      return families[idx];
    }
    throw new Error('Family not found');
  },

  addFamily: async (familyData: Omit<Family, 'id'>): Promise<Family> => {
    await randomDelay(300, 600);
    const families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);
    
    const newFamily: Family = {
      ...familyData,
      id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`
    };
    
    families.unshift(newFamily); // Add to the beginning
    storage.set(FAMILIES_KEY, families);
    return newFamily;
  },

  addIndication: async (data: Omit<DonorIndication, 'id' | 'status' | 'createdAt'>): Promise<DonorIndication> => {
    try {
      const newIndication = await indicationsApi.createIndication(data);
      if (newIndication) return newIndication;
    } catch (e) {
      handleApiError(e, 'Add Indication');
    }

    await randomDelay(500, 1000);
    const indications = storage.get<DonorIndication[]>(INDICATIONS_KEY, []);
    
    const newIndication: DonorIndication = {
      ...data,
      id: `ind-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    indications.unshift(newIndication);
    storage.set(INDICATIONS_KEY, indications);
    return newIndication;
  },

  getIndications: async (): Promise<DonorIndication[]> => {
    try {
      const apiIndications = await indicationsApi.getIndications();
      if (apiIndications) return apiIndications;
    } catch (e) {
      handleApiError(e, 'Get Indications');
    }

    await randomDelay(200, 400);
    return storage.get<DonorIndication[]>(INDICATIONS_KEY, []);
  },

  updateIndicationStatus: async (id: string, status: 'pending' | 'approved' | 'rejected' | 'converted'): Promise<DonorIndication> => {
    try {
      const updated = await indicationsApi.updateIndicationStatus(id, status);
      if (updated) return updated;
    } catch (e) {
      handleApiError(e, 'Update Indication Status');
    }

    await randomDelay(300, 500);
    const indications = storage.get<DonorIndication[]>(INDICATIONS_KEY, []);
    const idx = indications.findIndex(i => i.id === id);
    if (idx !== -1) {
      indications[idx].status = status;
      storage.set(INDICATIONS_KEY, indications);
      return indications[idx];
    }
    throw new Error('Indicação não encontrada');
  },

  convertIndicationToFamily: async (indicationId: string, user: any, sourceLabel: string): Promise<Family> => {
    try {
      const newFamily = await indicationsApi.convertIndication(indicationId);
      if (newFamily) return newFamily;
    } catch (e) {
      handleApiError(e, 'Convert Indication');
    }

    await randomDelay(800, 1500);
    
    // 1. Validar se a indicação existe e não foi convertida
    const indications = storage.get<DonorIndication[]>(INDICATIONS_KEY, []);
    const indicationIdx = indications.findIndex(i => i.id === indicationId);
    
    if (indicationIdx === -1) {
      throw new Error('Indicação não encontrada.');
    }

    if (indications[indicationIdx].status === 'converted') {
      throw new Error('Esta indicação já foi convertida em beneficiário oficial.');
    }

    // 2. Validar permissões da entidade (status approved)
    if (user.role === 'entity' && user.status !== 'approved') {
      throw new Error('Sua entidade ainda está pendente de aprovação. Somente entidades aprovadas podem validar famílias.');
    }

    // 3. Validar região compatível (se for entidade)
    if (user.role === 'entity') {
      const entities = storage.get<any[]>('entities_db', []);
      const entityData = entities.find(e => e.id === user.entityId);
      
      const indRegion = normalizeString(indications[indicationIdx].region);
      const entityRegion = normalizeString(entityData?.region?.split('-')[0]);

      if (!indRegion.includes(entityRegion) && !entityRegion.includes(indRegion)) {
        throw new Error(`Esta indicação está fora da sua região de atuação (${entityData?.region}).`);
      }
    }

    // 4. Criar a Família Localmente (Fallback)
    const families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);
    const newFamily: Family = {
      id: `f-conv-${Date.now()}`,
      communityId: 'c1',
      representativeName: indications[indicationIdx].representativeName,
      neighborhood: indications[indicationIdx].region,
      city: 'São Paulo',
      state: 'SP',
      shortAddress: indications[indicationIdx].region,
      description: indications[indicationIdx].observation,
      childrenCount: indications[indicationIdx].childrenCount,
      children: [],
      mainNeed: 'Alimentação Básica',
      status: 'approved',
      supportStatus: 'needs_help',
      distanceToUser: '2.5 km',
      priorityLevel: 3,
      latitude: -23.612 + (Math.random() * 0.05),
      longitude: -46.593 + (Math.random() * 0.05),
      createdByEntityId: user.entityId,
      sourceType: 'donor_indication',
      sourceLabel: sourceLabel,
      sourceEntityName: user?.name,
      originalIndicationId: indicationId
    };

    families.unshift(newFamily);
    storage.set(FAMILIES_KEY, families);

    // Marca a indicação como convertida no localStorage
    indications[indicationIdx].status = 'converted';
    storage.set(INDICATIONS_KEY, indications);

    return newFamily;
  }
};
