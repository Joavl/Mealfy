import type { DonorIndication } from '../types';
import { storage } from '../utils/storage';
import { randomDelay } from '../utils/delay';

import { indicationsApi } from '../../api/indicationsApi';

const INDICATIONS_KEY = 'donor_indications_db';

export const donorIndicationService = {
  createIndication: async (data: Omit<DonorIndication, 'id' | 'status' | 'createdAt'>): Promise<DonorIndication> => {
    try {
      const response = await indicationsApi.createIndication(data);
      if (response) return response;
    } catch (e) {
      console.warn('Backend Indication failed, falling back to local mock.', e);
    }

    await randomDelay(400, 800);
    const indications = storage.get<DonorIndication[]>(INDICATIONS_KEY, []);
    const newIndication: DonorIndication = {
      ...data,
      id: `ind-${Date.now()}`,
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    indications.push(newIndication);
    storage.set(INDICATIONS_KEY, indications);
    return newIndication;
  },

  getIndicationsByUser: async (userId: string): Promise<DonorIndication[]> => {
    try {
      const allIndications = await indicationsApi.getIndications();
      if (allIndications) {
        return allIndications.filter((i: any) => i.indicatedByUserId === userId);
      }
    } catch (e) {
      console.warn('Backend Get Indications failed, falling back to local mock.', e);
    }

    await randomDelay(300, 500);
    const indications = storage.get<DonorIndication[]>(INDICATIONS_KEY, []);
    return indications.filter(i => i.indicatedByUserId === userId);
  }
};
