# AI Lead Rescue — Mauritius Property 7-Day Action Plan

**Audience:** Anton, day-by-day, for the first launch week with **Mauritius property operators** as the active cold niche.

**Purpose:** operational, not theoretical. Every day has 3–6 specific items, plus a clear *what Anton does* / *what Cursor or operator can prepare* / *what can be automated* / *what must remain human* split.

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_MAURITIUS_PROPERTY_7_DAY_ACTION_PLAN_V1 -->`

<!-- AI_LEAD_RESCUE_MAURITIUS_PROPERTY_7_DAY_ACTION_PLAN_V1 -->

## Ground rules (read once, then internalise)

- **Active niche:** Mauritius property operators (real estate agencies, property managers, short-term rentals, villa rentals, serviced apartments, land sales, commercial property).
- **One prospect at a time.** Anton sends each cold message personally; no bulk tooling.
- **5 cold messages per day, max.**
- **Segment balance.** Aim for ≥3 prospects per property segment by Day 5; 7 segments × ~3-4 = 21-28 prospects.
- **Geographic balance.** Spread across North / West / East / South coastal zones plus Centre and Port Louis.
- **No paid ads. No bulk-spam tooling. No scraping.** Forbidden by doctrine.
- **Live URL is the page.** All paths lead to `https://corpflowai.com/lead-rescue`.
- **Spreadsheet is `artifacts/lead_rescue_mauritius_property_first_25_template.csv`** (Anton's working copy lives in Google Sheets).
- **Cockpit boundary.** Cold prospects do NOT get a `/admin/lead-rescue/{id}` cockpit record until they submit intake. See `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md`.
- **End-of-day log.** Each day ends with one line in `artifacts/chat_history.md` — *"{date}: {N} messages sent, {N} replies, {key signal of the day}"*.

## Roles legend (used in each day's plan)

| Role | What this means in practice |
|---|---|
| **Anton** | Hands-on send / call / decision. Cannot be delegated in week 1. |
| **Cursor / operator can prepare** | A docs-only or template-shaped task that Cursor (or a future operator) can prepare in advance — Anton then reviews and either approves the artifact or edits it before use. |
| **Can be automated** | A repeatable mechanical step that could be automated *eventually*. In week 1 it stays manual; this column flags it for the post-pilot automation backlog. |
| **Must remain human** | The doctrine line: this step never gets automated, even after pilots prove out. Sales conversation, judgement calls, decline scripts. |

## Day 1 — Warm prospect message + create first 25 property prospect list

Goal: send the warm prospect message (Action Pack § 2 or § 3) and identify 25 Mauritius property prospects.

### Day 1 checklist

- [ ] **Open `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_ACTION_PACK.md` § 1** and run the 5-question discovery with the warm prospect (call or WhatsApp). 30 minutes max.
- [ ] **Send Option A or Option B message** in the same conversation, immediately after the discovery. Don't sleep on it.
- [ ] **Open the property prospect spreadsheet** (Google Sheets copy of `artifacts/lead_rescue_mauritius_property_first_25_template.csv`). Replace the 8 placeholder rows.
- [ ] **List 25 Mauritius property prospects** with at minimum: *Business name, Segment, Location, Website / Facebook / Instagram, WhatsApp visible, Contact person (where known), Why they may lose leads, Likely enquiry channels, Warm/cold = Cold*.
- [ ] **Segment-balance check:** at least 3 in real estate agency, 3 in property manager, 3 in short-term rental, 3 in villa rental, 2 in serviced apartment, 2 in land sales, 2 in commercial property. (≈ 18 minimum across 7 segments; remaining 7 fill any segment.)
- [ ] **Geographic-balance check:** spread across 4-6 zones (North / West / East / South / Centre / Port Louis).
- [ ] **Write one line in `artifacts/chat_history.md`**: *"{date}: warm prospect message sent (Option {A/B}); 25-property-prospect list assembled (segments: {breakdown}, zones: {breakdown}); cold cadence starts {Day 2 date}."*

### Day 1 roles

| Step | Anton | Cursor / operator can prepare | Can be automated | Must remain human |
|---|---|---|---|---|
| Run 5-Q discovery with warm prospect | ✓ | — | — | ✓ |
| Send Option A / B message | ✓ | — | — | ✓ |
| Build 25-property-prospect list | ✓ | Spreadsheet column structure (already in template); a non-binding *"shapes I'd suggest"* annotation file in `artifacts/` | Future: pull operator-curated public-listing data into the spreadsheet shape (pilot 5+ only) | Decision of *who is on the list* — this is a market-judgement call |
| End-of-day chat_history line | ✓ | — | Future: a CLI helper that appends a line | Decision of what counts as a *key signal* |

### Day 1 do-NOT list

- ❌ Send any cold message today.
- ❌ Buy a lead-list / scraped database.
- ❌ Edit the public `/lead-rescue` page (out of scope this week).
- ❌ Open new strategy doctrine work.

## Day 2 — Send first 5 cold messages + create first property-sector social post

Goal: ship the first cold cadence batch and prepare one organic social post that pairs with the page.

### Day 2 checklist

- [ ] **Pick 5 prospects** from the spreadsheet — covering at least 3 different segments (e.g. 1 real estate agency, 1 property manager, 1 short-term rental, 1 villa rental, 1 land sales).
- [ ] **For each prospect**, pick:
  - the matching hook from `docs/sales/AI_LEAD_RESCUE_MAURITIUS_PROPERTY_OUTREACH_PACK.md` § 3 (A / B / C / D / E),
  - the matching channel from § 4 (WhatsApp / Email / Facebook Messenger / Instagram DM / LinkedIn).
- [ ] **Send personally.** No copy-paste-blast — replace `{first name}`, `{region}`, `{Belle Mare / North Coast / etc.}` per prospect.
- [ ] **For each send**, fill in the spreadsheet:
  - `First message sent date` = today.
  - `Follow-up date` = today + 3 working days.
  - `Status` = *Sent*.
  - `Notes` = which hook + channel was used (e.g. *"Hook D / Instagram DM"*).
- [ ] **Create one property-sector social post** for Anton's own LinkedIn profile, drafted from `docs/marketing/AI_LEAD_RESCUE_MARKETING_ASSET_PACK.md` § *LinkedIn posts*. Subject: *"3 silent ways property enquiries leak in Mauritius"*. Plain text, no emoji, no links inside the post body (link in first comment).
- [ ] **Save the post draft** under `artifacts/visual-assets/lead-rescue-property/` (or sibling) — file naming `lead-rescue-property-social-post-{ISO date}.md`. **Do not publish from here**; Anton publishes from his own LinkedIn.
- [ ] **Add one line to `artifacts/chat_history.md`**: *"{date}: 5 cold property sends (segments: {breakdown}); social post draft saved; warm prospect status = {their reply status}."*

### Day 2 roles

| Step | Anton | Cursor / operator can prepare | Can be automated | Must remain human |
|---|---|---|---|---|
| Pick 5 prospects | ✓ | — | — | ✓ judgement |
| Pick hook + channel per prospect | ✓ | — | — | ✓ judgement |
| Personalise each message | ✓ | Pre-fill `{first name}` / `{region}` placeholders into a per-prospect Markdown file | Future: prompt-LLM scaffolding to suggest personalisation; operator approves before send | ✓ Final review + send |
| Update spreadsheet | ✓ | Provide a 1-line snippet to paste into each row | Future: a helper script that writes rows | ✓ Decision of `Status` value |
| Draft social post | ✓ approves | Cursor can produce a first draft from the marketing asset pack template | Future: post-publish, an analytics polling job | ✓ Final approval + publish from Anton's own profile |

### Day 2 do-NOT list

- ❌ Send the same cold message verbatim to >1 prospect.
- ❌ Send to >5 prospects.
- ❌ Publish the social post from a corporate page (Anton's personal profile carries trust; not a brand-only post).
- ❌ Add a paid promotion to the post.

## Day 3 — Review replies + send next 5 + generate one workflow visual

Goal: actually look at what's happening with Day 2 sends; ship the second batch; create one workflow visual asset.

### Day 3 checklist

- [ ] **Review every Day 2 send.** For each, check the channel for any reply (WhatsApp read receipts, Instagram DM seen, LinkedIn message read, email open if visible). Update `Status` accordingly: *Replied — interested / Replied — declined / Replied — referred / No reply yet*.
- [ ] **Reply personally to every interested reply** — schedule a 15-minute discovery call using `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`. Don't stack discovery calls back-to-back; leave 30 minutes between.
- [ ] **For declined replies**, send the close-the-loop message from `docs/sales/AI_LEAD_RESCUE_MAURITIUS_PROPERTY_OUTREACH_PACK.md` § 7.1.
- [ ] **Send next 5 cold messages.** Same balance discipline as Day 2; pick a different hook variant for at least 2 of the 5 to get hook-comparison signal.
- [ ] **Update spreadsheet** for all 5 new sends.
- [ ] **Generate one workflow visual** using the prompts in `docs/marketing/AI_LEAD_RESCUE_GOOGLE_ASSET_PROMPTS.md` — pick the *workflow diagram* prompt (the *"how the pilot works"* image: capture → alert → daily summary → follow-up board). Use Google AI tools per `docs/strategy/GOOGLE_ACCELERATION_LANE.md`.
- [ ] **Save the chosen visual** under `artifacts/visual-assets/lead-rescue-property/` — file naming `lead-rescue-property-workflow-diagram-{ISO date}.png`. Manual quality check: no fake testimonials, no client logos that aren't ours, no revenue numbers, no AI-bot framing.
- [ ] **Add one line to `artifacts/chat_history.md`**: *"{date}: cumulative {N}/10 cold property sends; {N} replies; {N} interested; {N} declined; workflow visual draft saved."*

### Day 3 roles

| Step | Anton | Cursor / operator can prepare | Can be automated | Must remain human |
|---|---|---|---|---|
| Review channel inboxes for replies | ✓ | — | Future: per-channel polling (WhatsApp Business API, IG DMs) into a unified operator inbox | ✓ judgement on intent of reply |
| Schedule discovery calls | ✓ | Cursor can draft the calendar-invite text | Future: a calendar-bot that proposes slots | ✓ Anton owns the calendar |
| Send second batch of 5 | ✓ | Per-prospect personalisation drafts | Future: scaffolding | ✓ Send from Anton's accounts |
| Generate workflow visual | ✓ approves | Cursor runs the Google prompt and saves output | Future: prompt-pack auto-runs on a schedule | ✓ Quality check + brand review before any external use |

### Day 3 do-NOT list

- ❌ Stack two discovery calls back-to-back; leave breathing room.
- ❌ Generate visuals for niches we are NOT targeting this week (clinics / contractors are out of scope).
- ❌ Publish visuals externally without Anton's review.

## Day 4 — Follow up warm prospect + follow up first 5 if appropriate

Goal: maintain warm-prospect momentum; send the first follow-up to Day 2 cold prospects who haven't replied yet.

### Day 4 checklist

- [ ] **Warm prospect check.**
  - **Replied + intake submitted** → jump to `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` § *When to send pro-forma*. Pro-forma is today's urgent action.
  - **Replied + still interested** → answer their specific question. Do not chase a third time.
  - **Silent for 48 hours** → send the § 7 follow-up from the Action Pack. **Once.**
- [ ] **For each Day 2 cold prospect** whose `Follow-up date` is today or earlier AND no reply: send the first follow-up from `docs/sales/AI_LEAD_RESCUE_MAURITIUS_PROPERTY_OUTREACH_PACK.md` § 5. **One follow-up only.**
- [ ] **Update spreadsheet** with `Status = No reply — first follow-up sent` and a new `Follow-up date` (today + 7 working days).
- [ ] **For any *Replied — interested* prospects from Day 3:** confirm discovery-call times where they haven't yet been confirmed.
- [ ] **Add one line to `artifacts/chat_history.md`**: *"{date}: warm prospect status = {state}; first follow-ups sent to {N} cold prospects; cumulative replies: {N}/10."*

### Day 4 roles

| Step | Anton | Cursor / operator can prepare | Can be automated | Must remain human |
|---|---|---|---|---|
| Warm prospect follow-up | ✓ | — | — | ✓ |
| Cold first follow-ups | ✓ | Per-prospect 1-line note for the spreadsheet | Future: follow-up scheduler | ✓ Send from Anton's accounts |

### Day 4 do-NOT list

- ❌ Chase the warm prospect a third time.
- ❌ Send a second follow-up today (only first follow-up; second is Day 6).
- ❌ Send any new first-touch cold messages today (Day 4 = follow-up day).

## Day 5 — Send next 5 + prepare one-page flyer PDF copy

Goal: third batch of 5 cold messages; ship the copy of a one-page flyer Anton can hand to anyone who asks *"do you have something I can read?"*.

### Day 5 checklist

- [ ] **Send next 5 cold messages.** Cumulative = 15/25. Same balance discipline. Use a hook + channel combination not yet used (e.g. if Day 2 + Day 3 covered Hook A WhatsApp + Hook D Instagram + Hook E LinkedIn, today try Hook B Email + Hook C Facebook Messenger).
- [ ] **Update spreadsheet** for all 5 new sends.
- [ ] **Prepare one-page flyer PDF copy** — Markdown / Google Doc draft — using `docs/marketing/AI_LEAD_RESCUE_MARKETING_ASSET_PACK.md` § *Flyer copy*. Single A4 / Letter page, structured as: Headline → Buyer pain (3 lines) → How it works (3 steps) → What it costs (USD 150) → What it's NOT → Single CTA → Page URL → Sender contact.
- [ ] **Save the flyer copy draft** under `artifacts/visual-assets/lead-rescue-property/` — file naming `lead-rescue-property-flyer-copy-{ISO date}.md`. **Plain Markdown** for now; PDF rendering happens later in production discipline (do NOT ship a PDF this week).
- [ ] **Reply to every interested prospect** from Day 4 follow-ups.
- [ ] **Add one line to `artifacts/chat_history.md`**: *"{date}: +5 cold sends (cumulative 15/25); flyer copy draft saved; cumulative replies: {N}/15."*

### Day 5 roles

| Step | Anton | Cursor / operator can prepare | Can be automated | Must remain human |
|---|---|---|---|---|
| Send third batch of 5 | ✓ | Per-prospect personalisation drafts | Future: scaffolding | ✓ Send |
| Draft flyer copy | ✓ approves | Cursor produces the Markdown first draft | Future: layout / PDF rendering pipeline | ✓ Final approval; Anton chooses what's on the page |

### Day 5 do-NOT list

- ❌ Render and distribute the flyer as a real PDF this week — it's copy only. Distribution is a later decision tied to production verification.
- ❌ Add fake testimonials to the flyer to "round it out".
- ❌ Add a paid-ads variant of the flyer.

## Day 6 — Second follow-ups + review niche response quality

Goal: clean cadence pass — second follow-up where due; honest signal review on whether property is converting.

### Day 6 checklist

- [ ] **Send second follow-up** to anyone who:
  - received the first follow-up on Day 4 (or earlier),
  - did not reply,
  - is past 7 working days from the original Day 2 send.
  Use `docs/sales/AI_LEAD_RESCUE_MAURITIUS_PROPERTY_OUTREACH_PACK.md` § 6 verbatim.
- [ ] **For all post-second-follow-up prospects who don't reply by end of Day 6:** mark `Status = Closed - no reply`. **Do not send a third follow-up.**
- [ ] **Review niche response quality.** In the spreadsheet, count:
  - Reply rate by **segment** (real estate agency vs property manager vs short-term rental vs villa rental vs serviced apartment vs land sales vs commercial property).
  - Reply rate by **channel** (WhatsApp vs Email vs Facebook Messenger vs Instagram DM vs LinkedIn).
  - Reply rate by **hook** (A vs B vs C vs D vs E).
  - Reply rate by **zone** (North vs West vs East vs South vs Centre vs Port Louis).
- [ ] **Note the top 1–2 segments / channels / hooks** in the spreadsheet `Notes` column at the row level — do **not** write a new doctrine doc.
- [ ] **Add one line to `artifacts/chat_history.md`**: *"{date}: cumulative {N}/15 cold property sends; {N} second follow-ups sent; best segment = {segment}; best channel = {channel}; best hook = {hook letter}; warm prospect status = {state}."*

### Day 6 roles

| Step | Anton | Cursor / operator can prepare | Can be automated | Must remain human |
|---|---|---|---|---|
| Send second follow-ups | ✓ | — | Future: scheduler | ✓ Send |
| Niche response review | ✓ | Cursor can pre-compute the segment / channel / hook / zone aggregates from the spreadsheet and post the result | Future: nightly aggregate report | ✓ Decision of *what to lean into* |

### Day 6 do-NOT list

- ❌ Send a third follow-up to anyone (forbidden by cadence rules).
- ❌ Pivot away from a segment after only 3 sends; need 5+ for honest signal.
- ❌ Expand to non-property niches.

## Day 7 — Decide: continue, adjust message, or move to second niche

Goal: end the week with **one clear written decision**. Onboard any serious leads end-to-end. No new outreach today.

### Day 7 checklist

- [ ] **Snapshot the spreadsheet** at end of Day 6:
  - Total cold sends: 15/25 (or up to 25/25 if Day 5 / Day 6 capacity allowed).
  - Replies (any kind): N.
  - Interested replies: N.
  - Discovery calls scheduled: N.
  - Discovery calls completed: N.
  - Intakes submitted: N.
  - Pro-formas sent: N.
  - Wires received: N.
- [ ] **Onboard any serious leads end-to-end.**
  - **Intake submitted but no pro-forma sent yet** → send pro-forma per `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_ACTION_PACK.md` § 6 (Option A or Option B as applicable).
  - **Pro-forma sent but no wire yet** → soft nudge via the channel they used for intake; one nudge only.
  - **Wire received** → status moves to `PAID_SETUP`; the 48-hour setup window starts. Open `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` and run the checklist.
- [ ] **Make ONE written decision about week 2.** Three explicit options; pick exactly one and write it in `artifacts/chat_history.md`:

  1. **CONTINUE — same property niche, same cadence.** Day 6 signal supports the property niche; ship the remaining cold messages in week 2 + run discovery calls + onboard wires.
  2. **ADJUST MESSAGE.** Property niche is right but the dominant message is wrong. Day 6 review showed one segment / channel / hook clearly outperforming; week 2 leans into that; other variants stay paused. Rewrite the active message in `docs/sales/AI_LEAD_RESCUE_MAURITIUS_PROPERTY_OUTREACH_PACK.md` § 4 if needed (small edit; document in `artifacts/chat_history.md`).
  3. **MOVE TO SECOND NICHE.** Property reply rate is materially below expectation after 15+ sends across segments / channels / hooks. Possible second niche is the **dentist lane** in `docs/strategy/AI_LEAD_RESCUE_DENTIST_AGENT_PARKING_LOT.md`. **Activating that lane requires the parked-lot doc's preconditions to be met first** — do not improvise a second niche on Day 7.

- [ ] **Write the decision in `artifacts/chat_history.md`** under the current month: *"{date}: Week 1 close. Sends: {N}/25. Replies: {N}. Interested: {N}. Calls scheduled: {N}. Pro-formas: {N}. Wires: {N}. Best segment / channel / hook: {…}. Decision for week 2: {CONTINUE / ADJUST MESSAGE / MOVE TO SECOND NICHE}. Reason: {one sentence}."*
- [ ] **If any wire was received this week:** the change in `Status = Active intake submitted → PAID_SETUP` happens in the cockpit per `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md`. **Do not** wait until next Monday — the 48-hour clock is a real clock.

### Day 7 roles

| Step | Anton | Cursor / operator can prepare | Can be automated | Must remain human |
|---|---|---|---|---|
| Snapshot spreadsheet aggregates | ✓ | Cursor produces the aggregate computation | Future: nightly cron | ✓ Final read |
| Send pro-forma (if intake submitted) | ✓ | Cursor pre-fills the pro-forma block from the Action Pack § 6 + buyer details | Future: PDF rendering / ERPNext linkage | ✓ Final review + send |
| Run 48-hour setup (if wire received) | ✓ | Cursor pre-checks the cockpit + Telegram + Sheet pieces are configured | Future: setup automation | ✓ Operator owns the live pilot |
| Week 2 written decision | ✓ | Cursor cannot decide; but can produce a bullet summary of signal | — | ✓ The decision itself |

### Day 7 do-NOT list

- ❌ Start week 2 prematurely (no fresh cold sends today).
- ❌ Activate the dentist lane today — see § *Move to second niche* and the parked-lot doc's preconditions.
- ❌ Write a long retrospective doc — one line in `chat_history.md` is the retrospective.

## End-of-week summary template (paste into `artifacts/chat_history.md`)

```text
{ISO date}: AI Lead Rescue Mauritius Property 7-day action plan — Week 1 close.

Warm prospect:
- Status: {Sent / Replied — interested / Intake submitted /
  Pro-forma sent / Wire received / PAID_SETUP / Live monitoring /
  Closed — declined}.
- Option chosen (if applicable): {A / B}.
- Outcome: {one sentence}.

Property cold cadence (first 25):
- Sends: {N}/25.
- Replies (any): {N}.
- Replies (interested): {N}.
- Replies (declined): {N}.
- Replies (referred): {N}.
- Discovery calls scheduled: {N}.
- Discovery calls completed: {N}.
- Intakes submitted: {N}.
- Pro-formas sent: {N}.
- Wires received: {N}.

Best-performing combination:
- Segment: {real estate agency / property manager / STR / villa
  rental / serviced apartment / land sales / commercial}.
- Channel: {WhatsApp / Email / Facebook Messenger / Instagram /
  LinkedIn}.
- Hook: {A / B / C / D / E}.
- Zone: {North / West / East / South / Centre / Port Louis}.

Visual assets shipped (drafts):
- 1× LinkedIn post draft (Day 2).
- 1× workflow diagram (Day 3).
- 1× one-page flyer copy (Day 5).
- All saved under artifacts/visual-assets/lead-rescue-property/.

Decision for week 2:
- {CONTINUE / ADJUST MESSAGE / MOVE TO SECOND NICHE}.
- Reason: {one sentence}.

Production verification:
- /lead-rescue still 200, doctrine-compliant, no copy drift.
- No /admin/lead-rescue regressions.
- Spreadsheet up to date.

Delivery Reality (per .cursor/rules/delivery-reality.mdc):
- Week 1 itself is operationally COMPLETE if the warm prospect
  or one cold prospect reached PAID_SETUP. Otherwise PARTIAL
  with the documented week-2 decision.
```

## Cross-references

- `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_ACTION_PACK.md` — Day 1 / Day 4 / Day 7 warm-prospect actions.
- `docs/sales/AI_LEAD_RESCUE_MAURITIUS_PROPERTY_OUTREACH_PACK.md` — Day 2 / Day 3 / Day 5 / Day 6 cold-cadence sources for property prospects.
- `artifacts/lead_rescue_mauritius_property_first_25_template.csv` — spreadsheet structure for tracking.
- `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` — when a prospect crosses sales → delivery (Day 4 / Day 7).
- `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` — the 48-hour setup window starts as soon as a wire clears.
- `docs/marketing/AI_LEAD_RESCUE_GOOGLE_ASSET_PROMPTS.md` — visual-asset generation prompts (Day 3).
- `docs/marketing/AI_LEAD_RESCUE_MARKETING_ASSET_PACK.md` — flyer copy + LinkedIn post templates (Day 2 / Day 5).
- `docs/marketing/AI_LEAD_RESCUE_14_DAY_CONTENT_CALENDAR.md` — 14-day content plan; this 7-day execution plan is the *first half* of that calendar's outreach posture.
- `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` — deeper Mauritius copy library if a cold prospect needs a longer answer.
- `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` — 15-minute discovery script (used Day 3+ when discovery calls land).
- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — bounds for Google AI tool usage on Day 3 visual assets.
- `docs/strategy/AI_LEAD_RESCUE_DENTIST_AGENT_PARKING_LOT.md` — parked future second niche; preconditions for activation.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`; week-1 closure rule.

## Delivery reality

Docs-only. **PARTIAL** until reviewed + merged. **COMPLETE on merge** because no runtime / customer-visible flow changes. Operational completion of the week is decided in the Day 7 close, not on PR merge.
