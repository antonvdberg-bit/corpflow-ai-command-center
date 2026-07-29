# Active-agent control loop v1 — Track B hardening (#661)

**Status:** Implemented (file-backed; no second DB/dispatcher).  
**Owner:** Anton (operator); Cursor (repo).  
**Created:** 2026-07-29.  
**Canonical issue:** [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661)  
**Anchor sentinel:** `<!-- ACTIVE_AGENT_CONTROL_LOOP_V1 -->`

<!-- ACTIVE_AGENT_CONTROL_LOOP_V1 -->

## 1. Purpose

Permanent controls for failure modes that leave agents **ready but never activated**, **unmonitored**, **stale**, **falsely claimed**, or **disconnected from PRs/issues** — without a second dispatcher, app, or database.

Track B **extends** Track A (factory dispatcher activator + issue lifecycle). It does **not** edit Track A files.

| Area | Module / artifact |
|------|-------------------|
| A. Status + stale recovery | `lib/server/active-agent-control-loop.js`, `scripts/active-agent-control-loop.mjs` |
| B. Completion → review handoff | `lib/server/operator-review-handoff.js` |
| C. Codex bounded channel | `lib/server/codex-dispatch-adapter.js` |
| D. Cost / duplicate guardrails | `lib/server/agent-cost-controls.js` |
| E. n8n exception supervision | `docs/n8n/templates/active-agent-exception-supervisor-v1.template.json` |
| F. Throughput evidence schema | `artifacts/active-agent-control-loop/throughput-measurements-schema-v1.json` |

## 2. State persistence (no second DB)

Runtime state lives under **`.active-agent-state/`** (GHA cache or local):

| File | Contents |
|------|----------|
| `runs.json` | Provider, run ID, issue, branch, PR, started, last movement, phase, follow-up sent |
| `control-loop-report.json` | Latest evaluation summary + recoveries |
| `cost-usage.json` | Daily activation counts + dedupe entries (optional; written by integrators) |

Each **AgentRunRecord** tracks:

- `provider` — `cursor` \| `codex`
- `runId`, `issueNumber`, `branch`, `prNumber`, `prUrl`
- `startedAt`, `lastMovementAt`, `phase`
- `followUpSentAt` — prevents repeat nag until movement
- `claimedButNoRunId`, `disconnectedPr`

## 3. Stale detection (configurable)

Default thresholds (`DEFAULT_STALE_THRESHOLDS`):

| Signal | Default |
|--------|---------|
| Cursor no movement | 12 hours |
| Codex no movement | 24 hours |
| `dispatch:cursor-ready` never activated | 60 minutes |

**Recovery policy:** at most **one** follow-up, requeue, or blocker per stale cycle. If `followUpSentAt >= lastMovementAt`, skip (no nagging on unchanged runs).

## 4. Completion → review handoff (B)

`operator-review-handoff.js` detects completion from PR/CI/issue comments and builds an **operator decision packet**.

| Signal | Default route |
|--------|---------------|
| Tests failed | **Cursor** (routine fix) |
| Research/docs complete | **Codex** review memo |
| Protected gate (production, DB, secrets, payment, messaging, outreach, pricing, launch) | **Anton** |
| Client-ready + evidence | **Anton** (merge review) |
| Routine PR opened | **Cursor** self-review |

Anton is **not** the default reviewer for routine code corrections.

## 5. Codex active channel (C)

**Supported unattended route (bounded):** `github_actions_workflow_dispatch` with `activation_mode=codex_packet` inputs — **trigger packet only** in this PR; live Codex API remains Phase 4 per `DISPATCHER_AGENT_ACTIVATION_V1.md`.

Codex packet types: `research`, `review`, `adr-lite`, `isolated-fix`.  
**Forbidden:** implementation, cursor-lifecycle, production-deploy, schema-migration.

**Conflict rule:** Codex must not take a packet when Cursor is active on the same issue.

## 6. Cost controls (D)

`agent-cost-controls.js` defaults:

| Limit | Value |
|-------|-------|
| Max concurrent Cursor | 2 |
| Max concurrent Codex | 1 |
| Max Cursor activations / day | 12 |
| Max Codex triggers / day | 6 |
| Duplicate window | 24 hours |

**Urgent bypass** categories (revenue, client-delivery, paid-pilot, production-verification, lead-rescue) may proceed when daily ceiling is soft-exceeded. Low-value halt when ~80% of both daily ceilings consumed.

## 7. n8n exception supervision (E)

Template: `docs/n8n/templates/active-agent-exception-supervisor-v1.template.json` (**inactive**).

**Alert only:**

- Activation failure
- Stale run (actionable recovery in report)
- Failed tests (review handoff)
- Blocked protected decision
- Cost threshold breach
- Client-ready awaiting review
- Control-loop evaluation failure

**Do not alert:** routine still-running, unchanged runs, old PR age alone.

## 8. Throughput measurements (F)

Outcome-oriented fields in `artifacts/active-agent-control-loop/throughput-measurements-schema-v1.json`:

- `ready_to_run_id_minutes`
- `completion_to_disposition_minutes`
- `quote_ready_count`, `prs_dispositioned`, `merges`, `live_validations`
- `stale_work_count`, `anton_interventions`, `avoidable_cost_usd_estimate`

No second analytics app — append rows to artifact JSON or Operator Bridge STATUS comments.

## 9. CLI verification

```bash
node --test node-tests/active-agent-control-loop.test.mjs
node scripts/active-agent-control-loop.mjs --fixtures
node scripts/active-agent-control-loop.mjs --scan cursor-issue-dispatch-scan.json --state-dir .active-agent-state
```

## 10. Integration points (Track A consumers)

Track A may **read** (not own):

- `.active-agent-state/control-loop-report.json` after scan/activate cycle
- `evaluateActivationCostGate()` before live Cursor activation
- `buildCodexDispatchTriggerPacket()` for codex routings

Track B does **not** modify `.github/workflows/factory-dispatcher-activate.yml` or Track A scripts.

## 11. Related

- `docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md`
- `docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md`
- `docs/execution/CODEX_CLOUD_ACTIVATION_PACKET_V1.md`
- `lib/server/cursor-ops-status.js`
- Issue #661
