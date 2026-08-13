# ERPNext Commercial Documents & Multi-Currency v1 — quote/invoice readiness

**Status:** Live sandbox/test proof on hosted ERPNext. **READY** for synthetic commercial documents. **No custom DocTypes. No tax/bank/FX-integration changes. No client sends. No submit of synthetic documents.**  
**Issue:** [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882)  
**Parents:** [#551](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/551), [#714](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/714), [#766](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/766)  
**Prerequisites:** [#880](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/880) READY · [#881](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/881) READY (PR #915) · [#879](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/879) access proven  
**Environment:** hosted ERPNext test (`CorpFlowAI LTD`, company currency **MUR**)  
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
ERPNext Commercial Documents READY
```

MUR and USD quotations plus draft Sales Invoices render from ERPNext Customer + #881 Item Price masters, with company identity (`finance@corpflowai.com`, Tax ID `28466939`, Company No `C25228280`), standard Terms, and Anton-supplied Currency Exchange **USD→MUR = 47.15**. All synthetic documents remain **`docstatus=0`**. Do not send to clients. #714 financial approval-to-build stays outside ERPNext.

---

## Required return

```text
ERPNext Commercial Documents READY

Current state: hosted ERPNext as integrations@corpflowai.com; main reconciled; #881 catalogue consumed
Company: CorpFlowAI LTD / CFAI / MUR / tax_id=28466939 / Company No : C25228280 / finance@corpflowai.com
Currency Exchange: USD→MUR 47.15 (Anton); MUR→USD 0.021 also present
USD receivable: Debtors USD - CFAI (standard Account under Accounts Receivable)
Synthetic Lead Rescue quotation: SAL-QTN-2026-00001 (USD 249, conversion_rate=47.15, base_grand_total=11740)
Synthetic Lead Rescue USD invoice draft: ACC-SINV-2026-00002 (docstatus=0)
Synthetic Website Rescue quotation: SAL-QTN-2026-00003 (MUR 45,000 Item Price)
Synthetic Website Rescue MUR invoice draft: ACC-SINV-2026-00001 (docstatus=0)
Print evidence: artifacts/erpnext/commercial-documents-882/
#714: ERPNext never sets financially_approved
Anton required now: NO for commercial-document capability — merge PR #924; still do not submit/send synthetic drafts
```

---

## Proof matrix

| Document | Currency | Price list / rates | conversion_rate | base total | Status |
| --- | --- | --- | --- | --- | --- |
| `SAL-QTN-2026-00003` | MUR | Standard Selling / Item Price 45,000 | 1.0 | 45,000 | Draft |
| `ACC-SINV-2026-00001` | MUR | same | 1.0 | 45,000 | Draft |
| `SAL-QTN-2026-00001` | USD | Standard Selling USD / 150+99 | **47.15** | **11,740** | Draft |
| `ACC-SINV-2026-00002` | USD | same; debit_to `Debtors USD - CFAI` | **47.15** | **11,740** | Draft |

PDFs show DRAFT, CorpFlowAI LTD registered office, `finance@corpflowai.com`, Tax ID / Company No, terms including #714 fail-closed wording.

---

## What unlocked READY

1. Anton created Currency Exchange **USD → MUR = 47.15** (selling). MUR→USD alone was **not** enough; live `get_exchange_rate(USD→MUR)` then returned 47.15.
2. Standard **Debtors USD - CFAI** receivable Account was required for USD Sales Invoice (MUR `Debtors - CFAI` rejects mismatched document currency). No custom DocType.
3. #881 Item Prices / Standard Selling USD already live.

---

## Non-actions still in force

- No submit / no client send of synthetic drafts
- No tax template / bank / payment mutation
- No FX integration (Frankfurter etc.)
- No CorpFlowAI DB/schema / env/secrets changes
- Prestige Procurement still needs separate price/scope decisions before a live client quote

---

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a — ERPNext sandbox/test documents; no Vercel customer surface
- Commit deployed: n/a until merge
- Live URLs tested: n/a — hosted ERPNext API/PDF
- Expected vs actual result: MUR + USD quote/invoice drafts from masters with Anton FX 47.15 and identity/terms on PDFs
- Client-facing flow usable: NO — synthetic drafts only; no external send
- Final verdict: PARTIAL for client send (intentionally); READY for ERPNext commercial-document capability
```
