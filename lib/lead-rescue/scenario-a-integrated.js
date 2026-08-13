/**
 * Lead Rescue Scenario A integrated proof (#715 / WS4 integrated gate).
 *
 * Composes the merged #711 Scenario A runner and the merged #715 unit/system
 * contracts. Does not rebuild onboarding validators or the independent
 * system-proof path.
 *
 * Synthetic data only. No messaging runtime. No client_production deploy.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runScenarioALeadRescue } from '../gtm/integrated-scenarios-711.js';
import {
  canUseMessagingRuntime,
  evaluateAcceptanceReady,
  evaluateEvidencePacket,
  loadLeadRescueOnboardingDeliveryConfig,
} from './onboarding-delivery.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');

export const SCENARIO_A_INTEGRATED_ARTIFACT_REL =
  'artifacts/lead-rescue-scenario-a-integrated/latest-run.json';
export const SCENARIO_A_INTEGRATED_RUN_ID = 'WS4-715-SCENARIO-A-20260813';
export const SCENARIO_A_INTEGRATED_RAN_AT = '2026-08-13T07:30:00.000Z';

const REQUIRED_PACKET_IDS = [
  'preview',
  'verification',
  'client_review',
  'acceptance',
  'handover',
  'support_boundary',
];

/**
 * Remaining Anton-protected gates that this WS4 packet does **not** open.
 * They are out of lane and are not blockers for closing the synthetic
 * Scenario A integrated gate.
 */
export const OUT_OF_LANE_PROTECTED_GATES = Object.freeze([
  {
    id: 'messaging_runtime',
    owner: 'Anton',
    required_to_close_715: false,
    status: 'closed_for_this_lane',
    note: 'messaging_runtime_authorized remains false. Real WhatsApp/email/SMS send requires a separate Anton-protected gate.',
  },
  {
    id: 'client_production_deploy',
    owner: 'Anton',
    required_to_close_715: false,
    status: 'closed_for_this_lane',
    note: 'Scenario A completes on synthetic data only. client_production deploy/DNS is not in WS4 scope.',
  },
]);

/**
 * Evaluate Scenario A evidence packets against the #715 contract.
 *
 * @param {ReturnType<typeof runScenarioALeadRescue>} scenarioA
 * @param {Record<string, unknown>} [config]
 */
export function evaluateScenarioAHandoverEvidence(scenarioA, config = loadLeadRescueOnboardingDeliveryConfig()) {
  const evidence =
    scenarioA?.evidence && typeof scenarioA.evidence === 'object' ? scenarioA.evidence : {};
  const record = {
    delivery_state: scenarioA?.final_delivery_state || null,
    messaging_runtime_authorized: scenarioA?.messaging_runtime_authorized === true,
    allow_real_client_sends: false,
    evidence,
  };

  /** @type {Record<string, ReturnType<typeof evaluateEvidencePacket>>} */
  const packets = {};
  /** @type {string[]} */
  const incomplete = [];
  for (const id of REQUIRED_PACKET_IDS) {
    const result = evaluateEvidencePacket(record, id, config);
    packets[id] = result;
    if (!result.ok) incomplete.push(id);
  }

  const acceptance = evaluateAcceptanceReady(record, config);
  const messaging = canUseMessagingRuntime(record);
  const handover = evidence.handover && typeof evidence.handover === 'object' ? evidence.handover : null;
  const channels = Array.isArray(handover?.channels) ? handover.channels.map((c) => String(c)) : [];
  const handoverSyntheticOnly =
    channels.length > 0 &&
    channels.every((c) => /synthetic|draft/i.test(c) && !/whatsapp|sms|live.?send/i.test(c));

  return {
    ok:
      incomplete.length === 0 &&
      acceptance.ok === true &&
      messaging.ok === false &&
      handoverSyntheticOnly &&
      record.delivery_state === 'acceptance_ready',
    record_state: record.delivery_state,
    packets,
    incomplete,
    acceptance,
    messaging,
    handover,
    support_boundary:
      evidence.support_boundary && typeof evidence.support_boundary === 'object'
        ? evidence.support_boundary
        : null,
    handover_channels: channels,
    handover_synthetic_only: handoverSyntheticOnly,
  };
}

/**
 * Run #711 Scenario A and record #715 WS4 integrated-gate evidence.
 *
 * @param {{ repoRoot?: string, writeArtifact?: boolean }} [options]
 */
export function runLeadRescueScenarioAIntegrated(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const scenarioA = runScenarioALeadRescue();
  const handoverEvidence = evaluateScenarioAHandoverEvidence(scenarioA);

  const inLaneBlockers = [];
  if (scenarioA.ok !== true) {
    inLaneBlockers.push({
      id: 'scenario_a_composer_failed',
      reason: scenarioA.reason || scenarioA.actual || 'SCENARIO_A_FAILED',
    });
  }
  if (handoverEvidence.ok !== true) {
    inLaneBlockers.push({
      id: 'handover_evidence_incomplete',
      incomplete: handoverEvidence.incomplete,
      acceptance_reason: handoverEvidence.acceptance?.reason || null,
    });
  }

  const ok =
    scenarioA.ok === true &&
    handoverEvidence.ok === true &&
    Array.isArray(scenarioA.external_sends_executed) &&
    scenarioA.external_sends_executed.length === 0 &&
    scenarioA.messaging_runtime_authorized === false &&
    scenarioA.production_client_deployment === false &&
    inLaneBlockers.length === 0;

  const report = {
    schema: 'corpflow.lead_rescue_scenario_a_integrated.v1',
    issue: 715,
    parent: 711,
    controller: 710,
    generation: 3,
    run_id: SCENARIO_A_INTEGRATED_RUN_ID,
    ran_at: SCENARIO_A_INTEGRATED_RAN_AT,
    simulation_only: true,
    reuses: {
      scenario_a: 'lib/gtm/integrated-scenarios-711.js#runScenarioALeadRescue',
      unit_contract: 'lib/lead-rescue/onboarding-delivery.js',
      system_proof: 'lib/lead-rescue/system-proof.js (not re-run; merged #745)',
      commercial_rail: 'lib/revenue/commercial-approval.js (consumed via Scenario A)',
    },
    scenario_a: {
      ok: scenarioA.ok === true,
      verdict: scenarioA.verdict,
      run_id: scenarioA.ids?.run_id || null,
      enquiry_ref: scenarioA.ids?.enquiry_ref || null,
      prospect_ref: scenarioA.ids?.prospect_ref || null,
      opportunity_ref: scenarioA.ids?.opportunity_ref || null,
      financial_approval_ref: scenarioA.ids?.financial_approval_ref || null,
      onboarding_id: scenarioA.ids?.onboarding_id || null,
      delivery_ref: scenarioA.ids?.delivery_ref || null,
      final_prospect_stage: scenarioA.final_prospect_stage,
      final_delivery_state: scenarioA.final_delivery_state,
      ledger_steps: Array.isArray(scenarioA.ledger)
        ? scenarioA.ledger.map((row) => ({ step: row.step, ok: row.ok === true }))
        : [],
      external_sends_executed: scenarioA.external_sends_executed,
      messaging_runtime_authorized: scenarioA.messaging_runtime_authorized,
      production_client_deployment: scenarioA.production_client_deployment,
    },
    handover_evidence: handoverEvidence,
    remaining_in_lane_blockers: inLaneBlockers,
    remaining_protected_gates_out_of_lane: OUT_OF_LANE_PROTECTED_GATES,
    exact_remaining_protected_blocker_for_715: null,
    ok,
    expected:
      'Scenario A (#711) through handover/acceptance_ready on synthetic data; messaging unauthorized; no client_production deploy',
    actual: ok
      ? 'Scenario A PASS; all evidence packets complete; handover synthetic-only; remaining_in_lane_blockers=[]'
      : 'Scenario A or handover evidence failed',
    verdict: ok ? 'PASS' : 'FAIL',
  };

  if (options.writeArtifact !== false) {
    const outPath = path.join(repoRoot, SCENARIO_A_INTEGRATED_ARTIFACT_REL);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    report.artifact_path = SCENARIO_A_INTEGRATED_ARTIFACT_REL;
  }

  return report;
}
