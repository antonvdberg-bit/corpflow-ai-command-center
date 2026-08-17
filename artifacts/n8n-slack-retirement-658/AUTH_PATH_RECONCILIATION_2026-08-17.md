# #658 AUTH-PATH RECONCILIATION — evidence

**Date (UTC):** 2026-08-17T05:00Z  
**Cursor cloud run ID:** `bc-77209dbb-58fa-483a-b107-3abf04806d4f`  
**Trigger:** issue comment `RUN-814-N8N-MCP-PROOF` — `#658 AUTH-PATH RECONCILIATION`  
**Mode:** READ ONLY diagnosis (no Telegram/Slack/email/WhatsApp/SMS send; no workflow edit; no credential create/change/delete; no env/secrets change; no DB/schema/deploy)  
**Canonical evidence PR:** #971  
**Duplicate PR (do not expand):** #972 — recommend close without merge after this reconciliation is recorded on #971  
**GitHub issue/PR comment API:** known **403** for this integration — durable record is this artifact / PR commit only

Canonical Context Preflight: PASS  
Operating model version: 2026-08-13-v1  
Environment: corpflow_test  
GitHub state refreshed: YES  
Source item: #658

---

## Status

**AUTH-PATH RECONCILIATION COMPLETE — EXISTING AUTHENTICATED PATH RESOLVED**

Primary classification: **E. CONTEXT RESOLUTION REQUIRED** (resolved by this packet).

The #972 claim that live HTTP validation was blocked because Header Auth is missing from the system / requires secret recreation is **incorrect**. Same-day successful runs used a different invocation path that never needed a Cursor-held Header Auth value. The live webhook Header Auth credential still exists inside n8n.

This reconciliation run **STOPS before any send**. Prior operator authorization for one TEST ONLY first event + one identical duplicate remains unused by this diagnosis.

---

## What was inspected

| Surface | Result |
|---------|--------|
| Issue #658 + operator packets | Prior MCP approval; staticData harness diagnosis; live HTTP approval; this auth-path reconciliation |
| PR #971 artifacts | Exception-route, MCP staticData diagnosis, live HTTP blocker, Slack refresh |
| PR #972 | Duplicate blocker artifact; incorrectly framed as secret-missing |
| Workflow `cPgzIQIm4ztU8sQQ` | Active; published version `f9be8893-4a2d-4fc3-983f-2296c50ac74e`; webhook Header Auth + Telegram alert path; **0** Slack nodes |
| Executions `6861`, `6862` | Re-inspected with `includeData` (existing only; no new run) |
| Credential inventory (safe metadata) | Header Auth: `Header Auth account 3` / `l36xGmKJCmjhIVSM` **present**; Telegram: `Telegram account` / `FR3tMaFXtAHXsjW7` **present**; Slack credentials **absent** |
| `.env.template` + forward recipe docs | `CORPFLOW_AUTOMATION_FORWARD_URL` / `CORPFLOW_AUTOMATION_FORWARD_SECRET` **authoritative**; header name in recipe = `x-corpflow-automation-forward-secret` |
| Current Cursor process env | No `CORPFLOW_AUTOMATION_FORWARD_*` values present in this run (expected; process env is **not** source of truth for n8n-owned credentials) |

---

## Earlier successful run evidence

| Field | Exec `6861` | Exec `6862` |
|-------|-------------|-------------|
| Started (UTC) | 2026-08-16T23:19:37.416Z | 2026-08-16T23:19:49.790Z |
| Status | success | success |
| Cursor run | `bc-f9563604-6164-4415-8390-e897c0211c86` | same |
| Automation | same n8n-mcp Proof automation (#814 / #658) | same |
| n8n MCP server | connected / `execute_workflow` | same |
| Workflow version | published `cPgzIQIm4ztU8sQQ` active version | same |
| Invocation method | **n8n MCP `execute_workflow`** with webhook-shaped **pinData** | identical duplicate via same method |
| Mode label | `webhook` (harness label; **not** live HTTP proof) | `webhook` |
| pinData on trigger | **YES** (`Authenticated Test Webhook1`) | **YES** |
| Request headers in pinData | `content-type` only — **no** Header Auth header | same |
| Telegram alert sends | 1 | 1 (harness; not production dedupe proof) |
| Slack | 0 | 0 |

**Interpretation:** the same-day “authenticated automation path” that succeeded was **MCP harness execution**. Authentication for Telegram was handled **inside n8n** via credential `Telegram account` (`FR3tMaFXtAHXsjW7`). Header Auth on the published webhook was **not exercised** because pinData injects past the HTTP auth gate.

---

## Invocation-path comparison (#972 vs earlier success)

| Dimension | Successful same-day path (`6861`/`6862`) | #972 live HTTP attempt (`bc-00f760ad-8e56-4a73-bff6-d37ede980960`) |
|-----------|------------------------------------------|---------------------------------------------------------------------|
| Cursor automation | n8n MCP Proof (same family) | same family |
| n8n MCP | used `execute_workflow` | MCP used for inspect only (correctly refused as substitute) |
| Branch / evidence PR | #971 | #971 + duplicate #972 |
| Workflow version | same published WF / version family | same (`f9be8893-4a2d-4fc3-983f-2296c50ac74e`) |
| Invocation | MCP execute + pinData | raw HTTP POST to published webhook |
| Header Auth required? | **NO** (bypassed by pinData) | **YES** (live webhook enforces; unauthenticated probe → HTTP 403) |
| Cursor raw secret required? | **NO** | Only if this Cursor process is the HTTP client |
| Auth handled by n8n? | Telegram credential yes; Header Auth not used | Header Auth owned by n8n credential `l36xGmKJCmjhIVSM` |
| Outcome | Telegram sends occurred (harness) | **0** sends; blocked before authenticated submit |

**Conclusion:** #972 did **not** disprove the existence of Header Auth or of a working automation path. It showed that **raw HTTP from a Cursor process without the header value** cannot pass the live webhook gate — while earlier success never used that gate.

---

## Credential handling

### Safe metadata (no secrets)

| Credential | Type | ID | Role |
|------------|------|----|------|
| `Header Auth account 3` | `httpHeaderAuth` | `l36xGmKJCmjhIVSM` | Attached to live webhook trigger `Authenticated Test Webhook1` |
| `Telegram account` | `telegramApi` | `FR3tMaFXtAHXsjW7` | Attached to exception Telegram nodes |

### What is true where

| Claim | Verdict |
|-------|---------|
| Header Auth credential missing from n8n | **FALSE** — present and attached |
| Capability missing because Cursor env lacks the value | **FALSE as system claim** — Cursor process env ≠ n8n credential store |
| New env var / credential recreation required | **NOT PROVEN** — do not invent; do not rotate/recreate |
| `CORPFLOW_AUTOMATION_FORWARD_SECRET` | **AUTHORITATIVE** name in `.env.template` + forward recipe (producer / Vercel side). Whether its value equals Header Auth account 3 for **this** workflow is **UNPROVEN** without reading secrets (workflow notes describe a test Header Auth credential). |
| `CORPFLOW_AUTOMATION_FORWARD_HEADER_NAME` | **UNVERIFIED ENV NAME** — not in `.env.template`; do not ask Anton to populate it. Recipe documents header `x-corpflow-automation-forward-secret`; n8n triggerInfo reports credential header display name `NEW Header Auth credential` (name mismatch is a **configuration observation**, not authorization to invent an env var). |

---

## Context-resolution finding

1. Same-day success (`6861`/`6862`) = **MCP harness**, not live authenticated HTTP.  
2. Live published-path auth = **n8n-owned** Header Auth credential already on the webhook.  
3. Remaining #658 proof still requires **live published HTTP** (MCP is not equivalent for staticData / exactly-once).  
4. #972 should be reclassified from “secret missing / recreate” to **E. CONTEXT RESOLUTION REQUIRED** (now reconciled).  
5. Prefer reusing the existing n8n Header Auth path — do **not** create a new credential, env var, or auth mechanism.

---

## Existing auth path resolved: YES

**Resolved path for the final live published-path validation (not executed in this run):**

1. Target workflow: `CorpFlow automation forward hardened v2` / `cPgzIQIm4ztU8sQQ` (active / published).  
2. Method: **raw authenticated HTTP POST** to the published webhook (not MCP `execute_workflow`).  
3. Auth: existing n8n Header Auth credential already attached — `Header Auth account 3` / `l36xGmKJCmjhIVSM`.  
4. Payload class: operator-approved TEST ONLY `corpflow.ops_alert.v1` / `production_validation_failure` — **one** first event + **one** identical duplicate (authorization from 2026-08-17 still covers exactly that; **not consumed here**).  
5. Expected: Telegram total **1**; Slack total **0**; duplicate `skip_reason=duplicate_event`.  
6. Explicit non-path: MCP `execute_workflow` / pinData — already proven **TEST-HARNESS LIMITATION** for production dedupe.

**Caller note (not a new secret request):** whichever runner performs the live POST must already hold the matching Header Auth header value (for example an operator-controlled client that already knows the existing credential, or a Cursor environment that has been given that **existing** value). That is reuse of the current n8n credential — **not** proof that the credential is absent, and **not** authorization to invent `CORPFLOW_AUTOMATION_FORWARD_HEADER_NAME` or recreate Header Auth.

---

## Workflow state / Slack / Telegram / dedupe (this run)

| Item | Result |
|------|--------|
| Workflow state | Active published exception path CONFIRMED |
| Telegram result | **0** sends this run (STOP before send) |
| Slack result | **0**; Slack dependency still retired |
| Deduplication result | Live published-path exactly-once still **UNPROVEN** (not run) |
| Test-harness limitation | Prior `6861`/`6862` remain harness-only for dedupe |
| External send | **NONE** |

---

## Blocked / Next / Owner

**Blocked for this diagnosis run:** nothing further for reconciliation itself.

**Still blocked for #658 close-out:** live published-path first+duplicate TEST ONLY has not been executed yet (authorization unused).

**Next:**

1. Reuse the resolved live HTTP + existing Header Auth path above.  
2. Do **not** recreate credentials; do **not** invent env var names.  
3. Execute the already-approved one TEST ONLY + one identical duplicate from a runner that already has the existing Header Auth value.  
4. Record execution IDs / skip_reason / Telegram+Slack counts on **#971**.  
5. Close duplicate **#972** without merge.  
6. Then evaluate #658 close-out.

**Owner:** Cursor n8n MCP Proof agent (next live HTTP run)  
**Anton needed:** **NO** for this reconciliation.  
**Anton needed for next live HTTP step:** only if the chosen runner is Cursor and the existing Header Auth value is not yet available to that runner — supply the **existing** value to the approved automation secrets surface (not chat/GitHub); do **not** recreate n8n credentials.

---

## Corrections to prior #972 framing

| #972 statement | Correction |
|----------------|------------|
| Classification D. ACCESS/EVIDENCE LIMITATION | Prefer **E. CONTEXT RESOLUTION REQUIRED** (capability existed; path mismatch) |
| “Header Auth secret missing” as system truth | Missing only from **that Cursor process env**; credential **present** in n8n |
| Ask Anton to inject / recreate as if absent | Do not recreate; resolve caller context to existing credential |
| Invent / request `CORPFLOW_AUTOMATION_FORWARD_HEADER_NAME` | **UNVERIFIED ENV NAME** — drop |
| Duplicate evidence PR #972 as second workstream | Keep as duplicate artifact only; canonical = **#971** |

---

## Verdict

`AUTH-PATH RECONCILIATION COMPLETE — EXISTING AUTHENTICATED PATH RESOLVED`

No external send in this run.
