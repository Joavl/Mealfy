import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import nodemailer from 'nodemailer';
import { env } from '../../config/env';
import { AppError } from '../errors/AppError';

function smtpConfigured(): boolean {
  return Boolean(env.SMTP_HOST && env.SMTP_PORT && env.SMTP_USER && env.SMTP_PASS && env.SMTP_FROM && env.APP_URL);
}

function assertMailerConfigured(unavailableMessage: string): void {
  if (env.EMAIL_DELIVERY_MODE === 'capture' && env.EMAIL_CAPTURE_DIR) return;
  if (!smtpConfigured()) throw new AppError(unavailableMessage, 503, 'email_not_configured');
}

export function assertPasswordResetMailerConfigured(): void {
  assertMailerConfigured('Recuperação de senha indisponível no momento.');
}

export function assertEmailVerificationMailerConfigured(): void {
  assertMailerConfigured('Verificação de e-mail indisponível no momento.');
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

async function captureMail(payload: Record<string, unknown>): Promise<void> {
  const directory = path.resolve(env.EMAIL_CAPTURE_DIR!);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  await writeFile(path.join(directory, randomUUID() + '.json'), JSON.stringify(payload), { encoding: 'utf8', mode: 0o600, flag: 'wx' });
}

async function capturePasswordReset(to: string, resetToken: string): Promise<void> {
  await captureMail({ kind: 'password_reset', to, resetToken, expiresInMinutes: env.PASSWORD_RESET_TTL_MINUTES });
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
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  });

  await transport.sendMail({
    from: env.SMTP_FROM!,
    to: recipient,
    subject: 'Redefinição de senha Mealfy',
    text: 'Recebemos uma solicitação para redefinir sua senha. Use este link em até ' + env.PASSWORD_RESET_TTL_MINUTES + ' minutos: ' + resetUrl.toString() + '\n\nSe não foi você, ignore esta mensagem.',
  });
}

export async function sendEmailVerificationEmail(to: string, verificationToken: string): Promise<void> {
  assertEmailVerificationMailerConfigured();
  const recipient = allowedRecipient(to);
  if (!recipient) throw new AppError('Destinatário indisponível neste ambiente.', 503, 'email_recipient_forbidden');

  if (env.EMAIL_DELIVERY_MODE === 'capture') {
    await captureMail({
      kind: 'email_verification',
      to: recipient,
      verificationToken,
      expiresInMinutes: env.EMAIL_VERIFICATION_TTL_MINUTES,
    });
    return;
  }

  const verificationUrl = new URL('/verify-email', env.APP_URL!);
  verificationUrl.searchParams.set('token', verificationToken);
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST!,
    port: env.SMTP_PORT!,
    secure: env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER!, pass: env.SMTP_PASS! },
    connectionTimeout: 5_000,
    greetingTimeout: 5_000,
    socketTimeout: 10_000,
  });
  await transport.sendMail({
    from: env.SMTP_FROM!,
    to: recipient,
    subject: 'Confirme seu e-mail Mealfy',
    text: 'Confirme que este e-mail pertence a você usando o link em até ' + env.EMAIL_VERIFICATION_TTL_MINUTES + ' minutos: ' + verificationUrl.toString() + '\n\nSe não foi você, ignore esta mensagem.',
  });
}
