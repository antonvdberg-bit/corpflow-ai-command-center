/**
 * Commercial approval rail (#714) — focused tests.
 */

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  canMarkFinanciallyApproved,
  evaluateFinancialApprovalGate,
  evaluatePaymentEvidence,
  evaluateProposalCompleteness,
  evaluateWonLostRecord,
  loadCommercialApprovalConfig,
  mapProductForOnboarding,
  normalizeProduct,
  toOnboardingHandoff,
} from '../lib/revenue/commercial-approval.js';

import { canStartBuild as canStartLeadRescueBuild } from '../lib/lead-rescue/onboarding-delivery.js';
import { canStartBuild as canStartWebsiteRescueBuild } from '../lib/website-rescue/onboarding-delivery.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');
const FIX = path.join(REPO_ROOT, 'fixtures', 'commercial-approval');

function loadFixture(name) {
  return JSON.parse(readFileSync(path.join(FIX, name), 'utf8'));
}

describe('commercial-approval-rail config', () => {
  it('loads schema and blocker vocabulary', () => {
    const cfg = loadCommercialApprovalConfig();
    assert.equal(cfg.schema, 'corpflow.commercial_approval_rail.v1');
    assert.equal(cfg.issue, 714);
    assert.ok(Array.isArray(cfg.blocker_codes));
    assert.ok(cfg.blocker_codes.includes('MISSING_PAYMENT_EVIDENCE'));
    assert.ok(cfg.blocker_codes.includes('MISSING_ACCEPTANCE'));
    assert.deepEqual(cfg.products, ['lead-rescue', 'website-rescue']);
  });

  it('normalises product aliases for onboarding map', () => {
    assert.equal(normalizeProduct('ai-lead-rescue'), 'lead-rescue');
    assert.equal(mapProductForOnboarding('lead-rescue'), 'ai-lead-rescue');
    assert.equal(mapProductForOnboarding('website-rescue'), 'website-rescue');
  });
});

describe('accepted and approved scenarios', () => {
  it('Lead Rescue: valid proposal+acceptance+payment+approver → financially_approved', () => {
    const record = loadFixture('lead-rescue-accepted-approved.json');
    const gate = canMarkFinanciallyApproved(record);
    assert.equal(gate.ok, true);
    assert.equal(gate.financially_approved, true);
    assert.deepEqual(gate.blockers, []);
  });

  it('Website Rescue: valid proposal+acceptance+payment+approver → financially_approved', () => {
    const record = loadFixture('website-rescue-accepted-approved.json');
    const gate = evaluateFinancialApprovalGate(record);
    assert.equal(gate.ok, true);
    assert.equal(gate.financially_approved, true);
    assert.deepEqual(gate.blockers, []);
  });
});

describe('fail-closed scenarios', () => {
  it('accepted but payment pending → denied with MISSING_PAYMENT_EVIDENCE', () => {
    const record = loadFixture('lead-rescue-accepted-payment-pending.json');
    const gate = canMarkFinanciallyApproved(record);
    assert.equal(gate.ok, false);
    assert.ok(gate.blockers.includes('MISSING_PAYMENT_EVIDENCE'));
  });

  it('acceptance alone is insufficient', () => {
    const record = loadFixture('lead-rescue-accepted-approved.json');
    delete record.payment_evidence;
    record.payment_evidence_status = 'pending';
    const gate = canMarkFinanciallyApproved(record);
    assert.equal(gate.ok, false);
    assert.ok(gate.blockers.includes('MISSING_PAYMENT_EVIDENCE'));
  });

  it('payment evidence alone is insufficient', () => {
    const record = loadFixture('lead-rescue-accepted-approved.json');
    record.acceptance = { status: 'pending' };
    record.acceptance_status = 'pending';
    record.accepted_by = '';
    record.acceptance_timestamp = '';
    const gate = canMarkFinanciallyApproved(record);
    assert.equal(gate.ok, false);
    assert.ok(gate.blockers.includes('MISSING_ACCEPTANCE'));
  });

  it('rejected opportunity cannot be financially approved and requires lost reason', () => {
    const record = loadFixture('lead-rescue-rejected.json');
    const gate = canMarkFinanciallyApproved(record);
    assert.equal(gate.ok, false);
    assert.ok(gate.blockers.includes('PROPOSAL_REJECTED'));
    assert.ok(gate.blockers.includes('OPPORTUNITY_LOST'));
    const wl = evaluateWonLostRecord(record);
    assert.equal(wl.ok, true);
    assert.equal(wl.reason, 'price');
  });

  it('incomplete proposal missing price/terms cannot progress', () => {
    const record = loadFixture('website-rescue-incomplete-proposal.json');
    const proposal = evaluateProposalCompleteness(record);
    assert.equal(proposal.complete, false);
    assert.ok(proposal.blockers.includes('MISSING_PRICE'));
    assert.ok(proposal.blockers.includes('MISSING_PAYMENT_TERMS'));
    assert.ok(proposal.blockers.includes('MISSING_SCOPE'));
    const gate = canMarkFinanciallyApproved(record);
    assert.equal(gate.ok, false);
  });

  it('incomplete records fail closed when approver missing', () => {
    const record = loadFixture('lead-rescue-accepted-approved.json');
    record.approved_by = '';
    record.approval_timestamp = '';
    const gate = canMarkFinanciallyApproved(record);
    assert.equal(gate.ok, false);
    assert.ok(gate.blockers.includes('MISSING_FINANCIAL_APPROVER'));
    assert.ok(gate.blockers.includes('MISSING_APPROVAL_TIMESTAMP'));
  });

  it('unresolved commercial blocker denies approval', () => {
    const record = loadFixture('lead-rescue-accepted-approved.json');
    record.commercial_blockers = ['awaiting_scope_clarification'];
    const gate = canMarkFinanciallyApproved(record);
    assert.equal(gate.ok, false);
    assert.ok(gate.blockers.includes('UNRESOLVED_COMMERCIAL_BLOCKER'));
  });
});

describe('approved payment exception', () => {
  it('complete exception path can pass', () => {
    const record = loadFixture('lead-rescue-payment-exception-approved.json');
    const payment = evaluatePaymentEvidence(record);
    assert.equal(payment.complete, true);
    assert.equal(payment.via, 'exception');
    const gate = canMarkFinanciallyApproved(record);
    assert.equal(gate.ok, true);
  });

  it('incomplete exception fails', () => {
    const record = loadFixture('lead-rescue-payment-exception-approved.json');
    record.payment_exception = { authorised_by: 'Anton', reason: '', approved_at: '' };
    const gate = canMarkFinanciallyApproved(record);
    assert.equal(gate.ok, false);
    assert.ok(gate.blockers.includes('PAYMENT_EXCEPTION_INCOMPLETE'));
  });
});

describe('product linkage to #715 / #716 onboarding', () => {
  it('approved Lead Rescue handoff satisfies canStartBuild financial gate', () => {
    const commercial = loadFixture('lead-rescue-accepted-approved.json');
    const handoff = toOnboardingHandoff(commercial);
    assert.equal(handoff.financially_approved, true);
    assert.equal(handoff.product, 'ai-lead-rescue');
    assert.equal(handoff.protected_actions_executed, false);

    const lrComplete = JSON.parse(
      readFileSync(
        path.join(REPO_ROOT, 'fixtures/lead-rescue-onboarding/complete.json'),
        'utf8'
      )
    );
    lrComplete.financially_approved = handoff.financially_approved;
    const build = canStartLeadRescueBuild(lrComplete);
    assert.equal(build.ok, true);
  });

  it('approved Website Rescue handoff satisfies canStartBuild financial gate', () => {
    const commercial = loadFixture('website-rescue-accepted-approved.json');
    const handoff = toOnboardingHandoff(commercial);
    assert.equal(handoff.financially_approved, true);
    assert.equal(handoff.product, 'website-rescue');

    const wrComplete = JSON.parse(
      readFileSync(
        path.join(REPO_ROOT, 'fixtures/website-rescue-onboarding/one-page-complete.json'),
        'utf8'
      )
    );
    wrComplete.financially_approved = handoff.financially_approved;
    const build = canStartWebsiteRescueBuild(wrComplete);
    assert.equal(build.ok, true);
  });

  it('denied commercial handoff cannot unlock build', () => {
    const commercial = loadFixture('lead-rescue-accepted-payment-pending.json');
    const handoff = toOnboardingHandoff(commercial);
    assert.equal(handoff.financially_approved, false);

    const lrComplete = JSON.parse(
      readFileSync(
        path.join(REPO_ROOT, 'fixtures/lead-rescue-onboarding/complete.json'),
        'utf8'
      )
    );
    lrComplete.financially_approved = handoff.financially_approved;
    const build = canStartLeadRescueBuild(lrComplete);
    assert.equal(build.ok, false);
    assert.equal(build.reason, 'MISSING_FINANCIAL_APPROVAL');
  });
});

describe('docs and templates exist', () => {
  const docs = [
    'docs/revenue/COMMERCIAL_APPROVAL_RAIL_V1.md',
    'docs/revenue/PRICING_RECOMMENDATION_PACKET.md',
    'docs/revenue/templates/LEAD_RESCUE_PROPOSAL_TEMPLATE.md',
    'docs/revenue/templates/WEBSITE_RESCUE_PROPOSAL_TEMPLATE.md',
    'docs/revenue/templates/COMMERCIAL_ACCEPTANCE_RECORD.md',
    'docs/revenue/templates/PAYMENT_EVIDENCE_RECORD.md',
  ];

  for (const rel of docs) {
    it(`has ${rel}`, () => {
      const text = readFileSync(path.join(REPO_ROOT, rel), 'utf8');
      assert.ok(text.length > 100);
      assert.ok(!/sk_live_|AKIA[0-9A-Z]{16}|BEGIN PRIVATE KEY/.test(text));
    });
  }
});
