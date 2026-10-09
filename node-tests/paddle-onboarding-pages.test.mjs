import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('pricing pages keep host isolation and no checkout claims', () => {
  const pricing = read('pages/pricing.js');
  const bad = read('components/BusinessAdminDeskPricingReviewPage.js');
  assert.match(pricing, /isCipcDeskStandingTestHost/);
  assert.match(pricing, /isBusinessAdminDeskPublicHost/);
  assert.match(pricing, /notFound: true/);
  assert.match(bad, /noindex,nofollow/);
  assert.match(bad, /no checkout or payment/i);
  assert.doesNotMatch(bad, /12900|45000|85000|51000|34000/);
});

test('onboarding review is printable and keeps provider acceptance pending', () => {
  const page = read('pages/onboarding-review.js');
  assert.match(page, /noindex,nofollow/);
  assert.match(page, /@media print/);
  assert.match(page, /Provider eligibility.*OPEN|provider eligibility/i);
  assert.match(page, /No checkout/);
  assert.match(page, /paddle\.com/);
});

test('affected policy pages do not present retired sprint terms as current', () => {
  for (const path of ['pages/terms.js', 'pages/refund-policy.js', 'pages/delivery-policy.js']) {
    const source = read(path);
    assert.doesNotMatch(source, /MUR 85,000 fixed|MUR 51,000|MUR 34,000/);
  }
});
