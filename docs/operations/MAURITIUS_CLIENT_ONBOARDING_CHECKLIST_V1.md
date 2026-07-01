# Mauritius client onboarding checklist (v1)

**Status:** Operator-ready onboarding and delivery-start checklists. **Docs / process only.** No runtime, no deploy, no env/secrets, no automated sends.

**Owner:** Anton (operator).

**Stream:** Stream 3 — Mauritius paid pilot delivery and POP deal desk.

**Anchor sentinel:** `<!-- MAURITIUS_CLIENT_ONBOARDING_CHECKLIST_V1 -->`

<!-- MAURITIUS_CLIENT_ONBOARDING_CHECKLIST_V1 -->

**Created:** 2026-07-01.

**Prerequisite:** Payment verified per `docs/operations/MAURITIUS_PAID_PILOT_DEAL_DESK_V1.md` § 2 — **do not start onboarding before cleared funds.**

**Companion doc:** `docs/operations/MAURITIUS_PAID_PILOT_DEAL_DESK_V1.md` — deal desk stages, POP verification, client comms templates.

> **DO NOT AUTOMATE SENDS. Anton approval required before external communication.**

---

## 0. How to use this checklist

1. Open when deal desk reaches `ONBOARDING_OPEN` (`PAYMENT_VERIFIED`).
2. Complete **§ 1** (client intake) for all tiers.
3. Branch to **§ 2** (Lead Rescue wedge) or **§ 3** (Product A premium).
4. Tick items in order; note blockers in private tracker or cockpit activity log.
5. Schedule **§ 4** first client follow-up before marking `SERVICE_STARTED` complete.

---

## 1. Onboarding intake checklist (all tiers)

Collect from client via intake form, kickoff call, or secure follow-up. **Never request passwords, OTPs, card numbers, or government ID in chat or email.**

### 1.1 Business and contact

| # | Item | Source | Notes |
| - | ---- | ------ | ----- |
| 1.1 | **Business name** (trading + legal if different) | Intake / call | Confirm spelling for invoice |
| 1.2 | **Website URL** (if any) | Intake / call | `none` is valid for listings-only operators |
| 1.3 | **Main contact** (name + role) | Intake / call | Owner or operations lead |
| 1.4 | **Email** (working, monitored) | Intake / call | Daily summary destination |
| 1.5 | **WhatsApp** (working, monitored) | Call confirm | Alert + summary destination |
| 1.6 | **Service area** (geography) | Call | e.g. North Mauritius, island-wide |
| 1.7 | **Target customer** (who buys from them) | Call | e.g. villa renters, commercial tenants |

### 1.2 Enquiry operations

| # | Item | Notes |
| - | ---- | ----- |
| 1.8 | **Enquiry channels** (all in use) | List: WhatsApp, Property24, Facebook, site form, email, phone, walk-in |
| 1.9 | **Most leaky channel** (one for pilot) | From discovery — wedge connects **one** first |
| 1.10 | **Current follow-up process** | Who replies, how fast, what tools today |
| 1.11 | **Who handles leads** day-to-day | Named person for alerts |
| 1.12 | **Existing CRM/tools** | Spreadsheet, GHL, notebook, none — no full export required |

### 1.3 Brand and materials (as needed)

| # | Item | When required |
| - | ---- | ------------- |
| 1.13 | **Logo / brand assets** | Product A premium or if wedge needs branded daily view |
| 1.14 | **Brand colours / tone** | Product A premium |
| 1.15 | **Listing links or property samples** | Property vertical — public URLs only |

### 1.4 Access needed later (security warning)

Document **what** access is needed — collect **how** via secure channel only when setup starts.

| Access type | Wedge | Premium | Security rule |
| ----------- | ----- | ------- | ------------- |
| Website form admin / email forward | Often | Often | No passwords in repo or GitHub |
| Facebook / Meta Business Suite | Sometimes | Sometimes | Owner-invited; no credential sharing in WhatsApp |
| WhatsApp Business | Sometimes | Sometimes | Forwarding or shared device for pilot week only |
| Domain / DNS | Rare in wedge | Common in premium | Separate secure handoff; factory master only |
| Property portal inbox forward | Property niche | Property niche | Email forward rule only |

**Client-facing security line:**

```text
We never need your banking passwords or card details. For technical
access we'll use secure methods only — I'll explain exactly what
before we ask for anything sensitive.
```

### 1.5 Onboarding intake — operator sign-off

- [ ] All § 1.1–1.2 items captured
- [ ] Tier confirmed: wedge / premium
- [ ] No secrets collected in email/WhatsApp/chat logs committed to repo
- [ ] Cockpit record open at `/admin/lead-rescue/[id]` (wedge) or premium tracker
- [ ] Client sent § 4.4 payment-verified message from deal desk doc

---

## 2. Lead Rescue wedge — first 48-hour delivery-start checklist

**Applies to:** USD 150 launch pilot — `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` is the deep runbook; this is the Mauritius Stream 3 tick list.

**Clock starts:** when deal desk marks `PAYMENT_VERIFIED`.

### 2.1 Confirm lead sources (hours 0–4)

- [ ] Reconfirm **one** lead source for pilot (most leaky from § 1.9).
- [ ] Document channel type: form / email / WhatsApp / Facebook / portal email.
- [ ] Owner agrees not to add second source during 48h window.
- [ ] Smoke path identified (how test enquiry will arrive).

### 2.2 Define lead stages (hours 0–6)

- [ ] Agree status labels for pilot week (default: `new` → `replied` → `followed-up` → `won` / `lost` / `no-response`).
- [ ] Document in Google Sheet Tab 1 or cockpit notes.
- [ ] Owner understands they still reply to customers — system surfaces, does not auto-reply.

### 2.3 Define alert / review process (hours 4–12)

- [ ] Alert destination: buyer WhatsApp + email (not Telegram for buyer).
- [ ] Operator Telegram alert wired for new enquiries (operator-side).
- [ ] Owner names who acts on alerts within agreed window (e.g. same business day).
- [ ] After-hours rule documented (alert still fires; reply time expectation set).

### 2.4 Draft intake / lead capture path (hours 6–18)

- [ ] Connection method chosen per `AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 3 priority table.
- [ ] Test enquiry sent; row appears in lead log.
- [ ] Owner receives alert on test enquiry.

### 2.5 Set manual follow-up board (hours 12–24)

- [ ] Google Sheet Tab 1 (*Leads*) created — structure per onboarding runbook § 5.
- [ ] Tab 2 (*Activity*) operator-internal only.
- [ ] Buyer view-only link prepared (not shared until hand-over).

### 2.6 Prepare owner-facing daily view (hours 18–36)

- [ ] Daily summary format agreed (email and/or WhatsApp bullet list).
- [ ] First daily summary scheduled for morning after go-live.
- [ ] Owner shown where to see new + open follow-ups.

### 2.7 Define first success metric (hours 24–48)

- [ ] One metric for 7-day pilot — examples:
  - *"Every new enquiry appears in daily list within 15 minutes."*
  - *"Owner can name count of enquiries received Mon–Sun."*
  - *"Zero enquiries older than 24h without status in board."*
- [ ] Metric recorded in cockpit Commercial card / private tracker.
- [ ] **Not** revenue or lead-volume guarantee — workflow metric only.

### 2.8 Hand-over (by hour 48 target)

- [ ] Hand-over message sent (WhatsApp + email) per `AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md`.
- [ ] Activity log: `delivery_handoff` entry.
- [ ] Deal desk: `SERVICE_STARTED` → schedule `FIRST_FOLLOWUP_SCHEDULED` (day 3 of monitoring).
- [ ] 7-day monitoring window dates recorded.

### 2.9 Wedge sign-off

- [ ] 48-hour checklist complete or documented exception with client agreement
- [ ] Client knows how to reach Anton during pilot week
- [ ] Monthly monitoring **not** sold until day-7 recap (pricing guide)

---

## 3. Product A Mauritius premium — delivery-start checklist

**Applies to:** Website & Lead Rescue Audit → scoped project after quote accepted and payment verified.

**Scope reference:** `docs/marketing/PRODUCT_A_MAURITIUS_PROPERTY_OFFER_V1.md`.

Premium delivery is **multi-week**; this checklist covers **first delivery actions** after onboarding opens — not the full build.

### 3.1 Confirm website / audit scope (days 1–3)

- [ ] Audit intake answers reviewed (`/product-a/mauritius`).
- [ ] Written scope summary: rebuild vs migration vs capture hardening only.
- [ ] Page count and enquiry-path goals agreed.
- [ ] Out-of-scope list confirmed (no booking engine, no portal syndication, no ads management).
- [ ] Quote amount matches verified payment or agreed milestone 1 deposit.

### 3.2 Collect brand / materials (days 1–5)

- [ ] Logo files (vector or high-res PNG).
- [ ] Brand colours, fonts if fixed.
- [ ] Photography: client-supplied or licensed stock per visual standard.
- [ ] Copy source: owner bullet points or existing site scrape (public only).
- [ ] Property/listing samples if property vertical.

### 3.3 Review current lead journey (days 2–5)

- [ ] Map: enquiry entry → first reply → viewing/quote → close.
- [ ] Identify drop-off points (matches Stream 2 discovery notes).
- [ ] Document channels to support post-launch (Lead Rescue layer).
- [ ] Name owner for post-launch alerts.

### 3.4 Identify missing trust / proof / content (days 3–7)

- [ ] What buyer needs to trust the business: team photo, licenses, testimonials (with permission only).
- [ ] No fabricated testimonials or metrics.
- [ ] Gaps listed as content tasks — not blockers for technical capture path.
- [ ] Pre-proof window: honest "launch pilot" posture if no case studies yet.

### 3.5 Define site / funnel sections (days 5–10)

- [ ] Sitemap agreed (e.g. Home, Listings/Services, Contact, About).
- [ ] Primary CTA: buyer-action oriented per brand doctrine.
- [ ] One primary conversion goal per page.
- [ ] Mobile scan test planned.

### 3.6 Define Lead Rescue layer (days 5–10)

- [ ] Which form/channel is primary capture on new site.
- [ ] Alert + daily list owner (same as wedge pattern).
- [ ] Handoff from site form to operator workflow documented.
- [ ] Lead Rescue pilot may run in parallel during build if one channel live early.

### 3.7 Define delivery milestones (days 7–14)

| Milestone | Typical content | Client review |
| --------- | --------------- | ------------- |
| M1 | Scope + wireframe / section approval | 15-min call |
| M2 | Draft site on preview URL | Async feedback |
| M3 | Enquiry capture + alerts live on preview | Test submission |
| M4 | Production publish (separate authorisation) | Go-live check |
| M5 | Lead Rescue operating layer hand-over | Same as wedge § 2.8 |

- [ ] Milestones dated in private tracker or GitHub delivery issue.
- [ ] Client-facing review points scheduled (§ 4).
- [ ] **No production DNS/tenant cutover** without separate authorised packet.

### 3.8 Premium sign-off (first delivery phase)

- [ ] M1 scope document sent to client (manual, approved).
- [ ] Deal desk `SERVICE_STARTED` with milestone 1 in progress.
- [ ] GitHub or CMP ticket created if multi-PR delivery (deal desk § 5.2).

---

## 4. First follow-up schedule (after service starts)

| When | Wedge | Premium |
| ---- | ----- | ------- |
| **Day 1 post hand-over** | Quick WhatsApp: *"Everything working on your side?"* | Confirm materials received |
| **Day 3 monitoring** | Check daily summary delivered; any missed alerts | M1 review if scheduled |
| **Day 7** | Pilot recap call — monthly monitoring decision | Milestone progress review |
| **Day 14** | Closed won or monthly active | M2 feedback if on schedule |

Use deal desk templates for structured messages; ad-hoc check-ins stay manual.

---

## 5. What not to collect

- Passwords, OTPs, PINs, card numbers, CVV.
- Government ID, passport, NIC.
- Full CRM/database exports from other vendors.
- Client bank details (they pay you — you do not need their account numbers).
- Health, financial, or regulated PII beyond enquiry contact for the pilot.

---

## 6. Cross-references

| Topic | Doc |
| ----- | --- |
| Deal desk + POP | `docs/operations/MAURITIUS_PAID_PILOT_DEAL_DESK_V1.md` |
| Wedge deep runbook | `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` |
| Sales → delivery | `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` |
| Product A offer | `docs/marketing/PRODUCT_A_MAURITIUS_PROPERTY_OFFER_V1.md` |
| Brand / CTA rules | `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` |
| Stream 2 context | `docs/revenue/MAURITIUS_PAID_PILOT_SALES_PACK_V1.md` |

---

## 7. Delivery verdict

**Docs-only.** **COMPLETE-AT-PR-MERGE** for the artefact.
