import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

/** Gera o hash da senha. A senha em claro NUNCA é persistida. */
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, SALT_ROUNDS);
}

/** Compara senha em claro com o hash armazenado. */
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
