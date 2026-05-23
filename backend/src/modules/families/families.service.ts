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

    const isSelfRegister = data.sourceType === 'beneficiary_self';
    const newFamily: any = {
      ...data,
      id: `f-${uuidv4()}`,
      region: data.region || data.neighborhood || 'Região não informada',
      status: data.status ?? (isSelfRegister ? 'approved' : familyStatus),
      supportStatus: data.supportStatus ?? 'needs_help',
      createdByEntityId: isSelfRegister ? undefined : user.entityId,
      authorizingEntityId: isSelfRegister ? undefined : (data.authorizingEntityId ?? user.entityId),
      sourceType: data.sourceType ?? 'entity',
      sourceLabel: data.sourceLabel ?? (isSelfRegister ? 'Cadastro direto da família' : `Cadastrado por ${user.name}`),
      communityId: data.communityId ?? 'c1',
      needsEntitySupport: data.needsEntitySupport ?? isSelfRegister,
    };

    families.unshift(newFamily);
    await MockDatabase.write('families', families);
    await MockDatabase.appendAuditLog({ type: 'CREATE_FAMILY', familyId: newFamily.id, userId: user.id });
    
    return newFamily;
  }

  static async getFamiliesAwaitingEntity(region?: string): Promise<any[]> {
    const families = await MockDatabase.read<any>('families');
    return families.filter((f) => {
      if (!f.needsEntitySupport || f.createdByEntityId) return false;
      if (f.status !== 'approved') return false;
      if (!region) return true;
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return norm(f.region || f.neighborhood || '') === norm(region);
    });
  }

  static async assignEntity(familyId: string, user: any): Promise<Family> {
    const families = await MockDatabase.read<Family>('families');
    const idx = families.findIndex((f) => f.id === familyId);
    if (idx === -1) throw new AppError('Family not found', 404);

    const fam: any = families[idx];
    if (!fam.needsEntitySupport) {
      throw new AppError('Esta família já possui entidade vinculada', 400);
    }

    fam.createdByEntityId = user.entityId;
    fam.authorizingEntityId = user.entityId;
    fam.needsEntitySupport = false;
    fam.sourceType = 'entity';
    fam.sourceLabel = `Acolhida por ${user.name}`;
    fam.sourceEntityName = user.name;

    families[idx] = fam;
    await MockDatabase.write('families', families);
    await MockDatabase.appendAuditLog({ type: 'ASSIGN_ENTITY', familyId, userId: user.id });
    return families[idx];
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
