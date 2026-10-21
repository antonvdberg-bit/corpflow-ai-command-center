# Synthetic order confirmation previews (#1494)

These files are synthetic HTML print previews of the existing ERPNext Sales Order
print format, `templates/erpnext/sales-order/corpflowai-professional-sales-order.html`.

They are not PDFs. Native PDF generation still requires the Print Format
`CorpFlowAI Professional Sales Order` to be applied in ERPNext and rendered
through the ERPNext PDF endpoint. This folder does not record that step.

- `bad-address-change-order-confirmation.html` — synthetic `BAD-ADDRESS-CHANGE` accepted offer, ZAR 69, Business Admin Desk identity, modelled as a submitted Sales Order (`docstatus = 1`).
- `corpflowai-lead-rescue-order-confirmation.html` — synthetic `LR-SETUP-USD-150` accepted standard offer, USD 150, CorpFlowAI identity, modelled as a submitted Sales Order (`docstatus = 1`).

A draft Sales Order with status `Accepted` is not a customer confirmation. That combination is refused by the print format.

No Sales Invoice, Payment Entry, ERPNext write, payment, or customer message was created.
