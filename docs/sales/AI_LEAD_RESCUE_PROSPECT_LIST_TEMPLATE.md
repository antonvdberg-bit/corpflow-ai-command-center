# AI Lead Rescue — Prospect List Template

**Audience:** the operator building the warm-network outreach prospect list for first paying pilots.

**Status:** Operator-side template. Docs-only — no runtime, no CRM, no env vars.

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_PROSPECT_LIST_TEMPLATE_V1 -->`

<!-- AI_LEAD_RESCUE_PROSPECT_LIST_TEMPLATE_V1 -->

## What this doc is for

A **single template** the operator copies into a private Google Sheet (or any spreadsheet) to build the **warm-network prospect list** for AI Lead Rescue first paid pilots. The list lives **off the runtime** — it is not in any CRM, not in any database, not in the public site. It is a private operator working document.

The shape of the table below is the contract. The runtime activity log (`/admin/lead-rescue/[id]`) only fires once a prospect submits the public intake form — until then, all tracking lives in this sheet.

## 1. Table columns (paste this row 1 into your sheet)

| Col | Field | Type | Notes |
|---|---|---|---|
| A | **Company** | text | Legal or trading name. |
| B | **Region** | enum | `Mauritius`, `Réunion`, `Madagascar`, `Seychelles`, `Other-Africa`, `International`. |
| C | **Niche** | enum | `property`, `contractors`, `clinics`, `professional-services`, `other`. |
| D | **Website** | URL | Their existing website (or *"none"*). |
| E | **Facebook** | URL | Page URL (or *"none"*). |
| F | **WhatsApp** | text | Public WhatsApp Business number if visible (or *"none"*). |
| G | **Email** | text | Public business email (or *"none"*). |
| H | **Contact person** | text | First + last name of decision-maker if known. *"unknown"* is fine. |
| I | **Lead source visible** | enum | What enquiry channel they advertise: `website-form`, `facebook`, `whatsapp`, `phone`, `email`, `walk-in`, `mixed`, `unclear`. |
| J | **Observed weakness** | text | One line describing what's leaky. Examples: *"website form has no autoresponder"*, *"no WhatsApp business hours posted"*, *"Facebook page DMs unanswered for 3 days"*. |
| K | **High-value lead type** | text | What their best enquiry looks like. Examples: *"buyer for villa USD 500k+"*, *"corporate office fit-out >MUR 1M"*, *"new patient orthodontic treatment"*. |
| L | **Fit score 1–5** | int | See § 3 below. |
| M | **Outreach angle** | text | One-line opener hook tailored to them. Examples: *"Saw 3 listings on Property24 with no autoresponder visible"*, *"Two-week-old Facebook DM in their public inbox"*. |
| N | **First message sent date** | date (ISO) | Day operator first messaged them. Blank until sent. |
| O | **Channel used (first)** | enum | `whatsapp`, `email`, `linkedin`, `facebook`, `warm-intro`, `none-yet`. |
| P | **Reply status** | enum | `none-yet`, `no-reply`, `replied-interested`, `replied-not-now`, `replied-bad-fit`, `intake-submitted`, `paid-pilot`, `lost`. |
| Q | **Next action** | text | Concrete next step. Examples: *"Follow-up #1 on 2026-06-12"*, *"Send page after intake review"*, *"Wait — re-engage in 30 days"*. |
| R | **Next action date** | date (ISO) | Day to act. |
| S | **Notes** | text | Operator-internal context. Examples: *"Met at Mauritius Chamber event 2026-05"*, *"Introducer: Asraf"*. **No PII beyond first name.** |
| T | **Activity log reference** | text | `/admin/lead-rescue/[id]` link **once intake submitted**. Blank until then. Then *"see cockpit"* once activity log is firing. |

**Sheet hygiene:**

- One row per prospect. Do not split a prospect across rows.
- Sort by `Fit score` descending, then by `Region` (Mauritius first), then by `Niche`.
- Freeze row 1.
- Column widths: keep the sheet readable on a 1440px monitor without horizontal scroll.

## 2. What does **NOT** go in this sheet

This is a **prospect** list, not a CRM. Per `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` and the brand doctrine, the operator must **not** store any of the following in this sheet:

- ❌ Card numbers, CVV, PINs, OTPs, banking detail.
- ❌ Government ID numbers (national ID, passport, NIC, NID).
- ❌ Health information about the prospect or anyone they've mentioned.
- ❌ Salary / payroll information about the prospect's staff.
- ❌ Full message histories or screenshots of inbound DMs (operator paraphrases instead).
- ❌ Bulk-scraped data (this is a **warm-network** list, hand-built; see § 4).
- ❌ Lists of the prospect's own clients / customers / patients.

If the operator finds any of the above accidentally pasted in, **delete and rotate the sheet** (re-share via a new URL).

## 3. Fit score 1–5 (how to score)

Score each prospect at the time of sheet entry. Re-score if material new information arrives (e.g. they ignored 2 follow-ups → drop fit score by 1).

| Score | Meaning |
|---|---|
| **5** | Strong fit on **all** of: real business with real enquiries, named pain (operator can articulate the leak in one sentence), owner-operator authority on USD 150 spend, warm-network proximity (≤2 hops). Top 10% of list. |
| **4** | Strong fit on most of the above, missing one (e.g. owner-operator clear, pain visible, but no warm-network bridge — pure cold outreach). |
| **3** | Plausible fit. Real business, plausible enquiries, but pain is inferred rather than named. Default tier for cold-but-relevant prospects. |
| **2** | Weak fit. Likely too small (no real enquiry volume), or too large (will demand custom scope and won't pay USD 150 pilot pricing seriously), or unclear authority. |
| **1** | Poor fit. Outside niche, no enquiry signal, no warm bridge. Should probably not be in the sheet at all. |

**Operator hygiene:** target a list where **≥60%** of rows are score **3 or higher**. If the list is mostly 1s and 2s, the operator is padding numbers — go back to warm network and rebuild.

**Outreach order:** message score 5s first (within the day), then 4s (within 2 days), then 3s (within the week). Do **not** message 1s and 2s for the launch pilots — they distort the conversion-rate data.

## 4. Where prospects come from (warm-network only, first paid pilots)

The first 75-prospect list (3 batches of 25 — see § 6) is built **by hand** from these sources, in priority order:

1. **Operator's existing relationships** — past clients, family, friends, professional contacts, business-club members.
2. **Warm introducers' contacts** — people who would write a *"meet my friend Anton"* intro on operator's behalf.
3. **Local business directories** with public contact details + visible enquiry channels (Mauritius Chamber of Commerce member directory, Property24 / Lemons listing operators, local business associations).
4. **Public Facebook / LinkedIn pages** of businesses operator has personally visited or interacted with.

**Forbidden** as sources for first paid pilots:

- ❌ Cold-scraped lists (anything bought from a list provider, anything scraped from LinkedIn at scale, anything from a cold-data vendor).
- ❌ Bulk-imported lists from a previous employer, agency, or tool.
- ❌ Public e-mail-finder tools that scrape against a domain ("X@company.com" enumeration).
- ❌ Any list where the operator cannot honestly write *"I'm reaching out because…"* with a real reason in row M.

The reason for warm-only at this phase is two-fold: (a) `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` and the *Above the Line* doctrine forbid spammy bulk outreach, and (b) the conversion data from cold lists is noise during the launch pilot phase — the operator is trying to learn what *converts* in the niche, and warm prospects expose pilot-fit signals faster.

## 5. Sheet permissions + storage

- **Owner:** operator's CorpFlowAI Google Workspace identity.
- **Access:** **operator only** (no buyer-side access — this is the prospecting list, not a deliverable).
- **Backup:** weekly export (Sheet → Download → CSV) saved locally to operator machine in an encrypted folder.
- **Retention:** prospect rows where `Reply status = lost` for >180 days move to an *Archive* tab. Do not delete history — the *Archive* tab informs the *"why this niche didn't work"* learning loop.

## 6. Targets — three batches of 25

The launch-pilot list is built in **three batches of 25**, in priority order. The operator does **not** start batch 2 until batch 1 has been fully outreach-attempted (first message + at least one follow-up where allowed).

### 6.1 Batch 1 — 25 Mauritius property / real-estate operators

**Why first:** named primary niche (`docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 2). Highest density of warm-network proximity. Highest ratio of real-money enquiries to scope. Owner-operator decision authority is common (independent agencies, single-broker shops). Property24 + Lemons + Lexpress make pain visible without invasive research.

**Sources:**

- Mauritius-resident estate agencies (independent, not international franchises) operator has either visited or has a warm-network bridge to.
- Property24 / Lemons / Lexpress listing operators with multiple recent listings + visible enquiry channels (Facebook page, WhatsApp number, contact form).
- Real-estate-adjacent operators (property managers, holiday-let owners, short-term-rental operators) — only if owner-managed.

**Quality gate before batch 2:** at least **3 prospects** must have replied (any reply, including *"not now"*) before moving to batch 2. If <3 replies, the issue is the message (revise outreach script) or the list (re-curate), not the niche.

### 6.2 Batch 2 — 25 contractors / trades

**Why second:** named secondary niche. Operator-managed shops with visible website forms + Facebook pages. Pain (slow quote follow-up) is intuitive but harder to articulate at sale time. Conversion rates likely lower than property; useful as a comparison set.

**Sources:**

- Mauritius-based building contractors, electricians, plumbers, painters, landscaping firms (owner-operated, not large companies).
- Operators known to operator's warm network (someone who built/renovated for them).
- Public Facebook pages of trade businesses with recent activity.

**Quality gate before batch 3:** at least **3 replies** in batch 2.

### 6.3 Batch 3 — 25 clinics / admin practices

**Why third:** named secondary niche. Lower-volume, higher-sensitivity (health information adjacency). Run third because the operator's brand-doctrine discipline must already be sharp by this point — you cannot afford a *"AI will handle your patients"* framing slip at any stage of clinic outreach.

**Sources:**

- Independent dental, optometry, physiotherapy, dermatology clinics in Mauritius.
- Independent admin practices (small accounting, immigration, legal admin firms).
- **Exclude** any clinic where the buyer would be required to handle medical-record data — the pilot is **enquiry response**, not medical record management.

**Operator-side rule:** for clinics, every outbound message must explicitly say *"this is for new-enquiry response, not for patient records or medical data"* in the first 2 lines. See `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md` for the exact wording.

## 7. Cadence and outreach pacing

For the first paid pilots, the operator's **outreach cadence** is a **soft cap** to keep volume low and quality high:

- **≤10 first-touches per day** across all batches.
- **No second-batch outreach** until first-batch follow-ups are complete.
- **No more than 2 follow-ups** per prospect without a reply (cap at follow-up #2; mark `Reply status = no-reply` and move on; revisit in 30 days as a re-engagement).
- **No bulk-send tools.** Every outbound is hand-personalised in row M (*Outreach angle*).

This is intentionally slower than aggressive sales orgs run. Per `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *brand discipline*, **CorpFlowAI competes on quality of operator attention, not volume of outreach**. A 75-prospect list worked thoughtfully over 3–4 weeks beats a 750-prospect list spammed over a week.

## 8. Status field cheat sheet (column P)

| Reply status | Meaning | Operator next action default |
|---|---|---|
| `none-yet` | First message not sent yet. | Send first message; update column N + O. |
| `no-reply` | First message sent ≥48h ago, no reply. | Send follow-up #1 (see outreach scripts). Cap at 2 follow-ups. |
| `replied-interested` | They asked for more info. | Send `/lead-rescue` page link + offer 15-min call. |
| `replied-not-now` | They responded but said *"not now"*. | Set `Next action date = today + 60 days`. Re-engage then. |
| `replied-bad-fit` | They responded saying it's not for them, or operator confirms bad fit. | Mark `lost` after thanking them. Document why in column S. |
| `intake-submitted` | They filled the public intake form at `/lead-rescue`. | Move to operator cockpit. Update column T to `/admin/lead-rescue/[id]` link. |
| `paid-pilot` | Wire confirmed. Pilot in progress. | All further activity tracked in cockpit (column T). This row stays as historical record. |
| `lost` | Confirmed not happening. | Archive row to *Archive* tab after 30 days. |

## 9. Operator-side hygiene

For every row added to this sheet:

- [ ] Real warm-network connection (or directly relevant local-directory entry) — no cold-scraped data.
- [ ] Outreach angle (column M) is **specific** — *"saw their Facebook page"* is too vague; *"saw their Property24 listing for {neighbourhood}, {price}, posted {date}"* is right.
- [ ] No PII beyond first names + publicly-listed business contact details.
- [ ] Fit score scored honestly — pad-the-list temptation is the #1 failure mode here.
- [ ] If the prospect submits intake, the operator transfers tracking to `/admin/lead-rescue/[id]` and stops adding detail to this sheet (column T points the operator to the cockpit).

## Cross-references

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — single-offer rule, no spammy bulk outreach.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — managed-workflow framing, niche discipline.
- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — first-paid-pilots playbook (commercial side).
- `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md` — paste-ready outreach scripts (this PR).
- `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` — 15-minute qualification script (this PR).
- `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` — pricing guide (this PR).
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — cockpit + activity-log workflow.
- `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` — post-payment onboarding (this PR).
