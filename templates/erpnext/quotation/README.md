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

## Business Admin Desk quotation

Canonical source for the ERPNext custom Print Format named
`Business Admin Desk Professional Quotation` (`Quotation`, Jinja):

- HTML: `business-admin-desk-professional-quotation.html`
- Routing contract/tests: `quotation-brand-routing.mjs` and
  `node-tests/erpnext-business-admin-desk-quotation.test.mjs`
- expected Business Admin Desk Item Group root:
  `Business Admin Desk Services`

The format is for Business Admin Desk-only product sets. It inspects each
Quotation Item `item_group` and renders a prominent non-client-ready error for
CorpFlowAI, mixed, unknown, or unclassified rows. The separate
`CorpFlowAI Professional Quotation` remains the CorpFlowAI-only presentation.
Both trading identities remain under the single legal company CorpFlowAI LTD.
The template intentionally omits commercial email because no current durable
branded address was available.

### Controlled ERPNext apply and read-back

These are pending operator-controlled ERPNext actions; this repository change
does not perform them:

1. In ERPNext, create/update the Jinja Print Format
   `Business Admin Desk Professional Quotation` for `Quotation` by pasting
   `business-admin-desk-professional-quotation.html`.
2. Confirm the format is linked to the existing `CorpFlowAI LTD` company and
   do not create a company, app, DocType, renderer, permission, Item, or Item
   Group as part of this packet.
3. Ensure Business Admin Desk services are classified below the native
   `Business Admin Desk Services` Item Group root. Read back the saved Print
   Format HTML and Item Group values.
4. Create or select a safe draft quotation containing only Business Admin Desk
   rows. Do not send or release it.

### Physical PDF proof

Use ERPNext's standard quotation PDF endpoint with the saved format and inspect
the physical PDF at normal zoom and page boundaries. Confirm the mark, title,
seller identity, legal entity/address, quotation metadata, customer, rows,
currency, totals, terms, and footer are legible. Separately render:

- CorpFlowAI-only rows with `CorpFlowAI Professional Quotation`;
- Business Admin Desk-only rows with `Business Admin Desk Professional Quotation`;
- mixed rows and an unknown/unclassified row with the Business Admin Desk
  format, confirming the prominent fail-closed error and no client-ready
  branding.

Read back the live Print Format source and compare it with the repository file
before recording proof. Sales Invoice and Sales Order extensions remain out of
scope until this quotation PDF is physically reviewed.
