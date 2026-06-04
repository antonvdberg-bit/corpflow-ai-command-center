# `CFLR Mauritius Pro-forma Invoice v1` — Print Designer template build packet (operator-paste runbook)

**Status:** Docs / runbook only — operator-paste / UI execution packet authored at L1. **No server commands executed by THIS PR. No ERPNext mutation. No Print Designer install. No customer / invoice / Sales Invoice / GL posting / VAT or tax setup / bank account / payment-gateway / DNS / TLS / SMTP / public-exposure changes by THIS PR. No secrets in repo.**

**Anchor sentinel:** `<!-- ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1 -->`

<!-- ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1 -->

**Author:** Assistant (Cursor) on Anton's Windows laptop (L1), on behalf of Anton.
**Date (UTC):** 2026-06-05.
**Authorisation:** Anton's chat DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-05 *"AUTHORISE — ERPNext-CFLR-ProForma-Template-Build-Packet-1"*). Approved scope: docs / runbook only; no server commands; no ERPNext mutation; no Print Designer install; no real customer / invoice / Sales Invoice / GL posting / VAT or tax setup / bank account / payment gateway / DNS / TLS / SMTP / public-exposure changes; no secrets.
**Linked JOURNAL row:** `JE-2026-06-05-2` (`docs/decisions/JOURNAL.md`).
**Linked chat history:** `artifacts/chat_history.md` § *2026-06-05 — `ERPNext-CFLR-ProForma-Template-Build-Packet-1`*.

**Purpose:** Tell Anton **exactly** how to build the `CFLR Mauritius Pro-forma Invoice v1` Print Designer template on the existing production shell `corpflowai-production.localhost` on `corpflow-exec-01-u69678`, **after** `ERPNext-PrintDesigner-Install-1` (Packet 2 from `JE-2026-06-04-4` § 7.2) completes successfully. The packet pairs with the design specification in `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (`JE-2026-06-05-1`): the brief is the *spec*; this packet is the *operator runbook*.

---

## § 0 — Hard limits honoured by THIS PR (the runbook authoring; not the future execution)

- Zero server commands executed by this PR.
- Zero ERPNext production-shell mutation by this PR (`corpflowai-production.localhost` Docker project `corpflowai-production` on `corpflow-exec-01-u69678`; live `host_name = http://frontend:8080` from `JE-2026-06-04-5` unchanged).
- Zero ERPNext sandbox mutation by this PR (`corpflowai-sandbox.localhost` Docker project `corpflowai-sandbox`; sandbox-preservation rule from `JE-2026-06-04-1` honoured).
- Zero Print Designer install by this PR (install lives in the separate `ERPNext-PrintDesigner-Install-1` packet; this packet runs *after* install completes).
- Zero Sales Invoice creation or submission.
- Zero GL posting.
- Zero VAT activation; zero `Tax invoice` / `VAT invoice` wording introduced anywhere.
- Zero real bank account number / SWIFT / BIC / IBAN / routing / sort-code / branch-code / card number / payment-gateway API key / OAuth token added to repo.
- Zero invoices issued or pro-formas sent.
- Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `scripts/` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`.
- Zero changes to DNS / mail-routing / Telegram / Plausible / Search Console / payment-settings / GitHub-workflow-files / Vercel-project-settings / Postgres / Neon / Prisma schema.
- Zero pricing / offer / page-copy changes on customer-facing surfaces.
- Zero host commands executed from this L1 session; HOST_MISMATCH guard from `JE-2026-06-04-1` not triggered (no L3 work attempted).

---

## § 1 — Prerequisites — when to run this packet

Run this packet only when **all** of the following are true. If any prerequisite fails, **stop**, post evidence to Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249), and wait for the prerequisite to close.

| # | Prerequisite | How to confirm | If fails |
|---|---|---|---|
| PR-1 | `ERPNext-PrintDesigner-Install-1` (Packet 2 from `JE-2026-06-04-4` § 7.2) is **AUTHORISED** by Anton chat DECISION on Bridge #249 | Search Bridge #249 for `AUTHORISE — ERPNext-PrintDesigner-Install-1` | Stop. Get authorisation first. |
| PR-2 | `ERPNext-PrintDesigner-Install-1` is **EXECUTED** with verdict `COMPLETE` (or `PARTIAL` with documented gaps that do **not** affect template build) | JOURNAL row `JE-YYYY-MM-DD-N` exists closing the install packet | Stop. Wait for install to close. |
| PR-3 | Production shell containers are `Up` on `corpflow-exec-01-u69678` (Docker project `corpflowai-production`) | Anton: `ssh anton@5.78.213.185` → `docker compose -p corpflowai-production ps` shows all 9 containers `Up` (`backend`, `db`, `frontend`, `queue-long`, `queue-short`, `redis-cache`, `redis-queue`, `scheduler`, `websocket`) | Stop. Bring stack up per recipe § 5 before running this packet. |
| PR-4 | Sandbox is preserved (Docker project `corpflowai-sandbox` still `Up` per `JE-2026-06-04-1` sandbox-preservation rule) | `docker compose -p corpflowai-sandbox ps` shows running containers | If sandbox is down for an operator-known reason, document; otherwise stop and investigate before any production-shell UI work. |
| PR-5 | Item `LR-SETUP-USD-150` exists with the verbatim canonical name `"AI Lead Rescue Setup (USD 150 launch pilot)"` and USD 150 Standard Selling price | Operator: ERPNext UI → Stock → Item → `LR-SETUP-USD-150` | Re-run recipe § 11 (item creation) before this packet. |
| PR-6 | Test customer `Test Buyer (CFLR-DRY-RUN)` exists (clearly fake; sandbox-preserving naming per recipe § 15) | Operator: ERPNext UI → Selling → Customer → `Test Buyer (CFLR-DRY-RUN)` | Re-run recipe § 15 (test customer creation) before this packet. |
| PR-7 | Naming series `CFLR-QUO-.YYYY.-.NNN` is set as the Quotation default per recipe § 12 | Operator: ERPNext UI → Settings → Document Naming Settings → Quotation | Re-run recipe § 12 before this packet. |
| PR-8 | Standing holds **HB-1** (full Phase D beyond narrowed shell-setup) / **HB-2** (accountant CoA review) / **HB-3** (VAT decision) / **HB-4** (real MU bank CSV reconciliation) are still acceptable as **HELD** for the scope of this packet | This packet does not require any of them to close — but the resulting template must not be used against a real client until they do | If Anton tries to use the rendered template against a real buyer, stop — `ERPNext-First-Real-Pro-Forma-Send` is a separate authorisation packet (not yet drafted). |

**This packet does NOT include** the Print Designer install steps themselves (that is Packet 2). It does NOT include the host-side `bench` / `docker compose` commands beyond the read-only pre-flight checks in § 2 (PF-2 `list-apps`). It does NOT include any change to real client / real bank / real payment / VAT / GL posting surfaces.

---

## § 2 — Pre-flight (operator confirms; UI-PF-1..UI-PF-7)

Run these checks **before** opening Print Designer. The goal is a clean baseline so any defect during build is attributable to the build itself, not to a stale install.

Each check has a **Pass condition** the operator must visually confirm. Anything other than the Pass condition means **stop**, post evidence to Bridge #249, and resolve before continuing.

### § 2.1 SSH tunnel + UI reachability

| # | Step | Pass condition |
|---|---|---|
| UI-PF-1 | Anton opens an SSH tunnel on his laptop: `ssh -L 8081:localhost:8081 anton@5.78.213.185` (per recipe § 17). The tunnel maps production-shell port 8081 on the host to localhost:8081 on Anton's laptop. The sandbox tunnel on `localhost:8080` can coexist. | Tunnel connects without password retry; SSH session prompt visible. |
| UI-PF-2 | Anton opens `http://localhost:8081/login` in his browser. | ERPNext login page renders. Title bar shows `Login | ERPNext`. No 502 / 504 / blank page. |
| UI-PF-3 | Anton logs in as `Administrator` using the password from `~/.erpnext-production-credentials` on the box (Anton retrieves locally; **never paste the password into chat / Bridge #249 / this repo**). | Desk loads; URL becomes `http://localhost:8081/app`. Top bar shows `Administrator` user menu. |

### § 2.2 Print Designer installed

| # | Step | Pass condition |
|---|---|---|
| UI-PF-4 | Operator runs (in the SSH session, not in this PR): `docker compose -p corpflowai-production exec -T backend bench --site corpflowai-production.localhost list-apps` | Output includes the line `print_designer` (in addition to the existing `frappe` and `erpnext`). Example: `frappe 15.x.x` + `erpnext 15.x.x` + `print_designer 1.6.7` (or a v1.6.x patch revision). |
| UI-PF-5 | Operator confirms Print Designer UI is reachable. In the ERPNext desk, click the search bar (top of page) and type `Print Designer`; or visit `http://localhost:8081/printdesigner` directly. | Print Designer landing page loads. Either an empty templates list (first-time launch) or any previously-saved templates (e.g., from sandbox-side experimentation) appear. No 404 / 500. |
| UI-PF-6 | Operator confirms Chrome PDF backend is available on the Print Format `pdf_generator` field. UI: Settings → Print Settings → look for `Pdf Generator` (or per-Print-Format `Pdf Generator` field). | Dropdown options include `Chrome` (and `wkhtmltopdf` as the legacy option). Default may be either; the new template will set per-Print-Format to `Chrome`. |

### § 2.3 No real customer / invoice / payment / tax / bank setup is touched

Anton confirms by reading the UI that the production shell is still in the narrowed-scope state authorised by `JE-2026-06-04-1` (production shell prepared but not live for real accounting use). This is the safety gate against accidentally using a real surface.

| # | Step | Pass condition |
|---|---|---|
| UI-PF-7 | Operator opens (read-only inspection): (a) **Selling → Customer** — list view; (b) **Accounts → Sales Invoice** — list view; (c) **Accounts → Payment Entry** — list view; (d) **Setup → Tax → Sales Taxes and Charges Template** — list view; (e) **Accounts → Chart of Accounts** — Bank Accounts node. | (a) Only `Test Buyer (CFLR-DRY-RUN)` appears (no real client). (b) Zero rows OR only `Draft` / test-only rows; **zero** `Submitted` rows. (c) Zero rows; **zero** `Submitted` Payment Entries. (d) Zero VAT-active templates (only the upstream `Standard` defaults if any). (e) Zero real SBM / Wise / PayPal account records with real account numbers; the Bank-type accounts may include the broad placeholder accounts seeded by recipe § 10 (no real digits). If any check finds a real surface, **stop**; that means scope has drifted beyond `JE-2026-06-04-1` and requires immediate Bridge #249 disclosure. |

**Pre-flight verdict:** if all of UI-PF-1..UI-PF-7 pass, continue to § 3. If any fail, **stop**, post evidence to Bridge #249, resolve, and only then re-run § 2.

---

## § 3 — Template creation (UI-CREATE-1..UI-CREATE-7)

Create the empty Print Designer template record. No layout fields yet — that is § 4.

| # | Step | Pass condition |
|---|---|---|
| UI-CREATE-1 | In Print Designer (`http://localhost:8081/printdesigner`), click `+ New Template` (or `Create Template` — exact label varies by Print Designer release). | New-template modal / form opens. |
| UI-CREATE-2 | Enter `Template Name` = **`CFLR Mauritius Pro-forma Invoice v1`** (exact string, no abbreviations). | Field accepts the name; no "name already exists" error (if it does, the v1 template already exists — stop and decide: rename to `…v1.1` or delete the existing record per § 9 *Rollback*). |
| UI-CREATE-3 | Select `Doctype` = **`Quotation`**. **NOT** `Sales Invoice`. **NOT** `POS Invoice`. **NOT** any custom doctype. | Doctype dropdown shows `Quotation` selected; canvas (after creation) binds to the `Quotation` schema. |
| UI-CREATE-4 | Set `Page Size` = **`A4`** (210 mm × 297 mm). | A4 confirmed; canvas resizes to ~170 mm × 247 mm content area after margins. |
| UI-CREATE-5 | If Print Designer exposes margins at creation time: set top **25 mm**, bottom **25 mm**, left **20 mm**, right **20 mm**. Otherwise set in canvas Properties panel after creation. | Margins recorded; canvas reflects ~170 mm × 247 mm content area. |
| UI-CREATE-6 | Click `Create` (or `Save`). Template record is created with empty canvas. | Editor opens against the blank A4 canvas; URL becomes `http://localhost:8081/printdesigner/CFLR%20Mauritius%20Pro-forma%20Invoice%20v1` (or similar). |
| UI-CREATE-7 | In the canvas Properties / Settings panel, set `PDF Generator` = **`Chrome`** (the Print Designer Chrome PDF backend per `JE-2026-06-04-4` § 4 Option A; bypasses wkhtmltopdf). If Chrome is unavailable (UI-PF-6 failed), set `PDF Generator` = `wkhtmltopdf` as transitional fallback — this is acceptable only because the `JE-2026-06-04-5` host_name fix is already live. Log the fallback choice in Anton's evidence to Bridge #249. | `PDF Generator` field saves and persists on the Print Format record. |

**Document title** (the H1 text that appears on the rendered PDF) is set in § 4.3 (the document-identity block), not here. The Print Format `name` and the **rendered title** are different fields; do not conflate.

**Verdict for § 3:** if all of UI-CREATE-1..UI-CREATE-7 pass, the empty template exists and is ready for layout. If UI-CREATE-2 fails ("name already exists"), see § 9 *Rollback* before continuing.

---

## § 4 — Layout instructions (per-block; UI-LAYOUT-1..UI-LAYOUT-8)

Build the template by visual block, top to bottom. Each block maps to a field-ID range from the design brief (`docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` § 4); cross-references are noted per block so Anton can verify against the canonical spec.

**Common widget pattern:** Print Designer's visual editor exposes (a) static text widgets (drag plain text onto the canvas), (b) field bindings (drag a doctype field marker onto the canvas — renders the field's value at print time), (c) horizontal rule widgets, (d) image widgets (file upload), (e) table widgets (bind to a child-table field like `Quotation.items`), (f) page-number / page-of-pages widget. Step labels below assume this pattern; exact UI affordances vary by Print Designer release.

### § 4.1 Page-level palette + typography (apply once, globally)

Sets the look-and-feel for every block.

| # | Step | Pass condition |
|---|---|---|
| UI-LAYOUT-1 | Open the canvas-level Style / Theme panel. Set **Body font** = `Inter` (preferred; matches Phase B step 2 of `CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md`). Fallback chain: `Helvetica, Arial, sans-serif`. Set **Display / heading font** = `Inter` (single family for premium restraint). Set **Monospace** = none (no monospace blocks on the pro-forma). | Style panel reflects Inter as both body + display; no second family selected. |
| UI-LAYOUT-2 | Set page-level colours: **page background** = `#FFFFFF` (no tints, no gradients, no shadows); **primary ink** = `#0B1220` (near-black, slightly warm); **secondary ink** = `#4A5563` (mid-grey, for labels + metadata); **accent** = `#2dd4bf` (canonical CorpFlowAI teal per `BRAND_IDENTITY_V1_PROPOSAL.md` BI-D-1). The accent is used in **at most three small marks** total on the page (see UI-LAYOUT-7 + UI-LAYOUT-9 + UI-LAYOUT-12). | Colour values saved; canvas renders white background; no gradient / shadow / tint applied. |
| UI-LAYOUT-3 | Set default text sizes: **H1 (document type label)** = 24 pt, weight 600 Semibold. **H2 (section labels)** = 11 pt, weight 600 Semibold, uppercase, letter-spacing +0.05 em. **Body** = 10.5 pt, weight 400 Regular. **Field labels** = 9 pt, weight 500 Medium, colour `#4A5563`. **Line-item table** = 10.5 pt body / 10 pt numbers. **Totals row** = 11 pt Semibold for `Total`, 10.5 pt Regular for subtotal + tax line. **Fine-print block** (W2..W5) = 9 pt, line-height 1.45. **Footer** = 8 pt, colour `#4A5563`. | Type ramp saved; subsequent blocks inherit these defaults. |

### § 4.2 Seller-identity block (top-left) — maps to brief F1..F5

| # | Step | Pass condition |
|---|---|---|
| UI-LAYOUT-4 | Drag an Image widget into the top-left. Anton uploads the canonical CorpFlowAI mark (Anton's choice — recommended `LogoSQBK.png` if available locally, or whichever file Anton designates). Size to **~22 mm wide**, preserve aspect ratio. Vector or high-res PNG preferred so it scales cleanly on PDF zoom. If no logo file available, **skip this widget** — text-only seller block is acceptable per design brief § 7.4. | Logo widget renders the uploaded image at ~22 mm wide. If skipped, the seller-identity text block in UI-LAYOUT-5 starts at the top-left and absorbs the saved vertical space. |
| UI-LAYOUT-5 | Immediately below the logo (or at top-left if no logo): add a Static Text block with 5 lines, each in body style: `CorpFlowAI Ltd` (F1) / `BRN C25228280` (F2) / `Dextra Lane Lot No. 3 Phase 1, Trou Aux Biches, Mauritius` (F3) / `support@corpflowai.com` (F4) / `https://corpflowai.com` (F5; optional — operator's call). Alternative: replace static text with Company doctype field bindings (`company.company_name`, `company.tax_id`, `company.email`, `company.website`) so the values stay in sync if the Company doctype is later edited. Cursor recommendation: **mix** — F1, F2, F4, F5 as field bindings; F3 (address) as the linked Address doctype `CorpFlowAI Ltd - Registered Office` per `JE-2026-06-04-3` § 8 Dynamic Link. | All 5 lines visible; values match `JE-2026-06-04-3` § 8 + the public PAY-SBM-2 `0fd9312b` copy verbatim (BRN, address, support email). |

### § 4.3 Document-identity block (top-right) — maps to brief F10..F14

| # | Step | Pass condition |
|---|---|---|
| UI-LAYOUT-6 | Drag a Static Text block to the top-right of the page. Add the H1 (24 pt, Semibold) document type label: **`Pro-forma invoice`** (W-Title — verbatim string from design brief § 5; **not** `Quotation`, **not** `Tax invoice`, **not** `Invoice`). | H1 text renders at 24 pt; visually the largest text on the page. |
| UI-LAYOUT-7 | Add a small accent bar on the **left edge** of the W-Title text block, 2–3 mm wide, full text height, colour `#2dd4bf`. **This is accent mark #1 of 3 (per the design-brief accent-budget rule).** | Vertical teal bar visible to the left of `Pro-forma invoice`; no other accent uses elsewhere in this block. |
| UI-LAYOUT-8 | Below the H1, add 4 lines of metadata. Each line = field label (9 pt, `#4A5563`) + value (10.5 pt body). Bind: `Pro-forma reference` = Quotation `name` (= `CFLR-QUO-YYYY-NNN`; F11); `Issue date` = Quotation `transaction_date` formatted `YYYY-MM-DD` (F12); `Valid until` = Quotation `valid_till` formatted `YYYY-MM-DD` **conditional render — only show the line if `valid_till` is set** (F13; do **not** render `Valid until: —` if unset); `Currency` = Quotation `currency` (`USD`; F14). | All 4 metadata lines render correctly for a Quotation with `valid_till` set; the `Valid until` line is hidden cleanly when `valid_till` is unset. |

### § 4.4 Header rule (separator)

| # | Step | Pass condition |
|---|---|---|
| UI-LAYOUT-9 | Add a horizontal rule across the full content width, immediately below the seller + document-identity zone. Thickness `0.5 pt`. Colour `#2dd4bf`. **This is accent mark #2 of 3.** | Single teal rule visible separating the header zone from the buyer block. |

### § 4.5 Buyer-identity block (`BILL TO`) — maps to brief F6..F9

| # | Step | Pass condition |
|---|---|---|
| UI-LAYOUT-10 | Add an H2 section label: **`BILL TO`** (uppercase, 11 pt, Semibold, letter-spacing +0.05 em). Below the label, add 4 conditional lines: `Customer` legal name = Customer `customer_name` (F6); `Business / trading name` = Customer `customer_details` or custom field — **only render if non-empty AND different from legal name** (F7); `Email` = linked Contact `email_id` (F8); `Address` = linked Billing Address rendered as `address_line1, address_line2, city, country` — **only render if a Billing Address is linked** (F9). | F6 + F8 always visible; F7 + F9 hide cleanly when not applicable. |

### § 4.6 Line-item block (`LINE ITEMS`) — maps to brief F15..F19

| # | Step | Pass condition |
|---|---|---|
| UI-LAYOUT-11 | Add an H2 section label `LINE ITEMS`. Below, drag a Table widget bound to the Quotation `items` child table. Configure 4 columns: **Description** (`description` — wide column, ~60% of width); **Qty** (`qty` — narrow, right-aligned, 10%); **Unit** (`rate` formatted as `USD 150.00` — 15%, right-aligned); **Amount** (`amount` formatted as `USD 150.00` — 15%, right-aligned). Row vertical padding 12 pt minimum (per design-brief § 7.1 *lots of whitespace*). | Table renders one row for the LR-SETUP item; columns aligned; numbers right-aligned; description left-aligned. |

### § 4.7 Totals block (right-aligned, below line items) — maps to brief F20..F22

| # | Step | Pass condition |
|---|---|---|
| UI-LAYOUT-12 | Add a horizontal rule above the totals block, full content width, 0.5 pt, colour `#2dd4bf`. **This is accent mark #3 of 3.** Below the rule, add a right-aligned 2-column block (label / value): `Subtotal` = Quotation `net_total` formatted `USD 150.00` (F20); `VAT / Tax` = **literal static text** `Pending accountant confirmation` (F21 — **do NOT render `0.00`**); `Total` = Quotation `grand_total` formatted `USD 150.00` (F22 — bold 11 pt). | All 3 rows render; VAT/Tax row shows the literal phrase (not a number); Total row visually heaviest. |

### § 4.8 Payment placeholder block (`PAYMENT`) — maps to brief F23

| # | Step | Pass condition |
|---|---|---|
| UI-LAYOUT-13 | Add an H2 section label `PAYMENT`. Below, add a single Static Text block with **only** the W1 sentence (verbatim from § 5): **`Payment instructions are sent separately after intake approval.`** | Block visible. **NO** account number, no IBAN, no SWIFT, no payment URL, no button, no QR code, no card-scheme logo, no payment-provider wordmark. (See § 6 FB-3, FB-4, FB-5, FB-10, FB-11, FB-12.) |

### § 4.9 Service-fulfilment + disclaimers block — maps to brief F24..F27

| # | Step | Pass condition |
|---|---|---|
| UI-LAYOUT-14 | Add an H2 section label `SERVICE FULFILMENT`. Below, add Static Text with W2 + W3 stacked (each on its own paragraph; verbatim from § 5): **`Setup begins after payment confirmation and receipt of required client information.`** + **`Setup target: 48 hours after payment confirmation, subject to client responsiveness and required access/information.`** | Both sentences visible verbatim. |
| UI-LAYOUT-15 | Add an H2 section label `DISCLAIMERS`. Below, add Static Text with W4 + W5 stacked (each on its own paragraph; verbatim from § 5): **`No revenue, lead volume, or conversion outcome is guaranteed.`** + **`VAT/tax treatment pending accountant confirmation.`** | Both sentences visible verbatim. |

### § 4.10 Footer block — maps to brief F28..F30

| # | Step | Pass condition |
|---|---|---|
| UI-LAYOUT-16 | Open the canvas footer slot (Print Designer typically exposes a separate footer band). Add 2 elements: **Left** = Static Text `Issued by Anton on behalf of CorpFlowAI Ltd` (F28). **Right** = Static Text + page binding `{{ doc.name }} · Page {{ page_no }} of {{ total_pages }}` (F29 + F30). | Footer renders on every page (matters for multi-page edge cases — for the v1 single-line-item Quotation it should always be one page; AC-10 verifies). Font 8 pt, `#4A5563`. |

### § 4.11 Save + initial visual sanity

| # | Step | Pass condition |
|---|---|---|
| UI-LAYOUT-17 | Click `Save` in Print Designer. | Print Format record persists; no save error in browser console; `pdf_generator` field still `Chrome` (or `wkhtmltopdf` fallback per UI-CREATE-7). |
| UI-LAYOUT-18 | Use Print Designer's built-in preview pane (typically a `Preview` button) to render an in-editor mock with sample data. | Preview opens; layout visually matches blocks above; no obvious overflow, no broken image, no missing field placeholder rendering as `{{ undefined }}` or similar. |

---

## § 5 — Required static wording (verbatim — must appear on the rendered PDF)

The following 6 strings must appear character-for-character on the rendered PDF. Reproduced here for paste-safety; **do not paraphrase, do not abbreviate, do not translate**.

| ID | Verbatim string | Block (per § 4) |
|---|---|---|
| **W-Title** | `Pro-forma invoice` | Document identity (UI-LAYOUT-6) |
| **W1** | `Payment instructions are sent separately after intake approval.` | Payment placeholder (UI-LAYOUT-13) |
| **W2** | `Setup begins after payment confirmation and receipt of required client information.` | Service fulfilment (UI-LAYOUT-14) |
| **W3** | `Setup target: 48 hours after payment confirmation, subject to client responsiveness and required access/information.` | Service fulfilment (UI-LAYOUT-14) |
| **W4** | `No revenue, lead volume, or conversion outcome is guaranteed.` | Disclaimers (UI-LAYOUT-15) |
| **W5** | `VAT/tax treatment pending accountant confirmation.` | Disclaimers (UI-LAYOUT-15) |

**Note on W3 short-form vs long-form drift** (carried from design brief § 5): Anton's `AUTHORISE — ERPNext-ProForma-Template-Design-Brief-1` specified the short-form W3 above; the live `/terms` page + `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 1 use a longer 48-hours-and-5-business-days W3. **Use the short-form W3 specified above for v1.** If accountant or operator decides to align on long-form W3, the change lands on the production Print Format + live page + the design brief in the same coordinated change (per `ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` § 6 Q-Doc-3).

---

## § 6 — Forbidden wording (must NOT appear anywhere on the rendered PDF) + defensive assertion

| ID | Forbidden | Why |
|---|---|---|
| FB-1 | `Tax invoice` | Not a tax document; pre-VAT-review per HB-3 / W5 |
| FB-2 | `VAT invoice` | Same as FB-1 |
| FB-3 | `Pay now` | Buyer must not be CTA'd into payment from the PDF; payment routes via separate email per `JE-2026-06-01-4` + `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 5.2 |
| FB-4 | `PayPal accepted` | PayPal on HOLD per `JE-2026-06-01-4` |
| FB-5 | `Wise accepted` | Wise removed from v1 per `JE-2026-06-01-4` |
| FB-6 | `Instant checkout` | No checkout exists; misrepresents the manual two-email payment design |
| FB-7 | `revenue guarantee` / `guaranteed revenue` | Contradicts W4 + `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* no-guarantee rule |
| FB-8 | `lead volume guarantee` / `guaranteed leads` / `guaranteed enquiries` | Same as FB-7 |
| FB-9 | `conversion guarantee` / `guaranteed conversions` / `guaranteed bookings` | Same as FB-7 |
| FB-10 | Card-scheme logos (Visa, Mastercard, UnionPay, JCB, Alipay) + payment-provider wordmarks (PayPal, Wise, Stripe, SBM e-Commerce gateway logos) | None of these payment routes exist on the pro-forma surface; presence implies an unsupported "accepted" claim per `JE-2026-06-01-4` |
| FB-11 | Real bank account number / SWIFT / BIC / IBAN / sort code / routing number / branch code / MUR / USD account digits | Hard rule per design brief § 0; reinforced by `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 0 |
| FB-12 | Any payment URL, payment button, payment QR code | Same as FB-11; payment routing is two-email per `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 5.2 |

### § 6.1 Defensive forbidden-wording assertion (operator runs after § 4 build, before § 8 final acceptance)

The operator runs the following Python orchestrator from inside the production-shell backend container after the template is saved. It re-renders the test Quotation through the new Print Format, captures the rendered HTML, and greps for every forbidden substring. Any match → non-zero exit + abort. Same pattern as `ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` v1.1 § 13 placeholder Print Format.

```bash
# Run AFTER § 4 template build is saved; BEFORE § 8 PDF smoke acceptance.
# Operator pastes from L1-authored block; Anton at the L3 keyboard.

docker compose -p corpflowai-production exec -T backend bash -lc '
/home/frappe/frappe-bench/env/bin/python <<PY
import os, sys, re
os.chdir("/home/frappe/frappe-bench/sites")
import frappe
frappe.init(site="corpflowai-production.localhost", sites_path="/home/frappe/frappe-bench/sites")
frappe.connect()

# Find the test Quotation (recipe § 16 / § 15 pattern; customer_remarks per JE-2026-06-04-6 correction)
TAG = "TEST-ONLY PDF SMOKE — DO NOT SEND TO CLIENT"
quo = frappe.db.get_value("Quotation",
    {"party_name": "Test Buyer (CFLR-DRY-RUN)", "customer_remarks": ["like", f"%{TAG}%"], "docstatus": 0},
    "name")
if not quo:
    print("NO_TEST_QUOTATION — re-run recipe § 16 first")
    sys.exit(2)

# Render the new Print Format
PF = "CFLR Mauritius Pro-forma Invoice v1"
try:
    html = frappe.get_print("Quotation", quo, print_format=PF, as_pdf=False)
except Exception as e:
    print(f"RENDER_ERROR: {type(e).__name__}: {e}")
    sys.exit(3)

# Forbidden-wording sweep (case-insensitive)
forbidden = [
    "Tax invoice", "VAT invoice", "Pay now",
    "PayPal accepted", "Wise accepted", "Instant checkout",
    "revenue guarantee", "guaranteed revenue",
    "lead volume guarantee", "guaranteed leads", "guaranteed enquiries",
    "conversion guarantee", "guaranteed conversions", "guaranteed bookings",
    # Payment-provider / card-scheme wordmarks (alt-text + visible text)
    "Visa", "Mastercard", "UnionPay", "JCB", "Alipay",
    "Stripe", "PayPal", "Wise",  # bare wordmarks — see exemption note below
]
# Bank-digit / SWIFT / IBAN patterns
patterns = [
    r"MU\d{2}[A-Z0-9]{4}\d{7}",          # MU IBAN shape
    r"[A-Z]{4}MU[A-Z0-9]{2}([A-Z0-9]{3})?",  # SWIFT/BIC shape
    r"\b\d{8,}\b",                        # 8+ consecutive digits in any block
]

violations = []
hay = html.lower()
for s in forbidden:
    if s.lower() in hay:
        violations.append(("string", s))
for p in patterns:
    if re.search(p, html):
        violations.append(("regex", p))

if violations:
    print("FORBIDDEN_WORDING_VIOLATIONS:")
    for kind, v in violations:
        print(f"  [{kind}] {v}")
    sys.exit(4)

# Required-wording sweep (verbatim; case-sensitive)
required = [
    "Pro-forma invoice",
    "Payment instructions are sent separately after intake approval.",
    "Setup begins after payment confirmation and receipt of required client information.",
    "Setup target: 48 hours after payment confirmation, subject to client responsiveness and required access/information.",
    "No revenue, lead volume, or conversion outcome is guaranteed.",
    "VAT/tax treatment pending accountant confirmation.",
]
missing = [s for s in required if s not in html]
if missing:
    print("REQUIRED_WORDING_MISSING:")
    for s in missing:
        print(f"  {s!r}")
    sys.exit(5)

print("FORBIDDEN_WORDING_SWEEP: PASS")
print("REQUIRED_WORDING_SWEEP: PASS")
PY
'
```

**Exemption note on FB-10 wordmark sweep:** the bare strings `PayPal`, `Wise`, `Stripe` may legitimately appear in the rendered HTML if Anton chooses to **mention** them in a future template revision (e.g., a one-line "We accept SBM USD wire and bank-transfer methods discussed with each buyer" — which the v1 template does NOT carry). For v1, the sweep above flags any occurrence; if Anton needs to amend the sweep for a v1.1 / v2 variant that intentionally names a payment provider in plain prose, the amendment lands together with a separate authorisation packet that updates this runbook.

**Verdict for § 6:** if the orchestrator prints both `FORBIDDEN_WORDING_SWEEP: PASS` and `REQUIRED_WORDING_SWEEP: PASS` and exits 0, the template's wording compliance is verified. Otherwise, **stop**, fix the template in § 4, and re-run § 6.1.

---

## § 7 — Test data plan (TEST-1..TEST-5)

All test data lives entirely inside the production-shell ERPNext database. No real customer, no real invoice, no real payment, no real GL posting, no email to a real client. The test Quotation is left at `docstatus=0` (Draft) — **never** submitted, **never** converted to a Sales Invoice during this packet's execution.

| # | Step | Pass condition |
|---|---|---|
| TEST-1 | Use the test customer **`Test Buyer (CFLR-DRY-RUN)`** already created by recipe § 15. **Do NOT create any other customer in this packet.** | Customer doctype shows exactly one row matching `Test Buyer (CFLR-DRY-RUN)`; no real-named customers added. |
| TEST-2 | Use the item **`LR-SETUP-USD-150`** already created by recipe § 11 (verbatim name `"AI Lead Rescue Setup (USD 150 launch pilot)"`, USD 150 Standard Selling, `is_service_item=1`, `is_stock_item=0`). | Item doctype shows the row with all attributes as specified. |
| TEST-3 | Re-use the test Quotation created by recipe § 16 (or create a fresh one if § 16 was never run; if creating fresh, use the orchestrator pattern in recipe v1.1 § 16 with `customer_remarks` per `JE-2026-06-04-6` correction). The Quotation must be at `docstatus=0` (Draft), party_name `Test Buyer (CFLR-DRY-RUN)`, currency `USD`, one item row = `LR-SETUP-USD-150` × 1 @ USD 150.00, `customer_remarks` containing the sentinel `TEST-ONLY PDF SMOKE — DO NOT SEND TO CLIENT`. | Quotation visible in the UI list view; `docstatus=0`; reference in the `CFLR-QUO-…` series. |
| TEST-4 | **NEVER submit** the test Quotation during this packet (`docstatus` must stay 0). **NEVER convert** it to a Sales Invoice. **NEVER post any Payment Entry**. | UI shows the Quotation as `Draft`; no Sales Invoice exists for `Test Buyer (CFLR-DRY-RUN)`; no Payment Entry exists for any reference under this packet. |
| TEST-5 | **NEVER email** the rendered PDF (or any PDF) to any real client during this packet. The PDF stays on Anton's laptop (after `scp` from the box) for visual review only. | Operator confirms the rendered PDF is opened locally only; ERPNext UI `Email` button on the Quotation is **not** clicked. |

---

## § 8 — Verification (V-1..V-13 + Anton evidence checklist EV-1..EV-11)

After § 4 build + § 6.1 wording sweep, run the full verification pass. This is the operator-visible companion to the design brief's AC-1..AC-11 acceptance criteria.

### § 8.1 PDF smoke render (V-1..V-7)

The operator pastes the following block from inside the production-shell backend container. Renders the test Quotation via `frappe.get_print()` + `frappe.utils.pdf.get_pdf()`, saves a PDF, captures size + magic bytes + non-error verdict.

```bash
docker compose -p corpflowai-production exec -T backend bash -lc '
/home/frappe/frappe-bench/env/bin/python <<PY
import os, sys
os.chdir("/home/frappe/frappe-bench/sites")
import frappe
frappe.init(site="corpflowai-production.localhost", sites_path="/home/frappe/frappe-bench/sites")
frappe.connect()

TAG = "TEST-ONLY PDF SMOKE — DO NOT SEND TO CLIENT"
quo = frappe.db.get_value("Quotation",
    {"party_name": "Test Buyer (CFLR-DRY-RUN)", "customer_remarks": ["like", f"%{TAG}%"], "docstatus": 0},
    "name")
if not quo:
    print("NO_TEST_QUOTATION"); sys.exit(2)

PF = "CFLR Mauritius Pro-forma Invoice v1"
try:
    html = frappe.get_print("Quotation", quo, print_format=PF, as_pdf=False)
    from frappe.utils.pdf import get_pdf
    pdf = get_pdf(html)
except Exception as e:
    print(f"RENDER_ERROR: {type(e).__name__}: {e}"); sys.exit(3)

out = f"/tmp/CFLR-MAURITIUS-PRO-FORMA-V1-SMOKE-{quo}.pdf"
with open(out, "wb") as fh:
    fh.write(pdf)

magic = pdf[:4].hex()
size = len(pdf)
print(f"PDF_PATH: {out}")
print(f"PDF_MAGIC: {magic} (expect 25504446 = %PDF)")
print(f"PDF_SIZE_BYTES: {size}")
print(f"QUOTATION_NAME: {quo}")
print(f"QUOTATION_DOCSTATUS: 0 (must remain Draft — never submit)")
print("PDF_SMOKE_VERDICT: " + ("PASS" if magic == "25504446" and 5000 < size < 500000 else "FAIL"))
PY
'

# Copy PDF out to host filesystem so Anton can scp to laptop
docker compose -p corpflowai-production cp \
    backend:/tmp/CFLR-MAURITIUS-PRO-FORMA-V1-SMOKE-<quo-name>.pdf \
    ~/CFLR-MAURITIUS-PRO-FORMA-V1-SMOKE.pdf
ls -la ~/CFLR-MAURITIUS-PRO-FORMA-V1-SMOKE.pdf
```

| # | Check | Pass condition | Maps to AC |
|---|---|---|---|
| V-1 | `RENDER_ERROR:` not in output | No render error | AC-2 |
| V-2 | `PDF_MAGIC: 25504446` | PDF file is a valid PDF document (`%PDF` magic bytes) | AC-2 |
| V-3 | `PDF_SIZE_BYTES:` in range 30,000–200,000 (typical one-page Print-Designer + Chrome PDF) | Size sane; not a blank/empty render | AC-2 |
| V-4 | `QUOTATION_DOCSTATUS: 0` | Test Quotation never submitted by this smoke | TEST-4 |
| V-5 | No `wkhtmltopdf` error in container logs (`docker compose -p corpflowai-production logs --tail 50 backend`) | host_name fix from `JE-2026-06-04-5` + Chrome backend both honoured | AC-6 |
| V-6 | `PDF_SMOKE_VERDICT: PASS` printed | Composite gate of V-1 + V-2 + V-3 | AC-2 |
| V-7 | `corpflowai-sandbox` Docker project still `Up` post-render (`docker compose -p corpflowai-sandbox ps`) | Sandbox preservation per `JE-2026-06-04-1` honoured | (preservation rule) |

### § 8.2 Visual review (V-8..V-13)

Anton `scp`s the PDF to his laptop, opens locally, and walks through the visual gates.

```bash
# From Anton's Windows laptop (PowerShell):
scp anton@5.78.213.185:~/CFLR-MAURITIUS-PRO-FORMA-V1-SMOKE.pdf $HOME\Downloads\
# Open the PDF in a PDF reader (Windows: default app; Adobe Reader / SumatraPDF / Chrome both fine).
```

| # | Check | Pass condition | Maps to AC |
|---|---|---|---|
| V-8 | Logo (if uploaded in UI-LAYOUT-4) scales correctly at 100% PDF zoom AND 50% PDF zoom AND when printed-to-PDF re-render on A4 | No pixelation; aspect ratio preserved; no overflow off the page | AC-3 |
| V-9 | No script text visible on the rendered PDF | No `<script>` text, no HTML comments (`<!-- … -->`) bleeding through, no raw Jinja delimiters (`{{ … }}`), no `pdf_generator=` literal text, no `frappe.` inline expression text | AC-4 |
| V-10 | No broken image | No "missing image" / X-mark placeholder; logo (if present) renders, not a 404-style broken-image icon | AC-5 |
| V-11 | One page for the single-line-item Quotation | PDF page count = 1 (operator confirms in PDF reader page indicator) | AC-10 |
| V-12 | All required wording present (visual verification of W-Title + W1..W5 verbatim) | Operator reads each of the 6 strings off the page; spelling + punctuation match § 5 exactly | AC-7 |
| V-13 | No forbidden wording present (visual verification of FB-1..FB-12 absence) | Operator confirms: no `Tax invoice` / `VAT invoice` / `Pay now` / `PayPal accepted` / `Wise accepted` / `Instant checkout` / guarantees / card-scheme logos / payment URLs / QR codes / bank-digit strings anywhere | AC-8 |

### § 8.3 Visual score — PASS / PARTIAL / FAIL

Final composite verdict, recorded by Anton in the Bridge #249 closure comment:

| Verdict | Condition |
|---|---|
| **PASS** | V-1..V-13 all pass AND § 6.1 defensive sweep prints both `FORBIDDEN_WORDING_SWEEP: PASS` + `REQUIRED_WORDING_SWEEP: PASS` AND AC-1 (subjective: *"would I send this to a CEO?"*) is YES |
| **PARTIAL** | V-1..V-7 PDF smoke passes AND § 6.1 sweeps pass AND no forbidden wording / no broken image / no script text BUT one of: layout has a minor cosmetic defect (e.g., line item table column slightly misaligned), logo missing because no asset was available, or AC-1 is a soft YES with documented improvement items |
| **FAIL** | Any of: `RENDER_ERROR`, PDF magic mismatch, PDF size out of range, `wkhtmltopdf ConnectionRefusedError`, missing required wording, present forbidden wording, broken image, script-text bleed-through, multi-page rendering for a single-line-item Quotation, test Quotation accidentally submitted, real customer / Sales Invoice / Payment Entry / VAT activation / real bank account created during this packet |

### § 8.4 Anton evidence checklist (EV-1..EV-11) — paste back to Bridge #249

| # | Evidence | Maps to |
|---|---|---|
| EV-1 | Print Format record name + saved-at timestamp (UI footer) | UI-LAYOUT-17 |
| EV-2 | The rendered PDF file (Anton `scp`s from box; attaches or links in #249) | V-1..V-7 |
| EV-3 | Screenshot of the PDF at 100% zoom, full page | V-8 + visual AC-1 |
| EV-4 | Screenshot of the same PDF at 50% zoom (logo-scaling regression check) | V-8 / AC-3 |
| EV-5 | Output of the PDF smoke orchestrator from § 8.1 (all printed lines: `PDF_PATH`, `PDF_MAGIC`, `PDF_SIZE_BYTES`, `QUOTATION_NAME`, `QUOTATION_DOCSTATUS`, `PDF_SMOKE_VERDICT`) | V-1..V-6 |
| EV-6 | Output of the § 6.1 defensive wording orchestrator (`FORBIDDEN_WORDING_SWEEP: PASS` + `REQUIRED_WORDING_SWEEP: PASS`) | § 6.1 |
| EV-7 | Output of `docker compose -p corpflowai-production ls` post-render (showing both `corpflowai-production` AND `corpflowai-sandbox` as `running(9)`) | V-7 (sandbox preservation) |
| EV-8 | Last 50 lines of `docker compose -p corpflowai-production logs --tail 50 backend` showing **no** `wkhtmltopdf ConnectionRefusedError`, **no** `Permission denied`, **no** `OperationalError` | V-5 / AC-6 |
| EV-9 | Output of `bench --site corpflowai-production.localhost list-apps` showing `print_designer` (re-confirms install) | UI-PF-4 |
| EV-10 | Anton's PASS / PARTIAL / FAIL verdict per § 8.3 with one-sentence reason | § 8.3 |
| EV-11 | Read-only confirmation that the test Quotation is still `docstatus=0` after the smoke (UI screenshot or `bench` SQL `SELECT docstatus FROM tabQuotation WHERE name='<quo>'` → expect `0`) | TEST-4 |

---

## § 9 — Rollback (RB-1..RB-6)

Use this section **only** when the smoke / visual review verdict is `FAIL`, or when a regression is discovered later. Never delete in the first 24 hours after `FAIL` — keep the artefact for diagnosis; just disable.

| # | Step | When | Pass condition |
|---|---|---|---|
| RB-1 | **Disable the Print Format** (do **not** delete). UI: navigate to the Print Format record `CFLR Mauritius Pro-forma Invoice v1`; set `Disabled` = 1; save. | If smoke `FAIL` or visual review `FAIL`. | Print Format no longer appears in Quotation `Print` action dropdown; existing record + JSON layout preserved for inspection. |
| RB-2 | **Do not set the disabled template as the Quotation default**. UI: Settings → Print Settings → if the template was set as default Quotation Print Format, revert to either the placeholder `CFLR Pro-forma Invoice` from recipe § 13 or to ERPNext's stock `Standard` Quotation Print Format. | Same trigger as RB-1. | Default Quotation Print Format = either the placeholder or stock; not the disabled template. |
| RB-3 | **Keep classic Letter Head disabled if broken** (recipe v1.1 § 9 marked classic Letter Head as EMERGENCY / TRANSITIONAL ONLY). The manually-created `CorpFlowAI Letterhead` from Anton's earlier UI session may have script-bleed-through text from the failed manual editing attempts (per `JE-2026-06-04-5` follow-up item iv). If so, **set `Disabled` = 1 on `CorpFlowAI Letterhead`** to remove it from the rendering chain; do not delete. | If Letter Head bleeds script text or comments into rendered output. | The compromised Letter Head no longer participates in any Print Format render. |
| RB-4 | **Wait 24 hours** before deleting the disabled Print Format. Use the window to diagnose: compare the saved JSON layout (Print Designer's record on `Print Format` doctype carries the layout payload) against this packet's § 4 instructions; identify the deviation; document for the next attempt. | Same trigger as RB-1; 24-hour minimum before RB-5. | Diagnostic notes captured in Bridge #249. |
| RB-5 | **(Optional, after RB-4)** Delete the disabled Print Format record if diagnostics confirm the template is unsalvageable. UI: navigate to the record; click `Delete`. | Only after RB-4 wait + diagnostics. | Print Format row removed from DB; sandbox / production-shell Docker projects untouched. |
| RB-6 | **Manual Word/Pages pro-forma remains the canonical fallback** per `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`). Any real client pro-forma during the rollback period uses the manual path; this is unchanged by RB-1..RB-5. | Throughout; this is the default state until `ERPNext-First-Real-Pro-Forma-Send` is authorised + AC-1..AC-11 all pass + HB-1..HB-4 close. | Anton uses the manual template per its § 5 instructions for any real-client pro-forma; no ERPNext-emailed PDF goes to a real client. |

**What rollback does NOT do:**

- Does NOT uninstall Print Designer (that is a separate decision under `ERPNext-PrintDesigner-Uninstall-1`, a future packet not yet drafted).
- Does NOT touch the live `host_name = http://frontend:8080` from `JE-2026-06-04-5`.
- Does NOT touch the sandbox (`corpflowai-sandbox` project preserved per `JE-2026-06-04-1`).
- Does NOT touch any real client / real bank / real payment / VAT surface — none of those exist on the production shell yet.
- Does NOT touch the placeholder `CFLR Pro-forma Invoice` Print Format from recipe § 13 (if Anton ever created it); the placeholder remains the wkhtmltopdf-rendered fallback for emergency use.
- Does NOT touch the manual Word/Pages template `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` — that template is repo-side and unaffected.

---

## § 10 — Standing holds (unchanged by THIS PR)

This runbook is operator-paste instructions only. It does NOT close, modify, or accelerate any of:

- **HB-1** (full Phase D operator-approval row for revenue-posting / VAT-active / real-bank / real-client surface) — still **NOT-AUTHORISED** beyond the narrowed shell-setup scope of `JE-2026-06-04-1`.
- **HB-2** Mauritius-licensed accountant CoA review in writing — **PENDING-ACCOUNTANT**.
- **HB-3** VAT decision recorded in `JOURNAL.md` — **PENDING-ACCOUNTANT**.
- **HB-4** real (redacted) MU bank CSV reconciliation cycle — **PENDING-OPERATOR**.
- **Full Phase D** ERPNext accounting go-live — HELD on HB-1+HB-2+HB-3+HB-4 closure plus a separate future Phase D authorisation row.
- **First submitted Sales Invoice on production** (GL posting) — HELD on the same gate.
- **First email of any ERPNext-generated PDF to a real client** — HELD on the same gate.
- **`ERPNext-PrintDesigner-Install-1`** (Packet 2 from `JE-2026-06-04-4` § 7.2) — runs in parallel; this build packet is gated on it closing per § 1 PR-2.
- **Sandbox tear-down** — HELD on the four-condition gate from `JE-2026-06-04-1`.
- All standing holds from `JE-2026-06-05-1` § *Standing holds* (Phase C² · runbook §8.1 · production ERPNext accounting · scheduler · payment gateway configuration · Lead Rescue wording adoption · SBM application submission · PAY-SBM-3 · NDA / MCIB · Freshdesk activation · `support.corpflowai.com` CNAME · DKIM/SPF · live-chat · AI chatbot · n8n migration · public site-copy adding portal URL · Pomelli activation · `MONITORING_ARCHITECTURE.md` § 11.3 stale-spec doc-drift).

**New holds introduced by THIS PR:** none. Future execution of this runbook on the production shell is gated on (a) Print Designer install closing, (b) Anton at the L3 keyboard executing the operator-paste blocks, (c) capturing EV-1..EV-11 evidence, (d) returning PASS / PARTIAL / FAIL verdict to Bridge #249 with a separate closure JE row.

---

## § 11 — Honest limits of THIS runbook

- **Print Designer UI affordances may have evolved.** The runbook is authored against Print Designer **v1.6.7** (the version pinned in `JE-2026-06-04-4` § 7.2 Packet 2 shape). If Anton installs a newer version, label / widget names may differ; map to the closest equivalent and document any drift in the Bridge #249 closure comment.
- **No PDF rendered by THIS PR.** The render evidence comes later, from Anton's L3 execution of § 8.1 after Packet 2 install closes.
- **No host commands executed by THIS PR.** Authored on Anton's Windows laptop (L1) per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.4; no SSH bridge to the box; HOST_MISMATCH guard from `JE-2026-06-04-1` does not apply.
- **No canonical logo asset committed by THIS PR.** As of 2026-06-05, `public/assets/logos/` contains only `theme.js` referencing `LogoSQBK.jpg/png` — neither file is committed. UI-LAYOUT-4 assumes operator-uploaded logo at Print Designer build time; text-only fallback is acceptable v1.
- **AC-1 (visually professional for CEO buyer) is operator's subjective call.** No automated check can replace Anton's judgement on whether the PDF is good enough to send to a real buyer making a USD-tier decision.
- **The defensive forbidden-wording sweep is a back-stop, not a guarantee.** It catches common regressions; it cannot prove the template is doctrine-compliant in every edge case. The operator's visual review (V-8..V-13) is the ultimate gate.
- **Chrome PDF backend may not be installed in every container.** Per `JE-2026-06-04-4` § 4 Q3, `bench setup-chrome` must run on backend + scheduler + worker containers, OR `chromium-headless-shell` must be installed system-wide via a Dockerfile layer + `bench set-config -g chromium_binary_path`. Pre-flight UI-PF-6 confirms the backend container has Chrome; the queue / worker containers handle background-rendered PDFs (e.g., email attachments) and may need separate `setup-chrome`. For *this* packet (interactive render only), backend-only Chrome is sufficient.
- **The test Quotation may not exist if recipe § 16 was never run.** TEST-3 includes a fall-back to create one fresh; this assumes recipe v1.1 § 16 (`customer_remarks` per `JE-2026-06-04-6` correction) is available.

---

## § 12 — Cross-references

- Design specification (the spec this runbook executes): `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (`JE-2026-06-05-1`).
- Print Designer evaluation + Packet 2 install shape: `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` (`JE-2026-06-04-4`).
- Production-shell setup recipe (placeholder Print Format § 13 + Letter Head emergency / transitional § 9 + SSH tunnel § 17 + test data § 11 + § 15 + § 16): `docs/runbooks/ERPNEXT_PRODUCTION_SHELL_SETUP_RECIPE.md` v1.1 (`JE-2026-06-04-3` + `JE-2026-06-04-6`).
- host_name fix that structurally unblocks PDF rendering: `JE-2026-06-04-5`.
- Manual Word/Pages pro-forma template (W1..W5 source + canonical fallback): `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`).
- Production-readiness eval (M-Print broader scope + 4 HARD BLOCKERS HB-1..HB-4): `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` (`JE-2026-06-03-2`).
- Accountant review pack (Q-Doc + Q-VAT constraints): `docs/finance/ERPNEXT_ACCOUNTANT_REVIEW_PACK_V1.md` (`JE-2026-06-03-3`).
- Brand doctrine (single-offer rule + canonical Item label + no-guarantee line): `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*.
- Canonical accent colour: `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` BI-D-1.
- Execution boundary (L1/L2/L3 collaboration pattern): `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (`JE-2026-06-04-2`).
- Production-shell narrowed-scope authorisation: `JE-2026-06-04-1`.
- Decision rows: `JE-2026-05-28-1` (single-offer rule), `JE-2026-06-01-4` (payment-route reality), `JE-2026-06-02-4 PAY-SBM-2` (public seller identity), `JE-2026-06-02-7` (manual pro-forma template), `JE-2026-06-03-2..3` (production-readiness + accountant pack), `JE-2026-06-04-1..6` (production-shell setup chain), `JE-2026-06-05-1` (design brief), `JE-2026-06-05-2` (this runbook).
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## § 13 — Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only

**COMPLETE-AT-PR-MERGE** for the *operator runbook artefact* — operator + agent governance; no customer-visible URL to probe by design. The subsequent **host-side execution** of this runbook on `corpflow-exec-01-u69678` is a separate piece of work, gated on `ERPNext-PrintDesigner-Install-1` closing, and reports its own STATUS on Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (with a separate future `JE-YYYY-MM-DD-N` closure row including EV-1..EV-11 evidence + PASS/PARTIAL/FAIL verdict per § 8.3).

---

## § 14 — Change log

- **v1, 2026-06-05** — initial operator-paste runbook. 14 sections covering hard limits + prerequisites PR-1..PR-8 (Print Designer install authorised + executed + production-shell + sandbox preserved + Item + test customer + naming series + standing holds), pre-flight UI-PF-1..UI-PF-7 (SSH tunnel + UI + login + Print Designer install via `bench list-apps` + UI reachable + Chrome PDF backend available + no real customer/invoice/payment/tax/bank), template creation UI-CREATE-1..UI-CREATE-7 (name `CFLR Mauritius Pro-forma Invoice v1` + `doc_type=Quotation` + A4 + margins + `pdf_generator=Chrome` with wkhtmltopdf fallback), layout instructions UI-LAYOUT-1..UI-LAYOUT-18 split across 11 visual blocks (palette + typography / seller-identity F1..F5 / document-identity F10..F14 with W-Title left accent bar = mark #1/3 / header rule = mark #2/3 / buyer-identity F6..F9 / line-items F15..F19 / totals F20..F22 with `Pending accountant confirmation` static VAT line + above-totals rule = mark #3/3 / payment placeholder F23 with W1 verbatim and explicit FB-3+FB-11+FB-12 protection / service-fulfilment F24..F25 with W2+W3 verbatim / disclaimers F26..F27 with W4+W5 verbatim / footer F28..F30 / save + preview), 6 required verbatim wordings W-Title + W1..W5 with short-form W3 drift note, 12 forbidden patterns FB-1..FB-12 + defensive Python orchestrator sweeping the rendered HTML for forbidden strings (case-insensitive) + bank-digit / SWIFT / IBAN regex shapes + required-wording verbatim presence (case-sensitive) with non-zero exit on any violation, test data plan TEST-1..TEST-5 (re-use `Test Buyer (CFLR-DRY-RUN)` + `LR-SETUP-USD-150` + recipe § 16 test Quotation at `docstatus=0` + never submit + never email), verification V-1..V-13 PDF smoke orchestrator (`frappe.get_print()` + `get_pdf()` + magic-byte check + size range + sandbox preservation) + visual review checklist (logo scaling at 100% and 50% zoom + no script text + no broken image + one page + required wording verbatim + forbidden wording absent) + composite PASS/PARTIAL/FAIL verdict + Anton evidence checklist EV-1..EV-11 (Print Format record + rendered PDF + 2 screenshots + smoke orchestrator output + wording sweep output + `docker compose ls` post-render + backend log tail + `list-apps` re-confirmation + verdict + `docstatus=0` re-confirmation), rollback RB-1..RB-6 (disable Print Format don't delete + don't set disabled template as default + keep classic Letter Head disabled if broken + 24-hour wait before delete + optional delete after diagnostics + manual Word/Pages fallback remains canonical), standing holds carried forward unchanged, honest limits (Print Designer UI may have evolved / no PDF rendered by THIS PR / no host commands / no logo asset committed / AC-1 is operator's subjective call / sweep is back-stop not guarantee / Chrome may need separate setup-chrome per container / test Quotation fall-back), cross-references to 11 sibling docs + decision rows including the full `JE-2026-06-04-1..6` production-shell setup chain + `JE-2026-06-05-1` design brief. (`JE-2026-06-05-2`.)
