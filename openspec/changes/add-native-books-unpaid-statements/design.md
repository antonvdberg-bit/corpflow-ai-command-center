## Context

Zoho Books exposes invoice lists through a paginated API, while the public statement
example reads only the first page. The requested outcome is preparation for native
verification, not a new CorpFlowAI runtime or an autonomous communication path.

## Decisions

- Keep calculation in a pure CommonJS module so synthetic tests do not require Zoho,
  credentials, network access, or client data.
- Treat `page_context` as an attestation chain: start at page 1, require exact page
  numbers, bound each page at 200 records, stop at 10 pages, and fail closed on
  missing/error/truncated context.
- Select `sent`, `overdue`, and `partially_paid` invoices with positive native balances.
  Exclude future dates and non-unpaid statuses. Do not net credits into invoices.
- Keep the Deluge artifact disabled and preparation-only. It returns bounded status
  metadata and never creates, updates, sends, schedules, or logs sensitive records.
- Use the organisation-local native date only in the draft; capture it once, derive the
  90-day minimum once, and use an explicit date in the planner for deterministic tests.
- Establish currency from the Books customer context or an explicit custom-function
  input. Never use the organisation base currency as a silent fallback.
- Use a bounded numeric `for each` range in Deluge instead of JavaScript-style `while`;
  native editor compilation remains a required manual gate.

## Risks and mitigations

- Native Deluge context and syntax have not been executed here; README marks this as an
  exact follow-up gate and forbids claiming live compatibility.
- API response fields may be malformed or contradictory; planner and draft fail closed
  rather than silently dropping history.
- Credits and multi-currency balances cannot be inferred from gross invoice totals;
  native reconciliation remains mandatory.

## Rollback

Delete or close the reviewable branch/PR. No runtime or production artifact is changed.
