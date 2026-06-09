# AI Lead Rescue — First 7 Days Execution Checklist

**Audience:** Anton, day-by-day, for the first week of moving from documentation to execution.

**Purpose:** a single page Anton opens each morning. Each day has 3–6 items, never more. The week is the **launch window** for the first warm prospect + the first 25 cold prospects.

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_FIRST_7_DAYS_EXECUTION_CHECKLIST_V1 -->`

<!-- AI_LEAD_RESCUE_FIRST_7_DAYS_EXECUTION_CHECKLIST_V1 -->

## Ground rules (read once, then internalise)

- **One prospect at a time.** Anton sends each message personally; no bulk tooling.
- **5 cold messages per day, max.** Sustainability beats volume in week 1.
- **Niche balance.** Aim ~8 / 8 / 9 across property / contractors / clinics by Day 5.
- **No new doctrine work this week.** If a question forces a doctrine update, *write the answer in `artifacts/chat_history.md`* and keep going — do not redirect a day to drafting strategy.
- **Live URL is the page.** All paths lead to `https://corpflowai.com/lead-rescue` — do not invent a parallel surface.
- **Spreadsheet is `artifacts/lead_rescue_first_25_prospect_template.csv`.** Anton's working copy can live in Google Sheets; the repo template is the structure of truth.
- **Tracking entries land in the spreadsheet.** They do **not** land in the cockpit until the prospect submits intake. See `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md`.
- **End-of-day log.** Each day ends with one line in `artifacts/chat_history.md` under the current month — *"{date}: {N} messages sent, {N} replies, {key signal of the day}"*. Two minutes of writing; everything else stays out.

## Day 1 — Warm prospect message + build the first 25 list

Goal: send the warm prospect message and identify 25 cold prospects across the three niches. No cold sends today.

- [ ] **Open `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_ACTION_PACK.md` § 1** and run the 5-question discovery with the warm prospect (call or WhatsApp). 30 minutes max.
- [ ] **Send the matching Option A or Option B message** from the Action Pack § 2 / § 3 in the same conversation. Don't sleep on it; momentum matters.
- [ ] **Open the prospect spreadsheet** (`artifacts/lead_rescue_first_25_prospect_template.csv`, copied to a working Google Sheet). Replace the 4 placeholder rows.
- [ ] **List 25 cold prospects** across property (8), contractors (8), clinics (9). For each, fill at minimum: *Business name, Sector, Location, Website / Facebook / Instagram, Contact person, Contact channel, Why they may lose leads, Likely enquiry channels, Warm/cold = Cold*.
- [ ] **Write one line in `artifacts/chat_history.md`** under the current month: *"{date}: warm prospect message sent (Option {A/B}); 25-prospect list assembled; cold cadence starts {Day 2 date}."*
- [ ] **End of Day 1:** the warm prospect has the message; the 25-prospect list exists.

**Do NOT do today:** send any cold message, draft new visual assets, write any new doctrine.

## Day 2 — Send first 5 cold messages

Goal: send the first 5 cold messages, balanced across niches. Track every send in the spreadsheet.

- [ ] **Pick 5 prospects from the list** — 2 property, 2 contractors, 1 clinic (or 2 / 1 / 2; balance over the week, not within a day).
- [ ] **For each prospect**, pick:
  - the matching cold message from `docs/sales/AI_LEAD_RESCUE_COLD_OUTREACH_PACK.md` § 1 / § 2 / § 3 (one of the three vertical messages),
  - the matching channel format from § 7 (WhatsApp / LinkedIn / email).
- [ ] **Send personally.** No copy-paste-blast — read each one, replace `{first name}` and `{region}` properly, keep the tone in the spirit of the prospect's public profile.
- [ ] **For each send**, fill in the spreadsheet:
  - `First message sent date` = today.
  - `Follow-up date` = today + 3 working days (Day 5 if Day 2 = Tuesday; adjust per calendar).
  - `Status` = *Sent*.
  - `Notes` = which message variant was used (e.g. *"§ 1.2 contractor B / WhatsApp"*).
  - `Next action` = *Wait until follow-up date; check for reply daily*.
- [ ] **Add one line to `artifacts/chat_history.md`**: *"{date}: 5 cold messages sent (P/C/Cl: 2/2/1); spreadsheet updated; warm prospect status = {their reply status}."*

**Do NOT do today:** send the same message twice, send to >5 prospects, draft new copy variants, react impulsively to a non-reply on the warm prospect.

## Day 3 — Create first visual assets

Goal: ship two simple visuals that pair with the page. Not a full-day project; aim for ~2–3 hours total.

- [ ] **Open `docs/marketing/AI_LEAD_RESCUE_GOOGLE_ASSET_PROMPTS.md`** and pick:
  - one *workflow diagram* prompt (the *"how the pilot works"* image — capture → alert → daily summary → follow-up board),
  - one *niche social image* prompt for whichever niche has had the most cold sends so far (property / contractor / clinic).
- [ ] **Generate drafts using Google AI tools** per `docs/strategy/GOOGLE_ACCELERATION_LANE.md` (Gemini, Nano Banana, etc.). **No sensitive client data** in any prompt — use the generic prompts as written.
- [ ] **Save the chosen drafts** under `artifacts/visual-assets/lead-rescue-week-1/` (or the equivalent per existing repo convention) — file naming: `lead-rescue-workflow-diagram-2026-{MM}-{DD}.png` etc.
- [ ] **Manual quality check** before saving: no fake testimonials in the image, no client logos that aren't ours, no revenue numbers, no AI-bot framing, no implied guarantees. If anything fails, regenerate.
- [ ] **Add one line to `artifacts/chat_history.md`**: *"{date}: 2 visual asset drafts saved; {N} cold replies so far; warm prospect status = {their state}."*

**Do NOT do today:** publish the visuals to LinkedIn / Facebook unprompted, send a fresh cold-outreach round just because there's spare time, edit the public `lead-rescue` page (out of scope this week).

## Day 4 — Follow up warm prospect / send next 5 cold

Goal: maintain the warm prospect thread; send the second batch of 5 cold messages. Track everything.

- [ ] **Warm prospect check.**
  - If warm prospect has **replied** but not yet submitted intake: reply once, answer their specific question. Do not chase a third time.
  - If warm prospect has **submitted intake**: jump to `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` § *When to send pro-forma* — the pro-forma is the urgent action of the day.
  - If warm prospect has been **silent for 48 hours**: send the § 7 follow-up from the Action Pack. **Once.**
- [ ] **Send next 5 cold messages.** Same balance as Day 2 (~2 / 2 / 1 across property / contractors / clinics). Use a different message variant from § 1 / § 2 / § 3 of the cold pack so we get signal on which hook lands best.
- [ ] **Update spreadsheet** for all 5 new sends + any reply changes on the Day 2 batch.
- [ ] **Add one line to `artifacts/chat_history.md`**: *"{date}: warm prospect status = {state}; +5 cold sends (P/C/Cl: x/y/z); cumulative replies: {N}/{10}."*
- [ ] **End of Day 4:** total cold sends = 10/25.

**Do NOT do today:** chase the warm prospect a third time, abandon a niche because one prospect went silent, escalate cadence on cold prospects who haven't yet hit their follow-up date.

## Day 5 — Review replies

Goal: pause and look at what's actually happening. No new sends today (other than direct replies).

- [ ] **Review the spreadsheet end-to-end.** Every row's `Status` should be current. If a row is older than 3 days and still says *Sent*, update it (*No reply — first follow-up due today / tomorrow*).
- [ ] **Reply to every interested prospect.** For each *Replied — interested*: schedule a 15-minute discovery call using `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`. Do not stack discovery calls back-to-back; leave 30 minutes between.
- [ ] **Send first follow-up** (cold pack § 4) to anyone whose `Follow-up date` is today **and** still no reply.
- [ ] **Send close-the-loop** (cold pack § 6) to anyone who explicitly declined.
- [ ] **Look at signal across niches.** Which niche has the highest reply rate so far? Which message variant performed best? Note in the spreadsheet `Notes` column at the row level — don't write a new doc.
- [ ] **Add one line to `artifacts/chat_history.md`**: *"{date}: cumulative {N}/10 cold sends; {N} replies; {N} interested; {N} declined; best-performing variant = {§ x.y}; niche to lean into = {niche}."*

**Do NOT do today:** send a fresh batch of 5 new cold messages (today is review, not send), pivot away from a niche after only 3 sends, write a new doctrine doc to capture today's learning.

## Day 6 — Second follow-ups

Goal: clean cadence pass. Anyone who hit their second-follow-up date gets the cold pack § 5 message; cadence then closes.

- [ ] **Send second follow-up** (cold pack § 5) to anyone who:
  - received the first follow-up on Day 5 or earlier,
  - did not reply,
  - is past 7 working days from the original send.
- [ ] **For all post-second-follow-up prospects who don't reply by end of Day 6:** mark `Status = Closed — no reply` and add to a *re-engage in 60 days* note in the spreadsheet. **Do not send a third follow-up.** That's the discipline.
- [ ] **Send next batch of 5 cold messages** (this is the third batch; cumulative = 15/25). Same balance, fresh message variant.
- [ ] **For any *Replied — interested* prospects from Day 5:** confirm discovery-call times where they haven't yet been confirmed.
- [ ] **Add one line to `artifacts/chat_history.md`**: *"{date}: +5 cold sends (cumulative 15/25); {N} second follow-ups sent; {N} discovery calls scheduled for next week; warm prospect status = {state}."*

**Do NOT do today:** send a third follow-up to anyone (forbidden by cadence rules), expand the niche beyond the three first-pilot niches.

## Day 7 — Decide: continue / adjust niche / onboard serious leads

Goal: end the week with one clear written decision. No new outreach today; today is decision and onboarding.

- [ ] **Snapshot the spreadsheet** at end of Day 6 numbers:
  - Total cold sends: 15/25 (or 20/25 if Day 6 capacity allowed it).
  - Replies (any kind): N.
  - Interested replies: N.
  - Discovery calls scheduled: N.
  - Discovery calls completed: N.
  - Intakes submitted: N.
  - Pro-formas sent: N.
  - Wires received: N.
- [ ] **Onboard any serious leads end-to-end.**
  - **Intake submitted but no pro-forma sent yet** → send pro-forma per `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_ACTION_PACK.md` § 6 (Option A or B as appropriate). The qualification is on Anton's side, not the buyer's; don't make them wait.
  - **Pro-forma sent but no wire yet** → soft nudge via the channel they used for intake; one nudge only. Use the cold-pack § 4 follow-up tone, lightly adapted.
  - **Wire received** → status moves to `PAID_SETUP`; the 48-hour setup window starts. Open `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` and run the checklist.
- [ ] **Make ONE written decision** about week 2. Three options; pick exactly one and write it in `artifacts/chat_history.md`:
  1. **CONTINUE.** Same niches, same cadence, send remaining cold messages (10/25 in week 2 if Day 6 ended at 15/25; or close out week 2 with discovery and onboarding).
  2. **ADJUST NICHE.** One of the three niches has clearly lower reply rate after 8/8/9 sends — drop it, rebalance week 2 across the remaining two. Note which niche is being dropped and why (one sentence).
  3. **PAUSE COLD CADENCE.** Pause new cold sends; week 2 = onboard the wires received + run discovery calls + write the first published case study after pilot completion. Use this when there are 2+ serious leads in flight; do not split focus.
- [ ] **Write the decision in `artifacts/chat_history.md`** under the current month: *"{date}: Week 1 close. Sends: {N}/25. Replies: {N}. Interested: {N}. Calls scheduled: {N}. Pro-formas: {N}. Wires: {N}. Decision for week 2: {CONTINUE / ADJUST NICHE / PAUSE}. Reason: {one sentence}."*
- [ ] **If any wire was received this week:** the change in `Status = Active intake submitted → PAID_SETUP` happens in the cockpit per `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md`. Do **not** wait until next Monday — the 48-hour clock is a real clock.

**Do NOT do today:** start week 2 prematurely (don't *also* send cold messages today; today is a closing day, not an opening day), write a long retrospective doc (one line in `chat_history.md` is the retrospective), refactor the cold-pack copy variants based on Day 6 signal alone (need 2 weeks of signal at minimum).

## End-of-week summary template (paste into `artifacts/chat_history.md`)

```text
{ISO date}: AI Lead Rescue Sales Execution Pack #1 — Week 1 close.

Warm prospect:
- Status: {Sent / Replied — interested / Intake submitted /
  Pro-forma sent / Wire received / PAID_SETUP / Live monitoring /
  Closed — declined}.
- Option chosen (if applicable): {A / B}.
- Outcome: {one sentence}.

Cold cadence (first 25):
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

Best-performing variant by niche:
- Property: § {x.y}.
- Contractor: § {x.y}.
- Clinic: § {x.y}.

Decision for week 2:
- {CONTINUE / ADJUST NICHE / PAUSE}.
- Reason: {one sentence}.

Visual assets shipped:
- {N} drafts saved under artifacts/visual-assets/lead-rescue-week-1/.

Production verification:
- /lead-rescue still 200, doctrine-compliant, no copy drift.
- No /admin/lead-rescue regressions.
- Spreadsheet up to date.

Delivery Reality (per .cursor/rules/delivery-reality.mdc):
- Week 1 itself is operationally COMPLETE if the warm
  prospect or one cold prospect reached PAID_SETUP. Otherwise
  PARTIAL with documented next-week decision.
```

## Cross-references

- `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_ACTION_PACK.md` — Day 1 / Day 4 / Day 7 warm-prospect actions.
- `docs/sales/AI_LEAD_RESCUE_COLD_OUTREACH_PACK.md` — Day 2 / Day 4 / Day 6 cold-cadence sources.
- `artifacts/lead_rescue_first_25_prospect_template.csv` — spreadsheet structure for tracking.
- `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` — when a prospect crosses sales → delivery (Day 4 / Day 7).
- `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` — the 48-hour setup window starts as soon as a wire clears.
- `docs/marketing/AI_LEAD_RESCUE_GOOGLE_ASSET_PROMPTS.md` — visual-asset generation prompts (Day 3).
- `docs/marketing/AI_LEAD_RESCUE_14_DAY_CONTENT_CALENDAR.md` — 14-day content plan; this 7-day execution checklist is the *first half* of that calendar's outreach posture.
- `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md` — deeper copy library if a cold prospect needs a longer answer than the cold pack provides.
- `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` — 15-minute discovery script (used Day 5 onward when discovery calls land).
- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — bounds for Google AI tool usage on Day 3 visual assets.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`; week-1 closure rule.

## Delivery reality

Docs-only. **PARTIAL** until reviewed + merged. **COMPLETE on merge** because no runtime / customer-visible flow changes. Operational completion of the week itself is decided in the Day 7 close, not on PR merge.
