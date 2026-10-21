import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createMemoryBadBuyerOwnershipStore,
  resolveBadBuyerOwnerFromSession,
} from '../lib/server/paddle-sandbox/bad-buyer-ownership.js';

const OWNER = { auth_user_id: 'auth-buyer-1', tenant_id: 'tenant-bad-1', brand: 'business_admin_desk' };
const OTHER_OWNER = { auth_user_id: 'auth-buyer-2', tenant_id: 'tenant-bad-1', brand: 'business_admin_desk' };
const CROSS_TENANT = { auth_user_id: 'auth-buyer-1', tenant_id: 'tenant-other', brand: 'business_admin_desk' };
const CROSS_BRAND = { auth_user_id: 'auth-buyer-1', tenant_id: 'tenant-bad-1', brand: 'corpflowai' };
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

function refundEvent(overrides = {}) {
  return {
    eventId: overrides.eventId || 'evt-refund-1',
    eventType: overrides.eventType || 'adjustment.created',
    occurredAt: overrides.occurredAt || '2026-10-21T09:00:00Z',
    data: {
      id: overrides.adjustmentId || 'adjustment-1',
      transactionId: overrides.transactionId || INTENT.paddle_transaction_id,
      action: overrides.action || 'refund',
      ...overrides.data,
    },
  };
}

const VALID_CONFIRMATION = { name: INTENT.order_confirmation_ref, html: '<p>synthetic confirmation</p>' };

async function paidStore() {
  const store = createMemoryBadBuyerOwnershipStore();
  await store.bindCheckoutIntent(INTENT);
  await store.applyVerifiedWebhook(completedEvent());
  return store;
}

async function issuedStore() {
  const store = await paidStore();
  await store.issueOrderConfirmation({
    checkout_intent_id: INTENT.checkout_intent_id,
    owner: OWNER,
    confirmation: VALID_CONFIRMATION,
  });
  return store;
}

function assertTerminalDenial(record) {
  assert.equal(record.refunded, true);
  assert.equal(record.revoked, true);
  assert.equal(record.fulfilment_entitled, false);
  assert.notEqual(record.status, 'paid');
  assert.notEqual(record.status, 'issued');
  assert.ok(record.reversal_history.length > 0);
}

test('only the immutable authenticated owner can retrieve an issued confirmation', async () => {
  const store = await issuedStore();
  const owner = await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OWNER });
  const other = await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OTHER_OWNER });
  const anonymous = await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id });
  const crossTenant = await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: CROSS_TENANT });
  const crossBrand = await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: CROSS_BRAND });

  assert.equal(owner.code, 'RETRIEVED');
  assert.equal(other.code, 'FORBIDDEN');
  assert.equal(anonymous.code, 'FORBIDDEN');
  assert.equal(crossTenant.code, 'FORBIDDEN');
  assert.equal(crossBrand.code, 'FORBIDDEN');
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

test('payment, issued confirmation, refund, then a later completion stays revoked', async () => {
  const store = await issuedStore();
  const refund = await store.applyVerifiedWebhook(refundEvent());
  const late = await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-late-completed',
    occurredAt: '2026-10-21T12:00:00Z',
  }));
  const originalReplay = await store.applyVerifiedWebhook(completedEvent());
  const record = await store.inspect(INTENT.checkout_intent_id);

  assert.equal(refund.status, 'refunded');
  assert.equal(late.status, 'refunded');
  assert.equal(late.ignored, true);
  assert.equal(originalReplay.deduped, true);
  assert.equal(originalReplay.status, 'refunded');
  assert.equal(late.html, undefined);
  assert.equal(late.confirmation, undefined);
  assert.equal(JSON.stringify(late).includes('synthetic confirmation'), false);
  assertTerminalDenial(record);
  assert.equal(record.issued, true);
  assert.equal(record.reversal_history[0].event_id, 'evt-refund-1');
  assert.deepEqual(
    await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OWNER }),
    { ok: false, code: 'NOT_FOUND' },
  );
  assert.deepEqual(
    await store.issueOrderConfirmation({
      checkout_intent_id: INTENT.checkout_intent_id,
      owner: OWNER,
      confirmation: VALID_CONFIRMATION,
    }),
    { ok: false, code: 'ORDER_NOT_ISSUABLE' },
  );
});

test('a refund that arrives before checkout binding still blocks later payment', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  const refund = await store.applyVerifiedWebhook(refundEvent({ occurredAt: '2026-10-21T07:00:00Z' }));
  const replay = await store.applyVerifiedWebhook(refundEvent({ occurredAt: '2026-10-21T07:00:00Z' }));
  await store.bindCheckoutIntent(INTENT);
  const completion = await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-after-unbound-refund',
    occurredAt: '2026-10-21T08:30:00Z',
  }));
  const record = await store.inspect(INTENT.checkout_intent_id);

  assert.equal(refund.status, 'refunded');
  assert.equal(replay.deduped, true);
  assert.equal(replay.status, 'refunded');
  assert.equal(completion.status, 'refunded');
  assert.equal(completion.ignored, true);
  assertTerminalDenial(record);
  assert.deepEqual(
    await store.issueOrderConfirmation({
      checkout_intent_id: INTENT.checkout_intent_id,
      owner: OWNER,
      confirmation: VALID_CONFIRMATION,
    }),
    { ok: false, code: 'ORDER_NOT_ISSUABLE' },
  );
});

test('a refund received before payment completion can never become paid', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  await store.bindCheckoutIntent(INTENT);
  const refund = await store.applyVerifiedWebhook(refundEvent({ occurredAt: '2026-10-21T07:00:00Z' }));
  const completion = await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-after-early-refund',
    occurredAt: '2026-10-21T08:30:00Z',
  }));
  const record = await store.inspect(INTENT.checkout_intent_id);

  assert.equal(refund.status, 'refunded');
  assert.equal(completion.status, 'refunded');
  assert.equal(completion.ignored, true);
  assertTerminalDenial(record);
  assert.equal(record.issued, false);
  assert.deepEqual(
    await store.issueOrderConfirmation({
      checkout_intent_id: INTENT.checkout_intent_id,
      owner: OWNER,
      confirmation: VALID_CONFIRMATION,
    }),
    { ok: false, code: 'ORDER_NOT_ISSUABLE' },
  );
  assert.deepEqual(
    await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OWNER }),
    { ok: false, code: 'NOT_FOUND' },
  );
});

test('concurrent refund and payment completion events fail closed in either order', async () => {
  async function race(order) {
    const store = await issuedStore();
    const refund = refundEvent({ eventId: `evt-refund-${order}` });
    const completion = completedEvent({
      eventId: `evt-complete-${order}`,
      occurredAt: '2026-10-21T12:00:00Z',
    });
    const events = order === 'refund-first' ? [refund, completion] : [completion, refund];
    const results = await Promise.all(events.map((event) => store.applyVerifiedWebhook(event)));
    const record = await store.inspect(INTENT.checkout_intent_id);

    if (order === 'refund-first') {
      assert.equal(results.some((result) => result.status === 'paid'), false);
    }
    assertTerminalDenial(record);
    assert.equal(
      (await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OWNER })).code,
      'NOT_FOUND',
    );
    assert.equal(
      (await store.issueOrderConfirmation({
        checkout_intent_id: INTENT.checkout_intent_id,
        owner: OWNER,
        confirmation: VALID_CONFIRMATION,
      })).code,
      'ORDER_NOT_ISSUABLE',
    );
  }

  await race('refund-first');
  await race('completion-first');
});

test('repeated refund events stay terminal and preserve refund history', async () => {
  const store = await issuedStore();
  const first = await store.applyVerifiedWebhook(refundEvent());
  const replay = await store.applyVerifiedWebhook(refundEvent());
  const second = await store.applyVerifiedWebhook(refundEvent({
    eventId: 'evt-refund-2',
    occurredAt: '2026-10-21T09:10:00Z',
    adjustmentId: 'adjustment-2',
  }));
  const record = await store.inspect(INTENT.checkout_intent_id);

  assert.equal(first.status, 'refunded');
  assert.equal(replay.deduped, true);
  assert.equal(second.status, 'refunded');
  assert.deepEqual(record.reversal_history.map((entry) => entry.event_id), ['evt-refund-1', 'evt-refund-2']);
  assertTerminalDenial(record);
  assert.equal(record.issued, true);
});

test('replayed completion events after refund cannot restore a paid purchase', async () => {
  const store = await issuedStore();
  await store.applyVerifiedWebhook(refundEvent({ occurredAt: '2026-10-21T07:30:00Z' }));
  const before = await store.inspect(INTENT.checkout_intent_id);

  for (const [index, occurredAt] of ['2026-10-21T10:00:00Z', '2026-10-21T11:00:00Z', '2026-10-21T08:30:00Z'].entries()) {
    const result = await store.applyVerifiedWebhook(completedEvent({
      eventId: `evt-replay-${index}`,
      occurredAt,
    }));
    assert.equal(result.status, 'refunded');
    assert.equal(result.ignored, true);
    assert.equal(JSON.stringify(result).includes('synthetic confirmation'), false);
  }

  const replay = await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-replay-0',
    occurredAt: '2026-10-21T10:00:00Z',
  }));
  const after = await store.inspect(INTENT.checkout_intent_id);

  assert.equal(replay.deduped, true);
  assert.deepEqual(after.reversal_history, before.reversal_history);
  assert.equal(after.last_event_id, before.last_event_id);
  assertTerminalDenial(after);
  assert.deepEqual(
    await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OWNER }),
    { ok: false, code: 'NOT_FOUND' },
  );
});

test('revocation stays terminal when a later completion arrives', async () => {
  const store = await issuedStore();
  await store.applyVerifiedWebhook(refundEvent({
    eventId: 'evt-revoke-1',
    action: 'revoke',
  }));
  const late = await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-after-revoke',
    occurredAt: '2026-10-21T12:00:00Z',
  }));
  const record = await store.inspect(INTENT.checkout_intent_id);

  assert.equal(late.status, 'revoked');
  assert.equal(record.status, 'revoked');
  assertTerminalDenial(record);
  assert.equal(
    (await store.retrieveOrderConfirmation({ checkout_intent_id: INTENT.checkout_intent_id, owner: OWNER })).code,
    'NOT_FOUND',
  );
});

test('one Paddle transaction reference cannot bind two checkout intents or owners', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  await store.bindCheckoutIntent(INTENT);
  await assert.rejects(
    () => store.bindCheckoutIntent({
      ...INTENT,
      checkout_intent_id: 'intent-bad-other-owner',
      order_confirmation_ref: 'OC-BAD-SYN-2',
      owner: OTHER_OWNER,
    }),
    /PADDLE_TRANSACTION_ALREADY_BOUND/,
  );
  await assert.rejects(
    () => store.bindCheckoutIntent({
      ...INTENT,
      checkout_intent_id: 'intent-bad-same-owner',
      order_confirmation_ref: 'OC-BAD-SYN-3',
      owner: OWNER,
    }),
    /PADDLE_TRANSACTION_ALREADY_BOUND/,
  );
  await store.bindCheckoutIntent({
    ...INTENT,
    checkout_intent_id: 'intent-bad-distinct',
    order_confirmation_ref: 'OC-BAD-SYN-4',
    paddle_transaction_id: 'txn-bad-distinct',
    owner: OTHER_OWNER,
  });

  assert.deepEqual((await store.inspect(INTENT.checkout_intent_id)).owner, OWNER);
  assert.equal(await store.inspect('intent-bad-other-owner'), null);
  assert.deepEqual((await store.inspect('intent-bad-distinct')).owner, OTHER_OWNER);
});

test('an authenticated owner binding cannot be replaced by another buyer', async () => {
  const store = await paidStore();
  await assert.rejects(
    () => store.bindCheckoutIntent({ ...INTENT, owner: OTHER_OWNER }),
    /CHECKOUT_INTENT_ALREADY_BOUND/,
  );
  await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-attacker-metadata',
    data: {
      id: INTENT.paddle_transaction_id,
      customData: {
        brand: 'business_admin_desk',
        auth_user_id: OTHER_OWNER.auth_user_id,
        tenant_id: OTHER_OWNER.tenant_id,
        email: 'attacker@example.test',
        correlation_id: 'intent-bad-other-owner',
      },
    },
  }));

  assert.deepEqual((await store.inspect(INTENT.checkout_intent_id)).owner, OWNER);
  assert.equal(
    (await store.issueOrderConfirmation({
      checkout_intent_id: INTENT.checkout_intent_id,
      owner: OTHER_OWNER,
      confirmation: VALID_CONFIRMATION,
    })).code,
    'FORBIDDEN',
  );
  assert.equal((await store.inspect(INTENT.checkout_intent_id)).issued, false);
});

test('missing or invalid confirmations are not marked issued', async () => {
  const store = await paidStore();
  const invalid = [null, {}, { html: '' }, { html: '   ' }, { name: 'OC-ONLY' }, { html: '<p>no reference</p>' }, { email: 'buyer@example.test' }, 'OC-BAD-SYN-1'];
  for (const confirmation of invalid) {
    assert.equal(
      (await store.issueOrderConfirmation({
        checkout_intent_id: INTENT.checkout_intent_id,
        owner: OWNER,
        confirmation,
      })).code,
      'CONFIRMATION_INVALID',
    );
  }
  const record = await store.inspect(INTENT.checkout_intent_id);
  assert.equal(record.issued, false);
  assert.equal(record.status, 'paid');
  assert.equal(record.fulfilment_entitled, false);
  assert.equal(record.confirmation, null);

  const issued = await store.issueOrderConfirmation({
    checkout_intent_id: INTENT.checkout_intent_id,
    owner: OWNER,
    confirmation: VALID_CONFIRMATION,
  });
  assert.equal(issued.code, 'ISSUED');
  assert.equal((await store.inspect(INTENT.checkout_intent_id)).issued, true);
  assert.equal((await store.inspect(INTENT.checkout_intent_id)).fulfilment_entitled, true);
});

test('browser identity and unknown events do not grant access or leak confirmation HTML', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  await assert.rejects(
    () => store.bindCheckoutIntent({
      ...INTENT,
      checkout_intent_id: 'intent-email',
      order_confirmation_ref: 'OC-EMAIL',
      paddle_transaction_id: 'txn-email',
      owner: { ...OWNER, email: 'buyer@example.test' },
    }),
    /UNTRUSTED_OWNER_SOURCE/,
  );
  await assert.rejects(
    () => store.bindCheckoutIntent({
      ...INTENT,
      checkout_intent_id: 'intent-body',
      order_confirmation_ref: 'OC-BODY',
      paddle_transaction_id: 'txn-body',
      body: { owner: OWNER },
    }),
    /UNTRUSTED_IDENTITY_SOURCE/,
  );

  await store.bindCheckoutIntent(INTENT);
  const unknown = await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-unknown',
    eventType: 'transaction.paid',
  }));
  const wrongBrand = await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-wrong-brand',
    data: { id: INTENT.paddle_transaction_id, customData: { brand: 'corpflowai', email: 'buyer@example.test' } },
  }));
  const wrongBrandRefund = await store.applyVerifiedWebhook(refundEvent({
    eventId: 'evt-wrong-brand-refund',
    data: { transactionId: INTENT.paddle_transaction_id, action: 'refund', customData: { brand: 'corpflowai' } },
  }));
  const record = await store.inspect(INTENT.checkout_intent_id);

  assert.equal(unknown.ignored, true);
  assert.equal(unknown.html, undefined);
  assert.equal(wrongBrand.ignored, true);
  assert.equal(wrongBrand.status, 'draft');
  assert.equal(wrongBrandRefund.status, 'refunded');
  assertTerminalDenial(record);
  assert.equal(record.issued, false);
  assert.deepEqual(record.owner, OWNER);
  assert.equal(JSON.stringify(unknown).includes('synthetic confirmation'), false);
  assert.equal(JSON.stringify(wrongBrand).includes('buyer@example.test'), false);
  assert.equal(JSON.stringify(wrongBrandRefund).includes('buyer@example.test'), false);
});

test('cancellation permanently prevents later completion and retrieval', async () => {
  const store = await paidStore();
  const cancelled = await store.applyVerifiedWebhook({
    eventId: 'evt-cancel-1',
    eventType: 'transaction.updated',
    occurredAt: '2026-10-21T09:30:00Z',
    data: { id: INTENT.paddle_transaction_id, status: 'canceled' },
  });
  const late = await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-after-cancel',
    occurredAt: '2026-10-21T12:00:00Z',
  }));
  const record = await store.inspect(INTENT.checkout_intent_id);

  assert.equal(cancelled.status, 'revoked');
  assert.equal(late.status, 'revoked');
  assert.equal(late.ignored, true);
  assertTerminalDenial(record);
  assert.equal(
    (await store.issueOrderConfirmation({
      checkout_intent_id: INTENT.checkout_intent_id,
      owner: OWNER,
      confirmation: VALID_CONFIRMATION,
    })).code,
    'ORDER_NOT_ISSUABLE',
  );
});

test('a trusted server may associate a Paddle id later; webhooks still cannot create ownership', async () => {
  const store = createMemoryBadBuyerOwnershipStore();
  const bound = await store.bindCheckoutIntent({
    checkout_intent_id: 'intent-late-txn',
    order_confirmation_ref: 'OC-LATE',
    owner: OWNER,
  });
  assert.equal(bound.paddle_transaction_id, null);
  const ignored = await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-unbound-complete',
    transactionId: 'txn-late',
  }));
  assert.equal(ignored.ignored, true);
  assert.equal((await store.inspect('intent-late-txn')).status, 'draft');

  const associated = await store.associateProviderTransaction({
    checkout_intent_id: 'intent-late-txn',
    paddle_transaction_id: 'txn-late',
  });
  assert.equal(associated.paddle_transaction_id, 'txn-late');
  await store.applyVerifiedWebhook(completedEvent({
    eventId: 'evt-bound-complete',
    transactionId: 'txn-late',
  }));
  assert.equal((await store.inspect('intent-late-txn')).status, 'paid');
});

test('owner identity is taken only from a verified tenant session user', async () => {
  const owner = resolveBadBuyerOwnerFromSession({
    ok: true,
    payload: { typ: 'tenant', user_id: 'auth-buyer-1', tenant_id: 'tenant-bad-1' },
  });
  assert.deepEqual(owner, OWNER);
  assert.throws(
    () => resolveBadBuyerOwnerFromSession({
      ok: true,
      payload: { typ: 'tenant', tenant_id: 'tenant-bad-1' },
    }),
    /AUTH_USER_REQUIRED/,
  );
  assert.throws(
    () => resolveBadBuyerOwnerFromSession({
      ok: true,
      payload: { typ: 'tenant', user_id: 'auth-buyer-1', tenant_id: 'tenant-bad-1', email: 'buyer@example.test' },
    }),
    /UNTRUSTED_OWNER_SOURCE/,
  );
});
