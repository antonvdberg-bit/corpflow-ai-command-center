# Mauritius paid pilot deal desk (v1)

**Status:** Operator-ready deal desk. **Docs / process only.** No runtime, no deploy, no env/secrets, no DB/schema, no payment integration, no automated sends.

**Owner:** Anton (operator) — POP verification, pro-forma send, service-start approval.

**Stream:** Stream 3 — Mauritius paid pilot delivery and POP deal desk.

**Anchor sentinel:** `<!-- MAURITIUS_PAID_PILOT_DEAL_DESK_V1 -->`

<!-- MAURITIUS_PAID_PILOT_DEAL_DESK_V1 -->

**Created:** 2026-07-01.

**Upstream:** Stream 2 merged PR #514 (`9af78be7`) — `docs/revenue/MAURITIUS_PAID_PILOT_SALES_PACK_V1.md`, `docs/revenue/MAURITIUS_DISCOVERY_AND_FOLLOW_UP_SEQUENCE_V1.md`.

**Companion doc:** `docs/operations/MAURITIUS_CLIENT_ONBOARDING_CHECKLIST_V1.md` — client intake, wedge 48-hour setup, Product A premium delivery-start.

**Operates under:** Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

> **DO NOT AUTOMATE SENDS. Anton approval required before any external communication.**

---

## 0. Purpose

When a Mauritius prospect says **yes**, this deal desk defines the exact internal path from commercial close → manual payment verification → onboarding → delivery start — without inventing the process live.

**Core control:** No delivery work starts until Anton manually verifies cleared funds. A POP screenshot alone is never sufficient.

---

## 1. Deal desk flow (stages)

Track each deal through these stages. Status can live in Anton's private tracker, ERPNext sandbox (operator-run), and `/admin/lead-rescue/[id]` once intake exists.

| Stage | Code | Definition | Owner | Exit criteria |
| ----- | ---- | ---------- | ----- | ------------- |
| **1** | `YES_SPOKEN` | Prospect verbally commits (call, WhatsApp, email) | Anton | Tier confirmed (wedge or premium); intake link sent or agreed |
| **2** | `OFFER_CONFIRMED` | Offer tier + price posture locked | Anton | Wedge = USD 150; premium = quoted amount after audit |
| **3** | `DETAILS_COLLECTED` | Legal/business details for invoicing | Anton | Business legal/trading name, contact, email, phone, country = Mauritius |
| **4** | `PROFORMA_PREPARED` | Pro-forma or project quote built locally | Anton | W1–W5 on wedge pro-formas; no bank digits in repo artifacts |
| **5** | `PROFORMA_SENT` | Document + payment instructions sent **separately** 1:1 | Anton | Sent timestamp logged; instructions via secure channel only |
| **6** | `POP_RECEIVED` | Client sends proof of payment | Client | POP logged (reference only — not verified yet) |
| **7** | `POP_UNDER_REVIEW` | Anton checks POP against bank | Anton | § 2 checklist complete or held |
| **8** | `PAYMENT_VERIFIED` | Cleared funds confirmed in CorpFlowAI account | Anton | Amount + payer match; verification note (no account numbers) |
| **9** | `ONBOARDING_OPEN` | Onboarding checklist opened | Anton | `MAURITIUS_CLIENT_ONBOARDING_CHECKLIST_V1.md` started |
| **10** | `DELIVERY_RECORD` | Cockpit / delivery record active | Anton | `/admin/lead-rescue/[id]` and/or delivery ticket per § 8 |
| **11** | `SERVICE_STARTED` | Setup clock running | Anton | Wedge: 48h target; premium: milestone 1 per onboarding doc |
| **12** | `FIRST_FOLLOWUP_SCHEDULED` | Post-kickoff client touch booked | Anton | Date in tracker |
| **13** | `CLOSED_WON` or `CLOSED_LOST` | Terminal commercial state | Anton | Won = pilot/project complete or monthly accepted; Lost = declined/refunded |

### 1.1 Stage diagram

```text
Stream 2: YES_SPOKEN
    │
    ▼
OFFER_CONFIRMED → DETAILS_COLLECTED → PROFORMA_PREPARED → PROFORMA_SENT
    │
    ▼
POP_RECEIVED → POP_UNDER_REVIEW → PAYMENT_VERIFIED  ◄── Anton-only gate
    │
    ▼
ONBOARDING_OPEN → DELIVERY_RECORD → SERVICE_STARTED → FIRST_FOLLOWUP_SCHEDULED
    │
    ▼
CLOSED_WON / CLOSED_LOST
```

### 1.2 Intake timing

- **Canonical:** buyer submits public intake **before or with** pro-forma path (`/lead-rescue` or `/product-a/mauritius`).
- **Out-of-band:** very warm prospect wires first → still request intake for cockpit record per `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` § 3.2.
- **Do not** open delivery cockpit for prospects who have not said yes and have not submitted intake (except out-of-band paid path).

---

## 2. Manual POP verification

POP is **proof of a payment claim**, not proof of cleared funds. Anton verifies independently in the bank app or statement.

### 2.1 Verification checklist (Anton completes each item)

| # | Check | Pass criteria | If fail |
| - | ----- | ------------- | ------- |
| V1 | **Payer name** | Matches invoice customer or agreed payer (individual vs company noted) | Hold — ask client to confirm payer |
| V2 | **Amount** | Matches pro-forma / quote (USD 150 wedge or agreed premium total; currency as invoiced) | Hold — partial/wrong amount |
| V3 | **Reference** | Payment reference or memo matches invoice number if one was requested | Note mismatch; verify anyway if V2+V4 pass |
| V4 | **Date** | Payment date reasonable (not future-dated; not stale beyond agreed window) | Hold if suspicious |
| V5 | **Bank/account confirmation** | Funds **cleared** in CorpFlowAI receiving account (`[OPERATOR_BANK_APP]` — not documented here) | **Do not mark verified** on screenshot alone |
| V6 | **Offer/tier** | Payment aligns with wedge vs premium line item | Hold if wrong SKU/amount for tier |
| V7 | **Proof completeness** | Screenshot or slip shows amount + date + sender; not cropped/obscured | Request clearer POP |
| V8 | **Reversible methods** | If method can be reversed, wait for cleared status | Hold until cleared |

### 2.2 Verification record (store off-repo)

Log only — **never commit to repo:**

- Date/time verified
- Who verified (Anton)
- Invoice/pro-forma reference
- POP received date
- Pass/fail per V1–V8
- One-line note (e.g. *"USD 150 cleared; payer matches customer name"*)

**Do not store:** full bank account numbers, SWIFT/IBAN, card data, full bank statements with account digits.

### 2.3 If unclear — hold protocol

1. **Do not** start setup or mark Paid in ERPNext.
2. Reply to client with § 7.3 template (*POP received, under review*).
3. Check bank again next business day.
4. If still ambiguous after 3 business days → ask client for bank confirmation letter or alternate proof.
5. Escalate to Anton if fraud concern (wrong payer, duplicate POP, amount mismatch).

### 2.4 Anti-fraud minimum

- Verify sender is the client or named payer on the invoice.
- Treat duplicate POPs for one invoice as a hold until reconciled.
- Never start work on *"I will pay tomorrow"* or uncropped mobile-banking previews without cleared balance.

---

## 3. ERPNext / manual tracking fields

**Docs/process only** — no ERPNext configuration in this PR. When Anton uses ERPNext sandbox, map fields as follows.

### 3.1 Customer / deal record fields

| Field | Required | Notes |
| ----- | -------- | ----- |
| Business name | Yes | Trading name on invoice |
| Contact person | Yes | Main operator contact |
| Email | Yes | Pro-forma + onboarding |
| Phone / WhatsApp | Yes | Day-to-day delivery |
| Source | Yes | Referral, warm network, segment |
| Offer selected | Yes | `wedge_lead_rescue` or `premium_product_a_mauritius` |
| Quoted amount | Yes | USD 150 (wedge) or project quote (premium) |
| Invoice/pro-forma status | Yes | See § 3.2 |
| POP received | Yes/No | Date when POP arrives |
| Payment verified | Yes/No | Only Yes after § 2 complete |
| Onboarding status | Yes | `not_started` / `in_progress` / `complete` |
| Delivery owner | Yes | Default: Anton |
| Next follow-up date | Yes | Client + internal |
| Closed won/lost | Terminal | `won` / `lost` + reason |

### 3.2 Invoice / pro-forma status values

`draft` → `issued` → `sent` → `pop_received` → `pop_under_review` → `paid_verified` → `setup_started` → `monitoring` → `closed`

- **Paid** in ERPNext only when `paid_verified` (Anton manual).
- Wedge pro-forma: `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` — verbatim W1–W5.

### 3.3 Evidence attachments (off-repo)

- Pro-forma PDF sent
- POP image/PDF (client-supplied)
- Verification note
- Onboarding completion note

Per `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` § 2.5–§ 3.5.

---

## 4. Client communication templates

> **DO NOT AUTOMATE SENDS. Anton approval required before external communication.**

Replace `{first name}`, `{business name}`, `{invoice ref}`, `{date}`.

### 4.1 Thank you / next step after yes

```text
Hi {first name} — great, let's get this moving.

Next steps:
1) Please submit the intake here: {intake URL — wedge or premium}
2) We'll review within two business hours
3) I'll email the pro-forma and send payment instructions separately

If anything on the form doesn't match what we discussed, reply here and we'll fix it before invoicing.

{Anton}
```

### 4.2 Invoice / pro-forma sent

```text
Hi {first name},

Please find attached pro-forma {invoice ref} for {business name}.

Payment instructions are in this email separately (not on the PDF).
Setup begins after we confirm cleared funds — usually within one business day of payment.

Questions welcome.

{Anton}
```

*(Payment instructions: operator pastes from secure store — `[PAYMENT_INSTRUCTIONS_PLACEHOLDER]` — never commit real bank details to repo.)*

### 4.3 POP received, under review

```text
Hi {first name} — thanks, we received your payment proof.

I'm confirming cleared funds in our account and will reply once verified.
No need to send again unless we ask.

{Anton}
```

### 4.4 Payment verified, onboarding starts

```text
Hi {first name} — payment confirmed. Thank you.

Your setup window starts now. Target hand-over: {date + 48h for wedge}.

I'll message you shortly with a short list of what we need to connect your first enquiry channel. Reply on WhatsApp or email, whichever is easier.

{Anton}
```

### 4.5 Missing information request

```text
Hi {first name} — quick ask so we can start clean:

{numbered list — e.g. confirm WhatsApp for alerts; name the lead source to connect; confirm business name spelling}

No passwords or card details needed — we'll use secure access only where required later.

{Anton}
```

### 4.6 Delivery kickoff scheduled

```text
Hi {first name},

Kickoff call: {date/time} ({timezone}).
We'll confirm lead source, alert routing, and what you'll see in the daily view.

If you need to reschedule, reply with two alternatives.

{Anton}
```

---

## 5. Handoff to `/change`, GitHub, or delivery board

Keep **Core/Factory**, **CorpFlowAI business systems**, and **client tenant surfaces** separate.

| Surface | When to use (Mauritius paid pilot) | What goes there |
| ------- | ---------------------------------- | --------------- |
| **`/admin/lead-rescue/[id]`** | **Default for wedge pilots** — intake submitted | Qualification, setup checklist, activity log, commercial card |
| **Private operator tracker / ERPNext sandbox** | Every deal from `YES_SPOKEN` | POP status, invoice state, follow-up dates |
| **`/change` (Lux tenant)** | **Not** default for Mauritius Lead Rescue wedge | Lux client delivery only — do not mix Mauritius pilot ops into Lux `/change` unless delivering Lux tenant work |
| **GitHub issue** | Internal CorpFlow delivery packet, multi-week Product A build, cross-team coordination | Link from #249 or dedicated delivery issue — not for every USD 150 pilot |
| **Delivery checklist** | Payment verified | `MAURITIUS_CLIENT_ONBOARDING_CHECKLIST_V1.md` + `AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` |
| **Client-facing review point** | End of wedge 48h or Product A milestone | WhatsApp/email hand-over summary; optional 15-min review call |

### 5.1 Wedge (Lead Rescue) — standard path

1. Intake → cockpit auto-created (`AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` § 3.1).
2. Activity log: pro-forma sent → `payment_confirmed_manual` → setup milestones.
3. **No `/change` ticket** unless the client is also a Lux tenant with scoped work.

### 5.2 Premium (Product A Mauritius) — extended path

1. Audit intake on `/product-a/mauritius`.
2. Quote + pro-forma via deal desk stages 1–8.
3. After payment verified → onboarding checklist § 6 (premium).
4. **Consider GitHub delivery issue** if website build spans multiple PRs; **CMP `/change` ticket** only if using Change Console for governed client delivery (factory master) — not required for first pilots if operator-tracked.

### 5.3 Boundaries

- Mauritius pilot commercial state lives in deal desk + cockpit — not in Lux marketing CMS.
- Do not create tenant hostnames or production tenant records without separate authorised packet.

---

## 6. Manual now vs later automation

| Activity | Manual today (v1) | Later automation candidate | Approval before automation |
| -------- | ----------------- | -------------------------- | -------------------------- |
| Pro-forma PDF generation | Word/Pages template locally | ERPNext Print Designer PDF | Accountant + HB gates |
| Payment instructions send | Anton 1:1 email/WhatsApp | None until card gateway authorised | Anton + finance |
| POP receipt logging | Anton marks `POP_RECEIVED` | n8n notify-only on email alias | Security review; no auto-verify |
| POP verification | Anton bank app | **Never auto-verify** | N/A — stays manual |
| Payment verified → status update | Anton updates tracker/ERPNext | n8n could notify operator on bank email | No auto-mark Paid |
| Onboarding checklist | Anton runs doc checklist | Template reminder in cockpit | Product decision |
| Client comms templates | Anton sends manually | n8n send | **Forbidden** until explicit outreach automation packet |
| Telegram operator alert on intake | Existing automation event | Keep notify-only | Already live per runbook |
| Daily lead summary to client | Operator manual / semi-manual | Scheduled n8n summary | Client comms approval |

**n8n today:** notify-only per `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` § 4.3 — not wired to POP or deal-desk status changes.

---

## 7. Hard gates

| Gate | Rule |
| ---- | ---- |
| No payment runtime | No Stripe/PayPal/gateway/checkout in this stream |
| No accounting automation | No auto GL posting, no auto Sales Invoice submit |
| No outbound email/WhatsApp/SMS automation | All client messages Anton-approved and manual |
| No env/secrets changes | This PR does not touch Vercel, Infisical, or `.env` |
| No DB/schema changes | Cockpit schema unchanged |
| No production deploy | Docs-only |
| No client-facing launch | No new public URLs or marketing publish |
| No paid tools | No new vendor spend |
| No second app/database | One production app, one Postgres |
| No work before verified payment | § 2 is non-negotiable |
| No bank details in repo | Placeholders only in docs |
| Cursor does not self-merge | Anton owns merge |

---

## 8. Stream 2 → Stream 3 handoff summary

| Stream 2 delivers | Stream 3 picks up at |
| ----------------- | -------------------- |
| Prospect said yes (`YES_SPOKEN` in sales pipeline) | Stage 1–2: offer + details |
| Intake submitted | Stage 4–5: pro-forma |
| Sales pack evidence fields | § 3 tracking fields |
| Discovery notes (pain, trigger, tier) | Onboarding checklist pre-fill |
| Stream 2 closed-won handoff note | Stage 6+: POP → verify → onboard |

**Stream 2 docs:** `docs/revenue/MAURITIUS_PAID_PILOT_SALES_PACK_V1.md` § 8.

---

## 9. Cross-references

| Topic | Doc |
| ----- | --- |
| Client onboarding + delivery-start checklists | `docs/operations/MAURITIUS_CLIENT_ONBOARDING_CHECKLIST_V1.md` |
| POP + ERPNext sequencing | `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` |
| Wedge 48-hour onboarding | `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` |
| Sales → delivery boundary | `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` |
| Operator runbook | `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` |
| Manual pro-forma | `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` |
| Stream 2 sales pack | `docs/revenue/MAURITIUS_PAID_PILOT_SALES_PACK_V1.md` |
| Product A premium offer | `docs/marketing/PRODUCT_A_MAURITIUS_PROPERTY_OFFER_V1.md` |

---

## 10. Delivery verdict

**Docs-only.** **COMPLETE-AT-PR-MERGE** for the artefact. Live deal processing remains Anton-gated.
