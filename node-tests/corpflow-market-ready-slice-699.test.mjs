/**
 * #699 — market-ready CorpFlowAI slice: service paths, intake meta, operator handoff.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CORPFLOW_SERVICE_PATHS,
  CORPFLOW_SERVICE_PATH_IDS,
  isCorpFlowServicePathId,
  isCorpFlowEnquiryUrgency,
} from '../lib/public/corpflow-service-paths.js';
import {
  CORPflow_DELIVERY_STEPS,
  CORPflow_HOMEPAGE_HERO,
  CORPflow_PROOF_ITEMS,
  CORPflow_TRUST_POINTS,
  listPublicServicePaths,
} from '../lib/public/corpflow-public-market.js';
import {
  RAPID_DELIVERY_PRODUCT,
  buildRapidDeliveryProposalSummary,
  buildRapidDeliveryResponseDraft,
  leadRowToRapidDeliveryDetail,
  recommendedRapidDeliveryNextAction,
} from '../lib/cmp/_lib/rapid-delivery-operator.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const read = (rel) => readFileSync(path.join(REPO_ROOT, rel), 'utf8');

describe('#699 service paths and homepage proposition', () => {
  it('exposes exactly three safe service path ids', () => {
    assert.equal(CORPFLOW_SERVICE_PATHS.length, 3);
    assert.equal(CORPFLOW_SERVICE_PATH_IDS.length, 3);
    assert.equal(listPublicServicePaths().length, 3);
    assert.ok(isCorpFlowServicePathId('workflow-administration'));
    assert.ok(isCorpFlowServicePathId('client-lead-service-delivery'));
    assert.ok(isCorpFlowServicePathId('website-digital-operating'));
    assert.equal(isCorpFlowServicePathId('ai-lead-rescue'), false);
  });

  it('hero names CorpFlowAI and points to enquiry CTA', () => {
    assert.match(CORPflow_HOMEPAGE_HERO.eyebrow, /CorpFlowAI/);
    assert.match(CORPflow_HOMEPAGE_HERO.headline, /CorpFlowAI/);
    assert.equal(CORPflow_HOMEPAGE_HERO.primaryCta.href, '/contact#discovery');
    assert.match(CORPflow_HOMEPAGE_HERO.primaryCta.label, /enquiry/i);
  });

  it('delivery method has six understand→improve steps', () => {
    assert.equal(CORPflow_DELIVERY_STEPS.length, 6);
    assert.equal(CORPflow_DELIVERY_STEPS[0].title, 'Understand');
    assert.equal(CORPflow_DELIVERY_STEPS[5].title, 'Improve');
  });

  it('proof items are anonymised test evidence without endorsement claims', () => {
    assert.ok(CORPflow_PROOF_ITEMS.length >= 2);
    const blob = JSON.stringify(CORPflow_PROOF_ITEMS);
    assert.match(blob, /test/i);
    assert.ok(!/guaranteed revenue/i.test(blob));
    assert.ok(!/%\s*increase/i.test(blob));
  });

  it('trust points cover approvals, test-before-launch, data and platform restraint', () => {
    const titles = CORPflow_TRUST_POINTS.map((t) => t.title.toLowerCase()).join(' ');
    assert.match(titles, /approv/);
    assert.match(titles, /test/);
    assert.match(titles, /data/);
    assert.match(titles, /platform/);
  });

  it('homepage does not invent fixed prices on service paths', () => {
    const home = read('components/CorpFlowPublicHome.js');
    const pathsBlock = home.slice(home.indexOf('service-paths'), home.indexOf('how-we-deliver'));
    assert.ok(!/MUR\s*\d/.test(pathsBlock));
    assert.ok(!/USD\s*\d/.test(pathsBlock));
  });
});

describe('#699 intake validation surface', () => {
  it('tenant intake accepts market service_path without requiring offer_slug', () => {
    const intake = read('lib/server/tenant-intake.js');
    assert.ok(intake.includes('isCorpFlowServicePathId'));
    assert.ok(intake.includes('INVALID_SERVICE_PATH'));
    assert.ok(intake.includes('CONSENT_REQUIRED'));
    assert.ok(intake.includes('phone is required'));
    assert.ok(intake.includes('market_enquiry'));
  });

  it('urgency helper accepts known timing values only', () => {
    assert.equal(isCorpFlowEnquiryUrgency('asap'), true);
    assert.equal(isCorpFlowEnquiryUrgency('this_month'), true);
    assert.equal(isCorpFlowEnquiryUrgency('whenever'), false);
  });
});

describe('#699 operator handoff', () => {
  const syntheticRow = {
    id: 'synth699abc1',
    name: 'Alex Synthetic',
    email: 'alex.synthetic@example.com',
    phone: '+23051112222',
    message: 'Need enquiry + follow-up visibility',
    status: 'NEW_INTAKE',
    createdAt: new Date('2026-07-31T12:00:00.000Z'),
    updatedAt: new Date('2026-07-31T12:00:00.000Z'),
    tenantId: 'root',
    qualificationJson: {
      intake_meta: {
        product: RAPID_DELIVERY_PRODUCT,
        market_enquiry: true,
        service_path: 'client-lead-service-delivery',
        business_name: 'Synthetic Ops Ltd',
        primary_pain: 'Leads arrive on three channels with no shared status',
        enquiry_channels: 'Telephone / WhatsApp (stated on form)',
        website: 'https://synthetic-ops.example',
        urgency: 'asap',
        consent_to_contact: true,
        host: 'corpflowai.com',
        message: '#699 synthetic verification',
      },
      rapid_delivery_operator: { status: 'new_intake', notes: 'Review queue', updated_at: '2026-07-31T12:00:00.000Z' },
    },
  };

  it('detail includes source, path, timing, notes and next action', () => {
    const detail = leadRowToRapidDeliveryDetail(syntheticRow);
    assert.equal(detail.source_host, 'corpflowai.com');
    assert.equal(detail.service_path, 'client-lead-service-delivery');
    assert.equal(detail.urgency, 'asap');
    assert.equal(detail.operator_notes, 'Review queue');
    assert.ok(detail.recommended_next_action);
    assert.match(detail.response_draft, /Alex Synthetic/);
  });

  it('proposal summary includes copy-ready draft and no auto-send language', () => {
    const summary = buildRapidDeliveryProposalSummary(syntheticRow);
    assert.equal(summary.ok, true);
    assert.match(summary.markdown, /Copy-ready response draft/);
    assert.match(summary.markdown, /do not auto-send/i);
    assert.match(summary.markdown, /Recommended next action/);
    assert.match(summary.markdown, /corpflowai\.com/);
    assert.ok(summary.sections?.response_draft);
  });

  it('response draft helper stays copy-only', () => {
    const draft = buildRapidDeliveryResponseDraft({
      name: 'Pat',
      business_name: 'Demo Co',
      service_path_title: 'Website and digital operating upgrades',
      primary_pain: 'Form is unclear',
      reference: 'CF-TEST99',
    });
    assert.match(draft, /Pat/);
    assert.match(draft, /CF-TEST99/);
    assert.ok(!/https?:\/\/api\./i.test(draft));
  });

  it('recommended next action changes with status', () => {
    assert.match(
      recommendedRapidDeliveryNextAction({ operator_status: 'new_intake', market_enquiry: true }),
      /market enquiry|service path/i,
    );
    assert.match(recommendedRapidDeliveryNextAction({ operator_status: 'not_fit' }), /not proceeding/i);
  });

  it('desk remains linked from revenue cockpit and has no send action', () => {
    const desk = read('components/RapidDeliveryRevenueDesk.js');
    const revenue = read('pages/change/revenue.js');
    assert.ok(revenue.includes('/admin/rapid-delivery'));
    assert.ok(desk.includes('data-response-draft'));
    assert.ok(!desk.includes('>Send<'));
  });
});
