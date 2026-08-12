# ERPNext Cursor Cloud security correction — issue #899

**Status:** ERPNext direct API path **PASS**; `MASTER_ADMIN_KEY` removal **UI-blocked (Anton one-time)**.  
**Date (UTC):** 2026-08-12  
**Cursor agent ID:** `bc-a36314af-5d61-421c-8be3-b9ecad349924`  
**Cursor run ID:** `run-913060e0-9757-422e-b783-87f3b4f23798`  
**Cursor run URL:** https://cursor.com/agents/bc-a36314af-5d61-421c-8be3-b9ecad349924  
**Branch:** `cursor/dispatcher-issue-899-3f31`  
**Anchor:** `<!-- ERPNEXT_CURSOR_CLOUD_SECURITY_CORRECTION_899 -->`

<!-- ERPNEXT_CURSOR_CLOUD_SECURITY_CORRECTION_899 -->

## Required return

```text
MASTER_ADMIN_KEY in general Cursor Cloud execution: PRESENT (must be removed via Cursor Dashboard UI)
ERPNext access: PASS
Cursor run ID: run-913060e0-9757-422e-b783-87f3b4f23798
Cursor agent ID: bc-a36314af-5d61-421c-8be3-b9ecad349924
access path: direct Cursor Cloud secrets → Frappe token auth (no SSH/Infisical runtime bridge)
authenticated user: integrations@corpflowai.com
http_auth_status: 200
safe site/version metadata: frappe=16.25.0, erpnext=16.26.2
injected secret names (presence only): ERPNEXT_BASE_URL, ERPNEXT_API_KEY, ERPNEXT_API_SECRET, MASTER_ADMIN_KEY
reachable DocTypes (HTTP 200): Company, Customer, Contact, Address, Lead, Opportunity, Item, Item Group, Price List, Quotation, Sales Invoice, Payment Entry, Currency, Terms and Conditions, File, Print Format
denied DocTypes: Item Price (HTTP 403), Payment Terms (HTTP 403)
exact ERPNext blocker: NONE
security_correction_#899: INCOMPLETE until MASTER_ADMIN_KEY deleted from Cursor Cloud Secrets and verified absent on a fresh run
#880 / #881 can proceed: YES for discovery/read + Client Master / catalogue structure (Customer, Contact, Address, Item, Item Group, Price List readable); Item Price role grant needed before Item Price writes; Payment Terms 403 is non-blocking for #880/#881 start
Anton required now: YES — one-time Cursor Dashboard UI delete of secret NAME MASTER_ADMIN_KEY from general Cloud Agents Secrets scope
```

## Canonical Context Preflight

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-12-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #899
```

## 1. Where `MASTER_ADMIN_KEY` is injected

| Check | Result |
| --- | --- |
| Linked Cursor environment | **none** (`environment-info` → `environment: null`, `build: null`) |
| Process env on this fresh run | `MASTER_ADMIN_KEY` **PRESENT** |
| ERPNext direct API secrets | `ERPNEXT_BASE_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET` all **PRESENT** |
| Repo dispatcher activator | Does **not** inject `MASTER_ADMIN_KEY` into Cursor Cloud agents |
| Narrow legitimate Cursor Cloud consumer found for master key | **None** for ordinary ERPNext / dispatcher work |

Conclusion: injection source is the **Cursor Dashboard → Cloud Agents → Secrets** general/team scope. Repo automation cannot delete that entry.

## 2. Fresh read-only probe

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

### DocType matrix

| DocType | Result | HTTP |
| --- | --- | --- |
| Company | PASS | 200 |
| Customer | PASS | 200 |
| Contact | PASS | 200 |
| Address | PASS | 200 |
| Lead | PASS | 200 |
| Opportunity | PASS | 200 |
| Item | PASS | 200 |
| Item Group | PASS | 200 |
| Item Price | FAIL (permission) | 403 |
| Price List | PASS | 200 |
| Quotation | PASS | 200 |
| Sales Invoice | PASS | 200 |
| Payment Entry | PASS | 200 |
| Currency | PASS | 200 |
| Terms and Conditions | PASS | 200 |
| Payment Terms | FAIL (permission) | 403 |
| File | PASS | 200 |
| Print Format | PASS | 200 |

## 3. Smallest Anton action (NAME only)

See `docs/runbooks/ERPNEXT_CURSOR_CLOUD_SECRETS_LEAST_PRIVILEGE_V1.md` § 4.

Click path:

1. [Cursor Dashboard → Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents)
2. Delete secret named **`MASTER_ADMIN_KEY`** from the general/team scope
3. Keep `ERPNEXT_BASE_URL`, `ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`
4. Start a **fresh** Cursor Cloud run and re-probe

Do not paste any secret value into chat or GitHub.

## 4. #880 / #881 / #882 posture after this probe

| Issue | Unblocked? | Note |
| --- | --- | --- |
| #880 Client Master | **YES** (under normal WIP) | Customer / Contact / Address / Company readable |
| #881 Product & Service Catalogue | **YES with caveat** | Item / Item Group / Price List readable; **Item Price** needs role grant before price-row writes |
| #882 Commercial documents | Discovery readable | Quotation / Sales Invoice / Payment Entry / Print Format readable; Payment Terms 403 |

Do **not** wait for Infisical/SSH. Direct API path is proven.

`MASTER_ADMIN_KEY` UI removal remains a parallel security correction and does not block ERPNext read discovery on the three ERPNext secrets.

## 5. Non-actions honoured

- No merge / deploy
- No Vercel / production env mutation by this agent
- No secret values logged or committed
- No ERPNext create/update/submit/cancel/delete
- No SSH/Infisical runtime bridge used
- No DB/schema / payment / client-send changes
