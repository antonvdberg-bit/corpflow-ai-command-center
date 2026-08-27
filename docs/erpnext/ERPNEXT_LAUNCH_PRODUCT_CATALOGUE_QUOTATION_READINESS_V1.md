# ERPNext launch-product catalogue — quotation readiness

**Status:** GET/read-only acceptance on hosted ERPNext. **READY for quotation** of the two launch products from the standard Item / Price List / Item Price catalogue. **No ERPNext write. No second product master. No invented prices or exchange rates.**
**Issue:** [#1207](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1207)
**Parents:** [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881) catalogue · [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882) commercial documents · [#1056](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1056) / [#1166](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1166) selling quotation path
**Current-main repair:** closed stale PR [#1224](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1224) is not resumed. This packet re-lands the proven GET/read-only slice on exact current `main` `be671871f2bc2b5c7545d5379ff2be2caf2284d5`.
**Environment:** `corpflow_test` hosted ERPNext (CorpFlowAI LTD, company currency MUR). Not `client_production`.
**Owner:** Anton (merge); Cursor (this acceptance).
**Machine contract:** `config/erpnext-launch-product-catalogue.v1.json`
**Probe:** `node scripts/erpnext/probe-launch-product-catalogue.mjs`
**Anchor:** `<!-- ERPNEXT_LAUNCH_PRODUCT_CATALOGUE_QUOTATION_READINESS_V1 -->`

<!-- ERPNEXT_LAUNCH_PRODUCT_CATALOGUE_QUOTATION_READINESS_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1207
```

## Verdict

```text
ERPNext LAUNCH-PRODUCT CATALOGUE READY FOR QUOTATION
```

Lead Rescue and Website Rescue can be quoted from the existing ERPNext catalogue. Quotations already on the hosted site pull those Item codes and Item Price rates. CorpFlowAI does not keep a second product or price book for this path.

This packet does **not** authorise sending a quotation, submitting it, posting a Sales Invoice, changing a price, or creating a new Item.

---

## Required return

```text
ERPNext LAUNCH-PRODUCT CATALOGUE READY FOR QUOTATION

Current main: be671871f2bc2b5c7545d5379ff2be2caf2284d5
Identity: integrations@corpflowai.com (GET-only)
Items:
  LR-SETUP-USD-150 — AI Lead Rescue Setup (USD 150 launch pilot)
  CF-RD-LEAD-RESCUE — AI Lead Rescue Sprint
  CF-RD-LANDING-RESCUE — Premium Landing Page Rescue (Website Rescue T1)
Price Lists:
  Standard Selling — MUR, selling, enabled
  Standard Selling USD — USD, selling, enabled
Item Prices:
  80e9c04627 — LR-SETUP-USD-150 / Standard Selling USD / USD 150 / Nos
  90egvb653r — LR-REC-USD-99 / Standard Selling USD / USD 99 / Month
  80empip48q — CF-RD-LEAD-RESCUE / Standard Selling / MUR 35,000 / Nos
  10esgagbr0 — CF-RD-LANDING-RESCUE / Standard Selling / MUR 45,000 / Nos
Quotation linkage:
  Selling path uses catalogue item_code CF-RD-LANDING-RESCUE; payload sends qty/uom only
  Lead Rescue USD proof SAL-QTN-2026-00001 (249 at conversion_rate 47.15, existing FX)
  Website Rescue MUR proofs SAL-QTN-2026-00003 and SAL-QTN-2026-00005 (45,000)
Exact blocker: NONE
```

---

## 1. What this proves for Anton

When CorpFlowAI raises a quotation for either launch product, ERPNext already has:

1. One Item master per product (name and commercial description already on the Item).
2. One selling Price List per currency already in use (MUR and USD).
3. One Item Price row per launch SKU — no duplicates, no invented rates.
4. Quotation code that looks up those Item codes from the #881 catalogue instead of a second price list in CorpFlowAI.

USD 150 Lead Rescue and MUR Website Rescue T1 are both covered. The MUR Lead Rescue sprint (`CF-RD-LEAD-RESCUE`) is a **different product**, not a currency copy of the USD 150 pilot.

---

## 2. Live GET evidence (2026-08-27T23:58:02Z)

Read-only as `integrations@corpflowai.com`. `MASTER_ADMIN_KEY` absent. No Item / Item Price / Price List / Currency Exchange write. Artifact: `artifacts/erpnext/launch-product-catalogue-1207/probe-log.json`.

| Object | Identifier | Live result |
| ------ | ---------- | ----------- |
| Item | `LR-SETUP-USD-150` | HTTP 200 — AI Lead Rescue Setup (USD 150 launch pilot); group CF Lead Rescue; UOM Nos; non-stock sales; not disabled |
| Item | `CF-RD-LEAD-RESCUE` | HTTP 200 — AI Lead Rescue Sprint; `standard_rate` MUR 35,000 |
| Item | `CF-RD-LANDING-RESCUE` | HTTP 200 — Premium Landing Page Rescue; `standard_rate` MUR 45,000 |
| Item | `LR-REC-USD-99` | HTTP 200 — supporting monthly SKU (USD 99 / Month), already on the USD proof quotation |
| Item | `CF-WR-REC-MUR-MAINT` | HTTP 200 — no Item Price (operator quote). **Not a launch-setup blocker.** |
| Item | T2 / T3 / reputation | HTTP 404 — reserved, not inserted |
| Price List | `Standard Selling` | HTTP 200 — MUR, selling=1, enabled |
| Price List | `Standard Selling USD` | HTTP 200 — USD, selling=1, enabled |
| Item Price | `80e9c04627` | USD 150 on Standard Selling USD |
| Item Price | `90egvb653r` | USD 99 / Month on Standard Selling USD |
| Item Price | `80empip48q` | MUR 35,000 on Standard Selling |
| Item Price | `10esgagbr0` | MUR 45,000 on Standard Selling |
| Item Price uniqueness | launch SKUs | **one row each** |
| Currency Exchange | `2026-08-13-USD-MUR-Selling-Buying` | **47.15** already present (Anton). Not changed. |
| Quotation | `SAL-QTN-2026-00001` | Draft USD 249 — `LR-SETUP-USD-150` @ 150 + `LR-REC-USD-99` @ 99 |
| Quotation | `SAL-QTN-2026-00003` | Draft MUR 45,000 — `CF-RD-LANDING-RESCUE` |
| Quotation | `SAL-QTN-2026-00005` | Draft MUR 45,000 — `CF-RD-LANDING-RESCUE`; search-before-create proven |

Group search: **3** Items in CF Lead Rescue, **1** in CF Website Rescue. No extra launch-product masters.

Prestige placeholder `CF-WS-CUSTOM-PROJECT` still has its own MUR 1,000 Item Price. That is **not** a Lead Rescue or Website Rescue duplicate.

---

## 3. Quotation linkage (no second price truth)

| Path | What it uses |
| ---- | ------------ |
| Catalogue JSON | `config/erpnext-product-catalogue.v1.json` — only product/price projection in CorpFlowAI |
| Quotation line helper | `toQuotationLine()` copies `item_code`, `item_name`, commercial `description` |
| Selling / quote-to-cash | `getCatalogueItem('CF-RD-LANDING-RESCUE')`. POST payload sends **item_code + qty + uom only**. ERPNext Item Price supplies the rate. |
| Search | List Quotation by customer + currency. Idempotency key is in the title **and** `customer_notes`. Replay **UPDATE**, not a second draft. |
| Lead Rescue USD | Existing #882 draft `SAL-QTN-2026-00001` on `Standard Selling USD` |

`expected_rate_mur` on the selling config is a **match check** against the catalogue Item Price (45,000). It is not a second master.

---

## 4. Projection correction in this packet

One search-field gap: quotation search listed `title` (which already carries the idempotency key) but omitted `customer_notes`, where the same key is also stored. That field is now included so read-back stays duplicate-safe if a title is later edited. No ERPNext write.

---

## 5. Explicit non-actions

No Item or Item Price create/update. No price approval. No exchange-rate change. No tax/CoA mutation. No quotation submit or client send. No Sales Invoice posting. No env/secrets change. No second catalogue. No factory/orchestration engineering.

Website Rescue T2/T3 remain reserved. Monthly Website Rescue maintenance remains operator-quoted.

Quote-to-cash **posting** is still blocked by [#1055](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1055) accountant foundation. That does **not** block **draft quotation** from this catalogue.

---

## 6. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a — ERPNext hosted-test GET; no Vercel customer surface
- Commit deployed: n/a until merge
- Live URLs tested: hosted ERPNext Frappe REST GET (URL not recorded)
- Expected vs actual result: launch Items, Price Lists, four canonical Item Prices, and existing draft quotations match the #881/#882/#1166 identifiers
- Client-facing flow usable: NO — synthetic drafts only; no external send
- Final verdict: PARTIAL for client send (intentional); READY for launch-product catalogue quotation
```

Anton required now: **MERGE this PR** when satisfied. Do not send or submit the synthetic quotations.
