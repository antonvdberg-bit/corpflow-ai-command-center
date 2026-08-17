# #658 FINAL EXCEPTION-ROUTE VALIDATION — evidence

**Date (UTC):** 2026-08-16 / 2026-08-17 boundary  
**Cursor cloud run ID:** `bc-f9563604-6164-4415-8390-e897c0211c86`  
**Trigger:** issue comment `RUN-814-N8N-MCP-PROOF` — `#658 FINAL EXCEPTION-ROUTE VALIDATION — OPERATOR APPROVED`  
**n8n MCP status:** PASS (connected; read + authorized execute only)  
**GitHub issue comment posting:** BLOCKED (`403 Resource not accessible by integration`) — durable evidence preserved in this artifact / PR.

---

## What was inspected (read-only first)

### Active approved Telegram exception path

| Field | Value |
|--------|--------|
| Workflow name | `CorpFlow automation forward hardened v2` |
| Workflow ID | `cPgzIQIm4ztU8sQQ` |
| Active / published | **YES** (`active=true`, has `activeVersionId`) |
| Trigger | Authenticated webhook (`n8n-nodes-base.webhook`) |
| Exception route | `corpflow.ops_alert.v1` + checkpoint kind allowlist |
| Allowed kind used | `production_validation_failure` |
| Notify node | `Test Notify Anton - Alert1` (`n8n-nodes-base.telegram`) |
| Credential (safe metadata) | display name `Telegram account`; type `telegramApi`; id `FR3tMaFXtAHXsjW7` |
| Dedupe design | workflow staticData `seen_event_ids` (24h TTL) + burst limit |
| Slack nodes in this workflow | **NONE** |

### Slack live state (re-checked during this run)

| Field | Value |
|--------|--------|
| Accessible workflows scanned | 9 |
| Slack nodes / Slack credentials in accessible inventory | **NONE** |
| Historical Slack dispatcher `6RkDerWf2Xj5EfCY` | **ARCHIVED** — MCP returns: cannot be accessed |
| Slack credential existence | **NONE** (`list_credentials` type/query Slack empty; no `slackOAuth2Api` / `slackApi`) |
| Slack executions after 2026-07-03 | **NONE visible**; archived WF query returns archived/cannot-access |
| Slack participation in either validation run | **0** |

---

## Required execution (authorized)

Synthetic payload (identical for both runs):

- envelope: `corpflow.ops_alert.v1`
- kind: `production_validation_failure`
- id / event_id: `658-exception-route-validation-20260817-v1`
- message: `TEST ONLY — #658 Slack retirement exception-route validation`
- ticket_id: `658`

Method: native `n8n-mcp` `execute_workflow` with `executionMode=production` and webhook-shaped input (no workflow edit; no credential/env/deploy change).

### Run 1 — first synthetic exception

| Field | Value |
|--------|--------|
| Execution ID | `6861` |
| Started / stopped (UTC) | `2026-08-16T23:19:37.416Z` → `2026-08-16T23:19:38.825Z` |
| Status | `success` |
| Routing decision | `route=ops_alert`, `skip_reason=null` |
| Lead Rescue Telegram node executed | **0** |
| Alert Telegram node (`Test Notify Anton - Alert1`) executed | **1** (success / `ok:true`) |
| Slack node/output | **0** |

### Run 2 — identical unchanged resubmit (dedupe test)

| Field | Value |
|--------|--------|
| Execution ID | `6862` |
| Started / stopped (UTC) | `2026-08-16T23:19:49.790Z` → `2026-08-16T23:19:50.235Z` |
| Status | `success` |
| Routing decision | `route=ops_alert`, `skip_reason=null` (expected: `duplicate_event`) |
| Alert Telegram node executed | **1** (second send occurred) |
| Slack node/output | **0** |

### Dedupe result

**FAIL under this MCP harness.**

Expected: second identical event → `skip_reason=duplicate_event`, Telegram node count **0**.  
Actual: second identical event → Telegram node count **1**.

Likely cause (evidence-based hypothesis, not a workflow edit): workflow staticData dedupe did **not** suppress across the two MCP `execute_workflow` invocations (both returned `skip_reason=null`). This does **not** prove the live HTTP production webhook path lacks dedupe; it proves this MCP execution path did not demonstrate durable exactly-once suppression.

---

## Pass criteria scorecard

| Criterion | Result |
|-----------|--------|
| first synthetic exception: exactly 1 Telegram send | **PASS** (exec `6861`) |
| duplicate identical condition: 0 additional Telegram sends | **FAIL** (exec `6862` also sent) |
| Slack output: 0 | **PASS** |
| existing GitHub durable record preserved | **PASS** (evidence via this artifact/PR; issue comment API 403) |
| no production/client side effects beyond authorized Telegram test | **PASS** (ops_alert test label only; no workflow/cred/env/deploy mutation) |

---

## Safety notes (what was NOT exposed)

Not printed here: Telegram chat IDs, bot tokens, webhook auth header values, credential secrets, env secret values, destination identifiers.

Observed in live workflow graphs during inspection (not used, not republished): some inactive/legacy workflows still embed secret-like comparison literals in node parameters. That is a separate hardening concern outside this validation packet.

---

## Verdict

`EXCEPTION ROUTE VALIDATION NOT COMPLETE — identical duplicate still produced a second Telegram send (MCP staticData dedupe not demonstrated)`

### Follow-up diagnosis (2026-08-17 — READ ONLY)

See `MCP_STATICDATA_HARNESS_DIAGNOSIS_2026-08-17.md`.

**Reclassification:** the `6861`/`6862` duplicate Telegram result is **TEST-HARNESS LIMITATION / PRODUCTION BEHAVIOUR UNPROVEN**, not a confirmed production dedupe defect. MCP `execute_workflow` staticData persistence across independent invocations was **not** proven; official n8n docs state static data is not saved when testing.

Updated diagnosis verdict:

`MCP HARNESS DIAGNOSIS COMPLETE — PRODUCTION DEDUPE REMAINS UNPROVEN`

### Exact next protected action (if Anton wants COMPLETE)

Authorize live authenticated **HTTP webhook** first+duplicate proof for workflow `cPgzIQIm4ztU8sQQ` (new TEST ONLY event id), **or** an alternate durable-state proof. Do **not** treat further MCP `execute_workflow` pairs as production dedupe authority until MCP↔live-webhook staticData equivalence is proven. Do **not** archive/unpublish/edit the exception workflow for this proof alone.
