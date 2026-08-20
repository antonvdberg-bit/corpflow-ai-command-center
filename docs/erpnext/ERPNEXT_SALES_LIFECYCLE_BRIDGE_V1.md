# ERPNext WP2 — Lead → Opportunity → Customer lifecycle bridge v1

**Status:** Implementation + synthetic idempotency proof. **No schema. No cron. No real client. No quotation. No payment. No send.**  
**Issue:** [#1018](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1018)  
**Parents:** [#1009](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1009) / merged [PR #1012](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1012), [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918), [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953), [#920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/920), [#701](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/701)  
**Environment:** `corpflow_test` (CorpFlowAI-hosted ERPNext sandbox/test). Not `client_production`.  
**Machine contract:** `config/erpnext-sales-lifecycle-bridge.v1.json`  
**Bridge:** `lib/erpnext/sales-lifecycle-bridge.js`  
**Customer reuse:** `lib/erpnext/customer-bridge.js` (WP1)  
**Frappe client:** `lib/erpnext/frappe-rest-client.js`  
**Apply:** `node scripts/erpnext/apply-sales-lifecycle-bridge.mjs`  
**Mapping reused (do not redesign):** `docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md` row `lead_opportunity_promotion`

**Anchor:** `<!-- ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1 -->`

<!-- ERPNEXT_SALES_LIFECYCLE_BRIDGE_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1018
```

## Verdict

**`WP2 SALES LIFECYCLE BRIDGE READY FOR REVIEW`**

A synthetic CorpFlowAI prospect follows one deterministic lifecycle into standard ERPNext `Lead` → `Opportunity` → existing/reused `Customer`. Replaying the same event updates the same records. It does not create duplicates.

Exact blocker: **NONE** for this synthetic path.

Anton action: **NONE** unless merging this PR. Real client/prospect migration, production Postgres lead PATCH, cron, quotation (WP3), send, payment, and `client_production` remain separately gated.

---

## 1. What this packet does

When a CorpFlowAI synthetic prospect is reconciled:

1. Search ERPNext Lead by idempotency key, then email, then company name.
2. Create or update exactly one Lead.
3. Create or update an Opportunity only when the CorpFlowAI stage is `qualified`, `proposal_ready`, or `won`.
4. Call the merged WP1 Customer bridge only when the stage is `proposal_ready` or `won`. If that Customer already exists, WP1 updates it.
5. Link the Customer back to the Lead (`Customer.lead_name`) and record the Customer name on Opportunity notes.
6. Record ERPNext names on `qualification_json.erpnext` in the CorpFlowAI **reference** lead used by the event.

It does **not** write live Postgres. It does **not** create a Quotation (WP3). It does **not** build a second integration framework.

---

## 2. Lifecycle transition rules

| CorpFlowAI stage | Class | ERPNext Lead | Opportunity | Customer (WP1) |
|------------------|-------|--------------|-------------|----------------|
| `new`, `contacted`, `working`, `not_qualified`, `intake` | not_qualified | Open, create/update | none | none |
| `qualified` | qualified | Open, create/update | Open, create/update | none |
| `proposal_ready` | proposal_ready | Open, create/update | Open, create/update | create/update |
| `won` | won | Converted | Converted | create/update |
| `lost`, `closed_lost`, `disqualified` | lost | Do Not Contact | update to Lost only if it already exists | none |
| anything else | unknown | refuse | refuse | refuse |

Opportunity is created only after a real sales process has started (`qualified` / `proposal_ready` / `won`). Customer still follows the WP1 commercially qualified stages (`proposal_ready` / `won`).

---

## 3. Identity and idempotency

| Field | Value |
|-------|--------|
| CorpFlowAI key | `leads.id` |
| Synthetic proof key | `cf1018-synthetic-sales-lifecycle` |
| Idempotency key | `corpflow.sales_lifecycle.v1:lead=<leads.id>` |
| ERPNext objects | Lead + Opportunity + WP1 Customer/Contact/Address |
| Direction | CorpFlowAI → ERPNext |
| Conflict | Matching email or company with a **different** CorpFlowAI reference → stop. Pre-existing ERPNext Lead with the same email and no CorpFlowAI key → stop. ERPNext remains the durable sales record. |
| Retry | Search is safe. API failure leaves the pointer unchanged and does not create a second Lead/Opportunity/Customer. |

Lead/Opportunity `utm_content` stores the idempotency key. The integration user cannot filter or reliably write `notes`, and UTM source/campaign are Link fields that this packet does not create. No secrets, passwords, or live client data.

---

## 4. Synthetic event (non-private test data)

| Field | Value |
|-------|--------|
| Lead id | `cf1018-synthetic-sales-lifecycle` |
| Stage | `proposal_ready` |
| Company | `CF1018 Synthetic Sales Lifecycle Ltd` |
| Contact | `Lee Synthetic` |
| Email | `cf1018.synthetic@example.invalid` |
| Website | `https://cf1018-synthetic.example.invalid` |
| Address | `1018 Synthetic Lifecycle Lane`, Port Louis, Mauritius |
| Currency | MUR |
| Product | website-rescue |

Forbidden names (refused even if marked synthetic): `Prestige Procurement`, `CorpFlowAI LTD`.

This identity is **not** the WP1 CF1009 Customer. If a matching CF1018 Customer already exists, WP1 reuses it.

---

## 5. Persistence boundary

| Store | This packet |
|-------|-------------|
| ERPNext Lead / Opportunity | **Yes** — synthetic only, search-before-create |
| ERPNext Customer / Contact / Address | **Yes** — via WP1, synthetic only |
| `qualification_json.erpnext` merge helper | **Yes** — applied to the in-memory/reference lead |
| Live Postgres `leads` row | **Not written** |
| New column / table / DocType | **Forbidden** |
| Cron / automated queue | **Forbidden** |

Pointer shape (extends the WP1 contract, same schema):

```text
qualification_json.erpnext.schema = corpflow.qualification.erpnext.v1
qualification_json.erpnext.bridge = lead_opportunity_promotion
qualification_json.erpnext.customer_bridge = qualified_customer_identity (when Customer exists)
qualification_json.erpnext.lead_id / erpnext_lead / erpnext_opportunity / customer / contact / address / idempotency_key
```

---

## 6. Live proof (2026-08-20 UTC)

Ran as `integrations@corpflowai.com` via `node scripts/erpnext/apply-sales-lifecycle-bridge.mjs` at `2026-08-20T02:04:56Z`. Secret values not printed. Postgres not written.

| Check | Result |
|-------|--------|
| Auth | HTTP 200, `integrations@corpflowai.com` |
| First run | **CREATE** Lead `CRM-LEAD-2026-00009`, Opportunity `CRM-OPP-2026-00003`, Customer `CF1018 Synthetic Sales Lifecycle Ltd` |
| Second run / replay | **UPDATE** same three records (`created_on_replay=false`) |
| Duplicate counts | **1** Lead, **1** Opportunity, **1** enabled Customer |
| Contact / Address | `Lee Synthetic` / `CF1018 Synthetic Sales Lifecycle Ltd-Billing` |
| GET read-back | company, `cf1018.synthetic@example.invalid`, Customer group Commercial, Opportunity party = Lead name |
| Pointer | `qualification_json.erpnext` on the in-memory reference lead |
| Artifact | `artifacts/erpnext/sales-lifecycle-bridge-1018/apply-log.json` |

Creating the Opportunity from the Lead caused ERPNext to set Lead status to `Opportunity`; linking `Customer.lead_name` then set it to `Converted` on replay. That is standard CRM conversion, not a second Lead.

`MASTER_ADMIN_KEY` was **ABSENT** on this Factory Automation wake. ERPNext secrets present by **name** only.

---

## 7. Retry / failure audit

Every run appends structured audit rows: `SEARCH_LEAD`, `CREATE_LEAD` / `UPDATE_LEAD`, `SEARCH_OPPORTUNITY`, `CREATE_OPPORTUNITY` / `UPDATE_OPPORTUNITY`, optional WP1 Customer rows, optional link rows. Rows include HTTP status and a redacted error token. They do not include Authorization headers, secret values, or `POSTGRES_URL`.

If search or create fails, the reference pointer is left unchanged so a later retry can still search-before-create.

---

## 8. Explicit non-actions

No WP3 quotation. No Project/Task bridge. No Issue/helpdesk bridge. No bulk migration. No env/secret mutation. No live send. No merge of this PR by the factory worker.

---

## 9. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a — ERPNext sandbox/test write; no Vercel app surface
- Commit deployed: n/a until merge
- Live URLs tested: ERPNext Frappe REST Lead / Opportunity / Customer GET (hosted test; URL not recorded)
- Expected vs actual result: see apply-log.json after live apply
- Client-facing flow usable: n/a — no buyer-facing CorpFlowAI route
- Final verdict: PARTIAL until Anton merges; synthetic ERPNext proof is the runtime evidence
```
