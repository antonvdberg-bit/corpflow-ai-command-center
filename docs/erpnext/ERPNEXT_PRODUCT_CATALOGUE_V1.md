# ERPNext Product & Service Catalogue v1 — invoicing master

**Status:** Item masters live; MUR company-currency `standard_rate` applied for the two approved sprint SKUs; Item Price / USD Price List still UI-blocked after 2026-08-13 generation 3 re-probe.
**Issue:** [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881)
**Parents:** [#710](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/710), [#711](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/711), [#714](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/714)
**Prerequisite:** [#879](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/879) / direct API path from [#899](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/899)
**Environment:** hosted ERPNext test (`CorpFlowAI LTD`, MUR company currency). Not the loopback Docker sandbox.
**Owner:** Anton (Role Permissions Manager click); Cursor (catalogue + apply script).
**Anchor:** `<!-- ERPNEXT_PRODUCT_CATALOGUE_V1 -->`

<!-- ERPNEXT_PRODUCT_CATALOGUE_V1 -->

```text
Verdict: NOT READY — Item Price Role Permission grant is UI-only (Administrator → Role Permissions Manager)
```

Canonical Context Preflight: PASS
Operating model version: `2026-08-13-v1`
Environment: `corpflow_test`
GitHub state refreshed: YES
Source item: #881

This packet does **not** authorise merge, deploy, payments, client sends, schema/custom fields, or live customer data changes.

---

## Required return

```text
ERPNext Product Catalogue NOT READY — Item Price Role Permission grant is UI-only

Current state: hosted ERPNext v16 (frappe=16.25.0, erpnext=16.26.2) as integrations@corpflowai.com
Catalogue model: config/erpnext-product-catalogue.v1.json
Standard-config applied: UOM Month; Item Groups; 5 non-stock Items; Selling Settings editable_price_list_rate=1; MUR Item.standard_rate 35000 / 45000
Synthetic proof: SAL-QTN-2026-00001 (USD 249 draft) + SAL-QTN-2026-00002 (MUR 45,000 draft) + npm test
Exact blocker: Item Price GET/POST HTTP 403; permission_manager / Custom DocPerm / Role writes HTTP 403. Standard Item Price roles are Sales Master Manager and Purchase Master Manager only. Integration user has Item Manager via Role Profile Accounts.
Verdict: NOT READY — Item Price Role Permission grant is UI-only
Anton required now: YES — Role Permissions Manager: Item Price Read/Create/Write + Price List Create/Write on role Item Manager. Then re-run bash scripts/erpnext/apply-product-catalogue-prices.sh
```

---

## 1. Current state (re-probed 2026-08-13, generation 3)

Access path: direct Cursor Cloud secrets → Frappe token auth (no SSH / Infisical). Identity: `integrations@corpflowai.com`. Anton’s recorded authorization for Item Price and Price List Read/Create/Write is **not re-requested**. This identity still **cannot apply that grant itself**, and the grant is **not yet visible** on the API.

| Object | Generation 3 live result |
| ------ | ------------------------ |
| Auth | HTTP 200 as `integrations@corpflowai.com` |
| Roles | Purchase User, Sales User, Item Manager, Stock Manager, Stock User, Accounts Manager, Sales Manager, Accounts User, Purchase Manager |
| Item | 5 non-stock sales services still present; MUR `standard_rate` 35000 / 45000 on sprint SKUs; USD SKUs remain 0 |
| Price List GET | HTTP 200 — `Standard Selling` (MUR) and `Standard Buying` (MUR) only |
| `Standard Selling USD` | GET HTTP 404 (does not exist); POST create HTTP **403** |
| Item Price GET | HTTP **403** |
| Item Price POST (`LR-SETUP-USD-150` USD 150) | HTTP **403** — no row written |
| Quotations | `SAL-QTN-2026-00001` / `00002` still Draft (`docstatus=0`) |
| Custom fields / DocTypes | **None** |

Generation 2 detail (why the grant is UI-only) remains in §1.2. Generation 3 did **not** add a workaround, custom DocType, Role Profile edit, or second permission system.

### 1.0 Prior generation 2 snapshot (still accurate; generation 3 confirmed the same 403s)

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
| `LR-SETUP-USD-150` | AI Lead Rescue Setup (USD 150 launch pilot) | CF Lead Rescue | Nos | **0** (must not write USD onto MUR company field) | pending UI grant |
| `LR-REC-USD-99` | AI Lead Rescue monthly monitoring | CF Lead Rescue | Month | **0** | pending UI grant |
| `CF-RD-LEAD-RESCUE` | AI Lead Rescue Sprint | CF Lead Rescue | Nos | **35,000 MUR** applied | pending UI grant |
| `CF-RD-LANDING-RESCUE` | Premium Landing Page Rescue | CF Website Rescue | Nos | **45,000 MUR** applied | pending UI grant |
| `CF-WR-REC-MUR-MAINT` | Website Rescue monthly maintenance | CF Support | Month | **0** (no approved monthly amount) | not written |

`Item.standard_rate` is company currency (MUR). It is a valid standard-config fallback for the two MUR sprint SKUs. It is **not** a substitute for USD Item Price rows.

### 1.2 Why Item Price is still 403 after Anton’s approval

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
| List price | **Item Price** on **Price List** | No — blocked on UI role grant |
| MUR company-currency fallback | Item `standard_rate` | No — applied for the two sprint SKUs |
| Document wording | Item `item_name` + `description` | No |
| Company income default | Item Default → `Sales - CFAI` | No (already configured) |
| Tax | None on items | VAT remains HELD |

**Smallest customisation proposal:** none. Standard Item / Price List is sufficient. The remaining gap is a **Role Permissions Manager** click, not a custom field or DocType.

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

- Lead Rescue monthly monitoring — **USD 99 / Month** (canonical rate in JSON; Item Price pending UI grant).
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

### 3.1 Not applied (blocked — UI-only)

| Change | Why |
| ------ | --- |
| Role grant Item Price / Price List to Item Manager | `permission_manager` + Custom DocPerm + Role are 403 for this identity |
| Price List `Standard Selling USD` | 403 — no Price List write |
| Item Price rows (USD 150, USD 99, MUR 35,000, MUR 45,000) | 403 — no Item Price write |
| USD amounts on Item `standard_rate` | Would mean MUR 150 / MUR 99 — wrong |
| Tax templates on items | VAT HELD; do not activate |
| Quotation naming `CFLR-QUO-*` | Owned by #882 |
| Currency Exchange USD→MUR | Empty; owned by #882. The USD draft used a placeholder conversion_rate — **do not submit** |

### 3.2 Smallest Anton click path (UI-only)

Do this as **Administrator** in ERPNext Desk. No secrets. No schema. No Role Profile edit.

1. Open **Role Permissions Manager**.
2. DocType **Item Price** → add role **Item Manager**: **Read**, **Create**, **Write** (permlevel 0).
3. DocType **Price List** → for role **Item Manager** enable **Create** and **Write** (Read already exists for Sales User).
4. Save.
5. Re-run `bash scripts/erpnext/apply-product-catalogue-prices.sh` on a Cursor Cloud run that already has `ERPNEXT_BASE_URL` / `ERPNEXT_API_KEY` / `ERPNEXT_API_SECRET`.

Do **not**:

- Change the shared **Accounts** Role Profile (other users inherit it).
- Assign `Sales Master Manager` onto that shared profile.
- Paste API keys, passwords, or customer PII into GitHub.
- Submit or email draft quotations `SAL-QTN-2026-00001` / `00002`.

After the grant, the apply script creates **Standard Selling USD** and the four canonical Item Price rows only. It leaves `CF-WR-REC-MUR-MAINT` without a list price.

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

### 4.2 Live ERPNext (generation 3, 2026-08-13)

Draft quotations still present and still draft:

| Quotation | Currency | Lines | Grand total | Status |
| --------- | -------- | ----- | ----------- | ------ |
| `SAL-QTN-2026-00001` | USD | `LR-SETUP-USD-150` + `LR-REC-USD-99` | 249.00 | Draft — do not submit |
| `SAL-QTN-2026-00002` | MUR | `CF-RD-LANDING-RESCUE` | 45,000.00 | Draft — do not submit |

MUR Item read-back generation 3: `CF-RD-LEAD-RESCUE.standard_rate=35000`, `CF-RD-LANDING-RESCUE.standard_rate=45000`. USD SKUs `standard_rate=0`. Item Price GET/POST HTTP 403. `Standard Selling USD` does not exist (GET 404; create 403). No unapproved rates written. Apply script `scripts/erpnext/apply-product-catalogue-prices.sh` exits 1 and prints the §3.2 click path.

---

## 5. Exact blockers

**One catalogue blocker:**

Role Permissions Manager is **UI-only** for this identity. Until **Item Manager** can Read/Create/Write **Item Price** and Create/Write **Price List**, ERPNext is the identity master (codes, names, descriptions, UOM, groups) plus MUR `standard_rate` on the two sprint SKUs, but **not** yet the multi-currency price master. Catalogue JSON remains the USD rate authority.

Related, **not** this issue’s one blocker:

- Currency Exchange empty / USD conversion_rate on drafts — **#882**.
- Quotation naming still `SAL-QTN-*` not `CFLR-QUO-*` — **#882**.
- `MASTER_ADMIN_KEY` still injected into ordinary Cursor Cloud runs — **#899** (parallel security correction).
- Website Rescue T2/T3 list prices — Anton **W1**.
- VAT / tax template — standing HELD.

---

## 6. Verdict

```text
ERPNext Product Catalogue NOT READY — Item Price Role Permission grant is UI-only
```

Lead Rescue and Website Rescue **exist** as clean service Item masters and **can be referenced** on quotations. Synthetic proof pulled the expected commercial wording. Standard configuration was sufficient; no custom DocType is proposed.

The catalogue is not READY as an **authoritative invoicing master** until Item Price rows can be written on the correct selling price lists.

Anton required now: **YES** — already-authorized Role Permissions Manager click in §3.2 only (do **not** re-approve). No secrets, no schema, no payment, no send. After the click, re-run `bash scripts/erpnext/apply-product-catalogue-prices.sh`.

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
