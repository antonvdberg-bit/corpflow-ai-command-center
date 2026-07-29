# Lead Rescue — Product Pack v1 (sellable vertical slice)

**Status:** Consolidated product + commercial + delivery pack for GitHub **#653**, plus runnable sellable-slice UI (FAQ, intake confirmation, operator-pack links). No production deploy, no DB/schema, no secrets, no payment/messaging runtime, no outreach send in this PR.

**Quote-ready companion (copy-paste):** `docs/marketing/LEAD_RESCUE_QUOTE_READY_PACKET_V1.md` — problem, scope, exclusions, delivery, acceptance, duration, price recommendation, live URLs, quotation blocks, smallest sales action.

**Workstream:** `lead-rescue` (must not be combined with Website Rescue **#654**).
**System boundary:** CorpFlowAI business system (not a client tenant).
**Environment:** preview / local docs; live surfaces already exist for demonstration.
**Anchor sentinel:** `<!-- LEAD_RESCUE_PRODUCT_PACK_V1 -->`

<!-- LEAD_RESCUE_PRODUCT_PACK_V1 -->

**Source issue:** [#653](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/653)  
**Agent/run:** https://cursor.com/agents/bc-a4c5a692-3f2f-42ea-9c44-fea955071e9e

## 0. What moved / blocked / next / owner / Anton?

| | |
|--|--|
| **What moved** | Runnable sellable slice on top of PR #656 docs: FAQ + inline intake confirmation (`lead_id`) on `/lead-rescue`; operator-pack deep-links + pricing helper on `/admin/lead-rescue/[id]`; quieter intake notifications (omit empty region/payment); onboarding status-name fix (`QUOTE_SENT` / `PAYMENT_PENDING`); demo-path refresh. |
| **What is blocked** | Final pricing approval (A1); production launch of any runtime change (A5); live outreach send (A3); payment runtime (A4). Issue comments from Cloud Agent may be blocked (`issues:read` only). |
| **What is next** | Anton pricing sign-off (A1); merge this PR; Preview verify FAQ + intake success UI; Production deploy only after Anton A5; operator uses quote-ready packet for first warm intro. |
| **Who owns it** | Cursor (this PR); ChatGPT/operator (review); Anton (pricing + protected gates). |
| **Anton required** | **Yes** — A1 pricing confirmation; A3 outreach; A4 payment runtime; A5 production deploy of runtime UI. **Not** required to review the docs/UI PR itself before merge. |

---

## 1. Product definition

| Field | Content |
|-------|---------|
| **Product name (buyer-facing)** | AI Lead Rescue Setup — launch pilot |
| **Target customer** | Owner-operators / ops leads at small businesses (1–20 staff) with multi-channel enquiries (WhatsApp, Facebook, website form, email) who lose leads to slow response. First niche: Mauritius property / trades / clinics (appointment-enquiry only). |
| **Business problem** | Enquiries arrive across channels and get buried; nobody has a reliable daily view of who to follow up. |
| **Promised outcome** | Within **48 hours** after payment confirmation + required client info: one leaky lead source connected to operator alerts, daily lead summary for 7 days, shared lead log, clear hand-over. **No revenue / volume / conversion guarantees.** |
| **Included scope** | Intake review (≤2 business hours target); one lead source; operator alerts; buyer WhatsApp + email daily summary (7 days); Google Sheet lead log; end-of-setup hand-over; day-7 recap. Details: `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` §2. |
| **Explicit exclusions** | Multi-source connection; website redesign; CRM migration; custom BI; chatbot that “closes deals”; guaranteed leads/revenue; clinical triage; cold bulk outreach. |
| **Client responsibilities** | Submit intake; join discovery call; pay pro-forma; provide WhatsApp/email/timezone; grant access to the one named lead source; respond to operator clarification within setup window. |
| **Delivery timeframe** | Setup targeted **48 hours** after payment + client info; if clarification needed, normally within **5 business days** (W3 wording — do not drift). |
| **Implementation dependencies** | Existing `/lead-rescue` page; `POST /api/tenant/intake`; `/admin/lead-rescue` cockpit; manual pro-forma; operator WhatsApp/Telegram/Sheet workflow. No new app or database. |

Canonical commercial playbook: `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md`.

---

## 2. Commercial packaging (recommendation → Anton)

| Item | Recommendation | Notes |
|------|----------------|-------|
| **Setup fee (public / launch pilot)** | **USD 150** one-off | Keep as the single public offer on `/lead-rescue`. |
| **Mauritius operator conversion** | ~MUR 7,000 on pro-forma | Convert at invoice-time SBM rate; not a second public price. |
| **Recurring (post-pilot)** | **USD 99 / month** monitoring | Quote after day-7 if buyer continues; no auto-debit in this phase. |
| **Cost/margin assumptions** | Operator time dominant; ≤10 concurrent monitorings | Low price is intentional pre-proof pricing. |
| **Optional add-ons** | Extra lead source; website lead-capture add-on (`docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_WEBSITE_ADDON.md`); Product A premium audit (separate funnel). | Do not put add-ons on the public CTA. |
| **Pilot structure** | 48h setup + 7-day monitoring; stop at 1–4 pilots before scaling | See First Paid Pilots pack. |
| **Risks / scope controls** | Scope creep into “full CRM”; dual-offer confusion with MUR sprint page; unsupported claims | Use FAQ + W4 no-guarantee wording. |

**Pricing recommendation packet for Anton**

1. **Approve** continuing USD 150 public pilot + USD 99/mo monitoring recommendation (unchanged from pricing guide).  
2. **Approve** that `/offers/ai-lead-rescue` (MUR Rapid Delivery sprint) remains a **separate** internal/sprint path — not the primary public CTA.  
3. **Do not** approve card checkout, auto-renew, or guaranteed-outcome language in this phase.  
4. Final commercial commitment remains Anton-only.

---

## 3. Sellable surface (existing — reuse, do not rebuild)

| Surface | URL / path | Role |
|---------|------------|------|
| Primary product page | `https://corpflowai.com/lead-rescue` | USD 150 single offer; CTA **Start my 48-hour setup** → `#intake` |
| Alias host | `https://aileadrescue.corpflowai.com/` | Same landing component |
| Property vertical | `/lead-rescue/property-mauritius` | Niche framing; same product meta |
| MUR sprint (not primary) | `https://corpflowai.com/offers/ai-lead-rescue` | Rapid Delivery MUR offer — **operator must not confuse with USD pilot** |

**CTA doctrine:** buyer intent (`Start my 48-hour setup`), not “Choose payment path”. Payment complexity only after intake review (manual pro-forma).

**Proof / FAQ:** Pre-proof phase — no fake testimonials. Process proof (48h setup, daily summary, human operator) on the landing. Concise FAQ (`#faq`) covers CRM, no-guarantee, post-intake path, client inputs, and scope exclusions. Full doctrine: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`.

### Dual-offer routing (operator rule)

| Buyer path | Send them to | Do not |
|------------|--------------|--------|
| Warm-network launch pilot | `/lead-rescue` (USD 150) | Quote MUR sprint price on that page |
| Rapid Delivery / MUR sprint conversation | `/offers/ai-lead-rescue` | Rename it “the Lead Rescue pilot” without explaining the difference |
| Needs website + leads | Website Rescue / Landing Page Rescue (#654) or website add-on doc | Bundle into #653 PR |

---

## 4. Demonstration path (runtime evidence)

Verified **2026-07-28 UTC** (GET only — see also `LEAD_RESCUE_DEMONSTRATION_PATH_V1.md`):

| Step | Surface | Result |
|------|---------|--------|
| 1. Prospect opens product page | `GET https://corpflowai.com/lead-rescue` | **200** HTML |
| 2. Alias host | `GET https://aileadrescue.corpflowai.com/` | **200** |
| 3. Property vertical | `GET https://corpflowai.com/lead-rescue/property-mauritius` | **200** |
| 4. MUR sprint (separate) | `GET https://corpflowai.com/offers/ai-lead-rescue` | **200** |
| 5. Enquiry | Public form → `POST /api/tenant/intake` (tag `ai-lead-rescue`) → **on-screen `lead_id` confirmation** | Existing runtime — exercise write only on Preview / with TEST- prefix + #548 cleanup |
| 6. Operator review | `GET https://core.corpflowai.com/admin/lead-rescue` + detail **Operator pack** panel | **200** (session required for pipeline) |
| 7. Follow-up | Status pipeline + checklist in cockpit + pack links + runbook | Documented in operator runbook |

**Demo script for sales call (no private data):**

1. Open `/lead-rescue` — show single offer + CTA.  
2. Scroll to intake — explain “no card on this page”.  
3. Explain operator receives intake in cockpit within review SLA.  
4. Explain pro-forma → wire → 48h setup (W1–W5).  
5. Show day-1..7 summary promise without inventing case-study numbers.

---

## 5. Delivery system (checklists)

Use existing artefacts; this table is the index:

| Checklist | Canonical doc |
|-----------|---------------|
| Sales → delivery handoff | `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` |
| Paid-pilot onboarding (48h) | `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` |
| Operator runbook | `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` |
| Client input (minimum) | Onboarding §2 — WhatsApp, email, timezone, one lead source |
| Acceptance | Setup live + hand-over sent + day-7 recap offered |
| Support / maintenance boundary | Pilot window only unless monthly monitoring quoted |

### Acceptance criteria (#653 slice)

- [x] Product definition consolidated  
- [x] Commercial packaging + pricing recommendation for Anton  
- [x] Sellable surface identified and live-checked  
- [x] Demonstration path documented with GET evidence  
- [x] Delivery + quotation pointers complete  
- [x] Public FAQ on `/lead-rescue`  
- [x] Inline intake confirmation with `lead_id` (demonstrable enquiry path)  
- [x] Operator cockpit links into quote / onboarding / handoff pack  
- [ ] Anton pricing approval recorded (protected)  
- [ ] Production deploy of runtime UI after Anton A5  
- [ ] Issue lifecycle comments on #653 (may need GHA / operator paste)

---

## 6. Quotation content (reuse)

**Primary copy source:** `docs/marketing/LEAD_RESCUE_QUOTE_READY_PACKET_V1.md` (§11 quotation blocks).

| Element | Source |
|---------|--------|
| Copy-paste offer + scope + exclusions | `LEAD_RESCUE_QUOTE_READY_PACKET_V1.md` §11 |
| Reusable quotation / pro-forma | `docs/finance/AI_LEAD_RESCUE_MANUAL_PRO_FORMA_TEMPLATE_V1.md` |
| Required verbatim W1–W5 | Pro-forma template §1 (also quote-ready §11c) |
| Scope / exclusions / deposit trigger | Pricing guide + pro-forma |
| Project-start conditions | Payment confirmation + required client information |

**Deposit / start wording (summary — keep W1–W3 verbatim on issued docs):** payment instructions after intake approval; setup begins after payment confirmation + required client info; 48h / 5-business-day fulfilment language unchanged.

---

## 7. Remaining Anton approvals (precise list)

| # | Approval | Unlocks |
|---|----------|---------|
| A1 | Confirm USD 150 / USD 99 packaging still current | Sales quoting confidence |
| A2 | Any change to public pricing or CTA | Production marketing change |
| A3 | Live outreach send (warm WhatsApp/email) | First paid-pilot acquisition |
| A4 | Payment runtime / card checkout (if ever) | Beyond manual pro-forma |
| A5 | Production deploy of any runtime change | Live behaviour change |
| A6 | Merge authority remains Anton for PRs | Repo policy unchanged |

---

## 8. Quality gate (marketing docs)

Hook / Proof / Depth: pack points attention assets (landing) to validation assets (runbooks, pro-forma, demo path). Dual-asset satisfied. No unsupported revenue claims.  
**Delivery Quality Gate (self-score):** 12/14 — docked for missing published case proof (known pre-proof) and issue-comment observability pending GHA/operator paste.

## 9. Explicit non-actions

- No Website Rescue (#654) content in this pack  
- No Lux / CIPC / Living Word tenant coupling  
- No schema, env, secrets, deploy, messaging, payment runtime  
- No rebuilding `/lead-rescue` in this PR
