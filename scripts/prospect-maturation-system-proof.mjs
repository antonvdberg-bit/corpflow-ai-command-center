#!/usr/bin/env node
/**
 * CLI entry for Prospect Maturation #713 system-proof.
 * Writes artifacts/prospect-maturation-system-proof/latest-run.json
 *
 * Usage: node scripts/prospect-maturation-system-proof.mjs
 */

import { runProspectMaturationSystemProof } from '../lib/prospects/system-proof.js';

const report = runProspectMaturationSystemProof({ writeArtifact: true });

if (report.ok) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        artifact_path: report.artifact_path,
        lead_rescue_final_stage: report.walk_lead_rescue?.final_stage,
        website_rescue_final_stage: report.walk_website_rescue?.final_stage,
        messaging_runtime_authorized: false,
        external_sends_executed: report.external_sends_executed,
        simulation_only: true,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.error(
  JSON.stringify(
    {
      ok: false,
      reason:
        report.walk_lead_rescue?.reason ||
        report.walk_website_rescue?.reason ||
        'SYSTEM_PROOF_FAILED',
      report,
    },
    null,
    2,
  ),
);
process.exit(1);
