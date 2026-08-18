import type { GiftCardProvider } from '../types';

// ──────────────────────────────────────────────────────────────────────────────
// Banco mockado de códigos de vale-presente pré-comprados.
// Modelo de negócio: a Mealfy mantém um estoque de códigos por parceiro e libera
// 1 código disponível por doação. Cada código só pode ser usado uma vez.
// (Sem integração real com iFood/99/Carrefour neste momento.)
// ──────────────────────────────────────────────────────────────────────────────

export interface GiftCardInventoryItem {
  id: string;
  provider: GiftCardProvider;
  code: string;
  status: 'available' | 'used';
}

/** Rótulos de exibição (UI). Internamente usamos sempre 'ifood' | '99' | 'carrefour'. */
export const PROVIDER_LABELS: Record<GiftCardProvider, string> = {
  ifood: 'iFood',
  '99': '99 Mercado',
  carrefour: 'Carrefour',
};

const make = (provider: GiftCardProvider, prefix: string, codes: string[], usedCount = 0): GiftCardInventoryItem[] =>
  codes.map((code, i) => ({
    id: `${prefix}-${i + 1}`,
    provider,
    code,
    status: i < usedCount ? 'used' : 'available',
  }));

// Estoque inicial. Alguns já marcados como "used" para demonstrar o estado.
export const mockGiftCardInventory: GiftCardInventoryItem[] = [
  ...make('ifood', 'IF', [
    'IFOOD-7Q2M-4810', 'IFOOD-9K3P-2274', 'IFOOD-1B8N-6653', 'IFOOD-5T6V-9920', 'IFOOD-3J7C-1185',
  ], 1),
  ...make('99', 'NN', [
    '99MKT-2D4F-7781', '99MKT-8H1L-3360', '99MKT-6R9X-5012', '99MKT-4P2W-8847',
  ], 1),
  ...make('carrefour', 'CR', [
    'CRFR-5G3K-9018', 'CRFR-1M7Q-4423', 'CRFR-8C2T-6675',
  ], 1),
];
