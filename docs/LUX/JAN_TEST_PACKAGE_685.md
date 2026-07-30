# Jan test package — Lux functional slices (#685)

**Status:** Draft for Anton approval — **do not send** until Anton approves.  
**Environment:** Lux `corpflow_test` only (`https://lux.corpflowai.com`) — not client production.  
**Data rule:** Use fictional / synthetic enquiry details only. No real private-client data.

## What shipped in this PR (pre-merge)

| Slice | Function | Where to test |
|-------|----------|----------------|
| **A** | Concierge requires email + telephone (client + server); enquiry appears in Lux operator queue with email, telephone, source, stage, next action, created time; stage `new → contacted → qualified → invited → closed`; operator notes | `/concierge` + `/change` (LEADS) |
| **B** | Private-client qualification panel (buyer objective, area, property type, budget band, timing, residency/investment, confidentiality); missing-field flags + recommended next action | `/change` → select enquiry → **PRIVATE-CLIENT QUALIFICATION** |
| **C** | Associate staged residences; on-screen invitation/shortlist draft; copy-ready text; **no** live email/WhatsApp send | `/change` → **CURATED SHORTLIST / INVITATION PACKET** |
| **D** | This checklist + draft email below | Anton review only |

**Protected:** No DB/schema or env changes; no payment; no automatic client send; no client_production.

---

## Concise Jan checklist (delivered functions only)

Use a **synthetic** name/email/phone (e.g. `Jan Test / jan.test+lux685@example.test / +230 5xxx xxxx`).

1. Open `https://lux.corpflowai.com/concierge` — confirm submit blocked until both email and telephone are valid.
2. Submit a short synthetic enquiry — confirm thank-you / confirmation appears.
3. Sign in on `https://lux.corpflowai.com/change` — open **LEADS · LuxeMaurice CRM**.
4. Find the synthetic enquiry — confirm **Email**, **Telephone**, **Source**, **Status/stage**, **Next action**, and **Created** time.
5. Change stage through at least `new → contacted → qualified` (optionally to `invited` / `closed`) and **Save**.
6. Add one internal operator note and **Save** — confirm it appears under Recent notes.
7. Fill qualification fields (or leave some blank) — confirm **Missing** list and **Recommended** next action update after save.
8. Tick 1–2 staged residences on the shortlist panel — **Save** — confirm the invitation draft lists them.
9. Use **Copy draft text** — confirm draft says it is not sent automatically.
10. Reply to Anton with: what worked, what felt unclear, and the one next function you want most.

---

## Draft email to Jan (Anton approval required — do not send)

**Subject:** Lux test surface — please try today’s enquiry / qualification / shortlist functions

Hi Jan,

We added a few practical functions on the Lux test site today (not production client data). Could you try them the same day and send back short notes?

**Links**
- Public form: https://lux.corpflowai.com/concierge  
- Operator desk: https://lux.corpflowai.com/change (LEADS section after login)

**Please test (synthetic details only)**
1. Concierge form needs both email and telephone; confirm success message after submit.
2. On `/change`, open the new enquiry — email, telephone, source, stage, next action, created time.
3. Move the stage forward and add one internal note.
4. Fill the private-client qualification block; note anything still missing.
5. Select one or two residences for a shortlist and review the on-screen invitation draft (copy only — nothing is emailed or sent on WhatsApp automatically).

**Please reply with**
- What worked  
- What was confusing  
- The single most useful next function for you

Thank you,  
Anton

---

## Operator notes (Anton)

- Merge + Production deploy are **outside** this PR agent scope (open PR only).
- After merge/deploy: live-verify `/concierge` + `/change` LEADS on `lux.corpflowai.com`, then send the email above if content still matches.
- Delivery Reality: merge ≠ complete; live URL verification required before COMPLETE.

## ANTON ACTION

- Review/merge this PR when ready.
- After deploy: approve (or edit) the draft email, then send to Jan manually.
