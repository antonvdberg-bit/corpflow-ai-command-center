# CorpFlowAI Professional Quotation

Canonical source for the ERPNext custom Print Format named
`CorpFlowAI Professional Quotation` (`Quotation`, Jinja).

Application path:

1. Open ERPNext **Print Format** and select `CorpFlowAI Professional Quotation`.
2. Keep **Print Format Type** as `Jinja`; replace only the HTML with
   `corpflowai-professional-quotation.html`.
3. Save without changing Letter Head, Print Settings, standard formats, or
   quotation data.
4. Render both `SAL-QTN-2026-00006` (Lead) and `SAL-QTN-2026-00005`
   (Customer) through the ERPNext PDF endpoint.

The template uses the approved repository mark at
`/public/brand/corpflowai/corpflowai-mark.png` through the deployed public
asset URL. It deliberately uses standard Quotation fields and falls back from
`address_display` to the linked customer address. It does not convert Leads to
Customers or expose internal Lead IDs as the Bill To name.

This is a quotation-only Phase 1 implementation. Invoice, Sales Order and
other document families remain out of scope until the quotation visual standard
is reviewed.
