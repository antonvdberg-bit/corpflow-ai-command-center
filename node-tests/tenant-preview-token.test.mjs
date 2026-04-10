import test from 'node:test';
import assert from 'node:assert/strict';

import {
  signTenantPreviewToken,
  verifyTenantPreviewToken,
  buildClientSitePreviewUrl,
  isSafeTenantIdForPreviewToken,
} from '../lib/server/tenant-preview-token.js';

test('preview token round-trip when secret configured', () => {
  process.env.CORPFLOW_TENANT_PREVIEW_SECRET = 'unit-test-secret-at-least-16-chars';
  try {
    const tok = signTenantPreviewToken('luxe-maurice', 3600);
    assert.ok(tok && tok.includes('.'));
    const v = verifyTenantPreviewToken(tok);
    assert.equal(v.ok, true);
    assert.equal(v.tenantId, 'luxe-maurice');
    const url = buildClientSitePreviewUrl('https://example-abc123.vercel.app/', 'luxe-maurice');
    assert.ok(url && url.includes('cf_preview='));
    const u = new URL(url);
    const v2 = verifyTenantPreviewToken(u.searchParams.get('cf_preview') || '');
    assert.equal(v2.ok, true);
    assert.equal(v2.tenantId, 'luxe-maurice');
  } finally {
    delete process.env.CORPFLOW_TENANT_PREVIEW_SECRET;
  }
});

test('sign returns null without secret', () => {
  delete process.env.CORPFLOW_TENANT_PREVIEW_SECRET;
  assert.equal(signTenantPreviewToken('luxe-maurice'), null);
  assert.equal(verifyTenantPreviewToken('anything.here').ok, false);
});

test('reject tampered token', () => {
  process.env.CORPFLOW_TENANT_PREVIEW_SECRET = 'another-test-secret-xx';
  try {
    const tok = signTenantPreviewToken('luxe-maurice');
    assert.ok(tok);
    const parts = tok.split('.');
    const tampered = parts[0] + '.AAAA';
    assert.equal(verifyTenantPreviewToken(tampered).ok, false);
  } finally {
    delete process.env.CORPFLOW_TENANT_PREVIEW_SECRET;
  }
});

test('isSafeTenantIdForPreviewToken', () => {
  assert.equal(isSafeTenantIdForPreviewToken('luxe-maurice'), true);
  assert.equal(isSafeTenantIdForPreviewToken('../etc/passwd'), false);
  assert.equal(isSafeTenantIdForPreviewToken(''), false);
});
