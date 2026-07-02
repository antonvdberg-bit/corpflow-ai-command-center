# Lead Rescue — first outreach candidate worksheet

**Status:** Operator-facing template. **Docs / process only.** No runtime, no CRM, no automated sends.

**Audience:** Anton (CEO/operator).

**Anchor sentinel:** `<!-- LEAD_RESCUE_FIRST_OUTREACH_CANDIDATE_WORKSHEET_V1 -->`

<!-- LEAD_RESCUE_FIRST_OUTREACH_CANDIDATE_WORKSHEET_V1 -->

**Created:** 2026-07-02.

**Packet:** GitHub #249 — *Cursor recovery queue after lost morning* (Packet C4).

**Purpose:** Help Anton pick **1–3 warm prospects** for the first USD 150 Lead Rescue paid pilot — using a private worksheet, not a second database or CRM.

> **DO NOT AUTOMATE SENDS.** Score and draft here; Anton sends manually, one person at a time.

**Companion docs:**

| Topic | Doc |
| ----- | --- |
| Full operator path | `docs/lead-rescue/FIRST_PAID_PILOT_OPERATOR_PACK.md` |
| Outreach scripts | Same pack §3 |
| Sales vs delivery boundary | `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` |
| Spreadsheet template (optional) | `artifacts/lead_rescue_first_25_prospect_template.csv` |

---

## 1. Privacy and data rules (read first)

| Rule | Why |
| ---- | --- |
| **Do not paste private client data into repo docs, GitHub issues, or PRs** | Repo is not a CRM; history is visible |
| **Do not commit real names, phones, emails, or bank details** | Operator-held only |
| **Use this worksheet on paper, in a private Google Sheet, or local notes** | Copy the structure; keep values off-repo |
| **#249 status comments:** name shapes only (*"one warm property prospect scored 8/10"*) — no PII | Bridge hygiene |
| **After intake:** cockpit `/admin/lead-rescue/[id]` is delivery truth — not GitHub | Handoff doc §1 |

---

## 2. Warm prospect scoring checklist

Score each candidate **0–2** per row (0 = no, 1 = partial, 2 = strong). **Target ≥ 12/16** before outreach.

| # | Criterion | Score (0–2) | Notes (private) |
| - | --------- | ----------- | --------------- |
| S1 | **Warm relationship** — referral, prior chat, mutual contact | | |
| S2 | **Decision maker** — owner or ops lead who can say yes to USD 150 | | |
| S3 | **Pain visible** — enquiries lost, delayed, or untracked | | |
| S4 | **Two+ channels** — WhatsApp, form, email, Facebook, etc. | | |
| S5 | **Recent example** — can name a missed enquiry in last 30 days (on call) | | |
| S6 | **Website + email** — wedge fits; not a rebuild ask | | |
| S7 | **Trust** — would take a 15-minute call from Anton | | |
| S8 | **Ability to pay** — USD 150 via manual bank transfer without procurement | | |

**Warm gate (§2 of operator pack):** all W1–W8 should pass before sending. This scorecard adds nuance when choosing among several warm names.

**Go to §6** when total ≥ 12 and no hard no-go (§5).

---

## 3. Candidate profile (one row per prospect — private)

Copy this block once per candidate. **Keep off-repo.**

```text
Candidate ID:        LR-WARM-001        (your private label only)
Business name:
Contact first name:
Sector / niche:
Location:
Relationship source:  (how you know them / who referred)
Fit score (§2):      /16
```

### 3.1 Fit / pain / urgency / trust / ability-to-pay

| Field | Your private notes |
| ----- | ------------------ |
| **Fit** | Why Lead Rescue wedge fits (enquiry follow-up, not ads/CRM/chatbot) |
| **Pain** | What they said or you observed about lost/delayed enquiries |
| **Urgency** | Why now (season, recent miss, owner frustration) |
| **Trust** | Why they would believe Anton / CorpFlowAI |
| **Ability to pay** | USD 150 manual transfer realistic? Any procurement block? |

### 3.2 Manual contact notes

| Field | Your private notes |
| ----- | ------------------ |
| Best channel | Email / WhatsApp / LinkedIn / in-person |
| Last touch | Date + one-line summary (no full message paste in repo) |
| Their words | Short paraphrase only — store full thread privately |
| Objections heard | |
| Next follow-up date | |

---

## 4. Outreach channel choice

Pick **one** primary channel for first touch. Match where they already respond.

| Channel | Use when | Script source |
| ------- | -------- | --------------- |
| **Email** | You have their work email; they read it | Operator pack §3.1 |
| **LinkedIn / DM** | Relationship is professional-network heavy | Operator pack §3.2 |
| **WhatsApp / manual message** | They use WhatsApp for business; you have consent to message | Operator pack §3.3 |
| **In-person / call** | Warm enough to ask for 15 minutes directly | Discovery script + intake link after qualify |

**Rules:**

- One CTA per message — intake or call, not both.
- No card link, no "pay now," no payment gateway language.
- Anton reviews and sends manually — no bulk, no automation, no n8n send.

---

## 5. Go / no-go decision

| Decision | When |
| -------- | ---- |
| **GO — draft outreach** | Score ≥ 12/16; W1–W8 pass; channel chosen; message drafted from §3 templates |
| **HOLD — nurture** | Interested but timing wrong; set follow-up date in private notes |
| **NO-GO** | Any boundary below |

**No-go boundaries (do not pursue):**

- Cold scraped list / no real relationship
- Wants guaranteed leads, revenue, or AI that replies to customers
- Primary ask is website rebuild, ads management, or full CRM
- Regulated data / clinical advice scope
- Cannot do manual bank transfer
- Uncomfortable sharing even business enquiry examples

| Field | Value |
| ----- | ----- |
| **Go / Hold / No-go** | |
| **Reason (one line)** | |
| **Decided by** | Anton |
| **Date** | |

---

## 6. Consent and privacy caution

Before WhatsApp or email outreach to a **business contact**:

- Message is **personal and relevant** — not bulk marketing.
- You have a **prior relationship or explicit opening** (referral, prior conversation, they asked for info).
- Do not paste enquiry content from third parties into messages or repo.
- If they are in Mauritius, respect usual business-privacy expectations; no sharing their data with CorpFlow tooling until **they submit intake** at `https://corpflowai.com/lead-rescue`.
- If they decline or go quiet: **Closed — declined** or **Closed — no reply** in spreadsheet; no further chase beyond operator pack follow-up norms.

---

## 7. Where to record follow-up (existing operator flow)

| Stage | Where to record | What to log |
| ----- | --------------- | ----------- |
| **Pre-intake (this worksheet)** | Private sheet / notes / optional `artifacts/lead_rescue_first_25_prospect_template.csv` **copy in Google Sheets** | Score, go/no-go, send date, status |
| **Message sent** | Spreadsheet: `Status = Sent`, `First message sent date` | Channel only in repo-facing summaries |
| **Reply — interested** | Spreadsheet: `Status = Replied — interested` | Ask them to submit intake |
| **Intake submitted** | Spreadsheet: `Active intake submitted`, `Notes = cockpit_id={id}` | Handoff doc §3.1 |
| **Delivery** | `/admin/lead-rescue/[id]` activity log + setup checklist | Operator pack §6–§8, fulfilment checklist |

**Do not:** open cockpit rows before intake; duplicate prospect rows in Postgres; build a new CRM module.

---

## 8. Pick 1–3 candidates (today)

Use this shortlist table privately:

| Priority | Candidate ID | Business (private) | Score | Go? | Channel | Outreach date | Status |
| -------- | ------------ | ------------------ | ----- | --- | ------- | ------------- | ------ |
| 1 | | | /16 | | | | |
| 2 | | | /16 | | | | |
| 3 | | | /16 | | | | |

**Start with priority 1 only.** Send one message; wait for reply before scaling to 2–3.

---

## 9. After GO — next clicks

1. Draft message from `FIRST_PAID_PILOT_OPERATOR_PACK.md` §3.
2. Anton sends manually.
3. On interest → discovery call → qualify (pack §4).
4. Buyer submits intake → manual pro-forma → POP → delivery per operator pack.

**Fulfilment evidence:** `docs/lead-rescue/FIRST_PAID_PILOT_FULFILMENT_EVIDENCE_CHECKLIST.md`.
