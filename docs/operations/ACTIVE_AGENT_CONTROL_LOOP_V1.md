# Active agent control loop v1 — Cursor lifecycle status slice

**Status:** Cursor post-activation lifecycle runner implemented (poll → normalize → complete/fail/stale → review packet → dedupe).  
**Controller:** [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661)  
**OpenHands child:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743) — not on this hot path.

> **Canonical posture snapshot:** `docs/operations/CORPFLOWAI_CURRENT_DELIVERY_REALITY.md` (MOVE WORK, DO NOT WAIT FOR PICKUP).
>
> **#896:** Ordinary delivery work proceeds from Anton’s active-task instruction. Protected gates stop only the exact consequential action — subject mentions alone must not freeze claim/activation.
## What this slice adds

Activation of new factory work is **CorpFlowAI Cursor Factory Handoff** → Cursor Automation **CorpFlowAI Factory Wake Proof** / MODE B (`factory-cursor-handoff.yml`, #913 / #930). The Background Agents API workflow `factory-dispatcher-activate.yml` is **LEGACY / DIAGNOSTIC only** (`workflow_dispatch`).
This packet adds **status supervision after activation**:

| Piece | Path |
|-------|------|
| Normalize PENDING/RUNNING/COMPLETED/FAILED/STALE | `lib/server/cursor-agent-lifecycle.js` |
| Status CLI (off-laptop via GHA) | `scripts/cursor-agent-lifecycle-status.mjs` |
| Scheduled / manual poller | `.github/workflows/cursor-agent-lifecycle-status.yml` |
| Durable state | GitHub issue comments (`corpflow.cursor_lifecycle_state.v1`) |
| Completion event | Issue comment (`corpflow.cursor_completion_event.v1`) — n8n contract |
| Operator review packet | Reuses `operator-review-handoff.js` |

## Behaviour

- **RUNNING / PENDING:** silent (no Telegram / no duplicate noise).
- **COMPLETED:** discover PR + checks; post completion event + operator decision packet once; label `dispatch:operator-review`; do not reactivate. Merge-ready / operator-review is **review/decision inventory** and releases **execution WIP** immediately (#976).
- **FAILED:** classify recoverable vs blocker; emit once; preserve evidence.
- **STALE:** one bounded deterministic follow-up via `POST /v1/agents/{id}/runs`; else Anton flag.
- **Second unchanged poll:** `completion_event_deduped` — no duplicate event.

## n8n

**Do not change the live workflow without Anton approval.**  
Repo emits a durable GitHub comment matching the completion event contract. Reuse the existing exception-only notifier.

| Item | Path |
|------|------|
| Live-apply packet (stop for approval) | `docs/runbooks/N8N_CURSOR_COMPLETION_EVENT_LIVE_APPLY_661.md` |
| Same workflow as #684 | `docs/runbooks/N8N_EXCEPTION_ONLY_ALERT_LIVE_APPLY_684.md` |
| Gate helper | `shouldNotifyCursorCompletionEvent()` in `lib/server/cursor-agent-lifecycle.js` |

Rules: RUNNING silent; COMPLETED+`anton_required=no` silent by default; COMPLETED+Anton / FAILED / STALE → one Telegram; unchanged fingerprint → no repeat.

## Double-activation guard

Claim-before-API applies only to the legacy diagnostic API activator. Production uniqueness is one Handoff success → one Wake Proof run, plus verified WIP (cap 2) and Handoff duplicate suppression. See `lib/server/factory-cursor-handoff.js`.

## Eligibility wake / capacity backfill (#891)

When a poll reaches COMPLETED/FAILED/STALE and releases verified WIP capacity, this workflow sets `wake_dispatcher=true` and **`workflow_call`s** `CorpFlowAI Cursor Factory Handoff` for a full priority queue scan. Operator authorization comments and `execution:paused` removal also wake **Handoff** directly. Do **not** wake `factory-dispatcher-activate.yml` automatically — that API path is diagnostic `workflow_dispatch` only (#930). Do **not** ask Anton to toggle `dispatch:cursor-ready` or manually `workflow_dispatch` for ordinary continuation. Internal target: begin eligible work within **5 minutes** of the eligibility-changing event.

## Codex specialist (human-triggered)

| Item | Path |
|------|------|
| Canonical | `docs/operations/CODEX_SPECIALIST_LIFECYCLE_V1.md` |
| Core | `lib/server/codex-specialist-lifecycle.js` |
| Event | `corpflow.codex_completion_event.v1` |
| Trigger | Human PR comment `@codex …` only (bot `@codex` rejected) |

Do **not** invent an unsupported Codex HTTP bridge or auto-post `@codex` via `GITHUB_TOKEN`.

## OpenHands role

Not used for ordinary Cursor API lifecycle. Reserve OpenHands for AI interpretation (failure summary / ambiguous classification) under the verified cheap profile when separately assigned.

## Manual proof

1. Create a tiny synthetic internal issue (harmless docs/artifact change) labelled `dispatch:cursor-ready`.
2. Confirm `CorpFlowAI Cursor Factory Handoff` succeeds and Wake Proof starts one Cursor Cloud run (production path).
3. Confirm origin / handoff evidence on the issue. Do **not** use `factory-dispatcher-activate` `cursor_live` for ordinary production proof — that workflow is diagnostic only.
4. Run `cursor-agent-lifecycle-status` workflow with that issue (`poll_twice=true`).
5. Expect: WORKING silent → COMPLETED once → second poll deduped → PR not auto-merged → capacity release wakes **Handoff**, not the legacy API dispatcher.
