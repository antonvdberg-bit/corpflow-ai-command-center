# HARDENED V2 LIVE REVALIDATION — issue #830

**Date (UTC):** 2026-08-10  
**Observed at (UTC):** 2026-08-10T03:59:33Z (synthetic execution `#6601` success)  
**Parent:** [#814](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/814)  
**Prior validation:** [#828](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/828) / [PR #829](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/829)  
**Issue:** [#830](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/830)  
**Cursor cloud run ID:** `bc-f4d5681d-2c08-4bd7-8c38-dc66bcdbd10a`  
**Dispatch run ID:** `run-67e72259-d855-4a87-9a49-617b0d950c03`  
**Run URL:** https://cursor.com/agents/bc-f4d5681d-2c08-4bd7-8c38-dc66bcdbd10a  
**Branch:** `cursor/dispatcher-issue-830-624d`  
**Mode:** LIVE read / validate / safe pin-data synthetic only via native `n8n-mcp` — no publish/unpublish/edit/archive/credential/env/DB/outbound mutation

---

## Final verdict

**FAIL — hardened-v2 still inactive/unpublished (active=false; activeVersionId=null)**

UI MCP-exposure screenshots are confirmed for readability (`availableInMCP=true`). Overview screenshot that did **not** show a Published badge for hardened-v2 matches live n8n state. Do **not** announce success to other workstreams.

---

## HARDENED V2 LIVE REVALIDATION

```text
HARDENED V2 LIVE REVALIDATION
Cursor cloud run ID: bc-f4d5681d-2c08-4bd7-8c38-dc66bcdbd10a
n8n MCP readable: PASS
Workflow ID: cPgzIQIm4ztU8sQQ
Active/published state: FAIL
Workflow validation: PASS
Webhook/path match: PASS
Competing active forward owner: NO
Execution health: PASS
Side-effect map: PASS
Safe synthetic possible: YES
Synthetic test: PASS
Other workflow states unchanged: PASS
Final verdict: FAIL — hardened-v2 still inactive/unpublished (active=false; activeVersionId=null)
ANTON ACTION: Publish/activate CorpFlow automation forward hardened v2 (cPgzIQIm4ztU8sQQ) only in n8n UI; then re-run #830-style revalidation before any internal announce
```

---

## What changed vs #828

| Check | #828 (PR #829) | #830 (this run) |
|-------|----------------|-----------------|
| `availableInMCP` | `false` (READ blocked) | `true` (READ/VALIDATE/executions OK) |
| Deep-read / path / graph | FAIL | PASS |
| Active / published | FAIL (`active=false`) | FAIL (`active=false`; `activeVersionId=null`; `activeVersion=null`) |
| Safe synthetic | NOT RUN | PASS (manual pin-data exec `#6601`) |

`updatedAt` for all 10 estate workflows is now `2026-08-10T03:53:53.383Z` (bulk MCP-availability refresh). Version history for hardened-v2 still has a single draft version from `2026-07-16` — no published active version.

---

## Stage 1 — live state

### 1. MCP-readable

**PASS.** `search_workflows` + `get_workflow_details` succeed for `cPgzIQIm4ztU8sQQ`. Settings include `availableInMCP: true`.

### 2. Active / published

**FAIL.**

| Field | Live value |
|-------|------------|
| id | `cPgzIQIm4ztU8sQQ` |
| name | CorpFlow automation forward hardened v2 |
| active | `false` |
| activeVersionId | `null` |
| activeVersion | `null` |
| versionId (draft) | `f9be8893-4a2d-4fc3-983f-2296c50ac74e` |
| isArchived | `false` |
| triggerCount | `1` |
| updatedAt | `2026-08-10T03:53:53.383Z` |

### 3. Workflow validation

**PASS.** Graph connections are coherent (Webhook → Code → IF lead_rescue → IF ops_alert → Respond 200; Telegram notify nodes only on true branches). `validate_node_config` PASS for webhook, code, both IF nodes, respondToWebhook; Telegram nodes PASS when `resource=message` / `operation=sendMessage` discriminators are supplied (live nodes use classic `chatId`+`text` sendMessage shape).

### 4. Webhook / path match

**PASS.** Live webhook path suffix equals the #814 / #826 expected hardened path:

`automation-forward-v2-35cb1c1a8e6042ae91b61038104aa542`

- Method: `POST`
- Auth: Header Auth
- Response mode: Respond to Webhook node
- Factory health: `automation.forward_url_configured: true` (URL value not read; no secret inspection)

### 5. Competing active forward owner

**NO.** Active set remains only:

| id | name | active |
|----|------|--------|
| `94gs6QOVed6dWdPZ` | CorpFlowAI GitHub Heartbeat Checker v1 | true |
| `cFWfyVmy6F5arNaL` | CorpFlowAI — Password Reset Email | true |
| `dxCgQMBoti4n7cgE` | CorpFlowAI Production Pulse v1 | true |

Forward companions all inactive: hardened-v2, issue-611 safe-test, secret, BACKUP.

### 6. Other workflow states unchanged

**PASS.** Dispatcher (`V3E4m5KiC1SseaCk`), Slack Dispatcher, Monitor, safe-test, secret, BACKUP remain inactive. Heartbeat / Password Reset / Production Pulse remain active. Reconfirmed after synthetic.

### 7. Execution health

**PASS.** Before synthetic: zero executions. After: single manual success `#6601` (no error/retry/loop/duplicate fan-out; no abnormal volume).

---

## Stage 2 — side-effect map

**PASS (mapped).**

| Branch / path | External / protected effect |
|---------------|----------------------------|
| `route=lead_rescue` + nonblank text | **Telegram** — `Test Notify Anton - Lead Rescue1` |
| `route=ops_alert` + nonblank text (allowlisted checkpoint kinds) | **Telegram** — `Test Notify Anton - Alert1` |
| `route=ignored` (unknown/blank/duplicate/burst) | **None** — terminates at `Respond 200` (`accepted`) |
| Auth failure | Header Auth reject (n8n); no Telegram |
| Email / WhatsApp / SMS / DB / payments / sub-workflow activate | **None present** in this graph |

Instance credentials seen by name/type only (no values): `Header Auth account*`, `Telegram account` (`telegramApi`), plus unrelated GitHub/Gmail/Slack/Bearer entries.

---

## Stage 3 — safe synthetic

**Safe synthetic possible: YES** — unknown-event ignore path is guaranteed not to enter either Telegram node.

**Synthetic test: PASS**

| Field | Value |
|-------|-------|
| Tool | `test_workflow` (pin-data; Telegram nodes pinned, not network-called) |
| Execution ID | `6601` |
| Mode | `manual` |
| Status | `success` |
| Path taken | Webhook → Validate → Lead Rescue IF (false) → Alert IF (false) → Respond 200 |
| Code output | `route=ignored`, `skip_reason=unknown_event`, empty `telegram_text` |
| Telegram nodes executed | **No** (absent from `runData`) |
| Retries / loops | None (`retryOf=null`) |
| Companion state change | None |

Synthetic body (privacy-safe): `event_type=corpflow.revalidation.synthetic.unknown.v1`, id `830-revalidation-synthetic-001`. No client/private data.

---

## Rollback / next action

- **No n8n rollback required** — hardened-v2 never reached published/active in this window.
- Leave Heartbeat / Password Reset / Production Pulse / Dispatcher / safe-test / secret / BACKUP unchanged.
- Do not change Vercel env.
- **ANTON ACTION:** In n8n UI, **Publish** (activate) only `CorpFlow automation forward hardened v2` (`cPgzIQIm4ztU8sQQ`). Then re-run this revalidation. Do not announce internally until Active/published = PASS.

---

## Explicit non-actions (honoured)

No workflow create/edit/publish/unpublish/archive. No credential/env/DB/schema changes. No real email/WhatsApp/SMS/Telegram network send. No Business Operations Dispatcher activation. No merge/deploy. No announce to other workstreams.

---

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES (evidence artifact on branch)
- Merged to main: NO
- Production deployment ID: n/a — docs-only evidence; no app deploy
- Commit deployed: n/a — docs-only evidence
- Live URLs tested: https://core.corpflowai.com/api/factory/health (200; forward_url_configured=true); n8n via authenticated n8n-mcp READ + pin-data synthetic
- Expected vs actual result: Expected MCP-readable + published/active hardened-v2; actual MCP-readable PASS but active=false / activeVersionId=null
- Client-facing flow usable: n/a — no client surface change
- Final verdict: PARTIAL (revalidation packet complete with FAIL runtime verdict; no activation/mutation performed)
```
