# ERPNext Commercial Documents & Multi-Currency v1 — quote/invoice readiness

**Status:** Live sandbox/test proof on hosted ERPNext. **No custom DocTypes. No tax/bank/FX-integration changes. No client sends. No submit of synthetic documents.**  
**Issue:** [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882)  
**Parents:** [#551](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/551), [#714](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/714), [#766](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/766)  
**Prerequisites:** [#880](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/880) Client Master, [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881) catalogue, [#879](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/879) access  
**Environment:** hosted ERPNext test (`CorpFlowAI LTD`, company currency **MUR**). Not the loopback Docker sandbox.  
**Machine contract:** `config/erpnext-commercial-documents.v1.json`  
**Invariants:** `lib/erpnext/commercial-documents.js`  
**Evidence:** `artifacts/erpnext/commercial-documents-882/`

**Anchor:** `<!-- ERPNEXT_COMMERCIAL_DOCUMENTS_V1 -->`

<!-- ERPNEXT_COMMERCIAL_DOCUMENTS_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #882
```

## Verdict

```text
ERPNext Commercial Documents NOT READY — Currency Exchange USD→MUR master missing (Anton-approved rate required); USD Sales Invoice correctly rejected; do not submit USD quotations at conversion_rate=1.0
```

MUR quotation and MUR draft invoice from ERPNext Customer + Item masters **do** render as professional standard PDFs (finance email, registered office, Tax ID `28466939`, Company No `C25228280`, 14-day validity, deposit/exclusion terms, #714 fail-closed wording). The remaining **one** blocker is foreign-currency **accounting truth**: there is no Currency Exchange row, `get_exchange_rate(USD→MUR)` returns 0, and a USD Sales Invoice is rejected (HTTP 417) rather than posting USD 1 = MUR 1. The existing USD quotation `SAL-QTN-2026-00001` still carries `conversion_rate=1.0` and **must not be submitted**.

This packet does **not** authorise merge, deploy, payments, client sends, schema/custom fields, live customer data, tax, bank, or exchange-rate integrations.

---

## Required return

```text
ERPNext Commercial Documents NOT READY — Currency Exchange USD→MUR master missing (Anton-approved rate required); USD Sales Invoice correctly rejected; do not submit USD quotations at conversion_rate=1.0

Current state: hosted ERPNext v16 (frappe=16.25.0, erpnext=16.26.2) as integrations@corpflowai.com
Company: CorpFlowAI LTD / CFAI / Mauritius / default_currency=MUR / tax_id=28466939 / registration_details=Company No : C25228280
Synthetic Lead Rescue quotation: SAL-QTN-2026-00001 (USD 249 draft, conversion_rate=1.0 UNSAFE — do not submit)
Synthetic Website Rescue quotation: SAL-QTN-2026-00003 (MUR 45,000 draft on CF880 Synthetic Website Rescue Ltd + CF-RD-LANDING-RESCUE)
Synthetic MUR Sales Invoice: ACC-SINV-2026-00001 (draft, not submitted)
USD Sales Invoice without Currency Exchange: HTTP 417 ValidationError (fail-closed — accounting truth preserved)
Print: Quotation Standard + Sales Invoice Standard + Company Letterhead - Grey; PDFs in artifacts/erpnext/commercial-documents-882/
#714: ERPNext never sets financially_approved; terms state the rail stays external
Exact blocker: Currency Exchange USD→MUR master missing (Anton-approved rate; do not invent a live FX figure; allow_stale=1 would reuse a dummy rate)
Anton required now: YES — one Currency Exchange USD→MUR (selling) rate from an approved source, then reprint/re-prove the USD invoice path. Optional follow-ups: Letter Head write grant + approved company_logo; Item Price / Price List write (#881); Prestige Procurement price/scope.
```

---

## 1. What was inspected (2026-08-13)

Access path: Cursor Cloud secrets → Frappe token auth as `integrations@corpflowai.com` (no SSH, no Infisical runtime bridge).

| Object | Readable | This packet | Notes |
| --- | --- | --- | --- |
| Company | yes | **email / website / default_letter_head only** | `tax_id`, `registration_details`, `default_currency`, accounts **unchanged** |
| Address `Home Office-Office` | yes | commercial email → `finance@corpflowai.com` | Dextra Lane registered office already linked to Company |
| Letter Head | yes | write **HTTP 403** | Default `Company Letterhead - Grey` already binds Company email/website |
| Print Format | yes | **not created** | Used standard `Quotation Standard` / `Sales Invoice Standard` |
| Print Settings | HTTP 403 | not changed | — |
| Terms and Conditions | yes | **created** `CF882 CorpFlowAI Commercial Terms` | Standard DocType |
| Payment Terms | HTTP 403 | not used | Terms and Conditions covers deposit/validity |
| Customer / Item | yes | **reused #880 / #881 masters** | No duplicate client/product rows |
| Quotation | yes | created `SAL-QTN-2026-00003`; annotated 00001/00002 | All `docstatus=0` |
| Sales Invoice | yes | created MUR draft `ACC-SINV-2026-00001`; USD create **417** | Not submitted |
| Price List | yes | write **HTTP 403** | `Standard Selling` is MUR only (#881) |
| Item Price | HTTP 403 | not used | Rates on documents via `editable_price_list_rate=1` |
| Currency | yes | not changed | MUR, USD, GBP, AUD, AED, EUR enabled |
| Currency Exchange | yes (empty) | **not created** | Creating a dummy rate would be incorrect accounting truth (`allow_stale=1`) |
| Sales Taxes and Charges Template | yes | not attached | `Mauritius Tax - CFAI` exists; VAT remains HELD (HB-3) |

Prestige Procurement is **not** in ERPNext yet. No priced Prestige quotation was created: price, self-management boundary, hosting responsibility, deposit terms, validity, and billing identity are still operator decisions. Use the same Customer → Item → Quotation machinery after those are approved. No external send.

---

## 2. Company identity (legal fields not overwritten)

Anton confirmed:

| Identifier | Where it already lives | Use |
| --- | --- | --- |
| `28466939` | Company.`tax_id` | Authoritative tax identifier — **not changed** |
| `C25228280` | Company.`registration_details` = `Company No : C25228280` | Authoritative company / BRN form — **not changed** |
| `228280` | nowhere as an independent field | Short-form reference only |

Filled this packet (identity, not accounting):

- Company.`email` = `finance@corpflowai.com`
- Company.`website` = `https://corpflowai.com`
- Company.`default_letter_head` = `Company Letterhead - Grey`
- Company Address email = `finance@corpflowai.com`

Still empty: `company_logo`, `phone_no`. Letter Head HTML cannot be edited by this user (403), so Tax ID / Company No appear in the **Terms** block on the PDF rather than in the header. That is enough to identify the seller on a paying-client MUR document; a branded header/logo is a follow-up once Letter Head write (or an approved logo upload) is granted.

---

## 3. Synthetic document proof (Customer + Item masters, no retyping)

| Document | Customer | Item(s) | Currency | Totals | PDF |
| --- | --- | --- | --- | --- | --- |
| `SAL-QTN-2026-00001` | `CF880 Synthetic Lead Rescue Ltd` | `LR-SETUP-USD-150` + `LR-REC-USD-99` | USD 249 | `conversion_rate=1.0` **unsafe** | `lead-rescue-usd-SAL-QTN-2026-00001.pdf` |
| `SAL-QTN-2026-00003` | `CF880 Synthetic Website Rescue Ltd` | `CF-RD-LANDING-RESCUE` | MUR 45,000 | base = document (correct) | `website-rescue-mur-SAL-QTN-2026-00003.pdf` |
| `ACC-SINV-2026-00001` | same Website Rescue customer | `CF-RD-LANDING-RESCUE` | MUR 45,000 draft invoice | not submitted | `website-rescue-invoice-draft-ACC-SINV-2026-00001.pdf` |

`SAL-QTN-2026-00002` is an #881 leftover (Website Rescue item on the Lead Rescue customer). Do not send. Prefer `00003`.

All three primary PDFs show:

- DRAFT (correct — synthetic, not submitted)
- Bill From: CorpFlowAI LTD, Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches
- Email `finance@corpflowai.com` and website
- Terms: Tax ID `28466939`, Company No `C25228280`, 14-day validity, 50% MUR deposit, no revenue/SEO guarantees, #714 approval-to-build stays external

Standard print does **not** repeat Item `description` in the line table. Scope/exclusions are on the Terms page. That is acceptable for a first paying-client MUR quote; a Print Designer template remains a **separate proposal** only if Anton wants branded layout beyond standard.

Screenshots: `*-p1.png` / `*-p2.png` next to each PDF.

---

## 4. Currency behaviour

Company base/reporting currency is **MUR**. USD is a **selling / document** currency, not a new accounting base.

| Check | Result |
| --- | --- |
| `get_exchange_rate(USD→MUR)` | 0 + server message: create a Currency Exchange record manually |
| Currency Exchange list | **empty** |
| Accounts Settings `allow_stale` | **1** (a dummy rate would be reused — do not invent one) |
| USD Quotation | allowed with `conversion_rate=1.0` (ERPNext default) — **must not submit** |
| USD Sales Invoice, no rate | **HTTP 417** `Exchange Rate is mandatory. Maybe Currency Exchange record is not created for USD to MUR.` |
| MUR Quotation + MUR Invoice | conversion_rate 1 is correct (same as company currency) |

### GBP / AUD / AED (same pattern, not configured)

Those currencies are **already enabled**. To sell in them without corrupting MUR books, reuse the standard path:

1. Selling **Price List** in that currency (blocked today: Price List write HTTP 403 — same #881 grant).
2. **Currency Exchange** `{currency} → MUR` for selling, with an Anton-approved rate (not an auto integration).
3. Customer.`default_currency` + document currency on Quotation / Sales Invoice.
4. Confirm `base_grand_total` = document total × conversion_rate, not 1:1.

Do **not** enable exchange-rate integrations (Frankfurter / etc.) without a separate Anton approval.

---

## 5. Taxes, bank, payment evidence, #714 / #766

- Taxes: existing template `Mauritius Tax - CFAI` was **not** attached. VAT remains HELD (HB-3). No tax-rule mutation.
- Bank / Mode of Payment: not changed. Wire Transfer already exists as a standard mode.
- Payment evidence stays manual under #714 (`PAYMENT_EVIDENCE_RECORD.md`) and Mauritius POP flow. ERPNext Payment Entry is the later allocation step after Anton bank clearance — not this packet.
- `toCommercialRailProposalStub()` maps an ERPNext quotation name into a #714 proposal stub with **`financially_approved: false`** always. ERPNext does not open the build gate.

---

## 6. Configuration gaps (not the one blocker)

| Gap | Class | Owner |
| --- | --- | --- |
| Currency Exchange USD→MUR | **Exact blocker** | Anton — approved rate, then Cursor re-proves USD invoice |
| Letter Head write 403 | Follow-up | Role grant if header/logo must bind `tax_id` / `company_logo` |
| `company_logo` empty | Follow-up | Anton supplies approved logo |
| Item Price / USD Price List write 403 | #881 | Role grant; rates today sit on the quotation line |
| Payment Terms DocType 403 | Non-blocking | Terms and Conditions used instead |
| Prestige Procurement Customer | Client lane | After price/scope/billing identity are approved — no send |
| Print Designer branded template | Separate proposal | Only if standard PDF is judged not paying-client quality |

**Smallest customisation proposal:** none. Standard Quotation / Sales Invoice / Letter Head / Terms and Conditions / Currency Exchange are sufficient.

---

## 7. Non-actions honoured

- No merge / deploy / Vercel
- No env/secrets changes; secret values not logged
- No CorpFlowAI DB/schema
- No ERPNext custom fields / custom DocTypes
- No production accounting, bank, tax, or FX-integration mutation
- No Currency Exchange row invented
- No document submitted (`docstatus` remains 0)
- No client send (Prestige or otherwise)
- No live client records created

---

## 8. Smallest Anton action

1. Decide a **USD→MUR selling** exchange rate from an approved source (or an accountant-signed figure).
2. Create **one** Currency Exchange row (USD → MUR, for selling) on this hosted test company — or grant `integrations@corpflowai.com` Currency Exchange create and authorise Cursor to apply that **named** rate only.
3. Re-draft the USD Sales Invoice; confirm `base_grand_total` is MUR × rate, not 1:1; keep it draft until a real client path is authorised.
4. Do **not** submit `SAL-QTN-2026-00001` until step 3 is proven.

Optional, not required to clear the one blocker: Letter Head write + approved logo; #881 Item Price grant; Prestige price pack.

---

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a — ERPNext sandbox/test documents; no Vercel customer surface
- Commit deployed: n/a until merge
- Live URLs tested: n/a — hosted ERPNext API (Quotation/Sales Invoice/PDF); not a CorpFlow tenant URL
- Expected vs actual result: MUR quote+invoice PDFs from masters with finance@ identity and terms; USD invoice fail-closed without Currency Exchange
- Client-facing flow usable: NO — synthetic drafts only; USD accounting path not safe to submit; no external send
- Final verdict: PARTIAL (PR only; ERPNext Commercial Documents NOT READY on the FX blocker)
```
