import { v4 as uuidv4 } from 'uuid';
import { MockDatabase } from '../../database/mock-db';
import { isPubliclyVisibleFamily } from '../../shared/utils/familyUtils';
import { AppError } from '../../shared/errors/AppError';
import { Family } from '../../shared/types';

export class FamiliesService {
  static async getPublicFamilies(query?: { region?: string; communityId?: string }): Promise<Family[]> {
    const families = await MockDatabase.read<Family>('families');
    let visible = families.filter(isPubliclyVisibleFamily);
    
    if (query?.region) {
      const normalizedQuery = query.region.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      visible = visible.filter(f => {
        const fReg = (f.neighborhood || (f as any).region || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return fReg === normalizedQuery;
      });
    }

    if (query?.communityId) {
      visible = visible.filter(f => f.communityId === query.communityId);
    }

    return visible;
  }

  static async getFamilyById(id: string): Promise<Family> {
    const families = await MockDatabase.read<Family>('families');
    const family = families.find(f => f.id === id);
    if (!family) throw new AppError('Family not found', 404);
    return family;
  }

  static async createFamily(data: any, user: any): Promise<Family> {
    const families = await MockDatabase.read<Family>('families');
    
    const isApprovedEntity = user.role === 'entity' && user.status === 'approved';
    const familyStatus = user.role === 'admin' || isApprovedEntity ? 'approved' : 'pending';

    const newFamily: Family = {
      ...data,
      id: `f-${uuidv4()}`,
      region: data.neighborhood || data.region || 'Região não informada',
      status: data.status ?? familyStatus,
      supportStatus: data.supportStatus ?? 'needs_help',
      createdByEntityId: user.entityId,
      authorizingEntityId: data.authorizingEntityId ?? user.entityId,
      sourceType: data.sourceType ?? 'entity',
      sourceLabel: data.sourceLabel ?? `Cadastrado por ${user.name}`,
      communityId: data.communityId,
    };

    families.unshift(newFamily);
    await MockDatabase.write('families', families);
    await MockDatabase.appendAuditLog({ type: 'CREATE_FAMILY', familyId: newFamily.id, userId: user.id });
    
    return newFamily;
  }

  static async updateStatus(id: string, data: any): Promise<Family> {
    const families = await MockDatabase.read<Family>('families');
    const idx = families.findIndex(f => f.id === id);
    
    if (idx === -1) throw new AppError('Family not found', 404);

    families[idx] = { ...families[idx], ...data };
    await MockDatabase.write('families', families);
    
    return families[idx];
  }
}
