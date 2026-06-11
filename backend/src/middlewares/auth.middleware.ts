import { Request, Response, NextFunction } from 'express';
import * as admin from 'firebase-admin';
import { env } from '../config/env';
import { prisma } from '../config/database';
import { AppError } from '../shared/errors/AppError';
import { MockDatabase } from '../database/mock-db';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const xUserId = req.headers['x-user-id'];
    
    let token = '';
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    } else if (typeof authHeader === 'string') {
      token = authHeader;
    } else if (typeof xUserId === 'string') {
      token = xUserId;
    }

    if (!token) {
      throw new AppError('Authentication required', 401);
    }

    let uid = '';
    let email = '';
    let name = '';

    if (env.AUTH_MODE === 'firebase') {
      try {
        const decodedToken = await admin.auth().verifyIdToken(token);
        uid = decodedToken.uid;
        email = decodedToken.email || '';
        name = decodedToken.name || email.split('@')[0] || 'Usuário';
      } catch (err) {
        throw new AppError('Invalid Firebase ID Token', 401);
      }
    } else {
      // Mock mode
      uid = token;
      // In mock mode we will look up by uid as ID or firebaseUid
    }

    let user: any = null;

    if (env.DATABASE_MODE === 'prisma') {
      // Find user
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

      // Auto-register user if not found in Firebase mode
      if (!user && env.AUTH_MODE === 'firebase' && email) {
        user = await prisma.user.create({
          data: {
            name,
            email,
            role: 'DONOR',
            status: 'ACTIVE',
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
      // Memory/JSON DB mode
      const users = await MockDatabase.read<any>('users');
      const entities = await MockDatabase.read<any>('entities');
      
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
      } else if (user) {
        // Mock DB compatibility: if user belongs to an entity, let's load org info
        if (user.entityId) {
          const org = entities.find((e: any) => e.id === user.entityId);
          if (org) {
            user.organization = org;
          }
        }
      }
    }

    if (!user) {
      throw new AppError('User not found or invalid session', 401);
    }

    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};
