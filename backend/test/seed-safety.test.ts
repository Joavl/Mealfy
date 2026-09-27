import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import path from 'node:path';

const backendRoot = path.resolve(__dirname, '..');
function runSeed(appEnv: string | undefined) {
  const env = { ...process.env, DIRECT_PIX_MODE: 'synthetic', DATABASE_URL: 'postgresql://invalid:invalid@127.0.0.1:1/never_connect' };
  if (appEnv === undefined) delete env.APP_ENV;
  else env.APP_ENV = appEnv;
  return spawnSync(process.execPath, ['--require', 'ts-node/register/transpile-only', 'prisma/seed.ts'], {
    cwd: backendRoot, env, encoding: 'utf8', timeout: 15_000,
  });
}

for (const appEnv of [undefined, 'production', 'prodution', 'preview']) {
  test('seed refuses unsafe APP_ENV ' + String(appEnv) + ' before connecting to a database', () => {
    const result = runSeed(appEnv);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /(?:\[seed\] refused|Variáveis de ambiente inválidas)/);
    assert.doesNotMatch(result.stderr, /ECONNREFUSED|Can't reach database server|Authentication failed/);
  });
}
