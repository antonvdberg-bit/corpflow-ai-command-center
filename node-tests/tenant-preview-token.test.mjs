import test from 'node:test';
import assert from 'node:assert/strict';

import {
  signTenantPreviewToken,
  verifyTenantPreviewToken,
  verifyTenantPreviewTokenDetailed,
  buildClientSitePreviewUrl,
  isSafeTenantIdForPreviewToken,
  isTenantPreviewSecretConfigured,
  withClientSitePreviewFields,
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
    assert.equal(u.pathname, '/lux-landing-static');
    const v2 = verifyTenantPreviewToken(u.searchParams.get('cf_preview') || '');
    assert.equal(v2.ok, true);
    assert.equal(v2.tenantId, 'luxe-maurice');
  } finally {
    delete process.env.CORPFLOW_TENANT_PREVIEW_SECRET;
  }
});

test('vercel.app preview URL includes protection bypass when env set', () => {
  process.env.CORPFLOW_TENANT_PREVIEW_SECRET = 'unit-test-secret-at-least-16-chars';
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET = 'bypass-test-secret-xyz';
  try {
    const url = buildClientSitePreviewUrl('https://prj-abc123.vercel.app/path', 'luxe-maurice');
    assert.ok(url);
    const u = new URL(url);
    assert.equal(u.searchParams.get('x-vercel-protection-bypass'), 'bypass-test-secret-xyz');
    assert.equal(u.searchParams.get('x-vercel-set-bypass-cookie'), 'true');
  } finally {
    delete process.env.CORPFLOW_TENANT_PREVIEW_SECRET;
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
});

test('non-vercel preview URL does not include Vercel bypass', () => {
  process.env.CORPFLOW_TENANT_PREVIEW_SECRET = 'unit-test-secret-at-least-16-chars';
  process.env.VERCEL_AUTOMATION_BYPASS_SECRET = 'should-not-appear';
  try {
    const url = buildClientSitePreviewUrl('https://lux.corpflowai.com/', 'luxe-maurice');
    assert.ok(url);
    assert.equal(url.includes('x-vercel-protection-bypass'), false);
  } finally {
    delete process.env.CORPFLOW_TENANT_PREVIEW_SECRET;
    delete process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
  }
});

test('sign returns null without secret', () => {
  delete process.env.CORPFLOW_TENANT_PREVIEW_SECRET;
  assert.equal(signTenantPreviewToken('luxe-maurice'), null);
  assert.equal(verifyTenantPreviewToken('anything.here').ok, false);
  const d = verifyTenantPreviewTokenDetailed('anything.here');
  assert.equal(d.ok, false);
  assert.equal(d.reason, 'NO_SECRET_ON_SERVER');
  assert.equal(isTenantPreviewSecretConfigured(), false);
});

test('verifyTenantPreviewTokenDetailed reasons', () => {
  delete process.env.CORPFLOW_TENANT_PREVIEW_SECRET;
  assert.equal(verifyTenantPreviewTokenDetailed('').reason, 'NO_SECRET_ON_SERVER');
  process.env.CORPFLOW_TENANT_PREVIEW_SECRET = 'unit-test-secret-at-least-16-chars';
  try {
    assert.equal(isTenantPreviewSecretConfigured(), true);
    assert.equal(verifyTenantPreviewTokenDetailed('').reason, 'TOKEN_ABSENT');
    assert.equal(verifyTenantPreviewTokenDetailed('nope').reason, 'MALFORMED');
    const tok = signTenantPreviewToken('luxe-maurice', 3600);
    assert.ok(tok);
    assert.equal(verifyTenantPreviewTokenDetailed(tok + 'x').reason, 'BAD_SIGNATURE');
  } finally {
    delete process.env.CORPFLOW_TENANT_PREVIEW_SECRET;
  }
});

test('withClientSitePreviewFields flags missing secret for vercel.app', () => {
  delete process.env.CORPFLOW_TENANT_PREVIEW_SECRET;
  const a = withClientSitePreviewFields({}, 'https://prj-abc123.vercel.app/', 'luxe-maurice');
  assert.equal(a.client_site_preview_signing_issue, 'MISSING_CORPFLOW_TENANT_PREVIEW_SECRET');
  assert.equal(a.client_site_preview_url, undefined);
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

test('vercel.app root becomes /lux-landing-static; explicit path preserved', () => {
  process.env.CORPFLOW_TENANT_PREVIEW_SECRET = 'unit-test-secret-at-least-16-chars';
  try {
    const root = new URL(buildClientSitePreviewUrl('https://x.vercel.app', 'luxe-maurice') || '');
    assert.equal(root.pathname, '/lux-landing-static');
    const sub = new URL(buildClientSitePreviewUrl('https://x.vercel.app/foo/bar', 'luxe-maurice') || '');
    assert.equal(sub.pathname, '/foo/bar');
  } finally {
    delete process.env.CORPFLOW_TENANT_PREVIEW_SECRET;
  }
});
