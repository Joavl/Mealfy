import type { Family } from '../types';

/**
 * Determina se a família pode ser exibida publicamente (ex: mapas, listas de doação).
 * Bloqueia famílias com status pendente, rejeitado ou suspenso.
 */
export const isPubliclyVisibleFamily = (family: Family): boolean => {
  // Se o status for undefined, assumimos que é elegível (retrocompatibilidade com mock data antigo)
  if (!family.status) return true;
  
  return family.status !== 'pending' && 
         family.status !== 'rejected' && 
         family.status !== 'suspended';
};
