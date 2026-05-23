export type MaskType =
  | 'cpf'
  | 'cnpj'
  | 'phone'
  | 'cep'
  | 'uf'
  | 'cpfOrPhone'
  | 'contact'
  | 'instagram';

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function maskCpf(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  return digits
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d)/, '$1.$2')
    .replace(/(\d{3})(\d{1,2})$/, '$1-$2');
}

export function maskCnpj(value: string): string {
  const digits = onlyDigits(value).slice(0, 14);
  return digits
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d{1,2})$/, '$1-$2');
}

export function maskPhone(value: string): string {
  const digits = onlyDigits(value).slice(0, 11);
  if (digits.length === 0) return '';
  if (digits.length <= 10) {
    return digits
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d{1,4})$/, '$1-$2');
  }
  return digits
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d{1,4})$/, '$1-$2');
}

export function maskCep(value: string): string {
  const digits = onlyDigits(value).slice(0, 8);
  return digits.replace(/(\d{5})(\d{1,3})$/, '$1-$2');
}

export function maskUf(value: string): string {
  return value.replace(/[^a-zA-Z]/g, '').toUpperCase().slice(0, 2);
}

/** Login de beneficiário: CPF ou telefone */
export function maskCpfOrPhone(value: string): string {
  const digits = onlyDigits(value);
  if (digits.length === 0) return '';

  const preferPhone =
    value.includes('(') ||
    digits.length > 11 ||
    (digits.length >= 10 && digits[2] === '9');

  if (preferPhone) return maskPhone(value);
  return maskCpf(value);
}

/** Contato livre ou telefone (indicação de família) */
export function maskContact(value: string): string {
  if (/[a-zA-ZÀ-ÿ]/.test(value)) return value;
  return maskPhone(value);
}

export function maskInstagram(value: string): string {
  const trimmed = value.trimStart();
  if (!trimmed) return '';
  const handle = trimmed.replace(/^@+/, '').replace(/\s/g, '');
  return `@${handle}`.slice(0, 31);
}

export function applyMask(type: MaskType, value: string): string {
  switch (type) {
    case 'cpf':
      return maskCpf(value);
    case 'cnpj':
      return maskCnpj(value);
    case 'phone':
      return maskPhone(value);
    case 'cep':
      return maskCep(value);
    case 'uf':
      return maskUf(value);
    case 'cpfOrPhone':
      return maskCpfOrPhone(value);
    case 'contact':
      return maskContact(value);
    case 'instagram':
      return maskInstagram(value);
    default:
      return value;
  }
}

export function inputModeForMask(
  mask: MaskType,
): 'numeric' | 'text' | 'tel' | 'email' | undefined {
  switch (mask) {
    case 'cpf':
    case 'cnpj':
    case 'phone':
    case 'cep':
    case 'cpfOrPhone':
    case 'contact':
      return 'numeric';
    default:
      return undefined;
  }
}
