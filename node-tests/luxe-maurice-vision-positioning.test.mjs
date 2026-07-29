/**
 * Rare & Exclusive Collection — Concept A Ivory Editorial public experience audit.
 *
 * Purpose: prevent silent regression of the approved Concept A visual direction
 * (Issue #633) across lux.corpflowai.com public routes.
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

const PUBLIC_LUX_SURFACES = [
  'components/RareExclusiveTenantPresentation.js',
  'components/LuxeMauricePropertiesDirectory.js',
  'components/LuxeMauricePropertyDetailPage.js',
  'components/RareExclusiveContentPage.js',
  'pages/concierge.js',
  'components/RareExclusiveIvoryShell.js',
  'components/RareExclusiveBrandMarks.js',
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
      assert.ok(!pat.test(src), `forbidden ${pat} in ${rel}`);
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
  assert.equal(LUX_PROPERTIES_PUBLIC_COPY.listKicker, 'Curated opportunities');
  assert.ok(LUX_PROPERTIES_PUBLIC_COPY.listSubtitle.toLowerCase().includes('invitation'));
  assert.ok(!Object.values(LUX_PROPERTIES_PUBLIC_COPY).join(' ').includes('LuxeMaurice'));
});

test('Concept A homepage renders approved Ivory Editorial anchors', () => {
  const src = readFile('components/RareExclusiveTenantPresentation.js');
  for (const anchor of [
    'RareExclusiveFullLockup',
    'RareExclusiveHeroVisual',
    'RareExclusiveIvoryHeader',
    'RareExclusiveFeatureBar',
    'RareExclusiveEditorialSpine',
    'RareExclusiveEnquirySteps',
    'RARE_EXCLUSIVE_STRAPLINE',
    'RARE_EXCLUSIVE_SUPPORTING_LINE',
    'Private Access',
    'View the collection',
    'Access Beyond the Market',
    'Life. Elevated. Always.',
    'Private Opportunities',
    'Owner Experience',
    'This is not a property website.',
    'About the collection',
    'Private-access buyer journey',
    'Curated opportunities',
    'Request private access',
    'monogramSize={150}',
    'monogramBreathingPx={12}',
    'minmax(0, 0.87fr) minmax(0, 1.13fr)',
    '/lifestyle',
    '/destination-mauritius',
    '/private-services',
    '/about',
    '/contact',
  ]) {
    assert.ok(src.includes(anchor), `homepage missing: ${anchor}`);
  }
  assert.ok(
    src.includes('Private curator of the world’s rarest residences') ||
      src.includes('RARE_EXCLUSIVE_STRAPLINE'),
  );
  assert.ok(!src.includes('Discover Our Collection'));
  assert.ok(!src.includes('Request an Invitation'));
  assert.ok(!src.includes('property portal'));
  assert.ok(!src.includes('Explore Properties'));
  // Issue #651 Jan refine — language options deferred; no selector in this slice
  assert.ok(!src.includes('EN | FR'));
  assert.ok(!src.includes('language selector'));
  assert.ok(!src.includes('multilingual'));
});

test('brand signature + strapline constants remain stable', () => {
  assert.equal(LUXE_MAURICE_BRAND_SIGNATURE, 'Private. Curated. Considered.');
  assert.equal(
    LUXE_MAURICE_BRAND_STRAPLINE,
    'A Private Wealth & Lifestyle Platform for Mauritius',
  );
});

test('Ivory shell implements Jan-approved brand marks, nav, feature pillars, privilege quote', () => {
  const src = readFile('components/RareExclusiveIvoryShell.js');
  for (const name of [
    'RareExclusiveMonogram',
    'RareExclusiveHorizontalWordmark',
    'RareExclusiveFullLockup',
    'RareExclusiveCrest',
    'RareExclusiveStackedWordmark',
    'RareExclusiveHeroVisual',
    'RareExclusiveFeatureBar',
    'RareExclusiveLifestylePanel',
    'RareExclusiveEditorialSpine',
    'RareExclusiveOpaquePanel',
    'RareExclusiveEnquirySteps',
    'RareExclusivePromiseGrid',
    'RARE_EXCLUSIVE_EDITORIAL_MAX',
    'Collection',
    'Private Client',
    'Developments',
    'Journal',
    'Private Access',
    "href: '/lifestyle'",
    "href: '/destination-mauritius'",
    "href: '/private-services'",
    "href: '/about'",
    "href: '/contact'",
    'Curated Properties',
    'Discretion & Privacy',
    'Owner Concierge',
    'Mauritius Expertise',
    'Not just properties. A privilege.',
    'Private curator of the world’s rarest residences.',
  ]) {
    assert.ok(src.includes(name), `Ivory shell missing: ${name}`);
  }
  // Incorrect prior crown/shield crest geometry must not return.
  assert.ok(!src.includes('M18 16 L24 22 L32 12 L40 22 L46 16'));
  assert.ok(!src.includes("{'R&E'}"));
});

test('Jan-approved logo primitives expose fullLockup, horizontalWordmark, monogram', () => {
  const src = readFile('components/RareExclusiveBrandMarks.js');
  for (const name of [
    'export function RareExclusiveFullLockup',
    'export function RareExclusiveHorizontalWordmark',
    'export function RareExclusiveMonogram',
    'fullLockup',
    'horizontalWordmark',
    'monogram',
    'Rare by nature. Exclusive by design.',
    'Collection',
  ]) {
    assert.ok(src.includes(name), `brand marks missing: ${name}`);
  }
});

test('/properties surface uses Ivory Editorial shell + curated opportunities framing', () => {
  const src = readFile('components/LuxeMauricePropertiesDirectory.js');
  assert.ok(src.includes('RareExclusiveIvoryHeader'));
  assert.ok(src.includes('RareExclusiveEditorialSpine'));
  assert.ok(src.includes('RareExclusiveInteriorHero'));
  assert.ok(src.includes('rareExclusivePageShellStyle'));
  assert.ok(src.includes('LUX_PROPERTIES_PUBLIC_COPY.emptyKicker'));
  assert.ok(src.includes('LUX_PROPERTIES_PUBLIC_COPY.emptyBody'));
  assert.ok(src.includes('LUX_PROPERTIES_PUBLIC_COPY.emptyCta'));
  assert.ok(src.includes('MetaChip') || src.includes('region_label'));
  assert.ok(src.includes('Invited. Not advertised.') || src.includes('headerTagline'));
});

test('/property/[slug] shell reads as Ivory Editorial private opportunity memorandum', () => {
  const src = readFile('components/LuxeMauricePropertyDetailPage.js');
  for (const anchor of [
    'Private Opportunity Memorandum',
    'Overview',
    'Lifestyle context',
    'Advisory notes',
    'At a glance',
    'Request private access',
    'controlled advisory review',
    'Private Access',
    'RareExclusiveIvoryHeader',
    'RareExclusiveEditorialSpine',
    'RARE_EXCLUSIVE_AVAILABILITY_DISCLAIMER',
    'Rare & Exclusive Collection',
  ]) {
    assert.ok(src.includes(anchor), `property detail missing: ${anchor}`);
  }
  assert.ok(!src.includes('· LuxeMaurice'));
});

test('/concierge surface uses Ivory Editorial + private advisory journey', () => {
  const src = readFile('pages/concierge.js');
  for (const anchor of [
    'Private Advisory',
    'Request a private consultation',
    'Request Private Access',
    'RareExclusiveEnquirySteps',
    'RareExclusivePromiseGrid',
    'RareExclusiveInteriorHero',
    'RareExclusiveEditorialSpine',
    'Completed residence',
    'Development partnership',
    'Relocation to Mauritius',
    'Investment / diversification',
    'Ongoing ownership support',
    'RareExclusiveIvoryHeader',
    'controlled operator-review',
    'Email',
    'Telephone',
    'type: \'email\'',
    'type: \'tel\'',
    'emailLooksValid',
    'phoneLooksValid',
    'aria-required',
  ]) {
    assert.ok(src.includes(anchor), `/concierge missing: ${anchor}`);
  }
  assert.ok(!src.includes('Email or telephone'));
  assert.ok(!src.includes('Preferred contact'));
});

test('/concierge post-submit confirmation replaces the form', () => {
  const src = readFile('pages/concierge.js');
  for (const anchor of [
    'CONCIERGE_SUCCESS_MESSAGE',
    'CONCIERGE_SUCCESS_NEXT_STEP',
    'Private access request confirmed.',
    'Your request is now queued for private advisory review.',
    'Submit another request',
    'data-concierge-confirmation',
    'resetForAnotherRequest',
    'submitted || !canSubmit || busy',
  ]) {
    assert.ok(src.includes(anchor), `concierge confirmation missing: ${anchor}`);
  }
  assert.ok(
    src.includes(
      'Thank you. Your request has been received for private advisory review. A qualified advisor will select suitable next information and follow up within one business day.',
    ),
  );
});

test('Ivory enquiry steps encode Jan-approved controlled review path', () => {
  const src = readFile('components/RareExclusiveIvoryShell.js');
  for (const anchor of [
    'Request received',
    'Request qualified',
    'Suitable information selected',
    'Controlled follow-up',
  ]) {
    assert.ok(src.includes(anchor), `enquiry steps missing: ${anchor}`);
  }
  assert.ok(src.includes("gridTemplateColumns: 'repeat(4, minmax(0, 1fr))'"));
});

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
    assert.ok(readFile(rel).includes('LuxeMauriceFontStylesheet'), `${rel} missing font load`);
  }
});

test('all live Lux public surfaces use the Ivory Editorial header', () => {
  for (const rel of [
    'components/RareExclusiveTenantPresentation.js',
    'components/LuxeMauricePropertiesDirectory.js',
    'components/LuxeMauricePropertyDetailPage.js',
    'pages/concierge.js',
  ]) {
    assert.ok(readFile(rel).includes('RareExclusiveIvoryHeader'), `${rel} missing header`);
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
  assert.ok(src.includes('RareExclusiveFullLockup'));
  assert.ok(src.includes('RareExclusiveHorizontalWordmark'));
  assert.ok(src.includes('RareExclusiveMonogram'));
  assert.ok(src.includes('/assets/logos/rare-exclusive-monogram.svg'));
});

test('SSR Lux branch on / routes to RareExclusiveTenantPresentation', () => {
  const src = readFile('pages/index.js');
  assert.ok(/site\.feed_properties\s*=\s*\[\]/.test(src));
  assert.ok(!src.includes('import { LUXE_MAURICE_FEED_PROPERTIES }'));
  assert.ok(src.includes('RareExclusiveTenantPresentation'));
});

test('demo property route remains blocked in property slug SSR', () => {
  const src = readFile('pages/property/[slug].js');
  assert.ok(src.includes('isLuxStagedDemoSlug'));
  assert.ok(src.includes('return { notFound: true }'));
});
