# Lead Rescue — onboarding intake (operator fill)

**Use:** After `financially_approved=true`, before build start.
**Canonical:** `docs/operations/LEAD_RESCUE_ONBOARDING_AND_DELIVERY_V1.md`
**Machine fields:** `config/lead-rescue-onboarding-delivery.v1.json`
**Issue:** #715

> Do **not** collect passwords, OTPs, card numbers, bank account numbers, government ID, full CRM exports, or health data.

---

## Shared checklist

- [ ] `shared.business_identity` — Business identity confirmed
- [ ] `shared.primary_contact` — Primary contact + working channels confirmed
- [ ] `shared.financial_approval` — `financially_approved=true` recorded (ref only; no bank detail)
- [ ] `shared.named_approver` — Named client approver for acceptance
- [ ] `shared.client_responsibilities_ack` — Client responsibilities acknowledged
- [ ] `shared.exclusions_ack` — Exclusions acknowledged
- [ ] `shared.acceptance_measures` — Acceptance measures agreed
- [ ] `shared.review_cadence` — Review cadence agreed

**Financial approval ref (pointer only):** ________________________________

---

## Lead Rescue–specific intake

| Field id | Value |
| -------- | ----- |
| `business_display_name` | |
| `primary_contact_name` | |
| `working_whatsapp` | |
| `working_email` | |
| `timezone` | |
| `enquiry_sources` (list all) | |
| `primary_leaky_source` (one; must appear above) | |
| `current_process_summary` | |
| `users_operators` (named) | |
| `lead_stages` (≥3) | new / replied / followed-up / … |
| `escalation_rules` | |
| `approved_response_rules` | |
| `test_scenarios` | |
| `reporting_requirements` | |
| `named_approver` | |
| `review_cadence` | |

### Client responsibilities (confirm or edit)

- [ ] Provide one named leaky enquiry source and keep it available during the pilot window
- [ ] Name one working WhatsApp and one working email that the owner monitors
- [ ] Reply to customers — CorpFlow surfaces; does not auto-reply as the business
- [ ] Feedback on preview/verification within agreed review cadence
- [ ] Escalate blockers within one business day

### Exclusions (confirm)

- [ ] No messaging runtime without separate authorisation
- [ ] No second lead source during 48-hour setup
- [ ] No revenue / lead-volume guarantees
- [ ] No full CRM migration / historical import
- [ ] No secrets in chat or tickets
- [ ] No client_production deploy / DNS in wedge pilot

### Acceptance measures (confirm)

- [ ] One source connected + marked test enquiry in lead log
- [ ] Operator alert verified on test enquiry
- [ ] Buyer can receive agreed daily summary channel(s)
- [ ] Stages + escalation usable on pilot board
- [ ] Handover note with support boundary + monitoring window

---

## Blockers

| Blocked input | Owner | Due | Notes |
| ------------- | ----- | --- | ----- |
| | | | |

If any row is open → delivery state `onboarding_blocked`; **build must not start**.

---

## Gate result (operator)

- [ ] Intake complete (all required fields)
- [ ] No blocked / forbidden inputs
- [ ] `canStartBuild` would pass
- [ ] Messaging runtime remains **unauthorized** unless Anton gate opened

**Operator / date:** _______________________
