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

## Codex adapter (Option A — GitHub-native)

| Item | Path |
|------|------|
| Launch | PR comment `@codex review` / `@codex <task>` via `scripts/codex-github-activate.mjs` (GITHUB_TOKEN / `github-actions[bot]`) |
| Claim | `lib/server/codex-activation-claim.js` — `executor=codex`; cross-executor `SKIP_ALREADY_CLAIMED` vs Cursor |
| Lifecycle identity | `sourceIssue + pr + attempt + triggerCommentId` (Codex task URL captured when GitHub exposes it) |
| Status | `lib/server/codex-github-lifecycle.js` + `scripts/codex-github-lifecycle-status.mjs` |
| Workflow | `.github/workflows/codex-github-control-loop.yml` |
| Completion event | Issue comment `corpflow.codex_completion_event.v1` — same n8n silence rules |
| Official docs | https://developers.openai.com/codex/integrations/github — `@codex` is **PR-comment** native |

Do **not** invent an unsupported Codex HTTP bridge / Platform API path.

## OpenHands role

Not used for ordinary Cursor API lifecycle. Reserve OpenHands for AI interpretation (failure summary / ambiguous classification) under the verified cheap profile when separately assigned.

## Manual proof

1. Create a tiny synthetic internal issue (harmless docs/artifact change).
2. Activate via `factory-dispatcher-activate` `workflow_dispatch` `cursor_live` + `target_issue`.
3. Confirm origin metadata comment with `cursorAgentId`.
4. Run `cursor-agent-lifecycle-status` workflow with that issue (`poll_twice=true`).
5. Expect: WORKING silent → COMPLETED once → second poll deduped → PR not auto-merged.
