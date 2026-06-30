# n8n GitHub Heartbeat Checker v1 — runbook (Stage 0)

**Status:** Docs/runbook only (Stage 0). **No runtime, no secrets, no env, no activation.**
**Owner:** Anton (operator) for secrets/activation; Cursor for repo-side docs + template.
**Created:** 2026-06-30.
**Implements:** GitHub issue [#495](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/495) — *n8n scheduled GitHub heartbeat checker — approved implementation packet*.
**Operates under:** [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493) parallel execution board (Lane C-adjacent: monitoring/throughput).
**Anchor sentinel:** `<!-- N8N_GITHUB_HEARTBEAT_CHECKER_V1 -->`

<!-- N8N_GITHUB_HEARTBEAT_CHECKER_V1 -->

## 0. What this is (and is not)

A scheduled, **internal** heartbeat that watches CorpFlowAI Action-Plan throughput
(the #493 lanes, #249 bridge, open Action-Plan issues, recent PRs, dispatcher-digest
freshness) and **alerts only when work is stale, blocked, or needs Anton**. It exists
to stop passive waiting — so a stalled lane raises a hand instead of sitting silent.

It is **not** a customer-facing surface, not an outreach tool, not a send channel, and
not an autonomous executor. It only **reads** GitHub state and **notifies** the operator.
It never merges, deploys, sends customer messages, writes the DB, or executes code.

This runbook is **Stage 0** of the issue-#495 sequence:

| Stage | What | Authorization | This PR |
|---|---|---|---|
| **0** | Docs/runbook (this file) + secret-free n8n template | docs-only — proceeds now | **YES** |
| **1** | Importable, **inactive**, secret-free n8n workflow template | docs-only — proceeds now | **YES** (template ships with this runbook) |
| **2** | Internal test activation in n8n | **Anton-gated** — needs n8n + GitHub credential handling confirmed | NO |
| **3** | Evidence + tuning (first heartbeat run, first stale-detection test, first Telegram test) | after Stage 2 | NO |

## 1. Heartbeat sources (read-only)

All sources are read via the GitHub REST API (read-only scope) against
`antonvdberg-bit/corpflow-ai-command-center`. No write scope is required for Stages 0–3.

| # | Source | What is read | Used for |
|---|---|---|---|
| 1 | Issue **#493** | last comment time; lane table presence | dispatcher-digest freshness; lane activation |
| 2 | Issue **#249** | last comment time; latest STATUS/decision | bridge coordination freshness |
| 3 | **Open Action-Plan issues** (`#485, #486, #487, #492, #495`, label `automation`/`operations`) | last activity (`updated_at`), assignee, open/closed | per-lane movement, ownership |
| 4 | **Recent PRs** (open + recently merged) | open count, age of oldest open PR, CI/check-run state, draft vs ready | WIP limit, open-PR age, CI surfacing |
| 5 | **Dispatcher digests** on #249 / #493 | timestamp of most recent comment matching the digest header | digest-cadence freshness |
| 6 | **Codex Task Register** (`docs/operations/CODEX_TASK_REGISTER_V1.md`) | rows in `REQUESTED` vs `IMPORTED` (once register is in use) | "Codex launched but no returned packet" |

Source 6 is **freshness-tolerant**: if the register has no rows yet, the heartbeat
treats Codex checks as N/A (not stale). This satisfies the issue's "once available" note
and keeps the checker green while Codex repo access is still pending.

## 2. Stale thresholds (v1 defaults — tune in Stage 3)

Thresholds are deliberately conservative to avoid alert fatigue. All are **business-hours
aware only by date**, not by hour, in v1 (operator timezone UTC+4).

| Condition | Threshold (v1) | Rationale |
|---|---|---|
| No dispatcher digest on #249/#493 | **> 12h** during an active day | digest cadence is 2–3×/day (`OPERATOR_PROGRESS_DIGEST_V1.md` §2) |
| No #493 PR opened after activation | **> 24h** after a lane goes `IN_PROGRESS` with no PR | activation should produce a PR within a day |
| No movement on an `Active` lane | **> 48h** since last lane-linked activity | lanes may legitimately pause a day |
| Codex task launched, no returned packet | **> 48h** in `REQUESTED` | research turnaround budget |
| PR open but CI/build result not surfaced | **> 6h** open with no check-run conclusion reported | CI should resolve within hours |
| Approval request not batched for Anton | **> 6h** an `AWAITING_OPERATOR` item not in a digest approval-queue roll-up | Anton must see what's waiting |
| Blocked lane without explicit owner/next action | **immediate** | a blocked lane must always name owner + next action |
| Open-PR count over WIP cap | **immediate** (cap = 2, `PARALLEL_EXECUTION_BOARD_V1.md` §4) | WIP discipline |

A condition only alerts once it crosses its threshold **and** passes the dedupe gate (§5).

## 3. Alert conditions → what the operator sees

The heartbeat evaluates each condition every run and classifies it on the canonical
severity ladder (`TELEGRAM_ALERT_WIRING_PACKET_V1.md` §4): only **error/fatal** alert;
**warning/info** are logged internally and never paged.

| Condition | Severity | Alerts? |
|---|---|---|
| Blocked lane without owner/next action | error | yes |
| Approval request not batched > 6h | error | yes |
| Open-PR count over WIP cap | error | yes |
| No dispatcher digest > 12h (active day) | error | yes |
| No movement on `Active` lane > 48h | warning→error at 72h | yes at 72h |
| PR open, CI not surfaced > 6h | warning→error at 12h | yes at 12h |
| Codex task `REQUESTED` > 48h | warning | no (logged) |
| Everything healthy | info | no (silent success) |

**Silent on normal success** is mandatory — a green run produces no Telegram message.

## 4. Telegram message format (operator-ready)

Reuses the existing Telegram alert path (`TELEGRAM_BOT_TOKEN` + `TELEGRAM_ALERT_CHAT_ID`,
text-only, ≤ 3500 chars) per `TELEGRAM_ALERT_WIRING_PACKET_V1.md` §3–§4. No new secret
names. No PII. No tokens or chat IDs in any logged/committed artifact.

```text
CorpFlowAI Heartbeat — <severity> — <DD MMM HH:MM UTC+4>
Item: <lane / issue / PR>
Owner: <Cursor | Codex | Anton | unknown>
Stale: <duration, or "n/a">
Checked: <which sources were evaluated>
Why: <one-line condition that tripped>
Next expected action: <single next step>
Anton required: <yes/no — if yes, the exact operator action>
```

Example (stale digest):

```text
CorpFlowAI Heartbeat — error — 30 Jun 18:00 UTC+4
Item: Dispatcher digest (#249/#493)
Owner: Cursor
Stale: 13h since last digest
Checked: #249 comments, #493 comments
Why: no dispatcher digest within the 12h active-day window
Next expected action: Cursor posts a dispatcher digest
Anton required: no
```

## 5. Dedupe / noise-control policy

- **Dedupe key:** `condition_kind` × `target_id` × **hour bucket** (mirrors the server-side
  `kind × hour` anti-spam rule in `TELEGRAM_ALERT_WIRING_PACKET_V1.md` §4).
- A given stale condition for a given target alerts **at most once per hour** while it
  remains unchanged.
- **State escalation re-alerts:** if a condition crosses from warning→error (e.g. 48h→72h),
  that is a new `kind` state and may alert once on the transition.
- **Resolution is silent:** when a condition clears, no "recovered" message is sent in v1
  (avoids paired-message noise; revisit in Stage 3 if operators want recovery pings).
- **Run cadence:** suggested every **2–4h** during the operator's active window; at most
  hourly. The dedupe gate makes a tighter cadence safe.

## 6. Fallback manual check procedure (works today, no n8n)

If the heartbeat is not yet active (Stages 0–1) or n8n is down, an operator (or Cursor as
dispatcher) can run the same checks by hand in ~2 minutes:

1. `gh issue view 493 --json comments` and `gh issue view 249 --json comments` — confirm a
   dispatcher digest within the last 12h.
2. `gh pr list --state open --json number,title,createdAt,statusCheckRollup` — count open
   PRs (≤ 2), find the oldest, confirm CI state is surfaced.
3. `gh issue list --state open --label automation --label operations` — confirm each open
   Action-Plan issue has recent activity and a named owner/next action.
4. If any lane is blocked without owner/next action, or an approval has waited > 6h, post a
   dispatcher digest leading with the approval queue.

This fallback is the **source of truth for the checker's logic** — the n8n workflow simply
automates these same reads.

## 7. Approval gates (what Anton must do before Stage 2)

The checker stays **template-only** until Anton confirms, via secure channels (never in
repo/chat):

- [ ] A **read-only GitHub token / GitHub App install** for the n8n instance (least scope:
      `repo:read` / issues + PR read). Operator-owned; never committed.
- [ ] The existing Telegram alert path is reused (`TELEGRAM_BOT_TOKEN` +
      `TELEGRAM_ALERT_CHAT_ID`) **or** a separate heartbeat bot is chosen — Anton's call.
- [ ] n8n credential entries created **in n8n's own credential store** (not in repo, not in
      `.env.template`).
- [ ] Confirmation that activation is internal-monitoring only.

Until all four are checked, the workflow remains **inactive** and this is **Stage 0/1 only**.

## 8. Where this registers once active (Stage 2)

On activation, this becomes a new monitor row in
`docs/operations/MONITORING_ARCHITECTURE.md` §2 (next free Monitor #), per that doc's §9
"add-a-monitor recipe" — **added in the same PR that activates it**, not before. This
runbook intentionally does **not** edit the canonical monitor table while the checker is
inactive, to avoid implying a monitor that does not yet run.

## 9. Boundaries (carried from #495 + #493)

- Internal monitoring only — no customer/prospect/client-facing messages.
- No WhatsApp/SMS runtime. No email send runtime. No payment. No external outreach.
- No production DB writes. One app, one Postgres via `POSTGRES_URL` — unchanged.
- No secrets in repo/docs/logs; no token values in chat; no `.env.template` edits.
- No env var changes without separate secure handling + Anton confirmation.
- No production deploy required for Stage 0/1.
- Does not reopen the parked automation-forward-secret rotation.

## 10. Cross-references

- `docs/runbooks/N8N_GITHUB_HEARTBEAT_ACTIVATION_READINESS_V1.md` — Stage 2 activation-readiness packet (pre-flight checklist, exact n8n click-path, two-part validation test).
- `docs/n8n/templates/github-heartbeat-checker.template.json` — the Stage 1 secret-free template.
- `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md` — lanes, WIP limits, digest cadence.
- `docs/operations/OPERATOR_PROGRESS_DIGEST_V1.md` — digest format the heartbeat checks for.
- `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md` — alert payload contract, severity ladder, anti-spam.
- `docs/operations/MONITORING_ARCHITECTURE.md` — where Stage 2 registers the active monitor.
- `docs/n8n/automation-forward-recipe.md` — existing n8n envelope/notify patterns.

## 11. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs/runbook + inactive template only.
- **Implementation:** none active. No runtime, no env, no secrets, no DB, no deploy, no live n8n workflow.
- **Verdict:** PARTIAL by design — Stage 0/1 delivered (design + thresholds + alert format + dedupe + fallback + template). Stages 2–3 are Anton-gated on credential handling.
