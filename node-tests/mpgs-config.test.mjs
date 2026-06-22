import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getMpgsMode,
  isHostedCheckoutEnabled,
  isMpgsEnabled,
  isMpgsOperational,
  mpgsConfigDiagnostics,
} from '../lib/server/payments/mpgs-config.js';

const ORIGINAL = { ...process.env };

test.afterEach(() => {
  process.env = { ...ORIGINAL };
});

test('MPGS defaults to disabled test mode without credentials', () => {
  delete process.env.CORPFLOW_MPGS_ENABLED;
  delete process.env.CORPFLOW_MPGS_MODE;
  delete process.env.CORPFLOW_MPGS_MERCHANT_ID;
  delete process.env.CORPFLOW_MPGS_API_PASSWORD;
  delete process.env.CORPFLOW_MPGS_MOCK;

  assert.equal(isMpgsEnabled(), false);
  assert.equal(getMpgsMode(), 'test');
  assert.equal(isMpgsOperational(), false);
  assert.equal(isHostedCheckoutEnabled(), false);
});

test('MPGS mock mode allows operational TEST without credentials', () => {
  process.env.CORPFLOW_MPGS_ENABLED = 'true';
  process.env.CORPFLOW_MPGS_MODE = 'test';
  process.env.CORPFLOW_MPGS_MOCK = 'true';

  assert.equal(isMpgsOperational(), true);
  const diag = mpgsConfigDiagnostics();
  assert.equal(diag.mode, 'test');
  assert.equal(diag.mock, true);
});

test('MPGS production mode does not enable without credentials', () => {
  process.env.CORPFLOW_MPGS_ENABLED = 'true';
  process.env.CORPFLOW_MPGS_MODE = 'production';
  delete process.env.CORPFLOW_MPGS_MOCK;

  assert.equal(getMpgsMode(), 'production');
  assert.equal(isMpgsOperational(), false);
});
