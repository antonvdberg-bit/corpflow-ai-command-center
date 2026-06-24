import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isMpgsOrderVerifiedPaid,
  maskCardLastFour,
  sanitizeMpgsResponseForLog,
} from '../lib/server/payments/mpgs-client.js';
import {
  PAYMENT_ATTEMPT_STATUSES,
  PAYMENT_RECORD_STATUSES,
} from '../lib/server/payments/payment-store.js';
import { amountDecimalToMinor, verifyMpgsRetrieveMatchesRecord } from '../lib/server/payments/mpgs-verify.js';

test('isMpgsOrderVerifiedPaid accepts captured gateway statuses only', () => {
  assert.equal(isMpgsOrderVerifiedPaid({ status: 'CAPTURED' }), true);
  assert.equal(isMpgsOrderVerifiedPaid({ status: 'PARTIALLY_CAPTURED' }), true);
  assert.equal(isMpgsOrderVerifiedPaid({ status: 'AUTHORIZED' }), false);
  assert.equal(isMpgsOrderVerifiedPaid({ status: 'FAILED' }), false);
});

test('verifyMpgsRetrieveMatchesRecord requires amount and currency match', () => {
  const pass = verifyMpgsRetrieveMatchesRecord(
    { status: 'CAPTURED', amountDecimal: '150.00', currency: 'USD' },
    { amountMinor: 15000, currency: 'USD' },
  );
  assert.equal(pass.verified, true);

  const wrongAmount = verifyMpgsRetrieveMatchesRecord(
    { status: 'CAPTURED', amountDecimal: '149.00', currency: 'USD' },
    { amountMinor: 15000, currency: 'USD' },
  );
  assert.equal(wrongAmount.verified, false);
  assert.equal(wrongAmount.reason, 'amount_mismatch');

  const wrongCurrency = verifyMpgsRetrieveMatchesRecord(
    { status: 'CAPTURED', amountDecimal: '150.00', currency: 'MUR' },
    { amountMinor: 15000, currency: 'USD' },
  );
  assert.equal(wrongCurrency.verified, false);
  assert.equal(wrongCurrency.reason, 'currency_mismatch');
});

test('amountDecimalToMinor converts gateway decimals', () => {
  assert.equal(amountDecimalToMinor('150.00'), 15000);
  assert.equal(amountDecimalToMinor(150), 15000);
});

test('maskCardLastFour keeps last four digits only', () => {
  assert.equal(maskCardLastFour('************1234'), '1234');
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

test('payment statuses separate redirect from verified paid', () => {
  assert.equal(PAYMENT_ATTEMPT_STATUSES.REDIRECT_SEEN, 'redirect_seen');
  assert.equal(PAYMENT_ATTEMPT_STATUSES.VERIFIED_PAID, 'verified_paid');
  assert.notEqual(PAYMENT_ATTEMPT_STATUSES.REDIRECT_SEEN, PAYMENT_ATTEMPT_STATUSES.VERIFIED_PAID);
  assert.equal(PAYMENT_RECORD_STATUSES.PAID, 'paid');
});
