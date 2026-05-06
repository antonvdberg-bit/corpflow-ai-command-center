import assert from 'node:assert/strict';
import { test } from 'node:test';
import { resolveLuxPropertyRef } from '../lib/client/luxe-maurice-property-resolve.js';

test('resolveLuxPropertyRef distinguishes curated vs feed', () => {
  const c = resolveLuxPropertyRef('lm-nc-ridge');
  assert.ok(c);
  assert.equal(c?.discovery_source, 'curated');
  assert.equal(c?.ref, 'lm-nc-ridge');
  assert.equal(c?.listing_provider, 'curated_staged');
  assert.ok(c?.summary_text && String(c.summary_text).length > 10);
  assert.ok(Array.isArray(c?.highlights) && c.highlights.length >= 2);

  const f = resolveLuxPropertyRef('lxf-grand-baie-apt');
  assert.ok(f);
  assert.equal(f?.discovery_source, 'feed');
  assert.equal(f?.ref, 'lxf-grand-baie-apt');
  assert.equal(f?.listing_provider, 'mock_feed_v1');
  assert.ok(f?.price_range);
  assert.ok(f?.summary_text && String(f.summary_text).includes('Indicative'));
});

test('resolveLuxPropertyRef rejects unknown and pathological input', () => {
  assert.equal(resolveLuxPropertyRef('not-a-listing'), null);
  assert.equal(resolveLuxPropertyRef('../../../x'), null);
  assert.equal(resolveLuxPropertyRef(''), null);
});
