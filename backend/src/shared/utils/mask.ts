/**
 * Mascara documentos (CPF/NIS) preservando apenas os últimos dígitos.
 * No MVP NÃO armazenamos o documento completo — guardamos só a versão mascarada.
 */
export function maskTail(value: string | null | undefined, visible = 3): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  if (digits.length === 0) return null;
  if (digits.length <= visible) return '*'.repeat(digits.length);
  return '*'.repeat(digits.length - visible) + digits.slice(-visible);
}
