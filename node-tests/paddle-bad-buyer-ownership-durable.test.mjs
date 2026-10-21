import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  createPrismaBadBuyerOwnershipStore,
  isBadBuyerOwnershipDurableEnabled,
  resolveDurableBadBuyerOwnershipStore,
} from '../lib/server/paddle-sandbox/bad-buyer-ownership-durable.js';
import {
  handleBadBuyerCheckoutIntent,
  handleBadBuyerOrderConfirmation,
} from '../lib/server/paddle-sandbox/bad-buyer-ownership-http.js';
import { ENSURE_SCHEMA_STATEMENTS } from '../lib/server/postgres-ensure-schema-statements.js';

const OWNER = { auth_user_id: 'auth-buyer-1', tenant_id: 'tenant-bad-1', brand: 'business_admin_desk' };
const OTHER_OWNER = { auth_user_id: 'auth-buyer-2', tenant_id: 'tenant-bad-1', brand: 'business_admin_desk' };
const INTENT = {
  checkout_intent_id: 'intent-bad-durable-1',
  order_confirmation_ref: 'OC-BAD-DUR-1',
  paddle_transaction_id: 'txn-bad-durable-1',
  owner: OWNER,
};
const VALID_CONFIRMATION = { name: INTENT.order_confirmation_ref, html: '<p>synthetic confirmation</p>' };
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

function uniqueError(target) {
  const error = new Error(`Unique constraint failed on the constraint: ${target}`);
  error.code = 'P2002';
  error.meta = { target: [target] };
  return error;
}

function createFakeDurablePrisma() {
  const ownerships = [];
  const unbound = [];
  const events = [];
  let seq = 0;

  function matchOwnership(where = {}) {
    return ownerships.find((row) => {
      if (where.id) return row.id === where.id;
      if (where.checkoutIntentId) return row.checkoutIntentId === where.checkoutIntentId;
      if (where.paddleTransactionId) {
        return row.paddleTransactionId && row.paddleTransactionId === where.paddleTransactionId;
      }
      return false;
    }) || null;
  }

  const prisma = {
    badPurchaseOwnership: {
      findUnique: async ({ where, select }) => {
        const row = matchOwnership(where);
        if (!row) return null;
        if (!select) return { ...row, reversalHistory: [...(row.reversalHistory || [])] };
        const picked = {};
        for (const key of Object.keys(select)) picked[key] = row[key];
        return picked;
      },
      create: async ({ data }) => {
        if (ownerships.some((row) => row.checkoutIntentId === data.checkoutIntentId)) {
          throw uniqueError('checkout_intent_id');
        }
        if (data.paddleTransactionId && ownerships.some((row) => row.paddleTransactionId === data.paddleTransactionId)) {
          throw uniqueError('paddle_transaction_id');
        }
        if (ownerships.some((row) => row.orderConfirmationRef === data.orderConfirmationRef)) {
          throw uniqueError('order_confirmation_ref');
        }
        const row = {
          id: `own_${++seq}`,
          reversalHistory: [],
          fulfilmentEntitled: false,
          createdAt: new Date(),
          updatedAt: new Date(),
          ...data,
        };
        ownerships.push(row);
        return { ...row };
      },
      update: async ({ where, data }) => {
        const row = matchOwnership(where);
        if (!row) throw new Error('P2025');
        Object.assign(row, data, { updatedAt: new Date() });
        return { ...row, reversalHistory: [...(row.reversalHistory || [])] };
      },
    },
    badPurchaseUnboundReversal: {
      findUnique: async ({ where, select }) => {
        const row = unbound.find((item) => item.paddleTransactionId === where.paddleTransactionId) || null;
        if (!row) return null;
        if (!select) return { ...row, reversalHistory: [...(row.reversalHistory || [])] };
        const picked = {};
        for (const key of Object.keys(select)) picked[key] = row[key];
        return picked;
      },
      upsert: async ({ where, create, update }) => {
        const existing = unbound.find((item) => item.paddleTransactionId === where.paddleTransactionId);
        if (!existing) {
          const row = { id: `unb_${++seq}`, createdAt: new Date(), updatedAt: new Date(), ...create };
          unbound.push(row);
          return row;
        }
        Object.assign(existing, update, { updatedAt: new Date() });
        return existing;
      },
    },
    badPurchaseWebhookEvent: {
      findUnique: async ({ where }) => events.find((row) => row.eventId === where.eventId) || null,
      create: async ({ data }) => {
        if (events.some((row) => row.eventId === data.eventId)) throw uniqueError('event_id');
        const row = { id: `evt_${++seq}`, createdAt: new Date(), ...data };
        events.push(row);
        return row;
      },
    },
  };

  return { prisma, ownerships, unbound, events };
}

function completedEvent(overrides = {}) {
  return {
    eventId: overrides.eventId || 'evt-dur-completed-1',
    eventType: overrides.eventType || 'transaction.completed',
    occurredAt: overrides.occurredAt || '2026-10-21T08:00:00Z',
    data: {
      id: overrides.transactionId || INTENT.paddle_transaction_id,
      status: overrides.status || 'completed',
      customData: { brand: 'business_admin_desk', email: 'attacker@example.test' },
      ...overrides.data,
    },
  };
}

function refundEvent(overrides = {}) {
  return {
    eventId: overrides.eventId || 'evt-dur-refund-1',
    eventType: overrides.eventType || 'adjustment.created',
    occurredAt: overrides.occurredAt || '2026-10-21T09:00:00Z',
    data: {
      id: overrides.adjustmentId || 'adjustment-dur-1',
      transactionId: overrides.transactionId || INTENT.paddle_transaction_id,
      action: overrides.action || 'refund',
      ...overrides.data,
    },
  };
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

async function paidStore() {
  const { prisma } = createFakeDurablePrisma();
  const store = createPrismaBadBuyerOwnershipStore(prisma);
  await store.bindCheckoutIntent(INTENT);
  await store.applyVerifiedWebhook(completedEvent());
  return store;
}

test('durable flag is off by default and resolve stays inert', () => {
  assert.equal(isBadBuyerOwnershipDurableEnabled({}), false);
  assert.equal(isBadBuyerOwnershipDurableEnabled({ CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE: '0' }), false);
  assert.equal(isBadBuyerOwnershipDurableEnabled({ CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE: '1' }), true);
  assert.equal(resolveDurableBadBuyerOwnershipStore({ badPurchaseOwnership: {} }, {}), null);
});

test('prepared migration is not in ensure-schema auto-apply DDL', () => {
  const sql = readFileSync(
    path.join(ROOT, 'prisma/migrations/20261021140000_bad_purchase_ownership/migration.sql'),
    'utf8',
  );
  const joined = ENSURE_SCHEMA_STATEMENTS.join('\n');
  assert.match(sql, /CREATE TABLE "bad_purchase_ownership"/);
  assert.match(sql, /FOREIGN KEY \("auth_user_id"\) REFERENCES "auth_users"/);
  assert.match(sql, /CREATE TABLE "bad_purchase_unbound_reversals"/);
  assert.equal(joined.includes('bad_purchase_ownership'), false);
  assert.match(sql, /Do not copy these statements into lib\/server\/postgres-ensure-schema-statements.js/);
});

test('durable adapter binds an authenticated owner and rejects a duplicate Paddle reference', async () => {
  const { prisma, ownerships } = createFakeDurablePrisma();
  const store = createPrismaBadBuyerOwnershipStore(prisma);
  await store.bindCheckoutIntent(INTENT);
  await assert.rejects(
    () => store.bindCheckoutIntent({
      ...INTENT,
      checkout_intent_id: 'intent-other',
      order_confirmation_ref: 'OC-OTHER',
      owner: OTHER_OWNER,
    }),
    /PADDLE_TRANSACTION_ALREADY_BOUND/,
  );
  assert.equal(ownerships.length, 1);
  assert.equal(ownerships[0].authUserId, OWNER.auth_user_id);
  assert.equal(JSON.stringify(ownerships[0]).includes('<p>'), false);
});

test('durable refund then later completion cannot resurrect issuance', async () => {
  const store = await paidStore();
  await store.issueOrderConfirmation({
    checkout_intent_id: INTENT.checkout_intent_id,
    owner: OWNER,
    confirmation: VALID_CONFIRMATION,
  });
  await store.applyVerifiedWebhook(refundEvent());
  const late = await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-dur-late',
    occurredAt: '2026-10-21T12:00:00Z',
  }));
  const record = await store.inspect(INTENT.checkout_intent_id);
  assert.equal(late.status, 'refunded');
  assert.equal(record.status, 'refunded');
  assert.equal(record.fulfilment_entitled, false);
  assert.equal(
    (await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OWNER })).code,
    'NOT_FOUND',
  );
});

test('durable unbound refund blocks a later authenticated bind and payment', async () => {
  const { prisma } = createFakeDurablePrisma();
  const store = createPrismaBadBuyerOwnershipStore(prisma);
  await store.applyVerifiedWebhook(refundEvent({ occurredAt: '2026-10-21T07:00:00Z' }));
  await store.bindCheckoutIntent(INTENT);
  const completion = await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-dur-after-unbound',
    occurredAt: '2026-10-21T08:30:00Z',
  }));
  assert.equal(completion.status, 'refunded');
  assert.equal((await store.inspect(INTENT.checkout_intent_id)).status, 'refunded');
});

test('owner retrieve is scoped; other buyer and anonymous are denied', async () => {
  const store = await paidStore();
  await store.issueOrderConfirmation({
    checkout_intent_id: INTENT.checkout_intent_id,
    owner: OWNER,
    confirmation: VALID_CONFIRMATION,
  });
  const owner = await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OWNER });
  const other = await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OTHER_OWNER });
  assert.equal(owner.code, 'RETRIEVED');
  assert.equal(owner.confirmation.html, undefined);
  assert.equal(other.code, 'FORBIDDEN');
});

test('HTTP bind and retrieve stay disabled until the durable flag is on', async () => {
  const { prisma } = createFakeDurablePrisma();
  const store = createPrismaBadBuyerOwnershipStore(prisma);
  const session = { ok: true, payload: { typ: 'tenant', user_id: OWNER.auth_user_id, tenant_id: OWNER.tenant_id } };
  const disabled = mockRes();
  await handleBadBuyerCheckoutIntent({ method: 'POST' }, disabled, {
    env: {},
    ownership: store,
    session,
  });
  assert.equal(disabled.statusCode, 404);
  assert.equal(disabled.body.error, 'feature_disabled');

  const created = mockRes();
  await handleBadBuyerCheckoutIntent({ method: 'POST' }, created, {
    env: { CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE: '1' },
    ownership: store,
    session,
  });
  assert.equal(created.statusCode, 200);
  assert.equal(created.body.ok, true);
  assert.match(created.body.checkout_intent_id, /^bad-intent-/);

  await store.associateProviderTransaction({
    checkout_intent_id: created.body.checkout_intent_id,
    paddle_transaction_id: 'txn-http-1',
  });
  await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-http-complete',
    transactionId: 'txn-http-1',
  }));
  await store.issueOrderConfirmation({
    checkout_intent_id: created.body.checkout_intent_id,
    owner: OWNER,
    confirmation: { name: created.body.order_confirmation_ref, html: '<p>ok</p>' },
  });

  const forbidden = mockRes();
  await handleBadBuyerOrderConfirmation(
    { method: 'GET', query: { checkout_intent_id: created.body.checkout_intent_id } },
    forbidden,
    {
      env: { CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE: '1' },
      ownership: store,
      session: {
        ok: true,
        payload: { typ: 'tenant', user_id: OTHER_OWNER.auth_user_id, tenant_id: OTHER_OWNER.tenant_id },
      },
    },
  );
  assert.equal(forbidden.statusCode, 403);

  const ownerRes = mockRes();
  await handleBadBuyerOrderConfirmation(
    { method: 'GET', query: { checkout_intent_id: created.body.checkout_intent_id } },
    ownerRes,
    {
      env: { CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE: '1' },
      ownership: store,
      session,
    },
  );
  assert.equal(ownerRes.statusCode, 200);
  assert.equal(ownerRes.body.confirmation_ref, created.body.order_confirmation_ref);
  assert.equal(ownerRes.body.html, undefined);
});

test('PIN sessions without AuthUser id cannot bind', async () => {
  const { prisma } = createFakeDurablePrisma();
  const res = mockRes();
  await handleBadBuyerCheckoutIntent({ method: 'POST' }, res, {
    env: { CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE: '1' },
    ownership: createPrismaBadBuyerOwnershipStore(prisma),
    session: { ok: true, payload: { typ: 'tenant', tenant_id: OWNER.tenant_id } },
  });
  assert.equal(res.statusCode, 401);
  assert.equal(res.body.error, 'AUTH_USER_REQUIRED');
});

test('verified webhook does not create ownership from metadata when nothing is bound', async () => {
  const { prisma, ownerships } = createFakeDurablePrisma();
  const store = createPrismaBadBuyerOwnershipStore(prisma);
  const ignored = await store.applyVerifiedWebhook(completedEvent({
    data: {
      id: 'txn-never-bound',
      customData: {
        brand: 'business_admin_desk',
        auth_user_id: OWNER.auth_user_id,
        email: 'attacker@example.test',
        correlation_id: INTENT.checkout_intent_id,
      },
    },
  }));
  assert.equal(ignored.ignored, true);
  assert.equal(ownerships.length, 0);
});

test('webhook handler updates bound ownership and never calls bind from the event body', () => {
  const webhook = readFileSync(path.join(ROOT, 'lib/server/paddle-sandbox/webhook.js'), 'utf8');
  const router = readFileSync(path.join(ROOT, 'api/factory_router.js'), 'utf8');
  assert.match(webhook, /applyVerifiedWebhook/);
  assert.doesNotMatch(webhook, /bindCheckoutIntent/);
  assert.match(router, /paddle\/bad\/checkout-intent/);
  assert.match(router, /paddle\/bad\/order-confirmation/);
});
