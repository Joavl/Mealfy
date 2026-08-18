import { adminApi } from '../../api/adminApi';
import type { ImportGiftCardsPayload } from '../../api/adminApi';
import { randomDelay } from '../utils/delay';
import { handleApiError } from '../utils/fallback';

export const adminService = {
  getPendingEntities: async () => {
    try {
      const response = await adminApi.getPendingEntities();
      if (response) return response;
    } catch (e) {
      handleApiError(e, 'Get Pending Entities');
    }
    
    await randomDelay(300, 600);
    const users = JSON.parse(localStorage.getItem('users_db') || '[]');
    return users.filter((u: any) => u.role === 'entity' && u.status === 'pending');
  },

  approveEntity: async (userId: string) => {
    try {
      // O backend espera o ID da ENTIDADE (não do usuário) — resolve localmente quando possível.
      const users = JSON.parse(localStorage.getItem('users_db') || '[]');
      const u = users.find((x: any) => x.id === userId);
      await adminApi.approveEntity(u?.entityId || userId);
      return true;
    } catch (e) {
      handleApiError(e, 'Approve Entity');
    }

    await randomDelay(500, 800);
    const USERS_KEY = 'users_db';
    const ENTITIES_KEY = 'entities_db';
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const entities = JSON.parse(localStorage.getItem(ENTITIES_KEY) || '[]');
    
    const uIdx = users.findIndex((u: any) => u.id === userId);
    if (uIdx !== -1) {
      users[uIdx].status = 'approved';
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
      
      const eIdx = entities.findIndex((e: any) => e.id === users[uIdx].entityId);
      if (eIdx !== -1) {
        entities[eIdx].status = 'approved';
        localStorage.setItem(ENTITIES_KEY, JSON.stringify(entities));
      }
    }
    return true;
  },

  rejectEntity: async (userId: string) => {
    try {
      await adminApi.rejectEntity(userId);
      return true;
    } catch (e) {
      handleApiError(e, 'Reject Entity');
    }

    await randomDelay(500, 800);
    const USERS_KEY = 'users_db';
    const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
    const uIdx = users.findIndex((u: any) => u.id === userId);
    if (uIdx !== -1) {
      users[uIdx].status = 'rejected';
      localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    return true;
  },

  // ─── Gift cards — operação MANUAL de estoque (fulfillment manual do roadmap) ───

  /** Estoque por provider (API-first; fallback conta o estoque mock local em dev). */
  getGiftCardStock: async () => {
    try {
      return await adminApi.getGiftCardStock();
    } catch (e) {
      handleApiError(e, 'Gift Card Stock');
    }

    const { giftCardService } = await import('./giftCardService');
    giftCardService.initInventory();
    return {
      ifood: { available: giftCardService.countAvailable('ifood') },
      ninetynine: { available: giftCardService.countAvailable('99' as any) },
      carrefour: { available: giftCardService.countAvailable('carrefour') },
    };
  },

  /**
   * Importa um lote de códigos REAIS. SEM fallback mock: a criptografia
   * AES-256-GCM dos códigos acontece no backend — importar "de mentira"
   * no localStorage criaria códigos inseguros. Sem API, propaga o erro.
   */
  importGiftCards: async (payload: ImportGiftCardsPayload) => {
    try {
      return await adminApi.importGiftCards(payload);
    } catch (e) {
      handleApiError(e, 'Import Gift Cards');
      throw e;
    }
  },

  /** Lista códigos (só codeMasked) com filtros — sem fallback (dados sensíveis). */
  listGiftCards: async (query = '') => {
    try {
      return await adminApi.listGiftCards(query);
    } catch (e) {
      handleApiError(e, 'List Gift Cards');
      throw e;
    }
  },

  /** Invalida um código available/reserved — sem fallback (ação administrativa real). */
  invalidateGiftCard: async (id: string, reason?: string) => {
    try {
      return await adminApi.invalidateGiftCard(id, reason);
    } catch (e) {
      handleApiError(e, 'Invalidate Gift Card');
      throw e;
    }
  },
};
