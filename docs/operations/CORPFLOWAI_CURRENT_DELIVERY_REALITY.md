# CorpFlowAI — current delivery reality

**Status:** Canonical operating-model snapshot (docs/control-plane only).  
**Operating model version:** `2026-10-02-v2`.  
**Controller documentation decision:** 2026-10-04 (documentation-only exception and routing discipline).  
**Owner:** Anton (operator).  
**Controller:** [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661)  
**As of:** Runtime snapshot retained from 2026-10-02 (#1367/#1370/#1372); controller documentation/routing decision approved 2026-10-04. This revision does not change or re-verify runtime configuration.  
**Anchor:** `<!-- CORPFLOWAI_CURRENT_DELIVERY_REALITY -->`

<!-- CORPFLOWAI_CURRENT_DELIVERY_REALITY -->

> **DEFAULT DELIVERY POSTURE: MOVE WORK, DO NOT WAIT FOR PICKUP.**
>
> Meaning: no passive waiting for agents; no Anton courier role between Cursor stages;
> use dispatcher/lifecycle evidence; progress the next **permitted** stage automatically.
>
> This does **not** authorize: autonomous merge, production deploy, protected changes,
> external sends, payment, or schema changes.

If any older orchestration doc, chat memory, or handoff packet conflicts with this file on
**who executes, how work starts, and when Anton is needed**, **this file wins**.
Implementation detail stays in the linked runbooks — do not duplicate it here.

### Governance protection

This file is part of the protected operating-doctrine class defined in
`config/protected-operating-doctrine.v1.json`.

Lower-level workstreams may discover evidence that the operating model should change, but they
must **propose** that change explicitly rather than silently rewriting global doctrine.
The governing rule is:

> **Discover locally -> propose globally -> approve centrally.**

A pull request that changes a protected doctrine path must be classified as a
`governance-change`, carry the required governance-impact packet, and still receive explicit
Anton approval before merge. The label and packet are classification/evidence only; they do not
constitute approval.

---

## 1. Proven operating model (current `main`)

### 1.1 Source of truth

CorpFlowAI uses four durable truth classes:

- **Git / repo docs** — slow-moving doctrine, architecture and runbooks.
- **Postgres Context / Agent Learning** — transactional organisational memory with provenance, status and supersession.
- **GitHub** — work / delivery lineage: issues, claims, PRs, commits, checks and acceptance evidence.
- **ERPNext** — commercial and financial truth.

**Chat history is discovery context only, not organisational truth.** See
`docs/operations/ORGANIZATIONAL_MEMORY_AND_AGENT_BOOTSTRAP_V1.md`.

Runtime-state questions must also use current runtime evidence; stale doctrine never overrides verified current runtime facts.

### 1.1a Controller duties and documentation routing

Routine summarisation, task evaluation, evidence review, learning capture, documentation and routing are mandatory ChatGPT/Codex controller duties. Bounded documentation-only branch edits and reviewable PR preparation are permitted under the operator-approved exception in `AGENTS.md` § Controller work and routing discipline. Merge and protected-action approval remain separate.

Cursor receives work only when the originating item records a concrete implementation need and why the controller or an existing deterministic/approved Forge contract cannot adequately perform it. Do not dispatch routine controller work solely because a durable record or PR is needed. Existing closeout and learning rules remain mandatory. This is a documentation policy; no dispatcher code or runtime setting changes here.

### 1.2 Cursor Factory Automation — canonical primary production executor

- `CorpFlowAI Cursor Factory Handoff` is the permanent GitHub Actions handoff workflow on `main` (merged PR #914).
- Eligible work is selected from GitHub using current factory eligibility, priority, pause and verified-WIP rules.
- A successful dedicated handoff on `main` wakes native Cursor Automation MODE B; the workflow does **not** call the Cursor API and does not require a Cursor API key on this path.
- Exactly one eligible source issue is handed to one Cursor cloud run; the enforced WIP cap is **one verified active Cursor implementation run** (#1249).
- Paused, operator-review, completed/superseded, duplicate-active and otherwise ineligible work is skipped.
- Completion / PR / checks are detected automatically and capacity can wake the next permitted item.
- Unchanged lifecycle events are deduped.
- **Anton must not** be used as courier between Cursor stages and Cursor Desktop is not required for normal cloud execution.

Detail: `docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md`,
`docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md`, controller #903, issue #913, merged PR #914.

### 1.3 Forge — bounded LOW-tier local worker

Forge is the durable **worker identity**, not a permanently fixed model.

Verified implementation source: **#1367**.

Current runtime:
- host: `corpflow-exec-01-u69678`;
- Ollama 0.34.4, container `corpflow-local-llm`;
- selected model `qwen2.5-coder:7b-instruct-q2_K`;
- resource cage: 4 GiB RAM / 3 CPU;
- private endpoint only with persistent model volume;
- deterministic task contract + verifier; fail closed and escalate.

Approved routing from #1372:
`deterministic automation -> Forge -> Cursor -> higher-cost path only when justified`.

Forge is suitable for bounded LOW-tier transforms, fixtures, log parsing, packet validation and small deterministic test repair. It is **not** authorised to merge, deploy, mutate production DB/schema/data, change env/secrets/access, initiate payment, or send/publish externally.

Shared static context/task-contract scaffolding is merged in PR #1376. Dynamic experience/learning belongs in the shared Postgres Context / Agent Learning fabric from #1370/#1371; no second memory DB.

### 1.4 Codex — specialist worker (human trigger once)

- GitHub-native Cloud trigger requires **one human-authored** `@codex …` PR comment.
- State before that trigger = **`AWAITING_HUMAN_TRIGGER`**.
- After acknowledgement, lifecycle monitoring is automated.
- **`RUNNING` is silent.**
- Completion is detected from **GitHub evidence**.
- Anton must **not** manually monitor Codex after the trigger (exception notifier pages only real gates).

Detail: `docs/operations/CODEX_SPECIALIST_LIFECYCLE_V1.md`.

### 1.5 OpenHands — retired

**Decision executed 2026-09-25:** OpenHands runtime and runnable restore package were removed. OpenHands is not an active, standby, fallback, routing, or cost-control surface. Historical evidence remains in Git history and issue #1132.

### 1.6 n8n — exception-only supervisor / deterministic automation spine

- Existing **GitHub Heartbeat Checker** remains the exception-only supervisor.
- n8n may relay/watch/notify and run deterministic business automation, but it is **not** the AI work planner for the Factory execution path.
- Normal running work stays **silent**.
- Anton is alerted only for: genuine required action, exhausted failure/stale conditions,
  protected decisions, or the explicit Codex human-trigger page.
- **No** hourly / open-PR noise.

Detail: `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md`,
`docs/runbooks/N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684.md`,
`docs/runbooks/N8N_CURSOR_COMPLETION_EVENT_LIVE_APPLY_661.md`.

### 1.7 Cross-executor rule

**One source work packet → one executor claim/generation.**  
Forge, Cursor and Codex may **not** concurrently claim the same packet.

Route eligible work by the governing cost/value doctrine: deterministic automation first, then Forge for bounded LOW-tier work, then Cursor for multi-file/integration/complex work, with higher-cost paths only when justified. If Forge fails its bounded contract, escalate the same packet; do not create a competing duplicate workstream.

### 1.8 Delivery behaviour (chats / operators)

Do **not** say “wait for Cursor to pick it up” when the item is eligible for automatic dispatch.

Instead:

1. Check claim / activation / lifecycle evidence on GitHub first.
2. If **unclaimed and eligible** → move it toward dispatch.
3. If **active** → inspect status (do not re-activate).
4. If **completed** → inspect PR/checks and continue the next permitted stage.
5. Escalate **only** genuine gates.

### 1.9 Anton involvement (only)

- Merge / release / protected approvals
- Production deploy (**client_production** consequential action)
- Env / secrets (**exact consequential change**)
- DB / schema (**exact consequential mutation**)
- Payment
- Live messaging / outreach
- Public / client launch
- **One** human Codex `@codex` trigger (when that specialist path is prepared)
- Genuine unrecoverable blocker

**Ordinary vs consequential (#896):** Anton’s direct instruction in the active task authorizes ordinary reversible delivery work immediately (discover, inspect, test, prepare, PR, CI, corpflow_test, evidence). Protected gates stop only the **exact consequential action**. Subject mentions (database, secrets, messaging, payment, deploy) alone must **not** freeze the whole work package. If Anton already explicitly authorized that exact consequence in the active task, no second operator-authorization ceremony is required.
---

## 2. Existing-chat staleness rule (mandatory)

Existing conversations may contain **stale orchestration assumptions** (manual pickup,
Anton-as-courier, “wait for the agent,” notify-only dispatcher).

On any of the following, refresh **current runtime evidence where relevant + current GitHub + this doc + relevant shared Context / Agent Learning records where available** before answering:

- progress request
- “what next”
- “is Cursor/Forge/Codex done?”
- dispatch request
- executor/runtime question
- historical-state question
- agent blocker
- delivery acceleration request

Do **not** rely on remembered/manual-pickup assumptions or chat history as authoritative.

---

## 3. Bootstrap rule (for ChatGPT / Cursor / handoff packets)

> Before giving CorpFlowAI progress, dispatch, next-action, blocker, executor/runtime,
> or historical-state advice, check this file, `docs/operations/ORGANIZATIONAL_MEMORY_AND_AGENT_BOOTSTRAP_V1.md`,
> relevant CURRENT Context / Agent Learning records where available, current GitHub issue/PR/commit/CI state,
> and live/runtime evidence when the question is about current runtime. Chat history is discovery-only.

If a packet records an older operating-model version than the version at the top of this file,
refresh the packet against current `main` before continuing.

---

## 4. Sources (reference only — do not duplicate)

| Topic | Link |
|-------|------|
| Legacy controller / lifecycle foundation | [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661) |
| Cursor Factory Automation controller | [#903](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/903) |
| Permanent Factory handoff | [#913](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/913), merged PR #914 |
| Cursor lifecycle | `docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md` |
| Codex specialist | `docs/operations/CODEX_SPECIALIST_LIFECYCLE_V1.md` |
| Cursor issue dispatch | `docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md` |
| Forge local coding runtime / worker baseline | #1367 |
| Shared Agent Learning Fabric | #1370; merged PR #1371 + PR #1376 |
| Cost-aware execution doctrine | #1372 |
| Organisational memory/bootstrap doctrine | `docs/operations/ORGANIZATIONAL_MEMORY_AND_AGENT_BOOTSTRAP_V1.md` |
| Documentation-control incident | #1379 |
| OpenHands retirement evidence | #1132; historical package recoverable only through Git history |
| n8n heartbeat (exception-only) | `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md` |
| Protected doctrine manifest | `config/protected-operating-doctrine.v1.json` |
| Earlier merged lifecycle PRs | #815 (Codex), #802 / #790 / #786 (Cursor), #688 (#684 exception-only), #655 (issue dispatch) |

Protected-action gates and Decision Inbox remain unchanged:
`docs/operations/PROTECTED_ACTION_GATES_V1.md`,
`docs/operations/ANTON_DECISION_INBOX_V1.md`.
