/**
 * #712 conversion fix — buyer-facing need question maps to internal service/product.
 * No simultaneous Preferred service path + Related product sprint dropdowns.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  MARKET_BUYER_NEED_OPTIONS,
  isConsistentServiceProductPair,
  isMarketBuyerNeedId,
  mapBuyerNeedToInternal,
  resolveMarketEnquiryRouting,
  resolveOfferSlugForMarketEnquiry,
  servicePathForOfferSlug,
} from '../lib/public/corpflow-market-service-paths.js';
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

/** @type {ReadonlyArray<{ id: string, service_path: string, offer_slug: string, service_interest: string }>} */
const EXPECTED_MAPPINGS = [
  {
    id: 'losing-enquiries',
    service_path: 'client-lead-service',
    offer_slug: 'ai-lead-rescue',
    service_interest: 'lead_rescue',
  },
  {
    id: 'website-improvement',
    service_path: 'website-digital',
    offer_slug: 'premium-landing-page-rescue',
    service_interest: 'website_rescue',
  },
  {
    id: 'admin-workflow',
    service_path: 'workflow-administration',
    offer_slug: '',
    service_interest: 'workflow_admin_improvement',
  },
  {
    id: 'ai-receptionist',
    service_path: 'client-lead-service',
    offer_slug: '',
    service_interest: 'ai_receptionist_chatbot',
  },
  {
    id: 'unsure',
    service_path: 'workflow-administration',
    offer_slug: '',
    service_interest: 'other_unsure',
  },
];

describe('#712 buyer-need routing — every selection maps internally', () => {
  it('exposes exactly five plain-language buyer need options', () => {
    assert.equal(MARKET_BUYER_NEED_OPTIONS.length, 5);
    const labels = MARKET_BUYER_NEED_OPTIONS.map((o) => o.label);
    assert.ok(labels.includes('I am losing or mishandling enquiries'));
    assert.ok(labels.includes('My website needs improvement or replacement'));
    assert.ok(labels.includes('I need help reducing repetitive admin or workflow problems'));
    assert.ok(labels.includes('I am interested in an AI receptionist/chatbot'));
    assert.ok(labels.includes('I am not sure — help me work it out'));
    for (const label of labels) {
      assert.ok(!/service path|product sprint|offer slug/i.test(label));
    }
  });

  for (const expected of EXPECTED_MAPPINGS) {
    it(`maps buyer need "${expected.id}" to service_path=${expected.service_path} offer=${expected.offer_slug || '(none)'}`, () => {
      assert.equal(isMarketBuyerNeedId(expected.id), true);
      const mapped = mapBuyerNeedToInternal(expected.id);
      assert.equal(mapped.ok, true);
      if (!mapped.ok) return;
      assert.equal(mapped.service_path, expected.service_path);
      assert.equal(mapped.offer_slug, expected.offer_slug);
      assert.equal(mapped.service_interest, expected.service_interest);

      const routed = resolveMarketEnquiryRouting({ buyer_need: expected.id });
      assert.equal(routed.ok, true);
      if (!routed.ok) return;
      assert.equal(routed.service_path, expected.service_path);
      assert.equal(routed.offer_slug, expected.offer_slug);
      assert.equal(routed.buyer_need, expected.id);
      assert.equal(
        isConsistentServiceProductPair(routed.service_path, routed.offer_slug).ok,
        true,
      );
    });
  }

  it('rejects unknown buyer need', () => {
    assert.equal(mapBuyerNeedToInternal('not-a-real-need').ok, false);
    assert.equal(resolveMarketEnquiryRouting({ buyer_need: 'not-a-real-need' }).ok, false);
  });
});

describe('#712 buyer-need routing — locked product pages', () => {
  it('Lead Rescue locked offer derives client-lead-service without asking buyer to classify', () => {
    assert.equal(servicePathForOfferSlug('ai-lead-rescue'), 'client-lead-service');
    const routed = resolveMarketEnquiryRouting({
      locked_offer: true,
      offer_slug: 'ai-lead-rescue',
    });
    assert.equal(routed.ok, true);
    if (!routed.ok) return;
    assert.equal(routed.service_path, 'client-lead-service');
    assert.equal(routed.offer_slug, 'ai-lead-rescue');
    assert.equal(routed.buyer_need, null);
    assert.equal(routed.service_interest, 'lead_rescue');
  });

  it('Website Rescue locked offer derives website-digital', () => {
    assert.equal(servicePathForOfferSlug('premium-landing-page-rescue'), 'website-digital');
    const routed = resolveMarketEnquiryRouting({
      locked_offer: true,
      offer_slug: 'premium-landing-page-rescue',
    });
    assert.equal(routed.ok, true);
    if (!routed.ok) return;
    assert.equal(routed.service_path, 'website-digital');
    assert.equal(routed.offer_slug, 'premium-landing-page-rescue');
    assert.equal(routed.service_interest, 'website_rescue');
  });
});

describe('#712 buyer-need routing — prevent contradictory combinations', () => {
  it('rejects Lead Rescue path + Website Rescue offer', () => {
    const check = isConsistentServiceProductPair(
      'client-lead-service',
      'premium-landing-page-rescue',
    );
    assert.equal(check.ok, false);
    assert.equal(check.reason, 'CONTRADICTORY_SERVICE_PRODUCT');
  });

  it('rejects Website path + Lead Rescue offer', () => {
    assert.equal(
      isConsistentServiceProductPair('website-digital', 'ai-lead-rescue').ok,
      false,
    );
  });

  it('rejects workflow path with a priced offer slug', () => {
    assert.equal(
      isConsistentServiceProductPair('workflow-administration', 'ai-lead-rescue').ok,
      false,
    );
  });

  it('resolveOfferSlugForMarketEnquiry no longer prefers contradictory explicit offers', () => {
    // Path wins: client-lead-service maps to ai-lead-rescue even if a wrong slug was sent.
    assert.equal(
      resolveOfferSlugForMarketEnquiry('client-lead-service', 'premium-landing-page-rescue'),
      'ai-lead-rescue',
    );
    assert.equal(resolveOfferSlugForMarketEnquiry('workflow-administration', 'ai-lead-rescue'), '');
  });

  it('resolveMarketEnquiryRouting fails closed on contradictory pairs without buyer_need', () => {
    const bad = resolveMarketEnquiryRouting({
      service_path: 'client-lead-service',
      offer_slug: 'premium-landing-page-rescue',
    });
    assert.equal(bad.ok, false);
  });
});

describe('#712 discovery form UX contract', () => {
  it('removes simultaneous Preferred service path and Related product sprint controls', () => {
    const form = read('components/public/DiscoveryIntakeForm.js');
    assert.ok(!/Preferred service path/i.test(form));
    assert.ok(!/Related product sprint/i.test(form));
    assert.ok(form.includes('What do you need help with?'));
    assert.ok(form.includes('data-buyer-need-select'));
    assert.ok(form.includes('MARKET_BUYER_NEED_OPTIONS'));
    assert.ok(form.includes('resolveMarketEnquiryRouting'));
    assert.ok(form.includes("name=\"buyer_need\"") || form.includes("name='buyer_need'"));
    // Still posts internal taxonomy in meta for operators.
    assert.ok(form.includes('service_path: routed.service_path'));
    assert.ok(form.includes('buyer_need: routed.buyer_need'));
    assert.ok(form.includes('consent_contact: true'));
    assert.ok(form.includes("source: 'corpflow-market-gateway'"));
    assert.ok(form.includes("fetch('/api/tenant/intake'"));
    // Locked product pages skip the classification question.
    assert.ok(form.includes('data-locked-product-context'));
    assert.ok(form.includes('lockedOffer'));
    assert.ok(form.includes('do not need to re-classify'));
    assert.ok(!/sendWhatsApp|twilio|resend|nodemailer|sendgrid/i.test(form));
  });

  it('product pages keep lockedOffer so buyers are not asked to re-classify', () => {
    const offerPage = read('components/RapidDeliveryOfferPage.js');
    assert.ok(offerPage.includes('lockedOffer'));
    assert.ok(offerPage.includes('DiscoveryIntakeForm'));
    const demo = read('components/WebsiteRescueDemo.js');
    assert.ok(demo.includes('lockedOffer'));
    assert.ok(demo.includes('premium-landing-page-rescue'));
  });

  it('tenant intake rejects contradictory service/product pairs', () => {
    const intake = read('lib/server/tenant-intake.js');
    assert.ok(intake.includes('isConsistentServiceProductPair'));
    assert.ok(intake.includes('resolveMarketEnquiryRouting'));
    assert.ok(intake.includes('CONTRADICTORY_SERVICE_PRODUCT') || intake.includes('pairCheck'));
    assert.ok(intake.includes('buyer_need'));
  });
});

describe('#712 downstream operator mapping preserved', () => {
  it('synthetic buyer-need enquiry still exposes source, path, offer, consent, urgency, next action', () => {
    const row = {
      id: 'leadBuyerNeed712abc',
      name: 'Jordan Synthetic',
      email: 'jordan.synthetic+712@example.com',
      phone: '+2305550712',
      message: 'Losing website enquiries overnight',
      status: 'NEW',
      createdAt: new Date('2026-08-04T00:00:00.000Z'),
      tenantId: 'root',
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          buyer_need: 'losing-enquiries',
          service_interest: 'lead_rescue',
          offer_slug: 'ai-lead-rescue',
          service_path: 'client-lead-service',
          business_name: 'Synthetic Lagoon Desk',
          website: 'https://synthetic-lagoon.example',
          enquiry_channels: 'Website form',
          primary_pain: 'Overnight enquiry mishandling',
          urgency: 'asap',
          consent_contact: true,
          source: 'corpflow-market-gateway',
          host: 'corpflowai.com',
          page: '/contact',
          discovery_form: true,
        },
        rapid_delivery_operator: { status: 'new_intake', notes: '' },
      },
    };

    const item = leadRowToRapidDeliveryListItem(row);
    assert.equal(item.service_path, 'client-lead-service');
    assert.equal(item.offer_slug, 'ai-lead-rescue');
    assert.equal(item.urgency, 'asap');
    assert.ok(item.recommended_next_action);
    assert.match(item.recommended_next_action, /Lead Rescue|discovery/i);
    assert.ok(item.source === 'corpflow-market-gateway' || item.source_host === 'corpflowai.com');

    const detail = leadRowToRapidDeliveryDetail(row);
    assert.equal(detail.intake_meta.consent_contact, true);
    assert.equal(detail.intake_meta.buyer_need, 'losing-enquiries');
    assert.equal(detail.intake_meta.service_interest, 'lead_rescue');
  });
});
