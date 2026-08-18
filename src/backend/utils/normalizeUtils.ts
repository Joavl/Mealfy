export const normalizeString = (str?: string | null): string => {
  if (!str) return '';
  return str
    .normalize('NFD') // Decompõe os acentos
    .replace(/[\u0300-\u036f]/g, '') // Remove os acentos
    .toLowerCase()
    .trim();
};
