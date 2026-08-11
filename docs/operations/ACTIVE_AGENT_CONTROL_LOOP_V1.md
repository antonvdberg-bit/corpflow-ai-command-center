# Active agent control loop v1 — Cursor lifecycle status slice

**Status:** Cursor post-activation lifecycle runner implemented (poll → normalize → complete/fail/stale → review packet → dedupe).  
**Controller:** [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661)  
**OpenHands child:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743) — not on this hot path.

> **Canonical posture snapshot:** `docs/operations/CORPFLOWAI_CURRENT_DELIVERY_REALITY.md` (MOVE WORK, DO NOT WAIT FOR PICKUP).

## What this slice adds

Activation already exists (`factory-dispatcher-activate.yml` + `dispatcher-agent-activation.js`).
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
- **COMPLETED:** discover PR + checks; post completion event + operator decision packet once; label `dispatch:operator-review`; do not reactivate.
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

Claim-before-API + issue-keyed GHA concurrency (`factory-dispatcher-activate-<issue|scan>`). Duplicate activators return `SKIP_ALREADY_CLAIMED`. See `lib/server/cursor-activation-claim.js`.

## Eligibility wake / capacity backfill (#891)

When a poll reaches COMPLETED/FAILED/STALE and releases verified WIP capacity, this workflow sets `wake_dispatcher=true` and **`workflow_call`s** `Factory dispatcher activate` for a full priority queue scan. Operator authorization comments and `execution:paused` removal also wake that same activator directly. Do **not** ask Anton to toggle `dispatch:cursor-ready` or manually `workflow_dispatch` for ordinary continuation. Internal target: begin eligible work within **5 minutes** of the eligibility-changing event.

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

1. Create a tiny synthetic internal issue (harmless docs/artifact change).
2. Activate via `factory-dispatcher-activate` `workflow_dispatch` `cursor_live` + `target_issue`.
3. Confirm origin metadata comment with `cursorAgentId`.
4. Run `cursor-agent-lifecycle-status` workflow with that issue (`poll_twice=true`).
5. Expect: WORKING silent → COMPLETED once → second poll deduped → PR not auto-merged.
