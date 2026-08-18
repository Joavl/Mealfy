import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { createAuditLog } from '../auditLogs/auditLog.service';

export async function getUserById(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new AppError('Usuário não encontrado', 404, 'user_not_found');
  return user;
}

/** Atualiza preferências de visibilidade no ranking. */
export async function updatePrivacy(
  userId: string,
  settings: { showOnRanking?: boolean; showInstagram?: boolean; anonymousMode?: boolean },
) {
  await getUserById(userId);
  return prisma.user.update({ where: { id: userId }, data: settings });
}

/** Atualiza apenas campos simples e seguros do próprio perfil. */
export async function updateUser(
  userId: string,
  data: { name?: string; avatarUrl?: string | null; instagram?: string | null; phone?: string | null },
) {
  await getUserById(userId);
  return prisma.user.update({ where: { id: userId }, data });
}

/**
 * Exclui a conta do usuário (exigência Play Store 2024+ / LGPD direito de exclusão).
 * FKs com CASCADE removem perfil de doador, entidade, favoritos e contas OAuth;
 * families.beneficiaryUserId vira NULL (SET NULL). Doações/pagamentos permanecem
 * como registro financeiro SEM PII (guardam apenas o donorId opaco).
 * O audit log sobrevive (actorUserId é texto plano) para trilha de conformidade.
 */
export async function deleteUser(userId: string) {
  await getUserById(userId);
  await createAuditLog({
    actorUserId: userId,
    action: 'delete_account',
    entityType: 'user',
    entityId: userId,
  });
  await prisma.user.delete({ where: { id: userId } });
}
