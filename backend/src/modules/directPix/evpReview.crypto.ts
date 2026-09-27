import { createCipheriv, randomBytes } from 'node:crypto';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';

const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

/** Encrypt only the expected civil-holder name captured during a physical review. */
export function encryptExpectedCivilName(value: string, context: { reviewId: string; versionId: string; sequence: number }) {
  const kid = env.DIRECT_PIX_EVP_ENCRYPTION_KID;
  const configuredKey = env.DIRECT_PIX_EVP_ENCRYPTION_KEY;
  if (!kid || !configuredKey) throw new AppError('Armazenamento seguro da revisão Pix indisponível.', 503, 'evp_review_crypto_unavailable');
  const key = Buffer.from(configuredKey, 'hex');
  if (key.length !== 32) throw new AppError('Armazenamento seguro da revisão Pix indisponível.', 503, 'evp_review_crypto_unavailable');
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, nonce, { authTagLength: TAG_BYTES });
  cipher.setAAD(Buffer.from(JSON.stringify({ domain: 'direct-pix-evp-review-name', reviewId: context.reviewId, versionId: context.versionId, sequence: context.sequence }), 'utf8'));
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return { expectedNameEncryptionKid: kid, expectedNameNonce: nonce.toString('base64url'), expectedNameCiphertext: ciphertext.toString('base64url'), expectedNameTag: cipher.getAuthTag().toString('base64url') };
}
