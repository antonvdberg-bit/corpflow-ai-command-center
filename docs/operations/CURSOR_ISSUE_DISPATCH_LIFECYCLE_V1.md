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
| **`scripts/cursor-issue-dispatch-scan.mjs`** | Label scan → discover/classify/eligibility plan (**this packet**) |
| **`scripts/cursor-issue-dispatch-finalize.mjs`** | Post-activation claim labels + run ID comment (**this packet**) |

Do **not** add a parallel workflow that also activates Cursor. The scan runs as a **prep step** inside the existing workflow and may hand **at most one** `activationTargetIssue` to the existing activator path.

## 3. Labels

| Label | Meaning |
|-------|---------|
| `dispatch:cursor-ready` | Eligible for Cursor discovery/claim |
| `dispatch:cursor-claimed` | Cursor owns execution (remove ready when claimed) |
| `status:in-progress` | Active work |
| `dispatch:blocked` | Do not claim |
| `needs:anton` | Protected gate — unlock required |

**Label provisioning (workflow-owned, not manual):** The existing `factory-dispatcher-activate.yml` scan/finalize path idempotently **ensures** the approved lifecycle labels exist before any claim mutation (`dispatch:cursor-claimed`, `status:in-progress`, `dispatch:blocked`, `needs:anton`). Anton must **not** create these labels manually in the GitHub UI.

If label creation or verification fails (missing labels after ensure, GitHub API error, or insufficient token scope), the workflow **fails closed**: the run stops, no claim labels are applied, and operators see **one actionable blocker** naming the missing label(s) or API failure — fix repo label state or workflow permissions, then re-run the scan on `main` (dry-run is fine).

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

1. Discover open issues with `dispatch:cursor-ready` via **GitHub GraphQL** (fallback: paginated Issues API + **client-side label filter**). Do **not** use the Search API — colon labels (`dispatch:cursor-ready`) return zero results.
2. Infer `WORK CLASSIFICATION` (system boundary, tenant, environment, work type, protected gate).
3. Reject `dispatch:blocked` and protected-gate issues for claim (still post discovery + classification).
4. Enforce WIP + concurrency. Sibling product holds (e.g. #654 vs #653) do **not** suppress unrelated eligible ops work (e.g. #658 Slack retirement).
5. Post acknowledgement comments when `GITHUB_TOKEN` has `issues: write` (GHA path).
6. **Do not** apply `dispatch:cursor-claimed` or `status:in-progress` during scan. Claim labels are applied only after Cursor API returns a **real run ID** (`scripts/cursor-issue-dispatch-finalize.mjs`).
7. Emit `cursor-issue-dispatch-scan.json` with `eligibleIssueNumbers`, `claimIssueNumbers`, and `activationTargetIssue` (max **one** live Cursor activation per GHA cycle).
8. Stale claimed issues (no meaningful update beyond threshold): exception-only status request — no heartbeat spam.

### Source issues vs open PRs

**GitHub issues labelled `dispatch:cursor-ready` are activation inputs.** Open PRs from prior work are **not** automatically resumed or merged by the dispatcher. Each issue gets its own branch/PR cycle; operators merge manually after review.

### Preferred schedule

| Mode | Cron |
|------|------|
| Preferred | every **30 minutes** (`*/30 * * * *`) |
| Previous | every 2 hours |

Cost remains negligible (Node script + GitHub API). Scheduled `cursor_live` still requires `CURSOR_LIVE_ENABLED=true` and the throughput packet gate for dispatcher-sourced activations.

## 6. Acknowledgement stages

Durable GitHub comments (templates in code):

| Stage | Marker |
|-------|--------|
| A | `CURSOR DISPATCH DISCOVERED` |
| B | `CURSOR DISPATCH ACTIVATED` (run ID + claim labels after Cursor API success) |
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
node scripts/cursor-issue-dispatch-scan.mjs --dry-run --prefer 653,654,658
node scripts/cursor-issue-dispatch-finalize.mjs --dry-run --scan-file cursor-issue-dispatch-scan.json
```

`--apply-comments` requires a token with `issues: write` (GitHub Actions `github.token`). Claim labels require a successful Cursor run ID via the finalize step.

## 10. Related

- `docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md`
- `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md`
- `docs/operations/CURSOR_DISPATCHER_CHECKLIST_V1.md`
- `docs/operations/OPERATOR_BRIDGE_V1.md`
- Issues #249, #493, #511, #548 (throughput / activation context)
- Revenue issues #653 (Lead Rescue), #654 (Website Rescue) — separate workstreams
- Ops issue #658 (Slack retirement) — parallel ops lane when eligible
