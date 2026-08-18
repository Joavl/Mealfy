export const shouldFallback = (): boolean => {
  return import.meta.env.VITE_DISABLE_LOCAL_FALLBACK !== 'true';
};

export const handleApiError = (error: any, context: string) => {
  if (!shouldFallback()) {
    console.error(`[API-ONLY MODE] ${context} failed:`, error);
    throw new Error(`[API-ONLY ERROR] ${context}: ${error.message || 'Erro de conexão'}`);
  }
  console.warn(`[FALLBACK MODE] ${context} failed, using local mock.`, error);
};
