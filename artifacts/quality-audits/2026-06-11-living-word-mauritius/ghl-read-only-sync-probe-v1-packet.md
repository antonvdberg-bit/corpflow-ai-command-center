# Execution packet — Living Word GHL Read-Only Sync Probe v1

**Status:** **APPROVED AS DOCUMENTATION ONLY — IMPLEMENTATION BLOCKED**  
**Date prepared:** 2026-06-23  
**Date committed:** 2026-06-24  
**Tenant:** `living-word-mauritius`  
**Parent design:** [`ghl-api-data-inventory-sync-design-v1.md`](./ghl-api-data-inventory-sync-design-v1.md) (merged `main` via PR #444, `72b8753f`)  
**Packet id:** `LWM-GHL-ReadOnly-Sync-Probe-v1`

---

## Implementation gate (read first)

**Implementation is blocked** until all of the following are true:

1. Church / GHL admin creates a **read-only** Private Integration Token (PIT) for the Living Word sub-account.
2. Anton confirms **env readiness** on the approved Vercel **factory** environment (or operator laptop for a one-off local run) — **without exposing the token** in chat, PRs, docs, commits, or logs.
3. Anton explicitly approves a **separate implementation packet** (“implement probe v1”).

**Token handling — non-negotiable:**

| Rule | Detail |
|------|--------|
| Storage | `CORPFLOW_GHL_LIVING_WORD_MAURITIUS_PIT` in **Vercel factory env only** (or operator shell for local probe) |
| Never paste token into | ChatGPT, Cursor, GitHub, docs, commits, PR comments, `artifacts/`, `chat_history`, or application logs |
| Never commit | Token value, partial token, screenshots showing token, or API responses with unredacted PII |
| Location id | `CORPFLOW_GHL_LIVING_WORD_MAURITIUS_LOCATION_ID` — non-secret identifier; still env-only for scripts |

**Required env placeholders (`.env.template` when implementation is approved):**

```text
CORPFLOW_GHL_LIVING_WORD_MAURITIUS_LOCATION_ID=
CORPFLOW_GHL_LIVING_WORD_MAURITIUS_PIT=
```

**Current state (2026-06-24):** GHL token **not** available in approved environment. **No GHL API calls** until implementation gate clears.

---

## 1. Goal

Prove read-only access to the Living Word GoHighLevel sub-account via an owner-approved Private Integration Token, and produce a **field manifest + counts report** (target **≤19 API calls**) without importing data into canonical member tables or changing GHL or public sites.

---

## 2. Definition of Done (implementation — future)

- [ ] Owner created **read-only** PIT in GHL sub-account; scopes documented (screenshot checklist in verification artifact — **no token in repo**).
- [ ] Anton placed env vars on **Vercel factory** only; readiness confirmed without token exposure.
- [ ] Probe script `scripts/probe-ghl-living-word-readonly-v1.mjs` runs successfully (factory master or local with env).
- [ ] Verification artifact: `artifacts/quality-audits/2026-06-11-living-word-mauritius/ghl-read-only-sync-probe-v1-verification.md` with:
  - Location name / id match (confirm church sub-account)
  - Contact **count estimate** (search meta or pagination total)
  - Custom field manifest (id, key, label, type)
  - Distinct tags observed (from sample contacts or tag endpoints)
  - Forms list (id, name); surveys metadata if endpoint responds
  - Optional: **redacted** contact sample shape (field names only, or hashed values) — only if Anton approves before run
  - Rate-limit headers from at least one response
  - **API call count ≤ 19**
  - Explicit list of **excluded** endpoints (conversations, notes, message export)
- [ ] `npm test` passes if mock tests added.
- [ ] PR merged for implementation; **no** customer-facing URL change required.
- [ ] Delivery verdict: **COMPLETE** for probe scope or **PARTIAL** if token not yet available.

---

## 3. Scope

### In scope (implementation packet only — not this doc PR)

- Read-only script under `scripts/` invoking GHL API v2 (`https://services.leadconnectorhq.com`, header `Version: 2021-07-28`).
- Thin client `lib/server/ghl-readonly-client.js` (GET/search only; path allowlist).
- `.env.template` placeholders for the two env vars above.
- Verification markdown with counts/manifest.
- Optional local JSON output with PII redacted — **not committed** if it contains real data.

### Out of scope

- Prisma migrations / `ghl_sync_runs` / `ghl_raw_*` staging tables.
- **Canonical import** — no writes to `tenant_members`, `tenant_form_submissions`, or any CRM table.
- **GHL writes** — no POST/PUT/DELETE that mutate vendor data (except read-style `POST /contacts/search`).
- **Conversations / notes** — no message bodies, note text, call recordings, or SMS/email content.
- **Outbound messages** — no email, SMS, WhatsApp, or GHL campaign triggers.
- **Public site changes** — no `livingwordmauritius.com`, `www`, `network`, DNS, or GHL UI changes.
- Webhook registration, OAuth Marketplace app.
- Chatbot, workflow, AI, knowledge atoms, Luxe, multi-tenant operator switching.
- Any **data mutation** in CorpFlow Postgres beyond optional future staging (deferred to Phase 1 sync packet).

---

## 4. Probe constraints (read-only, small budget)

| Constraint | Value |
|------------|--------|
| API budget | Target **≤ 19** read-only calls per run |
| Outputs allowed | Counts, field manifest, tags, forms/surveys **metadata**, safe sample **shapes** (field names; values redacted unless Anton pre-approves) |
| Outputs forbidden | Full contact export, conversation transcripts, note bodies, attachments, payment data |
| GHL mutation | **None** |
| CorpFlow canonical tables | **No import** |
| Customer-visible behavior | **Unchanged** |

---

## 5. Planned API call sequence (≤19 calls)

| # | Method | Endpoint (v2) | Purpose |
|---|--------|---------------|---------|
| 1 | GET | `/locations/:locationId` | Confirm sub-account identity |
| 2 | GET | Location custom fields | Field manifest |
| 3 | POST | `/contacts/search` `{ limit: 1 }` | Auth + total/meta |
| 4 | POST | `/contacts/search` `{ limit: 5 }` | Sample shape for tags/custom fields |
| 5 | GET | `/forms/?locationId=` | Form list |
| 6 | GET | Form submissions (limit 1) | Confirm submissions API |
| 7 | GET | `/opportunities/pipelines?locationId=` | Pipeline inventory (optional) |
| 8 | GET | `/calendars/?locationId=` | Calendar list (optional) |
| 9 | GET | Surveys index (if documented) | Metadata only |
| 10 | GET | `/users/search?locationId=` | Staff sample (optional) |

**Not called:** `/conversations/*`, message export, notes list, workflow execution, any contact create/update/delete.

Stop when budget reached; record actual count in verification artifact.

---

## 6. Risks

| Risk | Blast radius | Mitigation |
|------|--------------|------------|
| Token over-scoped | Unintended GHL mutation | Read-only PIT scopes; code review; allowlisted paths only |
| PII in verification artifact | Privacy leak in repo | Field names only; redact/hash values; do not commit raw dumps |
| 429 rate limit | Incomplete probe | ≤19 calls; ~150ms delay between calls |
| Wrong `locationId` | Wrong sub-account data | Owner confirms id; probe prints location name for human check |
| Accidental token commit | Credential exposure | Never log token; pre-merge secret scan |

---

## 7. Approval gates

1. **This document** — approved as documentation only (current PR).
2. **Pre-implementation** — Anton says “implement probe v1” **after** env readiness confirmed without exposing secrets.
3. **Pre-token** — Church admin creates read-only PIT; Anton sets Vercel env **without pasting token in chat**.
4. **Pre-sample-PII** — Anton approves redaction level if real contact sample values are needed.
5. **Pre-merge (implementation PR)** — CI green; Anton review.

**No production deploy gate** for church URLs — probe does not change live site behavior.

---

## 8. Verification evidence (implementation)

```text
Delivery Reality Audit (probe v1):
- Local fix exists: YES/NO
- Merged to main: YES/NO
- Production deployment ID: N/A (no customer-facing change required)
- Commit deployed: note if factory script ships on main
- Live URLs tested: N/A — church site unchanged
- Expected vs actual: Probe report matches GHL UI spot-check (owner)
- Client-facing flow usable: N/A
- Final verdict: COMPLETE / PARTIAL / FAILED
```

---

## 9. Rollback plan

Revert implementation PR (script + client + `.env.template` lines). Delete any local probe output with PII. Rotate/revoke PIT in GHL UI if compromised. No database rollback (no schema in probe v1).

---

## 10. Implementation sketch (do not execute until gate § clears)

```
scripts/probe-ghl-living-word-readonly-v1.mjs
  → lib/server/ghl-readonly-client.js
  → call plan §5
  → stdout summary + verification MD

.env.template (implementation PR only):
  CORPFLOW_GHL_LIVING_WORD_MAURITIUS_LOCATION_ID=
  CORPFLOW_GHL_LIVING_WORD_MAURITIUS_PIT=
```

No factory HTTP route required for v1 — CLI script sufficient.

---

## 11. Status block

```text
Packet: LWM-GHL-ReadOnly-Sync-Probe-v1
Documentation: ON MAIN (this file, after merge)
Implementation: BLOCKED
Blocked on: Read-only GHL PIT + Vercel factory env + explicit "implement probe v1" approval
Depends on: ghl-api-data-inventory-sync-design-v1.md (PR #444, 72b8753f)
```

---

## 12. Owner

| Role | Owner |
|------|--------|
| Packet author | Cursor |
| GHL PIT + location id | Church admin + Anton |
| Env placement | Anton (Vercel factory) |
| Implementation + merge | Anton |
