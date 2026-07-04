# Lead Rescue — first paid-pilot operator pack

**Status:** Operator-facing consolidation. **Docs / process only.** No runtime, no deploy, no env/secrets, no outbound sends.

**Audience:** Anton (CEO/operator).

**Anchor sentinel:** `<!-- LEAD_RESCUE_FIRST_PAID_PILOT_OPERATOR_PACK_V1 -->`

<!-- LEAD_RESCUE_FIRST_PAID_PILOT_OPERATOR_PACK_V1 -->

**Created:** 2026-07-01.

**Packet:** GitHub #249 — *Lead Rescue first paid-pilot operator pack consolidation* (interim work while n8n bridge memory is repaired).

**Purpose:** One page Anton can use to **approach, qualify, invoice, deliver, and capture proof** for the first manual **USD 150** Lead Rescue paid pilot — without reading ten separate docs first.

> **DO NOT AUTOMATE SENDS.** Draft copy below is for Anton to review and send manually, one person at a time.

**Deeper canon (read when needed):**

| Topic | Doc |
| ----- | --- |
| Commercial playbook | `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` |
| Mauritius warm-network (if first pilot is MU) | `docs/revenue/MAURITIUS_PAID_PILOT_SALES_PACK_V1.md` |
| POP + deal desk (after yes) | `docs/operations/MAURITIUS_PAID_PILOT_DEAL_DESK_V1.md` |
| 48h setup detail | `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` |
| Discovery call | `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` |
| Pricing | `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` |
| Manual pro-forma | `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` |
| Proof rules | `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` |
| Sales vs delivery boundary | `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` |
| Evidence gap (§15) | This doc — minimum before "delivered" |
| Outreach candidate worksheet (C4) | `docs/lead-rescue/FIRST_OUTREACH_CANDIDATE_WORKSHEET.md` |
| Fulfilment evidence checklist (C5) | `docs/lead-rescue/FIRST_PAID_PILOT_FULFILMENT_EVIDENCE_CHECKLIST.md` |
| ERPNext sandbox rehearsal (money path) | `docs/operations/ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1.md` |
| Backbone decision (ERPNext retained; Odoo rejected for July) | `docs/operations/ERP_BACKBONE_DECISION_AUDIT_V1.md` |

---

## 1. Executive purpose

Get **one paying pilot** through a clean manual path:

1. Pick a **warm** prospect who already feels enquiry-follow-up pain.
2. Send a **short, personal** message (templates §3).
3. **Qualify** on a 15-minute call (§4).
4. Buyer submits intake at **`https://corpflowai.com/lead-rescue`**.
5. Send **manual USD pro-forma** (or ERPNext Quotation PDF only if §11 go/no-go in rehearsal runbook passes); payment instructions **separately** (§5).
6. Verify **cleared funds** manually before any setup; record in ERPNext sandbox if rehearsal complete (`ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1.md`).
7. Deliver **48-hour setup** + **7-day monitoring** (§6–§7).
8. Capture **proof** only with client permission (§8).

Goal is **proof the workflow runs**, not volume. Stop at **4 pilots** before expanding (`AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` §1).

---

## 2. First warm-prospect selection checklist

Pick someone Anton can reach **today** without cold scraping.

| # | Criterion | Pass? |
| - | --------- | ----- |
| W1 | Real relationship — referral, prior conversation, or mutual contact | |
| W2 | Owner or ops lead; can approve **USD 150** without procurement | |
| W3 | **Two+** enquiry channels in use (WhatsApp, form, email, Facebook, etc.) | |
| W4 | Has said (or clearly implies) enquiries get **lost or delayed** | |
| W5 | Can name **one missed enquiry** in the last 30 days (on call) | |
| W6 | Has a working website + email (wedge offer — not a website rebuild) | |
| W7 | Not asking for guaranteed leads, AI chatbot, or full CRM | |
| W8 | Comfortable with **manual bank transfer** after pro-forma | |

**Strong niches (Mauritius first):** property/real estate, contractors, owner-managed services. Clinics: **appointment enquiries only** — not clinical advice.

**Do not approach:** cold lists, enterprise procurement, regulated-data verticals without DPA, anyone wanting "more leads from ads" as the primary ask.

**Track privately** — spreadsheet or notes off-repo; cockpit opens only after intake (`AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md`).

---

## 3. Manual outreach scripts (do not send without Anton approval)

Replace `{first name}` and `{business name}`. One CTA per message. **No "pay now" / no card link.**

### 3.1 Short email

```text
Subject: Enquiries at {business name}

Hi {first name},

Small businesses I speak to often say enquiries land on WhatsApp, email,
and the website form — and follow-up depends on whoever notices first.

We run a 48-hour pilot that connects one channel to a daily lead list
with an instant owner alert. USD 150 launch pilot, invoiced after we
review your intake — no card on the page.

https://corpflowai.com/lead-rescue

Happy to answer questions.

{Anton}
CorpFlowAI
```

### 3.2 Short LinkedIn DM (no link in message 1)

```text
Hi {first name}, thanks for connecting.

Reason I reached out: most owner-operators I speak to lose enquiries
across WhatsApp, email, and forms — follow-up is whoever remembers.

We opened a 48-hour pilot: one channel connected, daily lead list,
instant alert. USD 150, invoiced after intake review.

Want me to send the one-page overview?
```

If they reply yes:

```text
Here it is: https://corpflowai.com/lead-rescue — 2–3 minute intake if
you want to proceed.
```

### 3.3 Short WhatsApp / manual message

```text
Hi {first name} — quick one.

We help businesses stop losing enquiries between WhatsApp, email, and
web forms: 48-hour setup, daily lead list, owner alert. USD 150 pilot,
invoiced after intake — no card on the page.

https://corpflowai.com/lead-rescue

Questions welcome.
```

**Longer variants:** `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md`, `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md`.

---

## 4. Qualification checklist (USD 150 launch pilot)

Use on a **15-minute call** before sending pro-forma. **All must be true** to invoice.

| # | Question / check | Why |
| - | ---------------- | --- |
| Q1 | Where do enquiries arrive today? (channels) | Confirms multi-channel pain |
| Q2 | Which channel is leakiest? | Pick **one** for pilot |
| Q3 | One specific recent missed enquiry? | Confirms felt pain |
| Q4 | Who handles replies day-to-day? | Alert recipient |
| Q5 | Rough volume per week? | Sizing (5–15/week is fine) |
| Q6 | Would a **daily list** help you personally? | Outcome fit |
| Q7 | Can you approve USD 150 without a committee? | Close path |
| Q8 | Time for 48h setup in next 5 business days? | Operator capacity |
| Q9 | Working email + WhatsApp confirmed? | Delivery channels |

**Close line:**

```text
Based on what you've told me, the pilot fits. Next step: submit the
intake at corpflowai.com/lead-rescue — we'll review within two business
hours and email the pro-forma.
```

**Not ready?** Thank them; send page anyway; check in 2–4 weeks. No pressure.

Full script: `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`.

---

## 5. Manual invoice / payment path

**Default:** manual **USD invoice / pro-forma first**. No gateway. No automated payment.

| Step | Action |
| ---- | ------ |
| 1 | Buyer submits intake at `/lead-rescue` |
| 2 | Anton reviews within ~2 business hours |
| 3 | Build pro-forma locally from `AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` |
| 4 | Email PDF + **payment instructions separately** (not on PDF — W1) |
| 5 | Buyer pays by agreed **manual transfer** |
| 6 | Buyer sends proof of payment (POP) |
| 7 | Anton verifies **cleared funds** in bank app — screenshot alone is **not** enough |
| 8 | Reply: payment confirmed; **48-hour clock starts** |

**What Anton may say:**

- *"USD 150 launch pilot, invoiced after we review your intake."*
- *"Payment instructions are sent separately after intake approval."*
- *"Setup begins after payment confirmation."*

**What Anton must not say:**

- Online card checkout / Pay now / Stripe live
- Guaranteed revenue, lead volume, or conversion
- Tax invoice / VAT invoice (until accountant gates close — use honest W5 line)
- Automated billing or instant payment confirmation

Mauritius POP detail: `docs/operations/MAURITIUS_PAID_PILOT_DEAL_DESK_V1.md` §2.

---

## 6. 48-hour setup expectation checklist

**Clock starts:** when cleared funds are verified (not when POP screenshot arrives).

| # | Task | Done |
| - | ---- | ---- |
| S1 | Open `/admin/lead-rescue/[id]`; status → paid setup | |
| S2 | Activity log: `payment_confirmed_manual` (no bank digits) | |
| S3 | Confirm **one** lead source (most leaky from Q2) | |
| S4 | Confirm owner WhatsApp + email for alerts/summaries | |
| S5 | Connect lead source (form / email / WhatsApp / Facebook — one only) | |
| S6 | Test enquiry → operator alert fires | |
| S7 | Google Sheet lead log (buyer view-only on Tab 1) | |
| S8 | First daily summary scheduled | |
| S9 | Hand-over message sent (WhatsApp + email) | |
| S10 | Target: hand-over within **48 hours** (up to 5 business days if access delays) | |

Detail: `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md`.

---

## 7. Seven-day pilot delivery checklist

| Day | Operator action |
| --- | --------------- |
| **0** | Hand-over complete; monitoring window dates recorded |
| **1–6** | Daily lead summary to buyer; operator alert on new enquiries; log in Sheet + activity log |
| **3** | Quick check: buyer receiving summaries? any missed alerts? |
| **7** | End-of-pilot recap call — counts only, no revenue promises |
| **7+** | Offer **monthly monitoring** (USD 99 / ~MUR 4,500) **only if pilot went well** — never on public page |
| **Close** | Record outcome; ask testimonial **permission** per §8 |

**Success = workflow ran** (capture, alert, daily view, follow-ups surfaced) — not "more leads guaranteed."

---

## 8. Proof capture checklist

**Pre-proof window:** no published testimonials, client logos, or case claims until first pilot completes **and** client approves.

| # | Rule |
| - | ---- |
| P1 | **No testimonials** on site or outreach until written client permission |
| P2 | **No client names** in marketing without permission |
| P3 | **No fabricated metrics** (%, revenue, "saved thousands") |
| P4 | **No** "Trusted by…" or fake logo strips |
| P5 | Capture **operator-side evidence** after pilot: intake row, pro-forma sent date, payment verified date, setup done date, channel connected, buyer's words on why they bought (private notes) |
| P6 | Testimonial ask **only after day 7** — show wording before any publish |
| P7 | Allowed now: structural proof already on `/lead-rescue` (USD 150, 48h, 7 days, no guarantee line) |

Schema when proof exists: `PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` §4.

---

## 9. Anton decision gates (Anton-only)

| Gate | Decision |
| ---- | -------- |
| G1 | **Who to approach** — warm list only |
| G2 | **Each outbound message** — draft, approve, send manually |
| G3 | **Qualification pass/fail** — all §4 true before pro-forma |
| G4 | **Pro-forma send** — W1–W5 on template |
| G5 | **POP verification** — cleared funds in bank |
| G6 | **Service start** — only after G5 |
| G7 | **Testimonial / case publish** — written permission |
| G8 | **Monthly monitoring quote** — after day 7 only |
| G9 | **Custom scope / Product A premium** — separate path; not USD 150 wedge |
| G10 | **PR merge** — Anton merges; Cursor does not self-merge |

---

## 10. No-go boundaries

| Boundary | Rule |
| -------- | ---- |
| Runtime / deploy | No app, env, DB, Vercel, or payment code changes from this pack |
| Outreach automation | No bulk send, n8n send, mail-merge, LinkedIn bots |
| Claims | No guaranteed revenue, lead volume, or conversion |
| AI positioning | Not a chatbot that replies to customers; humans follow up |
| Scope creep | No website rebuild, ads management, CRM migration, or multi-source in pilot |
| Secrets | No passwords, cards, or gov ID in chat/email/repo |
| Cold scale | No scraped lists; no paid ads for first pilots |
| Proof | No fake testimonials, metrics, or logos |
| Fifth pilot | Pause after 4 until first batch runs cleanly |

---

## 11. Map to live `/lead-rescue` and proof plan

**Live page promises** (align all outreach — do not contradict):

| Live commitment | Source |
| --------------- | ------ |
| **USD 150 launch pilot** | Hero badge + pricing block |
| **48-hour setup** after payment confirmation | Process section |
| **7-day pilot monitoring** | Included scope |
| **No card on this page** | Intake only |
| **Invoiced after intake review** | Post-intake flow |
| **We do not guarantee new revenue / more leads** | Limits section |
| Primary CTA: **Start my 48-hour setup** | Buyer-action CTA |

Component reference (read-only): `components/AiLeadRescueLanding.js`.

**Proof plan alignment** (`PROOF_VALIDATION_ASSET_PLAN_LR_V1.md`):

- Today: structural proof (numbers, process diagram) — **allowed**.
- After first paid pilot + permission: named testimonial or case — **gate P6–P7**.
- Validation video/demo without client: representational only, labelled — separate optional packet.

This operator pack stays in the **pre-proof** posture until Anton captures §8 evidence from a real pilot.

---

## 12. What is deferred

| Item | Why deferred |
| ---- | ------------ |
| Online card / SBM international gateway | Unresolved; manual POP only |
| ERPNext production invoicing / Print Designer PDF | Sandbox-first; manual Word/Pages pro-forma canonical |
| Automated POP → status updates | Manual verify only |
| n8n outbound sequences | Notify-only; no send |
| Published case study on site | After first pilot + permission |
| Monthly monitoring on public page | Quoted manually post-pilot |
| Cold 25-prospect cadence at scale | After warm path proves one pilot |
| Product A Mauritius premium | Separate funnel — `docs/marketing/PRODUCT_A_MAURITIUS_PROPERTY_OFFER_V1.md` |
| CRM / second database | One app, one Postgres |
| French/Creole outreach variants | Separate authorised packet |

---

## 13. One-screen daily operator loop

```text
[ ] One warm message or follow-up sent (manual)
[ ] Replies handled same day
[ ] Intake reviewed within 2 business hours if submitted
[ ] Pro-forma sent only when §4 qualification passes
[ ] No setup until bank confirms cleared funds
[ ] Daily summary sent during 7-day window
[ ] No DN phrases: guaranteed, pay now, AI replies for you, tax invoice
[ ] Proof evidence logged privately — nothing published without G7
```

---

## 14. Delivery verdict

**Docs-only.** **COMPLETE-AT-PR-MERGE** for the artefact. First paying pilot remains Anton-operated.

---

## 15. Operator evidence and dashboard gap (C2 — minimum before "delivered")

This section names the **smallest evidence set** Anton needs before calling the first USD 150 pilot **delivered** — without building a new CRM, second database, or revenue dashboard.

### 15.1 What must be captured manually (operator-held)

| # | Evidence | Where it lives | When |
| - | -------- | -------------- | ---- |
| E1 | Warm outreach sent + channel + date | Private spreadsheet / notes (sales surface) | Before intake |
| E2 | Qualification call notes (§4 all true) | Private notes or cockpit activity log after intake | Before pro-forma |
| E3 | Intake submission timestamp + cockpit id | `/admin/lead-rescue/[id]` | On intake |
| E4 | Pro-forma sent date + buyer email used | Cockpit activity log | After review |
| E5 | POP received + **cleared funds verified** date | Cockpit activity log (no bank digits) | Before setup |
| E6 | One lead source connected + test enquiry proof | Cockpit checklist + private screenshot | Within 48h setup |
| E7 | Daily summaries sent (days 1–7) | Cockpit activity log + buyer WhatsApp/email | Pilot window |
| E8 | Day-7 recap notes (counts only) | Cockpit activity log | End of pilot |
| E9 | Testimonial permission (if asked) | Written client reply — private until G7 | After day 7 |

**Verdict rule:** pilot is **delivered** when E1–E8 are true for that buyer. E9 is optional for delivery; required only before any publish.

### 15.2 What proof is **not** allowed yet

Per `PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` §3 — unchanged:

- No published testimonials, client names, logos, or case cards on `/lead-rescue` or outreach.
- No fabricated metrics (% uplift, revenue saved, "trusted by").
- No "paying client" social proof until written permission after E8.

Structural proof on the live page (USD 150, 48h, 7 days, no guarantee) **stays** — do not add new claims.

### 15.3 What `/change` can track now (and what it is not)

| Surface | Role for Lead Rescue first pilot |
| ------- | -------------------------------- |
| **`/admin/lead-rescue/[id]`** | **Primary delivery cockpit** — status pipeline, setup checklist, activity log (`AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md`). |
| **`/change`** | **Not the Lead Rescue operator console.** Use only if a separate CMP delivery ticket is opened for a **code/marketing change** tied to the pilot (e.g. a follow-up PR). Do not open `/change` tickets for every sales touch — that duplicates the spreadsheet + cockpit. |
| **Pre-intake prospects** | **Spreadsheet only** — never `/change`, never cockpit until intake (`handoff` doc §1). |

**Smallest safe alignment:** one cockpit row per paying intake; optional one CMP/`/change` ticket only when a **shipped deliverable** (not every operator step) needs factory tracking.

### 15.4 What must **not** become a new CRM or second database

| Temptation | Correct posture |
| ---------- | ---------------- |
| Track all 25 warm prospects in Postgres | **No** — spreadsheet until intake |
| Build a Lead Rescue CRM module | **No** — cockpit + handoff doc |
| Duplicate intake in Google Sheet after cockpit exists | **No** — cockpit is source of truth post-intake |
| n8n auto-logging every DM to DB | **No** — manual activity log entries |
| Second app / second Postgres | **Never** |

One app, one Postgres (`POSTGRES_URL`). Lead Rescue delivery state lives in existing `lead_rescue_intakes` + cockpit JSON — not a parallel system.

### 15.5 What can wait until **after** the first paid pilot

| Item | Wait because |
| ---- | ------------ |
| Revenue / conversion dashboard | No honest numbers until one pilot completes |
| Automated POP → status update | Manual verify is the gate today |
| Published case study on site | Needs E8 + G7 |
| ERPNext production invoicing | Manual pro-forma is canonical |
| Cold 25-prospect automation | Warm path must prove one pilot first |
| `/change` workflow for every operator step | Over-process before revenue proof |
| Validation video (CF-VID-0001) on page | Optional; not blocking first invoice |
| Monthly monitoring on public page | Post–day-7 conversation only |

### 15.6 How to avoid overbuilding before revenue proof

1. **One pilot, one cockpit row, one lead source** — resist multi-channel scope in pilot 1.
2. **Spreadsheet until intake; cockpit after intake** — do not merge the surfaces early.
3. **Manual evidence in activity log** beats a new dashboard widget.
4. **Do not open implementation PRs** for CRM, analytics, or payment automation until pilot 1 is **delivered** (E1–E8) and Anton reviews.
5. **Proof publish is a separate gate** (G7) — delivery ≠ marketing proof.

### 15.7 Minimum "delivered" checklist (operator sign-off)

```text
[ ] Cleared payment verified (E5)
[ ] 48h setup checklist complete in cockpit (E6)
[ ] 7 daily summaries sent (E7)
[ ] Day-7 recap completed (E8)
[ ] No public testimonial or metric published without G7
[ ] Delivery verdict: DELIVERED (operator) — not yet COMPLETE (live marketing proof)
```

**Delivery Reality:** first pilot **delivered** = operator evidence E1–E8. **Marketing COMPLETE** for proof = additional G7 + publish packet — deferred.
