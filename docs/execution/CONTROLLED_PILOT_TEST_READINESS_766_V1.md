# Controlled-pilot test readiness — operator package (#766)

**Status:** Repository packaging COMPLETE · Controlled-client launch **NOT READY** (one exact blocker below)  
**Issue:** [#766](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/766)  
**Sources:** #710 · #711 · merged PR #757 · #714 · #715 · #716 · (reference only) #765 · #760 / #764  
**Anchor:** `<!-- CONTROLLED_PILOT_TEST_READINESS_766_V1 -->`

<!-- CONTROLLED_PILOT_TEST_READINESS_766_V1 -->

**Purpose:** Convert the merged #711 / #757 synthetic Lead Rescue and Website Rescue acceptance proof into an **operator-executable** controlled-pilot readiness package. This does **not** redesign the commercial workflow.

**Environment:** rehearsal and live GETs against **corpflow_test** / factory surfaces only. Not `client_production`. Not Café International DNS/cutover.

---

## 0. Anton decision (one consolidated ask)

```text
Decision required: Controlled-client pilot go / no-go
Recommended verdict from this package: NOT READY
Exact blocker: Packet C — ERPNext sandbox synthetic commercial-control proof
               has not been executed and evidenced by the operator
               (Lead → Opportunity → Quotation → acceptance → invoice/pro-forma
               → mock payment → manual verification → financially_approved /
               Proceed Approved → Project/Tasks → feedback Issue → release sim
               → handover). Evidence slots are empty by design; Cursor must not
               invent ERPNext configuration or write sandbox records.
When blocker clears: Anton fills Packet C slots + Packet B live access ticks,
then re-open this decision with READY / NOT READY from filled evidence.
Until then: NONE on pricing, merge/deploy for client launch, external send,
protected provisioning, or client_production.
```

**What is already true (do not re-prove from scratch):**

| Proof | Location | Result |
| ----- | -------- | ------ |
| Integrated Scenarios A/B (synthetic) | `docs/execution/GTM_INTEGRATED_SCENARIOS_711_RESULT_V1.md` · `artifacts/gtm-integrated-711/` · PR #757 | PASS — READY FOR CONTROLLED CLIENT PILOT (**synthetic simulation only**) |
| Commercial approval rail | `docs/revenue/COMMERCIAL_APPROVAL_RAIL_V1.md` · #714 | Gate + handoff helpers exist |
| LR / WR onboarding + delivery | #715 / #716 system-proof CLIs | `acceptance_ready` with no sends / no real DNS |

---

## Packet A — executable test scripts (operator rehearsal)

### A1. Approved test URLs and surfaces

| Surface | URL | Use |
| ------- | --- | --- |
| Market discovery | `https://corpflowai.com/contact` (`#discovery`) | Buyer-need intake; expect single `buyer_need` question |
| Lead Rescue wedge | `https://corpflowai.com/lead-rescue` | USD 150 pilot offer path (Scenario A) |
| Website Rescue offer | `https://corpflowai.com/offers/premium-landing-page-rescue` | WR offer path (Scenario B) |
| LR operator desk | `/admin/lead-rescue` · `/admin/lead-rescue/[id]` | Factory operator queue (after login) |
| Rapid-delivery desk | `/admin/rapid-delivery` | MUR / WR-style operator desk |
| Login | `https://core.corpflowai.com/login` (factory) · tenant host `/login` | Session + password-reset UI |
| Factory health (internal only) | `https://core.corpflowai.com/api/factory/health` | **Not** proof of buyer funnel |

Optional (out of primary A/B path): `/lead-rescue/property-mauritius`, `/offers/ai-lead-rescue` (MUR — do not merge quoting with USD `/lead-rescue`), `/demo/website-rescue`.

**Do not use as primary #766 evidence:** Lux `/change` layout work, CIPC Desk, Café International client DNS (`cafeinternational.net`), ElevenLabs voice demos.

### A2. Required test roles / accounts (no credentials in GitHub)

| Role | Username (synthetic) | Purpose |
| ---- | -------------------- | ------- |
| Admin / operator smoke | `cursor-test-admin@corpflowai.com` | Factory queue / admin smoke (`factory_master=false`) |
| Tenant smoke | `cursor-test-tenant@corpflowai.com` | Tenant isolation; initial membership `luxe-maurice` only |
| Financial approver (persona in fixtures) | `Anton (operator financial approver)` | Named in commercial rail synthetic records only |
| Client acceptors (synthetic) | `Sam Approver (client)` · `Jordan Approver (client)` | Acceptance fields in #711 commercial builder |

Passwords: **Anton-held secret store only.** Runtime names: `CURSOR_TEST_ADMIN_*`, `TENANT_SMOKE_*` — see `docs/runbooks/CURSOR_TEST_USERS_PROVISIONING.md`. Never put passwords in PRs, artifacts, or screenshots.

Safe pre-handoff (no secrets):

```bash
npm run provision:cursor-test-users -- --dry-run
npm run verify:cursor-test-users -- --packet
```

### A3. Synthetic identities and fixtures

**Reuse #757 integrated IDs** (do not invent a parallel ID scheme):

| Field | Scenario A (Lead Rescue) | Scenario B (Website Rescue) |
| ----- | ------------------------ | --------------------------- |
| Enquiry | `INT-SYN-711A-20260805-001` | `INT-SYN-711B-20260805-001` |
| Prospect | `PM-INT-711A-LR-20260805-001` | `PM-INT-711B-WR-20260805-001` |
| Opportunity | `OPP-SYN-711A-LR-20260805-001` | `OPP-SYN-711B-WR-20260805-001` |
| FA | `FA-SYN-711A-LR-20260805-001` | `FA-SYN-711B-WR-20260805-001` |
| Payment evidence | `PAY-EV-SYN-711A-LR-20260805-001` | `PAY-EV-SYN-711B-WR-20260805-001` |
| Onboarding | `ONB-SYN-711A-LR-20260805-001` | `ONB-SYN-711B-WR-20260805-001` |
| Delivery | `DEL-SYN-711A-LR-20260805-001` | `DEL-SYN-711B-WR-20260805-001` |

Stable package-proof IDs (sibling CLIs, distinct from #711 run): `OPP-SYN-LR-SYS-715-001`, `OPP-SYN-WR-SYS-716-001`.

Fixture roots: `fixtures/commercial-approval/`, `fixtures/lead-rescue-onboarding/`, `fixtures/website-rescue-onboarding/`, `fixtures/prospect-maturation/`.

Composer: `lib/gtm/integrated-scenarios-711.js` — **do not reimplement** unless a real testability blocker appears.

### A4. Scenario A — Lead Rescue (step by step)

Run the deterministic path first (always), then optional UI walk.

#### A4.1 Deterministic rehearsal (required)

```bash
node scripts/gtm-integrated-scenarios-711.mjs
# or freshness wrapper:
node scripts/controlled-pilot-rehearsal-766.mjs
```

| Step | Action | Expected | Evidence |
| ---- | ------ | -------- | -------- |
| A0 | Confirm branch/HEAD | Clean checkout of intended commit | `git rev-parse HEAD` |
| A1 | Market classification (`losing-enquiries`) | Maps to `service_interest=lead_rescue` | Ledger step ok in `scenario-a-ledger.json` |
| A2 | Ack draft | Draft only; `send=false` | `external_sends_executed: []` |
| A3 | Owner / next-action gates | Missing owner/next action **blocks** | Gate-block rows ok |
| A4 | Maturation walk | Stages → `proposal_sent` | Final prospect stage |
| A5 | FA missing | Onboarding/build **blocked** without FA | Gate-block ok |
| A6 | FA handoff (#714) | `financially_approved: true` handoff shape; `protected_actions_executed: false` | FA ref `FA-SYN-711A-*` |
| A7 | Delivery walk (#715) | → `acceptance_ready` | `final_delivery_state` |
| A8 | Messaging | Unauthorized; no runtime send | `messaging_runtime_authorized: false` |

#### A4.2 Operator UI walk (optional same day — synthetic only)

| Step | Action | Expected | Evidence |
| ---- | ------ | -------- | -------- |
| U1 | GET `https://corpflowai.com/lead-rescue` | 200; offer understandable; CTA buyer-intent | Status + first HTML bytes / screenshot (no secrets) |
| U2 | GET `https://corpflowai.com/contact` | 200; single buyer-need question | Same |
| U3 | Login as operator test user | Can open `/admin/lead-rescue` | Redacted screenshot — no passwords |
| U4 | Confirm queue fields visible | Enquiry, owner, stage, next action, due date, evidence area | Checklist tick (Packet B) |
| U5 | Confirm no auto-send | No email/WhatsApp/SMS fired | Activity empty of sends |

**Forbidden on Scenario A:** live messaging, real client deploy, production DNS, real buyer data, payment execution.

### A5. Scenario B — Website Rescue (step by step)

#### A5.1 Deterministic rehearsal (required)

Same CLI as A4.1 (combined runner covers A+B).

| Step | Action | Expected | Evidence |
| ---- | ------ | -------- | -------- |
| B1 | Locked-offer / website classification | `service_interest=website_rescue` / offer retained | `scenario-b-ledger.json` |
| B2 | Ack draft | Draft only | `external_sends_executed: []` |
| B3 | Maturation | → `proposal_ready` | Ledger |
| B4 | FA missing / FA handoff | Same rail as LR | FA `FA-SYN-711B-*` |
| B5 | Content/assets/access gates | Incomplete inputs **block** build | Gate-block ok |
| B6 | Delivery + revision | → `acceptance_ready` | Final state |
| B7 | Deploy/DNS | **Simulated only** | `real_dns_cutover_executed: false`, `real_client_production_deploy: false` |

#### A5.2 Operator UI walk (optional)

| Step | Action | Expected | Evidence |
| ---- | ------ | -------- | -------- |
| V1 | GET `https://corpflowai.com/offers/premium-landing-page-rescue` | 200; distinct from LR wedge | Status / screenshot |
| V2 | Operator desk `/admin/rapid-delivery` (if used for MUR path) | Queue reachable for operator test role | Redacted screenshot |
| V3 | Confirm deploy/DNS not live | No DNS change; no client_production cutover | Explicit non-claim tick |

### A6. Exact commands (operator card)

```bash
# Freshness rehearsal (writes artifacts/controlled-pilot-766/latest-rehearsal.json)
node scripts/controlled-pilot-rehearsal-766.mjs

# Underlying #757 composer (also refreshes artifacts/gtm-integrated-711/)
node scripts/gtm-integrated-scenarios-711.mjs

# Sibling system proofs
node scripts/prospect-maturation-system-proof.mjs
node scripts/lead-rescue-system-proof.mjs
node scripts/website-rescue-system-proof.mjs

# Focused tests
node --test \
  node-tests/gtm-integrated-scenarios-711.test.mjs \
  node-tests/commercial-approval-rail.test.mjs \
  node-tests/lead-rescue-system-proof.test.mjs \
  node-tests/website-rescue-system-proof.test.mjs \
  node-tests/controlled-pilot-rehearsal-766.test.mjs

# Live GET smoke (read-only)
curl -sI https://corpflowai.com/contact
curl -sI https://corpflowai.com/lead-rescue
curl -sI https://corpflowai.com/offers/premium-landing-page-rescue
```

### A7. No-send and protected-action checks

| Check | Pass criterion |
| ----- | -------------- |
| External sends | Every ledger / CLI report has `external_sends_executed: []` |
| Messaging runtime | `messaging_runtime_authorized: false` (LR) |
| Protected handoff | `protected_actions_executed: false` on FA handoff |
| DNS / deploy | WR: `real_dns_cutover_executed: false` and no client_production deploy |
| Payment | No bank action; payment evidence is synthetic / mock only |
| Schema / env | No Prisma migrate, no `.env` edits for this packet |

### A8. Defect classification

Use classes only:

1. **release blocker** — stops controlled-client pilot  
2. **important non-blocker** — must schedule before scale; pilot may proceed with mitigation  
3. **enhancement** — backlog  

Register: `artifacts/controlled-pilot-766/defect-register.json` · human table in § Defect register below.

### A9. Cleanup / reset

| Surface | Cleanup |
| ------- | ------- |
| Deterministic CLI | Re-run overwrites `artifacts/gtm-integrated-711/*` and `artifacts/controlled-pilot-766/latest-rehearsal.json` — safe |
| Synthetic fixtures | Do not delete shared fixtures; they are repo assets |
| Operator UI synthetic leads | If any created in `corpflow_test`, mark/cancel with `SYN-766` / `REH-` prefix; do not leave real PII |
| ERPNext sandbox | Cancel or leave clearly named `REH-*` docs after Packet C evidence (operator) — see Packet C |
| Screenshots | Keep only redacted copies; purge passwords, tokens, bank digits |

### A10. Sign-off record

Template: `artifacts/controlled-pilot-766/sign-off-record.template.md`  
Fill after Packets A–D evidence is complete; attach to #766 / Operator Bridge as needed.

---

## Packet B — access and boundary verification

**Mode:** synthetic / test accounts only. Credentials never in GitHub.

| # | Check | How | Pass | Evidence slot |
| - | ----- | --- | ---- | ------------- |
| B1 | CorpFlowAI operator can access required queue/workspace | Login `cursor-test-admin@corpflowai.com` → `/admin/lead-rescue` (and rapid-delivery if used) | Queue loads | Operator tick + redacted screenshot (private) |
| B2 | Tenant role cannot see another tenant or Core records | Login `cursor-test-tenant@corpflowai.com` on tenant host; attempt Core/factory and other-tenant IDs | Denied / empty / wrong-tenant blocked | Tick + note status codes |
| B3 | Password reset route present where tenant access required | Open `/login`; confirm reset UI; routes `POST /api/auth/password-reset/request` + `/confirm` exist | UI present; no secret logged | Tick (do not capture tokens) |
| B4 | Client roles cannot approve protected actions | Tenant session must not pass `requireFactoryMasterOnly` / financial proceed / promote-merge style actions | 403 / gate block | Tick |
| B5 | Restricted/internal info not on public surfaces | View `/lead-rescue`, `/contact`, WR offer as anonymous | No secrets, no other-tenant data, no internal FA notes | Tick |
| B6 | Operator sees enquiry, owner, stage, next action, due date, evidence | On operator queue/detail for a synthetic or fixture-backed record | Fields visible | Tick |
| B7 | No credentials/secrets/private data in screenshots/logs | Review any evidence before attach | Clean | Tick |

**Repo-safe boundary references (read-only):**

- `docs/operations/TENANT_CLIENT_LOGIN.md`
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md`
- `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`
- `docs/runbooks/CURSOR_TEST_USERS_PROVISIONING.md`
- Gates live in `lib/cmp/router.js` (`requireDormantGate` / `requireFactoryMasterOnly`)

**Packet B status in this PR:** checklist ready; **live ticks pending Anton-held passwords** (not available to Cursor). Dry-run identities verified via:

```bash
npm run provision:cursor-test-users -- --dry-run
npm run verify:cursor-test-users -- --packet
```

---

## Packet C — ERPNext synthetic commercial proof

**Owner:** Anton / ERPNext operator (Cursor does **not** write ERPNext).  
**Instance:** sandbox only (`127.0.0.1:8080` via SSH tunnel per `docs/runbooks/ERPNEXT_SANDBOX_INSTALL.md`).  
**Not authorized:** payment to real bank, client send, production shell (`8081`) customization, real POP.

### C1. Required chain (prove with synthetic/redacted evidence)

```text
Lead
→ Opportunity
→ Quotation
→ acceptance record
→ invoice/pro-forma handoff
→ mock payment evidence
→ manual payment verification
→ Proceed Approved (app: financially_approved / FA handoff)
→ Project / Tasks
→ feedback Issue
→ release approval simulation
→ handover
```

### C2. Mapping to existing runbooks (reuse — do not invent a second OS)

| Chain step | Primary operator doc | Suggested synthetic ID |
| ---------- | -------------------- | ---------------------- |
| Lead | `ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1.md` §5.1–5.2 | `REH-LEAD-766-001` |
| Opportunity | Standard ERPNext Opportunity **or** document skip if Quotation-primary | `REH-OPP-766-001` or `SKIPPED-QUOTATION-PRIMARY` |
| Quotation | Same rehearsal §5.4 · Item `SBX-LR-SETUP-USD-150` (LR) | `REH-QUO-766-001` |
| Acceptance | `docs/revenue/templates/COMMERCIAL_ACCEPTANCE_RECORD.md` | Synthetic acceptor name |
| Invoice / pro-forma | Quotation PDF or Sales Invoice (sandbox) · manual pro-forma fallback | SI / Quotation name |
| Mock payment | Synthetic wire ref only | `REH-WIRE-766-001` |
| Manual verification | Anton clearance discipline · `DELIVERY_RELEASE_CHECKLIST.md` | Tick + timestamp (private) |
| Proceed Approved | App rail `financially_approved` via #714 / CLI FA handoff | `FA-SYN-711A-*` or new `FA-SYN-766-*` |
| Project / Tasks | `ERPNEXT_RECORD_MAPPING.md` · quote-to-cash Stage 4 | `PROJ-REH-766-001` |
| Feedback Issue | ERPNext Issue **or** app delivery-issue template | Issue name or `docs/operations/templates/*-delivery-issue.md` |
| Release approval sim | `docs/revenue/templates/production-release-approval.md` | Written “approve production release” sim; DNS false |
| Handover | LR/WR acceptance_ready + fulfilment checklist pointer | Handover tick |

CSV field template: `docs/operations/templates/erpnext-lead-rescue-paid-pilot-rehearsal-sample.csv`  
Evidence slot file: `artifacts/controlled-pilot-766/packet-c-evidence-slots.json`

### C3. Return fields (operator fills — do not invent)

| Return | Slot |
| ------ | ---- |
| Record / evidence references | IDs above |
| Screenshots / safe operator evidence | **Private only** — never commit bank digits or real client data |
| Missing configuration | e.g. Item missing, Print Format shows Sandbox |
| Standard DocType / status limitations | e.g. Opportunity unused; Issue optional |
| Is standard ERPNext sufficient for first controlled pilot? | YES / NO + one sentence |
| Exact customization request | **Only if proven necessary** — else `NONE` |

### C4. Sufficiency stance (repo, pending operator proof)

Standard ERPNext **Customer → Quotation → Sales Invoice → Payment Entry → Project** is the documented hybrid spine. App-side **Proceed Approved** is `financially_approved` (#714), not an ERPNext custom DocType. Until Packet C is executed, sufficiency is **unproven for this packet** — do not claim customization need without a failed standard path.

---

## Packet D — controlled-pilot go-live checklist

### D1. Product gate

| Item | Status / how |
| ---- | ------------ |
| Offer and CTA verified | Live GET `/lead-rescue` + WR offer; doctrine: buyer-intent CTA |
| Lead Rescue vs Website Rescue routing distinct | Market path regression + contact single `buyer_need` |
| No unsupported claims | Review pages against `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` / First-Paid-Pilots pack |

### D2. Operating gate

| Item | Status / how |
| ---- | ------------ |
| Enquiry reaches operator queue | LR desk / rapid-delivery; Packet B1 |
| Owner, next action, due date recorded | Maturation gates + Packet B6 |
| Qualification, proposal, onboarding, delivery assets accessible | Templates under `docs/revenue/templates/` + #715/#716 docs |
| Draft communications remain manual/review-only | CLI proves no send; messaging unauthorized |

### D3. Security / data gate

| Item | Status / how |
| ---- | ------------ |
| Tenant isolation passed | Packet B2–B4 live ticks |
| Company Master / public–restricted separation supported | Cite #765 / PR #770 plan only — **do not edit Company Master paths**; restricted docs stay out of GitHub |
| No secrets/private data in repo/evidence | A7 + B7 |
| Restricted documents outside GitHub | POP, bank, real contracts — private storage |

### D4. Commercial gate

| Item | Status / how |
| ---- | ------------ |
| Pricing and payment terms ready for Anton decision | LR USD 150 pilot pack; WR pricing guide — **Anton decides** |
| Quotation identity and invoice/pro-forma route proven | Packet C |
| Manual payment-verification owner defined | **Anton** |
| Financial approval-to-build gate works | #714 rail + integrated CLI FA handoff |

### D5. Release gate

| Item | Status / how |
| ---- | ------------ |
| Exact commit / version identified | `git rev-parse HEAD` of intended launch commit (fill at go-live) |
| Deploy approval isolated | Anton-only; no agent merge/deploy |
| Rollback documented | See § Rollback |
| Live URL and enquiry verification steps defined | § A6 live GETs + post-deploy contact/LR/WR checks |
| First-day validation / support owner named | **Anton** (default) |

### D6. Rollback (controlled pilot)

| Failure | Immediate action |
| ------- | ---------------- |
| Buyer funnel 5xx / wrong offer | Stop outreach; revert deploy to last known-good Production commit (Anton) |
| Mistaken external send | Stop messaging; incident note; do not widen automation |
| Wrong ERPNext record / early Payment Entry | Cancel PE in **sandbox**; reset invoice; do not touch production shell |
| Tenant isolation failure | Disable affected test access; treat as **release blocker** |
| Payment confusion on real pilot | Hold `PAID_SETUP` / build until Anton verifies cleared funds |

Café International (#760/#764): **future** controlled client example only — no provisioning, no DNS, no `cafeinternational.net` cutover in this packet.

---

## Defect register

Machine file: `artifacts/controlled-pilot-766/defect-register.json`

| ID | Class | Owner | Summary | Blocks pilot? |
| -- | ----- | ----- | ------- | ------------- |
| D766-001 | release blocker | Anton / ERPNext operator | Packet C ERPNext synthetic commercial-control proof not executed; evidence slots empty | **YES** |
| D766-002 | important non-blocker | Anton | Packet B live access ticks pending (credentials not in agent environment) | No for packaging; **Yes before first client login rehearsal** |
| D766-003 | enhancement | ChatGPT / backlog | Optional Opportunity DocType may be skipped if Quotation-primary path is accepted in Packet C notes | No |

---

## Final verdict

```text
Final verdict: NOT READY
Exact blocker: D766-001 — Packet C ERPNext sandbox synthetic commercial-control
               proof not executed and evidenced by the operator.
```

**Explicit non-claims**

- Not a live client delivery  
- Messaging is not active  
- No real Website Rescue DNS or production cutover  
- No production acceptance for a real client  
- No Café International provisioning  
- No Company Master implementation in this packet  
- No merge/deploy authorization from this document alone  

---

## Ownership

| Role | Responsibility |
| ---- | -------------- |
| Cursor | This repository package, deterministic rehearsal wrapper, defect register, PR only |
| ERPNext / operator | Packet C execution + private evidence |
| ChatGPT | Acceptance review, defect triage, go-live decision framing |
| Anton | Pricing, protected provisioning, merge/deploy, external send, client launch, Packet B live passwords |

**Anton action:** NONE until Packet C (and Packet B live ticks) produce a filled evidence package for one go/no-go decision.

---

## Cross-references

- `docs/execution/GTM_INTEGRATED_SCENARIOS_711_RESULT_V1.md`
- `docs/execution/GTM_INTEGRATED_SCENARIOS_711_PREP_V1.md`
- `docs/revenue/COMMERCIAL_APPROVAL_RAIL_V1.md`
- `docs/operations/LEAD_RESCUE_ONBOARDING_AND_DELIVERY_V1.md`
- `docs/operations/WEBSITE_RESCUE_ONBOARDING_AND_DELIVERY_V1.md`
- `docs/operations/ERPNEXT_LEAD_RESCUE_PAID_PILOT_REHEARSAL_V1.md`
- `docs/erpnext/ERPNEXT_RECORD_MAPPING.md`
- `docs/erpnext/ERPNEXT_COMMERCIAL_CLOSEOUT_CHECKLIST.md`
- `docs/runbooks/CURSOR_TEST_USERS_PROVISIONING.md`
- `artifacts/controlled-pilot-766/`
- `scripts/controlled-pilot-rehearsal-766.mjs`
