# Living Word — Production deployment options + data residency decision (v1)

**Date:** 2026-06-24 (updated 2026-06-26)  
**Tenant:** `living-word-mauritius`  
**Mode:** architecture / design / governance only — **no code, no DB, no external changes**

**Purpose:** Record Anton’s latest answers and recommend a **low-friction launch path** that does **not** depend on WordPress admin access, while keeping CorpFlow as the intended successor to GHL — with explicit gates for privacy, data location, pilot scope, and church approval.

**Update log:**

- **2026-06-26** — Anton confirmed: he will identify the 10-person pilot group; pilot is **adult volunteers only**; **youth/children** and **prayer/counselling free-text** excluded from pilot v1; participants **explicitly consent**; **privacy/data-protection notice is unknown** → CorpFlow drafts one (see [`pilot-privacy-consent-notice-draft-v1.md`](./pilot-privacy-consent-notice-draft-v1.md)) for **church board** approval; English-only launch with **Afrikaans / Kreol / French** to follow as quickly as practical; **first priority form = member information collection/update** via a **two-step Member Update Flow** (§8A); other forms wait until that flow is tested and production-ready.

**Hard constraints (this packet):** no application code, schema, WordPress, GHL, DNS, chatbot state, forms implementation, production embed, secrets, outbound messages, Luxe, or multi-tenant operator switching changes.

**Related artefacts:**

- [`ghl-to-corpflow-migration-intake-workflow-design-v1.md`](./ghl-to-corpflow-migration-intake-workflow-design-v1.md)
- [`ghl-api-data-inventory-sync-design-v1.md`](./ghl-api-data-inventory-sync-design-v1.md)
- [`ghl-read-only-sync-probe-v1-packet.md`](./ghl-read-only-sync-probe-v1-packet.md)
- [`public-website-knowledge-intake-design.md`](./public-website-knowledge-intake-design.md)
- [`provider-handoff.md`](./provider-handoff.md)

---

## Executive summary

| Topic | Decision direction (v1) |
|-------|-------------------------|
| **Who controls WordPress** | **Brad** (church member/hoster) — Anton has **no WP admin** today and should **not** need it for first pilot |
| **Who controls GHL** | **Anton** (admin-side, separate capacity) — GHL LeadConnector **still live** on public site |
| **Hosting move** | WordPress recently moved **off GHL hosting** to separate WordPress hosting; GHL widget/forms layer **not yet replaced** |
| **Launch intake path** | **Branded CorpFlow-hosted URL + QR/link first** — not WordPress embed |
| **WordPress embed** | **Optional** hidden test page **only if Brad confirms** technical capability; **public embed** only after pastor/church approval |
| **GHL cutover** | **After** CorpFlow sandbox proof + pilot + mapping — not before |
| **System of record** | **CorpFlow acceptable in principle** — subject to **Mauritius privacy / data-location** check |
| **Pilot group** | **Anton identifies** the ~**10 adult volunteers**; explicit consent; **no prayer/counselling bodies**; **no child/youth PII** in pilot v1 |
| **First form** | **Member information collection/update** — a **two-step Member Update Flow** (§8A); other forms wait until it is tested + production-ready |
| **Privacy notice** | **Unknown / likely missing** → CorpFlow drafts a plain-English notice for **church board** approval (see `pilot-privacy-consent-notice-draft-v1.md`) |
| **Language** | **English launch**; **Afrikaans / Kreol / French** as quickly as practical after launch via approved atoms — **no uncontrolled AI translation** |
| **Business Network** | **Separate** from pastoral/member CRM for now |

---

## 1. Stakeholder and control map (Anton’s updates)

| Actor | Role | Control today | Implication for CorpFlow |
|-------|------|---------------|---------------------------|
| **Anton** | CorpFlow operator; GHL admin (separate capacity) | GHL account; CorpFlow factory; sandbox | Can run GHL probe/sync design; **cannot** change live WordPress without Brad |
| **Brad** | WordPress hoster / church member | Real site hosting & WP (access unknown to Anton) | **Must be asked** before any embed, custom JS, iframe, or external link placement |
| **Pastor / church group** | Governance / pastoral approval | Public cutover sign-off | Anton obtains approval before apex embed or GHL removal |
| **CorpFlow** | Intended successor operating layer | Sandbox on `living-word-mauritius.corpflowai.com` | Prove on sandbox + pilot URL before public cutover |

**Principle:** CorpFlow delivery must not **block** on WordPress admin unless embed is explicitly chosen. **Link/QR-first** respects Brad boundary and speeds pilot.

---

## 2. Public observation (read-only, 2026-06-19 baseline + context)

### 2.1 Main public site (`livingwordmauritius.com` / `www`)

Public navigation and content areas observed in prior audits include:

| Public section / intent | CorpFlow sandbox parity (reference) |
|-------------------------|-------------------------------------|
| Events | Schedule atoms / `tenant_schedule_entries` (partial seed) |
| WordGroups | Chatbot path + future member interests |
| Volunteer | Chatbot path + future intake |
| Children’s Church | Chatbot youth path — **high-risk data; defer PII in pilot** |
| Youth | Same |
| Prayer request | Chatbot path — **sensitive free-text; exclude from pilot** |
| Contact Us | Chatbot + future hosted form |
| Public contact details | Knowledge atoms (Grand Baie, phone, email) |

**Live chat/intake:** GHL **LeadConnector** still present (not CorpFlow embed).

**CMS:** WordPress + Elementor + Formidable + Modern Events Calendar (prior scans). Site **no longer on GHL hosting** but still **uses GHL widget**.

### 2.2 Business Network (`network.livingwordmauritius.com`)

| Observed | Treatment |
|----------|-----------|
| Login / Register, directory listings | **Separate product surface** — not pastoral member CRM v1 |
| Privacy-policy **agreement label** on registration | **Actual policy text not confirmed** from public fetch — treat as **unknown** |
| CorpFlow chat embed | **Not required** on network site in v1 |

**Recommendation:** Route “Business Network enquiry” through **neutral church contact workflow** only; do not merge network directory accounts into `tenant_members` without a separate design packet.

---

## 3. Revised recommended launch path

Phased path that **minimizes WordPress dependency** and **maximizes sandbox proof**:

```text
Phase A — Sandbox proof (current → near term)
  CorpFlow sandbox: site-preview, chatbot v4, AI retrieval, workflows, knowledge atoms
  Audience: Anton + church reviewers (URL share, not public apex)

Phase B — Branded CorpFlow-hosted pilot (recommended first production intake)
  Hosted pages on tenant host, e.g.:
    https://living-word-mauritius.corpflowai.com/forms/contact
    https://living-word-mauritius.corpflowai.com/forms/visitor
  Distribution: QR codes, email, WhatsApp link, printed bulletin — NOT WordPress embed
  Data: ~10 adult pilot participants, explicit consent, no sensitive bodies

Phase C — Optional WordPress hidden test (Brad-dependent)
  ONLY if Brad confirms: custom HTML/JS, iframe, or external link in footer/menu
  Single non-indexed test page — no public menu prominence
  No GHL removal yet

Phase D — Public cutover (pastor/church approval)
  Anton obtains written/recorded approval from pastor/church group
  Options (in order of preference after pilot):
    1. Prominent links/QR on WordPress to CorpFlow-hosted forms/chat (lowest Brad risk)
    2. Footer script embed (Brad + CSP check)
    3. Replace GHL LeadConnector script (coordinated disable)

Phase E — GHL reduction / removal
  After: member layer live, GHL field mapping complete, operator daily use proven
  GHL read-only inventory → staging → mapping report → selective migration
  Retire LeadConnector + duplicate forms — not before Phase D stable
```

| Step | Requires WP admin? | Requires GHL change? | Requires church approval? |
|------|-------------------|----------------------|-------------------------|
| Sandbox proof | No | No | Informal review |
| CorpFlow-hosted pilot URL + QR | No | No | Pilot consent + pastoral awareness |
| Hidden WP test page | **Yes (Brad)** | No | Yes |
| Public WP link/QR prominence | **Yes (Brad)** | No | **Yes (pastor/group)** |
| GHL widget removal | Maybe (script in theme) | **Yes** | **Yes** |

---

## 4. Brad / WordPress hoster — question list

Send to Brad (Anton or church liaison). **Do not assume answers.**

### 4.1 Access and process

1. Who has **WordPress admin** today? Can Anton get **editor** or **custom-code** access without full admin if needed later?
2. What is the preferred channel for **one-off placement** requests (footer link, hidden page, QR landing)?
3. Is there a **staging** WordPress environment, or only production?

### 4.2 Technical capability (critical for embed path)

4. Can you add **external HTTPS links** in menus, buttons, or page content without developer help?
5. Can you add **custom HTML / JavaScript** (e.g. Elementor Custom Code, child theme footer)?
6. Are **iframes** to external domains allowed by theme/security policy?
7. Is there a **Content Security Policy** or security plugin that blocks third-party scripts?
8. Can you create a **hidden / noindex** test page not linked from main navigation?
9. Who would **remove** the existing GHL LeadConnector script when church approves cutover?

### 4.3 Hosting and data (do not assume DB suitability)

10. Where is WordPress hosted (provider, country/region)?
11. Is there a **MySQL/MariaDB** database included? Who administers backups?
12. Would Brad/hosting allow **external application databases** (CorpFlow Postgres) to be the CRM — i.e. WordPress remains **marketing only**?
13. Are there **contractual or church-policy** restrictions on storing member data outside Mauritius?

### 4.4 Business Network site

14. Is `network.livingwordmauritius.com` on the **same** WordPress install or separate?
15. Who controls registration data for the Business Network directory?

---

## 5. Pastor / church governance — question list

For Anton to raise with pastor/church leadership **before public cutover**.

### 5.1 Authority and communication

1. Who approves replacing **GHL chat/forms** with CorpFlow as the church’s intake layer?
2. Is **CorpFlow as system of record** for member/contact data acceptable to church leadership?
3. Who is the **data protection contact** for the church (may differ from IT)?

### 5.2 Pilot scope

4. Is a **~10-person adult pilot** acceptable to validate workflows before wider rollout?
5. Can pilot participants give **explicit consent** (written or digital checkbox with recorded basis)?
6. Are **prayer request** and **counselling** intakes excluded from pilot until safeguarding review?

### 5.3 Sensitive categories

7. Policy on **children/youth personal data** — defer until safeguarding + DPA posture clear?
8. Who reviews **prayer/counselling** submissions in operations (named roles)?
9. Is **manual outbound only** (no auto SMS/email to members) acceptable for v1?

### 5.4 Public-facing change

10. Approval required before: **QR/links on bulletin**, **website menu links**, **GHL widget removal**?
11. Is **English-only** launch acceptable; multilingual later with church-approved content?

### 5.5 Business Network boundary

12. Confirm Business Network directory data is **separate** from pastoral member care for v1?

---

## 6. Data-location options

CorpFlow as system of record is **acceptable in principle** — **Mauritius privacy and data-location must be verified** before pilot stores real member PII.

| Option | Description | Pros | Cons | v1 recommendation |
|--------|-------------|------|------|-------------------|
| **A. CorpFlow Postgres (Neon via Vercel)** | Current production pattern — tenant-scoped rows in Neon (`us-east-1` typical per `POSTGRES_PROVIDER.md`) | Already built; factory ops; backups via Neon; tenant isolation proven | **US/EU region** — may conflict with Mauritius expectations; subprocessors (Vercel, Groq for AI) | **Default for sandbox + pilot** until legal/privacy sign-off; document subprocessors |
| **B. Mauritius-hosted managed Postgres** | Dedicated Postgres in MU or nearest approved region (operator-chosen vendor) | Strongest **data-location story** for church | New infra packet; migration; CorpFlow deploy target may still be Vercel | **Evaluate** if church/DPA requires MU residency — not implemented |
| **C. Mauritius VPS (self-managed Postgres)** | Postgres on MU VPS (e.g. existing `corpflow-exec-01` pattern — **separate authorization**) | Local control | Ops burden; not current LWM app path | **Defer** — only if B unavailable and legal mandates local |
| **D. Brad / WordPress-hosted database** | Store member data in WP MySQL via plugin/custom tables | Brad already hosts site | **Not recommended without verification** — see §7; plugin security; no tenant isolation; backup/DR unclear | **Do not assume** suitable for system of record |
| **E. Hybrid** | Public marketing on WordPress; **PII only in CorpFlow**; WP forms retired or link-out only | Clean boundary; matches link-first launch | Two systems during transition | **Recommended architecture** during Phases B–D |
| **F. Temporary GHL** | Keep GHL CRM during pilot; CorpFlow parallel | No migration pressure | Dual truth; continued subscription; Anton admin burden | **Coexist** until Phase E; use GHL probe for mapping only |

**Subprocessors to disclose (starter — expand in church-facing summary):**

| Vendor | Role | Region (typical) |
|--------|------|------------------|
| Vercel | App hosting | Per project settings |
| Neon | Postgres | e.g. `us-east-1` — **confirm project region** |
| Groq | Retrieval AI (optional) | US — **pilot may disable AI** |
| GoHighLevel | Legacy CRM (transitional) | Vendor cloud |

**Action:** Church-facing **one-page data residency summary** (non-legal) after Anton confirms acceptable option with pastor — not this packet.

---

## 7. Recommendation — do not assume Brad’s WordPress DB is suitable

Until Brad answers §4.3 and a technical review is done:

| Assumption | Verdict |
|------------|---------|
| “WordPress hosting includes a database we can use for members” | **Unverified — do not plan on it** |
| WordPress MySQL as primary member store | **Reject for v1** without security, backup, access control, and church approval |
| CorpFlow Postgres as member store | **Preferred** — aligns with tenant isolation, audit trail, workflow spine |
| Formidable / WP form plugins writing to WP DB | **Legacy** — replace with CorpFlow-hosted intake over time |

**Minimum verification if Brad offers WP DB** (future packet, not now):

- Backup frequency and restore test
- Who has phpMyAdmin/admin access
- Plugin update policy
- MU data residency of backup storage
- GDPR-style erasure/export feasibility

**Default:** **Option E (hybrid)** — WordPress = public brochure + links; **CorpFlow Postgres = PII system of record**.

---

## 8. Pilot recommendation (~10 people)

| Rule | Detail |
|------|--------|
| **Size** | ~10 participants — enough to test workflow, not a bulk migration |
| **Who picks the group** | **Anton identifies** the pilot participants (no self-serve public sign-up in pilot v1) |
| **Population** | **Adult volunteers only** — no minors in pilot v1 |
| **Consent** | **Explicit** opt-in before any data is stored; consent text approved by **church board**; `consent_basis` + timestamp recorded (design) |
| **First form** | **Member Update Flow v1** (§8A) — verify/update existing member contact details |
| **Channels** | CorpFlow-hosted form/chat URL + QR — **no** WordPress embed required |
| **Excluded fields** | Prayer/counselling **free-text bodies**; crisis detail; **child/youth** names, ages, schools; **medical / legal / financial** details |
| **Excluded paths** | Youth/children intake paths may show **info + redirect to contact church** only in pilot |
| **AI** | Off for pilot by default; if on, retrieval from **approved English atoms only** |
| **Outbound** | **Manual** operator follow-up — no auto email/SMS |
| **GHL** | **Unchanged** on public site during pilot |
| **Success criteria** | Member Update submission → operator review workflow → resolved without incident; pilot volunteers + church board satisfied |

---

## 8A. Member Update Flow v1 — First Production Candidate

**Decision (Anton, 2026-06-26):** the **first** production form is **member information collection/update**, not net-new lead intake. It is the only intake built and tested in pilot v1; **all other forms wait** until this flow is production-ready.

### 8A.1 Goal

Let an existing church member **verify and correct their own contact details** in two simple steps, writing a reviewable update into the CorpFlow member layer — reducing manual admin load on volunteers.

### 8A.2 Two-step flow (design)

```text
Step 1 — Identify
  Person enters: full name + (email and/or WhatsApp/mobile)
  → look up existing record (CorpFlow-staged GHL data and/or tenant_members)

Step 2 — Confirm / update
  → if matched:   return a PREFILLED update form (current details shown)
     if no match: return a BLANK update form (treated as "new/unconfirmed")
  → person confirms or edits: name, email, WhatsApp/mobile, preferred contact method,
     and church-admin contact fields in scope (no sensitive categories)
  → submit:
       1. write RAW submission evidence (immutable)
       2. UPSERT canonical member/contact (no blind overwrite — see conflict handling)
       3. create OPERATOR REVIEW workflow step (human confirms before canonical trust)
```

### 8A.3 Dependency on GHL read-only probe

This flow’s **prefill** quality depends on the **GHL read-only probe field manifest** (`ghl-read-only-sync-probe-v1-*`):

- The probe’s **custom-field manifest** + **contact field shape** define which fields are safe and useful to prefill.
- **No canonical import** happens because of the probe — prefill in pilot may start from **manually staged** records or a later read-only sync; the mapping report (Phase 2) governs which GHL fields map to which CorpFlow fields.
- Until mapping is approved, prefill can be **limited to fields the member themselves provides/confirms**, with GHL data used only as a lookup hint.

### 8A.4 Matching strategy (identify step)

| Priority | Match key | Notes |
|----------|-----------|-------|
| 1 | Normalised **email** (lowercase, trimmed) | Primary |
| 2 | **WhatsApp/mobile** in E.164 | Secondary |
| 3 | **Name** (fuzzy) + one contact key | Tie-breaker only — never name alone |
| — | No confident match | Treat as **unconfirmed**; blank form; operator decides if new member |

Ambiguous/multiple matches → **do not auto-merge**; present minimal confirmation and flag for operator.

### 8A.5 Data shape (pilot v1 — in scope)

| Field | Purpose |
|-------|---------|
| First name / surname | Identity |
| Email | Contact + match key |
| WhatsApp / mobile | Contact + match key |
| Preferred contact method | Admin routing |
| Member/contact admin fields agreed with church | Directory upkeep |
| Update confirmation metadata (timestamp, consent, source = `member_update_v1`) | Audit |

**Explicitly excluded in pilot v1:** child/youth personal data; prayer/counselling free-text; medical/legal/financial details.

### 8A.6 Persistence + review (design — not implemented here)

| Layer | Behaviour |
|-------|-----------|
| Raw evidence | Immutable `tenant_form_submissions`-style row (full submitted payload) |
| Canonical | `tenant_members` upsert — **never** null a populated field with a blank; newer CorpFlow edits not overwritten |
| Workflow | `tenant.member.update.submitted` → operator review step before canonical record is trusted/published |
| Audit | `automation_events` count-level entry; no sensitive bodies |

### 8A.7 Conflict handling

| Case | Handling |
|------|----------|
| Submitted email already on a **different** member | `mapping_status = conflict`; operator queue; no auto-merge |
| Member edits a field that differs from staged GHL value | Keep both; operator confirms which is authoritative |
| Empty/blank submitted field | **Skip** — do not erase existing good data |
| Duplicate submissions (retry) | Idempotency key dedupe |

### 8A.8 Boundaries

- **No** child/youth or prayer/counselling sensitive fields in pilot v1.
- **No** outbound auto-messaging — operator follow-up only.
- **No** WordPress embed required — hosted CorpFlow URL + QR/link.
- Implementation is a **separate approved packet** (Member/Contact Intake + Member Update Flow) — this section is design only.

---

## 9. Multilingual roadmap

| Phase | Language | Mechanism |
|-------|----------|-----------|
| **Launch** | **English only** | Flows, forms, knowledge atoms, schedule copy |
| **Phase 2 (as quickly as practical after launch)** | Afrikaans, Kreol, French | **Separate approved** `tenant_knowledge_atoms` (or locale column); UI labels via static i18n JSON |
| **Phase 3+** | Other languages | Same pattern — church-approved content only |
| **Forbidden** | Runtime AI translation of official answers | Groq must **not** translate unapproved HTML/GHL/export text into visitor answers |

**Future architecture hooks (design only):**

- `locale` on knowledge atoms and schedule entries
- Session language selector on hosted forms/chat (after English stable)
- Retrieval filter by session language

---

## 10. Decision gates (clear stop/go)

Work proceeds to the next gate only when the prior gate is **explicitly satisfied**.

| Gate | ID | Owner | Entry criteria | Exit criteria |
|------|-----|-------|----------------|---------------|
| **Brad technical capability** | `GATE-BRAD` | Anton → Brad | This packet approved | Written answers to §4.2 (links vs JS vs iframe vs blocked) |
| **Privacy / data protection posture** | `GATE-PRIVACY` | Anton + **church board** | Pilot contemplated | **Board approves** the pilot privacy/consent notice (`pilot-privacy-consent-notice-draft-v1.md`); acceptable data-location option (§6) chosen; subprocessors disclosed; youth/prayer exclusions documented |
| **Pilot scope** | `GATE-PILOT` | Anton + church board | Gates BRAD + PRIVACY in progress | **Anton’s ~10 adult volunteers identified**; consent text board-approved; first form = Member Update Flow (§8A); excluded fields signed off |
| **System-of-record location** | `GATE-SOR` | Anton + church | GATE-PRIVACY | Written alignment: CorpFlow Postgres (or MU alternative) as SoR for pilot |
| **GHL data inventory / probe** | `GATE-GHL` | Anton (GHL admin) | Read-only PIT on Vercel Production | Probe v1 complete (`ghl-read-only-sync-probe-v1-live-verification.md` COMPLETE); mapping packet scoped — **no import before mapping** |
| **Sandbox proof** | `GATE-SANDBOX` | Anton | Ongoing | Church reviewers accept sandbox chat/forms/knowledge on tenant host |
| **Hosted pilot live** | `GATE-PILOT-LIVE` | Anton | GATE-PILOT + GATE-SOR + member intake foundation implemented | 10 pilot flows complete without incident |
| **Public cutover** | `GATE-PUBLIC` | Anton + pastor + Brad | GATE-PILOT-LIVE + GATE-BRAD (if embed) | Approval recorded; live URL/QR or embed verified |
| **GHL removal** | `GATE-GHL-OFF` | Anton + church | GATE-PUBLIC stable ≥2 weeks | GHL widget disabled; duplicate forms retired selectively |

**Current position (2026-06-24):**

- `GATE-SANDBOX` — **in progress** (substantial sandbox live)
- `GATE-GHL` — **in progress** (probe implementation PR #448; live run pending Production deploy)
- `GATE-BRAD`, `GATE-PRIVACY`, `GATE-PILOT`, `GATE-SOR` — **not started**
- Public embed / GHL removal — **blocked**

---

## 11. Relationship to other packets

| Packet | Relationship |
|--------|----------------|
| **Member Update Flow v1 (§8A)** | **First** production form — implemented + tested before any other form |
| **Pilot privacy/consent notice draft** | `pilot-privacy-consent-notice-draft-v1.md` — board approval gates the pilot |
| **Member/Contact Intake Foundation v1** | Implements Phase B hosted forms — **not blocked on Brad** |
| **GHL read-only probe v1** | Feeds `GATE-GHL` + Member Update Flow prefill manifest — no canonical import until mapping report |
| **GHL field mapping (Phase 2)** | After probe COMPLETE |
| **WordPress embed** | Only after `GATE-BRAD` + `GATE-PUBLIC` |
| **Business Network CRM** | Separate future packet |

---

## 12. Risks and controls

| Risk | Control |
|------|---------|
| Blocked on Brad for all intake | **Link/QR-first** CorpFlow-hosted pilot |
| Dual CRM (GHL + CorpFlow) confusion | Time-boxed coexistence; probe + mapping before cutover |
| Mauritius data-location objection | Document Neon region + subprocessors; evaluate Option B if required |
| Prayer/youth data in pilot | Explicit exclusions; safeguarding gate |
| Assuming WP DB is safe | §7 — verify or reject |
| Business Network data mixing | Separate surface; neutral workflows only |
| Unapproved public embed | `GATE-PUBLIC` requires pastor/church sign-off |

---

## 13. Recommended immediate next steps (ordered)

1. **Board-review the pilot privacy/consent notice** (`pilot-privacy-consent-notice-draft-v1.md`) — `GATE-PRIVACY`.
2. **Anton confirms the ~10 adult volunteer pilot list** — `GATE-PILOT`.
3. **Send Brad question list** (§4) — links/QR capability is enough for pilot.
4. **Send pastor/board governance list** (§5) — pilot scope + SoR + English-only launch.
5. **Complete GHL probe** on Production (factory auth) — `GATE-GHL`; field manifest feeds Member Update Flow prefill.
6. **Spec the Member Update Flow v1** (§8A) as a separate implementation packet — first form built and tested.
7. **Draft church-facing data residency one-pager** (non-legal) after GATE-PRIVACY conversation.
8. **Defer** all other forms, WordPress embed, and GHL removal until the Member Update Flow is production-ready and gates clear.

---

## Verification (this packet)

| Check | Result |
|-------|:------:|
| Design-only — no code/DB/external changes | ✓ |
| Anton context updates captured (2026-06-26) | ✓ |
| Revised launch path (link/QR first) | ✓ |
| Brad + pastor question lists | ✓ |
| Data-location options + WP DB caution | ✓ |
| Pilot + multilingual + decision gates | ✓ |
| Member Update Flow v1 (§8A) added | ✓ |
| Privacy/consent notice draft linked + board-approval gate | ✓ |
| Business Network separation noted | ✓ |
| No secrets | ✓ |

**Delivery state:** **COMPLETE** (design artifact only — no production deployment).

---

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES (artifact only)
- Merged to main: NO (pending commit/PR)
- Production deployment ID: N/A
- Commit deployed: N/A
- Live URLs tested: N/A (no customer-facing change)
- Expected vs actual: Design doc matches Anton’s stated constraints
- Client-facing flow usable: N/A
- Final verdict: COMPLETE (documentation scope)
```
