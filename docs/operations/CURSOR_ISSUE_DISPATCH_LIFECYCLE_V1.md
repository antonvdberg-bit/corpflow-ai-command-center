# Cursor issue dispatch lifecycle v1 — segregated GitHub → Cursor claims

**Status:** Extends the existing factory dispatcher activator. **Does not** create a second dispatcher.
**Owner:** Anton (policy); Cursor (implementation).
**Created:** 2026-07-28.
**Implements:** Operator urgent change — Cursor must discover/claim `dispatch:cursor-ready` issues with strict segregation.
**Anchor sentinel:** `<!-- CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1 -->`

<!-- CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1 -->

## 1. Purpose

Remove Anton as the manual courier between ChatGPT, GitHub, and Cursor for issues already labelled `dispatch:cursor-ready`, while preserving **segregation by default**:

- Core vs CorpFlowAI business systems vs each client tenant
- Lead Rescue vs Website Rescue (and any sibling products)
- production vs preview/test
- research/docs vs runtime
- database/schema vs UI (unless the issue explicitly requires both)
- one client’s work vs another’s

Consolidation is allowed only when explicitly justified and safe.

## 2. Reuse the current route

| Existing piece | Role |
|----------------|------|
| `.github/workflows/factory-dispatcher-activate.yml` | Scheduled + manual activator (existing) |
| `scripts/dispatcher-agent-activation.mjs` | Cursor Cloud activation (existing) |
| `lib/server/cursor-ops-status.js` | Issue comment posting + Control Tower status (existing) |
| **`lib/server/cursor-issue-dispatch-lifecycle.js`** | Classification, WIP, segregation, comment templates (**this packet**) |
| **`scripts/cursor-issue-dispatch-scan.mjs`** | Label scan → discover/classify/claim plan (**this packet**) |

Do **not** add a parallel workflow that also activates Cursor. The scan runs as a **prep step** inside the existing workflow and may hand **at most one** `activationTargetIssue` to the existing activator path.

## 3. Labels

| Label | Meaning |
|-------|---------|
| `dispatch:cursor-ready` | Eligible for Cursor discovery/claim |
| `dispatch:cursor-claimed` | Cursor owns execution (remove ready when claimed) |
| `status:in-progress` | Active work |
| `dispatch:blocked` | Do not claim |
| `needs:anton` | Protected gate — unlock required |

Create missing labels in the GitHub UI if absent (`dispatch:cursor-claimed`, `status:in-progress`, `dispatch:blocked`, `needs:anton`).

## 4. WIP limits (default)

| Scope | Limit |
|-------|-------|
| Active Cursor implementation issues (`dispatch:cursor-claimed`) | **2** |
| Active issues per tenant | **1** |
| Active database/schema issues (repo-wide) | **1** |
| Active production-deployment candidates | **1** |
| Live Cursor activations per GHA run | **1** (unchanged) |

Research/documentation-only tasks may run separately only when they cannot conflict with implementation file areas.

## 5. Scan behaviour

1. Search open issues with `dispatch:cursor-ready`.
2. Infer `WORK CLASSIFICATION` (system boundary, tenant, environment, work type, protected gate).
3. Reject `dispatch:blocked` and protected-gate issues for claim (still post discovery + classification).
4. Enforce WIP + concurrency (sibling products sequential by default).
5. Post acknowledgement comments when `GITHUB_TOKEN` has `issues: write` (GHA path).
6. On claim: post `CURSOR WORK CLAIMED`, add `dispatch:cursor-claimed` + `status:in-progress`, remove `dispatch:cursor-ready`.
7. Emit `cursor-issue-dispatch-scan.json` with `activationTargetIssue` for the existing activator.
8. Stale claimed issues (no meaningful update beyond threshold): exception-only status request — no heartbeat spam.

### Preferred schedule

| Mode | Cron |
|------|------|
| Preferred | every **30 minutes** (`*/30 * * * *`) |
| Previous | every 2 hours |

Cost remains negligible (Node script + GitHub API search). Scheduled `cursor_live` still requires `CURSOR_LIVE_ENABLED=true` and the throughput packet gate for dispatcher-sourced activations. Issue-label claims remain **comment/label** operations even when live activation is disabled.

## 6. Acknowledgement stages

Durable GitHub comments (templates in code):

| Stage | Marker |
|-------|--------|
| A | `CURSOR DISPATCH DISCOVERED` |
| B | `CURSOR WORK CLAIMED` (+ classification block) |
| C | `CURSOR PROGRESS UPDATE` (milestones only) |
| D | `CURSOR PR OPENED` |
| Ready | `CURSOR IMPLEMENTATION COMPLETE — READY FOR MERGE REVIEW` |
| Post-merge | `POST-MERGE VALIDATION` |
| Close | `ISSUE READY TO CLOSE` |
| Gate | `ANTON UNLOCK REQUIRED` |
| Stale | `CURSOR STALE WORK STATUS REQUEST` |

## 7. Review ownership (summary)

1. **Cursor self-review** against scope, boundaries, tests, security.
2. **Automated** tests/build/lint/tenant checks.
3. **ChatGPT / operator** — objective met? evidence? scope drift? gate?
4. **Stakeholder** (Jan / Sarah / client) — business outcome only, not code.
5. **Anton** — only protected gates (production, DB, secrets, payment, messaging, outreach, spend, public launch, high-risk tenancy).

Routine code review must not default to Anton.

## 8. Codex separation

Codex must **not** claim implementation issues. Codex may only take bounded supporting packets with a required return comment. Owner remains Cursor for PRs.

## 9. Local verification

```bash
node --test node-tests/cursor-issue-dispatch-lifecycle.test.mjs
node scripts/cursor-issue-dispatch-scan.mjs --dry-run --prefer 653,654
```

`--apply-comments` / `--apply-labels` require a token with `issues: write` (GitHub Actions `github.token`). Cloud Agent integration tokens that are `issues: read` only cannot post lifecycle comments — the scheduled GHA job is the durable writer.

## 10. Related

- `docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md`
- `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md`
- `docs/operations/CURSOR_DISPATCHER_CHECKLIST_V1.md`
- `docs/operations/OPERATOR_BRIDGE_V1.md`
- Issues #249, #493, #511, #548 (throughput / activation context)
- Revenue issues #653 (Lead Rescue), #654 (Website Rescue) — separate workstreams
