import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import {
  configuredBadCheckoutPriceId,
  configuredBadCheckoutServices,
} from '../lib/server/paddle-sandbox/bad-checkout-static-prices.js';
import { APPROVED_BAD_ZAR_SERVICES } from '../lib/server/paddle-sandbox/bad-zar-catalog.js';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const FIXTURE_ENV = Object.freeze({
  NEXT_PUBLIC_PADDLE_BAD_ONBOARD_EXISTING_PRICE_ID: 'pri_01m578p5b8vpqve9rsww00xy6m',
  NEXT_PUBLIC_PADDLE_BAD_REG_ONBOARD_BUNDLE_PRICE_ID: 'pri_01m578v85ekrwqakqy1s112bh8',
  NEXT_PUBLIC_PADDLE_BAD_ANNUAL_RETURN_BO_CURRENT_PRICE_ID: 'pri_01m5791pcrw9h4ayy270hx3s3a',
  NEXT_PUBLIC_PADDLE_BAD_BO_SIMPLE_PRICE_ID: 'pri_01m57958arpg3xdj2frsm5e0pg',
  NEXT_PUBLIC_PADDLE_BAD_DIRECTOR_APPT_RESIGN_PRICE_ID: 'pri_01m5796jysc5cc39m2xgcnbwch',
  NEXT_PUBLIC_PADDLE_BAD_ADDRESS_CHANGE_PRICE_ID: 'pri_01m5797j3y7jn390bj0cxs94x7',
  NEXT_PUBLIC_PADDLE_BAD_SHARE_CERT_VERIFIED_PRICE_ID: 'pri_01m5797yw6hgtc7kh2t6r7vrzq',
  NEXT_PUBLIC_PADDLE_BAD_NAME_RESERVATION_PRICE_ID: 'pri_01m5799jcqqndg2w3dhse11q3m',
  NEXT_PUBLIC_PADDLE_BAD_FYE_CHANGE_PRICE_ID: 'pri_01m5799y0j4r3z4s2paqp9hrad',
});

test('checkout page and helper use static NEXT_PUBLIC price reads', () => {
  const page = read('pages/billing/paddle-sandbox-bad.js');
  const helper = read('lib/server/paddle-sandbox/bad-checkout-static-prices.js');
  assert.doesNotMatch(page, /process\.env\[/);
  assert.match(page, /configuredBadCheckoutServices/);
  assert.match(page, /noindex,nofollow/);
  for (const row of APPROVED_BAD_ZAR_SERVICES) {
    assert.match(helper, new RegExp(`process\\.env\\.${row.env_key}\\b`));
    assert.equal(row.env_key.startsWith('NEXT_PUBLIC_PADDLE_BAD_'), true);
  }
  assert.equal(APPROVED_BAD_ZAR_SERVICES.length, 9);
});

test('each approved service resolves to its configured sandbox price ID', () => {
  const services = configuredBadCheckoutServices(FIXTURE_ENV);
  assert.equal(services.length, 9);
  for (const row of APPROVED_BAD_ZAR_SERVICES) {
    const mapped = services.find((service) => service.item_code === row.item_code);
    assert.ok(mapped, row.item_code);
    assert.equal(mapped.zar_amount, row.zar_amount);
    assert.equal(mapped.env_key, row.env_key);
    assert.equal(mapped.paddle_price_id, FIXTURE_ENV[row.env_key]);
    assert.equal(configuredBadCheckoutPriceId(row.item_code, FIXTURE_ENV), FIXTURE_ENV[row.env_key]);
  }
});

test('missing or invalid sandbox price IDs fail closed', () => {
  assert.equal(configuredBadCheckoutPriceId('BAD-ONBOARD-EXISTING', {}), '');
  assert.equal(
    configuredBadCheckoutPriceId('BAD-ONBOARD-EXISTING', {
      NEXT_PUBLIC_PADDLE_BAD_ONBOARD_EXISTING_PRICE_ID: 'live_or_guessed',
    }),
    '',
  );
  assert.equal(configuredBadCheckoutPriceId('NOT-A-BAD-ITEM', FIXTURE_ENV), '');
  const empty = configuredBadCheckoutServices({});
  assert.ok(empty.every((row) => row.paddle_price_id === ''));
});
