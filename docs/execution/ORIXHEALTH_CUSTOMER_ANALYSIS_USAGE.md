# OrixHealth customer purchasing analysis

<!-- ORIXHEALTH_CUSTOMER_ANALYSIS_USAGE_V1 -->

This is a local, read-only analysis utility for normalized invoice exports. It
produces customer and customer/item purchasing summaries plus auditable reorder
candidates. It does not connect to Zoho, import data, write records, create a
mailing list, or send outreach.

## Input contract

Pass a JSON file containing:

- `invoices`: line objects with `invoice_id`, `customer_key`, `invoice_date`,
  `status`, `currency`, `item_key`, `quantity`, and `net_amount`.
- optional `credit_notes`: objects with `credit_note_id`, `invoice_id`,
  `customer_key`, `credit_date`, `currency`, `item_key`, `quantity`, and
  `net_amount`.

Dates must be `YYYY-MM-DD`. Amounts and quantities must be explicit finite
numbers; missing values are rejected rather than treated as zero. Credit notes
must point to an included invoice with the same customer, item, and currency.
They are reported with invoice lineage and subtracted once from currency-
specific totals. They never create an order or repeat interval.

The checked-in CSV adapter maps explicit export headers to this contract before
analysis. Its default headers are `Invoice ID`, `Customer ID`, `Invoice Date`,
`Status`, `Currency`, `Item ID`, `Quantity`, `Line Amount`, and `Invoice
Subtotal`; pass a JSON mapping with `--mapping` when a source uses different
headers. CSV parsing handles BOM, CRLF, quoted commas, and quoted newlines.
IDs remain strings. Each invoice's line amounts are reconciled against its
document subtotal using a configurable decimal tolerance; the subtotal is
never copied to a line. Source file/line references are retained, overlapping
records are rejected, and malformed or incomplete input fails closed.

Do not place client exports, credentials, supplier rates, customer identifiers,
or financial extracts in the repository. The checked-in fixtures are entirely
synthetic. Credits are not inferred or applied by the adapter and remain
pending separate mapping.

## Run locally

```bash
node scripts/orixhealth/customer-purchasing-analysis.mjs \
  --input fixtures/orixhealth/customer-purchasing-analysis.synthetic.json \
  --as-of 2026-06-01 \
  --include-statuses paid,sent \
  --dormancy-days 45 \
  --format json
```

Use `--format csv` for a compact controller-readable candidate table. Every run
must supply explicit `--as-of`, `--include-statuses`, and `--dormancy-days`
classification inputs; draft, cancelled, or other statuses are excluded only
when they are not listed explicitly.

To normalize one or more local exports without connecting to a source system:

```bash
node scripts/orixhealth/invoice-csv-adapter.mjs \
  --input fixtures/orixhealth/invoice-csv-adapter.synthetic.csv \
  --output /tmp/orixhealth-normalized.json
```

Repeat `--input` for contiguous files. The output is local JSON only and must
then be supplied to the existing analysis CLI with explicit as-of, status, and
dormancy arguments. This adapter does not decide dormancy, reorder policy, or
downstream classification.

## Interpretation boundaries

Invoice line rows are grouped by invoice ID for order counts, so multiple lines
on one invoice do not inflate repeat history. Dates are ordered before
intervals are calculated. Currencies are never converted or mixed.

`unknown_insufficient_history` means the report has no observed repeat
interval; it is not an approved business rule or a recommendation to contact a
customer. A candidate retains its as-of date, included statuses, dormancy
threshold, invoice IDs, dates, and line evidence. No approved reorder threshold
is invented here.

This capability is analysis-only. A real client analysis requires a separately
approved safe export, mapping review, and operator/client interpretation.
