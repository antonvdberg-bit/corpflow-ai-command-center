# Lead Rescue — first paid pilot fulfilment evidence checklist

**Status:** Operator-facing checklist. **Docs / process only.**

**Audience:** Anton (CEO/operator).

**Anchor sentinel:** `<!-- LEAD_RESCUE_FIRST_PAID_PILOT_FULFILMENT_EVIDENCE_V1 -->`

<!-- LEAD_RESCUE_FIRST_PAID_PILOT_FULFILMENT_EVIDENCE_V1 -->

**Created:** 2026-07-02.

**Packet:** GitHub #249 — *Cursor recovery queue after lost morning* (Packet C5).

**Purpose:** Compact evidence Anton must capture during the **first USD 150 paid pilot** so delivery can later become **proof** — without inventing claims or exposing payment details.

**Links back:**

| Doc | Role |
| --- | ---- |
| `docs/lead-rescue/FIRST_PAID_PILOT_OPERATOR_PACK.md` | Full path §1–§15 (E1–E9, gates, daily loop) |
| `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` | Pre-proof vs public proof rules |
| `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` | Cockpit vs spreadsheet boundary |

---

## 1. How to use this checklist

- Work **top to bottom** as the pilot runs.
- Check boxes in **private notes** or cockpit activity log — not in repo commits.
- **Delivered** = all §2–§6 required items captured; §7 boundaries respected.
- **Public proof** = separate gate after §8 client approval.

---

## 2. Intake evidence

| # | Item | Captured? | Where (private / cockpit) |
| - | ---- | --------- | ------------------------- |
| I1 | Intake submitted at `https://corpflowai.com/lead-rescue` | [ ] | Cockpit record created |
| I2 | Timestamp of submission | [ ] | Cockpit / Telegram alert |
| I3 | Cockpit id noted | [ ] | Activity log |
| I4 | Qualification call completed (pack §4 all true) | [ ] | Private notes → activity log summary |
| I5 | Spreadsheet row updated: `Active intake submitted` | [ ] | Google Sheet copy only |

**Do not log:** full intake message paste in GitHub; unnecessary PII in repo.

---

## 3. Payment / POP evidence (no payment detail exposure)

| # | Item | Captured? | Where |
| - | ---- | --------- | ----- |
| P1 | Manual pro-forma sent (USD 150) | [ ] | Activity log: date + channel |
| P2 | Payment instructions sent **separately** | [ ] | Activity log |
| P3 | POP received (operator verified) | [ ] | Activity log: *"POP received YYYY-MM-DD"* |
| P4 | **Cleared funds** confirmed in bank | [ ] | Activity log: *"Cleared funds verified YYYY-MM-DD"* — **no account digits, no amounts in public channels** |
| P5 | Setup **not** started before P4 | [ ] | Status pipeline |

**Never put in repo / #249:** bank account numbers, SWIFT snippets, transaction IDs, buyer card data, POP screenshots with PII.

---

## 4. Setup evidence (48-hour window)

| # | Item | Captured? | Where |
| - | ---- | --------- | ----- |
| S1 | One lead source connected (scope: one channel) | [ ] | Cockpit setup checklist |
| S2 | Test enquiry submitted and visible in operator view | [ ] | Private screenshot (operator-held) |
| S3 | Buyer acknowledged setup complete | [ ] | WhatsApp/email summary or activity log |
| S4 | 48h window start/end dates recorded | [ ] | Activity log |

---

## 5. Rescue action evidence (7-day pilot)

| # | Item | Captured? | Where |
| - | ---- | --------- | ----- |
| R1 | Daily summary sent each pilot day (1–7) | [ ] | Activity log entry per day |
| R2 | At least one **real** enquiry handled per rescue workflow | [ ] | Private note: date + channel (no buyer PII in repo) |
| R3 | Missed-enquiry example from buyer (before state) | [ ] | Paraphrase in private notes — from call, not fabricated |
| R4 | Day-7 recap sent to buyer | [ ] | Activity log |
| R5 | Counts only in recap (enquiries seen, responses sent) | [ ] | Activity log — **no invented % uplift** |

---

## 6. Client acknowledgement evidence

| # | Item | Captured? | Where |
| - | ---- | --------- | ----- |
| A1 | Buyer confirmed they received daily summaries | [ ] | Reply screenshot private, or log *"acknowledged day N"* |
| A2 | Buyer confirmed setup met expectation or noted gaps | [ ] | Activity log |
| A3 | Day-7 conversation held (continue / stop / monthly) | [ ] | Activity log |
| A4 | Any issues escalated and resolved or documented | [ ] | Activity log |

---

## 7. Before / after boundaries (what you may describe privately)

| Allowed (private operator notes) | Not allowed (public or outreach) |
| -------------------------------- | -------------------------------- |
| "Buyer named one missed enquiry last month" | "We increased leads 40%" |
| "Seven daily summaries delivered" | "Trusted by X businesses" |
| "One WhatsApp enquiry logged and followed up" | Before/after revenue claims |
| Process worked / gaps noted honestly | Competitor bashing with unverified claims |
| Structural facts from live page (USD 150, 48h, 7d) | Fake testimonial or logo |

**Before state:** buyer-described pain + channel messiness (paraphrase).  
**After state:** what CorpFlow **actually did** in pilot scope (summaries, logging, follow-up discipline) — not guaranteed outcomes.

---

## 8. What cannot be used publicly yet

Until **written client approval** (operator pack §8 gate G7):

- [ ] No testimonial quote on `/lead-rescue` or social
- [ ] No client name, logo, or identifiable case card
- [ ] No "paying client" badge or count
- [ ] No video with their enquiries or branding
- [ ] No fabricated metrics or composite "results"

Pre-proof window rules: `PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` §3.

---

## 9. What requires explicit client approval

Ask **after** day-7 recap, in writing (email/WhatsApp):

| Ask | Approval needed for |
| --- | ------------------- |
| Named testimonial (1–2 sentences) | Website, outreach, decks |
| Logo / business name on case snippet | Marketing surfaces |
| Screenshot of enquiry workflow (redacted) | Validation asset |
| Reference call for another prospect | Sales |

**Default if no reply or decline:** delivery still counts as **delivered** if §2–§6 complete; proof publish stays **blocked**.

Log permission in private storage; activity log may say *"testimonial permission: granted / declined / pending"* — no quote text in repo.

---

## 10. Operator sign-off (delivered vs proof-ready)

### Delivered (operations)

```text
[ ] §2 Intake evidence (I1–I5)
[ ] §3 Payment evidence (P1–P5) — no secrets in logs
[ ] §4 Setup evidence (S1–S4)
[ ] §5 Rescue evidence (R1–R5)
[ ] §6 Acknowledgement (A1–A4)
[ ] §7 Boundaries respected
[ ] §8 Nothing published without approval
```

**Verdict:** DELIVERED (operator) — maps to operator pack §15 E1–E8.

### Proof-ready (marketing — later)

```text
[ ] §9 Client approval captured for intended use
[ ] Proof packet drafted per PROOF_VALIDATION_ASSET_PLAN_LR_V1.md
[ ] Anton explicit publish approval (separate from delivery)
```

**Verdict:** Proof-ready — not required to call pilot delivered.

---

## 11. Quick reference — evidence IDs (operator pack §15)

| This checklist | Operator pack E# |
| -------------- | ---------------- |
| I1–I3 | E3 |
| I4 | E2 |
| P1–P4 | E4, E5 |
| S1–S2 | E6 |
| R1, R4–R5 | E7, E8 |
| §9 permission | E9 + G7 |

Use cockpit activity log as the **delivery audit trail**; keep bank details and full message threads operator-private.
