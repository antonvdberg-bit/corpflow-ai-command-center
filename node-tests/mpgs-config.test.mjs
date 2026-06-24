import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MPGS_ENV_KEYS,
  buildMpgsCancelUrl,
  buildMpgsReturnUrl,
  getMpgsApiVersion,
  getMpgsMode,
  mpgsConfigDiagnostics,
  validateMpgsPublicBaseUrl,
} from '../lib/server/payments/mpgs-config.js';

const ENV_KEY = MPGS_ENV_KEYS.PUBLIC_BASE_URL;
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

test('MPGS env keys follow CORPFLOW_MPGS_ prefix convention', () => {
  assert.equal(MPGS_ENV_KEYS.ENABLED, 'CORPFLOW_MPGS_ENABLED');
  assert.equal(MPGS_ENV_KEYS.MERCHANT_ID, 'CORPFLOW_MPGS_MERCHANT_ID');
  assert.equal(MPGS_ENV_KEYS.API_PASSWORD, 'CORPFLOW_MPGS_API_PASSWORD');
  assert.equal(MPGS_ENV_KEYS.PUBLIC_BASE_URL, 'CORPFLOW_MPGS_PUBLIC_BASE_URL');
  assert.match(MPGS_ENV_KEYS.GATEWAY_BASE_URL, /^CORPFLOW_MPGS_/);
});

test('getMpgsMode defaults to test when unset', () => {
  const snap = snapshotMpgsEnv();
  clearMpgsEnv();
  try {
    assert.equal(getMpgsMode(), 'test');
  } finally {
    restoreMpgsEnv(snap);
  }
});

test('getMpgsApiVersion defaults to 66 when unset', () => {
  const snap = snapshotMpgsEnv();
  clearMpgsEnv();
  try {
    assert.equal(getMpgsApiVersion(), '66');
  } finally {
    restoreMpgsEnv(snap);
  }
});

test('mpgsConfigDiagnostics exposes no secret values', () => {
  const snap = snapshotMpgsEnv();
  clearMpgsEnv();
  try {
    const d = mpgsConfigDiagnostics();
    assert.equal(typeof d.enabled, 'boolean');
    assert.equal(d.mode, 'test');
    assert.equal('api_password' in d, false);
    assert.equal('merchant_id' in d, false);
    assert.equal(d.merchant_id_present, false);
    assert.equal(typeof d.mpgs_public_base_url_present, 'boolean');
    assert.equal(typeof d.mpgs_public_base_url_valid, 'boolean');
  } finally {
    restoreMpgsEnv(snap);
  }
});

test('CORPFLOW_MPGS_PUBLIC_BASE_URL builds return/cancel URLs from path env keys', () => {
  const prev = process.env[ENV_KEY];
  const prevReturn = process.env.CORPFLOW_MPGS_RETURN_PATH;
  const prevCancel = process.env.CORPFLOW_MPGS_CANCEL_PATH;
  process.env[ENV_KEY] = 'https://pay-sbm-4-preview.vercel.app';
  process.env.CORPFLOW_MPGS_RETURN_PATH = '/pay/return';
  process.env.CORPFLOW_MPGS_CANCEL_PATH = '/pay/cancel';
  try {
    assert.equal(
      buildMpgsReturnUrl('CFLR-1'),
      'https://pay-sbm-4-preview.vercel.app/pay/return?order_ref=CFLR-1',
    );
    assert.equal(
      buildMpgsCancelUrl('CFLR-1'),
      'https://pay-sbm-4-preview.vercel.app/pay/cancel?order_ref=CFLR-1',
    );
    assert.equal(validateMpgsPublicBaseUrl().ok, true);
  } finally {
    if (prev === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = prev;
    if (prevReturn === undefined) delete process.env.CORPFLOW_MPGS_RETURN_PATH;
    else process.env.CORPFLOW_MPGS_RETURN_PATH = prevReturn;
    if (prevCancel === undefined) delete process.env.CORPFLOW_MPGS_CANCEL_PATH;
    else process.env.CORPFLOW_MPGS_CANCEL_PATH = prevCancel;
  }
});

test('TEST mode rejects corpflowai.com for CORPFLOW_MPGS_PUBLIC_BASE_URL', () => {
  const prev = process.env[ENV_KEY];
  process.env[ENV_KEY] = 'https://corpflowai.com';
  try {
    const result = validateMpgsPublicBaseUrl();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'test_must_use_preview_host');
  } finally {
    if (prev === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = prev;
  }
});

test('TEST mode allows test.corpflowai.com for CORPFLOW_MPGS_PUBLIC_BASE_URL', () => {
  const prev = process.env[ENV_KEY];
  process.env[ENV_KEY] = 'https://test.corpflowai.com';
  try {
    const result = validateMpgsPublicBaseUrl();
    assert.equal(result.ok, true);
    assert.equal(
      buildMpgsReturnUrl('CFLR-1'),
      'https://test.corpflowai.com/pay/return?order_ref=CFLR-1',
    );
  } finally {
    if (prev === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = prev;
  }
});

test('TEST mode still rejects lux.corpflowai.com for CORPFLOW_MPGS_PUBLIC_BASE_URL', () => {
  const prev = process.env[ENV_KEY];
  process.env[ENV_KEY] = 'https://lux.corpflowai.com';
  try {
    const result = validateMpgsPublicBaseUrl();
    assert.equal(result.ok, false);
    assert.equal(result.reason, 'test_must_use_preview_host');
  } finally {
    if (prev === undefined) delete process.env[ENV_KEY];
    else process.env[ENV_KEY] = prev;
  }
});
