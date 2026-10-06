import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const TEMPLATE = readFileSync(
  new URL('../docs/erpnext/templates/corpflowai-professional-quotation.html', import.meta.url),
  'utf8',
);

test('professional quotation template contains the reusable brand and document structure', () => {
  assert.match(TEMPLATE, /__CORPFLOW_LOGO_DATA_URI__/);
  assert.match(TEMPLATE, /class="cfq-title">Quotation</);
  assert.match(TEMPLATE, /class="cfq-meta"/);
  assert.match(TEMPLATE, /class="cfq-parties"/);
  assert.match(TEMPLATE, /class="cfq-items"/);
  assert.match(TEMPLATE, /class="cfq-grand"/);
  assert.match(TEMPLATE, /Payment instructions are sent separately/);
  assert.doesNotMatch(TEMPLATE, /CRM-LEAD/);
  assert.doesNotMatch(TEMPLATE, /Lead ID/i);
});

test('professional quotation template uses client-facing Bill To fallbacks', () => {
  assert.match(TEMPLATE, /doc\.customer_name or doc\.customer/);
  assert.match(TEMPLATE, /doc\.address_display/);
  assert.match(TEMPLATE, /doc\.customer_address/);
  assert.match(TEMPLATE, /doc\.contact_display/);
  assert.match(TEMPLATE, /doc\.contact_email/);
});
