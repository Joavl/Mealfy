export const FEATURED_DONORS_MAX = 20;

export function buildCarouselDonors(pool: any[], featuredIds: string[]): any[] {
  const byId = new Map(pool.map((d: any) => [d.id, d]));
  const result: any[] = [];
  const used = new Set<string>();

  for (const id of featuredIds.slice(0, FEATURED_DONORS_MAX)) {
    const donor = byId.get(id);
    if (donor) {
      result.push(donor);
      used.add(id);
    }
  }

  const autoSorted = pool
    .filter((d: any) => !used.has(d.id))
    .sort((a: any, b: any) => b.totalDonated - a.totalDonated);

  for (const donor of autoSorted) {
    if (result.length >= FEATURED_DONORS_MAX) break;
    result.push(donor);
  }

  return result;
}

export function mapUserToCarouselDonor(u: any): any | null {
  if (u.role !== 'donor') return null;
  if (u.privacySettings?.showOnRanking === false) return null;

  const isAnonymous = Boolean(u.privacySettings?.anonymousMode);
  return {
    id: u.id,
    name: isAnonymous ? 'Doador Anônimo' : u.name,
    totalDonated: u.totalDonated ?? 0,
    avatar: isAnonymous ? '👤' : (u.avatar ?? u.name?.[0] ?? '?'),
    instagram: isAnonymous
      ? undefined
      : u.instagram ?? (u.privacySettings?.showInstagram !== false ? u.email : undefined),
    facebook: isAnonymous ? undefined : u.facebook,
    isAnonymous,
    privacySettings: u.privacySettings,
  };
}
