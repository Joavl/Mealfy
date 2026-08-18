import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { maskTail } from '../../shared/utils/mask';
import { createAuditLog } from '../auditLogs/auditLog.service';
import { getCurrentCycleStart } from '../../shared/utils/feedCycle';
import { findRegionByCityState } from '../regions/regions.service';
import { resolveCommunity } from '../regions/communities.service';
import type { UserRole, GiftCardProvider } from '@prisma/client';
import type { CreateFamilyInput, UpdateFamilyInput, ListFamiliesQuery } from './families.validator';

export interface Actor {
  userId: string;
  role: UserRole;
}

const familyInclude = { dependents: true } as const;

/**
 * Liga o texto do cadastro (cidade/UF + comunidade) aos registros oficiais.
 *
 * Sem isto a família ficava com `regionId` nulo e não aparecia no mapa: o
 * cadastro só gravava `city`/`state` como texto, e nada resolvia esse texto
 * para o município do IBGE.
 *
 * Falha em resolver não impede o cadastro — o município pode estar escrito de
 * um jeito que a base não reconhece, e recusar a família por isso seria pior do
 * que cadastrá-la sem posição no mapa.
 */
async function resolveLocation(
  city: string | undefined,
  state: string | undefined,
  community: string | null | undefined,
  neighborhood: string | null | undefined,
): Promise<{ regionId?: string; communityId?: string }> {
  if (!city || !state) return {};

  const region = await findRegionByCityState(city, state);
  if (!region) return {};

  // Em muitos cadastros o nome da comunidade foi digitado no campo de bairro.
  const communityId = await resolveCommunity(region.id, community || neighborhood);
  return { regionId: region.id, ...(communityId ? { communityId } : {}) };
}

/** Resolve a entidade do usuário logado (papel entity). 403 se não houver. */
async function resolveActorEntityId(actor: Actor): Promise<string> {
  const entity = await prisma.entity.findUnique({ where: { userId: actor.userId } });
  if (!entity) throw new AppError('Perfil de entidade não encontrado', 403, 'no_entity_profile');
  return entity.id;
}

/** Carrega a família e garante que o ator (entity) é dono; admin sempre passa. */
async function loadOwnedFamily(actor: Actor, id: string) {
  const family = await prisma.family.findUnique({ where: { id }, include: familyInclude });
  if (!family) throw new AppError('Família não encontrada', 404, 'family_not_found');
  if (actor.role === 'admin') return family;
  if (actor.role === 'entity') {
    const entityId = await resolveActorEntityId(actor);
    if (family.entityId !== entityId) throw new AppError('Acesso negado', 403, 'forbidden');
    return family;
  }
  throw new AppError('Acesso negado', 403, 'forbidden');
}

export async function createFamily(actor: Actor, input: CreateFamilyInput) {
  let entityId: string | null = null;
  if (actor.role === 'entity') entityId = await resolveActorEntityId(actor);
  else if (actor.role === 'admin') entityId = input.entityId ?? null;
  else throw new AppError('Acesso negado', 403, 'forbidden');

  const location = await resolveLocation(
    input.city,
    input.state,
    input.community,
    input.neighborhood,
  );

  const family = await prisma.family.create({
    data: {
      responsibleName: input.responsibleName,
      displayName: input.displayName,
      entityId,
      ...location,
      city: input.city,
      state: input.state.toUpperCase(),
      neighborhood: input.neighborhood,
      community: input.community,
      approximateAddress: input.approximateAddress,
      latitude: input.latitude,
      longitude: input.longitude,
      cpfMasked: maskTail(input.cpf),
      nisMasked: maskTail(input.nis),
      preferredGiftCardProvider: input.preferredGiftCardProvider,
      socialDescription: input.socialDescription,
      verificationStatus: 'manual',
      approvalStatus: 'pending',
      dataSource: 'manual',
      dependents: {
        create: input.dependents.map((d) => ({
          name: d.name,
          age: d.age,
          relationship: d.relationship,
          isEligibleMinor: d.age >= 0 && d.age <= 17,
        })),
      },
    },
    include: familyInclude,
  });

  await createAuditLog({
    actorUserId: actor.userId,
    action: 'create_family',
    entityType: 'family',
    entityId: family.id,
    metadata: { entityId, dependents: input.dependents.length },
  });

  return family;
}

/** Lista respeitando o papel: admin (todas), entity (suas), demais (só aprovadas). */
export async function listFamiliesForActor(actor: Actor, filters: ListFamiliesQuery) {
  const state = filters.state?.toUpperCase();
  if (actor.role === 'admin') {
    return prisma.family.findMany({
      where: { approvalStatus: filters.approvalStatus, state },
      include: familyInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
  if (actor.role === 'entity') {
    const entityId = await resolveActorEntityId(actor);
    return prisma.family.findMany({
      where: { entityId, approvalStatus: filters.approvalStatus, state },
      include: familyInclude,
      orderBy: { createdAt: 'desc' },
    });
  }
  return prisma.family.findMany({
    where: { approvalStatus: 'approved', state },
    include: familyInclude,
    orderBy: { createdAt: 'desc' },
  });
}

/** Leitura por id respeitando o papel; retorna a "view" adequada para serialização. */
export async function getFamilyForActor(actor: Actor, id: string) {
  const family = await prisma.family.findUnique({ where: { id }, include: familyInclude });
  if (!family) throw new AppError('Família não encontrada', 404, 'family_not_found');

  if (actor.role === 'admin') return { family, view: 'managed' as const };
  if (actor.role === 'entity') {
    const entityId = await resolveActorEntityId(actor);
    if (family.entityId !== entityId) throw new AppError('Acesso negado', 403, 'forbidden');
    return { family, view: 'managed' as const };
  }
  // doador/beneficiário só enxergam família aprovada (e sem PII)
  if (family.approvalStatus !== 'approved') {
    throw new AppError('Família não encontrada', 404, 'family_not_found');
  }
  return { family, view: 'donor' as const };
}

export async function updateFamily(actor: Actor, id: string, input: UpdateFamilyInput) {
  const current = await loadOwnedFamily(actor, id);

  // Mudar cidade ou comunidade tem que mover a família no mapa. Os campos
  // podem vir parciais, então a resolução usa o valor novo quando ele veio e o
  // atual quando não veio.
  const location = await resolveLocation(
    input.city ?? current.city,
    input.state ?? current.state,
    input.community !== undefined ? input.community : current.community,
    input.neighborhood !== undefined ? input.neighborhood : current.neighborhood,
  );

  const family = await prisma.family.update({
    where: { id },
    data: { ...input, state: input.state?.toUpperCase(), ...location },
    include: familyInclude,
  });
  await createAuditLog({
    actorUserId: actor.userId,
    action: 'update_family',
    entityType: 'family',
    entityId: id,
  });
  return family;
}

async function loadFamilyOr404(id: string) {
  const family = await prisma.family.findUnique({ where: { id }, include: familyInclude });
  if (!family) throw new AppError('Família não encontrada', 404, 'family_not_found');
  return family;
}

/**
 * Aprova a família. REGRA CRÍTICA: só aprova se houver ao menos um dependente
 * elegível (0–17). NIS/CadÚnico não aprova sozinho — aprovação é sempre manual.
 */
export async function approveFamily(actor: Actor, id: string) {
  const family = await loadFamilyOr404(id);
  const hasEligibleMinor = family.dependents.some((d) => d.isEligibleMinor);
  if (!hasEligibleMinor) {
    throw new AppError(
      'Família precisa de ao menos um dependente de 0 a 17 anos para ser aprovada',
      422,
      'no_eligible_minor',
    );
  }
  const updated = await prisma.family.update({
    where: { id },
    data: { approvalStatus: 'approved' },
    include: familyInclude,
  });
  await createAuditLog({ actorUserId: actor.userId, action: 'approve_family', entityType: 'family', entityId: id });
  return updated;
}

export async function rejectFamily(actor: Actor, id: string, reason?: string) {
  await loadFamilyOr404(id);
  const updated = await prisma.family.update({
    where: { id },
    data: { approvalStatus: 'rejected' },
    include: familyInclude,
  });
  await createAuditLog({ actorUserId: actor.userId, action: 'reject_family', entityType: 'family', entityId: id, metadata: reason ? { reason } : undefined });
  return updated;
}

export async function blockFamily(actor: Actor, id: string, reason?: string) {
  await loadFamilyOr404(id);
  const updated = await prisma.family.update({
    where: { id },
    data: { approvalStatus: 'blocked' },
    include: familyInclude,
  });
  await createAuditLog({ actorUserId: actor.userId, action: 'block_family', entityType: 'family', entityId: id, metadata: reason ? { reason } : undefined });
  return updated;
}

/**
 * Solicitação de apoio do dia. Grava a marca escolhida E o momento do pedido —
 * NÃO libera gift card nem cria doação.
 *
 * O pedido vale por um ciclo (reset 08h SP) e expira sozinho: sem solicitar de
 * novo, a família sai do mapa no dia seguinte. Antes só a marca era gravada, e
 * como ela nunca expirava a solicitação amanhecia feita.
 *
 * Quem pode pedir: o próprio BENEFICIÁRIO da família (é ele quem sabe se precisa
 * hoje), a entidade responsável, ou admin.
 */
export async function requestDailySupport(actor: Actor, id: string, provider: GiftCardProvider) {
  if (actor.role === 'beneficiary') {
    // Vínculo real, nunca id vindo do cliente.
    const own = await prisma.family.findFirst({
      where: { id, beneficiaryUserId: actor.userId },
      select: { id: true, approvalStatus: true },
    });
    if (!own) throw new AppError('Acesso negado', 403, 'forbidden');
    if (own.approvalStatus !== 'approved') {
      throw new AppError(
        'Sua família ainda está em análise. Assim que for aprovada você poderá solicitar.',
        409,
        'family_not_approved',
      );
    }
  } else {
    await loadOwnedFamily(actor, id); // entity dona ou admin; doador => 403
  }

  const family = await prisma.family.update({
    where: { id },
    data: { todayRequestedProvider: provider, supportRequestedAt: new Date() },
    include: familyInclude,
  });
  await createAuditLog({
    actorUserId: actor.userId,
    action: 'request_daily_provider',
    entityType: 'family',
    entityId: id,
    metadata: { provider },
  });
  return family;
}

/**
 * Mapa: famílias aprovadas que PEDIRAM apoio no ciclo atual.
 *
 * O pedido é diário e expira no reset das 08h SP — quem não solicitou hoje não
 * aparece. Isso mantém o mapa como um retrato de quem precisa AGORA, em vez de
 * uma lista acumulada de todo mundo já cadastrado.
 *
 * A localização vem da REGIÃO (município do IBGE), não mais de coordenada
 * digitada no cadastro: é a precisão que interessa e expõe menos a família.
 */
export async function getMapFamilies(filters: { state?: string }) {
  return prisma.family.findMany({
    where: {
      approvalStatus: 'approved',
      supportRequestedAt: { gte: getCurrentCycleStart() },
      state: filters.state?.toUpperCase(),
    },
    // Explícito em vez de espalhar `familyInclude`: o spread alarga
    // `dependents: true` para `boolean` e o Prisma perde a inferência do tipo.
    include: { dependents: true, region: true, communityRef: true },
    orderBy: { supportRequestedAt: 'desc' },
  });
}
