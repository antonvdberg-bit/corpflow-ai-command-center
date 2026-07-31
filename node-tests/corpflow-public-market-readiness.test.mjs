import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RAPID_DELIVERY_OFFER_SLUGS,
  RAPID_DELIVERY_OFFERS,
} from '../lib/public/rapid-delivery-offers.js';
import {
  CORPflow_HOMEPAGE_HERO,
  listPublicOffers,
  buildPublicPageMeta,
} from '../lib/public/corpflow-public-market.js';
import { __testing__ as sitemapTesting } from '../pages/sitemap.xml.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function exists(rel) {
  return existsSync(path.join(REPO_ROOT, rel));
}

const PRIORITY_ROUTES = [
  'pages/index.js',
  'pages/contact.js',
  'pages/offers/ai-lead-rescue.js',
  'pages/offers/premium-landing-page-rescue.js',
  'pages/offers/customer-reputation-recovery.js',
  'components/CorpFlowPublicHome.js',
  'components/RapidDeliveryOfferPage.js',
  'components/public/CorpFlowPublicShell.js',
  'components/public/CorpFlowPublicHeader.js',
  'components/public/CorpFlowPublicFooter.js',
];

/** Marketing components only — excludes pages/index.js (tenant host router imports Lux internals). */
const MARKETING_SURFACE_ROUTES = PRIORITY_ROUTES.filter((p) => p !== 'pages/index.js');

const PUBLIC_SURFACE = MARKETING_SURFACE_ROUTES.map(read).join('\n');

const FORBIDDEN_PUBLIC_TERMS = [
  'service_role',
  'CORPFLOW_CRON_SECRET',
  'POSTGRES_URL',
  'github.com/antonvdberg',
  'luxe-maurice gold',
  'LuxeMauriceTenantPresentation',
];

const VALID_INTERNAL_HREFS = [
  '/',
  '/contact',
  '/offers/ai-lead-rescue',
  '/offers/premium-landing-page-rescue',
  '/offers/customer-reputation-recovery',
  '/lead-rescue',
  '/privacy',
  '/terms',
  '/about',
  '/process',
  '#offers',
  '/client/luxe-maurice-ai',
];

describe('CorpFlow public market readiness — route files exist', () => {
  for (const rel of PRIORITY_ROUTES) {
    it(`has ${rel}`, () => {
      assert.equal(exists(rel), true, `missing ${rel}`);
    });
  }

  for (const rel of [
    'docs/revenue/CORPFLOWAI_PUBLIC_MARKET_ROUTE_REGISTER.md',
    'docs/revenue/CORPFLOWAI_PUBLIC_CTA_AND_INTAKE_MAP.md',
    'docs/revenue/CORPFLOWAI_MARKET_LAUNCH_READINESS.md',
  ]) {
    it(`has register doc ${rel}`, () => {
      assert.equal(exists(rel), true);
      assert.ok(read(rel).length > 200);
    });
  }
});

describe('CorpFlow public market readiness — shared shell on priority pages', () => {
  it('homepage uses public photo shell and commercial hero', () => {
    const home = read('components/CorpFlowPublicHome.js');
    assert.ok(home.includes('CorpFlowPublicPhotoShell') || home.includes('CorpFlowPublicShell'));
    assert.ok(home.includes('MARKET_SERVICE_PATHS') || home.includes('service-paths'));
    assert.ok(home.includes('CORPflow_HOMEPAGE_HERO'));
    assert.ok(home.includes('PublicHero'));
  });

  it('offer page uses shared public header and footer', () => {
    const offer = read('components/RapidDeliveryOfferPage.js');
    assert.ok(offer.includes('CorpFlowPublicHeader'));
    assert.ok(offer.includes('CorpFlowPublicFooter'));
    assert.ok(offer.includes('Frequently asked questions'));
    assert.ok(offer.includes('What is not included'));
  });

  it('contact page has discovery form and offer links', () => {
    const contact = read('pages/contact.js');
    assert.ok(contact.includes('DiscoveryIntakeForm'));
    assert.ok(contact.includes('id="discovery"'));
    assert.ok(contact.includes('buildGeneralDiscoveryMailto'));
    assert.ok(contact.includes('/offers/ai-lead-rescue'));
  });

  it('policy layout uses shared header and footer', () => {
    const layout = read('components/PublicPolicyLayout.js');
    assert.ok(layout.includes('CorpFlowPublicHeader'));
    assert.ok(layout.includes('CorpFlowPublicFooter'));
  });
});

describe('CorpFlow public market readiness — three offer prices', () => {
  it('lists three offers with expected MUR starting prices', () => {
    const offers = listPublicOffers();
    assert.equal(offers.length, 3);
    assert.equal(RAPID_DELIVERY_OFFERS['ai-lead-rescue'].startingPriceMur, 35000);
    assert.equal(RAPID_DELIVERY_OFFERS['premium-landing-page-rescue'].startingPriceMur, 45000);
    assert.equal(RAPID_DELIVERY_OFFERS['customer-reputation-recovery'].startingPriceMur, 45000);
  });

  for (const slug of RAPID_DELIVERY_OFFER_SLUGS) {
    it(`${slug} page renders RapidDeliveryOfferPage`, () => {
      const src = read(`pages/offers/${slug}.js`);
      assert.ok(src.includes('RapidDeliveryOfferPage'));
    });
  }
});

describe('CorpFlow public market readiness — CTA destinations', () => {
  it('homepage primary CTA targets discovery form', () => {
    assert.equal(CORPflow_HOMEPAGE_HERO.primaryCta.href, '/contact#discovery');
  });

  it('public surfaces do not link primary flows to /change', () => {
    const stripped = PUBLIC_SURFACE.replace(/\/change\/revenue/g, '');
    assert.ok(!stripped.includes('href="/change"'), 'must not link to /change');
    assert.ok(!stripped.includes("href='/change'"), 'must not link to /change');
  });

  it('offer pages use structured discovery form, not payment APIs', () => {
    const offer = read('components/RapidDeliveryOfferPage.js');
    assert.ok(offer.includes('DiscoveryIntakeForm'));
    assert.ok(offer.includes('id="discovery"'));
    assert.ok(offer.includes('buildDiscoveryCallMailto'));
    assert.ok(!offer.includes("fetch('/api/"));
    assert.ok(!/stripe|mpgs|checkout/i.test(offer));
    const form = read('components/public/DiscoveryIntakeForm.js');
    assert.ok(form.includes("fetch('/api/tenant/intake'"));
  });
});

describe('CorpFlow public market readiness — metadata', () => {
  it('buildPublicPageMeta includes canonical and og fields', () => {
    const meta = buildPublicPageMeta({
      title: 'Test',
      description: 'Desc',
      path: '/contact',
    });
    assert.ok(meta.canonical.includes('corpflowai.com/contact'));
    assert.ok(meta.ogImage.includes('corpflowai.com'));
    assert.equal(meta.twitterCard, 'summary_large_image');
  });

  it('homepage meta description is outcome-led', () => {
    const home = read('components/CorpFlowPublicHome.js');
    assert.ok(home.includes('buildPublicPageMeta'));
    assert.ok(
      home.includes('managed AI-assisted') ||
        home.includes('workflow systems') ||
        home.includes('qualified conversation'),
    );
  });
});

describe('CorpFlow public market readiness — trust links and mobile nav', () => {
  it('public footer links privacy and terms', () => {
    const footer = read('components/public/CorpFlowPublicFooter.js');
    assert.ok(footer.includes('/privacy'));
    assert.ok(footer.includes('/terms'));
    assert.ok(footer.includes('/contact'));
  });

  it('header has mobile menu control', () => {
    const header = read('components/public/CorpFlowPublicHeader.js');
    assert.ok(header.includes('cf-nav-menu-btn'));
    assert.ok(header.includes('aria-expanded'));
  });
});

describe('CorpFlow public market readiness — no Lux tenant branding on public shell', () => {
  it('public shell components do not import LuxeMaurice presentation', () => {
    for (const rel of [
      'components/CorpFlowPublicHome.js',
      'components/public/CorpFlowPublicShell.js',
      'components/public/CorpFlowPublicHeader.js',
    ]) {
      const src = read(rel);
      assert.ok(!src.includes('LuxeMauriceTenantPresentation'));
      assert.ok(!src.includes('lux-change-console-theme'));
    }
  });
});

describe('CorpFlow public market readiness — sitemap includes offers', () => {
  it('APEX_PATHS lists three offer routes', () => {
    for (const slug of RAPID_DELIVERY_OFFER_SLUGS) {
      assert.ok(sitemapTesting.APEX_PATHS.includes(`/offers/${slug}`), `missing /offers/${slug}`);
    }
  });
});

describe('CorpFlow public market readiness — forbidden terms', () => {
  const surface = PUBLIC_SURFACE.toLowerCase();
  for (const term of FORBIDDEN_PUBLIC_TERMS) {
    it(`does not expose "${term}" on priority public surfaces`, () => {
      assert.ok(!surface.includes(term.toLowerCase()), `forbidden: ${term}`);
    });
  }
});
