/**
 * Ciclo de alimentação diário do Mealfy: reset operacional às **08:00 America/Sao_Paulo**.
 * O Brasil não usa horário de verão desde 2019, então SP = UTC-3 fixo → 08:00 SP = 11:00 UTC.
 *
 * Uma família "alimentada" no ciclo atual não pode receber outra doação até o próximo reset.
 * A regra é AUTORITATIVA no backend (não depende do front).
 */
const RESET_HOUR_UTC = 11; // 08:00 America/Sao_Paulo

/** Início do ciclo atual (último 11:00 UTC <= agora). */
export function getCurrentCycleStart(now: Date = new Date()): Date {
  const cycle = new Date(now);
  cycle.setUTCHours(RESET_HOUR_UTC, 0, 0, 0);
  if (now.getTime() < cycle.getTime()) {
    cycle.setUTCDate(cycle.getUTCDate() - 1);
  }
  return cycle;
}

/** True se a família já foi alimentada no ciclo atual. */
export function wasFedThisCycle(lastFedAt: Date | null | undefined, now: Date = new Date()): boolean {
  if (!lastFedAt) return false;
  return lastFedAt.getTime() >= getCurrentCycleStart(now).getTime();
}

/**
 * True se a família pediu apoio no ciclo atual.
 *
 * Mesma régua do `wasFedThisCycle`, de propósito: o pedido vale por um ciclo e
 * expira sozinho no reset. É isso que impede a solicitação de "virar o dia" já
 * feita — sem cron e sem estado extra, só comparando a data com o ciclo.
 */
export function wasRequestedThisCycle(
  requestedAt: Date | null | undefined,
  now: Date = new Date(),
): boolean {
  if (!requestedAt) return false;
  return requestedAt.getTime() >= getCurrentCycleStart(now).getTime();
}

/** Próximo reset — quando o pedido do dia expira e precisa ser refeito. */
export function nextCycleStart(now: Date = new Date()): Date {
  const next = getCurrentCycleStart(now);
  next.setUTCDate(next.getUTCDate() + 1);
  return next;
}
