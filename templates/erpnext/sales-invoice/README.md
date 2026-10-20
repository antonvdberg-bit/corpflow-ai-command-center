# CorpFlowAI Professional Sales Invoice

Canonical source for the ERPNext custom Print Format named
`CorpFlowAI Professional Sales Invoice` (`Sales Invoice`, Jinja).

The title is state-aware: a draft is presented as `Pro-forma Invoice`, while
submitted and cancelled documents retain the `Sales Invoice` identity and show
their ERPNext state. The template uses standard customer, address, contact,
date, item, tax, total, outstanding, terms and remarks fields only. Its
trading identity is selected automatically from each item's native
`item_group` ancestry: `CorpFlowAI Services` renders CorpFlowAI and
`Business Admin Desk Services` renders Business Admin Desk. Mixed roots,
unknown roots, and unclassified rows render `BRAND CLASSIFICATION ERROR /
NOT CLIENT-READY` instead of silently choosing a brand.

Application and verification:

1. Create or update only the custom ERPNext Print Format with this name,
   `DocType = Sales Invoice`, `Type = Jinja`, and this HTML.
2. Read back the Print Format HTML and compare it with this file after
   normalizing line endings and surrounding whitespace.
3. Render any existing safe draft or submitted Sales Invoice through the
   native ERPNext PDF endpoint. Do not create, submit, cancel, amend or delete
   a record merely for visual testing.

No tax, bank, payment, statutory, or missing-identity content is invented.

The deterministic routing contract is covered by
`node-tests/erpnext-selling-document-brand-routing.test.mjs`, using the live
leaf groups `CF Website Rescue`, `BAD Administration`, and `Services`.

After applying the Print Format in ERPNext, verify both a CorpFlowAI-only and a
Business Admin Desk-only existing safe record, then verify a mixed or unknown
record fails closed before any client release. No invoice record may be
created, submitted, cancelled, amended, deleted, paid, or otherwise changed
for this verification.
