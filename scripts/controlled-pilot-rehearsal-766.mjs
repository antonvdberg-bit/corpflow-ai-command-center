#!/usr/bin/env node
/**
 * #766 controlled-pilot freshness rehearsal.
 *
 * Reuses merged #757 / #711 integrated Scenarios A/B — does not reimplement GTM helpers.
 *
 * Usage: node scripts/controlled-pilot-rehearsal-766.mjs
 */

import { execSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { runIntegratedScenarios711 } from '../lib/gtm/integrated-scenarios-711.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = path.resolve(path.dirname(__filename), '..');
const OUT_DIR_REL = 'artifacts/controlled-pilot-766';
const OUT_DIR = path.join(REPO_ROOT, OUT_DIR_REL);
const DEFECT_PATH = path.join(OUT_DIR, 'defect-register.json');

let headSha = null;
try {
  headSha = execSync('git rev-parse HEAD', { encoding: 'utf8', cwd: REPO_ROOT }).trim();
} catch {
  headSha = null;
}

const integrated = runIntegratedScenarios711({
  writeArtifact: true,
  finalMainSha: headSha,
});

let defectRegister = null;
if (existsSync(DEFECT_PATH)) {
  defectRegister = JSON.parse(readFileSync(DEFECT_PATH, 'utf8'));
}

const report = {
  schema: 'corpflow.controlled_pilot_766.rehearsal.v1',
  issue: 766,
  ran_at: new Date().toISOString(),
  head_sha: headSha,
  package_doc: 'docs/execution/CONTROLLED_PILOT_TEST_READINESS_766_V1.md',
  reused_composer: 'lib/gtm/integrated-scenarios-711.js',
  integrated: {
    ok: integrated.ok,
    run_id: integrated.run_id,
    final_verdict_synthetic: integrated.final_verdict,
    market_ok: integrated.market_path_regression?.ok ?? null,
    scenario_a: {
      ok: integrated.scenario_a?.ok,
      enquiry_ref: integrated.scenario_a?.ids?.enquiry_ref,
      opportunity_ref: integrated.scenario_a?.ids?.opportunity_ref,
      final_delivery_state: integrated.scenario_a?.final_delivery_state,
      messaging_runtime_authorized: integrated.scenario_a?.messaging_runtime_authorized,
    },
    scenario_b: {
      ok: integrated.scenario_b?.ok,
      enquiry_ref: integrated.scenario_b?.ids?.enquiry_ref,
      opportunity_ref: integrated.scenario_b?.ids?.opportunity_ref,
      final_delivery_state: integrated.scenario_b?.final_delivery_state,
      real_dns_cutover_executed: integrated.scenario_b?.real_dns_cutover_executed,
      real_client_production_deploy: integrated.scenario_b?.real_client_production_deploy,
    },
    external_sends_executed: integrated.external_sends_executed,
    artifact_paths: integrated.artifact_paths,
  },
  no_send_checks: {
    external_sends_empty: Array.isArray(integrated.external_sends_executed)
      && integrated.external_sends_executed.length === 0,
    scenario_a_messaging_unauthorized:
      integrated.scenario_a?.messaging_runtime_authorized === false,
    scenario_b_dns_simulated_only: integrated.scenario_b?.real_dns_cutover_executed === false,
  },
  packet_c_status: 'AWAITING_OPERATOR',
  defect_register_exact_blocker: defectRegister?.exact_blocker_id ?? 'D766-001',
  controlled_client_pilot_verdict: 'NOT READY',
  exact_blocker:
    'D766-001 — Packet C ERPNext sandbox synthetic commercial-control proof not executed and evidenced by the operator',
  explicit_non_claims: [
    'Not a live client delivery',
    'Messaging is not active',
    'No real Website Rescue DNS or production cutover',
    'No production acceptance for a real client',
    'No ERPNext writes performed by this script',
  ],
};

mkdirSync(OUT_DIR, { recursive: true });
const outFile = path.join(OUT_DIR, 'latest-rehearsal.json');
writeFileSync(outFile, `${JSON.stringify(report, null, 2)}\n`, 'utf8');

const summary = {
  ok: integrated.ok === true
    && report.no_send_checks.external_sends_empty
    && report.no_send_checks.scenario_a_messaging_unauthorized
    && report.no_send_checks.scenario_b_dns_simulated_only,
  head_sha: headSha,
  integrated_ok: integrated.ok,
  controlled_client_pilot_verdict: report.controlled_client_pilot_verdict,
  exact_blocker: report.exact_blocker,
  artifact: path.join(OUT_DIR_REL, 'latest-rehearsal.json'),
};

if (summary.ok) {
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

console.error(JSON.stringify(summary, null, 2));
process.exit(1);
