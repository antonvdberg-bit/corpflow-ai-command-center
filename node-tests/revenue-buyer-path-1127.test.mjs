/**
 * #1164 / #1127 — P0 revenue acceptance: Lead Rescue + Website Rescue buyer-path lock.
 * Named landings, one primary CTA per product, proof/demo, enquiry labels, no auto-send.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LEAD_RESCUE_ENQUIRY_HREF,
  LEAD_RESCUE_LANDING_HREF,
  WEBSITE_RESCUE_ENQUIRY_HREF,
  WEBSITE_RESCUE_LANDING_HREF,
  canonicalEnquiryHref,
} from '../lib/public/canonical-enquiry.js';
import {
  CORPflow_HOMEPAGE_HERO,
  CORPflow_PUBLIC_LAUNCH_PRODUCTS,
  CORPflow_PUBLIC_NAV,
} from '../lib/public/corpflow-public-market.js';
import { MARKET_SERVICE_PATHS } from '../lib/public/corpflow-market-service-paths.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('#1127 canonical buyer routes', () => {
  it('locks Enquiry Recovery and Website Rescue named landings and enquiry URLs', () => {
    assert.equal(LEAD_RESCUE_LANDING_HREF, '/enquiry-recovery');
    assert.equal(LEAD_RESCUE_ENQUIRY_HREF, '/contact?offer=ai-lead-rescue#discovery');
    assert.equal(WEBSITE_RESCUE_LANDING_HREF, '/website-rescue');
    assert.equal(
      WEBSITE_RESCUE_ENQUIRY_HREF,
      '/contact?offer=premium-landing-page-rescue#discovery',
    );
    assert.equal(canonicalEnquiryHref({ offer: 'ai-lead-rescue' }), LEAD_RESCUE_ENQUIRY_HREF);
    assert.equal(canonicalEnquiryHref({ offer: 'website-rescue' }), WEBSITE_RESCUE_ENQUIRY_HREF);
    assert.equal(existsSync(path.join(REPO_ROOT, 'pages/enquiry-recovery.js')), true);
    assert.equal(existsSync(path.join(REPO_ROOT, 'pages/lead-rescue.js')), true);
    assert.equal(existsSync(path.join(REPO_ROOT, 'pages/website-rescue.js')), true);
    assert.equal(existsSync(path.join(REPO_ROOT, 'pages/demo/website-rescue.js')), true);
    assert.equal(existsSync(path.join(REPO_ROOT, 'pages/contact.js')), true);
  });

  it('gateway nav and footer send buyers to named launch products, not SKU titles', () => {
    const leadNav = CORPflow_PUBLIC_NAV.find((item) => item.label === 'Enquiry Recovery');
    const websiteNav = CORPflow_PUBLIC_NAV.find((item) => item.label === 'Website Rescue');
    assert.equal(leadNav?.href, '/enquiry-recovery');
    assert.equal(websiteNav?.href, '/website-rescue');
    assert.deepEqual(
      CORPflow_PUBLIC_LAUNCH_PRODUCTS.map((item) => item.href),
      ['/enquiry-recovery', '/website-rescue'],
    );
    assert.deepEqual(
      CORPflow_PUBLIC_LAUNCH_PRODUCTS.map((item) => item.label),
      ['Enquiry Recovery', 'Website Rescue'],
    );

    const footer = read('components/public/CorpFlowPublicFooter.js');
    assert.ok(footer.includes('CORPflow_PUBLIC_LAUNCH_PRODUCTS'));
    assert.ok(!footer.includes('listPublicOffers'));
    assert.ok(!footer.includes('o.title'));
    assert.ok(!footer.includes('o.path'));

    const home = read('components/CorpFlowPublicHome.js');
    assert.ok(home.includes('CORPflow_HOMEPAGE_HERO'));
    assert.equal(CORPflow_HOMEPAGE_HERO.primaryCta.href, '/enquiry-recovery#diagnosis');

    const leadPath = MARKET_SERVICE_PATHS.find((p) => p.id === 'client-lead-service');
    const websitePath = MARKET_SERVICE_PATHS.find((p) => p.id === 'website-digital');
    assert.equal(leadPath?.productHref, '/enquiry-recovery');
    assert.equal(websitePath?.productHref, '/website-rescue');
  });
});

describe('#1127 five-second offer and one primary CTA', () => {
  it('Enquiry Recovery has one primary diagnosis CTA', () => {
    const landing = read('components/EnquiryRecoveryCampaignPage.js');
    assert.ok(landing.includes('stopped being followed up'));
    assert.ok(landing.includes('ENQUIRY_RECOVERY_PRICE_LINE') || landing.includes('MUR 85,000'));
    assert.ok(landing.includes('Request a 15-minute Enquiry Recovery Diagnosis'));
    assert.ok(landing.includes('LEAD_RESCUE_ENQUIRY_HREF'));
    assert.ok(!landing.includes("fetch('/api/tenant/intake'"));
    assert.ok(!/Choose payment path/i.test(landing));
    assert.ok(!/USD 150/i.test(landing));
  });

  it('Website Rescue named landing keeps buyer-facing name and does not lead with the SKU title', () => {
    const page = read('pages/website-rescue.js');
    assert.ok(page.includes('data-website-rescue-landing'));
    assert.ok(page.includes('buyerFacingName="Website Rescue"') || page.includes("buyerFacingName='Website Rescue'"));
    assert.ok(page.includes('pathOverride="/website-rescue"') || page.includes("pathOverride='/website-rescue'"));

    const offerPage = read('components/RapidDeliveryOfferPage.js');
    assert.ok(offerPage.includes('Request discovery'));
    assert.ok(offerPage.includes('href="#discovery"'));
    assert.ok(!offerPage.includes('Starting path:'));
    assert.ok(!/Choose payment path/i.test(offerPage));
    assert.ok(offerPage.includes('Open the Website Rescue demo'));
    assert.ok(offerPage.includes('offer.demoPath'));
  });
});

describe('#1127 proof, enquiry labels, and no automatic send', () => {
  it('proof/demo assets exist and Website Rescue demo stays on the named path', () => {
    assert.equal(
      existsSync(path.join(REPO_ROOT, 'public/media/corpflowai/ai-lead-rescue-sprint-intro-1080p.mp4')),
      true,
    );
    assert.equal(
      existsSync(path.join(REPO_ROOT, 'public/assets/video/lead-rescue/lead-rescue-walkthrough-v1.mp4')),
      true,
    );
    const landing = read('components/EnquiryRecoveryCampaignPage.js');
    assert.ok(landing.includes('ENQUIRY_RECOVERY_IMPLEMENTATION_LINE') || landing.includes('does the implementation work'));
    assert.ok(landing.includes('ENQUIRY_RECOVERY_LOSS_LINE') || landing.includes('already paid to generate the enquiry'));
    assert.ok(!landing.includes('PublishingVideoSection'));
    assert.ok(!landing.includes("getVideosForOffer('ai-lead-rescue')"));

    const demo = read('components/WebsiteRescueDemo.js');
    assert.ok(demo.includes('href="/website-rescue"') || demo.includes("href={'/website-rescue'}"));
    assert.ok(demo.includes('/website-rescue#discovery'));
    assert.ok(demo.includes('Request discovery — Website Rescue'));
    assert.ok(demo.includes('lockedOfferLabel="Website Rescue"') || demo.includes("lockedOfferLabel='Website Rescue'"));
    assert.ok(!demo.includes('href="/offers/premium-landing-page-rescue"'));
    assert.ok(!demo.includes('T1 Landing Rescue'));
    assert.ok(!demo.includes('landing-rescue SKU'));
    assert.ok(!/Choose payment path/i.test(demo));
    assert.ok(demo.includes('noindex'));
  });

  it('enquiry entry points are labelled and disclose no automatic send', () => {
    const contact = read('pages/contact.js');
    assert.ok(contact.includes('ENQUIRY_RECOVERY_PRIMARY_CTA_LABEL'));
    assert.ok(contact.includes('Request Website Rescue'));
    assert.ok(contact.includes('Nothing is sent automatically to email, WhatsApp or SMS'));
    assert.ok(contact.includes('data-canonical-enquiry'));

    const form = read('components/public/DiscoveryIntakeForm.js');
    assert.ok(/no\s+automatic email,\s*WhatsApp or SMS is sent from this form/i.test(form));
    assert.ok(form.includes("fetch('/api/tenant/intake'"));
    assert.ok(!/twilio|resend\.emails|nodemailer|sendWhatsApp/i.test(form));
    assert.ok(!/Choose payment path/i.test(form));
  });
});
