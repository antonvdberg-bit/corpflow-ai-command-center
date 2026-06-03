# ERPNext production readiness evaluation — Phase D scope

**Status:** Docs / evaluation only. **No production ERPNext changes; no secrets; no real bank details; no payment-gateway setup; no CorpFlowAI runtime, DB, Vercel, DNS, or GitHub configuration touched.** This document evaluates the work remaining to move ERPNext from `corpflow-exec-01-u69678` sandbox-only state to a production posture safe for issuing the first real CorpFlowAI AI Lead Rescue pro-forma invoice / sales invoice.

**Anchor sentinel:** `<!-- ERPNEXT_PRODUCTION_READINESS_EVALUATION_V1 -->`

<!-- ERPNEXT_PRODUCTION_READINESS_EVALUATION_V1 -->

**Authorisation:** Anton's DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-03 06:29 SAST, *"APPROVED — open ERPNext Phase D Production Readiness Evaluation"*). Approved scope: docs / evaluation only; no production ERPNext changes unless separately approved; no secrets; no real bank details in repo; no payment-gateway setup; no CorpFlowAI runtime / DB / Vercel / DNS / GitHub config changes.

**Sources consolidated by this document (no contradiction with any merged source):**

- `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md` — original Phase A / Phase D plan (definitive go/no-go criteria in § 10).
- `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` — Phase B install runbook (executed end-to-end on `corpflow-exec-01-u69678` 2026-05-31 → 2026-06-01).
- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` — Phase C test cycles 1–4 + Option B remediation findings.
- `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` (PR #287, `JE-2026-06-02-4`) — the 13-blocker production list § 8 this evaluation refines and groups into MUST / SHOULD / CAN-DEFER / HARD-BLOCKERS buckets.
- `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (PR #288, `JE-2026-06-02-7`) — the manual-PDF template currently in use for the Friday launch; defines W1–W5 verbatim wording the production Print Format must mirror.
- `docs/finance/PAYMENT_READINESS_2026_06_01.md` (`JE-2026-06-01-4`) — payment-route reality (SBM primary; PayPal HOLD; Wise removed).
- `docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md` (`JE-2026-06-02-3`) — SBM e-Commerce application readiness; production posture for the SBM bank account ledger.
- `docs/finance/PAY_SBM_2_PAGE_COMPLIANCE_COPY.md` (`JE-2026-06-02-4`, PR #284) — public seller identity (legal name + BRN + address + support email) already published on `corpflowai.com`; same values must populate the ERPNext Company doctype + Letter Head.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* — canonical Item label *"AI Lead Rescue Setup (USD 150 launch pilot)"*, single-offer rule, no-guarantee line.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — canonical operator runbook (status pipeline, qualification call, 13-item setup checklist).
- Decision rows: `JE-2026-05-28-1` (single-offer rule), `JE-2026-05-29-1` (Phase D requires fresh authorisation), `JE-2026-05-29-2` (brand identity), `JE-2026-05-31-2` (Phase B-a install), `JE-2026-06-01-1` (server capacity), `JE-2026-06-01-3` (Phase C executed), `JE-2026-06-01-4` (payment route priority), `JE-2026-06-01-5` (Option B accountant-readonly remediation), `JE-2026-06-01-6` (launch-readiness inventory).

## § 0 — Hard limits honoured by THIS evaluation

- Zero edits to ERPNext production (no ERPNext production instance exists yet — sandbox is loopback-only on `corpflow-exec-01-u69678:127.0.0.1:8080`).
- Zero edits to the ERPNext sandbox state.
- Zero secrets / API keys / OAuth tokens / DB credentials touched.
- Zero real bank details in this file (placeholders only; the published BRN `C25228280`, registered office `Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius`, legal name `CorpFlowAI Ltd`, and support email `support@corpflowai.com` are public per PAY-SBM-2 and may be quoted).
- Zero edits to `api/`, `lib/`, `components/`, `pages/`, `prisma/`, `middleware*`, `scripts/`, `public/`, `.github/`, `node-tests/`, `tests/`, `core/engine/`, `.env*`, `vercel.json`, `next.config*`, `package*.json`, `tsconfig*`.
- Zero changes to DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings.
- Zero pricing / offer / page-copy changes on customer-facing surfaces.
- Pure docs / evaluation artefact.

## § 1 — Executive verdict (top of doc, on purpose)

**Final verdict for the question Anton asked: can ERPNext be used to generate the first real CorpFlowAI AI Lead Rescue pro-forma invoice today?**

**No. Not yet.** Three of the six Phase D `JE-2026-05-29-1`-gated prerequisites are still open, the production instance does not exist, and the Print Format / Letter Head / Company doctype are unfilled. **The manual PDF path documented in `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` is the correct mechanism for the first 1–3 paying pilots.** Plan to migrate to ERPNext production after pilot 1 cashflows and the accountant has signed off the CoA + VAT posture; that is **realistic in 4–6 weeks**, not in time for the Friday launch.

| Verdict tier | Count of items in this doc | One-line reading |
|---|---|---|
| **HARD BLOCKERS** (gate Phase D start itself) | **4** | Phase D operator approval row + accountant CoA review + VAT decision recorded + redacted MU bank CSV reconciliation cycle |
| **MUST** (before first ERPNext pro-forma) | **9** | Production instance / TLS / SMTP + Company doctype + Letter Head + Print Format + naming series + footer wording (W1–W5) + production CoA refinement + production AI Lead Rescue Item + role mapping copied from sandbox |
| **SHOULD** (before first real Sales Invoice = tax invoice) | **6** | VAT registration evaluation + bank account ledger maps to SBM USD account record (no real account number in repo) + real-bank-CSV reconciliation cycle + Modes of Payment for approved routes + production-instance backup-and-restore parity + dry-run pro-forma issued to a non-paying test customer |
| **CAN DEFER** (until after first 5 pilots) | **7** | Recurring / Subscription billing (LR Monitoring monthly) + MUR-denominated invoicing + Wise-manual (may be permanently waived) + PayPal-manual (HOLD) + Credit note / cancellation flow + E-invoicing MRA XML + Live PayPal / Wise / gateway API integrations |

The body of this document expands each tier into named, testable items with current status, owner, and trigger to resolve.

## § 2 — ERPNext capability (Q1)

**Q1.1 Can ERPNext generate a branded PDF quotation / pro-forma / sales invoice?**

**Yes, in principle.** ERPNext stock supports three document types relevant here — *Quotation*, *Sales Invoice*, and *Payment Request* — each renderable as a PDF via `wkhtmltopdf` (configured per `ERPNEXT_SANDBOX_INSTALL.md` § 9 line 385). **However, no PDF was rendered during Phase C.** All Phase C cycles operated against the in-database doctype state (USD 150 invoices, Payment Entries, Journal Entries, Bank Reconciliation arithmetic) without exercising the Print Format → PDF path. **Empirical PDF rendering is a deferred verification step** (recommended: a one-shot `ERPNext-PDF-Smoke-1` packet after the first paying pilot completes on the manual PDF path).

**Q1.2 Which document type should we use before payment: Quotation, Pro-forma, or Sales Invoice?**

**Pro-forma invoice (operationally a *Sales Invoice* draft, OR a *Quotation*; not a submitted Sales Invoice).** ERPNext does not have a dedicated *Pro-forma* doctype. There are two clean paths:

| Path | Doctype + status | Pros | Cons |
|---|---|---|---|
| **A — Quotation** | `Quotation` (`Submitted` once approved) | Cleanest semantically — Quotation is by design a pre-payment document; never appears in tax / GL until converted; built-in "Convert to Sales Invoice" button. | The PDF title reads "Quotation" not "Pro-forma invoice" by default; Print Format must be customised to rename. |
| **B — Sales Invoice (Draft)** | `Sales Invoice` left at `docstatus=0` | The PDF title reads "Sales Invoice" / "Pro-forma" via Print Format; closer to what a buyer expects from an "invoice" wording perspective. | A `Draft` Sales Invoice does not post to the GL until submitted — fine — but it occupies a name in the naming series sequence even before submission, and accidental submission posts revenue prematurely. |

**Recommendation: Path A (Quotation) for v1.** Cleaner separation of pre-payment vs post-payment GL; lower risk of accidental revenue posting; convert-on-payment is a single button. The Print Format is renamed to *"Pro-forma invoice"* via a custom Print Format (covered in § 4 item M-Letter / M-Print).

**Q1.3 Can it record the AI Lead Rescue product as an Item?**

**Yes — already done in the sandbox.** Item `SBX-LR-SETUP-USD-150` is present, name *"AI Lead Rescue Setup (USD 150 pilot)"* verbatim per `BRAND_AND_CONVERSION_DOCTRINE.md`, Services item group, service-item flag set, USD 150 on Standard Selling. **The `SBX-` prefix is intentional (sandbox-only); production will create a parallel Item `LR-SETUP-USD-150` (no `SBX-`)** so the two never collide if the sandbox is preserved alongside production.

**Q1.4 Can it record a customer/prospect from the intake form manually?**

**Yes.** ERPNext's `Customer` doctype supports the buyer fields the Friday workflow needs (legal name, contact name, email, phone, billing address, optional BRN as a custom field). Phase C cycles 1–2 created two synthetic Customers (`Sandbox Client A - USD`, `Sandbox Client B - USD`) end-to-end. **Production workflow: Anton manually creates the Customer once per buyer, copying values from `/admin/lead-rescue/[id]` Card 1 + Card 3 *Notes*.** A future small packet (`ERPNext-Intake-Bridge-1`) could automate Customer creation from the `Lead` row, but is **explicitly out of scope** for Phase D — manual creation is correct for the first 5 pilots.

**Q1.5 Can payment be recorded manually after SBM wire confirmation?**

**Yes — Phase C cycle 1 already did this.** Sales Invoice `ACC-SINV-2026-00001` was paid via `Payment Entry` `ACC-PAY-2026-00002` (`Receive / Wire Transfer / Submitted`, ref `WIRE-SBX-ACC-SINV-2026-00001`, `paid_from = Debtors - USD - CFS USD 150 → paid_to = Mauritius Domestic Bank - Main - CFS MUR 6,705`), with FX adjustment `ACC-JV-2026-00001` automatically created by ERPNext's stock `Exchange Gain/Loss` voucher. **Finding C-2** (Phase C § 4) requires the operator to paste the upstream wire reference (MT103 number, SBM transaction ID, etc.) on every Bank Payment Entry — this is **correct production behaviour**, not a defect.

**Capability verdict (§ 2):** **ERPNext can do everything the Friday operator workflow needs.** The gap is configuration, not capability.

## § 3 — Current sandbox state (Q2)

**Q2.1 What has already been tested in Phase C?**

Per `ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 1, four cycles ran end-to-end on `corpflow-exec-01-u69678` against the Phase B-a sandbox:

| Cycle | What | Outcome | Phase C ref |
|---|---|---|---|
| **1** | USD invoice → submit (manual approval) → Payment Request (bank-transfer instructions) → Payment Entry against MU MUR bank with FX-loss delta | ✅ Invoice `Paid`; full GL trail | § 3.1 |
| **2** | USD invoice → submit → Payment Request (paypal.me placeholder link) → Payment Entry against PayPal USD balance → later JE for PayPal→MU bank withdrawal w/ FX | ✅ Invoice `Paid`; PayPal→MU bank withdrawal posted | § 3.2 |
| **3** | Synthetic 3-line MU bank CSV reconciled against cycle-1+2 GL lines + 1 manual JE for fee | ✅ Reconciled to **MUR 0.00** delta | § 3.3 |
| **4** | Switch to read-only accountant user; verify read access; verify denial of write/state-change/admin | ✅ **All 11 sub-tests GREEN** post Option B custom Role | § 3.4 + § 3.4.1 |

Backup + restore was verified during Phase B-a (PR #275 § 12; 2026-06-01 audit logged 82 = 82 Account row parity, 3 = 3 enabled User row parity in `JE-2026-06-01-1`).

**Q2.2 Which test cycles were green?**

**All four.** Phase C closed with zero open findings:

- **Finding C-1** (accountant role allowed Sales Invoice insert) — **RESOLVED 2026-06-01** via the Option B custom `Accountant Read-Only` Role with explicit Custom DocPerm rows on 9 doctypes; recorded in `JE-2026-06-01-5`.
- **Finding C-2** (Bank Payment Entries require `reference_no` + `reference_date`) — **process-only** (correct production behaviour; runbook updates flagged for Phase D).
- **Finding C-3** (`Debtors - USD - CFS` auto-created on first USD invoice) — **informational** (production should add `Debtors - USD - CFS` explicitly to the CoA before the first USD invoice).
- **Finding C-4** (sandbox used `Service - CFS` instead of `Service Revenue — Lead Rescue Setup` per § 2.1 of plan) — **informational** (production CoA should be the § 2.1 draft or whatever the accountant approves).
- **Finding C-5** (no `PayPal` Mode of Payment out of the box) — **informational** (production should add custom Modes of Payment for SBM, and possibly PayPal / Wise if those routes ever activate).

**Reconciliation arithmetic at Phase C close** (`ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 5): six-account double-entry summary balances to **MUR 0.00**; per-pilot retained cash works out to ≈ MUR 6,600 ≈ USD 146.66 on a USD 150 invoice at sandbox-illustrative spread. **Numbers are sandbox-illustrative**; production will use real bank spreads and accountant-confirmed FX accounting (this is part of the accountant CoA review hard-blocker, see § 7).

**Q2.3 What remains untested?**

The items deferred to Phase C² (`ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 6), grouped by Phase D relevance:

| Item | Plan ref | Phase D bucket (§ 7 below) |
|---|---|---|
| MUR-denominated client invoice (Mauritius local clients) | § 3.3 case 1 alt | CAN-DEFER |
| Recurring / Subscription monthly billing (LR Monitoring) | § 3.2 + § 3.3 case 2/3 | CAN-DEFER |
| Wise-manual flow (§ 6) | § 6 + § 4.1 case 3 | CAN-DEFER (likely permanent waiver per `JE-2026-06-01-4`) |
| Credit note / cancellation flow | § 3.3 case 4 | CAN-DEFER |
| Multi-day / 30-day synthetic reconciliation cycle | § 7.4 case 5 | SHOULD (implicit, validates § 10.2 *"more than 5% of lines need manual journals"* threshold) |
| **Real (redacted) MU bank CSV import** | § 7 + § 10.1 | **HARD BLOCKER** |
| **Bank Reconciliation Tool actual UI/API** (cycle 3 verified arithmetic only) | § 7.3 | SHOULD |
| **PDF render via Print Format → wkhtmltopdf** (Phase C did not exercise) | n/a (deferred) | MUST |
| VAT / e-invoicing (MRA) | § 9 | CAN-DEFER (until threshold approached) |
| Live PayPal / Wise / payment-gateway integration | § 5.1, § 6.1 | CAN-DEFER |
| Production-grade CoA build per § 2.1 (granular Service Revenue accounts, AR-USD / AR-MUR split) | § 2.1 | MUST (informed by accountant review) |

**Q2.4 Is there any reason the sandbox should not be promoted directly to production?**

**Yes — six material reasons.** The sandbox should **NOT** be promoted by IP-rebind alone. A clean cutover is required.

1. **Sandbox uses `Standard` CoA, not the § 2.1 production draft.** Income account on cycles 1–2 is `Service - CFS` (sandbox stock); production needs `Service Revenue — Lead Rescue Setup` (granular, per § 2.1 + accountant review).
2. **Company doctype is named `CorpFlowAI Sandbox`, not `CorpFlowAI Ltd`.** Renaming a Company in ERPNext is supported but rewrites every GL row's company link — disruptive, error-prone. Cleanly creating `CorpFlowAI Ltd` in a fresh production install is safer.
3. **Sandbox Item is `SBX-LR-SETUP-USD-150` (sandbox-prefixed).** Production should use `LR-SETUP-USD-150` so a future cleanup of the sandbox does not orphan production references.
4. **Sandbox is loopback-only on `127.0.0.1:8080`.** Production needs non-loopback DNS, TLS termination, scheduler enabled, real SMTP — none configured in the sandbox.
5. **Sandbox `Administrator` admin password and per-user passwords live in `~/.erpnext-sandbox-credentials` on `corpflow-exec-01-u69678`.** Promoting these to production would expose long-running sandbox credentials. Production should generate fresh credentials.
6. **Two paid Phase C invoices (`ACC-SINV-2026-00001`, `ACC-SINV-2026-00002`) and three Journal Entries (`ACC-JV-2026-00001..00003`) live in sandbox GL.** Promoting the sandbox database to production would mix real future invoices with synthetic Phase C history, complicating accountant review and audit. Sandbox should be preserved as the test bed (or torn down per `ERPNEXT_SANDBOX_INSTALL.md` § 15) **alongside** a fresh production install.

**Recommended cutover model: parallel install, not promotion.** Stand up a fresh production ERPNext on a separate site (or a separate VM, or — once `corpflow-exec-01` has more capacity headroom — a second Frappe site on the same box, e.g. `corpflowai-prod.localhost` reverse-proxied to a real hostname). Replay only the configuration that should carry over: the custom `Accountant Read-Only` Role + 9 DocPerm rows from `JE-2026-06-01-5`, the `LR-SETUP-USD-150` Item (recreated), and the § 2.1 CoA (built fresh). **No sandbox transactional data crosses to production.**

## § 4 — Production setup checklist (Q3)

The 18 items below cover the full surface Anton listed. Each row carries: **status** (DONE / IN-SANDBOX / NOT-STARTED / PENDING-OPERATOR / PENDING-ACCOUNTANT), **owner** (Cursor under Phase D approval / Anton operator-only / Anton + accountant), **trigger to resolve**, and **bucket** (HARD-BLOCKER / MUST / SHOULD / CAN-DEFER per § 7).

### § 4.1 Hosting / runtime surface

| # | Item | Status | Owner | Trigger to resolve | Bucket |
|---|---|---|---|---|---|
| **P-Inst** | Production ERPNext instance (separate Frappe site, non-loopback DNS, TLS termination, scheduler enabled, real SMTP) | **NOT-STARTED** | Cursor under Phase D approval (Anton owns DNS + cert) | Phase D approval row in `JOURNAL.md` | **MUST** |
| **P-DNS** | Hostname (e.g. `erp.corpflowai.com` or similar — final name is operator decision) + DNS A/AAAA + TLS cert (Let's Encrypt or operator-managed) | **NOT-STARTED** | Anton operator-only (DNS) + Cursor (Caddy / nginx config) | After P-Inst | **MUST** |
| **P-SMTP** | Outbound SMTP for ERPNext to email pro-forma PDFs (sender alias `support@corpflowai.com` per `CORPFLOW_COMMUNICATIONS_V1.md`); DKIM / SPF must be in place | **NOT-STARTED** in sandbox (sandbox has Outgoing Email empty per `ERPNEXT_SANDBOX_INSTALL.md` § 9) | Anton operator-only (SMTP creds) + Cursor (Email Account doc) | After P-Inst + Communications-v1 sender alias confirmed | **MUST** |
| **P-Backup** | Production-instance backup-and-restore parity verified (clone of Phase B-a § 12 procedure but on the production site) | **NOT-STARTED** | Cursor under Phase D approval | After P-Inst | **SHOULD** (functional equivalent to sandbox `JE-2026-06-01-1` before going live) |

### § 4.2 Company identity (Letter Head + Company doctype)

| # | Item | Status | Owner | Trigger to resolve | Bucket |
|---|---|---|---|---|---|
| **M-Co** | Company doctype filled with: `legal name = CorpFlowAI Ltd`, `default_currency = USD` (or MUR with USD as alternate — operator + accountant decide), `country = Mauritius`, `tax_id` = BRN `C25228280`, registered office = `Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius`, `email = support@corpflowai.com`, phone = operator's preferred direct line (off-repo) | **NOT-FILLED** in sandbox; values **public + confirmed** per PAY-SBM-2 | Cursor under Phase D approval | Phase D approval row | **MUST** |
| **M-Letter** | Letter Head doctype with CorpFlowAI canonical wordmark (per `JE-2026-05-29-2`) + brand-doctrine teal `#2dd4bf` accent + footer line `CorpFlowAI Ltd · Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius · BRN C25228280 · support@corpflowai.com` | **NOT-STARTED** in sandbox | Cursor under Phase D approval | Phase D approval row | **MUST** |
| **M-Print** | Custom Print Format for `Quotation` (renamed PDF title to *"Pro-forma invoice"*) + custom Print Format for `Sales Invoice` (PDF title *"Invoice"* / *"Tax invoice"* once VAT activates); both formats embed Letter Head + Item line-block + Totals + footer (W1–W5 verbatim) | **NOT-STARTED** in sandbox | Cursor under Phase D approval | Phase D approval row | **MUST** |
| **M-Numbering** | Naming series for `Quotation` = `CFLR-QUO-.YYYY.-.NNN` (or operator's chosen format; `LR-Manual-Invoice-Template-V1` uses `CFLR-2026-NN`); naming series for `Sales Invoice` = e.g. `CFLR-INV-.YYYY.-.NNN`. Decide whether the pro-forma + final invoice share a sequence (cleaner audit) or have parallel sequences (simpler operator workflow) | **NOT-SET** (sandbox uses stock `ACC-SINV-YYYY-NNNNN`) | Cursor under Phase D approval (Anton makes the format decision) | Phase D approval row | **MUST** |

### § 4.3 Item + customer + currency hygiene

| # | Item | Status | Owner | Trigger to resolve | Bucket |
|---|---|---|---|---|---|
| **M-Item** | Production Item `LR-SETUP-USD-150` (no `SBX-` prefix), name verbatim *"AI Lead Rescue Setup (USD 150 launch pilot)"*, Services group, service-item flag, USD 150 on Standard Selling | **NOT-STARTED** in production (sandbox holds `SBX-LR-SETUP-USD-150`) | Cursor under Phase D approval | Phase D approval row | **MUST** |
| **M-USD-AR** | `Debtors - USD - CFS` (or production-named equivalent under the production Company abbreviation) created **explicitly** in the production CoA before the first USD invoice (Phase C finding C-3 — auto-create works but explicit is cleaner); per-customer `accounts` child table points to it | **NOT-STARTED** in production | Cursor under Phase D approval | Phase D approval row + accountant CoA sign-off | **MUST** |
| **M-FX** | `Exchange Gain/Loss` account exists in CoA (Standard CoA already provides this); the production Company `exchange_gain_loss_account` field is set | Sandbox has this set automatically (Phase C § 2.1) | Cursor under Phase D approval | Phase D approval row | **MUST** (trivially met if Standard CoA seed is used as base) |
| **S-Customer-Fields** | Verify the Customer doctype custom-field configuration matches what the operator workflow needs (legal name, contact name, email, phone, billing address as `Address` doctype linkage, optional BRN as a custom field). If a custom BRN field is required, add it as a `Custom Field` on `Customer` | **NOT-STARTED** in sandbox (Phase C used stock Customer doctype only) | Cursor under Phase D approval | After M-Co + accountant CoA sign-off | **SHOULD** |

### § 4.4 Footer wording / VAT / payment instructions

| # | Item | Status | Owner | Trigger to resolve | Bucket |
|---|---|---|---|---|---|
| **M-Wording** | Print Format embeds W1–W5 from `LR-Manual-Invoice-Template-V1` § 1 character-for-character: W1 *"Payment instructions are sent separately after intake approval."*, W2 *"Setup begins after payment confirmation and receipt of required client information."*, W3 the 48-hour / 5-business-day setup-window line (verbatim), W4 *"No revenue, lead volume, or conversion outcome is guaranteed."*, W5 *"VAT/tax treatment pending accountant confirmation."* | **NOT-STARTED** in sandbox (no Print Format yet) | Cursor under Phase D approval | After M-Print | **MUST** (exit-criterion for first-PDF render) |
| **B-VAT** | VAT decision recorded as a `JOURNAL.md` row — either accountant-confirmed below-threshold-and-not-yet-required posture (preferred for Friday-launch volume) **or** accountant recommends VAT registration → trigger separate VAT-activation packet | **PENDING-ACCOUNTANT** | Anton + accountant | Engage Mauritius-licensed accountant; receive written posture; record as `JE-YYYY-MM-DD-N` | **HARD BLOCKER** for Phase D start |
| **S-Pay-Instr** | Production posture: payment instructions go in a **separate email** after the pro-forma is acknowledged (`LR-Manual-Invoice-Template-V1` § 5.2 two-email design). The Print Format does **not** carry account number / SWIFT / IBAN. The Print Format does carry the W1 *"Payment instructions are sent separately after intake approval."* line | **NOT-STARTED** | Cursor under Phase D approval | After M-Print + M-Wording | **SHOULD** (decision is correct in the manual template; needs to carry into ERPNext Print Format) |

### § 4.5 Bank account ledger + reconciliation

| # | Item | Status | Owner | Trigger to resolve | Bucket |
|---|---|---|---|---|---|
| **S-SBM-Ledger** | Production CoA includes a Bank-type account record for the SBM USD operating account (the **account record only** — name, currency, bank — **not** the real account number / SWIFT / IBAN; those live on the operator's laptop and on the SBM dashboard, never in ERPNext fields that would be exported in a backup or screenshot). Also a Bank-type account record for SBM MUR if maintained | Sandbox has `Mauritius Domestic Bank - Main - CFS` (MUR) + `PayPal - USD balance - CFS` (USD); no SBM USD record yet | Cursor under Phase D approval (Anton provides bank name + currency only — no account number to repo) | After M-Co + accountant CoA sign-off | **SHOULD** |
| **B-Bank-CSV** | Real (redacted) MU bank CSV import test: Anton exports a redacted SBM bank statement (account number / SWIFT / customer narrations redacted), hands to Cursor; Cursor imports via the ERPNext Bank Reconciliation Tool against the existing sandbox Phase C GL; reconciles to MUR 0.00 delta | **PENDING-OPERATOR** (sandbox cycle 3 was synthetic 3-line CSV only) | Anton (redacted CSV) + Cursor (import) | After Anton produces redacted CSV from a real SBM statement | **HARD BLOCKER** for Phase D start (per `ERPNEXT_SANDBOX_PLAN_V1.md` § 10.1) |
| **S-Bank-Recon-30d** | Multi-day / 30-day reconciliation cycle (cycle 3 was single-day); validates `ERPNEXT_SANDBOX_PLAN_V1.md` § 10.2 *"more than 5% of lines need manual journals"* threshold honestly | **NOT-STARTED** | Cursor (after first paying pilot generates real receipts) | After 4–6 weeks of real activity | **SHOULD** (functional gate; not Phase D startup gate) |

### § 4.6 Roles / user access / accountant control

| # | Item | Status | Owner | Trigger to resolve | Bucket |
|---|---|---|---|---|---|
| **M-Roles** | Production user setup mirrors sandbox: one operator (`System Manager + Accounts Manager`), one accountant (custom `Accountant Read-Only` Role + 9 Custom DocPerm rows per `JE-2026-06-01-5`). Sandbox bootstrap script archived at `/tmp/erpnext-c1-option-b.sh` on `corpflow-exec-01-u69678` is the canonical replay; promoting it into `ERPNEXT_SANDBOX_INSTALL.md` § 8.1 is a separate runbook-hardening packet | **DONE** in sandbox; **NOT-STARTED** in production | Cursor under Phase D approval | After P-Inst | **MUST** |
| **M-Acct-CoA** | Mauritius-licensed accountant CoA review in writing (sandbox CoA + § 2.1 draft + Phase C GL trail handed over; written sign-off received; recorded as a `JE-YYYY-MM-DD-N` row) | **PENDING-ACCOUNTANT** | Anton → accountant | Engage Mauritius-licensed accountant; provide artefacts; receive written sign-off | **HARD BLOCKER** for Phase D start (per § 10.1) |

### § 4.7 Approval gate

| # | Item | Status | Owner | Trigger to resolve | Bucket |
|---|---|---|---|---|---|
| **B-Phase-D** | Phase D operator-approval row in `JOURNAL.md` (`JE-2026-05-29-1` requires fresh operator authorisation; this evaluation does **not** initiate Phase D — it documents what Phase D needs) | **NOT-AUTHORISED** | Anton | After B-VAT, B-Bank-CSV, M-Acct-CoA all `DONE` | **HARD BLOCKER** for any production work |

**Summary of § 4:**

- **18 named items.**
- **DONE / IN-SANDBOX:** 1 explicit (M-Roles done in sandbox; production replay still required).
- **NOT-STARTED / NOT-FILLED in production:** 13.
- **PENDING-ACCOUNTANT or PENDING-OPERATOR:** 4 (B-VAT, B-Bank-CSV, M-Acct-CoA, B-Phase-D).
- **The four `B-` rows in this checklist are the full HARD-BLOCKER set for Phase D start.** Until those four are closed, no Cursor-side production work happens.

## § 5 — Accounting control (Q4)

**Q4.1 What needs accountant sign-off before first real invoice?**

Three artefacts. None are pre-approved by Cursor; all three must be reviewed by a Mauritius-licensed accountant before Phase D.

1. **Chart of Accounts.** The `ERPNEXT_SANDBOX_PLAN_V1.md` § 2.1 draft (granular Service Revenue accounts; AR-USD / AR-MUR split; placeholder `Input VAT` / `VAT Output Holding` for future activation) is **a draft**, not approved. Phase C used the stock `Standard` CoA to test multi-currency arithmetic, not to validate Mauritian accounting structure. The accountant should confirm the leaf-account structure (Income, Expenses, Bank Accounts, Receivables) matches Mauritian reporting requirements.
2. **VAT posture.** Two acceptable outcomes:
   - **(a) Below-threshold posture:** accountant confirms in writing that CorpFlowAI Ltd is below the Mauritius VAT registration threshold, no VAT charged on invoices, no e-invoicing obligations until threshold is approached. **Preferred for Friday-launch volume.** Recorded as a `JE-YYYY-MM-DD-N` row referencing this evaluation.
   - **(b) VAT-active posture:** accountant recommends VAT registration. This triggers a separate VAT-activation packet (CoA changes, naming-series changes, new Print Format reading "Tax invoice", VAT line-item handling, periodic VAT return workflow). **Not feasible for Friday launch; postpones Phase D by months.**
3. **Pro-forma vs Quotation vs Sales Invoice naming.** The W3 *"Setup begins after payment confirmation…"* + W1 *"Payment instructions are sent separately…"* design is operator + doctrine-aligned. The accountant should confirm that calling the pre-payment document a *"Pro-forma invoice"* (rather than *"Quotation"* or *"Estimate"*) does not create a Mauritian-specific tax misclassification. **Best-effort answer:** *"Pro-forma invoice"* is the common cross-border term and should be safe; the accountant is the authority.

**Q4.2 Can we issue non-VAT pro-forma documents before full VAT review?**

**Yes — that is exactly the manual-PDF posture in `LR-Manual-Invoice-Template-V1`** (W5 *"VAT/tax treatment pending accountant confirmation."* + the explicit "*This document is a pro-forma invoice (not a tax invoice).*" footer). For ERPNext production:

- Path A (Quotation, recommended in § 2): a Quotation is **not** a tax invoice in any jurisdiction; safe to issue under any VAT posture.
- Path B (Sales Invoice Draft): a **Draft** Sales Invoice is also not a posted tax document; safe to issue. **Submitted** Sales Invoices post revenue to the GL — that is the moment the VAT posture matters.
- The first 1–3 pilots can be issued as Quotations (or Draft Sales Invoices) regardless of VAT posture. The first **submitted** Sales Invoice on production should wait for the accountant's VAT decision under Q4.1.2 above.

**Q4.3 What wording is safest until VAT/accountant review is complete?**

The W1–W5 wording in `LR-Manual-Invoice-Template-V1` § 1, mirrored in `PAY-SBM-2` (`pages/terms.js`, `pages/refund-policy.js`, `pages/contact.js`, `components/AiLeadRescueLanding.js`). Specifically W5 — *"VAT/tax treatment pending accountant confirmation."* — is the canonical pre-VAT-review tax line. **Do not** drift from this wording in any ERPNext Print Format until the accountant signs off.

Additional safest-language guardrails (carried from `JE-2026-06-01-4` § 4.5 and `PAY_SBM_2_PAGE_COMPLIANCE_COPY.md` § 2):

- Document title: *"Pro-forma invoice"* (or *"Quotation"* if Path A in § 2). **Never** *"Tax invoice"* / *"VAT invoice"* until VAT activates.
- Currency: USD (matches single-offer rule per `JE-2026-05-28-1`).
- Forbidden phrases on the Print Format: *"Pay now"*, *"PayPal accepted"*, *"Wise accepted"*, *"Instant checkout"*, card-scheme logos (Visa / Mastercard / UnionPay / JCB / Alipay), revenue / lead-volume / conversion guarantees, MCC self-assignment.
- Required phrases on the Print Format: W1, W2, W3, W4, W5 verbatim.

## § 6 — Intake-to-invoice workflow (Q5)

The v1 production workflow once Phase D is closed. **Step numbering aligns with `AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` § 9** so the same operator runbook covers both the manual-PDF path (today) and the ERPNext path (post-Phase D).

### § 6.1 Per-prospect runtime (post-Phase D)

```
Step 1.  Prospect submits intake on https://corpflowai.com/lead-rescue
         (or https://aileadrescue.corpflowai.com).
         Server writes Lead row, emits two automation events.
         Operator alert lands in Telegram / email (per the n8n forward).
         (UNCHANGED from manual-PDF path.)

Step 2.  Operator reviews Lead on /admin/lead-rescue/[id] within 2 business hours.
         (UNCHANGED.)

Step 3.  Operator makes qualification call.
         Status moves to QUALIFYING.
         Operator gathers buyer business address (and optional BRN)
         into Card 3 Notes.
         (UNCHANGED.)

Step 4.  Operator manually creates or updates ERPNext Customer.
         (NEW vs manual-PDF path.)
         - If first-time buyer: create Customer doctype.
           Fields: legal name (= Lead.business_name),
                   contact name (= Lead.contact_name),
                   email (= Lead.email),
                   phone (= Lead.phone, optional),
                   billing address (= qualification call notes),
                   tax_id / BRN custom field (= optional, if buyer offered).
         - If returning buyer: update existing Customer.

Step 5.  Operator creates ERPNext Quotation (Path A, recommended).
         (NEW vs manual-PDF path.)
         - Customer = the Customer from Step 4.
         - Currency = USD.
         - Item = LR-SETUP-USD-150, qty 1, USD 150.00.
         - Print Format = "CFLR Pro-forma" (custom Print Format, § 4 M-Print).
         - Naming series = CFLR-QUO-YYYY-NNN (or operator-decided format).
         - Status: Draft -> Submitted (operator approves).

Step 6.  Operator generates PDF + sends to buyer.
         (DIFFERENT mechanism from manual-PDF, same outcome.)
         - Print Format renders the Quotation PDF via wkhtmltopdf.
         - PDF contains: Letter Head + buyer block + line item +
           totals (USD 150.00) + W1-W5 verbatim footer.
         - Operator sends PDF via ERPNext's Email button OR exports +
           sends manually from `support@corpflowai.com` (M-SMTP).

Step 7.  Operator records Quotation reference on /admin/lead-rescue/[id].
         - Card 2 (Commercial): payment_status = quoted,
                                invoice_reference = CFLR-QUO-YYYY-NNN.
         - Card 3 (Status): status = QUOTE_SENT,
                            next_action = "Confirm wire receipt; start setup."
         (UNCHANGED in shape; just the invoice_reference value comes from ERPNext.)

Step 8.  Buyer pays by approved manual route (SBM USD wire per JE-2026-06-01-4).
         Operator confirms wire on the SBM dashboard.
         (UNCHANGED.)

Step 9.  Operator records Payment Entry in ERPNext.
         (NEW vs manual-PDF path; manual path just had operator update
          /admin/lead-rescue/[id] payment_status = paid.)
         - Convert Quotation -> Sales Invoice (one-button).
         - On the Sales Invoice, Submit (posts revenue to GL).
         - Create Payment Entry: Receive / Wire Transfer / Submitted.
         - paid_from = Debtors - USD - <Company abbreviation> (USD 150).
         - paid_to = SBM USD bank account (M-SBM-Ledger).
         - reference_no = MT103 / SBM transaction ID (Phase C finding C-2).
         - reference_date = wire value-date.
         - Currency rate = book rate (or operator-entered rate).
         - ERPNext auto-creates Exchange Gain/Loss JE if FX delta exists.

Step 10. Operator updates /admin/lead-rescue/[id]:
         - Card 2 (Commercial): payment_status = paid.
         - Card 3 (Status): status = PAID_SETUP.
         (UNCHANGED in shape; status pipeline unchanged.)

Step 11. Setup begins per the 13-item operator runbook checklist.
         (UNCHANGED.)
```

### § 6.2 What changes from the manual-PDF path

Only **steps 4, 5, 6, and 9** differ. Everything before (intake) and after (status pipeline + setup checklist) is unchanged. **The buyer experience is identical** — they receive a branded PDF pro-forma, then a separate payment-instructions email, then setup begins after wire confirmation. The differences are operator-internal:

| Aspect | Manual-PDF path (today) | ERPNext path (post-Phase D) |
|---|---|---|
| PDF source | Word / Pages / Google Docs on operator's laptop | ERPNext Print Format → wkhtmltopdf |
| Invoice numbering | Operator increments `CFLR-2026-NN` by hand | Naming series increments automatically |
| Customer record | Anton's local CMP / spreadsheet | ERPNext Customer doctype |
| GL impact | Operator records on a spreadsheet | Posted to ERPNext Sales Invoice + Payment Entry GL |
| Tax invoice on demand | Not currently produceable | Available once accountant signs off VAT |
| Bank reconciliation | Operator reconciles manually | ERPNext Bank Reconciliation Tool |
| Audit trail | Spreadsheet + emails | ERPNext-native audit log + GL trail |
| Accountant access | Spreadsheet shared at month-end | Accountant logs in with `Accountant Read-Only` role |

### § 6.3 What does NOT change

- Buyer-facing flow on `https://corpflowai.com/lead-rescue` and `https://aileadrescue.corpflowai.com/`.
- The intake form, the n8n forward, the operator alert, the qualification call.
- The W1–W5 verbatim wording on the pro-forma.
- The single-offer rule (one line item: AI Lead Rescue Setup, USD 150.00).
- The two-email design (pro-forma + separate payment-instructions email).
- The 13-item setup checklist.
- The status pipeline (`NEW → QUALIFYING → QUOTE_SENT → PAID_SETUP → SETUP_DONE → MONITORING`).

## § 7 — Go / no-go verdict (Q6)

The four-tier list Anton requested. Each row references the § 4 item ID + the source authority.

### § 7.1 HARD BLOCKERS — until ALL FOUR are closed, Phase D does not start

These are gates against the Phase D start itself, not against the first ERPNext pro-forma alone.

| ID | Item | Authority | Status | Owner | Trigger to resolve |
|---|---|---|---|---|---|
| **HB-1** | **Phase D operator approval row in `JOURNAL.md`** (`B-Phase-D` in § 4) | `JE-2026-05-29-1` (Phase D requires fresh operator authorisation) | **NOT-AUTHORISED** | Anton | Anton writes a fresh `JE-YYYY-MM-DD-N` row authorising Phase D after HB-2 / HB-3 / HB-4 are `DONE` |
| **HB-2** | **Mauritius-licensed accountant CoA review in writing** (`M-Acct-CoA` in § 4 + § 5 Q4.1.1) | `ERPNEXT_SANDBOX_PLAN_V1.md` § 10.1 | **PENDING-ACCOUNTANT** | Anton → accountant | Engage Mauritius-licensed accountant; provide § 2.1 CoA draft + Phase C GL trail; receive written sign-off; record as `JE-YYYY-MM-DD-N` |
| **HB-3** | **VAT decision recorded in `JOURNAL.md`** (`B-VAT` in § 4 + § 5 Q4.1.2) | `ERPNEXT_SANDBOX_PLAN_V1.md` § 10.1 | **PENDING-ACCOUNTANT** | Anton + accountant | Accountant confirms below-threshold posture (preferred) OR recommends VAT registration; record as `JE-YYYY-MM-DD-N` |
| **HB-4** | **Real (redacted) MU bank CSV reconciliation cycle** (`B-Bank-CSV` in § 4) | `ERPNEXT_SANDBOX_PLAN_V1.md` § 10.1 (only synthetic 3-line CSV tested in Phase C) | **PENDING-OPERATOR** | Anton (redacted CSV) → Cursor (import) | Anton exports redacted SBM bank statement; Cursor imports via Bank Reconciliation Tool; reconciles to MUR 0.00 delta |

**HB-2 + HB-3 = single accountant engagement.** Both are accountant-side; both should be requested in the same brief to the accountant. Estimated calendar time: 1–3 weeks depending on accountant availability.

**HB-4 = 1-day exercise** once Anton has a real SBM statement. The redaction is straightforward (account number / customer narrations / SWIFT sender details masked; transaction amounts + dates + currency preserved).

### § 7.2 MUST — must complete before first real ERPNext pro-forma (= first Quotation issued to a real buyer)

Closes **after** all four HARD BLOCKERS are `DONE`. None of these can start before HB-1 (Phase D approval row) is recorded.

| ID | Item | Section ref | Owner | Estimated effort under Phase D approval |
|---|---|---|---|---|
| **M-1** | Production ERPNext instance — non-loopback DNS, TLS, scheduler enabled, real SMTP | § 4.1 P-Inst + P-DNS + P-SMTP | Cursor (with Anton-side DNS + SMTP creds) | 1 day install + 1 day DNS / cert + 0.5 day SMTP smoke |
| **M-2** | Company doctype filled (`CorpFlowAI Ltd`, BRN `C25228280`, registered office, support email, USD/MUR currency posture) | § 4.2 M-Co | Cursor | 0.5 day |
| **M-3** | Letter Head doctype with brand-aligned wordmark + footer line | § 4.2 M-Letter | Cursor | 0.5 day (assets are repo-side; assembly is in ERPNext UI / fixtures) |
| **M-4** | Custom Print Format for Quotation (PDF title *"Pro-forma invoice"*) + Sales Invoice; embeds Letter Head, line item, totals, W1–W5 footer verbatim | § 4.2 M-Print | Cursor | 1.5 days (Print Format dev + smoke render + visual QA) |
| **M-5** | Naming series for Quotation + Sales Invoice (operator-decided format; recommended `CFLR-QUO-.YYYY.-.NNN` + `CFLR-INV-.YYYY.-.NNN`) | § 4.2 M-Numbering | Cursor (Anton makes format decision) | 0.5 day |
| **M-6** | W1–W5 verbatim footer wording rendered correctly on a smoke-test PDF | § 4.4 M-Wording | Cursor (smoke after M-4) | rolled into M-4 |
| **M-7** | Production CoA built per § 2.1 + accountant sign-off (HB-2) refinements applied; `Debtors - USD - <abbr>` explicit | § 4.3 M-USD-AR + M-FX | Cursor (after HB-2 accountant feedback) | 1 day |
| **M-8** | Production Item `LR-SETUP-USD-150` (no `SBX-` prefix), name verbatim, USD 150 on Standard Selling | § 4.3 M-Item | Cursor | 0.5 day |
| **M-9** | Production user / role mapping mirrors sandbox (operator + custom `Accountant Read-Only` role with 9 DocPerm rows from `JE-2026-06-01-5`); promotes the bootstrap script archived at `/tmp/erpnext-c1-option-b.sh` into the runbook | § 4.6 M-Roles | Cursor | 1 day (script port + runbook update) |

**Total Phase D MUST work under Cursor (after HARD BLOCKERS close): ≈ 6–8 working days.**

### § 7.3 SHOULD — before first real Sales Invoice (= first **submitted** posted-to-GL invoice; first time CorpFlowAI Ltd records revenue in ERPNext production)

A real Sales Invoice posts revenue to the GL. The pro-forma (Quotation) does not. **Submitting** the first Sales Invoice is a higher bar than issuing the first Quotation; the SHOULD list closes the gap.

| ID | Item | Section ref | Owner | Estimated effort |
|---|---|---|---|---|
| **S-1** | VAT registration evaluation under HB-3 specifically applied to the production CoA: if below-threshold, the production Sales Invoice Print Format reads "Pro-forma invoice" not "Tax invoice"; if VAT-active, the VAT-activation packet executes first | § 5 Q4.1.2 | Cursor (after HB-3 outcome) | rolled into M-7 / VAT-activation packet |
| **S-2** | Bank account ledger maps to SBM USD account record (account record only, no real account number / SWIFT in repo); SBM MUR equivalent if maintained | § 4.5 S-SBM-Ledger | Cursor (Anton provides bank name + currency only) | 0.5 day |
| **S-3** | Real-bank-CSV reconciliation cycle — first month of real receipts reconciled cleanly via Bank Reconciliation Tool UI (not just arithmetic verification as in Phase C cycle 3) | § 4.5 B-Bank-CSV (extension) + S-Bank-Recon-30d | Cursor + Anton (operator confirms) | 1 day during the first month after Phase D |
| **S-4** | Modes of Payment for SBM (and other approved routes); custom Mode of Payment "SBM USD Wire" | § 4.3 + Phase C finding C-5 | Cursor | 0.5 day |
| **S-5** | Production-instance backup-and-restore parity verified (clone of Phase B-a § 12 procedure on production site) | § 4.1 P-Backup | Cursor (after M-1) | 0.5 day |
| **S-6** | Dry-run pro-forma issued to a non-paying test customer (e.g. Anton himself or a friendly business) to exercise Steps 4–6 of § 6.1 end-to-end before issuing to a real paying buyer | § 6.1 (dry-run) | Anton + Cursor | 0.5 day |

**Total SHOULD work after MUST closes: ≈ 3 working days, plus 1 month of operating data for S-3.**

### § 7.4 CAN DEFER — until after first 5 paying pilots

These are real ERPNext capabilities that the v1 single-offer Friday workflow does not need. Each can become its own small packet later, sequenced by real demand.

| ID | Item | Why deferred | Trigger to schedule |
|---|---|---|---|
| **CD-1** | Recurring / Subscription billing for `LR Monitoring` monthly | Single-offer rule (`JE-2026-05-28-1`); Lead Rescue is one-off in launch pilot | When productized monitoring becomes a tier offered to clients |
| **CD-2** | MUR-denominated invoicing for Mauritius-domestic clients | Friday launch is USD-only per `JE-2026-05-28-1`; Mauritius warm-network clients have all confirmed comfort with USD-denominated quoting | When first MU-domestic client requests local-currency invoicing |
| **CD-3** | Wise-manual flow + Wise-as-Bank in CoA | `JE-2026-06-01-4` removed Wise from v1 plan; may be permanently waived | If Wise volume justifies it post-launch (unlikely v1) |
| **CD-4** | PayPal-manual flow + PayPal-as-Bank in CoA | `JE-2026-06-01-4` placed PayPal on `HOLD` | After PayPal HOLD lifts (separate decision packet) |
| **CD-5** | Credit note / cancellation flow (sandbox edge case; not part of happy-path USD-launch-pilot) | Not part of single-offer USD-launch-pilot; Phase C deferred this | When first refund is needed; recommended packet `ERPNext-Credit-Note-1` |
| **CD-6** | E-invoicing XML emission (Mauritius Revenue Authority) | Below VAT registration threshold; deferred per `ERPNEXT_SANDBOX_PLAN_V1.md` § 9 | When VAT registration is approached |
| **CD-7** | Live PayPal / Wise / payment-gateway API integration | Sandbox-correct posture; live APIs require security review | After real volume + `docs/operations/SECURITY_REVIEW_CHECKLIST.md` pass |

### § 7.5 Final go / no-go verdict

**Today (2026-06-03):** **NO-GO** for using ERPNext production to generate the first real CorpFlowAI AI Lead Rescue pro-forma invoice. Four HARD BLOCKERS open; the production instance does not exist; the Print Format / Letter Head / Company doctype are unfilled. **Continue using the manual-PDF path documented in `LR-Manual-Invoice-Template-V1`** for the Friday launch + first 1–3 paying pilots.

**4–6 weeks out (target window):** **CONDITIONAL GO** — feasible **after** all HARD BLOCKERS close (HB-1 + HB-2 + HB-3 + HB-4) and the MUST work (M-1 through M-9) is executed under explicit Phase D approval. **Realistic dependent on accountant availability** for HB-2 + HB-3.

**8–10 weeks out:** **GO for first submitted Sales Invoice (= first ERPNext-posted revenue).** SHOULD work (S-1 through S-6) closes; first month of real bank reconciliation data validates the workflow; CorpFlowAI Ltd records its first ERPNext revenue.

**Recommended sequencing (mirrors `AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` § 8 critical-path summary):**

```
Today (Friday launch + first 1-3 pilots)
  Manual PDF path. ERPNext sandbox stays untouched.

Week 2-4 (after first paying pilot completes on manual PDF)
  Anton engages Mauritius-licensed accountant ->
    HB-2 (CoA review) + HB-3 (VAT decision) closed.
  Anton exports redacted SBM bank CSV ->
    Cursor imports + reconciles -> HB-4 closed.
  Anton writes Phase D authorisation row -> HB-1 closed.

Week 4-6 (Phase D production install under Cursor + Anton)
  M-1 .. M-9 in sequence. ~6-8 working days of Cursor work.
  First Quotation issued in production to a non-paying dry-run customer (S-6).

Week 6-10 (cutover + first real GL revenue)
  Second paying pilot uses ERPNext production Quotation + Sales Invoice.
  S-1 .. S-5 close in parallel during the first month.
```

## § 8 — Open questions for Anton (block the next packet, if any)

None of these block the merge of THIS evaluation. They block the subsequent `ERPNext-Phase-D-Authorisation-1` packet (when it opens).

| # | Question | Default if unanswered |
|---|---|---|
| Q-A | Production hostname for ERPNext (e.g. `erp.corpflowai.com`, `accounts.corpflowai.com`, or operator's preference) | `erp.corpflowai.com` (Cursor recommendation; needs Anton DNS approval) |
| Q-B | Document-type path: A (Quotation, recommended) or B (Sales Invoice Draft)? | A — Quotation |
| Q-C | Naming series format: `CFLR-QUO-.YYYY.-.NNN` + `CFLR-INV-.YYYY.-.NNN`, OR a single-sequence `CFLR-.YYYY.-.NNN` shared? | Two parallel series (cleaner audit) |
| Q-D | Mauritius-licensed accountant identified to engage for HB-2 + HB-3? | Anton's call; recommended packet `LR-Accountant-Engage-1` produces a brief letter to the accountant referencing this evaluation |
| Q-E | Production instance lives on `corpflow-exec-01-u69678` as a second Frappe site (e.g. `corpflowai-prod.localhost` reverse-proxied) OR on a separate VM? | Same VM, second Frappe site (capacity headroom is 4 vCPU / 7.5 GiB RAM / 150 GB; one production site + one sandbox site fits) |
| Q-F | Backup off-host destination (production-instance backups should not live only on the host) — Hetzner Storage Box, S3, B2, operator's NAS? | Operator's call; recommended packet `ERPNext-Production-Backup-1` proposes options |
| Q-G | First-pilot dry-run customer for S-6: Anton himself, a friendly business, or a synthetic test record? | Synthetic test record `Test Buyer (CFLR-DRY-RUN)` then deleted before go-live |

## § 9 — Honest limits of this evaluation

- **Cursor has not exercised the ERPNext PDF rendering path end-to-end during Phase C.** Phase C cycles 1–4 operated on the database state. The Print Format → wkhtmltopdf path is documented (`ERPNEXT_SANDBOX_INSTALL.md` § 9 line 385) and proven by ERPNext upstream, but no PDF was rendered during Phase C. **The first verification of this path is `ERPNext-PDF-Smoke-1` (separate small packet, recommended after first paying pilot).** This evaluation does not claim PDF rendering works in this CorpFlowAI sandbox specifically; it claims it should work and that the M-4 work item is the place to verify.
- **Estimates of effort for M-1 through M-9 (≈ 6–8 working days) are Cursor-side estimates** assuming HARD BLOCKERS are closed and the operator (Anton) is available for short DNS / SMTP / cert decisions. Real elapsed time depends on accountant turnaround for HB-2 / HB-3.
- **Accountant availability is the real critical-path driver.** A Mauritius-licensed accountant engagement realistically takes 1–3 calendar weeks for HB-2 + HB-3. This evaluation does **not** claim a 4-6 week Phase D timeline if the accountant is unavailable for 6+ weeks.
- **No real bank account number, SWIFT, IBAN, BRN-other-than-the-already-public-`C25228280`, registered-office-other-than-the-already-public Trou Aux Biches address, or operator phone number is in this file.** All bank-side production setup will populate the operator's laptop / SBM dashboard, never the repo.
- **No production ERPNext instance exists at the time of writing.** Every "production" claim in this document is a target posture, not a current state.
- **VAT activation, e-invoicing, recurring billing, MUR invoicing, Wise, PayPal, credit notes, gateway integrations are all CAN-DEFER.** This evaluation does not claim any of them are needed for v1; they are listed in § 7.4 only so they are not forgotten.
- **The Phase D timeline is conditional on first-paying-pilot validation.** If the first paying pilot signals that the offer needs material change (e.g. monthly pricing, different deliverables, different payment route), this evaluation should be re-read and § 7's M / S / CD lists may shift before Phase D is approved.
- **Cutover from sandbox to production is parallel-install, not promotion** (see § 3 Q2.4). Sandbox transactional data does not cross to production.

## § 10 — Standing holds (unchanged by this packet)

Phase D is **not** initiated by this evaluation. `JE-2026-05-29-1` requires fresh operator authorisation; this evaluation documents what Phase D will need; it does not authorise Phase D.

Other holds unchanged: Phase C² · production ERPNext install · scheduler · payment-gateway configuration · Lead Rescue wording adoption · SBM application submission · PAY-SBM-3 · NDA / MCIB · Freshdesk activation · `support` CNAME · DKIM / SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · `JE-2026-06-02-4` ID collision (declared in PR #287 DRA, accepted, no fix this packet).

## § 11 — Hard limits honoured by THIS evaluation

Zero edits to ERPNext production (no production instance exists yet).
Zero edits to the ERPNext sandbox state on `corpflow-exec-01-u69678`.
Zero secrets / API keys / OAuth tokens / DB credentials present.
Zero real bank details (placeholders only; only public Anton-approved values quoted).
Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`.
Zero changes to DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings.
Zero pricing / offer / page-copy changes on customer-facing surfaces.
Pure docs / evaluation artefact.

## § 12 — Cross-references

- `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md` — original sandbox plan + § 10 go/no-go criteria.
- `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` — Phase B install runbook (Phase B-a executed 2026-05-31 → 2026-06-01).
- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` — Phase C cycles 1–4 + Option B remediation (`JE-2026-06-01-3` + `JE-2026-06-01-5`).
- `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` (PR #287, `JE-2026-06-02-4`) — 13-blocker production list § 8 this evaluation refines.
- `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (PR #288, `JE-2026-06-02-7`) — manual-PDF template currently in use; defines W1–W5 verbatim wording.
- `docs/finance/PAYMENT_READINESS_2026_06_01.md` (`JE-2026-06-01-4`) — payment-route reality (SBM primary, PayPal HOLD, Wise removed).
- `docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md` (`JE-2026-06-02-3`) — SBM e-Commerce application readiness.
- `docs/finance/PAY_SBM_2_PAGE_COMPLIANCE_COPY.md` (PR #284, `JE-2026-06-02-4`) — public seller identity (legal name + BRN + address + support email) + W3 setup-window verbatim wording.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* — canonical Item label + single-offer rule + no-guarantee line.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — canonical operator runbook (status pipeline + commercial-card field semantics + 13-item setup checklist).
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — `support@corpflowai.com` sender alias policy (production SMTP target).
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — required if/when a real PayPal/Wise/bank API integration is ever introduced (CAN-DEFER per § 7.4).
- Decision rows: `JE-2026-05-28-1` / `JE-2026-05-29-1` / `JE-2026-05-29-2` / `JE-2026-05-31-2` / `JE-2026-06-01-1` / `JE-2026-06-01-3` / `JE-2026-06-01-4` / `JE-2026-06-01-5` / `JE-2026-06-01-6` / `JE-2026-06-02-1..7` (all consolidated by this evaluation).
- `docs/decisions/JOURNAL.md` row `JE-2026-06-03-1` — this evaluation.

## § 13 — Recommended next packets (proposal-only, not authorised)

| Packet | Scope | Trigger |
|---|---|---|
| `LR-Accountant-Engage-1` | Draft a brief letter to a Mauritius-licensed accountant referencing this evaluation, the § 2.1 CoA draft, the Phase C GL trail, and asking for HB-2 (CoA review) + HB-3 (VAT posture) sign-off in writing. Docs-only. | After first paying pilot completes on the manual-PDF path |
| `ERPNext-Bank-CSV-Test-1` | One-shot small docs+sandbox packet: Anton exports redacted SBM bank statement; Cursor imports via the ERPNext Bank Reconciliation Tool against the existing sandbox Phase C GL; reconcile to MUR 0.00 delta. **Closes HB-4.** Sandbox-only; no production change. | After Anton has 1 month of real SBM activity |
| `ERPNext-PDF-Smoke-1` | One-shot small docs+sandbox packet: render one Quotation PDF and one Sales Invoice PDF from the existing ERPNext sandbox, capture screenshots, document visual deltas vs the manual PDF. No PDF goes to a buyer; no production change. | After first paying pilot completes on the manual-PDF path |
| `ERPNext-Phase-D-Authorisation-1` | Anton-side `JOURNAL.md` row authorising Phase D. **Closes HB-1.** Docs-only. | After HB-2 / HB-3 / HB-4 are all `DONE` |
| `ERPNext-Production-Setup-1` | Phase D execution packet: M-1 through M-9 in § 7.2. Production install (separate Frappe site or separate VM; non-loopback DNS; TLS; scheduler enabled; SMTP); Letter Head + Company doctype; Print Format + naming series; production CoA; production Item; production user / role mapping. **Subject to Phase D approval (HB-1).** Estimated 6–8 working days of Cursor work. | After `ERPNext-Phase-D-Authorisation-1` lands |
| `ERPNext-Production-Backup-1` | Off-host backup configuration for the production instance (Hetzner Storage Box, S3, B2, or NAS — operator-decided). **Closes S-5.** Docs + Cursor implementation under Phase D approval. | After `ERPNext-Production-Setup-1` |
| `ERPNext-First-Submitted-SI-1` | First **submitted** Sales Invoice cycle on production (after first paying pilot on Quotation path completes). Closes S-1 / S-3 / S-4 / S-6. | After `ERPNext-Production-Setup-1` + first 1–3 paying pilots |
| `LR-First-Pilot-Permission-Line-1` | Add a "may we name you in a future case study?" permission line to the operator runbook + a permission-line template. Docs-only. Unlocks Rank 1-3 proof types in `PROOF_VALIDATION_ASSET_PLAN_LR_V1.md`. | After first pilot signs the USD 150 invoice |

## § 14 — Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only

**COMPLETE** at PR merge — no customer-visible URL to probe by design. The next operational milestones are accountant engagement (HB-2 + HB-3, operator-side), redacted bank CSV reconciliation (HB-4, sandbox-side), Phase D authorisation (HB-1, operator-side), and the production setup work (`ERPNext-Production-Setup-1`, subject to fresh approval). Each of those is a separate STATUS report on Bridge `#249`.
