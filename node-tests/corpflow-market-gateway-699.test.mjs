/**
 * #699 — CorpFlowAI market-ready gateway: offer, proof, qualified enquiry, operator handoff.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CORPflow_DELIVERY_STEPS,
  CORPflow_HOMEPAGE_HERO,
  CORPflow_PROOF_ITEMS,
  CORPflow_TRUST_POINTS,
  MARKET_SERVICE_PATHS,
} from '../lib/public/corpflow-public-market.js';
import {
  buildMarketEnquiryResponseDraft,
  buyerNeedForServicePath,
  isMarketServicePathId,
  recommendedMarketEnquiryNextAction,
  resolveOfferSlugForMarketEnquiry,
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

describe('#699 market gateway — public offer', () => {
  it('hero states managed delivery and one primary CTA to discovery', () => {
    assert.match(CORPflow_HOMEPAGE_HERO.headline, /workflow/i);
    assert.match(CORPflow_HOMEPAGE_HERO.subhead, /managed/i);
    assert.equal(CORPflow_HOMEPAGE_HERO.primaryCta.href, '/contact#discovery');
    assert.ok(!/guaranteed revenue|10x|fully autonomous/i.test(JSON.stringify(CORPflow_HOMEPAGE_HERO)));
  });

  it('exposes three #699 service paths without invented prices or endorsements', () => {
    assert.equal(MARKET_SERVICE_PATHS.length, 3);
    assert.ok(MARKET_SERVICE_PATHS.some((p) => p.id === 'workflow-administration'));
    assert.ok(MARKET_SERVICE_PATHS.some((p) => p.id === 'client-lead-service'));
    assert.ok(MARKET_SERVICE_PATHS.some((p) => p.id === 'website-digital'));
    for (const p of MARKET_SERVICE_PATHS) {
      assert.ok(p.title);
      assert.ok(p.summary);
      assert.ok(!/MUR\s*\d|USD\s*\d|%\s*savings|certified/i.test(`${p.title} ${p.summary}`));
    }
  });

  it('delivery method is understand → design → build → verify → review → improve', () => {
    assert.equal(CORPflow_DELIVERY_STEPS.length, 6);
    const titles = CORPflow_DELIVERY_STEPS.map((s) => s.title.toLowerCase());
    assert.deepEqual(titles, ['understand', 'design', 'build', 'verify', 'review', 'improve']);
  });

  it('proof items are factual test-delivery evidence without NEEDS_ANTON or fake testimonials', () => {
    assert.ok(CORPflow_PROOF_ITEMS.length >= 2);
    const blob = JSON.stringify(CORPflow_PROOF_ITEMS);
    assert.ok(!blob.includes('NEEDS_ANTON'));
    assert.ok(!/testimonial|5-star|increased revenue by/i.test(blob));
    assert.ok(/test|internal|demo|fictional/i.test(blob));
  });

  it('trust points cover approvals, test-before-launch, data boundaries, no forced replacement', () => {
    const blob = JSON.stringify(CORPflow_TRUST_POINTS).toLowerCase();
    assert.ok(blob.includes('approv'));
    assert.ok(blob.includes('test'));
    assert.ok(blob.includes('data'));
    assert.ok(blob.includes('replace') || blob.includes('replacement'));
  });

  it('homepage wires service paths, proof, trust, and product entry points', () => {
    const home = read('components/CorpFlowPublicHome.js');
    assert.ok(home.includes('id="service-paths"') || home.includes("id=\"service-paths\""));
    assert.ok(home.includes('CORPflow_PROOF_ITEMS'));
    assert.ok(home.includes('CORPflow_TRUST_POINTS'));
    assert.ok(home.includes('/lead-rescue'));
    assert.ok(home.includes('/offers/premium-landing-page-rescue'));
    assert.ok(home.includes('/demo/website-rescue'));
    assert.ok(home.includes('/contact?path='));
    assert.ok(home.includes('Enquire about this path'));
    assert.ok(!home.includes('NEEDS_ANTON'));
  });

  it('contact page accepts ?path= and maps to buyer-need prefill', () => {
    const contact = read('pages/contact.js');
    assert.ok(contact.includes('defaultBuyerNeed'));
    assert.ok(contact.includes('buyerNeedForServicePath'));
    assert.ok(contact.includes('isMarketServicePathId'));
    assert.ok(contact.includes('query?.path') || contact.includes('query.path'));
  });
});

describe('#699 market gateway — qualified enquiry form', () => {
  it('discovery form captures required #699 fields and posts to tenant intake', () => {
    const form = read('components/public/DiscoveryIntakeForm.js');
    for (const token of [
      'buyer_need',
      'service_path',
      'business_name',
      'name',
      'email',
      'phone',
      'website',
      'primary_pain',
      'urgency',
      'consent_contact',
      "fetch('/api/tenant/intake'",
      'consent_contact: true',
    ]) {
      assert.ok(form.includes(token), `missing ${token}`);
    }
    assert.ok(form.includes('What do you need help with?'));
    assert.ok(!/Preferred service path/i.test(form));
    assert.ok(!/Related product sprint/i.test(form));
    assert.ok(!/sendWhatsApp|twilio|resend|nodemailer|sendgrid/i.test(form));
  });

  it('tenant intake validates consent, phone, service path for rapid delivery', () => {
    const intake = read('lib/server/tenant-intake.js');
    assert.ok(intake.includes('CONSENT_REQUIRED'));
    assert.ok(intake.includes('phone is required'));
    assert.ok(intake.includes('isMarketServicePathId'));
    assert.ok(intake.includes('service_path'));
    assert.ok(intake.includes('urgency'));
    assert.ok(intake.includes('website'));
  });

  it('maps service paths to product offers where appropriate', () => {
    assert.equal(resolveOfferSlugForMarketEnquiry('client-lead-service', ''), 'ai-lead-rescue');
    assert.equal(resolveOfferSlugForMarketEnquiry('website-digital', ''), 'premium-landing-page-rescue');
    assert.equal(resolveOfferSlugForMarketEnquiry('workflow-administration', ''), '');
    assert.equal(isMarketServicePathId('workflow-administration'), true);
    assert.equal(buyerNeedForServicePath('website-digital'), 'website-improvement');
    assert.equal(buyerNeedForServicePath('client-lead-service'), 'losing-enquiries');
    assert.equal(buyerNeedForServicePath('workflow-administration'), 'admin-workflow');
  });
});

describe('#699 market gateway — operator handoff', () => {
  const sampleRow = {
    id: 'leadMarket699abc',
    name: 'Sam Synthetic',
    email: 'sam.synthetic+699@example.com',
    phone: '+23050000000',
    message: 'Need clearer enquiry follow-up',
    status: 'NEW_INTAKE',
    createdAt: new Date('2026-07-31T00:00:00.000Z'),
    tenantId: 'root',
    qualificationJson: {
      intake_meta: {
        product: RAPID_DELIVERY_PRODUCT,
        offer_slug: 'premium-landing-page-rescue',
        service_path: 'website-digital',
        business_name: 'Hotel Supplies Demo Co',
        website: 'https://example.com',
        enquiry_channels: 'Website form',
        primary_pain: 'Weak enquiry path on existing site',
        urgency: 'asap',
        consent_contact: true,
        source: 'corpflow-market-gateway',
        host: 'corpflowai.com',
        page: '/contact',
        message: 'Synthetic #699 verification',
      },
      rapid_delivery_operator: { status: 'new_intake', notes: 'Review today' },
    },
  };

  it('list/detail expose source, path, timing, next action, notes, response draft', () => {
    const item = leadRowToRapidDeliveryListItem(sampleRow);
    assert.equal(item.service_path, 'website-digital');
    assert.match(item.service_path_label, /website/i);
    assert.equal(item.website, 'https://example.com');
    assert.equal(item.urgency, 'asap');
    assert.ok(item.recommended_next_action);
    assert.ok(item.response_draft.includes('Sam Synthetic'));
    assert.ok(item.response_draft.includes('Hotel Supplies Demo Co'));
    assert.equal(item.operator_notes, 'Review today');
    assert.ok(item.source === 'corpflow-market-gateway' || item.source_host === 'corpflowai.com');

    const detail = leadRowToRapidDeliveryDetail(sampleRow);
    assert.ok(detail.response_draft);
    assert.equal(detail.intake_meta.consent_contact, true);
  });

  it('response draft helper is copy-ready and non-sending', () => {
    const draft = buildMarketEnquiryResponseDraft({
      contactName: 'Alex',
      businessName: 'Acme',
      servicePathId: 'workflow-administration',
      primaryPain: 'Scattered approvals',
      reference: 'CF-TEST01',
    });
    assert.match(draft, /Hi Alex/);
    assert.match(draft, /Acme/);
    assert.match(draft, /CF-TEST01/);
    assert.ok(!/http:\/\/localhost|api\.|webhook/i.test(draft));
  });

  it('recommended next action adapts to status and path', () => {
    assert.match(
      recommendedMarketEnquiryNextAction({ service_path: 'client-lead-service', operator_status: 'new_intake' }),
      /Lead Rescue|discovery/i,
    );
    assert.match(
      recommendedMarketEnquiryNextAction({ operator_status: 'quote_ready' }),
      /quote|Anton/i,
    );
  });

  it('operator desk UI surfaces #699 handoff fields', () => {
    const desk = read('components/RapidDeliveryRevenueDesk.js');
    assert.ok(desk.includes('data-market-enquiry-fields'));
    assert.ok(desk.includes('data-response-draft'));
    assert.ok(desk.includes('data-recommended-next-action'));
    assert.ok(desk.includes('Copy response draft'));
    assert.ok(desk.includes('no live send'));
  });

  it('change/revenue points operators to the live enquiry desk', () => {
    const revenue = read('pages/change/revenue.js');
    assert.ok(revenue.includes('data-market-enquiry-handoff'));
    assert.ok(revenue.includes('/admin/rapid-delivery'));
    assert.ok(revenue.includes('response draft'));
  });
});

describe('#699 market gateway — product funnel links retained', () => {
  it('Lead Rescue form keeps product marker and adds consent/timing/website', () => {
    const lr = read('components/AiLeadRescueLanding.js');
    assert.ok(lr.includes("product: 'ai-lead-rescue'"));
    assert.ok(lr.includes('name="website"'));
    assert.ok(lr.includes('name="urgency"'));
    assert.ok(lr.includes('name="consent_contact"'));
  });

  it('Website Rescue demo still embeds DiscoveryIntakeForm', () => {
    const demo = read('components/WebsiteRescueDemo.js');
    assert.ok(demo.includes('DiscoveryIntakeForm'));
  });
});
