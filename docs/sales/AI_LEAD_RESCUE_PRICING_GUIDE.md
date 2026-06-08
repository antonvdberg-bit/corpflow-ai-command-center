# AI Lead Rescue — Pricing Guide (operator-side)

**Audience:** the operator quoting AI Lead Rescue to prospects.

**Status:** Operator-side reference. Docs-only — no runtime, no env vars, no schema changes.

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_PRICING_GUIDE_V1 -->`

<!-- AI_LEAD_RESCUE_PRICING_GUIDE_V1 -->

## What this doc is for

This is the **operator-side** pricing guide. The **public** page (`/lead-rescue`) advertises **one offer**: *AI Lead Rescue Setup — USD 150 launch pilot*. That public-page rule is governed by `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *single-offer rule*.

This document tells the operator:

- What the pilot costs in USD (international) and MUR (Mauritius).
- What the post-pilot monthly monitoring costs in USD and MUR.
- What is **included** and **excluded** at each price point.
- When to deviate (custom quote) and when not to.
- How the manual pro-forma invoice path works while VAT activation is held.
- How to handle every "what's the price?" objection without breaking single-offer doctrine.

## 1. Headline pricing — first paying pilots

| Item | International (USD) | Mauritius (MUR — operator-side conversion) |
|---|---|---|
| **AI Lead Rescue Setup — launch pilot** | **USD 150** (one-off) | **~MUR 7,000** (operator converts at current SBM USD→MUR rate when issuing the pro-forma) |
| **Monthly monitoring (after pilot)** | **USD 99 / month** | **~MUR 4,500 / month** (operator converts at current rate per invoice) |

**Important — the buyer-facing public page only quotes USD 150**. The MUR amount lives on the manual pro-forma invoice the operator sends after intake review. The MUR amount is the operator's conversion of the USD amount at the time of invoicing — it is **not** a separate Mauritius price tier.

### 1.1 Why these numbers

- **USD 150 pilot.** This is **launch-pilot pricing**, not the long-run setup fee. It's intentionally low because we don't have published case studies yet — the buyer is paying for the work *and* taking the early-mover risk that the case study isn't proven yet. The price reflects that.
- **USD 99 / month monitoring.** Conservative, sustainable for one operator running ≤10 concurrent monitorings, and well below typical CRM + agency-managed-inbox pricing the buyer might compare against. Designed to be *unambiguously cheap* for first paying clients so the conversion question becomes *"does it work?"* rather than *"is it worth it?"*.
- **MUR equivalents** are computed at invoice time, not preset. SBM USD→MUR sell rate is the reference; round to the nearest MUR 100 (e.g. USD 150 at MUR ~46.50/USD → MUR 6,975 → quote MUR 7,000).

### 1.2 What the buyer pays today vs. later

For first paid pilots only:

- **Pilot:** USD 150 / ~MUR 7,000 — payable up front via manual wire transfer (SBM Bank Mauritius for warm network; international wire for non-Mauritian buyers, USD invoice).
- **Monthly monitoring:** Not auto-renewed. Quoted **after** the 7-day monitoring window if the buyer says yes (see § 5 of `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md`).

There is **no card-on-file**, **no auto-debit**, **no subscription provider** in the first-paid-pilots phase.

## 2. What is included

### 2.1 Pilot (USD 150 / MUR 7,000) — included

- Operator review of the buyer's intake submission within **2 business hours**.
- Identification of the **one most-leaky lead source** (from discovery call Q2).
- **48-hour setup window** starting on the day the wire clears the operator account.
- **One** lead source connected to operator alerts (see § 3 of `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md`).
- **Daily lead summary** to the buyer's WhatsApp + email for 7 days (manually composed by the operator).
- **Buyer-shared Google Sheet** (view-only) with daily lead log (Tab 1: Leads).
- **Operator alerts** routed to the operator (Telegram) so new leads get an immediate human response.
- **Hand-over message** at end of setup window (WhatsApp + email) summarising what's live.
- **End-of-pilot recap** at day 7 with weekly numbers.
- **Operator availability** during the 48-hour setup + 7-day monitoring window: same-day response on WhatsApp during operator working hours (operator's Mauritius timezone for warm network; explicit timezone note for international).

### 2.2 Monthly monitoring (USD 99 / MUR 4,500) — included

- Continued **daily lead summary** to buyer's WhatsApp + email.
- Continued **operator alerts** on the connected lead source.
- **One free lead-source change** per month (e.g. swap the Facebook DM connection for a website-form connection if the buyer's enquiry mix changes).
- **Operator availability** during operator working hours.
- **Monthly recap** at end of each month with numbers.

## 3. What is **excluded** (and how to phrase it on call)

### 3.1 Pilot — excluded

| Out-of-scope | How to phrase it |
|---|---|
| Multi-source connection (>1 lead source) | *"The pilot intentionally connects one source — the one that's most leaky. We can add a second during monthly monitoring if it lands well."* |
| Custom dashboards / reports / BI | *"The pilot is a Google Sheet and daily summaries. If you need custom reporting, that's a different scope and not what the launch pilot covers."* |
| New website / new website forms / website redesign | *"We don't redesign your website. We connect the channel that's already there."* |
| CRM data migration from another vendor | *"We don't migrate CRM data. The pilot is a forward-looking lead-response workflow, not a backfill."* |
| Paid advertising / SEO / content marketing | *"We don't run paid ads or do SEO. We help you respond to enquiries that are already coming in."* |
| Chatbot / AI agent on your website | *"The pilot is not a chatbot. It's a managed lead-response workflow with a human operator."* |
| Phone-call tracking / missed-call follow-up | *"Phone tracking is out of pilot scope. Document for the monthly conversation if it matters."* |
| Bulk email / mass DM / cold-outreach automation | *"We don't run cold outreach for you. The pilot is for enquiries that are coming in to you."* |

### 3.2 Monthly monitoring — excluded

Same exclusions as § 3.1 plus:

| Out-of-scope | How to phrase it |
|---|---|
| Same-day adds of new lead sources mid-month | *"One source change per month is included. More than one in a month moves into custom-quote territory."* |
| Custom integrations with proprietary systems | *"That's outside monthly monitoring scope. Let me put a written quote together."* |
| 24/7 operator availability | *"Operator availability is during my working hours. Out-of-hours leads are still captured and alerted, but my reply is next morning."* |

## 4. Discount rules

**Default:** No discounts on the launch pilot. The price is already at launch-pilot floor.

**Permitted discounts** (operator authority, no separate sign-off needed):

| Scenario | Discount allowed | Cap |
|---|---|---|
| Two pilots paid together (same buyer, same week) | -10% on the second pilot only | Second pilot: USD 135 / ~MUR 6,300 |
| Warm-network introduction (intro fee already netted out — see § 6) | None — keep the introducer's share separate | n/a |
| Buyer is also a public reference / case study | None on pilot price; instead, **comp the first month** of monitoring | Monthly monitoring month 1: USD 0 |
| Buyer has paid a previous CorpFlow operator pilot in any product | -USD 30 / MUR 1,500 on the new pilot setup | New pilot: USD 120 / ~MUR 5,500 |

**Forbidden:**

- ❌ Free pilots (under any framing — *"free trial"*, *"trial period"*, *"on the house"*).
- ❌ Pay-on-results (*"pay if it works"*) — see § 7 *no-guaranteed-revenue language*.
- ❌ Discounts negotiated mid-call without explicit checklist match above.
- ❌ Volume discounts on monthly monitoring before 4 paying pilots have been delivered (the operator does not yet know the cost-to-serve curve).
- ❌ Bartering (e.g. *"I'll give you free legal/accounting/consulting in exchange for the pilot"*).

If the buyer asks for a discount that doesn't match § 4 above, **decline politely** (see § 9.4 of `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`). Do **not** invent a discount.

## 5. Manual invoice path (warm-network primary route)

**Why manual invoicing.** ERPNext production VAT activation is held until the financial-side packets clear (see `docs/finance/ERPNEXT_*` and the corresponding hold notes). For first paid pilots, the operator issues a **manual pro-forma invoice** rather than an ERPNext-generated tax invoice.

### 5.1 Invoice content (USD invoice — international)

The pro-forma must include:

- **Heading:** *"Pro-forma Invoice — AI Lead Rescue Setup"*.
- **Invoice number:** simple monotonic per-pilot, e.g. `AILR-2026-001`, `AILR-2026-002`. Operator owns the sequence in a private notebook / spreadsheet.
- **Date issued.**
- **Buyer:** business name, primary contact name, country, email.
- **Description (one line):** *"AI Lead Rescue Setup — launch pilot (48-hour managed setup + 7-day monitoring window)"*.
- **Amount:** **USD 150**.
- **Payment method:** *"Manual wire transfer to SBM Bank Mauritius"* — operator account name + IBAN/SWIFT + bank reference instructions (provided in the invoice). For international buyers, the same SBM details apply; the buyer pays SWIFT/correspondent fees.
- **Due:** *"Setup window starts when wire clears operator account."*
- **Footer note:** *"Pro-forma issued pending VAT activation — this is not a tax invoice. A tax invoice will be issued retrospectively once VAT registration completes, for buyers requesting it."*
- **No card-on-file. No automated billing. No subscription mechanics.**
- **No guaranteed revenue claims. No ROI numbers in the invoice.**

### 5.2 Invoice content (MUR invoice — Mauritius warm network)

Same as § 5.1 with:

- **Currency:** MUR.
- **Amount:** ~MUR 7,000 (operator converts USD 150 at current SBM USD→MUR sell rate, rounded to nearest MUR 100).
- **Payment method:** SBM Bank Mauritius MUR account (operator-side).
- **Footer note:** *"Pro-forma issued pending VAT activation — this is not a tax invoice. A tax invoice will be issued retrospectively once VAT registration completes."*

### 5.3 Invoice delivery

- Email PDF to the buyer's confirmed email (from intake form / discovery call).
- Mirror via WhatsApp (PDF or screenshot is fine — the email is the canonical version).
- Activity-log entry in `/admin/lead-rescue/[id]`: type `manual_pro_forma_sent`, channel `email`, note: *"USD 150 pro-forma sent to buyer email. AILR-2026-NNN. Awaiting wire."*
- **Do not** log the buyer's bank details in the activity log. The activity-log warning in `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § *How to use the activity log* applies.

## 6. Warm-network introducer share

If a paid pilot lands via a warm-network introducer:

- The introducer share is paid **separately** (not deducted from the buyer-facing pilot price).
- Recommended starter share: **20% of the pilot fee** (USD 30 / ~MUR 1,400) for the first paid pilot they introduce, paid to the introducer **after the wire clears the operator account**.
- For monthly monitoring: a one-time recurring share of **10% of month 1 monitoring** (USD 9.90 / ~MUR 450), not ongoing.
- **No ongoing referral commission** in the first-paid-pilots phase — this would create a misaligned incentive for cold-volume introductions before the operator has product-market fit.

## 7. "No guaranteed revenue" language

This is the most important paragraph in this doc. **Every** quote, invoice, email, WhatsApp message, and call must respect it:

> ✅ Allowed: *"This pilot is designed to make sure your existing enquiries get captured, alerted, and tracked daily — so fewer slip through. Whether more of those convert to viewings/clients depends on what you do once they're in front of you."*
>
> ❌ Forbidden: *"This pilot will get you 5 more clients next month."*
>
> ❌ Forbidden: *"You'll see X% increase in revenue."*
>
> ❌ Forbidden: *"Pay if it works — no results, no fee."* (pay-on-results creates a guaranteed-outcome implication even when softened).
>
> ❌ Forbidden: *"AI will handle your sales."*
>
> ❌ Forbidden: *"This is fully automated."*
>
> ❌ Forbidden: *"You'll never miss a lead again."* (absolute claim — replace with *"so fewer slip through"*).

**Every** quote that goes out, written or verbal, must be framed as *"existing enquiries get captured, alerted, and tracked"* — never as *"new revenue"*. This is `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *no-guarantee copy* applied operationally.

If a buyer asks *"will this make me more money?"*, the right answer is the wording above — not a number.

## 8. When to quote custom (and how)

Quote a **custom** scope only when **all** of the following are true:

- Volume materially exceeds pilot scope (>200 enquiries/week sustained).
- Multiple lead sources required from day 1 (>1 source, with a clear named-source list).
- Buyer has explicitly asked for a written quote rather than the pilot.
- Buyer is willing to wait 2 business days for the written quote.

Custom-quote ranges (operator reference, do **not** put in the public-facing collateral):

| Custom shape | Recommended setup quote | Recommended monthly quote |
|---|---|---|
| 2-source pilot setup, single buyer | USD 750 (one-off) | USD 199 / month |
| Multi-location buyer (e.g. property agency with 3 branches sharing one inbox) | USD 1,500 (one-off) | USD 299 / month |
| Premium custom (multi-location + custom dashboard + named-account operator availability) | USD 3,000+ — defer to a separate operator authorisation packet | n/a |

**Do not quote premium-custom (USD 3,000+) without separate sign-off** during first-paid-pilots phase. The operator has not yet validated the cost-to-serve at that tier and the brand-doctrine risk of over-promising is too high.

For custom quotes, use the same single-offer mental model: pick **one** clear scope, quote **one** number, send **one** pro-forma. Don't list 3-tier *good/better/best* options in early-pilot phase.

## 9. How to handle every "what's the price?" objection (cross-ref)

See `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md` § *"How much?"* and `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` § 9 *Soft close patterns*. Short version, taped to operator's monitor:

- **"How much?"** → *"USD 150 launch pilot. 48-hour managed setup. 7-day monitoring window. Manual wire transfer through SBM. No card on the public page."*
- **"That's expensive."** → *"It's launch-pilot pricing — it's the lowest we'll offer it at. Once we have published case studies, the price moves up. The reason it's at this number now is exactly because we're at the launch stage."*
- **"That's cheap. What's the catch?"** → *"No catch. It's narrow scope on purpose — one lead source, 48-hour setup, 7-day monitoring window. The price reflects the scope."*
- **"Can I get a discount?"** → *"The pilot is at the floor. The 4 places we permit discounts are: two pilots paid together, comping month 1 monitoring for a public reference, ex-CorpFlow operator clients, and warm-network intros (handled separately). If one of those applies, tell me — otherwise, no."*
- **"Can I pay in instalments?"** → *"For USD 150, no. The wire is one transfer; that's how we keep the pilot lightweight on both sides."*
- **"Can I pay after results?"** → *"No — pay-on-results sets the wrong expectation. The pilot is paid up front because we're managing your existing enquiries, not selling you a guaranteed outcome."*

## 10. Operator-side hygiene

For every quote that goes out:

- [ ] Pro-forma matches § 5.1 / § 5.2 exactly (no card mechanics, no recurring billing language).
- [ ] No guaranteed-revenue language anywhere in invoice, email, or WhatsApp message (§ 7).
- [ ] Activity-log entry of type `manual_pro_forma_sent` in the cockpit (§ 5.3).
- [ ] No buyer card / banking detail logged anywhere (cockpit, sheet, notes).
- [ ] No quote stored in the public-facing site or marketing copy outside the single offer.

## Cross-references

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — single-offer rule, no-guarantee copy.
- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — managed-workflow framing, why we don't compete on price.
- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — first-paid-pilots playbook.
- `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` — discovery script (this PR).
- `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md` — outreach scripts (this PR).
- `docs/sales/AI_LEAD_RESCUE_PROSPECT_LIST_TEMPLATE.md` — prospect list template (this PR).
- `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` — operator-side onboarding (this PR).
- `docs/finance/ERPNEXT_PRINT_DESIGNER_EVALUATION_V1.md` — context on why pro-forma is manual.
