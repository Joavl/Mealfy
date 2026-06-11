import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { MockDatabase } from '../../database/mock-db';
import { AppError } from '../../shared/errors/AppError';
import { normalizeString } from '../../shared/utils/normalizeUtils';
import { IndicationStatus, FamilyStatus, SupportStatus } from '@prisma/client';

export class IndicationsService {
  static async create(data: any, userId: string): Promise<any> {
    if (env.DATABASE_MODE === 'prisma') {
      const newIndication = await prisma.familyIndication.create({
        data: {
          representativeName: data.representativeName,
          region: data.region,
          childrenCount: data.childrenCount || 0,
          observation: data.observation || '',
          contact: data.contact,
          indicatedByUserId: userId,
          status: IndicationStatus.PENDING,
        },
      });

      return {
        ...newIndication,
        status: newIndication.status.toLowerCase(),
        createdAt: newIndication.createdAt.toISOString(),
      };
    } else {
      const indications = await MockDatabase.read<any>('indications');
      const newIndication: any = {
        ...data,
        id: `ind-${randomUUID()}`,
        indicatedByUserId: userId,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
      indications.unshift(newIndication);
      await MockDatabase.write('indications', indications);
      return newIndication;
    }
  }

  static async listAll(): Promise<any[]> {
    if (env.DATABASE_MODE === 'prisma') {
      const list = await prisma.familyIndication.findMany({
        orderBy: { createdAt: 'desc' },
      });
      return list.map((i) => ({
        id: i.id,
        representativeName: i.representativeName,
        region: i.region,
        childrenCount: i.childrenCount,
        observation: i.observation,
        contact: i.contact,
        indicatedByUserId: i.indicatedByUserId,
        status: i.status.toLowerCase(),
        createdAt: i.createdAt.toISOString(),
        convertedFamilyId: i.convertedFamilyId,
      }));
    } else {
      return MockDatabase.read<any>('indications');
    }
  }

  static async convertToFamily(indicationId: string, user: any): Promise<any> {
    const userRole = (user.role || '').toUpperCase();
    const userStatus = (user.status || '').toUpperCase();

    if (env.DATABASE_MODE === 'prisma') {
      const indication = await prisma.familyIndication.findUnique({
        where: { id: indicationId },
      });

      if (!indication) throw new AppError('Indicação não encontrada', 404);
      if (indication.status === IndicationStatus.CONVERTED) {
        throw new AppError('Indicação já foi convertida', 409);
      }

      if (userRole === 'ENTITY') {
        if (userStatus !== 'APPROVED') {
          throw new AppError('Entidades pendentes não podem converter indicações', 403);
        }

        // Region verification
        const entityOrg = await prisma.organization.findUnique({
          where: { id: user.entityId },
        });
        const indRegion = normalizeString(indication.region);
        const entityRegion = normalizeString(entityOrg?.region?.split('-')[0] || '');

        if (!indRegion.includes(entityRegion) && !entityRegion.includes(indRegion)) {
          throw new AppError('Indicação fora da sua região de atuação', 403);
        }
      }

      const familyId = randomUUID();

      const [family] = await prisma.$transaction([
        prisma.family.create({
          data: {
            id: familyId,
            representativeName: indication.representativeName,
            familyName: indication.representativeName,
            region: indication.region,
            childrenCount: indication.childrenCount,
            status: FamilyStatus.APPROVED,
            supportStatus: SupportStatus.NEEDS_HELP,
            createdByEntityId: user.entityId,
            sourceType: 'donor_indication',
            sourceLabel: userRole === 'ADMIN' ? 'Validado por Admin Mealfy' : `Validado por ${user.name}`,
            originalIndicationId: indication.id,
            latitude: -23.612 + Math.random() * 0.05,
            longitude: -46.593 + Math.random() * 0.05,
          },
        }),
        prisma.familyIndication.update({
          where: { id: indicationId },
          data: {
            status: IndicationStatus.CONVERTED,
            convertedFamilyId: familyId,
            convertedAt: new Date(),
            convertedByUserId: user.id,
          },
        }),
      ]);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'CONVERT_INDICATION',
          entityType: 'FAMILY',
          entityId: family.id,
        },
      });

      return family;
    } else {
      const indications = await MockDatabase.read<any>('indications');
      const idx = indications.findIndex((i: any) => i.id === indicationId);
      
      if (idx === -1) throw new AppError('Indicação não encontrada', 404);
      const indication = indications[idx];

      if (indication.status === 'converted') {
        throw new AppError('Indicação já foi convertida', 409);
      }

      if (userRole === 'ENTITY') {
        if (userStatus !== 'APPROVED') {
          throw new AppError('Entidades pendentes não podem converter indicações', 403);
        }

        // Region validation
        const entities = await MockDatabase.read<any>('entities');
        const entityData = entities.find((e: any) => e.id === user.entityId);
        
        const indRegion = normalizeString(indication.region);
        const entityRegion = normalizeString(entityData?.region?.split('-')[0]);

        if (!indRegion.includes(entityRegion) && !entityRegion.includes(indRegion)) {
          throw new AppError('Indicação fora da sua região de atuação', 403);
        }
      }

      const families = await MockDatabase.read<any>('families');
      const newFamily = {
        id: `f-conv-${randomUUID()}`,
        representativeName: indication.representativeName,
        region: indication.region,
        childrenCount: indication.childrenCount,
        status: 'approved',
        supportStatus: 'needs_help',
        createdByEntityId: user.entityId,
        sourceType: 'donor_indication',
        sourceLabel: userRole === 'ADMIN' ? 'Validado por Admin Mealfy' : `Validado por ${user.name}`,
        originalIndicationId: indication.id,
        latitude: -23.612 + (Math.random() * 0.05),
        longitude: -46.593 + (Math.random() * 0.05),
      };

      families.unshift(newFamily);
      await MockDatabase.write('families', families);

      indications[idx].status = 'converted';
      await MockDatabase.write('indications', indications);

      await MockDatabase.appendAuditLog({ type: 'CONVERT_INDICATION', indicationId, familyId: newFamily.id, userId: user.id });

      return newFamily;
    }
  }

  static async updateStatus(id: string, status: any): Promise<any> {
    if (env.DATABASE_MODE === 'prisma') {
      const updatedStatus = (status || '').toUpperCase() as IndicationStatus;
      const updated = await prisma.familyIndication.update({
        where: { id },
        data: { status: updatedStatus },
      });
      return {
        ...updated,
        status: updated.status.toLowerCase(),
      };
    } else {
      const indications = await MockDatabase.read<any>('indications');
      const idx = indications.findIndex((i: any) => i.id === id);
      if (idx === -1) throw new AppError('Indicação não encontrada', 404);
      
      indications[idx].status = status;
      await MockDatabase.write('indications', indications);
      return indications[idx];
    }
  }
}
