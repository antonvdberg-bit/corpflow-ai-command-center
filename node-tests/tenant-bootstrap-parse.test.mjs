import assert from 'node:assert/strict';
import { test } from 'node:test';

import { parseBootstrapBody } from '../lib/server/tenant-onboarding-bootstrap.js';

test('parseBootstrapBody requires tenant_id', () => {
  const r = parseBootstrapBody({});
  assert.equal(r.ok, false);
});

test('parseBootstrapBody accepts host + hostnames', () => {
  const r = parseBootstrapBody({
    tenant_id: 'acme-demo',
    host: 'ACME.CorpflowAI.com',
    hostnames: ['other.example.com'],
    issue_pin: true,
  });
  assert.equal(r.ok, true);
  if (r.ok) {
    assert.equal(r.data.tenantId, 'acme-demo');
    assert.deepEqual(r.data.hostnames.sort(), ['acme.corpflowai.com', 'other.example.com'].sort());
    assert.equal(r.data.issuePin, true);
  }
});

test('parseBootstrapBody rejects invalid hostname', () => {
  const r = parseBootstrapBody({ tenant_id: 'x', hostnames: ['bad_host'] });
  assert.equal(r.ok, false);
});
