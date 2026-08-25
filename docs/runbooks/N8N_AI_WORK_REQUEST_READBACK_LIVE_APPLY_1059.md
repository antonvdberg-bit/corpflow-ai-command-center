# n8n live apply — AI work-request readback (#1059)

**Status:** Repo contract ready. **Live n8n in-place update requires separate Anton approval.**  
**Reuse:** Existing `CorpFlowAI — GitHub Heartbeat Checker` only. Do **not** create a second workflow.  
**Anchor:** `<!-- N8N_AI_WORK_REQUEST_READBACK_LIVE_APPLY_1059 -->`

<!-- N8N_AI_WORK_REQUEST_READBACK_LIVE_APPLY_1059 -->

## 1. Why this packet exists

#1059 adds a correlated `work_request_id` and four controller states on GitHub. The existing Heartbeat evaluate node is the only n8n readback surface that should consume those markers.

This packet does **not** authorize a new callback transport. The current bridge still cannot push status to the originating AI controller.

```text
MISSING TRANSPORT BOUNDARY — n8n → originating AI controller
```

Until that exact interface is separately designed and approved, the originating controller must poll GitHub for:

- `corpflow.ai_work_request.v1`
- `corpflow.ai_work_status.v1`

## 2. Target workflow (same control plane as #661 / #684)

| Field | Value |
|-------|--------|
| Expected live name | `CorpFlowAI — GitHub Heartbeat Checker` |
| Node | `Evaluate Anton-required exceptions` |
| Apply-ready script | `docs/n8n/templates/evaluate-anton-required-exceptions.cursor-completion.v1.js` |
| Rule | Update **in place**. No second notifier / dispatcher / database. |

## 3. What the paste adds (when Anton approves)

1. Parse `corpflow.ai_work_request.v1` from issue bodies.
2. Derive `REQUESTED / IN_PROGRESS / BLOCKED / COMPLETED` from existing factory markers.
3. Return `ai_work_statuses` (current) and `ai_work_changed` (fingerprint-deduped).
4. Keep Telegram exception-only. `REQUESTED`, `IN_PROGRESS`, and `COMPLETED` without a protected-action requirement stay silent for Anton.
5. Optional comment intake via workflow static data `issueCommentsByNumber` — still in this workflow.

## 4. What remains unavailable after the paste

- No n8n → originating AI controller webhook-out.
- No new poll HTTP endpoint owned by n8n.
- No second automation-forward event type required to begin ordinary GitHub-durable readback.

Smallest later extension, if Anton later wants push readback: add **one** signed response branch on the existing Heartbeat or forward workflow that posts the already-normalized object. That is a separate protected live-runtime change.

## 5. Stop condition

**READY — N8N LIVE CHANGE REQUIRES ANTON APPROVAL**

Do not edit the live n8n workflow from this implementation PR.
