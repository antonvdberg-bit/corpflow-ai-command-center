import assert from 'node:assert/strict';
import test from 'node:test';

import { createMemoryBadBuyerOwnershipStore } from '../lib/server/paddle-sandbox/bad-buyer-ownership.js';

const OWNER = { auth_user_id: 'auth-buyer-1', tenant_id: 'tenant-bad-1', brand: 'business_admin_desk' };
const OTHER_OWNER = { auth_user_id: 'auth-buyer-2', tenant_id: 'tenant-bad-1', brand: 'business_admin_desk' };
const CROSS_TENANT = { auth_user_id: 'auth-buyer-1', tenant_id: 'tenant-other', brand: 'business_admin_desk' };
const INTENT = {
  checkout_intent_id: 'intent-bad-1',
  order_confirmation_ref: 'OC-BAD-SYN-1',
  paddle_transaction_id: 'txn-bad-1',
  owner: OWNER,
};

function completedEvent(overrides = {}) {
  return {
    eventId: overrides.eventId || 'evt-bad-completed-1',
    eventType: overrides.eventType || 'transaction.completed',
    occurredAt: overrides.occurredAt || '2026-10-21T08:00:00Z',
    data: {
      id: overrides.transactionId || 'txn-bad-1',
      status: overrides.status || 'completed',
      customData: { brand: 'business_admin_desk', email: 'attacker@example.test' },
      ...overrides.data,
    },
  };
}

async function issuedStore() {
  const store = createMemoryBadBuyerOwnershipStore();
  await store.bindCheckoutIntent(INTENT);
  await store.applyVerifiedWebhook(completedEvent());
  await store.issueOrderConfirmation({
    checkout_intent_id: INTENT.checkout_intent_id,
    owner: OWNER,
    confirmation: { name: INTENT.order_confirmation_ref, html: '<p>synthetic confirmation</p>' },
  });
  return store;
}

test('only the immutable authenticated owner can retrieve an issued confirmation', async () => {
  const store = await issuedStore();
  const owner = await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OWNER });
  const other = await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OTHER_OWNER });
  const anonymous = await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id });
  const crossTenant = await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: CROSS_TENANT });

  assert.equal(owner.code, 'RETRIEVED');
  assert.equal(other.code, 'FORBIDDEN');
  assert.equal(anonymous.code, 'FORBIDDEN');
  assert.equal(crossTenant.code, 'FORBIDDEN');
});

test('draft and unissued records fail closed', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  await store.bindCheckoutIntent(INTENT);
  assert.deepEqual(
    await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OWNER }),
    { ok: false, code: 'NOT_FOUND' },
  );
  assert.deepEqual(
    await store.issueOrderConfirmation({
      checkout_intent_id: INTENT.checkout_intent_id,
      owner: OWNER,
      confirmation: { html: '<p>must not issue</p>' },
    }),
    { ok: false, code: 'ORDER_NOT_ISSUABLE' },
  );
});

test('webhook state never infers ownership from email or custom metadata', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  await store.bindCheckoutIntent(INTENT);
  const result = await store.applyVerifiedWebhook(completedEvent({
    data: {
      id: 'unknown-transaction',
      customData: {
        brand: 'business_admin_desk',
        auth_user_id: OWNER.auth_user_id,
        tenant_id: OWNER.tenant_id,
        correlation_id: INTENT.checkout_intent_id,
      },
    },
  }));

  assert.equal(result.ignored, true);
  assert.equal(result.html, undefined);
  assert.equal((await store.inspect(INTENT.checkout_intent_id)).status, 'draft');
});

test('replay, out-of-order and concurrent completion are idempotent', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  await store.bindCheckoutIntent(INTENT);
  const newer = completedEvent({ eventId: 'evt-newer', occurredAt: '2026-10-21T08:02:00Z' });
  const older = completedEvent({ eventId: 'evt-older', occurredAt: '2026-10-21T08:01:00Z' });
  const results = await Promise.all([
    store.applyVerifiedWebhook(newer),
    store.applyVerifiedWebhook(older),
    store.applyVerifiedWebhook(newer),
  ]);
  assert.equal(results.filter((result) => result.deduped).length, 1);
  assert.equal((await store.inspect(INTENT.checkout_intent_id)).status, 'paid');
  assert.equal((await store.inspect(INTENT.checkout_intent_id)).last_event_id, 'evt-newer');
});

test('failed and abandoned payments never issue an order confirmation', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  await store.bindCheckoutIntent(INTENT);
  await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-failed',
    eventType: 'transaction.payment_failed',
    status: 'failed',
  }));
  assert.deepEqual(
    await store.issueOrderConfirmation({
      checkout_intent_id: INTENT.checkout_intent_id,
      owner: OWNER,
      confirmation: { html: '<p>must not issue</p>' },
    }),
    { ok: false, code: 'ORDER_NOT_ISSUABLE' },
  );
});

test('refund revokes access, preserves the order record and prevents replay issuance', async () => {
  const store = await issuedStore();
  const refund = await store.applyVerifiedWebhook({
    eventId: 'evt-refund-1',
    eventType: 'adjustment.created',
    occurredAt: '2026-10-21T09:00:00Z',
    data: { id: 'adjustment-1', transactionId: INTENT.paddle_transaction_id, action: 'refund' },
  });
  assert.equal(refund.status, 'refunded');
  assert.equal((await store.inspect(INTENT.checkout_intent_id)).issued, true);
  assert.deepEqual(
    await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OWNER }),
    { ok: false, code: 'NOT_FOUND' },
  );
});

test('binding rejects a second owner and non-BAD brand', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  await store.bindCheckoutIntent(INTENT);
  await assert.rejects(
    () => store.bindCheckoutIntent({ ...INTENT, checkout_intent_id: 'intent-bad-2', owner: { ...OWNER, brand: 'corpflowai' } }),
    /BAD_BRAND_REQUIRED/,
  );
  await assert.rejects(
    () => store.bindCheckoutIntent({ ...INTENT, checkout_intent_id: INTENT.checkout_intent_id, owner: OTHER_OWNER }),
    /CHECKOUT_INTENT_ALREADY_BOUND/,
  );
});
