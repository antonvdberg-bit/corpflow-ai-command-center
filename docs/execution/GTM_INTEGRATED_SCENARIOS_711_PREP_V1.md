# GTM Integrated Scenarios — Preparation Packet (#711)

**Status:** PREPARE ONLY — orchestration plan for the 14 Aug integrated test.  
**No production deploy. No schema. No external send. No DNS/client cutover.**

**Issues:** #711 (integrated) · Controller #710 · Depends on #712/#713/#715/#716 system evidence  
**Anchor:** `<!-- GTM_INTEGRATED_SCENARIOS_711_PREP_V1 -->`

<!-- GTM_INTEGRATED_SCENARIOS_711_PREP_V1 -->

---

## 0. Prerequisite merge state

Integrated scenarios must run against **final merged `main`**, not isolated branch assumptions.

| Prerequisite | PR | Role |
| ------------ | -- | ---- |
| Buyer-need routing LIVE | #749 (merged) | Market enquiry classification |
| Prospect maturation unit | #746 | Lifecycle + draft assets |
| Prospect maturation system | #755 | Enquiry → proposal_sent / proposal_ready |
| Lead Rescue system-proof | #745 | Approved → acceptance_ready |
| Website Rescue system-proof | #742 | Approved → acceptance_ready |
| Commercial approval rail | #714 (merged) | Financially approved handoff |

Until #746 / #745 / #742 / #755 are on `main`, treat this packet as **PREPARE**, not COMPLETE.

---

## 1. Scenario A — Lead Rescue (synthetic)

```text
fresh synthetic market enquiry (buyer_need=losing-enquiries)
  → internal map: service_interest=lead_rescue, product path retained
  → operator queue / prospect stage=new
  → acknowledgement draft (send=false)
  → qualification (ai_lead_rescue gate)
  → discovery_booked → proposal_ready → proposal_sent
  → commercial / financially approved (#714 handoff)
  → onboarding → delivery walk (#715 system-proof)
  → preview + verification evidence
  → acceptance_ready
  → handover evidence
```

**Forbidden:** live messaging, real client deployment, production DNS.

**Reuse (do not rebuild):**

| Step | Existing capability |
| ---- | ------------------- |
| Classification | `lib/public/corpflow-market-service-paths.js` |
| Maturation walk | `lib/prospects/system-proof.js` (`walkLeadRescueMaturationPath`) |
| FA handoff | `lib/revenue/commercial-approval.js` (`toOnboardingHandoff`) |
| Delivery proof | `lib/lead-rescue/system-proof.js` (`runLeadRescueSystemProof`) |

**Fresh synthetic IDs (proposed):**

- Enquiry ref: `INT-SYN-711A-001`
- Prospect: `PM-INT-711A-LR-001`
- Opportunity: `OPP-SYN-711A-LR-001`
- Financial approval: `FA-SYN-711A-LR-001`

---

## 2. Scenario B — Website Rescue (synthetic)

```text
fresh synthetic website enquiry (buyer_need=website-improvement OR locked offer)
  → internal map: service_interest=website_rescue / offer_slug retained
  → operator queue / prospect stage=new
  → acknowledgement draft (send=false)
  → qualification (website_rescue gate)
  → discovery_booked → proposal_ready
  → commercial / financially approved
  → onboarding → website requirements captured
  → preview + revision simulation
  → deploy/DNS approval **simulated**
  → acceptance_ready
  → handover evidence
```

**Forbidden:** real DNS, production-client cutover, live messaging.

**Reuse:**

| Step | Existing capability |
| ---- | ------------------- |
| Classification / locked offer | Discovery form + market path helpers (#749) |
| Maturation walk | `walkWebsiteRescueMaturationPath` |
| Delivery proof | `lib/website-rescue/system-proof.js` |

**Fresh synthetic IDs (proposed):**

- Enquiry ref: `INT-SYN-711B-001`
- Prospect: `PM-INT-711B-WR-001`
- Opportunity: `OPP-SYN-711B-WR-001`
- Financial approval: `FA-SYN-711B-WR-001`

---

## 3. Execution order after merges

1. Confirm Production still serves #749 buyer-need (smoke GET `/contact#discovery`).
2. Re-run on merged main:
   - `node scripts/prospect-maturation-system-proof.mjs`
   - `node scripts/lead-rescue-system-proof.mjs`
   - `node scripts/website-rescue-system-proof.mjs`
3. Re-run market-path focused tests (`node-tests/corpflow-discovery-buyer-need-712.test.mjs` + any market system suite).
4. Only then implement a thin `lib/gtm/integrated-scenarios.js` composer if gaps remain — prefer composing existing runners over new product code.
5. Capture one combined artifact under `artifacts/gtm-integrated-scenarios-711/`.

---

## 4. Gate / evidence requirements

For each scenario record:

- run ID / branch / commit
- every stage transition
- blocked gates proven (owner, FA, messaging runtime, DNS simulated-only)
- `external_sends_executed: []`
- `messaging_runtime_authorized: false`
- no real DNS / client_production cutover flags

---

## 5. Explicit non-actions

- Do not open four overlapping implementation workstreams
- Do not redesign buyer-need form
- Do not activate email / WhatsApp / SMS
- Do not deploy to production
- Do not merge production-sensitive PRs without Anton/ChatGPT consolidated decision

---

## 6. Current evidence snapshot (2026-08-04)

| Packet | Status |
| ------ | ------ |
| #749 production | LIVE VERIFIED |
| #713 system-proof | PR #755 — CLI `ok: true` |
| #715 system-proof | PR #745 — CLI `ok: true` (branch re-run) |
| #716 system-proof | PR #742 — CLI `ok: true` (branch re-run) |
| #711 integrated | **PREPARE** (this doc) — blocked on merges to main |
