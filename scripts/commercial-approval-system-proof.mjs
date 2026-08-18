#!/usr/bin/env node
/**
 * CLI entry for commercial approval #714 system-proof.
 * Writes artifacts/commercial-approval-system-proof/latest-run.json
 *
 * Usage: node scripts/commercial-approval-system-proof.mjs
 */

import { runCommercialApprovalSystemProof } from '../lib/revenue/commercial-approval-system-proof.js';

const report = runCommercialApprovalSystemProof({ writeArtifact: true });

if (report.ok) {
  console.log(
    JSON.stringify(
      {
        ok: true,
        artifact_path: report.artifact_path,
        lead_rescue: report.paths?.['lead-rescue']?.opportunity_ref,
        website_rescue: report.paths?.['website-rescue']?.opportunity_ref,
        payment_collection_executed: false,
        bank_action_executed: false,
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
    { ok: false, reason: report.reason, report },
    null,
    2,
  ),
);
process.exit(1);
