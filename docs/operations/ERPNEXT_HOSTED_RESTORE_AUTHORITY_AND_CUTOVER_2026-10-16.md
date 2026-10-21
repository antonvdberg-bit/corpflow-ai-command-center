# ERPNext live-environment identity and controlled transition — 16 October 2026

## Executive direction
Anton identified the hosted-restore environment as the populated ERPNext data environment and directed the controller to correct operating documentation and prepare its transition to the production-labelled environment. **Do not treat container naming as proof of live URL routing.** Do not switch traffic, rename containers, move databases, change environment variables, or mutate production data on this document alone.

## Read-only evidence observed via existing laptop SSH -> host -> Docker -> Frappe bench
Host: `corpflow-exec-01-u69678` (no credentials recorded).
- `corpflowai-production-backend-1` / site `corpflowai-production.localhost`: 0 Bank Account records, 0 named CorpFlowAI Print Formats; 22 total Print Formats. The application reported ERPNext 15.109.1 and Frappe 15.109.0.
- `corpflowai-hosted-restore-backend-1` / site `corpflowai-hosted-restore.localhost`: Company `CorpFlowAI LTD`, 1 Bank Account linked to a MUR Account (account number and IBAN fields populated), and 5 named CorpFlowAI Print Formats: Domestic Quotation and four Professional formats. No USD Bank Account record identified in this environment.
- No bank account numbers, IBANs, authentication credentials or customer-private data recorded.
- Live hostname routing of `erp.corpflowai.com` to either stack has **not yet been independently verified**. The hosted-restore stack is the populated **candidate source of truth**, not yet a verified cutover destination.

## Required gated transition
1. Read-only confirm reverse proxy / hostname routing, site identities, database volumes, and latest encrypted backup for BOTH stacks.
2. Preserve the populated hosted-restore data and obtain rollback evidence; compare counts and expected business records before any cutover.
3. Prepare a smallest-safe cutover/rename plan with exact commands, rollback and downtime expectations. No production traffic switch, database copy or schema/data mutation without the exact protected approval.
4. Following approved cutover, validate live URL login, Company, customers, bank records, documents, scheduler/jobs, and safe Print Format rendering.
5. Update the environment runbook only after live evidence proves the deployed state; decommission or archive empty stack only with separate verified release.

## Commercial formats — issue #1435
Anton approved SBM MUR company account for Mauritius receipts and SBM USD company account for international direct deposits. Two payment-block variants apply across Quotation, Sales Order, Payment Request/Deposit Request, and Sales Invoice (8 records), with no payment-provider/bank branch/extra transfer instructions. The populated candidate currently has ONLY the MUR Bank Account; an approved USD Account record and its international identifier still require authenticated live discovery or safely gated setup. Fail closed rather than substitute another bank or hardcode financial details. The eight existing templates require correction to use `Bank Account.account` -> `Account.account_currency`; `Bank Account.currency` and `is_verified` are not proven live fields. Use the approved explicit account identities, not a synthetic is_verified field.

## Status and owner
**PREPARED / NOT MERGED / NOT DEPLOYED.** Controller owns evidence and documentation PR. Infrastructure executor owns routing proof and cutover preparation. Anton is not required for more general permission; exact protected deployment approval is required when the cutover command is ready. Reconcile with #1435, #1420 and #1424. No material learning promotion to database claimed.
