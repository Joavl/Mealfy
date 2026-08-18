import crypto from 'crypto';
import { env } from '../../../config/env';
import { AppError } from '../../../shared/errors/AppError';
import type { GiftCardProvider as CardBrand } from '@prisma/client';
import type {
  CheckAvailabilityInput,
  CheckAvailabilityOutput,
  GiftCardCatalogItem,
  GiftCardProvider,
  IssuedGiftCard,
  PurchaseGiftCardInput,
  PurchaseGiftCardOutput,
} from './gift-card-provider';

const BRAND_LABEL: Record<CardBrand, string> = {
  ifood: 'iFood',
  ninetynine: '99 Mercado',
  carrefour: 'Carrefour',
};

interface StubOrder {
  brand: CardBrand;
  amount: number;
  currency: string;
  /** A partir de quando o "fornecedor" considera o código emitido. */
  issuedAfter: number;
}

/**
 * Fornecedor FICTÍCIO **assíncrono** — existe para exercitar o caminho que um
 * fornecedor real (iFood, reseller) vai usar: aceita o pedido primeiro e só
 * entrega o código depois.
 *
 * Serve para validar `purchase_pending` → reconciliação → `completePendingOrder`
 * **antes** de existir contrato com fornecedor. Não movimenta nada real e é
 * bloqueado em produção.
 *
 * Estado em memória de propósito: reiniciar o processo perde os pedidos, o que
 * simula bem o cenário de pedido órfão que a reconciliação precisa tratar.
 */
export class StubAsyncGiftCardProvider implements GiftCardProvider {
  readonly name = 'stub' as const;
  private readonly orders = new Map<string, StubOrder>();
  /** Atraso simulado da emissão. 0 = código disponível na consulta seguinte. */
  private readonly issueDelayMs: number;

  constructor(issueDelayMs = 0) {
    if (env.NODE_ENV === 'production') {
      throw new AppError(
        'O provider "stub" é fictício e não pode ser usado em produção.',
        500,
        'stub_provider_in_production',
      );
    }
    this.issueDelayMs = issueDelayMs;
  }

  async getCatalog(): Promise<GiftCardCatalogItem[]> {
    return (Object.keys(BRAND_LABEL) as CardBrand[]).map((provider) => ({
      provider,
      label: BRAND_LABEL[provider],
      available: true,
    }));
  }

  async getProductsByProvider(provider: CardBrand): Promise<GiftCardCatalogItem[]> {
    return [{ provider, label: BRAND_LABEL[provider], available: true }];
  }

  /** Fornecedor por API não tem estoque local — está sempre disponível. */
  async checkAvailability(_input: CheckAvailabilityInput): Promise<CheckAvailabilityOutput> {
    return { available: true };
  }

  async purchaseGiftCard(input: PurchaseGiftCardInput): Promise<PurchaseGiftCardOutput> {
    const externalOrderId = `stub_${crypto.randomUUID()}`;
    this.orders.set(externalOrderId, {
      brand: input.provider,
      amount: input.amount,
      currency: input.currency,
      issuedAfter: Date.now() + this.issueDelayMs,
    });
    // Sempre assíncrono: é justamente o caminho que se quer exercitar.
    return {
      status: 'pending',
      externalOrderId,
      provider: input.provider,
      amount: input.amount,
      currency: input.currency,
    };
  }

  async getOrderStatus(externalOrderId: string): Promise<string | null> {
    const order = this.orders.get(externalOrderId);
    if (!order) return null;
    return Date.now() >= order.issuedAfter ? 'issued' : 'pending';
  }

  async fetchIssuedOrder(externalOrderId: string): Promise<IssuedGiftCard | null> {
    const order = this.orders.get(externalOrderId);
    if (!order) return null;
    if (Date.now() < order.issuedAfter) return null; // fornecedor ainda não emitiu

    return {
      externalOrderId,
      provider: order.brand,
      brand: BRAND_LABEL[order.brand],
      amount: order.amount,
      currency: order.currency,
      // Prefixo STUB deixa óbvio que não é código real se vazar para algum log.
      code: `STUB-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      instructions: 'Código fictício (provider stub) — não resgatável.',
    };
  }
}
