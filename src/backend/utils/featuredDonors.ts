import { FEATURED_DONORS_MAX, type CarouselDonor } from '../types/featuredDonors';

export function buildCarouselDonors(
  pool: CarouselDonor[],
  featuredIds: string[],
): CarouselDonor[] {
  const byId = new Map(pool.map((d) => [d.id, d]));
  const result: CarouselDonor[] = [];
  const used = new Set<string>();

  for (const id of featuredIds.slice(0, FEATURED_DONORS_MAX)) {
    const donor = byId.get(id);
    if (donor) {
      result.push(donor);
      used.add(id);
    }
  }

  const autoSorted = [...pool]
    .filter((d) => !used.has(d.id))
    .sort((a, b) => b.totalDonated - a.totalDonated);

  for (const donor of autoSorted) {
    if (result.length >= FEATURED_DONORS_MAX) break;
    result.push(donor);
  }

  return result;
}

export function donorToCarouselEntry(
  u: Record<string, unknown>,
): CarouselDonor | null {
  if (u.role && u.role !== 'donor') return null;
  const privacy = (u.privacySettings ?? {}) as CarouselDonor['privacySettings'];
  if (privacy?.showOnRanking === false) return null;

  const isAnonymous = Boolean(privacy?.anonymousMode);
  return {
    id: String(u.id),
    name: isAnonymous ? 'Doador Anônimo' : String(u.name ?? 'Doador'),
    totalDonated: Number(u.totalDonated ?? 0),
    avatar: isAnonymous ? undefined : String((u.avatar as string) ?? (u.name as string)?.[0] ?? '?'),
    instagram: isAnonymous
      ? undefined
      : (u.instagram as string | undefined) ??
        (privacy?.showInstagram !== false ? (u.email as string) : undefined),
    facebook: isAnonymous ? undefined : (u.facebook as string | undefined),
    isAnonymous,
    privacySettings: privacy ?? {
      showOnRanking: true,
      showInstagram: true,
      anonymousMode: false,
    },
  };
}
