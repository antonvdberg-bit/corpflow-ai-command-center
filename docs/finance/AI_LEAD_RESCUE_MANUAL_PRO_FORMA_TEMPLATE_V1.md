# AI Lead Rescue — manual pro-forma invoice / quote template v1

**Status:** Template only. Docs-only artefact.
**Author:** Assistant (Cursor) on behalf of Anton.
**Date (UTC):** 2026-06-02.
**Trigger:** Anton's DECISION on Operator Bridge issue [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-02, *"AUTHORISE — LR-Manual-Invoice-Template-1"*).
**Linked JOURNAL row:** `JE-2026-06-02-7`.
**Linked sibling work:** `JE-2026-06-02-1` (LR-Pay-1 wording proposal), `JE-2026-06-02-2` (LR-Mauritius outreach copy), the intake-to-invoice operator workflow audit landed in PR #287.
**Purpose:** Provide a redacted, repo-safe, CorpFlowAI-branded starter for the manual pro-forma invoice / quote that Anton issues by hand after intake approval and before any payment is taken. The real PDF is built locally by Anton in Word / Pages / Google Docs from this template — **never** committed to this repo.

This document is a **template + checklist**. No real banking details, no SWIFT/IBAN/account numbers, no payment links, no signed forms, no KYC, no customer data, no API keys, no secrets, no live-payment-gateway claims, no revenue guarantees are included or to be added.

---

## § 0 — Hard limits and sensitive-data exclusion

Out of scope for this packet **and out of scope for any future commit to this repo**:

1. Real **SBM** (or any bank) account number.
2. Real **SWIFT / BIC / IBAN / bank routing / sort-code / branch-code**.
3. Real **payment links** (PayPal, Wise, SBM, Peach Payments, Stripe, any acquirer hosted-checkout URL).
4. Anton's personal **phone number**, identity number, or any KYC-grade personal data.
5. **Signed** NDA / MCIB / merchant pre-screening / business-continuity-plan documents.
6. **Customer-specific** data (real client legal name, contact details, address, BRN, signed contract).
7. **Live payment-gateway claims** (e.g., *"SBM gateway is live"*, *"online card payment available"*, *"Pay now"*, *"instant checkout"*).
8. **Revenue / lead-volume / conversion outcome guarantees** of any kind.
9. **API keys**, OAuth tokens, n8n secrets, recovery-vault tokens, Vercel env vars, GitHub Secrets, Prisma credentials, or any production-DB connection string.
10. **Any change to runtime code, ERPNext production settings, payment-gateway configuration, DNS records, mail-routing, env vars, scheduler state, Telegram bot, Plausible, Search Console, payment settings, GitHub workflow files, or Vercel project settings.**

The real-world pro-forma PDF Anton issues to a client is created **locally** from this template (§ 5). It is **not** committed to this repo. It is **not** stored on a public surface. It is sent 1:1 from Anton's email to the named client.

---

## § 1 — Required verbatim wording (must appear in every pro-forma)

Per Anton's DECISION, the following five sentences are **verbatim required text** and must appear on every issued pro-forma without paraphrase or omission:

> **W1.** *"Payment instructions are sent separately after intake approval."*

> **W2.** *"Setup begins after payment confirmation and receipt of required client information."*

> **W3.** *"Lead Rescue setup is targeted within 48 hours after payment confirmation and receipt of all required client information. Where additional clarification, access, client input, or scope confirmation is needed, setup will normally be completed within 5 business days unless otherwise agreed."*

> **W4.** *"No revenue, lead volume, or conversion outcome is guaranteed."*

> **W5.** *"VAT/tax treatment pending accountant confirmation."*

W3 matches the PAY-SBM-2 (`0fd9312b`) live wording on `pages/terms.js` § Service fulfilment, `components/AiLeadRescueLanding.js` § How payment works, and `pages/refund-policy.js` § Payment timing. **Do not** drift from this wording in any issued document — drift creates a customer-visible contradiction.

---

## § 2 — Pro-forma invoice / quote template (repo-safe markdown)

The block below is a **template**. All bracketed placeholders are populated **locally** by Anton when issuing a real pro-forma. Each placeholder is described in § 3.

```text
═══════════════════════════════════════════════════════════════════════
                          PRO-FORMA INVOICE / QUOTE
═══════════════════════════════════════════════════════════════════════

CorpFlowAI Ltd
Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius
Business Registration Number: C25228280
support@corpflowai.com

[OPTIONAL_LOGO_HERE  —  CorpFlowAI logo image, sized ~ 60 × 60 px
                          rendered above the company-block in the
                          PDF; use the same file at
                          public/assets/logos/LogoSQBK.png]

-----------------------------------------------------------------------

Pro-forma reference   : [INVOICE_NUMBER]
Issue date            : [ISSUE_DATE]
Valid until           : [VALID_UNTIL]
Currency              : USD (United States Dollars)

-----------------------------------------------------------------------

BILL TO

[CLIENT_LEGAL_NAME]
[CLIENT_EMAIL]
[CLIENT_ADDRESS_OPTIONAL]

═══════════════════════════════════════════════════════════════════════
LINE ITEMS
═══════════════════════════════════════════════════════════════════════

Item                                             Qty      Unit         Amount
-----------------------------------------------------------------------
AI Lead Rescue Setup — USD 150 launch pilot       1        USD 150.00   USD 150.00

                                                            Subtotal:   USD 150.00
                                                            VAT/Tax :   [TAX/VAT_STATUS_PENDING_ACCOUNTANT_CONFIRMATION]
                                                            ─────────────────────
                                                            Total   :   USD 150.00

═══════════════════════════════════════════════════════════════════════
PAYMENT
═══════════════════════════════════════════════════════════════════════

Payment instructions are sent separately after intake approval.

[CORPFLOWAI_APPROVED_PAYMENT_INSTRUCTIONS_SENT_SEPARATELY]

═══════════════════════════════════════════════════════════════════════
SERVICE FULFILMENT
═══════════════════════════════════════════════════════════════════════

Setup begins after payment confirmation and receipt of required client
information.

Lead Rescue setup is targeted within 48 hours after payment confirmation
and receipt of all required client information. Where additional
clarification, access, client input, or scope confirmation is needed,
setup will normally be completed within 5 business days unless otherwise
agreed.

This is a digital service. No physical shipment applies. All transactions
for the AI Lead Rescue launch pilot are processed in USD.

═══════════════════════════════════════════════════════════════════════
DISCLAIMERS
═══════════════════════════════════════════════════════════════════════

This pro-forma is a quotation. It is not a tax invoice and is not a
demand for payment until intake approval is confirmed in writing.

No revenue, lead volume, or conversion outcome is guaranteed.

VAT/tax treatment pending accountant confirmation. The final invoice
may differ from this pro-forma if a chargeable tax becomes applicable
under Mauritian VAT law or any other jurisdiction's law.

CorpFlowAI services are offered for lawful business use. CorpFlowAI may
decline an engagement if local sanctions, regulatory, or trust-and-safety
reasons apply.

For service questions or complaints, contact support@corpflowai.com.
We acknowledge messages within two working days for routine queries and
within one business day during active pilot windows.

═══════════════════════════════════════════════════════════════════════
Issued by                : Anton, on behalf of CorpFlowAI Ltd
Pro-forma reference      : [INVOICE_NUMBER]
═══════════════════════════════════════════════════════════════════════
```

**Notes on the template:**

- The block above is rendered in monospace for layout legibility. The real-world PDF Anton produces will use the document tool's normal text styles — the verbatim wording must be preserved; the typography is the operator's choice.
- The four currency lines all read **USD** — this matches PAY-SBM-2 (`0fd9312b`) and `JE-2026-06-01-4` (USD-launch-pilot single-offer rule).
- The `OPTIONAL_LOGO_HERE` block is exactly that — optional. The text-only company block is sufficient on its own.
- No card-scheme logos (Visa / Mastercard / UPI / JCB / Alipay) appear anywhere. This is deliberate per PAY-SBM-2 and the SBM-application-pending posture.
- No payment URL, link, button, or QR code appears on the pro-forma itself. Payment instructions are conveyed in a separate email after intake approval (§ 5 step 7).

---

## § 3 — Field checklist (Anton populates locally)

When Anton creates a real PDF from the template, every placeholder must be replaced with a concrete value or removed. The pro-forma should never reach a client with a bracketed `[…]` placeholder visible.

| # | Placeholder | What goes here | Where it comes from | Example (illustrative; do **not** use verbatim) |
|---|---|---|---|---|
| F1 | `[INVOICE_NUMBER]` | Sequential CorpFlowAI quote reference | Anton's local numbering convention (e.g., year + sequence) | `CF-PF-2026-0001` (illustrative) |
| F2 | `[ISSUE_DATE]` | Date Anton signs/issues the pro-forma | Today's date (Mauritius local) | `2026-06-06` (illustrative) |
| F3 | `[VALID_UNTIL]` | Last date the quote is valid | Issue date + 14 days (Cursor recommendation; Anton can choose longer) | `2026-06-20` (illustrative) |
| F4 | `[CLIENT_LEGAL_NAME]` | Client's legal company name OR sole-trader name | Intake form (or LinkedIn / website verification) | `Acme Mauritius Ltd` (illustrative) |
| F5 | `[CLIENT_EMAIL]` | Email the client used at intake | Intake form | `contact@acme.mu` (illustrative) |
| F6 | `[CLIENT_ADDRESS_OPTIONAL]` | Optional — client's billing address if known | Intake form, or omit entirely if not asked | `Port Louis, Mauritius` (illustrative) |
| F7 | `[OPTIONAL_LOGO_HERE]` | Logo image insertion point | `public/assets/logos/LogoSQBK.png` (or whichever Anton designates) | n/a |
| F8 | `[CORPFLOWAI_APPROVED_PAYMENT_INSTRUCTIONS_SENT_SEPARATELY]` | A one-line restatement that payment instructions follow in a separate email; **NOT** the actual bank/SWIFT/IBAN/payment-link details | Verbatim: *"You will receive payment instructions in a separate email from `support@corpflowai.com` within one business day of issuing this pro-forma."* | n/a |
| F9 | `[TAX/VAT_STATUS_PENDING_ACCOUNTANT_CONFIRMATION]` | Tax / VAT line value | Until accountant confirms: literal text *"Pending accountant confirmation"*; or once confirmed: e.g., *"VAT 0% (out-of-scope)"* or *"VAT included USD …"* | n/a |

**Rules for populating placeholders:**

- F1 (`[INVOICE_NUMBER]`) **must** be unique per issued pro-forma. Duplicates create reconciliation problems if the same pro-forma is ever paid twice or amended.
- F4 (`[CLIENT_LEGAL_NAME]`) **must** match the legal entity that will pay. If the named contact differs from the paying entity, write the paying entity name in F4 and add a *"Attention: [contact name]"* line above BILL TO.
- F5 (`[CLIENT_EMAIL]`) **must** be the same address the payment-confirmation receipt will be sent to. Multiple-recipient pro-formas are fine if scoped to one paying entity.
- F8 (payment instructions) — Anton sends actual SBM / Wise / Peach / SBM-MUR-transfer / SBM-USD-transfer details **in a separate email**, **never inline** on the pro-forma. This is the design — see § 5 step 7.

---

## § 4 — Line items

For v1 (USD 150 launch pilot, single-offer rule per `JE-2026-05-28-1`), the line-item block is fixed:

| Item | Qty | Unit | Amount |
|---|---|---|---|
| **AI Lead Rescue Setup — USD 150 launch pilot** | 1 | USD 150.00 | USD 150.00 |

**Do not add other line items in v1 unless Anton explicitly authorises a follow-up template revision.** Specifically:
- No "Setup fee" line separate from the pilot.
- No "Onboarding call" line.
- No "Monitoring" or "Support" line.
- No "VAT" line item — VAT is handled as a single subtotal modifier per § 1 W5 / § 3 F9.
- No discount line, no surcharge line, no "consulting" line.

If the future productisation diverges (e.g., second-tier offer or recurring component), a separate small template revision PR (LR-Manual-Invoice-Template-V1.1) will land **after** Anton's DECISION authorises it.

---

## § 5 — Operator instructions (Anton: how to produce the real PDF locally)

The repo contains only the template. The real-world PDF is created locally and never committed.

### § 5.1 — Suggested local workflow

1. **Open a fresh document** in Microsoft Word / Apple Pages / Google Docs (Anton's choice).
2. **Paste in** the template block from § 2 (or rebuild it manually using the same structure).
3. **Replace every `[…]` placeholder** with the concrete value per the § 3 field checklist.
4. **Insert the CorpFlowAI logo** at the top of the document, using `public/assets/logos/LogoSQBK.png` (or whichever file Anton designates as canonical). Keep the company-identity text block immediately below — do not delete it.
5. **Visual proof-read.** Confirm the five verbatim wordings W1–W5 from § 1 are present, character-for-character. A diff-style read against this template is the safest check.
6. **Save the document** to a non-repo local folder (e.g., `~/CorpFlowAI/pro-formas/2026/CF-PF-2026-0001.docx`). **Never** save to `corpflow-ai-command-center/`. **Never** commit a populated pro-forma to git.
7. **Export to PDF** from the document tool.
8. **Send to the client** as an attachment to a personal email from `support@corpflowai.com` (or whichever sender alias is appropriate per `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`). The email body briefly explains the pro-forma is a quotation and that payment instructions follow under separate cover.
9. **Send the payment-instructions email separately** to the same client email **after** intake approval. The payment-instructions email contains the actual SBM-MUR-transfer details, SBM-USD-transfer details, Wise details, or whichever route is appropriate — these details **never appear on the pro-forma**.
10. **Record the pro-forma reference** (`[INVOICE_NUMBER]`) in Anton's local CMP / spreadsheet so reconciliation against the eventual real payment is unambiguous. This local log is **not** committed to this repo; it lives in Anton's local files alongside the populated pro-forma.

### § 5.2 — Why a two-email design

Splitting the pro-forma (quotation) from the payment instructions (concrete bank/route details) has three benefits:

1. **Reduces leakage risk.** If a pro-forma PDF is forwarded by the client, attached to a JIRA ticket, posted on a Slack channel, etc., it does not contain real bank account numbers.
2. **Lets payment route be decided per-client.** Different clients may need different routes (SBM MUR transfer for Mauritius warm-network, SBM USD transfer for South Africa / international warm-network, Wise outbound for clients who prefer Wise, manual invoice for warm-network where the customer wants to pay by traditional bank transfer). The decision happens in the payment-instructions email, not on the pro-forma.
3. **Matches the live website wording.** PAY-SBM-2 (`0fd9312b`) merged copy says *"Payment is handled after intake review and scope confirmation. This website does not collect card or banking details."* The two-email pro-forma + payment-instructions workflow is the operational expression of that public claim.

### § 5.3 — What to do if the client asks for the bank details on the pro-forma itself

This is a common request, especially from accounting-conservative buyers. Recommended response (Anton's call; Cursor's draft):

> *"The pro-forma we issued is the quotation document. Once you confirm you'd like to proceed, we'll send the SBM (or Wise, or whichever route fits) details by email under separate cover. We keep banking details off the quotation so the document is safe to forward internally for approval."*

Anton may adapt this as needed. The principle stays: banking details flow in a separate, narrower-distribution email.

### § 5.4 — Storage and retention (Anton's local files, NOT this repo)

Recommended local folder structure (Cursor draft; Anton's choice):

```
~/CorpFlowAI/pro-formas/
  2026/
    CF-PF-2026-0001.docx
    CF-PF-2026-0001.pdf
    CF-PF-2026-0001-payment-instructions-email.txt
    CF-PF-2026-0001-reconciliation-notes.txt
```

Retention: **7 years** from issue date, matching typical SBM merchant-agreement retention and Mauritian commercial-document retention norms.

---

## § 6 — Coexistence with PAY-SBM-2 / LR-Pay-1 / SUPPORT-1

| Surface | Status | What this template assumes |
|---|---|---|
| `pages/terms.js` § Service fulfilment | Live (PAY-SBM-2, `0fd9312b`) | Pro-forma wording W3 mirrors verbatim |
| `pages/refund-policy.js` § Payment timing | Live (PAY-SBM-2) | Pro-forma carries no refund / cancellation duplication; refers via the policy link in the optional cover email |
| `pages/contact.js` § Customer support and complaints | Live (PAY-SBM-2) | Pro-forma footer surfaces `support@corpflowai.com` + 2-working-day SLA |
| `components/PublicSiteFooter.js` merchant identity | Live (PAY-SBM-2) | Pro-forma carries the same registered office + BRN as the public footer |
| `components/AiLeadRescueLanding.js` *§ How payment works* | Live (post-LR-Pay-1 proposal, PR #281 merged) | Pro-forma wording is consistent — Anton's verbatim recommended wording in `LR_PAY_1_TRANSITIONAL_WORDING_PROPOSAL.md` is reflected here |
| `docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md` | On main (PR #283) | Pro-forma reinforces the readiness doc's customer-support and complaint-handling posture |
| `docs/operations/SUPPORT_1_FRESHDESK_ACTIVATION_PLAN.md` | On main (PR #286) | Pro-forma references `support@corpflowai.com` as the support channel; consistent with the activation plan's 2-working-day SLA |
| `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` § 3 sender alias `support@corpflowai.com` | Live | Pro-forma cover email + payment-instructions email both go from `support@corpflowai.com` |

**No contradiction with any merged doc or live page.** The template is the operational expression of all the merged commitments above.

---

## § 7 — Verification rubric (run before opening the PR; re-run after audits)

| # | Check | Pass condition |
|---|---|---|
| V1 | Only docs/template files in diff | Files changed = `{this new doc}` + `docs/decisions/JOURNAL.md` + `artifacts/chat_history.md`. No other files. |
| V2 | No real banking details present | repo-wide search for `IBAN`, `SWIFT`, `BIC`, `MU\d\d`, `MCB`, *"account number"* with concrete digits → zero matches in the template (the doc *mentions* the categories in § 0 but does not include any real value) |
| V3 | No secrets / KYC / API keys | repo-wide search for `passport`, `proof of address`, `bank statement`, `API key=`, `Bearer `, OAuth token signatures → zero matches in the new doc beyond the § 0 exclusion list itself |
| V4 | No runtime files changed | Zero edits under `api/`, `lib/`, `prisma/`, `middleware*`, `scripts/`, `components/`, `pages/`, `public/`, `.github/`, `node-tests/`, `tests/`, `core/engine/`, `.env*`, `vercel.json`, `next.config*`, `package*.json`, `tsconfig*` |
| V5 | No ERPNext production changes | Zero edits under `docs/runbooks/ERPNEXT*`, zero changes to scheduler state, zero changes to sandbox or production ERPNext config; the template doc does not even reference ERPNext production |
| V6 | No payment-automation / gateway changes | Zero edits to `lib/automation/`, zero new payment-route code, zero new env vars; the template carries no payment URL / button / QR / live-gateway claim |
| V7 | No live-payment claims added | repo-wide search on the new doc for `Pay now`, `instant checkout`, `online card payment available`, `SBM gateway is live`, `PayPal accepted`, `Wise accepted`, `international bank transfer` (as a primary CTA) → zero matches outside the § 0 exclusion list and § 5.3 *"SBM (or Wise…)"* operator-guidance mention |
| V8 | Verbatim wording W1–W5 present | All five sentences appear character-for-character in the template block in § 2 |
| V9 | All eight required placeholders present | All eight of `[INVOICE_NUMBER]`, `[ISSUE_DATE]`, `[VALID_UNTIL]`, `[CLIENT_LEGAL_NAME]`, `[CLIENT_EMAIL]`, `[CLIENT_ADDRESS_OPTIONAL]`, `[CORPFLOWAI_APPROVED_PAYMENT_INSTRUCTIONS_SENT_SEPARATELY]`, `[TAX/VAT_STATUS_PENDING_ACCOUNTANT_CONFIRMATION]` literally appear in the template |
| V10 | Single-offer rule preserved | The only line item is *"AI Lead Rescue Setup — USD 150 launch pilot"* — no second tier, no recurring component (per `JE-2026-05-28-1`) |
| V11 | BRN + address match PAY-SBM-2 live copy | `BRN C25228280` + `Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius` exactly as on `pages/about.js`, `components/PublicSiteFooter.js`, `pages/contact.js` (merged at `0fd9312b`) |
| V12 | Marketing quality gate | `npm run check:marketing-quality-gate` returns PASS |

---

## § 8 — Standing holds (unchanged by this packet)

Phase D · Phase C² · runbook §8.1 · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption · SBM application submission · PAY-SBM-3 · NDA / MCIB · Freshdesk account creation · trial · paid plan · `support` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL.

**New holds introduced by this packet:** none beyond the existing list. This is a template artefact only — no operational hold needed.

---

## § 9 — Hard limits honoured

Zero real bank account numbers; zero SWIFT / BIC / IBAN / routing details; zero personal phone / identity / KYC data; zero signed documents; zero customer data; zero secrets; zero API keys; zero payment links; zero live-payment-gateway claims; zero revenue / lead-volume / conversion guarantees.

Zero changes to runtime code, ERPNext production, payment-gateway configuration, DNS, mail-routing, env vars, scheduler, Telegram, Plausible, Search Console, payment settings, GitHub workflow files, Vercel project settings, or any production / staging surface.

---

## § 10 — Open questions for Anton (block the next packet, if any)

| # | Question | Default if unanswered |
|---|---|---|
| Q1 | Pro-forma numbering convention — Cursor draft `CF-PF-2026-NNNN` (4-digit zero-padded sequence) or different? | `CF-PF-2026-NNNN` |
| Q2 | Validity window — 14 days from issue (Cursor recommendation) or different? | 14 days |
| Q3 | Address line on BILL TO — always include if known (Cursor recommendation) or omit entirely v1? | Include if known |
| Q4 | Tax line — leave as literal *"Pending accountant confirmation"* until accountant signs off, or use a placeholder string? | Literal *"Pending accountant confirmation"* |
| Q5 | Logo placement — top-left of pro-forma (Cursor recommendation, matches PAY-SBM-2 footer styling) or centred header? | Top-left |
| Q6 | Single PDF per client, or a separate quote + invoice pair? Cursor recommendation: single pro-forma in v1 (this template). The "real" tax invoice issued post-payment is a separate concern that lives in ERPNext (when Phase D unblocks) — out of scope here. | Single pro-forma per client v1 |
| Q7 | Locale / language — English only v1 (matches `JE-2026-06-02-2` warm-network outreach posture), or English + French side-by-side? | English only v1 |
| Q8 | Storage / retention — Cursor recommendation 7 years matching SBM merchant-agreement norms, in Anton's local `~/CorpFlowAI/pro-formas/<year>/`. | 7 years, local |

None of Q1–Q8 block the merge of this template PR. They become relevant only when Anton issues the first real pro-forma to a Mauritius warm-network client (post-Friday outreach).

---

## § 11 — ANTON TO-DO (when ready to use this template)

1. **Decide Q1–Q8** (above) — or accept defaults silently when you produce the first real pro-forma.
2. **Confirm with the accountant** on Q4 / Q9 (W5) — Mauritius VAT applicability for digital services to:
   - a Mauritius-based business customer
   - a South Africa-based business customer
   - a USA / Australia / EU business customer
   This is the same accountant-confirmation that PAY-SBM-1 § 1 D-row R1 / R2 flagged.
3. **Choose pro-forma numbering** (Cursor recommendation: `CF-PF-2026-NNNN`).
4. **Build the first PDF locally** from § 5 instructions when a first warm-network Mauritius client confirms interest.
5. **Send the first pro-forma + a separate payment-instructions email** from `support@corpflowai.com` per § 5 steps 8–9.
6. **Record the issued reference** in your local CMP / spreadsheet (§ 5.4 layout).
7. **After first 3 issued pro-formas**, request a small template revision PR (LR-Manual-Invoice-Template-V1.1) if any wording needs refinement based on real client interactions. Cursor will only act on an explicit DECISION.

---

## § 12 — Cross-references

- `pages/terms.js` § Service fulfilment (live, PAY-SBM-2 `0fd9312b`) — verbatim source of W3.
- `pages/refund-policy.js` § Payment timing (live) — refund-policy posture mirrored in pro-forma footer.
- `pages/contact.js` § Customer support and complaints (live) — support-SLA wording mirrored.
- `components/PublicSiteFooter.js` (live) — merchant-identity block mirrored.
- `components/AiLeadRescueLanding.js` § How payment works (live) — payment design mirrored.
- `docs/marketing/LR_PAY_1_TRANSITIONAL_WORDING_PROPOSAL.md` (PR #281) — Anton's verbatim recommended payment wording.
- `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` (PR #282) — outreach copy this pro-forma supports.
- `docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md` (PR #283) — SBM readiness; this template is the manual fallback while SBM application is pending.
- `docs/finance/PAYMENT_READINESS_2026_06_01.md` (PR #278) — payment-route reality.
- `docs/operations/SUPPORT_SYSTEM_FEASIBILITY_V1.md` (PR #285) and `docs/operations/SUPPORT_1_FRESHDESK_ACTIVATION_PLAN.md` (PR #286) — support channel.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — `support@corpflowai.com` sender alias policy.
- AI Lead Rescue intake-to-invoice operator workflow audit (PR #287, on main `f81bd55a`) — sibling docs-only audit that catalogued the end-to-end Anton workflow this template plugs into.
- `JE-2026-05-28-1` single-offer rule.
- `JE-2026-06-01-4` payment-route reality.
- `JE-2026-06-02-1` LR-Pay-1 proposal.
- `JE-2026-06-02-7` — this template (recorded in `docs/decisions/JOURNAL.md`).

---

## § 13 — Change-log

- **2026-06-02 (v1):** Initial template. 13 sections covering hard limits + sensitive-data exclusion, verbatim wording W1–W5, repo-safe markdown template, 8 required placeholders, single-offer line-item rule, 10-step local-PDF operator instructions, two-email pro-forma + payment-instructions design, storage/retention, coexistence matrix with PAY-SBM-2 / LR-Pay-1 / SUPPORT-1 / comms-v1, 12-row verification rubric, 8 open questions Q1–Q8 with defaults, ANTON TO-DO 7-step. (`JE-2026-06-02-7`.)
