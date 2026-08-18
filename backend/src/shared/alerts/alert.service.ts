/**
 * Ponto ÚNICO de emissão de alerta operacional.
 *
 * Hoje só emite log estruturado em uma linha (JSON), pronto para ser coletado
 * por qualquer agregador. Quando Sentry/Slack entrarem, só este arquivo muda —
 * nenhum chamador precisa ser tocado.
 *
 * Regra: alerta é para o que **precisa de ação humana**. Nunca inclui código de
 * gift card, PII sensível ou segredo (o `context` vai para log e para auditoria).
 */

export type AlertSeverity = 'warning' | 'critical';

/**
 * Eventos que significam dinheiro parado ou promessa não cumprida ao doador.
 * Lista fechada de propósito: alerta novo é decisão consciente, não string solta.
 */
export type AlertEvent =
  /** Pedido de gift card preso sem código — doador pagou e família não recebeu. */
  | 'gift_card_order_stale'
  /** Pedido escalado para revisão manual (falha do fornecedor, corrida, etc.). */
  | 'gift_card_order_manual_review'
  /** Estado inconsistente entre doação e pedido — precisa de inspeção. */
  | 'gift_card_order_inconsistent'
  /** Estoque de uma marca abaixo do mínimo operacional. */
  | 'gift_card_stock_low';

export interface AlertInput {
  event: AlertEvent;
  severity: AlertSeverity;
  message: string;
  context?: Record<string, unknown>;
}

/**
 * Emite o alerta. Não lança: falha ao alertar nunca deve derrubar o fluxo que
 * estava sendo executado (perder um alerta é ruim; perder a operação é pior).
 */
export function emitAlert(input: AlertInput): void {
  const payload = {
    kind: 'alert',
    event: input.event,
    severity: input.severity,
    message: input.message,
    at: new Date().toISOString(),
    ...(input.context ? { context: input.context } : {}),
  };

  try {
    // Uma linha, JSON: legível por humano e por coletor.
    const line = JSON.stringify(payload);
    if (input.severity === 'critical') {
      console.error(line);
    } else {
      console.warn(line);
    }
    // TODO(observabilidade): encaminhar para Sentry/Slack quando configurado.
  } catch {
    // Última linha de defesa — nunca propaga.
    console.error(`[alert] falha ao serializar alerta ${input.event}`);
  }
}
