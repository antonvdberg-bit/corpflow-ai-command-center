# AI work-request lifecycle v1 — correlated readback on the existing bridge

**Status:** Repo contract implemented (#1059). Live n8n paste is **not** authorized by this document.  
**Owner:** Anton (policy); Cursor (repo implementation).  
**Anchor:** `<!-- AI_WORK_REQUEST_LIFECYCLE_V1 -->`

<!-- AI_WORK_REQUEST_LIFECYCLE_V1 -->

## 1. Purpose

Close the existing delivery-control loop so an originating AI controller can tell, machine-readably, whether one bounded Cursor work request was accepted, actually picked up, blocked, or completed.

```text
AI controller → existing n8n forward bridge → GitHub durable work record
  → existing Cursor Factory Handoff → Cursor execution
  → branch/PR/run evidence → GitHub lifecycle status
  → existing n8n Heartbeat/readback → originating AI controller
```

This is supporting factory reliability. It does **not** authorize a second dispatcher, task database, workflow engine, or notifier. The intended later sole execution transport is Cloud Agents API v1 behind Factory Handoff (`docs/operations/FACTORY_CURSOR_CLOUD_AGENTS_V1_SOLE_EXECUTOR.md`, #1062). Wake Proof v2 remains the current live wake until that exact live switch. Do not run both as competing production executors.

## 2. Reused components

| Existing piece | Role |
|----------------|------|
| GitHub issue | Durable work record |
| `corpflow.factory_cursor_handoff.v1` | Sole production Cursor selection / current Wake Proof wake |
| `corpflow.cursor_activation_claim.v1` | Current-generation claim (legacy API path) |
| `corpflow.cursor_origin_metadata.v1` | Machine pickup evidence |
| `corpflow.cursor_lifecycle_state.v1` | Post-activation poller state |
| `corpflow.cursor_completion_event.v1` | Terminal / exception event |
| GitHub Heartbeat Checker evaluate node | Existing n8n readback / exception-only Telegram |
| Fingerprint dedupe | Unchanged state does not fan out |
| Protected-action gates | Unchanged |

## 3. Request marker (`corpflow.ai_work_request.v1`)

Preferred id: `cfai-wr-<uuid>`.

Minimum fields:

- `work_request_id`
- `source_issue`
- `origin_controller`
- `requested_at`
- `requested_outcome`
- `status`
- `protected_action_required`

Do **not** place secrets, credentials, private client payloads, tokens, or full webhook URLs in the marker.

Repo helpers: `lib/server/ai-work-request-lifecycle.js`.

## 4. Controller states

Only these four states are returned to the controller:

| State | Meaning |
|-------|---------|
| `REQUESTED` | n8n accepted the bounded request **and** the GitHub source record exists. Issue/comment/handoff creation alone stays here. |
| `IN_PROGRESS` | Independent Cursor pickup evidence exists (agent id, run id, activation with agent/run, origin metadata, or current-generation lifecycle). |
| `BLOCKED` | A current-generation Cursor/lifecycle event names a blocker **and** no active execution path continues. |
| `COMPLETED` | Cursor finished the bounded implementation packet and evidence is on the same work record. **Not** merged, deployed, sent, or client-production complete. |

## 5. Normalized readback object

Keyed by `work_request_id`:

`source_issue`, `status`, `cursor_agent_id`, `cursor_run_id`, `branch`, `pr_number`, `pr_url`, `head_sha`, `ci_state`, `blocker`, `next_action`, `updated_at`, `protected_action_required`.

Durable GitHub form: `corpflow.ai_work_status.v1`.

## 6. Transport audit — do not overbuild

```text
MISSING TRANSPORT BOUNDARY — n8n → originating AI controller
```

**Currently available**

- GitHub issue body/comments (durable, pollable with the existing GitHub App).
- Automation forward hardened v2: **app → n8n only**.
- Heartbeat evaluate JSON (ephemeral). Telegram remains exception-only.
- Existing completion-event comments for exception paging.

**Missing**

- No n8n → originating AI controller callback webhook, signed response contract, or poll endpoint that pushes this object back to the submitting controller.

**Smallest compatible extension**

Do **not** invent a new callback transport. The originating controller should poll the GitHub work record for the two markers above. After a separate Anton-approved in-place Heartbeat paste, the existing evaluate node may also emit `ai_work_statuses` in its current JSON output.

Live n8n edit packet: `docs/runbooks/N8N_AI_WORK_REQUEST_READBACK_LIVE_APPLY_1059.md`.

## 7. What this does not authorize

No merge, deploy, env/secrets change, DB/schema mutation, payment, external send, paid tool, DNS change, public/client launch, or live n8n activation.
