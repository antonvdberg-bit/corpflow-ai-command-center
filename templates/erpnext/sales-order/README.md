# CorpFlowAI Professional Sales Order

Canonical source for the ERPNext custom Print Format named
`CorpFlowAI Professional Sales Order` (`Sales Order`, Jinja).

The template uses standard customer, address, contact, transaction/delivery
date, currency, item, tax, total and terms fields. The ERPNext order status is
shown directly, with a docstatus fallback, so the document cannot silently
present a cancelled or draft order as accepted.

Application and verification:

1. Create or update only the custom ERPNext Print Format with this name,
   `DocType = Sales Order`, `Type = Jinja`, and this HTML.
2. Read back the Print Format HTML and compare it with this file after
   normalizing line endings and surrounding whitespace.
3. Render any existing safe Sales Order through the native ERPNext PDF
   endpoint. Do not create, submit, cancel, amend or delete a record merely
   for visual testing.

No tax, bank, payment, statutory, or missing-identity content is invented.
