# Lead Rescue — Quote-Ready Commercial Packet v1

**Status:** Concise, copy-paste-ready commercial slice for **#653** / PR **#656**. Docs only — no deploy, outreach, pricing approval, payment runtime, or messaging send.
**Parent index:** `docs/marketing/LEAD_RESCUE_PRODUCT_PACK_V1.md`
**Anchor sentinel:** `<!-- LEAD_RESCUE_QUOTE_READY_PACKET_V1 -->`

<!-- LEAD_RESCUE_QUOTE_READY_PACKET_V1 -->

**Pricing note:** Numbers below are **recommendations for Anton's decision** — not approved commercial commitment until Anton signs off (see product pack §7).

---

## At a glance

| Field | Answer |
|-------|--------|
| **Offer** | AI Lead Rescue Setup — USD 150 launch pilot |
| **Who buys** | Owner-operator / ops lead, 1–20 staff, multi-channel enquiries, warm-network intro |
| **Problem** | Enquiries get buried; no reliable daily follow-up view |
| **Setup** | 48 hours after payment + required client info (up to 5 business days if clarification needed) |
| **Pilot window** | 7 days daily summary + monitoring included |
| **Public page** | `https://corpflowai.com/lead-rescue` |
| **Smallest sales action** | Send one warm WhatsApp using §11 below → intake on `/lead-rescue` |

---

## 1. Exact problem solved

Small businesses receive property viewings, quote requests, and appointment enquiries across **WhatsApp, Facebook, website forms, and email**. Replies are manual, memory-based, and slow. Enquiries slip through when the owner is on site, over the weekend, or when messages pile up in one channel.

**AI Lead Rescue fixes:** one named leaky lead source connected to **operator alerts + a shared lead log + daily WhatsApp/email summaries** for seven days — so the buyer sees who to follow up with each morning. It is a **managed lead-response operating workflow with human review**, not a chatbot, CRM rebuild, or revenue guarantee.

---

## 2. Target customer

**Strong fit (first 1–4 pilots):**

- Mauritius warm-network intro (property, trades, or clinic — appointment-enquiry only).
- Owner or ops lead with authority to approve ~USD 150 without procurement.
- Receives enquiries on **≥2 channels** and has said enquiries get lost or buried.
- Has a working website and email; pain is **response**, not “no website.”

**Not in scope for this pilot window:** cold international lists, enterprise procurement, regulated clinical/financial records, buyers wanting “full CRM,” “AI agent,” or guaranteed lead volume.

---

## 3. Bounded pilot scope (included)

| # | Deliverable |
|---|-------------|
| 1 | Intake review within **2 business hours** (target) after form submit |
| 2 | Discovery alignment on the **one most-leaky lead source** |
| 3 | Manual pro-forma invoice (USD 150); payment via wire after intake approval |
| 4 | **48-hour setup** after payment clear + required client info |
| 5 | **One** lead source connected (website form, Facebook DM, WhatsApp, or portal email — operator picks priority) |
| 6 | Operator-side alerts on new enquiries |
| 7 | Buyer **WhatsApp + email daily summary** for **7 days** |
| 8 | **Google Sheet** lead log (view-only to buyer) |
| 9 | Hand-over message at end of setup |
| 10 | **Day-7 recap** with weekly numbers |

Canonical detail: `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` §2.1.

---

## 4. Exclusions

- Second or third lead source (pilot = **one** source only).
- Website redesign, new forms, or landing-page build.
- CRM migration, custom dashboards, or BI reporting.
- Chatbot / “AI agent” on the buyer’s site.
- Phone-call tracking or missed-call automation.
- Paid ads, SEO, content, or cold bulk outreach.
- **Guaranteed revenue, lead volume, or conversion.**
- Clinical triage or regulated-data processing.
- Card checkout, auto-renew, or subscription billing (this phase).

---

## 5. Delivery steps (operator)

```text
1. Buyer submits intake at /lead-rescue (#intake)
2. Operator reviews in /admin/lead-rescue → qualify / discovery call
3. Operator sends manual pro-forma (template: docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md)
4. Buyer pays wire → operator confirms → status PAID_SETUP
5. 48h setup: connect one source → alerts → Sheet → smoke test
6. Hand-over (WhatsApp + email)
7. Days 1–7: daily summaries
8. Day 7: recap → optional USD 99/mo monitoring quote (operator decision after pilot)
```

Runbooks: `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md`, `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`.

---

## 6. Client inputs required (minimum)

Before the 48-hour clock starts (after wire clear):

| Input | Notes |
|-------|-------|
| Business display name | Confirm spelling from intake |
| Active WhatsApp number | For daily summaries |
| Active email | For daily summaries |
| **One named lead source** | The “most leaky” channel from discovery |
| Owner first name | Hand-over message |
| Preferred timezone | Daily summary timing |
| Access to connect that source | Form recipient, inbox forward, or Meta/WhatsApp cooperation |

**Never collect:** card data, passwords, government ID, health records, full CRM exports.

---

## 7. Acceptance criteria (pilot complete)

Pilot is **accepted complete** when all are true:

- [ ] Wire confirmed and activity log records `payment_confirmed_manual`
- [ ] One lead source connected and smoke-tested (operator received alert on test enquiry)
- [ ] Google Sheet lead log live and shared view-only to buyer
- [ ] Hand-over message sent (WhatsApp + email) listing what is live
- [ ] Seven daily summaries delivered (or agreed pause documented)
- [ ] Day-7 recap sent with counts (enquiries seen, follow-ups flagged)
- [ ] Buyer can state in one sentence what happens when a new enquiry arrives

---

## 8. Implementation duration

| Phase | Duration |
|-------|----------|
| Intake → pro-forma | Target ≤2 business hours after submit |
| Payment → setup start | After wire clears operator account |
| **Setup window** | **48 hours** from payment + required info |
| Clarification extension | Up to **5 business days** if access/scope pending (W3 wording) |
| **Included monitoring** | **7 calendar days** after hand-over |
| Post-pilot monthly | Optional; quoted separately — not auto-renewed |

---

## 9. Recommended price and payment structure (Anton decision — not approved here)

| Item | Recommended | Payment structure |
|------|-------------|-------------------|
| **Launch pilot (setup + 7-day monitoring)** | **USD 150** one-off | Manual pro-forma after intake review; **no card on public page** |
| **Mauritius pro-forma equivalent** | **~MUR 7,000** | SBM USD→MUR at invoice time; round to nearest MUR 100 |
| **Post-pilot monitoring** | **USD 99 / month** (~MUR 4,500) | Quoted after day-7 only if buyer continues; wire per month; no auto-debit |

**Operator rules:** single public offer on `/lead-rescue`; no discounts except pricing guide §4; W1–W5 verbatim on every pro-forma.

**Anton must confirm:** A1 in `LEAD_RESCUE_PRODUCT_PACK_V1.md` §7 before treating pricing as locked for external quotes.

---

## 10. Demonstrated working URLs (GET verified 2026-07-28 UTC)

| URL | HTTP | Role |
|-----|------|------|
| `https://corpflowai.com/lead-rescue` | **200** | Primary sellable surface + intake |
| `https://aileadrescue.corpflowai.com/` | **200** | Alias host (same offer) |
| `https://corpflowai.com/lead-rescue/property-mauritius` | **200** | Mauritius property framing |
| `https://corpflowai.com/offers/ai-lead-rescue` | **200** | Separate MUR Rapid Delivery sprint — **not** the USD pilot CTA |
| `https://core.corpflowai.com/admin/lead-rescue` | **200** | Operator cockpit (session required for pipeline) |

Full evidence record: `docs/marketing/LEAD_RESCUE_DEMONSTRATION_PATH_V1.md`.

---

## 11. Quotation-ready wording

### 11a. One-paragraph offer (email / WhatsApp body)

> **AI Lead Rescue — launch pilot (USD 150)**  
> We connect your busiest enquiry channel to a simple daily follow-up workflow: operator alerts, a shared lead log, and a WhatsApp + email summary every morning for seven days. Setup targets 48 hours after payment and the information we need from you. No card on our page — we review your intake first and send a pro-forma. We do not guarantee revenue, lead volume, or conversion.  
> Start here: **https://corpflowai.com/lead-rescue** → *Start my 48-hour setup*.

### 11b. Scope line (pro-forma / quote header)

> **AI Lead Rescue Setup — launch pilot:** one lead source connected; operator alerts; Google Sheet lead log; daily WhatsApp and email summaries for 7 days; hand-over and day-7 recap. **USD 150** (one-time). Monthly monitoring available after pilot by separate quote.

### 11c. Required legal / fulfilment lines (verbatim — do not paraphrase)

From `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` §1:

- **W1.** *"Payment instructions are sent separately after intake approval."*
- **W2.** *"Setup begins after payment confirmation and receipt of required client information."*
- **W3.** *"Lead Rescue setup is targeted within 48 hours after payment confirmation and receipt of all required client information. Where additional clarification, access, client input, or scope confirmation is needed, setup will normally be completed within 5 business days unless otherwise agreed."*
- **W4.** *"No revenue, lead volume, or conversion outcome is guaranteed."*
- **W5.** *"VAT/tax treatment pending accountant confirmation."*

### 11d. Exclusions paragraph (quote footer)

> Out of scope for this pilot: additional lead sources, website redesign, CRM migration, custom reporting, chatbots, phone tracking, paid advertising, cold outreach, and any guaranteed business outcome. Clinical or regulated-data processing is not included.

---

## 12. Smallest immediate sales action

**Do this next (one buyer, warm intro only):**

1. Pick **one** Mauritius warm contact who has complained about missed WhatsApp or viewing enquiries.
2. Send **§11a** (edit first name only).
3. When they reply, book **15 minutes** using `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`.
4. After fit confirmed, ask them to submit intake at `https://corpflowai.com/lead-rescue` — do not collect payment in chat.
5. Track in `docs/sales/AI_LEAD_RESCUE_PROSPECT_LIST_TEMPLATE.md`.

No bulk send. No cold scrape. No pricing change without Anton A1.

---

## Quote-ready verdict

| Criterion | Status |
|-----------|--------|
| Problem, customer, scope, exclusions | ✅ |
| Delivery steps + client inputs + acceptance | ✅ |
| Duration + price recommendation (Anton gate) | ✅ (price **not** approved) |
| Live URL evidence | ✅ (2026-07-28 GET) |
| Copy-paste quotation blocks + W1–W5 | ✅ |
| Smallest sales action | ✅ |

**Pack is quote-ready** for operator use **after** Anton confirms pricing (A1). Until then, use wording as draft only.
