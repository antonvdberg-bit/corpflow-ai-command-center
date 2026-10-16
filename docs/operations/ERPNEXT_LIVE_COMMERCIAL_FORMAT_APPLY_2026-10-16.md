# ERPNext live commercial formats — controlled application evidence (16 October 2026)

**Work items:** #1435, #1477  
**Repository source:** PR #1478 (linked-Account currency correction), following merged PR #1467  
**Status:** `PARTIAL — live configuration applied and privately PDF-rendered; public Docker identity, encrypted-backup recency, and host-level rollback remain unverified.`

## Verified public application

- The canonical public ERPNext origin returned HTTPS `200`.
- The existing authenticated ERPNext route resolved to that same public origin.
- The public application contains one Company, seven Customers, commercial records across Quotation, Sales Order, Payment Request, and Sales Invoice, and one CorpFlowAI company Bank Account.
- The Bank Account is linked to an `Account` whose currency is `MUR`; it is an SBM company account with both account-number and IBAN fields populated. No values are recorded here.
- No CorpFlowAI-linked USD Bank Account exists in the live dataset. International transfer instructions must therefore stay fail-closed.
- The ERPNext scheduler status endpoint returned healthy.

This proves that the live public URL serves the populated commercial dataset. It does **not** prove which Docker compose project or Frappe site name currently serves it.

## Applied Print Formats

The following eight records were created or updated through the existing authenticated ERPNext API, read back immediately, and left **disabled** after verification:

| DocType | Domestic | International |
| --- | --- | --- |
| Quotation | CorpFlowAI Domestic Quotation | CorpFlowAI International Quotation |
| Sales Order | CorpFlowAI Domestic Sales Order | CorpFlowAI International Sales Order |
| Payment Request | CorpFlowAI Domestic Deposit Request | CorpFlowAI International Deposit Request |
| Sales Invoice | CorpFlowAI Domestic Sales Invoice | CorpFlowAI International Sales Invoice |

All eight records are custom Jinja Print Formats with a matching DocType and the intended disabled state. One pre-existing starter Quotation format was updated; the other seven were created.

The templates select only one CorpFlowAI `SBM Bank` company Bank Account with a nonempty account number, and obtain currency from the linked `Account.account_currency`. Zero or multiple matches fail closed. Domestic formats omit IBAN and SWIFT. International formats remain visibly not-client-ready until a valid USD Bank Account and verified international identifier exist.

## Private render verification

Each format was temporarily enabled only for its render request, produced a valid PDF (`HTTP 200`), and was immediately returned to disabled:

- Domestic: correct-family source documents were available and PDF-rendered for all four DocTypes.
- International: correct-family source documents were available for Quotation and Sales Invoice and PDF-rendered; no matching international Sales Order or Payment Request exists, so those formats were rendered only against a domestic record to exercise the family-mismatch fail-closed path.
- No invoice, payment, GL entry, Payment Request, bank-master record, client communication, or external document send was created.
- No PDF or banking value was retained, logged, or committed.

## Cutover and recovery disposition

No routing change was made. The live public data signature already matches the populated hosted-restore candidate, so a blind traffic cutover would be unsafe and unnecessary.

The Cloud Agent has no trusted SSH host-key entry for `5.78.213.185`. Strict host-key verification correctly rejected the connection before authentication. Consequently, this run could not inspect Docker routing, volumes, encrypted-backup recency, or host-level rollback directly. It did not weaken SSH verification or alter host configuration.

## Remaining acceptance gate

Before enabling or externally using any format:

1. Create and approve the actual SBM USD Bank Account record and verified international identifier, without changing the MUR record.
2. Produce or identify authorised international Sales Order and Payment Request draft records for correct-family render verification.
3. Re-establish a trusted SSH host identity for the existing authorised route, then verify the serving Docker site, encrypted backup, and rollback path without changing traffic.

Until these gates are met, the operational verdict remains `PARTIAL`; international formats are intentionally fail-closed.
