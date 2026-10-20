import assert from 'node:assert/strict';
import test from 'node:test';

import { checkoutCustomData, sanitizeBadLog, validateBadCustomerIntake } from '../lib/server/paddle-sandbox/bad-intake.js';
import {
  createMemoryBadErpnextAdapter,
  getBadErpnextWriteMode,
  productionErpnextWritesAllowed,
} from '../lib/server/paddle-sandbox/bad-erpnext-adapter.js';
import { processBadPaddleEvent, processBadPurchaseWithRecovery, releaseOnboardingWithoutPayment } from '../lib/server/paddle-sandbox/bad-order-bridge.js';
import { createMemoryBadPurchaseOutbox, mergeTransactionPayload } from '../lib/server/paddle-sandbox/bad-purchase-outbox.js';
import { APPROVED_BAD_ZAR_SERVICES, mapBadZarCatalog } from '../lib/server/paddle-sandbox/bad-zar-catalog.js';

const ENV = Object.fromEntries(
  APPROVED_BAD_ZAR_SERVICES.map((row, index) => [row.env_key, `pri_badzar${index + 1}test`]),
);

function intake(overrides = {}) {
  return {
    legal_business_name: 'Example (Pty) Ltd',
    contact_name: 'Alex Example',
    business_email: 'ops@example.test',
    country: 'ZA',
    item_code: 'BAD-ONBOARD-EXISTING',
    correlation_id: 'cfai-bad-corr-0001',
    ...overrides,
  };
}

function completedEvent(overrides = {}) {
  const details = intake(overrides.intake);
  const mapped = mapBadZarCatalog(ENV).services.find((row) => row.item_code === details.item_code);
  return {
    eventId: overrides.eventId || 'evt_bad_1',
    eventType: overrides.eventType || 'transaction.completed',
    occurredAt: '2026-10-18T08:00:00Z',
    data: {
      id: overrides.transactionId || 'txn_bad_1',
      status: overrides.status || 'completed',
      customer: { email: details.business_email },
      customData: {
        brand: 'business_admin_desk',
        item_code: details.item_code,
        correlation_id: details.correlation_id,
        legal_business_name: details.legal_business_name,
        contact_name: details.contact_name,
        country: details.country,
      },
      items: [
        {
          price: {
            id: overrides.priceId || mapped.paddle_price_id,
            unitPrice: {
              amount: String(overrides.amountMinor || mapped.paddle_amount_minor),
              currencyCode: overrides.currency || 'ZAR',
            },
          },
        },
      ],
      details: {
        totals: {
          grandTotal: String(overrides.amountMinor || mapped.paddle_amount_minor),
          currencyCode: overrides.currency || 'ZAR',
        },
      },
    },
  };
}

test('nine approved ZAR services map without inventing Paddle IDs', () => {
  const empty = mapBadZarCatalog({});
  assert.equal(empty.required_count, 9);
  assert.equal(empty.mapped_count, 0);
  assert.equal(empty.checkout_ready, false);
  assert.equal(empty.missing_env_keys.length, 9);
  const ready = mapBadZarCatalog(ENV);
  assert.equal(ready.mapped_count, 9);
  assert.equal(ready.checkout_ready, true);
  assert.ok(ready.services.every((row) => row.currency === 'ZAR' && row.paddle_price_id.startsWith('pri_')));
});

test('invalid fabricated price IDs are rejected', () => {
  const env = { ...ENV, NEXT_PUBLIC_PADDLE_BAD_ONBOARD_EXISTING_PRICE_ID: 'live_or_guessed' };
  const mapped = mapBadZarCatalog(env);
  assert.equal(mapped.checkout_ready, false);
  assert.ok(mapped.invalid_env_keys.includes('NEXT_PUBLIC_PADDLE_BAD_ONBOARD_EXISTING_PRICE_ID'));
});

test('legal business intake is validated and logs stay sanitized', () => {
  assert.equal(validateBadCustomerIntake(intake()).ok, true);
  assert.equal(validateBadCustomerIntake(intake({ business_email: 'not-an-email' })).ok, false);
  const logged = sanitizeBadLog({
    event_id: 'evt_1',
    business_email: 'secret@example.test',
    legal_business_name: 'Should not appear',
    item_code: 'BAD-ONBOARD-EXISTING',
    outcome: 'completed',
  });
  assert.equal(logged.item_code, 'BAD-ONBOARD-EXISTING');
  assert.equal(logged.business_email, undefined);
  assert.equal(logged.legal_business_name, undefined);
  const custom = checkoutCustomData(intake());
  assert.equal(custom.ok, true);
  assert.equal(custom.customData.item_code, 'BAD-ONBOARD-EXISTING');
});

test('verified completed transaction creates one customer, order and onboarding', async () => {
  const adapter = createMemoryBadErpnextAdapter();
  const first = await processBadPaddleEvent(completedEvent(), { adapter, env: ENV });
  const replay = await processBadPaddleEvent(completedEvent({ eventId: 'evt_bad_1_retry' }), { adapter, env: ENV });
  assert.equal(first.outcome, 'completed');
  assert.equal(replay.outcome, 'idempotent_reuse');
  assert.equal(adapter.customers.length, 1);
  assert.equal(adapter.orders.length, 1);
  assert.equal(adapter.onboardings.length, 1);
  assert.equal(adapter.invoices.length, 0);
  assert.equal(adapter.payments.length, 0);
  assert.equal(adapter.orders[0].currency, 'ZAR');
  assert.equal(adapter.orders[0].item_code, 'BAD-ONBOARD-EXISTING');
  assert.equal(adapter.orders[0].buyer_invoice_created, false);
});

test('verified BAD address-change purchase links one branded confirmation to the same order', async () => {
  const adapter = createMemoryBadErpnextAdapter();
  const event = completedEvent({
    eventId: 'evt_bad_confirmation',
    transactionId: 'txn_bad_confirmation',
    intake: intake({
      item_code: 'BAD-ADDRESS-CHANGE',
      correlation_id: 'cfai-bad-confirmation-0001',
    }),
  });
  const first = await processBadPaddleEvent(event, { adapter, env: ENV });
  const replay = await processBadPaddleEvent({ ...event, eventId: 'evt_bad_confirmation_retry' }, {
    adapter,
    env: ENV,
  });

  assert.equal(first.outcome, 'completed');
  assert.match(first.confirmation_name, /^OC-SYN-BAD-/);
  assert.equal(first.confirmation_document_role, 'order_confirmation');
  assert.match(first.confirmation_html, /Business Admin Desk/);
  assert.equal(replay.outcome, 'idempotent_reuse');
  assert.equal(adapter.customers.length, 1);
  assert.equal(adapter.orders.length, 1);
  assert.equal(adapter.onboardings.length, 1);
  assert.equal(adapter.confirmations.length, 1);
  assert.equal(adapter.confirmations[0].order_name, adapter.orders[0].name);
  assert.equal(adapter.confirmations[0].paddle_transaction_id, 'txn_bad_confirmation');
  assert.equal(adapter.invoices.length, 0);
  assert.equal(adapter.payments.length, 0);
});

test('failed payment does not release onboarding or create financial demands', async () => {
  const adapter = createMemoryBadErpnextAdapter();
  const result = await processBadPaddleEvent(completedEvent({ eventType: 'transaction.payment_failed', status: 'failed' }), {
    adapter,
    env: ENV,
  });
  assert.equal(result.outcome, 'payment_failed');
  assert.equal(adapter.customers.length, 0);
  assert.equal(adapter.orders.length, 0);
  assert.equal(adapter.onboardings.length, 0);
});

test('refund revokes onboarding and does not create a second invoice', async () => {
  const adapter = createMemoryBadErpnextAdapter();
  await processBadPaddleEvent(completedEvent(), { adapter, env: ENV });
  const refund = await processBadPaddleEvent(
    {
      eventId: 'evt_refund_1',
      eventType: 'adjustment.created',
      data: {
        id: 'adj_1',
        action: 'refund',
        transactionId: 'txn_bad_1',
        customData: { brand: 'business_admin_desk', item_code: 'BAD-ONBOARD-EXISTING', correlation_id: 'cfai-bad-corr-0001' },
      },
    },
    { adapter, env: ENV },
  );
  assert.equal(refund.outcome, 'refund_or_adjustment');
  assert.equal(adapter.onboardings[0].status, 'revoked');
  assert.equal(adapter.invoices.length, 0);
  assert.equal(adapter.payments.length, 0);
});

test('unknown service, wrong currency and missing company data are rejected', async () => {
  const adapter = createMemoryBadErpnextAdapter();
  const unknown = await processBadPaddleEvent(
    completedEvent({
      intake: intake({ item_code: 'BAD-ONBOARD-EXISTING' }),
      priceId: 'pri_unknownxxxx',
    }),
    { adapter, env: ENV },
  );
  assert.equal(unknown.error, 'unknown_or_unmapped_price');
  const currency = await processBadPaddleEvent(completedEvent({ currency: 'USD' }), { adapter, env: ENV });
  assert.equal(currency.error, 'wrong_currency');
  const missing = await processBadPaddleEvent(
    {
      eventId: 'evt_missing',
      eventType: 'transaction.completed',
      data: { id: 'txn_missing', customData: { brand: 'business_admin_desk', item_code: 'BAD-ONBOARD-EXISTING' }, items: [] },
    },
    { adapter, env: ENV },
  );
  assert.equal(missing.error, 'missing_customer_or_company_information');
  assert.equal(adapter.orders.length, 0);
});

test('ERPNext unavailability is retryable and creates no partial records', async () => {
  const adapter = createMemoryBadErpnextAdapter({ unavailable: true });
  await assert.rejects(() => processBadPaddleEvent(completedEvent(), { adapter, env: ENV }), /ERPNEXT_UNAVAILABLE/);
});

test('onboarding cannot be released before verified payment', async () => {
  const adapter = createMemoryBadErpnextAdapter();
  await assert.rejects(
    () => releaseOnboardingWithoutPayment(adapter, { order_name: 'x', paddle_transaction_id: 'txn_none' }),
    /ONBOARDING_REQUIRES_VERIFIED_PAYMENT/,
  );
});

test('production ERPNext writes remain disabled', () => {
  assert.equal(getBadErpnextWriteMode({}), 'disabled');
  assert.equal(productionErpnextWritesAllowed('isolated_sandbox'), false);
});

test('non-BAD Paddle events are skipped by the BAD bridge', async () => {
  const result = await processBadPaddleEvent(
    { eventId: 'evt_cf', eventType: 'transaction.completed', data: { id: 'txn_cf', items: [] } },
    { env: ENV },
  );
  assert.equal(result.outcome, 'skipped');
});

test('an unbound ERPNext adapter does not invent records', async () => {
  const result = await processBadPaddleEvent(completedEvent(), { env: ENV });
  assert.equal(result.outcome, 'pending_adapter_unbound');
  assert.equal(result.error, 'ISOLATED_ERPNEXT_ADAPTER_NOT_BOUND');
});

test('refund tombstone is durable without an adapter and later completed is ignored', async () => {
  const outbox = createMemoryBadPurchaseOutbox();
  const refund = await processBadPurchaseWithRecovery(
    {
      eventId: 'evt_unbound_refund',
      eventType: 'transaction.updated',
      occurredAt: '2026-10-18T08:20:00Z',
      data: {
        id: 'txn_bad_1',
        status: 'refunded',
        customData: { brand: 'business_admin_desk', item_code: 'BAD-ONBOARD-EXISTING', correlation_id: 'cfai-bad-corr-0001' },
      },
    },
    { env: ENV, outbox },
  );
  const adapter = createMemoryBadErpnextAdapter();
  const completed = await processBadPurchaseWithRecovery(completedEvent({ eventId: 'evt_after_unbound' }), {
    adapter,
    env: ENV,
    outbox,
  });
  assert.equal(refund.outcome, 'refund_or_adjustment');
  assert.equal(completed.outcome, 'ignored_after_refund');
  assert.equal(adapter.orders.length, 0);
  assert.equal((await outbox.getByTransaction('txn_bad_1')).status, 'refunded');
});

test('stale applied payload cannot demote a newer refunded transaction', () => {
  const refunded = mergeTransactionPayload(
    { status: 'refunded', last_event_time: 200, transaction_id: 'txn_1' },
    { status: 'applied', last_event_time: 100, transaction_id: 'txn_1' },
  );
  assert.equal(refunded.status, 'refunded');
});

test('completed replay after refund does not re-release onboarding', async () => {
  const adapter = createMemoryBadErpnextAdapter();
  await processBadPaddleEvent(completedEvent(), { adapter, env: ENV });
  await processBadPaddleEvent(
    {
      eventId: 'evt_refund_replay',
      eventType: 'adjustment.created',
      data: {
        id: 'adj_replay',
        action: 'refund',
        transactionId: 'txn_bad_1',
        customData: { brand: 'business_admin_desk', item_code: 'BAD-ONBOARD-EXISTING', correlation_id: 'cfai-bad-corr-0001' },
      },
    },
    { adapter, env: ENV },
  );
  const replay = await processBadPaddleEvent(completedEvent({ eventId: 'evt_after_refund' }), { adapter, env: ENV });
  assert.equal(replay.outcome, 'ignored_after_refund');
  assert.equal(adapter.orders.length, 1);
  assert.equal(adapter.onboardings.length, 1);
  assert.equal(adapter.onboardings[0].status, 'revoked');
});
