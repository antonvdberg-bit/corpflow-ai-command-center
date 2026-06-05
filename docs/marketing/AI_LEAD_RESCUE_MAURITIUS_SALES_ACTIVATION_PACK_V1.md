# AI Lead Rescue — Mauritius sales activation pack v1

**Status:** Operator-ready sales playbook. **Docs / copy / operator workflow only.** No runtime change. No ERPNext change. No server / SSH commands. No Print Designer work. No invoices issued. No Sales Invoice submission. No GL posting. No VAT or tax setup. No bank-account or payment-gateway configuration. No DNS / TLS / SMTP changes. No public exposure changes. No secrets. **No claim in this pack contradicts the live `/lead-rescue` page** — every customer-visible commitment in this pack already appears on `https://corpflowai.com/lead-rescue` (verified by `JE-2026-06-01-6` § 1.1).

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_MAURITIUS_SALES_ACTIVATION_PACK_V1 -->`

<!-- AI_LEAD_RESCUE_MAURITIUS_SALES_ACTIVATION_PACK_V1 -->

**Author:** Assistant (Cursor) on Anton's Windows laptop (L1), on behalf of Anton.
**Date (UTC):** 2026-06-05.
**Authorisation:** Anton's chat DECISION on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (2026-06-05 *"AUTHORISE — AI-Lead-Rescue-Mauritius-Sales-Activation-Pack-1"*).
**Linked JOURNAL row:** `JE-2026-06-05-6` (the next available `JE-2026-06-05-N` slot on `origin/main`; locally-reserved `JE-2026-06-05-4` / `JE-2026-06-05-5` are Anton's parallel-session work on the Print Designer install / editor-fix workstream that will land via their own PRs).
**Linked chat history:** `artifacts/chat_history.md` § *2026-06-05 — `AI-Lead-Rescue-Mauritius-Sales-Activation-Pack-1`*.

**Purpose:** Give Anton the **practical sales-activation pack** needed to start selling AI Lead Rescue in Mauritius **today**, while ERPNext Print Designer remains in progress and the manual Word/Pages pro-forma (`docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md`, `JE-2026-06-02-7`) remains the canonical payment-document fallback for the first paying pilots.

**Relationship to existing docs:** this pack is the *operator playbook* that wires the existing assets into a daily rhythm. It does **not** re-invent copy that already exists; it references it.

- **Copy library:** `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` (`JE-2026-06-02-2`) — § 1–§ 7 are the canonical channel copy. § 5 of this pack adds **short, paste-safe** scripts for the specific situations the outreach copy doc deliberately keeps blank (one-line WhatsApp opener, one-line reply patterns, single-objection one-liners).
- **Operator runbook:** `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — the existing intake-to-Telegram-to-setup pipeline (Anton already uses this; not re-described here).
- **Pre-payment document:** `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`) — the manual Word/Pages template; remains canonical until `CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (`JE-2026-06-05-1`) is built in Print Designer per `ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` (`JE-2026-06-05-2`) and that build clears AC-1..AC-11.
- **Live posture (do not contradict):** `https://corpflowai.com/lead-rescue` per `JE-2026-06-01-6` § 1.1 + § 1.2 (USD 150 launch pilot, 48-hour setup, no card on this page, invoiced after intake review, no revenue guarantee).
- **Doctrine:** `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* (single offer rule; forbidden phrases; payment-route operator decision after intake).

---

## § 0 — Hard limits honoured by THIS PR

- Zero runtime / scripts / env / DNS / mail-routing / payment-settings / GitHub-workflow-files / Vercel-project-settings / Postgres / Neon / Prisma-schema changes.
- Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` / `public/` / `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` / `package*.json` / `tsconfig*`.
- Zero ERPNext mutation on `corpflow-exec-01-u69678` (`corpflowai-production.localhost` Docker project `corpflowai-production`; `host_name = http://frontend:8080` from `JE-2026-06-04-5` unchanged); zero ERPNext sandbox mutation (`corpflowai-sandbox.localhost` Docker project `corpflowai-sandbox`).
- Zero Print Designer install / template build (those live under `JE-2026-06-05-2` + `JE-2026-06-05-3` + their future authorisation chains).
- Zero invoices issued by THIS PR; zero Sales Invoice submission; zero GL posting; zero VAT activation; zero `Tax invoice` / `VAT invoice` wording.
- Zero real bank / SWIFT / BIC / IBAN / routing / sort-code / branch-code / card number / payment-gateway API key / OAuth token added to repo. The agreed payment route (currently a SBM Bank Mauritius wire per `JE-2026-06-01-4`) is **operator-decided on the invoice** and is **not** named on the live page or in any copy block in this pack.
- Zero public-exposure changes. No new public URL, no new email domain, no new published article.
- Zero pricing / offer / page-copy changes on customer-facing surfaces.
- Zero host commands executed from this L1 Windows laptop session — HOST_MISMATCH guard from `JE-2026-06-04-1` not triggered.

---

## § 1 — What Anton can sell today (single-offer rule, unchanged)

**Offer name:** `AI Lead Rescue Setup` (canonical Item label per `BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* + `JE-2026-05-28-1`).

| Attribute | Value | Source of truth |
|---|---|---|
| **Price** | **USD 150** (launch pilot) | Live page hero badge: `USD 150 launch pilot · 48-hour setup · no card on this page`. Operator-side: ERPNext Item `LR-SETUP-USD-150` per recipe v1.1 § 11. |
| **Currency on the public side** | **USD** | Live page: *"All transactions for the AI Lead Rescue launch pilot are processed in USD."* Operator-side MUR / EUR convenience invoicing is allowed per outreach-copy § 6.9 but **never** appears in customer-visible copy. |
| **Setup window** | **48 hours after payment confirmation**, normally completed within 5 business days where additional clarification / access / scope confirmation is needed | Live page: *"48-hour setup"*; manual pro-forma W3 (`JE-2026-06-02-7` § 1); live `pages/terms.js` § Service fulfilment. |
| **Card on page?** | **No.** No card / IBAN / SWIFT / routing / bank-detail field is collected on `/lead-rescue` | Live page: *"no card on this page"* + *"Do not enter card or banking details on this page."* |
| **Invoicing trigger** | **After intake review** (target: 2 business hours, per outreach copy § 2.4 + § 3.3) | Live page: *"USD 150 invoice we send after we review your intake."* |
| **Payment document** | **Manual Word / Pages PDF pro-forma**, built locally from `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`); sent 1:1 from Anton's email | Manual pro-forma is the canonical fallback **until** the Print Designer template (`JE-2026-06-05-1` / `JE-2026-06-05-2`) clears AC-1..AC-11 on the production shell. |
| **Payment confirmation** | **Manual** — Anton sees the wire / transfer land in the agreed account, then confirms with the buyer over email or WhatsApp and starts the 48-hour clock | Per `JE-2026-06-01-4`: SBM wire for Mauritius + warm-network international; no automated checkout. |
| **What we do NOT guarantee** | **Revenue. Lead volume. Conversion outcome.** No exceptions, no carve-outs, no testimonial guarantees | Live page: *"We do not guarantee new revenue. We do not promise more leads."* Manual pro-forma W4. Doctrine. |

This is the only offer Anton sells in Mauritius right now. **No tiers, no discounts, no add-ons, no retainers** on the customer-visible side. Variations (e.g., custom-quote work after the pilot, regional currency on the invoice) are operator-side decisions communicated **after** intake review — see § 9 *Decision points*.

---

## § 2 — Who to target first (warm-network density × buyer-pain density)

Targeting follows `AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md` § 4 (verticals 1–3 first; 4–7 second batch). For sales activation, the **warm-network filter** is applied: target **only** prospects where Anton has a real reason to reach out (referral, prior conversation, conference handoff, mutual contact). Cold scraped lists are **out** for v1 per `JE-2026-06-01-4` § 4.4.

| Priority | Vertical | Why first | Buyer pain phrase | Channel order |
|---|---|---|---|---|
| **1** | **Mauritius property / real-estate / rental operators** | Highest enquiry volume; multi-channel (Property24 / Lemons / WhatsApp / Facebook / website forms); agents triage by memory; daily-summary outcome maps cleanly to *"viewings booked vs viewings missed"* | *"viewing requests probably slipped through last week"* | WhatsApp → LinkedIn → email |
| **2** | **Mauritius clinics / wellness / dental / beauty** | Weekend enquiry pile-ups; appointment requests on WhatsApp + Facebook DMs + website forms; no single Monday-morning view | *"appointment requests probably arrived over the weekend"* | LinkedIn → WhatsApp → email |
| **3** | **Mauritius contractors / home services / renovation / solar / security** | High-value quote requests (MUR 50k+); team on site all day; WhatsApp + email + Facebook; slow response loses to whoever calls back first | *"quote requests probably slipped through last week"* | WhatsApp → LinkedIn → email |
| **4** | **Owner-managed businesses with WhatsApp + web + Facebook enquiries** (cross-vertical) | The pattern fits any owner who personally handles incoming enquiries across multiple channels; lowest-resistance buyer because they feel the pain personally | *"a few enquiries every week never get a reply"* (use generic) | Channel that matches the relationship |

**Out of scope for v1 outreach** (do not approach in week 1):

- Enterprise prospects (procurement cycles, no warm relationship).
- Cold international lists (any country outside Mauritius warm network).
- Prospects in regulated finance / healthcare records / legal who need a signed DPA before any conversation — schedule a separate `LR-Mauritius-Enterprise-Track-1` packet later.
- Anyone Anton does not already know or have a real referral path to.

---

## § 3 — 20-person warm-network outreach list (template)

The list below is a **template** to fill in locally. **Do not** commit the populated version to this repo (it contains personal contact data). Keep the populated list in **one** of: Anton's local Excel / Numbers spreadsheet, a Google Sheet shared only with himself, or the `/admin/lead-rescue` Commercial-card notes once a prospect submits intake.

### § 3.1 List schema

| # | Name | Business | Sector | Channel | Relationship strength | Likely pain | Next action | Status |
|---|---|---|---|---|---|---|---|---|
| 1 | _e.g. "Marie L."_ | _e.g. "Trou Aux Biches Rentals"_ | **Property** (1) | **WhatsApp** | **Strong** (regular contact, would reply same day) | *"Viewing requests in WhatsApp groups + Property24 inbox; agent forgets who's been replied to"* | *Send § 5.1 WhatsApp opener Mon 09:00; if reply, send § 5.5 details; if silence, § 5.6 follow-up Thu* | **Queued** |
| 2 | _…_ | _…_ | _…_ | _…_ | _…_ | _…_ | _…_ | _…_ |

### § 3.2 Column definitions

| Column | Allowed values / format | Notes |
|---|---|---|
| `#` | 1..20 | Cap at 20 for week 1; expand to 50 in week 2 only if week 1 produces ≥ 3 intake submissions. |
| `Name` | First name + last-initial, **not** full surname in the repo template | Real list is kept locally; full name is fine there. |
| `Business` | Trading name | Use the name the buyer answers to (not necessarily the registered legal name). |
| `Sector` | One of: `Property (1)`, `Clinic (2)`, `Contractor (3)`, `Owner-managed (4)`, `Other (deprioritise)` | Map to § 2 vertical priorities. If "Other", deprioritise to week 2+. |
| `Channel` | One of: `WhatsApp`, `LinkedIn`, `Email`, `Phone`, `In-person` | Default to the channel Anton already uses with this person. If unclear: WhatsApp for contractors, LinkedIn for clinics + owner-managed professionals, email for property managers with a public business inbox. |
| `Relationship strength` | One of: `Strong` (would reply same day), `Warm` (would reply within a week if the message is personal), `Faint` (mutual acquaintance only — handle with care) | `Faint` requires a one-line context refresher in the opener (*"We met at … in 2025"*); never approach a `Faint` contact with the unmodified copy block. |
| `Likely pain` | Free-text, ≤ 1 sentence, in the buyer's own language if possible | This is what Anton will reference in the opener. If you can't write a believable likely-pain sentence, Anton does not know the prospect well enough yet — defer. |
| `Next action` | Single concrete action with a day + script reference (e.g., *"§ 5.1 WhatsApp opener Mon 09:00"*) | One action at a time; do not pre-schedule the whole sequence. |
| `Status` | One of: `Queued`, `Sent`, `Replied`, `Intake submitted`, `Pro-forma sent`, `Paid`, `Setup started`, `Setup done`, `Closed-lost`, `Snoozed (60d)` | Status transitions map to § 6 lead-handling workflow + § 7 evidence checklist. |

### § 3.3 List hygiene rules

1. **Strong + warm only in week 1.** Faint contacts get a context-refresher week 2.
2. **Mix sectors** — aim for ~6 property, ~5 clinic, ~5 contractor, ~4 owner-managed across the 20.
3. **Two messages per person max** in week 1 (one opener + one follow-up); never three.
4. **Mark `Snoozed (60d)`** if a prospect goes silent after the follow-up. Re-engage in 60 days **only** if there is real news (first published case, new vertical evidence, article published).
5. **No public visibility.** The populated list never appears in a tweet, LinkedIn post, public Slack channel, this repo, or any AI prompt.

---

## § 4 — Daily execution plan (week 1)

Calibrated to one operator (Anton) working Lead Rescue alongside the rest of CorpFlowAI. Total time budget: ~90 minutes per day, mostly batched into one morning block.

| Day | Block | Specific action | Time | Done when |
|---|---|---|---|---|
| **Mon (Day 1)** | 09:00–10:00 | **10 warm messages sent** (mix sectors per § 3.3). Each = the appropriate § 5 opener, with the `Likely pain` line tailored from § 3.1. Update `Status = Sent` for each row. | 60 min | 10 `Sent` rows in the list. |
| **Mon** | 16:00–16:15 | Capture replies. Move `Sent` → `Replied` where applicable. Any `Replied` row that wants details → reply with § 5.5 + link to `https://corpflowai.com/lead-rescue` immediately. | 15 min | All Monday replies handled same day. |
| **Tue (Day 2)** | 09:00–09:30 | **10 follow-ups** to Monday's `Sent`-no-reply rows (use the matching § 4.2 / § 4.3 follow-up from `AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md`). | 30 min | 10 follow-up rows updated. |
| **Tue** | 09:30–10:30 | **10 new openers** to fresh rows from § 3.1 (the second batch of 10 from the 20-person list). | 60 min | 20 total `Sent` rows in the list. |
| **Tue** | 16:00–16:15 | Capture replies. Any intake submissions → check `/admin/lead-rescue` and Telegram alert; record `Status = Intake submitted`. | 15 min | All Tuesday replies handled. |
| **Wed (Day 3)** | 09:00–10:30 | **Call block.** Phone the 2–3 `Replied`-but-undecided prospects. Goal of each call = either *"yes, send me the page / details"* or *"no thanks, not the right time"*. **Never** quote on the call beyond the live page price (USD 150 launch pilot). | 90 min | Each `Replied` row resolved to next state or `Closed-lost`. |
| **Wed** | 14:00–14:30 | **Intake review** for any submitted intakes (target: 2 business hours per outreach copy § 2.4, but Wed is the catch-up checkpoint). Apply § 9.1 *when to accept a pilot* decision. | 30 min | All `Intake submitted` rows resolved to `Pro-forma sent` (accepted) or polite decline (declined). |
| **Thu (Day 4)** | 09:00–10:00 | **Pro-forma send.** For each accepted intake: build the PDF locally from `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` § 5; populate placeholders per § 3; send 1:1 from Anton's email with the agreed payment-route line in the body (operator-side; not in the PDF). Update `Status = Pro-forma sent`. | 60 min | 1+ pro-forma PDF sent to a real prospect. |
| **Thu** | 16:00–16:15 | Capture any payments-landed; reply with § 5.7 confirmation; update `Status = Paid`. | 15 min | All Thursday payments confirmed same day. |
| **Fri (Day 5)** | 09:00–10:00 | **Setup handoff.** For each `Paid` row: kick off the 48-hour setup per `AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`; record the start time and target. Update `Status = Setup started`. | 60 min | Setup clock running for any paid pilots. |
| **Fri** | 16:00–16:30 | **End-of-week review.** Reconcile § 7 evidence checklist for every row that moved this week. Note the week's open questions for the next packet. | 30 min | Week 1 evidence captured in the local list. |

**Week 1 stretch target:** 1–2 paying pilots booked (i.e., `Paid` status reached on at least one row by Friday).
**Week 1 minimum-acceptable target:** 1+ `Intake submitted` row from the 20-person list. Below this, the list quality is the problem (faint contacts, weak pain match) — not the copy — and Anton should pause outreach and rework § 3.1 before sending more.

---

## § 5 — Message scripts (paste-safe; pair with `AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md`)

These are the **short**, single-situation scripts the long-form copy doc deliberately left thin. For the **full** opener bodies (LinkedIn DM § 1, WhatsApp § 2, email § 3, follow-up § 4, LinkedIn post § 5, objection handling § 6, vertical variants § 7), use the canonical copy doc directly.

> **Replace `{first name}` and `{business name}` per message.** Do not modify the rest until at least 10 sends per script have been measured.

### § 5.1 WhatsApp short opener (1-screen, link inline) — for **warm** contacts only

```text
Hi {first name} — quick one. We just opened a 48-hour AI Lead
Rescue pilot for Mauritius businesses: connect one lead source
(form, email, WhatsApp, or Facebook), get an instant owner alert,
a daily lead list, and a 7-day follow-up board.

USD 150, invoiced after we review your intake — no card on the
page.

Page + 52-sec walkthrough: https://corpflowai.com/lead-rescue
```

### § 5.2 LinkedIn DM opener (sent **after** a connection request is accepted; **no link** in message 1)

```text
Hi {first name}, thanks for connecting.

Reason I reached out: most small businesses in Mauritius I speak
to say they sometimes lose enquiries simply because messages
arrive in too many places — WhatsApp, email, the website form,
Facebook — and follow-up depends on whoever remembers.

We've put together a 48-hour pilot that connects one of those
lead sources to a simple daily lead list, sends an instant alert
to the owner or operator, and surfaces the follow-ups due each
morning. USD 150 launch pilot, invoiced after we review your
intake.

Want me to send you the one-page overview?
```

If they reply *"yes / send it / sure"*, message 2 is the single line:

```text
Here it is: https://corpflowai.com/lead-rescue. There's a 52-second
silent walkthrough on the page if you want to see what the daily
view looks like before deciding anything. Happy to answer any
questions.
```

### § 5.3 Email opener (subject + body — use canonical subject from outreach copy § 3.2)

```text
Subject: A few enquiries probably slipped through last week

Hi {first name},

When I look at how small businesses in Mauritius receive enquiries,
the pattern is almost always the same: leads arrive in three or
four channels (website form, email, WhatsApp, Facebook), and
follow-up depends on whoever happens to be around.

We've opened a 48-hour Lead Rescue pilot for one specific
problem: connect one of your existing lead sources to a daily
list + instant owner alert + 7-day follow-up board. USD 150
launch pilot, invoiced after we review your intake. No card on
the page.

Page and a 52-second walkthrough: https://corpflowai.com/lead-rescue

Happy to answer any questions.

{Anton}
CorpFlowAI Ltd (Mauritius)
support@corpflowai.com
```

### § 5.4 First follow-up (3–5 working days after the opener; **one only**)

```text
Hi {first name} — just floating this back to the top.

If it's easier than reading copy, the 52-second silent
walkthrough on the page shows exactly what the daily view looks
like (counts, alerts, follow-up board):
https://corpflowai.com/lead-rescue

Totally fine if it's not the right time — just let me know
either way.
```

### § 5.5 *"Send me details"* reply

```text
Brilliant. Everything is on one page including a 52-second silent
walkthrough: https://corpflowai.com/lead-rescue.

The intake form on the page takes 2–3 minutes. We'll review what
you've sent within 2 business hours and email back with a USD 150
pro-forma and the agreed payment route. Setup begins as soon as
payment is confirmed.

Any questions before you submit?
```

### § 5.6 *"How much?"* reply (do not preempt; only when asked)

```text
USD 150 launch pilot — one price, no tiers, invoiced after we
review your intake. That covers the lead-source connection, the
owner alert, the daily lead list, the 7-day follow-up board, and
7 days of monitoring. No card on the page; we email the pro-forma
with the agreed payment route after reviewing what you've sent.
```

### § 5.7 *"Is this AI?"* reply

```text
Some AI tooling under the hood — but the buyer-facing outcome
isn't AI. It's a connected lead source, an instant alert to a
human owner, a simple lead list, and a daily follow-up summary.
No AI talks to your customers; no AI sends messages on your
behalf. A human follows up; the system makes sure the enquiry is
in front of them.
```

### § 5.8 *"Will this guarantee leads?"* reply (this is the **single hardest** reply to keep doctrine-compliant — copy verbatim)

```text
Honest answer: no. We do not guarantee revenue, lead volume, or
conversion outcome. We help make sure the enquiries you already
get are captured, visible, and followed up. Results depend on
your enquiry volume, your team's response time, and what you do
with the leads once they're in front of you. That's exactly why
the pilot is USD 150 — it's the cheapest way to find out whether
the system fits without a long commitment.
```

### § 5.9 Payment-confirmation reply (after a wire / transfer lands)

```text
Thanks {first name} — payment received. The 48-hour setup clock
starts now: targeted by {DAY+2, time}. We may come back with a
couple of short access questions in the first few hours so we can
ship clean. You can reply on this thread or on WhatsApp,
whichever is easier.
```

**Forbidden in any of the above** (auto-checked against `AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` voice rules § Voice rules + brand doctrine + live page sentinels): *"guaranteed"*, *"pay now"*, *"instant"*, *"PayPal accepted"*, *"Wise accepted"*, *"automated payment"*, *"tax invoice"*, *"VAT invoice"*, any specific account number / SWIFT / IBAN, any card-scheme logo wordmark, any client name presented as a customer, any phrase implying a published case study exists.

---

## § 6 — Lead-handling workflow (intake → paid → handoff)

Single end-to-end path from the moment a prospect clicks the page to the moment Anton records a delivery outcome. Each step is operator-side; nothing is automated by THIS pack.

```text
[Prospect clicks /lead-rescue]
        │
        ▼
[Intake form submitted]
        │  POST /api/tenant/intake
        ▼
[Telegram + email alert fires per AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md]
        │
        ▼
[Anton checks intake]  ◄── target: within 2 business hours
        │
        ▼
[Qualify fit per § 9.1]  ── if no-fit → polite decline per § 9.2
        │ accept
        ▼
[Build manual pro-forma PDF locally]
        │  from AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md § 5
        ▼
[Send pro-forma 1:1 from Anton's email]
        │  payment route named in email body (NOT on the PDF;
        │  the PDF carries W1: "Payment instructions are sent
        │  separately after intake approval.")
        ▼
[Wait for payment to land in the agreed account]
        │
        ▼
[Anton sees the wire / transfer; reply with § 5.9]
        │
        ▼
[Setup clock starts: target 48 h, normally ≤ 5 business days]
        │  follow AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md
        ▼
[Setup handoff: lead source connected; alerts live; daily list live]
        │
        ▼
[7-day monitoring window]
        │
        ▼
[Record outcome: enquiries captured, alerts fired, follow-ups surfaced]
        │  store in /admin/lead-rescue/[id] Commercial card notes
        ▼
[Ask for testimonial / case-study permission per § 7.6]
        │
        ▼
[Close pilot row in the local list]
```

**Key boundaries the workflow does NOT cross** (and must not until separate authorisation lands):

- It does NOT create a Sales Invoice in ERPNext (HB-1 + HB-2 + HB-3 pending). Pro-forma is the canonical pre-payment document; the **post-payment** finance doc is also handled outside ERPNext on Anton's side until the Print Designer template + accountant sign-off land.
- It does NOT post any GL entry.
- It does NOT trigger any VAT line ("VAT/tax treatment pending accountant confirmation" per W5; the live `/lead-rescue` page is silent on VAT for the same reason).
- It does NOT email the rendered Print Designer PDF to a real client until `JE-2026-06-05-2` build runbook AC-1..AC-11 pass + a separate `AUTHORISE — ERPNext-First-Real-Pro-Forma-Send` chat DECISION lands.
- It does NOT publish a case study or testimonial without explicit written buyer permission per § 7.6.

---

## § 7 — Evidence checklist (paste-back for every paying pilot)

Per pilot, capture **all** of the following so the result is auditable + reusable for the first published case study + the next-version conversion improvements.

| # | Evidence | Where it lives | When to capture |
|---|---|---|---|
| **EV-1** | Plausible visit + outbound-event for the prospect's session | Plausible dashboard (live per `JE-2026-05-27-1`); filter by session date + UTM if used | Within 24 h of the intake submission |
| **EV-2** | Intake row exists in `/admin/lead-rescue` with the prospect's data | Operator console (`/admin/lead-rescue/[id]`) | Immediately on intake submission |
| **EV-3** | Manual pro-forma PDF sent (date, time, file name, email subject + recipient) | Anton's sent-mail folder + local copy of the PDF (not in repo) | At pro-forma send |
| **EV-4** | Payment status: `pending` / `landed` / `not-paid` + agreed payment route (operator-internal: e.g. SBM-wire / warm-network-international-wire); **never** record real account digits in repo | `/admin/lead-rescue/[id]` Commercial card notes | At payment land |
| **EV-5** | Delivery status: `setup-started (datetime)` / `setup-done (datetime)` / `7-day-monitoring-complete (datetime)` | Same | At each transition |
| **EV-6** | Testimonial / proof request: `requested (date)` / `granted (date, scope)` / `declined (date)` — scope = `name + business + verbatim quote` OR `business + verbatim quote` OR `anonymised quote only` | Same; verbatim quote stored locally until § 7.6 explicit permission to publish | After 7-day monitoring window closes |
| **EV-7** | Time-to-intake-review (minutes between intake submission and operator reply); target ≤ 120 min | Local list / Commercial card | Per pilot |
| **EV-8** | Time-to-setup-done (hours between payment land and setup-done); target ≤ 48 h | Same | Per pilot |
| **EV-9** | Lead-source mix (which lead source was connected: WhatsApp / form / email / Facebook / Google Form) | Same | At setup-done |
| **EV-10** | Channel that produced the conversion (`WhatsApp` / `LinkedIn` / `email` / `phone` / `in-person`) | `Status` history in the local list | Per pilot |
| **EV-11** | Reason the prospect bought (in their own words; 1–2 sentences) | Captured during the § 5.9 reply or shortly after | At payment confirmation |
| **EV-12** | Operator notes: what went well, what to change next time | Same | At pilot close |

### § 7.1 Testimonial / proof request (only after 7-day monitoring closes)

Ask in plain text, no template-marketing tone:

```text
{first name} — how has it been since we shipped? If the system
has been useful, would you be happy for us to mention {business
name} in a short case write-up on the site? You'd see the
wording before anything goes live, and you can pick how you're
named (just the business, or business + a verbatim quote, or
anonymous). No pressure either way.
```

**Only publish** with explicit written permission. Doctrine guardrail: pre-proof window per `PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` § 3 prohibits unsupported testimonials and named-client claims; this question is the gate.

---

## § 8 — What NOT to say (one-line guardrails Anton can scan before pressing Send)

These mirror `AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` § Voice rules + the live-page sentinels + the manual pro-forma `JE-2026-06-02-7` FB-1..FB-12 forbidden patterns. Reproduced here so Anton can keep one tab open at send-time.

| # | Phrase | Why forbidden |
|---|---|---|
| **DN-1** | *"Guaranteed leads"* / *"more leads"* / *"X% more leads"* | Contradicts the live page no-guarantee line + W4. |
| **DN-2** | *"Instant AI"* / *"AI does the follow-up"* / *"AI replies for you"* | Misrepresents the system — humans follow up; AI is in the tooling under the hood. § 5.7 is the safe answer. |
| **DN-3** | *"Pay now"* / *"Click to pay"* / *"Instant checkout"* | Contradicts *"no card on this page"* + outreach copy § 2.4 + § 3.3 *"invoiced after we review your intake"*. |
| **DN-4** | *"Automated payment"* / *"automatic billing"* | No automated payment exists per `JE-2026-06-01-4`; payment is manual SBM wire for Mauritius + warm-network international. |
| **DN-5** | *"Tax invoice"* / *"VAT invoice"* | HB-2 + HB-3 pending (accountant + VAT decision). W5 + manual-pro-forma FB-1+FB-2 forbid this until the accountant gates close. |
| **DN-6** | *"ERPNext invoice ready"* / *"our ERPNext system will invoice you"* | Print Designer install + AC-1..AC-11 + first-real-pro-forma-send authorisation all still HELD. Manual pro-forma remains canonical. |
| **DN-7** | *"Trusted by Mauritian businesses"* / *"used by hundreds of operators"* | No published cases exist in pre-proof window (per `PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` § 3). |
| **DN-8** | *"PayPal accepted"* / *"Wise accepted"* / *"International cards accepted"* | Per `JE-2026-06-01-4`: PayPal HOLD; Wise removed; SBM e-Commerce pending. None of these may be named as a payment route until they go live. |
| **DN-9** | Specific bank account number, SWIFT, IBAN, routing, sort code, MUR / USD account digits | Hard rule per manual-pro-forma `JE-2026-06-02-7` § 0 + design brief FB-11. |
| **DN-10** | *"Same-day setup"* / *"installed in 1 hour"* | Contradicts the 48-hour target. Time discipline is also trust-building — over-promising in copy and under-delivering in reality is the worst failure mode. |
| **DN-11** | *"Discount available"* / *"this week only"* / *"limited to 5 pilots"* | Single offer rule. No tiers, no discounts, no urgency tactics. |
| **DN-12** | Any prospect or client's real name in a public post or screenshot before § 7.6 explicit permission | Doctrine + GDPR-adjacent posture + the page itself uses representational data only. |

---

## § 9 — Decision points (when to accept / decline / escalate / wait)

Practical operator decisions Anton makes per prospect, with one-line triggers and one-line actions.

### § 9.1 When to **accept** a pilot

Accept if **all four** are true:

1. The prospect has a real, named lead-source pain (multi-channel intake + memory-based follow-up) — not a generic *"we'd like more leads"* statement.
2. The prospect can name **one** existing lead source (form / WhatsApp / email / Facebook / Google Form) for the connection.
3. The prospect can name **one** owner / operator who will receive alerts in the first 48 h.
4. The prospect is comfortable with the manual pro-forma + manual wire path (warm-network friction is acceptable here; cold international friction is not).

Action: send § 5.5 *"send me details"* reply; on intake submission, send pro-forma per § 4 Day 4.

### § 9.2 When to **decline** a bad-fit prospect

Decline politely if any of:

- Prospect wants real-time AI replying to their clients on their behalf — that is NOT the product (§ 5.7).
- Prospect wants a guaranteed lead-volume floor or revenue floor — that is NOT the product (§ 5.8 + DN-1).
- Prospect wants the page changed (custom card payment, custom currency, custom pricing) before paying — single-offer rule (DN-11); decline politely and offer the page link unchanged.
- Prospect is in a regulated vertical needing a signed DPA / specific data-residency contract before any data crosses — defer to `LR-Mauritius-Enterprise-Track-1` (future packet, not authorised by this pack).
- Prospect refuses to use any of the listed lead sources (insists on something exotic like an SMS gateway with no public API) — defer; offer to revisit when their channel stack stabilises.

Decline script:

```text
Thanks for the conversation, {first name}. Based on what you've
described, the Lead Rescue pilot in its current form probably
isn't the right fit — {one specific reason that mirrors their
description, not the doctrine reason}. Happy to stay in touch and
revisit when {the specific condition} changes.
```

### § 9.3 When to **escalate to a custom quote** (i.e., not the USD 150 pilot)

The pilot is one offer at one price. Custom quotes are reserved for **post-pilot** work or **enterprise-shaped** work that does not fit the pilot. Trigger:

- Prospect's volume / scope clearly exceeds the pilot SLA (e.g., 10+ lead sources, 3+ owner roles, custom reporting).
- Prospect needs a signed MSA / SOW / DPA before any work starts.
- Prospect wants a retainer (monthly monitoring beyond the 7-day window).

Action: do **not** send the USD 150 pro-forma. Reply:

```text
That scope is beyond what the USD 150 launch pilot covers — it's
the right job for a custom engagement, not the pilot. I can put
a short scope-and-quote proposal together if you're open to it.
What's the cleanest way to share scope — a 20-minute call this
week?
```

Then move to a separate operator workstream — not tracked in this pack.

### § 9.4 When to **wait** for accountant / ERPNext before signing

Wait if any of:

- Prospect is a Mauritius VAT-registered business who explicitly asks for a tax invoice on day one — HB-3 (VAT decision) pending; W5 honest answer (*"VAT/tax treatment pending accountant confirmation"*) may not satisfy them. Polite hold:

  ```text
  We're finalising our VAT posture with our accountant this
  quarter, so for the first cohort of pilots we issue a
  pro-forma and a payment-confirmation receipt rather than a
  tax invoice. If that's a hard requirement for your finance
  team, I'll come back when our tax-invoice posture is signed
  off — likely in {weeks}. Happy to keep you on the early-access
  list either way.
  ```

- Prospect needs an ERPNext-emailed PDF (specific finance-system requirement) — wait until `JE-2026-06-05-2` AC-1..AC-11 pass + `ERPNext-First-Real-Pro-Forma-Send` authorisation lands.
- Prospect needs a real bank account name + IBAN on the PDF up front (some procurement systems require this for vendor onboarding) — wait until the operator-side payment configuration packet completes (`PAY-SBM-3` outstanding; see `JE-2026-06-02-4`).

In all wait-cases: **never invent** a missing capability to keep the conversation moving. The honest hold is the trust move.

---

## § 10 — Final Anton daily checklist (one screen, end-of-day)

Glanceable end-of-day checklist. Anton ticks each box at ~17:00 local. If any box is unchecked on a sales-active day, note the reason in the local list under the corresponding row.

```text
[ ] 10 openers sent today (or 10 follow-ups + 10 new on Tue per § 4)
[ ] 5 follow-ups sent today (only from days where a Mon/Tue opener exists)
[ ] 1+ intake submission reviewed within 2 business hours
[ ] 1+ manual pro-forma PDF ready to send (or sent) for any accepted intake
[ ] 1 sales call booked or completed (or politely declined / rescheduled)
[ ] All status transitions captured in the local list (§ 3.1)
[ ] No DN-1..DN-12 phrase used in any message today (cross-check § 8)
[ ] Sandbox-preservation rule from JE-2026-06-04-1 untouched (no L3 changes)
[ ] Print Designer / ERPNext / accounting work untouched (separate workstreams)
[ ] One-line note logged for the day: what worked, what didn't, what to change
```

**Week-end gate (Fri 16:30):**

- ≥ 1 `Intake submitted` row → keep cadence; plan week 2.
- 0 `Intake submitted` rows → **stop** week-2 outreach. Re-work § 3.1 list and / or rework § 2 target match. Sending more of the same copy to more of the same list will not change the result.

---

## § 11 — Standing holds (unchanged by THIS PR)

- **HB-1** (full Phase D beyond narrowed shell-setup) · **HB-2** (Mauritius-licensed accountant CoA review) · **HB-3** (VAT decision in `JOURNAL.md`) · **HB-4** (real redacted MU bank CSV reconciliation cycle).
- Phase D ERPNext accounting go-live; first submitted Sales Invoice; first ERPNext-emailed PDF to a real client.
- `ERPNext-PrintDesigner-Install-1` (Packet 2 from `JE-2026-06-04-4` § 7.2) still on its own authorisation chain; closure checklist `JE-2026-06-05-3` standardises closure but does not authorise the install or the build-runbook host-side execution.
- Sandbox tear-down four-condition gate from `JE-2026-06-04-1`.
- `LR-Mauritius-Outreach-Copy-V1.1` (measured-data refinement after 10–20 sends per channel) — explicitly recommended next packet, not authorised by this pack.
- `LR-French-Creole-Variants-1` — explicitly deferred per `AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md` § 9.
- All standing holds from `JE-2026-06-05-1`, `JE-2026-06-05-2`, `JE-2026-06-05-3`.

**New holds introduced by this PR:** none. This is an operator playbook; everything it enables is already authorised (live page, manual pro-forma, outreach copy, operator runbook).

---

## § 12 — Honest limits of v1

- **No CRM.** The 20-person list lives in a local spreadsheet (or `/admin/lead-rescue` Commercial-card notes once intake exists). A real CRM (Twenty / Pipedrive / similar) is medium-term backlog, not this packet.
- **No measured-data tuning.** All time targets (2 business hours / 48 hours / 5 business days / 5 working days follow-up window) are operator judgement. `LR-Mauritius-Outreach-Copy-V1.1` exists to refine these once 10–20 sends per channel have been measured.
- **No French body copy** beyond the optional opener line in outreach copy § 2.3. Native-reviewed French / Creole variants are the deferred `LR-French-Creole-Variants-1`.
- **No automated send.** Every message in § 5 is sent 1:1 by Anton. No mail-merge, no LinkedIn automation, no WhatsApp Business API — those all introduce deliverability + brand-doctrine risk that the warm-network volume does not justify.
- **No statistical proof.** § 4 weekly minimums are operator-acceptable starting points, not statistically derived rates.
- **No coverage of post-pilot retainer / production-price conversion.** That is a separate packet once 3+ pilots complete.
- **No commitment that the payment-route remains SBM wire.** If `PAY-SBM-3` lands and SBM e-Commerce / Peach Payments authorisation arrives, the payment-route line in § 5.9 + pro-forma email body changes operator-side; the live page does not change unless a separate UI packet authorises it.
- **AI Lead Rescue is not a CRM, a website, a payment processor, a booking engine, an SMS gateway, or a customer-replying bot.** Section § 5.7 is the verbatim safe answer; § 8 DN-2 is the guardrail.

---

## § 13 — Cross-references

- Live page (do not contradict): `https://corpflowai.com/lead-rescue` + readiness verification in `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS.md` § 1 (`JE-2026-06-01-6`).
- Outreach copy library (canonical channel copy): `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` (`JE-2026-06-02-2`).
- Pomelli sprint plan (research + proposal; **not** activated): `docs/marketing/POMELLI_LEAD_RESCUE_MAURITIUS_SPRINT_V1.md` (`JE-2026-06-03-1`).
- Brand and conversion doctrine: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine*.
- Manual pro-forma template (canonical payment doc for first pilots): `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (`JE-2026-06-02-7`).
- Print Designer specification (future ERPNext-native equivalent of the manual pro-forma): `docs/finance/CFLR_MAURITIUS_PRO_FORMA_TEMPLATE_DESIGN_BRIEF_V1.md` (`JE-2026-06-05-1`).
- Print Designer build runbook (post-install operator steps): `docs/runbooks/ERPNEXT_CFLR_PRO_FORMA_TEMPLATE_BUILD_PACKET_V1.md` (`JE-2026-06-05-2`).
- Print Designer install closure checklist: `docs/runbooks/ERPNEXT_PRINT_DESIGNER_INSTALL_CLOSURE_CHECKLIST_V1.md` (`JE-2026-06-05-3`).
- Operator runbook (intake → Telegram → setup): `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`.
- Payment readiness + payment-route decision: `docs/finance/PAYMENT_READINESS_2026_06_01.md` (`JE-2026-06-01-4`); `PAY-SBM-2` (`JE-2026-06-02-4`); `PAY-SBM-3` outstanding.
- Proof / validation asset doctrine: `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md`.
- Marketing execution standards (Hook / Proof / Depth + Agent Output Contract + Delivery Quality Gate): `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md`, `docs/marketing/01_AGENT_OUTPUT_CONTRACT.md`, `docs/marketing/04_DELIVERY_QUALITY_GATE.md`.
- Decision rows: `JE-2026-05-28-1` (single offer rule), `JE-2026-05-28-3` (USD-launch-pilot wording), `JE-2026-06-01-4` (payment-route reality), `JE-2026-06-01-6` (launch readiness), `JE-2026-06-02-2` (outreach copy), `JE-2026-06-02-4 PAY-SBM-2` (public seller identity), `JE-2026-06-02-7` (manual pro-forma), `JE-2026-06-03-1` (Pomelli sprint), `JE-2026-06-04-1..6` (production-shell setup chain + sandbox preservation + host_name fix + recipe v1.1), `JE-2026-06-05-1` (Print Designer design brief), `JE-2026-06-05-2` (Print Designer build runbook), `JE-2026-06-05-3` (install closure checklist), `JE-2026-06-05-6` (this pack — the next available `JE-2026-06-05-N` ID on `origin/main`; locally-reserved `-4` / `-5` belong to Anton's parallel Print Designer install / editor-fix workstream).
- Bridge coordination: [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

---

## § 14 — Verdict per `.cursor/rules/delivery-reality.mdc` § docs-only

**COMPLETE-AT-PR-MERGE** for the operator-playbook artefact — operator + agent governance; no customer-visible URL is created or changed by this pack. The sales activity it enables runs in Anton's L1 / off-repo workflow; the **results** (intake submissions, paid pilots, testimonials, decisions to escalate or wait) are recorded on the Commercial card in `/admin/lead-rescue/[id]` and summarised back to Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) per § 4 Friday review + § 7 evidence checklist. None of the live `/lead-rescue` sentinels (`USD 150 launch pilot`, `no card on this page`, `invoiced after we review your intake`, `We do not guarantee`, `48-hour setup`) are changed by this PR.

---

## § 15 — Change log

- **v1, 2026-06-05** — initial operator-playbook. 15 sections covering hard limits (§ 0); single-offer description with live-page sentinel sources (§ 1); week-1 target verticals with channel order (§ 2); 20-person warm-network list template + schema + hygiene rules (§ 3); week-1 daily execution plan Mon–Fri (§ 4); 9 short message scripts paired against the canonical outreach copy doc (§ 5: WhatsApp opener / LinkedIn DM + reply / email opener / first follow-up / send-me-details / how-much / is-this-AI / guarantee-leads / payment-confirmation); end-to-end lead-handling workflow ASCII diagram + boundary list (§ 6); 12-item per-pilot evidence checklist EV-1..EV-12 + testimonial-request script (§ 7); 12 DN-1..DN-12 do-not-say guardrails mirrored against live page sentinels + doctrine + manual pro-forma FB-1..FB-12 (§ 8); 4 decision-point sub-sections (accept / decline / escalate-custom / wait-for-accountant-or-ERPNext) with one-line triggers + scripts (§ 9); final 10-item daily checklist for Anton (§ 10); standing holds carried forward unchanged (§ 11); 8 honest limits including no-CRM + no-measured-data + no-French + no-automation + no-statistical-proof + no-retainer + no-payment-route-commitment + clarification of what AI Lead Rescue is not (§ 12); cross-references to 15+ sibling docs and the full `JE-2026-05-28-1..3` + `JE-2026-06-01-4..6` + `JE-2026-06-02-2..7` + `JE-2026-06-03-1` + `JE-2026-06-04-1..6` + `JE-2026-06-05-1..3` chain (§ 13); verdict per `.cursor/rules/delivery-reality.mdc` § docs-only = COMPLETE-AT-PR-MERGE (§ 14); change log v1 (§ 15). (`JE-2026-06-05-6`.)
