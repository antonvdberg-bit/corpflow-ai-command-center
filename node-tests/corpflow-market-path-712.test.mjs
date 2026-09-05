/**
 * #712 — WS1 market activation unit gate:
 * public pages, intake validation, operator mapping, CTA / safe-claims contracts.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { CORPflow_HOMEPAGE_HERO } from '../lib/public/corpflow-public-market.js';
import { RAPID_DELIVERY_OFFERS } from '../lib/public/rapid-delivery-offers.js';
import {
  RAPID_DELIVERY_PRODUCT,
  leadRowToRapidDeliveryDetail,
  leadRowToRapidDeliveryListItem,
} from '../lib/cmp/_lib/rapid-delivery-operator.js';
import {
  AI_LEAD_RESCUE_DEFAULT_NEXT_ACTION,
  AI_LEAD_RESCUE_PRODUCT,
  aiLeadRescueUrgencyLabel,
  leadRowToAiLeadRescueDetail,
  leadRowToAiLeadRescueListItem,
  parseIntakeMeta,
} from '../lib/cmp/_lib/ai-lead-rescue-operator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('#712 market path — public pages and primary CTAs', () => {
  it('homepage has one primary CTA to diagnosis and product nav entries', () => {
    assert.equal(CORPflow_HOMEPAGE_HERO.primaryCta.href, '/enquiry-recovery#diagnosis');
    assert.match(CORPflow_HOMEPAGE_HERO.primaryCta.label, /diagnosis/i);
    const home = read('components/CorpFlowPublicHome.js');
    assert.ok(home.includes('CORPflow_HOMEPAGE_HERO'));
    const header = read('components/public/CorpFlowPublicHeader.js');
    assert.ok(header.includes('CORPflow_PUBLIC_NAV'));
    assert.ok(!/Choose payment path/i.test(home));
  });

  it('Enquiry Recovery page has one primary diagnosis CTA', () => {
    const lr = read('components/EnquiryRecoveryCampaignPage.js');
    assert.ok(lr.includes('Request a 15-minute Enquiry Recovery Diagnosis'));
    assert.ok(lr.includes('LEAD_RESCUE_ENQUIRY_HREF') || lr.includes('/contact?offer=ai-lead-rescue#discovery'));
    assert.ok(lr.includes('id={ENQUIRY_RECOVERY_DIAGNOSIS_HASH}') || lr.includes('diagnosis'));
    assert.ok(!lr.includes("fetch('/api/tenant/intake'"));
    assert.ok(!/Choose payment path/i.test(lr));
  });

  it('Website Rescue offer has one primary discovery CTA and a named buyer path', () => {
    const offer = RAPID_DELIVERY_OFFERS['premium-landing-page-rescue'];
    assert.ok(offer);
    assert.match(offer.headline, /enquiry path/i);
    const page = read('components/RapidDeliveryOfferPage.js');
    assert.ok(page.includes('Request discovery') || page.includes('#discovery'));
    assert.ok(page.includes('canonicalEnquiryHref'));
    assert.ok(!page.includes('href="/contact"'));
    assert.ok(existsSync(path.join(REPO_ROOT, 'pages/offers/premium-landing-page-rescue.js')));
    assert.ok(existsSync(path.join(REPO_ROOT, 'pages/website-rescue.js')));
    assert.ok(existsSync(path.join(REPO_ROOT, 'pages/demo/website-rescue.js')));
  });

  it('Website Rescue demo and homepage proof keep buyers on the named path', () => {
    const demo = read('components/WebsiteRescueDemo.js');
    assert.ok(demo.includes('href="/website-rescue"') || demo.includes("href={'/website-rescue'}"));
    assert.ok(!demo.includes('href="/offers/premium-landing-page-rescue"'));
    const market = read('lib/public/corpflow-public-market.js');
    assert.ok(market.includes("href: '/website-rescue'"));
    assert.ok(!market.includes("href: '/offers/premium-landing-page-rescue'"));
  });

  it('contact page anchors discovery intake', () => {
    const contact = read('pages/contact.js');
    assert.ok(contact.includes('id="discovery"') || contact.includes("id=\"discovery\""));
    assert.ok(contact.includes('DiscoveryIntakeForm'));
  });
});

describe('#712 market path — five-second offer and safe claims', () => {
  it('Enquiry Recovery states price, timeline, and no revenue guarantee', () => {
    const lr = read('components/EnquiryRecoveryCampaignPage.js');
    assert.ok(lr.includes('MUR 85,000') || lr.includes('ENQUIRY_RECOVERY_PRICE_LINE'));
    assert.ok(lr.includes('72 hours') || lr.includes('ENQUIRY_RECOVERY_PREVIEW_LINE'));
    assert.ok(/do not guarantee new revenue/i.test(lr) || lr.includes('ENQUIRY_RECOVERY_NO_GUARANTEE_LINE'));
    assert.ok(/Do you guarantee recovered revenue/i.test(lr));
    assert.ok(!/\bwe guarantee more sales\b/i.test(lr));
    assert.ok(!/\b10x leads\b/i.test(lr));
    assert.ok(!/Choose payment path/i.test(lr));
  });

  it('Website Rescue offer avoids revenue / SEO guarantees', () => {
    const offer = RAPID_DELIVERY_OFFERS['premium-landing-page-rescue'];
    const blob = JSON.stringify(offer);
    assert.ok(!/guaranteed revenue|guarantee.*traffic|guarantee.*SEO/i.test(blob));
    const demo = read('components/WebsiteRescueDemo.js');
    assert.ok(/no SEO|revenue guarantees|Demo only|fictional/i.test(demo));
  });

  it('homepage trust copy rejects guaranteed-revenue promises', () => {
    const home = read('components/CorpFlowPublicHome.js');
    assert.ok(/no guaranteed-revenue claims/i.test(home));
  });
});

describe('#712 market path — intake validation contracts', () => {
  it('rapid-delivery and Lead Rescue intakes require consent and phone', () => {
    const intake = read('lib/server/tenant-intake.js');
    assert.ok(intake.includes('CONSENT_REQUIRED'));
    assert.ok(intake.includes('phone is required'));
    // Lead Rescue consent is required (not only when field present)
    const lrBlock = intake.slice(intake.indexOf('isAiLeadRescue'));
    assert.ok(lrBlock.includes('CONSENT_REQUIRED'));
    assert.ok(lrBlock.includes('meta.consent_contact must be true'));
    assert.ok(intake.includes('INVALID_URGENCY'));
  });

  it('Lead Rescue CTAs route into the canonical enquiry form; product pages keep lockedOffer', () => {
    const lr = read('components/EnquiryRecoveryCampaignPage.js');
    assert.ok(lr.includes('LEAD_RESCUE_ENQUIRY_HREF') || lr.includes('/contact?offer=ai-lead-rescue#discovery'));
    assert.ok(!lr.includes("fetch('/api/tenant/intake'"));
    const form = read('components/public/DiscoveryIntakeForm.js');
    for (const token of [
      'locked_product: lockedOffer === true',
      'enquiry_channels',
      'consent_contact: true',
      'urgency',
      "fetch('/api/tenant/intake'",
    ]) {
      assert.ok(form.includes(token), `missing ${token}`);
    }
  });
});

describe('#712 market path — operator queue mapping', () => {
  it('Website Rescue rapid-delivery mapping exposes source, product, consent, urgency, next action', () => {
    const row = {
      id: 'cmse9k7qf0000ji042lvyxpj8',
      name: 'Synth WR Buyer 712',
      email: 'synth.wr+712@example.com',
      phone: '+23057000112',
      message: 'Weak enquiry path',
      status: 'NEW_INTAKE',
      createdAt: new Date('2026-08-04T00:00:00.000Z'),
      tenantId: 'corpflowai',
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          offer_slug: 'premium-landing-page-rescue',
          service_path: 'website-digital',
          business_name: 'TEST-WebsiteRescue-712',
          website: 'https://example.com',
          enquiry_channels: 'Website form',
          primary_pain: 'Outdated site hides offer and enquiry CTA',
          urgency: 'asap',
          consent_contact: true,
          source: 'corpflow-market-gateway',
          host: 'corpflowai.com',
          page: '/offers/premium-landing-page-rescue',
        },
        rapid_delivery_operator: { status: 'new_intake' },
      },
    };
    const item = leadRowToRapidDeliveryListItem(row);
    assert.equal(item.source, 'corpflow-market-gateway');
    assert.equal(item.offer_slug, 'premium-landing-page-rescue');
    assert.equal(item.consent_contact, true);
    assert.equal(item.urgency, 'asap');
    assert.ok(item.recommended_next_action);
    assert.match(item.recommended_next_action, /Website Rescue|discovery/i);
    const detail = leadRowToRapidDeliveryDetail(row);
    assert.equal(detail.intake_meta.consent_contact, true);
    assert.ok(detail.response_draft);
  });

  it('Lead Rescue mapping exposes source, product, consent, urgency, and default next action', () => {
    assert.equal(aiLeadRescueUrgencyLabel('this-month'), 'Within this month');
    const qj = {
      intake_meta: {
        product: AI_LEAD_RESCUE_PRODUCT,
        business_name: 'TEST-LeadRescue-712',
        lead_sources: 'WhatsApp, website form',
        website: 'https://example.com',
        urgency: 'this-month',
        consent_contact: true,
        source: 'ai-lead-rescue',
        page: '/lead-rescue',
        host: 'corpflowai.com',
        message: 'Missed WhatsApp and website enquiries',
      },
    };
    const meta = parseIntakeMeta(qj);
    assert.equal(meta.consent_contact, true);
    assert.equal(meta.urgency, 'this-month');
    assert.equal(meta.source, 'ai-lead-rescue');
    assert.equal(meta.page, '/lead-rescue');

    const row = {
      id: 'cmse9k7yl0005ji04fgzqyv8e',
      tenantId: 'corpflowai',
      name: 'Synth LR Buyer 712',
      email: 'synth.lr+712@example.com',
      phone: '+23057000113',
      message: 'Missed WhatsApp and website enquiries',
      status: 'NEW_INTAKE',
      createdAt: new Date('2026-08-04T00:00:00.000Z'),
      updatedAt: new Date('2026-08-04T00:00:00.000Z'),
      qualificationJson: qj,
    };
    const list = leadRowToAiLeadRescueListItem(row);
    assert.equal(list.source, 'ai-lead-rescue');
    assert.equal(list.consent_contact, true);
    assert.equal(list.urgency, 'this-month');
    assert.equal(list.next_action, AI_LEAD_RESCUE_DEFAULT_NEXT_ACTION);

    const detail = leadRowToAiLeadRescueDetail(row);
    assert.equal(detail.prospect.consent_contact, true);
    assert.equal(detail.prospect.urgency_label, 'Within this month');
    assert.equal(detail.prospect.source_page, '/lead-rescue');
    assert.equal(detail.operations.next_action, AI_LEAD_RESCUE_DEFAULT_NEXT_ACTION);
  });

  it('Lead Rescue admin detail surfaces consent, urgency, and source for operators', () => {
    const detailUi = read('components/AiLeadRescueAdminDetail.js');
    assert.ok(detailUi.includes('Contact consent'));
    assert.ok(detailUi.includes('Urgency / timing'));
    assert.ok(detailUi.includes('consent_contact'));
    assert.ok(detailUi.includes('urgency_label'));
  });

  it('rapid-delivery desk remains copy-only (no auto-send)', () => {
    const desk = read('components/RapidDeliveryRevenueDesk.js');
    assert.ok(desk.includes('no live send') || desk.includes('No live send'));
    assert.ok(desk.includes('Copy response draft'));
    assert.ok(!/sendWhatsApp|twilio|resend\.emails|nodemailer/i.test(desk));
  });
});
