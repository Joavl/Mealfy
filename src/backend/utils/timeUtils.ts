import type { Family } from '../types';

/**
 * Ciclo diário de alimentação: reset às 08:00 America/Sao_Paulo, que é fixo em
 * UTC-3 (Brasil não usa horário de verão desde 2019) — por isso o boundary é
 * 11:00 UTC, e não a hora local do dispositivo. Mesma regra do backend
 * (`shared/utils/feedCycle.ts`), para a UI nunca mostrar disponível quando o
 * backend vai recusar a doação (e vice-versa).
 */
const RESET_HOUR_UTC = 11; // 08:00 America/Sao_Paulo

function getCurrentCycleStart(now: Date = new Date()): Date {
  const cycle = new Date(now);
  cycle.setUTCHours(RESET_HOUR_UTC, 0, 0, 0);
  if (now.getTime() < cycle.getTime()) {
    cycle.setUTCDate(cycle.getUTCDate() - 1);
  }
  return cycle;
}

/**
 * Checks if a beneficiary is eligible to receive a donation today.
 * Aprovação é garantida pelo backend antes de a família chegar até aqui —
 * esta função só decide a regra diária (1 doação por ciclo).
 */
export const isBeneficiaryEligible = (beneficiary: Family): boolean => {
  if (!beneficiary.lastFedAt) return true;
  return new Date(beneficiary.lastFedAt).getTime() < getCurrentCycleStart().getTime();
};

export const getNextEligibilityTime = (beneficiary: Family): string => {
  if (isBeneficiaryEligible(beneficiary)) return "Agora";

  const nextCycle = new Date(getCurrentCycleStart());
  nextCycle.setUTCDate(nextCycle.getUTCDate() + 1);
  return nextCycle.toISOString();
};
