# ERPNext Product & Service Catalogue v1 — invoicing master

**Status:** Price master live. Standard Selling USD and four canonical Item Price rows read back on hosted ERPNext (generation 4, 2026-08-13).
**Issue:** [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881)
**Parents:** [#710](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/710), [#711](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/711), [#714](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/714)
**Prerequisite:** [#879](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/879) / direct API path from [#899](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/899)
**Environment:** hosted ERPNext test (`CorpFlowAI LTD`, MUR company currency). Not the loopback Docker sandbox.
**Owner:** Anton (merge); Cursor (catalogue + apply script).
**Anchor:** `<!-- ERPNEXT_PRODUCT_CATALOGUE_V1 -->`

<!-- ERPNEXT_PRODUCT_CATALOGUE_V1 -->

```text
Verdict: ERPNext Product Catalogue READY
```

Canonical Context Preflight: PASS
Operating model version: `2026-08-13-v1`
Environment: `corpflow_test`
GitHub state refreshed: YES
Source item: #881

This packet does **not** authorise deploy, payments, client sends, schema/custom fields, or live customer data changes. Merge of PR #915 is the remaining operator action.

---

## Required return

```text
ERPNext Product Catalogue READY

Current state: hosted ERPNext as integrations@corpflowai.com; 5 service Items live; Standard Selling USD selling list live; four canonical Item Price rows live
Catalogue model: config/erpnext-product-catalogue.v1.json
Standard-config applied: UOM Month; Item Groups; 5 non-stock Items; Selling Settings editable_price_list_rate=1; MUR Item.standard_rate 35000 / 45000; Price List Standard Selling USD; Item Price rows for USD 150 / USD 99 / MUR 35000 / MUR 45000
Synthetic proof: SAL-QTN-2026-00001 (USD 249 draft) + SAL-QTN-2026-00002 (MUR 45,000 draft) + npm test
Exact blocker: NONE
Verdict: READY
Anton required now: MERGE PR #915
```

---

## 1. Current state (applied 2026-08-13, generation 4)

Access path: direct Cursor Cloud secrets → Frappe token auth (no SSH / Infisical). Identity: `integrations@corpflowai.com`. After Anton applied the already-authorized Role Permissions Manager grant, `bash scripts/erpnext/apply-product-catalogue-prices.sh` created `Standard Selling USD` and the four canonical Item Price rows. Independent GET read-back confirmed them.

| Object | Generation 4 live result |
| ------ | ------------------------ |
| Auth | HTTP 200 as `integrations@corpflowai.com` |
| Item | 5 non-stock sales services still present |
| Price List `Standard Selling USD` | GET HTTP 200 — currency **USD**, selling=1, enabled=1, buying=0 |
| Price List `Standard Selling` | Unchanged MUR selling list |
| Item Price | GET HTTP 200 — four canonical rows only |
| `LR-SETUP-USD-150` | Standard Selling USD / USD 150 / Nos |
| `LR-REC-USD-99` | Standard Selling USD / USD 99 / Month |
| `CF-RD-LEAD-RESCUE` | Standard Selling / MUR 35,000 / Nos |
| `CF-RD-LANDING-RESCUE` | Standard Selling / MUR 45,000 / Nos |
| `CF-WR-REC-MUR-MAINT` | No Item Price row |
| T2/T3 / reserved | No Item Price rows |
| Quotations | `SAL-QTN-2026-00001` / `00002` still Draft (`docstatus=0`) |
| Custom fields / DocTypes | **None** |

Generation 3 (HTTP 403) is retained below as history.

### 1.0 Prior generation 3 snapshot (superseded — grant was not yet visible)

Generation 3 confirmed Item Price GET/POST HTTP 403 and Price List create HTTP 403 before the Desk grant took effect. No workaround was added.

### 1.0b Prior generation 2 snapshot (superseded by generation 4)

Access path: direct Cursor Cloud secrets → Frappe token auth (no SSH / Infisical). Identity: `integrations@corpflowai.com`. Anton recorded approval on #881 for Item Price and Price List Read/Create/Write. This identity **cannot apply that grant itself**.

| Object | After generation 1 | After this continuation |
| ------ | ------------------- | ----------------------- |
| Company | `CorpFlowAI LTD`, default currency **MUR** | Unchanged |
| Item | 5 non-stock sales services | Unchanged identity; MUR `standard_rate` set on the two sprint SKUs |
| Item Group | `CorpFlowAI Services` tree | Unchanged |
| UOM `Month` | Created | Unchanged |
| Price List | `Standard Selling` MUR, `Standard Buying` MUR | **USD selling list still not created** (POST 403) |
| Item Price | 403 | Still 403 read and write |
| Selling Settings | `editable_price_list_rate=1` | Unchanged |
| Quotation | 2 draft synthetic proofs | Unchanged (`SAL-QTN-2026-00001` / `00002`, `docstatus=0`) |
| Role / Custom DocPerm / permission_manager | Not attempted in gen 1 | GET/POST **403** — UI-only |
| Custom fields / DocTypes | None | **None** |

### 1.1 Live Item masters

| Item code | Item name | Group | UOM | `standard_rate` | Item Price |
| --------- | --------- | ----- | --- | --------------- | ---------- |
| `LR-SETUP-USD-150` | AI Lead Rescue Setup (USD 150 launch pilot) | CF Lead Rescue | Nos | **0** (must not write USD onto MUR company field) | **live** Standard Selling USD / USD 150 |
| `LR-REC-USD-99` | AI Lead Rescue monthly monitoring | CF Lead Rescue | Month | **0** | **live** Standard Selling USD / USD 99 / Month |
| `CF-RD-LEAD-RESCUE` | AI Lead Rescue Sprint | CF Lead Rescue | Nos | **35,000 MUR** applied | **live** Standard Selling / MUR 35,000 |
| `CF-RD-LANDING-RESCUE` | Premium Landing Page Rescue | CF Website Rescue | Nos | **45,000 MUR** applied | **live** Standard Selling / MUR 45,000 |
| `CF-WR-REC-MUR-MAINT` | Website Rescue monthly maintenance | CF Support | Month | **0** (no approved monthly amount) | not written |

`Item.standard_rate` is company currency (MUR). It is a valid standard-config fallback for the two MUR sprint SKUs. It is **not** a substitute for USD Item Price rows.

### 1.2 Why Item Price was 403 before the Desk grant

Standard ERPNext v16 DocType permissions (read via `getdoctype`, no customisation):

| DocType | Roles with Create/Write |
| ------- | ----------------------- |
| **Item Price** | `Sales Master Manager`, `Purchase Master Manager` only |
| **Price List** Create/Write | `Sales Master Manager`, `Purchase Master Manager` (`Sales User` has Read only) |

`integrations@corpflowai.com` effective roles (Role Profile **Accounts**):

`Purchase User`, `Sales User`, `Item Manager`, `Stock Manager`, `Stock User`, `Accounts Manager`, `Sales Manager`, `Accounts User`, `Purchase Manager`

That set does **not** include `Sales Master Manager`. Attempts from this session:

| Action | HTTP |
| ------ | ---- |
| GET/POST Item Price | 403 |
| POST Price List `Standard Selling USD` | 403 |
| `permission_manager.add` | 403 |
| POST Custom DocPerm | 403 |
| GET Role | 403 |
| PUT User to add `Sales Master Manager` while Role Profile = Accounts | 200 but **did not stick** (profile overwrites extra roles) |

Role Profile was restored to **Accounts**. No shared profile was widened.

---

## 2. Catalogue model

Source of truth in-repo: `config/erpnext-product-catalogue.v1.json`
Builder: `lib/erpnext/product-catalogue.js`
Apply-after-grant: `scripts/erpnext/apply-product-catalogue-prices.sh`

### 2.1 Standard objects only

| Need | Standard ERPNext object | Customisation? |
| ---- | ---------------------- | -------------- |
| Product identity | **Item** (`is_stock_item=0`, `is_sales_item=1`) | No |
| Family | **Item Group** under `CorpFlowAI Services` | No |
| Selling unit | **UOM** `Nos` (setup) / `Month` (recurring) | No |
| List price | **Item Price** on **Price List** | No — live as of generation 4 |
| MUR company-currency fallback | Item `standard_rate` | No — applied for the two sprint SKUs |
| Document wording | Item `item_name` + `description` | No |
| Company income default | Item Default → `Sales - CFAI` | No (already configured) |
| Tax | None on items | VAT remains HELD |

**Smallest customisation proposal:** none. Standard Item / Price List was sufficient. The Role Permissions Manager grant is applied; canonical Item Price rows are live.

### 2.2 Naming

Keep already-documented codes. Do not invent parallel masters.

| Code | Product | Role | Currency |
| ---- | ------- | ---- | -------- |
| `LR-SETUP-USD-150` | Lead Rescue launch pilot | Setup | USD |
| `LR-REC-USD-99` | Lead Rescue monthly monitoring | Recurring | USD |
| `CF-RD-LEAD-RESCUE` | Lead Rescue MUR sprint | Setup | MUR |
| `CF-RD-LANDING-RESCUE` | Website Rescue T1 | Setup | MUR |
| `CF-WR-REC-MUR-MAINT` | Website Rescue maintenance | Recurring | MUR (operator quote) |

Future services: `CF-{FAMILY}-{ROLE}-{CURRENCY}-{QUALIFIER}` into Item Group **CF Future Services**. Template steps are in the JSON `future_service_template` block.

### 2.3 What is *not* a duplicate

| Pair | Why they are not duplicates |
| ---- | --------------------------- |
| `LR-SETUP-USD-150` vs `CF-RD-LEAD-RESCUE` | Different products: USD 150 public launch pilot vs MUR 35,000 sprint |
| `LR-SETUP-USD-150` vs `LR-REC-USD-99` | Setup vs monthly; different UOM (`Nos` / `Month`) |
| `CF-RD-LANDING-RESCUE` vs `CF-WR-REC-MUR-MAINT` | T1 project vs optional monthly maintenance |
| T1 vs reserved T2/T3 | T2/T3 are **not inserted**. They are reserved operator-quote codes until Anton W1 |

**Do not** create `LR-SETUP-MUR-7000`. The ~MUR 7,000 figure is invoice-time conversion of the USD 150 pilot (`docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`), not a second SKU.

**Do not** use ERPNext Item Variants for setup vs recurring, or for USD vs MUR. Variants would collide UOM and commercial wording. Currency belongs on **Price List**; cadence belongs on a **separate Item**.

### 2.4 Client-facing vs internal

| On quotation / invoice | Internal only (never on the document) |
| ---------------------- | ------------------------------------- |
| `item_name` | `internal_delivery_ref` |
| `description` (commercial scope, deposit, no-guarantee line) | Telegram, Google Sheet, n8n, `/admin/` cockpit, delivery checklists |

Forbidden tokens in commercial descriptions are enforced by `assertCatalogueInvariants()` in `lib/erpnext/product-catalogue.js`.

### 2.5 Recurring / add-ons

Approved recurring concepts inserted:

- Lead Rescue monthly monitoring — **USD 99 / Month** on `Standard Selling USD` (Item Price live).
- Website Rescue monthly maintenance — **no list price** (maintenance template is amount-blank until quoted).

Reserved, **not** inserted: Website Rescue T2/T3, extra page, extra preview round, reputation-recovery sprint. Those wait Anton W1 / a later packet so we do not invent list prices.

---

## 3. Standard-config changes applied

All of the following used **stock** DocTypes. No custom fields. No production Vercel/env/DB changes.

1. **UOM** `Month` created and enabled (generation 1).
2. **Item Groups:** `CorpFlowAI Services` (group) → `CF Lead Rescue`, `CF Website Rescue`, `CF Support`, `CF Future Services`.
3. **Items** in the table in §1.1, non-stock, sales, income default `Sales - CFAI`.
4. **Selling Settings:** `editable_price_list_rate = 1`.
5. **Draft quotations** `SAL-QTN-2026-00001` and `SAL-QTN-2026-00002` against an existing synthetic customer. Remarks: do not send, do not submit.
6. **MUR `standard_rate`:** `CF-RD-LEAD-RESCUE` = 35,000; `CF-RD-LANDING-RESCUE` = 45,000. USD SKUs left at 0.
7. **Price List `Standard Selling USD`:** created (USD, selling=1) — generation 4.
8. **Item Price rows:** four canonical rates read back — generation 4.

### 3.1 Not applied (out of scope / owned elsewhere)

| Change | Why |
| ------ | --- |
| USD amounts on Item `standard_rate` | Would mean MUR 150 / MUR 99 — wrong |
| Tax templates on items | VAT HELD; do not activate |
| Quotation naming `CFLR-QUO-*` | Owned by #882 |
| Currency Exchange USD→MUR | Empty; owned by #882. The USD draft used a placeholder conversion_rate — **do not submit** |

### 3.2 Role Permissions Manager grant (completed)

Anton applied the already-authorized Administrator click. Generation 4 then ran `bash scripts/erpnext/apply-product-catalogue-prices.sh`. Do **not** re-click. Do **not** submit or email draft quotations `SAL-QTN-2026-00001` / `00002`. `CF-WR-REC-MUR-MAINT` remains without a list price.

---

## 4. Synthetic proof

### 4.1 Deterministic (repo — run on every `npm test`)

```bash
node --test node-tests/erpnext-product-catalogue.test.mjs
```

Proofs:

- Unique item codes; non-stock sales flags; setup=`Nos`; recurring=`Month`.
- USD 150 pilot is not cloned as a MUR item.
- Quotation lines carry `item_name` + commercial `description` only.
- Lead Rescue synthetic quote: `LR-SETUP-USD-150` @ 150 + `LR-REC-USD-99` @ 99 = **USD 249**.
- Website Rescue synthetic quote: `CF-RD-LANDING-RESCUE` @ **MUR 45,000**.
- T2/T3 reserved and not inserted.
- Canonical Item Price plan is exactly four approved rates; maintenance / T2 / T3 excluded.
- `apply-product-catalogue-prices.sh --dry-run` prints those four rows and forbids `MASTER_ADMIN_KEY`.

### 4.2 Live ERPNext (generation 4, 2026-08-13)

Draft quotations still present and still draft:

| Quotation | Currency | Lines | Grand total | Status |
| --------- | -------- | ----- | ----------- | ------ |
| `SAL-QTN-2026-00001` | USD | `LR-SETUP-USD-150` + `LR-REC-USD-99` | 249.00 | Draft — do not submit |
| `SAL-QTN-2026-00002` | MUR | `CF-RD-LANDING-RESCUE` | 45,000.00 | Draft — do not submit |

Price List `Standard Selling USD`: currency USD, selling=1, enabled=1.

Canonical Item Price read-back:

| Item | Price list | Rate | UOM |
| ---- | ---------- | ---- | --- |
| `LR-SETUP-USD-150` | Standard Selling USD | USD 150 | Nos |
| `LR-REC-USD-99` | Standard Selling USD | USD 99 | Month |
| `CF-RD-LEAD-RESCUE` | Standard Selling | MUR 35,000 | Nos |
| `CF-RD-LANDING-RESCUE` | Standard Selling | MUR 45,000 | Nos |

`CF-WR-REC-MUR-MAINT` has no Item Price row. T2/T3 were not inserted. Apply script exited 0 with `ERPNext Product Catalogue READY`.

---

## 5. Exact blockers

**#881 catalogue blocker:** **NONE.**

Related, **not** this issue’s blocker (do not reopen #881 for these):

- Currency Exchange empty / USD conversion_rate on drafts — **#882**. Do not submit the two synthetic quotations.
- Quotation naming still `SAL-QTN-*` not `CFLR-QUO-*` — **#882**.
- `MASTER_ADMIN_KEY` still injected into ordinary Cursor Cloud runs — **#899** (parallel security correction).
- Website Rescue T2/T3 list prices — Anton **W1**.
- VAT / tax template — standing HELD.

---

## 6. Verdict

```text
ERPNext Product Catalogue READY
```

Lead Rescue and Website Rescue exist as clean service Item masters and can be referenced on quotations. Canonical selling rates now live on Item Price / Price List. Synthetic proof pulled the expected commercial wording. Standard configuration was sufficient; no custom DocType was created.

Anton required now: **MERGE PR #915**. No further ERPNext permission click. No secrets, no schema, no payment, no send.

---

## 7. Cross-references

- `config/erpnext-product-catalogue.v1.json`
- `lib/erpnext/product-catalogue.js`
- `scripts/erpnext/apply-product-catalogue-prices.sh`
- `docs/erpnext/ERPNEXT_RECORD_MAPPING.md`
- `docs/erpnext/ERPNEXT_CUSTOMER_AND_QUOTATION_GUIDE.md`
- `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`
- `docs/sales/WEBSITE_RESCUE_PRICING_GUIDE.md`
- `docs/erpnext/ERPNEXT_CURSOR_CLOUD_SECURITY_CORRECTION_899.md`
