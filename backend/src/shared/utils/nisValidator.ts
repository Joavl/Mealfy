const NIS_WEIGHTS = [3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

/**
 * Valida o NIS/PIS/PASEP pelo dígito verificador.
 * Aceita string com ou sem pontuação (remove não-dígitos antes de validar).
 */
export function validateNis(nis: string): boolean {
  const digits = nis.replace(/\D/g, '');
  if (digits.length !== 11) return false;
  // Rejeita sequências trivialmente inválidas (todos iguais)
  if (/^(\d)\1{10}$/.test(digits)) return false;
  const sum = NIS_WEIGHTS.reduce((acc, w, i) => acc + w * Number(digits[i]), 0);
  const remainder = sum % 11;
  const expected = remainder < 2 ? 0 : 11 - remainder;
  return Number(digits[10]) === expected;
}
