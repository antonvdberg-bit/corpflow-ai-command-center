/**
 * Website Rescue system-proof runner (#716 / WS5 system gate).
 *
 * Consumes #714 commercial approval handoff and walks one synthetic path
 * from financially approved → acceptance_ready with simulated deploy/DNS only.
 *
 * No DB writes, no DNS action, no credential storage, no schema/env changes.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { toOnboardingHandoff } from '../revenue/commercial-approval.js';
import {
  canStartBuild,
  createEmptyWebsiteRescueIntake,
  evaluateAcceptanceReady,
  evaluateOnboardingCompleteness,
  evaluateSharedOnboardingChecklist,
  loadWebsiteRescueOnboardingDeliveryConfig,
  transitionDeliveryState,
} from './onboarding-delivery.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');

export const SYSTEM_PROOF_COMMERCIAL_FIXTURE_REL =
  'fixtures/website-rescue-onboarding/system-proof-commercial-opportunity.json';
export const SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL =
  'artifacts/website-rescue-system-proof/latest-run.json';

const SYNTHETIC_CAPTURED_AT = '2026-08-04T06:00:00Z';

/**
 * @param {string} [repoRoot]
 * @returns {Record<string, unknown>}
 */
export function loadSystemProofCommercialOpportunity(repoRoot = REPO_ROOT) {
  const raw = readFileSync(path.join(repoRoot, SYSTEM_PROOF_COMMERCIAL_FIXTURE_REL), 'utf8');
  return JSON.parse(raw);
}

/**
 * Build a complete synthetic Website Rescue intake for the system-proof path.
 *
 * @param {Record<string, unknown>} [config]
 * @returns {Record<string, unknown>}
 */
export function buildSystemProofIntake(config = loadWebsiteRescueOnboardingDeliveryConfig()) {
  const intake = createEmptyWebsiteRescueIntake('rebuild', config);
  intake.business_display_name = 'Synthetic Harbour Studio';
  intake.primary_contact_name = 'Jordan Approver';
  intake.working_email = 'jordan@synthetic-harbour-studio.example';
  intake.working_phone = '+230-555-0716';
  intake.case_type = 'rebuild';
  intake.tier = 'T3';
  intake.current_site_url = 'https://old.synthetic-harbour-studio.example/';
  intake.domain_hostname = 'synthetic-harbour-studio.example';
  intake.hosting_facts_summary =
    'Legacy brochure host; registrar contact confirmed via approved secret channel (no password recorded).';
  intake.brand_assets_status = 'provided';
  intake.pages_in_scope = ['home', 'about', 'services', 'contact'];
  intake.services_or_products_summary =
    'Studio photography packages overview; enquiry for session booking only.';
  intake.content_ownership =
    'Client owns package pricing claims; operator owns layout, Hook/Proof/Depth structure, and CTA hierarchy.';
  intake.enquiry_destination = 'jordan@synthetic-harbour-studio.example';
  intake.design_preferences = 'Guided direction B — warm coastal professional; restrained glass panels.';
  intake.revision_authority = 'Jordan Approver';
  intake.named_approver = 'Jordan Approver';
  intake.review_cadence =
    'Preview feedback within 2 business days; three structured rounds for T3 rebuild.';
  return intake;
}

/**
 * Seed an onboarding/delivery record from a #714 handoff + complete intake.
 *
 * @param {ReturnType<typeof toOnboardingHandoff>} handoff
 * @param {Record<string, unknown>} [options]
 */
export function seedOnboardingRecordFromHandoff(handoff, options = {}) {
  const intake =
    options.intake && typeof options.intake === 'object'
      ? options.intake
      : buildSystemProofIntake();
  const dnsInScope = options.dns_cutover_in_scope !== false;

  return {
    id: 'synthetic-wr-sys-716-onboarding',
    product: 'website-rescue',
    opportunity_ref: handoff.opportunity_ref || '',
    financial_approval_ref: handoff.financial_approval_ref || '',
    commercial_product: handoff.commercial_product || 'website-rescue',
    financially_approved: handoff.financially_approved === true,
    content_assets_ready: false,
    approved_access_confirmed: false,
    dns_cutover_in_scope: dnsInScope,
    deploy_approval_simulated: false,
    dns_cutover_authorized_simulated: false,
    real_dns_cutover_executed: false,
    real_client_production_deploy: false,
    delivery_state: 'approved_to_onboard',
    blocked_inputs: [],
    shared_checklist: {
      'shared.business_identity': false,
      'shared.primary_contact': false,
      'shared.financial_approval': handoff.financially_approved === true,
      'shared.named_approver': false,
      'shared.client_responsibilities_ack': false,
      'shared.exclusions_ack': false,
      'shared.acceptance_measures': false,
      'shared.review_cadence': false,
    },
    intake,
    evidence: {},
    delivery_issue: {
      template: 'docs/operations/templates/website-rescue-delivery-issue.md',
      title: 'Website Rescue delivery — Synthetic Harbour Studio (system-proof)',
      status: 'draft',
      simulation_only: true,
    },
  };
}

/**
 * Mark shared checklist + build-gate flags ready (credentials remain excluded).
 *
 * @param {Record<string, unknown>} record
 */
export function completeOnboardingInputs(record) {
  const row = { ...record };
  row.shared_checklist = {
    'shared.business_identity': true,
    'shared.primary_contact': true,
    'shared.financial_approval': row.financially_approved === true,
    'shared.named_approver': true,
    'shared.client_responsibilities_ack': true,
    'shared.exclusions_ack': true,
    'shared.acceptance_measures': true,
    'shared.review_cadence': true,
  };
  row.content_assets_ready = true;
  row.approved_access_confirmed = true;
  row.blocked_inputs = [];
  row.delivery_issue = {
    ...(row.delivery_issue && typeof row.delivery_issue === 'object' ? row.delivery_issue : {}),
    status: 'opened',
    opened_at: SYNTHETIC_CAPTURED_AT,
    note: 'Bounded delivery issue opened after onboarding inputs complete; deploy/DNS remain simulated.',
  };
  return row;
}

/**
 * Evidence packets attached during the simulated path (no real URLs/credentials).
 *
 * @param {Record<string, unknown>} record
 */
export function buildSystemProofEvidence(record) {
  const dnsInScope = record.dns_cutover_in_scope === true;
  return {
    preview: {
      preview_url_or_artefact:
        'artifacts/website-rescue-system-proof/latest-run.json#preview',
      captured_at: '2026-08-04T06:10:00Z',
      operator_note:
        'Synthetic managed preview for Harbour Studio rebuild (home/about/services/contact).',
    },
    revision: {
      round: 1,
      reviewer: 'Jordan Approver',
      decision: 'approve',
      feedback_summary: 'Services wording and primary CTA accepted; no further revision.',
      captured_at: '2026-08-04T06:20:00Z',
    },
    deploy_approval: {
      approver: 'Jordan Approver',
      approved_at: '2026-08-04T06:30:00Z',
      simulation_only: true,
      operator_note: 'Deploy approval simulated for #716 system-proof; no production deploy executed.',
    },
    dns_cutover: dnsInScope
      ? {
          in_scope: true,
          authorization_status: 'simulated_authorized',
          simulation_only: true,
          operator_note:
            'DNS cutover authorization simulated only; real client_production cutover not performed.',
        }
      : {
          in_scope: false,
          authorization_status: 'not_required',
          simulation_only: true,
          operator_note: 'DNS cutover not in scope for this synthetic path.',
        },
    live_validation: {
      checks: [
        'preview_primary_url_reachable_simulated',
        'enquiry_path_test_submission_simulated',
        'mobile_layout_pass_simulated',
      ],
      pass_fail: 'pass',
      captured_at: '2026-08-04T06:40:00Z',
      operator_note:
        'Live-validation simulated against synthetic checks; no client hostname changed.',
    },
    acceptance: {
      accepted_by: 'Jordan Approver',
      accepted_at: '2026-08-04T06:50:00Z',
      acceptance_measures_met: true,
    },
    handover: {
      handover_sent_at: '2026-08-04T07:00:00Z',
      channels: ['synthetic_draft_email'],
      support_boundary_summary:
        'Quoted pages as accepted; change requests via named approver; no ongoing edits included.',
      what_was_built:
        'T3 bounded rebuild: home, about, services, contact on managed preview path (simulated).',
    },
    maintenance_boundary: {
      in_scope: 'Quoted pages as accepted at handover',
      out_of_scope:
        'Ongoing copy edits, new pages, SEO campaigns, DNS changes, Lead Rescue monitoring',
      escalation_contact: 'Jordan Approver',
      optional_maintenance_offer: 'deferred',
    },
  };
}

/**
 * Prove build cannot progress without financial approval, content/assets, or access.
 *
 * @param {Record<string, unknown>} readyRecord — intake-complete record that would otherwise build
 */
export function proveBuildGateBlocks(readyRecord) {
  const base = {
    ...readyRecord,
    delivery_state: 'onboarding_complete',
    blocked_inputs: [],
    content_assets_ready: true,
    approved_access_confirmed: true,
    financially_approved: true,
  };

  const missingFinancial = canStartBuild({ ...base, financially_approved: false });
  const missingContent = canStartBuild({ ...base, content_assets_ready: false });
  const missingAccess = canStartBuild({ ...base, approved_access_confirmed: false });

  const transitionFinancial = transitionDeliveryState(
    { ...base, financially_approved: false },
    'build_started',
  );
  const transitionContent = transitionDeliveryState(
    { ...base, content_assets_ready: false },
    'build_started',
  );
  const transitionAccess = transitionDeliveryState(
    { ...base, approved_access_confirmed: false },
    'build_started',
  );

  return {
    missing_financial_approval: {
      can_start_build: missingFinancial,
      transition: {
        ok: transitionFinancial.ok,
        reason: transitionFinancial.reason,
        gate_reason: transitionFinancial.gate?.reason || null,
      },
    },
    missing_content_or_assets: {
      can_start_build: missingContent,
      transition: {
        ok: transitionContent.ok,
        reason: transitionContent.reason,
        gate_reason: transitionContent.gate?.reason || null,
      },
    },
    missing_approved_access: {
      can_start_build: missingAccess,
      transition: {
        ok: transitionAccess.ok,
        reason: transitionAccess.reason,
        gate_reason: transitionAccess.gate?.reason || null,
      },
    },
  };
}

/**
 * Walk the full synthetic delivery path with simulated deploy/DNS gates.
 *
 * @param {Record<string, unknown>} record
 * @param {{ includeRevisionCycle?: boolean }} [options]
 */
export function walkSystemProofDeliveryPath(record, options = {}) {
  const includeRevision = options.includeRevisionCycle !== false;
  /** @type {Array<{ from: string, to: string, ok: boolean, reason?: string }>} */
  const transitions = [];
  let current = { ...record };

  const pathStates = [
    'onboarding_in_progress',
    'onboarding_complete',
    'build_started',
    'preview_evidence',
  ];
  if (includeRevision) {
    pathStates.push('revision_cycle');
  }
  pathStates.push(
    'deploy_approval_pending',
    'deploy_approved_simulated',
    'dns_cutover_gated',
    'live_validation_simulated',
    'accepted',
    'handover_complete',
    'acceptance_ready',
  );

  for (const next of pathStates) {
    if (next === 'preview_evidence') {
      current.evidence = buildSystemProofEvidence(current);
    }
    if (next === 'deploy_approved_simulated') {
      current.deploy_approval_simulated = true;
    }
    if (next === 'live_validation_simulated' && current.dns_cutover_in_scope === true) {
      current.dns_cutover_authorized_simulated = true;
    }

    const from = String(current.delivery_state || '');
    const result = transitionDeliveryState(current, next);
    transitions.push({
      from,
      to: next,
      ok: result.ok === true,
      reason: result.ok ? undefined : result.reason,
    });
    if (!result.ok) {
      return {
        ok: false,
        record: current,
        transitions,
        failed_at: next,
        reason: result.reason,
        gate: result.gate || null,
      };
    }
    current = result.record;
  }

  return {
    ok: true,
    record: current,
    transitions,
    acceptance: evaluateAcceptanceReady(current),
  };
}

/**
 * Run the independent Website Rescue system-proof path.
 *
 * @param {{ repoRoot?: string, writeArtifact?: boolean }} [options]
 */
export function runWebsiteRescueSystemProof(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const commercial = loadSystemProofCommercialOpportunity(repoRoot);
  const handoff = toOnboardingHandoff(commercial);

  /** @type {Record<string, unknown>} */
  const report = {
    schema: 'corpflow.website_rescue_system_proof.v1',
    issue: 716,
    product: 'website-rescue',
    ran_at: SYNTHETIC_CAPTURED_AT,
    simulation_only: true,
    real_dns_cutover_executed: false,
    real_client_production_deploy: false,
    commercial: {
      opportunity_ref: commercial.opportunity_ref,
      financial_approval_ref: commercial.financial_approval_ref,
      proposal_version: commercial.proposal_version,
      case_type: commercial.proposal?.case_type || null,
    },
    handoff: {
      financially_approved: handoff.financially_approved,
      financial_approval_ref: handoff.financial_approval_ref,
      product: handoff.product,
      commercial_product: handoff.commercial_product,
      opportunity_ref: handoff.opportunity_ref,
      blockers: handoff.blockers,
      protected_actions_executed: handoff.protected_actions_executed,
    },
  };

  if (handoff.financially_approved !== true) {
    report.ok = false;
    report.reason = 'COMMERCIAL_HANDOFF_NOT_APPROVED';
    report.blockers = handoff.blockers;
    return report;
  }

  let record = seedOnboardingRecordFromHandoff(handoff, { dns_cutover_in_scope: true });
  const intakeBefore = evaluateOnboardingCompleteness(record.intake);
  const sharedBefore = evaluateSharedOnboardingChecklist(record);
  const buildBeforeInputs = canStartBuild(record);

  record = completeOnboardingInputs(record);
  const intakeAfter = evaluateOnboardingCompleteness(record.intake);
  const sharedAfter = evaluateSharedOnboardingChecklist(record);
  const buildAfterInputs = canStartBuild(record);
  const gateBlocks = proveBuildGateBlocks(record);

  const walk = walkSystemProofDeliveryPath(record, { includeRevisionCycle: true });

  report.onboarding = {
    id: record.id,
    intake_complete_before_flags: intakeBefore.complete,
    shared_complete_before_flags: sharedBefore.complete,
    build_ok_before_inputs: buildBeforeInputs.ok,
    build_reason_before_inputs: buildBeforeInputs.reason || null,
    intake_complete_after_inputs: intakeAfter.complete,
    shared_complete_after_inputs: sharedAfter.complete,
    build_ok_after_inputs: buildAfterInputs.ok,
    missing_intake: intakeAfter.missing,
  };
  report.gate_block_proof = gateBlocks;
  report.delivery = {
    ok: walk.ok,
    final_state: walk.record?.delivery_state || null,
    transitions: walk.transitions,
    failed_at: walk.failed_at || null,
    reason: walk.reason || null,
    acceptance_ready: walk.acceptance || null,
  };
  report.final_record = {
    id: walk.record?.id,
    opportunity_ref: walk.record?.opportunity_ref,
    financial_approval_ref: walk.record?.financial_approval_ref,
    delivery_state: walk.record?.delivery_state,
    case_type: walk.record?.intake?.case_type,
    tier: walk.record?.intake?.tier,
    pages_in_scope: walk.record?.intake?.pages_in_scope,
    dns_cutover_in_scope: walk.record?.dns_cutover_in_scope,
    deploy_approval_simulated: walk.record?.deploy_approval_simulated,
    dns_cutover_authorized_simulated: walk.record?.dns_cutover_authorized_simulated,
    real_dns_cutover_executed: walk.record?.real_dns_cutover_executed,
    real_client_production_deploy: walk.record?.real_client_production_deploy,
    evidence_packet_ids: Object.keys(walk.record?.evidence || {}),
    delivery_issue: walk.record?.delivery_issue || null,
  };

  const blocksOk =
    gateBlocks.missing_financial_approval.can_start_build.ok === false &&
    gateBlocks.missing_financial_approval.can_start_build.reason ===
      'MISSING_FINANCIAL_APPROVAL' &&
    gateBlocks.missing_content_or_assets.can_start_build.ok === false &&
    gateBlocks.missing_content_or_assets.can_start_build.reason ===
      'MISSING_CONTENT_OR_ASSETS' &&
    gateBlocks.missing_approved_access.can_start_build.ok === false &&
    gateBlocks.missing_approved_access.can_start_build.reason === 'MISSING_APPROVED_ACCESS';

  report.ok =
    walk.ok === true &&
    walk.acceptance?.ok === true &&
    buildAfterInputs.ok === true &&
    blocksOk === true &&
    walk.record?.real_dns_cutover_executed === false &&
    walk.record?.real_client_production_deploy === false;

  if (options.writeArtifact !== false) {
    const outPath = path.join(repoRoot, SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    report.artifact_path = SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL;
  }

  return report;
}
