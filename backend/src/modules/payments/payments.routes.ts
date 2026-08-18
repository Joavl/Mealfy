import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import { webhook, simulatePaid, getPayment, expireOverdue } from './payments.controller';

// Montado em /payments.
export const paymentsRoutes = Router();

// Webhook é PÚBLICO (autenticado por assinatura, não por JWT).
paymentsRoutes.post('/webhook', webhook);

// Expira cobranças vencidas (admin) — em produção, via cron.
paymentsRoutes.post('/expire-overdue', authGuard, roleGuard('admin'), expireOverdue);

// Simulação dev/staging — somente admin (bloqueada em produção no controller).
paymentsRoutes.post('/:id/simulate-paid', authGuard, roleGuard('admin'), simulatePaid);

// Consulta de pagamento — doador dono ou admin.
paymentsRoutes.get('/:id', authGuard, getPayment);
