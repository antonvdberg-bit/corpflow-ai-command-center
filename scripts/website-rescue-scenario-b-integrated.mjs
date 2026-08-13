#!/usr/bin/env node
/**
 * CLI: #926 / #716 WS5 integrated Scenario B (Website Rescue) through handover evidence.
 *
 * Reuses merged #711 Scenario B. Does not rebuild unit/system slices.
 * Usage: node scripts/website-rescue-scenario-b-integrated.mjs
 */

import { runWebsiteRescueScenarioBIntegrated } from '../lib/website-rescue/scenario-b-integrated.js';

const report = runWebsiteRescueScenarioBIntegrated({ writeArtifact: true });

const summary = {
  ok: report.ok,
  run_id: report.run_id,
  verdict: report.verdict,
  final_verdict: report.final_verdict,
  enquiry_ref: report.scenario_b?.enquiry_ref,
  opportunity_ref: report.scenario_b?.opportunity_ref,
  final_delivery_state: report.scenario_b?.final_delivery_state,
  handover_ok: report.handover_evidence?.ok,
  real_dns_cutover_executed: report.scenario_b?.real_dns_cutover_executed,
  real_client_production_deploy: report.scenario_b?.real_client_production_deploy,
  external_sends_executed: report.scenario_b?.external_sends_executed,
  remaining_in_lane_blockers: report.remaining_in_lane_blockers,
  exact_remaining_protected_blocker_for_926: report.exact_remaining_protected_blocker_for_926,
  artifact_path: report.artifact_path,
};

if (report.ok) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

console.error(JSON.stringify(summary, null, 2));
process.exit(1);
