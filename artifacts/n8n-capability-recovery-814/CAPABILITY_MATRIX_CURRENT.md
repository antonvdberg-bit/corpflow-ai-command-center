# #814 — current n8n MCP capability matrix

**As of:** 2026-08-14 (UTC)  
**Canonical evidence surface:** PR for branch `cursor/n8n-mcp-capability-probe-4c22` (prior CLOSED [#823](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/823) body may remain stale)  
**Operating-model version checked:** `2026-08-13-v1`

## Final verdict

**FULL CLOUD N8N DEVELOPMENT CONTROL PROVEN**

## This run

| Field | Value |
|-------|-------|
| Cloud run / executor ID | `bc-15f477d3-0847-4dcc-ab0d-31e9f3b3acfd` |
| Synthetic workflow name | `CorpFlowAI #814 Cloud n8n Capability Probe` |
| Synthetic workflow id | `aB4TbJGQ3xUCeJ5z` (archived after proof) |
| Artifact | `CLOUD_N8N_MACHINE_ACCESS_PROOF_2026-08-14.md` |

## Matrix

| Capability | Result |
|------------|--------|
| Cursor Cloud independent of laptop | **PASS** |
| native MCP connected (`n8n-mcp`) | **PASS** |
| LIST (`search_workflows`) | **PASS** |
| READ (`get_workflow_details`) | **PASS** |
| CREATE (`create_workflow_from_code`) | **PASS** |
| UPDATE (`update_workflow`) | **PASS** |
| VALIDATE (`validate_workflow` / `validate_node_config`) | **PASS** |
| TEST / EXECUTE (`test_workflow` / `execute_workflow`) | **PASS** |
| EXECUTION DEBUG (`get_execution`) | **PASS** |
| CORRECT + RERUN | **PASS** |
| ACTIVATE (`publish_workflow`) | **PASS** (requires non-manual trigger; rare annual Schedule used only on synthetic) |
| DEACTIVATE (`unpublish_workflow`) | **PASS** |
| ARCHIVE (`archive_workflow`) | **PASS** |
| Hard DELETE via MCP | **GAP (non-blocking)** — archive used; no new credential requested |
| Public API key required for proven path | **NO** |
| Business workflows modified | **NO** |

## Operator note

Prior PR #823 is CLOSED and its GitHub PR body may still show the older blocked-auth text. **Trust this matrix and the 2026-08-14 proof artifact** as the current durable capability evidence.

No merge/deploy/env/secret/DB/send/payment/business-workflow changes were performed by this proof.
