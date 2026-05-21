export function toFacebookProfileUrl(value?: string | null): string | null {
  if (!value?.trim()) return null;
  const raw = value.trim();
  if (/facebook\.com/i.test(raw)) {
    return raw.startsWith('http') ? raw : `https://${raw}`;
  }
  const handle = raw.replace(/^@/, '').replace(/\s/g, '');
  return handle ? `https://www.facebook.com/${handle}` : null;
}
