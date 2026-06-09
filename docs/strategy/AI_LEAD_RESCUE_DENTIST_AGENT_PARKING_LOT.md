# AI Lead Rescue — Dentist Agent Parking Lot

**Status:** **Parked. Not active. No build authorisation.**

This doc captures a possible future **second cold niche** — Mauritius dentists, possibly approached via a marketing-agent intermediary — so the idea is not lost when it surfaces in conversation. It is **not** an instruction to start work.

The active cold niche is **Mauritius property operators** (`docs/sales/AI_LEAD_RESCUE_MAURITIUS_PROPERTY_OUTREACH_PACK.md`). The dentist lane stays parked until the property lane has produced clear evidence (per § 6 below).

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_DENTIST_AGENT_PARKING_LOT_V1 -->`

<!-- AI_LEAD_RESCUE_DENTIST_AGENT_PARKING_LOT_V1 -->

## 1. The idea (short)

A possible **second** cold niche after property: **Mauritius dental practices** (private dental clinics, single-dentist practices, small group practices, dental specialists). The hypothesis: dental practices share many of the lead-leak patterns that property has — booking enquiries arriving on Facebook DMs and WhatsApp; receptionist absent on weekends; no central log; multilingual-buyer contact patterns — but with **different sensitivities** that make this niche more cautious to enter.

A possible **route to market** for this lane is a **marketing agent / intermediary** — a person already trusted by Mauritius dentists, who would introduce CorpFlowAI's offer rather than CorpFlowAI cold-approaching dentists directly.

## 2. Why this is parked (not active)

Three reasons, in order:

1. **Property lane has not yet produced its first paying pilot.** Per `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 13 *What NOT to build yet*, no expansion build / second-niche activation happens before the active niche has produced ≥ 1 paying pilot end-to-end (and ideally ≥ 4 across the active niche before any major expansion).
2. **Dentist data is regulated-adjacent.** Patient enquiries — even "do you take new bookings?" — sit closer to PHI / clinical data than property enquiries do. The pilot's enquiry-only scope is fine in principle, but the **boundary discipline** with a clinical buyer needs the operator to have already proven the pilot delivers; introducing the offer to a clinical-adjacent buyer pre-proof carries regulatory and reputational downside the property lane does not.
3. **An intermediary marketing agent introduces a third party** to the trust-and-data flow. Without a controlled agent workspace + clear scripts + clear allowed claims + clear handoff rules, the agent is a vector for off-doctrine claims (revenue guarantees, *"AI agent"* framing, exaggerated capabilities). That is a brand-quality risk the operator should not absorb until the property lane is delivering.

## 3. Hard rules for if/when this lane activates

These rules apply in addition to the existing first-paid-pilots doctrine (`docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md`) and the brand-conversion doctrine (`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`).

- **No patient data collection.** The pilot's scope on a dental practice is the *enquiry channel*, not patient consultations or clinical content. Activity Log + Sheet + Telegram alerts capture the enquiry message and the prospective patient's contact only — never clinical content, never medical history, never insurance details, never minor's data.
- **No clinical claims.** No copy / scripts / outreach claim that the pilot improves clinical outcomes, patient compliance, treatment retention, or any health metric. The doctrine line: *"We help make sure existing enquiries are captured, visible, and followed up."* That is the only claim allowed; clinical claims are forbidden.
- **No health advice in any AI-touched surface.** No automated replies to dental enquiries. No symptom-routing. No triage. The pilot operator does not respond on the dentist's behalf to clinical questions.
- **No access to production admin by default.** The marketing agent **does not** receive `/admin/lead-rescue` access. The agent's role is sales/outreach only; the cockpit stays factory-master-only per `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § *Access requirements*.
- **No real patient PII anywhere outside the cockpit.** Includes the agent's prospect-list spreadsheet — patient data must never enter it.
- **Security-review trigger.** Adding a new niche that touches medical/health-adjacent enquiries triggers `docs/operations/SECURITY_REVIEW_CHECKLIST.md`. The activation packet (§ 6 below) must include the security-review checklist completion before any outreach goes out.

## 4. What is needed before this lane activates

A future activation packet (per `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`) must produce **all** of the following, **before** any outreach to a dentist or to an intermediary agent is sent:

- [ ] **Controlled agent workspace.** A separate Google Workspace / Drive folder for the marketing-agent intermediary, with view-only access to scripts and allowed-claims docs, and **no** access to the operator cockpit, no access to the prospect-list spreadsheet for any other niche, and no access to financial / pricing internals beyond what's in this parking-lot doc and the (future) agent script.
- [ ] **Agent script.** Paste-ready first-touch + follow-up scripts for the agent to use with dentist prospects. Built from the property outreach pack (`docs/sales/AI_LEAD_RESCUE_MAURITIUS_PROPERTY_OUTREACH_PACK.md`) shape, adapted for clinical-adjacent buyers, reviewed against:
  - the brand-conversion doctrine (no revenue guarantees, no AI-agent framing, no clinical claims),
  - the prospect-Q&A doc (`docs/sales/AI_LEAD_RESCUE_PROSPECT_QA.md`),
  - `docs/operations/SECURITY_REVIEW_CHECKLIST.md` § *medical / clinical*.
- [ ] **Allowed-claims doc.** Explicit list of what the agent IS allowed to say (the doctrine line; pricing fact; 48-hour / 7-day shape) and what the agent is NOT allowed to say (revenue guarantees; clinical outcomes; AI replacement of staff; CRM features; integrations not in the capability matrix). Operator countersigns the agent's understanding before activation.
- [ ] **Prospect tracker.** A separate spreadsheet — `artifacts/lead_rescue_mauritius_dentist_first_N_template.csv` — with the same column shape as the property template (modulo *Segment* values being clinical-adjacent: *general dentist*, *dental specialist*, *orthodontist*, etc.). **Owned by the operator**, not the agent. The agent submits prospect rows; the operator approves them before any outreach.
- [ ] **Referral / commission terms.** Written terms between operator and agent: how the agent is compensated; whether referral / per-pilot / per-month-monitoring; payout cadence; what happens on declined prospects; what happens on prospects who buy after the agent's introduction expires; data ownership of the agent's contributed prospect rows. Operator does not negotiate this on a call; written terms come first.
- [ ] **Handoff rules.** Explicit rules for when an agent-sourced prospect transitions from agent-touch to operator-touch (e.g. agent makes the introduction; operator runs the discovery call; agent does not run discovery calls; agent does not handle objections beyond a handful of pre-approved ones). The doctrine: the **operator owns the sales conversation** even when the agent owns the introduction.
- [ ] **Security-review completion.** `docs/operations/SECURITY_REVIEW_CHECKLIST.md` walked through and signed off, specifically the *medical / clinical* triggers.
- [ ] **Activation gate.** Anton DECISION (per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` § 3) — explicit, written, on Operator Bridge or in `artifacts/chat_history.md`.

Until **all** of the above are in place, the lane stays parked. Cursor / future operators **do not** start agent recruitment, prospect-list building, or message drafting.

## 5. What is forbidden in this parked state

Even though the lane is parked, the **idea** sometimes surfaces in conversation. The following are forbidden in the parked state:

- ❌ Any cold message to a Mauritius dentist that mentions the AI Lead Rescue offer, with or without an intermediary.
- ❌ Any agent recruitment conversation (informal or otherwise) that promises a referral / commission deal.
- ❌ Any prospect-list scraping, even for "preparation" purposes — no real dentist data lives in the repo or in any operator artefact while the lane is parked.
- ❌ Any AI-tool prompt referencing real Mauritius dentists (e.g. *"draft an email for {actual practice name}"*) — generic prompts only.
- ❌ Any patient-facing automated workflow design, drafting, or prototyping.

## 6. When to revisit

The dentist lane revisits at the **earliest** of:

1. **Property lane has produced ≥ 1 paying pilot end-to-end** (intake → pro-forma → wire → 48-hour setup → 7-day monitoring → end-of-pilot recap), AND the warm prospect's pilot has also delivered.
2. **Property lane has been actively run for ≥ 4 weeks** with at least 25 cold sends + a handful of replies, regardless of pilot count, AND the operator has explicit signal that property is **not** going to be the second-pilot niche (e.g. reply rate too low across all 7 segments after 25 sends).
3. **A specific, named, trusted intermediary agent has approached Anton with a deliverable proposal** — i.e., it's not Anton initiating; it's a person Anton already knows and trusts who says *"I work with Mauritius dentists; I think your offer would land."* Even in that case, the activation packet in § 4 must complete first.

The **default** is property: until any of those triggers hit, the active cold niche stays property. **Do not** flip-flop niches mid-week; doctrine is consistency over speed for first paid pilots.

## Cross-references

- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — first-paid-pilots strategy + § 13 *What NOT to build yet*.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — brand voice; allowed claims; no-revenue-guarantee discipline.
- `docs/strategy/AI_LEAD_RESCUE_INTEGRATION_ROADMAP.md` — *Compliance / security review required* bucket (medical/clinical triggers).
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — security review triggers (medical / clinical).
- `docs/sales/AI_LEAD_RESCUE_MAURITIUS_PROPERTY_OUTREACH_PACK.md` — active cold-cadence pack (property is first; dentists are second).
- `docs/sales/AI_LEAD_RESCUE_CAPABILITY_MATRIX.md` — what we can / can't / can custom build (especially rows on regulated data).
- `docs/sales/AI_LEAD_RESCUE_PROSPECT_QA.md` — owner-friendly Q&A (the *"is this for medical/clinical use?"* answer is in here).
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — cockpit access requirements (factory master only).
- `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` — § 9.1 / § 9.2 / § 9.3 explicit handoff sections; would require a § 9.4 *agent → operator handoff* if/when this lane activates.
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet structure for the activation packet.
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — § 3 Anton DECISION ladder.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`; the dentist lane has nothing to verify until activation.

## Delivery reality

Docs-only parking-lot note. **PARTIAL** until reviewed + merged. **COMPLETE on merge** because no runtime / customer-visible flow changes — and explicitly **no business activation**.
