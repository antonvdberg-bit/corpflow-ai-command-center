# CorpFlowAI — current delivery reality

**Status:** Canonical operating-model snapshot (docs/control-plane only).  
**Operating model version:** `2026-08-09-v1`.  
**Owner:** Anton (operator).  
**Controller:** [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661)  
**As of:** current `main` (Cursor + Codex lifecycle packets merged).  
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

**GitHub** is the durable work/evidence source of truth (issues, claims, PRs, checks,
lifecycle comments, Decision Inbox labels).

### 1.2 Cursor — automatic primary execution worker

- Eligible claimed work can be **activated automatically** (factory dispatcher + issue scan).
- **Claim-before-API** prevents duplicate activation (`SKIP_ALREADY_CLAIMED`).
- Run/agent lifecycle is **monitored off-laptop** (GHA status runner).
- Completion / PR / checks are **detected automatically**.
- Unchanged lifecycle events are **deduped** (no repeat noise).
- **Anton must not** be used as courier between Cursor stages.

Detail: `docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md`,
`docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md`.

### 1.3 Codex — specialist worker (human trigger once)

- GitHub-native Cloud trigger requires **one human-authored** `@codex …` PR comment.
- State before that trigger = **`AWAITING_HUMAN_TRIGGER`**.
- After acknowledgement, lifecycle monitoring is automated.
- **`RUNNING` is silent.**
- Completion is detected from **GitHub evidence**.
- Anton must **not** manually monitor Codex after the trigger (exception notifier pages only real gates).

Detail: `docs/operations/CODEX_SPECIALIST_LIFECYCLE_V1.md`.

### 1.4 OpenHands — optional operational worker

- Installed/available as an **optional** worker when separately assigned.
- Must **not** be placed on the critical path merely because it exists.
- Must **not** overlap another executor claim on the same packet.

### 1.5 n8n — exception-only supervisor

- Existing **GitHub Heartbeat Checker** is the exception-only supervisor.
- Normal running work stays **silent**.
- Anton is alerted only for: genuine required action, exhausted failure/stale conditions,
  protected decisions, or the explicit Codex human-trigger page.
- **No** hourly / open-PR noise.

Detail: `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md`,
`docs/runbooks/N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684.md`,
`docs/runbooks/N8N_CURSOR_COMPLETION_EVENT_LIVE_APPLY_661.md`.

### 1.6 Cross-executor rule

**One source work packet → one executor claim/generation.**  
Cursor, Codex, and OpenHands may **not** concurrently claim the same packet.

### 1.7 Delivery behaviour (chats / operators)

Do **not** say “wait for Cursor to pick it up” when the item is eligible for automatic dispatch.

Instead:

1. Check claim / activation / lifecycle evidence on GitHub first.
2. If **unclaimed and eligible** → move it toward dispatch.
3. If **active** → inspect status (do not re-activate).
4. If **completed** → inspect PR/checks and continue the next permitted stage.
5. Escalate **only** genuine gates.

### 1.8 Anton involvement (only)

- Merge / release / protected approvals
- Production deploy
- Env / secrets
- DB / schema
- Payment
- Live messaging / outreach
- Public / client launch
- **One** human Codex `@codex` trigger (when that specialist path is prepared)
- Genuine unrecoverable blocker

---

## 2. Existing-chat staleness rule (mandatory)

Existing conversations may contain **stale orchestration assumptions** (manual pickup,
Anton-as-courier, “wait for the agent,” OpenHands-as-default, notify-only dispatcher).

On any of the following, refresh **current GitHub + this doc** before answering:

- progress request
- “what next”
- “is Cursor done?”
- dispatch request
- agent blocker
- delivery acceleration request

Do **not** rely on remembered/manual-pickup assumptions from prior turns.

---

## 3. Bootstrap rule (for ChatGPT / Cursor / handoff packets)

> Before giving CorpFlowAI progress, dispatch, next-action or blocker advice,
> check `docs/operations/CORPFLOWAI_CURRENT_DELIVERY_REALITY.md` and current GitHub
> issue/PR state. Do not rely on remembered/manual-pickup assumptions.

If a packet records an older operating-model version than the version at the top of this file,
refresh the packet against current `main` before continuing.

---

## 4. Sources (reference only — do not duplicate)

| Topic | Link |
|-------|------|
| Controller | [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661) |
| Cursor lifecycle | `docs/operations/ACTIVE_AGENT_CONTROL_LOOP_V1.md` |
| Codex specialist | `docs/operations/CODEX_SPECIALIST_LIFECYCLE_V1.md` |
| Cursor issue dispatch | `docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md` |
| n8n heartbeat (exception-only) | `docs/runbooks/N8N_GITHUB_HEARTBEAT_CHECKER_V1.md` |
| Protected doctrine manifest | `config/protected-operating-doctrine.v1.json` |
| Merged lifecycle PRs (examples) | #815 (Codex), #802 / #790 / #786 (Cursor), #688 (#684 exception-only), #655 (issue dispatch) |

Protected-action gates and Decision Inbox remain unchanged:
`docs/operations/PROTECTED_ACTION_GATES_V1.md`,
`docs/operations/ANTON_DECISION_INBOX_V1.md`.
