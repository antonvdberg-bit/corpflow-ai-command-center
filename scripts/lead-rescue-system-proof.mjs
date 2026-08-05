#!/usr/bin/env node
/**
 * CLI entry for Lead Rescue #715 system-proof.
 * Writes artifacts/lead-rescue-system-proof/latest-run.json
 *
 * Usage: node scripts/lead-rescue-system-proof.mjs
 */

import { runLeadRescueSystemProof } from '../lib/lead-rescue/system-proof.js';

const report = runLeadRescueSystemProof({ writeArtifact: true });

if (report.ok) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        artifact_path: report.artifact_path,
        opportunity_ref: report.commercial?.opportunity_ref,
        final_state: report.delivery?.final_state,
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
    { ok: false, reason: report.reason || report.delivery?.reason, report },
    null,
    2,
  ),
);
process.exit(1);
