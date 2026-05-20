import type { Family, DonorIndication } from '../types';
import { mockFamilies } from '../mockData/families';
import { storage } from '../utils/storage';
import { randomDelay } from '../utils/delay';
import { normalizeString } from '../utils/normalizeUtils';

import { familiesApi } from '../../api/familiesApi';
import { indicationsApi } from '../../api/indicationsApi';
import { handleApiError } from '../utils/fallback';

const FAMILIES_KEY = 'families_db';
const INDICATIONS_KEY = 'donor_indications_db';

export const familyService = {
  initDB: () => {
    const existing = storage.get<Family[]>(FAMILIES_KEY, null as any);
    // If DB is empty OR the first family is missing the latitude property (meaning it's the old schema)
    if (!existing || (existing.length > 0 && existing[0].latitude === undefined)) {
      storage.set(FAMILIES_KEY, mockFamilies);
    }
  },

  getFamilies: async (filters?: { region?: string; communityId?: string }): Promise<Family[]> => {
    try {
      const apiFamilies = await familiesApi.getPublicFamilies(filters);
      if (apiFamilies) return apiFamilies;
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

  getFamilyById: async (familyId: string): Promise<Family | null> => {
    try {
      const apiFamilies = await familiesApi.getPublicFamilies();
      const apiFamily = apiFamilies?.find((family: Family) => family.id === familyId);
      if (apiFamily) return apiFamily;
    } catch (e) {
      handleApiError(e, 'Get Family by ID');
    }

    await randomDelay();
    familyService.initDB();
    const families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);
    return families.find((family: Family) => family.id === familyId) || null;
  },

  getFamiliesByCommunity: async (communityId: string): Promise<Family[]> => {
    try {
      // O backend /families/public já retorna famílias. 
      // Em uma API real teríamos /families/public?communityId=...
      const apiFamilies = await familiesApi.getPublicFamilies();
      if (apiFamilies) {
        return apiFamilies.filter((f: Family) => f.communityId === communityId);
      }
    } catch (e) {
      handleApiError(e, 'Get Families by Community');
    }

    await randomDelay();
    const families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);
    return families.filter(f => f.communityId === communityId);
  },

  updateFamilyStatus: async (familyId: string, newStatus: 'needs_help' | 'supported'): Promise<Family> => {
    await randomDelay(200, 400); 
    const families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);
    const idx = families.findIndex((f: Family) => f.id === familyId);
    if (idx !== -1) {
      families[idx].supportStatus = newStatus;
      storage.set(FAMILIES_KEY, families);
      return families[idx];
    }
    throw new Error('Family not found');
  },

  buildCreateFamilyPayload: (familyData: Omit<Family, 'id'>) => ({
    representativeName: familyData.representativeName,
    communityId: familyData.communityId,
    neighborhood: familyData.neighborhood || 'Não informado',
    city: familyData.city || 'São Paulo',
    state: familyData.state || 'SP',
    shortAddress: familyData.shortAddress,
    description: familyData.description || 'Cadastro realizado por entidade parceira.',
    childrenCount: Math.max(1, familyData.childrenCount || 1),
    mainNeed: familyData.mainNeed || 'Alimentação Básica',
    latitude: familyData.latitude,
    longitude: familyData.longitude,
    authorizingEntityId: familyData.authorizingEntityId,
    createdByEntityId: familyData.createdByEntityId,
    sourceType: familyData.sourceType,
    sourceLabel: familyData.sourceLabel,
    sourceEntityName: familyData.sourceEntityName,
    status: familyData.status,
    supportStatus: familyData.supportStatus,
  }),

  persistFamilyLocally: (family: Family): void => {
    familyService.initDB();
    const families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);
    const idx = families.findIndex((f) => f.id === family.id);
    if (idx >= 0) {
      families[idx] = family;
    } else {
      families.unshift(family);
    }
    storage.set(FAMILIES_KEY, families);
  },

  familyBelongsToEntity: (family: Family, entityId?: string): boolean => {
    if (!entityId) return false;
    return (
      family.authorizingEntityId === entityId ||
      family.createdByEntityId === entityId
    );
  },

  getFamiliesForEntity: async (entityId: string): Promise<Family[]> => {
    familyService.initDB();
    const local = storage
      .get<Family[]>(FAMILIES_KEY, mockFamilies)
      .filter((f) => familyService.familyBelongsToEntity(f, entityId));

    try {
      const apiFamilies = await familiesApi.getPublicFamilies();
      const fromApi = (apiFamilies || []).filter((f: Family) =>
        familyService.familyBelongsToEntity(f, entityId),
      );
      const byId = new Map<string, Family>();
      [...fromApi, ...local].forEach((f) => byId.set(f.id, f));
      return Array.from(byId.values());
    } catch (e) {
      handleApiError(e, 'Get Entity Families');
    }

    return local;
  },

  addFamily: async (familyData: Omit<Family, 'id'>): Promise<Family> => {
    const payload = familyService.buildCreateFamilyPayload(familyData);

    try {
      const created = await familiesApi.createFamily(payload);
      if (created?.id) {
        const normalized: Family = {
          ...familyData,
          ...created,
          id: created.id,
          authorizingEntityId:
            created.authorizingEntityId ?? familyData.authorizingEntityId,
          createdByEntityId:
            created.createdByEntityId ?? familyData.createdByEntityId,
          communityId: created.communityId ?? familyData.communityId,
          children: familyData.children,
          childrenCount: created.childrenCount ?? familyData.childrenCount,
        };
        familyService.persistFamilyLocally(normalized);
        return normalized;
      }
    } catch (e) {
      handleApiError(e, 'Add Family');
    }

    await randomDelay(300, 600);
    familyService.initDB();
    const families = storage.get<Family[]>(FAMILIES_KEY, mockFamilies);

    const newFamily: Family = {
      ...familyData,
      id: `f-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      authorizingEntityId: familyData.authorizingEntityId ?? familyData.createdByEntityId,
      createdByEntityId: familyData.createdByEntityId ?? familyData.authorizingEntityId,
    };

    families.unshift(newFamily);
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

    // 2. Validar região compatível (se for entidade aprovada)
    if (user.role === 'entity' && user.status === 'approved') {
      const entities = storage.get<any[]>('entities_db', []);
      const entityData = entities.find(e => e.id === user.entityId);
      
      const indRegion = normalizeString(indications[indicationIdx].region);
      const entityRegion = normalizeString(entityData?.region?.split('-')[0]);

      if (entityRegion && !indRegion.includes(entityRegion) && !entityRegion.includes(indRegion)) {
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
      authorizingEntityId: user.entityId,
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
