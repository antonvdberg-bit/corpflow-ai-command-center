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

## Product-driven quotation identity routing

The canonical ERPNext Print Format remains
`CorpFlowAI Professional Quotation` (`Quotation`, Jinja). Its HTML now routes
the rendered trading identity from each Quotation Item `item_group`:

- `CorpFlowAI Services` and descendants -> CorpFlowAI presentation;
- `Business Admin Desk Services` and descendants -> Business Admin Desk
  presentation;
- mixed, empty, unknown, or unclassified groups -> prominent
  `BRAND CLASSIFICATION ERROR / NOT CLIENT-READY`.

The routing contract is tested in `quotation-brand-routing.mjs` and
`node-tests/erpnext-business-admin-desk-quotation.test.mjs`. There is no
normal-path manual brand or Print Format choice and no separate Business Admin
Desk Print Format. Both trading identities remain under the single legal
company CorpFlowAI LTD. Business Admin Desk commercial email remains omitted
because no current durable branded address is available.

### Controlled ERPNext apply and read-back

These are pending operator-controlled ERPNext actions; this repository change
does not perform them:

1. In ERPNext, update the existing Jinja Print Format
   `CorpFlowAI Professional Quotation` for `Quotation` by pasting
   `corpflowai-professional-quotation.html`.
2. Confirm the format is linked to the existing `CorpFlowAI LTD` company and
   do not create a company, app, DocType, renderer, permission, Item, or Item
   Group as part of this packet.
3. Ensure Business Admin Desk services are classified below the native
   `Business Admin Desk Services` Item Group root. Read back the saved Print
   Format HTML and Item Group values.
4. Create or select safe draft quotations containing CorpFlowAI-only and
   Business Admin Desk-only rows, plus mixed and unknown/unclassified fixtures.
   Do not send or release them.

### Physical PDF proof

Use ERPNext's standard quotation PDF endpoint with the saved format and inspect
the physical PDF at normal zoom and page boundaries. Confirm the mark, title,
seller identity, legal entity/address, quotation metadata, customer, rows,
currency, totals, terms, and footer are legible. Separately render:

- CorpFlowAI-only rows with the canonical `CorpFlowAI Professional Quotation`,
  confirming CorpFlowAI identity;
- Business Admin Desk-only rows with the same canonical format, confirming
  Business Admin Desk identity;
- mixed rows and an unknown/unclassified row with the same format, confirming
  the prominent fail-closed error and no client-ready branding.

Read back the live Print Format source and compare it with the repository file
before recording proof. Sales Invoice and Sales Order extensions remain out of
scope until this quotation PDF is physically reviewed.
