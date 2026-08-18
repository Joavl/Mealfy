import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import {
  importGiftCardsSchema,
  listGiftCardsQuerySchema,
  invalidateGiftCardSchema,
  listGiftCardOrdersQuerySchema,
  reconcileOrdersSchema,
} from './giftCards.validator';
import * as giftCardsService from './giftCards.service';
import * as giftCardOrdersService from './giftCardOrders.service';
import { reconcileStaleOrders } from './giftCardOrders.reconcile.service';
import { toAdminGiftCard } from './giftCards.dto';
import { retryFulfillment } from '../donations/donationFulfillment.service';

function adminId(req: Request): string {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  return req.auth.userId;
}

export async function importGiftCards(req: Request, res: Response): Promise<Response> {
  const data = importGiftCardsSchema.parse(req.body);
  const summary = await giftCardsService.importGiftCards(adminId(req), data);
  return res.status(201).json(summary);
}

export async function getStock(_req: Request, res: Response): Promise<Response> {
  return res.json({ stock: await giftCardsService.getStock() });
}

export async function listGiftCards(req: Request, res: Response): Promise<Response> {
  const filters = listGiftCardsQuerySchema.parse(req.query);
  const { items, total, page, limit } = await giftCardsService.listGiftCards(filters);
  return res.json({ items: items.map(toAdminGiftCard), total, page, limit });
}

export async function listBatches(_req: Request, res: Response): Promise<Response> {
  return res.json({ batches: await giftCardsService.listBatches() });
}

export async function invalidateGiftCard(req: Request, res: Response): Promise<Response> {
  const { reason } = invalidateGiftCardSchema.parse(req.body ?? {});
  const gc = await giftCardsService.invalidateGiftCard(adminId(req), req.params.id, reason);
  return res.json({ giftCard: toAdminGiftCard(gc) });
}

/** Pendências de emissão pro admin — filtra por status (ex.: manual_review). */
export async function listGiftCardOrders(req: Request, res: Response): Promise<Response> {
  const filters = listGiftCardOrdersQuerySchema.parse(req.query);
  return res.json(await giftCardOrdersService.listOrders(filters));
}

/** Reprocessa uma doação em manual_review — sempre cria uma nova tentativa de emissão. */
export async function retryGiftCardOrder(req: Request, res: Response): Promise<Response> {
  const result = await retryFulfillment(req.params.id, adminId(req));
  return res.json({ outcome: result.outcome, donation: result.donation });
}

/**
 * Reconcilia pedidos presos: conclui os que já têm código e escala (com alerta)
 * os que estouraram a janela. Em produção deve rodar por cron, não à mão.
 */
export async function reconcileGiftCardOrders(req: Request, res: Response): Promise<Response> {
  const { staleMinutes, limit } = reconcileOrdersSchema.parse(req.body ?? {});
  const summary = await reconcileStaleOrders({ staleMinutes, limit });
  return res.json(summary);
}
