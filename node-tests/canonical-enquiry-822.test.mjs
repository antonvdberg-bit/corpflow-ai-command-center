/**
 * #822 — one canonical public enquiry form + Lead Rescue locked-product route.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  LEAD_RESCUE_ENQUIRY_HREF,
  LEAD_RESCUE_ENQUIRY_OFFER,
  canonicalEnquiryHref,
  resolveCanonicalEnquiryQuery,
} from '../lib/public/canonical-enquiry.js';
import { resolveMarketEnquiryRouting } from '../lib/public/corpflow-market-service-paths.js';
import {
  RAPID_DELIVERY_PRODUCT,
  leadRowToRapidDeliveryDetail,
  leadRowToRapidDeliveryListItem,
} from '../lib/cmp/_lib/rapid-delivery-operator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

describe('#822 canonical enquiry URL', () => {
  it('documents the surviving Lead Rescue CTA as /contact?offer=ai-lead-rescue#discovery', () => {
    assert.equal(LEAD_RESCUE_ENQUIRY_HREF, '/contact?offer=ai-lead-rescue#discovery');
    assert.equal(LEAD_RESCUE_ENQUIRY_OFFER, 'ai-lead-rescue');
    assert.equal(canonicalEnquiryHref({ offer: 'ai-lead-rescue' }), LEAD_RESCUE_ENQUIRY_HREF);
  });

  it('ignores unknown offer slugs and falls back to the unlocked contact form', () => {
    assert.equal(canonicalEnquiryHref({ offer: 'not-a-product' }), '/contact#discovery');
    const parsed = resolveCanonicalEnquiryQuery({ offer: 'not-a-product' });
    assert.equal(parsed.lockedOffer, false);
    assert.equal(parsed.defaultOfferSlug, '');
  });

  it('keeps homepage ?path= mapping when offer is absent', () => {
    const parsed = resolveCanonicalEnquiryQuery({ path: 'client-lead-service' });
    assert.equal(parsed.lockedOffer, false);
    assert.equal(parsed.defaultServicePath, 'client-lead-service');
    assert.equal(parsed.defaultBuyerNeed, 'losing-enquiries');
  });
});

describe('#822 Lead Rescue query locks the canonical form', () => {
  it('maps ?offer=ai-lead-rescue to locked DiscoveryIntakeForm props', () => {
    const parsed = resolveCanonicalEnquiryQuery({ offer: 'ai-lead-rescue' });
    assert.equal(parsed.lockedOffer, true);
    assert.equal(parsed.defaultOfferSlug, 'ai-lead-rescue');
    assert.equal(parsed.defaultServicePath, 'client-lead-service');
    assert.equal(parsed.defaultBuyerNeed, '');
  });

  it('offer lock wins over a competing path or need query', () => {
    const parsed = resolveCanonicalEnquiryQuery({
      offer: 'ai-lead-rescue',
      path: 'website-digital',
      need: 'website-improvement',
    });
    assert.equal(parsed.lockedOffer, true);
    assert.equal(parsed.defaultOfferSlug, 'ai-lead-rescue');
    assert.equal(parsed.defaultServicePath, 'client-lead-service');
    assert.equal(parsed.defaultBuyerNeed, '');
  });

  it('locked Lead Rescue routing preserves operator metadata for the #699 handoff', () => {
    const parsed = resolveCanonicalEnquiryQuery({ offer: 'ai-lead-rescue' });
    const routed = resolveMarketEnquiryRouting({
      locked_offer: parsed.lockedOffer,
      offer_slug: parsed.defaultOfferSlug,
      service_path: parsed.defaultServicePath,
    });
    assert.equal(routed.ok, true);
    if (!routed.ok) return;
    assert.equal(routed.offer_slug, 'ai-lead-rescue');
    assert.equal(routed.service_path, 'client-lead-service');
    assert.equal(routed.service_interest, 'lead_rescue');
    assert.equal(routed.buyer_need, null);
  });
});

describe('#822 surfaces use one form', () => {
  it('contact page wires offer lock into DiscoveryIntakeForm and drops the second intake section', () => {
    const contact = read('pages/contact.js');
    assert.ok(contact.includes('id="discovery"'));
    assert.ok(contact.includes('data-canonical-enquiry'));
    assert.ok(contact.includes('lockedOffer'));
    assert.ok(contact.includes('defaultOfferSlug'));
    assert.ok(contact.includes('resolveCanonicalEnquiryQuery'));
    assert.ok(!/AI Lead Rescue intake \(USD pilot\)/.test(contact));
    assert.ok(!/Go to AI Lead Rescue intake/.test(contact));
    assert.ok(!/Related product pages/.test(contact));
    assert.ok(!/Customer support and complaints/.test(contact));
    assert.ok(contact.includes('data-contact-support-block'));
    assert.ok(contact.includes('refund-policy'));
    assert.ok(contact.includes('CustomerServiceContact'));
  });

  it('Lead Rescue landing has no embedded submit form and points CTAs at the canonical URL', () => {
    const lr = read('components/AiLeadRescueLanding.js');
    assert.ok(lr.includes('LEAD_RESCUE_ENQUIRY_HREF'));
    assert.ok(lr.includes('data-testid="lead-rescue-canonical-cta"'));
    assert.ok(!lr.includes("fetch('/api/tenant/intake'"));
    assert.ok(!/async function submitLead/.test(lr));
    assert.equal((lr.match(/<form[\s>]/g) || []).length, 0);
  });

  it('DiscoveryIntakeForm still posts the #699 fields plus locked-product Lead Rescue context', () => {
    const form = read('components/public/DiscoveryIntakeForm.js');
    for (const token of [
      'business_name',
      'name',
      'email',
      'phone',
      'website',
      'enquiry_channels',
      'primary_pain',
      'urgency',
      'consent_contact',
      "source: 'corpflow-market-gateway'",
      'locked_product: lockedOffer === true',
      'lead_rescue_context',
      'lead_sources',
      "fetch('/api/tenant/intake'",
    ]) {
      assert.ok(form.includes(token), `missing ${token}`);
    }
    assert.ok(form.includes('data-locked-offer-slug'));
    assert.ok(!/sendWhatsApp|twilio|resend|nodemailer|sendgrid/i.test(form));
  });
});

describe('#822 locked Lead Rescue submission remains visible in the #699 handoff', () => {
  it('synthetic locked Lead Rescue enquiry exposes offer, source, consent, urgency, and next action', () => {
    const row = {
      id: 'leadCanonical822abc',
      name: 'Alex Synthetic',
      email: 'alex.synthetic+822@example.com',
      phone: '+2305550822',
      message: 'Missed WhatsApp follow-up',
      status: 'NEW',
      createdAt: new Date('2026-08-13T00:00:00.000Z'),
      tenantId: 'root',
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          offer_slug: 'ai-lead-rescue',
          service_path: 'client-lead-service',
          service_interest: 'lead_rescue',
          locked_product: true,
          lead_rescue_context: true,
          business_name: 'Synthetic Harbour Desk',
          website: 'https://synthetic-harbour.example',
          enquiry_channels: 'WhatsApp, website form',
          lead_sources: 'WhatsApp, website form',
          primary_pain: 'Missed WhatsApp follow-up',
          urgency: 'this-month',
          consent_contact: true,
          source: 'corpflow-market-gateway',
          host: 'corpflowai.com',
          page: '/contact?offer=ai-lead-rescue',
          discovery_form: true,
        },
        rapid_delivery_operator: { status: 'new_intake', notes: '' },
      },
    };

    const item = leadRowToRapidDeliveryListItem(row);
    assert.equal(item.offer_slug, 'ai-lead-rescue');
    assert.equal(item.service_path, 'client-lead-service');
    assert.equal(item.urgency, 'this-month');
    assert.equal(item.consent_contact, true);
    assert.equal(item.source, 'corpflow-market-gateway');
    assert.match(item.recommended_next_action, /Lead Rescue|discovery/i);

    const detail = leadRowToRapidDeliveryDetail(row);
    assert.equal(detail.intake_meta.locked_product, true);
    assert.equal(detail.intake_meta.consent_contact, true);
    assert.equal(detail.intake_meta.offer_slug, 'ai-lead-rescue');
    assert.equal(detail.intake_meta.page, '/contact?offer=ai-lead-rescue');
    assert.ok(detail.response_draft);
  });
});
