import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import { Readable } from 'node:stream';
import test from 'node:test';

import { createMemoryBadErpnextAdapter } from '../lib/server/paddle-sandbox/bad-erpnext-adapter.js';
import { mapBadZarCatalog } from '../lib/server/paddle-sandbox/bad-zar-catalog.js';
import paddleSandboxWebhookHandler from '../lib/server/paddle-sandbox/webhook.js';
import { preserveFactoryRequestBody } from '../lib/server/factory-request-body.js';

const WEBHOOK_SECRET = 'sandbox_webhook_secret_for_tests_only';
const ENV = {
  NEXT_PUBLIC_PADDLE_BAD_ONBOARD_EXISTING_PRICE_ID: 'pri_badzar1test',
};

function sign(rawBody, secret = WEBHOOK_SECRET, ts = Math.floor(Date.now() / 1000)) {
  const h1 = createHmac('sha256', secret).update(`${ts}:${rawBody}`).digest('hex');
  return `ts=${ts};h1=${h1}`;
}

function streamFrom(raw) {
  const req = Readable.from([Buffer.from(raw)]);
  req.headers = {
    'content-type': 'application/json',
    'paddle-signature': sign(raw),
  };
  req.method = 'POST';
  req.url = '/api/factory_router?__path=paddle/webhook';
  req.query = { __path: 'paddle/webhook' };
  return req;
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

function uniqueError() {
  const error = new Error('Unique constraint failed on the constraint: `automation_events_scope_idem`');
  error.code = 'P2002';
  return error;
}

function fakePrisma() {
  const rows = [];
  let tail = Promise.resolve();
  function serialize(fn) {
    const run = tail.then(fn, fn);
    tail = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }
  function matchKey(row, tenantScope, idempotencyKey) {
    return row.tenantScope === tenantScope && row.idempotencyKey === idempotencyKey;
  }
  return {
    rows,
    automationEvent: {
      findUnique: async ({ where }) =>
        serialize(async () => {
          const key = where.automation_events_scope_idem;
          return rows.find((row) => matchKey(row, key.tenantScope, key.idempotencyKey)) || null;
        }),
      findMany: async () => [],
      create: async ({ data }) =>
        serialize(async () => {
          if (rows.some((row) => matchKey(row, data.tenantScope, data.idempotencyKey))) throw uniqueError();
          const row = { id: `row_${rows.length + 1}`, ...data };
          rows.push(row);
          return { id: row.id };
        }),
      update: async ({ where, data }) =>
        serialize(async () => {
          const row = rows.find((item) => item.id === where.id);
          Object.assign(row, data);
          return row;
        }),
      updateMany: async ({ where, data }) =>
        serialize(async () => {
          const matches = rows.filter((row) => {
            if (where.tenantScope && row.tenantScope !== where.tenantScope) return false;
            if (where.idempotencyKey && row.idempotencyKey !== where.idempotencyKey) return false;
            if (where.id && row.id !== where.id) return false;
            if (where.status?.in && !where.status.in.includes(row.status)) return false;
            if (typeof where.status === 'string' && row.status !== where.status) return false;
            return true;
          });
          for (const row of matches) Object.assign(row, data);
          return { count: matches.length };
        }),
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

function customData() {
  return {
    brand: 'business_admin_desk',
    item_code: 'BAD-ONBOARD-EXISTING',
    correlation_id: 'cfai-bad-corr-webhook',
    legal_business_name: 'Example (Pty) Ltd',
    contact_name: 'Alex Example',
    country: 'ZA',
    business_email: 'ops@example.test',
  };
}

function transactionPayload(overrides = {}) {
  return {
    event_id: overrides.event_id || 'evt_bad_wh_1',
    event_type: overrides.event_type || 'transaction.completed',
    occurred_at: overrides.occurred_at || '2026-10-18T08:00:00.000Z',
    notification_id: overrides.notification_id || 'ntf_bad_wh_1',
    data: {
      id: overrides.transaction_id || 'txn_bad_wh_1',
      status: overrides.status || 'completed',
      custom_data: customData(),
      items: [
        {
          quantity: 1,
          price: {
            id: 'pri_badzar1test',
            product_id: 'pro_bad_test',
            description: 'Existing-company onboarding',
            tax_mode: 'account_setting',
            unit_price: { amount: '19900', currency_code: 'ZAR' },
            quantity: { minimum: 1, maximum: 1 },
            status: 'active',
          },
        },
      ],
      details: {
        tax_rates_used: [],
        line_items: [],
        totals: { grand_total: '19900', currency_code: 'ZAR' },
      },
      payments: [],
    },
  };
}

async function postWebhook(payload, deps) {
  const raw = JSON.stringify(payload);
  const req = streamFrom(raw);
  await preserveFactoryRequestBody(req, 'paddle/webhook');
  const res = mockRes();
  await paddleSandboxWebhookHandler(req, res, {
    prisma: deps.prisma,
    badAdapter: deps.adapter,
    catalog: mapBadZarCatalog(ENV),
    env: ENV,
  });
  return res;
}

test('duplicate completed webhooks create one order and do not re-release onboarding', async () => {
  await withSandboxEnv(async () => {
    const prisma = fakePrisma();
    const adapter = createMemoryBadErpnextAdapter();
    const first = await postWebhook(transactionPayload(), { prisma, adapter });
    const duplicate = await postWebhook(transactionPayload(), { prisma, adapter });
    assert.equal(first.statusCode, 200);
    assert.equal(first.body.bad_purchase.outcome, 'completed');
    assert.equal(duplicate.statusCode, 200);
    assert.equal(duplicate.body.deduped, true);
    assert.equal(duplicate.body.bad_purchase.outcome, 'idempotent_reuse');
    assert.equal(adapter.customers.length, 1);
    assert.equal(adapter.orders.length, 1);
    assert.equal(adapter.onboardings.length, 1);
    assert.equal(adapter.onboardings[0].status, 'released');
    assert.equal(adapter.invoices.length, 0);
  });
});

test('failed adapter work is recovered on Paddle retry of the same event id', async () => {
  await withSandboxEnv(async () => {
    const prisma = fakePrisma();
    const customers = [];
    const orders = [];
    const onboardings = [];
    const down = createMemoryBadErpnextAdapter({ unavailable: true, customers, orders, onboardings });
    const up = createMemoryBadErpnextAdapter({ customers, orders, onboardings });
    const failed = await postWebhook(transactionPayload(), { prisma, adapter: down });
    assert.equal(failed.statusCode, 500);
    assert.equal(orders.length, 0);
    assert.ok(prisma.rows.some((row) => row.idempotencyKey === 'evt_bad_wh_1'));
    const recovered = await postWebhook(transactionPayload(), { prisma, adapter: up });
    assert.equal(recovered.statusCode, 200);
    assert.equal(recovered.body.deduped, true);
    assert.equal(recovered.body.recovered, true);
    assert.equal(recovered.body.bad_purchase.outcome, 'completed');
    assert.equal(customers.length, 1);
    assert.equal(orders.length, 1);
    assert.equal(onboardings.length, 1);
  });
});

test('out-of-order refund before completed does not create an order or release onboarding', async () => {
  await withSandboxEnv(async () => {
    const prisma = fakePrisma();
    const adapter = createMemoryBadErpnextAdapter();
    const refund = await postWebhook(
      transactionPayload({
        event_id: 'evt_bad_wh_refund_first',
        event_type: 'transaction.updated',
        notification_id: 'ntf_refund_first',
        occurred_at: '2026-10-18T08:01:00.000Z',
        status: 'refunded',
      }),
      { prisma, adapter },
    );
    const completed = await postWebhook(
      transactionPayload({
        event_id: 'evt_bad_wh_completed_late',
        notification_id: 'ntf_completed_late',
        occurred_at: '2026-10-18T07:59:00.000Z',
      }),
      { prisma, adapter },
    );
    assert.equal(refund.statusCode, 200);
    assert.equal(refund.body.bad_purchase.outcome, 'refund_or_adjustment');
    assert.equal(completed.statusCode, 200);
    assert.equal(completed.body.bad_purchase.outcome, 'ignored_after_refund');
    assert.equal(adapter.orders.length, 0);
    assert.equal(adapter.onboardings.length, 0);
  });
});

test('refund after completion stays revoked on later completed replay', async () => {
  await withSandboxEnv(async () => {
    const prisma = fakePrisma();
    const adapter = createMemoryBadErpnextAdapter();
    await postWebhook(transactionPayload(), { prisma, adapter });
    const refund = await postWebhook(
      transactionPayload({
        event_id: 'evt_bad_wh_refund',
        event_type: 'transaction.updated',
        notification_id: 'ntf_refund',
        occurred_at: '2026-10-18T08:05:00.000Z',
        status: 'refunded',
      }),
      { prisma, adapter },
    );
    const replay = await postWebhook(
      transactionPayload({
        event_id: 'evt_bad_wh_completed_replay',
        notification_id: 'ntf_replay',
        occurred_at: '2026-10-18T08:06:00.000Z',
      }),
      { prisma, adapter },
    );
    assert.equal(refund.body.bad_purchase.outcome, 'refund_or_adjustment');
    assert.equal(replay.body.bad_purchase.outcome, 'ignored_after_refund');
    assert.equal(adapter.orders.length, 1);
    assert.equal(adapter.onboardings.length, 1);
    assert.equal(adapter.onboardings[0].status, 'revoked');
  });
});

test('parallel duplicate completed deliveries create one customer, order and onboarding', async () => {
  await withSandboxEnv(async () => {
    const prisma = fakePrisma();
    const adapter = createMemoryBadErpnextAdapter({ delayMs: 40 });
    const payload = transactionPayload({ event_id: 'evt_bad_wh_parallel', notification_id: 'ntf_parallel' });
    const [first, second] = await Promise.all([
      postWebhook(payload, { prisma, adapter }),
      postWebhook(payload, { prisma, adapter }),
    ]);
    assert.equal(first.statusCode === 200 || second.statusCode === 200, true);
    assert.ok([first, second].every((row) => row.statusCode === 200 || row.statusCode === 500));
    const outcomes = [first, second].map((row) => row.body?.bad_purchase?.outcome).filter(Boolean);
    assert.ok(outcomes.includes('completed') || outcomes.includes('idempotent_reuse'));
    assert.equal(adapter.customers.length, 1);
    assert.equal(adapter.orders.length, 1);
    assert.equal(adapter.onboardings.length, 1);
    assert.equal(adapter.onboardings[0].status, 'released');
  });
});

test('unbound refund tombstones the transaction so a later bound completed cannot release onboarding', async () => {
  await withSandboxEnv(async () => {
    const prisma = fakePrisma();
    const refund = await postWebhook(
      transactionPayload({
        event_id: 'evt_bad_wh_unbound_refund',
        event_type: 'transaction.updated',
        notification_id: 'ntf_unbound_refund',
        occurred_at: '2026-10-18T08:20:00.000Z',
        status: 'refunded',
      }),
      { prisma, adapter: undefined },
    );
    const adapter = createMemoryBadErpnextAdapter();
    const completed = await postWebhook(
      transactionPayload({
        event_id: 'evt_bad_wh_after_unbound_refund',
        notification_id: 'ntf_after_unbound',
        occurred_at: '2026-10-18T08:21:00.000Z',
      }),
      { prisma, adapter },
    );
    assert.equal(refund.statusCode, 200);
    assert.equal(refund.body.bad_purchase.outcome, 'refund_or_adjustment');
    assert.equal(completed.statusCode, 200);
    assert.equal(completed.body.bad_purchase.outcome, 'ignored_after_refund');
    assert.equal(adapter.orders.length, 0);
    assert.equal(adapter.onboardings.length, 0);
  });
});

test('unbound refund after a completed order recovers revocation once the adapter is bound', async () => {
  await withSandboxEnv(async () => {
    const prisma = fakePrisma();
    const adapter = createMemoryBadErpnextAdapter();
    await postWebhook(transactionPayload({ event_id: 'evt_bad_wh_paid', notification_id: 'ntf_paid' }), { prisma, adapter });
    const refundPayload = transactionPayload({
      event_id: 'evt_bad_wh_refund_unbound',
      event_type: 'transaction.updated',
      notification_id: 'ntf_refund_unbound',
      occurred_at: '2026-10-18T08:30:00.000Z',
      status: 'refunded',
    });
    const unbound = await postWebhook(refundPayload, { prisma, adapter: undefined });
    const replayCompleted = await postWebhook(
      transactionPayload({
        event_id: 'evt_bad_wh_replay_after_unbound_refund',
        notification_id: 'ntf_replay_unbound',
        occurred_at: '2026-10-18T08:31:00.000Z',
      }),
      { prisma, adapter },
    );
    const recoveredRefund = await postWebhook(refundPayload, { prisma, adapter });
    assert.equal(unbound.body.bad_purchase.outcome, 'refund_or_adjustment');
    assert.equal(replayCompleted.body.bad_purchase.outcome, 'ignored_after_refund');
    assert.equal(recoveredRefund.statusCode, 200);
    assert.equal(adapter.orders.length, 1);
    assert.equal(adapter.onboardings.length, 1);
    assert.equal(adapter.onboardings[0].status, 'revoked');
  });
});

test('partial customer write is recovered on retry without a second order', async () => {
  await withSandboxEnv(async () => {
    const prisma = fakePrisma();
    const customers = [];
    const orders = [];
    const onboardings = [];
    const partial = createMemoryBadErpnextAdapter({ failAfter: 'customer', customers, orders, onboardings });
    const full = createMemoryBadErpnextAdapter({ customers, orders, onboardings });
    const failed = await postWebhook(
      transactionPayload({ event_id: 'evt_bad_wh_partial', notification_id: 'ntf_partial' }),
      { prisma, adapter: partial },
    );
    assert.equal(failed.statusCode, 500);
    assert.equal(customers.length, 1);
    assert.equal(orders.length, 0);
    const recovered = await postWebhook(
      transactionPayload({ event_id: 'evt_bad_wh_partial', notification_id: 'ntf_partial' }),
      { prisma, adapter: full },
    );
    assert.equal(recovered.statusCode, 200);
    assert.equal(recovered.body.recovered, true);
    assert.equal(orders.length, 1);
    assert.equal(onboardings.length, 1);
  });
});

test('parallel completed and refund deliveries cannot leave onboarding released', async () => {
  await withSandboxEnv(async () => {
    const prisma = fakePrisma();
    const adapter = createMemoryBadErpnextAdapter({ delayMs: 25 });
    const completed = transactionPayload({
      event_id: 'evt_bad_wh_race_completed',
      notification_id: 'ntf_race_completed',
      occurred_at: '2026-10-18T08:40:00.000Z',
    });
    const refund = transactionPayload({
      event_id: 'evt_bad_wh_race_refund',
      event_type: 'transaction.updated',
      notification_id: 'ntf_race_refund',
      occurred_at: '2026-10-18T08:41:00.000Z',
      status: 'refunded',
    });
    await Promise.all([postWebhook(completed, { prisma, adapter }), postWebhook(refund, { prisma, adapter })]);
    const retryRefund = await postWebhook(refund, { prisma, adapter });
    const retryCompleted = await postWebhook(completed, { prisma, adapter });
    assert.equal(retryCompleted.body.bad_purchase.outcome, 'ignored_after_refund');
    assert.equal(retryRefund.statusCode, 200);
    assert.ok(adapter.onboardings.length === 0 || adapter.onboardings[0].status === 'revoked');
    assert.ok(adapter.orders.length <= 1);
  });
});

test('an older completed event cannot overwrite a newer refunded outbox status', async () => {
  await withSandboxEnv(async () => {
    const prisma = fakePrisma();
    const adapter = createMemoryBadErpnextAdapter();
    await postWebhook(
      transactionPayload({
        event_id: 'evt_bad_wh_newer_refund',
        event_type: 'transaction.updated',
        notification_id: 'ntf_newer_refund',
        occurred_at: '2026-10-18T09:00:00.000Z',
        status: 'refunded',
      }),
      { prisma, adapter },
    );
    const stale = await postWebhook(
      transactionPayload({
        event_id: 'evt_bad_wh_older_completed',
        notification_id: 'ntf_older_completed',
        occurred_at: '2026-10-18T08:00:00.000Z',
      }),
      { prisma, adapter },
    );
    assert.equal(stale.body.bad_purchase.outcome, 'ignored_after_refund');
    assert.equal(adapter.orders.length, 0);
    const tombstone = prisma.rows.find((row) => row.idempotencyKey === 'txn:txn_bad_wh_1');
    assert.equal(tombstone.status, 'refunded');
    assert.equal(tombstone.payload.status, 'refunded');
  });
});

test('payment_failed then later completed still processes required work once', async () => {
  await withSandboxEnv(async () => {
    const prisma = fakePrisma();
    const adapter = createMemoryBadErpnextAdapter();
    const failed = await postWebhook(
      transactionPayload({
        event_id: 'evt_bad_wh_fail',
        event_type: 'transaction.payment_failed',
        notification_id: 'ntf_fail',
        status: 'failed',
      }),
      { prisma, adapter },
    );
    const completed = await postWebhook(
      transactionPayload({
        event_id: 'evt_bad_wh_paid_later',
        notification_id: 'ntf_paid_later',
        occurred_at: '2026-10-18T08:10:00.000Z',
      }),
      { prisma, adapter },
    );
    assert.equal(failed.body.bad_purchase.outcome, 'payment_failed');
    assert.equal(completed.body.bad_purchase.outcome, 'completed');
    assert.equal(adapter.orders.length, 1);
    assert.equal(adapter.onboardings.length, 1);
    assert.equal(adapter.onboardings[0].status, 'released');
  });
});
