import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db, isFirebaseConfigured } from './firebase';
import { ensureFirestoreAuth } from './firebaseAuth';
import type { User, Family, AuthorizingEntity, DonorIndication } from '../backend/types';
import type { FeaturedDonorsConfig } from '../backend/types/featuredDonors';

function stripUndefined<T extends Record<string, unknown>>(obj: T): T {
  const out = { ...obj };
  for (const key of Object.keys(out)) {
    if (out[key] === undefined) delete out[key];
  }
  return out;
}

async function writeDoc(collection: string, id: string, data: Record<string, unknown>): Promise<void> {
  if (!isFirebaseConfigured || !db) {
    console.warn('[Firestore] SDK não configurado — cadastro não replicado na nuvem.');
    return;
  }
  await ensureFirestoreAuth();
  const ref = doc(db, collection, id);
  await setDoc(
    ref,
    stripUndefined({
      ...data,
      updatedAt: serverTimestamp(),
    }),
    { merge: true },
  );
}

/** Perfil de usuário (doador, entidade, beneficiário, admin) */
export async function saveUserCadastroToFirestore(
  userId: string,
  profile: Partial<User> & { uid?: string; firebaseUid?: string },
): Promise<void> {
  await writeDoc('users', userId, {
    ...profile,
    uid: userId,
    createdAt: serverTimestamp(),
  });
}

/** Entidade autorizada (ONG, igreja, etc.) */
export async function saveEntityCadastroToFirestore(entity: AuthorizingEntity): Promise<void> {
  await writeDoc('entities', entity.id, {
    ...entity,
    createdAt: entity.createdAt ?? new Date().toISOString(),
  });
}

/** Família (beneficiário, entidade, indicação convertida) */
export async function saveFamilyCadastroToFirestore(family: Family): Promise<void> {
  await writeDoc('families', family.id, {
    ...family,
    createdAt: serverTimestamp(),
  });
}

/** Indicação de família feita por doador */
export async function saveIndicationCadastroToFirestore(indication: DonorIndication): Promise<void> {
  await writeDoc('indications', indication.id, {
    ...indication,
    createdAt: indication.createdAt ?? new Date().toISOString(),
  });
}

/** Destaque manual do carrossel (admin) */
export async function saveFeaturedDonorsToFirestore(config: FeaturedDonorsConfig): Promise<void> {
  await writeDoc('config', 'featuredDonors', {
    donorIds: config.donorIds,
    updatedAt: config.updatedAt,
    updatedBy: config.updatedBy ?? null,
  });
}

/** Vínculo entidade ↔ família */
export async function saveFamilyEntityAssignmentToFirestore(
  familyId: string,
  entityId: string,
  entityName: string,
): Promise<void> {
  await writeDoc('families', familyId, {
    createdByEntityId: entityId,
    authorizingEntityId: entityId,
    needsEntitySupport: false,
    sourceType: 'entity',
    sourceLabel: `Acolhida por ${entityName}`,
    sourceEntityName: entityName,
    assignedAt: serverTimestamp(),
  });
}
