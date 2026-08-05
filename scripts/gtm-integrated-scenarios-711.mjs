#!/usr/bin/env node
/**
 * CLI: #711 integrated Scenarios A + B against final merged main capabilities.
 *
 * Usage: node scripts/gtm-integrated-scenarios-711.mjs
 */

import { execSync } from 'node:child_process';
import { runIntegratedScenarios711 } from '../lib/gtm/integrated-scenarios-711.js';

let finalMainSha = null;
try {
  finalMainSha = execSync('git rev-parse HEAD', { encoding: 'utf8' }).trim();
} catch {
  finalMainSha = null;
}

const report = runIntegratedScenarios711({
  writeArtifact: true,
  finalMainSha,
});

const summary = {
  ok: report.ok,
  run_id: report.run_id,
  final_main_sha: report.final_main_sha,
  final_verdict: report.final_verdict,
  market_ok: report.market_path_regression?.ok,
  scenario_a: {
    ok: report.scenario_a?.ok,
    enquiry_ref: report.scenario_a?.ids?.enquiry_ref,
    final_delivery_state: report.scenario_a?.final_delivery_state,
  },
  scenario_b: {
    ok: report.scenario_b?.ok,
    enquiry_ref: report.scenario_b?.ids?.enquiry_ref,
    final_delivery_state: report.scenario_b?.final_delivery_state,
  },
  external_sends_executed: report.external_sends_executed,
  artifact_paths: report.artifact_paths,
  defects: report.defects,
};

if (report.ok) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

console.error(JSON.stringify(summary, null, 2));
process.exit(1);
