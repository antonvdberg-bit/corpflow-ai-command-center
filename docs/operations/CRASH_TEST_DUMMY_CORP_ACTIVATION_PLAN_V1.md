# Crash Test Dummy Corp (CTDC) — ERPNext internal simulation company

**Approved CEO direction (30 October 2026):** Reuse the existing ERPNext installation, not a second app or database. Dedicated clearly non-trading company: **Crash Test Dummy Corp**, abbreviation **CTDC**, base currency **MUR**. This is a Core reusable testing facility for CorpFlowAI and Business Admin Desk, not a legal subsidiary. Link existing #1504 programme.

## Activation checklist
1. **Inventory first, read only**: enumerate ERPNext Companies and existing synthetic customers, chart defaults, naming/abbreviation collisions, permissions, website/payment integrations, outgoing communications and cross-company consolidated reports. Don't duplicate a CTDC if it exists.
2. **Accounting controls**: verify independent CTDC chart/ledger and fiscal-year defaults, and that every real-world, consolidated/statutory, customer aging, tax and executive report is explicitly filtered to real Company. Identify unfiltered report hazards. Use fake bank details only; do not connect live merchant/bank/payment integrations.
3. **Data and execution isolation**: synthetic Contacts/Customers, items/projects and Company-specific defaults must not change real client master data or payment/email automations. All tests visibly internal and never externally addressed.
4. **Setup approval and accountant checkpoint**: before altering production ERPNext company/config/data, obtain or reuse exact scoped CEO authorization and accountancy review of simulation entity treatment. No assumption that the synthetic company is a registered legal person or that tax reporting auto-excludes it.
5. **Activation test**: inspect CTDC Company readback, separate P&L/Balance Sheet/GL, real CorpFlowAI reports before/after, dummy quotations and project estimates; submitted fake finance postings only after proved isolation and explicit approval. Document reversals/cleanup and report test evidence.
6. **Acceptance**: `OPERATIONAL` only after all required readbacks and exclusion demonstrations pass, not when the Company record merely exists.

## Current evidence/gap
Authorised laptop `2024-LTPAvdBerg` is online, but current remote process has no injected ERPNext API environment; available ChatGPT connectors do not provide authenticated ERPNext operations. Therefore **not created or deployed in ERPNext**. Do not claim Company existence or reporting separation until verified.

## Non-actions
No new production app/database, no paid tools, no secret extraction, no real payments, no external sends. GitHub branch work is documentation only, pending review/merge.
