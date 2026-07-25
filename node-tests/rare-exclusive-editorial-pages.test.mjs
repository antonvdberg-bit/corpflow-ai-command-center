/**
 * Rare & Exclusive editorial content pages — About, Contact, Lifestyle,
 * Destination Mauritius, Private Services.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RARE_EXCLUSIVE_PAGE_CONTENT,
  getRareExclusivePageContent,
  listRareExclusiveContentPaths,
  rareExclusivePageContentAuditGuard,
} from '../lib/client/rare-exclusive-page-content.js';
import { luxOnlyPageProps, luxOrApexPageProps } from '../lib/client/lux-host-page-props.js';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function readFile(rel) {
  return fs.readFileSync(path.join(repoRoot, rel), 'utf8');
}

test('editorial page content covers all nav content routes', () => {
  const paths = listRareExclusiveContentPaths();
  assert.deepEqual(paths.sort(), [
    '/about',
    '/contact',
    '/destination-mauritius',
    '/lifestyle',
    '/private-services',
  ]);
  for (const id of ['about', 'contact', 'lifestyle', 'destination', 'services']) {
    const page = getRareExclusivePageContent(id);
    assert.ok(page, `missing page ${id}`);
    assert.ok(page.sections.length >= 3, `${id} needs substantive sections`);
    assert.ok(page.ctaHref.includes('/concierge') || page.ctaHref.startsWith('/'), `${id} CTA`);
  }
});

test('editorial page content audit guard passes (no portal / feed language)', () => {
  const r = rareExclusivePageContentAuditGuard();
  assert.equal(r.ok, true, r.ok === false ? `leaked term: ${r.term}` : '');
});

test('about + contact pages are host-aware (Lux vs CorpFlow)', () => {
  for (const rel of ['pages/about.js', 'pages/contact.js']) {
    const src = readFile(rel);
    assert.ok(src.includes('RareExclusiveContentPage'));
    assert.ok(src.includes('luxOrApexPageProps'));
    assert.ok(src.includes('luxMode'));
    assert.ok(src.includes('getServerSideProps'));
  }
});

test('Lux-only content routes exist for lifestyle / destination / private-services', () => {
  for (const rel of [
    'pages/lifestyle.js',
    'pages/destination-mauritius.js',
    'pages/private-services.js',
  ]) {
    const src = readFile(rel);
    assert.ok(src.includes('RareExclusiveContentPage'));
    assert.ok(src.includes('luxOnlyPageProps'));
  }
});

test('luxOnlyPageProps 404s on apex; luxOrApexPageProps flips luxMode', () => {
  const apexReq = { headers: { host: 'corpflowai.com' } };
  const luxReq = { headers: { host: 'lux.corpflowai.com' } };
  assert.deepEqual(luxOnlyPageProps(apexReq), { notFound: true });
  assert.deepEqual(luxOnlyPageProps(luxReq), {
    props: { seoHost: 'lux.corpflowai.com' },
  });
  assert.equal(luxOrApexPageProps(apexReq).props.luxMode, false);
  assert.equal(luxOrApexPageProps(luxReq).props.luxMode, true);
});

test('content page shell uses Ivory Editorial primitives', () => {
  const src = readFile('components/RareExclusiveContentPage.js');
  for (const name of [
    'RareExclusiveIvoryHeader',
    'RareExclusiveEditorialSpine',
    'RareExclusiveInteriorHero',
    'RareExclusivePromiseGrid',
    'RARE_EXCLUSIVE_AVAILABILITY_DISCLAIMER',
    'getRareExclusivePageContent',
  ]) {
    assert.ok(src.includes(name), `content page missing ${name}`);
  }
});

test('about copy frames invitation-only private platform (placeholder-ready)', () => {
  const about = RARE_EXCLUSIVE_PAGE_CONTENT.about;
  assert.ok(about.title.toLowerCase().includes('not a property website'));
  assert.ok(about.lead.includes('Rare & Exclusive Collection'));
  assert.ok(about.sections.some((s) => s.heading === 'Editorial note'));
});
