# Track B evidence — issue #661

**Branch:** `cursor/track-b-control-loop-harden-661-1e9e`  
**Date:** 2026-07-29  
**Scope:** Independent control-loop audit + permanent hardening (Track B). Track A files untouched.

## Verification commands run

```bash
node --test node-tests/active-agent-control-loop.test.mjs
node scripts/active-agent-control-loop.mjs --fixtures
```

## Summary table

| Area | Finding | Change implemented | Commit/PR | Tests/evidence |
|------|---------|-------------------|-----------|----------------|
| A. Agent status + stale recovery | Ready-never-activated, false-claimed, stale-without-nag not persisted centrally | `lib/server/active-agent-control-loop.js` + `scripts/active-agent-control-loop.mjs` — file-backed runs, configurable thresholds, one follow-up/requeue/blocker | This branch (draft PR) | `node-tests/active-agent-control-loop.test.mjs` — stale, false_claim, ready_never, no-repeat-nag |
| B. Completion → review handoff | Anton default courier for routine PR/test fixes | `lib/server/operator-review-handoff.js` — decision packet + route to Cursor/Codex/Anton by gate | This branch | Tests: tests_failed→cursor, production→anton, client-ready packet |
| C. Codex active channel | No bounded unattended Codex trigger | `lib/server/codex-dispatch-adapter.js` — GHA workflow_dispatch packet, conflict check vs Cursor | This branch | Tests: eligible routing, conflict rejection, packet validation |
| D. Cost controls | Duplicate runs, no daily ceiling metadata | `lib/server/agent-cost-controls.js` — concurrency, dedupe window, daily caps, urgent bypass | This branch | Tests: duplicate block, concurrent limit, urgent bypass, halt low-value |
| E. n8n exception supervision | Monitor noise risk | `docs/n8n/templates/active-agent-exception-supervisor-v1.template.json` (inactive spec) | This branch | Template documents exception-only filter |
| F. Throughput measurements | Activity vs delivery metrics conflated | `artifacts/active-agent-control-loop/throughput-measurements-schema-v1.json` + ops doc §8 | This branch | JSON schema for outcome-oriented rows |

## Fixture CLI output (representative)

```
Active-agent control loop — fixture evaluation
findings: 3
actionable recoveries: 3
review route: anton
codex valid: true
cost allowed: true
```

## Track A files NOT modified

- `.github/workflows/factory-dispatcher-activate.yml`
- `scripts/cursor-issue-dispatch-*`
- `scripts/dispatcher-agent-activation.mjs`
- `lib/server/cursor-issue-dispatch-lifecycle.js`

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO (draft PR only)
- Production deployment ID: N/A
- Commit deployed: N/A
- Live URLs tested: N/A (docs/lib only; no runtime deploy)
- Expected vs actual result: Track B controls implemented locally with passing tests
- Client-facing flow usable: N/A
- Final verdict: PARTIAL (awaiting PR review/merge)
```

## Operator next steps

1. Review draft PR on `cursor/track-b-control-loop-harden-661-1e9e`.
2. Track A may optionally read `.active-agent-state/control-loop-report.json` after integrate.
3. Import n8n template when ready (inactive; no credential changes in this PR).
