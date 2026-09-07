# Revenue delivery playbook

**Status:** Operator-ready. **Public offer pages + manual sales templates.** No custom CRM build. No payment runtime. No automated outreach.

**Anchor sentinel:** `<!-- REVENUE_DELIVERY_PLAYBOOK_V1 -->`

<!-- REVENUE_DELIVERY_PLAYBOOK_V1 -->

**Created:** 2026-07-08.  
**Current commercial doctrine updated:** 2026-09-07.  
**Owner:** Anton (operator) — discovery, quotes, deposits, verification, approvals, and production release decisions.

---

## 1. Positioning

CorpFlowAI helps businesses **stop losing enquiries, customers, reputation, and revenue** because digital operations are too slow, fragmented, or invisible.

**Operating doctrine:** visible delivery throughput is the default. Prospects and clients should see working output quickly after commercial and access gates are satisfied — not promises on a slide deck.

### Human / machine / authority design standard

Every important CorpFlowAI-delivered capability should be designed against three contracts:

1. **Human-ready** — customers and staff can understand the path, act confidently, and recover when something goes wrong.
2. **Machine-ready** — business information, states, and interfaces are structured clearly enough for approved AI assistants and connected systems to support the process without requiring a rebuild.
3. **Authority-controlled** — permissions, approvals, escalation, auditability, and the canonical source of truth remain explicit as automation increases.

This is a **future-ready, not “future-proof”** standard. Models, providers, interfaces, and AI products will change. Prefer replaceable components and durable business state over model-specific architecture.

**First right of refusal:** before building custom AI or workflow infrastructure, evaluate suitable capabilities already available in the client’s approved systems, free/open tools, and established standards. Do not create a second production app, second production database, or shadow system of record.

**Canonical truth remains canonical:** business systems such as ERPNext and Postgres retain their defined source-of-truth roles. AI is an interaction and execution layer, not a licence to duplicate production truth.

### Marketing rule

Sell in this order: **business outcome first, delivery competence second, AI third**.

Avoid claims such as “future-proof”, “fully autonomous”, “AI-powered everything”, or any implication that buying an AI licence creates business competence. Describe controlled execution, clear authority, structured business information, and the concrete outcome being purchased.

---

## 2. Current public commercial surfaces

| Offer | Primary public URL | Commercial position | Deposit / start gate |
| ----- | ------------------ | ------------------- | -------------------- |
| **Enquiry Recovery Sprint** | `/enquiry-recovery` (with `/lead-rescue` retained as a live alias) | **MUR 85,000 fixed** | MUR 51,000 (60%) deposit; balance MUR 34,000 (40%) after approved preview and before production release |
| **Website Rescue** | `/website-rescue` | From **MUR 45,000** | 50% before design/build |
| **Customer Recovery & Reputation Management Sprint** | `/offers/customer-reputation-recovery` | From **MUR 45,000** | 50% before recovery work |

Enquiry Recovery remains the live revenue focus. Website Rescue remains a bounded second product surface; its existing internal SKU is retained rather than creating a second product or database.

### Website Rescue positioning

Website Rescue is not sold merely as visual redesign. The bounded product combines:

- a clear, credible human experience;
- structured business and offer information;
- a tested enquiry path; and
- a machine-ready foundation for future **approved** AI-assistant or connected-system work.

“Machine-ready” does **not** mean an autonomous agent, AI provider subscription, custom integration, or third-party runtime is included. Those are separate scope and remain subject to approval gates.

---

## 3. ERPNext-first principle

> **ERPNext is the system of record** for CRM, quotations, client onboarding documents, deposit/payment records, projects/WBS, feedback, release approval, and maintenance **unless explicitly proven unsuitable**.

**Do not build:**

- Custom CRM
- Custom project management
- Custom quote/deposit system
- Duplicate ERPNext surfaces

**CorpFlowAI app handles:**

- Public commercial pages
- AI-assisted delivery surfaces where approved
- Client-visible outputs where appropriate
- `/change` control for eligible client engagements

Postgres remains the production data source of truth for CorpFlowAI application state. No second production database.

---

## 4. Sales flow

```text
Warm intro or inbound interest
  → 15-minute diagnosis / discovery
  → Route to the appropriate bounded offer
  → Written quote
  → Client approves quote
  → Deposit request — bank instructions only
  → Manual POP + bank verification
  → Approval to proceed
  → Build → preview → verify
  → Client feedback / callback
  → Explicit production release approval
  → Deploy → validate live URL/runtime evidence
  → Optional maintenance offer
```

**Templates:** `docs/revenue/templates/`.

**Companion docs:** `docs/revenue/MAURITIUS_PAID_PILOT_SALES_PACK_V1.md`, `docs/revenue/MAURITIUS_DISCOVERY_AND_FOLLOW_UP_SEQUENCE_V1.md`, `docs/operations/ERPNEXT_FIRST_REVENUE_OPERATING_SYSTEM_EVALUATION.md`.

---

## 5. Discovery flow

1. **Time-box the first conversation.** Buyer talks most; lead with the business problem, not an AI demo.
2. Confirm the **trigger**, channels, recent example, commercial value, and who owns the outcome.
3. If there is no meaningful problem or value → soft close rather than forcing a project.
4. Match the bounded offer: quiet enquiries → Enquiry Recovery; weak/confusing web presence → Website Rescue; reviews/complaints → Recovery Sprint.
5. State current MUR price/starting price, deposit structure, preview gate, and **no revenue guarantee**.
6. Promise only the delivery window actually supported by the offer terms.
7. Record the commercial state in the canonical business system when available.

---

## 6. Quote / deposit / manual bank verification

| Step | Rule |
| ---- | ---- |
| Quote | Written scope tied to the buyer’s desired business outcome |
| Deposit | Required before scoped build/configuration starts, according to the current offer terms |
| Payment | Manual bank transfer in **MUR** for Mauritius delivery sprints (ERPNext invoice); no checkout runtime on public offer pages |
| POP | Client may send proof of payment |
| Verification | Operator confirms **cleared funds** in bank — POP screenshot alone is not sufficient |
| Start clock | Any quoted preview window starts only after the offer’s stated commercial/access/asset gates are satisfied |

---

## 7. Approval-to-proceed rule

No scoped client build/configuration work starts until the relevant commercial gates are satisfied:

1. Written scope / quote approved
2. Required deposit verified as cleared
3. Required access/assets for the affected milestone are available
4. Client receives approval-to-proceed confirmation where applicable

Missing access/assets delays only the affected milestone; it does not change payment evidence.

---

## 8. Delivery handoff rule

For client delivery:

- create the appropriate project/WBS in ERPNext when configured;
- map deliverables to bounded tasks and evidence;
- CorpFlowAI surfaces hold client-visible previews/production URLs where appropriate;
- ERPNext holds commercial/project status and approval records;
- Postgres remains the application production data source of truth;
- do not create duplicate production truth because an AI interface needs context.

---

## 9. Client feedback and scope control

- Preview feedback is structured and time-boxed according to the quote.
- Material changes require written scope confirmation and, where necessary, quote adjustment.
- AI capability discovered during delivery is **not** silently added to scope.
- Machine-readiness is a design property; autonomous actions, new providers, paid tools, messaging runtimes, and external integrations require explicit scope and the applicable approval gate.

---

## 10. Production release approval rule

**No production push** to a client-facing hostname until the applicable gates are satisfied, including:

1. Preview verified and approved in writing (or the explicitly agreed contractual fallback applies)
2. Balance due is paid or explicitly deferred in writing per quote
3. Client/operator gives the required production-release approval
4. Any production DB/schema, env/secrets, messaging runtime, paid vendor/tool, or public-launch gate has separate explicit approval where relevant

Production delivery means **build → preview → verify → callback → approve → deploy → validate**.

Do not call work complete without a verified live URL or equivalent verified runtime evidence.

---

## 11. Maintenance offer rule

- Maintenance is **optional** and never bundled silently into a sprint price.
- Offer it after successful handover or production release.
- New channels, providers, agents, integrations, or redesigns are new scope unless explicitly included.
- Prefer exception-based monitoring and useful status evidence over noisy heartbeat activity.

---

## 12. Explicit non-actions

| Non-action | Reason |
| ---------- | ------ |
| No custom CRM / PM / quote system by default | ERPNext-first |
| No second production app or database | Preserve canonical truth |
| No payment runtime on public offer pages | Manual bank verification unless separately approved |
| No outbound email / WhatsApp / SMS runtime without explicit approval | External action gate |
| No production DB/schema or env/secrets change without explicit approval | Production safety gate |
| No secrets or credentials in docs, screenshots, GitHub comments, or prompts | Security |
| No paid AI/provider/tool added without explicit approval | Cost and authority control |
| No autonomous-agent claim merely because a surface is machine-ready | Marketing accuracy |

---

## 13. Verification checklist

Before claiming a client sprint **operationally complete**:

```text
Delivery Reality Audit:
- Change exists in source: YES
- PR reviewed / merged: (record evidence)
- Preview URL verified: (record URL/evidence)
- Production approval: (record explicit approval)
- Production deployment ID / commit: (record after deployment)
- Live URL/runtime tested: (record evidence)
- Expected vs actual result:
- Client-facing flow usable: YES/NO
- Final verdict: COMPLETE / PARTIAL / FAILED
```

For the current public commercial surfaces, validate the relevant canonical URL and CTA after an approved production deployment. A preview or PR is not itself a production release.

---

## 14. Quick links

| Resource | Path |
| -------- | ---- |
| Enquiry Recovery source of truth | `lib/public/enquiry-recovery-sprint.js` |
| Offer config | `lib/public/rapid-delivery-offers.js` |
| Public market copy / FAQ | `lib/public/corpflow-public-market.js` |
| Enquiry Recovery component | `components/EnquiryRecoveryCampaignPage.js` |
| Website Rescue route | `pages/website-rescue.js` |
| Templates index | `docs/revenue/templates/` |
| ERPNext-first evaluation | `docs/operations/ERPNEXT_FIRST_REVENUE_OPERATING_SYSTEM_EVALUATION.md` |
| Canonical operator control plane | `/change` |
