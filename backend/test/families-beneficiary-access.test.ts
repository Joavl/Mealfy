import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

process.env.APP_ENV = 'ci';
process.env.NODE_ENV = 'test';
process.env.DIRECT_PIX_MODE = 'synthetic';
process.env.DIRECT_PIX_SYNTHETIC_EVPS = '00000000-0000-0000-0000-000000000001';
process.env.EMAIL_DELIVERY_MODE = 'capture';
process.env.EMAIL_CAPTURE_DIR = '.tmp/test-mail';
process.env.JWT_SECRET = 'test-secret-for-family-access';

// Dependencies are loaded after configuring the JWT used by authGuard.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const express = require('express') as typeof import('express');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const jwt = require('jsonwebtoken') as typeof import('jsonwebtoken');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { prisma } = require('../src/database/prisma') as typeof import('../src/database/prisma');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { familiesRoutes } = require('../src/modules/families/families.routes') as typeof import('../src/modules/families/families.routes');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { errorHandler } = require('../src/shared/middlewares/errorHandler') as typeof import('../src/shared/middlewares/errorHandler');

let server: http.Server;
let baseUrl: string;

before(async () => {
  // The guard validates the database-backed session version. This focused routing
  // test uses an in-memory stub rather than requiring a PostgreSQL instance.
  prisma.user.findUnique = async () => ({
    id: 'beneficiary-a', role: 'beneficiary', status: 'active', sessionVersion: 0,
  });
  const app = express();
  app.use('/families', familiesRoutes);
  app.use(errorHandler);
  await new Promise<void>((resolve) => {
    server = app.listen(0, '127.0.0.1', resolve);
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
});

function beneficiaryAuthorization(): string {
  const token = jwt.sign({ sub: 'beneficiary-a', role: 'beneficiary', sv: 0 }, process.env.JWT_SECRET!);
  return `Bearer ${token}`;
}

for (const path of ['/families', '/families/map', '/families/another-family-id']) {
  test(`beneficiary cannot enumerate or read families through GET ${path}`, async () => {
    const response = await fetch(`${baseUrl}${path}`, {
      headers: { authorization: beneficiaryAuthorization() },
    });

    assert.equal(response.status, 403);
    assert.deepEqual(await response.json(), { message: 'Acesso negado', code: 'forbidden' });
  });
}