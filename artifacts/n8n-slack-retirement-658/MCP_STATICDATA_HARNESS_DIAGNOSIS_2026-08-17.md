# #658 FOLLOW-UP — MCP staticData / harness diagnosis

**Date (UTC):** 2026-08-17T00:16Z  
**Controller:** #658 comment `RUN-814-N8N-MCP-PROOF` — STATICDATA / MCP HARNESS DIAGNOSIS  
**Mode:** READ ONLY (no workflow edit/activate/archive; no credential/env/DB/deploy change; no Telegram/Slack/email/WhatsApp/SMS send; no new `execute_workflow`)  
**Evidence PR:** #971  
**GitHub issue comment posting:** expected 403 (known); durable record is this artifact / PR update.

Canonical Context Preflight: PASS  
Operating model version: `2026-08-13-v1`  
Environment: `corpflow_test`  
GitHub state refreshed: YES  
Source item: #658

---

## Status

**COMPLETE (diagnosis only).** Prior MCP duplicate Telegram sends (`6861` / `6862`) are **not** valid proof of a production dedupe defect. Classification: **B. TEST-HARNESS LIMITATION**.

---

## What was inspected

| Item | Result |
|------|--------|
| Workflow | `CorpFlow automation forward hardened v2` / `cPgzIQIm4ztU8sQQ` |
| Active / archived | `active=true`, `isArchived=false`, published `activeVersionId` present |
| Dedupe node | `Validate Route Dedupe and Limit1` (`n8n-nodes-base.code`) |
| Executions `6861`, `6862` | metadata + node runData (existing only; no new run) |
| Prior manual execs `6601`, `6604` | metadata comparison |
| Native MCP `execute_workflow` docs | n8n MCP tools reference (production vs manual; no staticData equivalence claim) |
| Official `$getWorkflowStaticData` docs | n8n cookbook page (testing vs trigger/webhook persistence) |
| Workflow staticData read API via MCP | **NOT AVAILABLE** — `get_workflow_details` does not expose stored staticData; no before/after state dump possible |

---

## StaticData design (workflow)

| Field | Value |
|--------|--------|
| Mechanism | `$getWorkflowStaticData('global')` |
| Scope/type | **global** workflow staticData |
| Read path | `state.seen_event_ids[stableEventId]` (after TTL prune) |
| Write path | `state.seen_event_ids[stableEventId] = now` + `state.message_times.push(now)` before notifying |
| Dedupe key / fingerprint | `stableEventId` = `body.id` \|\| `body.event_id` \|\| `body.idempotency_key` \|\| composite fallback |
| TTL / window | `DEDUPE_TTL_MS = 24h`; burst window `60s` / max `5` messages |
| Skip reason on duplicate | `skip_reason: 'duplicate_event'`, `route: 'ignored'`, blank telegram text |
| Expected persistence (normal published webhook) | Per n8n docs: staticData is saved when workflow is **published** and **called by a trigger/webhook**, on successful completion. Testing executions do **not** save staticData. |

Code path summary (no secrets): allowlisted `corpflow.ops_alert.v1` kinds → compute `stableEventId` → consult/update global staticData → if new, route to Telegram alert node; if duplicate, ignore and Respond 200.

---

## Prior executions `6861` / `6862` (existing evidence only)

Synthetic event id (identical both runs): `658-exception-route-validation-20260817-v1`  
Envelope/kind: `corpflow.ops_alert.v1` / `production_validation_failure`  
Gap between runs: ~12 seconds (well inside 24h TTL)

| Exec | Started (UTC) | Mode label | `skip_reason` | Alert Telegram node | Slack nodes |
|------|---------------|------------|---------------|---------------------|-------------|
| `6861` | `2026-08-16T23:19:37.416Z` | `webhook` | `null` | **1** (success) | **0** |
| `6862` | `2026-08-16T23:19:49.790Z` | `webhook` | `null` (expected if shared staticData: `duplicate_event`) | **1** (second send) | **0** |

### Harness markers on both executions (safe metadata)

1. **`pinData` present** on trigger node `Authenticated Test Webhook1` — injected webhook-shaped body (MCP harness input), not a raw live HTTP capture-only path.
2. Execution recorded as `mode: "webhook"` because MCP `execute_workflow` with `executionMode=production` + webhook inputs was used — **mode label alone does not prove live authenticated HTTP webhook equivalence**.
3. Runtime redaction block shows `production: false` on both runs (same flag also seen on older manual exec `6604`; treat as supporting context, not sole proof).
4. Workflow execution inventory for this WF shows **only** `6861`/`6862` as webhook-mode runs; prior runs `6601`/`6604` are `manual`. **No separate live HTTP production-webhook execution pair** is available in MCP history to prove or disprove production-path dedupe.

---

## MCP persistence finding

| Question | Finding |
|----------|---------|
| Does native MCP `execute_workflow` documentation claim staticData equivalence to live webhook? | **NO** — docs describe production vs manual published-version selection and webhook-shaped inputs; **no** staticData persistence guarantee. |
| Official staticData rule | Static data **isn't available when testing**; must be published **and** called by a trigger/webhook to **save** static data ([n8n getWorkflowStaticData docs](https://docs.n8n.io/build/code-in-n8n/cookbook/built-in-methods-and-variables-examples/getworkflowstaticdata/)). |
| Did `6861`→`6862` share effective dedupe state? | **NO** — identical `event_id` within TTL; both returned `skip_reason=null` and both executed Telegram alert node. |
| Can MCP read stored workflow staticData for before/after proof? | **NO** — not exposed by available MCP tools. |
| MCP staticData persistence across independent `execute_workflow` invocations | **UNPROVEN as production-equivalent**; observed behaviour is consistent with **non-persistence / test-harness isolation**. |
| Production live-webhook staticData persistence | **UNPROVEN** in this packet (no authorized live HTTP duplicate test; no new execution triggered). |

Labels required by controller:

- **PRODUCTION BEHAVIOUR:** UNPROVEN  
- **MCP HARNESS BEHAVIOUR:** OBSERVED (duplicate Telegram under MCP)  
- **STATICDATA PERSISTENCE (MCP):** UNPROVEN / not demonstrated across `6861`→`6862`

---

## Production-behaviour classification

**B. TEST-HARNESS LIMITATION** — prior duplicate result is **TEST-HARNESS LIMITATION / PRODUCTION BEHAVIOUR UNPROVEN**, **not** a confirmed production dedupe defect.

Do **not** treat `6861`/`6862` as authoritative evidence that the live authenticated production webhook path fails exactly-once suppression.

---

## Slack result (reconfirm from existing execution evidence only)

- Workflow `cPgzIQIm4ztU8sQQ` has **zero** Slack nodes.
- Executions `6861` and `6862` runData: Slack node/output count **0** / **0**.
- No new Slack investigation performed (not required).

Slack retirement remains a **separate** conclusion from Telegram dedupe proof.

---

## Safety / non-actions this run

- No Telegram/Slack/email/WhatsApp/SMS send  
- No `execute_workflow` / `test_workflow`  
- No workflow edit / publish / unpublish / archive  
- No credential/env/secret/DB/deploy change  
- No chat IDs, bot tokens, webhook secrets, or auth header values reproduced here  

---

## Next (protected; needs Anton if pursued)

To prove **production** exactly-once:

1. Authorize **one** live authenticated HTTP webhook call with a **new** TEST ONLY event id (first send), then  
2. Authorize **one** identical duplicate HTTP call (expect Telegram **0**, `skip_reason=duplicate_event`),  
**or** authorize an alternate durable-state proof if staticData remains unreliable under load.

Do **not** reuse MCP `execute_workflow` pairs as the sole authority for production dedupe until MCP↔live-webhook staticData equivalence is separately proven.

---

## Verdict

`MCP HARNESS DIAGNOSIS COMPLETE — PRODUCTION DEDUPE REMAINS UNPROVEN`
