#!/usr/bin/env bash
# Sanitised first-request context estimate for OpenHands commissioning (#743).
# Offline / preflight helper — does NOT call Groq and does NOT print secrets.
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/../../.."

node --input-type=module <<'JS'
import {
  COMMISSIONING_APPROVED_MODEL,
  COMMISSIONING_GROQ_TPM_LIMIT,
  COMMISSIONING_TPM_MARGIN,
  FIRST_REQUEST_BREAKDOWN,
  GROQ_OBSERVED_REQUEST_TOKENS,
  estimateMinimalFirstRequestTokens,
} from './lib/openhands/commissioning-context-policy.js';

const budget = Math.floor(COMMISSIONING_GROQ_TPM_LIMIT * COMMISSIONING_TPM_MARGIN);
const est = estimateMinimalFirstRequestTokens();

console.log('=== OpenHands first-request context estimate (sanitised) ===');
console.log(`approved_model=${COMMISSIONING_APPROVED_MODEL}`);
console.log(`groq_tpm_limit=${COMMISSIONING_GROQ_TPM_LIMIT}`);
console.log(`preflight_budget_70pct=${budget}`);
console.log('');
console.log('Observed oversize (live Groq rejection):');
console.log(`  tokens_low=${GROQ_OBSERVED_REQUEST_TOKENS.low}`);
console.log(`  tokens_high=${GROQ_OBSERVED_REQUEST_TOKENS.high}`);
console.log('');
console.log('Breakdown (source-measured ranges):');
for (const row of FIRST_REQUEST_BREAKDOWN) {
  console.log(
    `  ${row.component}: ${row.tokens_low}-${row.tokens_high}  # ${row.evidence.slice(0, 100)}`,
  );
}
console.log('');
console.log('After minimal commissioning gates:');
console.log(`  tokens_low=${est.tokens_low}`);
console.log(`  tokens_high=${est.tokens_high}`);
console.log(`  under_70pct_of_8k=${est.under_70pct_of_8k}`);
console.log(`  note=${est.note}`);
console.log('');
if (!est.under_70pct_of_8k) {
  console.log('PREFLIGHT_WARN: high estimate exceeds 70% of 8k TPM.');
  console.log('Live measure on exec-01 is mandatory before any Groq call.');
  console.log('If live size still over budget: further strip task_tracker OR');
  console.log('seek Anton approval for meta-llama/llama-4-scout-17b-16e-instruct (~30k TPM free).');
  // Warn-only offline — do not hard-fail package CI; L3 harness enforces live gate.
  process.exitCode = 0;
} else {
  console.log('PREFLIGHT: estimate within 70% budget (still require live measure).');
}
JS
