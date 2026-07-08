# Revenue delivery playbook

**Status:** Operator-ready. **Public offer pages + manual sales templates.** No CRM build. No payment runtime. No automated outreach.

**Anchor sentinel:** `<!-- REVENUE_DELIVERY_PLAYBOOK_V1 -->`

<!-- REVENUE_DELIVERY_PLAYBOOK_V1 -->

**Created:** 2026-07-08.

**Month-end target:** **MUR 150,000–200,000** collected or contracted with deposit verified by month-end.

**Owner:** Anton (operator) — all discovery, quotes, deposits, verification, and release approvals.

---

## 1. Positioning

CorpFlowAI helps businesses **stop losing leads, customers, reputation, and revenue** because digital operations are too slow, fragmented, or invisible.

**Operating doctrine:** visible delivery throughput is the default. Prospects and clients must **see working output in 24–72 hours** after deposit clearance — not promises on a slide deck.

---

## 2. First three offers (public pages)

| Offer | URL | Starting price | Deposit |
| ----- | --- | -------------- | ------- |
| **AI Lead Rescue Sprint** | `/offers/ai-lead-rescue` | from MUR 35,000 | 50% before work starts |
| **Premium Landing Page Rescue** | `/offers/premium-landing-page-rescue` | from MUR 45,000 | 50% before build |
| **Customer Recovery & Reputation Management Sprint** | `/offers/customer-reputation-recovery` | from MUR 45,000 | 50% before recovery work |

Each page includes: business outcome, audience, 24–72h visible output, price, deposit, client inputs, timeline, proof language, and **Request Discovery Call** CTA.

**Month-end math (example):**

- 3 × MUR 45,000 = MUR 135,000  
- 4 × MUR 35,000 = MUR 140,000  
- Mix of deposits (50%) + one full sprint closes the MUR 150k–200k band with 3–5 wins.

---

## 3. ERPNext-first principle

> **ERPNext is the system of record** for CRM, quotations, client onboarding documents, deposit/payment records, projects/WBS, feedback, release approval, and maintenance **unless explicitly proven unsuitable**.

**Do not build:**

- Custom CRM  
- Custom project management  
- Custom quote/deposit system  
- Duplicate ERPNext surfaces  

**Evaluate/configure ERPNext in parallel** while manual templates carry sales today.

**CorpFlowAI app handles:**

- Public offer pages (`/offers/*`)  
- AI-assisted delivery surfaces (tenant previews, operator shortcuts)  
- Client-visible outputs where appropriate  
- `/change` control for eligible client engagements  

---

## 4. Sales flow (manual)

```text
Warm intro or inbound interest
  → Send prospect discovery email (template)
  → 15-min discovery call (template)
  → Route to one offer page
  → Written quote email (template)
  → Client approves quote
  → Deposit request (template) — bank instructions only
  → Manual POP + bank verification (checklist template)
  → Approval to proceed (template)
  → Delivery + preview feedback (template)
  → Production release approval (template)
  → Optional maintenance offer (template)
```

**Templates:** `docs/revenue/templates/` (10 files).

**Companion docs:** `docs/revenue/MAURITIUS_PAID_PILOT_SALES_PACK_V1.md`, `docs/revenue/MAURITIUS_DISCOVERY_AND_FOLLOW_UP_SEQUENCE_V1.md`, `docs/operations/ERPNEXT_FIRST_REVENUE_OPERATING_SYSTEM_EVALUATION.md`.

---

## 5. Discovery flow

1. **Time-box 15 minutes.** Buyer talks ~70%. No slides, no demo.  
2. Confirm **trigger**, **channels**, **recent example** of pain.  
3. If no recent example → soft close (not ready).  
4. Match offer: lead loss → Lead Rescue; weak site → Landing Page Rescue; reviews/complaints → Recovery Sprint.  
5. State **starting MUR price**, **50% deposit**, **24–72h visible output**, **no revenue guarantees**.  
6. Promise written quote within 24 hours.  
7. Log capture fields within 1 hour (ERPNext Lead/Opportunity when live).

Script: `docs/revenue/templates/discovery-call-script.md`.

---

## 6. Quote / deposit / manual bank verification

| Step | Rule |
| ---- | ---- |
| Quote | Written scope tied to buyer’s “success in 72 hours” language |
| Deposit | **50%** required before work commences |
| Payment | Manual bank transfer only — **no checkout runtime** on offer pages |
| POP | Client sends proof of payment |
| Verification | Operator confirms **cleared funds** in bank — POP screenshot alone is **not** sufficient |
| Start clock | 24–72h delivery window starts after verification + access/assets |

Templates: `quote-email.md`, `deposit-request.md`, `deposit-received-manual-verification.md`.

---

## 7. Approval-to-proceed rule

**No build or configuration work** until:

1. Written quote approved  
2. Deposit amount verified as cleared  
3. Client receives **approval to proceed** email  

Missing client access/assets delay only the affected milestone — not the deposit verification record.

---

## 8. WBS / delivery handoff rule

When ERPNext projects are configured:

- Create **project + WBS** at approval-to-proceed  
- Map sprint deliverables to WBS tasks (connect source, preview page, handover doc, etc.)  
- CorpFlowAI app holds **client-visible preview/production URLs**; ERPNext holds **status, dates, and operator assignments**  

Until ERPNext is live: track in private operator list + email thread; migrate records when CRM/project modules are ready.

---

## 9. Client feedback SLA

| Event | SLA |
| ----- | --- |
| Preview sent | Client feedback within **2 business days** |
| Reminder | One reminder if silent |
| Default | Proceed per quoted scope after reminder to protect delivery window |
| Material change | Requires written scope confirmation + quote adjustment |

Template: `preview-feedback-request.md`.

---

## 10. Production release approval rule

**No production push** to client-facing hostname until:

1. Preview approved in writing, **or** agreed wait period elapsed with reminder sent  
2. Balance due is paid or explicitly deferred in writing per quote  
3. Client replies **“approve production release”**  

Template: `production-release-approval.md`.

Record release in ERPNext + Delivery Reality Audit when closing engagements.

---

## 11. Maintenance offer rule

- Maintenance is **optional**, **never** bundled silently in sprint price  
- Offer **after** successful handover or production release  
- Month-to-month, 30-day notice, quoted in MUR  
- Scope limited to agreed monitoring/tweaks — new channels or redesigns are new quotes  

Template: `maintenance-offer.md`.

---

## 12. Explicit non-actions (this playbook)

| Non-action | Reason |
| ---------- | ------ |
| No custom CRM / PM / quote system | ERPNext-first |
| No payment runtime on offer pages | Manual POP + bank verification |
| No email / WhatsApp / SMS runtime | Anton sends manually |
| No production DB/schema change | Offer pages are static + mailto CTA |
| No secrets / paid tools added | Operator-controlled stack |
| No external outreach execution | Templates only — Anton approves every send |

---

## 13. Verification checklist (operator)

Before claiming a sprint **operationally complete**:

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: (record after PR)
- Production deployment ID:
- Commit deployed:
- Live URLs tested: /offers/{slug} + client production URL if applicable
- Expected vs actual result:
- Client-facing flow usable: YES/NO
- Final verdict: COMPLETE / PARTIAL / FAILED
```

Minimum live GET checks after deploy: `https://corpflowai.com/offers/ai-lead-rescue`, `/offers/premium-landing-page-rescue`, `/offers/customer-reputation-recovery` — all **200**, correct offer copy, CTA present.

---

## 14. Quick links

| Resource | Path |
| -------- | ---- |
| Offer config (code) | `lib/public/rapid-delivery-offers.js` |
| Offer component | `components/RapidDeliveryOfferPage.js` |
| Templates index | `docs/revenue/templates/` |
| ERPNext-first evaluation | `docs/operations/ERPNEXT_FIRST_REVENUE_OPERATING_SYSTEM_EVALUATION.md` |
| Contact fallback | `/contact` |
| Legacy wedge (USD 150 pilot) | `/lead-rescue` — separate funnel; do not merge offers on one page |
