import type { DirectPixTermsAcceptance, DirectPixTermsVersion } from '@prisma/client';

const REQUIRED_STATEMENTS = 3;

function statementsOf(value: unknown): string[] {
  if (!Array.isArray(value)
    || value.length < REQUIRED_STATEMENTS
    || !value.every((item) => typeof item === 'string' && item.trim().length > 0)) {
    throw new Error('Published direct Pix terms have invalid statements');
  }
  return value;
}

export function toCurrentTermsDto(terms: DirectPixTermsVersion, acceptedAt?: Date | null) {
  return {
    version: terms.version,
    title: terms.title,
    statements: statementsOf(terms.statements),
    publishedAt: terms.publishedAt.toISOString(),
    effectiveAt: terms.effectiveAt.toISOString(),
    acceptedAt: acceptedAt?.toISOString() ?? null,
  };
}

export function toTermsAcceptanceDto(acceptance: DirectPixTermsAcceptance) {
  return {
    id: acceptance.id,
    version: acceptance.version,
    actorUserId: acceptance.actorUserId,
    actorRole: acceptance.actorRole,
    channel: acceptance.channel,
    correlationId: acceptance.correlationId,
    acceptedAt: acceptance.acceptedAt.toISOString(),
  };
}
