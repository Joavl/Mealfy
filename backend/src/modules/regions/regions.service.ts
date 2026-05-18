import { MockDatabase } from '../../database/mock-db';
import { Family } from '../../shared/types';

export class RegionsService {
  static async getRegions() {
    const families = await MockDatabase.read<Family>('families');
    
    // Filtra apenas famílias visíveis publicamente
    const visibleFamilies = families.filter(f => f.status === 'approved' && f.supportStatus !== 'pending' && f.supportStatus !== 'rejected' && f.supportStatus !== 'suspended');
    
    const regionsMap = new Map<string, any>();
    
    visibleFamilies.forEach(f => {
      // Usa neighborhood ou region se existir no mock
      const regionName = (f as any).region || f.neighborhood || 'Desconhecida';
      const city = f.city || 'São Paulo';
      const state = f.state || 'SP';

      if (!regionsMap.has(regionName)) {
        regionsMap.set(regionName, {
          id: regionName.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, '-'),
          name: regionName,
          city: city,
          state: state,
          familiesCount: 0,
          urgentCount: 0
        });
      }
      
      const region = regionsMap.get(regionName);
      region.familiesCount += 1;
      if (f.supportStatus === 'needs_help') {
        region.urgentCount += 1;
      }
    });
    
    return Array.from(regionsMap.values()).sort((a, b) => b.familiesCount - a.familiesCount);
  }
}
