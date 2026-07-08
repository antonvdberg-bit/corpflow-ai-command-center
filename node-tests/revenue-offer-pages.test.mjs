import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RAPID_DELIVERY_OFFER_SLUGS,
  RAPID_DELIVERY_OFFERS,
  getRapidDeliveryOffer,
  buildDiscoveryCallMailto,
} from '../lib/public/rapid-delivery-offers.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function exists(rel) {
  return existsSync(path.join(REPO_ROOT, rel));
}

const OFFER_PAGES = RAPID_DELIVERY_OFFER_SLUGS.map((slug) => ({
  slug,
  pagePath: `pages/offers/${slug}.js`,
  publicPath: `/offers/${slug}`,
}));

const COMPONENT = read('components/RapidDeliveryOfferPage.js');
const OFFER_LIB = read('lib/public/rapid-delivery-offers.js');

const FORBIDDEN_PUBLIC_TERMS = [
  'cursor',
  'codex',
  'github',
  'supabase',
  'service_role',
  'mock',
  'fake',
  'audit',
  'recovery ticket',
  'internal',
];

const TEMPLATE_FILES = [
  'prospect-discovery-email.md',
  'discovery-call-script.md',
  'quote-email.md',
  'deposit-request.md',
  'deposit-received-manual-verification.md',
  'approval-to-proceed.md',
  'preview-feedback-request.md',
  'production-release-approval.md',
  'maintenance-offer.md',
  'client-onboarding-document-checklist.md',
];

describe('Revenue offer pages — routes exist', () => {
  for (const { slug, pagePath } of OFFER_PAGES) {
    it(`has page file for ${slug}`, () => {
      assert.equal(exists(pagePath), true, `missing ${pagePath}`);
      const src = read(pagePath);
      assert.ok(src.includes('RapidDeliveryOfferPage'), `${pagePath} must render RapidDeliveryOfferPage`);
      assert.ok(src.includes(`'${slug}'`), `${pagePath} must load offer slug ${slug}`);
    });
  }
});

describe('Revenue offer pages — required commercial copy', () => {
  for (const slug of RAPID_DELIVERY_OFFER_SLUGS) {
    const offer = getRapidDeliveryOffer(slug);
    assert.ok(offer, `offer config missing for ${slug}`);

    it(`${slug} includes price, timeline, deposit, and discovery CTA strings`, () => {
      const combined = JSON.stringify(offer) + COMPONENT + OFFER_LIB;
      assert.ok(combined.includes(String(offer.startingPriceMur)), 'starting price missing');
      assert.ok(/24–72|24-72/i.test(combined), '24-72 hour timeline language missing');
      assert.ok(/deposit/i.test(combined), 'deposit language missing');
      assert.ok(combined.includes('Request Discovery Call'), 'discovery CTA label missing');
      assert.ok(combined.includes('proofLanguage') || offer.proofLanguage.length > 20, 'proof language missing');
    });
  }
});

describe('Revenue offer pages — forbidden internal terms', () => {
  const rawSurface = OFFER_PAGES.map(({ pagePath }) => read(pagePath))
    .concat([COMPONENT, OFFER_LIB])
    .join('\n');

  /** Strip benign CSS cursor:pointer so we only catch the Cursor product name in copy. */
  const publicSurface = rawSurface
    .replace(/cursor\s*:\s*['"]?pointer['"]?/gi, '')
    .toLowerCase();

  for (const term of FORBIDDEN_PUBLIC_TERMS) {
    it(`does not expose forbidden term "${term}" on public offer surfaces`, () => {
      assert.ok(!publicSurface.includes(term.toLowerCase()), `forbidden term present: ${term}`);
    });
  }
});

describe('Revenue offer pages — CTA is mailto discovery (no payment runtime)', () => {
  it('buildDiscoveryCallMailto targets support email with subject', () => {
    const offer = getRapidDeliveryOffer('ai-lead-rescue');
    const href = buildDiscoveryCallMailto(offer);
    assert.ok(href.startsWith('mailto:support@corpflowai.com'), 'mailto must use support@corpflowai.com');
    assert.ok(href.includes('Discovery%20call%20request'), 'subject must reference discovery call');
  });

  it('component does not add fetch payment or intake runtime', () => {
    assert.ok(!COMPONENT.includes("fetch('/api/"), 'offer page must not POST to API routes');
    assert.ok(!/stripe|mpgs|checkout/i.test(COMPONENT), 'must not embed payment checkout');
  });
});

describe('Revenue template pack — files exist', () => {
  for (const file of TEMPLATE_FILES) {
    it(`has template ${file}`, () => {
      const rel = `docs/revenue/templates/${file}`;
      assert.equal(exists(rel), true, `missing ${rel}`);
      const content = read(rel);
      assert.ok(content.trim().length > 80, `${file} must be substantive`);
    });
  }
});

describe('Revenue delivery playbook — exists and states ERPNext-first', () => {
  it('playbook file exists with month-end target and ERPNext principle', () => {
    const rel = 'docs/revenue/REVENUE_DELIVERY_PLAYBOOK.md';
    assert.equal(exists(rel), true, 'missing REVENUE_DELIVERY_PLAYBOOK.md');
    const content = read(rel);
    assert.ok(content.includes('MUR 150,000–200,000'), 'month-end target missing');
    assert.ok(content.includes('ERPNext is the system of record'), 'ERPNext-first principle missing');
    assert.ok(content.includes('/offers/ai-lead-rescue'), 'first offer URL missing');
    assert.ok(content.includes('No payment runtime'), 'non-actions section missing');
  });
});

describe('Revenue offer config — three offers with MUR pricing', () => {
  it('defines exactly three slugs', () => {
    assert.equal(RAPID_DELIVERY_OFFER_SLUGS.length, 3);
  });

  it('matches expected starting prices', () => {
    assert.equal(RAPID_DELIVERY_OFFERS['ai-lead-rescue'].startingPriceMur, 35000);
    assert.equal(RAPID_DELIVERY_OFFERS['premium-landing-page-rescue'].startingPriceMur, 45000);
    assert.equal(RAPID_DELIVERY_OFFERS['customer-reputation-recovery'].startingPriceMur, 45000);
  });
});
