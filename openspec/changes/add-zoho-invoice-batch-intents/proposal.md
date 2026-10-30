# Change: Add synthetic invoice-to-batch allocation intents

## Status
APPROVED synthetic implementation scope — no live activation, merge or deployment is authorised by this proposal.

## Why
The existing batch proof calculates lot balances and FEFO splits but does not connect a particular invoice line to its proposed batch quantities. This leaves a gap between the tested batch planner and a future operational invoice workflow.

## What Changes
- Add a pure, dependency-free planner that translates an explicitly supplied synthetic invoice lifecycle event and verified batch snapshot into allocation intents.
- Preserve invoice/line/batch identity and exact quantities; show how much of each invoice line would come from each batch.
- Make duplicate event delivery a no-op only when the event payload and accepted receipt match.
- Block revisions, cancellation, credits and returns that would require guessing whether physical goods moved.
- Produce no live write request, native stock adjustment, persistence or send path.
- Keep existing batch identity readback and generic allocation proof separate from this proposed milestone.

## Impact
- Related issue: #1486. Existing unmerged implementation: PR #1487 at 97980de1fdfcce7a2f670f75c0de528051e9569e.
- Existing proof: openspec/changes/add-zoho-batch-register-poc (on that PR).
- Proposed files: tools/zoho-batch-register-poc/invoice-allocation-intent.mjs and node-tests/zoho-batch-invoice-intent.test.mjs, with the existing README and this change's tasks/design/spec.
- This is a new synthetic sub-capability. It does not extend the existing proof's non-goals by stealth.
- No dependency, database, workflow, secret, deployment, live tenant data or configuration changes.

## Acceptance boundary
Passing this milestone proves deterministic proposed invoice-to-batch links only. Native document lifecycle mapping, current stock/opening/reservation evidence, concurrency, durable posting/recovery, all-channel enforcement and client acceptance remain separate gates.
