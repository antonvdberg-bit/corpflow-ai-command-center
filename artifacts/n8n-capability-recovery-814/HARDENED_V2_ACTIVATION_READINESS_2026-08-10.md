# HARDENED V2 ACTIVATION READINESS — issue #826

**Date (UTC):** 2026-08-10  
**Parent:** [#814](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/814)  
**Issue:** [#826](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/826)  
**Cursor cloud run ID:** `bc-4d23295a-c349-4789-b257-dd3b65ca8de9`  
**Dispatch run ID:** `run-9be2a791-97cf-413a-abee-b2a47879b9b1`  
**Run URL:** https://cursor.com/agents/bc-4d23295a-c349-4789-b257-dd3b65ca8de9  
**Branch:** `cursor/dispatcher-issue-826-2ace`  
**Mode:** READ / VALIDATE / INSPECT ONLY — no publish, unpublish, edit, archive, credential, env, DB, or outbound send

---

## Final verdict

**NOT READY — hardened-v2 availableInMCP=false (MCP READ/VALIDATE/executions blocked; enabling access is a forbidden settings mutation in this packet)**

---

## HARDENED V2 ACTIVATION READINESS packet

```text
Cursor cloud run ID: bc-4d23295a-c349-4789-b257-dd3b65ca8de9
n8n MCP status: READY (authenticated; LIST + list_credentials PASS; business-workflow READ/VALIDATE/EXECUTIONS blocked by availableInMCP=false)
Workflow name/id: CorpFlow automation forward hardened v2 / cPgzIQIm4ztU8sQQ
Current active state: INACTIVE (active=false; updatedAt=2026-07-16T01:15:31.966Z; triggerCount=1)
Webhook/path match: FAIL (live path not re-readable via MCP; expected #814 suffix automation-forward-v2-35cb1c1a8e6042ae91b61038104aa542 — prior deep-audit only)
Competing active forward owner: NO
Workflow validation: FAIL (get_workflow_details / get_workflow_history / search_executions rejected: "Workflow is not available in MCP")
Recent execution evidence: NONE via MCP (search_executions for cPgzIQIm4ztU8sQQ blocked by availableInMCP=false; global search returned empty under MCP visibility)
Credential references safe: PASS (instance credential names/types listed only; no values; attachment to hardened-v2 not re-confirmable without READ)
Rollback: If a later Anton-approved publish fails: unpublish_workflow on cPgzIQIm4ztU8sQQ only; leave Heartbeat/Password Reset/Pulse/Dispatcher/safe-test/secret/BACKUP unchanged; do not change Vercel env in the same window unless Anton explicitly directs a coordinated rollback of CORPFLOW_AUTOMATION_FORWARD_URL
Post-activation validation: After separate Anton publish approval only — (1) confirm hardened-v2 active=true and companions still inactive; (2) POST privacy-safe synthetic ops.self_hosted.test.v1 (or equivalent allowlisted canary) through existing CorpFlow ingest→forward path; (3) confirm one n8n success execution on cPgzIQIm4ztU8sQQ; (4) confirm ignored/unknown types do not Telegram; (5) no client email/WhatsApp/SMS; (6) factory health still forward_url_configured=true
Final verdict: NOT READY — hardened-v2 availableInMCP=false (MCP READ/VALIDATE/executions blocked; enabling access is a forbidden settings mutation in this packet)
ANTON ACTION: Enable MCP access on workflow cPgzIQIm4ztU8sQQ only (workflow card / settings toggle — no node edits, no activate), then re-run #826 inspection; optionally also confirm Vercel CORPFLOW_AUTOMATION_FORWARD_URL path suffix equals automation-forward-v2-35cb1c1a8e6042ae91b61038104aa542 without pasting the full URL
```

---

## Required live inspection answers

### 1. Hardened-v2 current active/inactive state

**INACTIVE.** Live `search_workflows` row:

| Field | Value |
|-------|-------|
| id | `cPgzIQIm4ztU8sQQ` |
| name | CorpFlow automation forward hardened v2 |
| active | `false` |
| updatedAt | `2026-07-16T01:15:31.966Z` |
| triggerCount | `1` |
| availableInMCP | `false` |

### 2. Current workflow trigger/webhook path

**Not live-readable via MCP this run.**  
`get_workflow_details({ workflowId: "cPgzIQIm4ztU8sQQ" })` →  
`Workflow is not available in MCP. Enable MCP access from the workflow card in the workflows list, or from the workflow settings.`

Same rejection for `get_workflow_history` and `search_executions` scoped to this workflow.

**Prior #814 deep-audit (2026-08-08, Pinia/UI, not this MCP READ):** webhook path suffix  
`automation-forward-v2-35cb1c1a8e6042ae91b61038104aa542`  
That prior path is **not** re-proven by this packet.

### 3. Path match vs expected hardened path in #814

| Check | Result |
|-------|--------|
| Expected suffix (#814) | `automation-forward-v2-35cb1c1a8e6042ae91b61038104aa542` |
| Live MCP path re-read | **FAIL** (blocked) |
| Vercel `CORPFLOW_AUTOMATION_FORWARD_URL` suffix (this env) | **NOT VERIFIED** — no Vercel CLI / project auth / env value access; factory health only reports `forward_url_configured: true` |

**Webhook/path match field for readiness packet: FAIL**

### 4. Competing active automation-forward owner

**NO.**

Live estate LIST (10 workflows). Active set only:

| id | name | active |
|----|------|--------|
| `94gs6QOVed6dWdPZ` | CorpFlowAI GitHub Heartbeat Checker v1 | true |
| `cFWfyVmy6F5arNaL` | CorpFlowAI — Password Reset Email | true |
| `dxCgQMBoti4n7cgE` | CorpFlowAI Production Pulse v1 | true |

Forward companions (all inactive):

| id | name | active |
|----|------|--------|
| `cPgzIQIm4ztU8sQQ` | CorpFlow automation forward hardened v2 | false |
| `uYn5kLGpBtqqOmtk` | CorpFlow automation forward - issue 611 safe test | false |
| `fAsTwcHdFuhC36f1` | CorpFlow automation forward secret | false |
| `gUnkS4EulAXX3xPh` | BACKUP - automation forward before LR Pilot 1 notify | false |

Business Operations Dispatcher / Monitor / Slack Dispatcher remain inactive. No active forward owner exists today.

### 5. Validation result for hardened v2

**FAIL.** Cannot load graph for structural validation.  
Note: MCP `validate_workflow` validates SDK source before create/update; it does not accept an existing business workflow id. Without `get_workflow_details`, this packet cannot reconstruct or validate hardened-v2.

### 6. Credential references (safe names/types only)

Instance `list_credentials` succeeded (names/types only; **no values**):

| name | type |
|------|------|
| Header Auth account | httpHeaderAuth |
| Header Auth account 2 | httpHeaderAuth |
| Header Auth account 3 | httpHeaderAuth |
| Bearer Auth account | httpBearerAuth |
| Telegram account | telegramApi |
| GitHub account | githubApi |
| Gmail account | gmailOAuth2 |
| Slack account | slackOAuth2Api |

**Prior #814 deep-audit attachment claim for hardened-v2:** `Header Auth account 3`, `Telegram account` — **not re-confirmed** this run (READ blocked).  
**Credential references safe: PASS** (no secret values exposed).

### 7. Recent relevant execution/error evidence

**None via MCP.**  
`search_executions` for `cPgzIQIm4ztU8sQQ` rejected (MCP availability).  
Unscoped `search_executions` returned `{ data: [], count: 0 }` under current MCP visibility.  
No runtime mutation / test execution performed.

### 8. Expected inbound/outbound behavior (high level)

Per `docs/n8n/automation-forward-recipe.md` + #814 forward-spine intent:

- **Inbound:** Vercel POSTs automation envelopes to `CORPFLOW_AUTOMATION_FORWARD_URL` (n8n Webhook) after accepted ingest / CMP mirror events; optional header `x-corpflow-automation-forward-secret`.
- **Auth:** Header Auth at webhook; mismatch → fail closed (4xx), no notify.
- **Outbound (operator):** allowlisted branches only (e.g. Lead Rescue intake notify, ops alerts) → Telegram using attached Telegram credential; unknown/ignored types → 2xx without Telegram.
- **Must not:** Password Reset channel, client email/WhatsApp/SMS, payment, or Business Operations Dispatcher activation as part of this spine restore.

### 9. Exact rollback (if a later activation fails)

1. `unpublish_workflow` / deactivate **only** `cPgzIQIm4ztU8sQQ` (hardened v2).
2. Do **not** activate secret / BACKUP / 611 safe-test as a substitute unless Anton separately directs.
3. Leave Heartbeat, Password Reset, Production Pulse, Business Ops Dispatcher/Monitor, Slack Dispatcher unchanged.
4. If Vercel forward URL/secret were changed in the same maintenance window (not authorized by this packet), Anton restores prior Production env values in that same window.
5. Confirm LIST: hardened-v2 `active=false`; prior three active workflows still active.

### 10. Exact post-activation validation (privacy-safe synthetic)

Only after a **separate** Anton activation decision:

1. Re-LIST: hardened-v2 active; no other forward companion active.
2. Send one privacy-safe synthetic through CorpFlow ingest → forward (e.g. `ops.self_hosted.test.v1` or other allowlisted canary with no client PII).
3. Confirm one success execution on `cPgzIQIm4ztU8sQQ` (execution id + timestamp only).
4. Confirm unknown/ignored envelope does not Telegram.
5. Confirm no client email / WhatsApp / SMS / payment side effects.
6. Watch ~15 minutes; then stop. Do **not** activate Business Operations Dispatcher in the same decision.

### 11. Isolation — activate hardened v2 only?

**YES — isolation is possible.**  
Publishing `cPgzIQIm4ztU8sQQ` alone does not require changing Heartbeat, Password Reset, Production Pulse, Dispatcher, Monitor, Slack Dispatcher, 611 safe-test, secret, or BACKUP. Those must remain at current active/inactive states for this slice.

---

## What this run proved vs blocked

| Item | Result |
|------|--------|
| n8n-mcp connected | PASS |
| LIST estate (10) | PASS |
| Competing active forward owner | NO (PASS for readiness) |
| Hardened-v2 inactive | PASS (observed) |
| READ hardened-v2 nodes/path | BLOCKED (`availableInMCP=false`) |
| VALIDATE hardened-v2 | BLOCKED |
| EXECUTIONS hardened-v2 | BLOCKED |
| Enable MCP access to unblock | FORBIDDEN by #826 hard boundaries (no edit workflow settings) |
| Activate / publish | NOT DONE (forbidden) |
| Vercel forward URL suffix | NOT VERIFIED in this environment |

---

## Factory corroboration (non-secret)

`GET https://core.corpflowai.com/api/factory/health` → 200  

| flag | value |
|------|-------|
| forward_url_configured | true |
| ingest_secret_configured | true |
| cmp_mirror_enabled | true |
| approval_secret_configured | false |

Env set ≠ consumer active. Matches #814 finding.

---

## ANTON ACTION (single next gate)

1. In n8n UI: enable **MCP access** on **CorpFlow automation forward hardened v2** (`cPgzIQIm4ztU8sQQ`) only — toggle only; **do not activate**.
2. Optionally confirm Production `CORPFLOW_AUTOMATION_FORWARD_URL` path suffix equals  
   `automation-forward-v2-35cb1c1a8e6042ae91b61038104aa542` (suffix only; do not paste full URL into chat/issues).
3. Re-dispatch / re-run #826 so Cursor Cloud can complete path match + validation + credential attachment + execution history, then return either  
   `READY FOR ANTON ACTIVATION DECISION` or a new single blocker.

**Do not** bundle Business Operations Dispatcher activation into that decision.

---

## Explicit non-actions this run

- No publish / unpublish / archive / delete  
- No node or settings edits (including MCP-enable toggle)  
- No credential / instance / Vercel env / DB / schema changes  
- No email / WhatsApp / SMS / Telegram sends  
- No payment / outreach / client launch  
- No new forward workflow created  
- No Dispatcher activation  

## Promptfoo / AI eval evidence

```text
Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: docs-only readiness evidence for n8n forward-spine inspection; no AI prompt/behaviour, drafting, Lead Rescue chatbot, model-routing, or protected-action boundary code changed
- cases affected: none
- new cases added: none
- artifact path, if generated: none
- live-model eval used: NO
```
