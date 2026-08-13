# ERPNext Product & Service Catalogue v1 — invoicing master

**Status:** Item masters live on hosted ERPNext; Item Price rows pending role grant.  
**Issue:** [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881)  
**Parents:** [#710](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/710), [#711](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/711), [#714](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/714)  
**Prerequisite:** [#879](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/879) / direct API path from [#899](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/899)  
**Environment:** hosted ERPNext test (`CorpFlowAI LTD`, MUR company currency). Not the loopback Docker sandbox.  
**Owner:** Anton (price-list role grant); Cursor (catalogue model + standard Item masters).  
**Anchor:** `<!-- ERPNEXT_PRODUCT_CATALOGUE_V1 -->`

<!-- ERPNEXT_PRODUCT_CATALOGUE_V1 -->

```text
Verdict: NOT READY — Item Price (and Price List write) role grant required before selling rates are authoritative
```

Canonical Context Preflight: PASS  
Operating model version: `2026-08-12-v1`  
Environment: `corpflow_test`  
GitHub state refreshed: YES  
Source item: #881

This packet does **not** authorise merge, deploy, payments, client sends, schema/custom fields, or live customer data changes.

---

## Required return

```text
ERPNext Product Catalogue READY | NOT READY — <one blocker>

Current state: hosted ERPNext v16 (frappe=16.25.0, erpnext=16.26.2) as integrations@corpflowai.com
Catalogue model: config/erpnext-product-catalogue.v1.json
Standard-config applied: UOM Month; Item Groups; 5 non-stock Items; Selling Settings editable_price_list_rate=1
Synthetic proof: SAL-QTN-2026-00001 (USD draft) + SAL-QTN-2026-00002 (MUR draft) + npm test
Exact blocker: Item Price + Price List write denied (HTTP 403) for integrations@corpflowai.com
Verdict: NOT READY — Item Price (and Price List write) role grant required before selling rates are authoritative
Anton required now: YES — one Role Permission grant (Item Price + Price List write) for the Integration user. No schema/custom fields.
```

---

## 1. Current state (inspected 2026-08-13)

Access path: direct Cursor Cloud secrets → Frappe token auth (no SSH / Infisical). Identity: `integrations@corpflowai.com`. Mutation of **standard** Item / Item Group / UOM / Selling Settings / draft Quotation was possible. Item Price list/create and Price List create returned **403**.

| Object | Before #881 | After this packet |
| ------ | ----------- | ----------------- |
| Company | `CorpFlowAI LTD`, default currency **MUR**, Mauritius | Unchanged |
| Item | **0 rows** | **5** non-stock sales services (below) |
| Item Group | Stock defaults only (`Services` is a leaf) | Added `CorpFlowAI Services` tree + four leaf groups |
| UOM `Month` | Missing | **Created** (standard UOM) |
| Price List | `Standard Selling` MUR, `Standard Buying` MUR | Unchanged — **USD selling list not created** (403) |
| Item Price | Not readable (403) | Still not writable (403) |
| Selling Settings | `editable_price_list_rate=0` | Set to **1** so draft quotes can carry catalogue rates |
| Quotation | 0 | 2 **draft** synthetic proofs (`docstatus=0`) |
| Sales Invoice | 0 | Unchanged |
| Taxes | `Mauritius Tax - CFAI` exists, not default | **Not attached** to items (VAT still HELD) |
| Custom fields / DocTypes | None added | **None added** |

### 1.1 Live Item masters

| Item code | Item name | Group | UOM | Stock? | Sales? | `standard_rate` |
| --------- | --------- | ----- | --- | ------ | ------ | --------------- |
| `LR-SETUP-USD-150` | AI Lead Rescue Setup (USD 150 launch pilot) | CF Lead Rescue | Nos | No | Yes | 0 (price pending) |
| `LR-REC-USD-99` | AI Lead Rescue monthly monitoring | CF Lead Rescue | Month | No | Yes | 0 (price pending) |
| `CF-RD-LEAD-RESCUE` | AI Lead Rescue Sprint | CF Lead Rescue | Nos | No | Yes | 0 (price pending) |
| `CF-RD-LANDING-RESCUE` | Premium Landing Page Rescue | CF Website Rescue | Nos | No | Yes | 0 (price pending) |
| `CF-WR-REC-MUR-MAINT` | Website Rescue monthly maintenance | CF Support | Month | No | Yes | 0 (operator quote) |

`standard_rate` is **0 on purpose**. Company currency is MUR. Writing `150` onto the Item would mean MUR 150, and `auto_insert_price_list_rate_if_missing` then tries to create an **Item Price** row, which 403s. USD 150 / MUR 35,000 / MUR 45,000 therefore live in the catalogue JSON until Item Price write is granted.

The old Docker sandbox item `SBX-LR-SETUP-USD-150` was **not** copied here. This hosted site uses the production code `LR-SETUP-USD-150` with no `SBX-` prefix.

### 1.2 Why this is not the loopback sandbox

Phase C evidence (`docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md`) is the Docker sandbox (`CorpFlowAI Sandbox`, item `SBX-LR-SETUP-USD-150`). The Cursor Cloud integration from #899 talks to a **hosted** ERPNext v16 company `CorpFlowAI LTD` with **zero** items before this packet. Catalogue work landed on that authorised integration site, not on `127.0.0.1:8080`.

---

## 2. Catalogue model

Source of truth in-repo: `config/erpnext-product-catalogue.v1.json`  
Builder: `lib/erpnext/product-catalogue.js`

### 2.1 Standard objects only

| Need | Standard ERPNext object | Customisation? |
| ---- | ---------------------- | -------------- |
| Product identity | **Item** (`is_stock_item=0`, `is_sales_item=1`) | No |
| Family | **Item Group** under `CorpFlowAI Services` | No |
| Selling unit | **UOM** `Nos` (setup) / `Month` (recurring) | No |
| List price | **Item Price** on **Price List** | No — blocked on permission |
| Document wording | Item `item_name` + `description` | No |
| Company income default | Item Default → `Sales - CFAI` | No (already configured) |
| Tax | None on items | VAT remains HELD |

**Smallest customisation proposal:** none. Standard Item / Price List is sufficient. The remaining gap is a **Role Permission** (Item Price + Price List write) for `integrations@corpflowai.com`, not a custom field or DocType.

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

- Lead Rescue monthly monitoring — **USD 99 / Month** (canonical rate in JSON; Item Price pending).
- Website Rescue monthly maintenance — **no list price** (maintenance template is amount-blank until quoted).

Reserved, **not** inserted: Website Rescue T2/T3, extra page, extra preview round, reputation-recovery sprint. Those wait Anton W1 / a later packet so we do not invent list prices.

---

## 3. Standard-config changes applied

All of the following used **stock** DocTypes. No custom fields. No production Vercel/env/DB changes.

1. **UOM** `Month` created and enabled.
2. **Item Groups:** `CorpFlowAI Services` (group) → `CF Lead Rescue`, `CF Website Rescue`, `CF Support`, `CF Future Services`.
3. **Items** in the table in §1.1, non-stock, sales, income default `Sales - CFAI`.
4. **Selling Settings:** `editable_price_list_rate = 1`.
5. **Draft quotations** `SAL-QTN-2026-00001` and `SAL-QTN-2026-00002` against an existing synthetic customer. Remarks: do not send, do not submit.

### 3.1 Not applied (blocked)

| Change | Why |
| ------ | --- |
| Price List `Standard Selling USD` | 403 — no Price List write |
| Item Price rows (USD 150, USD 99, MUR 35,000, MUR 45,000) | 403 — no Item Price write |
| MUR `standard_rate` on Item | Would auto-insert Item Price (403) and would be company-currency MUR, which is wrong for USD SKUs |
| Tax templates on items | VAT HELD; do not activate |
| Quotation naming `CFLR-QUO-*` | Owned by #882 |
| Currency Exchange USD→MUR | Empty; owned by #882. The USD draft used a placeholder conversion_rate — **do not submit** |

### 3.2 Operator steps after the role grant

In ERPNext desk, as Administrator (or any role that can edit Role Permissions):

1. Open **Role Permissions Manager**.
2. Grant **Item Price** Read + Write + Create to a role already on `integrations@corpflowai.com` (Item Manager or Sales Manager), **or** add a dedicated Integration role with those perms.
3. Grant **Price List** Write + Create the same way.
4. Create Price List **Standard Selling USD** (currency USD, selling checked).
5. Create Item Price rows from `config/erpnext-product-catalogue.v1.json` `prices` where `authority=canonical`.
6. Leave `CF-WR-REC-MUR-MAINT` without a list price until Anton sets a monthly MUR amount.
7. Re-probe: Item Price GET must return HTTP 200. Then a follow-up packet can flip this verdict to READY.

Do **not** paste API keys, passwords, or customer PII into GitHub.

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

### 4.2 Live ERPNext (this run)

Draft quotations pulled Item `item_name` and `description` unchanged:

| Quotation | Currency | Lines | Grand total | Status |
| --------- | -------- | ----- | ----------- | ------ |
| `SAL-QTN-2026-00001` | USD | `LR-SETUP-USD-150` + `LR-REC-USD-99` | 249.00 | Draft — do not submit |
| `SAL-QTN-2026-00002` | MUR | `CF-RD-LANDING-RESCUE` | 45,000.00 | Draft — do not submit |

Commercial identity on those lines matched the catalogue JSON verbatim (plain text). Rates were entered on the quotation because Item Price is not writable and `editable_price_list_rate=1`.

---

## 5. Exact blockers

**One catalogue blocker:**

`integrations@corpflowai.com` cannot create **Item Price** or **Price List** records (HTTP 403). Until that grant, ERPNext is the identity master (codes, names, descriptions, UOM, groups) but **not** yet the price master. Catalogue JSON remains the rate authority.

Related, **not** this issue’s one blocker:

- Currency Exchange empty / USD conversion_rate on drafts — **#882**.
- Quotation naming still `SAL-QTN-*` not `CFLR-QUO-*` — **#882**.
- `MASTER_ADMIN_KEY` still injected into ordinary Cursor Cloud runs — **#899** (parallel security correction).
- Website Rescue T2/T3 list prices — Anton **W1**.
- VAT / tax template — standing HELD.

---

## 6. Verdict

```text
ERPNext Product Catalogue NOT READY — Item Price (and Price List write) role grant required before selling rates are authoritative
```

Lead Rescue and Website Rescue **exist** as clean service Item masters and **can be referenced** on quotations. Synthetic proof pulled the expected commercial wording. Standard configuration was sufficient; no custom DocType is proposed.

The catalogue is not READY as an **authoritative invoicing master** until Item Price rows can be written on the correct selling price lists.

Anton required now: **YES** — Role Permission grant only (names: Item Price, Price List). No secrets, no schema, no payment, no send.

---

## 7. Cross-references

- `config/erpnext-product-catalogue.v1.json`
- `lib/erpnext/product-catalogue.js`
- `docs/erpnext/ERPNEXT_RECORD_MAPPING.md`
- `docs/erpnext/ERPNEXT_CUSTOMER_AND_QUOTATION_GUIDE.md`
- `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`
- `docs/sales/WEBSITE_RESCUE_PRICING_GUIDE.md`
- `docs/erpnext/ERPNEXT_CURSOR_CLOUD_SECURITY_CORRECTION_899.md`
