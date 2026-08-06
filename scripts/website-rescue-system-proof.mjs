#!/usr/bin/env node
/**
 * CLI entry for Website Rescue #716 system-proof.
 * Writes artifacts/website-rescue-system-proof/latest-run.json
 *
 * Usage: node scripts/website-rescue-system-proof.mjs
 */

import { runWebsiteRescueSystemProof } from '../lib/website-rescue/system-proof.js';

const report = runWebsiteRescueSystemProof({ writeArtifact: true });

if (report.ok) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        artifact_path: report.artifact_path,
        opportunity_ref: report.commercial?.opportunity_ref,
        final_state: report.delivery?.final_state,
        simulation_only: true,
      },
      null,
      2,
    ),
  );
  process.exit(0);
}

console.error(JSON.stringify({ ok: false, reason: report.reason || report.delivery?.reason, report }, null, 2));
process.exit(1);
