## Context

Zoho Books exposes invoice lists through a paginated API, while the public statement
example reads only the first page. The requested outcome is preparation for native
verification, not a new CorpFlowAI runtime or an autonomous communication path.

## Decisions

- Keep calculation in a pure CommonJS module so synthetic tests do not require Zoho,
  credentials, network access, or client data.
- Treat `page_context` as an attestation chain: start at page 1, require exact page,
  numbers, require each invoice collection to be a list no larger than both its
  attested `per_page` and the hard 200-record limit, stop at 10 pages, and fail closed
  on missing/error/truncated context. An empty first final page is the only valid empty
  page; empty continuing and later pages are rejected.
- Select `sent`, `overdue`, and `partially_paid` invoices with positive native balances.
  Exclude future dates and non-unpaid statuses. Do not net credits into invoices.
- Keep the Deluge artifact disabled and preparation-only. It returns bounded status
  metadata and never creates, updates, sends, schedules, or logs sensitive records.
- Use the organisation-local native date only in the draft; capture it once, derive the
  90-day minimum once, and use an explicit date in the planner for deterministic tests.
- Establish currency from the Books customer context or an explicit custom-function
  input. Never use the organisation base currency as a silent fallback.
- Use an explicit ten-item list in Deluge for bounded `for each` iteration instead of
  a numeric-range loop or JavaScript-style `while`. Guard the collection before
  iteration and wrap the whole `for each` boundary as well as each entry; native editor
  compilation remains a required manual gate.

## Risks and mitigations

- Native Deluge context and syntax have not been executed here; README marks this as an
  exact follow-up gate and forbids claiming live compatibility. Official Deluge type
  checks do not document an `isList()` predicate, so scalar rejection, collection
  operations, and the full iteration boundary are bounded here while the empty
  map-versus-list distinction remains a native compile/test question.
- API response fields may be malformed or contradictory; planner and draft fail closed
  rather than silently dropping history.
- Credits and multi-currency balances cannot be inferred from gross invoice totals;
  native reconciliation remains mandatory.

## Rollback

Delete or close the reviewable branch/PR. No runtime or production artifact is changed.
