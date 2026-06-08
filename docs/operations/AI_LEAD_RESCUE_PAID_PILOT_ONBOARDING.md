# AI Lead Rescue — Paid Pilot Onboarding (operator-side)

**Audience:** the operator running the 48-hour setup window for a paying pilot.

**Status:** Operator-side runbook. Docs-only — no env vars, no secrets, no runtime changes.

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING_V1 -->`

<!-- AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING_V1 -->

## What this doc covers

How to take a paying AI Lead Rescue pilot from *"wire confirmed"* to *"hand-over message sent"* in 48 hours, using the existing CorpFlowAI operator cockpit (`/admin/lead-rescue/[id]`), Google Sheets, Telegram, and WhatsApp — **no new infrastructure, no new vendors, no client-side env vars**.

This doc is **operator-side only**. The buyer-facing public page is still the single offer at `/lead-rescue` (USD 150 launch pilot, manual pro-forma).

## 0. When this runbook applies

Use this runbook **after**:

1. Discovery call has happened (`docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`).
2. Prospect has submitted the public intake form at `/lead-rescue`.
3. Operator has reviewed the intake in `/admin/lead-rescue/[id]` and moved status to `QUALIFYING` or further.
4. Pro-forma invoice (USD 150 — see § 5 of `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`) has been sent.
5. **Wire transfer has cleared** the operator-side bank account (SBM Mauritius for warm-network primary route, or international wire as appropriate).

If wire has not cleared, **do not start the 48-hour window**. Set status to `INVOICE_SENT` (or appropriate intermediate state) and wait. Setup time is the operator's most expensive resource — no free pilots even temporarily.

## 1. Paid pilot intake checklist (in order)

Within **2 hours** of confirming wire receipt, the operator must:

- [ ] Open `/admin/lead-rescue/[id]` for this prospect.
- [ ] Move status to `PAID_SETUP` (this triggers the setup checklist UI under `qualification_json.ai_lead_rescue_operator.setup_checklist`).
- [ ] Add an activity-log entry of type `payment_confirmed_manual`, channel `manual`, note: *"USD 150 launch pilot wire received {date} via SBM. Starting 48-hour setup window."*. (No bank reference, no card data, no payer detail beyond initials.)
- [ ] Set the Operator card `next_action` to: *"Setup window: connect lead source, alerts, sheet — target hand-over by {ISO date 48h ahead}."*.
- [ ] Send a short WhatsApp confirmation to the buyer: *"Wire received. Starting your 48-hour setup window now. I'll message you here when each piece is ready, and send a hand-over summary at the end."*.

## 2. Client info needed (operator collects, never asks for the kitchen sink)

Before connecting any channel, confirm the operator has:

- [ ] **Business display name** (already in intake — confirm spelling).
- [ ] **Working WhatsApp number** for daily summary + alerts (confirmed during call; verify it's the active one, not a personal one the owner doesn't read).
- [ ] **Working email** for daily summary + alerts (confirmed during call).
- [ ] **One named lead source** to connect for the pilot (the *"most leaky"* channel from discovery Q2). Examples: their existing website contact form, a Facebook page, a WhatsApp Business inbox, a property-listing inbox.
- [ ] **Owner's first name** (for the hand-over message — first name only is enough).
- [ ] **Owner's preferred timezone** for the daily summary timing (default: client local timezone).

What the operator must **never** collect:

- ❌ Card numbers, CVV, PINs, OTPs, banking passwords.
- ❌ Government ID numbers (national ID, passport, NIC, NID).
- ❌ Salary / payroll detail of staff.
- ❌ Health information about the owner or staff.
- ❌ Full database / CRM exports of historical leads from another vendor.

If a buyer offers any of the above, decline and explain why politely. The pilot does not require any of it.

## 3. Channels to connect first (priority order)

For first paying pilots, connect **one** lead source — the *"most leaky"* one from discovery Q2. Resist the urge to connect everything in 48 hours.

| Priority | Lead source | What "connect" means in the pilot | Operator effort |
|---|---|---|---|
| 1 | Existing website contact form (already on their site) | Add the operator's email as a recipient on their existing form-handler (Wordpress, Wix, Squarespace, custom HTML) | 30–60 min |
| 2 | Facebook page DMs | Owner forwards new DMs by sharing the inbox or by configuring Meta Business Suite to email the operator | 30 min + owner involvement |
| 3 | WhatsApp Business inbox | Owner forwards new chats to the operator (manual / labelled inbox), or operator monitors a shared device for the pilot week | 1–2 h |
| 4 | Property-listing portal inbox (Property24, Lemons, Lexpress) | Owner forwards portal-email notifications to the operator's email | 15 min + owner involvement |
| 5 | Phone-call missed-call list | **Out of pilot scope.** Document for follow-up; do not promise call-tracking in pilot. | n/a (defer) |

**One source per pilot.** If the buyer pushes for multi-source: explain that the 48-hour pilot is intentionally narrow, and that the second source can be added during the monthly-monitoring conversation if the pilot lands well.

## 4. Telegram alert setup notes

For first paid pilots, **alerts go to the buyer's WhatsApp + email, not Telegram**. Telegram is the *operator-side* alert channel — the operator gets a Telegram message when a new lead comes in on a connected source so they can react fast.

Operator-side Telegram setup (one-time, already exists for the operator account):

- [ ] Verify `corpflow-exec-01-u69678` server has the existing alert script wired (or use the existing alerts you already trust). Do not create a new Telegram bot for each pilot.
- [ ] Add the new pilot to the alert routing keyed by lead source name + business name.
- [ ] Smoke-test: send a fake test lead through the connected source and confirm the operator's Telegram chat fires.

**Buyer-side**: the buyer never sees Telegram. They see WhatsApp + email.

## 5. Google Sheet lead log setup notes

For first paid pilots, the **lead log is a Google Sheet**, not a CRM. This is by design (see `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 14 *What NOT to build yet*).

Sheet structure (one tab named *Leads*, one tab named *Activity*):

**Tab 1 — Leads** (one row per enquiry):

| Col | Field | Source | Sensitivity |
|---|---|---|---|
| A | `received_at` | auto on row creation, ISO date+time | low |
| B | `lead_source` | named source from § 3 | low |
| C | `lead_first_name` | from enquiry, first name only | low |
| D | `lead_contact_visible` | the channel they came from (e.g. "WhatsApp number visible", "email submitted") — **not** the actual contact | low |
| E | `enquiry_summary` | one-line operator paraphrase, no PII beyond first name | low |
| F | `replied_within_min` | operator-filled when they reply, in minutes | low |
| G | `current_status` | one of: *new / replied / followed-up / qualified / quote-sent / won / lost / no-response* | low |
| H | `next_action` | what's next, owner-facing | low |
| I | `next_action_date` | ISO date | low |

**Tab 2 — Activity** (free-form audit log of operator actions on this pilot):

| Col | Field |
|---|---|
| A | `at` (ISO date+time) |
| B | `lead_id_or_name` (Tab-1 row reference) |
| C | `action` (e.g. *"sent daily summary email"*, *"alerted owner of new lead"*) |
| D | `note` (operator-facing only) |

Permissions:

- [ ] Sheet owner: operator account (your CorpFlowAI Google Workspace identity).
- [ ] Buyer access: **view-only** to Tab 1 (*Leads*), **no access** to Tab 2 (*Activity*). Tab 2 is operator-internal.
- [ ] Buyer access link: shared via WhatsApp + email at hand-over.

What **must not** go in the Sheet:

- ❌ Full phone numbers / full email addresses of leads (operator stores those in their own ops system, not the buyer-shared sheet — first paid pilots only).
- ❌ Card / banking detail.
- ❌ Health / personal information beyond what the lead submitted in their original enquiry.
- ❌ Quotes from the buyer about other leads (e.g. *"this client always pays late"*).

For first paid pilots, **the buyer-shared sheet only stores enough info that the buyer can see the daily list and follow up. The operator's full contact data lives in the operator cockpit + private operator notes.**

## 6. Daily summary setup notes

The buyer receives **one summary per day** during the 7-day monitoring window (and during monthly monitoring after, if accepted).

**Channel:** WhatsApp (primary) + email (mirror). Same content both channels.

**Timing:** end-of-day in buyer's timezone (default: 17:00 local). **Adjust** if the buyer asks for morning summaries (e.g. property operators often prefer 08:00 local with the previous day's enquiries).

**Format** (paste-friendly, ~10 lines max):

```text
Daily lead summary for {Business name} — {date local}

New enquiries today: {count}

{For each enquiry:}
- {first name or "Anonymous"} via {source} — {one-line summary}
  Replied: {Yes — within Xmin / No — open}
  Next: {one-line next action / "Awaiting reply"}

Open from previous days: {count} ({list with status if <5})

If anything looks wrong, message me directly. — {operator first name}
```

For first paid pilots, **the daily summary is sent manually** by the operator using the Google Sheet as the source. Do **not** automate this for the first 4 paying pilots — the manual cadence is what surfaces operational learnings.

## 7. Operator checklist mapping

The operator cockpit `/admin/lead-rescue/[id]` shows a 13-item setup checklist when status is `PAID_SETUP` (`AI_LEAD_RESCUE_SETUP_CHECKLIST_V1` in `lib/cmp/_lib/ai-lead-rescue-operator.js`). Map this onboarding doc's actions to the checklist items as you go:

| This doc § | Checklist item (V1 names) |
|---|---|
| § 1 (status → `PAID_SETUP`) | `payment_confirmed` |
| § 2 (client info collected) | `client_info_collected` |
| § 3 (lead source identified) | `lead_source_identified` |
| § 3 (lead source connected) | `lead_source_connected` |
| § 4 (operator alerts firing) | `operator_alerts_wired` |
| § 5 (Sheet created + shared) | `lead_log_setup` |
| § 5 (Sheet permissions tested) | `lead_log_shared` |
| § 6 (first daily summary sent) | `daily_summary_first_sent` |
| § 8 (hand-over message sent) | `handover_sent` |
| § 9 (go-live confirmed) | `go_live_confirmed` |

> The checklist field names above are illustrative for this docs PR. The runtime source-of-truth is `AI_LEAD_RESCUE_SETUP_CHECKLIST_V1` in `lib/cmp/_lib/ai-lead-rescue-operator.js` — if names differ in the cockpit, follow the cockpit. This doc is descriptive of the operator workflow, not a schema spec.

Tick each checklist item in the cockpit **as the action completes**. The audit trail is the cockpit, not the doc.

## 8. What is manual for first pilots (and stays manual)

Until the operator has run **at least 4 paying pilots end-to-end**, the following stay manual:

- ❌ Pro-forma invoice generation (manual, in ERPNext sandbox or as a templated PDF — see `docs/finance/ERPNEXT_*` for the production-shell context, but VAT activation is held).
- ❌ Daily summary composition (operator writes from Sheet).
- ❌ Lead-source connection (no auto-connectors yet).
- ❌ Buyer-side Sheet creation (operator clones from a template).
- ❌ Hand-over message (operator writes per pilot, using § 9 template).
- ❌ Monthly-monitoring conversation (operator initiates, no auto-renewal logic).

This is not a permanent constraint — it's the *first-paid-pilots* posture. Automation comes after the operator has felt the manual workflow's pain points 4× and knows what to automate first.

## 9. Hand-over checklist (end of 48-hour window)

Before sending the hand-over message:

- [ ] Lead source confirmed connected (test enquiry has reached operator).
- [ ] Operator alert (Telegram) firing on test enquiry.
- [ ] Buyer-side WhatsApp + email confirmed receiving (test daily summary).
- [ ] Sheet shared with buyer with view-only access on Tab 1.
- [ ] Sheet has at least one row (real enquiry from the 48-hour window or a clearly-marked test row labelled *"setup test — ignore"*).
- [ ] Activity-log entry of type `delivery_handoff`, channel `manual`, note: *"48-hour setup complete. Lead source: {source}. Sheet shared. Daily summary at {time local}. 7-day monitoring window starts now."*.
- [ ] Operator card `next_action` set to: *"Send daily summary at {time} for next 7 days. End-of-pilot conversation on {ISO date 7 days ahead}."*.

Hand-over message template (WhatsApp + email):

```text
Hi {first name},

Setup is complete. Quick summary of what's now live:

- Lead source connected: {source}
- Daily lead summary: {time local} via WhatsApp + email
- Lead list (view-only): {Sheet URL}
- Operator on call (me): {operator first name + WhatsApp}

The 7-day monitoring window starts today. You'll get one summary
per day at {time local}. If a lead comes in and looks urgent, I'll
message you sooner — but the daily summary is the rhythm.

At the end of 7 days I'll send you a short pilot recap with the
numbers and we'll talk about whether monthly monitoring makes
sense. Nothing auto-renews.

If anything looks wrong before then, message me here.

— {operator first name}
```

## 10. Go-live checklist (before flipping cockpit status to `LIVE_MONITORING`)

- [ ] Hand-over message sent (WhatsApp + email confirmed delivered).
- [ ] Buyer has acknowledged receipt (a thumbs-up reaction is fine; no formal sign-off needed for first pilots).
- [ ] First daily summary scheduled in operator's calendar for next-day delivery.
- [ ] Cockpit status moved to `LIVE_MONITORING` (or whichever state corresponds to the post-handover monitoring window in `AI_LEAD_RESCUE_STATUSES`).
- [ ] Activity-log entry of type `note`, channel `internal`, with text: *"Go-live confirmed. 7-day monitoring window: {ISO start} → {ISO end}. End-of-pilot conversation on {date}."*.

## 11. 48-hour setup definition of done

The 48-hour setup is **DONE** when **all** of the following are true:

1. Status is `PAID_SETUP` and at least 8 of 13 checklist items ticked (typically all infrastructure items: payment confirmed, client info, lead source identified+connected, alerts wired, sheet setup+shared, first summary sent, handover sent — items 1, 2, 3, 4, 5, 6, 7, 8, 9 in § 7 mapping).
2. Test enquiry has flowed end-to-end (lead source → operator alert → operator sheet → buyer daily summary).
3. Buyer-side daily summary has been received in WhatsApp + email at least once (the *"setup test"* counts).
4. Hand-over message sent and acknowledged (§ 9).
5. Activity-log timeline reflects the work (`payment_confirmed_manual` → `delivery_handoff` minimum, plus operator notes).
6. Cockpit status moved to `LIVE_MONITORING`.

If any of the above is missing at the 48-hour mark, **flag it honestly to the buyer**:

```text
Hi {first name}, quick update — setup window has run a few hours
over. {What's missing} is still pending because {one-line honest
reason}. I'll have it ready by {realistic ISO time}. Sorry for the
slip.
```

Per `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` and the *Above the Line* doctrine, **honesty about timing beats over-promising**. A pilot that takes 60 hours and is over-communicated is fine. A pilot that silently slips past 48 hours is a brand wound.

## 12. End-of-pilot recap (day 7)

The 7-day monitoring window does **not** auto-convert to monthly monitoring. At day 7, the operator must:

- [ ] Send a recap message (WhatsApp + email) summarising the week's numbers from the Sheet (count of enquiries, count replied, average response time, count followed up, count converted to viewing/quote/sale if known).
- [ ] Offer the monthly-monitoring conversation as a separate decision (no upsell pressure, no urgency framing).
- [ ] If the buyer says yes, generate a separate monthly pro-forma per `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`.
- [ ] If the buyer says no or *"let me think"*: leave the Sheet shared with view-only for one more week as a courtesy, then close the pilot in the cockpit (`MONITORING_DECLINED` or appropriate terminal status).

## Cross-references

- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — operator cockpit runbook (root operator doc).
- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — first-paid-pilots playbook (commercial side).
- `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` — qualification script (this PR).
- `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md` — outreach scripts (this PR).
- `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` — pricing guide (this PR).
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — *How to use the activity log* + *From paid pilot to setup* sections.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — managed-workflow framing.
