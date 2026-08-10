# Business Ops Dispatcher — inactive graph repair plan (#838)

**Parent:** #814  
**Source finding:** #834 / PR #836  
**Target:** `CorpFlowAI — Business Operations Dispatcher v1` (`V3E4m5KiC1SseaCk`)  
**Cursor cloud run:** `bc-c8f83c6e-9a8f-4dbb-bbb5-20ad1360ded4`  
**n8n MCP:** authenticated; `workflow:update` permitted on inactive draft  
**Status:** `ANTON APPROVAL REQUIRED — APPLY INACTIVE WORKFLOW REPAIR`  
**Not applied:** no `update_workflow`, no publish/activate, no Telegram/GitHub/email/SMS sends

---

## Live baseline (read-only, 2026-08-10)

| Field | Value |
|-------|-------|
| Workflow | `CorpFlowAI — Business Operations Dispatcher v1` / `V3E4m5KiC1SseaCk` |
| Active | `false` (`activeVersionId=null`, `triggerCount=0`) |
| Draft versionId | `ec9188fb-7912-413c-8162-6c1526f26546` |
| UpdatedAt | `2026-08-10T03:53:53.383Z` |
| Executions | none |
| Competing Business Ops Dispatcher | NO (sole match) |
| Hardened-v2 | `cPgzIQIm4ztU8sQQ` **active=true**, `activeVersionId=f9be8893-4a2d-4fc3-983f-2296c50ac74e` (unchanged; not in mutation scope) |

### Current graph (before)

```text
Schedule Trigger (every 2h)
  → CorpFlowAI: business-ops monitor
      (GET https://core.corpflowai.com/api/factory/business-operations-dispatcher)
  → Normalize monitor response
      ├─→ Any Anton-gated routing? (IF summary.page_anton > 2)
      │     └─→ Send a text message  (Telegram)   ← DEFECT 1
      └─→ Any Cursor or Codex routing? (Code)
            └─→ Create a comment on an issue (#249 GitHub)
```

### Defects

1. **Telegram still wired** — `Any Anton-gated routing?` → `Send a text message` when `summary.page_anton > 2`. Doctrine/template: `should_telegram=false`; ops_alert Telegram belongs solely to hardened-v2.
2. **Normalize error fallback schema stale** — Case 2 catch + Case 3 emit camelCase `summary.pageAnton` / flat `summary.cursor|codex|n8n|noAction` and top-level `routes[]` instead of current snake_case `summary.page_anton`, `summary.routes.*`, and `routings[]` consumed by IF + GitHub queue Code.

---

## Exact before → after mutation plan

**Scope:** two fixes only. No schedule / factory URL / GitHub semantics / credentials / hardened-v2 / other workflows.

### Mutation A — remove Telegram Send branch

| Op # | `update_workflow` type | Target | Exact change |
|------|------------------------|--------|--------------|
| A1 | `removeConnection` | source=`Normalize monitor response` → target=`Any Anton-gated routing?` | Drop Anton IF fan-out; leave Normalize → `Any Cursor or Codex routing?` intact |
| A2 | `removeConnection` | source=`Any Anton-gated routing?` → target=`Send a text message` | Sever Telegram edge |
| A3 | `setNodeDisabled` | nodeName=`Any Anton-gated routing?` | `disabled: true` |
| A4 | `setNodeDisabled` | nodeName=`Send a text message` | `disabled: true` |

**After graph (Telegram path):**

```text
Schedule Trigger (unchanged)
  → CorpFlowAI: business-ops monitor (unchanged)
  → Normalize monitor response (jsCode patched — Mutation B)
      └─→ Any Cursor or Codex routing? (unchanged)
            └─→ Create a comment on an issue (unchanged)

DISABLED / unwired (retained on canvas, cannot execute):
  Any Anton-gated routing?
  Send a text message
```

**Not changing:** Schedule interval, HTTP URL/auth, GitHub node params (`issueNumber=249`, owner/repo), Cursor/Codex Code body, credentials, workflow settings, active/published state.

### Mutation B — Normalize error fallback → snake_case

| Op # | type | Target | Field |
|------|------|--------|-------|
| B1 | `updateNodeParameters` | `Normalize monitor response` | `parameters.jsCode` only |

**Before (stale error objects — both Case 2 catch and Case 3):**

```js
summary: {
  pageAnton: 1,
  cursor: 0,
  codex: 0,
  n8n: 0,
  noAction: 0
},
routes: [{ owner: 'anton', /* … */ }]
```

**After (minimum fields matching live fixture / `buildBusinessOperationsDispatcherReport`):**

```js
summary: {
  routes: {
    anton: 1,
    cursor: 0,
    codex: 0,
    n8n: 0,
    no_action: 0
  },
  page_anton: 1,
  silent: false
},
routings: [{
  owner: 'anton',
  gated: true,
  severity: 'urgent',
  source: 'n8n',
  objectType: 'monitor',
  objectRef: 'business-operations-dispatcher',
  reason: '<same case-specific reason strings as today>',
  recommendedNextAction: '<unchanged>',
  executorPrompt: '<unchanged>',
  antonNeeded: true,
  safeToIgnore: false,
  link: null
}]
```

**Unchanged in jsCode:** Case 1 passthrough (`schema === DISPATCHER_SCHEMA`); Case 2 regex unwrap + JSON.parse success path; reason / recommendedNextAction / executorPrompt strings for each error case.

**Pre-apply node validation:** `validate_node_config` on proposed Normalize Code → **PASS** (2026-08-10 this run).

### Exact `update_workflow` payload (apply only after Anton approval)

```json
{
  "workflowId": "V3E4m5KiC1SseaCk",
  "versionName": "Remove Telegram; snake_case normalize fallback",
  "versionDescription": "#838: disable Telegram Send branch; normalize error fallback to page_anton/routings. No publish.",
  "operations": [
    {
      "type": "removeConnection",
      "source": "Normalize monitor response",
      "target": "Any Anton-gated routing?",
      "sourceIndex": 0,
      "targetIndex": 0,
      "connectionType": "main"
    },
    {
      "type": "removeConnection",
      "source": "Any Anton-gated routing?",
      "target": "Send a text message",
      "sourceIndex": 0,
      "targetIndex": 0,
      "connectionType": "main"
    },
    {
      "type": "setNodeDisabled",
      "nodeName": "Any Anton-gated routing?",
      "disabled": true
    },
    {
      "type": "setNodeDisabled",
      "nodeName": "Send a text message",
      "disabled": true
    },
    {
      "type": "updateNodeParameters",
      "nodeName": "Normalize monitor response",
      "parameters": {
        "jsCode": "<FULL AFTER jsCode — see appendix>"
      }
    }
  ]
}
```

---

## Validation packet (run immediately after apply; still no publish)

```text
BUSINESS OPS DISPATCHER INACTIVE REPAIR VALIDATION
Cursor cloud run ID: bc-c8f83c6e-9a8f-4dbb-bbb5-20ad1360ded4
n8n MCP status: READY
Workflow name/id: CorpFlowAI — Business Operations Dispatcher v1 / V3E4m5KiC1SseaCk
Pre-apply active state: INACTIVE (must remain inactive after edit)
Apply performed: NO (awaiting Anton)
Publish/activate performed: NO (forbidden in this packet)

Post-apply checks (ordered):
1. get_workflow_details V3E4m5KiC1SseaCk
   - active=false, activeVersionId=null
   - connections: Normalize → Any Cursor or Codex only (no Anton IF / Telegram edges)
   - nodes: Any Anton-gated routing? disabled=true; Send a text message disabled=true
   - Normalize jsCode contains page_anton + routings; must NOT contain pageAnton or top-level routes:[
2. validate_node_config Normalize (after jsCode) → PASS
3. Privacy-safe synthetic path proof (pin-data / graph proof — NO live Telegram/GitHub network send):
   - Synthetic body: schema=corpflow.business_operations_dispatcher.v1, summary.page_anton=0,
     summary.routes all zero, routings=[], ok=true, silent=true
   - Expected: Any Cursor or Codex returns []; Create a comment on an issue receives zero items
   - Expected: Telegram node not reachable / disabled — cannot execute
   - Method: prepare_test_pin_data + test_workflow with pinData on Schedule/HTTP/credentialed nodes
     OR static connection+disabled proof if test_workflow would still invoke live creds (prefer pin path)
4. Reconfirm hardened-v2 cPgzIQIm4ztU8sQQ
   - active=true
   - activeVersionId still f9be8893-4a2d-4fc3-983f-2296c50ac74e (or report if drifted independently)
   - no mutations applied to it
5. search_workflows "Business Operations Dispatcher" → still sole owner, still inactive

Final post-apply verdict target:
  READY FOR ACTIVATION DECISION
  (or one exact blocker)

ANTON ACTION now: approve apply of inactive-workflow repair only
ANTON ACTION after green validation: separate publish/activate decision (not this packet)
```

### Synthetic `page_anton=0` pin body (privacy-safe)

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

No real client/prospect/tenant data. No live chat IDs in proof assertions beyond existing node params (left unchanged; node disabled).

---

## Explicit non-actions (this PR / this run)

- Do **not** publish or activate `V3E4m5KiC1SseaCk`
- Do **not** apply `update_workflow` until Anton approval
- Do **not** touch hardened-v2 `cPgzIQIm4ztU8sQQ` or any other workflow
- Do **not** send Telegram / email / WhatsApp / SMS
- Do **not** change env, secrets, DB, schema, payments, outreach
- Do **not** merge or deploy

---

## Gate line

```text
ANTON APPROVAL REQUIRED — APPLY INACTIVE WORKFLOW REPAIR

Exact nodes/fields:
1) removeConnection Normalize monitor response → Any Anton-gated routing?
2) removeConnection Any Anton-gated routing? → Send a text message
3) setNodeDisabled Any Anton-gated routing? = true
4) setNodeDisabled Send a text message = true
5) updateNodeParameters Normalize monitor response.parameters.jsCode
   — replace error-fallback summary.pageAnton/…/routes[] with
     summary.{routes,page_anton,silent} + routings[] (snake_case)

Workflow remains inactive. After approval: apply → validate → return
READY FOR ACTIVATION DECISION or one exact blocker.
```

---

## Appendix — full after `jsCode` for `Normalize monitor response`

```javascript
const item = $input.first().json;

const DISPATCHER_SCHEMA = 'corpflow.business_operations_dispatcher.v1';

// Case 1: HTTP node returned dispatcher JSON directly
if (item.schema === DISPATCHER_SCHEMA) {
  return [{ json: item }];
}

// Case 2: n8n Continue On Fail stored the API body inside error.message
const message = item.error?.message || item.message || '';

const match = message.match(/^\d{3}\s-\s"([\s\S]*)"$/);

if (match) {
  try {
    const escapedJson = match[1];
    const jsonText = escapedJson
      .replace(/\\"/g, '"')
      .replace(/\\\\/g, '\\');

    const parsed = JSON.parse(jsonText);
    return [{ json: parsed }];
  } catch (error) {
    return [{
      json: {
        schema: DISPATCHER_SCHEMA,
        ok: false,
        summary: {
          routes: {
            anton: 1,
            cursor: 0,
            codex: 0,
            n8n: 0,
            no_action: 0
          },
          page_anton: 1,
          silent: false
        },
        routings: [{
          owner: 'anton',
          gated: true,
          severity: 'urgent',
          source: 'n8n',
          objectType: 'monitor',
          objectRef: 'business-operations-dispatcher',
          reason: 'n8n could not parse dispatcher response from error.message',
          recommendedNextAction: 'Open n8n execution and inspect HTTP Request error.message',
          executorPrompt: 'Inspect the n8n dispatcher HTTP response wrapper and repair the normalize node.',
          antonNeeded: true,
          safeToIgnore: false,
          link: null
        }]
      }
    }];
  }
}

// Case 3: unknown response shape
return [{
  json: {
    schema: DISPATCHER_SCHEMA,
    ok: false,
    summary: {
      routes: {
        anton: 1,
        cursor: 0,
        codex: 0,
        n8n: 0,
        no_action: 0
      },
      page_anton: 1,
      silent: false
    },
    routings: [{
      owner: 'anton',
      gated: true,
      severity: 'urgent',
      source: 'n8n',
      objectType: 'monitor',
      objectRef: 'business-operations-dispatcher',
      reason: 'Dispatcher response was not available to n8n',
      recommendedNextAction: 'Check HTTP Request node output and auth settings',
      executorPrompt: 'Check the dispatcher HTTP node output and confirm auth, endpoint URL, and response body handling.',
      antonNeeded: true,
      safeToIgnore: false,
      link: null
    }]
  }
}];
```
