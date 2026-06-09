# AI Lead Rescue — Sales → Delivery Handoff

**Audience:** Anton, plus any future operator running the AI Lead Rescue pipeline. This is the **boundary doc** between *sales surface* (off-cockpit, prospect-list spreadsheet, cold-cadence) and *delivery surface* (on-cockpit, `/admin/lead-rescue/[id]`, paid pilot).

**Purpose:** keep the cockpit clean. The cockpit is a **delivery system**, not a CRM. Cold prospects, cadence sends, follow-ups, and undecided conversations live in the prospect-list spreadsheet. Only paying or actively-engaging prospects cross the line into the cockpit.

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF_V1 -->`

<!-- AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF_V1 -->

## 1. The two surfaces (mental model)

| Surface | Where it lives | What lives there | Who edits it |
|---|---|---|---|
| **Sales surface** | `artifacts/lead_rescue_first_25_prospect_template.csv` (operator's working Google Sheet copy) | Pre-intake prospects: cold targets, cadence sends, follow-ups, declines, referrals, *Replied — interested* but not yet submitted intake. | Anton (or future sales operator). Off-cockpit. |
| **Delivery surface** | `/admin/lead-rescue/[id]` (the cockpit) + `cmp_tickets` / `lead_rescue_intakes` (Postgres) | Active intake submissions and everything downstream: qualification, pro-forma, payment, 48-hour setup, 7-day monitoring, monthly monitoring (if accepted), close-out. | Anton (factory master). Soon: future operator with cockpit access. |

**Hard rule:** a prospect does **not** appear in the cockpit until they submit intake at `https://corpflowai.com/lead-rescue`. The Activity Log inside the cockpit is the *delivery* timeline for that intake; it is **not** a pre-intake outreach log. See `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § *Activity log lifecycle scope*.

## 2. When a prospect becomes "active"

A prospect is **active** when **any one** of the following is true:

- **They submit intake** at `https://corpflowai.com/lead-rescue`. (This is the canonical trigger; see § 3.)
- **They explicitly agree on a call** to a specific Option A or Option B and ask for a pro-forma. (Operator submits intake on their behalf? **No.** Operator asks the prospect to submit intake themselves; that's the friction-equivalent of confirming they want to be a paying client.)
- **They wire payment without submitting intake first** (rare; happens with very warm warm-network prospects). (Operator creates the cockpit record per § 3.2 *out-of-band path*.)

What does **not** make a prospect active:

- A reply of *"interesting, tell me more"* on cold outreach. That stays on the sales surface.
- A scheduled discovery call. Active starts after the call, not before.
- A *"can you send me a proposal?"* message. The proposal IS the page; if they read it and submit intake, they're active. Until then, they're a *Replied — interested* row in the spreadsheet.
- A reply to the warm prospect Action Pack message that doesn't include *"send the pro-forma"*. Still on the sales surface.

**Why this line matters:** the cockpit is the delivery system. Polluting it with cold/maybe prospects breaks the operator's signal. The setup checklist, status pipeline, and Activity Log all assume an active intake.

## 3. When to create / use a cockpit record

### 3.1 Standard path — buyer submits intake

This is the canonical path; ~95% of prospects should land here.

1. **Buyer submits intake** at `https://corpflowai.com/lead-rescue` (5 fields: business name, contact name, email, phone, message).
2. **The intake handler** creates a `cmp_tickets` row, writes a `lead_rescue_intakes` record, and emits the `corpflow.lead_rescue.intake_received` automation event (per `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § *How the internal notification event works*).
3. **Operator receives Telegram alert** with the `notification_text` payload + `admin_detail_url` linking to `/admin/lead-rescue/{id}`.
4. **Operator opens the cockpit record** within 2 business hours and runs the qualification flow per the operator runbook § *How to qualify a prospect*.
5. **Spreadsheet cross-link.** The matching row in `artifacts/lead_rescue_first_25_prospect_template.csv` updates: `Status = Active intake submitted`, `Notes = cockpit_id={id}`, `Next action = qualification within 2 business hours`.

### 3.2 Out-of-band path — buyer wires before submitting intake

Rare; only for very warm prospects who skip the form.

1. **Operator confirms wire received** in SBM Bank Mauritius account or international USD account.
2. **Operator asks the buyer** (over WhatsApp / email / call) to submit the intake form anyway, so the cockpit record exists. *"Quick admin step: please fill the intake form at https://corpflowai.com/lead-rescue with the same details — that's how my system creates your record. Same 5 fields you'd give me on a call."*
3. **If the buyer refuses or cannot submit** (e.g. accessibility issue, language barrier, busy executive): operator creates the record manually via the cockpit's *Manual intake* path if/when that exists, OR submits the intake on the buyer's behalf using buyer-confirmed details. Note in the first activity-log entry: *"Manual intake submitted by operator on behalf of buyer at buyer's request, {timestamp}, channel `manual`."*.
4. **Standard 48-hour setup window** then proceeds per `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 1.

**Hard rule for out-of-band path:** never create a cockpit record for a prospect who has not yet paid AND has not yet explicitly confirmed they're paying. *"Maybe later"* prospects stay on the sales surface, even if the operator has been speaking to them for weeks.

### 3.3 What does NOT belong in the cockpit (canonical exclusions)

Per `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § *Activity log lifecycle scope* — explicitly out of scope:

- Cold prospects who haven't replied.
- *Replied — interested* prospects who haven't submitted intake.
- Discovery calls that haven't yet happened.
- Pre-intake follow-ups (first follow-up, second follow-up).
- Prospects who explicitly declined.
- Prospects who referred us elsewhere but didn't engage themselves.
- Prospects in *re-engage in 60 days* status.

All of those live in the prospect-list spreadsheet. Pushing any of them into the cockpit forces the cockpit's status pipeline to invent meanings it wasn't designed for.

## 4. What to log in the Activity Log

Once a cockpit record exists, the Activity Log timeline lives at `console_json.client_view.activity` (per `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § *How to use the activity log*).

### 4.1 Required entries (in order)

The minimum entries for a successful pilot, in the order they typically land:

| # | Type | Channel | Trigger | Note shape (operator-side, brief) |
|---|---|---|---|---|
| 1 | `intake_received` | `web_form` (auto) | Buyer submits intake | Auto-generated by handler. Operator does not write this one. |
| 2 | `note` | `internal` | Operator opens cockpit record | *"Qualification started; confirmed buyer details vs intake form."* |
| 3 | `outbound_message` | `whatsapp` or `email` | Operator sends pro-forma | *"Pro-forma {AILR-2026-NNN} sent. Total USD {sum}. Awaiting wire."* |
| 4 | `payment_confirmed_manual` | `manual` | Wire clears | *"USD {sum} wire received {date} via SBM. Starting 48-hour setup window."* (No bank reference, no card data, no payer detail beyond initials.) |
| 5 | `note` | `internal` | Setup checklist progresses | One per material milestone (lead source confirmed; sheet shared; alerts wired). |
| 6 | `delivery_handoff` | `whatsapp` and `email` | Hand-over message sent | *"Hand-over message delivered. Pilot live. 7-day monitoring window: {ISO start} → {ISO end}."* |
| 7 | `note` | `internal` | Daily summary cycles | One per daily summary delivered (or one summary entry covering the whole 7 days, operator preference). |
| 8 | `note` | `internal` | End-of-pilot recap | *"Day-7 recap conversation completed. Decision: {monthly monitoring accepted / not accepted / pending}."* |

### 4.2 What NOT to put in the Activity Log

Per the operator runbook § *What not to store in activity entries* and § *What it is NOT*:

- ❌ **Pre-intake outreach.** Cold sends, follow-ups, declines — those land in the prospect-list spreadsheet.
- ❌ **Customer card / banking data.** Card numbers, CVV, OTPs, bank account details. (Doctrine forbids; security review.)
- ❌ **Customer / patient PII** beyond what the intake form captured. No clinical content. No financial-history. No government-ID numbers.
- ❌ **Cold-outreach copy variants used.** That metadata lives in the spreadsheet `Notes` column for the row, not the cockpit.
- ❌ **Speculative notes.** *"I think this prospect might want X"* — keep that in operator-private notes if useful; not in the audit-trail Activity Log.
- ❌ **Verbatim long buyer messages.** Summarise: *"Buyer asked about adding a second source; deferred to monthly monitoring conversation."* Don't paste the full chat.

### 4.3 Activity Log entries during the 48-hour setup

Per `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 7 *Operator checklist mapping* — every checklist item the operator ticks should have a 1-line activity-log entry of type `note`, channel `internal`. The mapping:

| Setup checklist item (cockpit) | Activity-log entry shape |
|---|---|
| `payment_confirmed_manual` | *"USD {sum} wire received {date} via {SBM/USD wire}. Starting 48-hour setup window."* |
| `client_info_collected` | *"Client info confirmed: working WhatsApp + email + named lead source + owner first name + timezone."* |
| `lead_source_selected` | *"Lead source: {channel}. Connected to operator-side workflow."* |
| `telegram_alert_wired` | *"Telegram alert active for new {channel} enquiries."* |
| `lead_log_created` | *"Google Sheet `{title}` created. Tab 1 view-only to buyer; Tab 2 operator-internal."* |
| `lead_log_shared` | *"Sheet shared with {buyer email}. View-only verified."* |
| `daily_summary_first_sent` | *"First daily summary delivered to {WhatsApp + email} at {time}."* |
| `handover_sent` | *"Hand-over message delivered. Buyer acknowledged at {timestamp}."* |
| `go_live_confirmed` | *"Go-live confirmed. 7-day monitoring window: {ISO start} → {ISO end}."* |

## 5. When to send the pro-forma

The pro-forma is the **last sales-side action**. Once it's sent, the cockpit owns the rest.

### 5.1 Pre-conditions (all must be true)

- **Cockpit record exists** (intake submitted; status is at `INTAKE_RECEIVED` or `QUALIFIED`).
- **Operator has run qualification** per `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § *How to qualify a prospect*. The five qualification questions have answers; the answer is *"yes, this is a fit"*.
- **Buyer confirmed Option A or Option B** (for the warm prospect; for cold prospects post-discovery-call, almost always Option A).
- **Buyer business address collected** (for Mauritius pro-forma, the address goes on the PDF; collected during qualification call per `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` § 2).
- **Operator capacity confirmed.** Operator has 48 hours of capacity in the 3 business days following expected wire-clearance. If not, slip honestly per `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 11.

### 5.2 Send the pro-forma

Use the wording in `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_ACTION_PACK.md` § 6 (Option A or B). PDF generation per `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md`.

Then in the cockpit:

- Add an `outbound_message` activity-log entry per § 4.1 row 3.
- Move the cockpit `next_action` field to: *"Awaiting wire. Confirm receipt and start 48-hour setup window. Target hand-over: {ISO date 48h after expected wire-clearance}."*
- **Do not** move status to `PAID_SETUP` yet — that only happens after the wire actually clears.

### 5.3 If wire doesn't clear within 5 business days

- Send one soft nudge over WhatsApp / email asking if there are any blockers (timezone, bank cutoff, accounting cycle, intermediary charges).
- If no response within another 5 business days: status moves to `STALLED — wire not received`. The cockpit record stays; the spreadsheet row updates to *Pro-forma sent — wire not received*. **Do not** auto-cancel; the buyer may still wire late. Re-engage in 30 days if still silent.

## 6. What counts as "paid pilot ready"

A buyer is **paid pilot ready** when **all** of the following are true:

| # | Condition | Verification |
|---|---|---|
| 1 | Wire has cleared the operator's account | Visible in SBM Bank Mauritius statement (warm-network) or international USD account. Operator records the wire date in the activity log. |
| 2 | Pro-forma details match what the buyer wired | Buyer name, total, currency. If the wired amount differs by >USD 5, ask the buyer for the discrepancy reason before starting setup. |
| 3 | Cockpit status moved to `PAID_SETUP` | Per the operator runbook § *When to move to PAID_SETUP*. |
| 4 | Setup checklist visible in cockpit | The 13-item checklist appears under `qualification_json.ai_lead_rescue_operator.setup_checklist`. |
| 5 | Buyer's named lead source is reachable | The operator can actually access the channel they're going to connect (Property24 inbox login, WhatsApp Business number, Facebook page admin access — whichever applies). |
| 6 | Operator has a clear 48-hour build window | No conflicts in the next 3 business days that would prevent the standard checklist from running. |
| 7 | Telegram bot operational | The operator's Telegram is online; alerts will land. |
| 8 | Activity-log entries 1 + 2 + 3 + 4 from § 4.1 are present | At minimum: intake_received, qualification note, outbound_message (pro-forma), payment_confirmed_manual. |

If any of the 8 is missing, the buyer is **not yet paid-pilot-ready**, regardless of whether the cockpit status reads `PAID_SETUP`. Operator fixes the missing piece before kicking off the setup window.

## 7. What Cursor / future operator needs after payment

This section answers: *what does the next operator need to do, in order, the moment the wire clears?*

### 7.1 Immediately (within 30 minutes of wire clearance)

- [ ] **Confirm wire** in SBM / USD account. Note the wire date + buyer name.
- [ ] **Open cockpit record** at `/admin/lead-rescue/{id}`.
- [ ] **Move status to `PAID_SETUP`** (this triggers the setup checklist UI per the operator runbook).
- [ ] **Add `payment_confirmed_manual` activity-log entry** per § 4.1 row 4.
- [ ] **Send buyer-side WhatsApp confirmation:** *"Wire received. Starting your 48-hour setup window now. I'll message you here when each piece is ready, and send a hand-over summary at the end."* (Same template as `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 1.)
- [ ] **Update the spreadsheet row** to `Status = PAID_SETUP`, `Notes = wire received {date}; cockpit_id={id}`.

### 7.2 Within first 4 hours

- [ ] **Run § 2 of the paid-pilot onboarding** runbook (collect remaining client info: working WhatsApp, working email, named lead source, owner first name, timezone). Use one structured WhatsApp / email message — not piecemeal.
- [ ] **Run § 4** — Telegram alert setup.
- [ ] **Run § 5** — Google Sheet lead log creation, share with buyer view-only.
- [ ] **Run § 6** — Daily summary configuration (operator-side cron / scheduled Telegram message at the buyer's preferred time).
- [ ] **Test enquiry** — submit a test enquiry through the connected lead source; confirm Telegram alert fires, Sheet row appears, daily summary template renders.

### 7.3 Within first 48 hours

- [ ] **Run § 9 hand-over checklist** end-to-end.
- [ ] **Send hand-over message** per the runbook § 9 template (WhatsApp + email).
- [ ] **Wait for buyer acknowledgement** (a thumbs-up reaction is enough).
- [ ] **Run § 10 go-live checklist** — flip cockpit status to `LIVE_MONITORING`.
- [ ] **Schedule the 7 daily summaries** in the operator's calendar.
- [ ] **Schedule the day-7 end-of-pilot recap call** in the buyer's calendar (15 minutes; same shape as the discovery call).

### 7.4 During the 7-day monitoring window

- [ ] **Daily summary** delivered at the buyer's preferred time, every day for 7 days.
- [ ] **Real enquiries** flow end-to-end (lead source → Telegram alert → Sheet → daily summary).
- [ ] **One activity-log `note` entry per day** confirming the summary was delivered (or one entry covering the whole 7 days at end-of-window — operator preference; consistency matters more than format).
- [ ] **No customer-facing automated replies.** Operator does not respond on the buyer's behalf to enquiries; the buyer responds.
- [ ] **No new sources connected mid-window.** If the buyer asks for a second source, the answer is per `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` § 2.4: *"Pilot intentionally connects one source. We can add a second during monthly monitoring if it lands well."*

### 7.5 At day 7

- [ ] **End-of-pilot recap call** (15 min). Three honest questions:
  1. Did enquiries land daily?
  2. Did follow-ups improve?
  3. Want to continue with monthly monitoring at USD 99 / month?
- [ ] **Activity-log `note` entry** with the recap outcome (decision: monthly monitoring accepted / not accepted / pending).
- [ ] **If monthly monitoring accepted:** status moves to `MONTHLY_ACTIVE`. New monthly invoice cycle begins; same manual pro-forma path. (See operator runbook § *How to record monthly monitoring accepted*.)
- [ ] **If not accepted:** status moves to `PILOT_COMPLETED`. Cockpit record stays for audit; operator notes any reason given. Re-engage in 90 days only with new news.
- [ ] **Spreadsheet row** updates to the matching final state.

### 7.6 What Cursor / future operator does NOT do

- ❌ Send customer-facing automated replies.
- ❌ Connect a second lead source mid-pilot.
- ❌ Take any action that touches buyer card / banking data.
- ❌ Build a new public surface for this buyer (no client-specific landing page in the pilot scope; that's the website add-on, separate offer).
- ❌ Promise anything that isn't already in the operator runbook + pilot onboarding doc.
- ❌ Modify the cockpit record's `console_json` outside the documented update paths.

## 8. Sales → Delivery decision tree (one-glance reference)

```text
Cold prospect on the spreadsheet.
└── Cold message sent.
    └── Reply?
        ├── No reply.
        │   └── First follow-up sent (cold pack § 4).
        │       └── Reply?
        │           ├── No reply.
        │           │   └── Second follow-up sent (cold pack § 5).
        │           │       └── Reply?
        │           │           ├── No reply → Status = Closed - no reply. End.
        │           │           ├── Declined → Status = Closed - declined. End.
        │           │           └── Interested → discovery call scheduled.
        │           ├── Declined → Close-the-loop (cold pack § 6). End.
        │           └── Interested → discovery call scheduled.
        ├── Declined → Close-the-loop (cold pack § 6). End.
        └── Interested → discovery call scheduled.

Discovery call scheduled.
└── Call happens.
    └── Outcome?
        ├── Not a fit → Decline politely (Action Pack § 7.3). End.
        ├── Wants Option A or B → Send Action Pack proposal message.
        └── "Send me a proposal first" → Action Pack § 7.1 reply (the page IS the proposal).

Proposal sent (Action Pack § 5).
└── Buyer submits intake at /lead-rescue.
    │
    │  ←── HANDOFF LINE: SALES SURFACE ENDS HERE.
    │
    └── Cockpit record auto-created at /admin/lead-rescue/{id}.
        └── Operator runs qualification (Operator Runbook § How to qualify).
            └── Pro-forma sent (Action Pack § 6 / Pricing Guide § 5).
                └── Wire?
                    ├── No wire in 5 business days → Soft nudge.
                    │   └── Still no wire in 10 business days → Status = STALLED.
                    └── Wire received → § 7.1 immediate actions.
                        └── 48-hour setup window (Pilot Onboarding § 1-§ 9).
                            └── Hand-over message sent + acknowledged.
                                └── Status = LIVE_MONITORING.
                                    └── 7-day pilot.
                                        └── Day-7 recap.
                                            ├── Monthly monitoring accepted → Status = MONTHLY_ACTIVE.
                                            └── Not accepted → Status = PILOT_COMPLETED.
```

The **HANDOFF LINE** is the architectural boundary. Sales operators / spreadsheet activity stays above the line. Cockpit records / Activity Log / paid-pilot artefacts stay below.

## 9. Handoff types — explicit transition checklists

The decision tree in § 8 names the architectural boundary. This section breaks out the **three** specific handoff transitions an operator runs in week 1 and beyond, so each transition has a checklist rather than relying on memory.

### 9.1 Handoff: cold prospect list → cockpit

**Trigger:** the prospect submits intake at `https://corpflowai.com/lead-rescue` (or, in rare cases, takes the out-of-band path in § 3.2).

**Sales-surface side (the spreadsheet — `artifacts/lead_rescue_mauritius_property_first_25_template.csv`):**

- [ ] **Locate the prospect's row.** Search by Business name + Contact person.
- [ ] **Update `Status`** → `Active intake submitted`.
- [ ] **Update `Notes`** → append: *"Intake received {ISO date}; cockpit_id={id}; channel={whichever cold channel they replied through}."*
- [ ] **Update `Next action`** → *"Operator qualification within 2 business hours"*.
- [ ] **Do NOT delete the spreadsheet row.** It stays as the audit trail of the cold cadence that produced this paying prospect.

**Delivery-surface side (the cockpit — `/admin/lead-rescue/{id}`):**

- [ ] **Open the cockpit record** within 2 business hours of the Telegram alert.
- [ ] **Run the qualification flow** per `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § *How to qualify a prospect*.
- [ ] **Add `note` activity-log entry**, channel `internal`: *"Qualification started; cold-cadence source = {channel}; spreadsheet row reference = `lead_rescue_mauritius_property_first_25_template.csv` row {N}."*. (No personal data beyond what's on intake; no copy-paste of the buyer's reply chain.)
- [ ] **Continue to § 5 *When to send the pro-forma*** in this doc once qualification clears.

**What does NOT cross the line:**

- ❌ Cold-cadence message variants used (those stay in the spreadsheet `Notes` column).
- ❌ Pre-intake follow-up dates / second-follow-up timing (the cockpit's first activity-log entry is the qualification note; not the cold-cadence chronology).
- ❌ The full text of cold-cadence replies (summarise; don't paste).

### 9.2 Handoff: warm prospect call → proposal

**Trigger:** Anton has finished the 5-question discovery (`docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_ACTION_PACK.md` § 1) and the warm prospect has explicitly agreed to either Option A or Option B.

**On the call (warm prospect → conversation closure):**

- [ ] **Confirm Option A or Option B** — get a clear *"yes"*. *"Maybe, let me think"* is **not** a yes; do not proceed to proposal until it's a yes.
- [ ] **Confirm decision-maker** — Action Pack § 1 Q5. If a second decision-maker exists, defer the proposal until they're on the call.
- [ ] **Confirm intake URL** — Anton tells the prospect the next step is to fill `https://corpflowai.com/lead-rescue` and mention "Option {A/B}" in the message field.
- [ ] **Confirm timeline expectation** — *"I'll send a pro-forma within 2 business hours of receiving your intake."*

**Within 2 business hours of the call (sales-surface side):**

- [ ] **Locate the warm prospect's row** in `artifacts/lead_rescue_mauritius_property_first_25_template.csv` (Warm/cold = Warm; this is the row from Day 1 of the 7-day plan).
- [ ] **Update `Status`** → `Replied — interested`.
- [ ] **Update `Notes`** → append: *"Discovery call completed {ISO date}; chose Option {A/B}; awaiting intake submission."*.
- [ ] **Send the proposal message** verbatim from `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_ACTION_PACK.md` § 5 (paste-ready), via the channel the warm prospect used.

**When the warm prospect submits intake:**

- [ ] Trigger 9.1 (handoff cold list → cockpit) — same checklist; the only difference is `Notes` mentions *Warm-network referral*.
- [ ] **Add an extra activity-log `note` entry**, channel `internal`: *"Warm-network referral; introducer = {first name only, or 'direct'}; pre-intake conversation summary = {one sentence}."*.

**What does NOT cross the line (warm version):**

- ❌ Personal-relationship metadata (e.g. *"met at coffee shop, mutual friend X"*) in the cockpit. That stays in operator-private notes.
- ❌ The full text of the discovery call. Summarise: *"Warm prospect chose Option B for villa-rental site + pilot."*
- ❌ Anton's voice memos / call recordings — the cockpit is text-only.

### 9.3 Handoff: website add-on → delivery

**Trigger:** the warm prospect has chosen Option B (lead-ready website + AI Lead Rescue) per the warm-prospect website add-on doc (`docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_WEBSITE_ADDON.md`).

This handoff is **dual** — it has a website-build phase **before** the AI Lead Rescue pilot phase. Both phases share the same cockpit record.

**Sales side → Pre-build:**

- [ ] **Pro-forma sent and wire received** for the combined Option B amount (USD 600 / 900 / 1 200 / 1 500 band per `AI_LEAD_RESCUE_WARM_PROSPECT_WEBSITE_ADDON.md` § 9.2).
- [ ] **Status moves to `PAID_SETUP`** in the cockpit, but operator notes: *"Website-build window precedes AI Lead Rescue 48-hour setup."*
- [ ] **Add `note` activity-log entry**, channel `internal`: *"Option B engagement. Website build window: {ISO start} → {ISO start + 5 working days}. AI Lead Rescue 48-hour setup begins after website goes live. Combined operational completion gate per AI_LEAD_RESCUE_WARM_PROSPECT_WEBSITE_ADDON.md § 12.3."*.

**Build phase (Days 1–5 of the website add-on plan):**

- [ ] **Operator runs the build** per `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_WEBSITE_ADDON.md` § 12.1 (9-point website-build "done" gate).
- [ ] **Activity-log entries during build** — one `note` per material milestone:
  - *"Website draft v1 sent to buyer at {timestamp}; revision window opens."*
  - *"Buyer revisions received {timestamp}; consolidated into single pass."*
  - *"Website draft v2 sent at {timestamp}; awaiting acknowledgement."*
  - *"Website live at {production URL} at {timestamp}; HTTP 200; mobile rendering verified iOS + Android; form posts into intake handler end-to-end."*

**Transition to AI Lead Rescue 48-hour setup:**

- [ ] **Add `note` activity-log entry**: *"Website build complete (9/9 gate). Starting AI Lead Rescue 48-hour setup window. Form on the new website is the connected lead source for the pilot."*.
- [ ] **The AI Lead Rescue 48-hour setup** then runs per `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 1, with the new website form already wired as the named lead source.
- [ ] **`lead_source_selected` checklist item** is set to: *"Website form (built under this engagement) at {production URL}/contact"*.

**Combined operational completion gate (per the website add-on doc § 12.3):**

- [ ] Website-build "done" (§ 12.1) — 9/9.
- [ ] AI Lead Rescue 48-hour "done" (§ 12.2) — at least 8/13 setup-checklist items.
- [ ] Buyer-side daily summary received in WhatsApp + email at least once.
- [ ] Hand-over message sent + acknowledged.
- [ ] **`COMPLETE` only when this combined gate passes on the buyer's actual production URL** — not a preview deployment.

**What does NOT cross the line (Option B version):**

- ❌ Website source code, design files, copy drafts in the cockpit `console_json`. Those live in the operator's private artefacts; the cockpit only references the production URL.
- ❌ Domain registrar credentials. The buyer owns the domain in their own registrar; the operator does not store registrar passwords.
- ❌ Hosting credentials beyond the operator's own Vercel account. If the website is on the operator's Vercel account, the operator owns deploy access; the buyer does not.

## 10. Open questions / not-yet-decided

These are flagged here so they're not silently invented in the cockpit:

1. **Manual intake creation by operator.** Currently the canonical path is buyer-submitted. Out-of-band path (§ 3.2) defers to a buyer-self-submission ask. A *true* operator-initiated manual intake flow would need:
   - a separate cockpit UI path,
   - explicit `intake_source = manual_operator` audit field,
   - operator authorisation gate (factory master only).
   **Status:** not built. **Trigger to build:** if more than 3 buyers pay before submitting intake in the first 25, build it. Until then, rely on the *please submit the intake form* friction-equivalent in § 3.2 step 2.

2. **Bulk import of cold prospects into a CRM.** Out of doctrine for first-paid-pilots. Not built. Cold prospects stay on the spreadsheet.

3. **CRM tooling.** Per `docs/strategy/CORPFLOWAI_CRM_REUSE_AUDIT_V1.md` and the integration roadmap, CRM is medium-term backlog at most. **Do not** invent a CRM-shaped path between sales and delivery.

4. **Auto-handoff to a future second operator.** Currently Anton is the only operator. When a second operator is onboarded, this doc gets revised to specify auth + activity-log attribution per operator. **Status:** not built; one-operator world today.

## Cross-references

- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — cockpit operations + Activity Log lifecycle scope (§ *Activity log lifecycle scope*).
- `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` — 48-hour setup window detailed runbook.
- `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_ACTION_PACK.md` — warm-prospect call-time crib sheet (proposal + pro-forma wording).
- `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_WEBSITE_ADDON.md` — long-form Option B reasoning + combined operational completion gate (referenced from § 9.3).
- `docs/sales/AI_LEAD_RESCUE_MAURITIUS_PROPERTY_OUTREACH_PACK.md` — active cold-cadence pack for the property niche (referenced from § 9.1).
- `docs/sales/AI_LEAD_RESCUE_COLD_OUTREACH_PACK.md` — niche-agnostic cold cadence template (template; not the active pack).
- `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` — canonical pricing + manual pro-forma path.
- `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` — 15-minute discovery script.
- `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` — pro-forma PDF template + buyer-detail capture.
- `artifacts/lead_rescue_mauritius_property_first_25_template.csv` — active sales-surface spreadsheet for the property niche.
- `artifacts/lead_rescue_first_25_prospect_template.csv` — niche-agnostic spreadsheet template (kept for second-niche expansion).
- `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_PROPERTY_7_DAY_ACTION_PLAN.md` — active week-1 day-by-day usage of this handoff line.
- `docs/marketing/AI_LEAD_RESCUE_FIRST_7_DAYS_EXECUTION_CHECKLIST.md` — niche-agnostic week-1 template.
- `docs/strategy/AI_LEAD_RESCUE_DENTIST_AGENT_PARKING_LOT.md` — parked future second niche; not active.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — triggers when handing off changes the trust boundary.

## Delivery reality

Docs-only. **PARTIAL** until reviewed + merged. **COMPLETE on merge** because no runtime / customer-visible flow changes. Operational completion of any specific buyer's pilot is decided per pilot, on the buyer's actual production behaviour, not on this PR.
