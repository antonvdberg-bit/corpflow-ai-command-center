import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import {
  FACTORY_REQUEST_BODY_LIMIT,
  preserveFactoryRequestBody,
} from '../lib/server/factory-request-body.js';
import paddleSandboxWebhookHandler from '../lib/server/paddle-sandbox/webhook.js';

const require = createRequire(import.meta.url);
const { parseBody } = require('next/dist/server/api-utils/node/parse-body');

const WEBHOOK_SECRET = 'sandbox_webhook_secret_for_tests_only';
const RAW_TRANSACTION = '{ "event_id" : "evt_raw_body_1" , "event_type" : "transaction.completed" , "occurred_at" : "2026-10-06T00:52:00.000Z" , "notification_id" : "ntf_raw_body_1" , "data" : { "id" : "txn_raw_body_1" , "status" : "completed" , "items" : [] , "payments" : [] } }';

function streamFrom(raw, headers = {}) {
  const req = Readable.from([Buffer.isBuffer(raw) ? raw : Buffer.from(raw)]);
  req.headers = headers;
  req.method = 'POST';
  return req;
}

function sign(rawBody, secret = WEBHOOK_SECRET, ts = Math.floor(Date.now() / 1000)) {
  const h1 = createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');
  return `ts=${ts};h1=${h1}`;
}

function mockRes() {
  return {
    statusCode: 200,
    body: undefined,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
}

function fakePrisma() {
  const rows = [];
  return {
    rows,
    automationEvent: {
      findUnique: async ({ where }) =>
        rows.find(
          (row) =>
            row.tenantScope === where.automation_events_scope_idem.tenantScope &&
            row.idempotencyKey === where.automation_events_scope_idem.idempotencyKey,
        ) || null,
      findMany: async () => [],
      create: async ({ data }) => {
        const row = { id: `row_${rows.length + 1}`, ...data };
        rows.push(row);
        return { id: row.id };
      },
    },
  };
}

function withSandboxEnv(fn) {
  const previous = {
    NEXT_PUBLIC_PADDLE_ENV: process.env.NEXT_PUBLIC_PADDLE_ENV,
    NEXT_PUBLIC_PADDLE_CLIENT_TOKEN: process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
    NEXT_PUBLIC_PADDLE_PLATFORM_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_PLATFORM_PRICE_ID,
    NEXT_PUBLIC_PADDLE_IMPLEMENTATION_PRICE_ID: process.env.NEXT_PUBLIC_PADDLE_IMPLEMENTATION_PRICE_ID,
    PADDLE_API_KEY: process.env.PADDLE_API_KEY,
    PADDLE_NOTIFICATION_WEBHOOK_SECRET: process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET,
  };
  process.env.NEXT_PUBLIC_PADDLE_ENV = 'sandbox';
  process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN = 'test_sandbox_client_token';
  process.env.NEXT_PUBLIC_PADDLE_PLATFORM_PRICE_ID = 'pri_platformtest';
  process.env.NEXT_PUBLIC_PADDLE_IMPLEMENTATION_PRICE_ID = 'pri_implementationtest';
  process.env.PADDLE_API_KEY = 'pdl_sdbx_apikey_test_only';
  process.env.PADDLE_NOTIFICATION_WEBHOOK_SECRET = WEBHOOK_SECRET;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const [key, value] of Object.entries(previous)) {
        if (value == null) delete process.env[key];
        else process.env[key] = value;
      }
    });
}

test('factory router disables Next body parsing and preserves the raw Paddle path', () => {
  const src = readFileSync(join(process.cwd(), 'api/factory_router.js'), 'utf8');
  assert.match(src, /bodyParser:\s*false/);
  assert.match(src, /preserveFactoryRequestBody\(req,\s*pathSeg\)/);
  assert.equal(FACTORY_REQUEST_BODY_LIMIT, '1mb');
});

test('raw Paddle bytes reach the webhook handler unchanged', async () => {
  assert.notEqual(JSON.stringify(JSON.parse(RAW_TRANSACTION)), RAW_TRANSACTION);
  const req = streamFrom(RAW_TRANSACTION, {
    'content-type': 'application/json',
    'paddle-signature': sign(RAW_TRANSACTION),
  });
  req.url = '/api/factory_router?__path=paddle/webhook';
  req.query = { __path: 'paddle/webhook' };
  const outcome = await preserveFactoryRequestBody(req, 'paddle/webhook');
  assert.equal(outcome.ok, true);
  assert.equal(Buffer.isBuffer(req.rawBody) ? req.rawBody.toString('utf8') : req.rawBody, RAW_TRANSACTION);
  assert.equal(req.body, undefined);
});

test('a valid Paddle signature is accepted and an invalid signature is rejected', async () => {
  await withSandboxEnv(async () => {
    const validReq = streamFrom(RAW_TRANSACTION, {
      'content-type': 'application/json',
      'paddle-signature': sign(RAW_TRANSACTION),
    });
    await preserveFactoryRequestBody(validReq, 'paddle/webhook');
    const prisma = fakePrisma();
    const validRes = mockRes();
    await paddleSandboxWebhookHandler(validReq, validRes, { prisma });
    assert.equal(validRes.statusCode, 200);
    assert.equal(validRes.body.ok, true);
    assert.equal(validRes.body.accepted, true);
    assert.equal(validRes.body.event_id, 'evt_raw_body_1');
    assert.equal(prisma.rows.length, 1);
    assert.equal(prisma.rows[0].payload.resource_id, 'txn_raw_body_1');

    const tampered = RAW_TRANSACTION.replace('txn_raw_body_1', 'txn_tampered');
    const invalidReq = streamFrom(tampered, {
      'content-type': 'application/json',
      'paddle-signature': sign(RAW_TRANSACTION),
    });
    await preserveFactoryRequestBody(invalidReq, 'paddle/webhook');
    assert.equal(invalidReq.rawBody.toString('utf8'), tampered);
    const invalidPrisma = fakePrisma();
    const invalidRes = mockRes();
    await paddleSandboxWebhookHandler(invalidReq, invalidRes, { prisma: invalidPrisma });
    assert.equal(invalidRes.statusCode, 500);
    assert.equal(invalidRes.body.ok, false);
    assert.equal(invalidRes.body.error, 'webhook_rejected');
    assert.equal(invalidPrisma.rows.length, 0);
  });
});

test('a parsed object is not reconstructed into a Paddle signature payload', async () => {
  const req = {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'paddle-signature': 'ts=1;h1=deadbeef' },
    body: JSON.parse(RAW_TRANSACTION),
    url: '/api/factory_router?__path=paddle/webhook',
    query: { __path: 'paddle/webhook' },
  };
  const outcome = await preserveFactoryRequestBody(req, 'paddle/webhook');
  assert.equal(outcome.ok, true);
  assert.equal(req.rawBody, undefined);
  await withSandboxEnv(async () => {
    const res = mockRes();
    await paddleSandboxWebhookHandler(req, res, { prisma: fakePrisma() });
    assert.equal(res.statusCode, 400);
    assert.equal(res.body.error, 'raw_body_and_signature_required');
  });
});

test('unrelated factory routes keep Next.js request-body behavior', async () => {
  const cases = [
    {
      name: 'json',
      raw: '{"name":"Ada","n":1}',
      headers: { 'content-type': 'application/json' },
    },
    {
      name: 'json with spacing',
      raw: '{ "keep" : "order", "n" : 2 }',
      headers: { 'content-type': 'application/json; charset=utf-8' },
    },
    {
      name: 'empty json',
      raw: '',
      headers: { 'content-type': 'application/json' },
    },
    {
      name: 'urlencoded',
      raw: 'a=1&b=hello+world',
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    },
    {
      name: 'text',
      raw: 'plain value',
      headers: { 'content-type': 'text/plain' },
    },
    {
      name: 'missing content type',
      raw: '{"not":"parsed as json"}',
      headers: {},
    },
  ];

  for (const sample of cases) {
    const ours = streamFrom(sample.raw, sample.headers);
    const next = streamFrom(sample.raw, sample.headers);
    const outcome = await preserveFactoryRequestBody(ours, 'auth/login');
    assert.equal(outcome.ok, true, sample.name);
    const expected = await parseBody(next, '1mb');
    assert.deepEqual(ours.body, expected, sample.name);
    assert.equal(ours.rawBody, undefined, sample.name);
  }

  const preset = { method: 'POST', headers: { 'content-type': 'application/json' }, body: { already: true } };
  const presetOutcome = await preserveFactoryRequestBody(preset, 'tenant/intake');
  assert.equal(presetOutcome.ok, true);
  assert.deepEqual(preset.body, { already: true });

  const invalid = streamFrom('{', { 'content-type': 'application/json' });
  const invalidOutcome = await preserveFactoryRequestBody(invalid, 'feedback');
  assert.equal(invalidOutcome.ok, false);
  assert.equal(invalidOutcome.statusCode, 400);
  assert.equal(invalidOutcome.message, 'Invalid JSON');

  let nextInvalidStatus = 0;
  let nextInvalidMessage = '';
  try {
    await parseBody(streamFrom('{', { 'content-type': 'application/json' }), '1mb');
  } catch (error) {
    nextInvalidStatus = error.statusCode;
    nextInvalidMessage = error.message;
  }
  assert.equal(invalidOutcome.statusCode, nextInvalidStatus);
  assert.equal(invalidOutcome.message, nextInvalidMessage);

  const tooLarge = streamFrom(Buffer.alloc(1024 * 1024 + 1), { 'content-type': 'application/json' });
  const tooLargeOutcome = await preserveFactoryRequestBody(tooLarge, 'feedback');
  assert.equal(tooLargeOutcome.ok, false);
  assert.equal(tooLargeOutcome.statusCode, 413);
  assert.equal(tooLargeOutcome.message, 'Body exceeded 1mb limit');
});
