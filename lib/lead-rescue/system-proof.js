/**
 * Lead Rescue system-proof runner (#715 / WS4 system gate).
 *
 * Consumes #714 commercial approval handoff and walks one synthetic path
 * from financially approved → acceptance_ready with messaging runtime off.
 *
 * No DB writes, no client sends, no schema/env changes.
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { toOnboardingHandoff } from '../revenue/commercial-approval.js';
import {
  canStartBuild,
  canUseMessagingRuntime,
  createEmptyLeadRescueIntake,
  evaluateAcceptanceReady,
  evaluateOnboardingCompleteness,
  evaluateSharedOnboardingChecklist,
  loadLeadRescueOnboardingDeliveryConfig,
  transitionDeliveryState,
} from './onboarding-delivery.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');

export const SYSTEM_PROOF_COMMERCIAL_FIXTURE_REL =
  'fixtures/lead-rescue-onboarding/system-proof-commercial-opportunity.json';
export const SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL =
  'artifacts/lead-rescue-system-proof/latest-run.json';

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
 * Build a complete synthetic Lead Rescue intake for the system-proof path.
 *
 * @param {Record<string, unknown>} [config]
 * @returns {Record<string, unknown>}
 */
export function buildSystemProofIntake(config = loadLeadRescueOnboardingDeliveryConfig()) {
  const intake = createEmptyLeadRescueIntake(config);
  intake.business_display_name = 'Synthetic Lagoon Rentals';
  intake.primary_contact_name = 'Sam Approver';
  intake.working_whatsapp = '+230-555-0715';
  intake.working_email = 'sam@synthetic-lagoon-rentals.example';
  intake.timezone = 'Indian/Mauritius';
  intake.enquiry_sources = ['website_form', 'whatsapp', 'facebook'];
  intake.primary_leaky_source = 'website_form';
  intake.current_process_summary =
    'Owner checks WhatsApp sporadically; website form emails often sit unread overnight.';
  intake.users_operators = ['Sam Approver', 'Casey Desk'];
  intake.lead_stages = [
    'new',
    'replied',
    'followed-up',
    'qualified',
    'quote-sent',
    'won',
    'lost',
    'no-response',
  ];
  intake.escalation_rules =
    'If no owner reply within 4 business hours, operator pings Sam Approver once; after-hours alerts fire but reply expected next morning.';
  intake.approved_response_rules =
    'Acknowledge enquiry, confirm interest area, offer viewing window. No pricing guarantees. No medical/legal advice. No auto-reply as the business without messaging-runtime authorisation.';
  intake.test_scenarios = [
    'marked_test_enquiry_end_to_end',
    'after_hours_alert_path_simulated',
    'daily_summary_draft_only',
  ];
  intake.reporting_requirements =
    'Daily summary draft at 17:00 local; pilot metric = every new enquiry on board within 15 minutes.';
  intake.named_approver = 'Sam Approver';
  intake.client_responsibilities = Array.isArray(config.default_client_responsibilities)
    ? [...config.default_client_responsibilities]
    : [];
  intake.exclusions = Array.isArray(config.default_exclusions) ? [...config.default_exclusions] : [];
  intake.acceptance_measures = Array.isArray(config.default_acceptance_measures)
    ? [...config.default_acceptance_measures]
    : [];
  intake.review_cadence =
    'Preview feedback within 2 business days; day-1 / day-3 / day-7 during monitoring window.';
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

  return {
    id: 'synthetic-lr-sys-715-onboarding',
    product: 'ai-lead-rescue',
    opportunity_ref: handoff.opportunity_ref || '',
    financial_approval_ref: handoff.financial_approval_ref || '',
    commercial_product: handoff.commercial_product || 'lead-rescue',
    financially_approved: handoff.financially_approved === true,
    messaging_runtime_authorized: false,
    allow_real_client_sends: false,
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
      template: 'docs/operations/templates/lead-rescue-delivery-issue.md',
      title: 'Lead Rescue delivery — Synthetic Lagoon Rentals (system-proof)',
      status: 'draft',
      simulation_only: true,
    },
  };
}

/**
 * Mark shared checklist ready and open the bounded delivery issue.
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
  row.blocked_inputs = [];
  row.messaging_runtime_authorized = false;
  row.allow_real_client_sends = false;
  row.delivery_issue = {
    ...(row.delivery_issue && typeof row.delivery_issue === 'object' ? row.delivery_issue : {}),
    status: 'opened',
    opened_at: SYNTHETIC_CAPTURED_AT,
    note: 'Bounded delivery issue opened after onboarding inputs complete; messaging runtime remains off.',
  };
  return row;
}

/**
 * Evidence packets for the synthetic Lead Rescue path (no real sends).
 *
 * @param {Record<string, unknown>} record
 */
export function buildSystemProofEvidence(record) {
  return {
    preview: {
      preview_url_or_artefact: 'artifacts/lead-rescue-system-proof/latest-run.json#preview',
      captured_at: '2026-08-04T06:10:00Z',
      operator_note:
        'Synthetic operator board preview for Lagoon Rentals — lead stages + one connected source (simulated).',
    },
    verification: {
      test_scenario_ids: Array.isArray(record?.intake?.test_scenarios)
        ? [...record.intake.test_scenarios]
        : ['marked_test_enquiry_end_to_end'],
      pass_fail: 'pass',
      captured_at: '2026-08-04T06:20:00Z',
      operator_note:
        'Internal verification simulated: marked test enquiry visible; alert path operator-side only; no WhatsApp/email runtime.',
    },
    client_review: {
      reviewer: 'Sam Approver',
      reviewed_at: '2026-08-04T06:30:00Z',
      decision: 'approve_with_changes',
      feedback_summary:
        'Daily summary wording accepted; escalate after-hours note clarified. Changes agreed — proceed to acceptance.',
    },
    acceptance: {
      accepted_by: 'Sam Approver',
      accepted_at: '2026-08-04T06:45:00Z',
      acceptance_measures_met: true,
    },
    handover: {
      handover_sent_at: '2026-08-04T07:00:00Z',
      channels: ['synthetic_draft_email'],
      support_boundary_summary:
        'Pilot board + one source + operator alerts as accepted; no auto-reply; change requests via Sam Approver.',
      monitoring_window: '2026-08-05 to 2026-08-12 (7-day synthetic monitoring window)',
    },
    support_boundary: {
      in_scope:
        'One connected enquiry source, operator alert path, pilot board stages, daily summary draft channel',
      out_of_scope:
        'WhatsApp/email/SMS automated runtime, second lead source, CRM migration, revenue guarantees, client_production deploy/DNS',
      escalation_contact: 'Sam Approver',
      review_cadence:
        'day-1 / day-3 / day-7 during monitoring; then optional monthly check-in (deferred offer)',
    },
  };
}

/**
 * Prove build cannot progress without financial approval or required inputs,
 * and messaging runtime stays gated.
 *
 * @param {Record<string, unknown>} readyRecord
 */
export function proveBuildGateBlocks(readyRecord) {
  const base = {
    ...readyRecord,
    delivery_state: 'onboarding_complete',
    blocked_inputs: [],
    financially_approved: true,
    messaging_runtime_authorized: false,
    allow_real_client_sends: false,
  };

  const missingFinancial = canStartBuild({ ...base, financially_approved: false });
  const missingInputs = canStartBuild({
    ...base,
    intake: {
      ...(base.intake && typeof base.intake === 'object' ? base.intake : {}),
      primary_leaky_source: '',
      enquiry_sources: [],
    },
  });
  const blockedInputs = canStartBuild({
    ...base,
    blocked_inputs: ['client_waiting_on_form_forwarding'],
  });

  const transitionFinancial = transitionDeliveryState(
    { ...base, financially_approved: false },
    'build_started',
  );
  const transitionInputs = transitionDeliveryState(
    {
      ...base,
      intake: {
        ...(base.intake && typeof base.intake === 'object' ? base.intake : {}),
        primary_leaky_source: '',
        enquiry_sources: [],
      },
    },
    'build_started',
  );

  const messagingGate = canUseMessagingRuntime(base);
  const messagingGateForced = canUseMessagingRuntime({
    ...base,
    messaging_runtime_authorized: true,
  });

  return {
    missing_financial_approval: {
      can_start_build: missingFinancial,
      transition: {
        ok: transitionFinancial.ok,
        reason: transitionFinancial.reason,
        gate_reason: transitionFinancial.gate?.reason || null,
      },
    },
    missing_required_client_inputs: {
      can_start_build: missingInputs,
      transition: {
        ok: transitionInputs.ok,
        reason: transitionInputs.reason,
        gate_reason: transitionInputs.gate?.reason || null,
      },
    },
    blocked_client_inputs: {
      can_start_build: blockedInputs,
    },
    messaging_runtime_gate: {
      unauthorized: messagingGate,
      authorized_flag_only: messagingGateForced,
      note: 'System-proof path keeps messaging_runtime_authorized=false; authorization flag alone does not send.',
    },
  };
}

/**
 * Walk the full synthetic Lead Rescue delivery path.
 *
 * Path:
 * approved_to_onboard → onboarding_in_progress → onboarding_complete →
 * build_started → preview_evidence → verification_evidence → client_review →
 * accepted → handover_complete → acceptance_ready
 *
 * @param {Record<string, unknown>} record
 * @param {{ includeClientReviewLoop?: boolean }} [options]
 */
export function walkSystemProofDeliveryPath(record, options = {}) {
  const includeClientReviewLoop = options.includeClientReviewLoop === true;
  /** @type {Array<{ from: string, to: string, ok: boolean, reason?: string }>} */
  const transitions = [];
  let current = { ...record };

  /** @type {string[]} */
  const pathStates = [
    'onboarding_in_progress',
    'onboarding_complete',
    'build_started',
    'preview_evidence',
    'verification_evidence',
    'client_review',
  ];

  if (includeClientReviewLoop) {
    // Simulate agreed changes: return to preview then re-enter review.
    pathStates.push('preview_evidence', 'verification_evidence', 'client_review');
  }

  pathStates.push('accepted', 'handover_complete', 'acceptance_ready');

  for (const next of pathStates) {
    if (next === 'preview_evidence' && (!current.evidence || Object.keys(current.evidence).length === 0)) {
      current.evidence = buildSystemProofEvidence(current);
    }
    if (next === 'client_review' && includeClientReviewLoop && current.evidence?.client_review) {
      // After first review loop, decision becomes approve.
      current.evidence = {
        ...current.evidence,
        client_review: {
          ...current.evidence.client_review,
          decision: 'approve',
          feedback_summary: 'Agreed changes verified on second preview; accept.',
          reviewed_at: '2026-08-04T06:40:00Z',
        },
      };
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
    messaging: canUseMessagingRuntime(current),
  };
}

/**
 * Run the independent Lead Rescue system-proof path.
 *
 * @param {{ repoRoot?: string, writeArtifact?: boolean, includeClientReviewLoop?: boolean }} [options]
 */
export function runLeadRescueSystemProof(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const commercial = loadSystemProofCommercialOpportunity(repoRoot);
  const handoff = toOnboardingHandoff(commercial);

  /** @type {Record<string, unknown>} */
  const report = {
    schema: 'corpflow.lead_rescue_system_proof.v1',
    issue: 715,
    product: 'ai-lead-rescue',
    ran_at: SYNTHETIC_CAPTURED_AT,
    simulation_only: true,
    messaging_runtime_authorized: false,
    allow_real_client_sends: false,
    external_sends_executed: [],
    commercial: {
      opportunity_ref: commercial.opportunity_ref,
      financial_approval_ref: commercial.financial_approval_ref,
      proposal_version: commercial.proposal_version,
      offer_kind: commercial.offer_kind || commercial.proposal?.offer_kind || null,
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

  let record = seedOnboardingRecordFromHandoff(handoff);
  const intakeBefore = evaluateOnboardingCompleteness(record.intake);
  const sharedBefore = evaluateSharedOnboardingChecklist(record);
  const buildBeforeInputs = canStartBuild(record);

  record = completeOnboardingInputs(record);
  const intakeAfter = evaluateOnboardingCompleteness(record.intake);
  const sharedAfter = evaluateSharedOnboardingChecklist(record);
  const buildAfterInputs = canStartBuild(record);
  const gateBlocks = proveBuildGateBlocks(record);

  const walk = walkSystemProofDeliveryPath(record, {
    includeClientReviewLoop: options.includeClientReviewLoop !== false,
  });

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
    enquiry_sources: record.intake?.enquiry_sources || [],
    primary_leaky_source: record.intake?.primary_leaky_source || null,
    users_operators: record.intake?.users_operators || [],
    lead_stages: record.intake?.lead_stages || [],
    escalation_rules_present: Boolean(record.intake?.escalation_rules),
    approved_response_rules_present: Boolean(record.intake?.approved_response_rules),
    test_scenarios: record.intake?.test_scenarios || [],
    reporting_requirements_present: Boolean(record.intake?.reporting_requirements),
    client_responsibilities_count: Array.isArray(record.intake?.client_responsibilities)
      ? record.intake.client_responsibilities.length
      : 0,
    exclusions_count: Array.isArray(record.intake?.exclusions) ? record.intake.exclusions.length : 0,
    acceptance_measures_count: Array.isArray(record.intake?.acceptance_measures)
      ? record.intake.acceptance_measures.length
      : 0,
    review_cadence: record.intake?.review_cadence || null,
  };
  report.gate_block_proof = gateBlocks;
  report.delivery = {
    ok: walk.ok,
    final_state: walk.record?.delivery_state || null,
    transitions: walk.transitions,
    failed_at: walk.failed_at || null,
    reason: walk.reason || null,
    acceptance_ready: walk.acceptance || null,
    messaging: walk.messaging || null,
  };
  report.final_record = {
    id: walk.record?.id,
    opportunity_ref: walk.record?.opportunity_ref,
    financial_approval_ref: walk.record?.financial_approval_ref,
    delivery_state: walk.record?.delivery_state,
    messaging_runtime_authorized: walk.record?.messaging_runtime_authorized,
    allow_real_client_sends: walk.record?.allow_real_client_sends,
    evidence_packet_ids: Object.keys(walk.record?.evidence || {}),
    delivery_issue: walk.record?.delivery_issue || null,
    support_boundary: walk.record?.evidence?.support_boundary || null,
    handover: walk.record?.evidence?.handover || null,
  };

  const blocksOk =
    gateBlocks.missing_financial_approval.can_start_build.ok === false &&
    gateBlocks.missing_financial_approval.can_start_build.reason ===
      'MISSING_FINANCIAL_APPROVAL' &&
    gateBlocks.missing_required_client_inputs.can_start_build.ok === false &&
    gateBlocks.missing_required_client_inputs.can_start_build.reason ===
      'MISSING_REQUIRED_CLIENT_INPUTS' &&
    gateBlocks.blocked_client_inputs.can_start_build.ok === false &&
    gateBlocks.blocked_client_inputs.can_start_build.reason === 'BLOCKED_CLIENT_INPUTS' &&
    gateBlocks.messaging_runtime_gate.unauthorized.ok === false;

  report.ok =
    walk.ok === true &&
    walk.acceptance?.ok === true &&
    buildAfterInputs.ok === true &&
    blocksOk === true &&
    walk.record?.messaging_runtime_authorized === false &&
    walk.record?.allow_real_client_sends === false &&
    Array.isArray(report.external_sends_executed) &&
    report.external_sends_executed.length === 0;

  if (options.writeArtifact !== false) {
    const outPath = path.join(repoRoot, SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    report.artifact_path = SYSTEM_PROOF_EVIDENCE_ARTIFACT_REL;
  }

  return report;
}
