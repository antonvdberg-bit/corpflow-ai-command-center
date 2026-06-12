#!/usr/bin/env node
/**
 * READ-ONLY: enumerate what currently appears on the LuxeMaurice public surfaces.
 *   - Published `lux_listings` (drive `/properties` and the public `/property/[slug]`
 *     resolution layer for DB-only rows).
 *   - Staged hardcoded catalog (drive the homepage `staged_properties` fallback and
 *     `/property/[slug]` resolution layer for editorial slugs).
 * No writes; no schema changes.
 */
import './bootstrap-repo-env.mjs';
import { PrismaClient } from '@prisma/client';
import { LUXE_MAURICE_STAGED_PROPERTIES } from '../lib/client/luxe-maurice-staged-properties.js';

const prisma = new PrismaClient();

async function main() {
  const rows = await prisma.luxListing.findMany({
    where: { tenantId: 'luxe-maurice' },
    select: { slug: true, title: true, visibilityStatus: true, publishedAt: true, updatedAt: true },
    orderBy: { updatedAt: 'desc' },
    take: 40,
  });
  const byVis = {};
  for (const r of rows) byVis[r.visibilityStatus || '(null)'] = (byVis[r.visibilityStatus || '(null)'] || 0) + 1;
  console.log('lux_listings rows:', rows.length, 'by visibility:', JSON.stringify(byVis));
  for (const r of rows) {
    console.log(
      ' ',
      r.visibilityStatus,
      '|',
      (r.slug || '').padEnd(30),
      '|',
      String(r.title || '').slice(0, 40),
      '|',
      r.publishedAt ? r.publishedAt.toISOString() : 'unpublished',
    );
  }
  console.log('---');
  console.log('hardcoded staged catalog (LUXE_MAURICE_STAGED_PROPERTIES):', LUXE_MAURICE_STAGED_PROPERTIES.length);
  for (const s of LUXE_MAURICE_STAGED_PROPERTIES) {
    console.log(' ', (s.slug || '').padEnd(30), '|', s.status, '|', s.title);
  }
}

main()
  .catch((e) => {
    console.error(e?.message || e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
