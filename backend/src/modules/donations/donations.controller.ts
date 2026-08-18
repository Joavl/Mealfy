import type { Request, Response } from 'express';
import { AppError } from '../../shared/errors/AppError';
import { env } from '../../config/env';
import { createDonationSchema } from './donations.validator';
import * as donationsService from './donations.service';
import { toDonorDonation, toAdminDonation } from './donations.dto';
import * as paymentsService from '../payments/payments.service';
import { toPaymentDto } from '../payments/payments.dto';
import * as messagesService from './messages.service';
import { allTemplates } from './messages.templates';
import { z } from 'zod';

function actorOf(req: Request) {
  if (!req.auth) throw new AppError('Não autenticado', 401, 'unauthenticated');
  return { userId: req.auth.userId, role: req.auth.role };
}

export async function createDonation(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const data = createDonationSchema.parse(req.body);
  const { donation, family } = await donationsService.createDonationIntent(actor.userId, data);

  if (data.paymentMethod === 'card') {
    // Google Pay/Apple Pay: o app confirma no dispositivo com o clientSecret.
    // O vale só é liberado quando o webhook confirmar (igual ao Pix).
    const { payment, clientSecret } = await paymentsService.createCardChargeForDonation(
      donation.id,
      donation.amount,
    );
    return res.status(201).json({
      donation: toDonorDonation(donation, family, actor.userId),
      payment: toPaymentDto(payment),
      clientSecret,
      message: 'Doação criada. Confirme o pagamento para liberar o apoio à família.',
    });
  }

  const payment = await paymentsService.createPixChargeForDonation(donation.id, donation.amount);
  return res.status(201).json({
    donation: toDonorDonation(donation, family, actor.userId),
    payment: toPaymentDto(payment),
    message: 'Doação criada. Pague o Pix para liberar o apoio à família.',
  });
}

export async function getDonation(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const { donation, family, view } = await donationsService.getDonationForActor(actor, req.params.id);
  const dto = view === 'donor'
    ? toDonorDonation(donation, family, actor.userId)
    : toAdminDonation(donation, family);
  return res.json({ donation: dto });
}

export async function listMyDonations(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const items = await donationsService.listMyDonations(actor.userId);
  return res.json({
    donations: items.map(({ donation, family }) => toDonorDonation(donation, family, actor.userId)),
  });
}

export async function listFamilyDonations(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const { family, donations } = await donationsService.listFamilyDonations(actor, req.params.id);
  return res.json({
    family: { id: family.id, displayName: family.displayName },
    donations: donations.map((d) => toAdminDonation(d, family)),
  });
}

/**
 * Confirmação MOCK (dev/staging) — admin only e BLOQUEADA em produção.
 * O Pix real (webhook) chega na Fase 5.
 */
export async function confirmPaymentMock(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  if (env.NODE_ENV === 'production') {
    throw new AppError('Confirmação mock indisponível em produção.', 403, 'mock_disabled_in_prod');
  }
  const { donation, family, outcome } = await donationsService.confirmDonationPaymentMock(actor.userId, req.params.id);
  const message =
    outcome === 'completed'
      ? 'Pagamento confirmado (mock). Gift card liberado para a família.'
      : outcome === 'manual_review'
        ? 'Pagamento confirmado (mock). Emissão do gift card pendente de revisão manual.'
        : 'Pagamento já estava confirmado para esta doação.';
  return res.json({ donation: toAdminDonation(donation, family), message });
}

export async function cancelDonation(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const donation = await donationsService.cancelDonation(actor, req.params.id);
  return res.json({ donation: toAdminDonation(donation), message: 'Doação cancelada.' });
}

// ─── Mensagens da doação ────────────────────────────────────────────────────

const sendMessageSchema = z.object({ templateKey: z.string().min(1) });

/**
 * Catálogo de mensagens. Público (não expõe nada sensível) e é a fonte única:
 * o app consome daqui em vez de manter uma cópia que sairia do ar na primeira
 * correção de redação.
 */
export async function getMessageTemplates(_req: Request, res: Response): Promise<Response> {
  return res.json({ templates: allTemplates() });
}

export async function sendDonationMessage(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const { templateKey } = sendMessageSchema.parse(req.body);
  // O papel (doador ou beneficiário) é resolvido no servidor pelo vínculo real
  // com a doação — o cliente não escolhe em nome de quem fala.
  const message = await messagesService.sendMessage(actor, req.params.id, templateKey);
  return res.status(201).json({ message });
}

export async function listDonationMessages(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  const messages = await messagesService.listMessages(actor, req.params.id);
  return res.json({ messages });
}

export async function deleteDonationMessage(req: Request, res: Response): Promise<Response> {
  const actor = actorOf(req);
  await messagesService.deleteMessage(actor, req.params.id);
  return res.json({ message: 'Mensagem removida.' });
}
