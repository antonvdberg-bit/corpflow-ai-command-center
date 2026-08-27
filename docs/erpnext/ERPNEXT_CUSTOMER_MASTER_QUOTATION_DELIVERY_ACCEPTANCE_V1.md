# ERPNext Customer / Contact master — quotation and delivery acceptance

**Status:** GET/read-only acceptance on hosted ERPNext. **No Customer/Contact/Address write. No schema. No live Postgres PATCH. No send.**  
**Issue:** [#1206](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1206)  
**Sources:** [#880](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/880) / [#1012](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1012) / [#1021](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1021), Quote-to-Cash [#1166](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1166), source-of-truth [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918)  
**Environment:** `corpflow_test` (CorpFlowAI-hosted ERPNext sandbox/test). Not `client_production`.  
**Machine contract:** `config/erpnext-customer-master-acceptance.v1.json`  
**Accept:** `node scripts/erpnext/accept-customer-master.mjs`  
**Current main at start:** `b731411734edb01b7dbb8d7e20247c5a7805983a`

**Anchor:** `<!-- ERPNEXT_CUSTOMER_MASTER_QUOTATION_DELIVERY_ACCEPTANCE_V1 -->`

<!-- ERPNEXT_CUSTOMER_MASTER_QUOTATION_DELIVERY_ACCEPTANCE_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1206
```

## Verdict

**`ERPNext CUSTOMER MASTER READY FOR QUOTATION / DELIVERY`**

One authoritative synthetic customer identity (`CF1018 Synthetic Sales Lifecycle Ltd`) already holds the legal/display name, primary Contact, and billing Address that quotation and delivery need. Search-before-create still finds exactly one enabled Customer. CorpFlowAI stores ERPNext names on `qualification_json.erpnext` and does not copy Customer/Contact/Address into a second ledger.

Exact blocker: **NONE**.

Anton action: **NONE** unless merging this PR. Real Prestige Customer, live Postgres lead PATCH, send, payment, and `client_production` remain separately gated.

---

## 1. What this packet does

1. Reuses the already-proven ERPNext Customer / Contact / Address records. GET/read-only only.
2. Checks legal/display identity, Contact/Address linkage, and stable ERPNext names needed for Quotation / Sales Invoice party fields.
3. Re-runs search-before-create against hosted ERPNext. Replay does not create a second Customer.
4. Confirms CorpFlowAI references those names rather than copying commercial identity.
5. Where a Prospect already stores `qualification_json.erpnext.customer`, Commercial Workspace now shows that recorded pointer. It does **not** invent a join from Company Master legal names.

It does **not** write ERPNext. It does **not** add a Company Master column. It does **not** PATCH live Postgres.

---

## 2. Exact identifiers (primary commercial path)

| Object | ERPNext name |
|--------|----------------|
| Customer | `CF1018 Synthetic Sales Lifecycle Ltd` |
| Contact | `Lee Synthetic` |
| Address | `CF1018 Synthetic Sales Lifecycle Ltd-Billing` |
| Quotation (already proven, GET party check) | `SAL-QTN-2026-00005` |
| CorpFlowAI lead id (pointer only) | `cf1018-synthetic-sales-lifecycle` |

Supporting GET of earlier synthetic masters (not a second commercial path):

| Source | Customer | Contact | Address |
|--------|----------|---------|---------|
| #880 Lead Rescue | `CF880 Synthetic Lead Rescue Ltd` | `Priya Synthetic-CF880 Synthetic Lead Rescue Ltd` | `CF880 Synthetic Lead Rescue Ltd-Billing` |
| #880 Website Rescue | `CF880 Synthetic Website Rescue Ltd` | `Jean Synthetic-CF880 Synthetic Website Rescue Ltd` | `CF880 Synthetic Website Rescue Ltd-Billing` |
| #1009 WP1 bridge | `CF1009 Synthetic Customer Bridge Ltd` | `Sam Synthetic-CF1009 Synthetic Customer Bridge Ltd` | `CF1009 Synthetic Customer Bridge Ltd-Billing` |

---

## 3. Search-before-create / idempotency

| Check | Result |
|-------|--------|
| WP1 replay (merged #1012) | First **CREATE**, second **UPDATE**; `created_on_replay=false`; duplicate count **1** |
| WP2 replay (merged #1021) | Customer action **UPDATE** on replay; duplicate customer count **1** |
| This packet live GET | Search by recorded name / email / lifecycle key; enabled matching Customer count **1**; no write |

ERPNext still does not unique-constrain `customer_name`. Search-before-create remains mandatory. This packet does not create.

---

## 4. CorpFlowAI references, not a second ledger

| Store | What it holds |
|-------|----------------|
| ERPNext Customer / Contact / Address | Authoritative legal name, billing contact, billing address |
| `leads.qualification_json.erpnext` | Pointer: Customer / Contact / Address **names** only |
| Company Master | Evidence/assets. **No** `erpnext_customer` column. Do not join from legal names. |
| Delivery handoff | `erpnext_customer: <Customer name>` only (`do_not_copy_commercial_fields_into_delivery=true`) |

Recorded Prospect pointers already on the Operating Workspace fixtures (explicit ids, not name joins):

- `syn-772-lr-ada` → `CF880 Synthetic Lead Rescue Ltd`
- `syn-716-wr-cleared` → `CF880 Synthetic Website Rescue Ltd`

`syn-772-rd-bea` has **no** recorded pointer and stays empty.

The one code defect this packet fixes: Commercial Workspace already read the recorded Quotation name from `qualification_json.erpnext`, but not the recorded Customer name. It now projects that pointer onto `/app/commercial` without copying address/email/legal identity.

---

## 5. Live proof (2026-08-27 UTC)

Ran as `integrations@corpflowai.com` via `node scripts/erpnext/accept-customer-master.mjs` at `2026-08-27T20:07:34Z`. Secret values not printed. Postgres not written. ERPNext not mutated.

| Check | Result |
|-------|--------|
| Auth | HTTP 200, `integrations@corpflowai.com` |
| Customer | `CF1018 Synthetic Sales Lifecycle Ltd` — Company, Commercial, Mauritius, MUR, Standard Selling, enabled |
| Contact | `Lee Synthetic` — `cf1018.synthetic@example.invalid`, linked as primary |
| Address | `CF1018 Synthetic Sales Lifecycle Ltd-Billing` — `1018 Synthetic Lifecycle Lane`, Port Louis, Mauritius |
| Quotation party | `SAL-QTN-2026-00005` party_name / contact_person / customer_address match the same names |
| Search-before-create | enabled matching Customer count **1**; `created_on_replay=false` (no write this packet) |
| Quotation suitability | **ok**; missing none |
| Supporting GET | CF880 Lead Rescue, CF880 Website Rescue, CF1009 bridge — Customer/Contact/Address HTTP **200** |
| Pointer | `qualification_json.erpnext` names only; Company Master has no ERPNext column |
| Artifact | `artifacts/erpnext/customer-master-acceptance-1206/accept-log.json` |

`MASTER_ADMIN_KEY` was **ABSENT**. ERPNext secrets present by **name** only.

---

## 6. Explicit non-actions

No ERPNext write. No Customer/Contact/Address create/update. No accounting/tax mutation. No DB/schema/data mutation. No env/secrets change. No external send. No payment. No DNS/public launch. No paid tool. No new CRM/customer model. No Company Master name-join.

---

## 7. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a — ERPNext sandbox/test GET; no Vercel customer surface
- Commit deployed: n/a until merge
- Live URLs tested: hosted ERPNext Frappe REST GET (hostname not recorded)
- Expected vs actual result: see accept-log.json
- Client-facing flow usable: n/a — synthetic identity; no buyer-facing route
- Final verdict: PARTIAL until Anton merges; live GET is the runtime evidence
```
