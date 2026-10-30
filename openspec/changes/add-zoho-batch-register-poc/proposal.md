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
- Add a dependency-free, read-only adapter for paginated synthetic register
  and movement records using an explicit mapping and verified opening baseline.
- Add one canonical item expiry policy (`required`, `not_applicable`, or
  `review`) to planning, commit rechecks, the synthetic adapter, and a
  deterministic read-only daily review report.
- Add a synthetic native-shaped Books page bridge that translates validated
  `items`/`module_records` envelopes into the existing preview adapter without
  adding live transport or provenance claims.
- Add a disabled, GET-only native readback diagnostic template that compares
  movement, register, and canonical item identities through a reviewed private
  binding, with bounded pagination and redacted reports.

## Impact

- Affected capability: synthetic batch allocation.
- Affected code: `tools/zoho-batch-register-poc/` and its focused test.
- No runtime, dependency, database, environment, deployment, or live Zoho
  behavior changes. This stage remains synthetic and unconnected; live
  response mapping, posting authority, durable concurrency/recovery, and
  all-channel enforcement are not accepted. No scheduler, reminder, email,
  persistence, or live stock-control behavior is enabled. Native page mapping,
  tenant field translation, opening/reservation evidence, movement encoding,
  UAT, and live binding remain incomplete. The diagnostic is mock-verified
  preparation only and cannot be activated by this repository.
