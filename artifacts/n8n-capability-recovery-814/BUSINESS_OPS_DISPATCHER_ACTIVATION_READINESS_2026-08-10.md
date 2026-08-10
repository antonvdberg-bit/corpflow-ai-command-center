# BUSINESS OPS DISPATCHER ACTIVATION READINESS — issue #834

**Date (UTC):** 2026-08-10  
**Parent:** [#814](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/814)  
**Issue:** [#834](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/834)  
**Prerequisite:** hardened-v2 `cPgzIQIm4ztU8sQQ` published + post-activation PASS under [#832](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/832) / [PR #833](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/833)  
**Cursor cloud run ID:** `bc-e43d081b-1b00-4cde-8c52-1b4038996a3e`  
**Dispatch run ID:** `run-b11b1c88-780c-49d6-b82c-496b055aacdf`  
**Run URL:** https://cursor.com/agents/bc-e43d081b-1b00-4cde-8c52-1b4038996a3e  
**Branch:** `cursor/dispatcher-issue-834-777e`  
**Mode:** READ / VALIDATE / INSPECT ONLY — no publish, unpublish, edit, archive, credential, env, DB, or outbound send

---

## Final verdict

**NOT READY — live `V3E4m5KiC1SseaCk` still wires Telegram Send when `summary.page_anton > 2` (dispatcher doctrine forbids Telegram here; hardened-v2 owns ops_alert pages)**

---

## BUSINESS OPS DISPATCHER ACTIVATION READINESS packet

```text
BUSINESS OPS DISPATCHER ACTIVATION READINESS
Cursor cloud run ID: bc-e43d081b-1b00-4cde-8c52-1b4038996a3e
n8n MCP status: READY (authenticated; LIST + get_workflow_details + history + executions + list_credentials + validate_node_config PASS)
Workflow name/id: CorpFlowAI — Business Operations Dispatcher v1 / V3E4m5KiC1SseaCk
Current active state: INACTIVE (active=false; activeVersionId=null; triggerCount=0; draft versionId=ec9188fb-7912-413c-8162-6c1526f26546; updatedAt=2026-08-10T03:53:53.383Z)
Workflow validation: FAIL (Telegram Send branch present contrary to runbook/template should_telegram=false; normalize error fallback uses stale camelCase summary/routes incompatible with downstream page_anton/routings)
Trigger/path/schedule: Schedule Trigger every 2 hours → GET https://core.corpflowai.com/api/factory/business-operations-dispatcher (httpBearerAuth) → Normalize → parallel Anton IF + Cursor/Codex Code → Telegram Send and/or GitHub issue #249 comment
Competing dispatcher owner: NO
Execution history health: PASS (zero executions for V3E4m5KiC1SseaCk — no prior failures; never production-proven)
Protected-side-effect map: FAIL (Telegram Send remains live-wired; GitHub createComment on #249 also external)
Credential references safe: PASS (instance names/types only — Bearer Auth account/httpBearerAuth, Telegram account/telegramApi, GitHub account/githubApi; no secret values; MCP redacts per-node credential ids)
Requires env/secret/DB/schema change: NO (factory dispatcher endpoint already exists; n8n credential types already present; activation itself needs no repo/DB/schema change — graph repair is a separate forbidden edit)
Hardened-v2 remains healthy: PASS (cPgzIQIm4ztU8sQQ active=true; activeVersionId=f9be8893-4a2d-4fc3-983f-2296c50ac74e; recent success executions #6604/#6601; distinct webhook path; not bypassed by this schedule poll)
Rollback: Immediate unpublish/deactivate only V3E4m5KiC1SseaCk; leave hardened-v2 / Heartbeat / Password Reset / Pulse / Monitor / Slack Dispatcher / safe-test / secret / BACKUP unchanged
Post-activation validation plan: BLOCKED until Telegram branch removed. After separate repair + Anton publish only — (1) confirm V3E4m5KiC1SseaCk active=true and sole Business Ops Dispatcher owner; (2) confirm hardened-v2 still active on f9be8893; (3) privacy-safe pin-data/manual run with page_anton=0 and empty cursor/codex queues proving Telegram+GitHub nodes do not execute; (4) no live Telegram/email/WhatsApp/SMS; (5) no client sends. Do NOT schedule-fire a live synthetic while Telegram/GitHub branches can execute against real dispatcher data.
Final verdict: NOT READY — live V3E4m5KiC1SseaCk still wires Telegram Send when summary.page_anton > 2 (dispatcher doctrine forbids Telegram here; hardened-v2 owns ops_alert pages)
ANTON ACTION: activation approval required only after graph repair — remove/disable Telegram Send (align to template should_telegram=false); optionally fix normalize error-path schema to page_anton/routings; then re-run this readiness packet. Do not publish V3E4m5KiC1SseaCk yet.
```

---

## Required live inspection answers

### 1. Exact workflow ID/name and active/published state

| Field | Value |
|-------|-------|
| id | `V3E4m5KiC1SseaCk` |
| name | CorpFlowAI — Business Operations Dispatcher v1 |
| active | `false` |
| activeVersionId | `null` (never published) |
| versionId (draft) | `ec9188fb-7912-413c-8162-6c1526f26546` |
| triggerCount | `0` |
| availableInMCP | `true` |
| isArchived | `false` |
| history | 1 autosaved version (2026-07-06); no published versions |

### 2. Deep-read graph/settings + validation

**Settings:** `executionOrder=v1`, `binaryMode=separate`, `availableInMCP=true`.

**Nodes (7):**

1. `Schedule Trigger` — every 2 hours  
2. `CorpFlowAI: business-ops monitor` — HTTP GET factory dispatcher URL, `httpBearerAuth`, `onError=continueRegularOutput`  
3. `Normalize monitor response` — Code; passes through `corpflow.business_operations_dispatcher.v1`; error fallback emits **stale** `summary.pageAnton` + `routes[]` (not API `summary.page_anton` + `routings[]`)  
4. `Any Anton-gated routing?` — IF `Number($json.summary.page_anton) > 2`  
5. `Send a text message` — Telegram to chat `8577408272`  
6. `Any Cursor or Codex routing?` — Code filter → builds #249 comment body  
7. `Create a comment on an issue` — GitHub createComment on issue `249`

**Workflow validation: FAIL**

- Doctrine/template (`docs/runbooks/BUSINESS_OPERATIONS_DISPATCHER_V1.md` §0, template `should_telegram: false`) — dispatcher must **not** Telegram; checkpoint pages go through hardened-v2 `corpflow.ops_alert.v1`.  
- Live graph still connects Anton IF → Telegram Send.  
- Normalize error fallback schema incompatible with IF/Telegram/GitHub field paths.

### 3. Trigger / path / schedule and downstream targets

| Stage | Target |
|-------|--------|
| Trigger | Schedule every **2 hours** (no webhook path) |
| Read | `GET https://core.corpflowai.com/api/factory/business-operations-dispatcher` |
| Branch A | IF `page_anton > 2` → Telegram text to Anton chat |
| Branch B | If any `owner=cursor\|codex` routings → GitHub comment on issue **#249** |

Does **not** call Cursor Cloud / Codex APIs directly; queue notify only.

### 4. Protected / external side-effect map

| Branch | Node | Effect class | Can fire when active? |
|--------|------|--------------|------------------------|
| Anton gate true | `Send a text message` | **PROTECTED external** (Telegram) | YES if `summary.page_anton > 2` |
| Cursor/Codex queue | `Create a comment on an issue` | **External** (GitHub #249) | YES if cursor/codex routings non-empty |
| HTTP poll | factory dispatcher | Internal read (Bearer) | YES every 2h |

**Protected-side-effect map: FAIL** — Telegram remains wired; activating would enable live Telegram on schedule when the IF threshold is met, risking duplicate Anton pages beside hardened-v2.

### 5. Credential references (safe name/type only)

Instance credentials present (no values inspected):

| name | type |
|------|------|
| Bearer Auth account | httpBearerAuth |
| Telegram account | telegramApi |
| GitHub account | githubApi |
| Header Auth account / 2 / 3 | httpHeaderAuth |
| Gmail account | gmailOAuth2 |
| Slack account | slackOAuth2Api |

HTTP node declares `genericAuthType=httpBearerAuth`; Telegram + GitHub nodes are credential-bearing types. MCP redacts attached credential ids from node payloads (same pattern as hardened-v2 READ).

**Credential references safe: PASS**

### 6. Recent executions / history

| Workflow | Executions |
|----------|------------|
| `V3E4m5KiC1SseaCk` | **0** (empty history) |
| hardened-v2 `cPgzIQIm4ztU8sQQ` | recent success `#6604`, `#6601` (manual) |

No prior dispatcher failures. Also no successful production proof.

**Execution history health: PASS** (no failures; never-run noted)

### 7. Env / secret / DB / schema required to activate?

**NO** for activation of the current graph as-is:

- Factory route `/api/factory/business-operations-dispatcher` already exists in-repo.  
- n8n already has Bearer / Telegram / GitHub credential types.  
- No Prisma/migration/env template change required to flip active.

Graph **repair** (required before readiness) is a node-edit packet, not an env/DB change — still **forbidden in this packet**.

### 8. Hardened-v2 remains active/healthy; not duplicated/bypassed

| Check | Result |
|-------|--------|
| `cPgzIQIm4ztU8sQQ` active | `true` |
| activeVersionId | `f9be8893-4a2d-4fc3-983f-2296c50ac74e` |
| Trigger | Webhook `automation-forward-v2-35cb1c1a8e6042ae91b61038104aa542` |
| Recent executions | success `#6604`, `#6601` |
| Bypassed by dispatcher schedule? | **No** — different trigger/path |
| Duplicate Anton Telegram risk if dispatcher activated as-is? | **YES** — dispatcher Telegram branch + hardened-v2 Telegram nodes |

**Hardened-v2 remains healthy: PASS** (health OK; duplicate Telegram risk is why dispatcher is NOT READY)

### 9. Competing active Business Ops Dispatcher owner

**NO.**

| id | name | active |
|----|------|--------|
| `V3E4m5KiC1SseaCk` | CorpFlowAI — Business Operations Dispatcher v1 | false |
| `lQvSDtUyQn1iCcIH` | CorpFlowAI — Business Operations Monitor v1 | false |
| `6RkDerWf2Xj5EfCY` | CorpFlowAI — GitHub to Slack Dispatcher v1 | false |

Active estate remains Heartbeat / Password Reset / Pulse / hardened-v2 only.

### 10. Exact rollback

1. `unpublish_workflow` / deactivate **only** `V3E4m5KiC1SseaCk`.  
2. Do **not** touch hardened-v2 or other workflows.  
3. No Vercel env / DB / secret rollback required for this workflow alone.

### 11. Post-activation validation sequence

**Not authorized yet.** After graph repair (Telegram removed) + separate Anton publish:

1. Confirm `V3E4m5KiC1SseaCk` `active=true`, `activeVersionId` set; Monitor/Slack Dispatcher still inactive.  
2. Confirm hardened-v2 still `active=true` on `f9be8893-4a2d-4fc3-983f-2296c50ac74e`.  
3. Privacy-safe pin-data/manual run with `page_anton=0` and empty cursor/codex queues — prove Telegram + GitHub nodes absent from `runData`.  
4. Confirm no live Telegram/email/WhatsApp/SMS/client sends.  
5. Record execution id + estate LIST.

**Do not** fire a live schedule synthetic against production dispatcher JSON while Telegram/GitHub branches can execute.

---

## Explicit non-actions this packet

- No publish / unpublish / archive  
- No node/settings/credential edits  
- No env / secrets / DB / schema changes  
- No live Telegram / email / WhatsApp / SMS  
- No payments / outreach / client launches  
- No merge / deploy  

---

## One-line Anton decision (gate)

**Hold activation.** Repair live `V3E4m5KiC1SseaCk` to remove Telegram Send (align `should_telegram=false`), then re-run #834 readiness. Do not publish until the re-run returns `READY FOR ANTON ACTIVATION DECISION`.
