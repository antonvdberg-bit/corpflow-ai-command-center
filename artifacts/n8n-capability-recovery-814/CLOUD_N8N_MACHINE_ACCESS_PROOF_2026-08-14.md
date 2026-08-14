# #814 Cloud n8n MCP capability proof — EXECUTED (2026-08-14)

**Date:** 2026-08-14  
**Operating-model version checked:** `2026-08-13-v1` (current `main` delivery-reality doc)  
**Cloud run / executor ID:** `bc-15f477d3-0847-4dcc-ab0d-31e9f3b3acfd`  
**Run URL:** https://cursor.com/agents/bc-15f477d3-0847-4dcc-ab0d-31e9f3b3acfd  
**Branch:** `cursor/n8n-mcp-capability-probe-4c22`  
**Automation:** Cursor Automation `814 n8n MCP Proof` (`6029e6c5-9449-11f1-ba66-0e7d0216e441`)  
**Hostname policy:** live origin referenced only as `<N8N_ORIGIN>` (no credentials/tokens/secret values).

---

## Final verdict

**FULL CLOUD N8N DEVELOPMENT CONTROL PROVEN**

Native n8n MCP is connected from Cursor Cloud. The full synthetic lifecycle completed on a harmless probe workflow only. No CorpFlowAI business workflow was modified, activated, deactivated, archived, or deleted. No public API key was required.

---

## Canonical context preflight

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: n/a (docs/MCP capability proof; no corpflow_test client surface change)
GitHub state refreshed: YES
Source item: #814 | prior PR #823 (CLOSED) | this branch evidence
```

---

## n8n MCP tools enumerated (this run)

Server `n8n-mcp` status: **ready**.

| Tool | Role in proof |
|------|----------------|
| `search_workflows` | LIST |
| `get_workflow_details` | READ |
| `create_workflow_from_code` | CREATE |
| `update_workflow` | UPDATE |
| `validate_workflow` / `validate_node_config` | VALIDATE |
| `prepare_test_pin_data` / `test_workflow` | TEST |
| `execute_workflow` | EXECUTE |
| `get_execution` / `search_executions` | EXECUTION DEBUG |
| `publish_workflow` | ACTIVATE |
| `unpublish_workflow` | DEACTIVATE |
| `archive_workflow` | ARCHIVE / cleanup |
| `get_sdk_reference` / `get_workflow_best_practices` / `search_nodes` / `get_node_types` | Builder support |
| `list_credentials` / `list_tags` / `search_projects` / `search_folders` / data-table tools | Available; not required for this synthetic |

**Missing MCP capability:** hard **DELETE** workflow tool — not exposed. Cleanup path is **`archive_workflow`**. Public API key **not requested** because archive satisfies synthetic cleanup; no gap requiring a new credential.

**ACTIVATE nuance (documented, not a blocker):** `publish_workflow` rejects Manual-Trigger-only workflows (`Workflow cannot be activated because it has no trigger node`). For ACTIVATE/DEACTIVATE proof only, a rare annual Schedule (`0 0 1 1 *`) was added to the **synthetic** workflow, then unpublished and archived immediately. No production schedule was left active.

---

## Capability matrix

| Item | Result | Evidence |
|------|--------|----------|
| Cursor Cloud independent of laptop | **PASS** | Automation cloud run `bc-15f477d3-0847-4dcc-ab0d-31e9f3b3acfd` |
| n8n instance reachable | **PASS** | `GET <N8N_ORIGIN>/healthz` → `{"status":"ok"}` |
| n8n version (prior durable note) | **2.33.7** | Prior 2026-08-09/10 proofs; instance still healthy |
| native MCP available | **YES** | Instance-level MCP previously confirmed |
| native MCP connected | **YES** | `n8n-mcp` serverStatus `ready` with full tool schemas |
| public API gap-fill needed | **NO** | All required lifecycle ops via MCP except hard-delete (archive covers cleanup) |
| LIST | **PASS** | `search_workflows` returned 10 estate workflows + empty synthetic query before create |
| READ | **PASS** | `get_workflow_details` on `aB4TbJGQ3xUCeJ5z` |
| CREATE | **PASS** | `create_workflow_from_code` → `aB4TbJGQ3xUCeJ5z` |
| UPDATE | **PASS** | `probePhase` field; intentional fault Code node; correction; rare Schedule |
| VALIDATE | **PASS** | `validate_node_config` + `validate_workflow` → `valid: true` |
| TEST | **PASS** | `test_workflow` `6763` error (intentional) then `6764` success |
| EXECUTE | **PASS** | `execute_workflow` manual `6762` started + `6765` after correction |
| EXECUTION DEBUG | **PASS** | `get_execution` `6763` showed intentional Code error; `6764` showed `probePhase: corrected-and-rerun` |
| CORRECT + RERUN | **PASS** | Removed fault node; success `6764` |
| ACTIVATE | **PASS** | `publish_workflow` → `activeVersionId` `a0c65553-c556-451b-a23a-f5ff02356def` |
| DEACTIVATE | **PASS** | `unpublish_workflow` → success |
| ARCHIVE | **PASS** | `archive_workflow` → `archived: true` |
| HARD DELETE | **N/A (MCP gap)** | No delete tool; archive used; no API key requested |

---

## Synthetic proof workflow

| Field | Value |
|-------|-------|
| Name | `CorpFlowAI #814 Cloud n8n Capability Probe` |
| Workflow id (this run) | `aB4TbJGQ3xUCeJ5z` |
| Nodes | Manual Trigger → Set (synthetic fields); temporary Code fault for error proof; rare annual Schedule for publish proof only |
| Client data | none |
| Production credentials | none (`autoAssignedCredentials: []`) |
| Gmail / WhatsApp / SMS / Slack / payments / external sends | none |
| Final state | **archived** |
| Business workflows touched | **none** |

### Lifecycle sequence (UTC)

1. LIST — estate `search_workflows` (10 workflows); synthetic name query empty
2. VALIDATE — node configs + SDK code valid
3. CREATE — `2026-08-14T09:27:28.818Z` (`aB4TbJGQ3xUCeJ5z`)
4. READ — `get_workflow_details` (`active: false`)
5. UPDATE — add `probePhase: updated`
6. UPDATE — add intentional Code fault
7. TEST fail — execution `6763` error `intentional #814 probe failure for MCP error-inspect proof`
8. EXECUTION DEBUG — `get_execution` includeData confirmed fault node
9. UPDATE correction — remove fault; `probePhase: corrected-and-rerun`
10. TEST success — execution `6764`
11. EXECUTE — `6765` started (manual)
12. UPDATE — add rare annual Schedule for activate proof only
13. ACTIVATE — `publish_workflow` success (`activeVersionId` `a0c65553-c556-451b-a23a-f5ff02356def`)
14. DEACTIVATE — `unpublish_workflow` success
15. ARCHIVE — `archive_workflow` success

---

## Business-workflow non-touch confirmation

Observed via LIST only (no publish/unpublish/update/archive/execute called on them in this proof):

| Id | Name | Active (LIST snapshot) |
|----|------|------------------------|
| `V3E4m5KiC1SseaCk` | Business Operations Dispatcher v1 | true |
| `6RkDerWf2Xj5EfCY` | GitHub to Slack Dispatcher v1 | false |
| `fAsTwcHdFuhC36f1` | CorpFlow automation forward secret | false |
| `gUnkS4EulAXX3xPh` | BACKUP - automation forward before LR Pilot 1 notify | false |
| `cPgzIQIm4ztU8sQQ` | CorpFlow automation forward hardened v2 | true |
| `uYn5kLGpBtqqOmtk` | CorpFlow automation forward - issue 611 safe test | false |
| `dxCgQMBoti4n7cgE` | CorpFlowAI Production Pulse v1 | true |
| `94gs6QOVed6dWdPZ` | CorpFlowAI GitHub Heartbeat Checker v1 | true |
| `lQvSDtUyQn1iCcIH` | Business Operations Monitor v1 | false |
| `cFWfyVmy6F5arNaL` | CorpFlowAI — Password Reset Email | true |

---

## Explicit non-actions

- No merge / deploy
- No env / secrets changes
- No DB / schema changes
- No external Slack / Telegram / email / WhatsApp / SMS sends
- No payments
- No business-workflow mutation
- No protected operating-doctrine changes
- No new credential requested (archive covers hard-delete gap)

---

## Promptfoo / AI eval evidence

```text
Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: docs-only evidence artifact; no AI prompt/behaviour, drafting, Lead Rescue, chatbot, model-routing, or protected-action boundary code changed
- cases affected: none
- new cases added: none
- artifact path, if generated: none
- live-model eval used: NO
```
