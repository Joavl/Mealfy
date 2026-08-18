import type { GiftCardProvider } from '../types';

export { PROVIDER_LABELS } from '../mockData/giftCardInventory';

/** Provider como o backend representa na API ('99 Mercado' = 'ninetynine'). */
export type BackendGiftCardProvider = 'ifood' | 'ninetynine' | 'carrefour';

const BACKEND_TO_FRONTEND: Record<BackendGiftCardProvider, GiftCardProvider> = {
  ifood: 'ifood',
  ninetynine: '99',
  carrefour: 'carrefour',
};

const FRONTEND_TO_BACKEND: Record<GiftCardProvider, BackendGiftCardProvider> = {
  ifood: 'ifood',
  '99': 'ninetynine',
  carrefour: 'carrefour',
};

export function toFrontendProvider(
  provider: BackendGiftCardProvider | null | undefined
): GiftCardProvider | undefined {
  return provider ? BACKEND_TO_FRONTEND[provider] : undefined;
}

export function toBackendProvider(provider: GiftCardProvider): BackendGiftCardProvider {
  return FRONTEND_TO_BACKEND[provider];
}
