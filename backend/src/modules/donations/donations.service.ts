import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { createAuditLog } from '../auditLogs/auditLog.service';
import { wasFedThisCycle, wasRequestedThisCycle } from '../../shared/utils/feedCycle';
import { fulfillPaidDonation } from './donationFulfillment.service';
import { resolveGiftCardProvider } from '../giftCards/providers';
import type { GiftCardProvider, UserRole, Family } from '@prisma/client';
import type { CreateDonationInput } from './donations.validator';

export interface Actor {
  userId: string;
  role: UserRole;
}

type FamilyWithDeps = Family & { dependents: { isEligibleMinor: boolean }[] };

/**
 * Resolve o provider: pedido do dia → preferido → enviado na doação. 422 se nenhum.
 *
 * `todayRequestedProvider` só conta se o pedido for do ciclo ATUAL. Sem essa
 * checagem, a marca de um pedido antigo continuaria valendo indefinidamente —
 * a família receberia hoje o vale que escolheu semanas atrás.
 */
export function resolveDonationProvider(
  family: Pick<Family, 'todayRequestedProvider' | 'preferredGiftCardProvider' | 'supportRequestedAt'>,
  inputProvider?: GiftCardProvider,
): GiftCardProvider {
  const requestedToday = wasRequestedThisCycle(family.supportRequestedAt)
    ? family.todayRequestedProvider
    : null;
  const provider = requestedToday ?? family.preferredGiftCardProvider ?? inputProvider ?? null;
  if (!provider) {
    throw new AppError('Nenhum provider definido para esta família.', 422, 'no_provider');
  }
  return provider;
}

async function loadEligibleFamily(familyId: string): Promise<FamilyWithDeps> {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    include: { dependents: { select: { isEligibleMinor: true } } },
  });
  if (!family) throw new AppError('Família não encontrada', 404, 'family_not_found');
  if (family.approvalStatus !== 'approved') {
    throw new AppError('Família não está aprovada para receber doação.', 422, 'family_not_approved');
  }
  if (!family.dependents.some((d) => d.isEligibleMinor)) {
    throw new AppError('Família sem dependente de 0 a 17 anos.', 422, 'no_eligible_minor');
  }
  return family;
}

/**
 * Cria a intenção de doação (status `pending_payment`). NÃO libera gift card
 * nem marca a família como alimentada — isso só ocorre na confirmação (Fase 4D).
 */
export async function createDonationIntent(donorUserId: string, input: CreateDonationInput) {
  const family = await loadEligibleFamily(input.familyId);

  // Bloqueio diário (autoritativo): 1 doação/família por ciclo (reset 08h SP).
  if (wasFedThisCycle(family.lastFedAt)) {
    throw new AppError('Esta família já foi alimentada hoje. Próxima liberação às 08h.', 409, 'already_fed_today');
  }

  const provider = resolveDonationProvider(family, input.provider);

  // Disponibilidade PERGUNTADA AO FORNECEDOR da marca, não contada na tabela
  // local: um fornecedor por API não tem estoque em `gift_cards` e responderia
  // sempre 0, rejeitando toda doação. Quem sabe medir estoque é cada provider.
  const availability = await resolveGiftCardProvider(provider).checkAvailability({
    provider,
    amount: input.amount,
  });
  if (!availability.available) {
    throw new AppError(`Sem códigos disponíveis para ${provider}.`, 409, 'no_stock');
  }

  const donation = await prisma.donation.create({
    data: {
      donorId: donorUserId,
      familyId: family.id,
      amount: input.amount,
      provider,
      status: 'pending_payment',
    },
  });

  await createAuditLog({
    actorUserId: donorUserId,
    action: 'create_donation',
    entityType: 'donation',
    entityId: donation.id,
    metadata: { familyId: family.id, provider, amount: input.amount },
  });

  return { donation, family };
}

/**
 * Confirmação MOCK de pagamento (dev/staging) — simula o pagamento Pix
 * confirmado e delega ao mesmo orquestrador que o webhook real usa
 * (`donationFulfillment.service.ts`), incluindo a compra/emissão do gift
 * card via `GiftCardProvider`. Só confirma doações `pending_payment`.
 */
export async function confirmDonationPaymentMock(adminUserId: string, donationId: string) {
  const donation = await prisma.donation.findUnique({ where: { id: donationId } });
  if (!donation) throw new AppError('Doação não encontrada', 404, 'donation_not_found');
  if (donation.status !== 'pending_payment') {
    throw new AppError(
      `Só é possível confirmar doações com pagamento pendente (status atual: ${donation.status}).`,
      409,
      'invalid_state',
    );
  }
  const result = await fulfillPaidDonation(donationId, adminUserId);
  await createAuditLog({
    actorUserId: adminUserId,
    action: 'confirm_payment_mock',
    entityType: 'donation',
    entityId: donationId,
    metadata: { provider: donation.provider, outcome: result.outcome },
  });
  return result;
}

export async function cancelDonation(actor: Actor, donationId: string) {
  const donation = await prisma.donation.findUnique({ where: { id: donationId } });
  if (!donation) throw new AppError('Doação não encontrada', 404, 'donation_not_found');
  if (actor.role === 'donor' && donation.donorId !== actor.userId) {
    throw new AppError('Acesso negado', 403, 'forbidden');
  }
  if (donation.status !== 'pending_payment') {
    throw new AppError(
      `Só é possível cancelar doações com pagamento pendente (status atual: ${donation.status}).`,
      409,
      'cannot_cancel',
    );
  }
  const updated = await prisma.donation.update({
    where: { id: donationId },
    data: { status: 'canceled', canceledAt: new Date() },
  });
  await createAuditLog({
    actorUserId: actor.userId,
    action: 'cancel_donation',
    entityType: 'donation',
    entityId: donationId,
  });
  return updated;
}

// ── Leituras ────────────────────────────────────────────────────────────────

export async function getDonationForActor(actor: Actor, donationId: string) {
  const donation = await prisma.donation.findUnique({ where: { id: donationId } });
  if (!donation) throw new AppError('Doação não encontrada', 404, 'donation_not_found');

  const family = await prisma.family.findUnique({
    where: { id: donation.familyId },
    select: { id: true, displayName: true, city: true, state: true, entityId: true },
  });

  if (actor.role === 'admin') return { donation, family, view: 'admin' as const };
  if (actor.role === 'donor') {
    if (donation.donorId !== actor.userId) throw new AppError('Acesso negado', 403, 'forbidden');
    return { donation, family, view: 'donor' as const };
  }
  if (actor.role === 'entity') {
    const entity = await prisma.entity.findUnique({ where: { userId: actor.userId } });
    if (!entity || family?.entityId !== entity.id) throw new AppError('Acesso negado', 403, 'forbidden');
    return { donation, family, view: 'admin' as const };
  }
  throw new AppError('Acesso negado', 403, 'forbidden');
}

export async function listMyDonations(donorUserId: string) {
  const donations = await prisma.donation.findMany({
    where: { donorId: donorUserId },
    orderBy: { createdAt: 'desc' },
    // Traz as mensagens junto: o doador vê a que enviou e a resposta da família
    // no próprio histórico, sem uma chamada por doação.
    include: { messages: true },
  });
  const familyIds = [...new Set(donations.map((d) => d.familyId))];
  const families = await prisma.family.findMany({
    where: { id: { in: familyIds } },
    select: { id: true, displayName: true, city: true, state: true },
  });
  const byId = new Map(families.map((f) => [f.id, f]));
  return donations.map((d) => ({ donation: d, family: byId.get(d.familyId) }));
}

export async function listFamilyDonations(actor: Actor, familyId: string) {
  const family = await prisma.family.findUnique({
    where: { id: familyId },
    select: { id: true, displayName: true, city: true, state: true, entityId: true },
  });
  if (!family) throw new AppError('Família não encontrada', 404, 'family_not_found');
  if (actor.role === 'entity') {
    const entity = await prisma.entity.findUnique({ where: { userId: actor.userId } });
    if (!entity || family.entityId !== entity.id) throw new AppError('Acesso negado', 403, 'forbidden');
  } else if (actor.role !== 'admin') {
    throw new AppError('Acesso negado', 403, 'forbidden');
  }
  const donations = await prisma.donation.findMany({
    where: { familyId },
    orderBy: { createdAt: 'desc' },
  });
  return { family, donations };
}
