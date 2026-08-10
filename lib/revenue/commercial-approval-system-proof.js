/**
 * Commercial approval system-proof runner (#714 / WS3 system gate).
 *
 * Independently exercises one synthetic Lead Rescue and one Website Rescue
 * path from qualification → proposal → acceptance → payment evidence →
 * financially_approved handoff. No payment execution, no client sends.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  canMarkFinanciallyApproved,
  evaluateProductPackCompleteness,
  evaluateProposalReady,
  evaluateQualificationSummary,
  evaluateWonLostRecord,
  toOnboardingHandoff,
} from './commercial-approval.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');

export const SYSTEM_PROOF_LR_FIXTURE_REL =
  'fixtures/commercial-approval/system-proof-lead-rescue.json';
export const SYSTEM_PROOF_WR_FIXTURE_REL =
  'fixtures/commercial-approval/system-proof-website-rescue.json';
export const SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL =
  'artifacts/commercial-approval-system-proof/latest-run.json';

const SYNTHETIC_CAPTURED_AT = '2026-08-10T09:30:00Z';

/**
 * @param {string} rel
 * @param {string} [repoRoot]
 */
function loadJson(rel, repoRoot = REPO_ROOT) {
  return JSON.parse(readFileSync(path.join(repoRoot, rel), 'utf8'));
}

/**
 * @param {string} [repoRoot]
 */
export function loadSystemProofLeadRescueOpportunity(repoRoot = REPO_ROOT) {
  return loadJson(SYSTEM_PROOF_LR_FIXTURE_REL, repoRoot);
}

/**
 * @param {string} [repoRoot]
 */
export function loadSystemProofWebsiteRescueOpportunity(repoRoot = REPO_ROOT) {
  return loadJson(SYSTEM_PROOF_WR_FIXTURE_REL, repoRoot);
}

/**
 * Prove fail-closed cases using existing synthetic fixtures.
 *
 * @param {string} [repoRoot]
 */
export function proveFinancialApprovalFailClosed(repoRoot = REPO_ROOT) {
  const pending = loadJson(
    'fixtures/commercial-approval/lead-rescue-accepted-payment-pending.json',
    repoRoot
  );
  const rejected = loadJson('fixtures/commercial-approval/lead-rescue-rejected.json', repoRoot);
  const incomplete = loadJson(
    'fixtures/commercial-approval/website-rescue-incomplete-proposal.json',
    repoRoot
  );

  const pendingGate = canMarkFinanciallyApproved(pending);
  const rejectedGate = canMarkFinanciallyApproved(rejected);
  const incompleteGate = canMarkFinanciallyApproved(incomplete);

  const acceptanceOnly = structuredClone(loadJson(
    'fixtures/commercial-approval/lead-rescue-accepted-approved.json',
    repoRoot
  ));
  delete acceptanceOnly.payment_evidence;
  acceptanceOnly.payment_evidence_status = 'pending';
  const acceptanceOnlyGate = canMarkFinanciallyApproved(acceptanceOnly);

  return {
    payment_pending_denied:
      pendingGate.ok === false && pendingGate.blockers.includes('MISSING_PAYMENT_EVIDENCE'),
    rejected_denied:
      rejectedGate.ok === false &&
      rejectedGate.blockers.includes('PROPOSAL_REJECTED') &&
      rejectedGate.blockers.includes('OPPORTUNITY_LOST'),
    incomplete_proposal_denied: incompleteGate.ok === false,
    acceptance_without_payment_denied:
      acceptanceOnlyGate.ok === false &&
      acceptanceOnlyGate.blockers.includes('MISSING_PAYMENT_EVIDENCE'),
    pending_blockers: pendingGate.blockers,
    rejected_blockers: rejectedGate.blockers,
    incomplete_blockers: incompleteGate.blockers,
    acceptance_only_blockers: acceptanceOnlyGate.blockers,
  };
}

/**
 * Walk one commercial opportunity through qualification → approved handoff.
 *
 * @param {Record<string, unknown>} commercial
 * @param {{ label: string }} meta
 */
export function walkCommercialApprovalPath(commercial, meta) {
  const qualification = evaluateQualificationSummary(commercial);
  const proposalReady = evaluateProposalReady(commercial);
  const gate = canMarkFinanciallyApproved(commercial);
  const wonLost = evaluateWonLostRecord(commercial);
  const handoff = toOnboardingHandoff(commercial);

  /** @type {string[]} */
  const stages = [];
  if (qualification.complete) stages.push('qualification_complete');
  if (qualification.proposal_ready) stages.push('proposal_ready');
  if (proposalReady.ready) stages.push('proposal_pack_ready');
  if (commercial.acceptance?.status === 'accepted' || commercial.acceptance_status === 'accepted') {
    stages.push('accepted');
  }
  const payStatus = String(
    commercial.payment_evidence?.status || commercial.payment_evidence_status || ''
  );
  if (['recorded', 'verified', 'exception_approved'].includes(payStatus)) {
    stages.push('payment_evidence_recorded');
  }
  if (gate.ok) stages.push('financially_approved');
  if (handoff.financially_approved) stages.push('approved_to_onboard');

  return {
    label: meta.label,
    product: commercial.product,
    opportunity_ref: commercial.opportunity_ref,
    stages,
    qualification: {
      complete: qualification.complete,
      proposal_ready: qualification.proposal_ready,
      missing: qualification.missing,
      fit_assessment: qualification.fit_assessment,
    },
    proposal_ready: {
      ready: proposalReady.ready,
      blockers: proposalReady.blockers,
    },
    gate: {
      ok: gate.ok,
      blockers: gate.blockers,
      financially_approved: gate.financially_approved,
    },
    won_lost: wonLost,
    handoff: {
      financially_approved: handoff.financially_approved,
      financial_approval_ref: handoff.financial_approval_ref,
      product: handoff.product,
      commercial_product: handoff.commercial_product,
      opportunity_ref: handoff.opportunity_ref,
      protected_actions_executed: handoff.protected_actions_executed,
      blockers: handoff.blockers,
    },
    ok:
      qualification.complete === true &&
      qualification.proposal_ready === true &&
      proposalReady.ready === true &&
      gate.ok === true &&
      handoff.financially_approved === true &&
      handoff.protected_actions_executed === false &&
      wonLost.ok === true,
  };
}

/**
 * Run independent system proof for Lead Rescue + Website Rescue commercial rail.
 *
 * @param {{ repoRoot?: string, writeArtifact?: boolean }} [options]
 */
export function runCommercialApprovalSystemProof(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const lr = loadSystemProofLeadRescueOpportunity(repoRoot);
  const wr = loadSystemProofWebsiteRescueOpportunity(repoRoot);

  const lrPack = evaluateProductPackCompleteness('lead-rescue', { repoRoot });
  const wrPack = evaluateProductPackCompleteness('website-rescue', { repoRoot });
  const lrWalk = walkCommercialApprovalPath(lr, { label: 'lead-rescue-system' });
  const wrWalk = walkCommercialApprovalPath(wr, { label: 'website-rescue-system' });
  const failClosed = proveFinancialApprovalFailClosed(repoRoot);

  const failClosedOk =
    failClosed.payment_pending_denied &&
    failClosed.rejected_denied &&
    failClosed.incomplete_proposal_denied &&
    failClosed.acceptance_without_payment_denied;

  const ok =
    lrPack.complete &&
    wrPack.complete &&
    lrWalk.ok &&
    wrWalk.ok &&
    failClosedOk;

  /** @type {Record<string, unknown>} */
  const report = {
    schema: 'corpflow.commercial_approval_system_proof.v1',
    issue: 714,
    ran_at: SYNTHETIC_CAPTURED_AT,
    simulation_only: true,
    payment_collection_executed: false,
    bank_action_executed: false,
    external_sends_executed: [],
    pack_completeness: {
      'lead-rescue': lrPack,
      'website-rescue': wrPack,
    },
    paths: {
      'lead-rescue': lrWalk,
      'website-rescue': wrWalk,
    },
    fail_closed_proof: failClosed,
    storage_linking_doc: 'docs/revenue/templates/COMMERCIAL_STORAGE_AND_LINKING.md',
    pricing_packet: 'docs/revenue/PRICING_RECOMMENDATION_PACKET.md',
    ok,
    reason: ok
      ? null
      : [
          !lrPack.complete ? 'LEAD_RESCUE_PACK_INCOMPLETE' : null,
          !wrPack.complete ? 'WEBSITE_RESCUE_PACK_INCOMPLETE' : null,
          !lrWalk.ok ? 'LEAD_RESCUE_PATH_FAILED' : null,
          !wrWalk.ok ? 'WEBSITE_RESCUE_PATH_FAILED' : null,
          !failClosedOk ? 'FAIL_CLOSED_PROOF_FAILED' : null,
        ].filter(Boolean),
  };

  if (options.writeArtifact) {
    const abs = path.join(repoRoot, SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL);
    mkdirSync(path.dirname(abs), { recursive: true });
    writeFileSync(abs, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    report.artifact_path = SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL;
  }

  return report;
}
