# AI Lead Rescue - intake to invoice operator workflow audit (v1)

**Status:** Inspection-only audit. **Docs-only.** No runtime code, public page copy, payment configuration, ERPNext production setting, env var, secret, DNS record, Vercel config, GitHub setting, or DB schema is changed by this document. The current `/lead-rescue` page wording, the ERPNext sandbox state, and the live operator console are all unchanged.

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT_V1 -->`

<!-- AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT_V1 -->

**Authorisation:** Anton's request on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-02) - *"Please inspect whether CorpFlowAI already has a complete operator workflow for turning an AI Lead Rescue intake into a PDF quote/pro-forma invoice."* Eight specific questions, scope explicitly inspection/docs only, no runtime, no ERPNext production, no secrets, no payment automation. This document is the audit report.

**Companion to:**

- `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md` (`JE-2026-06-01-6`) - launch-readiness inventory; § 6 covers ERPNext sandbox readiness at the inventory level. This audit covers the operator-workflow chain in the same depth but with field-by-field evidence and step-by-step Friday-safe runtime instructions.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` - canonical operator runbook (status pipeline + 13-item setup checklist + commercial-card field semantics).
- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` - Phase C end-to-end test evidence + § 4 finding C-1 resolution history.
- `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md` - sandbox plan (§ 3.1 step 4 named PDF generation as a check; not exercised in Phase C).
- `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` - § 9 confirms `wkhtmltopdf` is the sandbox PDF generator.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* - canonical item label, single-offer rule, no-guarantee line, payment-after-buyer-intent constraint.
- `docs/finance/PAYMENT_READINESS_2026_06_01.md` (`JE-2026-06-01-4`) - SBM Bank Mauritius primary; PayPal HOLD; Wise removed; § 4.5 forbidden phrases.
- `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` § 3 - pre-proof posture; honest replacement lines.

## Executive verdict

**A complete intake-to-PDF-pro-forma operator workflow IS available for Friday, but it is partly app-side and partly off-app.** The app handles intake capture, prospect display, and operator state-tracking end-to-end; the PDF pro-forma itself is hand-built off-repo (Word / Pages / Google Doc -> export PDF) and is the **safer choice over the ERPNext sandbox path** for Friday, exactly as the launch-readiness doc § 6.3 already recommends. Anton can run the full Mauritius launch-pilot intake-to-paid loop on Friday using only the existing app surfaces plus a manual PDF template he prepares on his laptop.

**ERPNext is NOT used in the Friday flow.** ERPNext sandbox can already produce USD 150 Sales Invoices arithmetically (`ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 3) but (a) the sandbox is loopback-only, (b) the company name on the document would render as "CorpFlowAI Sandbox" not "CorpFlowAI Ltd.", (c) no Letter Head / logo / address / BRN is configured, (d) Phase D production go-live is gated per `JE-2026-05-29-1` and is not authorised. The sandbox is a useful arithmetic-and-GL test bed for after the first paying pilot, not a Friday production tool.

The Friday-safe runtime is documented in § 9 below.

## 1. Where the intake form stores prospect details

**The intake chain (live, production):**

```
[ /lead-rescue page ]
  components/AiLeadRescueLanding.js   <- buyer fills form (5 visible fields)
            |
            | POST /api/tenant/intake  (JSON)
            v
[ Next.js API ]
  api/factory_router.js               <- factory-router dispatches
            |
            v
  lib/server/tenant-intake.js         <- canonical handler (lines 62-182)
            |
            +--> Postgres (Neon) - table `leads` (Prisma model `Lead`)
            +--> Postgres (Neon) - table `automation_events`:
                  - tenant.lead.captured (generic)
                  - corpflow.lead_rescue.intake_received (Lead Rescue specific)
                    -> idempotency key `lead-rescue:intake:<lead_id>`
                    -> contains pre-formatted operator notification text +
                       absolute admin_detail_url
                    -> if CORPFLOW_AUTOMATION_FORWARD_URL is set, n8n receives
                       the row over the standard envelope and forwards to
                       Telegram / email per docs/n8n/automation-forward-recipe.md
```

**Intake form visible fields** (`components/AiLeadRescueLanding.js` lines 432-437):

| Form field | HTML name | Required | Goes to |
|---|---|:---:|---|
| Business name | `business_name` | YES | `meta.business_name` -> `qualification_json.intake_meta.business_name` |
| Your name | `name` | YES | `Lead.name` |
| Email | `email` | YES | `Lead.email` (lowercased server-side) |
| Phone / WhatsApp | `phone` | no | `Lead.phone` |
| Where do leads arrive now? | `lead_sources` | no | `meta.lead_sources` -> `qualification_json.intake_meta.lead_sources` |
| What lead follow-up problem should we fix first? | `message` | YES | `Lead.message` + `Lead.intent` |

**Server-side enrichment** (`lib/server/tenant-intake.js` lines 84-106):

- `meta.product` - hard-set to `ai-lead-rescue` by the page; server uses this to branch.
- `meta.host` - hard-set to the page host; server falls back to `x-forwarded-host` if missing.
- `meta.page` - hard-set to `/lead-rescue` by the page.
- `meta.region_path` and `meta.preferred_payment_path` - **accepted but no longer asked** on the page (lines 128-131 of `AiLeadRescueLanding.js` - kept for backward compatibility; current page does not include region or payment-route choice fields per `JE-2026-05-28-1`).

**Persisted Lead row shape** (`prisma/schema.prisma:11-30`):

```text
Lead.id                cuid (string)
Lead.tenantId          tenant_id (host-derived)
Lead.name              buyer's contact name
Lead.email             buyer's email (lowercased)
Lead.phone             buyer's phone / WhatsApp (nullable)
Lead.message           buyer's typed problem / intent
Lead.intent            same as message (legacy alias)
Lead.status            'NEW_INTAKE' for AI Lead Rescue product
Lead.qualificationJson {
  intake_meta: {
    product:        'ai-lead-rescue',
    business_name:  '...',
    lead_sources:   '...',
    host:           'corpflowai.com' or 'aileadrescue.corpflowai.com',
    page:           '/lead-rescue',
    message:        '...'
  },
  ai_lead_rescue_operator: {
    status:                 'NEW_INTAKE' (canonical 13-state pipeline),
    next_action:            null,
    owner:                  null,
    last_contacted:         null,
    notes:                  null,
    setup_price:            null,
    monthly_monitoring_price: null,
    currency:               null,
    payment_route:          null,
    payment_status:         'none',
    invoice_reference:      null,
    payment_notes:          null,
    setup_checklist:        { items: [...13 canonical items...], version: 1 }
  }
}
Lead.createdAt          intake submission timestamp (UTC)
Lead.updatedAt          last operator edit
```

**Tenant scoping:** `lib/server/tenant-intake.js` lines 33-42 hard-require `req.corpflowContext.surface === 'tenant'`. If the host is not in `tenant_hostnames`, the request returns `400 TENANT_CONTEXT_MISSING`. Confirmed live: both `corpflowai.com/lead-rescue` and `aileadrescue.corpflowai.com/` resolve to the CorpFlowAI tenant per the launch-readiness inventory § 1.

**Verdict (Q1):** **The intake form stores all required prospect details on the canonical Postgres `leads` table, scoped by tenant_id, with structured operator state already pre-seeded under `qualification_json.ai_lead_rescue_operator`.** No data is missing; nothing else needs to be captured at intake time for Friday outreach. The two automation events (generic + Lead-Rescue-specific) ensure operator alerts work end-to-end via the n8n forward path.

## 2. Sufficiency of `/admin/lead-rescue/[id]` for buyer-detail review

**Page chain:**

- `pages/admin/lead-rescue/[id].js` -> guarded by `requireAdminPageSession` (factory master only) -> renders `components/AiLeadRescueAdminDetail.js`.
- `components/AiLeadRescueAdminDetail.js` calls `GET /api/factory/lead-rescue/get?id=<lead_id>` (factory master gated) and renders four cards.

**Card 1 - Prospect (read-only)** (`AiLeadRescueAdminDetail.js` lines 254-268). Nine displayed fields:

| Card label | Source | Friday-PDF use |
|---|---|---|
| Business name | `lead.prospect.business_name` (from `qualification_json.intake_meta.business_name`) | -> Buyer block: company name |
| Contact name | `lead.prospect.contact_name` (= `Lead.name`) | -> Buyer block: contact name |
| Email | `lead.prospect.email` (= `Lead.email`) | -> Buyer block: email; also where the pro-forma PDF is sent |
| Phone / WhatsApp | `lead.prospect.phone` (= `Lead.phone`) | -> Buyer block: phone (optional on PDF) |
| Region | `lead.prospect.region_path` -> labelled via `regionLabel()` lines 62-68 (`mauritius`, `international`, `not_selected`) | Operator-internal context only - Friday outreach is Mauritius-only, so the label is informational |
| Business type / niche | `lead.prospect.business_type` (operator can set later; rarely populated at intake) | Operator-internal; can inform invoice description if specific |
| Lead sources | `lead.prospect.lead_sources` (from `qualification_json.intake_meta.lead_sources`) | Operator-internal; useful for setup scope confirmation |
| Intake message | `lead.prospect.intake_message` (= `Lead.message`) | Operator-internal; useful to tune the line item description on the invoice if the intake says something specific (e.g. *"WhatsApp + Facebook"* tells you which lead source to connect) |
| Source | `lead.prospect.source_page + source_host` | Operator-internal; tells you whether the buyer landed on `corpflowai.com/lead-rescue` or `aileadrescue.corpflowai.com` |

**Card 2 - Commercial (operator-editable)** (lines 271-307). Seven editable fields persisted via `PATCH /api/factory/lead-rescue/patch`:

- Setup price - numeric (Friday: `150`)
- Monthly monitoring price - numeric (Friday: leave blank or `0` - launch pilot is one-off)
- Currency - text code (Friday: `USD`)
- Payment status - text label (Friday lifecycle: `none` -> `quoted` -> `pending` -> `paid`)
- Payment route - free text (Friday: `SBM Bank Mauritius wire`)
- Invoice / reference - free text (Friday: paste the manual PDF filename or sequential number e.g. `CFLR-2026-01`)
- Payment notes - free text (Friday: e.g. *"Pro-forma PDF sent 2026-06-05; SBM wire confirmed 2026-06-06; setup begins 2026-06-06 16:00 SAST"*)

**Card 3 - Status & operations** (lines 309-342). Status dropdown with the canonical 13-state pipeline (`NEW_INTAKE` -> `QUALIFYING` -> `DEMO_OFFERED` -> `DEMO_BOOKED` -> `QUOTE_SENT` -> `PAYMENT_PENDING` -> `PAID_SETUP` -> `SETUP_IN_PROGRESS` -> `LIVE_PILOT` -> `MONITORING_OFFERED` -> `MONTHLY_ACTIVE`; `LOST` and `PAUSED` terminal/holding). Plus Next action / Owner / Last contacted / Notes.

**Card 4 - Setup checklist** (lines 352-474). Visible only from `PAID_SETUP` onwards (5 statuses). Header reads `X/13 complete`. Each of the 13 items saves independently via the existing factory PATCH route.

**Operator notification path:**

1. Intake submission -> `corpflow.lead_rescue.intake_received` event written to `automation_events`.
2. Event payload includes `notification_text` (multi-line, ready to forward verbatim) + `admin_detail_url` (absolute URL to `/admin/lead-rescue/<lead_id>`).
3. n8n forwards to Telegram / email if configured. SLA inside `notification_text` = *"Review and reply within 2 business hours."*

**Verdict (Q2):** **Yes, `/admin/lead-rescue/[id]` is sufficient for Anton to view all buyer details captured at intake.** All five intake-form fields plus auto-derived metadata (region, source page/host, submission timestamp) are visible on Card 1. Friday operator workflow can run end-to-end inside this page: review prospect -> set status -> record commercial fields -> mark payment received -> open setup checklist. **No additional admin UI work is required for Friday.**

## 3. Field map - intake -> admin detail -> manual PDF pro-forma

Single canonical mapping for Friday. The operator copies the buyer-side fields off the Prospect card; the seller-side fields come from a manual template Anton prepares once and reuses.

| Friday PDF section | PDF field | Source on `/admin/lead-rescue/[id]` | Operator action |
|---|---|---|---|
| Header (seller) | Document title | n/a (template literal: **"Pro-forma invoice"** or **"Quote"**) | Set in template once. Note: *"Pro-forma invoice"* is preferred over *"Quote"* because the buyer needs to know what they are paying against; pro-forma is also the term Mauritius accountants expect for a pre-payment document. |
| Header (seller) | Logo / wordmark | n/a (template; canonical CorpFlowAI wordmark per `JE-2026-05-29-2`) | Embed once in template. |
| Header (seller) | Legal company name | n/a (template literal: **CorpFlowAI Ltd.**) | Set in template once. **Do not** use the sandbox name "CorpFlowAI Sandbox". |
| Header (seller) | Mauritius BRN | n/a (operator-side; not in repo) | Anton fills the template once with the live BRN. |
| Header (seller) | Registered address | n/a (operator-side; not in repo) | Anton fills the template once with the live address. |
| Header (seller) | Contact email | n/a (template literal: **support@corpflowai.com**) | Set in template once. |
| Header (seller) | Contact phone | n/a (operator-side) | Anton fills the template once. |
| Header (document) | Document number | Operator decides; recommend **`CFLR-YYYY-NN`** sequential | Anton increments per document; can also paste into Card 2 *Invoice / reference*. |
| Header (document) | Issue date | Today (ISO `YYYY-MM-DD`) | Operator fills. |
| Header (document) | Valid until | Issue date + 14 days | Operator fills. Common Mauritius pro-forma practice. |
| Buyer block | Buyer business name | Card 1 *Business name* (`lead.prospect.business_name`) | **Copy verbatim.** |
| Buyer block | Buyer contact name | Card 1 *Contact name* (`lead.prospect.contact_name`) | **Copy verbatim.** |
| Buyer block | Buyer email | Card 1 *Email* (`lead.prospect.email`) | **Copy verbatim.** Also where the PDF is delivered. |
| Buyer block | Buyer phone | Card 1 *Phone / WhatsApp* (`lead.prospect.phone`) | Copy if present (optional on PDF). |
| Buyer block | Buyer business address | Not collected at intake | Operator gets it during the qualification call (`/admin/lead-rescue/[id]` Card 3 *Notes*) before issuing the PDF. |
| Buyer block | Buyer BRN (optional) | Not collected at intake | Optional - some Mauritius buyers ask for it on the PDF; if provided, paste verbatim. |
| Line item | Description | Verbatim per `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*: **"AI Lead Rescue Setup (USD 150 launch pilot)"** | Copy verbatim. |
| Line item | Quantity | `1` | Hard-set. |
| Line item | Unit price | **USD 150.00** | Hard-set. |
| Line item | Subtotal | **USD 150.00** | Auto-calculated. |
| Total | Sub-total / pre-VAT | **USD 150.00** | Auto-calculated. |
| Total | VAT | n/a (footer note) | Use the line *"VAT: not yet applicable - to confirm with accountant"* per `AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md` § 6.2. **Do not** charge VAT on Friday. |
| Total | **Total due** | **USD 150.00** | Auto-calculated. |
| Scope statement | Setup scope | Template paragraph (verbatim recommended below) | Set in template once. |
| Scope statement | No-guarantee line | Template literal per doctrine: **"We do not guarantee new revenue. We help make sure the enquiries you already get are captured, visible, and followed up."** | Set in template once. |
| Payment instructions | Method | **SBM Bank Mauritius wire** (per `JE-2026-06-01-4` § 3 priority 4 - the only currently-available route for warm-network) | Set in template once. |
| Payment instructions | Bank wire details | Operator-side (account name, account number, SWIFT/BIC, branch) | **Anton fills the template once with the live bank details.** Do **not** commit live banking details to the repo. Keep the populated template as a local file on the operator's laptop. |
| Payment instructions | Reference to use on wire | The document number (e.g. `CFLR-2026-01`) | Operator instructs the buyer to use the document number as the wire reference. |
| Footer | Trust line | *"This document is a pro-forma invoice (not a tax invoice). The 48-hour setup begins once payment is confirmed."* | Set in template once. |
| Footer | Forbidden phrases | n/a - **must NOT appear** anywhere on the PDF (per `JE-2026-06-01-4` § 4.5): *"Pay now"*, *"PayPal accepted"*, *"Wise accepted"*, *"instant checkout"*, *"international bank transfer"* as primary CTA. Document title says *"Pro-forma invoice"*, payment method says *"SBM Bank Mauritius wire"*, neither is a forbidden phrase. | Audit the template once; lock. |

**Recommended scope-statement paragraph (template literal):**

```text
Scope of the AI Lead Rescue Setup (USD 150 launch pilot):

- One existing lead source connected (form / email / WhatsApp / Facebook
  / Google Form - chosen during intake review).
- Daily lead list set up (typically a Google Sheet) - shared with the
  business owner and operator.
- Instant owner alert configured (typically Telegram or email) for every
  new enquiry.
- 7-day monitoring window during which CorpFlowAI watches alerts and
  the lead list daily.
- Hand-over message at the end of the pilot: what was set up, what to
  expect, who to contact.

The 48-hour setup clock begins once payment is confirmed in the
CorpFlowAI Ltd. SBM bank account, not at the time this document is
issued.
```

**Verdict (Q3):** **Yes, the operator can copy every required buyer-side detail from `/admin/lead-rescue/[id]` Card 1 into a manual PDF pro-forma.** Buyer business name, contact name, email, and phone are all visible and copy-pastable. The buyer business address (which most Mauritius pro-forma invoices include) is **not** collected at intake; the operator gets it during the qualification call and records it in Card 3 *Notes* before issuing the PDF. All seller-side fields (CorpFlowAI Ltd. legal name, BRN, registered address, bank wire details) live in the operator's local PDF template, which Anton populates once and reuses - they are correctly **not** in the repo.

## 4. ERPNext sandbox - product / item state

**Confirmed by Phase C evidence** (`docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 2.3 line 52):

| Attribute | Value | Provenance |
|---|---|---|
| Item code | `SBX-LR-SETUP-USD-150` | Phase C bootstrap, idempotent |
| Item name | **"AI Lead Rescue Setup (USD 150 pilot)"** | Verbatim per `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* |
| Item group | `Services` | Phase C bootstrap |
| Service-item flag | set (`is_service_item=1`) | Phase C bootstrap |
| Standard Selling price | **USD 150.00** | Phase C bootstrap |
| Cycles consumed | Phase C cycle 1 (`ACC-SINV-2026-00001`) + cycle 2 (`ACC-SINV-2026-00002`) - both submitted, both `Paid`, both reconciled to MUR 0.00 delta | `ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 3.1 + § 3.2 |
| Sandbox host | `corpflow-exec-01-u69678` (Hetzner CX32-class VM, 4 vCPU / 8 GB / 150 GB) | `JE-2026-05-31-2`, `JE-2026-06-01-1` |
| Network exposure | **Loopback only** - `127.0.0.1:8080` accessible via SSH tunnel from operator's laptop only | `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 10 |
| Scheduler | **Disabled** (`disable_scheduler=1` in `sites/corpflowai-sandbox.localhost/site_config.json`) | `JE-2026-06-01-1`, confirmed in `JE-2026-06-01-5` Cycle 4 re-run |

The `SBX-` prefix on the item code is intentional - it signals "sandbox-only" so a future production install will not reuse this code by mistake.

The item is also visible to the read-only accountant role (`Accountant Read-Only` per `JE-2026-06-01-5`) - one of the 9 doctypes covered by the Custom DocPerm rows is `Item` with `read=1 / report=1 / export=1` and write/state-change/delete all explicitly `0`.

**Verdict (Q4):** **Yes, the ERPNext sandbox already contains the canonical AI Lead Rescue Setup item with the verbatim brand-doctrine name and USD 150 price.** The item is functional - Phase C cycles 1 and 2 both raised Sales Invoices against it and posted full GL trails. The item is sandbox-only by design.

## 5. ERPNext sandbox - PDF / pro-forma generation capability

**ERPNext PDF generation - structurally available, not yet exercised:**

- **PDF generator:** `wkhtmltopdf`, configured during Phase B-a per `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 9 line 385 (*"Print Settings -> PDF generator: wkhtmltopdf (sandbox default; never an external SaaS)"*). This is the standard Frappe/ERPNext PDF generator and ships with the Docker image used in Phase B-a.
- **Sales Invoice -> PDF:** Frappe stock capability. The operator role (`operator-sandbox@corpflowai.test` with `System Manager` + `Accounts Manager` per Phase B-a § 8.1) has print permission by default and can render any of the existing `ACC-SINV-2026-0000{1,2}` invoices to PDF via the UI's *Print* button or via `bench` console.
- **Quotation doctype -> PDF:** also Frappe stock. ERPNext's `Quotation` doctype is the canonical pre-invoice / pro-forma equivalent; it produces a "Quotation" / "Pro-forma" style document that can be converted to a Sales Order or Sales Invoice when the buyer accepts.
- **Draft Sales Invoice -> PDF:** the operator can also raise a Sales Invoice in `Draft` (`docstatus=0`) and print that as a PDF "pro-forma" before submitting. This is a common Frappe pattern when an organisation does not separate Quotation from Pro-forma.

**Phase C did NOT exercise PDF generation:**

- The original `ERPNEXT_SANDBOX_PLAN_V1.md` § 3.1 step 4 explicitly listed *"Generate the PDF; verify currency, company address, payment terms wording"* as a planned check. Anton's Phase C narrowing (`ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 1) reduced Phase C to USD-launch-pilot arithmetic + GL + reconciliation + read-only role testing. **PDF rendering was not exercised in any of cycles 1-4.**
- The Phase C findings doc § 4 finding C-1 *Resolution status* notes that the accountant role's `print=0` flag was a deliberate choice to honour Anton's literal *"read/report/export only"* instruction - if PDF export is later wanted from the accountant role, that is a separate small docs+sandbox packet (flip `print=1` on Sales Invoice / Payment Entry / Journal Entry).
- The Quotation doctype was not exercised at all in Phase C - the deferred-items table in § 6 does not list it explicitly because the original Phase C scope was *"USD invoice flow, narrowed to launch-pilot specifics"* and Quotation -> Sales Invoice conversion was never part of cycle 1 or 2.

**Verdict (Q5):** **In principle yes - ERPNext sandbox can generate a pro-forma / quotation PDF using its stock Print Format + `wkhtmltopdf` pipeline. In practice, this has not been exercised in Phase C and the visual output has not been inspected.** A future small docs+sandbox packet (call it `ERPNext-PDF-Smoke-1`) could exercise the PDF rendering path on the existing `ACC-SINV-2026-00001` invoice and on a fresh Quotation in 30 minutes; that is below the bar for a Friday launch dependency and has been correctly deferred.

## 6. ERPNext sandbox PDF brand-usability vs manual PDF for Friday

**Why the sandbox PDF would NOT be brand-usable on Friday:**

| Issue | Sandbox state | Implication for the rendered PDF |
|---|---|---|
| Company name on the document | Sandbox `Company` doctype has `name="CorpFlowAI Sandbox"` (per Phase B-a § 8 wizard) | The PDF would render the seller as **"CorpFlowAI Sandbox"** instead of **"CorpFlowAI Ltd."** - wrong legal entity for an external document. |
| Letter Head / logo | **Not configured.** Phase B-a does not create a `Letter Head` doctype; Phase C does not configure one either. | The PDF renders with no logo / no company header - just plain text. |
| Company address | Sandbox `Company` has `country=Mauritius` and `default_currency=MUR` only; no street / city / postal-code fields populated (per `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 7 wizard bypass at lines 296-340). | The PDF renders without a registered address - any Mauritius accountant or buyer-side bookkeeper would mark this as an incomplete document. |
| Tax ID / BRN | **Not populated** in the sandbox `Company` doctype. | The PDF renders without a Mauritius BRN - again, looks unprofessional and may be rejected by some Mauritius buyer-side accounts payable processes. |
| Print Format | Stock ERPNext default Print Format is in use - generic, not brand-doctrine-aligned, no CorpFlowAI typography or wordmark. | The PDF would not match the visual standard set by `BRAND_AND_CONVERSION_DOCTRINE.md` or `CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md`. |
| Invoice numbering | Default ERPNext naming series (`ACC-SINV-2026-NNNNN`) - sandbox-style, includes the test-run year prefix; not the Anton-recommended `CFLR-2026-NN` format from `AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md` § 6.2. | The visible document number on the PDF would feel like internal accounting test data, not a polished pro-forma. |
| Network exposure | Sandbox is loopback-only (`127.0.0.1:8080`). Anton would need an SSH tunnel from his laptop to the host, log into the ERPNext UI as the operator, navigate to the invoice / quotation, click Print, save the PDF locally. | Operationally slower than opening Word / Pages on the laptop and typing the buyer's details into a pre-filled template. |

**Why the manual PDF IS the safer choice for Friday:**

| Manual PDF property | Why it wins for Friday |
|---|---|
| Layout fully under operator control | No risk of wkhtmltopdf rendering surprises (font fallback, table breaks, header positioning). |
| Brand-aligned out of the box | Operator embeds the canonical CorpFlowAI wordmark + canonical teal `#2dd4bf` once (per `JE-2026-05-29-2` and `CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md`). |
| Correct legal entity from the start | "CorpFlowAI Ltd." (live company), not "CorpFlowAI Sandbox" (sandbox label). |
| Complete header on day one | Anton's BRN, registered address, and contact details fill the template once. |
| No SSH tunnel needed | Word / Pages / Google Doc are already on Anton's laptop. |
| Sequential document numbering set to Anton's preference | `CFLR-2026-NN` per `AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md` § 6.2 - operator increments manually. |
| Trivially reversible if the wording is wrong | Edit the file, re-export, re-send - 60 seconds. |
| Consistent with the live-page promise | The page already says *"USD invoice with the agreed payment route, after intake review"* - a manually-issued PDF matches the buyer's expectation set by the page copy. |

**Verdict (Q6):** **The manual PDF is materially safer for Friday than the ERPNext sandbox PDF.** The sandbox PDF would render with the wrong legal entity name, no logo, no address, no BRN, generic Print Format, and an internal-looking invoice-number format. **None of these are bugs in ERPNext** - they are unfilled / unconfigured fields and unstyled stock templates that have not been worked on because Phase D production go-live is not authorised. Filling them all (Letter Head + Company doctype + Print Format + production naming series) is exactly the work Phase D + the future production-setup packet are designed for. **For Friday, the manual PDF gets a brand-aligned, complete, sequenced pro-forma to a Mauritius buyer in less time and with less risk than the sandbox path.**

## 7. Required fields on the Friday pro-forma invoice

Consolidated from `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* + `JE-2026-05-28-1` single-offer rule + `JE-2026-05-28-3` trust-band + `JE-2026-06-01-4` payment posture + `AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md` § 6.2 + Mauritius local pro-forma practice. **Numbered for the operator template.**

**Seller (CorpFlowAI Ltd.) - filled once in template:**

1. **Document title** - **"Pro-forma invoice"** (preferred over *"Quote"* for Mauritius buyers).
2. **Wordmark / logo** - canonical CorpFlowAI wordmark (`JE-2026-05-29-2` § brand identity), top-left of page.
3. **Legal company name** - **CorpFlowAI Ltd.** (Mauritius-registered).
4. **Mauritius Business Registration Number (BRN)** - operator-side; not in repo.
5. **Registered address** - operator-side; full Mauritius address.
6. **Contact email** - **support@corpflowai.com**.
7. **Contact phone** - operator-side.

**Document identity - filled per pro-forma:**

8. **Document number** - **`CFLR-YYYY-NN`** sequential (e.g. `CFLR-2026-01`).
9. **Issue date** - ISO `YYYY-MM-DD`.
10. **Valid until** - issue date + 14 days.

**Buyer block - copied from `/admin/lead-rescue/[id]` Card 1:**

11. **Buyer business name** - from Card 1 *Business name*.
12. **Buyer contact name** - from Card 1 *Contact name*.
13. **Buyer email** - from Card 1 *Email*.
14. **Buyer phone** - from Card 1 *Phone / WhatsApp* (optional on PDF).
15. **Buyer business address** - from Card 3 *Notes* (collected during the qualification call).
16. **Buyer BRN** - optional; copied from Card 3 *Notes* if the buyer provides it.

**Line item - hard-set:**

17. **Description** - verbatim: **AI Lead Rescue Setup (USD 150 launch pilot)**.
18. **Quantity** - `1`.
19. **Unit price** - **USD 150.00**.
20. **Subtotal** - **USD 150.00**.

**Totals - hard-set:**

21. **Sub-total / pre-VAT** - **USD 150.00**.
22. **VAT note** - footer line: **"VAT: not yet applicable - to confirm with accountant"** (per launch-readiness § 6.2; do **not** charge VAT on Friday until the VAT decision per `JE-2026-05-29-1` § 10.1 is recorded).
23. **Total due** - **USD 150.00**.

**Scope statement - template literal (see § 3 above for the recommended paragraph).**

**Trust block (verbatim per doctrine):**

24. **No-guarantee line** - **"We do not guarantee new revenue. We help make sure the enquiries you already get are captured, visible, and followed up."**
25. **Setup-after-payment line** - **"The 48-hour setup begins once payment is confirmed in the CorpFlowAI Ltd. SBM Bank Mauritius account."**

**Payment instructions (per `JE-2026-06-01-4` § 3 priority 4 + § 4.5 forbidden phrases):**

26. **Method** - **SBM Bank Mauritius wire**.
27. **Bank wire details** - account name, account number, SWIFT/BIC, branch (operator-side; populated once in template; **not in repo**).
28. **Reference to use on wire** - the document number from field 8 (e.g. `CFLR-2026-01`).

**Footer (must NOT contain forbidden phrases per `JE-2026-06-01-4` § 4.5):**

29. **Document type clarification** - **"This document is a pro-forma invoice (not a tax invoice)."**
30. **Forbidden phrases - audit before sending:** **"Pay now"**, **"PayPal accepted"**, **"Wise accepted"**, **"instant checkout"**, **"international bank transfer"** as primary CTA - **NONE of these may appear anywhere on the PDF**.

**Verdict (Q7):** **30 fields, of which 7 are filled once in the template (seller header), 5 are filled per pro-forma (document identity), 6 are copied from `/admin/lead-rescue/[id]` (buyer block), 4 are hard-set (line item), 3 are hard-set (totals), 2 are template literals (trust block), and 3 are template literals (payment instructions).** The full content fits on a single A4 page with whitespace. The only data dependency is: the operator must collect the buyer's business address (and optionally BRN) during the qualification call before issuing the PDF - that is already part of the canonical operator runbook qualification step.

## 8. ERPNext production invoice readiness - blocker list

Consolidated from `ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 7 + `ERPNEXT_SANDBOX_PLAN_V1.md` § 10 + `JE-2026-06-01-3` + `JE-2026-06-01-5` + `JE-2026-05-29-1` + `JE-2026-06-01-4`. **None reachable by Friday.**

| # | Blocker | Status | Owner | Trigger to resolve |
|---|---|---|---|---|
| 1 | Multi-user role line (§ 10.1) | **RESOLVED** 2026-06-01 via Option B custom `Accountant Read-Only` Role with 9 Custom DocPerm rows; all 11 cycle-4 tests GREEN | Recorded in `JE-2026-06-01-5` | n/a (closed) |
| 2 | Mauritius-licensed accountant CoA review in writing (§ 10.1) | **PENDING** | Anton -> accountant | Engage a Mauritius-licensed accountant; provide them with `ERPNEXT_SANDBOX_PLAN_V1.md` § 2.1 draft CoA + Phase C GL trail; receive written sign-off; record as a `JE-2026-MM-DD-N` row |
| 3 | Real (redacted) MU bank CSV import test (§ 10.1) | **PENDING** | Anton -> Cursor (separate small packet) | Anton exports a redacted SBM bank statement CSV, hands to Cursor; Cursor imports via the ERPNext Bank Reconciliation Tool against the existing sandbox Phase C GL; reconcile to MUR 0.00 delta |
| 4 | VAT decision recorded (§ 10.1) | **PENDING** | Anton -> accountant | Either (a) accountant confirms below-threshold-and-not-yet-required posture (preferred for Friday-launch volume) and Cursor records as a `JE-2026-MM-DD-N` row; or (b) accountant recommends VAT registration -> trigger separate VAT-activation packet |
| 5 | Wise-manual flow tested (§ 10.1) | **MAY BE WAIVED** per `JE-2026-06-01-4` (Wise removed from v1 plan) | Anton | Anton's call: explicit waiver row in `JOURNAL.md` referring back to `JE-2026-06-01-4` § 3 (Wise removed) |
| 6 | Backup + restore (§ 10.1) | **DONE** in Phase B-a (PR #275 § 12 GREEN parity verified 2026-06-01) | n/a | n/a (closed) |
| 7 | Phase D operator approval (`JE-2026-05-29-1`) | **PENDING (NOT AUTHORISED)** | Anton | Anton issues a fresh `JOURNAL.md` row authorising Phase D after blockers 2 / 3 / 4 / 5 are addressed |
| 8 | Production install (separate VM or graduate sandbox; non-loopback DNS / TLS / scheduler enabled / live SMTP) | **NOT STARTED** | Cursor under Phase D approval | Phase D approval recorded |
| 9 | Letter Head doctype with company logo + brand-doctrine-aligned Print Format | **NOT STARTED** in sandbox | Cursor under Phase D approval | Phase D approval recorded |
| 10 | Company doctype filled with: legal name `CorpFlowAI Ltd.`, registered address, BRN, default contact | **NOT FILLED** in sandbox | Cursor under Phase D approval (operator provides BRN + address) | Phase D approval recorded |
| 11 | Production invoice numbering format set | **NOT SET** in sandbox | Cursor under Phase D approval (operator decides format - launch-readiness § 6.2 suggests `CFLR-2026-NN`) | Phase D approval recorded |
| 12 | Custom Mode of Payment "PayPal" / "Wise" / "SBM" if/when used | **NOT ADDED** (Phase C cycle 2 noted this) | Cursor under Phase D approval | Phase D approval recorded; Wise may be skipped per blocker 5 |
| 13 | First real client invoice raised end-to-end on the production install | **NOT YET POSSIBLE** | Anton (operator) | Blockers 7-12 closed; first paying pilot completes on the manual PDF path; second pilot may use ERPNext production once accountant approves |

**Critical-path summary for ERPNext production invoicing:**

```
Friday (today + 3 days)
  Manual PDF path - blockers 1-13 do NOT need to be closed.
  ERPNext sandbox stays untouched.

Week 2-4 (after first paying pilot completes on manual PDF)
  Anton + accountant: close blockers 2 + 4 (CoA review + VAT decision).
  Anton: redacted SBM CSV -> Cursor: blocker 3 (real bank reconciliation test).
  Anton: write Phase D authorisation in JOURNAL.md (blocker 7).

Week 4-6 (Phase D production install)
  Cursor under Phase D approval: blockers 8-12 (production install,
  Letter Head, Company doctype, Print Format, naming series, Modes of Payment).
  Cursor: first redacted dry-run invoice in production.

Week 6+ (cutover)
  Anton: second paying pilot uses ERPNext production (blocker 13 closes).
```

**Verdict (Q8):** **One blocker (multi-user line) is RESOLVED, one (backup + restore) is DONE, one (Wise) may be waived, and the remaining nine blockers all need work that is correctly outside Friday scope.** The Phase D recommendation per `ERPNEXT_SANDBOX_PLAN_V1.md` § 10 is the natural assembly point for blockers 2-13 once the first paying pilot validates the offer on the manual-PDF path. Pursuing ERPNext production invoicing in parallel with the Friday launch is **not** the right sequencing - the manual PDF path is faster, lower-risk, and consistent with the live-page promise.

## 9. Friday-safe runtime - end-to-end operator workflow

Step-by-step, executable. **No code, no env, no DB schema, no DNS, no payment automation, no ERPNext production change is required to run any of the 12 steps below.** Every dependency listed below already exists in production today.

### 9.1 Pre-launch (before Friday outreach starts)

```
Step 1.  Operator template - one-time:
         Anton opens Word / Pages / Google Doc.
         Builds the Friday pro-forma template using the 30 fields
         from § 7 above. Embeds wordmark, fills seller header
         (CorpFlowAI Ltd. legal name, BRN, registered address,
         email, phone), embeds SBM bank wire details, embeds
         scope statement, embeds trust block, embeds VAT footer
         note, sets sequential `CFLR-2026-NN` placeholder.

         Saves the template as a local file on Anton's laptop
         (NOT committed to the repo - it contains live banking
         details). Recommended path:
         `~/CorpFlowAI/templates/CFLR-pro-forma-template.docx`.

Step 2.  Audit pass:
         Anton reads the template once and confirms:
         - 5 forbidden phrases not present (per JE-2026-06-01-4 § 4.5).
         - "USD 150" written as digits, not "one hundred and fifty".
         - "Pro-forma invoice" in the title (not "Tax invoice").
         - VAT footer note present.
         - No mention of "AI automation" or any unsupported revenue claim.
```

### 9.2 During the Friday launch (per prospect)

```
Step 3.  Outreach send (per LR-Mauritius-Outreach-Copy-V1):
         Anton sends one of the warm-network outreach copy variants
         (LinkedIn DM / WhatsApp / email) per the V1 outreach copy doc.

Step 4.  Prospect submits intake:
         Buyer fills the form on https://corpflowai.com/lead-rescue
         (or https://aileadrescue.corpflowai.com).
         Server writes Lead row, emits two automation events.
         Operator alert lands in Telegram / email (per the n8n forward).

Step 5.  Operator reviews intake (within 2 business hours):
         Anton opens the alert -> clicks the admin_detail_url ->
         /admin/lead-rescue/[id]. Reads Card 1 (Prospect).

Step 6.  Operator qualifies (status -> QUALIFYING):
         Anton picks up the phone / replies on WhatsApp.
         Confirms business address, optionally BRN, the intended
         lead source, and the SLA expectation. Updates Card 3
         (Status & operations): status=QUALIFYING, owner=anton,
         next_action="Send pro-forma USD 150", last_contacted=now.

Step 7.  Operator issues the pro-forma PDF:
         Anton opens the template (Step 1).
         Copies these fields verbatim from Card 1 of /admin/lead-rescue/[id]:
            - business_name      -> Buyer block
            - contact_name       -> Buyer block
            - email              -> Buyer block (also delivery email)
            - phone              -> Buyer block (optional)
         Fills these from the qualification call (Step 6):
            - buyer business address -> Buyer block
            - buyer BRN (optional)   -> Buyer block
         Increments the document number (e.g. CFLR-2026-01).
         Sets issue date = today; valid until = today + 14 days.
         Saves as PDF (e.g. `CFLR-2026-01-Acme-Properties.pdf`).

Step 8.  Operator updates the admin record:
         On /admin/lead-rescue/[id]:
         Card 2 (Commercial):
            - setup_price         = 150
            - currency            = USD
            - payment_route       = "SBM Bank Mauritius wire"
            - payment_status      = "quoted"
            - invoice_reference   = "CFLR-2026-01"
            - payment_notes       = "Pro-forma sent <ISO date>; awaiting wire."
         Card 3 (Status & operations):
            - status              = QUOTE_SENT
            - next_action         = "Confirm wire receipt; start setup."
            - last_contacted      = now

Step 9.  Operator sends the PDF:
         Anton attaches the PDF to a plain email or WhatsApp message:
         Subject (email): "CorpFlowAI Ltd. - Pro-forma CFLR-2026-01 -
         AI Lead Rescue Setup (USD 150 launch pilot)"
         Body: "Hi {first name}, here is the pro-forma for the AI Lead
         Rescue Setup launch pilot. Bank wire details and reference are
         on the document. Setup begins as soon as payment is confirmed
         in the CorpFlowAI Ltd. SBM Bank Mauritius account. Happy to
         answer any questions. - Anton, CorpFlowAI Ltd."
```

### 9.3 After buyer pays (per prospect)

```
Step 10. Operator confirms wire receipt:
         Anton checks the SBM internet banking dashboard -> sees the
         inbound wire with the CFLR-2026-01 reference.

Step 11. Operator marks paid on /admin/lead-rescue/[id]:
         Card 2 (Commercial):
            - payment_status     = "paid"
            - payment_notes      = "Wire received <ISO datetime>;
                                    SBM ref <SBM transaction id>."
         Card 3 (Status & operations):
            - status             = PAID_SETUP    (this unlocks the
                                                  setup-checklist card)
            - next_action        = "Start 48-hour setup clock."
            - last_contacted     = now

Step 12. Operator runs the 13-item setup checklist:
         Card 4 (Setup checklist) appears once status = PAID_SETUP.
         Anton works through the 13 canonical items per
         docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md § 13-item
         checklist. Each item saves independently; status progresses
         PAID_SETUP -> SETUP_IN_PROGRESS -> LIVE_PILOT as items
         complete.
```

**Verdict (§ 9):** **The 12-step runtime is fully executable on Friday using only the live `/lead-rescue` page, the live `/admin/lead-rescue` console, the live n8n forward, and a manual PDF template on Anton's laptop. No new code, no ERPNext, no payment provider integration, no DNS, no env var, no secret, no payment automation, and no production change is required.**

## 10. Honest limits of this audit

- **Inspection only.** No code was changed; no ERPNext setting was changed; no env, secret, DNS, DB, or production value was touched. The launch-readiness inventory of 2026-06-01 remains the most recent live verification of the `/lead-rescue` page and the walkthrough video; nothing in this audit re-probes those URLs.
- **No live PDF was rendered from the ERPNext sandbox** during this audit. The findings on PDF brand-usability (§ 6) are derived from documented sandbox configuration (no Letter Head, no address, no BRN, default Print Format, sandbox company name) - not from a freshly-rendered PDF inspected visually. Rendering one would be a separate small docs+sandbox packet (see § 5 closing paragraph).
- **The manual PDF template is operator-side and not in this repo.** Step 1 of § 9 instructs Anton to build the template on his laptop; the live BRN, registered address, and SBM bank wire details belong on the operator's laptop and **must not** be committed to the repo. This audit does not include a redacted starter template; producing one is the optional `LR-Manual-Invoice-Template-1` packet listed in `AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md` § 9.
- **No measured intake -> paid funnel data exists yet.** This audit assumes the warm-network funnel will work; v1.1 of both this audit and the outreach copy doc should refine after 10-20 outreach sends and 3-5 intakes.
- **Single document type (pro-forma).** This audit does not specify the workflow for issuing a tax invoice once VAT is registered (separate Phase D + VAT-activation packet) or for issuing a credit note (deferred to Phase C² per `ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 6).
- **No buyer-side legal opinion.** The recommendation to use *"Pro-forma invoice"* as the document title is operator-and-doctrine-aligned, not a legal opinion. A Mauritius-licensed accountant should confirm pro-forma vs quote vs tax-invoice naming when the CoA review (blocker 2) happens.

## 11. Recommended next packets (proposal-only, not authorised)

Each of the below is a **future** docs-only or small-sandbox proposal that requires Anton's separate DECISION before any work begins.

| Packet | Scope | Trigger |
|---|---|---|
| `LR-Manual-Invoice-Template-1` | Draft a redacted CorpFlowAI-branded PDF pro-forma invoice template starter (Word + PDF export) - operator-side, kept off-repo. The starter would have placeholder fields for BRN, address, bank wire details so Anton can fill them on his laptop without typing the whole layout from scratch. Docs-only summary committed to the repo (instructions only). | Anton requests; Thursday before Friday launch. |
| `ERPNext-PDF-Smoke-1` | One-shot small docs+sandbox packet: render one Sales Invoice PDF and one Quotation PDF from the existing ERPNext sandbox, capture screenshots, document the visual deltas vs the manual PDF for future Phase D context. No PDF goes to a buyer; no production change. | After first paying pilot completes on the manual PDF path. |
| `ERPNext-Phase-D-Recommendation` | Compile go/no-go recommendation per `ERPNEXT_SANDBOX_PLAN_V1.md` § 10. Pulls together blockers 2 (CoA review prep), 3 (real MU bank CSV import test design), 4 (VAT decision draft), 5 (Wise waiver), and assembles a single "Phase D ready or not" recommendation row for `JOURNAL.md`. | After blockers 2 + 3 + 4 are addressed (operator-side), and Anton wants to authorise Phase D. |
| `ERPNext-Production-Setup-1` | Phase D execution packet: production install (separate VM or graduate sandbox; non-loopback DNS / TLS / scheduler enabled / live SMTP), Letter Head doctype, Company doctype filled with legal entity details, Print Format brand-aligned, naming series set to `CFLR-YYYY-NN`, Modes of Payment for SBM (and others as approved). | After `ERPNext-Phase-D-Recommendation` lands and Anton authorises. |
| `LR-First-Pilot-Permission-Line-1` | Add a "may we name you in a future case study?" permission line to the operator runbook + a permission-line template. Docs-only. Unlocks Rank 1-3 proof types in `PROOF_VALIDATION_ASSET_PLAN_LR_V1.md`. | After first pilot signs the USD 150 invoice. |
| `LR-Mauritius-Outreach-Copy-V1.1` | Measured-data refinement of the outreach copy after 10-20 sends per channel. Docs-only. | After enough outreach data exists. |

## 12. Hard limits honoured by this audit

Zero edits to `pages/lead-rescue.js` / `components/AiLeadRescueLanding.js` / `components/VisualAssetRenderer.js` / `lib/server/tenant-intake.js` / `pages/admin/lead-rescue/*` / `components/AiLeadRescueAdminDetail.js` / `lib/cmp/_lib/ai-lead-rescue-operator.js` / `prisma/schema.prisma` / any runtime file. Zero pricing change. Zero payment automation / API key / KYC / payment gateway named on a live surface. Zero ERPNext production setting modified. Zero `tenant_id` / DNS / DB / env vars / secrets / Telegram / Vercel config / GitHub settings / Search Console / Plausible / analytics / payment settings touched. Zero Phase D / Phase C^2 / production-setup work started. **Pure docs / inspection artefact.**

## 13. Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only

**COMPLETE** at PR merge - no customer-visible URL to probe by design (the audit is operator-internal documentation; the Friday operator workflow it describes will be exercised live by Anton starting Friday and recorded in a follow-up STATUS report on Bridge #249 once the first intake / pro-forma / wire / setup loop completes).

## 14. References

- `pages/lead-rescue.js` - live `/lead-rescue` page entry point.
- `components/AiLeadRescueLanding.js` - intake form fields (lines 432-437) + submit handler (lines 156-185).
- `lib/server/tenant-intake.js` - intake API handler.
- `prisma/schema.prisma` - `Lead` model (lines 11-30).
- `pages/admin/lead-rescue/[id].js` - admin detail page entry.
- `components/AiLeadRescueAdminDetail.js` - admin detail UI (Prospect / Commercial / Status / Setup checklist cards).
- `lib/cmp/_lib/ai-lead-rescue-operator.js` - canonical 13-status pipeline + 13-item setup checklist + operator-state hydration.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` - canonical operator runbook.
- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 2.3 - sandbox item state.
- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 4 finding C-1 - read-only role resolution.
- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 7 - Phase D readiness blockers.
- `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md` § 3.1 - PDF generation step (not yet exercised).
- `docs/finance/ERPNEXT_SANDBOX_PLAN_V1.md` § 10 - go-live preconditions.
- `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 9 - PDF generator (`wkhtmltopdf`).
- `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md` § 10 - SSH tunnel access pattern.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* - canonical item label, no-guarantee line, single-offer rule.
- `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md` § 6 - prior inventory of the same readiness territory at the inventory level (`JE-2026-06-01-6`).
- `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` - the outreach copy that drives intakes into the funnel this audit traces (`JE-2026-06-02-2`, PR #282).
- `docs/finance/PAYMENT_READINESS_2026_06_01.md` (`JE-2026-06-01-4`) - SBM primary; PayPal HOLD; Wise removed; § 4.5 forbidden phrases.
- `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` § 3 - pre-proof posture.
- `docs/decisions/JOURNAL.md` rows: `JE-2026-05-28-1` (single-offer rule), `JE-2026-05-28-3` (trust band), `JE-2026-05-29-1` (Phase D gate), `JE-2026-05-29-2` (brand identity), `JE-2026-06-01-1` (server capacity), `JE-2026-06-01-3` (Phase C executed), `JE-2026-06-01-4` (payment route priority), `JE-2026-06-01-5` (Option B C-1 final remediation), `JE-2026-06-01-6` (launch-readiness inventory), `JE-2026-06-02-1` (LR-Pay-1 transitional payment wording proposal, merged via PR #281), `JE-2026-06-02-2` (outreach copy v1, merged via PR #282), `JE-2026-06-02-3` (PAY-SBM-1 SBM e-Commerce application readiness, merged via PR #283).

## 15. Relationship to recently-merged adjacent packets

This audit was opened just after two adjacent docs-only packets merged - both merged while this audit was being drafted, so the references below were added during the final pre-PR pass:

- **LR-Pay-1** (`JE-2026-06-02-1`, PR #281) - transitional payment wording proposal for the live `/lead-rescue` page. **Proposal only**; live page wording is unchanged. When the LR-Pay-1 minimum-viable adoption set lands (E1-alt + E3 + E4 + E10 per the proposal § 4), the live page will say *"Apply for the USD 150 launch pilot. If your intake is approved, we will send a secure payment link or invoice. Setup begins once payment is confirmed."* This Friday-safe runtime is **provider-agnostic** by construction - whether the payment route is the SBM Bank Mauritius wire described above, an SBM-issued payment link once the SBM application is approved (see PAY-SBM-1 below), or a separate provider, the workflow described in § 9 of this audit does not change.

- **PAY-SBM-1** (`JE-2026-06-02-3`, PR #283) - SBM e-Commerce application readiness. Docs-only; **the SBM application has not been submitted, no NDA signed, no MCIB signed, no payment gateway configured.** PAY-SBM-1 § 2 catalogues 9 website-compliance gaps (G1-G9: public support email, registered business address + BRN, explicit transaction currency, service-fulfilment policy, payment-card transmission statement, customer support / complaints page, receipt / invoice policy, export / geographic restrictions, card-scheme logos post-approval). Three of those gaps overlap directly with what the manual Friday pro-forma must contain (G2 registered business address + BRN; G7 receipt / invoice policy; G1 public support email = `support@corpflowai.com` per § 5 of PAY-SBM-1). The Friday manual PDF described in § 9 of this audit naturally **closes** G2 and G7 for the buyer who receives it, even though the live page still has those gaps for visitors who arrive later. The PAY-SBM-1 PR 2 (page-compliance-copy) will close those gaps on the live page itself; this audit does **not** open or pre-empt that PR 2 work - it only documents what an operator-issued PDF needs.

The right reading order for an operator preparing for Friday:

1. `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md` - what is ready / what is missing (inventory).
2. `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` - what to send (warm-network outreach copy).
3. **This audit** - what to do when an intake comes in (the 12-step Friday-safe runtime).
4. `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` - canonical operator handbook the runtime above plugs into.
5. `docs/finance/PAY_SBM_1_SBM_ECOMMERCE_READINESS.md` - what to prepare in parallel for SBM application (not on the Friday critical path).
6. `docs/marketing/LR_PAY_1_TRANSITIONAL_WORDING_PROPOSAL.md` - what the live page wording will say once adoption lands (separate gated packet; not on the Friday critical path).
