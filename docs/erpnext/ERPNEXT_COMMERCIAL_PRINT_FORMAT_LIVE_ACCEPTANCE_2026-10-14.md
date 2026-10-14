# ERPNext commercial print formats — live evidence and completion gate (14 Oct 2026)

**Work item:** [#1435](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1435)  
**Source delivery:** PR #1467, merged to main at `a721548843bfc9053beec67936eb9548b2467bd2`.  
**Decision:** Anton already authorised applying **only the eight named Print Format records**, then read-back and safe render verification. This document does not seek that approval again.  
**Verdict:** SOURCE MERGED / LIVE CONFIGURATION PARTIAL — **not accepted, deployed or operationally complete**.

## What is proven

The repository contains eight Jinja Print Format source files and the declarative manifest at `config/erpnext-commercial-print-formats.v1.json`. Earlier focused synthetic verification reported 19/19 tests passing; this does not prove runtime rendering in ERPNext.

Anton supplied UI evidence on 14 Oct 2026, without an authenticated read API, of:

- Print Format `CorpFlowAI Domestic Quotation` created for DocType `Quotation`, custom HTML/Jinja, initially containing only ERPNext starter markup. Anton later reported selecting **Disabled**. No template source was pasted; no server-side read-back independently verified the disabled state.
- `Bank Account` form for the active SBM MUR transaction account showed `company`, `account`-equivalent **Company Account** link, `bank`, **Bank Account No** and **IBAN**. The account number was corrected manually by Anton after an earlier incorrect email-derived value was discovered. Do not reproduce the account number or IBAN in repository material.
- `Customize Form > Bank Account` showed **no separate Currency or Verified fields** in the visible definition. This is strong UI evidence but not a full API/meta read-back; it must not be turned into an unqualified proof of hidden/internal field absence.
- `Account` record corresponding to the Bank Account's **Company Account** (`1205050`, SBM MUR transaction account) showed company `CorpFlowAI LTD`, account type `Bank`, currency `MUR`, enabled.
- A distinct USD bank ledger account is visible in the chart of accounts; existence of a fully configured, verified USD **Bank Account** record and its international transfer fields is **not proven**.

**Field mapping conclusion:** The corrected source templates no longer access unproven Bank Account fields `currency` or `is_verified`. Currency is read from the linked **Account** record. No compliant explicit bank-account **approval/verification marker** has yet been established, so the source package requires an operator allowlist and remains fail-closed. `is_default`, `is_company_account`, and `disabled == false` are **not substitutes for an explicit bank-payment-details verification decision**.

## Eight exact formats

| DocType | Domestic | International |
| --- | --- | --- |
| Quotation | CorpFlowAI Domestic Quotation | CorpFlowAI International Quotation |
| Sales Order | CorpFlowAI Domestic Sales Order | CorpFlowAI International Sales Order |
| Payment Request | CorpFlowAI Domestic Deposit Request | CorpFlowAI International Deposit Request |
| Sales Invoice | CorpFlowAI Domestic Sales Invoice | CorpFlowAI International Sales Invoice |

**Observed live inventory:** One named Print Format was created manually and reportedly disabled; **zero have an accepted full-template live render**. The existence/state of the other seven formats is not independently verified. Do not conflate the prior API preflight's `0/8 applied` with this later manual creation.

## Smallest safe implementation correction

This is a **runtime template/manifest/test change**, not documentation-only work. Keep the implementation with the existing eight templates and tests; do not introduce a second system, add custom fields merely to satisfy the source code, or hardcode bank numbers.

1. Read live `Bank Account` and linked `Account` **metadata and non-sensitive field names** through an existing authenticated, authorised ERPNext route. Prove the actual link field and `Account.account_currency`/corresponding currency semantic instead of assuming the displayed label is a machine fieldname.
2. Establish an explicit **operator-approved account allowlist or existing approval control**, with evidence tied to a specific company, payment currency and Bank Account identifier; do not treat the mere fact that an account is enabled or marked default as verification. The approved selection mechanism must be deterministic and fail closed on zero or multiple valid candidates. If no existing safe verification mechanism exists, stop at an exact decision gate rather than silently lowering the standard.
3. Correct all eight Jinja sources and the manifest to match the proven existing-field map. Keep the company+currency+Mauritius domestic rule, business-identity routing, item-group classification, forbidden email-derived account field, and family mismatch guards. International needs verified existing IBAN/SWIFT or an explicit fail-closed block.
4. Run focused regression tests with synthetic data and source guards, including ambiguous candidates, wrong company/currency, missing approval, email-looking account numbers, cross-family selection, Domestic IBAN/SWIFT omission, International missing-transfer-data block.
5. Using Anton's recorded existing scope approval, update **only the eight named Print Format records**, retaining them **disabled until read-back and safe non-submitted rendering passes**. Do not alter bank records or create invoices, payment entries, payment requests, GL entries, live messages or client sends. Enabling/using the finished formats is a separate safety acceptance gate within the explicitly approved scope only after verification.
6. Read back all eight; render safe Draft/synthetic examples privately without exposing bank values in output/logs/issue comments. Record generator behavior including the UI's deprecation warning for `wkhtmltopdf` and Chrome support, rather than making an unverified generator change. Capture rollback identity and exact format names.

**Access:** Last proven controller attempt: `/api/method/ping` HTTP 200 and unauthenticated Print Format resource GET HTTP 403. No authenticated ERPNext controller API/write session was established. UI access by Anton does not imply programmatic controller access. Use an already-governed route if present; do not ask for passwords, tokens, secrets or an `.env` in chat.

## Owner, gating and accepted outcome

- **Controller:** evidence reconciliation, documentation, acceptance checklist, existing-route discovery and work routing; no duplicate executor.
- **Cursor (only if existing active task/claim permits handoff):** bounded runtime code/template/manifest/test correction. This is genuine implementation: controller documentation edits alone cannot repair the Jinja runtime semantics. Verify current claims before dispatch, preserve PR #1467 lineage.
- **Infrastructure/access owner:** establish existing authenticated read/update route without exposing or changing credentials; if an access/secret change is needed, request approval only for that exact protected action.
- **Anton:** No renewed authorization for eight-format application is needed. Additional operator decision only if existing payment-account verification cannot be represented safely without new governance/configuration or if a protected access change is unavoidable.
- **Acceptance evidence required:** 8/8 confirmed named live records; exact final code/read-back; safe rendered domestic and international outputs; documented absence of data leak; negative fail-closed cases; no disallowed mutations; rollback path; actual record status. Until then, **PARTIAL**.

## Evidence, supersession and learning

Evidence: operator ERPNext screenshots in the conversation on 14 Oct 2026; GitHub issue #1435; merged PR #1467; current manifest and Jinja sources. Screenshots included private banking material: do **not** attach or reproduce them in GitHub or logs.

**Supersedes:** the assumption that Bank Account has directly queryable canonical `currency` and `is_verified` fields; the historical `0/8 live records` inventory before Anton's manual creation. **Does not supersede:** original international/domestic selection, fail-closed safety requirement, exact eight-format scope or protected-action boundaries.

**Reusable learning (candidate, not promoted):** printed-payment correctness requires field mapping against live DocType metadata, not synthetic source tests or UI-label inference. The distinction between linked ledger account currency and verified bank payment instruction identity must remain explicit. No Postgres learning write or production ERPNext read-back is claimed here.
