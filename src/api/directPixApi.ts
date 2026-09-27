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

export const directPixApi = {
  getReadiness: () => apiRequest<DirectPixReadiness>('/direct-pix/readiness'),
  getCurrentTerms: () => apiRequest<{ terms: DirectPixTerms }>('/direct-pix/terms/current'),
  acceptTerms: (version: string, idempotencyKey: string) =>
    apiRequest<{ acceptance: DirectPixTermsAcceptance }>(
      '/direct-pix/terms/acceptances',
      'POST',
      { version },
      { 'Idempotency-Key': idempotencyKey },
    ),
};
