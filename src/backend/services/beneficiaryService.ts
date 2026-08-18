import type { Family } from '../types';
import { storage } from '../utils/storage';
import { randomDelay } from '../utils/delay';
import { isBeneficiaryEligible } from '../utils/timeUtils';

const FAMILIES_KEY = 'families_db';

export const beneficiaryService = {
  validateBeneficiary: (family: Omit<Family, 'id'>): { valid: boolean; error?: string } => {
    // Rules: children 3-17 or PWD
    const hasEligibleChild = family.children.some(c => (c.age >= 3 && c.age <= 17) || c.isPWD);
    if (!hasEligibleChild) {
      return { valid: false, error: "A família deve ter pelo menos uma criança entre 3 e 17 anos ou uma pessoa com deficiência." };
    }
    return { valid: true };
  },

  markAsFed: async (familyId: string): Promise<void> => {
    await randomDelay(100, 300);
    const families = storage.get<Family[]>(FAMILIES_KEY, []);
    const idx = families.findIndex(f => f.id === familyId);
    if (idx !== -1) {
      families[idx].lastFedAt = new Date().toISOString();
      families[idx].supportStatus = 'fed';
      storage.set(FAMILIES_KEY, families);
    }
  },

  getEligibleBeneficiaries: async (): Promise<Family[]> => {
    const families = storage.get<Family[]>(FAMILIES_KEY, []);
    return families.filter(f => isBeneficiaryEligible(f));
  }
};
