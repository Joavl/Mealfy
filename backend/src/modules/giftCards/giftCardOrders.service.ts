import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import type { GiftCardProvider as CardBrand, GiftCardProviderName, GiftCardOrderStatus, Prisma } from '@prisma/client';

export interface CreateOrderInput {
  donationId: string;
  familyId: string;
  provider: CardBrand;
  externalProvider: GiftCardProviderName;
  idempotencyKey: string;
  amount: number;
  currency: string;
  rawRequestMetadata?: Prisma.InputJsonValue;
}

/** Sempre cria uma linha NOVA — uma doação pode ter várias tentativas até `issued`. */
export async function createProcessingOrder(input: CreateOrderInput) {
  return prisma.giftCardOrder.create({
    data: {
      donationId: input.donationId,
      familyId: input.familyId,
      provider: input.provider,
      externalProvider: input.externalProvider,
      idempotencyKey: input.idempotencyKey,
      amount: input.amount,
      currency: input.currency,
      status: 'processing',
      rawRequestMetadata: input.rawRequestMetadata,
    },
  });
}

/**
 * Pedido ACEITO pelo fornecedor, sem código ainda (emissão assíncrona).
 * Mantém `processing` de propósito: é a reconciliação que vai concluir ou
 * escalar. Guarda o `externalOrderId`, que é a única chave para consultar depois.
 */
export async function markOrderAwaitingSupplier(
  orderId: string,
  externalOrderId: string,
  rawResponseMetadata?: Prisma.InputJsonValue,
) {
  return prisma.giftCardOrder.update({
    where: { id: orderId },
    data: { status: 'processing', externalOrderId, rawResponseMetadata },
  });
}

export async function markOrderIssued(
  orderId: string,
  data: { externalOrderId?: string | null; rawResponseMetadata?: Prisma.InputJsonValue },
) {
  return prisma.giftCardOrder.update({
    where: { id: orderId },
    data: {
      status: 'issued',
      externalOrderId: data.externalOrderId ?? null,
      rawResponseMetadata: data.rawResponseMetadata,
    },
  });
}

export async function markOrderManualReview(
  orderId: string,
  failureReason: string,
  rawResponseMetadata?: Prisma.InputJsonValue,
) {
  return prisma.giftCardOrder.update({
    where: { id: orderId },
    data: { status: 'manual_review', failureReason, rawResponseMetadata },
  });
}

export async function getOrderById(id: string) {
  const order = await prisma.giftCardOrder.findUnique({ where: { id } });
  if (!order) throw new AppError('Pedido de gift card não encontrado', 404, 'gift_card_order_not_found');
  return order;
}

export interface ListOrdersFilters {
  status?: GiftCardOrderStatus;
  page: number;
  limit: number;
}

/** Lista pendências de emissão pro admin (ex.: status=manual_review). */
export async function listOrders(filters: ListOrdersFilters) {
  const where = filters.status ? { status: filters.status } : {};
  const [total, items] = await Promise.all([
    prisma.giftCardOrder.count({ where }),
    prisma.giftCardOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (filters.page - 1) * filters.limit,
      take: filters.limit,
    }),
  ]);
  return { items, total, page: filters.page, limit: filters.limit };
}
