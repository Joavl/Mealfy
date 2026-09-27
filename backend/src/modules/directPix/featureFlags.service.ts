import { Prisma, type DirectPixFeatureFlagKey, type DirectPixFeatureFlagScope } from '@prisma/client';
import { prisma } from '../../database/prisma';
import { AppError } from '../../shared/errors/AppError';

export const DIRECT_PIX_FLAG_KEYS = ['ONBOARDING', 'CREATION', 'DISCLOSURE', 'JOBS', 'LEGACY_WRITE', 'KILL_SWITCH'] as const;
export const DIRECT_PIX_FLAG_SCOPES = ['GLOBAL', 'ENTITY', 'FAMILY'] as const;
const PILOT_COHORT_LIMIT = 10;

type Client = Prisma.TransactionClient | typeof prisma;
type FlagKey = typeof DIRECT_PIX_FLAG_KEYS[number];
type FlagScope = typeof DIRECT_PIX_FLAG_SCOPES[number];
type StructuredReason = { code: string; note?: string };
type FlagConfig = { pilot?: boolean } & Record<string, unknown>;

export type UpdateDirectPixFeatureFlagInput = {
  key: FlagKey;
  scope: FlagScope;
  entityId?: string;
  familyId?: string;
  enabled: boolean;
  config?: FlagConfig;
  expectedVersion: number;
  reason: StructuredReason;
  correlationId?: string;
};

function targetFor(scope: FlagScope, entityId?: string, familyId?: string) {
  if (scope === 'GLOBAL') {
    if (entityId || familyId) throw new AppError('O escopo global não aceita entidade ou família.', 422, 'invalid_feature_flag_scope');
    return { entityId: null, familyId: null };
  }
  if (scope === 'ENTITY') {
    if (!entityId || familyId) throw new AppError('O escopo de entidade exige somente entityId.', 422, 'invalid_feature_flag_scope');
    return { entityId, familyId: null };
  }
  if (!entityId || !familyId) throw new AppError('O escopo de família exige entityId e familyId.', 422, 'invalid_feature_flag_scope');
  return { entityId, familyId };
}

function isPilot(config: FlagConfig | undefined): boolean { return config?.pilot === true; }
function assertReason(reason: StructuredReason) {
  if (!reason || !/^[A-Z][A-Z0-9_]{2,63}$/.test(reason.code) || (reason.note !== undefined && (reason.note.length < 1 || reason.note.length > 500))) {
    throw new AppError('Motivo estruturado inválido.', 422, 'invalid_feature_flag_reason');
  }
}

async function resolvedFlag(key: DirectPixFeatureFlagKey, entityId: string | null, familyId: string, client: Client) {
  const rows = await client.directPixFeatureFlag.findMany({
    where: { key, OR: [{ scope: 'FAMILY', familyId }, ...(entityId ? [{ scope: 'ENTITY' as const, entityId }] : []), { scope: 'GLOBAL' }] },
    select: { enabled: true, scope: true, version: true, config: true, entityId: true, familyId: true },
  });
  const order: DirectPixFeatureFlagScope[] = ['FAMILY', 'ENTITY', 'GLOBAL'];
  return order.map((scope) => rows.find((row) => row.scope === scope)).find(Boolean) ?? null;
}

/** Resolve all controls from PostgreSQL per operation: intentionally no process cache. */
export async function evaluateDirectPixFeature(key: Exclude<FlagKey, 'KILL_SWITCH'>, familyId: string, entityId: string | null, client: Client = prisma) {
  try {
    const [feature, killSwitch] = await Promise.all([
      resolvedFlag(key, entityId, familyId, client),
      resolvedFlag('KILL_SWITCH', entityId, familyId, client),
    ]);
    // Legacy synthetic PostgreSQL fixtures predate rollout controls. This opt-in
    // is set only by the isolated E2E runner; deployed environments remain
    // fail-closed when no persisted row enables the feature.
    const syntheticFixtureDefault = process.env.NODE_ENV === 'test' && process.env.DIRECT_PIX_TEST_DEFAULT_CREATION === 'true' && key === 'CREATION';
    return { enabled: (feature ? feature.enabled : syntheticFixtureDefault) && killSwitch?.enabled !== true, feature, killSwitch };
  } catch {
    // A failed feature-control read is indistinguishable from disabled at the boundary.
    return { enabled: false, feature: null, killSwitch: null };
  }
}

/** Blocks only unsafe Direct Pix creation/revelation operations, never safe resolution. */
export async function assertDirectPixCreationAllowed(familyId: string, entityId: string | null, client: Client = prisma): Promise<void> {
  const evaluation = await evaluateDirectPixFeature('CREATION', familyId, entityId, client);
  if (!evaluation.enabled) throw new AppError('Pix direto está temporariamente indisponível.', 423, 'direct_pix_disabled');
}

function dto(row: { id: string; key: DirectPixFeatureFlagKey; scope: DirectPixFeatureFlagScope; entityId: string | null; familyId: string | null; enabled: boolean; config: Prisma.JsonValue | null; version: number; updatedByUserId: string; updatedAt: Date }) {
  return { id: row.id, key: row.key, scope: row.scope, entityId: row.entityId, familyId: row.familyId, enabled: row.enabled, config: row.config, version: row.version, updatedByUserId: row.updatedByUserId, updatedAt: row.updatedAt.toISOString() };
}

export async function listDirectPixFeatureFlags() {
  const flags = await prisma.directPixFeatureFlag.findMany({ orderBy: [{ key: 'asc' }, { scope: 'asc' }, { updatedAt: 'desc' }] });
  return flags.map(dto);
}

export async function updateDirectPixFeatureFlag(actorUserId: string, input: UpdateDirectPixFeatureFlagInput) {
  assertReason(input.reason);
  const target = targetFor(input.scope, input.entityId, input.familyId);
  if (input.scope !== 'FAMILY' && isPilot(input.config)) throw new AppError('Piloto exige escopo de família.', 422, 'pilot_requires_family_scope');
  return prisma.$transaction(async (tx) => {
    if (target.entityId) {
      const entity = await tx.entity.findUnique({ where: { id: target.entityId }, select: { id: true } });
      if (!entity) throw new AppError('Entidade não encontrada.', 404, 'entity_not_found');
    }
    if (target.familyId) {
      const family = await tx.family.findUnique({ where: { id: target.familyId }, select: { id: true, entityId: true } });
      if (!family || family.entityId !== target.entityId) throw new AppError('Família não encontrada.', 404, 'family_not_found');
    }
    if (input.scope === 'FAMILY' && input.enabled && isPilot(input.config)) {
      const cohort = await tx.directPixFeatureFlag.count({ where: { key: input.key, scope: 'FAMILY', entityId: target.entityId, enabled: true, config: { path: ['pilot'], equals: true }, NOT: target.familyId ? { familyId: target.familyId } : undefined } });
      if (cohort >= PILOT_COHORT_LIMIT) throw new AppError('O piloto suporta no máximo dez famílias por entidade e flag.', 409, 'pilot_cohort_limit_reached');
    }
    const existing = await tx.directPixFeatureFlag.findFirst({ where: { key: input.key, scope: input.scope, entityId: target.entityId, familyId: target.familyId } });
    if (existing && existing.version !== input.expectedVersion) throw new AppError('A versão da flag está desatualizada.', 409, 'feature_flag_version_conflict');
    if (!existing && input.expectedVersion !== 0) throw new AppError('A flag ainda não existe; use versão esperada zero.', 409, 'feature_flag_version_conflict');
    const row = existing
      ? await tx.directPixFeatureFlag.update({ where: { id: existing.id }, data: { enabled: input.enabled, config: input.config as Prisma.InputJsonValue | undefined, updatedByUserId: actorUserId, version: { increment: 1 } } })
      : await tx.directPixFeatureFlag.create({ data: { key: input.key, scope: input.scope, ...target, enabled: input.enabled, config: input.config as Prisma.InputJsonValue | undefined, updatedByUserId: actorUserId } });
    await tx.auditLog.create({ data: { actorUserId, actorRole: 'admin', action: 'direct_pix.feature_flag.updated', entityType: 'direct_pix_feature_flag', entityId: row.id, channel: 'admin_api', correlationId: input.correlationId, result: row.enabled ? 'enabled' : 'disabled', metadata: { key: row.key, scope: row.scope, entityId: row.entityId, familyId: row.familyId, previousVersion: existing?.version ?? 0, version: row.version, reason: input.reason, config: row.config } } });
    return dto(row);
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}
