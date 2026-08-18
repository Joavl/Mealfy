import type { GiftCardProvider } from '../types';
import { mockGiftCardInventory, PROVIDER_LABELS } from '../mockData/giftCardInventory';
import type { GiftCardInventoryItem } from '../mockData/giftCardInventory';
import { storage } from '../utils/storage';

// ──────────────────────────────────────────────────────────────────────────────
// Serviço de estoque de vale-presente (mock + localStorage).
// Garante código único, sem reuso, e erro amigável quando o estoque acaba.
// ──────────────────────────────────────────────────────────────────────────────

const INVENTORY_KEY = 'giftcard_inventory_v1';

function getInventory(): GiftCardInventoryItem[] {
  return storage.get<GiftCardInventoryItem[]>(INVENTORY_KEY, mockGiftCardInventory);
}

function saveInventory(items: GiftCardInventoryItem[]): void {
  storage.set(INVENTORY_KEY, items);
}

export const giftCardService = {
  /** Garante que o estoque exista no localStorage. */
  initInventory(): void {
    if (!storage.get<GiftCardInventoryItem[] | null>(INVENTORY_KEY, null)) {
      saveInventory(mockGiftCardInventory);
    }
  },

  /** Quantos códigos disponíveis há por provider (para UI/admin). */
  countAvailable(provider: GiftCardProvider): number {
    return getInventory().filter((c) => c.provider === provider && c.status === 'available').length;
  },

  /**
   * Libera o primeiro código disponível do provider, marca como 'used' e o retorna.
   * Nunca retorna código já usado. Lança erro se não houver estoque.
   */
  releaseCode(provider: GiftCardProvider): GiftCardInventoryItem {
    const inventory = getInventory();
    const item = inventory.find((c) => c.provider === provider && c.status === 'available');

    if (!item) {
      throw new Error(`Sem códigos disponíveis para ${PROVIDER_LABELS[provider] || provider}`);
    }

    item.status = 'used';
    saveInventory(inventory);
    return { ...item };
  },
};
