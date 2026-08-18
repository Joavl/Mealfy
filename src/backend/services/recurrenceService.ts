import type { Recurrence } from '../types';
import { storage } from '../utils/storage';
import { randomDelay } from '../utils/delay';

const RECURRENCE_KEY = 'recurrences_db';

export const recurrenceService = {
  getUserRecurrence: async (userId: string): Promise<Recurrence | null> => {
    await randomDelay();
    const all = storage.get<Recurrence[]>(RECURRENCE_KEY, []);
    return all.find(r => r.userId === userId) || null;
  },

  createOrUpdateRecurrence: async (payload: Omit<Recurrence, 'id' | 'totalAccumulated' | 'nextBillingDate'>): Promise<Recurrence> => {
    await randomDelay(300, 600);
    const all = storage.get<Recurrence[]>(RECURRENCE_KEY, []);
    let rec = all.find(r => r.userId === payload.userId);

    const nextBilling = new Date();
    if (payload.periodicity === 'daily') nextBilling.setDate(nextBilling.getDate() + 1);
    else if (payload.periodicity === 'weekly') nextBilling.setDate(nextBilling.getDate() + 7);
    else nextBilling.setMonth(nextBilling.getMonth() + 1);

    if (rec) {
      rec = { ...rec, ...payload, nextBillingDate: nextBilling.toISOString() };
      const idx = all.findIndex(r => r.id === rec!.id);
      all[idx] = rec;
    } else {
      rec = {
        ...payload,
        id: `rec-${Date.now()}`,
        nextBillingDate: nextBilling.toISOString(),
        totalAccumulated: 0
      };
      all.push(rec);
    }

    storage.set(RECURRENCE_KEY, all);
    return rec;
  },

  pauseRecurrence: async (id: string): Promise<void> => {
    await randomDelay();
    const all = storage.get<Recurrence[]>(RECURRENCE_KEY, []);
    const idx = all.findIndex(r => r.id === id);
    if (idx !== -1) {
      all[idx].status = 'paused';
      storage.set(RECURRENCE_KEY, all);
    }
  }
};
