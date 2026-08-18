import { apiRequest } from './apiClient';

// ──────────────────────────────────────────────────────────────────────────────
// Contrato REAL do backend (backend/src/modules/donations + payments):
//   POST   /donations                        → 201 { donation, payment, message }
//   GET    /donations/:id                    → { donation }
//   POST   /donations/:id/cancel             → { donation, message }
//   POST   /donations/:id/confirm-payment-mock (admin, dev/staging)
//   GET    /me/donations                     → { donations: [...] } (doador, sem código)
//   GET    /families/:id/donations           → { family, donations } (admin/entidade)
//   GET    /payments/:id                     → { payment }
//   POST   /payments/:id/simulate-paid       (admin, dev/staging)
//
// ⚠️ O fluxo real é Pix: criar a doação retorna a cobrança (pixQrCode/pixCopyPaste/
// expiresAt) e o vale só é liberado APÓS o pagamento confirmar. Não existe doação
// instantânea na API — os métodos batch/regional abaixo são SOMENTE mock (o backend
// não tem essas rotas; manter até decidirmos se viram feature real — ver roadmap).
// ──────────────────────────────────────────────────────────────────────────────

/** Meio de pagamento. `card` cobre Google Pay/Apple Pay (carteira → cartão tokenizado). */
export type PaymentMethod = 'pix' | 'card';

export interface CreateDonationResponse {
  donation: any;
  payment: {
    id: string;
    status: string;
    amount: number;
    method?: PaymentMethod;
    pixQrCode?: string | null;
    pixCopyPaste?: string | null;
    expiresAt?: string | null;
  };
  /**
   * Só vem quando `paymentMethod: 'card'`. Segredo efêmero que o SDK do Stripe
   * usa no dispositivo para abrir o Google Pay e confirmar a cobrança.
   * Nunca persistir nem logar.
   */
  clientSecret?: string;
  message: string;
}

/** Mensagem pré-definida disponível para envio. */
export interface MessageTemplate {
  key: string;
  body: string;
}

export const donationsApi = {
  /**
   * Catálogo de mensagens. O backend é a fonte única — o app não mantém cópia,
   * senão as duas versões divergiriam na primeira correção de redação.
   */
  getMessageTemplates: () =>
    apiRequest<{ templates: { donor: MessageTemplate[]; beneficiary: MessageTemplate[] } }>(
      '/donations/message-templates',
      'GET',
    ),

  /**
   * Envia a mensagem desta doação. O papel (doador ou beneficiário) é decidido
   * no servidor pelo vínculo real — o app não informa em nome de quem fala.
   */
  sendMessage: (donationId: string, templateKey: string) =>
    apiRequest(`/donations/${donationId}/messages`, 'POST', { templateKey }),

  removeMessage: (donationId: string) => apiRequest(`/donations/${donationId}/messages`, 'DELETE'),

  /**
   * Cria intenção de doação + cobrança (doador autenticado).
   * Sem `paymentMethod`, o backend assume `pix` (contrato anterior preservado).
   * Com `card`, a resposta traz `clientSecret` para confirmar via Google Pay.
   * Em ambos os casos o vale só é liberado quando o webhook confirmar o pagamento.
   */
  createDonation: (data: {
    familyId: string;
    amount: number;
    provider?: string;
    paymentMethod?: PaymentMethod;
  }) => apiRequest('/donations', 'POST', data) as Promise<CreateDonationResponse>,

  /** Detalhe de uma doação (role-aware: doador a sua; admin/entidade conforme posse). */
  getDonation: (id: string) => apiRequest(`/donations/${id}`, 'GET'),

  /** Cancela uma doação pending_payment (doador dono ou admin). */
  cancelDonation: (id: string) => apiRequest(`/donations/${id}/cancel`, 'POST'),

  /** Histórico do doador autenticado (sem código do vale). */
  getMyDonations: () => apiRequest('/me/donations', 'GET'),

  /** Doações de uma família (admin ou entidade dona). */
  getFamilyDonations: (familyId: string) => apiRequest(`/families/${familyId}/donations`, 'GET'),

  // ─── Somente mock (sem rota real no backend — TODO produto/backend) ───
  /** MOCK-ONLY: o backend não implementa doação em lote. */
  createBatchDonation: (familyIds: string[]) => apiRequest('/donations/batch', 'POST', { familyIds }),
  /** MOCK-ONLY: o backend não implementa doação regional. */
  createRegionalDonation: (communityId: string, totalAmount: number) =>
    apiRequest('/donations/regional', 'POST', { communityId, totalAmount }),
};

export const paymentsApi = {
  /** Status da cobrança Pix (doador dono ou admin). */
  getPayment: (id: string) => apiRequest(`/payments/${id}`, 'GET'),
  /** DEV/STAGING: simula webhook paid (admin; bloqueado em produção). */
  simulatePaid: (id: string) => apiRequest(`/payments/${id}/simulate-paid`, 'POST'),
};
