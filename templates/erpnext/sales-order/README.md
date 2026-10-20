# CorpFlowAI Professional Sales Order

Canonical source for the ERPNext custom Print Format named
`CorpFlowAI Professional Sales Order` (`Sales Order`, Jinja).

The template uses standard customer, address, contact, transaction/delivery
date, currency, item, tax, total and terms fields. The ERPNext order status is
shown directly, with a docstatus fallback, so the document cannot silently
present a cancelled or draft order as accepted.

The customer **Order Confirmation / Accepted Service Offer** title is shown only
when `docstatus = 1` (submitted) and the ERPNext status is a submitted
fulfilment status (`To Deliver and Bill`, `To Deliver`, `To Bill`,
`Completed`, or `Accepted`). A draft order (`docstatus = 0`) cannot use that
title even if the status field says `Accepted`; that combination renders
`ORDER STATE ERROR / NOT CLIENT-READY`. Cancelled, closed, on-hold, unknown,
and inconsistent states keep the Sales Order title. The confirmation states
that it is not a tax invoice and not a payment receipt. Synthetic proof may
model a submitted Sales Order in memory; this packet still does not write,
submit, or cancel a live ERPNext order, issue a buyer Sales Invoice, or
create a Payment Entry.
The trading identity is selected automatically from each item's native
`item_group` ancestry: `CorpFlowAI Services` renders CorpFlowAI and
`Business Admin Desk Services` renders Business Admin Desk. Mixed roots,
unknown roots, and unclassified rows render `BRAND CLASSIFICATION ERROR /
NOT CLIENT-READY` instead of silently choosing a brand.

Application and verification:

1. Create or update only the custom ERPNext Print Format with this name,
   `DocType = Sales Order`, `Type = Jinja`, and this HTML.
2. Read back the Print Format HTML and compare it with this file after
   normalizing line endings and surrounding whitespace.
3. Render any existing safe Sales Order through the native ERPNext PDF
   endpoint. Do not create, submit, cancel, amend or delete a record merely
   for visual testing.

Synthetic HTML proof for an accepted standard offer is produced by
`lib/erpnext/accepted-offer-order-confirmation.js`. That preview is not a PDF.
Native PDF remains blocked until this Print Format is applied in ERPNext and
read back through the ERPNext PDF endpoint.

No tax, bank, payment, statutory, or missing-identity content is invented.

The deterministic routing contract is covered by
`node-tests/erpnext-selling-document-brand-routing.test.mjs`, using the live
leaf groups `CF Website Rescue`, `BAD Administration`, and `Services`.

After applying the Print Format in ERPNext, verify both a CorpFlowAI-only and a
Business Admin Desk-only existing safe record, then verify a mixed or unknown
record fails closed before any client release. No order record may be created,
submitted, cancelled, amended, deleted, or otherwise changed for this
verification.
