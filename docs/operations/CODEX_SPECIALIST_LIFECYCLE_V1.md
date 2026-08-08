# Codex specialist lifecycle v1 — human-triggered only

**Status:** Implemented (GitHub-native evidence watcher).  
**Controller:** [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661)

## Decision (locked)

- Codex **does not** start from `github-actions[bot]` / `GITHUB_TOKEN` `@codex` comments.
- Codex **does** start from a **human** PR comment: `@codex review` or `@codex <task>`.
- No OpenAI API keys, Platform API billing, local/exec Codex CLI, or undocumented Cloud APIs.
- No browser automation as permanent dispatcher.

## Operating model

| Executor | Role |
|----------|------|
| Cursor | Automatic primary worker |
| Codex | Human-triggered specialist |
| OpenHands | Optional operational worker |

**One unavoidable human action:** post the exact `@codex …` comment on the prepared PR.  
Everything before and after that is automated.

## Flow

1. Eligible Codex packet → `evaluateCodexClaimGate` (`executor=codex`)
2. If Cursor/OpenHands already own the issue → `SKIP_ALREADY_CLAIMED`
3. Prepare → durable claim + **CODEX TRIGGER REQUIRED** + state `AWAITING_HUMAN_TRIGGER`
4. n8n exception notifier pages Anton once (exact comment to paste)
5. Anton posts human `@codex` on the PR
6. Watcher detects connector acknowledgement (👀 / connector activity) → `RUNNING` (silent)
7. Watcher detects Codex review/comment or expected change evidence → `COMPLETED`
8. Emits `corpflow.codex_completion_event.v1` once; second poll deduped
9. Notify only if `anton_required` / FAILED / STALE

## Lifecycle identity

`source issue + PR + attempt + human trigger comment ID`  
Do **not** fabricate Cloud task IDs. Capture Codex task URL only if GitHub exposes it.

## Code

| Piece | Path |
|-------|------|
| Core | `lib/server/codex-specialist-lifecycle.js` |
| CLI | `scripts/codex-specialist-lifecycle.mjs` |
| GHA | `.github/workflows/codex-specialist-lifecycle.yml` |
| Tests | `node-tests/codex-specialist-lifecycle.test.mjs` |
| Event schema | `corpflow.codex_completion_event.v1` |

## Commands

```bash
node scripts/codex-specialist-lifecycle.mjs --prepare --issue=661 --pr=813 --instruction=review
node scripts/codex-specialist-lifecycle.mjs --watch --issue=661 --poll-twice
```

## n8n

Reuse the existing Heartbeat exception notifier. Extend evaluate node to parse
`corpflow.codex_completion_event.v1` (same fingerprint dedupe pattern as Cursor).

Rules: `AWAITING_HUMAN_TRIGGER` → one notify; `RUNNING` silent; `COMPLETED`+no Anton silent;
`COMPLETED`+Anton / `FAILED` / `STALE` → one notify; unchanged fingerprint → silent.
