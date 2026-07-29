import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { getRapidDeliveryOffer } from '../lib/public/rapid-delivery-offers.js';
import { OFFER_FAQ_BY_SLUG, OFFER_NOT_INCLUDED_BY_SLUG } from '../lib/public/corpflow-public-market.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function exists(rel) {
  return existsSync(path.join(REPO_ROOT, rel));
}

const DOC_FILES = [
  'docs/marketing/WEBSITE_RESCUE_PRODUCT_PACK_V1.md',
  'docs/marketing/WEBSITE_RESCUE_QUOTE_READY_PACKET_V1.md',
  'docs/marketing/WEBSITE_RESCUE_DEMONSTRATION_PATH_V1.md',
  'docs/sales/WEBSITE_RESCUE_PRICING_GUIDE.md',
  'docs/operations/WEBSITE_RESCUE_DELIVERY_CHECKLISTS_V1.md',
];

describe('Website Rescue sellable slice — docs pack', () => {
  for (const rel of DOC_FILES) {
    it(`has substantive ${rel}`, () => {
      assert.equal(exists(rel), true, `missing ${rel}`);
      const content = read(rel);
      assert.ok(content.length > 400, `${rel} too short`);
      assert.ok(content.includes('#654') || content.includes('654'), `${rel} must reference issue 654`);
    });
  }

  it('quote-ready packet has sentinel and Anton pricing gate', () => {
    const content = read('docs/marketing/WEBSITE_RESCUE_QUOTE_READY_PACKET_V1.md');
    assert.ok(content.includes('<!-- WEBSITE_RESCUE_QUOTE_READY_PACKET_V1 -->'));
    assert.ok(content.includes('MUR 45,000'));
    assert.ok(/Anton/i.test(content));
    assert.ok(content.includes('/demo/website-rescue'));
    assert.ok(!/Carol/i.test(content), 'must not expose private client name');
  });

  it('delivery checklists cover novice design-choice process', () => {
    const content = read('docs/operations/WEBSITE_RESCUE_DELIVERY_CHECKLISTS_V1.md');
    assert.ok(content.includes('<!-- WEBSITE_RESCUE_DELIVERY_CHECKLISTS_V1 -->'));
    assert.ok(content.includes('Design-choice process'));
    assert.ok(content.includes('guided options'));
    assert.ok(content.includes('Acceptance'));
  });

  it('pricing guide keeps T2/T3 off public page until W6', () => {
    const content = read('docs/sales/WEBSITE_RESCUE_PRICING_GUIDE.md');
    assert.ok(content.includes('<!-- WEBSITE_RESCUE_PRICING_GUIDE_V1 -->'));
    assert.ok(content.includes('W6'));
    assert.ok(content.includes('55,000'));
  });
});

describe('Website Rescue sellable slice — public surfaces', () => {
  it('offer config includes demo path and before/after for landing rescue', () => {
    const offer = getRapidDeliveryOffer('premium-landing-page-rescue');
    assert.ok(offer);
    assert.equal(offer.demoPath, '/demo/website-rescue');
    assert.ok(Array.isArray(offer.beforeAfter?.before));
    assert.ok(Array.isArray(offer.beforeAfter?.after));
    assert.equal(offer.startingPriceMur, 45000);
  });

  it('demo page and component exist with noindex and fictional framing', () => {
    assert.equal(exists('pages/demo/website-rescue.js'), true);
    assert.equal(exists('components/WebsiteRescueDemo.js'), true);
    const page = read('pages/demo/website-rescue.js');
    const demo = read('components/WebsiteRescueDemo.js');
    assert.ok(page.includes('WebsiteRescueDemo'));
    assert.ok(demo.includes('noindex'));
    assert.ok(demo.includes('Harbour Hospitality Supplies'));
    assert.ok(demo.includes('data-website-rescue-demo'));
    assert.ok(demo.includes('DiscoveryIntakeForm'));
    assert.ok(demo.includes('premium-landing-page-rescue'));
    assert.ok(!/Carol/i.test(demo));
    assert.ok(!/password|secret|api[_-]?key/i.test(demo));
  });

  it('offer page renders before/after and demo link when configured', () => {
    const component = read('components/RapidDeliveryOfferPage.js');
    assert.ok(component.includes('offer.beforeAfter'));
    assert.ok(component.includes('offer.demoPath'));
    assert.ok(component.includes('Open the fictional before/after demo'));
  });

  it('landing rescue FAQ covers novice brief and no SEO/revenue guarantees', () => {
    const faq = OFFER_FAQ_BY_SLUG['premium-landing-page-rescue'] || [];
    assert.ok(faq.length >= 5, 'FAQ should be expanded for Website Rescue slice');
    const blob = JSON.stringify(faq).toLowerCase();
    assert.ok(blob.includes('designer') || blob.includes('brief') || blob.includes('guided'));
    assert.ok(blob.includes('seo') || blob.includes('revenue'));
    assert.ok(blob.includes('no'));
  });

  it('not-included list states SEO/revenue guarantees and Lead Rescue separation', () => {
    const list = OFFER_NOT_INCLUDED_BY_SLUG['premium-landing-page-rescue'] || [];
    const blob = list.join(' ').toLowerCase();
    assert.ok(blob.includes('seo') || blob.includes('revenue'));
    assert.ok(blob.includes('lead rescue'));
  });
});

describe('Website Rescue sellable slice — operator desk', () => {
  it('rapid-delivery desk shows Website Rescue operator pack for landing-rescue leads', () => {
    const desk = read('components/RapidDeliveryRevenueDesk.js');
    assert.ok(desk.includes('data-website-rescue-operator-pack'));
    assert.ok(desk.includes('premium-landing-page-rescue'));
    assert.ok(desk.includes('WEBSITE_RESCUE_QUOTE_READY_PACKET_V1.md'));
    assert.ok(desk.includes('/demo/website-rescue'));
  });
});
