import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';

/**
 * Criptografia dos códigos de gift card.
 * - Cifra: AES-256-GCM (autenticado) com `ENCRYPTION_KEY` (32 bytes em hex).
 * - O código em claro NUNCA é persistido nem logado.
 * - `codeHash` (SHA-256) serve para anti-duplicidade e busca sem decifrar.
 * - `codeMasked` mostra apenas o final (`****-1234`).
 */
const ALGO = 'aes-256-gcm';
const IV_BYTES = 12; // 96 bits, recomendado para GCM

function getKey(): Buffer {
  const key = env.ENCRYPTION_KEY;
  if (!key || !/^[0-9a-fA-F]{64}$/.test(key)) {
    throw new AppError(
      'ENCRYPTION_KEY inválida: esperado 32 bytes em hexadecimal (64 caracteres).',
      500,
      'invalid_encryption_key',
    );
  }
  return Buffer.from(key, 'hex');
}

/** Cifra o código. Formato de saída: `ivB64.tagB64.cipherB64`. */
export function encryptGiftCardCode(code: string): string {
  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGO, getKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(code, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString('base64'), tag.toString('base64'), ciphertext.toString('base64')].join('.');
}

/** Decifra o código produzido por `encryptGiftCardCode`. Uso restrito (ex.: beneficiário). */
export function decryptGiftCardCode(encrypted: string): string {
  const parts = encrypted.split('.');
  if (parts.length !== 3) {
    throw new AppError('Formato de código criptografado inválido.', 500, 'invalid_ciphertext');
  }
  const [ivB64, tagB64, dataB64] = parts;
  const decipher = crypto.createDecipheriv(ALGO, getKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const plain = Buffer.concat([decipher.update(Buffer.from(dataB64, 'base64')), decipher.final()]);
  return plain.toString('utf8');
}

/** SHA-256 (hex) do código — determinístico, para anti-duplicidade. */
export function hashGiftCardCode(code: string): string {
  return crypto.createHash('sha256').update(code).digest('hex');
}

/** Mascara o código mostrando só os últimos 4 caracteres: `****-1234`. */
export function maskGiftCardCode(code: string): string {
  const last4 = code.trim().slice(-4);
  return `****-${last4}`;
}
