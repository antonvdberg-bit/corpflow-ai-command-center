# Living Word — public website knowledge intake design (v1)

**Date:** 2026-06-19  
**Tenant:** `living-word-mauritius`  
**Mode:** design / research only — **no live crawl, no auto-approval, no AI answers from raw pages**

This document defines how CorpFlow can safely build and maintain the Living Word knowledge base from **public website sources**, without letting the chatbot answer directly from scraped HTML.

**Related baseline (already live):**

| Component | State |
|-----------|--------|
| `tenant_knowledge_atoms` | Approved facts only; `ai_answer_eligible` gate |
| `tenant_schedule_entries` | Structured dates/events (schedule-source v1) |
| Retrieval AI v1 | Groq + approved atoms + schedules only |
| External sites | **Untouched** — no WordPress/GHL/DNS changes in this packet |

---

## 1. Principle — never AI-answer from raw crawl

```text
public website crawl
  → source snapshot records (immutable audit)
  → extracted candidate knowledge atoms (approved=false)
  → operator review / approval
  → approved tenant_knowledge_atoms (ai_answer_eligible=true)
  → retrieval-assisted AI
```

**Hard rules:**

- Crawled HTML/text is **never** passed to the LLM at answer time.
- Scraped content is **never** `approved=true` automatically.
- Only operator-approved rows enter retrieval.
- Dates/events belong in **`tenant_schedule_entries`**, not free-text atoms (see §12).

---

## 2. Source URLs to evaluate

| URL | Role | Intake posture |
|-----|------|----------------|
| `https://livingwordmauritius.com` | Primary public church site | **In scope** for public marketing/info pages |
| `https://www.livingwordmauritius.com` | Apex alias | Same host policy as apex; dedupe by canonical URL |
| `https://network.livingwordmauritius.com` | Business Network community site | **Separate corpus** — neutral posture only; no endorsement atoms |

**Out of scope always:** `/wp-admin`, login, member-only, donation backends, GHL embeds, private APIs, email inboxes.

---

## 3. Safe pages to crawl (Living Word v1)

**Allow-list categories (public HTML only):**

1. Home / welcome / about
2. Contact / find us (address, public phone, email — verify against existing approved atoms)
3. Service times **summary** pages (extract candidates; **canonical times** still go to schedule entries)
4. Ministries overview (WordGroups, youth, volunteer — high-level only)
5. Business Network **public landing** (neutral facts only; link to network site, no member lists)

**Deny-list patterns:**

- `/wp-admin`, `/wp-login`, `/wp-json/` (unless public REST explicitly approved later)
- Search results, cart, account, calendar feeds with PII
- PDFs with member rosters, internal newsletters
- User-generated comments unless moderated export approved

**Crawl discipline:**

- Respect `robots.txt` on each host
- Rate limit: e.g. ≤1 req/s per host, max N pages per run (operator-configured)
- User-Agent identifies CorpFlow operator crawl (not disguised as visitor)
- Public GET only — no form POST, no auth cookies

---

## 4. Proposed data model — source snapshots

**New table (future packet):** `tenant_knowledge_source_snapshots`

| Field | Purpose |
|-------|---------|
| `id` | Primary key |
| `tenant_id` | Tenant scope |
| `source_url` | Canonical page URL |
| `source_host` | `livingwordmauritius.com` / `network.livingwordmauritius.com` |
| `fetched_at` | Crawl timestamp |
| `http_status` | 200, 404, etc. |
| `content_hash` | SHA-256 of normalised body text |
| `raw_storage_ref` | Optional blob pointer (S3/Postgres text) — **not** AI-retrieval |
| `robots_allowed` | bool from robots check |
| `crawl_run_id` | Batch idempotency |
| `metadata_json` | title, etag, content-type |

**Purpose:** audit trail, stale detection, diff between crawls. Snapshots are **evidence**, not answers.

---

## 5. Candidate atoms — reuse `tenant_knowledge_atoms` with `approved=false`

**Recommendation:** use existing `tenant_knowledge_atoms` for candidates **and** approved rows — avoid a second atom table in v1.

| Field | Candidate use |
|-------|----------------|
| `approved` | **false** until operator approves |
| `ai_answer_eligible` | **false** until approved |
| `chatbot_answer_eligible` | **false** until approved |
| `source_type` | `website_crawl_candidate` |
| `source_url` | Page URL |
| `source_label` | Human-readable provenance |
| `metadata_json` | `{ snapshot_id, content_hash, extracted_at, extractor_version }` |
| `atom_key` | Stable slug e.g. `location.grand_baie_v2_candidate` |
| `visibility` | `internal` or `unlisted` until approved → `public` |

**Optional future table:** `tenant_knowledge_extraction_runs` for batch metadata (run id, page count, errors).

---

## 6. Provenance tracking

Every candidate must record:

- `source_url` — where text was found
- `content_hash` / `source_hash` — detect page changes (`metadata_json.source_hash`)
- `extracted_at` — ISO timestamp in `metadata_json`
- `reviewed_at` → `last_reviewed_at` on atom
- `approved_by` → operator id/email on approval
- `approved_at` — set only on human approve action

---

## 7. Duplicate prevention

1. **Unique constraint:** existing `(tenant_id, atom_key)` — candidates use distinct keys until merged
2. **Content hash match:** if new extraction hash equals approved atom hash → skip or flag “unchanged”
3. **Semantic dedupe (later):** optional embedding compare — **not v1**
4. **Merge workflow:** operator merges candidate into existing approved atom (update body, bump `last_reviewed_at`)

---

## 8. Stale / changed pages

When `content_hash` differs from last snapshot for same `source_url`:

1. Create new snapshot row
2. Generate **new candidate** atoms (approved=false) or mark existing approved atom `needs_review` in metadata
3. **Do not** auto-demote approved atoms — operator decides
4. Optional `expires_at` on approved atoms for time-sensitive copy

---

## 9. Contradictory facts

If two candidates conflict (e.g. two service times on different pages):

1. Both remain `approved=false`
2. Operator inbox shows **conflict flag** in metadata
3. Resolution: pick one source as canonical, approve one atom, reject other, or escalate to church contact
4. **Schedule table wins** for date/time facts when structured entry exists

---

## 10. Sensitive content handling

| Topic | Intake rule |
|-------|-------------|
| Prayer / counselling | Only import **safeguarding disclaimer** copy; never crisis counselling scripts from web |
| Youth / children | No child names, schools, or photos from pages; age-band policy atoms only |
| Business Network | Neutral description only; **no** “trusted business”, “verified member”, payment, or endorsement language |
| Staff / pastors | **Do not auto-extract** names unless church explicitly approves a public staff page list |
| Medical / legal / financial | Do not create atoms that imply professional advice |

Candidates touching these categories default to `sensitivity: safeguarding` and `ai_answer_eligible: false` until senior review.

---

## 11. Operator approval workflow

**Recommended v1 flow (factory / operator UI — future packet):**

1. Crawl job writes snapshots + candidate atoms (`approved=false`)
2. Operator queue: `/factory/living-word-knowledge-review` (or extend workflow inbox)
3. Review screen shows: candidate text, source URL, snapshot excerpt, diff vs approved atom
4. Actions: **Approve** / **Reject** / **Edit & approve** / **Merge into existing**
5. On approve: set `approved=true`, `ai_answer_eligible=true` (if policy clean), `approved_by`, `approved_at`, `last_reviewed_at`
6. Audit: append `automation_events` or dedicated review log row

**No CMP tickets** in this design phase unless operator explicitly promotes a conflict to a ticket later.

---

## 12. Schedule / date strategy (structured entries, not scraped text)

**Dates and events must live in `tenant_schedule_entries`**, not as the primary source of truth in knowledge atoms.

### Why

- Recurrence (weekly Sunday 09:30), expiry, and `chatbot_answer_eligible` are first-class
- AI retrieval already merges schedule rows into context
- Scraped “every Sunday 9am” text goes stale; structured rows can be updated independently

### Entry types

| Type | `recurrence` | Example |
|------|--------------|---------|
| Recurring services | `weekly` + `weekly_day_of_week` + `weekly_time` | Sunday Service 09:30 |
| One-off events | `once` + `starts_at` / `ends_at` | Easter conference |
| Group meetings | `weekly` or `once` | WordGroup (when verified) |
| Onboarding sessions | `once` | New members class |
| Volunteer functions | `once` or `weekly` | Serve team briefing |
| Business Network events | `once` | Network breakfast (**neutral** title/description) |

### Required fields per entry

- `tenant_id`, `title`, `category`, `approved`, `source` (`church-input` | `website-candidate` → never auto-approved)
- `starts_at` / `ends_at` or weekly fields
- `location_name`, optional `location_map_url`
- `expires_at` — hide after event passes or review window
- `chatbot_answer_eligible` / future `ai_answer_eligible` if column added
- `source_url` link back to public page (provenance)
- `last_reviewed_at`, `approved_by`

### Fallback when date unknown or unapproved

- AI must **not invent** a date
- Response template: “I don’t have an approved date for that in our records — please check livingwordmauritius.com or contact the church team.”
- Offer guided menu / contact path (existing retrieval AI policy)

### Crawl → schedule pipeline

1. Extract date mentions from HTML → **candidate schedule rows** (`approved=false`)
2. Operator confirms → `approved=true`
3. Knowledge atom may hold **policy** text (“service times may change; see schedule”) but not competing times

---

## 13. Rollback of incorrect atom

1. **Preferred:** set `approved=false`, `ai_answer_eligible=false` — retains audit trail
2. Set `expires_at` in the past for immediate removal from retrieval
3. Optional `metadata_json.rollback_reason` + operator id
4. Do **not** delete snapshot or usage logs
5. Re-run retrieval smoke: `node scripts/verify-retrieval-ai-living-word.mjs`

---

## 14. Multi-tenant future

Same pattern for any tenant:

- Per-tenant allow-list hosts in config (not hard-coded LWM URLs in code)
- `tenant_id` on every snapshot and atom
- Separate crawl budgets and robots policies per tenant
- Factory master approves tenant crawl enablement
- No cross-tenant snapshot or atom queries

---

## 15. Explicit non-goals (this design packet)

- No live crawl implementation
- No LLM extraction in production
- No broad internet browsing / search
- No WordPress admin access
- No automatic publish to external site
- No change to chatbot `enabled` or workflow ingestion

---

## 16. Suggested implementation packets (ordered)

1. **Snapshot table + manual paste import** (operator uploads URL + text)
2. **Bounded public crawler** (robots-aware, allow-list)
3. **Candidate extraction rules** (deterministic HTML → atoms, no LLM)
4. **Operator review UI**
5. **Schedule candidate extraction** (HTML tables → `tenant_schedule_entries` candidates)
6. **Optional LLM-assisted extraction in factory only** (never auto-approve)
