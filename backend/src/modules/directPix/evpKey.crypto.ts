import { createCipheriv, createDecipheriv, createHmac, randomBytes } from 'node:crypto';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';

const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const AAD_VERSION = 1;
type KeyPurpose = 'encryption' | 'fingerprint';
type KeyEntry = Readonly<{ kid: string; key: Buffer; write: boolean }>;
export type EvpEnvelope = { encryptionKid: string; nonce: string; ciphertext: string; tag: string; aadVersion: number };
type Context = { recordId: string; familyId: string; assignmentId: string; version: number };

function unavailable(): never { throw new AppError('Armazenamento seguro da chave Pix indisponível.', 503, 'evp_crypto_unavailable'); }
function invalid(): never { throw new AppError('Envelope EVP inválido.', 409, 'evp_envelope_invalid'); }
function keyEntry(value: unknown, purpose: KeyPurpose): KeyEntry {
  if (!value || typeof value !== 'object') unavailable();
  const { kid, key, write = false } = value as Record<string, unknown>;
  if (typeof kid !== 'string' || !/^[A-Za-z0-9._-]{1,64}$/.test(kid) || typeof key !== 'string' || !/^[0-9a-fA-F]{64}$/.test(key) || typeof write !== 'boolean') unavailable();
  return { kid, key: Buffer.from(key, 'hex'), write };
}
function validEntries(raw: unknown, purpose: KeyPurpose): KeyEntry[] {
  if (!Array.isArray(raw) || raw.length === 0) unavailable();
  const entries = raw.map((entry) => keyEntry(entry, purpose));
  if (new Set(entries.map(({ kid }) => kid)).size !== entries.length || entries.filter(({ write }) => write).length < 1) unavailable();
  return entries;
}
export type EvpKeyring = Readonly<{ encryption: readonly KeyEntry[]; fingerprints: readonly KeyEntry[] }>;
/** Keyring comes from an injected secret-manager value; legacy single-key env is a one-entry keyring. */
export function evpKeyring(): EvpKeyring {
  const raw = env.DIRECT_PIX_EVP_KEYRING;
  if (!raw) {
    const { DIRECT_PIX_EVP_ENCRYPTION_KID: encryptionKid, DIRECT_PIX_EVP_ENCRYPTION_KEY: encryptionKey, DIRECT_PIX_EVP_FINGERPRINT_KID: fingerprintKid, DIRECT_PIX_EVP_FINGERPRINT_KEY: fingerprintKey } = env;
    if (!encryptionKid || !encryptionKey || !fingerprintKid || !fingerprintKey) unavailable();
    const encryption = keyEntry({ kid: encryptionKid, key: encryptionKey, write: true }, 'encryption');
    const fingerprint = keyEntry({ kid: fingerprintKid, key: fingerprintKey, write: true }, 'fingerprint');
    if (encryption.key.equals(fingerprint.key)) unavailable();
    return { encryption: [encryption], fingerprints: [fingerprint] };
  }
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { unavailable(); }
  if (!parsed || typeof parsed !== 'object') unavailable();
  const { encryption, fingerprints } = parsed as Record<string, unknown>;
  const result = { encryption: validEntries(encryption, 'encryption'), fingerprints: validEntries(fingerprints, 'fingerprint') };
  if (result.encryption.filter(({ write }) => write).length !== 1 || result.encryption.some((a) => result.fingerprints.some((b) => a.key.equals(b.key)))) unavailable();
  return result;
}
function writeKey(entries: readonly KeyEntry[]): KeyEntry { const entry = entries.find(({ write }) => write); return entry ?? unavailable(); }
function readKey(entries: readonly KeyEntry[], kid: string): KeyEntry { const entry = entries.find((candidate) => candidate.kid === kid); return entry ?? invalid(); }

export function evpAad(input: Context): Buffer { return Buffer.from(JSON.stringify({ domain: 'direct-pix-evp', aadVersion: AAD_VERSION, recordId: input.recordId, familyId: input.familyId, assignmentId: input.assignmentId, version: input.version }), 'utf8'); }
export function fingerprintEvp(evp: string, kid: string): string { const key = readKey(evpKeyring().fingerprints, kid); return createHmac('sha256', key.key).update(evp, 'utf8').digest('base64url'); }
export function fingerprintEvpForWrites(evp: string): Array<{ fingerprintKid: string; fingerprint: string }> { const ring = evpKeyring(); return ring.fingerprints.filter(({ write }) => write).map(({ kid, key }) => ({ fingerprintKid: kid, fingerprint: createHmac('sha256', key).update(evp, 'utf8').digest('base64url') })); }
export function encryptEvp(evp: string, context: Context): EvpEnvelope & { fingerprintKid: string; fingerprint: string } {
  const ring = evpKeyring(); const encryption = writeKey(ring.encryption); const primaryFingerprint = writeKey(ring.fingerprints);
  const nonce = randomBytes(NONCE_BYTES); const cipher = createCipheriv(ALGORITHM, encryption.key, nonce, { authTagLength: TAG_BYTES });
  cipher.setAAD(evpAad(context)); const ciphertext = Buffer.concat([cipher.update(evp, 'utf8'), cipher.final()]);
  return { encryptionKid: encryption.kid, nonce: nonce.toString('base64url'), ciphertext: ciphertext.toString('base64url'), tag: cipher.getAuthTag().toString('base64url'), aadVersion: AAD_VERSION, fingerprintKid: primaryFingerprint.kid, fingerprint: createHmac('sha256', primaryFingerprint.key).update(evp, 'utf8').digest('base64url') };
}
export function decryptEvp(envelope: EvpEnvelope, context: Context): string {
  if (envelope.aadVersion !== AAD_VERSION) invalid();
  try {
    const nonce = Buffer.from(envelope.nonce, 'base64url'); const tag = Buffer.from(envelope.tag, 'base64url'); const ciphertext = Buffer.from(envelope.ciphertext, 'base64url');
    if (nonce.length !== NONCE_BYTES || tag.length !== TAG_BYTES || ciphertext.length === 0 || !/^[A-Za-z0-9_-]+$/.test(envelope.ciphertext)) invalid();
    const decipher = createDecipheriv(ALGORITHM, readKey(evpKeyring().encryption, envelope.encryptionKid).key, nonce, { authTagLength: TAG_BYTES });
    decipher.setAAD(evpAad(context)); decipher.setAuthTag(tag); return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  } catch (error) { if (error instanceof AppError) throw error; invalid(); }
}
