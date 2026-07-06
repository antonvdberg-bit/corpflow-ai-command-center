# LuxeMaurice MVP Scope Reconciliation v1

**Status:** Planning / control document only · **NO IMPLEMENTATION AUTHORIZED**  
**Parent programme:** [GitHub #529](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/529)  
**Child issue:** [GitHub #537](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/537)  
**Inputs:** [GitHub #536](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/536) audit (`docs/LUX/LUXEMAURICE_RECOVERY_AUDIT_V1.md`), WBS (`docs/LUX/LUXEMAURICE_RECOVERY_WBS_AND_MVP_PLAN.md`)  
**Feeds:** Client recovery communication draft [#538](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/538) — **do not start until this doc is merged or approved by Anton**  
**Tenant:** `luxe-maurice` · **Host:** [https://lux.corpflowai.com](https://lux.corpflowai.com)  
**Last updated:** 2026-07-06

---

## Authority rule (non-negotiable)

> **Production truth = CorpFlow `luxe-maurice` on `lux.corpflowai.com`.**  
> Client Drive v1–v14 packages are **reference and QA input**, not a second runtime.  
> **No merge** of client Drive code into CorpFlow production without a separate authorized chunk.

---

## 1. What is in the controlled MVP

The **controlled recovery MVP** is the smallest client-validatable slice that proves LuxeMaurice can operate as a **Private Wealth & Lifestyle Platform** on CorpFlow infrastructure — not a port of v14, not a product demo of `/change` Building state, and not “everything in the Drive folder.”

### 1.1 MVP name

**LuxeMaurice Recovery MVP — “First Real Opportunity” slice** (WBS Chunk 5 + Chunk 6).

### 1.2 In-scope surfaces (CorpFlow routes)

| Route | MVP role | MVP “done” means |
|-------|----------|------------------|
| `/` | Brand + editorial acquisition | At least one **real** governed homepage image visible in a published slot (C1 minimum) |
| `/properties` | Private Opportunities directory | **One** real published opportunity listed (not empty state only) |
| `/property/[slug]` | Private Opportunity memorandum | That opportunity renders with governed hero + gallery, editorial copy, concierge CTA |
| `/concierge` | Private Advisory intake | Form submits; lead appears in `/change` CRM strip |
| `/properties/admin` | Jan editor | Jan completes create/edit/publish E2E on production (C4) |
| `/change` | Operator control plane | Governed upload → review → link → publish; recovery programme tracked — **not** sold to Jan as finished product |

### 1.3 In-scope capabilities (behaviour, not new features)

| Capability | Source | MVP note |
|------------|--------|----------|
| Manual-first curated opportunities | Repositioning 2026-06-11 | **No IDX/MLS** |
| Governed media pipeline | `LUX_MEDIA_GOVERNANCE.md` | Postgres attachments + explicit publish slots |
| Concierge → leads → operator CRM | Phase 3 CRM slice | Existing; validate on real enquiry |
| Tenant auth + editor allowlist | `lux-property-editor-access.js` | Jan + operator accounts only |
| Brand / vision-aligned chrome | PR #343 | Already live; MVP adds **real content** |
| Programme control via CMP | Recovery ticket `cmr7a244f0000l505x5vne2s0` | Internal; not client-facing “feature” |

### 1.4 In-scope roles

| Role | MVP responsibility |
|------|-------------------|
| **Jan** | Supplies and approves content; validates editor + public render (C4) |
| **Anton / operator** | Uploads, reviews, links, publishes; production publish gate |
| **CorpFlow** | Hosts tenant, governs media, operates `/change` — no v14 runtime |

### 1.5 MVP success statement (internal)

Jan can show `https://lux.corpflowai.com/` to a prospect with **real** homepage imagery and **one** real private opportunity — from directory through memorandum to concierge — without placeholder inventory, demo slugs, or apology for “still building v14.”

---

## 2. What is out of scope

Explicit **non-goals** for the recovery MVP (do not slip in without #529 update + Anton approval):

| # | Out of scope | Rationale |
|---|--------------|-----------|
| 1 | Merging or deploying client Drive v1–v14 code | Audit: ≤5% direct reuse; stack mismatch |
| 2 | IDX / MLS / external property feeds | Repositioning rejection |
| 3 | Public AI chatbot / autonomous agent on Lux marketing | Above-the-line + governance |
| 4 | Full v14 API catalogue parity | Enterprise spec; CorpFlow has different API surface |
| 5 | Executive dashboard (v14 roadmap) | WBS Chunk 11 — 60–90 day |
| 6 | Owner Experience Portal (pillar 5) | Strategic vision — future phase |
| 7 | WhatsApp / SMS campaigns | Separate authorization packet |
| 8 | Marketing automation / bulk email funnels | Factory n8n; not Lux tenant MVP |
| 9 | ERPNext quotation / invoicing | Chunk 8 — commercial gate separate |
| 10 | Second production app or database | WBS hard stop |
| 11 | Client Docker/K8s deployment path from v14 | CorpFlow = Vercel + Neon |
| 12 | Mobile app, blockchain, franchise, broad portal integrations | WBS §10 |
| 13 | Presenting `/change` sandbox preview as “the delivered product” | Recovery control infra only |
| 14 | Full v13/v14 QA pack pass on every module | MVP maps **subset** only (see §7) |
| 15 | Catalogue of multiple live listings | MVP = **one** opportunity; more = post-MVP |

---

## 3. What is deferred (post-MVP, on roadmap)

| Item | WBS / audit ref | Target horizon |
|------|-----------------|----------------|
| Executive dashboard MVP | Chunk 11 / R8 | 60–90 days |
| Owner Experience Portal | Pillar 5 / audit §5 #18 | Post-MVP programme |
| Additional published opportunities (2+) | After first listing proof | Post-MVP content waves |
| v14 API catalogue as requirements trace | Audit adapt | When integration needs arise |
| Marketing automation (n8n) expansion | Audit defer #14 | Factory-side; not Lux blocker |
| WhatsApp / SMS Tier 1–2 | Governance hold | Separate packet |
| Ticket email to Jan (`lux_ticket_update`) | Chunk 7 | After n8n route verified — **not** MVP blocker for first listing |
| ERPNext quotation issuance | Chunk 8 | After MVP scope stable |
| Full v13 QA acceptance matrix | Chunk 12 / R11 | After MVP slice live |
| Drive supplement line-level audit | Audit §2.3 | Operator ingest; informs field mapping |
| AI scoring & approval UX | Chunk 10 / R6 | Post-MVP |
| CRM + developer upload hardening | Chunk 9 / R5 | Post-MVP |
| Discover Mauritius editorial depth | Pillar 1 | Expand after MVP |
| Client-facing performance reporting | Quality docs | After analytics rollout |

---

## 4. Client v1–v14 concepts — adopt / adapt / defer / reject

Consolidated from `LUXEMAURICE_RECOVERY_AUDIT_V1.md` §5. **Adopt** = use CorpFlow as-is or take concept without porting code · **Adapt** = implement on CorpFlow differently · **Defer** = post-MVP · **Reject** = do not pursue for Lux recovery MVP.

| Client concept (v1–v14) | Tag | MVP treatment |
|-------------------------|-----|---------------|
| Public marketing / brand shell | **Adapt** | Keep PR #343 chrome; Jan supplies real imagery (C1) |
| IDX / MLS / feed inventory | **Reject** | Not in MVP or roadmap unless strategic reversal |
| Private opportunities directory | **Adapt** | `/properties` + `lux_listings` published rows |
| Property memorandum detail pages | **Adapt** | `/property/[slug]` editorial layout |
| Concierge / lead intake | **Adapt** | `/concierge` → `leads` |
| CRM operator desk | **Adapt** | `/change` CRM strip (existing) |
| Property editor / admin | **Adapt** | `/properties/admin` + CMP listing-admin |
| v13 storage buckets | **Adapt** | **Do not** wire S3 from client packages; use Postgres attachments + publish slots |
| Media governance (client unknown) | **Adopt** (CorpFlow) | Review → link → publish — already shipped |
| Change / delivery control | **Adopt** (CorpFlow) | `/change` + CMP — internal |
| Per-package auth models | **Adapt** | CorpFlow sovereign session + tenant hostnames only |
| v14 API catalogue | **Defer** | Requirements trace only if needed later |
| v14 ER / data model | **Adapt** | Map fields to `lux_listings` + attachments — not client schema |
| Marketing automation / funnels | **Defer** | Factory n8n |
| Public AI chat / agents | **Reject** (public) | No Lux marketing chatbot in MVP |
| WhatsApp / SMS | **Defer** | Not authorized |
| Executive dashboard | **Defer** | Chunk 11 |
| Owner portal | **Defer** | Pillar 5 |
| v14 Docker/K8s deploy guide | **Reject** (for Lux runtime) | Vercel + Neon only |
| v14 monitoring / backup pack | **Defer** | Factory monitors separate |
| v13 QA acceptance tests | **Adapt** | Map **subset** to CorpFlow routes (§7) |
| v13 migration order | **Adapt** | Align to C1→C2→C4 content sprint order |
| v13 quote request / v14 billing narrative | **Defer** | ERPNext Chunk 8 — not MVP |
| v14 legal / compliance pack | **Defer** | CorpFlow compliance baseline applies |

**Direct runtime code reuse from Drive:** **≤5%** (audit estimate). MVP delivery = **build on CorpFlow**, reference client docs for QA and content structure only.

---

## 5. Data Jan must provide before MVP delivery can be validated

MVP cannot be validated until Jan supplies **client-approved content** on the CorpFlow path. Canonical detail: `docs/runbooks/LUX_CONTENT_SPRINT_C1_C2_JAN_CONTENT_BRIEF.md`.

### 5.1 Required before MVP sign-off (blocking)

| # | Data / artefact | Workstream | Used for |
|---|-----------------|------------|----------|
| 1 | **Homepage imagery package** — minimum 4 images (hero + lifestyle + arrival + owner-experience categories) | C1 | Published slots on `/` |
| 2 | **First real private opportunity** — title, region, type, teaser, description, highlights, on-application pricing language | C2 | `lux_listings` row in `/properties/admin` |
| 3 | **Governed gallery** — minimum 5 images for that opportunity (hero + gallery slots) | C2 | `/property/[slug]` memorandum |
| 4 | **Per-image metadata** — filename, alt text, rights/source, category | C1 + C2 | Accessibility + governance audit trail |
| 5 | **Written approval** — explicit sign-off that images and copy may go public on `lux.corpflowai.com` | C1 + C2 | Publish gate |
| 6 | **C4 E2E participation** — Jan logs into `/properties/admin`, edits opportunity, confirms public render + concierge link | C4 | MVP acceptance |

### 5.2 Strongly recommended (not blocking publish, blocking “commercially usable”)

| # | Data / artefact | Notes |
|---|-----------------|-------|
| 7 | Concierge test enquiry (or consent to operator test) | Validates lead → `/change` CRM path |
| 8 | Confirmation of **single delivery track** — CorpFlow is canonical; v14 zip is not parallel prod | Reduces dual-truth risk (audit §7) |

### 5.3 Explicitly not required for MVP validation

- Client Drive v1–v14 zip files in git
- v14 API implementation
- ERPNext quotation PDF
- WhatsApp / SMS opt-in
- Executive dashboard metrics
- Full v13 automated test suite port

### 5.4 Operator dependencies (not Jan data, but blocking)

| Dependency | Owner | Status |
|------------|-------|--------|
| C3 placeholder cleanup on production | Operator | **COMPLETE** (2026-06-15) |
| Jan editor login on production | Operator | Verify before C4 |
| Production publish approval | Anton | Required for Chunk 6 |

---

## 6. First build chunk (after this doc is approved)

**No implementation is authorized by this document.** When Anton approves MVP scope, the **first authorized implementation sequence** is:

### Chunk A — Data & listing readiness (WBS Chunk 5)

**Objective:** One real listing exists in `/properties/admin` with governed media uploaded and reviewed — **not public yet**.

| Step | Action |
|------|--------|
| 1 | Jan delivers C1 + C2 content per §5 |
| 2 | Operator uploads to sprint tickets (C1 `cmqa57uyt…`, C2 `cmqa57ve0…`) or recovery ticket `cmr7a244f0000l505x5vne2s0` |
| 3 | Review → link → publish slots per `LUX_MEDIA_GOVERNANCE.md` |
| 4 | Create `lux_listings` draft for first opportunity |
| 5 | Jan preview via `?preview=1` on memorandum |

**Gate:** Anton confirms draft quality; Jan approves copy and imagery.

### Chunk B — First client-visible publish (WBS Chunk 6)

**Objective:** **One** curated private opportunity **live** end-to-end on production.

| Step | Action |
|------|--------|
| 1 | Set listing `visibility_status = published` (Anton approval) |
| 2 | Publish homepage card media (C1) if not already live |
| 3 | Live GET verification: `/`, `/properties`, `/property/<slug>`, `/concierge` |
| 4 | Delivery Reality Audit recorded on #529 |
| 5 | C4 Jan E2E sign-off |

**This is the first build chunk that changes client-visible production** — Chunk A is content + governance only until publish.

**Not first build chunk:** Porting v14 modules, new features from Drive, ERPNext, Jan email automation, or `/change` sandbox as client demo.

---

## 7. Acceptance criteria

### 7.1 MVP complete when (all must pass)

| ID | Criterion | Verification |
|----|-----------|--------------|
| AC-1 | `GET https://lux.corpflowai.com/` → **200**; ≥1 real published homepage image (not placeholder gradient) | Live GET + visual |
| AC-2 | `GET https://lux.corpflowai.com/properties` → **200**; lists **exactly one** real published opportunity (Jan-approved) | Live GET |
| AC-3 | `GET https://lux.corpflowai.com/property/<slug>` → **200**; memorandum with governed hero + gallery | Live GET |
| AC-4 | Concierge form submits; lead visible in `/change` CRM for `luxe-maurice` | Operator verify |
| AC-5 | Jan completes C4 E2E on production (`/properties/admin` → publish → public → concierge) | Jan + Anton sign-off |
| AC-6 | Sitemap contains **no** placeholder/demo slugs for fake inventory | `sitemap.xml` check |
| AC-7 | No client Drive code deployed to production | Git / deploy audit |
| AC-8 | Delivery Reality Audit on #529 with deployment ID + commit + URLs | `delivery-reality.mdc` |

### 7.2 v13 QA subset mapped to CorpFlow routes

Until full v13 pack is ingested, MVP uses this **minimum traceability matrix**:

| v13-style journey (adapted) | CorpFlow route | Pass condition |
|----------------------------|----------------|--------------|
| Visitor sees brand platform | `/` | Real imagery + vision copy |
| Visitor browses opportunities | `/properties` | One real card |
| Visitor opens opportunity | `/property/[slug]` | Full memorandum |
| Visitor requests advisory | `/concierge` | Form works; polite confirmation |
| Operator sees enquiry | `/change` CRM | Lead row present |
| Editor creates/edits listing | `/properties/admin` | Jan can save draft |
| Editor publishes listing | `/properties/admin` + CMP publish | Public render matches draft |
| Media governed before public | `/change` attachments | Review + publish audit trail |

### 7.3 Explicit non-acceptance (MVP is not complete if)

- Only sandbox preview URL exists with no production publish
- `/change` Building state shown to Jan as “finished product”
- v14 enterprise checklist cited as MVP done
- Placeholder or demo slugs appear on `/properties` or sitemap
- IDX/MLS language or feed appears on public pages

---

## 8. What can safely be said to Jan (after Anton approves this doc)

**Use only after Anton approves §12 sign-off.** [#538](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/538) will turn this into a recovery note — **do not send until #538 is approved.**

### 8.1 Safe to say

- LuxeMaurice is being delivered as a **Private Wealth & Lifestyle Platform** on **CorpFlow-managed infrastructure** at `https://lux.corpflowai.com/` — aligned with the Strategic Vision you approved in June 2026.
- The **public brand experience is live** (editorial design, Private Opportunities, Private Advisory, governed publishing). What remains for the **first recovery milestone** is **your real content**: homepage imagery and **one** real private opportunity.
- We are **not** rebuilding from the v1–v14 Drive packages as a separate product. Those packages informed our audit; **production runs on CorpFlow** with manual-first curated opportunities (no IDX feed).
- The **first milestone** you can show a prospect: real homepage imagery + **one** published private opportunity + working concierge enquiry — all on the live site.
- You will use **`/properties/admin`** to create and publish; we use **`/change`** internally for governed media and programme control.
- Timeline honesty: MVP completes when **you supply approved content** and we complete a short validation checklist (C4) — not when an AI-generated v14 zip is “deployed.”

### 8.2 Do not say (until explicitly true and approved)

- “v14 is live” or “the enterprise platform from Drive is production”
- “Everything in the handover package is built”
- “The change console demo is your finished product”
- Guaranteed go-live dates without content delivery from Jan
- Revenue, lead volume, or IDX integration promises
- WhatsApp/SMS automation is active
- A quotation or invoice exists (ERPNext not issued)
- “Recovery is complete” before AC-1–AC-8 pass

### 8.3 If Jan asks about Drive v1–v14

> “We audited your packages. They helped us understand your expectations and QA checklist. The live platform is CorpFlow — we’re putting your approved content through our governed publishing path for the first real opportunity, not merging fourteen parallel code versions.”

---

## 9. Relationship to programme tickets

| Ticket | Role in MVP |
|--------|-------------|
| `cmo8mjijk0000jl04l1jz0v6d` | Master programme — **stays open** |
| `cmqa2y2ga0000l704glnfro1f` | Content sprint parent — C1–C4 execute MVP content |
| `cmr7a244f0000l505x5vne2s0` | Recovery control ticket — internal programme, not MVP definition |
| C1 `cmqa57uyt0000xf803uav5x8x` | Homepage imagery |
| C2 `cmqa57ve00001xf80tpgmjeiz` | First real opportunity |
| C4 `cmqa57vsr0003xf80y543sx20` | Jan E2E validation |

---

## 10. Governance statement

- **Docs-only** — no runtime changes authorized by this file.
- **No production deploy, DB/schema, env/secrets changes.**
- **No email/WhatsApp/SMS, ERPNext quotation, or client outreach.**
- **#538 blocked** until this doc is merged or approved by Anton.

---

## 11. Related links

- Audit: `docs/LUX/LUXEMAURICE_RECOVERY_AUDIT_V1.md` ([#536](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/536))
- WBS: `docs/LUX/LUXEMAURICE_RECOVERY_WBS_AND_MVP_PLAN.md` ([#529](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/529))
- Content sprint: `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md`
- Jan content brief: `docs/runbooks/LUX_CONTENT_SPRINT_C1_C2_JAN_CONTENT_BRIEF.md`
- Repositioning: `docs/LUX/LUXEMAURICE_REPOSITIONING_2026_06_11.md`
- Media governance: `docs/LUX/LUX_MEDIA_GOVERNANCE.md`

---

## 12. Anton sign-off (required before #538 or implementation chunks)

| Check | Status |
|-------|--------|
| MVP in-scope / out-of-scope / deferred lists accurate | ☐ |
| Jan data requirements (§5) agreed | ☐ |
| First build chunk sequence (§6) authorized | ☐ |
| Acceptance criteria (§7) accepted | ☐ |
| Safe-to-say language (§8) approved for #538 drafting | ☐ |
| **Authorized to start #538 recovery note draft** | ☐ |
| **Authorized to start Chunk 5 / 6 implementation** | ☐ |

**Author:** Cursor (issue #537) · **Date:** 2026-07-06
