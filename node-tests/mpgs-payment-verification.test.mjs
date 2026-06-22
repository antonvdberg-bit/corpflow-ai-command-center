import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isMpgsOrderVerifiedPaid,
  maskCardLastFour,
  sanitizeMpgsResponseForLog,
} from '../lib/server/payments/mpgs-client.js';
import { PAYMENT_ORDER_STATUSES } from '../lib/server/payments/payment-order-store.js';

test('isMpgsOrderVerifiedPaid accepts captured gateway statuses only', () => {
  assert.equal(isMpgsOrderVerifiedPaid({ status: 'CAPTURED' }), true);
  assert.equal(isMpgsOrderVerifiedPaid({ status: 'PARTIALLY_CAPTURED' }), true);
  assert.equal(isMpgsOrderVerifiedPaid({ status: 'AUTHORIZED' }), false);
  assert.equal(isMpgsOrderVerifiedPaid({ status: 'FAILED' }), false);
});

test('maskCardLastFour keeps last four digits only', () => {
  assert.equal(maskCardLastFour('************1234'), '1234');
  assert.equal(maskCardLastFour('1234'), '1234');
  assert.equal(maskCardLastFour('12'), null);
});

test('sanitizeMpgsResponseForLog removes sensitive card fields', () => {
  const out = sanitizeMpgsResponseForLog({
    status: 'CAPTURED',
    sourceOfFunds: { provided: { card: { number: '4111111111111111', cvv: '123' } } },
    authorizationCode: 'AUTH01',
  });
  assert.equal(out.status, 'CAPTURED');
  assert.equal(out.authorizationCode, 'AUTH01');
  assert.equal(out.sourceOfFunds, undefined);
});

test('payment order statuses include verified_paid separate from redirect_seen', () => {
  assert.equal(PAYMENT_ORDER_STATUSES.REDIRECT_SEEN, 'redirect_seen');
  assert.equal(PAYMENT_ORDER_STATUSES.VERIFIED_PAID, 'verified_paid');
  assert.notEqual(PAYMENT_ORDER_STATUSES.REDIRECT_SEEN, PAYMENT_ORDER_STATUSES.VERIFIED_PAID);
});
