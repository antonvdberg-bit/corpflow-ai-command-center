import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  RAPID_DELIVERY_PRODUCT,
  RAPID_DELIVERY_OPERATOR_STATUS_OPTIONS,
  RAPID_DELIVERY_SUMMARY_CARD_DEFS,
  buildRapidDeliveryProposalSummary,
  countRapidDeliverySummaryCards,
  isRapidDeliveryLead,
  isRapidDeliveryOfferSlug,
  leadRowToRapidDeliveryListItem,
  rapidDeliveryReferenceFromLeadId,
  rapidDeliveryStatusLabel,
  rapidDeliveryStatusSelectValue,
} from '../lib/cmp/_lib/rapid-delivery-operator.js';
import { RAPID_DELIVERY_OFFERS } from '../lib/public/rapid-delivery-offers.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function read(rel) {
  return readFileSync(path.join(REPO_ROOT, rel), 'utf8');
}

function exists(rel) {
  return existsSync(path.join(REPO_ROOT, rel));
}

describe('rapid-delivery operator helpers', () => {
  it('accepts known offer slugs only', () => {
    assert.equal(isRapidDeliveryOfferSlug('ai-lead-rescue'), true);
    assert.equal(isRapidDeliveryOfferSlug('lead-rescue'), false);
    assert.equal(isRapidDeliveryOfferSlug('not-a-real-offer'), false);
  });

  it('builds CF- references from lead ids', () => {
    assert.equal(rapidDeliveryReferenceFromLeadId('clxyzABCDEF'), 'CF-ABCDEF');
  });

  it('detects product marker on qualificationJson', () => {
    assert.equal(
      isRapidDeliveryLead({
        qualificationJson: { intake_meta: { product: RAPID_DELIVERY_PRODUCT, offer_slug: 'ai-lead-rescue' } },
      }),
      true,
    );
    assert.equal(isRapidDeliveryLead({ qualificationJson: { intake_meta: { product: 'ai-lead-rescue' } } }), false);
  });

  it('maps human-readable status labels without exposing raw snake_case as the label', () => {
    assert.equal(rapidDeliveryStatusLabel('new_intake'), 'New');
    assert.equal(rapidDeliveryStatusLabel('quote_ready'), 'Proposal required');
    assert.equal(rapidDeliveryStatusLabel('not_fit'), 'Not proceeding');
    assert.equal(rapidDeliveryStatusLabel('qualified'), 'Discovery booked');
    assert.equal(rapidDeliveryStatusLabel('closed'), 'Won');
    assert.equal(rapidDeliveryStatusSelectValue('closed'), 'won');
    assert.ok(RAPID_DELIVERY_OPERATOR_STATUS_OPTIONS.every((o) => !o.label.includes('_')));
  });

  it('counts summary cards from loaded list only', () => {
    const counts = countRapidDeliverySummaryCards([
      { operator_status: 'new_intake' },
      { operator_status: 'new_intake' },
      { operator_status: 'reviewing' },
      { operator_status: 'qualified' },
      { operator_status: 'quote_ready' },
      { operator_status: 'won' },
    ]);
    assert.equal(counts.new, 2);
    assert.equal(counts.reviewing, 1);
    assert.equal(counts.discovery_booked, 1);
    assert.equal(counts.proposal_required, 1);
    assert.equal(counts.won, 1);
    assert.equal(RAPID_DELIVERY_SUMMARY_CARD_DEFS.length, 5);
  });

  it('builds proposal markdown and structured sections with canonical offer URL', () => {
    const summary = buildRapidDeliveryProposalSummary({
      id: 'lead123456',
      name: 'Alex',
      email: 'alex@example.com',
      phone: null,
      message: 'Need alerts',
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          offer_slug: 'ai-lead-rescue',
          business_name: 'Demo Biz',
          enquiry_channels: 'WhatsApp',
          primary_pain: 'Missed enquiries',
          message: 'Need alerts',
        },
      },
    });
    assert.equal(summary.ok, true);
    assert.match(summary.markdown, /CF-/);
    assert.match(summary.markdown, /Enquiry Recovery Sprint/);
    assert.match(summary.markdown, /MUR 85/);
    assert.match(summary.markdown, /Anton approval/);
    assert.match(summary.markdown, /Delivery proof/);
    assert.match(summary.markdown, /corpflowai\.com\/offers\/ai-lead-rescue/);
    assert.ok(!summary.markdown.includes('/offers/lead-rescue'));
    assert.match(summary.markdown, /MUR/);
    assert.match(summary.markdown, /Mauritius delivery-sprint clients pay deposits and balances in MUR/);
    assert.match(summary.markdown, /USD banking for this sprint path is still being obtained/);
    assert.ok(!summary.markdown.includes('Recent Mauritius operators'));
    assert.ok(!summary.markdown.includes('within 48 hours of deposit'));
    assert.ok(summary.sections?.prospect);
    assert.ok(summary.sections?.delivery_proof?.offer_url?.includes('/offers/ai-lead-rescue'));
    assert.ok(summary.plain_text);
  });

  it('maps list items with operator status label and discovery notes', () => {
    const item = leadRowToRapidDeliveryListItem({
      id: 'abcXYZ7890',
      name: 'Pat',
      email: 'pat@example.com',
      phone: null,
      message: 'Extra note',
      status: 'NEW_INTAKE',
      createdAt: new Date('2026-07-14T00:00:00.000Z'),
      tenantId: 'root',
      qualificationJson: {
        intake_meta: {
          product: RAPID_DELIVERY_PRODUCT,
          offer_slug: 'premium-landing-page-rescue',
          business_name: 'Landing Co',
          primary_pain: 'Weak page',
          enquiry_channels: 'Email',
          message: 'Wants mobile rewrite',
        },
        rapid_delivery_operator: { status: 'reviewing' },
      },
    });
    assert.equal(item.offer_slug, 'premium-landing-page-rescue');
    assert.equal(item.offer_path, '/offers/premium-landing-page-rescue');
    assert.equal(item.operator_status, 'reviewing');
    assert.equal(item.operator_status_label, 'Reviewing');
    assert.equal(item.reference, 'CF-YZ7890');
    assert.equal(item.discovery_notes, 'Wants mobile rewrite');
  });
});

describe('rapid-delivery revenue desk UX', () => {
  const desk = read('components/RapidDeliveryRevenueDesk.js');
  const page = read('pages/admin/rapid-delivery/index.js');
  const offers = read('lib/public/rapid-delivery-offers.js');

  it('page uses desk component and keeps admin session gate', () => {
    assert.ok(page.includes('RapidDeliveryRevenueDesk'));
    assert.ok(page.includes('requireAdminPageSession'));
    assert.ok(page.includes('/admin/rapid-delivery'));
  });

  it('desk has human-readable title and summary cards', () => {
    assert.ok(desk.includes('Rapid-delivery discovery desk'));
    assert.ok(desk.includes('CORPFLOWAI REVENUE'));
    assert.ok(desk.includes('data-summary-card'));
    assert.ok(desk.includes('RAPID_DELIVERY_SUMMARY_CARD_DEFS'));
  });

  it('desk does not present raw status option labels like new_intake to operators', () => {
    assert.ok(desk.includes('RAPID_DELIVERY_OPERATOR_STATUS_OPTIONS'));
    assert.ok(desk.includes('opt.label'));
    assert.ok(!desk.includes('>{s}</option>'));
    assert.ok(!desk.includes('MUR rapid-delivery discovery intakes'));
  });

  it('desk includes lead detail fields and proposal sections', () => {
    assert.ok(desk.includes('data-lead-detail'));
    assert.ok(desk.includes('Discovery notes'));
    assert.ok(desk.includes('Enquiry channels'));
    assert.ok(desk.includes('data-proposal-preview'));
    assert.ok(desk.includes('Recommended sprint'));
    assert.ok(desk.includes('Delivery proof'));
    assert.ok(desk.includes('Copy proposal summary'));
    assert.ok(desk.includes('Copy proposal'));
    assert.ok(desk.includes('Copy plain text'));
  });

  it('desk surfaces Website Rescue operator pack for landing-rescue leads', () => {
    assert.ok(desk.includes('data-website-rescue-operator-pack'));
    assert.ok(desk.includes('WEBSITE_RESCUE_QUOTE_READY_PACKET_V1.md'));
  });

  it('desk has no outbound send action and shows manual approval warning', () => {
    assert.ok(desk.includes('External commercial contact remains a manual Anton-approved action.'));
    assert.ok(!desk.includes('>Send<'));
    assert.ok(!desk.includes("'Send'"));
    assert.ok(!desk.includes('"Send"'));
    assert.ok(!desk.includes('mailto:send'));
    assert.ok(!/\bWhatsApp\b/.test(desk));
    assert.ok(!/\bSMS\b/.test(desk));
  });

  it('desk is responsive with mobile cards structure', () => {
    assert.ok(desk.includes('rd-desk-cards'));
    assert.ok(desk.includes('data-lead-card'));
    assert.ok(desk.includes('@media (min-width: 900px)'));
  });

  it('uses canonical live offer routes not /offers/lead-rescue', () => {
    assert.equal(RAPID_DELIVERY_OFFERS['ai-lead-rescue'].path, '/offers/ai-lead-rescue');
    assert.ok(exists('pages/offers/ai-lead-rescue.js'));
    assert.ok(!exists('pages/offers/lead-rescue.js'));
  });

    it('proof language avoids unsupported Mauritius 48-hour metric claim', () => {
    assert.ok(!offers.includes('Recent Mauritius operators'));
    assert.ok(!offers.includes('within 48 hours of deposit clearance'));
    assert.ok(
      offers.includes(
        'CorpFlowAI is Mauritius-based and works with selected owner-led businesses',
      ),
    );
    assert.ok(offers.includes('Currency and payment instructions are confirmed on the invoice before you pay'));
    assert.ok(!offers.includes('USD banking for this path is not yet available'));
  });

  it('public surfaces do not link to admin rapid-delivery', () => {
    const publicFiles = [
      'pages/contact.js',
      'components/RapidDeliveryOfferPage.js',
      'components/CorpFlowPublicHome.js',
      'components/public/DiscoveryIntakeForm.js',
    ];
    for (const f of publicFiles) {
      const src = read(f);
      assert.ok(!src.includes('/admin/rapid-delivery'), `${f} must not link to admin desk`);
    }
  });

  it('auth gate and intake persistence paths remain in place', () => {
    const api = read('lib/server/admin-rapid-delivery-api.js');
    const intake = read('lib/server/tenant-intake.js');
    assert.ok(api.includes('verifyFactoryMasterAuth'));
    assert.ok(intake.includes('corpflow-rapid-delivery') || intake.includes('RAPID_DELIVERY_PRODUCT'));
    assert.ok(intake.includes('prisma.lead.create'));
  });
});
