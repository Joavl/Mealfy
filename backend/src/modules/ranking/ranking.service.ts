import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';

export interface RankedDonor {
  id: string; name: string; avatar: string; instagram?: string; supportsCount: number; totalDonated: number; rankingPosition: number; isAnonymous: boolean;
  privacySettings: { showOnRanking: boolean; showInstagram: boolean; anonymousMode: boolean };
}

const MAX_CONFIGURED_STORIES = 20;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const donorSelect = { id: true, name: true, avatarUrl: true, instagram: true, showInstagram: true, anonymousMode: true } as const;
type Donor = { id: string; name: string; avatarUrl: string | null; instagram: string | null; showInstagram: boolean; anonymousMode: boolean };

function toRankedDonor(donor: Donor, stats: { supportsCount: number; totalDonated: number }, rankingPosition: number): RankedDonor {
  return { id: donor.id, name: donor.anonymousMode ? 'Anônimo' : donor.name, avatar: donor.avatarUrl ?? '', instagram: donor.showInstagram && donor.instagram ? donor.instagram : undefined, supportsCount: stats.supportsCount, totalDonated: stats.totalDonated, rankingPosition, isAnonymous: donor.anonymousMode, privacySettings: { showOnRanking: true, showInstagram: donor.showInstagram, anonymousMode: donor.anonymousMode } };
}

async function donationStats() {
  return prisma.donation.groupBy({ by: ['donorId'], where: { status: 'completed' }, _count: { id: true }, _sum: { amount: true }, orderBy: [{ _sum: { amount: 'desc' } }, { donorId: 'asc' }] });
}

/** Manual donor Top 20 first, then remaining eligible donors by total completed donations. */
export async function getTopDonors(limit = 20): Promise<RankedDonor[]> {
  const [configured, stats] = await Promise.all([
    prisma.rankingStory.findMany({ where: { donor: { role: 'donor', status: 'active', showOnRanking: true } }, orderBy: { position: 'asc' }, include: { donor: { select: donorSelect } } }),
    donationStats(),
  ]);
  const statsById = new Map(stats.map((stat) => [stat.donorId, { supportsCount: stat._count.id, totalDonated: stat._sum.amount ?? 0 }]));
  const configuredIds = new Set(configured.map((story) => story.donorId));
  const candidateIds = stats.map((stat) => stat.donorId).filter((id) => !configuredIds.has(id));
  const users = candidateIds.length ? await prisma.user.findMany({ where: { id: { in: candidateIds }, role: 'donor', status: 'active', showOnRanking: true }, select: donorSelect }) : [];
  const usersById = new Map(users.map((user) => [user.id, user]));
  const ordered = [
    ...configured.map((story) => toRankedDonor(story.donor, statsById.get(story.donorId) ?? { supportsCount: 0, totalDonated: 0 }, 0)),
    ...candidateIds.flatMap((id) => { const donor = usersById.get(id); const donorStats = statsById.get(id); return donor && donorStats ? [toRankedDonor(donor, donorStats, 0)] : []; }),
  ].slice(0, limit);
  return ordered.map((donor, index) => ({ ...donor, rankingPosition: index + 1 }));
}

export async function getConfiguredStories(): Promise<RankedDonor[]> {
  const [stories, stats] = await Promise.all([
    prisma.rankingStory.findMany({ where: { donor: { role: 'donor', status: 'active', showOnRanking: true } }, orderBy: { position: 'asc' }, include: { donor: { select: donorSelect } } }),
    donationStats(),
  ]);
  const statsById = new Map(stats.map((stat) => [stat.donorId, { supportsCount: stat._count.id, totalDonated: stat._sum.amount ?? 0 }]));
  return stories.map((story, index) => toRankedDonor(story.donor, statsById.get(story.donorId) ?? { supportsCount: 0, totalDonated: 0 }, index + 1));
}

export async function listRankingStoryCandidates(): Promise<RankedDonor[]> {
  const [donors, stats] = await Promise.all([
    prisma.user.findMany({ where: { role: 'donor', status: 'active', showOnRanking: true }, select: donorSelect, orderBy: { name: 'asc' } }), donationStats(),
  ]);
  const statsById = new Map(stats.map((stat) => [stat.donorId, { supportsCount: stat._count.id, totalDonated: stat._sum.amount ?? 0 }]));
  return donors.map((donor, index) => toRankedDonor(donor, statsById.get(donor.id) ?? { supportsCount: 0, totalDonated: 0 }, index + 1));
}

export async function setConfiguredStories(actorUserId: string, donorIds: unknown): Promise<RankedDonor[]> {
  if (!Array.isArray(donorIds) || donorIds.length > MAX_CONFIGURED_STORIES || donorIds.some((id) => typeof id !== 'string' || !UUID_RE.test(id))) throw new AppError('A lista de stories deve conter até 20 IDs válidos.', 400, 'invalid_ranking_stories');
  if (new Set(donorIds).size !== donorIds.length) throw new AppError('Um doador não pode aparecer mais de uma vez.', 400, 'duplicate_ranking_story');
  await prisma.$transaction(async (tx) => {
    const validDonors = await tx.user.count({ where: { id: { in: donorIds }, role: 'donor', status: 'active', showOnRanking: true } });
    if (validDonors !== donorIds.length) throw new AppError('Todos os stories devem ser doadores ativos que aceitaram aparecer no ranking.', 400, 'ineligible_ranking_story');
    await tx.rankingStory.deleteMany();
    if (donorIds.length) await tx.rankingStory.createMany({ data: donorIds.map((donorId, index) => ({ donorId, position: index + 1 })) });
    await tx.auditLog.create({ data: { actorUserId, action: 'configure_ranking_stories', entityType: 'ranking_story', metadata: { donorIds } } });
  });
  return getConfiguredStories();
}

export async function getDonorRanking(userId: string) {
  const mine = await prisma.donation.aggregate({ where: { donorId: userId, status: 'completed' }, _count: { id: true }, _sum: { amount: true } });
  const supportsCount = mine._count.id; const totalDonated = mine._sum.amount ?? 0;
  if (!supportsCount) return { rankingPosition: 0, rankingPercentile: '', totalDonated: 0, supportsCount: 0 };
  const above = await prisma.donation.groupBy({ by: ['donorId'], where: { status: 'completed', donorId: { not: userId } }, _sum: { amount: true }, having: { amount: { _sum: { gt: totalDonated } } } });
  const position = above.length + 1; const total = Math.max(position, await prisma.user.count({ where: { role: 'donor' } }));
  return { rankingPosition: position, rankingPercentile: `Top ${Math.max(1, Math.round((position / total) * 100))}%`, totalDonated, supportsCount };
}
