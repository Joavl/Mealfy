import type { Family, FamilyDependent, Community } from '@prisma/client';

export type FamilyWithDependents = Family & {
  dependents: FamilyDependent[];
  /// Presente nas consultas do mapa; ausente nas demais.
  communityRef?: Community | null;
};

/**
 * Posição a mostrar no mapa.
 *
 * A família só tem coordenada própria quando alguém a informou, o que é raro e
 * seria expor demais. A posição publicada é a da COMUNIDADE — que é o nível que
 * o doador reconhece e, ao mesmo tempo, o que não entrega o endereço de
 * ninguém. Sem isso, marcador sem coordenada quebrava o mapa.
 */
function mapPosition(f: FamilyWithDependents) {
  return {
    latitude: f.communityRef?.latitude ?? f.latitude,
    longitude: f.communityRef?.longitude ?? f.longitude,
  };
}

const effectiveProvider = (f: Family) => f.todayRequestedProvider ?? f.preferredGiftCardProvider ?? null;
const eligibleMinors = (deps: FamilyDependent[]) => deps.filter((d) => d.isEligibleMinor).length;

/**
 * Visão do DOADOR / mapa público.
 * NUNCA inclui CPF/NIS, endereço completo, nomes de dependentes ou vínculo de entidade.
 * Apenas dados seguros e o suficiente para o impacto.
 */
export function toDonorFamily(f: FamilyWithDependents) {
  return {
    id: f.id,
    displayName: f.displayName,
    city: f.city,
    state: f.state,
    neighborhood: f.neighborhood,
    // O nome resolvido da comunidade quando existe: é ele que dedupe
    // "Heliópolis"/"heliopolis". O texto cru continua como reserva.
    community: f.communityRef?.name ?? f.community,
    /// Se a posição é a da comunidade ou o centro do município — o app não deve
    /// prometer precisão que não tem.
    locationSource: f.communityRef?.source ?? null,
    approximateAddress: f.approximateAddress,
    ...mapPosition(f),
    supportStatus: f.supportStatus,
    requestedProvider: effectiveProvider(f),
    childrenCount: eligibleMinors(f.dependents),
    socialDescription: f.socialDescription,
    needToday: f.needToday,
    lastFedAt: f.lastFedAt,
    lastGiftCardProvider: f.lastGiftCardProvider,
    lastDonorName: f.lastDonorName,
    lastDonorInstagram: f.lastDonorInstagram,
  };
}

/**
 * Visão de ENTIDADE / ADMIN (gestão). CPF/NIS sempre mascarados; endereço
 * completo (criptografado) NUNCA é serializado. Inclui dependentes e status.
 */
export function toManagedFamily(f: FamilyWithDependents) {
  return {
    id: f.id,
    entityId: f.entityId,
    responsibleName: f.responsibleName,
    displayName: f.displayName,
    cpfMasked: f.cpfMasked,
    nisMasked: f.nisMasked,
    city: f.city,
    state: f.state,
    neighborhood: f.neighborhood,
    community: f.community,
    approximateAddress: f.approximateAddress,
    latitude: f.latitude,
    longitude: f.longitude,
    preferredGiftCardProvider: f.preferredGiftCardProvider,
    todayRequestedProvider: f.todayRequestedProvider,
    supportStatus: f.supportStatus,
    approvalStatus: f.approvalStatus,
    verificationStatus: f.verificationStatus,
    dataSource: f.dataSource,
    socialDescription: f.socialDescription,
    needToday: f.needToday,
    lastFedAt: f.lastFedAt,
    dependents: f.dependents.map((d) => ({
      id: d.id,
      name: d.name,
      age: d.age,
      relationship: d.relationship,
      isEligibleMinor: d.isEligibleMinor,
    })),
    createdAt: f.createdAt,
    updatedAt: f.updatedAt,
  };
}
