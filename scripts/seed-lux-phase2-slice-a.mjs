#!/usr/bin/env node
/**
 * Idempotent seed for LuxeMaurice Phase 2 Slice A (`lux_listings`).
 *
 * - `lm-phase2d-manual-demo` — **published**, `listing_source = staged_demo` (aligns with staged catalogue slug for concierge + `/property` resolution).
 * - `lm-client-property-draft-1` — **draft**, `listing_source = manual_admin` (not returned by public read APIs).
 *
 * Does **not** claim final client inventory. Safe for dev/staging; run in production only when operator approves.
 *
 *   node scripts/seed-lux-phase2-slice-a.mjs
 *   node scripts/seed-lux-phase2-slice-a.mjs --dry-run
 */

import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';

const TENANT = 'luxe-maurice';
const dryRun = process.argv.includes('--dry-run');

const pg = String(process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || '').trim();
if (!pg) {
  console.error('POSTGRES_URL (or POSTGRES_PRISMA_URL) must be set.');
  process.exit(1);
}

const prisma = new PrismaClient();

const publishedDemo = {
  tenantId: TENANT,
  slug: 'lm-phase2d-manual-demo',
  title: 'Le Château — manual workflow demonstration',
  regionLabel: 'Moka foothills',
  propertyType: 'Estate villa',
  listingStatus: 'Private preview',
  priceRange: 'On application',
  shortTeaser:
    'Demonstration-only entry for the LuxeMaurice manual curated workflow — replace with client-approved copy when ready.',
  description:
    'Demonstration-only entry for the LuxeMaurice manual curated workflow. It is not a binding offer, not confirmed inventory, and exists until operators replace it with client-approved property data. Availability, pricing, and documentation are shared only through the private concierge after verification.',
  highlightsJson: [
    'Illustrative estate-scale layout — not a measured survey',
    'Operator replaces this block after client intake PR',
  ],
  bedrooms: null,
  bathrooms: null,
  areaSqm: null,
  mediaRefsJson: [],
  listingSource: 'staged_demo',
  visibilityStatus: 'published',
  publishedAt: new Date('2026-05-01T12:00:00.000Z'),
};

const draftClient = {
  tenantId: TENANT,
  slug: 'lm-client-property-draft-1',
  title: 'Client property draft (placeholder)',
  regionLabel: 'Mauritius (TBD)',
  propertyType: 'Residence',
  listingStatus: 'Draft',
  priceRange: null,
  shortTeaser:
    'Internal draft row for Slice A API tests — not advertised inventory. Replace or archive before go-live catalogue.',
  description:
    'This row exists to exercise Postgres persistence and draft visibility. It must not be presented as confirmed stock. Operators should replace slug, copy, and visibility when the first real client-approved listing is ready.',
  highlightsJson: ['Draft only — excluded from public GET /api/lux/properties'],
  bedrooms: null,
  bathrooms: null,
  areaSqm: null,
  mediaRefsJson: [],
  listingSource: 'manual_admin',
  visibilityStatus: 'draft',
  publishedAt: null,
};

try {
  if (dryRun) {
    console.log(JSON.stringify({ dry_run: true, would_upsert: [publishedDemo.slug, draftClient.slug] }, null, 2));
    process.exit(0);
  }

  for (const row of [publishedDemo, draftClient]) {
    await prisma.luxListing.upsert({
      where: { tenantId_slug: { tenantId: TENANT, slug: row.slug } },
      create: row,
      update: {
        title: row.title,
        regionLabel: row.regionLabel,
        propertyType: row.propertyType,
        listingStatus: row.listingStatus,
        priceRange: row.priceRange,
        shortTeaser: row.shortTeaser,
        description: row.description,
        highlightsJson: row.highlightsJson,
        bedrooms: row.bedrooms,
        bathrooms: row.bathrooms,
        areaSqm: row.areaSqm,
        mediaRefsJson: row.mediaRefsJson,
        listingSource: row.listingSource,
        visibilityStatus: row.visibilityStatus,
        publishedAt: row.publishedAt,
      },
    });
  }

  console.log(JSON.stringify({ ok: true, upserted: [publishedDemo.slug, draftClient.slug] }, null, 2));
} catch (e) {
  console.error(e);
  process.exit(1);
} finally {
  await prisma.$disconnect().catch(() => {});
}
