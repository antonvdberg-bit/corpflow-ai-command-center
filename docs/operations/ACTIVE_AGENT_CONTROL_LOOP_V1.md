# Active agent control loop v1 — Cursor lifecycle status slice

**Status:** Cursor post-activation lifecycle runner implemented (poll → normalize → complete/fail/stale → review packet → dedupe).  
**Controller:** [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661)  
**OpenHands child:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743) — not on this hot path.

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

**Do not change the live workflow in this packet.**  
Repo emits a durable GitHub comment matching the completion event contract. Reuse the existing exception-only notifier: only when `anton_required=true` or FAILED/STALE with `notify=true`.

Required n8n change (Anton approval before live edit): watch for comments containing `CURSOR COMPLETION EVENT` / marker `corpflow.cursor_completion_event.v1` where `anton_required` is true (or `notify` true), then Telegram once using existing Decision Inbox / exception fingerprint patterns.

## Codex adapter (next — not blocking)

| Item | Supported path today |
|------|----------------------|
| Launch | Codex Cloud GitHub App / Action after Packet 7.2 install — **not** an unattended API client in this repo yet |
| Run id | Codex Cloud task / Actions run id (when installed) |
| Status | GitHub Actions `workflow_run` / check runs — same normalized phases when adapter lands |
| Result/PR | Branch + PR via GitHub (same completion event schema) |
| Smallest trigger | Documented in `docs/execution/CODEX_CLOUD_ACTIVATION_PACKET_V1.md` — install Packet 7.2 first |

Do **not** invent an unsupported Codex HTTP bridge.

## OpenHands role

Not used for ordinary Cursor API lifecycle. Reserve OpenHands for AI interpretation (failure summary / ambiguous classification) under the verified cheap profile when separately assigned.

## Manual proof

1. Create a tiny synthetic internal issue (harmless docs/artifact change).
2. Activate via `factory-dispatcher-activate` `workflow_dispatch` `cursor_live` + `target_issue`.
3. Confirm origin metadata comment with `cursorAgentId`.
4. Run `cursor-agent-lifecycle-status` workflow with that issue (`poll_twice=true`).
5. Expect: WORKING silent → COMPLETED once → second poll deduped → PR not auto-merged.
