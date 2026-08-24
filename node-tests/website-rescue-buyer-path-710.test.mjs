/**
 * #710 — named Website Rescue buyer path (specialist landing + enquiry alias).
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  WEBSITE_RESCUE_ENQUIRY_HREF,
  WEBSITE_RESCUE_ENQUIRY_OFFER,
  canonicalEnquiryHref,
  resolveCanonicalEnquiryOfferSlug,
  resolveCanonicalEnquiryQuery,
} from '../lib/public/canonical-enquiry.js';
import { CORPflow_PUBLIC_NAV } from '../lib/public/corpflow-public-market.js';
import { MARKET_SERVICE_PATHS } from '../lib/public/corpflow-market-service-paths.js';
import { getRapidDeliveryOffer } from '../lib/public/rapid-delivery-offers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('#710 Website Rescue named buyer path', () => {
  it('has a specialist /website-rescue page that reuses the landing-rescue SKU', () => {
    assert.equal(existsSync(path.join(REPO_ROOT, 'pages/website-rescue.js')), true);
    const page = read('pages/website-rescue.js');
    assert.ok(page.includes('data-website-rescue-landing'));
    assert.ok(page.includes("buyerFacingName=\"Website Rescue\"") || page.includes("buyerFacingName='Website Rescue'"));
    assert.ok(page.includes("pathOverride=\"/website-rescue\"") || page.includes("pathOverride='/website-rescue'"));
    assert.ok(page.includes("getRapidDeliveryOffer('premium-landing-page-rescue')"));
    assert.ok(!/Choose payment path/i.test(page));
  });

  it('public nav and homepage send Website Rescue buyers to /website-rescue', () => {
    const nav = CORPflow_PUBLIC_NAV.find((item) => item.label === 'Website Rescue');
    assert.ok(nav);
    assert.equal(nav.href, '/website-rescue');
    const home = read('components/CorpFlowPublicHome.js');
    assert.ok(home.includes('href="/website-rescue"') || home.includes("href={'/website-rescue'}"));
    const websitePath = MARKET_SERVICE_PATHS.find((p) => p.id === 'website-digital');
    assert.equal(websitePath?.productHref, '/website-rescue');
  });

  it('locks website-rescue enquiry aliases onto the existing SKU without a second product', () => {
    assert.equal(WEBSITE_RESCUE_ENQUIRY_OFFER, 'premium-landing-page-rescue');
    assert.equal(WEBSITE_RESCUE_ENQUIRY_HREF, '/contact?offer=premium-landing-page-rescue#discovery');
    assert.equal(resolveCanonicalEnquiryOfferSlug('website-rescue'), 'premium-landing-page-rescue');
    assert.equal(resolveCanonicalEnquiryOfferSlug('website_rescue'), 'premium-landing-page-rescue');
    assert.equal(canonicalEnquiryHref({ offer: 'website-rescue' }), WEBSITE_RESCUE_ENQUIRY_HREF);
    const parsed = resolveCanonicalEnquiryQuery({ offer: 'website-rescue' });
    assert.equal(parsed.lockedOffer, true);
    assert.equal(parsed.defaultOfferSlug, 'premium-landing-page-rescue');
    const offer = getRapidDeliveryOffer(parsed.defaultOfferSlug);
    assert.equal(offer?.path, '/offers/premium-landing-page-rescue');
    assert.equal(offer?.demoPath, '/demo/website-rescue');
  });

  it('makes the Website Rescue demo visible on the shared offer surface', () => {
    const component = read('components/RapidDeliveryOfferPage.js');
    assert.ok(component.includes('data-website-rescue-proof'));
    assert.ok(component.includes('Open the Website Rescue demo'));
    assert.ok(component.includes('offer.demoPath'));
    assert.ok(!/Choose payment path/i.test(component));
    assert.ok(!/recording-ready/i.test(component));
  });

  it('contact lock copy names Website Rescue when the SKU is selected', () => {
    const contact = read('pages/contact.js');
    assert.ok(contact.includes('Request Website Rescue'));
    assert.ok(contact.includes("lockedOfferLabel={"));
    const form = read('components/public/DiscoveryIntakeForm.js');
    assert.ok(form.includes('website_rescue_context'));
  });

  it('sitemap lists /website-rescue and vercel redirects /offers/website-rescue', () => {
    const sitemap = read('pages/sitemap.xml.js');
    assert.ok(sitemap.includes("'/website-rescue'"));
    const vercel = read('vercel.json');
    assert.ok(vercel.includes('/offers/website-rescue'));
    assert.ok(vercel.includes('/website-rescue'));
  });
});
