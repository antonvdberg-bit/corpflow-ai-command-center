# ERPNext onboarding C — Selling / Quote-to-Cash v1

**Status:** Implementation + synthetic MUR quotation proof. **No schema. No cron. No real client. No quotation send. No Sales Invoice posting. No Payment Entry. No tax/CoA mutation.**  
**Issue:** [#1056](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1056)  
**Current-main continuation:** [#1166](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1166) (lands the proven #1056 / PR #1101 / stale PR #1128 slice onto current `main` after #1162 Commercial quotation-evidence continuity; does **not** create a second Quote-to-Cash design). Prior continuation [#1125](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1125) / PR #1128 is retired, not revived.  
**Parents:** [#1054](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1054), [#1055](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1055), [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953), [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918)  
**Reuse:** [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882) commercial documents; [#1009](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1009)/[#1012](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1012) Customer bridge; [#1018](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1018)/[#1021](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1021) sales lifecycle; [#551](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/551)/[#714](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/714) financial approval rail  
**Environment:** `corpflow_test` (CorpFlowAI-hosted ERPNext sandbox/test). Not `client_production`.  
**Machine contract:** `config/erpnext-selling-quote-to-cash.v1.json`  
**Bridge:** `lib/erpnext/selling-quote-to-cash.js`  
**Frappe client:** `lib/erpnext/frappe-rest-client.js` (reused; not a second integration client). Commercial Workspace (#1160/#1162) GETs the same `Quotation.name` — no second ledger.  
**Apply:** `node scripts/erpnext/apply-selling-quote-to-cash.mjs`  
**Mapping reused:** `docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md` row `quotation_invoice`

**Anchor:** `<!-- ERPNEXT_SELLING_QUOTE_TO_CASH_V1 -->`

<!-- ERPNEXT_SELLING_QUOTE_TO_CASH_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1166
```

This continuation reuses the #1056 / PR #1101 implementation and hosted-test evidence. It does **not** redesign Quote-to-Cash.

## Verdict

**`NOT READY — BLOCKED BY ACCOUNTANT FOUNDATION`**

Selling-quotation sub-verdict: **`SELLING_QUOTATION_PATH_PROVEN`**

The synthetic path `Lead → Opportunity → Customer → draft Quotation` is proven on hosted ERPNext using the merged WP2 records. Print/PDF, terms, validity, line items, and quotation idempotency are proven. Accepted-commercial-record, Sales Invoice/pro-forma, payment evidence, and `Proceed Approved` are mapped to **standard ERPNext + the existing #714 rail**.

Exact blocker: **#1055 Company & Accounting Foundation is still OPEN.** Correct Sales Invoice posting depends on accountant-approved Chart of Accounts, VAT/tax treatment, and receivable/income defaults. Default ERPNext skeleton accounts (`Debtors - CFAI`, `Sales - CFAI`) and template `Mauritius Tax - CFAI` **exist** and are **not** treated as accountant approval. This packet stops before posting, tax application, Payment Entry, or send.

Anton action: **NONE** unless merging the current-main #1166 PR. Accountant configuration remains on #1055. Real client quotation send, invoice submit, payment, and `client_production` stay separately gated. PR #1101 is the original behind-main proof; stale PR #1128 / #1125 is retired. This continuation is the merge-ready landing on current `main` (including merged #1162 Commercial Workspace quotation evidence).

---

## 1. What this packet does

1. Reuses the merged WP2 Lead / Opportunity / Customer. It does not create a second CRM or Frappe client.
2. Reuses #882 Company identity, catalogue/price lists, terms, letterhead, and existing MUR/USD draft commercial documents.
3. Creates or updates **one** synthetic MUR draft `Quotation` for `CF1018 Synthetic Sales Lifecycle Ltd` (`CF-RD-LANDING-RESCUE`, Standard Selling, MUR 45,000).
4. Replays the same event. The second run **updates** the same Quotation.
5. Downloads the standard Quotation PDF.
6. Defines the accepted-commercial-record step using standard ERPNext Quotation state first. No custom acceptance DocType.
7. Maps the Sales Invoice / pro-forma route to existing #882 **draft** invoices. Does **not** create or submit a new Sales Invoice.
8. Maps manual payment evidence to #714 `payment_evidence` (opaque reference only). Does **not** create a Payment Entry.
9. Proves `Proceed Approved` (`financially_approved`) cannot be inferred from invoice creation.

It does **not** write live Postgres. It does **not** submit or send. It does **not** mutate CoA, tax templates, or exchange rates.

---

## 2. Standard DocTypes, statuses, and cross-system identifiers

| Step | ERPNext DocType | Identifier (synthetic) | Status used | CorpFlowAI reference |
|------|-----------------|------------------------|-------------|----------------------|
| Lead | `Lead` | `CRM-LEAD-2026-00009` | Converted (WP2) | `leads.id` = `cf1018-synthetic-sales-lifecycle` |
| Opportunity | `Opportunity` | `CRM-OPP-2026-00003` | Open | same `leads.id`; `utm_content` = WP2 idempotency key |
| Customer | `Customer` | `CF1018 Synthetic Sales Lifecycle Ltd` | enabled | WP1/WP2 pointer `qualification_json.erpnext.customer` |
| Contact | `Contact` | `Lee Synthetic` | — | WP2 |
| Address | `Address` | `CF1018 Synthetic Sales Lifecycle Ltd-Billing` | Billing | WP2 |
| Offer | `Quotation` | `SAL-QTN-2026-00005` | **Draft** `docstatus=0` | `corpflow.selling_q2c.v1:lead=cf1018-synthetic-sales-lifecycle` |
| Terms | `Terms and Conditions` | `CF882 CorpFlowAI Commercial Terms` | — | reused #882 |
| Item / price | `Item` / `Item Price` | `CF-RD-LANDING-RESCUE` @ MUR 45,000 on `Standard Selling` | — | reused #881 |
| Pro-forma / SI (mapped, not posted) | `Sales Invoice` | `ACC-SINV-2026-00001` (MUR #882 draft) | **Draft** `docstatus=0` | #714 `proposal.version` may point here later |
| USD reuse only | `Quotation` / `Sales Invoice` | `SAL-QTN-2026-00001` / `ACC-SINV-2026-00002` | Draft | #882; conversion_rate 47.15 |
| Payment evidence | none this packet | — | — | #714 `payment_evidence` |
| Proceed Approved | none in ERPNext | — | — | #714 `financially_approved` |

Pointer shape (extends WP2, same schema, no new column):

```text
qualification_json.erpnext.schema = corpflow.qualification.erpnext.v1
qualification_json.erpnext.bridge = lead_opportunity_promotion   (unchanged)
qualification_json.erpnext.quotation_bridge = quotation_invoice
qualification_json.erpnext.erpnext_quotation = <Quotation.name>
qualification_json.erpnext.quotation_idempotency_key = corpflow.selling_q2c.v1:lead=<leads.id>
```

---

## 3. Accepted commercial record (standard ERPNext first)

No custom acceptance engine.

| Layer | Mechanism |
|-------|-----------|
| ERPNext offer | Standard `Quotation`. Synthetic proof stays `docstatus=0` / `Draft`. After Anton commercial + presentation gates, a live quote is **submitted** (`docstatus=1`, status `Open`). |
| ERPNext acceptance | Standard **Comment** on the Quotation recording written client acceptance (who / when / method). Optional conversion to Sales Order sets status `Ordered`. **Sales Order is not required for CorpFlowAI services** (#918). |
| CorpFlowAI rail | #714 `acceptance.status=accepted` + `accepted_by` + `acceptance_timestamp`, pointing at `erpnext_quotation`. |

This packet does **not** submit the synthetic Quotation and does **not** create a Comment (Comment create was HTTP 403 to `integrations@corpflowai.com` on the governance packet). The mechanism is defined so a later authorized operator step can use standard documents only.

---

## 4. Sales Invoice / pro-forma route (mapped, not posted)

Agreed route:

1. After acceptance, create a standard **Sales Invoice** from the Quotation (or against the same Customer + Item).
2. Until accountant approval, keep it as **pro-forma**: `docstatus=0` Draft, or print the Quotation itself.
3. Do **not** submit. Submit would post GL to receivable/income accounts.

#882 already proved draft MUR `ACC-SINV-2026-00001` and draft USD `ACC-SINV-2026-00002`. This packet re-reads those drafts. It does **not** create a new Sales Invoice for CF1018, because posting-correct behaviour depends on #1055.

Taxes: template `Mauritius Tax - CFAI` is present and **not applied**. VAT/tax remains accountant-owned.

---

## 5. Payment evidence / Proceed Approved

Manual payment evidence is the existing #714 record (`docs/revenue/templates/PAYMENT_EVIDENCE_RECORD.md`):

- `payment_evidence.status` = `recorded` or `verified`
- opaque `evidence_ref` (no bank secrets)
- amount + currency
- optional link to Quotation / draft invoice **names**

**No Payment Entry. No bank integration. No gateway.**

`Proceed Approved` is `financially_approved` on the #714 rail. ERPNext never sets it. Invoice creation alone fails closed (`MISSING_ACCEPTANCE`, `MISSING_PAYMENT_EVIDENCE`, `MISSING_FINANCIAL_APPROVER`).

---

## 6. MUR primary; USD reuse only

| Path | Result |
|------|--------|
| MUR | Primary. New CF1018 draft Quotation from `Standard Selling` / `CF-RD-LANDING-RESCUE` 45,000. conversion_rate 1. |
| USD | Not created by this packet. Safely reused #882 `SAL-QTN-2026-00001` / `ACC-SINV-2026-00002` at conversion_rate **47.15**. No exchange-rate mutation. |

---

## 7. Live proof (2026-08-26 UTC)

Ran as `integrations@corpflowai.com` via `node scripts/erpnext/apply-selling-quote-to-cash.mjs` at `2026-08-26T04:11:21Z`. Secret values not printed. Postgres not written. No Sales Invoice created. No Payment Entry.

| Check | Result |
|-------|--------|
| Auth | HTTP 200, `integrations@corpflowai.com` |
| Company identity | Tax ID `28466939`, Company No `C25228280`, MUR, `finance@corpflowai.com` |
| Upstream WP2 | Lead `CRM-LEAD-2026-00009`, Opportunity `CRM-OPP-2026-00003`, Customer `CF1018 Synthetic Sales Lifecycle Ltd` |
| First run | **CREATE** Quotation `SAL-QTN-2026-00005` |
| Second run / replay | **UPDATE** same Quotation (`created_on_replay=false`) |
| Duplicate count | **1** Quotation |
| GET read-back | MUR 45,000, conversion_rate 1, `CF-RD-LANDING-RESCUE`, Standard Selling, terms **name** `CF882 CorpFlowAI Commercial Terms`, valid till 2026-09-09, taxes none, opportunity `CRM-OPP-2026-00003`, `docstatus=0` Draft, TEST-ONLY title. **#1196 later GET:** `quotation.terms` body was empty, so the 36,114-byte PDF did not print assumptions/exclusions/seller identity. See `docs/erpnext/ERPNEXT_MUR_QUOTATION_CLIENT_DOCUMENT_V1.md`. |
| PDF | `Quotation Standard`, 36,114 bytes, `%PDF-1.4`, sha256 prefix `299ad3c9d8c4582a` |
| #882 reuse | MUR QTN `SAL-QTN-2026-00003` + SI `ACC-SINV-2026-00001`; USD QTN `SAL-QTN-2026-00001` + SI `ACC-SINV-2026-00002` (47.15) all still Draft |
| Proceed Approved | Invoice `ACC-SINV-2026-00001` does **not** set `financially_approved`; blockers include acceptance, payment evidence, and named approver |
| Artifact | `artifacts/erpnext/selling-quote-to-cash-1056/apply-log.json` |

`MASTER_ADMIN_KEY` was **ABSENT**. ERPNext secrets present by **name** only.

---

## 8. Explicit non-actions

No real client quotation send. No Sales Invoice submit/post. No Payment Entry. No payment gateway. No custom DocType/schema. No CoA/tax/FX mutation. No external email/WhatsApp/SMS. No paid tools. No production Postgres write. No second CRM.

---

## 9. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a — ERPNext sandbox/test write; no Vercel app surface
- Commit deployed: n/a until merge
- Live URLs tested: hosted ERPNext Frappe REST (URL not recorded)
- Expected vs actual result: `SAL-QTN-2026-00005` CREATE then UPDATE; MUR 45,000 draft; PDF 36,114 bytes; SI posting blocked by #1055
- Client-facing flow usable: NO — synthetic drafts only; no external send
- Final verdict: PARTIAL — selling quotation proven; quote-to-cash posting blocked by #1055
```
