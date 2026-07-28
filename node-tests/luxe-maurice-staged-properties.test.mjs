import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  findLuxStagedPropertyBySlug,
  getPublicLuxStagedListingRows,
  getPublicLuxStagedProperties,
  isLuxStagedDemoEntry,
  isLuxStagedDemoSlug,
  isLuxStagedPropertySlug,
  LUXE_MAURICE_STAGED_PROPERTIES,
  stagedPropertyToPublicListingRow,
} from '../lib/client/luxe-maurice-staged-properties.js';

test('staged slugs are stable and discoverable', () => {
  assert.ok(LUXE_MAURICE_STAGED_PROPERTIES.length >= 3);
  assert.ok(isLuxStagedPropertySlug('lm-nc-ridge'));
  assert.equal(isLuxStagedPropertySlug('../../../etc/passwd'), false);
  const hit = findLuxStagedPropertyBySlug('lm-villa-belombre');
  assert.ok(hit);
  assert.equal(hit?.title.includes('Bel Ombre'), true);
});

test('public curated opportunities expose memorandum fields for MVP', () => {
  for (const slug of ['lm-nc-ridge', 'lm-villa-belombre', 'lm-pent-plateau', 'lm-pipeline-q4']) {
    const p = findLuxStagedPropertyBySlug(slug);
    assert.ok(p, `${slug} must remain a staged entry`);
    assert.ok(String(p.region || '').length > 2, `${slug} needs region`);
    assert.ok(String(p.property_type || '').length > 2, `${slug} needs type`);
    assert.ok(String(p.status || '').length > 2, `${slug} needs status`);
    assert.ok(String(p.teaser || '').length > 20, `${slug} needs positioning teaser`);
    assert.ok(String(p.summary || '').length > 40, `${slug} needs summary`);
    assert.ok(Array.isArray(p.highlights) && p.highlights.length >= 3, `${slug} needs highlights`);
  }
});

test('getPublicLuxStagedListingRows maps curated cards and strips demos', () => {
  const rows = getPublicLuxStagedListingRows();
  assert.ok(rows.length >= 4);
  assert.equal(rows.some((r) => r.slug === 'lm-phase2d-manual-demo'), false);
  const ridge = rows.find((r) => r.slug === 'lm-nc-ridge');
  assert.ok(ridge);
  assert.equal(ridge.region_label, 'North Mauritius');
  assert.equal(ridge.property_type, 'Residences');
  assert.ok(Array.isArray(ridge.highlights) && ridge.highlights.length >= 3);
  assert.equal(ridge.source, 'staged_curated');

  const mapped = stagedPropertyToPublicListingRow(findLuxStagedPropertyBySlug('lm-pipeline-q4'));
  assert.ok(mapped);
  assert.equal(mapped.slug, 'lm-pipeline-q4');
  assert.ok(String(mapped.short_teaser || '').length > 10);
});

test('lm-phase2d-manual-demo is flagged demo:true in the canonical catalog', () => {
  const demo = findLuxStagedPropertyBySlug('lm-phase2d-manual-demo');
  assert.ok(demo, 'demo entry must still exist in the catalog for editor preview / audit');
  assert.equal(demo?.demo, true);
  assert.equal(isLuxStagedDemoEntry(demo), true);
  assert.equal(isLuxStagedDemoSlug('lm-phase2d-manual-demo'), true);
});

test('non-demo entries are not flagged demo', () => {
  for (const slug of ['lm-nc-ridge', 'lm-villa-belombre', 'lm-pent-plateau', 'lm-pipeline-q4']) {
    const p = findLuxStagedPropertyBySlug(slug);
    assert.ok(p, `${slug} must remain a staged entry`);
    assert.notEqual(p?.demo, true, `${slug} must NOT be flagged demo`);
    assert.equal(isLuxStagedDemoEntry(p), false);
    assert.equal(isLuxStagedDemoSlug(slug), false);
  }
});

test('isLuxStagedDemoSlug rejects garbage / unknown slugs', () => {
  assert.equal(isLuxStagedDemoSlug('lm-nc-ridge'), false);
  assert.equal(isLuxStagedDemoSlug(''), false);
  assert.equal(isLuxStagedDemoSlug('../../../etc/passwd'), false);
  assert.equal(isLuxStagedDemoSlug('lm-not-in-catalog'), false);
  assert.equal(isLuxStagedDemoSlug(null), false);
  assert.equal(isLuxStagedDemoSlug(undefined), false);
});

test('getPublicLuxStagedProperties strips demo entries from the canonical catalog', () => {
  const pub = getPublicLuxStagedProperties();
  assert.ok(pub.length >= 1);
  assert.equal(pub.some((p) => p.slug === 'lm-phase2d-manual-demo'), false);
  assert.equal(pub.every((p) => !isLuxStagedDemoEntry(p)), true);
  assert.equal(pub.length, LUXE_MAURICE_STAGED_PROPERTIES.length - 1);
});

test('getPublicLuxStagedProperties strips demo entries from a tenant-supplied override', () => {
  const tenantOverride = [
    { slug: 'lm-real-1', title: 'Real one', region: 'X', property_type: 'Y', status: 'Z', group: 'north', teaser: 'real' },
    {
      slug: 'lm-phase2d-manual-demo',
      title: 'demo override',
      region: 'X',
      property_type: 'Y',
      status: 'Z',
      group: 'villa',
      teaser: 'demo',
      demo: true,
    },
  ];
  const pub = getPublicLuxStagedProperties(tenantOverride);
  assert.equal(pub.length, 1);
  assert.equal(pub[0].slug, 'lm-real-1');
});
