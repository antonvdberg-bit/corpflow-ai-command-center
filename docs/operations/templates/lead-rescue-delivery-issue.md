# Lead Rescue delivery — bounded issue template

**Copy into a GitHub issue (or CMP ticket summary) when onboarding is complete and build may start.**
**Canonical:** `docs/operations/LEAD_RESCUE_ONBOARDING_AND_DELIVERY_V1.md`
**Issue programme:** #715 / #711

---

## Title

`Lead Rescue delivery — {business_display_name} — {synthetic|pilot}`

## Metadata

| Field | Value |
| ----- | ----- |
| Product | `ai-lead-rescue` |
| Client label | (display name only — no secrets) |
| `financially_approved` | true / false |
| Financial approval ref | (pointer only) |
| Primary leaky source | |
| Delivery state | `approved_to_onboard` → … → `acceptance_ready` |
| Messaging runtime authorized | **false** (default) |
| Real client sends allowed | **false** |
| Parent programme | #711 |
| WS4 lane | #715 |

## Scope (bounded)

In scope for this delivery issue:

- [ ] Connect **one** primary leaky source
- [ ] Lead log + stages + escalation as onboarded
- [ ] Preview / verification / client review / acceptance / handover evidence
- [ ] Support boundary documented

Out of scope (open a separate issue if needed):

- [ ] Messaging runtime / automated sends
- [ ] Second lead source / CRM migration
- [ ] Website Rescue / DNS / client_production deploy
- [ ] Prospect UI / Kanban redesign (#721)
- [ ] Proposal / payment machinery (#714)

## Intake summary (redacted)

- Enquiry sources: …
- Current process: …
- Operators: …
- Stages: …
- Escalation: …
- Approved response rules: …
- Test scenarios: …
- Reporting: …
- Review cadence: …

## State checklist

- [ ] `approved_to_onboard`
- [ ] `onboarding_in_progress`
- [ ] `onboarding_blocked` *(if required inputs blocked — do not build)*
- [ ] `onboarding_complete`
- [ ] `build_blocked` *(gate failed — financial approval or inputs)*
- [ ] `build_started` *(only if build gate passed)*
- [ ] `preview_evidence`
- [ ] `verification_evidence`
- [ ] `client_review`
- [ ] `accepted`
- [ ] `handover_complete`
- [ ] `acceptance_ready`

## Evidence packets

### Preview

- Artefact / URL:
- Captured at:
- Operator note:

### Verification

- Test scenario ids:
- Pass / fail:
- Captured at:
- Operator note:

### Client review

- Reviewer:
- Reviewed at:
- Decision: approve / revise
- Feedback summary:

### Acceptance

- Accepted by:
- Accepted at:
- Acceptance measures met: yes / no (list gaps)

### Handover

- Sent at:
- Channels (draft/synthetic ok):
- Support boundary summary:
- Monitoring window:

### Support boundary

- In scope:
- Out of scope:
- Escalation contact:
- Review cadence:

## Build gate

Confirm before `build_started`:

- [ ] `financially_approved=true`
- [ ] Required client inputs complete
- [ ] No blocked inputs
- [ ] Messaging runtime still separately gated

## Defect triage (if any)

| Defect | blocker / non-blocker / enhancement | Owner | Follow-up issue |
| ------ | ----------------------------------- | ----- | --------------- |

## Explicit non-actions

- No merge-to-production claim from this template alone
- No real WhatsApp/email/SMS without messaging-runtime gate
- No env/secrets/schema changes in this delivery issue
