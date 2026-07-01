# Mauritius paid pilot sales pack (v1)

**Status:** Operator-ready sales pack. **Docs / process only.** No runtime, no deploy, no env/secrets, no DB/schema, no payment integration, no automated sends, no external outreach execution.

**Owner:** Anton (operator) — all approvals, all outreach, all payment verification.

**Stream:** Stream 2 — Mauritius client-getting machine.

**Anchor sentinel:** `<!-- MAURITIUS_PAID_PILOT_SALES_PACK_V1 -->`

<!-- MAURITIUS_PAID_PILOT_SALES_PACK_V1 -->

**Created:** 2026-07-01.

**Operates under:** Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) · throughput reference [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493) · service-sales doctrine `docs/marketing/06_SERVICE_BUSINESS_SALES_AND_FUNNEL_DOCTRINE.md` (PR #510).

**Purpose:** Give Anton a single, practical Mauritius-first pack to start paid conversations manually — what to say, who to target, which offer to lead with, how to route wedge vs premium, and how to move prospects toward a clear yes/no — **without waiting for SBM international card collection**.

**Companion doc:** `docs/revenue/MAURITIUS_DISCOVERY_AND_FOLLOW_UP_SEQUENCE_V1.md` — discovery call script + value-led follow-up sequence.

---

## 0. Hard boundaries (read once)

| Rule | Detail |
| ---- | ------ |
| **Human approval** | Every external message is drafted, reviewed, and sent **manually by Anton** (or an operator Anton authorises). |
| **No automation** | No bulk send, mail-merge, LinkedIn automation, WhatsApp API sequences, n8n send, or CRM auto-sequences. |
| **No card checkout** | SBM international card collection remains **unresolved**. Manual pro-forma + proof-of-payment (POP) only. |
| **No guarantees** | No revenue, lead-volume, or conversion-outcome promises. |
| **Warm network first** | Mauritius warm-network contacts only for the first paid-pilot window — no cold-scraped lists. |
| **Canonical docs win** | If this pack conflicts with `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md`, `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md`, or brand doctrine, **the canonical doc wins**. |

> **DO NOT AUTOMATE SENDS. Anton approval required before any external outreach.**

---

## 1. Offer ladder (Mauritius-first)

CorpFlowAI sells **two separate buyer journeys** in Mauritius. Each URL carries **one offer**. Anton chooses the ladder step in discovery — do not present both as a menu in the first message.

| Tier | Name | Surface | Buyer problem | Public offer | When to lead |
| ---- | ---- | ------- | ------------- | ------------ | ------------ |
| **Entry wedge** | Lead Rescue property/service-business pilot | `/lead-rescue/property-mauritius` or `/lead-rescue` | Enquiries slip across WhatsApp, Facebook, Property24, web forms, email — follow-up is memory-based | **AI Lead Rescue Setup — USD 150 launch pilot** (48-hour setup target, 7-day monitoring, invoiced after intake review) | **Default** for warm outreach when the buyer has a workable site and pain is missed/delayed follow-up |
| **Premium** | Product A Mauritius | `/product-a/mauritius` | Website is weak or fragmented **and** multi-channel enquiries need a managed operating workflow | **Request a Website & Lead Rescue Audit** — scope + quote after intake review; no fixed public price | Buyer explicitly needs website rebuild/migration **plus** enquiry operations — not follow-up alone |

### 1.1 Wedge — what the buyer gets

- One lead source connected (form, email, WhatsApp, Facebook, or similar — agreed at intake).
- Instant owner/operator alert when a new enquiry arrives.
- Daily lead list and 7-day follow-up board.
- 48-hour setup target after **manual payment confirmation** (normally within 5 business days if access questions arise).
- Human operator accountability — not a chatbot that replies to customers.

### 1.2 Premium — what the buyer gets

- Website & Lead Rescue audit intake → operator reviews scope.
- AI-ready website rebuild or migration + enquiry capture hardening + Lead Rescue operating workflow.
- Quote and manual pro-forma **after** audit review — project pricing is case-by-case, not on the public page.

### 1.3 Manual payment route (both tiers)

While SBM international card collection is unresolved:

1. Buyer submits intake (wedge) or audit request (premium).
2. Anton reviews fit within ~2 business hours.
3. Anton issues manual pro-forma from `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` (wedge) or project quote (premium) — verbatim **W1–W5** on wedge pro-formas.
4. Payment instructions sent **separately** (not as a live checkout link).
5. Buyer pays locally (bank transfer / deposit); sends proof of payment (POP).
6. Anton **manually verifies cleared funds** — POP screenshot alone is not sufficient.
7. Work starts only after verification.

Full POP semantics: `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md`.

### 1.4 Routing quick reference

| Buyer signal | Send |
| ------------ | ---- |
| "We have a website; enquiries get lost in WhatsApp / Facebook" | Wedge → `/lead-rescue/property-mauritius` |
| "Our website doesn't represent us / no clear enquiry path / listings-only presence" | Premium → `/product-a/mauritius` |
| "We need a chatbot / AI agent / guaranteed more leads" | Decline — not the offer |
| Unsure | Start wedge conversation; upgrade only if website scope is clearly required |

**First 1–4 paid pilots default:** wedge unless website rebuild is explicit.

---

## 2. Buyer profile — who to approach first

Target people Anton can **actually reach** — warm network, referral, prior conversation, mutual contact. Cold-scraped lists are **out** for this window.

### 2.1 Primary segments (Mauritius)

| Segment | Examples | Why they fit | Pain phrase to listen for |
| ------- | -------- | ------------ | ------------------------- |
| **Mauritius real estate agencies** | Rental/sales agencies, boutique agencies, multi-agent offices | High enquiry volume; Property24 + WhatsApp + Facebook + site forms; memory-based triage | *"Viewing requests probably slipped through last week"* |
| **Property consultants** | Independent agents, buyer's agents, commercial-property brokers | Low-frequency, high-value enquiries; one miss is expensive | *"I have no idea how many we missed"* |
| **Premium service businesses** | Clinics/wellness (appointment enquiries only), contractors, home services, solar, security | Weekend pile-ups; team on site; slow reply loses to whoever calls back first | *"A quote went cold because we didn't reply in time"* |
| **Owner-led businesses** | Any 1–20 staff operator who personally handles WhatsApp + web + email + staff handoff | Owner feels every missed enquiry; no Monday-morning visibility | *"The message got buried in WhatsApp"* |

### 2.2 Strong-fit checklist (all should be true before pushing to invoice)

- 1–20 staff; owner or operations lead can approve spend without procurement.
- Enquiries arrive through **at least two** channels.
- Buyer can name **one specific recent missed or delayed enquiry** (last 30 days).
- Buyer-language pain — *"we lose enquiries"* — not *"we need more leads from ads"*.
- Comfortable with manual pro-forma + local bank transfer path.
- Not asking for guaranteed revenue, a customer-replying bot, or a full CRM replacement.

### 2.3 Do not approach (first pilot window)

- Cold international prospects or scraped contact lists.
- Enterprise procurement cycles.
- Regulated verticals needing a signed DPA before any data crosses.
- Buyers who want "AI agent / chatbot / guaranteed leads / full CRM" — decline the misframed offer.
- Anyone Anton does not know and has no real referral path to.

### 2.4 Where to keep the prospect list

- **Populated list stays off-repo** (local spreadsheet, private Sheet, or operator notes).
- Template schema: `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_SALES_ACTIVATION_PACK_V1.md` § 3.1.
- Property-first 25 template: `artifacts/lead_rescue_mauritius_property_first_25_template.csv`.

---

## 3. Positioning — Reality Gap Method

Apply `docs/marketing/06_SERVICE_BUSINESS_SALES_AND_FUNNEL_DOCTRINE.md` on every call, message, and follow-up.

### 3.1 Current reality (where the buyer is now)

- Enquiries arrive through messy channels: WhatsApp, Facebook DMs, Property24, website forms, email, walk-ins, staff phones.
- Follow-up is inconsistent — depends on whoever remembers, especially after hours and weekends.
- Leads disappear between handoffs; the owner has **no single view** of what came in or what was answered.
- Cost shows up as lost viewings, cold quotes, reputation damage, and owner stress — often uncounted.

### 3.2 Desired future reality (where they want to be)

- Every new enquiry is **captured** in one place.
- The owner or named operator gets an **instant alert**.
- Follow-up is **visible** — a daily list and a simple board, not memory.
- Response ownership is clear; nothing sits silent for days without someone seeing it.
- The owner can **review** what happened last week without digging through five apps.

### 3.3 CorpFlowAI as bridge (what we install)

> You already have the demand. The problem is too much of it disappears between WhatsApp, forms, inboxes, staff follow-up, and unclear ownership. We install a practical lead-response operating layer — capture, alert, daily list, follow-up board — with a human operator accountable for setup and the pilot window. Not a generic AI chatbot. Not a SaaS dashboard you have to learn.

**Weak framing to avoid:** *"AI-powered automation platform with advanced workflows and chatbot capabilities."*

---

## 4. One-page sales pack (conversation sheet)

Use this in calls, meetings, or as the mental model before sending a link. Calm, owner-friendly language. No hype.

### Headline

**Stop losing enquiries between WhatsApp, your website, and your inbox.**

### Who it is for

Mauritius owner-operators and small teams (especially property and premium services) who receive enquiries in multiple places and follow up from memory.

### The problem

Enquiries arrive faster than anyone can track. After hours and weekends are worst. Nobody can answer *"how many did we miss last month?"*

### The outcome

Every new enquiry captured, visible, and followed up — with a daily list the owner can actually use.

### What we install (wedge pilot)

- Connection to **one** agreed lead source.
- Instant alert to the owner/operator.
- Daily lead list + 7-day follow-up board.
- Operator-led setup and monitoring during the pilot.

### First 48 hours / pilot period

| Phase | What happens |
| ----- | ------------ |
| **After payment confirmed** | 48-hour setup clock starts (target; up to 5 business days if access questions). |
| **Setup** | Lead source connected; alerts tested; daily list live. |
| **Days 1–7** | Operator monitoring; buyer uses the daily view; follow-ups surfaced each morning. |
| **End of pilot** | Review together; decide on monthly monitoring or close — no pressure. |

### What the client needs to provide

- One lead source to connect (form, email, WhatsApp Business, Facebook, etc.).
- One named person who receives alerts in the first 48 hours.
- Working email and WhatsApp for operator contact.
- Access details for the chosen channel (credentials or forwarding — agreed at intake).
- Payment via agreed manual route after pro-forma review.

### Pricing / quote posture

| Tier | Posture |
| ---- | ------- |
| **Wedge** | USD 150 launch pilot — one price, invoiced after intake review. Optional monthly monitoring (~USD 99 / ~MUR 4,500) quoted **only after** the pilot demonstrates value — never in cold outreach. |
| **Premium** | Audit first; project quote after scope review. No fixed price on the page. |

Canonical numbers: `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md`.

### Manual payment path

- No card on the public page.
- Pro-forma issued after intake approval; payment instructions sent separately.
- Setup begins after Anton confirms cleared funds (not on POP screenshot alone).

### Call to action

**Wedge:** *"If this sounds useful, I'll send the intake link — takes 2–3 minutes. We review within two business hours and email the pro-forma."*

**Premium:** *"If website and enquiry operations both need work, I'll send the audit request page — we scope first, then quote."*

### What we do not promise

We do not guarantee new revenue, lead volume, or conversion outcome. We help make sure enquiries you already receive are captured, visible, and followed up.

---

## 5. Manual outreach templates

> **DO NOT AUTOMATE SENDS. Anton approval required before any external outreach.**

Deeper copy libraries (use when these short templates need expansion):

- `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_OUTREACH_COPY_V1.md`
- `docs/marketing/AI_LEAD_RESCUE_MAURITIUS_SALES_ACTIVATION_PACK_V1.md` § 5
- `docs/sales/AI_LEAD_RESCUE_MAURITIUS_PROPERTY_OUTREACH_PACK.md`

Replace `{first name}`, `{business name}`, and `{specific observation}` per message. Send during local business hours. One primary CTA per message.

### 5.1 Warm intro message (WhatsApp — relationship exists)

```text
Hi {first name} — hope you're well.

Quick reason I'm reaching out: most small businesses I speak to in Mauritius
say enquiries land on WhatsApp, Facebook, the website form, and email —
and follow-up depends on whoever notices first.

We've opened a 48-hour pilot that connects one of those channels to a
daily lead list with an instant owner alert. USD 150 launch pilot,
invoiced after we review your intake — no card on the page.

{specific observation about their business if you have one}

Page: https://corpflowai.com/lead-rescue/property-mauritius

Happy to answer questions, or we can do a short call if easier.
```

### 5.2 Short email

```text
Subject: Enquiry follow-up at {business name}

Hi {first name},

When I look at how Mauritius businesses receive enquiries, the pattern
is almost always the same: leads arrive in three or four channels, and
follow-up depends on whoever happens to be around — especially after
hours.

We've opened a 48-hour Lead Rescue pilot: connect one existing channel,
get a daily lead list + instant owner alert + 7-day follow-up board.
USD 150 launch pilot, invoiced after we review your intake.

Page: https://corpflowai.com/lead-rescue/property-mauritius

If a 15-minute call would help, reply with a time that works.

{Anton}
CorpFlowAI Ltd (Mauritius)
```

### 5.3 LinkedIn / WhatsApp-style (no link in first LinkedIn DM)

**LinkedIn — connection note (≤300 chars):**

```text
Hi {first name} — Mauritius operator working on lead capture + follow-up
for property and service businesses. Connecting because of your work in
{their visible context}. Happy to exchange ideas — no pitch.
```

**LinkedIn — first DM after accept (no link):**

```text
Thanks for connecting, {first name}.

Most agencies I speak to here say the same thing: enquiries land on
Property24, WhatsApp, Facebook, and the site form — and follow-up is
whoever remembers.

We run a 48-hour pilot that makes one channel visible daily with an
instant alert. USD 150, invoiced after intake review.

Want me to send the one-page overview?
```

**If they reply yes — send link only then:**

```text
Here it is: https://corpflowai.com/lead-rescue/property-mauritius
Take a look when you have a minute. Happy to do a short call if useful.
```

### 5.4 Follow-up after no reply (value-led — not "checking in")

Send **once**, 3–5 working days after opener:

```text
Hi {first name} — following up on my note about enquiry follow-up.

Three things we'd check first for a business like yours:
1) where enquiries actually enter today,
2) who owns the first reply,
3) where missed follow-ups become visible on Monday morning.

The pilot connects one channel so that third point has an answer.
Page: https://corpflowai.com/lead-rescue/property-mauritius

If now isn't the right time, a quick "not for me" is genuinely fine.
```

### 5.5 Referral request (after a positive conversation or pilot)

```text
Hi {first name} — thanks again for the conversation / pilot feedback.

I'm still in the first Mauritius pilot window and looking for one or two
more owner-operators with the same enquiry-follow-up pain — especially
{property agencies / contractors / owner-managed services}.

If anyone comes to mind who'd appreciate a straight conversation (not
a sales blast), I'd welcome an intro. No pressure either way.
```

### 5.6 Forbidden in all templates

- Guaranteed leads / revenue / conversion outcomes.
- Pay now / instant checkout / card collection live.
- AI agent / chatbot / "AI replies for you."
- Tax invoice / VAT invoice (until accountant gates close — use W5 honest line).
- Bulk or impersonal tone; messages without `{specific observation}` on faint contacts.

---

## 6. Deal-stage checklist (client-getting pipeline)

Track each prospect through these stages. Status lives in Anton's **private** list — not committed to repo with PII.

| Stage | Definition | Owner action | Exit criteria |
| ----- | ---------- | ------------ | ------------- |
| **1. Prospect identified** | Named business + contact + segment + warm path | Add row to private list; note source and likely pain | Real relationship or referral exists |
| **2. First contact prepared** | Message drafted with segment-appropriate hook | Draft from § 5; tailor `{specific observation}` | Anton has read and edited draft |
| **3. Outreach approved** | Anton explicitly approves send | Anton sends manually 1:1 | Message sent; date logged |
| **4. Discovery booked** | Prospect agrees to 15-min call or async Q&A | Send calendar link or agree time | Call scheduled or async thread open |
| **5. Discovery completed** | Pain, trigger, ROI logic, budget, next step captured | Run `docs/revenue/MAURITIUS_DISCOVERY_AND_FOLLOW_UP_SEQUENCE_V1.md` | Fit confirmed or polite decline |
| **6. Offer selected** | Wedge vs premium decided | Send correct URL; note tier in list | Buyer knows which path |
| **7. Proposal / pro-forma prepared** | Intake received and reviewed | Issue pro-forma (wedge) or quote (premium) per finance canon | Document sent 1:1 |
| **8. Follow-up scheduled** | Value follow-ups dated | See companion follow-up doc | Next touch in calendar |
| **9. Yes/no decision requested** | Micro-close applied | Ask: *"Does it make sense to get started?"* | Clear yes, clear no, or named blocker |
| **10. Closed won / lost** | Terminal commercial state | Won → Stream 3; Lost → polite close + reason | Status + date recorded |
| **11. Handoff to onboarding / deal desk** | Payment verified (won only) | Trigger Stream 3 § 10 | Onboarding checklist started |

**Micro-close (stage 9):**

```text
Based on everything we've covered, does it make sense to get started?

If not yes: What would need to be in place for this to become a yes?
```

Then stop talking and listen.

---

## 7. Evidence and CRM / ERPNext handoff (capture per prospect)

No ERPNext runtime changes in this PR. Capture these fields in Anton's private list (and ERPNext sandbox when operator-ready) so Stream 3 and delivery have context.

| Field | What to capture | Example |
| ----- | --------------- | ------- |
| **Business name** | Trading name | *Trou aux Biches Rentals* |
| **Contact** | Name, email, WhatsApp | *Marie L., marie@…, +230…* |
| **Source** | How they entered the pipeline | *Referral from Jean / LinkedIn warm / property network* |
| **Segment** | Primary segment | *Real estate agency* |
| **Current reality** | Their words — messy channels, slow follow-up | *"WhatsApp + Property24; admin on leave weekends"* |
| **Desired future reality** | Concrete outcome they want | *"Monday list of every enquiry + who replied"* |
| **Pain** | Named pain phrase | *"Viewing request last Saturday never answered"* |
| **Trigger** | Why now | *"Lost two viewings in July; hiring new agent"* |
| **Potential value** | Conservative ROI logic (ranges OK) | *"One extra viewing/month worth more than pilot"* |
| **Offer tier** | Wedge or premium | *Wedge* |
| **Next step** | Confirmed action + date | *"Intake by Friday; pro-forma Monday"* |
| **Decision status** | Open / yes / no / blocked | *Open — waiting on partner* |
| **Follow-up date** | Next scheduled touch | *2026-07-08* |

After intake submission, mirror key fields to `/admin/lead-rescue/[id]` Commercial card per operator runbook.

ERPNext minimum when operator uses sandbox: `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` § 2.

---

## 8. How Stream 2 connects to Stream 3

**Stream 2 ends** when the prospect says **yes** and payment path is in motion.

**Stream 3 takes over** at closed-won (payment verified):

| Step | Stream 3 action | Canonical reference |
| ---- | --------------- | ------------------- |
| 1 | Pro-forma / invoice issued (if not already) | `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` |
| 2 | POP received from client | `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` § 3 |
| 3 | Operator verifies cleared funds manually | Anton-only gate |
| 4 | Onboarding checklist started | `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` |
| 5 | Delivery board / operator cockpit updated | `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` |
| 6 | 48-hour setup + 7-day monitoring executed | Operator runbook + sales-to-delivery handoff |
| 7 | Service live; pilot close + optional monthly offer | Pricing guide — post-pilot only |

Stream 3 is **operator execution** — not automated by this docs pack.

---

## 9. Cross-references

| Topic | Doc |
| ----- | --- |
| Discovery + follow-up sequence | `docs/revenue/MAURITIUS_DISCOVERY_AND_FOLLOW_UP_SEQUENCE_V1.md` |
| Service-sales funnel doctrine | `docs/marketing/06_SERVICE_BUSINESS_SALES_AND_FUNNEL_DOCTRINE.md` |
| Brand / conversion | `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` |
| First paid pilots commercial canon | `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` |
| Product A Mauritius premium tier | `docs/marketing/PRODUCT_A_MAURITIUS_PROPERTY_OFFER_V1.md` |
| POP + ERPNext flow | `docs/operations/MAURITIUS_OUTREACH_ERPNext_POP_FLOW_V1.md` |
| Manual pro-forma | `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` |
| Pricing | `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` |
| Operator runbook | `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` |
| Live wedge page | `https://corpflowai.com/lead-rescue/property-mauritius` |
| Live premium page | `https://corpflowai.com/product-a/mauritius` |

---

## 10. Delivery verdict

**Docs-only.** Verdict on merge: **COMPLETE-AT-PR-MERGE** for the artefact. Operational use (outreach, paid pilots, live revenue) remains Anton-gated and is tracked via #249.
