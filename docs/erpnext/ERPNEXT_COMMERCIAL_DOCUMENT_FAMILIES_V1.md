# ERPNext commercial document families v1

**Issue:** #1435  
**Environment:** `corpflow_test`  
**Status:** Repository contract and deterministic regression checks prepared; live ERPNext apply/read-back remains operator-controlled.

The machine-readable contract is `config/erpnext-commercial-document-families.v1.json`.
It defines these eight exact Print Format names:

| Doctype | Domestic | International |
| --- | --- | --- |
| Quotation | CorpFlowAI Domestic Quotation | CorpFlowAI International Quotation |
| Sales Order | CorpFlowAI Domestic Sales Order | CorpFlowAI International Sales Order |
| Payment Request | CorpFlowAI Domestic Deposit Request | CorpFlowAI International Deposit Request |
| Sales Invoice | CorpFlowAI Domestic Sales Invoice | CorpFlowAI International Sales Invoice |

The actual Jinja sources and guarded operator-application manifest are:

- `config/erpnext-commercial-print-formats.v1.json`
- `templates/erpnext/commercial-print-formats/`

The manifest is deliberately declarative. It neither calls ERPNext nor grants
permission to create, update, delete, or enable a live Print Format.

## Selection and banking controls

Domestic is selected only when the company is `CorpFlowAI LTD`, currency is
`MUR`, and billing country is `Mauritius`. Every other transaction is
International. ERPNext automatic Print Format selection is not assumed; the
visible operator control is `custom_commercial_document_family` with only
`DOMESTIC` and `INTERNATIONAL` values.

Bank details must come from exactly one verified `Bank Account` record matching
the company and transaction currency. Missing or ambiguous matches fail closed
for operator review. Account number is read from `bank_account_no`; it is never
reconstructed from IBAN and never sourced from email, phone, address, contact,
or free text.

Before a guarded operator application, the operator must populate and validate
the unresolved `operator_field_map` in
`config/erpnext-commercial-print-formats.v1.json`. It maps the established
canonical semantics (`company`, `currency`, `is_verified`, and
`bank_account_no`) to fields that already exist in the target ERPNext instance;
this package does not assume or create a new custom field. The live mapping
must prove the explicit `is_verified` state and the currency-bearing source
before application. International transfer fields stay blocked until their
existing live sources are mapped too. A missing field, zero account matches,
more than one currency match, blank account number, or unproven map renders
the operator-review block instead of payment instructions.

Domestic formats show only bank, account holder, account number, and payment
reference. IBAN and SWIFT are omitted. International formats may show the
currency-matched bank, account, IBAN, and SWIFT fields.

## Verification boundary

`node-tests/erpnext-commercial-document-families.test.mjs` proves the selection,
currency matching, fail-closed behavior, and forbidden field sources using
synthetic redacted values. It does not mutate ERPNext and does not create
Sales Invoices, Payment Entries, or GL Entries.

`node-tests/erpnext-commercial-print-format-package.test.mjs` verifies all
eight checked-in Jinja sources, their DocType/family manifest mapping, the
strict verified/currency-matched Bank Account lookup, domestic IBAN/SWIFT
omission, and absence of email-derived banking sources. Tests contain no bank
values and do not call ERPNext.

Live ERPNext verification still requires an authenticated operator read-back of
the eight Print Formats and synthetic, non-submitted render checks. No real
bank values belong in GitHub, fixtures, logs, or screenshots.
