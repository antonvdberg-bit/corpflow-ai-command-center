# #814 Cloud n8n MCP capability proof (live synthetic lifecycle)

**Date (UTC):** 2026-08-10  
**Operating-model version checked:** `2026-08-09-v1`  
**Cloud run / executor ID:** `bc-a21411bc-b621-42ba-ae1e-3d27c0239287`  
**Run URL:** https://cursor.com/agents/bc-a21411bc-b621-42ba-ae1e-3d27c0239287  
**Branch:** `cursor/n8n-mcp-capability-probe-a01c`  
**Trigger:** issue comment `RUN-814-N8N-MCP-PROOF` on [#814](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/814)  
**Related prior evidence PR:** [#823](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/823) (earlier blocked-auth proof; this run supersedes the matrix)

---

## Final verdict

**FULL CLOUD N8N DEVELOPMENT CONTROL PROVEN**

Cursor Cloud now has durable authenticated `n8n-mcp` access and completed the synthetic lifecycle without modifying any CorpFlowAI business workflow. No additional API key was required for the proven path.

---

## Non-duplication / safety

| Check | Result |
|-------|--------|
| Synthetic workflow only | **YES** — `CorpFlowAI #814 Cloud n8n Capability Probe` |
| Business workflows modified | **NO** — post-proof LIST shows same 10 estate workflows; active set unchanged (Heartbeat, Password Reset, Production Pulse) |
| Client data / production credentials / Gmail / WhatsApp / SMS / Slack / payments / external sends | **NONE** in synthetic graph |
| Secrets in this artifact | **NONE** |
| Hard DELETE via MCP | **Not exposed** as a tool (see gaps) — **ARCHIVE** used for cleanup |

---

## n8n MCP tools available on this run (enumerated)

Server status: **ready** (`n8n-mcp`).

| Tool | Category |
|------|----------|
| `search_workflows` | LIST |
| `get_workflow_details` | READ |
| `get_workflow_history` / `get_workflow_version` / `restore_workflow_version` | version history |
| `create_workflow_from_code` | CREATE |
| `update_workflow` | UPDATE |
| `validate_workflow` / `validate_node_config` | VALIDATE |
| `get_sdk_reference` / `get_workflow_best_practices` / `search_nodes` / `get_node_types` / `explore_node_resources` | builder helpers |
| `prepare_test_pin_data` / `test_workflow` / `execute_workflow` | TEST/EXECUTE |
| `get_execution` / `search_executions` | EXECUTION DEBUG |
| `publish_workflow` | ACTIVATE |
| `unpublish_workflow` | DEACTIVATE |
| `archive_workflow` | ARCHIVE |
| `list_credentials` / `list_n8n_connect_services` / `list_tags` | metadata (names/types only) |
| `search_projects` / `search_folders` | project placement |
| Data-table tools (`search_data_tables`, `create_data_table`, …) | data tables |

---

## Capability matrix (this run)

| Capability | MCP tool(s) | Result | Evidence |
|------------|-------------|--------|----------|
| Cursor Cloud independent of laptop | connected `n8n-mcp` | **PASS** | serverStatus ready; live LIST |
| native MCP connected | `n8n-mcp` | **PASS** | authenticated tool calls succeeded |
| LIST | `search_workflows` | **PASS** | 10 estate workflows + synthetic search |
| READ | `get_workflow_details` | **PASS** | synthetic id `KQO0LsXz4aKr6t9y` |
| CREATE | `create_workflow_from_code` | **PASS** | created `KQO0LsXz4aKr6t9y` |
| UPDATE | `update_workflow` | **PASS** | probeMarker fix + schedule add |
| VALIDATE | `validate_node_config` + `validate_workflow` | **PASS** | valid before create |
| TEST | `test_workflow` | **PASS** | exec `6591` error → `6593` success |
| EXECUTE | `execute_workflow` (manual) | **PASS** | exec `6592` error → `6594` success |
| EXECUTION DEBUG | `get_execution` + `search_executions` | **PASS** | inspected `SYNTHETIC_PROBE_EXPECTED_FAILURE` then success payload |
| ACTIVATE | `publish_workflow` | **PASS** | after rare Schedule Trigger; `active:true`, `activeVersionId=d05add21-5ecb-4838-b1fa-392c636d6da9` |
| DEACTIVATE | `unpublish_workflow` | **PASS** | `active:false`, `activeVersionId=null` |
| ARCHIVE | `archive_workflow` | **PASS** | archived `KQO0LsXz4aKr6t9y` |
| Hard DELETE | *(no MCP tool)* | **GAP (non-blocking)** | scopes include `workflow:delete`, but MCP exposes archive only |

---

## Synthetic lifecycle evidence

**Workflow name:** `CorpFlowAI #814 Cloud n8n Capability Probe`  
**Workflow id:** `KQO0LsXz4aKr6t9y`  
**Nodes (final before archive):** Manual Trigger → Edit Fields (Set) → Code assert; plus rare Schedule Trigger (12-month interval) solely to satisfy n8n publish rules.

| Step | Outcome |
|------|---------|
| LIST | Estate visible (10 workflows). Synthetic absent before create. |
| VALIDATE | Node configs + SDK workflow code valid. |
| CREATE | `workflowId=KQO0LsXz4aKr6t9y`, inactive, `availableInMCP=true`. |
| READ | Confirmed nodes/connections/description. |
| TEST/EXECUTE (intentional fail) | `probeMarker=broken` → error `SYNTHETIC_PROBE_EXPECTED_FAILURE` / `probeMarker must be ok` (executions `6591`, `6592`). |
| UPDATE correction | `probeMarker` → `ok` via `updateNodeParameters`. |
| TEST/EXECUTE (rerun) | success; `probeStatus=pass` (executions `6593`, `6594`). |
| ACTIVATE note | Manual-only graph rejected publish (`no trigger node` for production). Added rare Schedule Trigger; then publish succeeded. |
| ACTIVATE | `active:true`. |
| DEACTIVATE | `active:false`. |
| ARCHIVE | `archived:true`. |

No business workflow IDs were passed to mutate/publish/unpublish/archive tools.

---

## Gaps / notes (not blockers for this verdict)

1. **Hard DELETE missing from MCP tool surface** — cleanup uses `archive_workflow`. Public API *could* hard-delete if ever required; **not requested** because archive fulfills the proof cleanup.
2. **Manual Trigger alone cannot be published** — n8n product rule, not an MCP auth failure. Activation proof used a rare schedule (no external send).
3. **Concurrent synthetic duplicate** — during this run another agent created a second probe named the same (`6465onwhjqdrGILO`, description mentions run `bc-4c4fb252`). This executor archived only its own id `KQO0LsXz4aKr6t9y` and did not touch the other copy or any business workflow.
4. **Public API key** — not needed for the proven lifecycle; no new credential requested.

---

## Business-workflow non-touch confirmation (post-proof LIST)

Active (unchanged):

- `94gs6QOVed6dWdPZ` — CorpFlowAI GitHub Heartbeat Checker v1
- `cFWfyVmy6F5arNaL` — CorpFlowAI — Password Reset Email
- `dxCgQMBoti4n7cgE` — CorpFlowAI Production Pulse v1

Inactive estate members remain inactive with prior `updatedAt` values (no mutation by this proof).

---

## Explicit non-actions

No merge/deploy, no env/secret mutation, no DB/schema, no external sends/payments, no business workflow edits, no protected-doctrine changes, no custom username/password bridge.

Promptfoo / AI eval evidence:

- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: docs/evidence-only artifact; no AI prompt/behaviour, drafting, Lead Rescue, chatbot, model-routing, or protected-action boundary code changed
- cases affected: none
- new cases added: none
- artifact path, if generated: none
- live-model eval used: NO
