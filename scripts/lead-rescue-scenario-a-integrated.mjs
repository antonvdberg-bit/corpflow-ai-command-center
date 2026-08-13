#!/usr/bin/env node
/**
 * CLI: #715 WS4 integrated Scenario A (Lead Rescue) through handover evidence.
 *
 * Reuses merged #711 Scenario A. Does not rebuild unit/system slices.
 * Usage: node scripts/lead-rescue-scenario-a-integrated.mjs
 */

import { runLeadRescueScenarioAIntegrated } from '../lib/lead-rescue/scenario-a-integrated.js';

const report = runLeadRescueScenarioAIntegrated({ writeArtifact: true });

const summary = {
  ok: report.ok,
  run_id: report.run_id,
  verdict: report.verdict,
  enquiry_ref: report.scenario_a?.enquiry_ref,
  opportunity_ref: report.scenario_a?.opportunity_ref,
  final_delivery_state: report.scenario_a?.final_delivery_state,
  handover_ok: report.handover_evidence?.ok,
  messaging_runtime_authorized: report.scenario_a?.messaging_runtime_authorized,
  external_sends_executed: report.scenario_a?.external_sends_executed,
  remaining_in_lane_blockers: report.remaining_in_lane_blockers,
  exact_remaining_protected_blocker_for_715: report.exact_remaining_protected_blocker_for_715,
  artifact_path: report.artifact_path,
};

if (report.ok) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

console.error(JSON.stringify(summary, null, 2));
process.exit(1);
