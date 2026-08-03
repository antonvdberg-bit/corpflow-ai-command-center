# Website Rescue delivery — bounded issue template

**Copy into a GitHub issue (or CMP ticket summary) when onboarding is complete and build may start.**
**Canonical:** `docs/operations/WEBSITE_RESCUE_ONBOARDING_AND_DELIVERY_V1.md`
**Issue programme:** #716 / #711

---

## Title

`Website Rescue delivery — {business_display_name} — {case_type} — {synthetic|live}`

## Metadata

| Field | Value |
| ----- | ----- |
| Product | `website-rescue` (public SKU: Premium Landing Page Rescue) |
| Client label | (display name only — no secrets) |
| `financially_approved` | true / false |
| Financial approval ref | (pointer only) |
| Case type | `upgrade` / `rebuild` / `one_page` / `small_catalogue` |
| Tier | `T1` / `T2` / `T3` |
| Pages in scope | |
| Delivery state | `approved_to_onboard` → … → `acceptance_ready` |
| `content_assets_ready` | true / false |
| `approved_access_confirmed` | true / false (secret channel only — no credentials here) |
| `dns_cutover_in_scope` | true / false |
| Deploy approval | **simulated only** (`deploy_approval_simulated`) |
| DNS cutover | **simulated only** (`dns_cutover_authorized_simulated`) |
| Real client_production deploy | **false** |
| Parent programme | #711 |
| WS5 lane | #716 |

## Scope (bounded)

In scope for this delivery issue:

- [ ] Quoted pages for the locked case type / tier
- [ ] Preview / revision / acceptance / handover evidence
- [ ] Deploy-approval **simulation** and DNS/cutover **gate simulation**
- [ ] Live-validation **simulation** (synthetic checks)
- [ ] Maintenance boundary documented

Out of scope (open a separate issue if needed):

- [ ] Real DNS change or client_production cutover
- [ ] CMS platform / unbounded redesign
- [ ] SEO campaign expansion
- [ ] Credential collection in this issue
- [ ] Lead Rescue messaging runtime (#715)
- [ ] Proposal / payment machinery (#714)
- [ ] Prospect UI / Kanban redesign (#721)

## Intake summary (redacted)

- Current site URL: …
- Domain hostname: …
- Hosting facts (no passwords): …
- Brand/assets status: …
- Pages / services / products: …
- Content ownership: …
- Enquiry destination: …
- Design preferences: …
- Revision authority / named approver: …
- Review cadence: …
- Maintenance boundary: …

## State checklist

- [ ] `approved_to_onboard`
- [ ] `onboarding_in_progress`
- [ ] `onboarding_blocked` *(if required inputs blocked — do not build)*
- [ ] `onboarding_complete`
- [ ] `build_blocked` *(gate failed — financial approval, content/assets, or access)*
- [ ] `build_started` *(only if build gate passed)*
- [ ] `preview_evidence`
- [ ] `revision_cycle`
- [ ] `deploy_approval_pending`
- [ ] `deploy_approved_simulated` *(requires `deploy_approval_simulated=true`)*
- [ ] `dns_cutover_gated`
- [ ] `live_validation_simulated` *(requires DNS auth simulation if cutover in scope)*
- [ ] `accepted`
- [ ] `handover_complete`
- [ ] `acceptance_ready`

## Evidence packets

### Preview

- Artefact / URL:
- Captured at:
- Operator note:

### Revision

- Round:
- Reviewer:
- Decision: approve / revise
- Feedback summary:
- Captured at:

### Deploy approval (simulated)

- Approver:
- Approved at:
- Simulation only: **yes**
- Operator note:

### DNS / cutover (simulated)

- In scope: yes / no
- Authorization status: not_required / simulated_authorized / blocked
- Simulation only: **yes**
- Operator note:

### Live validation (simulated)

- Checks:
- Pass / fail:
- Captured at:
- Operator note:

### Acceptance

- Accepted by:
- Accepted at:
- Acceptance measures met: yes / no (list gaps)

### Handover

- Sent at:
- Channels (draft/synthetic ok):
- Support boundary summary:
- What was built:

### Maintenance boundary

- In scope:
- Out of scope:
- Escalation contact:
- Optional maintenance offer: sent / deferred

## Build gate

Confirm before `build_started`:

- [ ] `financially_approved=true`
- [ ] Required client inputs complete
- [ ] `content_assets_ready=true`
- [ ] `approved_access_confirmed=true`
- [ ] No blocked / forbidden inputs
- [ ] Deploy / DNS still separately gated (simulated)

## Cutover gate

Confirm before `live_validation_simulated`:

- [ ] `deploy_approval_simulated=true`
- [ ] If `dns_cutover_in_scope`: `dns_cutover_authorized_simulated=true`
- [ ] No real DNS or client_production action claimed

## Defect triage (if any)

| Defect | blocker / non-blocker / enhancement | Owner | Follow-up issue |
| ------ | ----------------------------------- | ----- | --------------- |

## Explicit non-actions

- No merge-to-production claim from this template alone
- No real DNS / client_production cutover without Anton authorization
- No credentials in this issue, screenshots, or fixtures
- No env/secrets/schema changes in this delivery issue
- No CMS platform or SEO campaign expansion
