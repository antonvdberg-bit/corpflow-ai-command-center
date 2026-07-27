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

test('fetchLuxMarketingOpportunityListings: empty published falls back to staged curated', async () => {
  const { fetchLuxMarketingOpportunityListings } = await import(
    '../lib/server/lux-listing-published-query.js'
  );
  const prisma = {
    luxListing: {
      findMany: async () => [],
    },
  };
  const rows = await fetchLuxMarketingOpportunityListings(prisma);
  assert.ok(rows.length >= 4);
  assert.equal(rows.some((r) => r.slug === 'lm-phase2d-manual-demo'), false);
  assert.ok(rows.some((r) => r.slug === 'lm-nc-ridge'));
});

test('fetchLuxMarketingOpportunityListings: published rows win over staged', async () => {
  const { fetchLuxMarketingOpportunityListings } = await import(
    '../lib/server/lux-listing-published-query.js'
  );
  const prisma = {
    luxListing: {
      findMany: async () => [
        {
          slug: 'lm-db-live',
          title: 'Live DB villa',
          regionLabel: 'West',
          propertyType: 'Villa',
          listingStatus: 'Private preview',
          priceRange: 'On request',
          shortTeaser: 'DB teaser',
          highlightsJson: ['A'],
          bedrooms: null,
          bathrooms: null,
          areaSqm: null,
          publishedAt: new Date('2026-07-01T00:00:00.000Z'),
        },
      ],
    },
  };
  const rows = await fetchLuxMarketingOpportunityListings(prisma);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].slug, 'lm-db-live');
});

test('LUX_PROPERTIES_PUBLIC_COPY keys are stable', () => {
  assert.ok(LUX_PROPERTIES_PUBLIC_COPY.emptyKicker.length > 4);
  assert.ok(LUX_PROPERTIES_PUBLIC_COPY.emptyCta.toLowerCase().includes('consultation'));
  assert.ok(LUX_PROPERTIES_PUBLIC_COPY.journeyTitle.toLowerCase().includes('request'));
  assert.equal(LUX_PROPERTIES_PUBLIC_COPY.cardCtaConcierge, 'Request private access');
  assert.equal(LUX_PROPERTIES_PUBLIC_COPY.cardCtaDetails, 'Opportunity memorandum');
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
