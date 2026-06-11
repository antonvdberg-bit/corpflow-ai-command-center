/**
 * LuxeMaurice — Vision-Aligned Public Experience — positioning + brand-fidelity audit.
 *
 * Purpose: prevent silent regression of the 2026-06-11 repositioning to the
 * *Private Wealth & Lifestyle Platform* direction **and** of the client-approved
 * brand guideline (palette, typography, monogram, wordmark, signature) shipped
 * alongside the public-surface redesign.
 *
 * This is a string-level audit, not an HTTP/E2E test:
 *
 * - No active IDX / MLS / external-feed language on the public Lux surfaces
 *   the visitor sees (homepage shell, `/properties` copy, `/property/[slug]`
 *   shell, `/concierge` page).
 * - Required positioning anchors are present in the source of the public
 *   surfaces (homepage shell, `/properties` empty-state, `/concierge` copy,
 *   property detail shell).
 * - The brand theme exposes the **exact** four-colour brand system
 *   (`#111111` charcoal, `#F4EFE8` ivory, `#A8842C` gold, `#6B6256` stone)
 *   plus the Cormorant Garamond / Inter type stack.
 * - All four public Lux surfaces import `LuxeMauriceFontStylesheet` so
 *   Cormorant Garamond actually loads on the live page (Inter is already
 *   self-hosted in `pages/_document.js`).
 * - All four public Lux surfaces use the shared brand wordmark / monogram
 *   primitive so the header treatment cannot drift across surfaces.
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
import {
  LUXE_MAURICE_BRAND_TOKENS as T,
  LUXE_MAURICE_BRAND_SIGNATURE,
  LUXE_MAURICE_BRAND_STRAPLINE,
  LUXE_MAURICE_DESIGN_PILLARS,
} from '../lib/client/luxe-maurice-brand-theme.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readFile(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

/**
 * Public Lux surfaces audited for forbidden language and brand-fidelity wiring.
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
    'Private Wealth & Lifestyle Platform',
    'This is not a property website.',
    'Mauritius as a strategic base',
    'Two buyers. One standard of care.',
    'Invited. Not advertised.',
    'Confidence at distance.',
    'Private Advisory',
  ]) {
    assert.ok(src.includes(anchor), `homepage shell missing required vision anchor: ${anchor}`);
  }
});

test('homepage hero plate carries the brand wordmark + signature', () => {
  // `Private. Curated. Considered.` arrives via the brand-signature constant.
  // The signature must be the canonical string everywhere.
  assert.equal(LUXE_MAURICE_BRAND_SIGNATURE, 'Private. Curated. Considered.');
  assert.equal(
    LUXE_MAURICE_BRAND_STRAPLINE,
    'A Private Wealth & Lifestyle Platform for Mauritius',
  );
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
  assert.ok(
    src.includes('LUX_PROPERTIES_PUBLIC_COPY.emptyKicker'),
    'directory must drive copy from the audited public-copy module',
  );
  assert.ok(
    src.includes('LUX_PROPERTIES_PUBLIC_COPY.emptyBody'),
    'directory must drive empty-state body from the public-copy module',
  );
  assert.ok(
    src.includes('LUX_PROPERTIES_PUBLIC_COPY.emptyCta'),
    'directory must drive empty-state CTA from the public-copy module',
  );
  assert.ok(
    src.includes('Private Opportunities') || src.includes('Private opportunities'),
    'directory must present a "Private Opportunities" framing on its header / link copy',
  );
});

test('/property/[slug] shell reads as a private opportunity memorandum', () => {
  const src = readFile('components/LuxeMauricePropertyDetailPage.js');
  for (const anchor of [
    'Private Opportunity Memorandum',
    'Overview',
    'Lifestyle context',
    'Advisory notes',
    'At a glance',
    'Request a Private Consultation',
    'Private Advisory',
  ]) {
    assert.ok(src.includes(anchor), `property detail shell missing required anchor: ${anchor}`);
  }
});

test('/concierge surface uses Private Advisory framing and the approved CTA', () => {
  const src = readFile('pages/concierge.js');
  for (const anchor of [
    'Private Advisory',
    'Request a private consultation',
    'Request a Private Consultation',
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

/* ─── Brand fidelity — palette + typography ────────────────────────────── */

test('LuxeMaurice brand theme uses the exact four-colour brand system', () => {
  assert.equal(T.charcoal, '#111111', 'brand charcoal must be exactly #111111');
  assert.equal(T.ivory, '#F4EFE8', 'brand ivory must be exactly #F4EFE8');
  assert.equal(T.gold, '#A8842C', 'brand gold must be exactly #A8842C');
  assert.equal(T.stone, '#6B6256', 'brand stone must be exactly #6B6256');
});

test('LuxeMaurice brand theme keeps editorial layer aliases for back-compat', () => {
  // Older code (committed in PR #343) references `goldEditorial` /
  // `goldEditorialDeep` / `divider` / `dividerSoft` / `charcoalDeep` /
  // `charcoalSoft` / `ivorySoft` / `ivoryMuted`. The redesign keeps these
  // aliases so admin / editor surfaces and legacy imports continue to work
  // while the public surfaces use the named brand tokens above.
  for (const key of [
    'charcoalDeep',
    'charcoalSoft',
    'ivorySoft',
    'ivoryMuted',
    'goldEditorial',
    'goldEditorialDeep',
    'divider',
    'dividerSoft',
  ]) {
    assert.ok(
      typeof T[key] === 'string' && T[key].length > 0,
      `brand theme missing editorial alias: ${key}`,
    );
  }
});

test('LuxeMaurice brand typography stack matches Cormorant Garamond / Inter spec', () => {
  assert.ok(
    /Cormorant Garamond/.test(T.fontDisplay),
    `fontDisplay must include "Cormorant Garamond"; got: ${T.fontDisplay}`,
  );
  assert.ok(
    /\bGeorgia\b/.test(T.fontDisplay),
    `fontDisplay must include the Georgia fallback; got: ${T.fontDisplay}`,
  );
  assert.ok(
    /\bserif\b/.test(T.fontDisplay),
    `fontDisplay must end on a generic "serif" fallback; got: ${T.fontDisplay}`,
  );
  assert.ok(
    /\bInter\b/.test(T.fontBody),
    `fontBody must include "Inter"; got: ${T.fontBody}`,
  );
  assert.ok(
    /system-ui/.test(T.fontBody),
    `fontBody must include the system-ui fallback; got: ${T.fontBody}`,
  );
});

test('LuxeMaurice design-language pillars match the brand guideline', () => {
  assert.ok(Array.isArray(LUXE_MAURICE_DESIGN_PILLARS));
  assert.equal(LUXE_MAURICE_DESIGN_PILLARS.length, 4);
  const labels = LUXE_MAURICE_DESIGN_PILLARS.map((p) => p.label);
  assert.deepEqual(labels, ['Exclusive', 'Strategic', 'Private', 'Extraordinary']);
});

/* ─── Brand fidelity — wordmark + font stylesheet wired on every surface ─ */

test('all four public Lux surfaces load the Cormorant Garamond stylesheet', () => {
  for (const rel of PUBLIC_LUX_SURFACES) {
    const src = readFile(rel);
    assert.ok(
      src.includes('LuxeMauriceFontStylesheet'),
      `${rel} must import + render <LuxeMauriceFontStylesheet /> so Cormorant Garamond loads`,
    );
  }
});

test('all four public Lux surfaces use the shared brand wordmark', () => {
  for (const rel of PUBLIC_LUX_SURFACES) {
    const src = readFile(rel);
    assert.ok(
      src.includes('LuxeMauriceWordmark'),
      `${rel} must use the shared <LuxeMauriceWordmark /> so the header treatment is brand-consistent`,
    );
  }
});

test('brand primitives module exports monogram + wordmark + font stylesheet', () => {
  const src = readFile('components/LuxeMauriceBrandPrimitives.js');
  for (const name of [
    'LuxeMauriceFontStylesheet',
    'LuxeMauriceMonogram',
    'LuxeMauriceWordmark',
    'LuxEyebrow',
    'LuxHairline',
  ]) {
    assert.ok(
      src.includes(`export function ${name}`),
      `brand primitives module must export ${name}`,
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
