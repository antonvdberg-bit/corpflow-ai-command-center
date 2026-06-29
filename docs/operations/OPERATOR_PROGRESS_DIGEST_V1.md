# Operator Progress Digest v1 — dispatcher cadence + format

**Status:** Docs/process only. Authorizes no runtime change, no deploy, no secret/DB action.
**Owner:** Anton (operator).
**Executor (this doc):** Cursor.
**Created:** 2026-06-29.
**Implements:** part of [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493) (parallel execution board).
**Anchor sentinel:** `<!-- OPERATOR_PROGRESS_DIGEST_V1 -->`

<!-- OPERATOR_PROGRESS_DIGEST_V1 -->

## 1. Purpose

So Anton can see parallel work **moving** without reading every PR, Cursor posts a short
**Dispatcher Digest** 2–3 times per day. The digest is a glance: which lanes moved, what is
blocked, what needs Anton, and what happens in the next few hours. It is the heartbeat of the
Parallel Execution Board (`PARALLEL_EXECUTION_BOARD_V1.md`).

## 2. Cadence

- **2–3× per day** on an active day (e.g. morning, midday, end-of-day — Anton's timezone is
  UTC+4). On a quiet day, **1** digest is enough; on a heavy day, **3**.
- Posted as a **GitHub comment** on **#249** (command ledger). For parallel-execution items
  also reference / cross-post the lane summary on **#493**.
- A digest is **also posted on every state change that needs Anton** (an `AWAITING_OPERATOR`
  event does not wait for the next scheduled digest).
- The digest is **report-only**. It never implies a merge happened, a deploy happened, or a
  send happened unless that is true and evidenced.

## 3. Canonical digest format

Use this exact skeleton. One `Lane:` block per active lane (A–F). Keep each field to one line.

```text
CorpFlowAI Dispatcher Digest
Time: <YYYY-MM-DD HH:MM UTC+4>
Overall status: <one line — e.g. "5 of 6 lanes active; 1 PR open; 0 blockers; 1 item awaiting Anton">
Active lanes:

* Lane: <A–F + theme>
  Owner: <Cursor | Codex(research) | Anton | shared>
  Last movement: <what changed since last digest, or "none">
  Next action: <single next step>
  Blocked: Yes/No <reason if Yes>
  Anton needed: Yes/No <what, if Yes>
  Next checkpoint: <when/what the next visible movement is>
  Open PRs: <#/none>
  Open issues requiring movement: <#/none>
  Codex tasks active: <task IDs/none>
  Blocked items: <list/none>
  Anton approval queue: <items waiting on Anton for this lane/none>
  Next 4 hours: <what this lane will do next>
```

After the per-lane blocks, append the roll-up:

```text
Roll-up
Anton approval queue (all lanes): <numbered list, or "empty">
Throughput today: lanes moved <n>/6 | PRs opened <n> / merged <n> | oldest open PR age <h>h | Codex issued/imported <n>/<n>
Can Anton ignore this for now? <yes/no + one-line reason>
```

## 4. Telegram-ready format (compact)

When the digest is mirrored to Telegram (operator alert channel), use this compact form —
plain text, no markdown tables, short enough for a phone glance. **No secrets, no tokens, no
chat IDs in the body** (the bridge §6 rule still applies).

```text
CorpFlowAI Digest — <DD MMM HH:MM>
Status: <one line>
A Revenue/ProductA: <move> | next: <action> | Anton: <yes/no>
B Medspa/Codex: <move> | next: <action> | Anton: <yes/no>
C Server/Chatwoot(#487): <move> | next: <action> | Anton: <yes/no>
D Cloud-first(#485): <move> | next: <action> | Anton: <yes/no>
E Comms email+WA(#486/#492): <move> | next: <action> | Anton: <yes/no>
F Living Word: <move> | next: <action> | Anton: <yes/no>
Open PRs: <#/none>  Blocked: <n>  Awaiting Anton: <n>
Next 4h: <one line>
Approval queue: <empty | 1) … 2) …>
```

Keep it under ~12 lines so it reads as one Telegram message.

## 5. Throughput / utilisation metrics (definitions)

Counted by reading GitHub state at digest time — **no tracking code, no DB, no external
service**. Mirrors `PARALLEL_EXECUTION_BOARD_V1.md` §8.

| Metric | How counted | Reported as |
|---|---|---|
| **Lanes moved** | Lanes with a recorded movement since the previous digest. | `n/6` |
| **PRs opened today** | Cursor PRs opened since 00:00 UTC+4. | `n` |
| **PRs merged today** | PRs Anton merged since 00:00 UTC+4. | `n` |
| **Oldest open-PR age** | Hours since the oldest still-open PR was opened. | `h` hours |
| **Anton approval queue depth** | Distinct items in any lane at `AWAITING_OPERATOR`. | `n` (soft cap 5) |
| **Codex issued / imported** | Register rows moved to `REQUESTED` / `IMPORTED` today. | `n/n` |
| **Blocked lanes** | Lanes in `Blocked` with a named dependency. | `n` |

Interpretation guidance (operator glance, not SLAs):

- **Opened ≫ merged for several digests** → WIP ballooning; dispatcher should stop opening
  new work and drive existing PRs to merge.
- **Approval queue > 5** → digest must lead with the queue; gated work pauses until it drains
  (`PARALLEL_EXECUTION_BOARD_V1.md` §4).
- **Oldest open-PR age > 24h on docs-only** → flag it in `Overall status`.

## 6. Rules for an honest digest

- **No fabrication.** Never report a merge, deploy, live-verify, or send that did not happen.
  `HOLDING`/`none` is always allowed; guessing is not (bridge §9).
- **Anton-needed is explicit.** If a lane needs Anton, it must appear in the approval queue
  roll-up with the exact action.
- **Movement must be real.** "Last movement: none" is a valid and useful entry; do not invent
  progress to fill the line.
- **Secrets never appear.** No tokens, keys, chat IDs, private URLs, tenant data
  (`docs/runbooks/OPERATOR_BRIDGE.md` §6).
- **Source of truth stays `main` + #249.** The digest is a view, not a decision.

## 7. Worked example (illustrative)

```text
CorpFlowAI Dispatcher Digest
Time: 2026-06-29 15:00 UTC+4
Overall status: 6 of 6 lanes active; 1 PR open (this board); 0 blockers; 1 item awaiting Anton (merge)
Active lanes:

* Lane: A — Revenue / Product A / pilot delivery
  Owner: shared (Cursor + Anton)
  Last movement: reviewed Product-A readiness DoD against delivery-reality
  Next action: draft next buyer-facing surface PR under brand/conversion doctrine
  Blocked: No
  Anton needed: No (only at merge + live-verify)
  Next checkpoint: next digest
  Open PRs: none
  Open issues requiring movement: #249
  Codex tasks active: none
  Blocked items: none
  Anton approval queue: none
  Next 4 hours: outline the next surface packet

* Lane: C — Server safety / backups / monitoring / Chatwoot gate
  Owner: shared (Cursor docs + Anton server actions)
  Last movement: lane activated on the board
  Next action: draft server-safety baseline + Chatwoot decision/pilot-gate doc (decision-only)
  Blocked: No
  Anton needed: Yes — any install/backup target is operator-gated
  Next checkpoint: decision doc PR
  Open PRs: none
  Open issues requiring movement: #487
  Codex tasks active: none
  Blocked items: none
  Anton approval queue: none
  Next 4 hours: start the decision doc

Roll-up
Anton approval queue (all lanes): 1) Merge PR for #493 (parallel execution board)
Throughput today: lanes moved 6/6 | PRs opened 1 / merged 0 | oldest open PR age 0h | Codex issued/imported 0/0
Can Anton ignore this for now? no — one merge is waiting (the board PR), everything else is autonomous
```

## 8. Cross-references

- `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md` — lanes, WIP, metrics source.
- `docs/operations/CURSOR_DISPATCHER_CHECKLIST_V1.md` — when to post a digest.
- `docs/operations/CODEX_TASK_REGISTER_V1.md` — Codex task counts feeding the digest.
- `docs/operations/OPERATOR_BRIDGE_V1.md`, `docs/runbooks/OPERATOR_BRIDGE.md` — STATUS schemas + human summary + no-secrets rule.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`.

## 9. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs/process only.
- **Implementation:** none. No runtime, env, secrets, DB, deploy, Telegram automation
  (the Telegram format is a manual paste shape, not a wired bot).
- **Verdict:** PARTIAL by design — the cadence/format is documented; reporting stays under
  existing gates and `main` + #249 remain source of truth.
