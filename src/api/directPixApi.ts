import { apiRequest } from './apiClient';

export interface DirectPixTerms {
  version: string;
  title: string;
  statements: string[];
  publishedAt: string;
  effectiveAt: string;
  acceptedAt: string | null;
}

export interface DirectPixTermsAcceptance {
  id: string;
  version: string;
  actorUserId: string;
  actorRole: 'donor';
  channel: 'web_pwa';
  correlationId: string;
  acceptedAt: string;
}

export interface DirectPixReadiness {
  ready: boolean;
  blockers: Array<'email_not_verified'>;
}

export type DirectPixFamilyAvailability = 'AVAILABLE' | 'IN_PROGRESS' | 'SERVED_THIS_CYCLE' | 'UNAVAILABLE';

export interface DirectPixPublicFamilyProjection {
  id: string;
  availability: DirectPixFamilyAvailability;
}

export interface DirectPixTimelineItem {
  id: string;
  kind: 'PIX_DIRETO' | 'VALE_PRESENTE_LEGADO';
  label: string;
  status: string;
  amountCents: number;
  occurredAt: string;
  events: Array<{ type: string; label: string; occurredAt: string }>;
  familyId?: string;
  donorAlias?: string;
}

export interface DirectPixTimelinePage {
  items: DirectPixTimelineItem[];
  nextCursor: string | null;
}

export const directPixApi = {
  getReadiness: () => apiRequest<DirectPixReadiness>('/direct-pix/readiness'),
  getFamilyProjection: (familyId: string) =>
    apiRequest<DirectPixPublicFamilyProjection>(`/direct-pix/families/${encodeURIComponent(familyId)}/public-projection`),
  getTimeline: (cursor?: string, limit?: number) => {
    const query = new URLSearchParams();
    if (cursor) query.set('cursor', cursor);
    if (limit) query.set('limit', String(limit));
    const suffix = query.size ? `?` + query.toString() : '';
    return apiRequest<DirectPixTimelinePage>(`/direct-pix/timeline` + suffix);
  },
  getResponsibleTimeline: (cursor?: string, limit?: number) => {
    const query = new URLSearchParams();
    if (cursor) query.set('cursor', cursor);
    if (limit) query.set('limit', String(limit));
    const suffix = query.size ? `?` + query.toString() : '';
    return apiRequest<DirectPixTimelinePage>(`/direct-pix/responsible/timeline` + suffix);
  },
  getCurrentTerms: () => apiRequest<{ terms: DirectPixTerms }>('/direct-pix/terms/current'),
  acceptTerms: (version: string, idempotencyKey: string) =>
    apiRequest<{ acceptance: DirectPixTermsAcceptance }>(
      '/direct-pix/terms/acceptances',
      'POST',
      { version },
      { 'Idempotency-Key': idempotencyKey },
    ),
};