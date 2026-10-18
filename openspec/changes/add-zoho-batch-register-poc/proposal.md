# Change: Add a synthetic Zoho Books batch-register proof

## Why

CorpFlowAI needs a small, inspectable demonstration of batch receipts and
earliest-expiry allocation before any live Zoho Books integration is considered.

## What Changes

- Add a dependency-free in-memory batch planner and ledger.
- Add an accessible static demo for receipt, allocation, shortage, history, and
  reversal flows.
- Add deterministic Node tests and licensed provenance for the adapted
  allocation concept.

## Impact

- Affected capability: synthetic batch allocation.
- Affected code: `tools/zoho-batch-register-poc/` and its focused test.
- No runtime, dependency, database, environment, deployment, or live Zoho
  behavior changes.
