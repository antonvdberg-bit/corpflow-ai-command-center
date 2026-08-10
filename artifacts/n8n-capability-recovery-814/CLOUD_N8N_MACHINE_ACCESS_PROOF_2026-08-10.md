# #814 Cloud n8n MCP capability proof — EXECUTED

**Date:** 2026-08-10  
**Operating-model version checked:** `2026-08-09-v1` (current `main`)  
**Cloud run / executor ID:** `bc-4c4fb252-2ea9-41d4-b053-38525e35ae53`  
**Run URL:** https://cursor.com/agents/bc-4c4fb252-2ea9-41d4-b053-38525e35ae53  
**Automation trigger:** `RUN-814-N8N-MCP-PROOF` on issue #814  
**Hostname policy:** live origin referenced only as `<N8N_ORIGIN>` (no credentials/tokens/secret values).

---

## Final verdict

**FULL CLOUD N8N DEVELOPMENT CONTROL PROVEN**

Native n8n MCP is connected from Cursor Cloud and the full synthetic lifecycle completed on a harmless probe workflow only. No CorpFlowAI business workflow was modified, activated, deactivated, archived, or deleted. No public API key was required.

---

## n8n MCP tools enumerated (this run)

Server `n8n-mcp` status: **ready**.

| Tool | Role in proof |
|------|----------------|
| `search_workflows` | LIST |
| `get_workflow_details` | READ |
| `get_workflow_history` / `get_workflow_version` | READ (history) |
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
| `list_credentials` / `list_tags` / `search_projects` / `search_folders` | Estate helpers (not required for this synthetic) |
| Data-table tools | Not used (out of scope) |

**Missing MCP capability:** hard **DELETE** workflow tool — not exposed. Cleanup path is **`archive_workflow`**. Public API key **not requested** because archive satisfies synthetic cleanup; no gap requiring a new credential.

---

## Capability matrix

| Item | Result | Evidence |
|------|--------|----------|
| Cursor Cloud independent of laptop | **PASS** | This automation cloud run |
| n8n instance reachable | **PASS** | `GET <N8N_ORIGIN>/healthz` → `{"status":"ok"}` |
| n8n version (prior durable note) | **2.33.7** | Prior 2026-08-09 proof; instance still healthy |
| native MCP available | **YES** | Instance-level MCP previously confirmed |
| native MCP connected | **YES** | `n8n-mcp` serverStatus `ready` with full tool schemas |
| public API gap-fill needed | **NO** | All required lifecycle ops available via MCP except hard-delete (archive covers cleanup) |
| LIST | **PASS** | `search_workflows` returned estate + synthetic |
| READ | **PASS** | `get_workflow_details` on synthetic id |
| CREATE | **PASS** | `create_workflow_from_code` → `6465onwhjqdrGILO` |
| UPDATE | **PASS** | marker fix + rare schedule add via `update_workflow` |
| VALIDATE | **PASS** | `validate_workflow` → `valid: true`; `validate_node_config` → all valid |
| TEST | **PASS** | `test_workflow` execution `6597` status `success` |
| EXECUTE | **PASS** | `execute_workflow` manual `6595` (error) + `6596` (success) |
| EXECUTION DEBUG | **PASS** | `get_execution` showed `SYNTHETIC_PROBE_EXPECTED_FAILURE` then pass payload |
| CORRECT + RERUN | **PASS** | UPDATE `probeMarker` broken→ok; success execution `6596` |
| ACTIVATE | **PASS** | `publish_workflow` → `activeVersionId` `ed53e564-6691-4fbe-9913-d1b50d850f54` |
| DEACTIVATE | **PASS** | `unpublish_workflow` → success |
| ARCHIVE | **PASS** | `archive_workflow` → `archived: true` |
| HARD DELETE | **N/A (MCP gap)** | No delete tool; archive used; no API key requested |

---

## Synthetic proof workflow

| Field | Value |
|-------|-------|
| Name | `CorpFlowAI #814 Cloud n8n Capability Probe` |
| Workflow id (this run) | `6465onwhjqdrGILO` |
| Nodes | Manual Trigger → Set (synthetic fields) → Code assert; plus rare annual Schedule for publish proof only |
| Client data | none |
| Production credentials | none |
| Gmail / WhatsApp / SMS / Slack / payments / external sends | none (`externalSend: false`) |
| Final state | **archived** |
| Business workflows touched | **none** |

### Lifecycle timestamps (UTC)

1. CREATE — `2026-08-10T00:35:44.872Z` (`6465onwhjqdrGILO`)
2. VALIDATE — SDK + node configs valid
3. EXECUTE fail — execution `6595` error `SYNTHETIC_PROBE_EXPECTED_FAILURE: probeMarker must be ok`
4. UPDATE correction — `probeMarker` → `ok`
5. EXECUTE success — execution `6596` (`probeStatus: pass`)
6. TEST — execution `6597` success with pin data
7. UPDATE — add rare annual schedule (activation proof only)
8. ACTIVATE — `publish_workflow` success
9. DEACTIVATE — `unpublish_workflow` success
10. ARCHIVE — `archive_workflow` success

### Concurrent-run note

A parallel automation run briefly created/archived an earlier synthetic id (`KQO0LsXz4aKr6t9y`). This run created a fresh synthetic under the required name and completed the full lifecycle on `6465onwhjqdrGILO` only. Business workflows (Heartbeat, Pulse, Password Reset, forward variants, Dispatchers, etc.) were listed for inventory context and **not** mutated.

---

## Business-workflow non-touch confirmation

Observed via LIST only (ids unchanged; no publish/unpublish/update/archive called on them):

- `94gs6QOVed6dWdPZ` Heartbeat Checker v1
- `dxCgQMBoti4n7cgE` Production Pulse v1
- `cFWfyVmy6F5arNaL` Password Reset Email
- `cPgzIQIm4ztU8sQQ` automation forward hardened v2
- `uYn5kLGpBtqqOmtk` issue 611 safe test
- `fAsTwcHdFuhC36f1` automation forward secret
- `V3E4m5KiC1SseaCk` Business Operations Dispatcher v1
- `lQvSDtUyQn1iCcIH` Business Operations Monitor v1
- `6RkDerWf2Xj5EfCY` GitHub to Slack Dispatcher v1
- `gUnkS4EulAXX3xPh` BACKUP automation forward

---

## Exact blockers / gaps

| Gap | Severity | Action |
|-----|----------|--------|
| Hard DELETE not in MCP toolset | Low | Use `archive_workflow` (done). Do **not** mint API key solely for hard-delete. |
| Concurrent synthetic-name races across automation runs | Operational | Prefer one #814 proof executor; archive leftovers by exact synthetic name/id only |

**Anton action:** NONE for MCP auth (already connected). Merge decision for this docs evidence PR remains human-gated.

---

## Explicit non-actions (honored)

- No merge / deploy
- No env / secrets changes
- No DB / schema changes
- No external messages / payments
- No business workflow edits
- No protected operating-doctrine changes
- No custom username/password bridge

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
