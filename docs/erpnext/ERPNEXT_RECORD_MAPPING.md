# ERPNext record mapping — CF-… ↔ commercial documents

**Status:** Operator reference · **Updated:** 2026-07-14  
**Owner:** Anton  
**Anchor:** `<!-- ERPNEXT_RECORD_MAPPING_V1 -->`

<!-- ERPNEXT_RECORD_MAPPING_V1 -->

**#882 synthetic proof (hosted test, do not send):** Lead Rescue USD quotation `SAL-QTN-2026-00001` + USD draft invoice `ACC-SINV-2026-00002` (conversion_rate 47.15); Website Rescue MUR quotation `SAL-QTN-2026-00003` + MUR draft invoice `ACC-SINV-2026-00001`. Write-up: `docs/erpnext/ERPNEXT_COMMERCIAL_DOCUMENTS_V1.md`.

**Single source of truth rule:**

- **ERPNext** = commercial system of record (Customer, Contact, Address, Quotation, SI, PE, Project, recon)
- **Postgres** = app/lead system of record (intake, CF-…, operator status) — **pointer only** for billing identity
- **No second SoR** — cross-reference, do not duplicate authoritative state

**Client Master (#880):** onboarding commercial identity (legal/trading name, billing contact, billing address, currency/group/territory) is created on standard ERPNext Customer + Contact + Address **before** quotation. Canonical mapping: `docs/erpnext/ERPNEXT_CLIENT_MASTER_V1.md`. Delivery intake stays in #715 / #716 records.

**#920 Prestige foundation (hosted test, synthetic, do not send):** Lead `CRM-LEAD-2026-00002` → Opportunity `CRM-OPP-2026-00001` → Customer `CF920 Synthetic Website Project Ltd` → draft MUR quotation `SAL-QTN-2026-00004` on Item `CF-WS-CUSTOM-PROJECT`. Project/Task/Issue still HTTP 403. Write-up: `docs/erpnext/ERPNEXT_PRESTIGE_FOUNDATION_V1.md`. Bridge: `docs/erpnext/ERPNEXT_CORPFLOW_BRIDGE_CONTRACT_V1.md`.

**NO IMPLEMENTATION AUTHORIZED** for automated sync.

---

## 1. ID formats

| ID | Format | Example | Source |
| -- | ------ | ------- | ------ |
| CF-… reference | `CF-{6-char tail of lead_id}` | `CF-A1B2C3` | `rapidDeliveryReferenceFromLeadId()` |
| Postgres lead_id | UUID | `550e8400-e29b-41d4-a716-446655440000` | `leads.id` |
| ERPNext Customer | `CUST-.YYYY.-` or auto | `CUST-2026-00001` | ERPNext naming |
| ERPNext Quotation | `CFLR-QUO-.YYYY.-.NNN` (target) | `CFLR-QUO-2026-001` | ERPNext naming |
| Deposit Sales Invoice | `CFLR-INV-.YYYY.-.NNN` | `CFLR-INV-2026-001` | ERPNext naming |
| Deposit Payment Entry | `ACC-PAY-` series | `ACC-PAY-2026-00005` | ERPNext stock/sandbox |
| Balance Sales Invoice | Same INV series | `CFLR-INV-2026-002` | ERPNext |
| Final Payment Entry | PAY series | `ACC-PAY-2026-00006` | ERPNext |
| Project | `PROJ-.YYYY.-` | `PROJ-2026-00001` | ERPNext |
| Bank recon | Statement period + account | `SBM-MUR-2026-07` | Operator label |

---

## 2. Mapping chain (happy path)

```text
CF-A1B2C3
  ↔ postgres.leads.id = 550e8400-…
  ↔ erpnext.Customer "Acme Ltd" (notes: CF-A1B2C3)
  ↔ erpnext.Quotation CFLR-QUO-2026-001
  ↔ [optional Sales Order — skip for sprints]
  ↔ erpnext.Sales Invoice CFLR-INV-2026-001 (deposit 50%)
  ↔ erpnext.Payment Entry ACC-PAY-2026-00005 (deposit)
  ↔ bank_recon.SBM-MUR-2026-07 (deposit line matched)
  ↔ erpnext.Project PROJ-2026-00001
  ↔ erpnext.Sales Invoice CFLR-INV-2026-002 (balance 50%)
  ↔ erpnext.Payment Entry ACC-PAY-2026-00006 (final)
  ↔ bank_recon.SBM-MUR-2026-07 (balance line matched)
  ↔ closeout COMPLETE
```

---

## 3. Mapping table (operator-maintained)

Copy per engagement:

| Field | Value |
| ----- | ----- |
| CF-… | |
| Postgres lead_id | |
| offer_slug | |
| ERPNext Customer | |
| Quotation | |
| Sales Order (if any) | |
| Deposit SI | |
| Deposit PE | |
| Deposit recon date | |
| Delivery cleared date | |
| Project | |
| Balance SI | |
| Final PE | |
| Balance recon date | |
| Closeout date | |

---

## 4. CorpFlow app fields (Postgres — not authoritative for GL)

Stored in `leads.qualificationJson.rapid_delivery_operator`:

| Field | Maps to |
| ----- | ------- |
| `status` | Operator pipeline only — not payment clearance |
| `offer_slug` | Catalogue slug |
| `notes` | Free text — paste ERPNext IDs here |

**Warning:** Setting status `won` does **not** satisfy delivery clearance. ERPNext PE + bank recon required.

---

## 5. USD 150 wedge (parallel mapping — separate row)

| Field | USD wedge | MUR sprint |
| ----- | --------- | ---------- |
| Intake path | `/lead-rescue` | `/offers/*` |
| Operator desk | `/admin/lead-rescue` | `/admin/rapid-delivery` |
| Reference | Lead row ID | CF-… |
| ERPNext Item | `LR-SETUP-USD-150` | `CF-RD-*` |
| Currency | USD | MUR |

Canonical item masters (codes, names, descriptions, UOM, setup vs recurring, Price List / Item Price): `docs/erpnext/ERPNEXT_PRODUCT_CATALOGUE_V1.md` / `config/erpnext-product-catalogue.v1.json` (#881). Do not create a MUR clone of `LR-SETUP-USD-150`. Generation 4 (2026-08-13): `Standard Selling USD` and four canonical Item Price rows are live; `CF-WR-REC-MUR-MAINT` has no list price.

**Do not merge rows** without explicit scope change.

---

## 6. Automation assessment

| Step | Class |
| ---- | ----- |
| CF-… generation on intake | LIVE (app) |
| Manual mapping sheet | MANUAL CONTROL |
| ERPNext ID copy to Postgres notes | MANUAL CONTROL |
| Bi-directional sync API | OUT OF SCOPE (missing) |
| Auto-create Customer from intake | AUTOMATION CANDIDATE (future packet) |

---

## 7. Cross-references

- `lib/cmp/_lib/rapid-delivery-operator.js` — CF-… function
- `docs/revenue/CORPFLOWAI_GTM_SELLABLE_PATH.md`
- `docs/erpnext/CORPFLOWAI_QUOTE_TO_CASH_RUNBOOK.md`
- `docs/erpnext/ERPNEXT_CLIENT_MASTER_V1.md` — #880 commercial onboarding master
