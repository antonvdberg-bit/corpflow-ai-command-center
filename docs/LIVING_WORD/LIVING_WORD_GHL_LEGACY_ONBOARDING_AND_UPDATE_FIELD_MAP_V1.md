# Living Word — legacy GHL onboarding + update field map (v1)

**Status:** Docs-only reference. **No runtime, no deploy, no env/secrets, no DB/schema, no GHL writes, no SMS/email/WhatsApp sends.**
**Tenant:** `living-word-mauritius` only.
**Created:** 2026-07-01 (operator-supplied GHL screenshots + field list, 2026-06-30).
**Purpose:** Record what the **old GHL system** did so the Tuesday demo and future CorpFlow Member Update Flow stay aligned — without cloning GHL wholesale.
**Anchor sentinel:** `<!-- LIVING_WORD_GHL_LEGACY_FIELD_MAP_V1 -->`

<!-- LIVING_WORD_GHL_LEGACY_FIELD_MAP_V1 -->

## 0. Two GHL phases (do not conflate)

| Phase | GHL artefact | CorpFlow Tuesday posture |
|---|---|---|
| **Phase 1 — Initial onboarding** | Short form: First name, Last name, **Member type** (Permanent / Visitor / Online) | **Narrate only** — not rebuilt for Tuesday; new members use a separate intake path later |
| **Phase 2 — Profile verification / member update** | Survey *Profile Verification* → staged workflow updates contact fields | **Demo shape** — CorpFlow Member Update Flow v1 (PR #482), admin-gated, **synthetic data**, operator review |

Tuesday proves **Phase 2 shape** on the CorpFlow sandbox, not a live GHL cutover.

---

## 1. Legacy GHL initial onboarding form (Phase 1)

**Source:** operator screenshot (2026-06-30) — GHL-hosted onboarding form with Living Word Church branding.

| Field | Type | Options / notes |
|---|---|---|
| Last name | Text | Required |
| First name | Text | Required |
| Member type | Select | **Permanent** · **Visitor** · **Online** |

**CorpFlow mapping (future, not Tuesday):** `member_type` in the Member Update allowlist already supports church directory classification (`contact.member_type`). A dedicated *new-member onboarding* form is a **later packet** — do not merge Phase 1 and Phase 2 for Tuesday.

---

## 2. Legacy GHL update workflow (Phase 2)

**Source:** operator screenshots (2026-06-30) — GHL automation triggered by survey submission.

```text
Survey Submitted (Profile Verification)
    → Update contact field — Action 1: Personal Info
    → Wait
    → Update contact field — Action 2: Contact & Location
    → Wait
    → Update contact field — Action 3: Team Active (Y/N)
    → Wait
    → Update contact field — Last Data QA Date
    → Add Tag
    → SMS
    → END
```

### 2.1 CorpFlow equivalent (Tuesday — manual narration)

| GHL step | CorpFlow Tuesday | Automated later? |
|---|---|---|
| Survey submitted | Member submits CorpFlow form (synthetic demo) | Yes (after DB gate) |
| Action 1: Personal Info | Step 2 fields: name, email, phone, member_type, gender, etc. | Operator review first |
| Action 2: Contact & Location | address_line_1, city (+ deferred state/postal/country) | Same |
| Action 3: Team Active (Y/N) | `ready_to_serve`, `ready_to_serve_teams`, `opt_in_church_comms` checkboxes | Same |
| Last Data QA Date | Operator sets on approval (system field — not on member form) | Internal automation |
| Add Tag | Operator action / workflow registry | Internal only |
| **SMS** | **NOT in Tuesday demo** — hard gate; no outbound send runtime | Separate Anton approval |

**Discipline:** CorpFlow v1 uses **operator review** (`canonical_write: false`) instead of blind GHL field writes. No SMS, no tag automation, no GHL API calls until separately authorised.

---

## 3. Operator-supplied field inventory (2026-06-30)

Mapped against `member-update-flow-schema-form-design-v1.md` (probe manifest). **Tuesday column** = show in demo / in CorpFlow v1 allowlist / excluded / later.

### 3.1 Custom fields (Form | Membership)

| GHL merge tag | Label | Type | Tuesday / v1 |
|---|---|---|---|
| `{{contact.i_want_to_join}}` | I want to join | Checkbox | **Later** — ambiguous intake; other forms wait |
| `{{contact.i_am_ready_to_serve_on_a_team_s}}` | I am ready to serve on a team(s) | Checkbox | **Tuesday (demo)** — `ready_to_serve_teams` in allowlist |
| `{{contact.i_have_a_prayer_request}}` | I have a prayer request | Single line | **Excluded** — free-text pastoral; chatbot shows disclaimer only |
| `{{contact.add_me_to_church_communications_for_updates_and_events}}` | Add me to church communications… | Checkbox | **Tuesday (demo)** — `opt_in_church_comms` |
| `{{contact.to_celebrate_we_will_pledge_a_rs_200_donation_on_your_behalf_please_select_a_charity_below}}` | Donation pledge / charity | Checkbox | **Excluded** — financial |

### 3.2 Standard fields — General Info (Phase 2: Contact & Location)

| GHL merge tag | Label | Tuesday / v1 |
|---|---|---|
| `{{contact.company_name}}` | Business name | **Excluded** — Business Network separate from pastoral CRM |
| `{{contact.address1}}` | Street address | **Tuesday (demo)** — `address_line_1` |
| `{{contact.city}}` | City | **Tuesday (demo)** — `city` |
| `{{contact.country}}` | Country | **Later** — defer in v1 schema |
| `{{contact.state}}` | State | **Later** |
| `{{contact.postal_code}}` | Postal code | **Later** |
| `{{contact.website}}` | Website | **Later** |
| `{{contact.timezone}}` | Timezone | **Later** — system/metadata |

### 3.3 Standard fields — Contact (Phase 2: Personal Info)

| GHL merge tag | Label | Tuesday / v1 |
|---|---|---|
| `{{contact.first_name}}` | First name | **Tuesday (demo)** — required; Step 1 identify + Step 2 |
| `{{contact.last_name}}` | Last name | **Tuesday (demo)** — required |
| `{{contact.email}}` | Email | **Tuesday (demo)** — match key |
| `{{contact.phone}}` | Phone | **Tuesday (demo)** — match key |
| `{{contact.date_of_birth}}` | Date of birth | **Later** — adult pilot only; not in v1 allowlist yet |
| `{{contact.source}}` | Contact source | **System** — not member-edited |
| `{{contact.type}}` | Contact type | **System** — not member-edited |

### 3.4 GHL Action 1 / 2 / 3 grouping (for demo narrative)

| GHL workflow action | Fields from operator list | CorpFlow Step 2 fields |
|---|---|---|
| **Action 1: Personal Info** | first_name, last_name, email, phone, member_type (from Phase 1 or prefill) | Same + gender, email_secondary, phone_secondary, preferred_communication |
| **Action 2: Contact & Location** | address1, city (+ country/state/postal later) | address_line_1, city |
| **Action 3: Team Active (Y/N)** | i_am_ready_to_serve_on_a_team_s, add_me_to_church_comms, i_want_to_join (deferred) | ready_to_serve_teams, opt_in_church_comms, ready_to_serve |

---

## 4. Tuesday demo — what to say about excluded fields

When the church asks about fields they remember from GHL:

| They ask about | Demo answer |
|---|---|
| Prayer request (free text) | "Captured through the chatbot pastoral path with a safety disclaimer — not stored as free text in the member-update form." |
| Donation / charity pledge | "Out of scope for the data-quality pilot — separate financial workflow." |
| I want to join | "New-member onboarding is Phase 1 — we'll wire that after the update flow is trusted." |
| SMS after submit | "We do not send automated SMS in the pilot — operator follows up manually until messaging is approved." |
| Business name | "Business Network is a separate track from pastoral member records." |

---

## 5. Cross-references

- `artifacts/quality-audits/2026-06-11-living-word-mauritius/member-update-flow-schema-form-design-v1.md` — canonical allowlist/denylist (probe-derived).
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/member-update-flow-v1-sandbox-implementation-packet.md` — PR #482 build + gates.
- `docs/LIVING_WORD/LIVING_WORD_TUESDAY_DEMO_READINESS_V1.md` — Tuesday plan + board.
- `docs/LIVING_WORD/LIVING_WORD_TUESDAY_DEMO_SCRIPT_V1.md` — click-path script.

---

## 6. Status block

- **Delivery state:** Docs-only reference; no implementation authorised by this doc alone.
- **Verdict:** COMPLETE (docs-only shape) once merged.
