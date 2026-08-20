# ERPNext WP1 — Customer bridge v1

**Status:** Implementation + synthetic idempotency proof. **No schema. No cron. No real client. No payment. No send.**  
**Issue:** [#1009](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1009)  
**Parents:** [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918) / merged [PR #993](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/993), [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953), [#880](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/880), [#920](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/920), [#701](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/701)  
**Environment:** `corpflow_test` (CorpFlowAI-hosted ERPNext sandbox/test). Not `client_production`.  
**Machine contract:** `config/erpnext-customer-bridge.v1.json`  
**Bridge:** `lib/erpnext/customer-bridge.js`  
**Frappe client:** `lib/erpnext/frappe-rest-client.js`  
**Apply:** `node scripts/erpnext/apply-customer-bridge.mjs`  
**Mapping reused (do not redesign):** `lib/erpnext/client-master.js` + `docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md` row `qualified_customer_identity`

**Anchor:** `<!-- ERPNEXT_CUSTOMER_BRIDGE_V1 -->`

<!-- ERPNEXT_CUSTOMER_BRIDGE_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1009
```

## Verdict

**`WP1 CUSTOMER BRIDGE READY FOR REVIEW`**

A synthetic CorpFlowAI qualified-customer event creates or reuses exactly one ERPNext `Customer` (plus Contact and billing Address) through the standard authenticated Frappe REST API. Replaying the same event updates the same Customer. It does not create a duplicate.

Exact blocker: **NONE** for this synthetic path.

Anton action: **NONE** unless merging this PR. Real Prestige Procurement Customer, production Postgres lead PATCH, cron, send, payment, and `client_production` remain separately gated.

---

## 1. What this packet does

When a CorpFlowAI lead is commercially qualified (`proposal_ready` or `won`), this bridge:

1. Maps the lead with the approved #880 Client Master mapper.
2. Searches ERPNext before create (idempotency key, normalized name, primary email).
3. Creates the Customer if no enabled match exists.
4. Reconciles allowed mapped fields if a match exists (group, territory, currency, price list, tax id, website, `customer_details`). It does not silently rename.
5. Ensures one primary Contact and one billing Address.
6. Disables accidental `… - 1` suffix duplicates.
7. Records the ERPNext names on `qualification_json.erpnext` in the CorpFlowAI **reference** lead used by the event.

It does **not** write live Postgres. The approved pointer location already exists (`leads.qualification_json` jsonb). This packet proves the pointer shape and merge. A production `leads` PATCH is a later operator step, not a schema change.

---

## 2. Identity and idempotency

| Field | Value |
|-------|--------|
| CorpFlowAI key | `leads.id` |
| Synthetic proof key | `cf1009-synthetic-qualified-customer` |
| Idempotency key | `corpflow.customer_bridge.v1:lead=<leads.id>` |
| ERPNext objects | Customer + Contact + Address (standard DocTypes only) |
| Direction | CorpFlowAI → ERPNext |
| Conflict | ERPNext Customer wins. Same email on a different customer → stop. |
| Retry | Search is safe. API failure leaves the pointer unchanged and does not create a second Customer. |

`customer_details` stores `synthetic=true`, `issue=1009`, `ref=<leads.id>`, and `idempotency_key=…`. No secrets, passwords, or live client data.

---

## 3. Synthetic event (non-private test data)

| Field | Value |
|-------|--------|
| Lead id | `cf1009-synthetic-qualified-customer` |
| Stage | `proposal_ready` |
| Customer name | `CF1009 Synthetic Customer Bridge Ltd` |
| Contact | `Sam Synthetic` |
| Email | `cf1009.synthetic@example.invalid` |
| Website | `https://cf1009-synthetic.example.invalid` |
| Address | `1009 Synthetic Bridge Lane`, Port Louis, Mauritius |
| Currency | MUR |
| Product | website-rescue |

Forbidden names (refused even if marked synthetic): `Prestige Procurement`, `CorpFlowAI LTD`.

---

## 4. Persistence boundary

| Store | This packet |
|-------|-------------|
| ERPNext Customer / Contact / Address | **Yes** — synthetic only, search-before-create |
| `qualification_json.erpnext` merge helper | **Yes** — applied to the in-memory/reference lead |
| Live Postgres `leads` row | **Not written** |
| New column / table / DocType | **Forbidden** |
| Cron / automated queue | **Forbidden** |

Pointer shape:

```text
qualification_json.erpnext.schema = corpflow.qualification.erpnext.v1
qualification_json.erpnext.bridge = qualified_customer_identity
qualification_json.erpnext.lead_id / customer / contact / address / idempotency_key
```

---

## 5. Live proof (2026-08-20 UTC)

Ran as `integrations@corpflowai.com` via `node scripts/erpnext/apply-customer-bridge.mjs`. Secret values not printed. Postgres not written.

| Check | Result |
|-------|--------|
| Auth | HTTP 200, `integrations@corpflowai.com` |
| First run | **CREATE** `CF1009 Synthetic Customer Bridge Ltd` |
| Second run / replay | **UPDATE** same Customer (`created_on_replay=false`) |
| Duplicate count | **1** enabled matching Customer |
| Contact | `Sam Synthetic-CF1009 Synthetic Customer Bridge Ltd` |
| Address | `CF1009 Synthetic Customer Bridge Ltd-Billing` |
| GET read-back | name, Commercial, Mauritius, MUR, website, `cf1009.synthetic@example.invalid`, `1009 Synthetic Bridge Lane` |
| Pointer | `qualification_json.erpnext` on the in-memory reference lead |
| Artifact | `artifacts/erpnext/customer-bridge-1009/apply-log.json` |

`MASTER_ADMIN_KEY` was **ABSENT** on this Factory Automation wake. ERPNext secrets present by **name** only.

---

## 6. Retry / failure audit

Every run appends structured audit rows: `SEARCH`, `CREATE` / `UPDATE`, Contact/Address, optional `DISABLE_SUFFIX_DUPLICATE`. Rows include HTTP status and a redacted error token. They do not include Authorization headers, secret values, or `POSTGRES_URL`.

If search or create fails, the reference pointer is left unchanged so a later retry can still search-before-create.

---

## 7. Explicit non-actions

No WP2–WP5. No Lead/Opportunity writer. No Quotation/Invoice. No Payment Entry. No Project/Issue. No bulk migration. No env/secret mutation. No live send. No merge of this PR by the factory worker.

---

## 8. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a — ERPNext sandbox/test write; no Vercel app surface
- Commit deployed: n/a until merge
- Live URLs tested: ERPNext Frappe REST Customer GET (hosted test; URL not recorded)
- Expected vs actual result: see apply-log.json after live apply
- Client-facing flow usable: n/a — no buyer-facing CorpFlowAI route
- Final verdict: PARTIAL until Anton merges; synthetic ERPNext proof is the runtime evidence
```
