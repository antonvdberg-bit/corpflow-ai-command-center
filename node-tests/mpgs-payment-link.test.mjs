import test from 'node:test';
import assert from 'node:assert/strict';

import { buildPaymentLinkRequestBody, parseMpgsInitiateCheckoutResponse } from '../lib/server/payments/mpgs-client.js';
import {
  MPGS_ENV_KEYS,
  getMpgsApiVersion,
  getMpgsMode,
  hasMpgsCredentials,
  isMpgsEnabled,
  isMpgsOperational,
} from '../lib/server/payments/mpgs-config.js';
import { isMpgsOrderVerifiedPaid } from '../lib/server/payments/mpgs-client.js';
import { verifyMpgsRetrieveMatchesRecord } from '../lib/server/payments/mpgs-verify.js';
import {
  PAYMENT_ATTEMPT_STATUSES,
  createPaymentStore,
} from '../lib/server/payments/payment-store.js';

const ALL_MPGS_ENV_KEYS = [...new Set(Object.values(MPGS_ENV_KEYS))];

function snapshotMpgsEnv() {
  const snap = {};
  for (const k of ALL_MPGS_ENV_KEYS) snap[k] = process.env[k];
  return snap;
}

function clearMpgsEnv() {
  for (const k of ALL_MPGS_ENV_KEYS) delete process.env[k];
}

function restoreMpgsEnv(snap) {
  for (const k of ALL_MPGS_ENV_KEYS) {
    if (snap[k] === undefined) delete process.env[k];
    else process.env[k] = snap[k];
  }
}

test('buildPaymentLinkRequestBody matches SBM Payment Link shape', () => {
  const body = buildPaymentLinkRequestBody({
    attemptReference: 'CFLR-TEST-001',
    amountDecimal: '150.00',
    currency: 'USD',
    returnUrl: 'https://example.com/pay/return?order_ref=CFLR-TEST-001',
    cancelUrl: 'https://example.com/pay/cancel?order_ref=CFLR-TEST-001',
    description: 'AI Lead Rescue launch pilot',
    expiryDateTime: '2026-06-25T12:00:00.000Z',
    numberOfAllowedAttempts: 3,
  });

  assert.equal(body.apiOperation, 'INITIATE_CHECKOUT');
  assert.equal(body.checkoutMode, 'PAYMENT_LINK');
  assert.equal(body.interaction.operation, 'PURCHASE');
  assert.equal(body.order.id, 'CFLR-TEST-001');
  assert.equal(body.order.amount, '150.00');
  assert.equal(body.order.currency, 'USD');
  assert.equal(body.paymentLink.expiryDateTime, '2026-06-25T12:00:00.000Z');
  assert.equal(body.paymentLink.numberOfAllowedAttempts, 3);
});

test('parseMpgsInitiateCheckoutResponse accepts Payment Link SUCCESS without session.id', () => {
  const parsed = parseMpgsInitiateCheckoutResponse({
    checkoutMode: 'PAYMENT_LINK',
    merchant: 'TEST000000000000',
    result: 'SUCCESS',
    successIndicator: 'b6e58756356f4a54',
    paymentLink: {
      id: 'PAYLINK0001059613374N3991706F98',
      url: 'https://test-gateway.mastercard.com/pbl/PAYLINK0001059613374N3991706F98',
      expiryDateTime: '2026-06-27T09:23:24.191Z',
      numberOfAllowedAttempts: 3,
    },
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.sessionId, 'PAYLINK0001059613374N3991706F98');
  assert.equal(parsed.successIndicator, 'b6e58756356f4a54');
  assert.match(parsed.paymentLinkUrl, /^https:\/\/test-gateway\.mastercard\.com\/pbl\//);
});

test('parseMpgsInitiateCheckoutResponse still accepts hosted checkout session.id shape', () => {
  const parsed = parseMpgsInitiateCheckoutResponse({
    result: 'SUCCESS',
    successIndicator: 'abc123',
    session: { id: 'SESSION0001' },
    paymentLink: {
      id: 'PAYLINK1',
      url: 'https://test-gateway.mastercard.com/pbl/PAYLINK1',
    },
  });
  assert.equal(parsed.ok, true);
  if (!parsed.ok) return;
  assert.equal(parsed.sessionId, 'SESSION0001');
});

test('getMpgsApiVersion defaults to 66 per SBM TEST manual', () => {
  const snap = snapshotMpgsEnv();
  clearMpgsEnv();
  try {
    assert.equal(getMpgsApiVersion(), '66');
  } finally {
    restoreMpgsEnv(snap);
  }
});

test('missing MPGS config fails closed — not operational when disabled', () => {
  const snap = snapshotMpgsEnv();
  clearMpgsEnv();
  try {
    assert.equal(isMpgsEnabled(), false);
    assert.equal(hasMpgsCredentials(), false);
    assert.equal(isMpgsOperational(), false);
  } finally {
    restoreMpgsEnv(snap);
  }
});

test('redirect success status alone does not mark paid without capture', () => {
  assert.equal(isMpgsOrderVerifiedPaid({ status: 'AUTHORIZED' }), false);
  const match = verifyMpgsRetrieveMatchesRecord(
    { status: 'AUTHORIZED', amountDecimal: '150.00', currency: 'USD' },
    { amountMinor: 15000, currency: 'USD' },
  );
  assert.equal(match.verified, false);
});

test('Retrieve Order CAPTURED with matching amount/currency verifies paid', () => {
  const match = verifyMpgsRetrieveMatchesRecord(
    { status: 'CAPTURED', amountDecimal: '150.00', currency: 'USD' },
    { amountMinor: 15000, currency: 'USD' },
  );
  assert.equal(match.verified, true);
});

test('amount mismatch blocks verified paid', () => {
  const match = verifyMpgsRetrieveMatchesRecord(
    { status: 'CAPTURED', amountDecimal: '149.00', currency: 'USD' },
    { amountMinor: 15000, currency: 'USD' },
  );
  assert.equal(match.verified, false);
  assert.equal(match.reason, 'amount_mismatch');
});

test('currency mismatch blocks verified paid', () => {
  const match = verifyMpgsRetrieveMatchesRecord(
    { status: 'CAPTURED', amountDecimal: '150.00', currency: 'MUR' },
    { amountMinor: 15000, currency: 'USD' },
  );
  assert.equal(match.verified, false);
  assert.equal(match.reason, 'currency_mismatch');
});

test('production mode is guarded — default mode is test not production', () => {
  const snap = snapshotMpgsEnv();
  clearMpgsEnv();
  try {
    assert.equal(getMpgsMode(), 'test');
    assert.notEqual(getMpgsMode(), 'production');
  } finally {
    restoreMpgsEnv(snap);
  }
});

test('recordRedirectSeen is idempotent on duplicate return', async () => {
  const attempts = new Map();
  const row = {
    id: 'att1',
    attemptReference: 'CFLR-IDEM-1',
    paymentRecordId: 'rec1',
    status: PAYMENT_ATTEMPT_STATUSES.LINK_CREATED,
    redirectSeenAt: null,
    metadataJson: {},
  };
  attempts.set('CFLR-IDEM-1', { ...row });

  const prisma = {
    paymentAttempt: {
      findUnique: async ({ where }) => attempts.get(where.attemptReference) || null,
      update: async ({ where, data }) => {
        const existing = attempts.get(where.attemptReference);
        const next = { ...existing, ...data };
        attempts.set(where.attemptReference, next);
        return next;
      },
    },
  };

  const store = createPaymentStore(prisma);
  const first = await store.recordRedirectSeen('CFLR-IDEM-1', 'si_test');
  const second = await store.recordRedirectSeen('CFLR-IDEM-1', 'si_test');
  assert.equal(first?.status, PAYMENT_ATTEMPT_STATUSES.REDIRECT_SEEN);
  assert.equal(second?.status, PAYMENT_ATTEMPT_STATUSES.REDIRECT_SEEN);
  assert.equal(first.redirectSeenAt?.toISOString(), second.redirectSeenAt?.toISOString());
});

test('MPGS env keys include Payment Link tuning vars', () => {
  assert.equal(MPGS_ENV_KEYS.LINK_EXPIRY_HOURS, 'CORPFLOW_MPGS_PAYMENT_LINK_EXPIRY_HOURS');
  assert.equal(MPGS_ENV_KEYS.LINK_ALLOWED_ATTEMPTS, 'CORPFLOW_MPGS_PAYMENT_LINK_ALLOWED_ATTEMPTS');
  assert.equal(MPGS_ENV_KEYS.PUBLIC_BASE_URL, 'CORPFLOW_MPGS_PUBLIC_BASE_URL');
});
