# ERPNext Cursor Cloud security correction — issue #899

**Status:** ERPNext direct API path **PASS**. `MASTER_ADMIN_KEY` removal **INCOMPLETE** — still injected into this ordinary Factory Automation Cursor Cloud run.  
**Current verification (UTC):** 2026-08-19  
**Cursor agent ID:** `bc-c67a9751-28cb-47e6-918a-29a13c213561`  
**Cursor agent URL:** https://cursor.com/agents/bc-c67a9751-28cb-47e6-918a-29a13c213561  
**Factory handoff run:** `32233151156`  
**Cursor Automation:** `CorpFlowAI Factory Wake Proof v2` (`30c07c9d-96f7-11f1-ba66-0e7d0216e441`)  
**Branch:** `cursor/corpflowai-worker-protocol-80e9`  
**Anchor:** `<!-- ERPNEXT_CURSOR_CLOUD_SECURITY_CORRECTION_899 -->`

<!-- ERPNEXT_CURSOR_CLOUD_SECURITY_CORRECTION_899 -->

## Required return (fresh Factory Automation wake, 2026-08-19)

```text
MASTER_ADMIN_KEY in general Cursor Cloud execution: PRESENT
ERPNext access: PASS
Cursor agent ID: bc-c67a9751-28cb-47e6-918a-29a13c213561
Factory handoff run: 32233151156
Cursor Automation: CorpFlowAI Factory Wake Proof v2 (30c07c9d-96f7-11f1-ba66-0e7d0216e441)
access path: direct Cursor Cloud secrets → Frappe token auth (no SSH/Infisical runtime bridge)
authenticated user: integrations@corpflowai.com
http_auth_status: 200
safe site/version metadata: frappe=16.25.0, erpnext=16.26.2
injected secret names (presence only): ERPNEXT_BASE_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET, MASTER_ADMIN_KEY
ADMIN_PIN: ABSENT
reachable DocTypes (HTTP 200): Company, Customer, Contact, Address, Lead, Opportunity, Customer Group, Territory, Item, Item Group, Item Price, Price List, Quotation, Sales Invoice, Payment Entry, Currency, Terms and Conditions, File, Print Format, Project, Project Template, Task, Issue, Issue Type
denied DocTypes: Payment Terms (HTTP 403)
exact ERPNext blocker: NONE
security_correction_#899: INCOMPLETE — MASTER_ADMIN_KEY still injected into this ordinary Factory Automation Cursor Cloud run
#880 / #881: already executed on later packets; this run does not reopen them
Anton required now: YES — UI-only delete of secret NAME MASTER_ADMIN_KEY from the remaining Cursor secret store that still injects into Factory Automation workers (Cloud Agents Secrets and/or this Automation’s own secrets). Do not paste values.
```

## Canonical Context Preflight

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #899
```

## 1. What this fresh run proved

Anton confirmed on 2026-08-13 that `MASTER_ADMIN_KEY` had been removed from the **general Cursor Cloud Secrets** scope, and asked for a fresh Cursor Cloud verification.

This Factory Automation wake is that verification.

| Check | Result |
| --- | --- |
| Linked Cursor environment | **none** (`environment-info` → `environment: null`, `build: null`) |
| Repo `.cursor/environment.json` | **none** |
| Process env on this fresh run | `MASTER_ADMIN_KEY` **PRESENT** |
| ERPNext direct API secrets | `ERPNEXT_BASE_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET` all **PRESENT** |
| `ADMIN_PIN` | **ABSENT** |
| Repo dispatcher / GitHub Actions activator | Does **not** inject `MASTER_ADMIN_KEY` into this Automation worker |
| SSH / Infisical runtime bridge | **Not used** |
| Secret values printed | **NO** (names and presence only) |

Conclusion: the remaining injection is **not** from the repo. It is still a Cursor-platform secret injection into **ordinary Factory Automation workers**. Repo automation cannot delete that entry.

The 2026-08-13 Cloud Agents Secrets delete did **not** clear this Factory Automation wake. Remaining scopes to inspect (secret **NAME** only):

1. [Cursor Dashboard → Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents) — confirm the name is gone from general/team Cloud Agents Secrets.
2. [This Factory Automation](https://cursor.com/automations/30c07c9d-96f7-11f1-ba66-0e7d0216e441) — if the Automation has its own Secrets, delete **`MASTER_ADMIN_KEY`** there.
3. Any other team/user Cursor Cloud secret scope that still applies to Automations-sourced agents.

Keep `ERPNEXT_BASE_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`. Start a **fresh** wake after the UI delete (this running pod keeps already-injected secrets).

## 2. Fresh read-only probe (2026-08-19)

```bash
bash scripts/erpnext/cursor-cloud-api-probe.sh
```

| Field | Result |
| --- | --- |
| Connection / auth | **PASS** — HTTP 200 |
| Identity | `integrations@corpflowai.com` |
| Versions | `frappe=16.25.0`, `erpnext=16.26.2` |
| Mutation | **None** (GET-only) |
| Secret values printed | **NO** |
| SSH / Infisical runtime bridge | **Not used** |
| Probe artifact | `artifacts/erpnext/security-correction-899-2026-08-19.md` |

### DocType matrix (this run)

| DocType | Result | HTTP |
| --- | --- | --- |
| Company | PASS | 200 |
| Customer | PASS | 200 |
| Contact | PASS | 200 |
| Address | PASS | 200 |
| Lead | PASS | 200 |
| Opportunity | PASS | 200 |
| Customer Group | PASS | 200 |
| Territory | PASS | 200 |
| Item | PASS | 200 |
| Item Group | PASS | 200 |
| Item Price | PASS | 200 |
| Price List | PASS | 200 |
| Quotation | PASS | 200 |
| Sales Invoice | PASS | 200 |
| Payment Entry | PASS | 200 |
| Currency | PASS | 200 |
| Terms and Conditions | PASS | 200 |
| Payment Terms | FAIL (permission) | 403 |
| File | PASS | 200 |
| Print Format | PASS | 200 |
| Project | PASS | 200 |
| Project Template | PASS | 200 |
| Task | PASS | 200 |
| Issue | PASS | 200 |
| Issue Type | PASS | 200 |

Item Price is now readable (was 403 on the 2026-08-12 generation-1 probe; later #881 Role Permission grant). Payment Terms remains 403.

## 3. Smallest remaining Anton action (NAME only)

See `docs/runbooks/ERPNEXT_CURSOR_CLOUD_SECRETS_LEAST_PRIVILEGE_V1.md` § 4.

Do not paste any secret value into chat or GitHub.

After the remaining UI delete, a **fresh** Factory Automation wake must show:

```text
MASTER_ADMIN_KEY: absent
ERPNEXT_BASE_URL / ERPNEXT_API_KEY / ERPNEXT_API_SECRET: present
ERPNext access: PASS
authenticated_user: integrations@corpflowai.com
security_correction_#899: PASS
```

Until that fresh-run absence proof exists, #899 is **not** complete.

## 4. #880 / #881 / #882 posture

Those commercial packets already ran on later issues after generation 1. This verification does **not** reopen them. Direct API access remains proven.

## 5. Non-actions honoured

- No merge / deploy by this agent
- No Vercel / production env mutation
- No secret values logged or committed
- No ERPNext create/update/submit/cancel/delete
- No SSH/Infisical runtime bridge used
- No DB/schema / payment / client-send changes
- No Cursor Dashboard secret-store mutation (UI-only; automation cannot delete)

## 6. Historical generation 1 (2026-08-12, merged PR #900)

Kept as lineage. That run proved the direct ERPNext API path and identified Cloud Agents Secrets as the then-known injection source. `MASTER_ADMIN_KEY` was **PRESENT**. Anton later confirmed a Cloud Agents Secrets delete (2026-08-13). This 2026-08-19 Factory Automation wake shows the name is **still PRESENT**.

- Cursor agent ID: `bc-a36314af-5d61-421c-8be3-b9ecad349924`
- Cursor run ID: `run-913060e0-9757-422e-b783-87f3b4f23798`
- Branch: `cursor/dispatcher-issue-899-3f31`
- PR: [#900](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/900) (merged)
- Journal: `JE-2026-08-12-1`
