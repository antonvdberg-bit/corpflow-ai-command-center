# Website Rescue — onboarding intake (operator fill)

**Use:** After `financially_approved=true`, before build start.
**Canonical:** `docs/operations/WEBSITE_RESCUE_ONBOARDING_AND_DELIVERY_V1.md`
**Machine fields:** `config/website-rescue-onboarding-delivery.v1.json`
**Issue:** #716

> Do **not** collect passwords, OTPs, DNS/hosting/registrar passwords, SSH/API keys, card numbers, bank account numbers, government ID, or health data.
> Credentials go only through **approved secret channels**. Record `approved_access_confirmed=true` — never paste secrets here.

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

## Website Rescue–specific intake

| Field id | Value |
| -------- | ----- |
| `business_display_name` | |
| `primary_contact_name` | |
| `working_email` | |
| `working_phone` | |
| `case_type` (`upgrade` / `rebuild` / `one_page` / `small_catalogue`) | |
| `tier` (`T1` / `T2` / `T3`) | |
| `current_site_url` | |
| `domain_hostname` | |
| `hosting_facts_summary` (no passwords) | |
| `brand_assets_status` (`provided` / `wordmark_ok` / `stock_direction`) | |
| `pages_in_scope` (ordered list) | |
| `services_or_products_summary` | |
| `content_ownership` | |
| `enquiry_destination` (no secrets) | |
| `design_preferences` | |
| `revision_authority` | |
| `named_approver` | |
| `review_cadence` | |
| `maintenance_boundary` | |

### Gate flags (booleans on the delivery record)

- [ ] `content_assets_ready=true` — content and brand assets cleared for build
- [ ] `approved_access_confirmed=true` — access path confirmed via approved secret channel (no secrets recorded here)
- [ ] `dns_cutover_in_scope` — yes / no (only if quoted)
- [ ] `deploy_approval_simulated` — leave false until simulated approval step
- [ ] `dns_cutover_authorized_simulated` — leave false until simulated DNS gate (only if in scope)

### Client responsibilities (confirm or edit)

- [ ] Provide brand assets or written wordmark/stock direction before the build clock starts
- [ ] Name one production approver who consolidates revision feedback
- [ ] Confirm enquiry destination that the owner monitors
- [ ] Provide preview feedback within the agreed review cadence
- [ ] Escalate access or content blockers within one business day
- [ ] Never send passwords/OTPs/registrar credentials in chat, tickets, or screenshots

### Exclusions (confirm)

- [ ] No CMS platform / unbounded redesign
- [ ] No SEO / traffic / revenue guarantees
- [ ] No paid design tooling as a delivery dependency
- [ ] No credentials in issues/docs/fixtures/screenshots
- [ ] No real DNS or client_production cutover without separate Anton authorization
- [ ] No Lead Rescue messaging runtime (separate workstream)
- [ ] No e-commerce / booking / member portals in this rescue lane

### Acceptance measures (confirm)

- [ ] Quoted pages on managed preview with one primary buyer-action CTA
- [ ] Mobile layout pass (no horizontal scroll on agreed width)
- [ ] Enquiry path tested to agreed destination
- [ ] Named approver accepted preview (or documented revision closure)
- [ ] Deploy and DNS/cutover remain simulated-only unless Anton opens protected gates
- [ ] Handover note with maintenance boundary delivered

---

## Blockers

| Blocked input | Owner | Due | Notes |
| ------------- | ----- | --- | ----- |
| | | | |

If any row is open → delivery state `onboarding_blocked`; **build must not start**.

Typical blockers: `content_assets_pending`, `approved_access_pending`, `named_approver_unavailable`.

---

## Gate result (operator)

- [ ] Intake complete (all required fields)
- [ ] No blocked / forbidden inputs
- [ ] `content_assets_ready=true`
- [ ] `approved_access_confirmed=true`
- [ ] `canStartBuild` would pass
- [ ] Deploy / DNS remain **simulated** unless Anton gate opened

**Operator / date:** _______________________
