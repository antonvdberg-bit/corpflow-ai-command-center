# #658 FINAL LIVE HTTP EXCEPTION-ROUTE VALIDATION — evidence

**Date (UTC):** 2026-08-17T01:40Z  
**Cursor cloud run ID:** `bc-00f760ad-8e56-4a73-bff6-d37ede980960`  
**Trigger:** issue comment `RUN-814-N8N-MCP-PROOF` — `#658 FINAL LIVE HTTP EXCEPTION-ROUTE VALIDATION — OPERATOR APPROVED`  
**Mode:** Read-only inspection complete; live HTTP first+duplicate **BLOCKED** (missing Header Auth secret in agent env)  
**Evidence PR target:** #971 (plus this branch artifact)  
**GitHub issue comment posting:** expected 403 (known); do not retry repeatedly  
**n8n MCP status:** PASS (connected; inspect only for this phase)

Canonical Context Preflight: PASS  
Operating model version: `2026-08-13-v1`  
Environment: `corpflow_test`  
GitHub state refreshed: YES  
Source item: #658

---

## Status

**BLOCKED before any Telegram send on this run.**  
Operator authorized exactly one live HTTP TEST ONLY event + one identical duplicate. Live authenticated HTTP path could not be called because this agent environment has no webhook Header Auth value.

**Did not** fall back to MCP `execute_workflow` (prior #658 finding: MCP harness staticData persistence UNPROVEN; not production-path equivalent).

Classification (original run framing): **D. ACCESS/EVIDENCE LIMITATION**  
**Superseding reconciliation (2026-08-17):** see `AUTH_PATH_RECONCILIATION_2026-08-17.md` — reclassified to **E. CONTEXT RESOLUTION REQUIRED** then **RESOLVED**. Same-day MCP successes `6861`/`6862` did not use live Header Auth; n8n credential `Header Auth account 3` / `l36xGmKJCmjhIVSM` remains present. Do not treat this artifact as proof that the credential is absent from the system or that a new env var/credential must be created.

---

## What was inspected (read-only first) — CONFIRMED

### Active published exception workflow

| Field | Result |
|--------|--------|
| Workflow name | `CorpFlow automation forward hardened v2` |
| Workflow ID | `cPgzIQIm4ztU8sQQ` |
| Active / archived | `active=true`, `isArchived=false` |
| Published version | `activeVersionId` present (`f9be8893-4a2d-4fc3-983f-2296c50ac74e`) |
| Trigger node | `Authenticated Test Webhook1` (`n8n-nodes-base.webhook`, POST, Header Auth) |
| Header Auth credential (safe metadata) | name `Header Auth account 3`; type `httpHeaderAuth`; id `l36xGmKJCmjhIVSM` |
| Dedupe node | `Validate Route Dedupe and Limit1` — `$getWorkflowStaticData('global')` / `seen_event_ids` / 24h TTL / skip `duplicate_event` |
| Exception notify node | `Test Notify Anton - Alert1` (`n8n-nodes-base.telegram`) |
| Telegram credential (safe metadata) | name `Telegram account`; type `telegramApi`; id `FR3tMaFXtAHXsjW7` |
| Slack nodes in this workflow | **NONE** (CONFIRMED) |
| Allowed ops_alert kinds | `production_validation_failure`, `client_approval_needed`, `production_approval_needed`, `external_email_client_send_approval_needed` |

### Live webhook path probe (no secret; no payload of interest)

| Check | Result |
|--------|--------|
| Production webhook path present | YES (path id retained in n8n; host is Elestio automation instance) |
| Unauthenticated POST | HTTP **403** body `Authorization data is wrong!` |
| Interpretation | Published webhook is live and enforcing Header Auth |

Secret values, chat IDs, bot tokens, and full private webhook URLs with secrets are **not** recorded here.

### Planned synthetic event (not submitted)

| Field | Planned value |
|--------|----------------|
| Path | Live authenticated HTTP webhook (not MCP harness) |
| envelope | `corpflow.ops_alert.v1` |
| kind | `production_validation_failure` |
| id / event_id | `658-live-http-exception-route-20260817-v2` (fresh; distinct from prior MCP id `…-v1`) |
| message | `TEST ONLY — #658 live HTTP exception-route validation (exactly-once)` |
| ticket_id | `658` |
| Expected first run | execution success; Telegram alert node **1**; Slack **0**; `skip_reason=null` |
| Expected duplicate | execution success; Telegram alert node **0**; Slack **0**; `skip_reason=duplicate_event` |

---

## Execution evidence (this run)

| Item | Result |
|------|--------|
| First live HTTP submission | **NOT EXECUTED** |
| Duplicate live HTTP submission | **NOT EXECUTED** |
| New execution IDs | **none** |
| Telegram sends this run | **0** |
| Slack participation this run | **0** |

Prior MCP harness executions `6861` / `6862` remain classified as **TEST-HARNESS LIMITATION** per `MCP_STATICDATA_HARNESS_DIAGNOSIS_2026-08-17.md` and are **not** reused as production-path proof.

---

## Deduplication / Slack / harness

| Question | Result |
|----------|--------|
| Live HTTP first→duplicate Telegram exactly-once | **UNPROVEN** (blocked before submit) |
| Slack output | **0** this run; workflow has **no** Slack nodes |
| MCP harness used as substitute | **NO** (correctly refused) |
| PRODUCTION BEHAVIOUR | **UNPROVEN** |
| MCP HARNESS BEHAVIOUR | prior OBSERVED only (not re-run) |
| STATICDATA PERSISTENCE (live webhook) | **UNPROVEN** |

---

## Blocked

**Exact blocker:** `CORPFLOW_AUTOMATION_FORWARD_SECRET` (n8n Header Auth value for credential `Header Auth account 3`) is **not injected** into this cloud agent environment. Optional header-name confirmation may also be required (`CORPFLOW_AUTOMATION_FORWARD_HEADER_NAME`) because n8n triggerInfo reports header name `NEW Header Auth credential` while CorpFlow recipe documents `x-corpflow-automation-forward-secret`.

Environment setup actions requested on this run for Anton to inject those secrets (not via GitHub comments).

---

## Pass criteria scorecard

| Criterion | Result |
|-----------|--------|
| first live HTTP event → exactly 1 Telegram | **NOT RUN** |
| identical duplicate → 0 additional Telegram | **NOT RUN** |
| Slack output → 0 | **PASS** (workflow inspection + this run sent nothing) |
| no unrelated side effects | **PASS** |
| durable evidence recorded | **PASS** (this artifact) |

---

## Next

1. Anton injects `CORPFLOW_AUTOMATION_FORWARD_SECRET` (+ optional header name) into the cloud agent / automation secrets — **not** into issue comments.  
2. Re-run this same operator packet (`RUN-814-N8N-MCP-PROOF` live HTTP final validation).  
3. Agent then submits **one** fresh TEST ONLY event + **one** identical duplicate over live HTTP only; records execution IDs / skip_reason / Telegram node counts; stops.

**Owner:** Cursor n8n MCP Proof agent (blocked) → Anton (secret injection) → Cursor (re-run)  
**Anton needed:** YES

---

## Verdict

`EXCEPTION ROUTE VALIDATION NOT COMPLETE — live HTTP blocked: webhook Header Auth secret missing in agent environment`
