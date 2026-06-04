# CFLR Mauritius Pro-forma Invoice v1 — Print Designer template design brief

**Status:** Docs / design-specification only. **No ERPNext server commands. No Print Designer install. No repo runtime changes. No invoices. No Sales Invoice submission. No GL posting. No VAT / tax-invoice wording. No real bank details. No payment-gateway configuration. No secrets.**

**Anchor sentinel:** `<!-- CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1 -->`

<!-- CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1 -->

**Author:** Assistant (Cursor) on Anton's Windows laptop (L1), on behalf of Anton.
**Date (UTC):** 2026-06-05.
**Authorisation:** Anton's chat DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-05 *"AUTHORISE — ERPNext-ProForma-Template-Design-Brief-1"*). Approved scope: docs / design specification only; no ERPNext server commands; no Print Designer install; no repo runtime changes; no invoices; no Sales Invoice submission; no GL posting; no VAT / tax-invoice wording; no real bank details; no payment-gateway configuration; no secrets.
**Linked JOURNAL row:** `JE-2026-06-05-1` (`docs/decisions/JOURNAL.md`).
**Linked chat history:** `artifacts/chat_history.md` § *2026-06-05 — `ERPNext-ProForma-Template-Design-Brief-1`*.

**Purpose:** Prepare the specification brief for the **first CorpFlowAI ERPNext Print Designer template** — a Mauritius pro-forma invoice for AI Lead Rescue — so that once Print Designer is installed on the existing production shell (`corpflowai-production.localhost` on `corpflow-exec-01-u69678`), Anton has a single self-contained document describing **exactly** what to build visually, with required wording, forbidden wording, acceptance criteria, and a UI checklist.

This brief is **not** the install. The install lives in a separate authorisation packet (`ERPNext-PrintDesigner-Install-1`, defined as a shape in `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` § 7.2; unauthorised at the time of writing).

---

## § 0 — Hard limits honoured by THIS brief

- Zero ERPNext server commands executed.
- Zero installation of Frappe Print Designer.
- Zero edits to ERPNext production-shell state on `corpflow-exec-01-u69678` (`corpflowai-production.localhost` Docker project `corpflowai-production`).
- Zero edits to the ERPNext sandbox state on `corpflow-exec-01-u69678` (`corpflowai-sandbox.localhost` Docker project `corpflowai-sandbox`).
- Zero changes to the live `host_name = http://frontend:8080` value set under `JE-2026-06-04-5`.
- Zero Sales Invoice creation or submission.
- Zero GL posting.
- Zero VAT activation or "Tax invoice" / "VAT invoice" wording introduced anywhere.
- Zero real bank account number, SWIFT, BIC, IBAN, routing, sort-code, branch-code, card number, payment-gateway API key, OAuth token, KYC-grade personal data, signed NDA/MCIB form, or customer-specific data added to this repo.
- Zero invoices issued or pro-formas sent.
- Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`.
- Zero changes to DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings / Postgres / Neon / Prisma schema.
- Zero pricing / offer / page-copy changes on customer-facing surfaces.
- Pure docs / design-specification artefact.

---

## § 1 — Template name

**Canonical name (Frappe doctype):** **`CFLR Mauritius Pro-forma Invoice v1`**

- `CFLR` = **C**orpFlow**A**I **L**ead **R**escue (already-used prefix per `JE-2026-06-04-3` § 13 `CFLR Pro-forma Invoice`, `CFLR-QUO-.YYYY.-.NNN`).
- `Mauritius` makes the variant explicit (so future South Africa / USA / generic variants land beside it without ambiguity — see § 8).
- `v1` lets future revisions land as `CFLR Mauritius Pro-forma Invoice v2` without disturbing in-flight templates.

**Naming alignment:**

- The recipe `ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` § 13 created the placeholder Print Format `CFLR Pro-forma Invoice` against classic Letter Head / wkhtmltopdf (emergency / transitional path per `JE-2026-06-04-6` § 9 v1.1 advisory). Once Print Designer is installed under `ERPNext-PrintDesigner-Install-1`, **this brief is the source of truth for `CFLR Mauritius Pro-forma Invoice v1`** — a *separate* Print Format record built in the Print Designer visual editor, not a mutation of the placeholder. The placeholder stays put as the wkhtmltopdf fallback (or is deleted on operator decision after the Print Designer template is verified).

**Doctype field shape (for reference; the install packet writes these — this brief only specifies):**

| Print Format field | Value |
|---|---|
| `name` | `CFLR Mauritius Pro-forma Invoice v1` |
| `doc_type` | `Quotation` |
| `print_format_type` | `Jinja` (Print Designer stores layout as JSON on the record; the rendered output is Jinja) |
| `pdf_generator` | `chrome` (Print Designer Chrome PDF backend per `JE-2026-06-04-4` § 4; **not** `wkhtmltopdf`) |
| `disabled` | `0` |
| `standard` | `No` (custom, not shipped with Frappe) |
| `module` | `Custom` |

---

## § 2 — Source doctype

**`Quotation`** (not `Sales Invoice`).

Per `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 2 Q1.2 + `ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` § 6.2 (Path A, Cursor recommendation):

| Aspect | `Quotation` (chosen) | `Sales Invoice (Draft)` (rejected) |
|---|---|---|
| Pre-payment semantics | Native — Quotation **is** the pre-payment document in ERPNext | Awkward — Sales Invoice is a tax document temporarily held at `docstatus=0` |
| Risk of accidental GL posting | None (Quotation never posts to GL) | High (a single accidental "Submit" click posts revenue prematurely) |
| Sequence collision risk | None | Occupies a name in the naming series even at Draft |
| Convert-on-payment | Built-in "Convert to Sales Invoice" button on a Submitted Quotation | Direct submission of the Draft Sales Invoice |
| Naming series | `CFLR-QUO-.YYYY.-.NNN` (per `JE-2026-06-04-3` § 12) | `CFLR-INV-.YYYY.-.NNN` (reserved for the post-VAT Sales Invoice; not used here) |

**Decision recorded:** `doc_type = Quotation`. The template renders Quotation records and is *intentionally* unavailable as a `Sales Invoice` Print Format — that is a separate future variant (§ 8) gated on accountant VAT sign-off (HB-2 / HB-3) and an explicit authorisation packet.

---

## § 3 — Purpose

`CFLR Mauritius Pro-forma Invoice v1` is **a client-facing pro-forma / payment-request document** that an operator (Anton) issues after intake approval, before any payment is taken.

**It is:**

- A pre-payment quotation that names the work, the price, the currency, and what happens after payment confirmation.
- Visually professional enough to send to a CEO, clinic owner, property owner, or other decision-making buyer without losing trust.
- The ERPNext-native equivalent of the manual Word/Pages PDF described in `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (which remains the canonical mechanism until Print Designer is installed, the Print Format is approved, the four hard blockers HB-1 / HB-2 / HB-3 / HB-4 close, and Anton authorises the first ERPNext-emailed PDF to a real client — see § 13 *Standing holds*).

**It is NOT:**

- A **tax invoice**. The phrase "Tax invoice" must not appear anywhere on the rendered PDF.
- A **VAT invoice**. The phrase "VAT invoice" must not appear anywhere on the rendered PDF. CorpFlowAI is currently in the pre-VAT-review posture (W5 / HB-3 pending per `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7.1).
- A **receipt**. A receipt acknowledges money already received; a pro-forma is a quotation pre-payment. The two must not be conflated in either wording or visual treatment.
- A **payment-confirmation email**. Per `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 5.2 two-email design, payment instructions (SBM wire / Wise / other route) are sent in a **separate** email after intake approval; the pro-forma itself carries no bank account number, SWIFT, IBAN, link, button, or QR code.
- A **demand for payment** until the operator has confirmed intake approval in writing.

---

## § 4 — Required visible fields (on the rendered PDF)

These are the fields a buyer must see on the PDF. The right column shows the data source (Quotation doctype field or operator-entered value during creation).

### § 4.1 Seller-identity block (top of page)

| # | Field | Source | Notes |
|---|---|---|---|
| F1 | `CorpFlowAI Ltd` | Company doctype `company_name` | Already filled by `JE-2026-06-04-3` § 8 |
| F2 | `BRN C25228280` | Company doctype `tax_id` (or custom field `brn`) | Already filled by `JE-2026-06-04-3` § 8; verbatim as the public BRN per `JE-2026-06-02-4 PAY-SBM-2` |
| F3 | Registered office `Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius` | Address doctype `CorpFlowAI Ltd - Registered Office` linked to Company | Already filled by `JE-2026-06-04-3` § 8 |
| F4 | Contact email `support@corpflowai.com` | Company doctype `email` | Already filled by `JE-2026-06-04-3` § 8; matches `CORPFLOW_COMMUNICATIONS_V1.md` § 3 sender-alias policy |
| F5 | Optional: website `https://corpflowai.com` | Company doctype `website` | Already filled by `JE-2026-06-04-3` § 8 |

### § 4.2 Buyer-identity block (immediately below the seller block, visually distinct)

| # | Field | Source | Notes |
|---|---|---|---|
| F6 | Client legal name | Quotation `party_name` → linked Customer `customer_name` | Operator copies from `/admin/lead-rescue/[id]` Card 1 per `AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` § 3 |
| F7 | Client business / trading name (if different from legal name) | Customer `customer_details` or custom field; falls back to legal name | Optional; omit the row entirely if no separate business name |
| F8 | Client contact email | Customer linked Contact `email_id` | From intake form (`leads.email` per `lib/server/tenant-intake.js`) |
| F9 | Client billing address (optional) | Customer linked Address (Billing) | Omit row entirely if not gathered during qualification |

### § 4.3 Document identity block (top-right of page, opposite the seller block)

| # | Field | Source | Notes |
|---|---|---|---|
| F10 | Document type label `Pro-forma invoice` | Static text in the Print Designer header | **Verbatim** — see § 5 W-Title |
| F11 | Quote / pro-forma number | Quotation `name` | From the `CFLR-QUO-.YYYY.-.NNN` naming series per `JE-2026-06-04-3` § 12 |
| F12 | Issue date | Quotation `transaction_date` | Defaults to today; operator can override |
| F13 | Validity / expiry date (if available) | Quotation `valid_till` | Cursor default = issue date + 14 days per `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 10 Q2; if unset on the Quotation, the row is omitted on the PDF (do **not** render a blank `Valid until: —` row) |
| F14 | Currency label `USD` | Quotation `currency` | Per `JE-2026-05-28-1` single-offer USD launch pilot |

### § 4.4 Line-item block

| # | Field | Source | Notes |
|---|---|---|---|
| F15 | Item / service description | Quotation item row `description` (from Item `LR-SETUP-USD-150` `item_name` = `"AI Lead Rescue Setup (USD 150 launch pilot)"`) | **Verbatim** Item name per `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* + `JE-2026-05-28-1` single-offer rule |
| F16 | Quantity | Quotation item row `qty` = `1` | Fixed for v1 |
| F17 | Unit price | Quotation item row `rate` = `150.00` | Fixed for v1; USD |
| F18 | Currency code | Quotation item row `currency` = `USD` | Inherited from Quotation header |
| F19 | Line amount | Quotation item row `amount` = `150.00` | Computed; USD |

### § 4.5 Totals block (bottom-right of line-item block)

| # | Field | Source | Notes |
|---|---|---|---|
| F20 | Subtotal | Quotation `net_total` | USD 150.00 in v1 |
| F21 | VAT / Tax line | Static placeholder text `"Pending accountant confirmation"` | **Do not** render an empty `0.00` value. Per `ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` § 5 + W5 in § 5 of this brief, the literal phrase must appear until HB-3 closes. |
| F22 | Total | Quotation `grand_total` | USD 150.00 in v1 |

### § 4.6 Payment-instructions placeholder block (below totals)

| # | Field | Source | Notes |
|---|---|---|---|
| F23 | Payment-instructions wording | Static text in the Print Designer footer | **Verbatim** W1 — see § 5. **Must NOT include any real bank account number, SWIFT, IBAN, BIC, routing code, sort code, payment URL, payment button, QR code, or third-party payment-provider logo.** If a placeholder is shown at all, it must be explicitly marked `[Sent separately — see § 5 W1]`. |

### § 4.7 Setup-start conditions + no-guarantee + tax-treatment block (below payment-instructions block, visually separated as the "fine print")

| # | Field | Source | Notes |
|---|---|---|---|
| F24 | Setup-start condition wording | Static text | **Verbatim** W2 — see § 5 |
| F25 | Setup target wording | Static text | **Verbatim** W3 — see § 5 |
| F26 | No-guarantee wording | Static text | **Verbatim** W4 — see § 5 |
| F27 | Tax-treatment wording | Static text | **Verbatim** W5 — see § 5 |

### § 4.8 Issuer / closing block (bottom of page)

| # | Field | Source | Notes |
|---|---|---|---|
| F28 | Issuer line | Static `"Issued by Anton on behalf of CorpFlowAI Ltd"` | Mirrors `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 2 |
| F29 | Pro-forma reference (repeated, for safety on multi-page rendering) | Quotation `name` | Same as F11; printed in the footer of every page |
| F30 | Page number (`Page X of Y`) | Print Designer page-number widget | Standard ERPNext PDF convention |

**Total: 30 fields across 8 visual blocks.** All fields are either (a) Company / Address doctype values already filled by `JE-2026-06-04-3`, (b) Quotation / Item / Customer doctype values populated at Quotation-creation time, or (c) static text owned by the Print Designer template itself.

---

## § 5 — Required wording (verbatim, must appear on every rendered PDF)

The following six strings must appear character-for-character on the rendered PDF. Five of them (W1–W5) are reproduced from `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 1 (the canonical pre-VAT-review wording, already on the live page since 2026-06-02 per PAY-SBM-2 `0fd9312b`). The sixth (W-Title) is the document-type label.

| ID | Verbatim string (do not paraphrase, do not abbreviate, do not translate) | Block (per § 4) |
|---|---|---|
| **W-Title** | `Pro-forma invoice` | Document identity (F10) |
| **W1** | `Payment instructions are sent separately after intake approval.` | Payment-instructions placeholder (F23) |
| **W2** | `Setup begins after payment confirmation and receipt of required client information.` | Setup-start conditions (F24) |
| **W3** | `Setup target: 48 hours after payment confirmation, subject to client responsiveness and required access/information.` | Setup target (F25) |
| **W4** | `No revenue, lead volume, or conversion outcome is guaranteed.` | No-guarantee (F26) |
| **W5** | `VAT/tax treatment pending accountant confirmation.` | Tax-treatment (F27) |

**Note on W3 wording variant:** the longer manual-pro-forma W3 (in `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 1, also embedded in the production-shell recipe § 13) reads *"Lead Rescue setup is targeted within 48 hours after payment confirmation and receipt of all required client information. Where additional clarification, access, client input, or scope confirmation is needed, setup will normally be completed within 5 business days unless otherwise agreed."* The shorter W3 above is the version Anton specified in the AUTHORISE message for this brief, and is the one the Print Designer template must use. **If accountant or operator feedback later requires aligning on the longer W3** (or any other wording), the change must land on both the production Print Format and the live page (`pages/terms.js`, `pages/refund-policy.js`, `pages/contact.js`, `components/AiLeadRescueLanding.js`) **in the same coordinated change**, per `ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` § 6 Q-Doc-3.

**Bilingual / French note:** v1 is English-only (per `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 10 Q7 default). French-side or bilingual variants are deferred to a future template revision (§ 8 *Generic Mauritius bilingual variant*) and require a separate authorisation packet.

---

## § 6 — Forbidden wording (must NOT appear anywhere on the rendered PDF)

The following strings (or close paraphrases) must **not** appear in any block of the PDF — header, footer, line items, totals, payment block, fine-print, watermark, image alt text, or hidden HTML comments. The Print Designer install packet (`ERPNext-PrintDesigner-Install-1`) will carry a defensive forbidden-wording assertion on the rendered HTML (same pattern as `ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` § 13 for the placeholder Print Format).

| ID | Forbidden string / phrase / pattern | Why forbidden |
|---|---|---|
| FB-1 | `Tax invoice` | Not a tax document; CorpFlowAI is pre-VAT-review per HB-3 / W5 |
| FB-2 | `VAT invoice` | Same as FB-1 |
| FB-3 | `Pay now` | Buyer must not be CTA'd into payment from the PDF; payment routes via separate email per `JE-2026-06-01-4` + `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 5.2 |
| FB-4 | `PayPal accepted` | PayPal is on HOLD per `JE-2026-06-01-4`; no "accepted" marketing claim on any artefact |
| FB-5 | `Wise accepted` | Wise was removed from v1 per `JE-2026-06-01-4`; no marketing claim |
| FB-6 | `Instant checkout` | No checkout exists; misrepresents the manual two-email payment design |
| FB-7 | `revenue guarantee` / `guaranteed revenue` | Contradicts W4 + `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* (no-guarantee rule) |
| FB-8 | `lead volume guarantee` / `guaranteed leads` / `guaranteed enquiries` | Same as FB-7 |
| FB-9 | `conversion guarantee` / `guaranteed conversions` / `guaranteed bookings` | Same as FB-7 |
| FB-10 (operational corollary) | Card-scheme logos (Visa, Mastercard, UnionPay, JCB, Alipay) or wordmarks for third-party providers (PayPal, Wise, Stripe, SBM e-Commerce gateway logos) | None of these payment routes exist on the pro-forma surface; their presence implies an "accepted-payment" claim CorpFlowAI cannot back per `JE-2026-06-01-4` |
| FB-11 (operational corollary) | Any real bank account number, SWIFT, BIC, IBAN, sort code, routing number, branch code, MUR/USD account digits | Hard rule per `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 0; reinforced by § 0 hard limits in this brief |
| FB-12 (operational corollary) | Any payment URL, payment button, payment QR code | Same as FB-11; payment routing is two-email per `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 5.2 |

**The forbidden-wording assertion in the install packet will run as a post-render check** on the produced PDF HTML; if any FB-1..FB-9 substring is present (or any FB-10 logo is detected by alt-text matching), the install script aborts with a non-zero exit code and does **not** save the Print Format as the default — same defensive pattern proven on the placeholder Print Format in `ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` § 13 (defensive `forbidden_strings = [...]` regex sweep).

---

## § 7 — Visual direction

### § 7.1 Aesthetic principles

| Principle | What it means in practice |
|---|---|
| **Clean** | Single colour palette; one body font + one display font maximum; no decorative dividers; consistent grid; no busy iconography |
| **Premium** | Generous margins (top/bottom 25 mm minimum, left/right 20 mm minimum); restrained use of accent colour; one strong horizontal rule under the header, one strong horizontal rule above the totals |
| **High-trust** | All claims defensible (W1–W5 verbatim); legal entity, BRN, registered office prominent in the header block; no marketing puffery; no exclamation marks |
| **Lots of whitespace** | Line-item table has at least 12 pt vertical padding per row; the setup-start / no-guarantee / tax-treatment block sits in a clearly separated "fine print" zone with at least 8 mm above and below |
| **Clear hierarchy** | H1 = Document type label (W-Title); H2 = section labels (`BILL TO`, `LINE ITEMS`, `PAYMENT`, `SERVICE FULFILMENT`, `DISCLAIMERS`); body text smaller and lighter |
| **No clutter** | No decorative footers; no "Thank you for your business" boilerplate; no QR codes; no card-scheme logos; no social-media handles; no "Powered by ERPNext" |
| **No cheap invoice-template look** | Avoid: rainbow gradient headers, watermarked "PAID" / "DUE" stamps, drop-shadow boxes, neon highlights, clip-art icons, business-cliché stock backgrounds, multiple competing fonts. The reference aesthetic is a one-page CEO-readable engagement letter, not a SaaS-template invoice. |

### § 7.2 Colour palette (Print Designer template — printed-page colours)

CorpFlowAI's website palette is dark-mode (deep navy backgrounds with teal accents); a printed PDF must invert into a high-contrast light-mode palette suitable for ink-on-paper or screen-on-white. The website teal `#2dd4bf` (the canonical CorpFlowAI accent per `BRAND_IDENTITY_V1_PROPOSAL.md` BI-D-1) remains the single accent colour, used sparingly.

| Role | Hex | Where used on the PDF |
|---|---|---|
| Page background | `#FFFFFF` | Whole page |
| Primary ink (body, headings) | `#0B1220` (near-black, slightly warm) | All body text |
| Secondary ink (labels, metadata) | `#4A5563` (mid-grey) | Section labels, field labels, page-number footer |
| Accent (single, restrained) | `#2dd4bf` (CorpFlowAI teal) | One horizontal rule under header; one horizontal rule above totals; small accent on the W-Title document type label (e.g. left border bar) — **nothing else** |
| Rule lines | `#D0D7DE` (light grey) | Thin separators between sections; line-item table row separators |

No gradients. No shadows. No tinted backgrounds. The accent teal is used in **at most three small marks** per page.

### § 7.3 Typography

| Role | Recommended | Fallback | Notes |
|---|---|---|---|
| Body | `Inter` (CorpFlowAI's chosen brand body font per Phase B step 2 of `CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md`) | `Helvetica`, `Arial` | Print Designer + Chrome PDF backend handles webfonts well; Inter is self-hosted and the brand canonical body face. |
| Display / headings | `Inter` (bold/medium weights) — keep one type family for the v1 template | `Helvetica Bold`, `Arial Bold` | A single family reduces visual noise and is the cheapest premium look |
| Monospace | None | n/a | No monospace blocks on the pro-forma (no code references, no reference numbers needing monospace alignment) |

**Sizes (recommended; Anton fine-tunes in Print Designer):**

| Element | Size | Weight |
|---|---|---|
| Document type label (W-Title) | 24 pt | 600 (Semibold) |
| Section labels (H2) | 11 pt | 600 (Semibold), uppercase, letter-spacing +0.05 em |
| Body | 10.5 pt | 400 (Regular) |
| Field labels | 9 pt | 500 (Medium), `#4A5563` |
| Line-item table | 10.5 pt body / 10 pt numbers | 400 / 500 (numbers slightly heavier) |
| Totals row | 11 pt | 600 (Semibold) for `Total`, 400 for subtotal + tax line |
| Fine-print block (W2..W5) | 9 pt | 400, line-height 1.45 |
| Footer (page number + repeated reference) | 8 pt | 400, `#4A5563` |

### § 7.4 Logo / letterhead reference

- **Logo file expectation:** the CorpFlowAI logo asset is **not currently present in this repo** as a committed PNG/SVG (workspace search on 2026-06-05 found only `public/assets/logos/theme.js` referencing `LogoSQBK.jpg` and `LogoSQBK.png` — neither file is committed). The template brief therefore specifies the logo *placement, sizing, and accessibility constraints* but does not assume a specific image file is available at template-build time.
- **Anton's task during Print Designer build:** upload the canonical CorpFlowAI mark (Anton's choice of `LogoSQBK.png` or whichever file Anton designates) via Print Designer's image-upload UI. The recommended placement is the **top-left** of the page, immediately above the seller-identity text block, sized at **~22 mm wide** (preserves aspect ratio; vector or high-res PNG preferred so it scales cleanly on PDF zoom). Top-left matches Cursor's recommendation in `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 10 Q5.
- **If no logo image is available at build time:** the template renders with a text-only seller-identity block (F1..F5). This is acceptable v1 — the manual pro-forma template at `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 2 already names `[OPTIONAL_LOGO_HERE]` as optional. Anton can revisit logo upload in a v1.1 revision once the canonical mark is decided.

### § 7.5 Page layout grid

- **Page size:** A4 (210 × 297 mm). Most Mauritian and international business buyers expect A4; US Letter is a future consideration only if a US-variant template (§ 8) is built.
- **Margins:** top 25 mm, bottom 25 mm, left 20 mm, right 20 mm.
- **Vertical zones (top to bottom):**
  1. Header zone (~50 mm tall): logo + seller-identity block on the left; document-identity block (W-Title, reference, dates, currency) on the right.
  2. Buyer-identity block (`BILL TO`).
  3. Line-item table.
  4. Totals block (right-aligned).
  5. Payment placeholder block (W1).
  6. Service-fulfilment / disclaimers block (W2, W3, W4, W5).
  7. Footer zone (Issued-by line + page-number + repeated reference).

---

## § 8 — Template variants to plan later (NOT in v1; explicitly out of scope)

These variants are named here so future authorisation packets can reference them without re-naming. Each requires its own `AUTHORISE — …` chat DECISION; none are authorised by this brief.

| Variant | Source doctype | Trigger / dependency |
|---|---|---|
| **Mauritius pro-forma** (this brief) | `Quotation` | Authorised under `ERPNext-ProForma-Template-Design-Brief-1` (2026-06-05); built under `ERPNext-PrintDesigner-Install-1` once authorised |
| **Mauritius tax / VAT invoice** | `Sales Invoice` (Submitted, posts to GL) | **HARD-BLOCKED** on HB-2 (accountant CoA review) + HB-3 (VAT decision recorded as `JOURNAL.md` row) per `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7.1. Title wording changes from `Pro-forma invoice` to either `Tax invoice` or `Invoice` per accountant Q-Doc-1 / Q-Doc-4 answer in `ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` § 6.3. VAT line item handled per accountant Q-VAT-3 / Q-VAT-4 answer. |
| **South Africa variant** (pro-forma, then later tax invoice) | `Quotation`, then `Sales Invoice` | Requires SA-specific tax-id field on Company doctype + SA-specific accountant sign-off for VAT/sales-tax treatment. Separate future packet. |
| **USA variant** (pro-forma, then later invoice) | `Quotation`, then `Sales Invoice` | US Letter page size (8.5 × 11 in), USD-only (already the v1 currency), US-specific sales-tax treatment by state if any. Separate future packet. |
| **Generic quotation / proposal (no jurisdictional fine-print)** | `Quotation` | Stripped-down v1 with W1, W2, W3, W4 only (W5 removed because not Mauritian-VAT-scoped); suitable for non-MU non-SA non-US buyers where the accountant has not yet anchored a posture. Separate future packet. |
| **Mauritius bilingual (EN + FR)** | `Quotation` | French-language side-by-side; requires translator-confirmed verbatim French equivalents of W1..W5 + W-Title; separate future packet (was Anton's Q7 in `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 10, default = English only v1). |

**Sequencing recommendation:** Mauritius pro-forma (this brief) → install + verify → first 3 paying pilots issued via ERPNext production → Mauritius tax invoice (once HB-2 + HB-3 close) → Generic quotation → South Africa → USA → Mauritius bilingual. Each step is a separate authorisation.

---

## § 9 — Acceptance criteria (template is "done" when ALL of these pass)

The Print Designer template is acceptable for first-real-client use **only** when all of the following are demonstrably true. (Acceptance is reported when `ERPNext-PrintDesigner-Install-1` packet executes; this brief defines the criteria, not the verification run.)

| # | Criterion | Verification method |
|---|---|---|
| AC-1 | Visually professional enough to send to a CEO, clinic owner, or property owner without losing trust | Subjective; Anton's call after opening the rendered PDF on his laptop and asking himself *"would I send this to a buyer making a USD-tier decision?"* |
| AC-2 | PDF renders cleanly via the Chrome PDF backend | Print Designer install packet sets `pdf_generator='chrome'` on the Print Format and runs the same `frappe.get_print()` + `frappe.utils.pdf.get_pdf()` flow used by the recipe § 16 smoke; verdict PASS if (a) `%PDF` magic bytes present, (b) file size in the expected 30–200 KB range for a one-page document, (c) no `wkhtmltopdf` error in container logs, (d) visual review on `scp`'d copy shows no broken layout |
| AC-3 | Logo (if uploaded) scales correctly | Print Designer uploads handle vector + high-res raster cleanly with the Chrome backend per `frappe/print_designer` PR #399; verification = visual inspection at 100% PDF zoom, 50% PDF zoom, and on a printed A4 page (or printed-to-PDF re-render) |
| AC-4 | No script text on the rendered PDF | Defensive forbidden-wording assertion in the install packet checks for `<script`, `</script`, `<!-- `, `frappe.` (as inline JS, not as text), `pdf_generator=`, raw Jinja delimiters (`{{`, `}}`) in the rendered HTML. Print Designer's visual-editor output should not produce any of these in the rendered PDF; the assertion catches regressions. |
| AC-5 | No broken image (the most common Print Designer regression) | Defensive check in the install packet greps the rendered HTML for `alt=""` followed by no `src` value, or `src` values that 404 / resolve to `data:image/png;base64,` of size < 200 bytes (a typical placeholder broken-image data URL) |
| AC-6 | No `wkhtmltopdf ConnectionRefusedError` | Two layers: (a) `pdf_generator='chrome'` on the Print Format bypasses wkhtmltopdf entirely per `JE-2026-06-04-4` § 4 verdict matrix Option A; (b) the live `host_name = http://frontend:8080` set under `JE-2026-06-04-5` already cleared this error for wkhtmltopdf too — both layers cover this case |
| AC-7 | All required wording present | Defensive assertion in the install packet greps the rendered HTML for each of W-Title, W1, W2, W3, W4, W5 (verbatim substring match, case-sensitive). All 6 must be present; missing any one aborts the install. |
| AC-8 | No forbidden wording present | Defensive assertion in the install packet greps the rendered HTML for FB-1 through FB-9 + the FB-10 card-scheme / payment-provider wordmark list. **Zero** matches required. Any match aborts the install. |
| AC-9 | No real bank account number / SWIFT / IBAN / routing detail anywhere in the rendered HTML | Regex sweep for IBAN patterns (`MU\d\d`, `[A-Z]{2}\d{2}[A-Z0-9]{4}\d{7}([A-Z0-9]?){0,16}`), SWIFT/BIC patterns (`[A-Z]{4}MU[A-Z0-9]{2}([A-Z0-9]{3})?`), 8+ consecutive digits in the payment block. Zero matches required. |
| AC-10 | Template is one page for a one-line-item Quotation (the v1 USD 150 single-offer case) | Page-count check on the rendered PDF; pages > 1 means the layout is too dense / margins are too small / spacing needs tightening |
| AC-11 | Reverts cleanly | Re-running the install packet with the `--uninstall` flag (or operator running `bench --site corpflowai-production.localhost set-config print_designer_default null` + deleting the Print Format record) removes the template without touching the placeholder `CFLR Pro-forma Invoice` from recipe § 13 or any other Print Format |

**`COMPLETE` verdict on the install packet requires AC-1 through AC-11 all pass.** Anything else is `PARTIAL` (named gaps recorded) or `FAILED`.

---

## § 10 — Anton UI checklist (what Anton clicks in Print Designer after install)

This checklist is the operator-facing companion to the install packet. It is **not** authorised by this brief — it documents what Anton will do once `ERPNext-PrintDesigner-Install-1` runs and opens the Print Designer editor in the browser at `http://localhost:8081/printdesigner` (via the recipe § 17 SSH tunnel).

### § 10.1 Pre-flight (before opening Print Designer)

| # | Step | Pass condition |
|---|---|---|
| UI-0a | Confirm production-shell stack is `Up` and SSH tunnel is open per recipe § 17 | `docker compose -p corpflowai-production ps` (run by Anton via SSH) shows all 9 containers `Up`; `http://localhost:8081/login` in browser shows the ERPNext login page |
| UI-0b | Confirm Print Designer is installed (post Packet 2 close) | ERPNext sidebar shows `Print Designer` menu item; visiting `http://localhost:8081/printdesigner` does not 404 |
| UI-0c | Confirm `pdf_generator='chrome'` is configured globally (or settable per-Print-Format) | Settings → Print Settings → `pdf_generator` field shows `Chrome` option available |
| UI-0d | Confirm Item `LR-SETUP-USD-150` exists with verbatim name `"AI Lead Rescue Setup (USD 150 launch pilot)"` and USD 150 selling price | UI: Stock → Item → `LR-SETUP-USD-150`; verify `item_name` and Item Price |
| UI-0e | Confirm test Customer `Test Buyer (CFLR-DRY-RUN)` exists | UI: Selling → Customer → `Test Buyer (CFLR-DRY-RUN)`; if not, create per recipe § 15 |

### § 10.2 Build the template in Print Designer

| # | Step | Pass condition |
|---|---|---|
| UI-1 | Open Print Designer; click `New Template`; select `Doctype = Quotation`; name = `CFLR Mauritius Pro-forma Invoice v1` | Editor loads with blank A4 canvas |
| UI-2 | Set page size `A4`, margins per § 7.5 | Canvas resizes to ~170 × 247 mm content area |
| UI-3 | Drag in the seller-identity block (top-left): logo (if uploading), then F1..F5 as static text + Company doctype bindings | All 5 lines visible; BRN line uses Company `tax_id` binding |
| UI-4 | Drag in the document-identity block (top-right): W-Title (24 pt, semibold, with teal accent bar on left edge), F11 reference (bound to Quotation `name`), F12 date (bound to `transaction_date`), F13 validity-conditional (only render if `valid_till` is set), F14 currency (bound to `currency`) | All 5 fields visible; W-Title is the largest text on the page; validity row hides cleanly when `valid_till` is unset |
| UI-5 | Add the teal accent rule below the header zone | Single horizontal rule, 0.5 pt, `#2dd4bf` |
| UI-6 | Drag in the buyer-identity block: `BILL TO` label (H2 style), then F6..F9 | Visible; F7 row omitted if no separate business name; F9 row omitted if no billing address |
| UI-7 | Drag in the line-item table: columns Description, Qty, Unit, Amount; bind to Quotation `items` child table | Renders one row for the LR-SETUP item at USD 150 |
| UI-8 | Drag in the totals block (right-aligned, below line items): Subtotal, VAT/Tax (static text `Pending accountant confirmation`), Total | Totals visible and aligned right |
| UI-9 | Add a second teal rule above the totals | Single horizontal rule, 0.5 pt, `#2dd4bf` |
| UI-10 | Drag in the payment placeholder block: `PAYMENT` H2 label, then W1 as static text | Visible; **NO** account number, link, button, QR code, or logo |
| UI-11 | Drag in the service-fulfilment / disclaimers block: `SERVICE FULFILMENT` H2, W2 + W3 stacked; then `DISCLAIMERS` H2, W4 + W5 stacked | All four W-sentences visible verbatim |
| UI-12 | Drag in the footer: F28 issuer line on the left, F29 reference + F30 page number on the right | Footer renders on every page |
| UI-13 | Save the template | Print Format record saved as `CFLR Mauritius Pro-forma Invoice v1`; `pdf_generator` field on the Print Format set to `Chrome` |

### § 10.3 Visual comparison

| # | Step | What to compare |
|---|---|---|
| UI-14 | From the existing test Quotation (recipe § 16 created `QUO-CFLR-…`), select Print Format = `CFLR Mauritius Pro-forma Invoice v1`; click Print → Save as PDF | Renders the same Quotation through the new Print Designer template |
| UI-15 | Open the rendered PDF side-by-side with the manual Word/Pages pro-forma Anton has already produced from `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 2 | Cross-check: (a) seller-identity block matches Company doctype values; (b) all 6 verbatim W-strings present character-for-character; (c) line item at USD 150; (d) totals correct; (e) no forbidden wording; (f) logo (if uploaded) scales clean at 100% zoom and 50% zoom |
| UI-16 | Open the rendered PDF on a second device (Anton's phone, or a printer-emulated A4 preview) | Layout holds; no overflowing text; no broken image; legible on a 6-inch screen at 100% zoom |

### § 10.4 Evidence to return (paste back to Cursor for the closure JE row)

| # | Evidence | Why |
|---|---|---|
| EV-1 | Print Format record name + saved-at timestamp (from ERPNext UI footer) | Confirms the template exists on production-shell DB |
| EV-2 | Rendered PDF file (Anton `scp`s from box to laptop) | Single source of truth for visual review |
| EV-3 | Screenshot of the PDF at 100% zoom, full page | Quick visual sanity check |
| EV-4 | Screenshot of the same PDF at 50% zoom (for logo-scaling regression check) | AC-3 evidence |
| EV-5 | Output of `frappe.get_print()` + `frappe.utils.pdf.get_pdf()` smoke (same as recipe § 16) — `%PDF` magic bytes + size + Quotation docstatus | AC-2 evidence |
| EV-6 | Output of forbidden-wording grep on the rendered HTML (greps for each FB-1..FB-9 + FB-10 wordmarks; zero matches required) | AC-8 evidence |
| EV-7 | Output of required-wording grep on the rendered HTML (greps for each W-Title, W1, W2, W3, W4, W5; all 6 must match) | AC-7 evidence |
| EV-8 | Output of `docker compose -p corpflowai-production ls` post-build | Sandbox preservation confirmed (`corpflowai-sandbox` still `running(9)`) |
| EV-9 | Anton's `PASS / PARTIAL / FAIL` verdict, with reason | Acceptance criteria evaluation |

---

## § 11 — Coexistence with existing surfaces

| Surface | Status | What this brief assumes |
|---|---|---|
| `pages/terms.js` § Service fulfilment (live PAY-SBM-2 `0fd9312b`) | Live | W3 wording variant chosen here (shorter form) does **not** match the long-form W3 on the live page; if accountant or operator decides to align, they land together. Recorded as a documented difference in § 5 above. |
| `pages/refund-policy.js` § Payment timing (live) | Live | Pro-forma carries no refund-policy duplication; cover email may link to it |
| `components/AiLeadRescueLanding.js` § *How payment works* (live, post-LR-Pay-1 merged in PR #281) | Live | Payment design (two-email, no on-page checkout) mirrored on the pro-forma per § 6 FB-3 / FB-11 / FB-12 |
| `components/PublicSiteFooter.js` merchant identity (live PAY-SBM-2) | Live | Pro-forma seller-identity block (F1..F5) carries the same legal name + BRN + address + support email as the public footer |
| `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`) | On main, in active use | The manual Word/Pages pro-forma is the canonical mechanism for the first 1–3 paying pilots; this Print Designer template does **not** replace it until AC-1..AC-11 pass and Anton explicitly authorises ERPNext PDF emails to a real client (HELD until full Phase D close per `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 7.1) |
| `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` § 13 placeholder `CFLR Pro-forma Invoice` | Recipe-defined; not yet executed under § 13 on the production-shell | The placeholder is the wkhtmltopdf-rendered fallback; this brief's `CFLR Mauritius Pro-forma Invoice v1` is the Print Designer + Chrome-rendered upgrade. The two coexist in the DB (or the placeholder is operator-deleted after the Print Designer template is verified — Anton's call). |
| `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` (`JE-2026-06-04-4`) | On main | This brief is the design-side counterpart to Packet 2 (`ERPNext-PrintDesigner-Install-1`) shape defined in eval § 7.2; the install packet builds what this brief specifies |
| `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` (`JE-2026-06-03-2`) | On main | M-Print item from § 4.2 is the broader-scope equivalent; this brief refines the Mauritius v1 case |
| `docs/finance/ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` (`JE-2026-06-03-3`) | On main | Q-Doc-1 (pro-forma title) + Q-Doc-3 (W1..W5 acceptability) + Q-VAT-6 (W5 footer wording acceptability) are the accountant questions whose answer constrains this template; v1 carries the current pre-VAT-review wording |
| `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* | On main | Single-offer rule + canonical Item label + no-guarantee rule preserved in F15, F16, F17, FB-7, FB-8, FB-9 |
| `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` BI-D-1 | On main | Canonical accent colour `#2dd4bf` honoured (§ 7.2); used sparingly per § 7.1 *clean, premium, high-trust* |
| `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` § 3 sender alias `support@corpflowai.com` | Live | F4 = `support@corpflowai.com`; future cover-email + payment-instructions email both go from the same sender |

**No contradiction with any merged doc or live page** — the brief is the operational expression of all the merged commitments above.

---

## § 12 — Verification rubric (run before opening the PR for this brief; re-run after audits)

| # | Check | Pass condition |
|---|---|---|
| V1 | Only docs / brief files in the diff | Files changed = this new doc (`docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md`) + `docs/decisions/JOURNAL.md` (one row added) + `artifacts/chat_history.md` (one dated section added). No other files. |
| V2 | No real banking details present | Repo-wide search in the new doc for IBAN-shape, SWIFT-shape, MUR/USD account-number-shape patterns; concrete digits → zero matches in the new doc beyond the § 6 *forbidden wording* enumeration |
| V3 | No secrets / KYC / API keys | Repo-wide search in the new doc for `Bearer `, `passport`, `proof of address`, OAuth/JWT signatures → zero matches in the new doc beyond § 0 hard-limits enumeration |
| V4 | No runtime files changed | Zero edits under `api/` / `lib/` / `prisma/` / `middleware*` / `scripts/` / `components/` / `pages/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*` |
| V5 | No ERPNext production-shell mutation | Zero `docker compose`, `bench`, `mysql`, `frappe.` host commands executed by THIS PR; no Print Designer install runs; production-shell containers untouched |
| V6 | No ERPNext sandbox mutation | `corpflowai-sandbox` Docker project / `corpflowai-sandbox.localhost` site / `~/.erpnext-sandbox-credentials` untouched (this PR runs no host commands at all) |
| V7 | No payment-automation / gateway changes | Zero edits to `lib/automation/`; zero new env vars; the brief carries no live payment URL / button / QR / live-gateway claim |
| V8 | No live-payment claims added | Repo-wide search on the new doc for `Pay now`, `instant checkout`, `online card payment available`, `SBM gateway is live`, `PayPal accepted`, `Wise accepted` → zero matches outside the § 6 *forbidden wording* enumeration |
| V9 | Verbatim wording W-Title + W1..W5 present in the brief | All six strings appear character-for-character in § 5 |
| V10 | All 9 forbidden wording IDs present in the brief | FB-1..FB-9 appear in § 6 |
| V11 | Single-offer rule preserved | Brief's line-item spec (F15..F19) names only `LR-SETUP-USD-150` / `AI Lead Rescue Setup (USD 150 launch pilot)` / USD 150.00 — no second tier, no recurring component (per `JE-2026-05-28-1`) |
| V12 | BRN + address match PAY-SBM-2 live copy | F2 = `BRN C25228280`; F3 = `Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius`; identical to `pages/about.js`, `components/PublicSiteFooter.js`, `pages/contact.js` |
| V13 | Marketing quality gate | `npm run check:marketing-quality-gate` returns PASS (not strictly required for a finance-internal doc; honoured anyway) |
| V14 | JOURNAL row added | `JE-2026-06-05-1` exists with verdict `COMPLETE-AT-PR-MERGE` and reversibility line |
| V15 | `artifacts/chat_history.md` dated section added | Newest-first within the month block per existing convention; sentinel `<!-- ERPNEXT_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_1_HIST -->` |

---

## § 13 — Standing holds (unchanged by this packet)

This brief is a **design specification**. It does **not** close, modify, or accelerate any of:

- **HB-1** (full Phase D operator-approval row for revenue-posting / VAT-active / real-bank / real-client surface) — still **NOT-AUTHORISED** beyond the narrowed shell-setup scope of `JE-2026-06-04-1`.
- **HB-2** Mauritius-licensed accountant CoA review in writing — **PENDING-ACCOUNTANT**.
- **HB-3** VAT decision recorded in `JOURNAL.md` — **PENDING-ACCOUNTANT**.
- **HB-4** real (redacted) MU bank CSV reconciliation cycle — **PENDING-OPERATOR**.
- **Full Phase D** ERPNext accounting go-live — HELD pending HB-1 + HB-2 + HB-3 + HB-4 closure plus a separate future Phase D authorisation row.
- **First submitted Sales Invoice on production** (GL posting) — HELD on the same gate.
- **First email of any ERPNext-generated PDF to a real client** — HELD on the same gate.
- **`ERPNext-PrintDesigner-Install-1`** (Packet 2 from `JE-2026-06-04-4` § 7.2) — remains **UNAUTHORISED**. This brief is its design input; the install requires its own separate `AUTHORISE — …` chat DECISION from Anton.
- **Sandbox tear-down** — HELD pending the four-condition gate from `JE-2026-06-04-1`.
- All standing holds enumerated in `JE-2026-06-04-6` § *Standing holds* (Phase D · Phase C² · runbook §8.1 · production ERPNext · scheduler · payment gateway configuration · Lead Rescue wording adoption · SBM application submission · PAY-SBM-3 · NDA / MCIB · Freshdesk activation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · Pomelli activation · MONITORING_ARCHITECTURE.md § 11.3 stale-spec doc-drift).

**New holds introduced by this brief:** none — this is a design specification artefact only. The install it specifies remains HELD on its own authorisation.

---

## § 14 — Open questions for Anton (do NOT block merge of this brief; relevant when Packet 2 opens)

| # | Question | Default if unanswered |
|---|---|---|
| Q1 | Should the long-form W3 (manual-template / live-page version) replace the short-form W3 specified in § 5 of this brief? Choosing the long-form means updating the manual template + the live `/terms` page + this brief together. | Short-form W3 (as specified in § 5) for v1; revisit when accountant signs off W3 acceptability in `ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` § 6.3 Q-Doc-3 |
| Q2 | Should the canonical logo file (e.g. `LogoSQBK.png`) be committed to the repo as a brand asset under `public/assets/logos/` before the install packet runs? Currently no logo file is committed; only `theme.js` references it. | No — Anton uploads via Print Designer UI; v1.1 can address committing a canonical asset if reuse is needed |
| Q3 | Tax / VAT line treatment: literal `Pending accountant confirmation` (recommended; matches W5 posture) or hide the row entirely until HB-3 closes? | Literal `Pending accountant confirmation` — explicit is safer than absent for a buyer reviewing the document |
| Q4 | Validity / expiry default — 14 days (Cursor recommendation, matches `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 10 Q2) or different? | 14 days |
| Q5 | Logo placement — top-left (Cursor recommendation, matches `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 10 Q5) or centred header? | Top-left |
| Q6 | English only v1 (matches `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 10 Q7 default) or English + French side-by-side bilingual? | English only v1; French is a separate § 8 variant |
| Q7 | Accent colour usage budget — strict (only header rule + total rule + W-Title left bar, as in § 7.2) or slightly looser (e.g. teal `Subtotal:` / `Total:` labels)? | Strict — restraint is the premium signal |
| Q8 | Should the Print Designer template also embed a small CorpFlowAI tagline (e.g. *"CorpFlowAI — operations clarity for small businesses"*) in the footer, or stay tagline-free? | Tagline-free for v1; pro-forma is a transactional document, not a marketing surface |

None of Q1–Q8 block the merge of this brief. They become relevant only when Packet 2 (`ERPNext-PrintDesigner-Install-1`) opens.

---

## § 15 — Honest limits of this brief

- **No PDF rendered.** This brief is design specification only; it does not render any PDF, does not install Print Designer, and does not exercise the Chrome PDF backend on the production-shell. The render evidence comes later, from Packet 2's `ERPNext-PrintDesigner-Install-1` execution.
- **No host commands executed.** Authored on Anton's Windows laptop (L1) per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.4; no SSH bridge to the box; HOST_MISMATCH guard from `JE-2026-06-04-1` therefore does not apply (no L3 work attempted).
- **No logo asset present in repo.** As of 2026-06-05, `public/assets/logos/` contains only `theme.js` referencing `LogoSQBK.jpg`; the image files themselves are not committed. The brief assumes Anton uploads the canonical mark during Print Designer build (UI-3). Future small docs-only PR `LR-Brand-Asset-Commit-1` (proposal-only; not authorised) could commit the canonical PNG/SVG so the install packet can reference it deterministically.
- **No bank-side facts in the brief.** F23 / W1 are placeholders; no real account number, SWIFT, IBAN, routing detail in any block of the spec.
- **No accountant sign-off on the wording.** W1..W5 mirror the pre-VAT-review posture; if HB-2 / HB-3 close with accountant amendments to W5 (Q-VAT-6) or W1..W4 (Q-Doc-3), this brief lands a follow-up revision (`CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.1.md`) and Packet 2 rebuilds the template accordingly.
- **Chrome PDF backend behaviour is upstream-documented but not exercised here.** Verification of AC-2..AC-11 happens at Packet 2 execution time, not at this brief's merge time.
- **Acceptance is operator's call on AC-1.** "Visually professional enough to send to a CEO" is a subjective check Anton makes when opening the rendered PDF. The brief cannot pre-verify this.

---

## § 16 — Cross-references

- `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`) — manual Word/Pages pro-forma template; source of W1..W5 verbatim wording; canonical mechanism for first 1–3 paying pilots until Print Designer template is verified.
- `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` (`JE-2026-06-04-4`) — decision artefact; verdict matrix Option A GO; defines Packet 2 (`ERPNext-PrintDesigner-Install-1`) shape that builds what this brief specifies.
- `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` (`JE-2026-06-03-2`) — 18-item Phase D production-setup checklist; M-Print is the broader-scope item this brief refines for Mauritius v1.
- `docs/finance/ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` (`JE-2026-06-03-3`) — accountant brief; Q-Doc-1 / Q-Doc-3 / Q-VAT-6 constrain the v1 template's wording posture.
- `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` (`JE-2026-06-04-3`, v1.1 per `JE-2026-06-04-6`) — production-shell recipe; § 9 emergency-Letter-Head advisory + § 13 placeholder `CFLR Pro-forma Invoice` Print Format are the wkhtmltopdf fallback this brief upgrades.
- `docs/decisions/JOURNAL.md` row `JE-2026-06-04-5` — host_name fix closure; live verified the wkhtmltopdf rendering path on `corpflowai-production.localhost`; structurally unblocks PDF rendering whether classic or Print Designer.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (`JE-2026-06-04-2`) — L1 / L2 / L3 collaboration pattern this brief is authored under (L1 docs work only).
- `docs/decisions/JOURNAL.md` row `JE-2026-06-04-1` — narrowed-scope Phase D shell-setup authorisation (the production shell `CFLR Mauritius Pro-forma Invoice v1` will install into).
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* — single-offer rule + canonical Item label + no-guarantee line; constrains line-item spec + W4 + FB-7..FB-9.
- `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` BI-D-1 — canonical accent colour `#2dd4bf` honoured in § 7.2.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` § 3 — `support@corpflowai.com` sender-alias policy (F4).
- Decision rows: `JE-2026-05-28-1` (single-offer rule), `JE-2026-05-29-1` (Phase D requires fresh authorisation), `JE-2026-05-29-2` (brand identity), `JE-2026-06-01-4` (payment route priority: SBM primary / PayPal HOLD / Wise removed), `JE-2026-06-02-4 PAY-SBM-2` (public seller identity), `JE-2026-06-02-7` (manual pro-forma template), `JE-2026-06-03-2` (Phase D production-readiness eval), `JE-2026-06-03-3` (accountant review pack), `JE-2026-06-04-1..6` (production-shell setup chain), `JE-2026-06-05-1` (this brief).
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## § 17 — Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only

**COMPLETE-AT-PR-MERGE** for the *design-specification artefact* — operator + agent governance; no customer-visible URL to probe by design. The Print Designer install + template build it specifies is a separate piece of work (Packet 2 `ERPNext-PrintDesigner-Install-1`) and is **not** retroactively made COMPLETE by the merge of this brief. The install reports its own STATUS on bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) and closes via a separate future `JE-YYYY-MM-DD-N` row once Packet 2 executes on `corpflow-exec-01-u69678` and AC-1..AC-11 are evaluated against the rendered PDF.

---

## § 18 — Change log

- **v1, 2026-06-05** — initial design-specification brief. 18 sections covering template name (CFLR Mauritius Pro-forma Invoice v1, `doc_type=Quotation`, `pdf_generator=chrome`), source doctype (Quotation per Path A from `ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` § 2 Q1.2), purpose (pre-payment pro-forma; not tax invoice / not VAT invoice / not receipt), 30 required visible fields across 8 visual blocks (F1..F30 with source bindings), 6 verbatim required strings (W-Title + W1..W5; short-form W3 per Anton's AUTHORISE message, with explicit note about coordinated change if accountant aligns on long-form W3), 12 forbidden wording / pattern enumerations FB-1..FB-12 with defensive-assertion design from recipe § 13, visual direction (clean / premium / high-trust / lots of whitespace / clear hierarchy / no clutter / no cheap invoice-template look; canonical teal accent `#2dd4bf` per `BRAND_IDENTITY_V1_PROPOSAL.md` BI-D-1; A4 page layout; Inter typography; logo placement top-left ~22 mm wide), six future variants planned (Mauritius pro-forma v1 — this brief; MU tax invoice HARD-BLOCKED on HB-2/HB-3; SA / USA / generic / MU bilingual all separate future packets), 11 acceptance criteria AC-1..AC-11 (visually professional / Chrome PDF renders cleanly / logo scales / no script text / no broken image / no wkhtmltopdf ConnectionRefusedError / all required wording present / no forbidden wording present / no real bank details / one page for one-line-item / clean revert), Anton UI checklist split into pre-flight UI-0a..UI-0e + build UI-1..UI-13 + visual-comparison UI-14..UI-16 + 9 evidence blocks EV-1..EV-9, coexistence with 11 adjacent surfaces (live `/terms` `/refund-policy` `/contact` / `PublicSiteFooter` / manual pro-forma template / recipe § 13 placeholder / Print Designer eval / production-readiness eval / accountant pack / brand doctrine / comms-v1), 15-row verification rubric V1..V15, standing holds carried forward unchanged, 8 open questions Q1..Q8 with Cursor defaults, honest limits (no PDF rendered / no host commands / no logo asset committed / no bank-side facts / no accountant sign-off on wording / Chrome backend not exercised / AC-1 is operator's call), cross-references to 11 sibling docs + decision rows. (`JE-2026-06-05-1`.)
