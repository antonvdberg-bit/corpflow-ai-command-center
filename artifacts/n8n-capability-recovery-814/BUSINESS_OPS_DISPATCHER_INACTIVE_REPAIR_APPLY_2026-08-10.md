# Business Ops Dispatcher — inactive repair APPLY evidence (#840)

Parent: #814  
Approved plan: #838 / PR #839  
Operator approval on #838: `APPROVE INACTIVE DISPATCHER REPAIR`  
Apply packet: #840  
Cursor agent: `bc-105577d3-945e-4bbf-b4ac-ea34bac126ba`

## Verdict

```text
READY FOR ACTIVATION DECISION
```

## Target

| Field | Value |
|-------|--------|
| Workflow | `CorpFlowAI — Business Operations Dispatcher v1` |
| Workflow ID | `V3E4m5KiC1SseaCk` |
| Pre-apply draft versionId | `ec9188fb-7912-413c-8162-6c1526f26546` |
| Post-apply draft versionId | `974a26cb-6dc7-4ec3-8fed-fd1132fe5fa3` |
| versionName | `Remove Telegram; snake_case normalize fallback` |
| active | `false` (unchanged) |
| activeVersionId | `null` (unpublished; unchanged) |
| Publish/activate | **NOT performed** |

## Five mutations applied (atomic `update_workflow`)

`appliedOperations: 5` via native n8n MCP at `2026-08-10T05:20:24.658Z`.

1. `removeConnection` `Normalize monitor response` → `Any Anton-gated routing?`
2. `removeConnection` `Any Anton-gated routing?` → `Send a text message`
3. `setNodeDisabled` `Any Anton-gated routing?` = `true`
4. `setNodeDisabled` `Send a text message` = `true`
5. `updateNodeParameters` `Normalize monitor response.parameters.jsCode` — error fallbacks use `summary.page_anton`, `summary.routes`, `routings[]` (snake_case)

## Post-apply graph (deep-read)

Connections (active path only):

```text
Schedule Trigger
  → CorpFlowAI: business-ops monitor
  → Normalize monitor response
  → Any Cursor or Codex routing?
  → Create a comment on an issue
```

Telegram path:

- `Any Anton-gated routing?`: **disabled=true**, **no incoming connection**
- `Send a text message`: **disabled=true**, **no incoming connection**
- No edge from Normalize → Anton IF; no edge from Anton IF → Telegram

Normalize jsCode checks:

- Contains `page_anton` and `routings`
- Does **not** contain camelCase `pageAnton`
- Error fallbacks emit `summary.routes` + `summary.page_anton` + `routings[]`

`validate_node_config` Normalize (post-apply): **PASS**

Expected disconnected-node warnings from apply response for disabled Telegram/IF nodes: present and intentional.

## Synthetic `page_anton=0` proof

Method: `prepare_test_pin_data` + `test_workflow` (pinData on Schedule / HTTP / GitHub; Code nodes execute live).

Synthetic body (privacy-safe, no client/prospect data):

```json
{
  "schema": "corpflow.business_operations_dispatcher.v1",
  "version": 1,
  "ok": true,
  "evaluated_at": "2026-08-10T00:00:00.000Z",
  "monitor_schema": "corpflow.business_operations_monitor.v1",
  "summary": {
    "routes": { "anton": 0, "cursor": 0, "codex": 0, "n8n": 0, "no_action": 0 },
    "page_anton": 0,
    "silent": true
  },
  "routings": []
}
```

| Field | Result |
|-------|--------|
| Execution ID | `6606` |
| Status | `success` |
| lastNodeExecuted | `Any Cursor or Codex routing?` |
| Nodes run | Schedule Trigger, CorpFlowAI: business-ops monitor (pinned), Normalize, Any Cursor or Codex |
| Any Cursor or Codex output | empty (`main: [[]]`) |
| `Send a text message` executed | **NO** (absent from runData) |
| `Any Anton-gated routing?` executed | **NO** (absent from runData) |
| `Create a comment on an issue` executed | **NO** (absent from runData; pin unused) |

Proof: Telegram and GitHub external-action nodes do **not** execute on `page_anton=0` / empty queues.

## Hardened-v2 reconfirm (untouched)

| Field | Result |
|-------|--------|
| Workflow | `CorpFlow automation forward hardened v2` (`cPgzIQIm4ztU8sQQ`) |
| active | `true` |
| versionId / activeVersionId | `f9be8893-4a2d-4fc3-983f-2296c50ac74e` (unchanged) |
| Mutations this packet | **none** |

## Competing dispatcher

`search_workflows "Business Operations Dispatcher"` → sole match `V3E4m5KiC1SseaCk`, still **inactive**.

## Explicit non-actions (honored)

- No publish / activate of dispatcher
- No hardened-v2 mutation
- No live Telegram / email / WhatsApp / SMS / GitHub comment send
- No env / secrets / DB / schema / payment / outreach changes
- No other workflow edits

## Anton next decision (separate; not this packet)

Publish/activate `V3E4m5KiC1SseaCk` draft version `974a26cb-6dc7-4ec3-8fed-fd1132fe5fa3` only after a separate activation approval. This packet stops at:

```text
READY FOR ACTIVATION DECISION
```
