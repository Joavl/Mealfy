const DEFAULT_FB = 'https://www.facebook.com/mealfy';

export function getMealfyFacebookUrl(): string {
  return process.env.MEALFY_FACEBOOK_URL || process.env.SOCIAL_FACEBOOK_URL || DEFAULT_FB;
}

/** Converte @usuario, usuario ou URL parcial em link https do Facebook. */
export function toFacebookProfileUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  if (raw.toLowerCase().includes('facebook.com')) {
    return raw.startsWith('http') ? raw : `https://${raw}`;
  }
  const handle = raw.replace(/^@/, '').replace(/\s/g, '');
  if (!handle) return null;
  return `https://www.facebook.com/${handle}`;
}
