import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { resolveTemplate } from './messages.templates';
import type { Actor } from './donations.service';
import type { DonationMessageAuthor } from '@prisma/client';

/**
 * Mensagens em torno de uma doação — doador e beneficiário podem enviar uma
 * cada, sempre a partir de uma lista fixa.
 *
 * Toda a autorização é resolvida no servidor a partir do usuário autenticado:
 * quem envia nunca informa em nome de quem está falando.
 */

/**
 * Descobre o papel de quem está enviando NESTA doação e recusa quem não faz
 * parte dela. Admin não envia — ele não é parte da relação.
 */
async function resolveAuthor(actor: Actor, donationId: string): Promise<{
  author: DonationMessageAuthor;
  donation: { id: string; status: string; donorId: string; familyId: string };
}> {
  const donation = await prisma.donation.findUnique({
    where: { id: donationId },
    select: { id: true, status: true, donorId: true, familyId: true },
  });
  if (!donation) throw new AppError('Doação não encontrada', 404, 'donation_not_found');

  if (actor.role === 'donor') {
    if (donation.donorId !== actor.userId) {
      throw new AppError('Acesso negado', 403, 'forbidden');
    }
    return { author: 'donor', donation };
  }

  if (actor.role === 'beneficiary') {
    // O vínculo real é families.beneficiaryUserId — nunca um id vindo do cliente.
    const family = await prisma.family.findFirst({
      where: { id: donation.familyId, beneficiaryUserId: actor.userId },
      select: { id: true },
    });
    if (!family) throw new AppError('Acesso negado', 403, 'forbidden');

    // O beneficiário só responde depois de ter recebido de fato: antes disso
    // não há o que agradecer, e a doação pode nem se concretizar.
    if (donation.status !== 'completed') {
      throw new AppError(
        'Só é possível responder depois que o apoio for concluído.',
        409,
        'donation_not_completed',
      );
    }
    return { author: 'beneficiary', donation };
  }

  throw new AppError('Apenas doador e beneficiário podem enviar mensagens.', 403, 'forbidden');
}

/** Envia (ou substitui) a mensagem de quem está autenticado nesta doação. */
export async function sendMessage(actor: Actor, donationId: string, templateKey: string) {
  const { author } = await resolveAuthor(actor, donationId);

  // Só chave prevista para o papel de quem envia — é isto que torna texto livre
  // impossível, em vez de depender de filtro de conteúdo.
  const template = resolveTemplate(author, templateKey);
  if (!template) {
    throw new AppError('Mensagem inválida.', 422, 'invalid_message_template');
  }

  // Reenviar troca a escolha em vez de acumular — mantém uma mensagem por lado.
  return prisma.donationMessage.upsert({
    where: { donationId_author: { donationId, author } },
    update: { templateKey: template.key, body: template.body },
    create: { donationId, author, templateKey: template.key, body: template.body },
  });
}

/** Remove a mensagem de quem está autenticado (permite se arrepender). */
export async function deleteMessage(actor: Actor, donationId: string) {
  const { author } = await resolveAuthor(actor, donationId);
  await prisma.donationMessage
    .delete({ where: { donationId_author: { donationId, author } } })
    .catch(() => undefined); // já não existia — idempotente
}

/** Mensagens de uma doação, para quem faz parte dela. */
export async function listMessages(actor: Actor, donationId: string) {
  if (actor.role !== 'admin') {
    await resolveAuthor(actor, donationId);
  }
  return prisma.donationMessage.findMany({
    where: { donationId },
    orderBy: { createdAt: 'asc' },
  });
}
