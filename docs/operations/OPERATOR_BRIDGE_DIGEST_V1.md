# Operator Bridge Digest v1 — planning packet

**Status:** Planning documentation only. **No automation implemented.**

**Verdict:** `BRIDGE DIGEST PLAN CAPTURED — NO AUTOMATION IMPLEMENTED`

**Owner:** Anton (operator / approver).

**Captured:** 2026-06-18.

**Anchor sentinel:** `<!-- OPERATOR_BRIDGE_DIGEST_V1_ANCHOR -->`

<!-- OPERATOR_BRIDGE_DIGEST_V1_ANCHOR -->

**Companion docs:**

- `docs/operations/OPERATOR_BRIDGE_V1.md` — bridge architecture, message schemas, hold rules
- `docs/runbooks/OPERATOR_BRIDGE.md` — day-to-day STATUS posting
- `docs/execution/DELIVERY_ACCELERATION_V1.md` — multi-executor model (Cursor + Codex Cloud)
- `docs/execution/CODEX_UTILIZATION_PLAN_V1.md` — Codex entitlement and L2 posture
- `docs/execution/CODEX_CLOUD_ACTIVATION_PACKET_V1.md` — Codex install + first packet
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — what requires Anton
- `docs/execution/WEEKEND_EXECUTION_QUEUE.md` — approved packet queue
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — L1/L2/L3 boundaries

If any conflict, **those canonical docs win** until Anton approves a downstream amendment.

---

## 1. Problem statement

Anton still carries too much **manual communication** between three surfaces:

| Surface | Limitation |
| ------- | ---------- |
| **ChatGPT** | Strong at strategy and packet drafting; **not 24/7**; cannot observe live repo/CI state without Anton relaying context. |
| **Cursor** | Primary in-repo executor; **depends on Anton's laptop (L1)** for local runs and chat handoffs. |
| **Codex Cloud** | Can work in OpenAI's cloud (L2 executor #2) but needs **precise packet assignment and state** on a shared coordination surface. |

**GitHub Issue #249** (`Operator Bridge — Active Work Queue`) already exists as the live coordination inbox per `OPERATOR_BRIDGE_V1.md`, but Anton must still **scroll long comment threads**, **cross-check open PRs**, and **infer** what needs a merge click vs what can wait.

**Repo documentation** (`main`, packet docs, `artifacts/chat_history.md`) is **durable truth** — but it is **too slow and too noisy** for live "what do I do next?" coordination. Docs record decisions; they do not replace a standing operational summary.

**Goal of this packet:** Define a **read-only digest process** that periodically summarizes active work, blockers, PRs, and required Anton actions — posted back to **#249** — so Anton can scan one comment instead of reconstructing state from chat, issues, and PR lists.

---

## 2. Destination model

| Layer | Role | Source of truth? |
| ----- | ---- | ---------------- |
| **GitHub Issue #249** | Live operational inbox — STATUS, decisions, HOLDs, blockers, **digest comments** | **Yes — for live coordination** |
| **`main` + repo docs** | Durable architecture, packet definitions, closure records | **Yes — for durable truth** |
| **Pull requests** | Work product, CI evidence, merge candidates | Work product (not coordination truth) |
| **ChatGPT** | Drafts strategy, packets, decision text **through Anton** | No — proposals only |
| **Cursor** | Executes named packets on approved branches; posts STATUS to #249 | No — executor only |
| **Codex Cloud** | Same as Cursor on `codex/*` branches; posts STATUS to #249 | No — executor only |
| **Anton** | Merge, secrets, DNS, billing, packet approval, final verdicts | **Yes — for operator gates** |
| **Slack / Telegram** | Optional **notification mirrors** (future) | **No** — must never become source of truth |

**Rule:** If a digest comment disagrees with `main` or with a later executor STATUS on #249, **`main` and the latest authoritative STATUS win**. The digest is a **summary**, not a new authority.

**Coordination flow (unchanged from Operator Bridge v1):**

```text
ChatGPT proposes → Anton approves → Named executor (Cursor | Codex Cloud) executes
→ Executor posts STATUS to #249 → Anton merges / acts on gates → Closure mirrored to chat_history
```

**Digest adds:** a scheduled or manual **rollup comment** on #249 that lists all active packets in one scan-friendly view.

---

## 3. Digest format

Each digest comment (manual Phase 1 or automated Phase 2) uses this structure.

### 3.1 Header

```text
### Bridge digest — <YYYY-MM-DD HH:MM UTC>

**Source:** Manual (Anton/Cursor) | GitHub Actions (read-only)
**Issue:** #249
**Digest version:** v1
```

### 3.2 Human scan block (required)

Anton should not read the full table to know if action is required.

```text
ANTON ACTION REQUIRED?
<yes | no>

IF YES — TOP ACTIONS (max 3)
1. <merge PR #n | rotate secret | approve packet | review PR #n>
2. …

CAN ANTON IGNORE THIS DIGEST?
<yes/no + one-line reason>
```

### 3.3 Active work table

| Active packet | Executor | Branch / PR | Current state | Blocker | Next Anton action | Next executor action |
| ------------- | -------- | ----------- | ------------- | ------- | ----------------- | -------------------- |
| `<packet name>` | Cursor \| Codex Cloud | `#nnn` or branch | see §4 | `<one line or —>` | `<one line or none>` | `<one line or none>` |

### 3.4 Supplemental sections

```text
#### Stale items
- <packet or PR with no STATUS update > N days; last seen …>

#### Recently merged (since last digest)
- PR #nnn — <title> — merge SHA <short> — verdict COMPLETE|PARTIAL|FAILED|n/a docs-only

#### Open PRs not on active packet list
- PR #nnn — <author/executor> — <title> — checks <green|red|running> — note if orphan

#### Awaiting operator (rollup)
- <list every packet in AWAITING_ANTON or READY_TO_MERGE>
```

### 3.5 Footer

```text
---
*Digest is read-only summary. Authoritative state: latest executor STATUS on this issue + `main`. No secrets in digest.*
```

---

## 4. Digest states

Map executor STATUS headers (`OPERATOR_BRIDGE_V1.md` §5.1) to digest row **Current state**:

| Digest state | Meaning | Typical Anton action |
| ------------ | ------- | -------------------- |
| **IN_PROGRESS** | Executor claimed packet; work underway | None (monitor) |
| **BLOCKED** | HOLD per §6; technical or policy blocker | Review blocker; approve scope change or hold |
| **AWAITING_ANTON** | AAP §3 gate or pre-merge approval | Merge, secret, DNS, billing, or explicit approve |
| **READY_TO_MERGE** | Green CI; executor requests merge | Squash-merge PR |
| **MERGED_PENDING_VERIFICATION** | Merged; live verification or Delivery Reality Audit incomplete | Wait for closure or run live checks |
| **COMPLETE** | Closure posted; packet terminal | None |
| **STALE** | No STATUS update within agreed window (default **7 days**) | Review: cancel, re-assign, or nudge executor |

**Mapping notes:**

- Executor schema uses `AWAITING_OPERATOR`; digest uses **`AWAITING_ANTON`** (same meaning).
- Executor schema uses `HOLDING`; digest uses **`BLOCKED`** unless Anton prefers HOLDING in manual digests — automated digest should use **BLOCKED**.
- **`FAILED`** from executor STATUS appears under **BLOCKED** or its own row with blocker text; do not mark **COMPLETE**.

---

## 5. Proposed implementation phases

| Phase | Name | What ships | Automation | Anton approval |
| ----- | ---- | ---------- | ---------- | -------------- |
| **0** | Docs-only protocol | This document + cross-links | None | This planning PR |
| **1** | Manual digest template | Executor or Anton posts digest using §3 template on #249 (e.g. weekly or before merge sessions) | None | Optional habit; no repo change |
| **2** | GitHub Actions read-only digest | Scheduled workflow reads #249 comments + open PRs; posts one digest comment | **Read-only GHA job** | **Separate implementation PR** after Phase 0 approved |
| **3** | Notification mirror (optional) | Telegram or Slack posts **link + first line** of digest | Webhook or bot | **Deferred** — mirror only, not source of truth |
| **4** | Label vocabulary (optional) | `bridge:needs-anton`, `bridge:blocked`, `bridge:ready-to-merge`, etc. | `gh issue edit` / PR labels | Operator creates labels in GitHub UI; advisory only |

**Phase 0 (this PR) does not:**

- Create the workflow file
- Add secrets
- Post to #249 automatically
- Implement Slack/Telegram

**Phase alignment with `OPERATOR_BRIDGE_V1.md` §8:**

- Bridge v1 Phase 1 (issue #249 live) — **done** (issue #249 confirmed).
- Digest Phase 1 — **manual rollup** on top of existing STATUS discipline.
- Bridge v1 Phase 2 (labels) — aligns with Digest Phase 4.
- Bridge v1 Phase 4 (automation) — Digest Phase 2 is the **first concrete automation candidate**.

---

## 6. First automation candidate (Phase 2 — not in this PR)

**Proposed workflow name:** `operator-bridge-digest.yml` (name only — **not created in this packet**)

| Field | Detail |
| ----- | ------ |
| **Home** | L2 — GitHub Actions (`ubuntu-latest`) |
| **Schedule** | e.g. `0 7 * * *` UTC daily + `workflow_dispatch` |
| **Inputs (read-only)** | GitHub API: issue #249 comments (parse `### Cursor status`, `### Closure`, `**State:**`, `**Executor:**`, `ANTON TO-DO` blocks); open PRs for this repo |
| **Output** | One new comment on #249 using §3 format; prefix `**[automated digest]**` in header |
| **Credentials (names only, future PR)** | `GITHUB_TOKEN` (default `GITHUB_TOKEN` with `issues: write` + `pull-requests: read`) — **no new CorpFlow production secrets** |
| **`MASTER_ADMIN_KEY` required?** | **No** |
| **`CORPFLOW_CRON_SECRET` required?** | **No** |
| **Mutation risk** | **Low** — creates issue comment only; does not merge, close issues, or edit `main` |
| **Audit trail** | GHA run log + digest comment on #249 |
| **Rollback** | Disable workflow; delete erroneous digest comment manually if needed |
| **First verification step** | Manual `workflow_dispatch`; Anton confirms digest matches his understanding before enabling schedule |

**Parsing strategy (Phase 2 implementation note):**

1. Fetch last N comments on #249 (e.g. 100).
2. Extract latest STATUS per **Packet** key (or per PR number).
3. Cross-reference open PRs; flag PRs with no matching packet STATUS as **orphan**.
4. Mark **STALE** if latest STATUS older than 7 days (configurable).
5. Never paste secret-shaped strings — redact if detected.

**Out of scope for Phase 2 v1:** CMP/Postgres reads, Vercel deployment API, live URL probes (those stay executor/manual closure duties).

---

## 7. Guardrails (non-negotiable)

| Guardrail | Status in this packet |
| --------- | ---------------------- |
| No autonomous AI-to-AI execution | **Preserved** — digest summarizes; it does not assign or execute packets |
| No direct ChatGPT-to-Cursor pipe | **Preserved** — ChatGPT still routes through Anton |
| No autonomous merge | **Preserved** — digest may recommend merge; Anton merges |
| No env vars or secrets in this planning PR | **Preserved** — docs only |
| No server / L3 commands | **Preserved** |
| No n8n changes | **Preserved** |
| No Slack implementation | **Preserved** — Phase 3 deferred |
| No runtime behavior change | **Preserved** — Phase 0 only |
| No secret values in digest comments | **Required** — shape names only (per `OPERATOR_BRIDGE.md` §6) |
| `main` wins over digest | **Required** |

---

## 8. Decisions (recommended)

| # | Decision | Recommendation |
| - | -------- | -------------- |
| 1 | **Live coordination source of truth** | **GitHub Issue #249** — STATUS + digest comments; not chat threads, not Slack |
| 2 | **Durable source of truth** | **`main` + canonical docs** + `artifacts/chat_history.md` for closure |
| 3 | **Slack / Telegram** | **Notification mirrors only** (Phase 3+); link to #249 digest comment; never authoritative state |
| 4 | **First implementation after this PR** | **Phase 2 — read-only GitHub Actions digest** posting to #249 (separate PR, Anton approval) |
| 5 | **Manual interim** | **Phase 1** — Anton or Cursor posts weekly manual digest using §3 until Phase 2 ships |
| 6 | **Codex Cloud coordination** | Codex posts executor STATUS per runbook; digest rolls up `**Executor:** Codex Cloud` rows same as Cursor |

---

## 9. Example digest row (illustrative — not live state)

| Active packet | Executor | Branch / PR | Current state | Blocker | Next Anton action | Next executor action |
| ------------- | -------- | ----------- | ------------- | ------- | ----------------- | -------------------- |
| Laptop dependency burn-down v1 | Cursor | PR #397 | AWAITING_ANTON | — | Review + merge planning PR | Post closure after merge |
| Codex Cloud activation | Cursor | PR #396 | AWAITING_ANTON | Codex not installed | Review activation packet | Await install checklist |
| Codex utilization plan v1 | Cursor | PR #394 | AWAITING_ANTON | — | Review execution policy | Post closure after merge |

*Example rows reflect open PRs at planning time; automated digest must compute from live API data.*

---

## 10. Phase 1 manual template (copy-paste for #249)

```text
### Bridge digest — <YYYY-MM-DD HH:MM UTC>

**Source:** Manual
**Issue:** #249
**Digest version:** v1

ANTON ACTION REQUIRED?
<yes | no>

IF YES — TOP ACTIONS (max 3)
1. …

CAN ANTON IGNORE THIS DIGEST?
<yes/no — reason>

| Active packet | Executor | Branch / PR | Current state | Blocker | Next Anton action | Next executor action |
| ------------- | -------- | ----------- | ------------- | ------- | ----------------- | -------------------- |
| … | … | … | … | … | … | … |

#### Stale items
- …

#### Recently merged (since last digest)
- …

#### Open PRs not on active packet list
- …

---
*Digest is read-only summary. Authoritative state: latest executor STATUS on this issue + `main`. No secrets in digest.*
```

---

## 11. Cross-references

| Doc | Role |
| --- | ---- |
| `docs/operations/OPERATOR_BRIDGE_V1.md` | Parent protocol |
| `docs/runbooks/OPERATOR_BRIDGE.md` | STATUS schemas + human summary blocks |
| `docs/execution/DELIVERY_ACCELERATION_V1.md` | Executor identity in STATUS |
| `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` | Checklist gate if Phase 2 ships |
| `.cursor/rules/delivery-reality.mdc` | MERGED_PENDING_VERIFICATION semantics |

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-18 | Initial digest planning packet — phases 0–4, format, states, Phase 2 GHA candidate, guardrails. |
