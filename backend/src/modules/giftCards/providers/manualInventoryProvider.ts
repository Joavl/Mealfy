import { prisma } from '../../../database/prisma';
import { AppError } from '../../../shared/errors/AppError';
import { decryptGiftCardCode } from '../../../shared/crypto/crypto.service';
import type { GiftCardProvider as CardBrand } from '@prisma/client';
import type {
  GiftCardProvider,
  GiftCardCatalogItem,
  CheckAvailabilityInput,
  CheckAvailabilityOutput,
  PurchaseGiftCardInput,
  PurchaseGiftCardOutput,
} from './gift-card-provider';

const BRANDS: CardBrand[] = ['ifood', 'ninetynine', 'carrefour'];

const BRAND_LABEL: Record<CardBrand, string> = {
  ifood: 'iFood',
  ninetynine: '99 Mercado',
  carrefour: 'Carrefour',
};

/**
 * Fonte de verdade hoje: estoque importado manualmente pelo admin
 * (`POST /admin/gift-cards/import`). Reclama 1 código `available` por
 * doação de forma atômica (`FOR UPDATE SKIP LOCKED`) — dois processos nunca
 * pegam o mesmo código, e um código `used` nunca volta a `available`.
 */
export class ManualInventoryGiftCardProvider implements GiftCardProvider {
  readonly name = 'manual_inventory' as const;

  async getCatalog(): Promise<GiftCardCatalogItem[]> {
    return Promise.all(
      BRANDS.map(async (provider) => {
        const stockCount = await prisma.giftCard.count({ where: { provider, status: 'available' } });
        return { provider, label: BRAND_LABEL[provider], available: stockCount > 0, stockCount };
      }),
    );
  }

  async getProductsByProvider(provider: CardBrand): Promise<GiftCardCatalogItem[]> {
    const catalog = await this.getCatalog();
    return catalog.filter((item) => item.provider === provider);
  }

  async checkAvailability(input: CheckAvailabilityInput): Promise<CheckAvailabilityOutput> {
    const stockCount = await prisma.giftCard.count({
      where: { provider: input.provider, status: 'available' },
    });
    return { available: stockCount > 0, stockCount };
  }

  /** Nunca chamado antes do pagamento confirmado — isso é responsabilidade do orquestrador. */
  async purchaseGiftCard(input: PurchaseGiftCardInput): Promise<PurchaseGiftCardOutput> {
    const rows = await prisma.$queryRaw<
      Array<{ id: string; codeEncrypted: string; amount: number; expiresAt: Date | null }>
    >`
      UPDATE "gift_cards" SET "status" = 'used', "usedAt" = now(),
        "donationId" = ${input.donationId}, "familyId" = ${input.familyId}, "updatedAt" = now()
      WHERE "id" = (
        SELECT "id" FROM "gift_cards"
        WHERE "provider" = ${input.provider}::"GiftCardProvider" AND "status" = 'available'
        ORDER BY "createdAt" ASC LIMIT 1 FOR UPDATE SKIP LOCKED
      )
      RETURNING "id", "codeEncrypted", "amount", "expiresAt";`;

    if (rows.length === 0) {
      throw new AppError(`Sem códigos disponíveis para ${input.provider}.`, 409, 'no_stock');
    }

    const row = rows[0];
    await prisma.giftCardEvent.create({
      data: { giftCardId: row.id, eventType: 'released', donationId: input.donationId },
    });

    // Estoque local é sempre síncrono: o código já existe, nunca fica pendente.
    return {
      status: 'issued',
      externalOrderId: null,
      provider: input.provider,
      brand: BRAND_LABEL[input.provider],
      amount: row.amount,
      currency: input.currency,
      code: decryptGiftCardCode(row.codeEncrypted),
      expiresAt: row.expiresAt ?? undefined,
      existingGiftCardId: row.id,
    };
  }

  async getOrderStatus(_externalOrderId: string): Promise<string | null> {
    // Estoque manual não tem "pedido" externo a consultar.
    return null;
  }

  // cancelOrder não implementado: estoque manual não permite cancelar um
  // código já reclamado (used nunca volta a available pelo fluxo normal).
}
