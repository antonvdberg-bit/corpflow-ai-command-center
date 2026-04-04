import test from 'node:test';
import assert from 'node:assert/strict';

import {
  evaluateOnboardingHostnamePolicy,
  isPublicCorpflowStackHostname,
  normalizeHostnameForPolicy,
  stackHostnameTenantPrefix,
  validateBootstrapHostnamesPolicy,
} from '../lib/server/tenant-hostname-policy.js';

test('normalizeHostnameForPolicy strips protocol and port', () => {
  assert.equal(normalizeHostnameForPolicy('HTTPS://Acme.Corpflowai.Com/login'), 'acme.corpflowai.com');
  assert.equal(normalizeHostnameForPolicy('x.corpflowai.com:8443'), 'x.corpflowai.com');
});

test('isPublicCorpflowStackHostname matches apex and subdomains', () => {
  assert.equal(isPublicCorpflowStackHostname('corpflowai.com'), true);
  assert.equal(isPublicCorpflowStackHostname('client.corpflowai.com'), true);
  assert.equal(isPublicCorpflowStackHostname('evilcorpflowai.com'), false);
  assert.equal(isPublicCorpflowStackHostname('client.example.com'), false);
});

test('evaluateOnboardingHostnamePolicy allows bypass', () => {
  const r = evaluateOnboardingHostnamePolicy('client.example.com', { bypass: true });
  assert.equal(r.allowed, true);
  assert.ok(r.notice);
});

test('validateBootstrapHostnamesPolicy aggregates notices for exempt host', () => {
  const r = validateBootstrapHostnamesPolicy(['foo.vercel.app'], { bypass: false });
  assert.equal(r.ok, true);
  assert.ok(Array.isArray(r.notices));
});

test('when CORPFLOW_ENFORCE_CORPFLOW_SUBDOMAIN_ONBOARDING=true, off-stack host is denied', () => {
  const prev = process.env.CORPFLOW_ENFORCE_CORPFLOW_SUBDOMAIN_ONBOARDING;
  process.env.CORPFLOW_ENFORCE_CORPFLOW_SUBDOMAIN_ONBOARDING = 'true';
  try {
    const r = evaluateOnboardingHostnamePolicy('nope.example.com', {});
    assert.equal(r.allowed, false);
    assert.equal(r.code, 'ONBOARDING_USE_CORPFLOW_SUBDOMAIN');
  } finally {
    if (prev === undefined) delete process.env.CORPFLOW_ENFORCE_CORPFLOW_SUBDOMAIN_ONBOARDING;
    else process.env.CORPFLOW_ENFORCE_CORPFLOW_SUBDOMAIN_ONBOARDING = prev;
  }
});

test('stackHostnameTenantPrefix is label before CORPFLOW_ROOT_DOMAIN', () => {
  assert.equal(stackHostnameTenantPrefix('acme-corp.corpflowai.com'), 'acme-corp');
  assert.equal(stackHostnameTenantPrefix('a.b.corpflowai.com'), 'a.b');
  assert.equal(stackHostnameTenantPrefix('corpflowai.com'), '');
});

test('when CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID=true, wrong subdomain label is denied', () => {
  const prev = process.env.CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID;
  process.env.CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID = 'true';
  try {
    const r = evaluateOnboardingHostnamePolicy('lux.corpflowai.com', { tenantId: 'luxe-maurice' });
    assert.equal(r.allowed, false);
    assert.equal(r.code, 'ONBOARDING_HOSTNAME_TENANT_ID_MISMATCH');
  } finally {
    if (prev === undefined) delete process.env.CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID;
    else process.env.CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID = prev;
  }
});

test('when tenant id does not match prefix but enforce is off, still allowed with notice', () => {
  const prev = process.env.CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID;
  delete process.env.CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID;
  try {
    const r = evaluateOnboardingHostnamePolicy('lux.corpflowai.com', { tenantId: 'luxe-maurice' });
    assert.equal(r.allowed, true);
    assert.ok(r.notice && r.notice.includes('luxe-maurice.corpflowai.com'));
  } finally {
    if (prev === undefined) delete process.env.CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID;
    else process.env.CORPFLOW_ENFORCE_HOSTNAME_MATCHES_TENANT_ID = prev;
  }
});
