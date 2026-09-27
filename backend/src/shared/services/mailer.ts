import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';

function smtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM && env.APP_URL);
}

export function assertPasswordResetMailerConfigured(): void {
  if (env.EMAIL_DELIVERY_MODE === 'capture' && env.EMAIL_CAPTURE_DIR) return;
  if (!smtpConfigured()) {
    throw new AppError('Recuperação de senha indisponível no momento.', 503, 'email_not_configured');
  }
}

function normalizeRecipient(to: string): string | null {
  if (to.includes('\r') || to.includes('\n') || to.includes(',') || to.includes(';')) return null;
  const normalized = to.trim().toLowerCase();
  return normalized || null;
}

function allowedRecipient(to: string): string | null {
  const normalized = normalizeRecipient(to);
  if (!normalized) return null;
  if (env.EMAIL_DELIVERY_MODE !== 'allowlist') return normalized;
  return (env.EMAIL_ALLOWLIST ?? []).includes(normalized) ? normalized : null;
}

async function capturePasswordReset(to: string, resetToken: string): Promise<void> {
  const directory = path.resolve(env.EMAIL_CAPTURE_DIR!);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const capture = JSON.stringify({
    kind: 'password_reset',
    to,
    resetToken,
    expiresInMinutes: env.PASSWORD_RESET_TTL_MINUTES,
  });
  await writeFile(path.join(directory, randomUUID() + '.json'), capture, { encoding: 'utf8', mode: 0o600, flag: 'wx' });
}

export async function sendPasswordResetEmail(to: string, resetToken: string): Promise<void> {
  assertPasswordResetMailerConfigured();
  const recipient = allowedRecipient(to);
  if (!recipient) {
    throw new AppError('Destinatário indisponível neste ambiente.', 503, 'email_recipient_forbidden');
  }

  // Capture is a local mailbox with restrictive permissions and no network/log egress.
  if (env.EMAIL_DELIVERY_MODE === 'capture') {
    await capturePasswordReset(recipient, resetToken);
    return;
  }

  const resetUrl = new URL('/reset-password', env.APP_URL!);
  resetUrl.searchParams.set('token', resetToken);
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST!,
    port: env.SMTP_PORT!,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
  });

  await transport.sendMail({
    from: env.SMTP_FROM!,
    to: recipient,
    subject: 'Redefinição de senha Mealfy',
    text: 'Recebemos uma solicitação para redefinir sua senha. Use este link em até ' + env.PASSWORD_RESET_TTL_MINUTES + ' minutos: ' + resetUrl.toString() + '\n\nSe não foi você, ignore esta mensagem.',
  });
}
