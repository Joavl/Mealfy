import { env } from '../../../config/env';
import { AppError } from '../../../shared/errors/AppError';
import { ManualInventoryGiftCardProvider } from './manualInventoryProvider';
import { StubAsyncGiftCardProvider } from './stubAsyncProvider';
import type { GiftCardProvider } from './gift-card-provider';
import type {
  GiftCardProvider as CardBrand,
  GiftCardProviderName,
} from '@prisma/client';

export * from './gift-card-provider';

/**
 * Instâncias reaproveitadas por fornecedor (uma por nome, não uma por doação).
 * A criação é preguiçosa: um fornecedor configurado só para uma marca que nunca
 * é usada não derruba o boot — a validação dos NOMES já aconteceu no `env`.
 */
const instances = new Map<GiftCardProviderName, GiftCardProvider>();

function instantiate(name: GiftCardProviderName): GiftCardProvider {
  switch (name) {
    case 'manual_inventory':
      return new ManualInventoryGiftCardProvider();
    // Fictício e assíncrono — só dev/staging. Serve para exercitar o caminho
    // `purchase_pending` antes de existir fornecedor real.
    case 'stub':
      return new StubAsyncGiftCardProvider();
    // Pendência comercial — fornecedor real ainda não escolhido/contratado.
    case 'ifood_card':
    case 'todo_incomm':
    case 'incentive_me':
    case 'ding_connect':
      throw new AppError(
        `GiftCardProvider "${name}" ainda não implementado.`,
        501,
        'gift_card_provider_not_implemented',
      );
    default: {
      // Se um fornecedor novo entrar no enum do Prisma, isto falha na compilação.
      const exhaustive: never = name;
      throw new AppError(
        `GiftCardProvider desconhecido: ${String(exhaustive)}`,
        500,
        'gift_card_provider_unknown',
      );
    }
  }
}

function getProviderByName(name: GiftCardProviderName): GiftCardProvider {
  const cached = instances.get(name);
  if (cached) return cached;
  const created = instantiate(name);
  instances.set(name, created);
  return created;
}

/**
 * Resolve qual fornecedor atende uma MARCA de cartão.
 *
 * Precedência: override por marca (`GIFT_CARD_PROVIDER_BY_BRAND`) > padrão
 * (`GIFT_CARD_PROVIDER`). É isso que permite o modo misto durante a transição —
 * ex.: `ifood` por API do fornecedor enquanto `carrefour` segue em estoque
 * manual — sem que o orquestrador saiba de nada disso.
 */
export function resolveGiftCardProvider(brand: CardBrand): GiftCardProvider {
  const name = env.GIFT_CARD_PROVIDER_BY_BRAND[brand] ?? env.GIFT_CARD_PROVIDER;
  return getProviderByName(name);
}

/** Nome do fornecedor configurado para a marca (sem instanciar). */
export function resolveGiftCardProviderName(brand: CardBrand): GiftCardProviderName {
  return env.GIFT_CARD_PROVIDER_BY_BRAND[brand] ?? env.GIFT_CARD_PROVIDER;
}

/**
 * Providers distintos em uso por todas as marcas — para telas de catálogo/estoque
 * que precisam agregar mais de um fornecedor.
 */
export function activeGiftCardProviders(): GiftCardProvider[] {
  const names = new Set<GiftCardProviderName>([
    env.GIFT_CARD_PROVIDER,
    ...Object.values(env.GIFT_CARD_PROVIDER_BY_BRAND),
  ]);
  return [...names].map(getProviderByName);
}
