# Website Rescue — Onboarding and Delivery Readiness v1

**Status:** Process contract + templates + pure validators. **No DNS action. No credential storage. No schema/env. No deploy.**

**Issue:** #716 (WS5) · Parent #711 · Controller #710 · Source #654

**Anchor sentinel:** `<!-- WEBSITE_RESCUE_ONBOARDING_AND_DELIVERY_V1 -->`

<!-- WEBSITE_RESCUE_ONBOARDING_AND_DELIVERY_V1 -->

**Audience:** Operator delivering a financially approved Website Rescue client (public SKU: **Premium Landing Page Rescue**) from onboarding through acceptance-ready evidence.

**Machine contract:** `config/website-rescue-onboarding-delivery.v1.json`  
**Validators:** `lib/website-rescue/onboarding-delivery.js`  
**Unit tests:** `node-tests/website-rescue-onboarding-delivery.test.mjs`

**Outcome:** Prove a financially approved Website Rescue client can be onboarded and delivered **without redesigning the service**.

---

## 0. Boundaries (anti-sidetrack)

| In lane | Out of lane |
| ------- | ----------- |
| Shared onboarding checklist + Website Rescue intake | CMS platform / unbounded redesign |
| Required-input completeness + build gate | Real DNS / client_production cutover |
| Bounded delivery issue + state model | Proposal / payment rail (#714 owns; we consume `financially_approved`) |
| Preview → revision → deploy-approval **simulation** → DNS/cutover **simulation** → live-validation **simulation** → handover | SEO campaigns / paid design tooling |
| Maintenance-boundary documentation | Lead Rescue messaging runtime (#715 / separate) |
| Synthetic upgrade / rebuild / one-page / small-catalogue fixtures | Prospect UI (#721) / general CorpFlowAI gateway redesign |

**Credentials** never appear in issues, docs, fixtures, or screenshots. Access is confirmed only as `approved_access_confirmed=true` after the path is handled via **approved secret channels**.

**Deploy and DNS/cutover** remain **simulated** in this lane (`deploy_approval_simulated`, `dns_cutover_authorized_simulated`). Real actions stay Anton-protected.

---

## 1. Entry condition — approved to onboard

Onboarding opens only when:

1. **`financially_approved === true`** (synthetic until #714 publishes; same boolean semantics thereafter).
2. Product is Website Rescue (`website-rescue` / Premium Landing Page Rescue).
3. Case type is one of: `upgrade` | `rebuild` | `one_page` | `small_catalogue`.
4. Operator has capacity for the quoted preview window (see product pack tiers).

If financial approval is missing → **do not start build**. Validator reason: `MISSING_FINANCIAL_APPROVAL`.

---

## 2. Shared onboarding checklist

Shared across CorpFlow commercial products (same spine as Lead Rescue where applicable):

| ID | Item |
| -- | ---- |
| `shared.business_identity` | Business identity confirmed |
| `shared.primary_contact` | Primary contact + working channels confirmed |
| `shared.financial_approval` | `financially_approved=true` recorded |
| `shared.named_approver` | Named client approver for acceptance |
| `shared.client_responsibilities_ack` | Client responsibilities acknowledged |
| `shared.exclusions_ack` | Exclusions acknowledged |
| `shared.acceptance_measures` | Acceptance measures agreed |
| `shared.review_cadence` | Review cadence agreed |

Template tick-list: `docs/operations/templates/website-rescue-onboarding-intake.md` § Shared.

Companion operator checklists: `docs/operations/WEBSITE_RESCUE_DELIVERY_CHECKLISTS_V1.md`.  
Mauritius all-tiers intake: `docs/operations/MAURITIUS_CLIENT_ONBOARDING_CHECKLIST_V1.md` § 1.

---

## 3. Website Rescue–specific intake (required capture)

Operator captures **all** of the following before `onboarding_complete` / build start. Machine field ids match `config/website-rescue-onboarding-delivery.v1.json` → `website_rescue_intake_fields`.

| Field | What to capture |
| ----- | --------------- |
| `case_type` | `upgrade` / `rebuild` / `one_page` / `small_catalogue` |
| `tier` | `T1` / `T2` / `T3` |
| `current_site_url` | Starting URL or greenfield note |
| `domain_hostname` | Agreed production hostname (name only) |
| `hosting_facts_summary` | Registrar/host path facts — **no passwords** |
| `brand_assets_status` | `provided` / `wordmark_ok` / `stock_direction` (not `pending` at build) |
| `pages_in_scope` | Ordered page list (≥1) |
| `services_or_products_summary` | Offer / catalogue content in scope |
| `content_ownership` | Who owns final copy and proof claims |
| `enquiry_destination` | Email / form recipient / handoff (no secrets) |
| `design_preferences` | Guided direction lock (A/B/C or note) |
| `revision_authority` | Who consolidates feedback |
| Contact / approver | Working email, phone, named approver |
| Responsibilities / exclusions / acceptance / cadence / maintenance | Accepted lists (defaults in config) |

### Gate flags on the record (not secret values)

| Flag | Meaning |
| ---- | ------- |
| `content_assets_ready=true` | Logo/wordmark/stock + offer copy cleared for build |
| `approved_access_confirmed=true` | Access path confirmed via **approved secret channel** only |
| `dns_cutover_in_scope` | Whether DNS cutover was quoted |
| `deploy_approval_simulated` | Simulated deploy approval recorded |
| `dns_cutover_authorized_simulated` | Simulated DNS authorization (only if in scope) |

**Never collect:** passwords, OTPs, DNS/hosting/registrar passwords, SSH/API keys, card data, bank accounts, government ID, health data. Presence → `BLOCKED_CLIENT_INPUTS`.

---

## 4. Client responsibilities, exclusions, acceptance, maintenance

### Client responsibilities (default)

- Provide brand assets or written wordmark/stock direction before the build clock starts.
- Name one production approver who consolidates revision feedback.
- Confirm enquiry destination the owner monitors.
- Provide preview feedback within the agreed review cadence.
- Escalate access or content blockers within one business day.
- Never send credentials in chat, tickets, or screenshots — approved secret channels only.

### Exclusions (default)

- No CMS platform / unbounded redesign.
- No SEO / traffic / revenue guarantees.
- No paid design tooling as a delivery dependency.
- No credentials in issues/docs/fixtures/screenshots.
- No real DNS or client_production cutover without separate Anton authorization.
- No Lead Rescue messaging runtime (separate workstream).
- No e-commerce / booking / member portals in this rescue lane.

### Acceptance measures (default)

- Quoted pages on managed preview with one primary buyer-action CTA.
- Mobile layout pass (no horizontal scroll on agreed width).
- Enquiry path tested to agreed destination.
- Named approver accepted preview (or documented revision closure).
- Deploy and DNS/cutover remain simulated-only unless Anton opens protected gates.
- Handover note with maintenance boundary delivered.

### Maintenance boundary (default)

**Included:** quoted pages as accepted at handover.  
**Not included unless quoted:** ongoing copy edits, new pages, SEO campaigns, hosting outside agreed arrangement, DNS changes, Lead Rescue monitoring, content retainers, emergency after-hours support.

### Review cadence (default)

- Preview / revision: client responds within **2 business days**.
- T1/T2: two structured preview rounds; T3: three; extras require written change order.

---

## 5. Delivery state model

```text
approved_to_onboard
  → onboarding_in_progress
      ⇄ onboarding_blocked
      → onboarding_complete
          → build_blocked | build_started
              → preview_evidence
                  ⇄ revision_cycle
                  → deploy_approval_pending
                      → deploy_approved_simulated   (requires deploy_approval_simulated)
                          → dns_cutover_gated
                              → live_validation_simulated  (requires DNS auth if in scope)
                                  → accepted
                                      → handover_complete
                                          → acceptance_ready
```

**Rules enforced in code:**

- Transition must be listed in `delivery_transitions`.
- `onboarding_complete` requires complete intake and no blocked inputs.
- `build_started` requires `canStartBuild()` → financial approval + complete intake + `content_assets_ready` + `approved_access_confirmed` + no blocked inputs.
- `deploy_approved_simulated` requires `deploy_approval_simulated === true`.
- `live_validation_simulated` requires `dns_cutover_authorized_simulated === true` when `dns_cutover_in_scope === true`.
- Real DNS / client_production deploy flags must stay false on the synthetic acceptance path.

---

## 6. Bounded delivery issue template

When onboarding is complete and build may start, open **one** bounded delivery issue using:

`docs/operations/templates/website-rescue-delivery-issue.md`

The issue must state:

- Synthetic or real client label (no secrets).
- `financially_approved` evidence pointer (link/ref only).
- Case type, tier, pages in scope, enquiry destination (redacted).
- Current `delivery_state`.
- Evidence packet checklist (preview → maintenance boundary).
- Explicit **deploy/DNS: simulated only** unless Anton opens protected gates.

Do not turn the delivery issue into a CMS programme, SEO campaign, or credential dump.

---

## 7. Evidence packets

| Packet | Required fields (summary) |
| ------ | ------------------------- |
| `preview` | artefact/URL, captured_at, operator_note |
| `revision` | round, reviewer, decision, feedback_summary, captured_at |
| `deploy_approval` | approver, approved_at, simulation_only, operator_note |
| `dns_cutover` | in_scope, authorization_status, simulation_only, operator_note |
| `live_validation` | checks, pass_fail, captured_at, operator_note |
| `acceptance` | accepted_by, accepted_at, acceptance_measures_met |
| `handover` | handover_sent_at, channels, support_boundary_summary, what_was_built |
| `maintenance_boundary` | in_scope, out_of_scope, escalation_contact, optional_maintenance_offer |

For #711 Scenario B integrated test, evidence may be **synthetic**. Real DNS/deploy remain out of scope.

---

## 8. Build-start and cutover gates (unit-gate proof)

`canStartBuild(record)` fails when:

| Reason | Cause |
| ------ | ----- |
| `MISSING_FINANCIAL_APPROVAL` | `financially_approved !== true` |
| `MISSING_REQUIRED_CLIENT_INPUTS` | Required intake fields incomplete (incl. pending brand assets) |
| `MISSING_CONTENT_OR_ASSETS` | `content_assets_ready !== true` |
| `MISSING_APPROVED_ACCESS` | `approved_access_confirmed !== true` |
| `BLOCKED_CLIENT_INPUTS` | `blocked_inputs` set or forbidden fields present |

Cutover progression fails when:

| Reason | Cause |
| ------ | ----- |
| `DEPLOY_APPROVAL_NOT_SIMULATED` | Leaving `deploy_approval_pending` without `deploy_approval_simulated` |
| `DNS_CUTOVER_NOT_AUTHORIZED` | `dns_cutover_in_scope` and missing `dns_cutover_authorized_simulated` |

---

## 9. Synthetic records and test gates

| Gate | Date | What this lane provides |
| ---- | ---- | ----------------------- |
| Unit | 7 Aug 2026 | Completeness tests; upgrade / rebuild / one-page / small-catalogue fixtures; transition + build/cutover gate tests |
| System | 12 Aug 2026 | Independent path `approved_to_onboard` → `acceptance_ready` on synthetic data |
| Integrated | 14 Aug 2026 | Scenario B (#711) through handover evidence — **deploy/DNS simulated only**, **no** client_production cutover |

Fixtures:

- `fixtures/website-rescue-onboarding/upgrade-complete.json`
- `fixtures/website-rescue-onboarding/rebuild-complete.json`
- `fixtures/website-rescue-onboarding/one-page-complete.json`
- `fixtures/website-rescue-onboarding/small-catalogue-complete.json`
- `fixtures/website-rescue-onboarding/incomplete.json`
- `fixtures/website-rescue-onboarding/blocked-content-assets.json`
- `fixtures/website-rescue-onboarding/blocked-access.json`
- `fixtures/website-rescue-onboarding/acceptance-ready.json`

---

## 10. Operator procedure (short)

1. Confirm `financially_approved=true` (from #714 evidence or synthetic for tests).
2. Fill intake template; tick shared checklist; lock case type + tier + pages.
3. Confirm content/assets ready and approved-access path (secret channel) — set flags only.
4. If inputs blocked → `onboarding_blocked`; chase; do not start build.
5. When complete → open bounded delivery issue; transition to `build_started` only if gate passes.
6. Capture preview → revision → deploy-approval simulation → DNS/cutover gate → live-validation simulation → acceptance → handover → maintenance boundary.
7. Mark `acceptance_ready` when evidence packets are complete.

Deep day-to-day operator ticks remain in `docs/operations/WEBSITE_RESCUE_DELIVERY_CHECKLISTS_V1.md`. This doc owns **readiness gates and evidence shape**.

---

## 11. Cross-references

| Topic | Doc |
| ----- | --- |
| Operator checklists | `docs/operations/WEBSITE_RESCUE_DELIVERY_CHECKLISTS_V1.md` |
| Product pack | `docs/marketing/WEBSITE_RESCUE_PRODUCT_PACK_V1.md` |
| Quote-ready packet | `docs/marketing/WEBSITE_RESCUE_QUOTE_READY_PACKET_V1.md` |
| Pricing guide | `docs/sales/WEBSITE_RESCUE_PRICING_GUIDE.md` |
| Mauritius shared intake | `docs/operations/MAURITIUS_CLIENT_ONBOARDING_CHECKLIST_V1.md` |
| Financial approval lane | GitHub #714 |
| Lead Rescue sibling (do not merge streams) | GitHub #715 |
| Integrated Scenario B | GitHub #711 |

---

## 12. Delivery Reality note

This packet is **local / PR** readiness for WS5. Operational **COMPLETE** for a live client still requires live verification per `.cursor/rules/delivery-reality.mdc` when a real rescue is delivered — and still does **not** authorize real DNS, client_production deploy, or credential handling without separate Anton gates.
