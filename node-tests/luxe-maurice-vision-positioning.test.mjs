/**
 * LuxeMaurice — Vision-Aligned Public Experience (Slice 1) — positioning audit.
 *
 * Purpose: prevent silent regression of the 2026-06-11 repositioning to the
 * *Private Wealth & Lifestyle Platform* direction. This is a string-level
 * audit, not an HTTP/E2E test:
 *
 * - No active IDX / MLS / external-feed language on the public Lux surfaces
 *   the visitor sees (homepage shell, `/properties` copy, `/property/[slug]`
 *   shell, `/concierge` page, brand theme).
 * - Required positioning anchors are present in the source of the public
 *   surfaces (homepage shell, `/properties` empty-state, `/concierge` copy,
 *   property detail shell).
 *
 * The forbidden audit deliberately scans the **on-disk source** of these
 * files so any future regression that re-introduces IDX wording on a public
 * surface will fail this test even if it lands in a fresh file.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LUX_PROPERTIES_PUBLIC_COPY,
  luxPropertiesCopyAuditGuard,
} from '../lib/client/luxe-maurice-properties-public.js';
import { LUXE_MAURICE_BRAND_TOKENS as T } from '../lib/client/luxe-maurice-brand-theme.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readFile(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

/**
 * Public Lux surfaces audited for forbidden language.
 *
 * `lib/client/luxe-maurice-properties-public.js` is intentionally excluded
 * because it owns the *forbidden-term audit list itself* — its
 * `luxPropertiesCopyAuditGuard()` already enforces the same rule against
 * the live copy strings and is covered by a separate assertion below.
 */
const PUBLIC_LUX_SURFACES = [
  'components/LuxeMauriceTenantPresentation.js',
  'components/LuxeMauricePropertiesDirectory.js',
  'components/LuxeMauricePropertyDetailPage.js',
  'pages/concierge.js',
];

/**
 * IDX / MLS are uppercase industry acronyms — match case-sensitively to avoid
 * spurious hits on JavaScript identifiers like the `idx` loop counter or
 * an `mls` substring inside an unrelated word. The other patterns are
 * multi-word phrases and stay case-insensitive.
 */
const FORBIDDEN_PUBLIC_PATTERNS = [
  /\bIDX\b/,
  /\bMLS\b/,
  /\brealtor platform\b/i,
  /\breal estate platform\b/i,
  /\bproperty feed\b/i,
  /\bfeed-first\b/i,
];

test('public Lux surfaces do not present IDX / MLS / external-feed language', () => {
  for (const rel of PUBLIC_LUX_SURFACES) {
    const src = readFile(rel);
    for (const pat of FORBIDDEN_PUBLIC_PATTERNS) {
      assert.ok(
        !pat.test(src),
        `forbidden public copy pattern ${pat} found in ${rel}; this surface is visitor-facing under the LuxeMaurice Private Wealth & Lifestyle Platform direction`,
      );
    }
  }
});

test('LUX_PROPERTIES_PUBLIC_COPY: forbidden-term audit guard still passes', () => {
  const r = luxPropertiesCopyAuditGuard();
  assert.equal(r.ok, true, r.ok === false ? `leaked term: ${r.term}` : '');
});

test('LUX_PROPERTIES_PUBLIC_COPY: Private Opportunities framing is the active framing', () => {
  assert.equal(LUX_PROPERTIES_PUBLIC_COPY.pageTitle, 'Private Opportunities · LuxeMaurice');
  assert.equal(LUX_PROPERTIES_PUBLIC_COPY.emptyKicker, 'Private opportunities');
  assert.ok(
    LUX_PROPERTIES_PUBLIC_COPY.emptyBody.includes('Private opportunities are being prepared for client review.'),
    'empty-state body must use the approved "Private opportunities are being prepared for client review." line',
  );
  assert.equal(LUX_PROPERTIES_PUBLIC_COPY.emptyCta, 'Request a private consultation');
  assert.equal(LUX_PROPERTIES_PUBLIC_COPY.headerTagline, 'Invited. Not advertised.');
});

test('homepage shell renders the approved vision anchors', () => {
  const src = readFile('components/LuxeMauriceTenantPresentation.js');
  for (const anchor of [
    'Private Wealth &amp; Lifestyle Platform',
    'Private. Curated. Considered.',
    'This is not a property website.',
    'Mauritius as a strategic base',
    'Two buyers. One standard of care.',
    'Invited. Not advertised.',
    'Confidence at distance.',
    'Request a private consultation',
  ]) {
    assert.ok(src.includes(anchor), `homepage shell missing required vision anchor: ${anchor}`);
  }
});

test('homepage shell exposes the five Mauritius strategic-base pillars', () => {
  const src = readFile('components/LuxeMauriceTenantPresentation.js');
  for (const label of ['Lifestyle', 'Security', 'Connectivity', 'Legacy', 'Opportunity']) {
    assert.ok(
      src.includes(`label: '${label}'`),
      `homepage shell missing strategic-base pillar: ${label}`,
    );
  }
});

test('homepage shell exposes the two client journeys', () => {
  const src = readFile('components/LuxeMauriceTenantPresentation.js');
  for (const title of ['Completed Residence Buyer', 'Development Partner']) {
    assert.ok(
      src.includes(`title: '${title}'`),
      `homepage shell missing client journey: ${title}`,
    );
  }
});

test('/properties surface uses Private Opportunities framing', () => {
  const src = readFile('components/LuxeMauricePropertiesDirectory.js');
  assert.ok(src.includes('LUX_PROPERTIES_PUBLIC_COPY.emptyKicker'), 'directory must drive copy from the audited public-copy module');
  assert.ok(src.includes('LUX_PROPERTIES_PUBLIC_COPY.emptyBody'), 'directory must drive empty-state body from the public-copy module');
  assert.ok(src.includes('LUX_PROPERTIES_PUBLIC_COPY.emptyCta'), 'directory must drive empty-state CTA from the public-copy module');
});

test('/property/[slug] shell reads as a private opportunity overview', () => {
  const src = readFile('components/LuxeMauricePropertyDetailPage.js');
  for (const anchor of [
    'Private opportunity overview',
    'Opportunity overview',
    'Advisory notes',
    'Request a private consultation',
  ]) {
    assert.ok(src.includes(anchor), `property detail shell missing required anchor: ${anchor}`);
  }
});

test('/concierge surface uses Private Advisory framing and the approved CTA', () => {
  const src = readFile('pages/concierge.js');
  for (const anchor of [
    'Private advisory',
    'Request a private consultation',
    'Tell us what you are seeking in Mauritius',
    'Completed residence',
    'Development partnership',
    'Relocation to Mauritius',
    'Investment / diversification',
    'Ongoing ownership support',
  ]) {
    assert.ok(src.includes(anchor), `/concierge missing required anchor: ${anchor}`);
  }
});

test('LuxeMaurice brand theme exposes the editorial dark / gold / ivory tokens', () => {
  for (const key of [
    'charcoal',
    'charcoalDeep',
    'charcoalSoft',
    'ivory',
    'ivorySoft',
    'ivoryMuted',
    'goldEditorial',
    'goldEditorialDeep',
    'divider',
    'dividerSoft',
  ]) {
    assert.ok(
      typeof T[key] === 'string' && T[key].length > 0,
      `brand theme missing editorial token: ${key}`,
    );
  }
});

test('SSR Lux branch on / does not seed fake feed inventory on public surface', () => {
  const src = readFile('pages/index.js');
  assert.ok(
    /site\.feed_properties\s*=\s*\[\]/.test(src),
    'pages/index.js must keep site.feed_properties as an empty array for the luxe-maurice tenant (no fake inventory on public surfaces)',
  );
  assert.ok(
    !src.includes("import { LUXE_MAURICE_FEED_PROPERTIES }"),
    'pages/index.js must not import the legacy LUXE_MAURICE_FEED_PROPERTIES set into the public SSR branch',
  );
});
