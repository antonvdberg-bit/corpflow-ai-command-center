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
  it('hero states enquiry recovery and one primary CTA to diagnosis', () => {
    assert.match(CORPflow_HOMEPAGE_HERO.headline, /enquir/i);
    assert.match(CORPflow_HOMEPAGE_HERO.subhead, /Mauritius/i);
    assert.equal(CORPflow_HOMEPAGE_HERO.primaryCta.href, '/enquiry-recovery#diagnosis');
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
    assert.ok(home.includes('id="commercial-focus"'));
    assert.ok(home.includes('CORPflow_HOMEPAGE_HERO'));
    assert.ok(home.includes('PublicTrustBand'));
    assert.ok(/no guaranteed-revenue claims/i.test(home));
    assert.ok(!home.includes('NEEDS_ANTON'));

    const header = read('components/public/CorpFlowPublicHeader.js');
    assert.ok(header.includes('CORPflow_PUBLIC_NAV'));
    const footer = read('components/public/CorpFlowPublicFooter.js');
    assert.ok(footer.includes('CORPflow_PUBLIC_LAUNCH_PRODUCTS'));
  });

  it('contact page accepts ?path= and ?offer= and maps to buyer-need or locked product', () => {
    const contact = read('pages/contact.js');
    assert.ok(contact.includes('defaultBuyerNeed'));
    assert.ok(contact.includes('resolveCanonicalEnquiryQuery'));
    assert.ok(contact.includes('lockedOffer'));
    assert.ok(contact.includes('defaultOfferSlug'));
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
    assert.ok(desk.includes('/app/prospects'));
  });

  it('Operating Workspace is the canonical operator queue (not tenant /change)', () => {
    const list = read('components/app/ProspectOperationsList.js');
    assert.ok(list.includes('data-market-enquiry-fields'));
    assert.ok(list.includes('data-response-draft'));
    assert.ok(list.includes('Copy response draft'));
    assert.ok(list.includes('no live send') || list.includes('Nothing is sent automatically'));
    assert.ok(list.includes('prospect-ops-shared-detail'));
    assert.equal(list.includes(') : null}\n      <div className="cf-app-table-wrap">'), false);
    const revenue = read('pages/change/revenue.js');
    assert.ok(revenue.includes('data-market-enquiry-handoff'));
    assert.ok(revenue.includes('/app/prospects'));
    assert.ok(revenue.includes('Operating Workspace'));
    const intake = read('lib/server/tenant-intake.js');
    assert.ok(intake.includes("operator_path: '/app/prospects'"));
  });
});

describe('#699 market gateway — product funnel links retained', () => {
  it('Lead Rescue CTAs route to the canonical locked enquiry form', () => {
    const lr = read('components/EnquiryRecoveryCampaignPage.js');
    assert.ok(lr.includes('LEAD_RESCUE_ENQUIRY_HREF') || lr.includes('/contact?offer=ai-lead-rescue#discovery'));
    assert.ok(!lr.includes("fetch('/api/tenant/intake'"));
    const form = read('components/public/DiscoveryIntakeForm.js');
    assert.ok(form.includes('lockedOffer'));
    assert.ok(form.includes('name="website"'));
    assert.ok(form.includes('name="urgency"'));
    assert.ok(form.includes('name="consent_contact"'));
  });

  it('Website Rescue demo still embeds DiscoveryIntakeForm', () => {
    const demo = read('components/WebsiteRescueDemo.js');
    assert.ok(demo.includes('DiscoveryIntakeForm'));
  });
});
