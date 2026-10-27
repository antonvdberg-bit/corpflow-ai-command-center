import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { createMemoryBadErpnextAdapter } from '../lib/server/paddle-sandbox/bad-erpnext-adapter.js';
import {
  handleBadBuyerAuthenticatedCheckout,
  handleBadBuyerOrderConfirmation,
} from '../lib/server/paddle-sandbox/bad-buyer-ownership-http.js';
import { createMemoryBadBuyerOwnershipStore } from '../lib/server/paddle-sandbox/bad-buyer-ownership.js';
import { createMemoryBadPurchaseOutbox } from '../lib/server/paddle-sandbox/bad-purchase-outbox.js';
import { mapBadZarCatalog } from '../lib/server/paddle-sandbox/bad-zar-catalog.js';
import { applyVerifiedBadPurchaseSideEffects } from '../lib/server/paddle-sandbox/webhook.js';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const OWNER = { auth_user_id: 'auth-buyer-1', tenant_id: 'cipc-desk', brand: 'business_admin_desk' };
const OTHER = { auth_user_id: 'auth-buyer-2', tenant_id: 'cipc-desk', brand: 'business_admin_desk' };
const CROSS_TENANT = { auth_user_id: 'auth-buyer-1', tenant_id: 'luxe-maurice', brand: 'business_admin_desk' };
const ENV = {
  CORPFLOW_BAD_BUYER_OWNERSHIP_DURABLE: '1',
  NEXT_PUBLIC_PADDLE_BAD_ONBOARD_EXISTING_PRICE_ID: 'pri_badzar1test',
  NEXT_PUBLIC_PADDLE_BAD_ADDRESS_CHANGE_PRICE_ID: 'pri_badzar6test',
};
const INTAKE = {
  item_code: 'BAD-ONBOARD-EXISTING',
  legal_business_name: 'Example (Pty) Ltd',
  contact_name: 'Alex Example',
  business_email: 'ops@example.test',
  country: 'ZA',
  correlation_id: 'cfai-bad-corr-t04',
};
const ADDRESS_INTAKE = {
  ...INTAKE,
  item_code: 'BAD-ADDRESS-CHANGE',
  correlation_id: 'cfai-bad-corr-address',
};

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

function sessionFor(owner) {
  return { ok: true, payload: { typ: 'tenant', user_id: owner.auth_user_id, tenant_id: owner.tenant_id } };
}

function httpDeps(store, extras = {}) {
  return {
    env: ENV,
    ownership: store,
    allowInjectedSession: true,
    session: sessionFor(OWNER),
    createPaddleTransaction: async () => ({ paddle_transaction_id: extras.paddleTransactionId || 'txn_t04' }),
    ...extras,
  };
}

async function startAuthenticatedCheckout(store, extras = {}) {
  const res = mockRes();
  await handleBadBuyerAuthenticatedCheckout(
    { method: 'POST', headers: {}, body: extras.intake || INTAKE },
    res,
    httpDeps(store, extras),
  );
  return res;
}

function completedEvent(transactionId, overrides = {}) {
  const intake = overrides.intake || INTAKE;
  const mapped = mapBadZarCatalog(ENV).services.find((row) => row.item_code === intake.item_code);
  return {
    eventId: overrides.eventId || 'evt_t04_complete',
    eventType: 'transaction.completed',
    occurredAt: overrides.occurredAt || '2026-10-27T08:00:00Z',
    data: {
      id: transactionId,
      status: 'completed',
      customer: { email: 'attacker@example.test' },
      customData: {
        brand: 'business_admin_desk',
        item_code: intake.item_code,
        correlation_id: intake.correlation_id,
        legal_business_name: intake.legal_business_name,
        contact_name: intake.contact_name,
        country: intake.country,
        checkout_intent_id: overrides.checkoutIntentId || 'forged-intent',
        auth_user_id: 'forged-user',
        email: 'attacker@example.test',
      },
      items: [{
        price: {
          id: mapped.paddle_price_id,
          unitPrice: { amount: String(mapped.paddle_amount_minor), currencyCode: 'ZAR' },
        },
      }],
      details: {
        totals: {
          grandTotal: String(mapped.paddle_amount_minor),
          currencyCode: 'ZAR',
        },
      },
      ...overrides.data,
    },
  };
}

function refundEvent(transactionId, overrides = {}) {
  return {
    eventId: overrides.eventId || 'evt_t09_refund',
    eventType: 'adjustment.created',
    occurredAt: overrides.occurredAt || '2026-10-27T09:00:00Z',
    data: {
      id: overrides.adjustmentId || 'adj_t09',
      transactionId,
      action: 'refund',
    },
  };
}

async function retrieve(store, owner, checkoutIntentId) {
  const res = mockRes();
  await handleBadBuyerOrderConfirmation(
    { method: 'GET', query: { checkout_intent_id: checkoutIntentId } },
    res,
    {
      env: ENV,
      ownership: store,
      allowInjectedSession: true,
      session: owner ? sessionFor(owner) : { ok: false, payload: null },
    },
  );
  return res;
}

async function paidJourney(options = {}) {
  const intake = options.intake || INTAKE;
  const store = createMemoryBadBuyerOwnershipStore();
  const adapter = createMemoryBadErpnextAdapter();
  const outbox = createMemoryBadPurchaseOutbox();
  const checkout = await startAuthenticatedCheckout(store, {
    paddleTransactionId: options.paddleTransactionId || 'txn_t04',
    intake,
  });
  assert.equal(checkout.statusCode, 200);
  const event = completedEvent(checkout.body.paddle_transaction_id, {
    checkoutIntentId: checkout.body.checkout_intent_id,
    intake,
    ...options.event,
  });
  const applied = await applyVerifiedBadPurchaseSideEffects(event, {
    env: ENV,
    badBuyerOwnership: store,
    badAdapter: adapter,
    catalog: mapBadZarCatalog(ENV),
    outbox,
  });
  return { store, adapter, checkout, applied, outbox, intake };
}

function paidIssuedJourney(options = {}) {
  return paidJourney({
    intake: ADDRESS_INTAKE,
    paddleTransactionId: options.paddleTransactionId || 'txn_address',
    event: options.event,
  });
}

test('T04 authenticated checkout binds the session owner to a server-created Paddle transaction', async () => {
  const { store, adapter, checkout, applied } = await paidJourney({ paddleTransactionId: 'txn_t04' });
  const record = await store.inspect(checkout.body.checkout_intent_id);
  assert.equal(record.owner.auth_user_id, OWNER.auth_user_id);
  assert.equal(record.owner.tenant_id, OWNER.tenant_id);
  assert.equal(record.paddle_transaction_id, 'txn_t04');
  assert.equal(applied.badPurchase.outcome, 'completed');
  assert.equal(applied.issued.code, 'CONFIRMATION_NOT_ISSUED');
  assert.equal(record.status, 'paid');
  assert.equal(adapter.orders.length, 1);
  assert.equal(adapter.invoices.length, 0);
  assert.equal(adapter.payments.length, 0);
  assert.equal((await retrieve(store, OWNER, checkout.body.checkout_intent_id)).statusCode, 404);
});

test('an issued BAD address-change confirmation is bound from the bridge document', async () => {
  const { store, adapter, checkout, applied } = await paidIssuedJourney({ paddleTransactionId: 'txn_doc_ok' });
  const record = await store.inspect(checkout.body.checkout_intent_id);
  assert.equal(applied.issued.code, 'ISSUED');
  assert.equal(record.status, 'issued');
  assert.match(String(applied.badPurchase.confirmation_html || ''), /Accepted Service Offer/);
  assert.equal(record.confirmation_ref, applied.badPurchase.confirmation_name);
  assert.equal(record.erpnext_order_ref, applied.badPurchase.order_name);
  assert.equal(adapter.confirmations.length, 1);
  const owner = await retrieve(store, OWNER, checkout.body.checkout_intent_id);
  assert.equal(owner.statusCode, 200);
  assert.equal(owner.body.confirmation_ref, applied.badPurchase.confirmation_name);
  assert.equal(owner.body.html, undefined);
});

test('a completed purchase without an issued BAD document stays unretrievable', async () => {
  const { store, checkout, applied } = await paidJourney({ paddleTransactionId: 'txn_doc_missing' });
  assert.equal(applied.issued.code, 'CONFIRMATION_NOT_ISSUED');
  assert.equal(applied.badPurchase.confirmation_name, null);
  assert.equal(applied.badPurchase.confirmation_html, null);
  const record = await store.inspect(checkout.body.checkout_intent_id);
  assert.equal(record.status, 'paid');
  assert.equal(record.issued, false);
  assert.equal((await retrieve(store, OWNER, checkout.body.checkout_intent_id)).statusCode, 404);
  const webhook = readFileSync(path.join(ROOT, 'lib/server/paddle-sandbox/webhook.js'), 'utf8');
  assert.match(webhook, /issuedConfirmationFromBadBridge/);
  assert.doesNotMatch(webhook, /html:\s*['"]<p>bound-order-confirmation<\/p>['"]/);
});

test('T06 anonymous, other buyer, and wrong-tenant requests cannot retrieve the confirmation', async () => {
  const { store, checkout } = await paidIssuedJourney({ paddleTransactionId: 'txn_t06' });
  const anonymous = await retrieve(store, null, checkout.body.checkout_intent_id);
  const other = await retrieve(store, OTHER, checkout.body.checkout_intent_id);
  const crossTenant = await retrieve(store, CROSS_TENANT, checkout.body.checkout_intent_id);
  assert.equal(anonymous.statusCode, 401);
  assert.equal(other.statusCode, 403);
  assert.equal(crossTenant.statusCode, 403);
});

test('T07 duplicate and out-of-order webhooks do not create a second order', async () => {
  const { store, adapter, checkout, outbox, intake } = await paidIssuedJourney({ paddleTransactionId: 'txn_t07' });
  const duplicate = await applyVerifiedBadPurchaseSideEffects(
    completedEvent('txn_t07', {
      eventId: 'evt_t04_complete',
      checkoutIntentId: checkout.body.checkout_intent_id,
      intake,
    }),
    {
      env: ENV,
      badBuyerOwnership: store,
      badAdapter: adapter,
      catalog: mapBadZarCatalog(ENV),
      outbox,
    },
  );
  const earlier = await applyVerifiedBadPurchaseSideEffects(
    completedEvent('txn_t07', {
      eventId: 'evt_t07_earlier',
      checkoutIntentId: checkout.body.checkout_intent_id,
      occurredAt: '2026-10-27T07:00:00Z',
      intake,
    }),
    {
      env: ENV,
      badBuyerOwnership: store,
      badAdapter: adapter,
      catalog: mapBadZarCatalog(ENV),
      outbox,
    },
  );
  assert.equal(duplicate.issued.code, 'REPLAYED');
  assert.equal(adapter.orders.length, 1);
  assert.equal(adapter.invoices.length, 0);
  assert.equal((await store.inspect(checkout.body.checkout_intent_id)).status, 'issued');
  assert.equal(earlier.issued.ok === true || earlier.issued.code === 'REPLAYED' || earlier.issued.code === 'ORDER_NOT_ISSUABLE', true);
});

test('T07 webhook custom data cannot bind an unbound transaction to a checkout intent', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  const checkout = await startAuthenticatedCheckout(store, { paddleTransactionId: 'txn_t07_bound' });
  await applyVerifiedBadPurchaseSideEffects(
    completedEvent('txn_never_associated', { eventId: 'evt_forged_complete', checkoutIntentId: checkout.body.checkout_intent_id }),
    {
      env: ENV,
      badBuyerOwnership: store,
      badAdapter: createMemoryBadErpnextAdapter(),
      catalog: mapBadZarCatalog(ENV),
      outbox: createMemoryBadPurchaseOutbox(),
    },
  );
  const record = await store.inspect(checkout.body.checkout_intent_id);
  assert.equal(record.paddle_transaction_id, 'txn_t07_bound');
  assert.equal(record.status, 'draft');
  const denied = await retrieve(store, OWNER, checkout.body.checkout_intent_id);
  assert.equal(denied.statusCode, 404);
});

test('T08 failed and abandoned payments do not issue a confirmation', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  const checkout = await startAuthenticatedCheckout(store, { paddleTransactionId: 'txn_t08' });
  await store.applyVerifiedWebhook({
    eventId: 'evt_t08_fail',
    eventType: 'transaction.payment_failed',
    occurredAt: '2026-10-27T08:05:00Z',
    data: { id: 'txn_t08', status: 'failed' },
  });
  const record = await store.inspect(checkout.body.checkout_intent_id);
  assert.equal(record.status, 'abandoned');
  const denied = await retrieve(store, OWNER, checkout.body.checkout_intent_id);
  assert.equal(denied.statusCode, 404);
  const unissued = await startAuthenticatedCheckout(store, { paddleTransactionId: 'txn_t08_abandoned' });
  const draftDenied = await retrieve(store, OWNER, unissued.body.checkout_intent_id);
  assert.equal(draftDenied.statusCode, 404);
});

test('T09 refund before and after fulfilment stays terminal', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  await store.applyVerifiedWebhook(refundEvent('txn_t09_early', { eventId: 'evt_t09_early' }));
  const early = await startAuthenticatedCheckout(store, { paddleTransactionId: 'txn_t09_early' });
  await applyVerifiedBadPurchaseSideEffects(
    completedEvent('txn_t09_early', { eventId: 'evt_t09_late_complete', checkoutIntentId: early.body.checkout_intent_id }),
    {
      env: ENV,
      badBuyerOwnership: store,
      badAdapter: createMemoryBadErpnextAdapter(),
      catalog: mapBadZarCatalog(ENV),
      outbox: createMemoryBadPurchaseOutbox(),
    },
  );
  const earlyRecord = await store.inspect(early.body.checkout_intent_id);
  assert.equal(earlyRecord.status, 'refunded');
  assert.equal((await retrieve(store, OWNER, early.body.checkout_intent_id)).statusCode, 404);

  const { store: paidStore, checkout } = await paidIssuedJourney({ paddleTransactionId: 'txn_t09_after' });
  await paidStore.applyVerifiedWebhook(refundEvent('txn_t09_after', { eventId: 'evt_t09_after' }));
  await paidStore.applyVerifiedWebhook(completedEvent('txn_t09_after', {
    eventId: 'evt_t09_resurrect',
    checkoutIntentId: checkout.body.checkout_intent_id,
    intake: ADDRESS_INTAKE,
  }));
  const after = await paidStore.inspect(checkout.body.checkout_intent_id);
  assert.equal(after.status, 'refunded');
  assert.equal(after.fulfilment_entitled, false);
  assert.equal((await retrieve(paidStore, OWNER, checkout.body.checkout_intent_id)).statusCode, 404);
});

test('unauthenticated checkout and injected-session production wiring stay fail-closed', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  const unauthenticated = mockRes();
  await handleBadBuyerAuthenticatedCheckout(
    { method: 'POST', headers: {}, body: INTAKE },
    unauthenticated,
    { env: ENV, ownership: store },
  );
  assert.equal(unauthenticated.statusCode, 401);

  const disabled = mockRes();
  await handleBadBuyerAuthenticatedCheckout(
    { method: 'POST', headers: {}, body: INTAKE },
    disabled,
    { env: {}, ownership: store, allowInjectedSession: true, session: sessionFor(OWNER) },
  );
  assert.equal(disabled.statusCode, 404);
  assert.equal(disabled.body.error, 'feature_disabled');

  const router = readFileSync(path.join(ROOT, 'api/factory_router.js'), 'utf8');
  const page = readFileSync(path.join(ROOT, 'pages/billing/paddle-sandbox-bad.js'), 'utf8');
  assert.match(router, /handleBadBuyerAuthenticatedCheckout\(req, res, \{ prisma \}\)/);
  assert.doesNotMatch(router, /allowInjectedSession: true/);
  assert.match(page, /transactionId: body\.paddle_transaction_id/);
  assert.doesNotMatch(page, /Checkout\.open\(\{[\s\S]*items:/);
});
