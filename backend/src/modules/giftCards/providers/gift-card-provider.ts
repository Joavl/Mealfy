import type { GiftCardProvider as CardBrand, GiftCardProviderName } from '@prisma/client';

export type { GiftCardProviderName };

export interface GiftCardCatalogItem {
  provider: CardBrand;
  label: string;
  available: boolean;
  stockCount?: number;
}

export interface CheckAvailabilityInput {
  provider: CardBrand;
  amount: number; // centavos
}

export interface CheckAvailabilityOutput {
  available: boolean;
  stockCount?: number;
}

export interface PurchaseGiftCardInput {
  provider: CardBrand; // marca do cartão (ifood/ninetynine/carrefour)
  amount: number; // centavos
  currency: string; // 'BRL'
  donationId: string;
  familyId: string;
  beneficiaryUserId?: string | null;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
}

/** Gift card com o código EM MÃOS — pronto para ser entregue à família. */
export interface IssuedGiftCard {
  externalOrderId: string | null;
  provider: CardBrand;
  brand: string; // rótulo legível (ex.: "iFood", "99 Mercado", "Carrefour")
  amount: number;
  currency: string;
  code: string; // sempre em texto puro aqui — quem persiste é responsável por cifrar
  pin?: string;
  expiresAt?: Date;
  redeemUrl?: string;
  instructions?: string;
  /** Preenchido SÓ pelo ManualInventoryGiftCardProvider: id do GiftCard já existente que foi reclamado do estoque (available->used). Outros providers deixam undefined — quem orquestra cria um GiftCard novo a partir do código retornado. */
  existingGiftCardId?: string;
  raw?: unknown;
}

/**
 * Pedido ACEITO pelo fornecedor, mas sem código ainda — fornecedores reais
 * costumam emitir de forma assíncrona (o código chega por webhook ou aparece
 * numa consulta posterior a `getOrderStatus`).
 *
 * Neste estado a família **não** é marcada como alimentada e nenhum GiftCard é
 * criado: não existe código para entregar. A conclusão acontece depois, via
 * `completePendingOrder`.
 */
export interface PendingGiftCardOrder {
  /** Obrigatório: é a única chave para reconciliar o pedido depois. */
  externalOrderId: string;
  provider: CardBrand;
  amount: number;
  currency: string;
  raw?: unknown;
}

/**
 * Resultado de uma compra. União discriminada porque os dois casos levam a
 * caminhos totalmente diferentes no orquestrador — o compilador força o
 * tratamento de ambos.
 */
export type PurchaseGiftCardOutput =
  | ({ status: 'issued' } & IssuedGiftCard)
  | ({ status: 'pending' } & PendingGiftCardOrder);

/**
 * Contrato para obter um gift card — de estoque importado manualmente hoje,
 * de um fornecedor externo real no futuro (iFood, Todo/InComm, Incentive.me —
 * pendência comercial, nenhum implementado ainda). Trocar de fornecedor
 * nunca deve exigir mudar `DonationFulfillmentService`.
 *
 * O provider é resolvido **por marca** (ver `resolveGiftCardProvider`), então é
 * possível operar iFood por API e Carrefour por estoque manual ao mesmo tempo —
 * o estado normal durante a transição para um fornecedor real.
 */
export interface GiftCardProvider {
  readonly name: GiftCardProviderName;
  getCatalog(): Promise<GiftCardCatalogItem[]>;
  getProductsByProvider(provider: CardBrand): Promise<GiftCardCatalogItem[]>;
  checkAvailability(input: CheckAvailabilityInput): Promise<CheckAvailabilityOutput>;
  /** Nunca deve ser chamado antes do pagamento estar confirmado. */
  purchaseGiftCard(input: PurchaseGiftCardInput): Promise<PurchaseGiftCardOutput>;
  /**
   * Consulta o pedido no fornecedor. Usada pela reconciliação de pedidos
   * `processing` — inclusive para buscar o código de um pedido assíncrono.
   */
  getOrderStatus(externalOrderId: string): Promise<string | null>;
  /**
   * Opcional: providers assíncronos podem buscar o código de um pedido já
   * aceito. A reconciliação usa isto para concluir um `PendingGiftCardOrder`.
   * Retorna `null` se o fornecedor ainda não emitiu.
   */
  fetchIssuedOrder?(externalOrderId: string): Promise<IssuedGiftCard | null>;
  /** Opcional — só se o fornecedor permitir cancelar um pedido já feito. */
  cancelOrder?(externalOrderId: string): Promise<void>;
}
