import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { MockDatabase } from '../../database/mock-db';
import { AppError } from '../../shared/errors/AppError';
import { FamilyStatus, SupportStatus } from '@prisma/client';

const REGION_COORDS: Record<string, [number, number]> = {
  'Heliópolis': [-23.612, -46.593],
  'Paraisópolis': [-23.617, -46.728],
  'Cidade Tiradentes': [-23.58, -46.74],
  'Grajaú': [-23.75, -46.68],
};

export function coordsForRegion(region: string): [number, number] {
  const base = REGION_COORDS[region] ?? [-23.5505, -46.6333];
  const j = () => (Math.random() - 0.5) * 0.012;
  return [base[0] + j(), base[1] + j()];
}

export function isPubliclyVisibleFamily(f: any): boolean {
  const status = (f.status || '').toUpperCase();
  return status === 'APPROVED';
}

export class FamiliesService {
  static async getPublicFamilies(query?: { region?: string; communityId?: string }): Promise<any[]> {
    if (env.DATABASE_MODE === 'prisma') {
      const families = await prisma.family.findMany({
        where: {
          status: FamilyStatus.APPROVED,
          isDeleted: false,
          communityId: query?.communityId || undefined,
        },
      });

      let visible = families;
      if (query?.region) {
        const normalizedQuery = query.region.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        visible = visible.filter(f => {
          const fReg = (f.neighborhood || f.region || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return fReg === normalizedQuery;
        });
      }

      return visible;
    } else {
      const families = await MockDatabase.read<any>('families');
      let visible = families.filter(isPubliclyVisibleFamily);
      
      if (query?.region) {
        const normalizedQuery = query.region.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        visible = visible.filter(f => {
          const fReg = (f.neighborhood || f.region || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          return fReg === normalizedQuery;
        });
      }

      if (query?.communityId) {
        visible = visible.filter(f => f.communityId === query.communityId);
      }

      return visible;
    }
  }

  static async getFamilyById(id: string): Promise<any> {
    if (env.DATABASE_MODE === 'prisma') {
      const family = await prisma.family.findFirst({
        where: { id, isDeleted: false },
        include: { createdByEntity: true }
      });
      if (!family) throw new AppError('Family not found', 404);
      return family;
    } else {
      const families = await MockDatabase.read<any>('families');
      const family = families.find(f => f.id === id);
      if (!family) throw new AppError('Family not found', 404);
      return family;
    }
  }

  static async createFamily(data: any, user: any): Promise<any> {
    const isApprovedEntity = (user.role || '').toUpperCase() === 'ENTITY' && (user.status || '').toUpperCase() === 'APPROVED';
    const familyStatus = (user.role || '').toUpperCase() === 'ADMIN' || isApprovedEntity ? 'APPROVED' : 'PENDING';
    const isSelfRegister = data.sourceType === 'beneficiary_self';
    const [lat, lng] = coordsForRegion(data.region || data.neighborhood || '');

    if (env.DATABASE_MODE === 'prisma') {
      const family = await prisma.family.create({
        data: {
          representativeName: data.representativeName || data.familyName,
          familyName: data.familyName || data.representativeName,
          responsibleCpf: data.responsibleCpf || null,
          childrenNamesJson: data.childrenNamesJson || (data.childrenNames ? JSON.stringify(data.childrenNames) : null),
          photoUrl: data.photoUrl,
          description: data.description,
          shortAddress: data.shortAddress,
          region: data.region || data.neighborhood || 'Heliópolis',
          neighborhood: data.neighborhood || data.region || 'Heliópolis',
          city: data.city || 'São Paulo',
          state: data.state || 'SP',
          childrenCount: data.childrenCount || 0,
          latitude: data.latitude || lat,
          longitude: data.longitude || lng,
          status: data.status || (isSelfRegister ? FamilyStatus.APPROVED : (familyStatus as FamilyStatus)),
          supportStatus: data.supportStatus || SupportStatus.NEEDS_HELP,
          needsEntitySupport: data.needsEntitySupport ?? isSelfRegister,
          createdByEntityId: isSelfRegister ? null : user.entityId,
          sourceType: data.sourceType || 'entity',
          sourceLabel: data.sourceLabel || (isSelfRegister ? 'Cadastro direto da família' : `Cadastrado por ${user.name}`),
          priorityLevel: data.priorityLevel || 3,
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id === 'system' ? 'admin-1' : user.id, // Fallback to seed admin if system context
          action: 'CREATE_FAMILY',
          entityType: 'FAMILY',
          entityId: family.id,
        }
      });

      return family;
    } else {
      const families = await MockDatabase.read<any>('families');
      
      const newFamily: any = {
        ...data,
        id: `f-${randomUUID()}`,
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
  }

  static async getFamiliesAwaitingEntity(region?: string): Promise<any[]> {
    if (env.DATABASE_MODE === 'prisma') {
      const families = await prisma.family.findMany({
        where: {
          needsEntitySupport: true,
          createdByEntityId: null,
          status: FamilyStatus.APPROVED,
          isDeleted: false,
        }
      });

      if (!region) return families;
      const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return families.filter(f => norm(f.region || f.neighborhood || '') === norm(region));
    } else {
      const families = await MockDatabase.read<any>('families');
      return families.filter((f) => {
        if (!f.needsEntitySupport || f.createdByEntityId) return false;
        if (f.status !== 'approved') return false;
        if (!region) return true;
        const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return norm(f.region || f.neighborhood || '') === norm(region);
      });
    }
  }

  static async assignEntity(familyId: string, user: any): Promise<any> {
    if (env.DATABASE_MODE === 'prisma') {
      const family = await prisma.family.findUnique({ where: { id: familyId } });
      if (!family) throw new AppError('Family not found', 404);
      if (!family.needsEntitySupport) throw new AppError('Esta família já possui entidade vinculada', 400);

      const updated = await prisma.family.update({
        where: { id: familyId },
        data: {
          createdByEntityId: user.entityId,
          needsEntitySupport: false,
          sourceType: 'entity',
          sourceLabel: `Acolhida por ${user.name}`,
        }
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'ASSIGN_ENTITY',
          entityType: 'FAMILY',
          entityId: familyId,
        }
      });

      return updated;
    } else {
      const families = await MockDatabase.read<any>('families');
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
  }

  static async updateStatus(id: string, data: any): Promise<any> {
    if (env.DATABASE_MODE === 'prisma') {
      const statusValue = data.status ? (data.status.toUpperCase() as FamilyStatus) : undefined;
      const supportStatusValue = data.supportStatus ? (data.supportStatus.toUpperCase() as SupportStatus) : undefined;

      const updated = await prisma.family.update({
        where: { id },
        data: {
          status: statusValue || undefined,
          supportStatus: supportStatusValue || undefined,
        }
      });
      return updated;
    } else {
      const families = await MockDatabase.read<any>('families');
      const idx = families.findIndex(f => f.id === id);
      
      if (idx === -1) throw new AppError('Family not found', 404);

      families[idx] = { ...families[idx], ...data };
      await MockDatabase.write('families', families);
      
      return families[idx];
    }
  }
}
