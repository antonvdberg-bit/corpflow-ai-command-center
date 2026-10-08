import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

test('onboarding review is explicitly review-only and has no checkout', async () => {
  const page = await read('pages/onboarding-review.js');
  assert.match(page, /noindex,nofollow/);
  assert.match(page, /REVIEW REQUIRED/);
  assert.match(page, /PENDING/);
  assert.doesNotMatch(page, /href=["'][^"']*checkout|<form|paddle\.Checkout/i);
});

test('Business Admin Desk review does not publish candidate prices', async () => {
  const page = await read('components/BusinessAdminDeskPricingReviewPage.js');
  assert.match(page, /QUOTE[- ]ONLY|quote-only/i);
  assert.match(page, /Final numerical rates are not approved/);
  assert.match(page, /no checkout or payment/i);
  assert.doesNotMatch(page, /ZAR\s*[0-9]/i);
});

test('retired sprint language is absent from current legal routes', async () => {
  const [terms, refund] = await Promise.all([read('pages/terms.js'), read('pages/refund-policy.js')]);
  assert.doesNotMatch(`${terms}\n${refund}`, /85,000|51,000|34,000|60%|72-hour/i);
});
