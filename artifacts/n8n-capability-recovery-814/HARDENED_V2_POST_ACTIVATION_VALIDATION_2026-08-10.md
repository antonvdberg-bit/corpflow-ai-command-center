# HARDENED V2 POST-ACTIVATION VALIDATION — issue #828

**Date (UTC):** 2026-08-10  
**Observed at (UTC):** 2026-08-10T01:50:16Z (LIST reconfirm)  
**Parent:** [#814](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/814)  
**Pre-activation packet:** [#826](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/826) / [PR #827](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/827)  
**Issue:** [#828](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/828)  
**Cursor cloud run ID:** `bc-68ae252e-4a41-41e1-8ac9-668612b59471`  
**Dispatch run ID:** `run-4307c0b6-d877-4ea0-8967-aa004def3fee`  
**Run URL:** https://cursor.com/agents/bc-68ae252e-4a41-41e1-8ac9-668612b59471  
**Branch:** `cursor/dispatcher-issue-828-0624`  
**Mode:** READ-ONLY live validation via native `n8n-mcp` — no publish/unpublish/edit/archive/credential/env/DB/outbound mutation

---

## Final verdict

**FAIL — hardened-v2 still inactive (active=false); claimed activation not reflected in live n8n-mcp LIST**

Do **not** announce success to other workstreams. Do **not** proceed to Business Operations Dispatcher or other forward-dependent rollout.

---

## HARDENED V2 POST-ACTIVATION VALIDATION

```text
Cursor cloud run ID: bc-68ae252e-4a41-41e1-8ac9-668612b59471
n8n MCP status: READY (authenticated; LIST + list_credentials PASS; business-workflow READ/VALIDATE/EXECUTIONS blocked by availableInMCP=false)
Workflow name/id: CorpFlow automation forward hardened v2 / cPgzIQIm4ztU8sQQ
Active state: FAIL
Workflow deep-read: FAIL
Workflow validation: FAIL
Webhook/path match: FAIL
Competing active forward owner: NO
Recent execution health: FAIL
Side-effect map reviewed: FAIL
Safe synthetic execution possible: NO
Synthetic execution result: NOT RUN
Unexpected executions/retries/loops: NO
Other workflow states unchanged: PASS
Credential references safe: PASS
Rollback if failure: No n8n rollback required — cPgzIQIm4ztU8sQQ never reached active/published in this window (active=false; updatedAt still 2026-07-16T01:15:31.966Z). Leave Heartbeat / Password Reset / Production Pulse / Dispatcher / safe-test / secret / BACKUP unchanged. Do not change Vercel env. After Anton publishes hardened-v2 and enables MCP access on that workflow only, re-run #828 before any internal announce.
Final verdict: FAIL — hardened-v2 still inactive (active=false); claimed activation not reflected in live n8n-mcp LIST
ANTON ACTION: NONE
```

---

## Stage 1 — read-only live state

### 1. Active / published now?

**FAIL.** Live `search_workflows` (full estate + query `automation forward`) shows:

| Field | Value |
|-------|-------|
| id | `cPgzIQIm4ztU8sQQ` |
| name | CorpFlow automation forward hardened v2 |
| active | `false` |
| updatedAt | `2026-07-16T01:15:31.966Z` (unchanged vs #826 pre-activation LIST) |
| triggerCount | `1` |
| availableInMCP | `false` |
| canExecute | `true` (LIST capability flag only; READ still rejected) |

Issue #828 body states Anton activated this workflow. **Live n8n-mcp LIST contradicts that claim** — still inactive, no `updatedAt` movement since 2026-07-16.

### 2. Deep-read workflow graph / settings

**FAIL.** `get_workflow_details({ workflowId: "cPgzIQIm4ztU8sQQ" })` →  
`Workflow is not available in MCP. Enable MCP access from the workflow card in the workflows list, or from the workflow settings.`

Same rejection for Heartbeat (`94gs6QOVed6dWdPZ`) — all listed business workflows currently show `availableInMCP=false`. Enabling MCP access would be a workflow-settings mutation forbidden by this packet’s hard boundaries.

### 3. Validate workflow graph / node configs

**FAIL.** Cannot load live graph. MCP `validate_workflow` only accepts SDK source for create/update; it cannot validate an existing business workflow id without a reconstructed graph from `get_workflow_details`.

### 4. Trigger / webhook path vs #814 expected

| Check | Result |
|-------|--------|
| Expected hardened path suffix (#814 deep audit) | `automation-forward-v2-35cb1c1a8e6042ae91b61038104aa542` |
| Live MCP path re-read this run | **FAIL** (blocked by `availableInMCP=false`) |
| Vercel `CORPFLOW_AUTOMATION_FORWARD_URL` suffix | **NOT VERIFIED** this run (no Vercel env value access); factory health only shows `automation.forward_url_configured: true` |

**Webhook/path match: FAIL**

### 5. Competing active automation-forward owner

**NO.**

Active set (unchanged vs #826 / #814 deep audit):

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

Also inactive: Business Operations Dispatcher (`V3E4m5KiC1SseaCk`), Monitor (`lQvSDtUyQn1iCcIH`), Slack Dispatcher (`6RkDerWf2Xj5EfCY`).

### 6. Companion / Dispatcher / safe-test / secret / BACKUP states

**PASS — other workflow states unchanged.** Heartbeat, Password Reset, and Production Pulse remain the only active workflows. Dispatcher / safe-test / secret / BACKUP remain inactive. No evidence of unintended companion activation.

### 7. Recent executions since activation

**FAIL (not inspectable).**  
`search_executions({ workflowId: "cPgzIQIm4ztU8sQQ" })` → MCP not-available error (empty data + error).  
`get_workflow_history` → same rejection.

No LIST-level signal of activation-era volume (workflow `updatedAt` unchanged).  
**Unexpected executions/retries/loops: NO** at the observable LIST / companion-state layer (cannot prove execution-history cleanliness via MCP).

### 8. Credential references (names/types only)

**PASS** for safe listing. Instance `list_credentials` (no values):

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

Prior #814 deep-audit attachment claim for hardened-v2 (`Header Auth account 3`, `Telegram account`) is **not re-confirmed** this run (READ blocked). No credential values inspected or written.

---

## Stage 2 — side-effect safety review

**FAIL — side-effect map not re-reviewable on live graph.**

Without `get_workflow_details`, this packet cannot classify live nodes/branches that could cause HTTP forward, Telegram, email, WhatsApp/SMS, DB writes, payments, production mutation, or downstream workflow activation.

Prior #814 deep-audit (stale relative to this post-activation gate) indicated hardened-v2 includes webhook ingest + HTTP forward + Telegram credential attachment. That prior knowledge is **insufficient** to guarantee a no-send synthetic path under current hard rules (“Do not guess”).

**Safe synthetic execution possible: NO**

Exact stop reason for Stage 3:  
`FAIL — safe synthetic execution not guaranteed` because live graph/branch side-effect classification is blocked by `availableInMCP=false` (and primary Active-state gate already failed).

---

## Stage 3 — bounded synthetic execution

**NOT RUN.**

Hard boundaries observed:
- Did not call `execute_workflow` / `test_workflow` / `publish_workflow` / `unpublish_workflow` / `update_workflow` / `archive_workflow`
- Did not send email / WhatsApp / SMS / Telegram
- Did not change credentials, Vercel env, DB/schema
- No real client data used

---

## Stage 4 — runtime observation

Post-test observation **n/a** (no synthetic run).

Reconfirm LIST after Stage 1–2 inspection:
- hardened-v2 still `active=false`
- active set still Heartbeat + Password Reset + Production Pulse only
- no companion became active

Factory health (non-secret): `ok: true`, `automation.forward_url_configured: true`, `automation.ingest_secret_configured: true`, `password_reset_delivery_configured: true`.  
Note: `forward_url_configured: true` means the Vercel env var is set — **not** that the n8n consumer workflow is active.

---

## Concurrent secondary blocker (same estate)

Even if Anton publishes/activates hardened-v2 next, **post-activation Stages 1.2–1.4 / 1.7 / 2–4 will still fail** until MCP access is enabled on `cPgzIQIm4ztU8sQQ` (workflow card / settings toggle only — no node edits). Enabling that toggle is an Anton-owned settings action outside this packet’s mutation ban.

Recommended Anton sequence (outside this packet; not executed here):
1. Confirm in n8n UI whether hardened-v2 is intended to be Published/Active (live LIST currently says no).
2. If activation is still desired: publish/activate `cPgzIQIm4ztU8sQQ` only.
3. Enable MCP access on that workflow only.
4. Re-run #828 post-activation validation before any internal announce to other workstreams.

---

## Explicit non-actions (this run)

- No workflow node/settings edits
- No activate / deactivate / archive / delete
- No credential / n8n settings / Vercel env / secrets changes
- No DB / schema changes
- No email / WhatsApp / SMS / Telegram to real recipients
- No payments / outreach / public launch
- No completion announce to other workstreams (FAIL)

---

## Promptfoo / AI eval evidence

```text
Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: docs-only post-activation validation evidence for n8n forward-spine inspection; no AI behaviour, prompt logic, drafting, Lead Rescue/Website Rescue AI, chatbot, model routing, or protected-action AI handling changed
- cases affected: none
- new cases added: none
- artifact path, if generated: artifacts/n8n-capability-recovery-814/HARDENED_V2_POST_ACTIVATION_VALIDATION_2026-08-10.md
- live-model eval used: NO
```
