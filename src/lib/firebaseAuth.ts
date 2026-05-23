import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInAnonymously,
  GoogleAuthProvider,
  signOut,
  updateProfile,
  onAuthStateChanged,
  type User as FirebaseUser,
} from 'firebase/auth';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db, isFirebaseConfigured } from './firebase';
import type { UserRole } from '../backend/types';

export type FirestoreUserProfile = {
  uid: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  documentType?: string;
  documentNumber?: string;
  instagram?: string;
  entityId?: string;
  beneficiaryId?: string;
  privacySettings?: {
    showOnRanking: boolean;
    showInstagram: boolean;
    anonymousMode: boolean;
  };
  createdAt?: unknown;
  updatedAt?: unknown;
};

export const FIREBASE_ID_TOKEN_KEY = 'firebase_id_token';

function mapFirebaseAuthError(code: string): string {
  const map: Record<string, string> = {
    'auth/email-already-in-use': 'Este e-mail já está cadastrado.',
    'auth/invalid-email': 'E-mail inválido.',
    'auth/weak-password': 'Senha fraca. Use pelo menos 6 caracteres.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.',
    'auth/popup-closed-by-user': 'Login cancelado.',
  };
  return map[code] ?? 'Erro de autenticação. Tente novamente.';
}

/** Garante sessão Firebase para escrita no Firestore (cadastros sem e-mail usam auth anônima). */
export async function ensureFirestoreAuth(): Promise<FirebaseUser | null> {
  if (!auth) return null;
  if (auth.currentUser) return auth.currentUser;
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (e) {
    console.error('[Firebase] Não foi possível autenticar para gravar cadastro:', e);
    throw new Error('Não foi possível conectar ao Firebase para salvar o cadastro.');
  }
}

export async function saveUserProfileToFirestore(profile: FirestoreUserProfile): Promise<void> {
  if (!db) return;
  await ensureFirestoreAuth();
  const ref = doc(db, 'users', profile.uid);
  await setDoc(
    ref,
    {
      ...profile,
      updatedAt: serverTimestamp(),
      createdAt: profile.createdAt ?? serverTimestamp(),
    },
    { merge: true },
  );
}

export async function registerWithEmail(
  email: string,
  password: string,
  displayName: string,
): Promise<FirebaseUser> {
  if (!auth) throw new Error('Firebase não configurado. Verifique o arquivo .env');
  try {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }
    return cred.user;
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code ?? '';
    throw new Error(mapFirebaseAuthError(code));
  }
}

export async function loginWithEmail(email: string, password: string): Promise<FirebaseUser> {
  if (!auth) throw new Error('Firebase não configurado. Verifique o arquivo .env');
  try {
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
    return cred.user;
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code ?? '';
    throw new Error(mapFirebaseAuthError(code));
  }
}

export async function loginWithGoogle(): Promise<FirebaseUser> {
  if (!auth) throw new Error('Firebase não configurado. Verifique o arquivo .env');
  try {
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    const cred = await signInWithPopup(auth, provider);
    return cred.user;
  } catch (e: unknown) {
    const code = (e as { code?: string })?.code ?? '';
    throw new Error(mapFirebaseAuthError(code));
  }
}

export async function getFirebaseIdToken(forceRefresh = false): Promise<string | null> {
  if (!auth?.currentUser) return null;
  return auth.currentUser.getIdToken(forceRefresh);
}

export async function logoutFirebase(): Promise<void> {
  if (auth) await signOut(auth);
}

export function subscribeFirebaseAuth(callback: (user: FirebaseUser | null) => void): () => void {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

export { isFirebaseConfigured };
