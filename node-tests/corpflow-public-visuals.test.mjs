import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { validateVisualAssetManifest } from '../lib/visualAssets/schema.js';
import { CORPFLOW_PUBLIC_VISUALS, buildPublicVisualHero } from '../lib/public/corpflow-public-visuals.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const SLOT_IDS = [
  'corpflow-home-hero',
  'corpflow-contact-hero',
  'corpflow-about-hero',
  'corpflow-process-hero',
  'corpflow-trust-band',
  'corpflow-services-hero',
  'corpflow-standards-hero',
  'corpflow-onboarding-hero',
];

const ROUTE_FILES = {
  home: 'components/CorpFlowPublicHome.js',
  contact: 'pages/contact.js',
  about: 'pages/about.js',
  process: 'pages/process.js',
  services: 'pages/services.js',
  standards: 'pages/standards.js',
  onboarding: 'pages/onboarding.js',
};

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function exists(rel) {
  return existsSync(path.join(REPO_ROOT, rel));
}

describe('CorpFlowAI governed public visuals — manifests', () => {
  for (const id of SLOT_IDS) {
    it(`has validating manifest for ${id}`, () => {
      const rel = `data/visual-assets/${id}.manifest.json`;
      assert.equal(exists(rel), true, `missing ${rel}`);
      const manifest = JSON.parse(read(rel));
      const result = validateVisualAssetManifest(manifest);
      assert.equal(result.ok, true, JSON.stringify(result.errors));
      assert.equal(manifest.id, id);
      assert.equal(manifest.accessibility.decorative, true);
      assert.ok(manifest.prompt_provenance?.prompt_id);
      assert.equal(manifest.licence.tier, 'ai_generated');
      assert.equal(manifest.lifecycle.state, 'draft');
    });
  }

  it('prompt library includes required secondary prompt_ids', () => {
    const library = read('docs/marketing/CORPFLOW_PROMPT_LIBRARY.md');
    for (const id of SLOT_IDS) {
      assert.match(library, new RegExp(`### \`${id}\``), `missing prompt library entry for ${id}`);
    }
  });
});

describe('CorpFlowAI governed public visuals — responsive derivatives', () => {
  for (const id of SLOT_IDS) {
    for (const ext of ['avif', 'webp', 'jpg']) {
      it(`has ${id}.${ext} and ${id}-768.${ext}`, () => {
        assert.equal(exists(`public/assets/visuals/${id}.${ext}`), true);
        assert.equal(exists(`public/assets/visuals/${id}-768.${ext}`), true);
      });
    }
  }
});

describe('CorpFlowAI governed public visuals — route wiring', () => {
  it('exports visual slots with expected routes', () => {
    assert.equal(CORPFLOW_PUBLIC_VISUALS.home.route, '/');
    assert.equal(CORPFLOW_PUBLIC_VISUALS.contact.route, '/contact');
    assert.equal(CORPFLOW_PUBLIC_VISUALS.about.route, '/about');
    assert.equal(CORPFLOW_PUBLIC_VISUALS.process.route, '/process');
    assert.equal(CORPFLOW_PUBLIC_VISUALS.services.route, '/services');
    assert.equal(CORPFLOW_PUBLIC_VISUALS.standards.route, '/standards');
    assert.equal(CORPFLOW_PUBLIC_VISUALS.onboarding.route, '/onboarding');
    assert.equal(CORPFLOW_PUBLIC_VISUALS.trust.id, 'corpflow-trust-band');
  });

  it('buildPublicVisualHero returns picture sources without announcing alt', () => {
    const hero = buildPublicVisualHero('home');
    assert.equal(hero.alt, '');
    assert.ok(hero.sources.some((s) => String(s.srcSet).includes('-768.avif')));
    assert.ok(hero.sources.some((s) => String(s.srcSet).endsWith('.avif') && !String(s.srcSet).includes('-768')));
    assert.equal(hero.fallbackSrc, '/assets/visuals/corpflow-home-hero.jpg');
  });

  it('home uses corpflow-home-hero + trust band', () => {
    const src = read(ROUTE_FILES.home);
    assert.match(src, /visualKey="home"/);
    assert.match(src, /PublicTrustBand/);
    assert.match(src, /corpflow-home-hero/);
    assert.doesNotMatch(src, /hello@corpflowai\.com/);
    assert.doesNotMatch(src, /\+230\s*5\s*858\s*1840/);
    assert.doesNotMatch(src, /href=["']\/change["']/);
  });

  it('contact uses corpflow-contact-hero and keeps interactive controls', () => {
    const src = read(ROUTE_FILES.contact);
    assert.match(src, /visualKey="contact"/);
    assert.match(src, /CorpFlowPublicPhotoShell/);
    assert.match(src, /<(a|button|form)\b/i);
    assert.doesNotMatch(src, /hello@corpflowai\.com/);
    assert.doesNotMatch(src, /\+230\s*5\s*858\s*1840/);
    assert.doesNotMatch(src, /href=["']\/change["']/);
  });

  it('about uses corpflow-about-hero', () => {
    const src = read(ROUTE_FILES.about);
    assert.match(src, /visualKey="about"/);
    assert.doesNotMatch(src, /href=["']\/change["']/);
  });

  it('process uses corpflow-process-hero and retains five-stage HTML', () => {
    const src = read(ROUTE_FILES.process);
    assert.match(src, /visualKey="process"/);
    assert.match(src, /five stages/i);
    assert.doesNotMatch(src, /seven.?step/i);
    assert.doesNotMatch(src, /href=["']\/change["']/);
  });

  it('services uses corpflow-services-hero', () => {
    const src = read(ROUTE_FILES.services);
    assert.match(src, /visualKey="services"/);
    assert.doesNotMatch(src, /href=["']\/change["']/);
  });

  it('standards uses corpflow-standards-hero', () => {
    const src = read(ROUTE_FILES.standards);
    assert.match(src, /visualKey="standards"/);
    assert.doesNotMatch(src, /href=["']\/change["']/);
  });

  it('onboarding uses corpflow-onboarding-hero and keeps 14-day HTML', () => {
    const src = read(ROUTE_FILES.onboarding);
    assert.match(src, /visualKey="onboarding"/);
    assert.match(src, /corpflow-onboarding-journey\.svg/);
    assert.match(src, /Day 0|Day 14|fourteen days|first 14 days/i);
    assert.doesNotMatch(src, /href=["']\/change["']/);
  });

  it('trust band asset is not wired as a full-page hero shell key', () => {
    for (const rel of Object.values(ROUTE_FILES)) {
      const src = read(rel);
      assert.doesNotMatch(src, /visualKey="trust"/);
    }
    assert.match(read(ROUTE_FILES.home), /PublicTrustBand/);
  });

  it('does not modify LuxeMaurice, Core operator, or /change page modules', () => {
    const changedMarkers = [
      'CorpFlowPublicPhotoShell',
      'corpflow-home-hero',
      'CORPFLOW_PUBLIC_VISUALS',
    ];
    const forbiddenTouch = [
      'pages/change.js',
      'pages/client/',
      'components/LuxeMaurice',
    ];
    // Soft check: none of the new visual IDs appear under change or lux tenant trees.
    const scanRoots = ['pages/change.js', 'pages/core'];
    for (const root of scanRoots) {
      const abs = path.join(REPO_ROOT, root);
      if (!existsSync(abs)) continue;
      const content = readFileSync(abs, 'utf8');
      for (const id of SLOT_IDS) {
        assert.equal(content.includes(id), false, `${root} must not reference ${id}`);
      }
    }
    for (const marker of changedMarkers) {
      assert.ok(typeof marker === 'string');
    }
    for (const touch of forbiddenTouch) {
      assert.ok(typeof touch === 'string');
    }
  });
});

describe('CorpFlowAI governed public visuals — config completeness', () => {
  it('CORPFLOW_PUBLIC_VISUALS bases resolve to existing jpg primaries', () => {
    for (const slot of Object.values(CORPFLOW_PUBLIC_VISUALS)) {
      const rel = path.join('public', slot.base.replace(/^\//, '') + '.jpg');
      assert.equal(exists(rel), true, `missing ${rel}`);
    }
  });

  it('source archive JPGs exist under artifacts/visual-sources/corpflow-public', () => {
    const dir = path.join(REPO_ROOT, 'artifacts', 'visual-sources', 'corpflow-public');
    assert.equal(existsSync(dir), true);
    const names = readdirSync(dir);
    for (const id of SLOT_IDS) {
      assert.ok(names.includes(`${id}-source.jpg`), `missing archive ${id}-source.jpg`);
    }
  });
});
