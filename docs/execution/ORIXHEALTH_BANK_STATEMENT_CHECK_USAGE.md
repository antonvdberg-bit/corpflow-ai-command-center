# OrixHealth bank-statement check

This is a local, read-only validator for a synthetic or privately held CSV export. It produces a dry-run JSON report and never connects to Zoho, writes data, imports rows, reconciles accounts, or sends anything.

## Run

Provide an explicit mapping from validator field names to the exact CSV headers. The validator supports either:

- `date`, `description`, `amount` (signed amount: positive is credit, negative is debit); or
- `date`, `description`, `debit`, `credit` (only one amount may be populated per row).

```bash
node scripts/orixhealth/bank-statement-check.mjs \
  --csv ./private/local-export.csv \
  --mapping '{"date":"Txn Date","description":"Details","debit":"Debit","credit":"Credit"}' \
  --date-format YYYY-MM-DD \
  --decimal-separator . \
  --output ./local-bank-check.json
```

`--output` is optional. Without it, JSON is written to stdout. Existing output files are not overwritten.

Supported date formats are `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, and `D-MMM-YY`; the format is mandatory, so dates are never guessed. `D-MMM-YY` uses a fixed English `Jan`–`Dec` lookup and requires an explicit century start, such as `--two-digit-year-century 2000`. One- or two-digit days are accepted; impossible dates and unknown months are rejected. Amounts accept a decimal point or comma, as explicitly selected. Thousands separators are rejected to prevent silent conversion.

The report contains decimal-safe credit, debit, and net totals, accepted row/source-row references, malformed-row exceptions, and candidate duplicate warnings. Duplicate candidates are never removed automatically.

## Zoho import-review CSV

After successful validation, optionally request a review CSV with exactly `Date,Description,Reference,Debit,Credit` columns:

```bash
node scripts/orixhealth/bank-statement-check.mjs \
  --csv ./private/local-export.csv \
  --mapping '{"date":"Txn Date","description":"Details","reference":"Reference","amount":"Signed Amount"}' \
  --date-format D-MMM-YY \
  --two-digit-year-century 2000 \
  --decimal-separator . \
  --zoho-csv-output ./local-bank-review.csv
```

The `reference` mapping is optional; when omitted, the exported Reference column is blank. The exporter keeps validated rows in source order, preserves duplicates, retains descriptions/references, maps signed withdrawals to Debit and deposits to Credit, uses ISO dates and decimal-dot amounts, and quotes commas, quotes, and newlines correctly. Input and output paths must be distinct, destinations must not already exist, and validation must have no exceptions before any output is created. The CSV is suitable for native import review only: it does not complete an import, match a ledger, reconcile accounts, guess payees/accounts, or post financial data.

## Synthetic verification

```bash
node --test node-tests/orixhealth-bank-statement-check.test.mjs
```

The committed fixture is invented data only:
`fixtures/orixhealth/bank-statement-check.synthetic.json`.

## Evidence boundary

Real MCB header and mapping validation remains **PENDING** until the controller supplies a private local extract. No MCB format, banking rule, reconciliation result, or Zoho import compatibility is claimed by this validator. Any real extract must remain outside GitHub and be reviewed locally under the applicable access and data-handling controls.
