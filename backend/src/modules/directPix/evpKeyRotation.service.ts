import { Prisma, type PrismaClient } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';
import { decryptEvp, encryptEvp, evpKeyring, fingerprintEvp } from './evpKey.crypto';

const RESOURCE_TYPE = 'direct_pix_evp_rotation_job';
type RotationClient = PrismaClient;
type RotationTarget = Readonly<{ encryptionKid?: string; fingerprintKid?: string }>;
export type RotationProgress = Readonly<{ id: string; status: 'RUNNING' | 'COMPLETED' | 'FAILED'; processedCount: number; encryptionTargetKid: string | null; fingerprintTargetKid: string | null }>;
function unknownJob(): never { throw new AppError('Rotação criptográfica não encontrada.', 404, 'evp_rotation_not_found'); }
function unavailable(): never { throw new AppError('Material de rotação EVP indisponível.', 503, 'evp_crypto_unavailable'); }
function assertTarget(target: RotationTarget): void {
  if (!target.encryptionKid && !target.fingerprintKid) throw new AppError('Informe ao menos um KID de rotação.', 422, 'evp_rotation_target_required');
  const ring = evpKeyring();
  if (target.encryptionKid && !ring.encryption.some((entry) => entry.kid === target.encryptionKid && entry.write)) unavailable();
  if (target.fingerprintKid && !ring.fingerprints.some((entry) => entry.kid === target.fingerprintKid && entry.write)) unavailable();
}
function dto(job: { id: string; status: 'RUNNING' | 'COMPLETED' | 'FAILED'; processedCount: number; encryptionTargetKid: string | null; fingerprintTargetKid: string | null }): RotationProgress { return { id: job.id, status: job.status, processedCount: job.processedCount, encryptionTargetKid: job.encryptionTargetKid, fingerprintTargetKid: job.fingerprintTargetKid }; }
/** Starts an explicit, auditable maintenance operation; its audit metadata deliberately has no secret, EVP, ciphertext or fingerprint. */
export async function startEvpRotation(target: RotationTarget, actorUserId?: string, client: RotationClient = prisma): Promise<RotationProgress> {
  assertTarget(target);
  const job = await client.$transaction(async (tx) => {
    const created = await tx.directPixEvpRotationJob.create({ data: { encryptionTargetKid: target.encryptionKid ?? null, fingerprintTargetKid: target.fingerprintKid ?? null } });
    await tx.auditLog.create({ data: { actorUserId, actorRole: actorUserId ? 'admin' : undefined, action: 'direct_pix.evp.rotation.started', entityType: RESOURCE_TYPE, entityId: created.id, channel: 'worker', result: 'running', metadata: { encryptionTargetKid: created.encryptionTargetKid, fingerprintTargetKid: created.fingerprintTargetKid } } });
    return created;
  });
  return dto(job);
}
/** Processes a bounded batch. Per-job and global transaction locks make restarts and concurrent rotations safe. */
/** Processes a bounded batch. Per-job and global transaction locks make restarts and concurrent rotations safe. */
export async function runEvpRotationBatch(jobId: string, batchSize = 100, client: RotationClient = prisma): Promise<RotationProgress> {
  const limit = Number.isSafeInteger(batchSize) && batchSize > 0 && batchSize <= 500 ? batchSize : 100;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await client.$transaction(async (tx) => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'direct-pix-evp-rotation:' + jobId}))`;
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('direct-pix-evp-rotation-global'))`;
        const job = await tx.directPixEvpRotationJob.findUnique({ where: { id: jobId } }); if (!job) unknownJob();
        if (job.status === 'COMPLETED') return dto(job);
        assertTarget({ encryptionKid: job.encryptionTargetKid ?? undefined, fingerprintKid: job.fingerprintTargetKid ?? undefined });
        const rows = await tx.directPixEvpKeyVersion.findMany({
          where: job.cursorKeyVersionId ? { id: { gt: job.cursorKeyVersionId } } : undefined,
          orderBy: { id: 'asc' }, take: limit,
          include: { envelopes: { orderBy: { generation: 'desc' }, take: 1 }, fingerprints: true },
        });
        for (const row of rows) {
          const current = row.envelopes[0] ?? { encryptionKid: row.encryptionKid, nonce: row.nonce, ciphertext: row.ciphertext, tag: row.tag, aadVersion: row.aadVersion };
          const context = { recordId: row.id, familyId: row.familyId, assignmentId: row.assignmentId, version: row.version };
          const plaintext = decryptEvp(current, context);
          if (job.encryptionTargetKid && current.encryptionKid !== job.encryptionTargetKid) {
            const sealed = encryptEvp(plaintext, context);
            if (sealed.encryptionKid !== job.encryptionTargetKid) unavailable();
            const generation = (row.envelopes[0]?.generation ?? 0) + 1;
            await tx.directPixEvpKeyEnvelope.create({ data: { keyVersionId: row.id, generation, encryptionKid: sealed.encryptionKid, nonce: sealed.nonce, ciphertext: sealed.ciphertext, tag: sealed.tag, aadVersion: sealed.aadVersion } });
          }
          if (job.fingerprintTargetKid && !row.fingerprints.some((fingerprint) => fingerprint.fingerprintKid === job.fingerprintTargetKid)) {
            await tx.directPixEvpKeyFingerprint.create({ data: { keyVersionId: row.id, fingerprintKid: job.fingerprintTargetKid, fingerprint: fingerprintEvp(plaintext, job.fingerprintTargetKid) } });
          }
        }
        const complete = rows.length < limit;
        const updated = await tx.directPixEvpRotationJob.update({ where: { id: job.id }, data: { cursorKeyVersionId: rows.at(-1)?.id ?? job.cursorKeyVersionId, processedCount: { increment: rows.length }, status: complete ? 'COMPLETED' : 'RUNNING', completedAt: complete ? new Date() : null } });
        await tx.auditLog.create({ data: { action: complete ? 'direct_pix.evp.rotation.completed' : 'direct_pix.evp.rotation.progressed', entityType: RESOURCE_TYPE, entityId: job.id, channel: 'worker', result: complete ? 'completed' : 'running', metadata: { processedCount: updated.processedCount, batchCount: rows.length, encryptionTargetKid: job.encryptionTargetKid, fingerprintTargetKid: job.fingerprintTargetKid } } });
        return dto(updated);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2034' || attempt === 3) throw error;
    }
  }
  throw new AppError('Rotação criptográfica concorrente. Tente novamente.', 409, 'evp_rotation_conflict');
}
