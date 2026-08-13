/**
 * Website Rescue Scenario B integrated proof (#926 / #716 WS5 integrated gate).
 *
 * Composes the merged #711 Scenario B runner and the merged #716 unit/system
 * contracts. Does not rebuild onboarding validators or the independent
 * system-proof path.
 *
 * Synthetic data only. Deploy/DNS approval simulated only. No client_production
 * cutover. No external sends.
 */

import { writeFileSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runScenarioBWebsiteRescue } from '../gtm/integrated-scenarios-711.js';
import {
  evaluateAcceptanceReady,
  evaluateEvidencePacket,
  loadWebsiteRescueOnboardingDeliveryConfig,
} from './onboarding-delivery.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '../..');

export const SCENARIO_B_INTEGRATED_ARTIFACT_REL =
  'artifacts/website-rescue-scenario-b-integrated/latest-run.json';
export const SCENARIO_B_INTEGRATED_RUN_ID = 'WS5-926-SCENARIO-B-20260813';
export const SCENARIO_B_INTEGRATED_RAN_AT = '2026-08-13T07:45:00.000Z';

const REQUIRED_PACKET_IDS = [
  'preview',
  'revision',
  'deploy_approval',
  'dns_cutover',
  'live_validation',
  'acceptance',
  'handover',
  'maintenance_boundary',
];

/**
 * Remaining Anton-protected gates that this WS5 packet does **not** open.
 * They are out of lane and are not blockers for closing the synthetic
 * Scenario B integrated gate.
 */
export const OUT_OF_LANE_PROTECTED_GATES = Object.freeze([
  {
    id: 'real_dns_domain_action',
    owner: 'Anton',
    required_to_close_926: false,
    required_to_close_716: false,
    status: 'closed_for_this_lane',
    note: 'DNS/cutover authorization is simulated only. Real DNS or domain changes remain Anton-protected.',
  },
  {
    id: 'client_production_deploy',
    owner: 'Anton',
    required_to_close_926: false,
    required_to_close_716: false,
    status: 'closed_for_this_lane',
    note: 'Scenario B completes on synthetic preview/corpflow_test evidence only. client_production deploy is not in WS5 scope.',
  },
  {
    id: 'external_sends',
    owner: 'Anton',
    required_to_close_926: false,
    required_to_close_716: false,
    status: 'closed_for_this_lane',
    note: 'external_sends_executed remains []. Real email/WhatsApp/SMS send requires a separate Anton-protected gate.',
  },
]);

/**
 * Evaluate Scenario B evidence packets against the #716 contract.
 *
 * @param {ReturnType<typeof runScenarioBWebsiteRescue>} scenarioB
 * @param {Record<string, unknown>} [config]
 */
export function evaluateScenarioBHandoverEvidence(
  scenarioB,
  config = loadWebsiteRescueOnboardingDeliveryConfig(),
) {
  const evidence =
    scenarioB?.evidence && typeof scenarioB.evidence === 'object' ? scenarioB.evidence : {};
  const record = {
    delivery_state: scenarioB?.final_delivery_state || null,
    real_dns_cutover_executed: scenarioB?.real_dns_cutover_executed === true,
    real_client_production_deploy: scenarioB?.real_client_production_deploy === true,
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
  const handover = evidence.handover && typeof evidence.handover === 'object' ? evidence.handover : null;
  const channels = Array.isArray(handover?.channels) ? handover.channels.map((c) => String(c)) : [];
  const handoverSyntheticOnly =
    channels.length > 0 &&
    channels.every((c) => /synthetic|draft/i.test(c) && !/whatsapp|sms|live.?send/i.test(c));
  const deployApproval =
    evidence.deploy_approval && typeof evidence.deploy_approval === 'object'
      ? evidence.deploy_approval
      : null;
  const dnsCutover =
    evidence.dns_cutover && typeof evidence.dns_cutover === 'object' ? evidence.dns_cutover : null;

  return {
    ok:
      incomplete.length === 0 &&
      acceptance.ok === true &&
      handoverSyntheticOnly &&
      deployApproval?.simulation_only === true &&
      dnsCutover?.simulation_only === true &&
      record.real_dns_cutover_executed === false &&
      record.real_client_production_deploy === false &&
      record.delivery_state === 'acceptance_ready',
    record_state: record.delivery_state,
    packets,
    incomplete,
    acceptance,
    handover,
    maintenance_boundary:
      evidence.maintenance_boundary && typeof evidence.maintenance_boundary === 'object'
        ? evidence.maintenance_boundary
        : null,
    handover_channels: channels,
    handover_synthetic_only: handoverSyntheticOnly,
    deploy_approval_simulation_only: deployApproval?.simulation_only === true,
    dns_cutover_simulation_only: dnsCutover?.simulation_only === true,
    real_dns_cutover_executed: record.real_dns_cutover_executed,
    real_client_production_deploy: record.real_client_production_deploy,
  };
}

/**
 * Surface Scenario B fail-closed gates already proven by the #711 composer.
 *
 * @param {ReturnType<typeof runScenarioBWebsiteRescue>} scenarioB
 */
export function extractFailClosedGates(scenarioB) {
  const ledger = Array.isArray(scenarioB?.ledger) ? scenarioB.ledger : [];
  const faMissing = ledger.find((row) => row.step === 'gate_financial_approval_missing');
  const contentAccess = ledger.find((row) => row.step === 'gate_content_assets_access_blocks');
  return {
    missing_financial_approval_blocks: faMissing?.ok === true,
    missing_content_assets_access_blocks: contentAccess?.ok === true,
    ok: faMissing?.ok === true && contentAccess?.ok === true,
  };
}

/**
 * Run #711 Scenario B and record #926 / #716 WS5 integrated-gate evidence.
 *
 * @param {{ repoRoot?: string, writeArtifact?: boolean }} [options]
 */
export function runWebsiteRescueScenarioBIntegrated(options = {}) {
  const repoRoot = options.repoRoot || REPO_ROOT;
  const scenarioB = runScenarioBWebsiteRescue();
  const handoverEvidence = evaluateScenarioBHandoverEvidence(scenarioB);
  const failClosed = extractFailClosedGates(scenarioB);

  const inLaneBlockers = [];
  if (scenarioB.ok !== true) {
    inLaneBlockers.push({
      id: 'scenario_b_composer_failed',
      reason: scenarioB.reason || scenarioB.actual || 'SCENARIO_B_FAILED',
    });
  }
  if (handoverEvidence.ok !== true) {
    inLaneBlockers.push({
      id: 'handover_evidence_incomplete',
      incomplete: handoverEvidence.incomplete,
      acceptance_reason: handoverEvidence.acceptance?.reason || null,
    });
  }
  if (failClosed.ok !== true) {
    inLaneBlockers.push({
      id: 'fail_closed_gates_not_proven',
      missing_financial_approval_blocks: failClosed.missing_financial_approval_blocks,
      missing_content_assets_access_blocks: failClosed.missing_content_assets_access_blocks,
    });
  }

  const ok =
    scenarioB.ok === true &&
    handoverEvidence.ok === true &&
    failClosed.ok === true &&
    Array.isArray(scenarioB.external_sends_executed) &&
    scenarioB.external_sends_executed.length === 0 &&
    scenarioB.real_dns_cutover_executed === false &&
    scenarioB.real_client_production_deploy === false &&
    inLaneBlockers.length === 0;

  const report = {
    schema: 'corpflow.website_rescue_scenario_b_integrated.v1',
    issue: 926,
    parent: 716,
    programme: 711,
    controller: 710,
    generation: 1,
    run_id: SCENARIO_B_INTEGRATED_RUN_ID,
    ran_at: SCENARIO_B_INTEGRATED_RAN_AT,
    simulation_only: true,
    reuses: {
      scenario_b: 'lib/gtm/integrated-scenarios-711.js#runScenarioBWebsiteRescue',
      unit_contract: 'lib/website-rescue/onboarding-delivery.js',
      system_proof: 'lib/website-rescue/system-proof.js (not re-run; merged #742)',
      commercial_rail: 'lib/revenue/commercial-approval.js (consumed via Scenario B)',
    },
    scenario_b: {
      ok: scenarioB.ok === true,
      verdict: scenarioB.verdict,
      run_id: scenarioB.ids?.run_id || null,
      enquiry_ref: scenarioB.ids?.enquiry_ref || null,
      prospect_ref: scenarioB.ids?.prospect_ref || null,
      opportunity_ref: scenarioB.ids?.opportunity_ref || null,
      financial_approval_ref: scenarioB.ids?.financial_approval_ref || null,
      onboarding_id: scenarioB.ids?.onboarding_id || null,
      delivery_ref: scenarioB.ids?.delivery_ref || null,
      final_prospect_stage: scenarioB.final_prospect_stage,
      final_delivery_state: scenarioB.final_delivery_state,
      ledger_steps: Array.isArray(scenarioB.ledger)
        ? scenarioB.ledger.map((row) => ({ step: row.step, ok: row.ok === true }))
        : [],
      external_sends_executed: scenarioB.external_sends_executed,
      real_dns_cutover_executed: scenarioB.real_dns_cutover_executed,
      real_client_production_deploy: scenarioB.real_client_production_deploy,
    },
    fail_closed_gates: failClosed,
    handover_evidence: handoverEvidence,
    remaining_in_lane_blockers: inLaneBlockers,
    remaining_protected_gates_out_of_lane: OUT_OF_LANE_PROTECTED_GATES,
    exact_remaining_protected_blocker_for_926: null,
    exact_remaining_protected_blocker_for_716: null,
    ok,
    expected:
      'Scenario B (#711) through handover/acceptance_ready on synthetic data; deploy/DNS simulated only; no client_production; no send',
    actual: ok
      ? 'Scenario B PASS; all evidence packets complete; handover synthetic-only; remaining_in_lane_blockers=[]'
      : 'Scenario B or handover evidence failed',
    verdict: ok ? 'PASS' : 'FAIL',
    final_verdict: ok
      ? 'WEBSITE RESCUE SCENARIO B INTEGRATED READY FOR REVIEW'
      : 'NOT READY',
  };

  if (!ok && inLaneBlockers.length === 1) {
    report.final_verdict = `NOT READY — ${inLaneBlockers[0].id}`;
  } else if (!ok && inLaneBlockers.length > 1) {
    report.final_verdict = `NOT READY — ${inLaneBlockers[0].id}`;
  }

  if (options.writeArtifact !== false) {
    const outPath = path.join(repoRoot, SCENARIO_B_INTEGRATED_ARTIFACT_REL);
    mkdirSync(path.dirname(outPath), { recursive: true });
    writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    report.artifact_path = SCENARIO_B_INTEGRATED_ARTIFACT_REL;
  }

  return report;
}
