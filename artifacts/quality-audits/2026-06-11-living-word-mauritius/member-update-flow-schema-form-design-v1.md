# Living Word — Member Update Flow schema/form design v1

**Date:** 2026-06-26  
**Tenant:** `living-word-mauritius`  
**Mode:** design / schema only — **NO IMPLEMENTATION AUTHORIZED**

**Inputs:**

- [`production-deployment-options-data-residency-decision-v1.md`](./production-deployment-options-data-residency-decision-v1.md) §8A (Member Update Flow v1)
- [`pilot-privacy-consent-notice-draft-v1.md`](./pilot-privacy-consent-notice-draft-v1.md) (board-review draft)
- [`ghl-read-only-sync-probe-v1-live-verification.md`](./ghl-read-only-sync-probe-v1-live-verification.md) (live field manifest, 2026-06-26)

**Hard constraints:** no application code, DB migrations, WordPress/GHL/DNS changes, canonical GHL import, outbound messages, or production customer-facing deploy in this packet.

---

## 1. Executive summary

The live GHL probe returned **642 contacts**, **51 contact custom fields**, **6 forms**, **4 pipelines**, **1 survey**, and **1 calendar** at location `s3s8FXVgfq50uU7HIFSE` (10 read-only API calls, no writes).

**Member Update Flow v1** is a **two-step** hosted form:

1. **Identify** — name + email and/or WhatsApp/mobile → lookup staged record.
2. **Update** — prefilled (if matched) or blank (if unconfirmed) → member confirms/edits allowed fields → submit → raw evidence + operator review (no blind canonical overwrite).

This document defines the **CorpFlow form schema**, **GHL prefill mapping**, and **pilot v1 field allowlist/denylist** derived from the real manifest.

---

## 2. Field manifest review (probe summary)

### 2.1 Probe health

| Item | Value |
|------|-------|
| API calls | 10 / 19 budget |
| Contacts (estimate) | 642 |
| Custom fields (contact) | 51 |
| Forms | 6 |
| Users search | HTTP 422 (non-blocking; metadata only) |
| Writes / outbound | None |

### 2.2 Standard GHL contact fields (prefill shape)

From probe contact sample **field names only** (values redacted). These are the usual LeadConnector contact columns used for identify + prefill:

| GHL field | CorpFlow logical field | Step 1 (identify) | Step 2 (editable) | Notes |
|-----------|------------------------|-------------------|-------------------|-------|
| `firstName` | `first_name` | display hint | yes | Required on submit |
| `lastName` | `last_name` | display hint | yes | Required on submit |
| `email` | `email` | **match key** | yes | Normalised lowercase; primary match |
| `phone` | `phone` | **match key** | yes | Normalise E.164 where possible |
| `address1` | `address_line_1` | — | optional v1 | Street address |
| `city` | `city` | — | optional v1 | |
| `state` | `state` | — | defer | Low priority pilot |
| `postalCode` | `postal_code` | — | defer | |
| `country` | `country` | — | defer | Default Mauritius if shown |
| `tags` | `tags` | — | **no** | Operator/admin only in v1 |
| `source` | — | — | **no** | System metadata |

### 2.3 Custom fields — pilot v1 **IN SCOPE**

Mapped from live manifest (`contact.*` keys). Editable in Step 2 unless noted.

| GHL key | GHL type | CorpFlow field id | Step 2 | Prefill | Notes |
|---------|----------|-------------------|--------|---------|-------|
| `contact.member_type` | SINGLE_OPTIONS | `member_type` | yes | yes | Church directory classification |
| `contact.preferred_communication` | SINGLE_OPTIONS | `preferred_communication` | yes | yes | Admin routing |
| `contact.email_2` | TEXT | `email_secondary` | yes | yes | Optional second email |
| `contact.phone_2` | TEXT | `phone_secondary` | yes | yes | Optional second phone |
| `contact.gender_sex_1` | SINGLE_OPTIONS | `gender` | yes | yes | **Adult pilot only** — no minors |
| `contact.emergency_contact_person_name` | TEXT | `emergency_contact_name` | yes | yes | Adult emergency contact |
| `contact.emergency_contact_phone_number` | TEXT | `emergency_contact_phone` | yes | yes | Adult emergency contact |
| `contact.add_me_to_church_communications_for_updates_and_events` | CHECKBOX | `opt_in_church_comms` | yes | yes | Consent-aligned comms flag |
| `contact.ready_to_serve` | CHECKBOX | `ready_to_serve` | yes | yes | Structured boolean — not free text |
| `contact.i_am_ready_to_serve_on_a_team_s` | CHECKBOX | `ready_to_serve_teams` | yes | yes | Structured boolean |
| `contact.update_type` | RADIO | `update_type` | read-only | yes | System: distinguishes update vs new (prefill only) |

**Identify-only / system (not member-edited in v1):**

| GHL key | Treatment |
|---------|-----------|
| `contact.prefill_url` | System / migration infra — **never** show in form |
| `contact.profile_update_shortlink` | System shortlink — **never** show in form |
| `contact.last_data_qa_date` | Operator QA — read-only hint for reviewer, not member field |
| `contact.approval_status` | Operator workflow — not on member form |

### 2.4 Custom fields — pilot v1 **EXCLUDED**

Per §8A + privacy draft + manifest review:

| GHL key | Reason |
|---------|--------|
| `contact.i_have_a_prayer_request` | Prayer free-text — **excluded** |
| `contact.update_your_profile` | LARGE_TEXT free-text — **excluded** |
| `contact.trinity_kids_status` | Youth/children — **excluded** |
| `contact.trinity_kids_joined` | Youth/children — **excluded** |
| `contact.trinity_kids_team_leader` | Youth/children — **excluded** |
| `contact.business_name` | Business Network — **separate** from pastoral CRM |
| `contact.to_celebrate_we_will_pledge_a_rs_200_donation_on_your_behalf_please_select_a_charity_below` | Donation/financial — **excluded** |
| All `*_leader` TEXT fields (barista, prayer, worship, wordgroups, ushers, tech, bloom, mens ignite, events) | Admin assignment — **operator-only**, not self-serve v1 |
| All `*_joined` / `*_active` team DATE/SINGLE_OPTIONS fields (12+ fields) | Team roster state — **defer** to post-pilot; operator-managed today |
| `contact.i_want_to_join` | Ambiguous intake — **defer** (other forms wait) |
| `contact.how_many_people` | Unclear intent — **defer** |
| `contact.users_group_status` | Internal status — operator-only |

### 2.5 Forms metadata (reference only — not cloned in v1)

Six GHL forms exist (IDs in probe artifact). Member Update Flow v1 is a **new CorpFlow-hosted form**, not a GHL form embed. Form IDs are inventory for Phase 2 mapping only.

---

## 3. CorpFlow form schema (v1)

### 3.1 Form identity

| Property | Value |
|----------|-------|
| `form_id` | `member_update_v1` |
| `tenant_id` | `living-word-mauritius` |
| `locale` | `en` (launch) |
| `source` | `member_update_v1` |
| `consent_version` | TBD — must match board-approved notice (`GATE-PRIVACY`) |

### 3.2 Step 1 — Identify (`member_update.identify.v1`)

**Purpose:** Match an existing staged member without exposing other people's data.

| Field id | Type | Required | Validation |
|----------|------|----------|------------|
| `first_name` | text | yes | 1–80 chars |
| `last_name` | text | yes | 1–80 chars |
| `email` | email | one-of | Normalised lowercase; at least one of `email` or `phone` required |
| `phone` | tel | one-of | E.164 preferred; at least one of `email` or `phone` required |

**Server behaviour:**

- Match priority: email → phone → name+fuzzy+contact key (§8A.4).
- **0 matches** → Step 2 blank form, flag `match_status: unconfirmed`.
- **1 match** → Step 2 prefilled, flag `match_status: matched`, `staged_member_id` internal.
- **2+ matches** → Step 2 minimal fields only, flag `match_status: ambiguous` → operator queue (no auto-merge).

**Anti-enumeration:** Same generic copy whether or not a match exists ("If we find your record, we'll show your current details to confirm").

### 3.3 Step 2 — Update (`member_update.submit.v1`)

| Field id | Type | Required | GHL prefill source |
|----------|------|----------|-------------------|
| `first_name` | text | yes | `firstName` |
| `last_name` | text | yes | `lastName` |
| `email` | email | yes | `email` |
| `phone` | tel | yes | `phone` |
| `email_secondary` | email | no | `contact.email_2` |
| `phone_secondary` | tel | no | `contact.phone_2` |
| `preferred_communication` | select | no | `contact.preferred_communication` |
| `member_type` | select | no | `contact.member_type` |
| `gender` | select | no | `contact.gender_sex_1` |
| `address_line_1` | text | no | `address1` |
| `city` | text | no | `city` |
| `emergency_contact_name` | text | no | `contact.emergency_contact_person_name` |
| `emergency_contact_phone` | tel | no | `contact.emergency_contact_phone_number` |
| `opt_in_church_comms` | checkbox | no | `contact.add_me_to_church_communications_for_updates_and_events` |
| `ready_to_serve` | checkbox | no | `contact.ready_to_serve` |
| `ready_to_serve_teams` | checkbox | no | `contact.i_am_ready_to_serve_on_a_team_s` |
| `consent_acknowledged` | checkbox | **yes** | — | Must match board-approved notice text |
| `update_notes` | — | **absent** | — | **No free-text notes field in v1** |

**Submit metadata (server-added, not user-edited):**

```json
{
  "form_id": "member_update_v1",
  "source": "member_update_v1",
  "match_status": "matched|unconfirmed|ambiguous",
  "submitted_at": "<ISO8601>",
  "consent_version": "<board-approved version>",
  "locale": "en",
  "ghl_location_id": "s3s8FXVgfq50uU7HIFSE",
  "prefill_field_manifest_version": "ghl-probe-2026-06-26"
}
```

### 3.4 Persistence layers (design — implementation packet)

| Layer | Table / event (conceptual) | Content |
|-------|---------------------------|---------|
| Raw evidence | `tenant_form_submissions` | Full JSON payload + idempotency key |
| Staged lookup | `tenant_members` / GHL-staged read model | Prefill source only in pilot — no blind import |
| Workflow | `tenant.member.update.submitted` | Operator review queue |
| Audit | `automation_events` | Count/metadata only — no bodies |

**Conflict rules:** per §8A.7 — no blank overwrites, email collision → operator, GHL vs submitted diff → operator confirms authority.

---

## 4. UI / UX notes (sandbox pilot)

| Element | Spec |
|---------|------|
| Host | CorpFlow sandbox / pilot URL (`living-word-mauritius.corpflowai.com`) — link/QR first |
| Language | English only at launch |
| Steps | Visible step indicator: "Find your record" → "Confirm your details" |
| Prefill | Show current value greyed with "Edit" affordance; empty fields clearly blank |
| Excluded categories | No prayer box, no youth fields, no donation, no team-leader assignment |
| Success | "Thank you — a church administrator will review your update" (no auto-publish claim) |
| Accessibility | Labels, focus order, mobile-first (WhatsApp users) |

---

## 5. Prefill implementation dependency

| Dependency | Status |
|------------|--------|
| GHL probe field manifest | **Complete** (2026-06-26 live verification) |
| GHL → CorpFlow field mapping approval | **Pending** (church + operator sign-off on §3.3 allowlist) |
| Staged member read model | **Not built** — pilot may use probe-time staging or manual seed for 10 adults |
| Board privacy notice (`GATE-PRIVACY`) | **Pending** |
| Pilot volunteer list (`GATE-PILOT`) | **Pending** — Anton identifies 10 adults |

Until mapping is approved, prefill may be limited to **standard contact fields** (name, email, phone) with custom fields added incrementally after church sign-off.

---

## 6. Open questions for church / operator

1. **Confirm allowlist** — Are `gender`, `emergency_contact_*`, and `member_type` approved for self-serve update by adults?
2. **Select options** — GHL SINGLE_OPTIONS/RADIO allowed values are not in the probe manifest; need a **read-only options fetch** or operator-supplied enum JSON before building selects.
3. **Address fields** — Include full address in v1 or defer to v1.1?
4. **Team serving checkboxes** — Keep `ready_to_serve` / `ready_to_serve_teams` in v1 or defer all team fields to post-pilot?

---

## 7. Recommended implementation packet (not authorized here)

**Living Word Member Update Flow v1 — implementation** (separate approval):

- Sandbox form routes + server handlers
- Identify/match service (no GHL writes)
- Prefill adapter from staged GHL read model
- Operator review UI hook
- Preview smoke + 10-person adult pilot under `GATE-PRIVACY` + `GATE-PILOT`

---

## 8. Delivery Reality Audit

```text
Probe manifest reviewed: YES (51 custom fields, 642 contacts)
Schema/form design complete: YES (this document)
Implementation authorized: NO
Secrets in document: NO
Real member data in document: NO
Final verdict: COMPLETE (design scope)
```
