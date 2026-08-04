# Pricing recommendation packet (Lead Rescue + Website Rescue)

**Status:** Operator recommendation packet for [#714](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/714)  
**Audience:** Anton + operators preparing quotes  
**Not:** a final immutable price list · **Not:** public marketing copy

<!-- PRICING_RECOMMENDATION_PACKET_V1 -->

## Pricing posture (read first)

| Layer | Meaning |
|---|---|
| **Recommendation** | Suggested bands in this packet for operator use while quoting |
| **Configured example** | Synthetic fixture amounts used in tests (e.g. USD 150 pilot, MUR 45,000 T1) |
| **Anton-approved final price** | Only when Anton explicitly confirms for a live deal (or when an existing repo guide already documents a public floor) |

**This PR does not create an external commercial commitment.**  
Do **not** state that Anton has approved every band below unless repository evidence already shows it.

**Existing evidence (public / operator guides):**

- Lead Rescue launch pilot **USD 150** + monitoring **USD 99/mo** — documented in `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` and public single-offer doctrine.
- Website Rescue T1 public floor **MUR 45,000** — documented in `docs/sales/WEBSITE_RESCUE_PRICING_GUIDE.md`. T2/T3 remain recommendations pending Anton gates in that guide.

---

## 1. Lead Rescue

### 1.1 Recommended commercial position (default)

| Option | Setup (one-off) | Recurring | When to use |
|---|---|---|---|
| **Pilot (recommended default for first paid)** | **USD 150** (MUR converted at invoice time) | Optional **USD 99/mo** after pilot | First pilots; single leaky source |
| **Standard (post-pilot / returning)** | Recommendation band **USD 250–450** setup | **USD 99–149/mo** monitoring | After case studies exist; multi-source still usually separate |

### 1.2 Assumptions driving price

- One named leaky enquiry source in the pilot window.
- Manual operator summaries (no automated messaging runtime unless separately authorised).
- No CRM migration; no revenue guarantees.
- Operator capacity for concurrent pilots is limited.

### 1.3 Scope that triggers a higher tier / separate quote

- More than one lead source at setup.
- Custom dashboards / BI.
- WhatsApp/email runtime automation.
- Historical data import.
- Integration beyond the agreed pilot board / sheet.

### 1.4 Discount boundaries

- Do not discount the **public USD 150 pilot** without Anton.
- Do not invent a cheaper public offer that breaks single-offer doctrine.
- In-kind / deferred payment requires a **written payment exception** on the commercial record.

### 1.5 Payment-term options

- `pilot_full_upfront` (default for pilots)
- `deferred_payment_exception` (named approver + written reason)
- `net_7` / `net_14` (returning clients only, Anton discretion)

---

## 2. Website Rescue

### 2.1 Recommended commercial position

| Case / tier | Setup band | Recurring | Notes |
|---|---|---|---|
| **one-page / T1 Premium Landing** | **MUR 45,000** (public floor) | Optional maintenance (separate) | Default entry |
| **upgrade / brochure T2** | **MUR 55,000–75,000** (recommendation) | Optional maintenance | Anton gate on edges |
| **rebuild / T3** | **MUR 75,000–120,000** (recommendation) | Optional maintenance | After URL audit |
| **small-catalogue** | Quote inside T2–T3 band by page/SKU count | Optional | Cap catalogue size; e-commerce engines out of scope |

Deposit pattern (recommendation / existing guide): **50% deposit**, balance before production.

### 2.2 Assumptions driving price

- Client supplies content and assets (or pays for stock separately).
- Preview on CorpFlow-managed surfaces; production cutover is a **separate authorised step** (not implied by quote acceptance alone).
- Structured revision rounds only (see sales guide).
- No SEO ranking, traffic, or revenue guarantees.

### 2.3 Scope that triggers a higher tier / separate quote

- Extra page sets beyond quoted IA.
- Booking engines / full e-commerce.
- Custom animations / photography shoots.
- DNS / hosting migration as a paid change order if not already scoped.
- Lead Rescue add-on (always separate SKU / separate commercial record).

### 2.4 Discount boundaries

- Do not go below **T1 MUR 45,000** floor without Anton.
- Do not publish T2/T3 numbers on public pages until the sales guide’s Anton gates say so.
- Extra preview rounds: quote change order (guide suggests MUR 3,000–5,000) or absorb deliberately.

### 2.5 Payment-term options

- `deposit_50_balance_before_production` (recommended default)
- `full_upfront`
- `deferred_payment_exception` (rare; named Anton approval)

---

## 3. Shared rules

- Currency must be explicit on every proposal (`USD` or `MUR`).
- Validity period: recommend **14 days** unless stated otherwise.
- Change orders require a new proposal version.
- Financial approval gate ignores “handshake” claims without acceptance + payment evidence (or complete exception).

## 4. Anton decision

`ANTON ACTION: Review pricing recommendations and merge decision only. No external commercial commitment is created by this PR.`
