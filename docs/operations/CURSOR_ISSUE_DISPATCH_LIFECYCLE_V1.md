# Cursor issue dispatch lifecycle v1 — segregated GitHub → Cursor claims

**Status:** Production execution is **CorpFlowAI Cursor Factory Handoff** → Cursor Automation **CorpFlowAI Factory Wake Proof** / MODE B (#913 / merged PR #914 / #930). The Background Agents API workflow `factory-dispatcher-activate.yml` is **LEGACY / DIAGNOSTIC / NOT PRODUCTION EXECUTION** (`workflow_dispatch` only).
**Owner:** Anton (policy); Cursor (implementation).
**Created:** 2026-07-28.
**Updated:** 2026-08-25 (#1059 follow-up — bounded native-wake receipt).
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
| `.github/workflows/factory-cursor-handoff.yml` | **`CorpFlowAI Cursor Factory Handoff` (#913 / #930)** — **sole production wake path**. Eligibility/capacity wake that **succeeds only** when exactly one eligible source issue is selected; successful completion wakes Cursor Automation MODE B (no Cursor API key). **No** `schedule:` on this named workflow |
| `.github/workflows/factory-queue-reconcile.yml` | **`CorpFlowAI Factory Queue Reconcile` (#1023)** — thin 10-minute missed-event / orphan scan. Reuses existing eligibility / WIP / pause / operator-review rules and **`workflow_call`s Handoff only** when a real eligible issue exists and verified WIP permits. It also reconciles the bounded *receipt* for an already-successful native wake; it does not send a second wake or create another executor. Empty scans succeed silently. |
| `.github/workflows/cursor-agent-lifecycle-status.yml` | Terminal/operator-review poller; **`workflow_call`s** the Automation handoff workflow on capacity release. Does **not** wake the legacy API dispatcher. Discovers **claimed** Cursor issues only — it cannot start work that was never claimed |
| `.github/workflows/factory-dispatcher-activate.yml` | **LEGACY / DIAGNOSTIC / NOT PRODUCTION EXECUTION** — Background Agents API activator, **`workflow_dispatch` only**. Must not auto-launch from schedule, labels, comments, or capacity events |
| `scripts/dispatcher-agent-activation.mjs` | Cursor Cloud activation (legacy API diagnostic path) |
| `scripts/factory-cursor-handoff.mjs` / `lib/server/factory-cursor-handoff.js` | Select one eligible issue, encode handoff packet/comment, fail closed when no handoff (#913) |
| `scripts/factory-queue-reconcile.mjs` / `lib/server/factory-queue-reconcile.js` | 10-minute whole-queue gate: decide whether to `workflow_call` Handoff (#1023). Never posts Cursor webhook / issue comments / Telegram |
| `lib/server/cursor-ops-status.js` | Issue comment posting + Control Tower status (existing) |
| **`lib/server/cursor-issue-dispatch-lifecycle.js`** | Classification, WIP, segregation, comment templates (**this packet**) |
| **`lib/server/cursor-ready-event-dispatch.js`** | Exact-label + eligibility-wake predicates + effective target resolution (consumed by Handoff in production) |
| **`scripts/cursor-issue-dispatch-scan.mjs`** | Label scan → discover/classify/eligibility plan (**this packet**) |
| **`scripts/cursor-issue-dispatch-finalize.mjs`** | Post-activation claim labels + run ID comment (legacy API diagnostic path) |

Do **not** add another management-platform dispatcher. **Production Cursor execution** is the dedicated handoff workflow named exactly `CorpFlowAI Cursor Factory Handoff` — it does not call the Cursor API; MODE B starts from workflow success on `main` with one encoded source issue. The older `factory-dispatcher-activate.yml` Background Agents API path is **not** a production executor and must not compete with Wake Proof. Handoff reuses the same eligibility / verified WIP scan and may hand **at most one** source issue per run. Issue-scoped event runs prefer the event issue when scan-eligible; capacity backfill runs a full priority scan. Empty/suppressed handoff runs **fail closed** so Automation does not wake.

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

**Label provisioning (workflow-owned, not manual):** The Handoff scan path (and the legacy diagnostic activator, when run manually) idempotently **ensures** the approved lifecycle labels **and** Decision Inbox `approval:*` labels exist before any claim mutation. Anton must **not** create these labels manually in the GitHub UI unless ensure fails.

**Labels never unlock protected actions.** Only durable operator authorization for the **exact** protected gate counts — see `docs/operations/PROTECTED_ACTION_GATES_V1.md` and §5a below.

If label creation or verification fails (missing labels after ensure, GitHub API error, or insufficient token scope), the workflow **fails closed**: the run stops, no claim labels are applied, and operators see **one actionable blocker** naming the missing label(s) or API failure — fix repo label state or workflow permissions, then re-run the scan on `main` (dry-run is fine).

## 4. WIP limits (default) — verified Cursor runs (#862 / #976)

The two factory channels are **active execution capacity**, not all unmerged work.

| Class | Consumes a factory slot? |
|-------|--------------------------|
| **Execution WIP** — current-generation Cursor implementation still running | **Yes** (cap **2**) |
| **Review/decision inventory** — merge-ready PRs, `dispatch:operator-review`, protected-approval waits, external/scheduled waits | **No** |

| Scope | Limit |
|-------|-------|
| Verified **active execution** Cursor runs (current-generation implementation still running) | **2** |
| Review/decision inventory (merge-ready / operator-review / approval wait) | **uncapped by execution WIP** |
| Active issues per tenant | **1** |
| Active database/schema issues (repo-wide) | **1** |
| Active **client_production**-deployment candidates | **1** |
| Live Cursor activations per GHA run | **1** (unchanged) |

**WIP Control v1 rules:**

- A slot counts only when **current-generation** activation metadata proves an **active Cursor implementation run**. Historical `CURSOR DISPATCH ACTIVATED` / origin evidence before the latest `CURSOR REQUEUE` does not occupy WIP.
- Claim comments are append-only: the latest status for a claim token is authoritative. Terminal (`released` / `completed`) claims consume zero slots and reconcile stale execution labels.
- Lifecycle labels alone never consume capacity; stale/orphaned labels are reconciled before dispatch.
- Priority order for ready work: `priority:P0` > `priority:P1` > `priority:P2` > unprioritized (stable oldest-ready tie-break).
- `execution:paused` ready work is skipped; removing the label restores eligibility. Pausing a live run does not invent an external kill — the verified slot remains until terminal.
- Open / merge-ready PR count is **review/decision inventory**, not execution WIP. Two merge-ready PRs must not fill both factory channels.
- Operator-review, merge-ready / implementation-complete, closed, and terminal-failed transitions **release the execution slot immediately** and strip active execution labels in the same lifecycle step. Handoff then backfills the freed slot.
- Waiting for operator review, merge, protected approval, or an external/scheduled decision does **not** reserve a channel because rework might later be requested. Bounded rework uses `CURSOR REQUEUE` plus a real continuation run; only that continuation consumes execution WIP.
- Every scan emits a capacity packet naming exact run IDs for occupied **execution** slots and listing review/decision inventory separately.

Publishing to CorpFlowAI-hosted **corpflow_test** surfaces does **not** consume the client_production WIP slot and does **not** set `protectedGate: production`.

Research/documentation-only tasks may run separately only when they cannot conflict with implementation file areas.

## 5. Scan behaviour

1. Discover open issues with `dispatch:cursor-ready` via **GitHub GraphQL** (fallback: paginated Issues API + **client-side label filter**). Do **not** use the Search API — colon labels (`dispatch:cursor-ready`) return zero results.
2. Infer `WORK CLASSIFICATION` (system boundary, tenant, environment, work type, **protected subjects mentioned**, **protected consequential gate**).
3. Reject `dispatch:blocked`. Skip new claim for `execution:paused`, already claimed, and `dispatch:operator-review` (prior generation awaits review — activator would `SKIP_ALREADY_CLAIMED`; do not waste the free WIP slot). For issues whose **consequential gate** is not `none`, evaluate the **latest valid operator authorization for that exact gate** (see §5a). No matching approval → hold claim at that boundary only. Matching approval (including Anton’s explicit active-task instruction) → continue normal WIP / isolation / priority checks. Still post discovery + classification either way.
4. Enforce WIP + concurrency. Sibling product holds (e.g. #654 vs #653) do **not** suppress unrelated eligible ops work (e.g. #658 Slack retirement).
5. Post acknowledgement comments when `GITHUB_TOKEN` has `issues: write` (GHA path).
6. **Do not** apply claim labels during **scan**. Acquire `dispatch:cursor-claimed` + durable claim marker **before** the Cursor API call (`scripts/dispatcher-agent-activation.mjs` claim-before-API). Finalize records the real run ID / origin metadata after success, or releases the claim on failure (`scripts/cursor-issue-dispatch-finalize.mjs`).
7. Emit `cursor-issue-dispatch-scan.json` with `eligibleIssueNumbers`, `claimIssueNumbers`, and `activationTargetIssue` (max **one** live Cursor activation per GHA cycle).
8. Stale claimed issues (no meaningful update beyond threshold): exception-only status request — no heartbeat spam.
9. **Double-activation guard:** issue-keyed GHA concurrency on `CorpFlowAI Cursor Factory Handoff` (`factory-cursor-handoff-<issue|scan>`) plus verified WIP. The legacy API activator, if run manually, still uses durable claim-before-API and `SKIP_ALREADY_CLAIMED`. Explicit requeue requires `CURSOR REQUEUE` generation marker + restored `dispatch:cursor-ready`. Claim comments are an **append-only state machine**: the latest status for the same `(sourceIssue, generation, claimToken)` is authoritative (`released` / `completed` supersede earlier `pending` / `activated`). Distinct claim tokens in the same generation still race (earliest token wins). `CURSOR REQUEUE` is a generation boundary — historical `CURSOR DISPATCH ACTIVATED` / origin evidence from an older generation cannot occupy current WIP or block a new attempt.

### 5a. Operator gate authorization resume (#887 / #896)

**Ordinary work moves immediately.** Anton requesting the task is sufficient for discover / inspect / read / test / prepare / design / code / branch / PR / CI / evidence / corpflow_test / prepare-migration / prepare-message-without-send.

**Gate only the consequential action.** Classification distinguishes:

| Field | Meaning |
|-------|---------|
| Protected subjects mentioned | Informational — task discusses DB, secrets, messaging, payment, etc. **Does not block claim.** |
| Protected consequential gate | Claim-blocking only when the active task asks to **execute** the exact protected consequence (e.g. run prisma migrate, change env/secrets, send live message, client_production deploy). |

**List-form prohibitions (#962 / #950):** A leading `No` / `Do not` applies to every comma-separated item in the **same sentence**. `No schema, env/secrets, …, production deploy` is a prohibition, not `protectedGate: production`. Adjacent `no production deploy` still matches. Sentence-ending punctuation stops the lead, so `No schema. Then production deploy to client_production` and affirmative `production deploy is required` / `deploy to client_production` remain fail-closed.

**Rule:** No valid operator authorization → Cursor does **not** claim work that is **currently attempting** an unauthorized consequential gate. Valid operator authorization for that **exact** gate → Cursor re-evaluates and claims automatically when WIP permits. Authorization for gate A never unlocks gate B.

Anton’s **active-task instruction** that already explicitly authorizes the consequential action is sufficient — do **not** require a second durable comment, label toggle, issue recreation, or Anton courier step. The system may persist/normalize that instruction for machine consumption automatically.
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
| Active-task Anton instruction that already authorizes the exact consequence | e.g. #893 secure Cursor environment/settings approval; #896 governance rollout approval — **no second ceremony** |

Semantics:

- Evaluated on **every** scan from issue body + comments (author + timestamp preserved).
- Latest record for the **exact** gate wins; newer `reject` / `revoke` beats older `approve`.
- Authorization for gate A never unlocks gate B.
- No issue recreation, label toggling, or Anton courier step after a valid approval — capacity + isolation still apply.
- Helpers: `lib/server/operator-gate-authorization.js` (`evaluateOperatorGateAuthorization`).

### Source issues vs open PRs

**GitHub issues labelled `dispatch:cursor-ready` are activation inputs.** Open PRs from prior work are **not** automatically resumed or merged by the dispatcher. Each issue gets its own branch/PR cycle; operators merge manually after review.

### Preferred cadence / eligibility wakes (#891 / #930)

| Mode | Trigger |
|------|---------|
| **Primary — ready label** | `issues:labeled` with exact label `dispatch:cursor-ready` → **CorpFlowAI Cursor Factory Handoff** |
| **Primary — operator authorization** | `issue_comment` created with durable `OPERATOR GATE AUTHORIZATION` / `ANTON DURABLE APPROVAL` / explicit Anton unlock (human actors only; bots ignored) → **Handoff** |
| **Primary — queue control** | `issues:unlabeled` `execution:paused`, or `issues:labeled` `priority:P0\|P1\|P2` while issue already has `dispatch:cursor-ready` → **Handoff** |
| **Primary — capacity backfill** | Lifecycle status reaches terminal/operator-review and releases verified WIP → **`workflow_call`s CorpFlowAI Cursor Factory Handoff** (full priority scan). Does **not** wake the legacy API dispatcher |
| **Fallback — whole-queue reconcile (#1023 / #1041)** | `CorpFlowAI Factory Queue Reconcile` every **10 minutes** (`*/10 * * * *`) scans GitHub ready/claimed state. If eligible work exists and verified WIP has a free slot, it **`workflow_call`s Handoff** (`wake_reason=scheduled_reconciliation`, `target_issue` = scanned source). GitHub reusable workflows inherit the caller `event_name` (`schedule` / manual `workflow_dispatch`), so Handoff’s job `if` also accepts `inputs.wake_reason == scheduled_reconciliation` and does **not** require `event_name=workflow_call`. No eligible work / paused / operator-review / WIP full / recent duplicate handoff → **silent success, no Cursor wake**. Event-driven Handoff triggers remain primary |
| Diagnostic only | `factory-dispatcher-activate.yml` `workflow_dispatch` — Background Agents API smoke; **not** production execution |

**Internal SLA:** eligible queued work should normally begin within **5 minutes** of an eligibility-changing event (`ELIGIBILITY_WAKE_SLA_MINUTES`) via Handoff → Wake Proof. The named Handoff workflow has **no** `schedule:` trigger (empty scheduled successes must not wake Automation). Missed-event / orphan recovery is the thin `#1023` reconciler, which only calls Handoff when a real eligible issue exists.

### 5b. Native-wake acknowledgement boundary (#1059)

A successful Handoff now records `corpflow.factory_cursor_handoff_receipt.v1` only **after**
the Cursor wake webhook returns success. Its initial state is `PENDING`; this is deliberately
not `IN_PROGRESS`.

The existing 10-minute Queue Reconcile cadence examines the source issue for independent
Cursor-side evidence:

| Receipt outcome | Required evidence / action |
|---|---|
| `IN_PROGRESS` | A Cursor-origin agent/run identifier (including the Cursor bot’s agent URL) is copied into durable origin metadata, then `dispatch:cursor-claimed` / `status:in-progress` are applied. |
| `BLOCKED` | Cursor itself reported `BLOCKED: <reason>`; the exact reason is persisted and the ready label is removed. |
| `SUPPRESSED` | Cursor itself reported `SUPPRESSED: <reason>`; the exact reason is persisted and the ready label is removed. |
| `NOT_RECEIVED` | No Cursor agent/run evidence was observable by the five-minute receipt deadline. Queue Reconcile records `cursor_ack_timeout_no_agent_or_run_evidence`, removes ready, and applies `dispatch:blocked` so the next valuable eligible item can use capacity. |

The 10-minute cadence means this state becomes durable within one reconciliation pass after
the five-minute deadline (bounded by roughly 15 minutes from a successful wake). It is not a
retry loop and it never re-labels/cycles the same packet.

**Current hard limit:** `NOT_RECEIVED` means *no observed Cursor acknowledgement*, not proof
of whether Cursor dropped, accepted, or internally suppressed the webhook. The native
Automation interface currently exposes webhook acceptance but no correlated agent-creation
receipt/callback. The exact missing transport boundary is:

```text
MISSING TRANSPORT BOUNDARY — Cursor Automation → GitHub lifecycle evidence
```

The smallest compatible runtime improvement is for the existing **CorpFlowAI Factory Wake
Proof v2** Automation to write one correlated source-issue comment or callback containing
`source_issue`, Handoff run ID, disposition (`IN_PROGRESS` / `BLOCKED` / `SUPPRESSED`), and
Cursor agent/run ID where started. No second executor, dispatcher, database, or n8n workflow
is required for that acknowledgement.

Cost remains negligible (Node script + GitHub API). Production execution does **not** call the Cursor Background Agents API. Bot/`GITHUB_TOKEN` comments and lifecycle labels never wake (storm prevention). Duplicate Cursor runs are blocked by verified WIP + Handoff duplicate suppression. The legacy API path, if invoked manually, still uses claim-before-API + `SKIP_ALREADY_CLAIMED`.

### Operator procedure (no courier role)

1. Create / queue the work once (`dispatch:cursor-ready`).
2. If gated, Anton records **one** durable decision (`OPERATOR GATE AUTHORIZATION` or Decision Inbox durable approval).
3. After approval, the system wakes itself and claims when WIP permits — **do not** toggle labels or re-create the issue.
4. When an active run reaches merge-ready / terminal / operator-review, the system immediately **releases execution WIP** and backfills the freed slot from the highest eligible priority **through Handoff / Wake Proof**. Review/decision inventory does not reserve the channel.
5. Alert Anton only for a genuine unresolved gate or repeated activation failure.

Do **not** rely on the legacy API dispatcher schedule or a second Background Agents API worker.

## 6. Acknowledgement stages

Durable GitHub comments (templates in code):

| Stage | Marker |
|-------|--------|
| Wake receipt | `CURSOR HANDOFF RECEIPT` (`PENDING` is not execution; then `IN_PROGRESS`, `BLOCKED`, `NOT_RECEIVED`, or `SUPPRESSED`) |
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
node --test node-tests/factory-cursor-handoff.test.mjs
node --test node-tests/factory-queue-reconcile.test.mjs
node scripts/cursor-issue-dispatch-scan.mjs --dry-run --prefer 653,654,658
node scripts/cursor-issue-dispatch-finalize.mjs --dry-run --scan-file cursor-issue-dispatch-scan.json
```

`--apply-comments` requires a token with `issues: write` (GitHub Actions `github.token`). Claim labels require a successful Cursor run ID via the finalize step.

### Post-merge end-to-end pilot (#1023)

The 10-minute schedule only runs on the default branch. After this workflow is on `main`, prove with three harmless repo-only synthetic issues (no client/runtime/data changes):

1. First eligible item starts without `workflow_dispatch` or Anton reopening Cursor.
2. One intentionally failing CI fixture is returned for bounded correction by the existing CI Cursor repair supervisor.
3. Correction is recognized; capacity release wakes the next eligible item.
4. Third item stops at a synthetic operator-approval gate, then resumes only after a durable approval marker.
5. A deliberately stale/orphaned synthetic state is recovered on the scheduled reconciliation pass.
6. GitHub contains issue → handoff → Cursor run/agent → branch → PR → CI → terminal evidence.
7. No production deploy, DB/schema/env/secrets/payment/messaging/outreach/public launch.

This packet does **not** create those synthetic issues. Schedule-driven proof is post-merge.

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
- Issue #891 — approval and capacity changes must wake dispatcher automatically
- Issue #913 / PR #914 — CorpFlowAI Cursor Factory Handoff (MODE B)
- Issue #930 — Wake Proof is the sole production Cursor executor; API dispatcher is diagnostic only
- Issue #1023 — 10-minute whole-queue reconciliation fallback (thin wrapper → existing Handoff)
- `lib/server/operator-gate-authorization.js` — durable gate authorization evaluation
