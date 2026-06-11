import { randomUUID } from 'crypto';
import { env } from '../../config/env';
import { prisma } from '../../config/database';
import { MockDatabase } from '../../database/mock-db';
import { AppError } from '../../shared/errors/AppError';
import { getTokenVerifier } from '../../shared/auth/TokenVerifier';
import { FamiliesService, coordsForRegion } from '../families/families.service';
import { UserRole, AccountStatus, EntityType, FamilyStatus, SupportStatus } from '@prisma/client';

export function formatUser(user: any) {
  if (!user) return null;
  
  // Handle mock DB structure vs Prisma DB structure
  const role = (user.role || '').toLowerCase();
  const status = (user.status || '').toLowerCase();

  let privacySettings = user.privacySettings;
  let totalDonated = user.totalDonated || 0;
  let instagram = user.instagram;
  let facebook = user.facebook;

  if (user.donorProfile) {
    privacySettings = {
      showOnRanking: user.donorProfile.showOnRanking,
      showInstagram: user.donorProfile.showInstagram,
      anonymousMode: user.donorProfile.anonymousMode,
    };
    totalDonated = Number(user.donorProfile.totalDonated);
    instagram = user.donorProfile.instagram || user.instagram;
    facebook = user.donorProfile.facebook || user.facebook;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role,
    status,
    phone: user.phone,
    documentType: user.documentType,
    documentNumber: user.documentNumber,
    firebaseUid: user.firebaseUid,
    entityId: user.organizationId || user.entityId,
    beneficiaryId: user.beneficiaryId,
    totalDonated,
    privacySettings,
    instagram,
    facebook,
  };
}

function mapEntityType(typeStr: string): EntityType {
  const t = (typeStr || '').toUpperCase();
  if (t === 'ONG') return EntityType.ONG;
  if (t === 'IGREJA') return EntityType.IGREJA;
  if (t === 'ESCOLA') return EntityType.ESCOLA;
  if (t === 'INSTITUTO') return EntityType.INSTITUTO;
  return EntityType.ONG;
}

export class AuthService {
  static async registerDonor(data: any): Promise<any> {
    const emailNormalized = data.email.trim().toLowerCase();

    if (env.DATABASE_MODE === 'prisma') {
      const existing = await prisma.user.findUnique({
        where: { email: emailNormalized },
      });
      if (existing) {
        throw new AppError('Email already registered', 409);
      }

      const uid = data.idToken ? undefined : randomUUID(); // if idToken is present, it will sync with firebaseUid
      
      const user = await prisma.user.create({
        data: {
          id: uid,
          name: data.name,
          email: emailNormalized,
          role: UserRole.DONOR,
          status: AccountStatus.ACTIVE,
          phone: data.phone,
          documentType: data.documentType,
          documentNumber: data.documentNumber,
          firebaseUid: data.firebaseUid,
          donorProfile: {
            create: {
              totalDonated: 0,
              showOnRanking: data.privacySettings?.showOnRanking ?? true,
              showInstagram: data.privacySettings?.showInstagram ?? false,
              anonymousMode: data.privacySettings?.anonymousMode ?? false,
              instagram: data.instagram,
              facebook: data.facebook,
            },
          },
        },
        include: {
          donorProfile: true,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'REGISTER_DONOR',
          entityType: 'USER',
          entityId: user.id,
        },
      });

      return formatUser(user);
    } else {
      const users = await MockDatabase.read<any>('users');
      if (users.find((u: any) => u.email?.toLowerCase() === emailNormalized)) {
        throw new AppError('Email already registered', 409);
      }

      const newUser = {
        id: `u-${randomUUID()}`,
        name: data.name,
        email: emailNormalized,
        role: 'donor',
        documentType: data.documentType,
        documentNumber: data.documentNumber,
        phone: data.phone,
        instagram: data.instagram,
        facebook: data.facebook,
        totalDonated: 0,
        status: 'active',
        firebaseUid: data.firebaseUid,
        privacySettings: {
          showOnRanking: data.privacySettings?.showOnRanking ?? true,
          showInstagram: data.privacySettings?.showInstagram ?? false,
          anonymousMode: data.privacySettings?.anonymousMode ?? false,
        },
      };

      users.push(newUser);
      await MockDatabase.write('users', users);
      await MockDatabase.appendAuditLog({ type: 'REGISTER_DONOR', userId: newUser.id });
      return formatUser(newUser);
    }
  }

  static async registerEntity(data: any): Promise<any> {
    const emailNormalized = data.email.trim().toLowerCase();

    if (env.DATABASE_MODE === 'prisma') {
      const existing = await prisma.user.findUnique({
        where: { email: emailNormalized },
      });
      if (existing) {
        throw new AppError('Email already registered', 409);
      }

      const entityId = randomUUID();
      const userId = randomUUID();

      await prisma.organization.create({
        data: {
          id: entityId,
          name: data.name,
          cnpj: data.cnpj,
          type: mapEntityType(data.type),
          responsibleName: data.responsibleName,
          email: emailNormalized,
          phone: data.phone,
          region: data.region,
          status: AccountStatus.PENDING,
        },
      });

      const user = await prisma.user.create({
        data: {
          id: userId,
          name: data.responsibleName || data.name,
          email: emailNormalized,
          role: UserRole.ENTITY,
          status: AccountStatus.PENDING,
          organizationId: entityId,
          phone: data.phone,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'REGISTER_ENTITY',
          entityType: 'USER',
          entityId: user.id,
        },
      });

      return formatUser(user);
    } else {
      const users = await MockDatabase.read<any>('users');
      const entities = await MockDatabase.read<any>('entities');

      if (users.find((u: any) => u.email?.toLowerCase() === emailNormalized)) {
        throw new AppError('Email already registered', 409);
      }

      const entityId = `e-${randomUUID()}`;
      const userId = `u-${randomUUID()}`;

      const newEntity = {
        id: entityId,
        name: data.name,
        cnpj: data.cnpj,
        region: data.region,
        type: data.type || 'ONG',
        responsibleName: data.responsibleName,
        email: emailNormalized,
        phone: data.phone,
        status: 'pending',
        createdAt: new Date().toISOString(),
      };

      const newUser = {
        id: userId,
        name: data.responsibleName || data.name,
        email: emailNormalized,
        role: 'entity',
        entityId: entityId,
        phone: data.phone,
        totalDonated: 0,
        status: 'pending',
      };

      users.push(newUser);
      entities.push(newEntity);

      await MockDatabase.write('users', users);
      await MockDatabase.write('entities', entities);
      await MockDatabase.appendAuditLog({ type: 'REGISTER_ENTITY', userId, entityId });

      return formatUser(newUser);
    }
  }

  static async login(email: string, password: string): Promise<any> {
    const normalizedEmail = email.trim().toLowerCase();
    const demoPassword = process.env.DEMO_PASSWORD ?? 'mealfy123';

    if (normalizedEmail.endsWith('@mealfy.com') && password !== demoPassword) {
      throw new AppError('Invalid credentials', 401);
    }

    if (env.DATABASE_MODE === 'prisma') {
      const user = await prisma.user.findUnique({
        where: { email: normalizedEmail },
        include: {
          donorProfile: true,
          organization: true,
        },
      });

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      return formatUser(user);
    } else {
      const users = await MockDatabase.read<any>('users');
      const user = users.find((u: any) => u.email?.toLowerCase() === normalizedEmail);

      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      return formatUser(user);
    }
  }

  static async loginFirebase(idToken: string): Promise<any> {
    const decoded = await getTokenVerifier().verify(idToken);
    const uid = decoded.uid;
    const email = decoded.email;
    const name = decoded.name;

    let user: any = null;

    if (env.DATABASE_MODE === 'prisma') {
      user = await prisma.user.findFirst({
        where: {
          OR: [
            { id: uid },
            { firebaseUid: uid },
            { email: email || undefined }
          ]
        },
        include: {
          donorProfile: true,
          organization: true,
        }
      });

      if (!user && env.AUTH_MODE === 'firebase' && email) {
        user = await prisma.user.create({
          data: {
            name,
            email,
            role: UserRole.DONOR,
            status: AccountStatus.ACTIVE,
            firebaseUid: uid,
            donorProfile: {
              create: {
                totalDonated: 0,
                showOnRanking: true,
                showInstagram: false,
                anonymousMode: false,
              }
            }
          },
          include: {
            donorProfile: true,
            organization: true,
          }
        });
      }
    } else {
      const users = await MockDatabase.read<any>('users');
      user = users.find((u: any) => u.id === uid || u.firebaseUid === uid || (email && u.email?.toLowerCase() === email.toLowerCase()));

      if (!user && env.AUTH_MODE === 'firebase' && email) {
        user = {
          id: uid,
          name,
          email,
          role: 'donor',
          status: 'active',
          firebaseUid: uid,
          totalDonated: 0,
          privacySettings: {
            showOnRanking: true,
            showInstagram: false,
            anonymousMode: false
          }
        };
        users.push(user);
        await MockDatabase.write('users', users);
      }
    }

    if (!user) {
      throw new AppError('User not found or invalid session', 401);
    }

    return {
      token: idToken,
      user: formatUser(user)
    };
  }

  static async registerBeneficiary(data: any): Promise<{ user: any; family: any }> {
    const cpf = (data.responsibleCpf || '').replace(/\D/g, '');

    if (env.DATABASE_MODE === 'prisma') {
      const existing = await prisma.user.findFirst({
        where: { documentNumber: cpf },
      });
      if (existing) {
        throw new AppError('CPF já cadastrado', 409);
      }

      const [lat, lng] = coordsForRegion(data.region);


      // Create Family
      const family = await prisma.family.create({
        data: {
          representativeName: data.familyName,
          familyName: data.familyName,
          responsibleCpf: cpf,
          childrenNamesJson: JSON.stringify(data.childrenNames || []),
          photoUrl: data.photoUrl,
          description: `Família ${data.familyName}, responsável ${data.responsibleName}. ${data.childrenCount} criança(s).`,
          shortAddress: data.shortAddress || data.neighborhood || data.region,
          region: data.region,
          neighborhood: data.neighborhood || data.region,
          city: data.city || 'São Paulo',
          state: data.state || 'SP',
          childrenCount: data.childrenCount || 0,
          latitude: lat,
          longitude: lng,
          status: FamilyStatus.APPROVED,
          supportStatus: SupportStatus.NEEDS_HELP,
          needsEntitySupport: true,
          sourceType: 'beneficiary_self',
          sourceLabel: 'Cadastro direto da família',
          priorityLevel: 4,
        },
      });

      // Create User
      const userId = randomUUID();
      const user = await prisma.user.create({
        data: {
          id: userId,
          name: data.responsibleName,
          email: `beneficiario+${cpf.slice(-4)}@mealfy.local`,
          role: UserRole.BENEFICIARY,
          status: AccountStatus.ACTIVE,
          documentType: 'cpf',
          documentNumber: cpf,
          beneficiaryId: family.id,
        },
      });

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'REGISTER_BENEFICIARY',
          entityType: 'FAMILY',
          entityId: family.id,
        },
      });

      return { user: formatUser(user), family };
    } else {
      const users = await MockDatabase.read<any>('users');
      if (users.find((u: any) => u.documentNumber === cpf)) {
        throw new AppError('CPF já cadastrado', 409);
      }

      const [lat, lng] = coordsForRegion(data.region);
      const children = (data.childrenNames || []).map((name: string, i: number) => ({
        id: `ch-${i}`,
        name,
        age: 0,
        school: 'A informar',
      }));

      const familyPayload = {
        representativeName: data.familyName,
        familyName: data.familyName,
        responsibleName: data.responsibleName,
        responsibleCpf: cpf,
        neighborhood: data.neighborhood || data.region,
        region: data.region,
        city: data.city || 'São Paulo',
        state: data.state || 'SP',
        shortAddress: data.shortAddress || data.neighborhood || data.region,
        description: `Família ${data.familyName}, responsável ${data.responsibleName}. ${data.childrenCount} criança(s).`,
        childrenCount: data.childrenCount,
        children,
        mainNeed: 'Alimentação básica',
        latitude: lat,
        longitude: lng,
        photoUrl: data.photoUrl,
        sourceType: 'beneficiary_self',
        sourceLabel: 'Cadastro direto da família',
        status: 'approved',
        supportStatus: 'needs_help',
        needsEntitySupport: true,
        priorityLevel: 4,
      };

      const systemUser = { id: 'system', role: 'admin', name: 'Sistema', status: 'active' };
      const family = await FamiliesService.createFamily(familyPayload, systemUser);

      const userId = `u-${randomUUID()}`;
      const newUser = {
        id: userId,
        name: data.responsibleName,
        email: `beneficiario+${cpf.slice(-4)}@mealfy.local`,
        role: 'beneficiary',
        documentType: 'cpf',
        documentNumber: cpf,
        beneficiaryId: family.id,
        totalDonated: 0,
        status: 'active',
      };

      users.push(newUser);
      await MockDatabase.write('users', users);
      await MockDatabase.appendAuditLog({ type: 'REGISTER_BENEFICIARY', userId, familyId: family.id });

      return { user: formatUser(newUser), family };
    }
  }

  static async updatePreferences(userId: string, preferences: any): Promise<any> {
    if (env.DATABASE_MODE === 'prisma') {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        include: { donorProfile: true },
      });

      if (!user) {
        throw new AppError('User not found', 404);
      }

      if (user.role !== UserRole.DONOR) {
        throw new AppError('Only donors can have preferences', 403);
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: {
          donorProfile: {
            update: {
              showOnRanking: preferences.showOnRanking ?? undefined,
              showInstagram: preferences.showInstagram ?? undefined,
              anonymousMode: preferences.anonymousMode ?? undefined,
            },
          },
        },
        include: {
          donorProfile: true,
        },
      });

      return formatUser(updated);
    } else {
      const users = await MockDatabase.read<any>('users');
      const userIndex = users.findIndex((u: any) => u.id === userId);

      if (userIndex === -1) {
        throw new AppError('User not found', 404);
      }

      if (users[userIndex].role !== 'donor') {
        throw new AppError('Only donors can have preferences', 403);
      }

      users[userIndex].privacySettings = {
        ...users[userIndex].privacySettings,
        ...preferences,
      };

      await MockDatabase.write('users', users);
      return formatUser(users[userIndex]);
    }
  }
}
