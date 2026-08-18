import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import {
  importGiftCards,
  getStock,
  listGiftCards,
  listBatches,
  invalidateGiftCard,
  listGiftCardOrders,
  retryGiftCardOrder,
  reconcileGiftCardOrders,
} from './giftCards.controller';

// Montado em /admin — somente admin.
export const giftCardsRoutes = Router();

giftCardsRoutes.use(authGuard, roleGuard('admin'));

giftCardsRoutes.post('/gift-cards/import', importGiftCards);
giftCardsRoutes.get('/gift-cards/stock', getStock);
giftCardsRoutes.get('/gift-cards', listGiftCards);
giftCardsRoutes.get('/gift-card-batches', listBatches);
giftCardsRoutes.post('/gift-cards/:id/invalidate', invalidateGiftCard);

// Fase 7 — pendências de emissão (manual_review/failed) e retry manual.
giftCardsRoutes.get('/gift-card-orders', listGiftCardOrders);
// Antes de /:id/retry: /reconcile não é um id de pedido.
giftCardsRoutes.post('/gift-card-orders/reconcile', reconcileGiftCardOrders);
giftCardsRoutes.post('/gift-card-orders/:id/retry', retryGiftCardOrder);
