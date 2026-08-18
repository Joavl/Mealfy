import { Router } from 'express';
import { authGuard } from '../../shared/middlewares/authGuard';
import { roleGuard } from '../../shared/middlewares/roleGuard';
import {
  createDonation,
  confirmPaymentMock,
  getDonation,
  cancelDonation,
  getMessageTemplates,
  sendDonationMessage,
  listDonationMessages,
  deleteDonationMessage,
} from './donations.controller';

// Montado em /donations. Tudo exige autenticação.
export const donationsRoutes = Router();

donationsRoutes.use(authGuard);

// Catálogo de mensagens — antes de /:id para não ser lido como id de doação.
donationsRoutes.get('/message-templates', getMessageTemplates);

// Apenas doador cria doação (entidade/admin não doam como doador)
donationsRoutes.post('/', roleGuard('donor'), createDonation);

// Leitura role-aware (doador vê a sua; admin/entidade conforme posse)
donationsRoutes.get('/:id', getDonation);

// Confirmação MOCK (dev/staging) — somente admin (e bloqueada em produção no controller)
donationsRoutes.post('/:id/confirm-payment-mock', roleGuard('admin'), confirmPaymentMock);

// Cancelar (apenas pending_payment) — doador dono ou admin
donationsRoutes.post('/:id/cancel', roleGuard('donor', 'admin'), cancelDonation);

// Mensagens — sem roleGuard de propósito: doador e beneficiário usam as mesmas
// rotas, e o serviço decide o papel pelo vínculo real com a doação (e recusa
// quem não faz parte dela).
donationsRoutes.get('/:id/messages', listDonationMessages);
donationsRoutes.post('/:id/messages', sendDonationMessage);
donationsRoutes.delete('/:id/messages', deleteDonationMessage);
