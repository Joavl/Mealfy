import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { MockDatabase } from '../../database/mock-db';
import { FamilyStatus } from '@prisma/client';

export class RegionsService {
  static async getRegions() {
    let families: any[] = [];

    if (env.DATABASE_MODE === 'prisma') {
      families = await prisma.family.findMany({
        where: {
          status: FamilyStatus.APPROVED,
          isDeleted: false,
        },
      });
    } else {
      families = await MockDatabase.read<any>('families');
    }
    
    const visibleFamilies = families.filter(f => {
      const status = (f.status || '').toUpperCase();
      const sup = (f.supportStatus || '').toUpperCase();
      return status === 'APPROVED' && sup !== 'PENDING' && sup !== 'REJECTED' && sup !== 'SUSPENDED';
    });
    
    const regionsMap = new Map<string, any>();
    
    visibleFamilies.forEach(f => {
      const regionName = f.region || f.neighborhood || 'Desconhecida';
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
      if ((f.supportStatus || '').toUpperCase() === 'NEEDS_HELP') {
        region.urgentCount += 1;
      }
    });
    
    return Array.from(regionsMap.values()).sort((a, b) => b.familiesCount - a.familiesCount);
  }
}
