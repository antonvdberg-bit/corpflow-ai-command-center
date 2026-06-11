import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildLuxPropertyConciergeHref,
  luxPropertiesCopyAuditGuard,
  LUX_PROPERTIES_PUBLIC_COPY,
} from '../lib/client/luxe-maurice-properties-public.js';
import {
  isLuxListingPublicTenantId,
  resolveLuxPropertyRefWithPublishedDb,
} from '../lib/server/lux-listing-published-query.js';
import { resolveLuxPropertyRef } from '../lib/client/luxe-maurice-property-resolve.js';

test('lux properties public copy: audit guard passes', () => {
  const r = luxPropertiesCopyAuditGuard();
  assert.equal(r.ok, true, r.ok === false ? `leaked term ${r.term}` : '');
});

test('lux properties: concierge href with and without slug', () => {
  assert.equal(buildLuxPropertyConciergeHref(null), '/concierge?intent=property');
  assert.equal(buildLuxPropertyConciergeHref('lm-test-one'), '/concierge?intent=property&property=lm-test-one');
});

test('resolveLuxPropertyRefWithPublishedDb: staged slug wins without DB hit', async () => {
  const prisma = { luxListing: { findFirst: async () => null } };
  const r = await resolveLuxPropertyRefWithPublishedDb(prisma, 'lm-nc-ridge');
  assert.ok(r);
  assert.equal(r.ref, 'lm-nc-ridge');
  assert.notEqual(r.discovery_source, 'lux_postgres');
});

test('resolveLuxPropertyRefWithPublishedDb: published Postgres row', async () => {
  const prisma = {
    luxListing: {
      findFirst: async ({ where }) => {
        assert.equal(where.slug, 'lm-only-db');
        assert.equal(where.visibilityStatus, 'published');
        return {
          slug: 'lm-only-db',
          title: 'Villa Azure',
          regionLabel: 'North',
          propertyType: 'Villa',
          listingStatus: 'Private preview',
          priceRange: 'On request',
          shortTeaser: 'Quiet ridge position.',
          description: 'Long description here.',
          highlightsJson: ['Sea views'],
        };
      },
    },
  };
  const sync = resolveLuxPropertyRef('lm-only-db');
  assert.equal(sync, null);
  const r = await resolveLuxPropertyRefWithPublishedDb(prisma, 'lm-only-db');
  assert.ok(r);
  assert.equal(r.discovery_source, 'lux_postgres');
  assert.equal(r.ref, 'lm-only-db');
  assert.equal(r.listing_provider, 'lux_postgres_published');
});

test('LUX_PROPERTIES_PUBLIC_COPY keys are stable', () => {
  assert.ok(LUX_PROPERTIES_PUBLIC_COPY.emptyKicker.length > 4);
  assert.ok(LUX_PROPERTIES_PUBLIC_COPY.emptyCta.toLowerCase().includes('consultation'));
});

test('empty state copy matches LuxeMaurice Vision-Aligned Public Experience (Slice 1)', () => {
  assert.equal(LUX_PROPERTIES_PUBLIC_COPY.emptyKicker, 'Private opportunities');
  assert.ok(
    LUX_PROPERTIES_PUBLIC_COPY.emptyBody.includes(
      'Private opportunities are being prepared for client review.',
    ),
  );
});

test('listing card URLs: detail + concierge with slug', () => {
  const slug = 'lm-fixture-one';
  assert.equal(`/property/${encodeURIComponent(slug)}`, '/property/lm-fixture-one');
  assert.equal(buildLuxPropertyConciergeHref(slug), '/concierge?intent=property&property=lm-fixture-one');
});

test('isLuxListingPublicTenantId: only luxe-maurice exposes /properties data path', () => {
  assert.equal(isLuxListingPublicTenantId('luxe-maurice'), true);
  assert.equal(isLuxListingPublicTenantId('other-tenant'), false);
  assert.equal(isLuxListingPublicTenantId(''), false);
});
