import * as admin from 'firebase-admin';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';

export interface DecodedToken {
  uid: string;
  email: string;
  name: string;
}

export interface TokenVerifier {
  verify(token: string): Promise<DecodedToken>;
}

export class FirebaseTokenVerifier implements TokenVerifier {
  async verify(token: string): Promise<DecodedToken> {
    try {
      const decoded = await admin.auth().verifyIdToken(token);
      return {
        uid: decoded.uid,
        email: decoded.email || '',
        name: decoded.name || decoded.email?.split('@')[0] || 'Usuário',
      };
    } catch {
      throw new AppError('Invalid Firebase ID Token', 401);
    }
  }
}

export class MockTokenVerifier implements TokenVerifier {
  async verify(token: string): Promise<DecodedToken> {
    if (!token) {
      throw new AppError('Token required', 401);
    }
    const email = token.includes('@') ? token : `${token}@mealfy.local`;
    return {
      uid: token,
      email,
      name: token.split('@')[0] || 'Mock User',
    };
  }
}

let activeVerifier: TokenVerifier;

if (env.AUTH_MODE === 'firebase') {
  activeVerifier = new FirebaseTokenVerifier();
} else {
  activeVerifier = new MockTokenVerifier();
}

// Allow dynamic injection in tests if needed
export function setTokenVerifier(verifier: TokenVerifier) {
  activeVerifier = verifier;
}

export function getTokenVerifier(): TokenVerifier {
  return activeVerifier;
}
