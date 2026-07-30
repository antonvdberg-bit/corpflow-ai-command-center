# Lux #685 — Jan test package (Slices A–C)

**Surface:** Lux `corpflow_test` — `https://lux.corpflowai.com`  
**Operator desk:** `https://lux.corpflowai.com/change` → LEADS · LuxeMaurice CRM  
**Public form:** `https://lux.corpflowai.com/concierge`  
**Constraint:** synthetic / fictional data only — no real private client details.

> **Delivery note:** Merge + Production deploy are required before live verification. This package is prepared for same-day Jan feedback after Anton approves merge. Agents do not merge or deploy from this PR alone.

---

## What was delivered (test only these)

### Slice A — Concierge lead usability

1. On `/concierge`, submit is blocked unless **both email and telephone** are valid.
2. Successful submit still shows the confirmation / next-step message.
3. After submit (or with an existing synthetic enquiry), open `/change` (Lux login) and find the lead in the CRM queue.
4. Lead card shows **email**, **telephone**, **source**, **stage**, **next action**, and **created** time.
5. Progress stage: `New → Contacted → Qualified → Invited → Closed` and Save.
6. Add an internal operator note; confirm it appears under Recent notes (not on the public form).

### Slice B — Private-client qualification

1. Select a synthetic enquiry on `/change`.
2. Open **Private-client qualification**.
3. Capture (or confirm derived) fields: buyer objective, preferred area, property type, budget band, timing, residency/investment interest, confidentiality preference.
4. Confirm **Missing** flags clear as fields are filled, and **Recommended next** updates.
5. Save and re-open the lead — values persist (stored in existing `qualification_json`, no new DB tables).

### Slice C — Curated shortlist / invitation packet

1. On the same lead, open **Curated shortlist / invitation packet**.
2. Tick 1–2 staged residences (e.g. North Coast Ridge, Bel Ombre villa).
3. Optionally add an invitation note; Save.
4. Confirm the on-screen **draft** summarises qualification + residences.
5. Use **Copy draft text** — paste somewhere to review. Confirm UI states **Send disabled** (no email / WhatsApp / SMS was sent).

---

## Out of scope for this test (do not expect)

- Live email, WhatsApp, or SMS send  
- Payment, secrets, or schema changes  
- Broad visual redesign  
- Client production hosts (this is CorpFlowAI `corpflow_test` only)

---

## Feedback asked of Jan (same day)

Please reply with concrete pass/fail per slice:

| Slice | Pass / Fail | Notes (what broke or felt unclear) |
|-------|-------------|-------------------------------------|
| A Concierge + queue | | |
| B Qualification | | |
| C Shortlist / draft | | |

Optional: one sentence on the next function that would unblock your real advisory workflow (we will not wait for this to keep shipping).

---

## Draft email to Jan (Anton approval required — do not send automatically)

**To:** Jan  
**From:** Anton / CorpFlow  
**Subject:** Lux test today — concierge queue, qualification, and private shortlist draft

Hi Jan,

We shipped three functional slices on the Lux test site for you to try today (synthetic data only):

1. **Concierge → operator queue** — form still needs email + telephone; enquiries show source, stage, next action, created time; you can move stages and add internal notes.  
2. **Private-client qualification** — compact fields on `/change` with missing-info flags and a recommended next step.  
3. **Curated shortlist / invitation draft** — associate staged residences and copy a private invitation summary. Nothing is sent automatically.

**Links**
- Public form: https://lux.corpflowai.com/concierge  
- Operator desk: https://lux.corpflowai.com/change  

Please use fictional contact details only. A short pass/fail per item above today would help us keep the release cadence.

Thank you,  
Anton

---

## Anton action

**ANTON ACTION:** Approve merge of the #685 PR when ready, then (after Production deploy) send the draft email above if content is acceptable. Agents do not merge, deploy, or send.
