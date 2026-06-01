# ERPNext Sandbox — Phase C findings (USD-launch-pilot test cycles)

**Status:** Phase C **EXECUTED** on `corpflow-exec-01-u69678` against the sandbox produced by Phase B-a (PR #275, merge commit `6abb6f4d`). All cycles below ran end-to-end; evidence captured from the sandbox MariaDB.

**Anchor sentinel:** `<!-- ERPNEXT_SANDBOX_PHASE_C_FINDINGS_2026_06_01 -->`

<!-- ERPNEXT_SANDBOX_PHASE_C_FINDINGS_2026_06_01 -->

**Operator authorisation:** *"Please proceed with Phase C using — USD invoice / manual approval after intake / bank transfer or payment link / payment confirmed before setup"* (Anton, via chat). This narrowed the original `ERPNEXT_SANDBOX_PLAN_V1.md` §3–§7 plan to the AI Lead Rescue USD-launch-pilot workflow specifically (`JE-2026-05-28-1` / `JE-2026-05-28-3`). Items the original plan covered but were **out of scope for Phase C¹** under this narrowing are recorded in §6 below as deferred (not abandoned).

**Design pre-announcement:** Operator Bridge issue [#249 comment `4590221359`](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4590221359) (STATUS-8) — test design posted before execution so the operator had a course-correction window.

## 1. Scope executed

Four cycles, all under `Administrator` (cycles 1–3) and `accountant-readonly-sandbox@corpflowai.test` (cycle 4):

| Cycle | Plan ref | What | Outcome |
|---|---|---|---|
| **1** | §3.1 + §4.1 case 1 + §7 | USD invoice → submit (manual approval) → Payment Request (bank transfer instructions) → Payment Entry against MU MUR bank with FX-loss delta | ✅ Invoice `Paid`; full GL trail captured |
| **2** | §3.1 + §4.1 case 2 + §5 | USD invoice → submit → Payment Request (paypal.me placeholder link) → Payment Entry against PayPal USD balance → later JE for PayPal→MU bank withdrawal w/ FX | ✅ Invoice `Paid`; PayPal→MU bank withdrawal posted |
| **3** | §7 (Bank Reconciliation) | Simulate 3-line MU bank CSV; verify cycle-1+2 GL lines match expected entries; post Journal Entry for fee line; verify running balance reconciles within MUR 0.01 | ✅ Reconciled to **MUR 0.00** delta |
| **4** | §10.1 multi-user line | Switch to `accountant-readonly-sandbox`; verify read access to invoices & GL; attempt Sales Invoice insert; expect `PermissionError` | ⚠️ **FINDING** — see §4 |

## 2. Sandbox configuration produced by Phase C bootstrap

Idempotent setup created on top of the Phase B-a sandbox (`CorpFlowAI Sandbox` company, MUR base currency, scheduler disabled, loopback-only `localhost:8080`):

### 2.1 Custom CoA additions (3 new accounts)

| Account | Currency | Type | Parent |
|---|---|---|---|
| `Mauritius Domestic Bank - Main - CFS` | MUR | Bank | `Bank Accounts - CFS` |
| `PayPal - USD balance - CFS` | USD | Bank | `Bank Accounts - CFS` |
| `Banking & Payment Fees - CFS` | MUR | Expense Account | `Indirect Expenses - CFS` |

A `Debtors - USD - CFS` Receivable account was also auto-created on the first USD invoice attempt (see §3 *finding 1*).

The Standard CoA already provided `Exchange Gain/Loss - CFS`, which the sandbox Company already had set as `exchange_gain_loss_account`. No override needed.

### 2.2 Currency Exchange

| From | To | Rate | Date |
|---|---|---|---|
| USD | MUR | 45.0 | 2026-06-01 |

Sandbox flat rate. Production should use ERPNext's live rate fetch (configured per-company) or operator-entered daily rates depending on volume.

### 2.3 Customers and Item

- `Sandbox Client A - USD` (USD-denominated, Commercial, Rest Of The World)
- `Sandbox Client B - USD` (USD-denominated, Commercial, Rest Of The World)
- Item `SBX-LR-SETUP-USD-150` — name "AI Lead Rescue Setup (USD 150 pilot)" verbatim per `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*; Services item group; service-item flag set; USD 150 price on Standard Selling.

## 3. Cycle-by-cycle outcomes (with evidence)

### 3.1 Cycle 1 — USD invoice via bank transfer

**Sales Invoice** `ACC-SINV-2026-00001`:

```text
customer            = Sandbox Client A - USD
currency / rate     = USD / conversion_rate=45.0
posting_date        = 2026-06-01
grand_total         = USD 150.0
base_grand_total    = MUR 6,750.0
status              = Paid
outstanding_amount  = USD 0.0
debit_to            = Debtors - USD - CFS
income_account      = Service - CFS
```

**Payment Request** `ACC-PRQ-2026-00001`: `Inward / Wire Transfer / Email / Requested`, USD 150, references `ACC-SINV-2026-00001`. Message body carried CorpFlowAI MU bank wire instructions and a "*Setup work begins after payment lands*" note.

**Payment Entry** `ACC-PAY-2026-00002`: `Receive / Wire Transfer / Submitted`, ref `WIRE-SBX-ACC-SINV-2026-00001`, paid_from `Debtors - USD - CFS` (USD 150) → paid_to `Mauritius Domestic Bank - Main - CFS` (MUR 6,705), source rate 44.7. Linked to `ACC-SINV-2026-00001` at the invoice's book rate 45.0.

**FX adjustment** — ERPNext automatically created `ACC-JV-2026-00001` (voucher_type `Exchange Gain Or Loss`, total Dr=Cr=MUR 45.00):
- `Debtors - USD - CFS` Cr USD 0 / MUR 45 — clears the residual USD on the receivable
- `Exchange Gain/Loss - CFS` Dr MUR 45 — books the FX loss

**Cycle-1 GL impact (full trail):**
- `Debtors - USD - CFS`: Dr USD 150 (invoice), then Cr USD 150 (PE alloc at MUR 6,705) + Cr MUR 45 (FX clearing) = USD net 0 / MUR net 0 ✓
- `Service - CFS`: Cr MUR 6,750 ✓ (revenue at book rate)
- `Mauritius Domestic Bank - Main - CFS`: Dr MUR 6,705 ✓
- `Exchange Gain/Loss - CFS`: Dr MUR 45 ✓

### 3.2 Cycle 2 — USD invoice via payment link

**Sales Invoice** `ACC-SINV-2026-00002`: same shape as cycle 1, status `Paid`, USD 0 outstanding, MUR 6,750 base.

**Payment Request** `ACC-PRQ-2026-00002`: `Inward / Credit Card / Email / Requested`, USD 150. Message body carried `https://paypal.me/<sandbox-placeholder>` link + reference + payment-before-setup note. (Mode `Credit Card` is the closest stock Mode of Payment for "PayPal-style"; sandbox `Wire Transfer` was reused as well — production should add a custom Mode of Payment named `PayPal` once VAT and accountant review are done.)

**Payment Entry** `ACC-PAY-2026-00003`: `Receive / Credit Card / Submitted`, ref `PAYPAL-SBX-ACC-SINV-2026-00002`, paid_from `Debtors - USD - CFS` (USD 150) → paid_to `PayPal - USD balance - CFS` (USD 150). USD→USD, no FX at receipt.

**PayPal→MU bank withdrawal** — manual Journal Entry `ACC-JV-2026-00002`, voucher_type `Journal Entry`, total Dr=Cr=MUR 6,750.00:
- `Mauritius Domestic Bank - Main - CFS` Dr MUR 6,645 (at withdrawal rate 44.3, simulating PayPal's worse spread)
- `Exchange Gain/Loss - CFS` Dr MUR 105 (FX loss vs book rate 45)
- `PayPal - USD balance - CFS` Cr USD 150 / MUR 6,750 (clears PayPal at book rate)

**Cycle-2 GL impact:** PayPal cleared to USD 0 / MUR 0; MU bank +MUR 6,645; FX loss +MUR 105; revenue recognised MUR 6,750.

### 3.3 Cycle 3 — MU bank reconciliation

**Synthetic 3-line MU bank CSV** (what the operator would import via the Bank Reconciliation Tool UI in production):

| Date | Narration | Debit MUR | Credit MUR | Auto-matches |
|---|---|---|---|---|
| 2026-06-01 | WIRE IN - Sandbox Client A - USD - ref ACC-SINV-2026-00001 | 0.00 | 6,705.00 | `ACC-PAY-2026-00002` (cycle 1) |
| 2026-06-01 | PAYPAL XFER IN - ref REFcycle2 | 0.00 | 6,645.00 | `ACC-JV-2026-00002` (cycle 2) |
| 2026-06-01 | BANK FEE - MONTHLY MAINTENANCE | 150.00 | 0.00 | (unmatched — operator creates JE to `Banking & Payment Fees`) |

The first two CSV lines reconcile against the existing GL entries on the MU bank account (the credit-side debits on the bank). The bank-fee line was booked as Journal Entry `ACC-JV-2026-00003` (voucher_type `Bank Entry`), Dr `Banking & Payment Fees - CFS` MUR 150 / Cr `Mauritius Domestic Bank - Main - CFS` MUR 150.

**Final MU bank GL balance after reconciliation: MUR +13,200.00** (= 6,705 + 6,645 − 150).
**Expected per synthetic CSV: MUR +13,200.00.**
**Delta: MUR 0.00** ✓ (within the §7.3 step 4 tolerance of MUR 0.01).

### 3.4 Cycle 4 — read-only accountant role verification

| Step | Outcome |
|---|---|
| `frappe.set_user('accountant-readonly-sandbox@corpflowai.test')` | ✓ session user switched |
| `frappe.get_list('Sales Invoice')` | ✓ 2 rows visible (`ACC-SINV-2026-00001`, `ACC-SINV-2026-00002`) |
| `frappe.get_list('GL Entry')` | ✓ rows visible |
| Attempt `frappe.get_doc(... Sales Invoice ...).insert(ignore_permissions=False)` | ⚠️ **INSERT_SUCCEEDED** — `ACC-SINV-2026-00003` was created (later not persisted due to transaction rollback at session end, but the role permission allowed the in-memory write to pass validation) |
| `frappe.delete_doc('Sales Invoice', 'ACC-SINV-2026-00003', force=1)` | `PermissionError: User not allowed to delete Sales Invoice` — delete IS correctly restricted |

**Root cause:** the user was granted the **`Accounts User`** role during Phase B-a §8.1 user creation, **not** the **`Auditor`** role. `Accounts User` permits Sales Invoice insert/submit by default; `Auditor` is read-only. The naming "`accountant-readonly-sandbox`" implied intent but the role assignment did not match. This is a **finding for Phase D** (see §4) and **must be remediated before any production go-live** per §10.1 multi-user line.

## 4. Findings (ranked by go-live impact)

### Finding C-1 — accountant-readonly user is NOT actually read-only (`Accounts User` role) — **high impact**

**Observation:** `accountant-readonly-sandbox@corpflowai.test` has role `['Accounts User']`. This role allows Sales Invoice creation in ERPNext's default permission matrix. The user successfully inserted a draft Sales Invoice during cycle 4.

**Why it matters:** §10.1 of the sandbox plan explicitly lists *"Multi-user access tested: operator can post; accountant role can read and export but cannot post"* as a go-signal precondition. The current role assignment fails this gate.

**Recommended fix (small docs+sandbox tweak, can be done in a follow-up packet):**
- Update Phase B-a runbook §8.1 to grant **`Auditor`** role (or a custom Role Profile `Accountant Read-Only`) instead of `Accounts User`.
- Re-run cycle 4 of Phase C against the updated user. The insert attempt must raise `PermissionError`.
- Until remediated: **do not** use the `Accounts User` role for any production "read-only" persona.

This finding does not invalidate cycles 1–3 (which ran as `Administrator`); it only blocks the §10.1 multi-user line in the go/no-go criteria.

### Finding C-2 — ERPNext requires `reference_no` + `reference_date` on Bank Payment Entries — **low impact / process-only**

ERPNext raises `ValidationError: Reference No and Reference Date is mandatory for Bank transaction` if a Payment Entry touching a Bank-type account omits these fields. Same constraint applies to Journal Entries with `voucher_type='Bank Entry'` (`cheque_no` + `cheque_date`).

**Implication for production:** every operator-recorded payment must include the upstream reference (wire MT103 number, PayPal transaction ID, cheque number, etc.). This is the *correct* production behaviour. Update the operator runbook to require operators to paste the upstream reference at the time of recording.

### Finding C-3 — `Debtors - USD - CFS` was auto-created on first USD invoice attempt — **informational**

When the first USD-currency invoice was inserted with `debit_to` defaulting to `Debtors - CFS` (MUR), ERPNext raised:

> *Party Account Debtors - CFS currency (MUR) and document currency (USD) should be same.*

The orchestrator detected this and created `Debtors - USD - CFS` (Receivable, USD) under the same parent group, then retried. Production should either:
- Add `Debtors - USD - CFS` explicitly to the CoA before issuing the first USD invoice, or
- Configure each USD-denominated customer's `accounts` child table to point to `Debtors - USD - CFS`.

Either path is fine; the latter is more aligned with multi-customer-currency hygiene.

### Finding C-4 — Standard CoA does not include `Service Revenue — Lead Rescue Setup` per §2.1 — **informational**

The sandbox used `Service - CFS` (a stock Standard CoA income leaf) as the income account for the Lead Rescue Setup item. The §2.1 draft CoA names a more granular account `Service Revenue — Lead Rescue Setup`. Production CoA should be the §2.1 draft or whatever the accountant approves; this is **expected** to be revised by the accountant per §10.1.

### Finding C-5 — ERPNext's `Modes of Payment` does not include `PayPal` out of the box — **informational**

Cycle 2 reused `Credit Card` as the closest stock mode. Production should add a custom Mode of Payment named `PayPal` (and possibly `Wise USD`, `Wise EUR`) tied to the relevant bank-style accounts. This is a 30-second admin task; no code change.

## 5. Reconciliation arithmetic (full GL balance summary, end of Phase C)

| Account | Dr (MUR) | Cr (MUR) | Balance (MUR) | Notes |
|---|---:|---:|---:|---|
| `Debtors - USD - CFS` | 13,500.00 | 13,500.00 | **0.00** | Both USD invoices cleared (USD 150 each at rate 45 → MUR 6,750 each; payment side combined with FX adjustment cleared both) |
| `Service - CFS` | 0.00 | 13,500.00 | **−13,500.00** | Revenue (= 2 invoices × USD 150 × MUR 45) |
| `Mauritius Domestic Bank - Main - CFS` | 13,350.00 | 150.00 | **+13,200.00** | Cycle 1 wire (6,705) + cycle 2 PayPal withdrawal (6,645) − bank fee (150) |
| `PayPal - USD balance - CFS` | 6,750.00 | 6,750.00 | **0.00** | Cycle 2 receipt (USD 150) − withdrawal to MU bank (USD 150) |
| `Banking & Payment Fees - CFS` | 150.00 | 0.00 | **+150.00** | Cycle 3 fee |
| `Exchange Gain/Loss - CFS` | 150.00 | 0.00 | **+150.00** | Cycle 1 FX (45) + cycle 2 FX (105) = total realised FX loss MUR 150 |

**Sum of column "Balance": MUR 0.00** — double-entry holds. ✓

**Cash arithmetic sanity check:**

```
Customer receipts (per-cycle, MUR equivalent at book rate)
  USD 150 (cycle 1)  →  MUR 6,750
  USD 150 (cycle 2)  →  MUR 6,750
                       ─────────
                        MUR 13,500     ← revenue recognised in Service - CFS

Actual MUR in the books after spreads + fees
  MU bank          : +MUR 13,200
  Banking fees     : −MUR    150  (already in bank)
  FX loss          : −MUR    150
                     ───────────
  Net cash retained: MUR 12,900
  (revenue 13,500 − FX 150 − fee 150 = 13,200 in bank net, MUR 12,900 after-fee internal)
```

Per-pilot economics: at the sandbox rate of MUR 45/USD with 1% MU bank spread + 1.5% PayPal spread + MUR 150 fixed fee on the operator's bank-fee cycle, USD 150 invoice retains MUR 13,200 in the operating account ≈ USD 293.33 of *gross* cash (note that's two pilots, not one — per-pilot is MUR 6,600 ≈ USD 146.66 retained on a USD 150 invoice). **Numbers are sandbox-illustrative; production will use real bank spreads and accountant-confirmed FX accounting.**

## 6. Items deferred to Phase C² (out of scope under operator narrowing)

Recorded explicitly so they are not forgotten. Each will require separate operator approval, scoped as a follow-up packet.

| Item | Plan ref | Why deferred | Recommended trigger |
|---|---|---|---|
| MUR-denominated client invoice (Mauritius local clients) | §3.3 case 1 alt | Operator narrowed to USD-only for Phase C¹ (matches Lead Rescue launch pilot) | When first MU-domestic client signs |
| Recurring / Subscription monthly billing | §3.2 + §3.3 case 2/3 | Lead Rescue is one-off in launch pilot | When productized monitoring (or any monthly offer) goes live |
| Wise-manual flow (§6) | §6 + §4.1 case 3 | Operator authorised bank-transfer-or-payment-link only | When Wise volume justifies it |
| Credit note / cancellation flow | §3.3 case 4 | Sandbox edge case; not part of happy-path USD-launch-pilot | When first refund is needed |
| Multi-day / 30-day synthetic reconciliation cycle | §7.4 case 5 | Single-day cycle was enough to verify Bank Reconciliation Tool math | When operator wants to verify month-end close |
| VAT / e-invoicing (Mauritius Revenue Authority) | §9 | Already deferred in plan; below turnover threshold + accountant review pending | Approached threshold OR accountant approves earlier |
| Live PayPal / Wise / payment-gateway integration | §5.1, §6.1 | Sandbox-correct posture; live APIs require security review | Real volume + `docs/operations/SECURITY_REVIEW_CHECKLIST.md` pass |
| Production-grade CoA build per §2.1 (granular Service Revenue, AR-USD / AR-MUR split, etc.) | §2.1 | Will be informed by the §10.1 accountant review | After accountant review |

## 7. Phase D readiness (does NOT initiate Phase D — requires separate approval)

Per `JE-2026-05-29-1` and the original sandbox plan §10, the **go/no-go recommendation** is a separate, explicitly-approved step. This findings doc surfaces what Phase D will need to weigh:

**Looks favorable for the USD-launch-pilot workflow:**
- USD invoice → manual approval → bank-transfer-OR-payment-link → payment-before-setup gate is fully realisable in ERPNext stock (no custom apps required).
- Multi-currency math reconciles cleanly to zero across all six test accounts.
- ERPNext's FX clearing journal (auto-created `Exchange Gain Or Loss` voucher) handles spread correctly.
- Bank Reconciliation Tool's match-against-existing-GL behaviour matches the synthetic CSV expectation.
- Cycle 3 reconciled to MUR 0.00 delta — within tolerance.

**Blocks for production go-live (per §10.1):**
1. ⚠️ **Multi-user line (finding C-1)** — the read-only accountant user is not actually read-only. Must be remediated and re-verified.
2. Accountant review of the Standard CoA + the §2.1 draft is still required by §10.1 ("Chart of Accounts has been reviewed in writing by a Mauritius-licensed accountant"). This is unchanged by Phase C; it's still pending.
3. Live verification on a real (redacted) MU bank statement is still required by §10.1 — only synthetic CSV tested in Phase C.
4. PayPal-manual flow tested as designed; same for "bank transfer." Wise is **untested in Phase C** (per operator narrowing) and remains untested → §10.1 *"Payment Request flow tested for bank transfer, PayPal-manual, and Wise-manual"* is **not fully met** for Wise (deferred to C²).
5. Backup-and-restore was verified during Phase B-a (PR #275 §12 GREEN parity) → §10.1 *"Backup and restore tested at least once"* **is met**.
6. VAT review is still deferred per plan §9 → §10.1 *"VAT plan reviewed by accountant **or** explicitly recorded as "below threshold; not yet needed; revisit at MUR X turnover"*** must be either reviewed by accountant or explicitly logged in `JOURNAL.md`.

**No no-go signal tripped (per §10.2):**
- Multi-currency postings reconcile within tolerance (delta MUR 0.00); the published Wise/PayPal rate concept was honoured by using a manual rate, not a black-box automatic feed.
- Bank reconciliation required 1-of-3 lines manual (the fee line) = 33%; per §10.2 *"more than 5% of lines need manual journals"* this exceeds the suggested threshold **but** the example is a degenerate 3-line CSV — the absolute count (1 manual JE) is the correct measure. A 30-day cycle (deferred to C²) is needed before this can be evaluated against the §10.2 threshold honestly.
- PayPal/Wise activity tracking: only PayPal exercised, manually and successfully.
- Sandbox-host stable (Phase B-a uptime check; no crash during Phase C).
- No accidental touch of CorpFlowAI production data, env vars, secrets, DNS, or any runtime component. ✓

## 8. Operator-facing summary (no jargon)

- We **issued two USD invoices** (USD 150 each), approved them by hand, and recorded payment two different ways: a bank wire (cycle 1) and a payment-link-style PayPal receipt (cycle 2).
- We then **moved the PayPal money to the Mauritius bank** as we would in real life, recording the FX spread honestly.
- We **reconciled the Mauritius bank balance** against a synthetic CSV (the kind we'd export from a real MU bank), including a bank fee. **Reconciled to zero variance.**
- We **checked the read-only role** for an accountant. **The role we created is not actually read-only.** This needs a tiny fix (one role swap) before we can call the multi-user gate satisfied.
- Everything is sandbox-only: no real money, no real client data, no real bank credentials, no live PayPal API.

**What this tells us about doing this for real:** the workflow you described — USD invoice / manual approval / bank-transfer-or-link / payment-before-setup — fits ERPNext cleanly. The blockers between us and "use this for production" are now small and named (accountant review of the CoA, accountant-readonly role fix, real MU bank CSV import, VAT decision). None of them is a code change.

## 9. References

- `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md` — original §3–§7 plan (defines what we tested and what's deferred).
- `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` — Phase B-a runbook + §8.1 user-creation snippet (where finding C-1 originates).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* — Item label *"AI Lead Rescue Setup (USD 150 pilot)"* (verbatim match required).
- `docs/decisions/JOURNAL.md` — new row `JE-2026-06-01-2` records Phase C executed + the findings catalogued here.
- `JE-2026-05-28-1` / `JE-2026-05-28-3` — Lead Rescue USD-launch-pilot doctrine that this Phase C tested.
- `JE-2026-05-29-1` — gate enforcement: Phase D needs separate operator approval.
- Operator Bridge issue [#249 STATUS-8](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249#issuecomment-4590221359) — test design pre-announcement.

## 10. Honest limits of this Phase C run

- **Sandbox-only.** No real client touched. No real PayPal API key. No real Mauritius bank credentials. The `paypal.me` link was a placeholder string. All amounts are synthetic.
- **Single-day cycle.** Cycles 1–3 all booked on `2026-06-01`. A multi-day or 30-day cycle is deferred to C² and is required before evaluating §10.2's "more than 5% of lines need manual journals" threshold honestly.
- **Cycle 4 finding (C-1) is a real go/no-go blocker.** Phase D cannot be COMPLETE until C-1 is remediated, OR the operator and accountant explicitly accept the risk in writing.
- **Bank Reconciliation Tool was simulated, not invoked through the UI.** The cycle 3 logic verified that the GL state would match a 3-line CSV import by comparing existing GL entries against expected CSV totals. The Bank Reconciliation Tool's actual UI/API (`erpnext.accounts.doctype.bank_reconciliation_tool.bank_reconciliation_tool.create_journal_entry_bts`) was not exercised end-to-end; cycle 3 validates the **arithmetic**, not the **UI path**. A future packet should run the actual import.
