/**
 * Rare & Exclusive Collection — Ivory Editorial public experience audit.
 *
 * Purpose: prevent silent regression of the Ivory Editorial direction
 * (Issue #633) across lux.corpflowai.com public routes:
 * homepage, /properties, /property/[slug], /concierge.
 *
 * This is a string-level audit, not an HTTP/E2E test.
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
 * Live Lux public surfaces (Ivory Editorial).
 * LuxeMauriceTenantPresentation remains as fallback and is not the live homepage.
 */
const PUBLIC_LUX_SURFACES = [
  'components/RareExclusiveTenantPresentation.js',
  'components/LuxeMauricePropertiesDirectory.js',
  'components/LuxeMauricePropertyDetailPage.js',
  'pages/concierge.js',
  'components/RareExclusiveIvoryShell.js',
];

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
        `forbidden public copy pattern ${pat} found in ${rel}`,
      );
    }
  }
});

test('LUX_PROPERTIES_PUBLIC_COPY: forbidden-term audit guard still passes', () => {
  const r = luxPropertiesCopyAuditGuard();
  assert.equal(r.ok, true, r.ok === false ? `leaked term: ${r.term}` : '');
});

test('LUX_PROPERTIES_PUBLIC_COPY: Rare & Exclusive Private Opportunities framing', () => {
  assert.equal(
    LUX_PROPERTIES_PUBLIC_COPY.pageTitle,
    'Private Opportunities · Rare & Exclusive Collection',
  );
  assert.equal(LUX_PROPERTIES_PUBLIC_COPY.emptyKicker, 'Private opportunities');
  assert.ok(
    LUX_PROPERTIES_PUBLIC_COPY.emptyBody.includes(
      'Private opportunities are being prepared for client review.',
    ),
  );
  assert.equal(LUX_PROPERTIES_PUBLIC_COPY.emptyCta, 'Request a private consultation');
  assert.equal(LUX_PROPERTIES_PUBLIC_COPY.headerTagline, 'Invited. Not advertised.');
  assert.ok(
    !Object.values(LUX_PROPERTIES_PUBLIC_COPY).join(' ').includes('LuxeMaurice'),
    'public properties copy must not show LuxeMaurice',
  );
});

test('Ivory Editorial homepage renders approved vision anchors', () => {
  const src = readFile('components/RareExclusiveTenantPresentation.js');
  for (const anchor of [
    'Private Wealth & Lifestyle Platform',
    'This is not a property website.',
    'Mauritius as a strategic base',
    'Two buyers. One standard of care.',
    'Invited. Not advertised.',
    'Confidence at distance.',
    'Private Advisory',
    'RareExclusiveStackedWordmark',
    'RareExclusiveHeroVisual',
    'RareExclusiveIvoryHeader',
  ]) {
    assert.ok(src.includes(anchor), `homepage missing required anchor: ${anchor}`);
  }
});

test('homepage hero plate carries the brand wordmark + signature', () => {
  assert.equal(LUXE_MAURICE_BRAND_SIGNATURE, 'Private. Curated. Considered.');
  assert.equal(
    LUXE_MAURICE_BRAND_STRAPLINE,
    'A Private Wealth & Lifestyle Platform for Mauritius',
  );
});

test('homepage shell exposes Mauritius strategic-base pillars', () => {
  const src = readFile('components/RareExclusiveTenantPresentation.js');
  for (const label of ['Lifestyle', 'Security', 'Connectivity', 'Legacy', 'Opportunity']) {
    assert.ok(src.includes(`'${label}'`), `homepage missing strategic-base pillar: ${label}`);
  }
});

test('homepage shell exposes the two client journeys', () => {
  const src = readFile('components/RareExclusiveTenantPresentation.js');
  for (const title of ['Completed Residence Buyer', 'Development Partner']) {
    assert.ok(src.includes(`title: '${title}'`), `homepage missing client journey: ${title}`);
  }
});

test('/properties surface uses Ivory Editorial shell + Private Opportunities framing', () => {
  const src = readFile('components/LuxeMauricePropertiesDirectory.js');
  assert.ok(src.includes('RareExclusiveIvoryHeader'));
  assert.ok(src.includes('rareExclusivePageShellStyle'));
  assert.ok(src.includes('LUX_PROPERTIES_PUBLIC_COPY.emptyKicker'));
  assert.ok(src.includes('LUX_PROPERTIES_PUBLIC_COPY.emptyBody'));
  assert.ok(src.includes('LUX_PROPERTIES_PUBLIC_COPY.emptyCta'));
  assert.ok(
    src.includes('Private Opportunities') || src.includes('Private opportunities'),
  );
});

test('/property/[slug] shell reads as Ivory Editorial private opportunity memorandum', () => {
  const src = readFile('components/LuxeMauricePropertyDetailPage.js');
  for (const anchor of [
    'Private Opportunity Memorandum',
    'Overview',
    'Lifestyle context',
    'Advisory notes',
    'At a glance',
    'Request a Private Consultation',
    'Private Advisory',
    'RareExclusiveIvoryHeader',
    'Rare & Exclusive Collection',
  ]) {
    assert.ok(src.includes(anchor), `property detail missing required anchor: ${anchor}`);
  }
  assert.ok(!src.includes('· LuxeMaurice'), 'property detail must not show LuxeMaurice brand');
});

test('/concierge surface uses Ivory Editorial + Private Advisory framing', () => {
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
    'RareExclusiveIvoryHeader',
  ]) {
    assert.ok(src.includes(anchor), `/concierge missing required anchor: ${anchor}`);
  }
});

test('Ivory shell exposes stacked wordmark, nav, and hero visual', () => {
  const src = readFile('components/RareExclusiveIvoryShell.js');
  for (const name of [
    'RareExclusiveStackedWordmark',
    'RareExclusiveHeroVisual',
    'RareExclusiveIvoryHeader',
    'RareExclusiveIvoryFooter',
    'Properties',
    'Lifestyle',
    'Destination Mauritius',
    'Private Services',
    'Invitation Only',
  ]) {
    assert.ok(src.includes(name), `Ivory shell missing: ${name}`);
  }
});

/* ─── Brand fidelity — palette + typography ────────────────────────────── */

test('LuxeMaurice brand theme uses the exact four-colour brand system', () => {
  assert.equal(T.charcoal, '#111111');
  assert.equal(T.ivory, '#F4EFE8');
  assert.equal(T.gold, '#A8842C');
  assert.equal(T.stone, '#6B6256');
});

test('LuxeMaurice brand theme keeps editorial layer aliases for back-compat', () => {
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
    assert.ok(typeof T[key] === 'string' && T[key].length > 0, `missing alias: ${key}`);
  }
});

test('LuxeMaurice brand typography stack matches Cormorant Garamond / Inter spec', () => {
  assert.ok(/Cormorant Garamond/.test(T.fontDisplay));
  assert.ok(/\bGeorgia\b/.test(T.fontDisplay));
  assert.ok(/\bserif\b/.test(T.fontDisplay));
  assert.ok(/\bInter\b/.test(T.fontBody));
  assert.ok(/system-ui/.test(T.fontBody));
});

test('LuxeMaurice design-language pillars match the brand guideline', () => {
  assert.ok(Array.isArray(LUXE_MAURICE_DESIGN_PILLARS));
  assert.equal(LUXE_MAURICE_DESIGN_PILLARS.length, 4);
  assert.deepEqual(
    LUXE_MAURICE_DESIGN_PILLARS.map((p) => p.label),
    ['Exclusive', 'Strategic', 'Private', 'Extraordinary'],
  );
});

test('all live Lux public surfaces load Cormorant Garamond stylesheet', () => {
  for (const rel of [
    'components/RareExclusiveTenantPresentation.js',
    'components/LuxeMauricePropertiesDirectory.js',
    'components/LuxeMauricePropertyDetailPage.js',
    'pages/concierge.js',
  ]) {
    const src = readFile(rel);
    assert.ok(
      src.includes('LuxeMauriceFontStylesheet'),
      `${rel} must load Cormorant Garamond`,
    );
  }
});

test('all live Lux public surfaces use the Ivory Editorial header', () => {
  for (const rel of [
    'components/RareExclusiveTenantPresentation.js',
    'components/LuxeMauricePropertiesDirectory.js',
    'components/LuxeMauricePropertyDetailPage.js',
    'pages/concierge.js',
  ]) {
    const src = readFile(rel);
    assert.ok(
      src.includes('RareExclusiveIvoryHeader'),
      `${rel} must use RareExclusiveIvoryHeader`,
    );
  }
});

test('brand primitives module still exports monogram + wordmark + font stylesheet', () => {
  const src = readFile('components/LuxeMauriceBrandPrimitives.js');
  for (const name of [
    'LuxeMauriceFontStylesheet',
    'LuxeMauriceMonogram',
    'LuxeMauriceWordmark',
    'LuxEyebrow',
    'LuxHairline',
  ]) {
    assert.ok(src.includes(`export function ${name}`), `must export ${name}`);
  }
});

test('SSR Lux branch on / does not seed fake feed inventory on public surface', () => {
  const src = readFile('pages/index.js');
  assert.ok(/site\.feed_properties\s*=\s*\[\]/.test(src));
  assert.ok(!src.includes('import { LUXE_MAURICE_FEED_PROPERTIES }'));
  assert.ok(
    src.includes('RareExclusiveTenantPresentation'),
    'index must route lux_acquisition to RareExclusiveTenantPresentation',
  );
});

test('demo property route remains blocked in property slug SSR', () => {
  const src = readFile('pages/property/[slug].js');
  assert.ok(src.includes('isLuxStagedDemoSlug'));
  assert.ok(src.includes('return { notFound: true }'));
});
