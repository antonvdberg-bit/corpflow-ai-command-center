# ERPNext bank / reconciliation readiness — onboarding packet F

**Status:** Decision-ready operating model (docs / mapping / GET-only read-back). **No live bank or accounting truth.** Current-main landing: **ERPNext BANK/RECONCILIATION CURRENT-MAIN READY FOR ACCOUNTANT CONFIGURATION.**  
**Current-main landing:** [#1220](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1220) — brings the already-proven #1139 / closed [PR #1141](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1141) packet onto current `main` (`ea2a45a90a4fde7043b89989e985194da3605bff`) after CURRENT-MAIN REPAIR. Do not merge #1141 or closed stale [PR #1221](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1221). Do not revive branch `cursor/factory-handoff-issue-1220-0e80`.  
**Source proof:** [#1139](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1139)  
**Parents:** [#1054](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1054) (completion controller), [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953) (programme), [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918) (reconciliation controller)  
**Accounting dependency:** [#1055](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1055) accountant-approved Company & Accounting Foundation  
**Reuse:** [#882](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/882) commercial documents, [#551](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/551) / [#714](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/714) payment-evidence and Proceed Approved controls, [#1166](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1166) selling fail-closed invoice gate, Phase C synthetic recon arithmetic, standard ERPNext accounting/banking  
**Environment:** `corpflow_test` hosted ERPNext + CorpFlowAI synthetic/offline fixtures only  
**Owner:** Cursor (this packet); accountant (ledger/cutover policy); Anton (protected mutations)  
**Machine contract:** `config/erpnext-bank-reconciliation-readiness.v1.json`  
**Helper:** `lib/erpnext/bank-reconciliation-readiness.js`  
**Operator runbook:** `docs/runbooks/ERPNEXT_BANK_RECONCILIATION_OPERATOR_RUNBOOK_V1.md`  
**Anchor:** `<!-- ERPNEXT_BANK_RECONCILIATION_READINESS_V1 -->`

<!-- ERPNEXT_BANK_RECONCILIATION_READINESS_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1220
Prior proof: #1139 / PR #1141
```

**NO IMPLEMENTATION AUTHORIZED** for real Bank Account create/edit, Payment Entry submit, live Bank Transaction, bank-feed/credential connection, GL posting, opening balances, tax/VAT mutation, schema/custom DocTypes, env/secrets, payment initiation, external send, paid tool, or public/client launch.

`ANTON ACTION: NONE` for this bounded packet.

---

## 0. Verdict

```text
ERPNext BANK / RECONCILIATION READINESS READY FOR ACCOUNTANT CONFIGURATION
ERPNext BANK/RECONCILIATION CURRENT-MAIN READY FOR ACCOUNTANT CONFIGURATION
```

#1220 does **not** redesign the operating model. It lands the already-proven #1139 helper, runbook, synthetic fixture, and GET-only read-back onto current `main`. Live Bank Account / Payment Entry / Bank Transaction mutation was **not** done.

This verdict means CorpFlowAI now has a **minimum standard-ERPNext bank/reconciliation operating model** on current `main`, a **manual/import-first process**, **synthetic/offline proof** that matching is idempotent, and a **named accountant input list**. It does **not** mean books can be posted. It does **not** mean a live bank is connected.

Anton required now: **NO**. Merge of this PR is still a human decision. No schema, send, payment, Payment Entry submit, Chart of Accounts mutation, bank-feed connection, or `client_production`.

| Question | Answer now |
|----------|------------|
| Can operators collect payment evidence today? | **Yes** — #551 / #714 rail. Opaque references only. |
| Does that evidence post a Payment Entry? | **No.** `PAYMENT_EVIDENCE_NEVER_AUTHORIZES_PAYMENT_ENTRY`. |
| Are hosted-test bank ledgers accountant-approved? | **No.** #1055 still owns CoA / bank-cash structure. Template cash leaf exists; Company default bank is unset. |
| Direct bank-feed for initial operation? | **NOT REQUIRED.** Manual CSV/Excel import first. |
| What must Anton do because of this packet? | **Merge this current-main PR when satisfied.** Close stale PR #1141 and closed stale PR #1221 without merge. No bank, payment, or accountant ceremony is created here. |

Target future path (not executed here):

```text
Sales/Purchase accounting record
  -> payment evidence
  -> approved Payment Entry path
  -> bank transaction / import
  -> reconciliation
  -> exception review
```

---

## 1. Reused evidence (do not redo)

| Packet | What it already proved | Do not repeat |
|--------|------------------------|---------------|
| #1055 (open PR #1057) | Company `CorpFlowAI LTD` / CFAI / MUR; Accounting Onboarding still 0/6; template CoA present; **Bank Account doctype 0 rows**; default cash template leaf `Cash - CFAI`; default bank **unset** | Invent a Mauritius CoA or SBM ledger |
| #882 | Draft MUR/USD quotations and Sales Invoices; Currency Exchange USD→MUR fail-closed at 1.0; ERPNext never sets `financially_approved` | Submit/send invoices |
| #551 / #714 | Payment evidence + acceptance + named approver → `financially_approved` build gate | Treat the gate as GL/payment authority |
| Phase C cycle 3 | Synthetic 3-line MUR statement reconciled to **delta 0.00** against PE `ACC-PAY-2026-00002` + JEs `ACC-JV-2026-00002` / `00003` | Manufacture a live hosted-test bank transaction to re-prove arithmetic |
| Accountant review pack §8 | CSV/Excel → Bank Reconciliation Tool; no bank credentials in ERPNext; Q-Bank-1..4 unanswered | Guess cadence, fee accounts, or retention |
| #918 matrix `payment_evidence` | Needs bridge; **blocked** until financial-rail + bank clearance | Auto-create Payment Entry from `payment_records` |
| #1098 Buying/AP | Invoice existence never authorizes supplier payment | Duplicate a second payment rail |

Older sandbox names such as `Mauritius Domestic Bank - Main - CFS` belong to the **self-hosted sandbox** (`corpflow-exec-01` loopback). They are **not** hosted-test CorpFlowAI books and are not copied onto the vendor site by this packet.

---

## 2. Standard ERPNext objects audited

Inspected as metadata + GET-only hosted-test lists. Presence/state only.

| Object | Role in the model | Inspect posture |
|--------|-------------------|-----------------|
| Account (Bank / Cash) | GL linkage for later Payment Entry `paid_to` / `paid_from` | Names, type, group/leaf, parent. No create/rename. |
| Bank | Bank master | Name presence. No credentials. |
| Bank Account | Statement import home; links to GL Account | Row count + safe name/type. Private numbering keys recorded as present/absent only. |
| Mode of Payment | How money moved (Wire / Cash / etc.) | Name + type. Custom SBM wire **not** created here. |
| Payment Entry | Later accountant-approved posting | Count/docstatus only. Submit forbidden. |
| Bank Transaction | Imported or captured statement line | Count only. No live create. |
| Bank Reconciliation Tool | Standard match UI / report | Capability reused from ERPNext + Phase C arithmetic. Hosted-test UI not invoked in this packet. |
| Payment Terms / Payment Terms Template | Readable only if permitted | HTTP 403 on Payment Terms is an existing #1019/#882 permission fact, not a missing DocType. |
| Journal Entry | Later fee / exception / FX posting | Count only. Not created. |
| Naming series | Payment Entry `ACC-PAY-.YYYY.-` already used on hosted-test drafts/sandbox evidence | Recorded; not changed. |

---

## 3. Current safe access / state summary

GET-only probe as `integrations@corpflowai.com`. #1139 recorded this on 2026-08-27. #1220 re-probes GET-only against the same hosted-test site from current `main` `ea2a45a90a4fde7043b89989e985194da3605bff` after CURRENT-MAIN REPAIR (generation 2). Host URL is not recorded. `MASTER_ADMIN_KEY` unused.

| Item | State |
|------|-------|
| Site versions | frappe **16.31.0** / erpnext **16.32.3** |
| Company | `CorpFlowAI LTD` / CFAI / Mauritius / MUR |
| Default cash | `Cash - CFAI` (template leaf — **not** accountant-approved) |
| Default bank | **unset** |
| Chart of Accounts | 96 accounts (template). Bank/Cash: group `Bank Accounts - CFAI`, group `Cash In Hand - CFAI`, leaf `Cash - CFAI`. **No operating bank leaf.** |
| Bank master | HTTP **403** (PermissionError) — not required for this mapping packet |
| Bank Account | HTTP 200, **0 rows**. No credentials stored. |
| Mode of Payment | 5 standard: Bank Draft, Cash, Cheque, Credit Card, **Wire Transfer**. No custom SBM mode created. |
| Payment Entry | **0** rows. None created or submitted. |
| Bank Transaction | **0** rows. None manufactured for the proof. |
| Journal Entry | **0** rows |
| Payment Terms | HTTP **403** (existing #1019/#882 permission fact) |
| Payment Term / Payment Terms Template | HTTP 200, **0** rows |
| Bank Clearance | HTTP **500** ProgrammingError — do **not** use. v1 path is Bank Transaction import + Bank Reconciliation Tool. |
| Currency Exchange | **2** rows (reuse #882 USD↔MUR). Do not invent rates. |

This matches #1055: Accounting Onboarding remains incomplete; template cash exists; no CorpFlowAI operating bank ledger; no Bank Account master rows.

---

## 4. Manual / import-first process

Owner split is the control:

| Stage | Who | What happens | What does **not** happen |
|-------|-----|--------------|---------------------------|
| 1. Invoice/bill exists | Operator | Reuse #882 draft SI (or later PI from #1098) | Submit is still protected where it posts GL |
| 2. Payment evidence received | Operator | Fill `PAYMENT_EVIDENCE_RECORD.md` / Prospect panel. Opaque ref only | No bank login, no full account numbers, no card data |
| 3. Operator verification | Anton | Bank dashboard: amount, payer, **cleared**, reference, not duplicate | POP screenshot is not verification |
| 4. #551 / #714 rail | Anton | `financially_approved` if evidence complete | ERPNext is not updated by the rail. Build may start. **Payment Entry stays unapproved.** |
| 5. Later Payment Entry | Accountant + Anton | After #1055 bank/cash ledgers: Receive/Pay, allocate to invoice, mandatory `reference_no` + `reference_date` | This packet does not create or submit |
| 6. Statement import | Operator | Export CSV/Excel from the bank UI; redact private numbering; import into Bank Transaction / Reconciliation Tool | No bank API, no stored credentials |
| 7. Reconciliation | Operator + accountant review | Match lines to PE/JE by reference + amount + date | Force-match unknowns |
| 8. Exception review | Anton + accountant | Hold unmatched; later fee JE if approved | Period close while delta or unknowns remain |

Matching rule (also in the helper): **search existing PE/JE first**. Replay of the same statement must yield the same matches. Do **not** create a live Bank Transaction merely so a test can pass.

Proposed numeric tolerances (accountant must confirm): closing-balance delta **MUR 0.01**; unmatched lines **halt close**.

---

## 5. Synthetic / offline proof

Fixture: `fixtures/erpnext-bank-reconciliation-readiness/synthetic-statement.v1.json`  
Reuse: Phase C cycle 3 arithmetic — **not** a live hosted-test bank statement.

| Line | Amount MUR | Matched to | Result |
|------|------------|------------|--------|
| Wire in | Cr 6,705 | Payment Entry `ACC-PAY-2026-00002` | matched |
| Internal transfer in | Cr 6,645 | Journal Entry `ACC-JV-2026-00002` | matched |
| Bank fee | Dr 150 | Journal Entry `ACC-JV-2026-00003` (fee exception) | matched as exception-type `bank_fee` |

- Expected closing **MUR 13,200**  
- Delta **0.00**  
- Second replay identical (idempotent)  
- `live_bank_transaction_created = false`

Honest limit (unchanged from Phase C / HB-4): this proves **mapping + arithmetic + guards**. It does **not** close the later redacted-real-statement UI cycle. That remains a **protected / operator** follow-up after real activity exists.

---

## 6. Direct bank-feed verdict

```text
NOT REQUIRED
```

Initial CorpFlowAI receipts are manual bank transfers at low volume (about 1–10 invoices/month). Standard ERPNext import + Payment Entry matching is enough. No evidence in #1139, #1054, or Phase C that a live feed is an operational need.

A later **REQUIRES LATER DECISION** is allowed if volume, unmatched rate, or the accountant asks for connectivity. Connecting a feed stays a **protected** action (credentials, possibly paid). This packet does not connect, trial, or buy anything.

---

## 7. Exact accountant inputs still required after #1055

These are questions, not invented answers:

1. **Approved bank/cash ledger accounts** — MUR operating, USD receipts if used, petty cash. Template `Cash - CFAI` is not sign-off. Company default bank is unset.  
2. **Clearing / undeposited-funds treatment** — post direct to operating bank vs a clearing account until statement match (`Mode of Payment.account` / `Payment Entry.paid_to`).  
3. **Exchange-rate treatment** — book rate vs receipt rate for foreign-currency receipts/payments; realised FX; never 1.0 USD=MUR. Reuse #882 fail-closed Currency Exchange.  
4. **Bank charges/fees** — one fees expense account vs split maintenance / wire / FX-spread (Q-Bank-3).  
5. **Reconciliation cut-off / cadence** — proposed monthly close within 5 business days; MUR 0.01 tolerance; unmatched lines halt close (Q-Bank-1/2/4).  
6. **Opening / cutover bank balances** — packet G under #1054. Do not post opening entries here.

---

## 8. Exact protected actions remaining

- Real Bank Account or ledger Account create / rename / edit  
- Payment Entry create / submit  
- Live Bank Transaction against real funds  
- Bank credentials or any feed connection  
- Journal Entry posting (fees / exceptions / FX)  
- Tax / VAT mutation  
- Opening balances / cutover (packet G)  
- Schema / custom DocTypes  
- Env / secrets  
- Payment initiation, external send, paid tool, public / `client_production` launch  

---

## 9. Confirmation — private banking values

This packet records **no** bank credentials, international bank identifiers, account numbers, routing/sort codes, login IDs, or masked private values. Probe artifact keys are names/types plus `*_present` flags.

---

## 10. Cross-references

- Operator runbook: `docs/runbooks/ERPNEXT_BANK_RECONCILIATION_OPERATOR_RUNBOOK_V1.md`  
- Earlier sandbox guides (not hosted-test books): `docs/erpnext/ERPNEXT_BANK_RECONCILIATION_GUIDE.md`, `docs/erpnext/ERPNEXT_BANK_CLEARANCE_AND_PAYMENT_ENTRY.md`  
- Accountant pack §8: `docs/finance/ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md`  
- Commercial rail: `docs/revenue/COMMERCIAL_APPROVAL_RAIL_V1.md`  
- Payment evidence template: `docs/revenue/templates/PAYMENT_EVIDENCE_RECORD.md`  
- Source-of-truth `payment_evidence` row: `docs/governance/erpnext/SOURCE_OF_TRUTH_MATRIX_V1.md`

GET-only re-probe (current-main #1220):

```text
node scripts/erpnext/audit-bank-reconciliation-readiness.mjs --dry-run
node scripts/erpnext/audit-bank-reconciliation-readiness.mjs
```
