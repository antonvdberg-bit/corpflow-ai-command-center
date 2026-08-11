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
- production (`client_production`) vs preview vs corpflow_test (`test`)
- research/docs vs runtime
- database/schema vs UI (unless the issue explicitly requires both)
- one client’s work vs another’s

Consolidation is allowed only when explicitly justified and safe.

**Environment doctrine:** CorpFlowAI-hosted tenant/factory surfaces (`lux.*`, `cipc*`, `core.*`, etc.) are **`corpflow_test`**, not client production. See `docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md` (#679).

## 2. Reuse the current route

| Existing piece | Role |
|----------------|------|
| `.github/workflows/factory-dispatcher-activate.yml` | Scheduled + manual + **Phase A `issues:labeled`** activator (canonical) |
| `scripts/dispatcher-agent-activation.mjs` | Cursor Cloud activation (existing) |
| `lib/server/cursor-ops-status.js` | Issue comment posting + Control Tower status (existing) |
| **`lib/server/cursor-issue-dispatch-lifecycle.js`** | Classification, WIP, segregation, comment templates (**this packet**) |
| **`lib/server/cursor-ready-event-dispatch.js`** | Exact-label event predicates + effective target resolution (Phase A) |
| **`scripts/cursor-issue-dispatch-scan.mjs`** | Label scan → discover/classify/eligibility plan (**this packet**) |
| **`scripts/cursor-issue-dispatch-finalize.mjs`** | Post-activation claim labels + run ID comment (**this packet**) |

Do **not** add a parallel workflow that also activates Cursor. The thin `cursor-ready-wakeup.yml` wrapper was removed in Phase A — the canonical workflow owns the `issues:labeled` trigger. The scan runs as a **prep step** inside the existing workflow and may hand **at most one** `activationTargetIssue` to the existing activator path. Event-driven runs activate only the labeled issue when that issue is scan-eligible.

## 3. Labels

| Label | Meaning |
|-------|---------|
| `dispatch:cursor-ready` | Eligible for Cursor discovery/claim |
| `dispatch:cursor-claimed` | Cursor owns execution (remove ready when claimed) — **display state only** for WIP |
| `status:in-progress` | Active work — **display state only** for WIP |
| `execution:paused` | Excluded from new activation; preserves the issue (#862) |
| `dispatch:blocked` | Do not claim |
| `needs:anton` | Protected gate — unlock required (Decision Inbox routing; **not** durable approval) |

**Decision Inbox reason labels** (ensure with lifecycle labels; see `docs/operations/ANTON_DECISION_INBOX_V1.md`): `approval:merge`, `approval:deploy`, `approval:production`, `approval:db-schema`, `approval:env-secrets`, `approval:external-send`, `approval:payment`, `approval:paid-tool`, `approval:public-launch`.

**Label provisioning (workflow-owned, not manual):** The existing `factory-dispatcher-activate.yml` scan/finalize path idempotently **ensures** the approved lifecycle labels **and** Decision Inbox `approval:*` labels exist before any claim mutation. Anton must **not** create these labels manually in the GitHub UI unless ensure fails.

**Labels never unlock protected actions.** Only durable operator authorization for the **exact** protected gate counts — see `docs/operations/PROTECTED_ACTION_GATES_V1.md` and §5a below.

If label creation or verification fails (missing labels after ensure, GitHub API error, or insufficient token scope), the workflow **fails closed**: the run stops, no claim labels are applied, and operators see **one actionable blocker** naming the missing label(s) or API failure — fix repo label state or workflow permissions, then re-run the scan on `main` (dry-run is fine).

## 4. WIP limits (default) — verified Cursor runs (#862)

| Scope | Limit |
|-------|-------|
| Verified active Cursor runs (activation metadata with run ID) | **2** |
| Active issues per tenant | **1** |
| Active database/schema issues (repo-wide) | **1** |
| Active **client_production**-deployment candidates | **1** |
| Live Cursor activations per GHA run | **1** (unchanged) |

**WIP Control v1 rules:**

- A slot counts only when current activation metadata proves an active Cursor run/generation.
- Lifecycle labels alone never consume capacity; stale/orphaned labels are reconciled before dispatch.
- Priority order for ready work: `priority:P0` > `priority:P1` > `priority:P2` > unprioritized (stable oldest-ready tie-break).
- `execution:paused` ready work is skipped; removing the label restores eligibility. Pausing a live run does not invent an external kill — the verified slot remains until terminal.
- Open PR count does **not** affect Cursor WIP capacity.
- Operator-review / closed / terminal-failed transitions release the slot and strip active execution labels in the same lifecycle step.
- Every scan emits a capacity packet naming exact run IDs for occupied slots.

Publishing to CorpFlowAI-hosted **corpflow_test** surfaces does **not** consume the client_production WIP slot and does **not** set `protectedGate: production`.

Research/documentation-only tasks may run separately only when they cannot conflict with implementation file areas.

## 5. Scan behaviour

1. Discover open issues with `dispatch:cursor-ready` via **GitHub GraphQL** (fallback: paginated Issues API + **client-side label filter**). Do **not** use the Search API — colon labels (`dispatch:cursor-ready`) return zero results.
2. Infer `WORK CLASSIFICATION` (system boundary, tenant, environment, work type, protected gate).
3. Reject `dispatch:blocked`. For protected-gate issues, evaluate the **latest valid operator authorization for that exact gate** (see §5a). No matching approval → hold claim. Matching approval → continue normal WIP / isolation / priority checks. Still post discovery + classification either way.
4. Enforce WIP + concurrency. Sibling product holds (e.g. #654 vs #653) do **not** suppress unrelated eligible ops work (e.g. #658 Slack retirement).
5. Post acknowledgement comments when `GITHUB_TOKEN` has `issues: write` (GHA path).
6. **Do not** apply claim labels during **scan**. Acquire `dispatch:cursor-claimed` + durable claim marker **before** the Cursor API call (`scripts/dispatcher-agent-activation.mjs` claim-before-API). Finalize records the real run ID / origin metadata after success, or releases the claim on failure (`scripts/cursor-issue-dispatch-finalize.mjs`).
7. Emit `cursor-issue-dispatch-scan.json` with `eligibleIssueNumbers`, `claimIssueNumbers`, and `activationTargetIssue` (max **one** live Cursor activation per GHA cycle).
8. Stale claimed issues (no meaningful update beyond threshold): exception-only status request — no heartbeat spam.
9. **Double-activation guard:** issue-keyed GHA concurrency (`factory-dispatcher-activate-<issue|scan>`) + durable claim-before-API. Duplicate/racing activators return `SKIP_ALREADY_CLAIMED`. Explicit requeue requires `CURSOR REQUEUE` generation marker + restored `dispatch:cursor-ready`.

### 5a. Operator gate authorization resume (#887)

**Rule:** No valid operator authorization → Cursor does **not** claim the gated work item. Valid operator authorization for that **exact** gate → Cursor re-evaluates and claims automatically when WIP permits.

Durable machine-readable record (preferred):

```text
### OPERATOR GATE AUTHORIZATION

- issue: #886
- gate: database
- author: antonvdberg-bit
- decision: approve
- recorded_at: 2026-08-11T05:02:03.000Z
- notes: unlock ERPNext application access

<!-- corpflow.operator_gate_authorization.v1 {"schema":"corpflow.operator_gate_authorization.v1","issue":886,"gate":"database","author":"antonvdberg-bit","decision":"approve","recordedAt":"2026-08-11T05:02:03.000Z","notes":"unlock ERPNext application access"} -->
```

Also accepted as durable GitHub evidence:

| Source | Notes |
|--------|-------|
| `### OPERATOR GATE AUTHORIZATION` (+ optional HTML JSON) | Exact gate + decision (`approve` / `reject` / `revoke`) |
| `### ANTON DURABLE APPROVAL` | Mapped via Decision Inbox `approval:*` → protected gate |
| Explicit Anton operator-authorization comment/body that names the gate unlock | e.g. #879 `ANTON EXPLICIT OPERATOR AUTHORIZATION` removing `protected gate: database` |

Semantics:

- Evaluated on **every** scan from issue body + comments (author + timestamp preserved).
- Latest record for the **exact** gate wins; newer `reject` / `revoke` beats older `approve`.
- Authorization for gate A never unlocks gate B.
- No issue recreation, label toggling, or Anton courier step after a valid approval — capacity + isolation still apply.
- Helpers: `lib/server/operator-gate-authorization.js` (`evaluateOperatorGateAuthorization`).

### Source issues vs open PRs

**GitHub issues labelled `dispatch:cursor-ready` are activation inputs.** Open PRs from prior work are **not** automatically resumed or merged by the dispatcher. Each issue gets its own branch/PR cycle; operators merge manually after review.

### Preferred cadence

| Mode | Trigger |
|------|---------|
| **Primary (Phase A)** | `issues:labeled` with exact label `dispatch:cursor-ready` |
| Fallback | every **30 minutes** (`*/30 * * * *`) for missed events / absence-of-event recovery |
| Previous | every 2 hours |

Cost remains negligible (Node script + GitHub API). Scheduled `cursor_live` still requires `CURSOR_LIVE_ENABLED=true` and the throughput packet gate for dispatcher-sourced activations. Event-driven `cursor_live` uses the same `CURSOR_API_KEY` + claim-before-API path; WIP and protected gates still block activation.

## 6. Acknowledgement stages

Durable GitHub comments (templates in code):

| Stage | Marker |
|-------|--------|
| A | `CURSOR DISPATCH DISCOVERED` |
| B | `CURSOR ACTIVATION CLAIM` (pending, **before** Cursor API) then `CURSOR DISPATCH ACTIVATED` (run ID after success) |
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
5. **Anton** — only protected gates (**client_production**, DB, secrets, payment, messaging, outreach, spend, public launch, high-risk tenancy). Merge onto the CorpFlowAI test spine after CI is operator/human merge approval — not client_production approval.
5. **Anton** — only protected gates (production, DB, secrets, payment, messaging, outreach, spend, public launch, high-risk tenancy), routed via the **Anton Decision Inbox** (`needs:anton` + `approval:*`), not via ad-hoc chat alone.

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

- `docs/operations/CORPFLOW_ENVIRONMENT_CLASSIFICATION_V1.md` — corpflow_test vs client_production (#679)
- `docs/execution/DISPATCHER_AGENT_ACTIVATION_V1.md`
- `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md`
- `docs/operations/CURSOR_DISPATCHER_CHECKLIST_V1.md`
- `docs/operations/OPERATOR_BRIDGE_V1.md`
- Issues #249, #493, #511, #548 (throughput / activation context)
- Revenue issues #653 (Lead Rescue), #654 (Website Rescue) — separate workstreams
- Ops issue #658 (Slack retirement) — parallel ops lane when eligible
- Issue #679 — environment classification doctrine
- Issue #887 — operator gate authorization must resume Cursor activation
- `lib/server/operator-gate-authorization.js` — durable gate authorization evaluation
