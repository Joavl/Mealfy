import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import http from 'node:http';
import type { AddressInfo } from 'node:net';

process.env.APP_ENV = 'ci';
process.env.NODE_ENV = 'test';
process.env.DIRECT_PIX_MODE = 'synthetic';
process.env.JWT_SECRET = 'environment-safety-http-secret';
process.env.DIRECT_PIX_SYNTHETIC_EVPS = '00000000-0000-0000-0000-000000000001';
process.env.EMAIL_DELIVERY_MODE = 'capture';
process.env.EMAIL_CAPTURE_DIR = '.tmp/test-mail';

// Async controller refusals must reach the same global handler used by createApp.
require('express-async-errors');
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
let createCalled = false;

before(async () => {
  prisma.user.findUnique = async () => ({ id: 'entity-synthetic', role: 'entity', status: 'active', sessionVersion: 0 });
  prisma.family.create = async () => { createCalled = true; throw new Error('must not persist'); };
  const app = express();
  app.use(express.json());
  app.use('/families', familiesRoutes);
  app.use(errorHandler);
  await new Promise<void>((resolve) => { server = app.listen(0, '127.0.0.1', resolve); });
  baseUrl = 'http://127.0.0.1:' + (server.address() as AddressInfo).port;
});

after(async () => {
  await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
});

test('non-production HTTP refuses real family data without echoing or persisting it', async () => {
  const sentinel = 'NOME CIVIL SENTINELA';
  const token = jwt.sign({ sub: 'entity-synthetic', role: 'entity', sv: 0 }, process.env.JWT_SECRET!);
  const response = await fetch(baseUrl + '/families', {
    method: 'POST',
    headers: { authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ responsibleName: sentinel, displayName: sentinel, city: 'Cidade', state: 'SP', dependents: [{ name: sentinel, age: 7 }] }),
  });
  const rawBody = await response.text();

  assert.equal(response.status, 423);
  assert.deepEqual(JSON.parse(rawBody), {
    message: 'Cadastro de dados familiares indisponível neste ambiente.',
    code: 'real_family_data_forbidden',
  });
  assert.doesNotMatch(rawBody, new RegExp(sentinel));
  assert.equal(createCalled, false);
});
