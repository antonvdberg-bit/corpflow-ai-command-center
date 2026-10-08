# SBM automated statement intake v1

Status: implementation and review-ready; not installed, scheduled, or enabled on a production host.

The worker retrieves only matching SBM e-statement messages, retains the encrypted
attachment, decrypts an atomic working derivative with `qpdf`, and hands an
optional conversion payload to the existing #1378 normalizer and
`toErpnextBankTransactionPreview()`. It never creates ERPNext records, posts
accounting entries, or mutates Gmail.

## Runtime contract

Required runtime-only values:

- `GMAIL_ACCESS_TOKEN` — short-lived Gmail OAuth access token for the configured mailbox.
- `SBM_STATEMENT_PASSWORD` — SBM PDF password.
- `SBM_FINANCE_ROOT` — finance evidence root; defaults to `./finance` for local use.

No values belong in Git, command arguments, logs, fixtures, or GitHub artifacts.
The qpdf adapter passes the password over the child process stdin using
`--password-file=-`; it is not placed in the process argument list. A host
without qpdf fails closed with `QPDF_UNAVAILABLE`.

## Local acceptance

Use only a synthetic or redacted PDF and payload:

```bash
SBM_STATEMENT_PASSWORD='runtime-only-value' \
SBM_FINANCE_ROOT=/tmp/corpflow-sbm \
npm run finance:sbm-statement-ingest -- \
  --process-local ./path/to/redacted.pdf \
  --payload ./path/to/redacted-1378-payload.json
```

List matching Gmail attachments without downloading or decrypting:

```bash
GMAIL_ACCESS_TOKEN='runtime-only-value' \
npm run finance:sbm-statement-ingest -- --dry-run --lookback-days 31
```

The Gmail query is fixed to:

```text
from:SBM.EStatement@sbmgroup.mu subject:"Account e-statement" has:attachment
```

PDF magic bytes are checked, so `application/octet-stream` is accepted only
when the attachment bytes are actually a PDF. Non-PDF attachments are ignored.

## Storage and idempotency

For a confident statement period, files are placed under:

```text
<finance-root>/<YYYY>/<MM_Month>/01_Bank_Statements/Original/
<finance-root>/<YYYY>/<MM_Month>/01_Bank_Statements/Processed/
```

The original is content-addressed by SHA-256 and never overwritten. Repeated
messages with the same bytes are skipped. The processed PDF is written to a
temporary file, checked by qpdf, and renamed atomically. Email-date-only routing
returns `REVIEW_REQUIRED` without filing.

## Operational gates

Before production enablement, an operator must separately approve and perform:

1. Install and capability-check qpdf on the target worker.
2. Provide the Gmail OAuth token and SBM password through the approved runtime
   secret mechanism; never add values to `.env`, GitHub, or shell history.
3. Choose and verify the finance root and retention/backup policy.
4. Supply a safe PDF-to-#1378 conversion payload/extractor for real statements.
   The code intentionally stops at `PDF_TO_1378_PAYLOAD_REQUIRED` when no
   converted payload is supplied; it does not invent OCR.
5. Run the local acceptance command with synthetic/redacted data, then review
   the generated preview.
6. Separately approve any host installation and scheduler. Scheduling is not
   part of this packet.

ERPNext Bank Transactions, Payment Entries, Journal Entries, invoices, and
other accounting records remain untouched. #1378 arithmetic, running-balance,
fingerprint, and preview logic is reused rather than duplicated.
