import { createCipheriv, createHmac, randomBytes } from 'node:crypto';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';

const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;
const AAD_VERSION = 1;

export type EvpEnvelope = { encryptionKid: string; nonce: string; ciphertext: string; tag: string; aadVersion: number };

function requireMaterial() {
  const { DIRECT_PIX_EVP_ENCRYPTION_KID: encryptionKid, DIRECT_PIX_EVP_ENCRYPTION_KEY: encryptionKey, DIRECT_PIX_EVP_FINGERPRINT_KID: fingerprintKid, DIRECT_PIX_EVP_FINGERPRINT_KEY: fingerprintKey } = env;
  if (!encryptionKid || !encryptionKey || !fingerprintKid || !fingerprintKey) {
    throw new AppError('Armazenamento seguro da chave Pix indisponível.', 503, 'evp_crypto_unavailable');
  }
  return { encryptionKid, encryptionKey: Buffer.from(encryptionKey, 'hex'), fingerprintKid, fingerprintKey: Buffer.from(fingerprintKey, 'hex') };
}

export function evpAad(input: { recordId: string; familyId: string; assignmentId: string; version: number }): Buffer {
  return Buffer.from(JSON.stringify({ domain: 'direct-pix-evp', aadVersion: AAD_VERSION, recordId: input.recordId, familyId: input.familyId, assignmentId: input.assignmentId, version: input.version }), 'utf8');
}

export function encryptEvp(evp: string, context: { recordId: string; familyId: string; assignmentId: string; version: number }): EvpEnvelope & { fingerprintKid: string; fingerprint: string } {
  const material = requireMaterial();
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, material.encryptionKey, nonce, { authTagLength: TAG_BYTES });
  cipher.setAAD(evpAad(context));
  const ciphertext = Buffer.concat([cipher.update(evp, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return { encryptionKid: material.encryptionKid, nonce: nonce.toString('base64url'), ciphertext: ciphertext.toString('base64url'), tag: tag.toString('base64url'), aadVersion: AAD_VERSION, fingerprintKid: material.fingerprintKid, fingerprint: createHmac('sha256', material.fingerprintKey).update(evp, 'utf8').digest('base64url') };
}

/** Internal-only integrity check used by review/reveal flows; never return plaintext from this module's caller. */
export function decryptEvp(envelope: EvpEnvelope, context: { recordId: string; familyId: string; assignmentId: string; version: number }): string {
  const material = requireMaterial();
  if (envelope.encryptionKid !== material.encryptionKid || envelope.aadVersion !== AAD_VERSION) throw new AppError('Envelope EVP inválido.', 409, 'evp_envelope_invalid');
  try {
    const nonce = Buffer.from(envelope.nonce, 'base64url');
    const tag = Buffer.from(envelope.tag, 'base64url');
    if (nonce.length !== NONCE_BYTES || tag.length !== TAG_BYTES) throw new Error('invalid envelope length');
    const decipher = require('node:crypto').createDecipheriv(ALGORITHM, material.encryptionKey, nonce, { authTagLength: TAG_BYTES });
    decipher.setAAD(evpAad(context));
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext, 'base64url')), decipher.final()]).toString('utf8');
  } catch {
    throw new AppError('Envelope EVP inválido.', 409, 'evp_envelope_invalid');
  }
}
