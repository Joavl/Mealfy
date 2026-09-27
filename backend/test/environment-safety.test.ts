import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import path from 'node:path';

const backendRoot = path.resolve(__dirname, '..');
const safetyKeys = [
  'APP_ENV',
  'DIRECT_PIX_MODE',
  'DIRECT_PIX_SYNTHETIC_EVPS',
  'EMAIL_DELIVERY_MODE',
  'EMAIL_ALLOWLIST',
  'DIRECT_PIX_CONTROLLER_APPROVED',
  'DIRECT_PIX_LEGAL_BASIS_APPROVED',
  'DIRECT_PIX_TERMS_APPROVED',
  'DIRECT_PIX_RETENTION_APPROVED',
  'DIRECT_PIX_OPERATIONS_APPROVED',
  'DIRECT_PIX_CONTROLLER_APPROVAL_REF',
  'DIRECT_PIX_LEGAL_BASIS_APPROVAL_REF',
  'DIRECT_PIX_TERMS_VERSION',
  'DIRECT_PIX_RETENTION_POLICY_VERSION',
  'DIRECT_PIX_OPERATIONS_RUNBOOK_REF',
] as const;

function boot(overrides: NodeJS.ProcessEnv = {}) {
  const childEnv = { ...process.env, DOTENV_CONFIG_PATH: '/definitely/missing/.env' };
  for (const key of safetyKeys) delete childEnv[key];
  return spawnSync(
    process.execPath,
    ['--require', 'ts-node/register/transpile-only', '--eval', "require('./src/config/env')"],
    { cwd: backendRoot, env: { ...childEnv, ...overrides }, encoding: 'utf8' },
  );
}

test('startup fails closed when the deployment classification is absent', () => {
  const result = boot({ NODE_ENV: 'test' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /APP_ENV/);
});

test('startup rejects invalid deployment classification', () => {
  const result = boot({ APP_ENV: 'preview', NODE_ENV: 'production' });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /APP_ENV/);
});

test('non-production startup requires explicit synthetic EVP values and captured email', () => {
  const noSyntheticEvp = boot({ APP_ENV: 'ci', NODE_ENV: 'test', DIRECT_PIX_MODE: 'synthetic', EMAIL_DELIVERY_MODE: 'capture', EMAIL_CAPTURE_DIR: '.tmp/test-mail' });
  assert.notEqual(noSyntheticEvp.status, 0);
  assert.match(noSyntheticEvp.stderr, /DIRECT_PIX_SYNTHETIC_EVPS/);

  const outboundEmail = boot({
    APP_ENV: 'staging',
    NODE_ENV: 'production',
    DIRECT_PIX_MODE: 'synthetic',
    DIRECT_PIX_SYNTHETIC_EVPS: '00000000-0000-0000-0000-000000000001',
    EMAIL_DELIVERY_MODE: 'smtp',
  });
  assert.notEqual(outboundEmail.status, 0);
  assert.match(outboundEmail.stderr, /EMAIL_DELIVERY_MODE/);
});

test('startup rejects missing or contradictory direct Pix modes', () => {
  const missing = boot({ APP_ENV: 'ci', NODE_ENV: 'test', EMAIL_DELIVERY_MODE: 'capture' });
  assert.notEqual(missing.status, 0);
  assert.match(missing.stderr, /DIRECT_PIX_MODE/);

  const nonProductionLive = boot({ APP_ENV: 'demo', NODE_ENV: 'production', DIRECT_PIX_MODE: 'live', EMAIL_DELIVERY_MODE: 'capture', EMAIL_CAPTURE_DIR: '.tmp/test-mail' });
  assert.notEqual(nonProductionLive.status, 0);
  assert.match(nonProductionLive.stderr, /DIRECT_PIX_MODE/);

  const productionSynthetic = boot({ APP_ENV: 'production', NODE_ENV: 'production', DIRECT_PIX_MODE: 'synthetic', EMAIL_DELIVERY_MODE: 'smtp' });
  assert.notEqual(productionSynthetic.status, 0);
  assert.match(productionSynthetic.stderr, /DIRECT_PIX_MODE/);
});

test('production startup keeps direct Pix real-data gates closed unless every approval is explicit', () => {
  const result = boot({
    APP_ENV: 'production',
    NODE_ENV: 'production',
    DIRECT_PIX_MODE: 'live',
    EMAIL_DELIVERY_MODE: 'smtp',
    APP_URL: 'https://app.example.com',
    SMTP_HOST: 'smtp.example.com',
    SMTP_PORT: '465',
    SMTP_USER: 'sender',
    SMTP_PASS: 'secret',
    SMTP_FROM: 'sender@example.com',
    DIRECT_PIX_CONTROLLER_APPROVED: 'true',
    DIRECT_PIX_LEGAL_BASIS_APPROVED: 'true',
    DIRECT_PIX_TERMS_APPROVED: 'true',
    DIRECT_PIX_RETENTION_APPROVED: 'true',
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /DIRECT_PIX_OPERATIONS_APPROVED/);
});

test('production rejects weak, malformed or reused step-up HMAC keys', () => {
  const base = {
    APP_ENV: 'production', NODE_ENV: 'production', DIRECT_PIX_MODE: 'disabled', EMAIL_DELIVERY_MODE: 'smtp',
    APP_URL: 'https://app.example.com', SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465',
    SMTP_USER: 'sender', SMTP_PASS: 'secret', SMTP_FROM: 'sender@example.com',
  };
  for (const key of ['short', 'z'.repeat(64)]) {
    const result = boot({ ...base, STEP_UP_OTP_HMAC_KEY: key });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /STEP_UP_OTP_HMAC_KEY/);
  }
  const reused = 'a'.repeat(64);
  const reusedResult = boot({ ...base, JWT_SECRET: reused, STEP_UP_OTP_HMAC_KEY: reused });
  assert.notEqual(reusedResult.status, 0);
  assert.match(reusedResult.stderr, /distinta/);
});

test('production live starts only with every gate and recorded reference', () => {
  const result = boot({
    APP_ENV: 'production', NODE_ENV: 'production', DIRECT_PIX_MODE: 'live', EMAIL_DELIVERY_MODE: 'smtp', STEP_UP_OTP_HMAC_KEY: '9f4c8d2a7e1b6c5039a4d8e2f7b1c6054a9e3d8f2b7c1a605e4d9f3b8c2a7e10',
    APP_URL: 'https://app.example.com', SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465',
    SMTP_USER: 'sender', SMTP_PASS: 'secret', SMTP_FROM: 'sender@example.com',
    DIRECT_PIX_CONTROLLER_APPROVED: 'true', DIRECT_PIX_CONTROLLER_APPROVAL_REF: 'controller-record-1',
    DIRECT_PIX_LEGAL_BASIS_APPROVED: 'true', DIRECT_PIX_LEGAL_BASIS_APPROVAL_REF: 'legal-record-1',
    DIRECT_PIX_TERMS_APPROVED: 'true', DIRECT_PIX_TERMS_VERSION: 'terms-v1',
    DIRECT_PIX_RETENTION_APPROVED: 'true', DIRECT_PIX_RETENTION_POLICY_VERSION: 'retention-v1',
    DIRECT_PIX_OPERATIONS_APPROVED: 'true', DIRECT_PIX_OPERATIONS_RUNBOOK_REF: 'runbook-v1',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('production disabled starts closed without legal gates when email is safely configured', () => {
  const result = boot({
    APP_ENV: 'production', NODE_ENV: 'production', DIRECT_PIX_MODE: 'disabled', EMAIL_DELIVERY_MODE: 'smtp', STEP_UP_OTP_HMAC_KEY: '9f4c8d2a7e1b6c5039a4d8e2f7b1c6054a9e3d8f2b7c1a605e4d9f3b8c2a7e10',
    APP_URL: 'https://app.example.com', SMTP_HOST: 'smtp.example.com', SMTP_PORT: '465',
    SMTP_USER: 'sender', SMTP_PASS: 'secret', SMTP_FROM: 'sender@example.com',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('blank optional values from the example remain closed and do not break capture startup', () => {
  const result = boot({
    APP_ENV: 'development', NODE_ENV: 'development', DIRECT_PIX_MODE: 'synthetic',
    DIRECT_PIX_SYNTHETIC_EVPS: '00000000-0000-0000-0000-000000000001', EMAIL_DELIVERY_MODE: 'capture',
    EMAIL_CAPTURE_DIR: '.tmp/test-mail', EMAIL_ALLOWLIST: '', SMTP_HOST: '', SMTP_PORT: '', SMTP_USER: '', SMTP_PASS: '', SMTP_FROM: '',
    DIRECT_PIX_CONTROLLER_APPROVED: '', DIRECT_PIX_CONTROLLER_APPROVAL_REF: '',
    DIRECT_PIX_LEGAL_BASIS_APPROVED: '', DIRECT_PIX_LEGAL_BASIS_APPROVAL_REF: '',
    DIRECT_PIX_TERMS_APPROVED: '', DIRECT_PIX_TERMS_VERSION: '',
    DIRECT_PIX_RETENTION_APPROVED: '', DIRECT_PIX_RETENTION_POLICY_VERSION: '',
    DIRECT_PIX_OPERATIONS_APPROVED: '', DIRECT_PIX_OPERATIONS_RUNBOOK_REF: '',
  });
  assert.equal(result.status, 0, result.stderr);
});

test('a complete non-production safety configuration starts successfully', () => {
  const result = boot({
    APP_ENV: 'development',
    NODE_ENV: 'development',
    DIRECT_PIX_MODE: 'synthetic',
    DIRECT_PIX_SYNTHETIC_EVPS: '00000000-0000-0000-0000-000000000001',
    EMAIL_DELIVERY_MODE: 'capture',
    EMAIL_CAPTURE_DIR: '.tmp/test-mail',
  });

  assert.equal(result.status, 0, result.stderr);
});
