import assert from 'node:assert/strict';
import { readFile, readdir, rm } from 'node:fs/promises';
import { after, test } from 'node:test';
import os from 'node:os';
import path from 'node:path';

const captureDir = path.join(os.tmpdir(), 'mealfy-mail-' + process.pid);
process.env.APP_ENV = 'ci';
process.env.NODE_ENV = 'test';
process.env.DIRECT_PIX_MODE = 'synthetic';
process.env.DIRECT_PIX_SYNTHETIC_EVPS = '00000000-0000-0000-0000-000000000001';
process.env.EMAIL_DELIVERY_MODE = 'capture';
process.env.EMAIL_CAPTURE_DIR = captureDir;

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mailer = require('../src/shared/services/mailer') as typeof import('../src/shared/services/mailer');
after(async () => { await rm(captureDir, { recursive: true, force: true }); });

test('capture mode stores password reset mail only in the configured local mailbox', async () => {
  assert.doesNotThrow(() => mailer.assertPasswordResetMailerConfigured());
  await mailer.sendPasswordResetEmail('Synthetic-User@Example.Test', 'secret-test-token');
  const files = await readdir(captureDir);
  assert.equal(files.length, 1);
  const capture = JSON.parse(await readFile(path.join(captureDir, files[0]), 'utf8')) as Record<string, unknown>;
  assert.deepEqual(capture, {
    kind: 'password_reset', to: 'synthetic-user@example.test', resetToken: 'secret-test-token', expiresInMinutes: 30,
  });
});

test('verification mail capture contains only delivery metadata and the one-time proof', async () => {
  await mailer.sendEmailVerificationEmail('Verify-Me@Example.Test', 'verification-secret');
  const files = await readdir(captureDir);
  assert.equal(files.length, 2);
  const captures = await Promise.all(files.map(async (file) => JSON.parse(await readFile(path.join(captureDir, file), 'utf8')) as Record<string, unknown>));
  const capture = captures.find(({ kind }) => kind === 'email_verification');
  assert.deepEqual(capture, {
    kind: 'email_verification', to: 'verify-me@example.test', verificationToken: 'verification-secret', expiresInMinutes: 30,
  });
  const serialized = JSON.stringify(capture).toLowerCase();
  for (const forbidden of ['pix', 'family', 'família', 'evp', 'bank', 'banco']) assert.equal(serialized.includes(forbidden), false);
});

test('capture mode rejects multi-recipient and header-injection input without another capture', async () => {
  for (const recipient of ['a@example.test,b@example.test', 'a@example.test\nBcc: b@example.test']) {
    await assert.rejects(() => mailer.sendPasswordResetEmail(recipient, 'token'), (error: unknown) =>
      (error as { code: string }).code === 'email_recipient_forbidden');
  }
  assert.equal((await readdir(captureDir)).length, 2);
});
