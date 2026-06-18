# Operator Bridge Digest v1 — planning packet

**Status:** Planning documentation only. **No automation implemented.**

**Verdict:** `BRIDGE DIGEST PLAN CAPTURED — CLEAN BRANCH — NO AUTOMATION IMPLEMENTED`

**Owner:** Anton (operator / approver).

**Captured:** 2026-06-18.

**Anchor sentinel:** `<!-- OPERATOR_BRIDGE_DIGEST_V1_ANCHOR -->`

<!-- OPERATOR_BRIDGE_DIGEST_V1_ANCHOR -->

**References (read-only pointers — not modified by this packet):**

- `docs/operations/OPERATOR_BRIDGE_V1.md`
- `docs/runbooks/OPERATOR_BRIDGE.md`
- `docs/execution/DELIVERY_ACCELERATION_V1.md`
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`

If any conflict, **those canonical docs win**.

---

## 1. Problem statement

Anton still carries too much **manual communication** between three surfaces:

| Surface | Limitation |
| ------- | ---------- |
| **ChatGPT** | Strong at strategy and packet drafting; **not 24/7**; cannot observe live repo/CI state without Anton relaying context. |
| **Cursor** | Primary in-repo executor; **depends on Anton's laptop (L1)** for local runs and chat handoffs. |
| **Codex Cloud** | Can work in OpenAI's cloud (L2 executor #2) but needs **precise packet assignment and state** on a shared coordination surface. |

**GitHub Issue #249** (`Operator Bridge — Active Work Queue`) is the live coordination inbox, but Anton must still scroll long comment threads, cross-check open PRs, and infer what needs a merge click versus what can wait.

**Repo documentation** on `main` is **durable truth** — but it is **too slow and too noisy** for live "what do I do next?" coordination.

**Goal:** Define a **read-only digest process** that summarizes active work, blockers, PRs, and required Anton actions — posted to **#249** — so Anton can scan one comment instead of reconstructing state from chat, issues, and PR lists.

---

## 2. Destination model

| Layer | Role | Source of truth? |
| ----- | ---- | ---------------- |
| **GitHub Issue #249** | Live operational inbox — STATUS, decisions, HOLDs, blockers, digest comments | **Yes — for live coordination** |
| **`main` + repo docs** | Durable architecture, packet definitions, closure records | **Yes — for durable truth** |
| **Pull requests** | Work product, CI evidence, merge candidates | Work product only |
| **ChatGPT** | Drafts strategy and decisions **through Anton** | No |
| **Cursor** | Executes named packets; posts STATUS to #249 | No |
| **Codex Cloud** | Same as Cursor on `codex/*` branches; posts STATUS to #249 | No |
| **Anton** | Merge, secrets, DNS, billing, production authority, final verdicts | **Yes — for operator gates** |
| **Slack / Telegram** | Optional notification mirrors (future) | **No — must not become source of truth** |

**Rule:** If a digest comment disagrees with `main` or a later executor STATUS on #249, **`main` and the latest authoritative STATUS win**. The digest is a summary, not a new authority.

```text
ChatGPT proposes → Anton approves → Named executor executes → STATUS on #249
→ Anton merges / acts on gates → Closure mirrored to durable records
```

---

## 3. Digest format

### 3.1 Header

```text
### Bridge digest — <YYYY-MM-DD HH:MM UTC>

**Source:** Manual | GitHub Actions (read-only)
**Issue:** #249
**Digest version:** v1
```

### 3.2 Human scan block (required)

```text
ANTON ACTION REQUIRED?
<yes | no>

IF YES — TOP ACTIONS (max 3)
1. …

CAN ANTON IGNORE THIS DIGEST?
<yes/no — one-line reason>
```

### 3.3 Active work table

| Active packets | Executor | Branch / PR | Current state | Blocker | Next Anton action | Next executor action |
| -------------- | -------- | ----------- | ------------- | ------- | ----------------- | -------------------- |
| `<packet>` | Cursor \| Codex Cloud | `#nnn` | see §4 | `<line or —>` | `<line or none>` | `<line or none>` |

### 3.4 Supplemental sections

- **Stale items** — no STATUS update within agreed window (default 7 days).
- **Recently merged** — PR, merge SHA, verdict.
- **Open PRs not on active packet list** — orphan PRs flagged for review.

### 3.5 Footer

```text
---
*Digest is read-only summary. Authoritative state: latest executor STATUS on #249 + `main`. No secrets in digest.*
```

---

## 4. Digest states

| State | Meaning |
| ----- | ------- |
| **IN_PROGRESS** | Executor claimed packet; work underway |
| **BLOCKED** | HOLD or technical/policy blocker |
| **AWAITING_ANTON** | AAP §3 gate or pre-merge approval needed |
| **READY_TO_MERGE** | Green CI; executor requests merge |
| **MERGED_PENDING_VERIFICATION** | Merged; live verification incomplete |
| **COMPLETE** | Closure posted; packet terminal |
| **STALE** | No STATUS update within agreed window |

Executor schema uses `AWAITING_OPERATOR` and `HOLDING`; digest maps these to **AWAITING_ANTON** and **BLOCKED** respectively.

---

## 5. Proposed implementation phases

| Phase | What ships | Automation |
| ----- | ---------- | ---------- |
| **0** | This document (docs-only protocol) | None |
| **1** | Manual digest comment on #249 using §3 template | None |
| **2** | GitHub Actions read-only digest job | Scheduled GHA (separate approved PR) |
| **3** | Optional Telegram/Slack notification mirror | Link + first line only; not source of truth |
| **4** | Optional labels: `bridge:needs-anton`, `bridge:blocked`, `bridge:ready-to-merge` | Advisory labels in GitHub UI |

**Phase 0 does not** create workflows, secrets, Slack bots, or runtime changes.

---

## 6. First automation candidate (Phase 2 — not in this PR)

| Field | Detail |
| ----- | ------ |
| **Home** | L2 — GitHub Actions |
| **Schedule** | e.g. daily UTC + `workflow_dispatch` |
| **Reads** | Issue #249 comments; open PRs for `antonvdberg-bit/corpflow-ai-command-center` |
| **Writes** | One new comment on #249 using §3 format |
| **Credentials** | Default `GITHUB_TOKEN` only (future PR) — no CorpFlow production secrets |
| **`MASTER_ADMIN_KEY`?** | No |
| **`CORPFLOW_CRON_SECRET`?** | No |
| **Mutation risk** | Low — issue comment only |
| **Rollback** | Disable workflow |
| **First verification** | Manual `workflow_dispatch`; Anton confirms accuracy before schedule |

**Not in scope for Phase 2 v1:** CMP/Postgres, Vercel API, live URL probes, workflow file in this planning PR.

---

## 7. Guardrails

- Docs only in this packet.
- No app code, runtime behavior change, env vars, or secrets.
- No OpenAI key handling, GitHub settings changes, or server/L3 commands.
- No n8n, restic, containers, or workflow changes in this PR.
- No Slack implementation yet.
- No autonomous AI-to-AI execution.
- No direct ChatGPT-to-Cursor pipe.
- No autonomous merge.
- No secret values in digest comments.

---

## 8. Decisions (recommended)

1. **Live coordination truth:** GitHub Issue **#249**.
2. **Durable truth:** **`main`** and canonical docs.
3. **Slack/Telegram:** notification mirrors only (Phase 3+).
4. **First implementation after approval:** Phase 2 read-only GitHub Actions digest (separate PR).

---

## 9. Phase 1 manual template (copy-paste for #249)

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

| Active packets | Executor | Branch / PR | Current state | Blocker | Next Anton action | Next executor action |
| -------------- | -------- | ----------- | ------------- | ------- | ----------------- | -------------------- |
| … | … | … | … | … | … | … |

#### Stale items
- …

#### Recently merged
- …

---
*Digest is read-only summary. Authoritative state: latest STATUS on #249 + `main`. No secrets in digest.*
```

---

## Document history

| Version | Date (UTC) | Change |
| ------- | ---------- | ------ |
| v1 | 2026-06-18 | Initial digest planning — clean single-file branch. |
