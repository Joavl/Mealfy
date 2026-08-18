import { prisma } from '../../database/prisma';

export interface RankedDonor {
  id: string;
  name: string;
  avatar: string;
  instagram?: string;
  supportsCount: number;
  totalDonated: number;
  rankingPosition: number;
  isAnonymous: boolean;
  privacySettings: { showOnRanking: boolean; showInstagram: boolean; anonymousMode: boolean };
}

/**
 * Top doadores que optaram por aparecer no ranking (showOnRanking=true),
 * ordenados por número de doações concluídas. Usado pelo carrossel de stories
 * e pelo ranking global da plataforma.
 */
export async function getTopDonors(limit = 20): Promise<RankedDonor[]> {
  // Agrega doações completadas por doador — sem transação, leitura simples
  const donorStats = await prisma.donation.groupBy({
    by: ['donorId'],
    where: { status: 'completed' },
    _count: { id: true },
    _sum: { amount: true },
    orderBy: { _count: { id: 'desc' } },
    take: limit * 4, // sobre-busca para compensar o filtro de privacidade
  });

  if (donorStats.length === 0) return [];

  const donorIds = donorStats.map((r) => r.donorId);
  const users = await prisma.user.findMany({
    where: { id: { in: donorIds }, showOnRanking: true },
    select: {
      id: true,
      name: true,
      avatarUrl: true,
      instagram: true,
      showInstagram: true,
      anonymousMode: true,
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));
  const statsMap = new Map(
    donorStats.map((r) => [r.donorId, { supportsCount: r._count.id, totalDonated: r._sum.amount ?? 0 }]),
  );

  return donorStats
    .filter((r) => userMap.has(r.donorId))
    .slice(0, limit)
    .map((r, i) => {
      const u = userMap.get(r.donorId)!;
      const s = statsMap.get(r.donorId)!;
      return {
        id: u.id,
        name: u.anonymousMode ? 'Anônimo' : u.name,
        avatar: u.avatarUrl ?? '',
        instagram: u.showInstagram && u.instagram ? u.instagram : undefined,
        supportsCount: s.supportsCount,
        totalDonated: s.totalDonated,
        rankingPosition: i + 1,
        isAnonymous: u.anonymousMode,
        privacySettings: { showOnRanking: true, showInstagram: u.showInstagram, anonymousMode: u.anonymousMode },
      };
    });
}

/**
 * Posição do doador logado no ranking global.
 * Calcula em tempo real — adequado para o MVP.
 */
export async function getDonorRanking(userId: string) {
  const myStats = await prisma.donation.aggregate({
    where: { donorId: userId, status: 'completed' },
    _count: { id: true },
    _sum: { amount: true },
  });

  const supportsCount = myStats._count.id;
  const totalDonated = myStats._sum.amount ?? 0;

  if (supportsCount === 0) {
    return { rankingPosition: 0, rankingPercentile: '', totalDonated: 0, supportsCount: 0 };
  }

  // Conta quantos doadores têm mais doações que o usuário
  const above = await prisma.donation.groupBy({
    by: ['donorId'],
    where: { status: 'completed', donorId: { not: userId } },
    _count: { id: true },
    having: { id: { _count: { gt: supportsCount } } },
  });

  const position = above.length + 1;
  const totalDonors = Math.max(position, await prisma.user.count({ where: { role: 'donor' } }));
  const pct = Math.max(1, Math.round((position / totalDonors) * 100));
  const percentile = pct <= 10 ? `Top ${pct}%` : `Top ${pct}%`;

  return { rankingPosition: position, rankingPercentile: percentile, totalDonated, supportsCount };
}
