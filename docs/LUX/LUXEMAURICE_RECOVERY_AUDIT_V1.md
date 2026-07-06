# LuxeMaurice Recovery Audit v1 — Client v1–v14 vs CorpFlow Live Tenant

**Status:** Docs-only audit artefact · **NO IMPLEMENTATION AUTHORIZED**  
**Parent programme:** [GitHub #529](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/529)  
**Child issue:** [GitHub #536](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/536)  
**Feeds:** MVP scope reconciliation [#537](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/537)  
**Tenant:** `luxe-maurice` · **Host:** [https://lux.corpflowai.com](https://lux.corpflowai.com)  
**Last updated:** 2026-07-06

---

## 1. Executive summary

LuxeMaurice recovery has **two parallel technical truths**:

| Track | What it is | Authority for delivery |
|-------|------------|------------------------|
| **CorpFlow live tenant** | Next.js + Postgres + CMP on `lux.corpflowai.com` — brand-aligned public shell, governed media, `/change` control plane | **Authoritative for production** |
| **Client Drive v1–v14** | Iterative AI-generated codebase packages + v13 handover + v14 enterprise spec | **Reference input only** until audit + MVP reconciliation |

**This audit does not authorize merging client Drive code into production.** It produces a gap matrix and adopt/adapt/defer/reject tags so [#537](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/537) can define a **single productized MVP** on CorpFlow infrastructure.

**Headline findings:**

1. **CorpFlow already implements** the repositioned “Private Wealth & Lifestyle Platform” direction (editorial brand, manual-first opportunities, concierge, governed publishing, `/change`) — but **without first real client-published listing** and with **programme gates still PARTIAL**.
2. **Client v13/v14 material** (per WBS operator summaries) describes a **broader enterprise platform** (API catalogue, ER model, monitoring, backup, full QA pack, storage-bucket migration) that **exceeds recovery MVP** and likely **diverges in stack** from CorpFlow.
3. **Direct runtime reuse** of client package code into CorpFlow is estimated **≤5% overall** without a full Drive ingest and line-level review; **reference reuse** (QA tests, field lists, migration order, copy) may be **30–50%** for Chunk 5–6 once v13 is downloaded.
4. **Highest-risk client-package patterns** (typical of AI-generated multi-version drops): secrets in repo, parallel auth models, object-storage assumptions, and **dual-truth** expectations if Jan treats v14 as “the product.”

---

## 2. Audit methodology and evidence limits

### 2.1 Evidence tiers

| Tier | Source | Used in this v1 doc |
|------|--------|---------------------|
| **A — Verified** | CorpFlow repo, Prisma schema, live `lux.corpflowai.com` behaviour, in-repo programme docs | CorpFlow baseline, route map, gap matrix (CorpFlow column) |
| **B — Programme summary** | `docs/LUX/LUXEMAURICE_RECOVERY_WBS_AND_MVP_PLAN.md` §2.3, §3.3 (operator summaries of v13/v14) | v13/v14 module inventory headings |
| **C — Not ingested** | [Drive folder v1–v14](https://drive.google.com/drive/folders/1DvxP5eU0KgVGLV5vYC2RkI4ZEggU-6Ju?usp=drive_link) | **Not line-audited in this PR** — `artifacts/luxe-maurice-ai-handoff/` contains README only |

### 2.2 What this v1 audit is and is not

| Is | Is not |
|----|--------|
| Structural comparison for recovery control | A security pen-test of client zip files |
| Route-level gap matrix for MVP reconciliation | Proof that v14 builds cleanly (no Drive checkout run) |
| Adopt/adapt/defer/reject at **module** granularity | Line-by-line diff of v1 vs v14 code |
| Input to [#537](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/537) | Client-facing deliverable or product demo |

### 2.3 Recommended supplement (operator, not blocking v1 merge)

1. Download Drive v1–v14 to a **local-only** workspace (do not commit secrets or full trees).
2. Append `LUXEMAURICE_RECOVERY_AUDIT_V1_SUPPLEMENT.md` with: dependency manifests, build commands, secret scan results, and per-file reuse notes.
3. Optionally mirror **non-secret** excerpts to `artifacts/luxe-maurice-ai-handoff/` per existing README.

---

## 3. Client package inventory (v1–v14)

### 3.1 Version band model

The Drive folder contains **fourteen numbered packages** (v1–v14). Without full ingest, bands are inferred from WBS summaries and typical AI-iteration patterns. **Treat band contents as hypotheses until Drive supplement confirms.**

| Band | Inferred focus (hypothesis) | v13/v14 anchor |
|------|----------------------------|----------------|
| **v1–v3** | Early property/marketing site, static pages, basic contact | — |
| **v4–v6** | Listings directory, property detail, admin CRUD sketches | — |
| **v7–v9** | CRM, lead capture, email/SMS hooks, funnel pages | — |
| **v10–v12** | AI chat/communications, dashboards, integration stubs | — |
| **v13** | **Handover package** — client status, dev instructions, quote request, **QA acceptance tests**, **storage buckets**, **migration order**, remaining human work | WBS §2.3 |
| **v14** | **Enterprise package** — architecture, **API catalogue**, **ER overview**, deployment, testing, security, legal, monitoring, backup, roadmap, production readiness | WBS §2.3 |

### 3.2 v13 handover modules (from WBS summary)

| Module (v13) | Typical contents (expected in Drive) | Deployment assumption (hypothesis) |
|--------------|--------------------------------------|-----------------------------------|
| Client status / readme | Where Jan thinks the project stands | Narrative, not runtime |
| Developer instructions | Setup, env vars, run commands | Local or VPS; unknown stack |
| Quote request | Commercial scope for remaining work | Doc only |
| QA acceptance tests | Checklists / automated tests for journeys | May target v13 routes not CorpFlow routes |
| Storage buckets | S3/GCS-style media layout | **Not** CorpFlow Postgres attachment model |
| Migration order | Ordered steps to load content | May assume client DB + buckets |
| Remaining human work | Task list for client or contractor | Planning input |

### 3.3 v14 enterprise modules (from WBS summary)

| Module (v14) | Typical contents (expected in Drive) | Deployment assumption (hypothesis) |
|--------------|--------------------------------------|-----------------------------------|
| Architecture overview | Diagrams, service boundaries | Multi-service or modular monolith |
| API catalogue | REST/GraphQL endpoint list | **Different** from CorpFlow `api/factory_router.js` + CMP |
| ER overview | Entity-relationship model | **Different** from Prisma `lux_listings`, `leads`, `cmp_*` |
| Deployment guide | Docker / cloud / CI | **Not** Vercel + Neon unless explicitly stated |
| Testing strategy | Unit/E2E/load | Unknown CI wiring |
| Security pack | AuthZ, encryption, compliance narrative | Must be validated; AI docs often aspirational |
| Legal / monitoring / backup | Ops runbooks | Enterprise scope — defer for MVP |
| Roadmap / production readiness | Full platform checklist | **Exceeds recovery MVP** |

---

## 4. CorpFlow live tenant baseline (authoritative)

### 4.1 Route map

| Route | Primary implementation | Data | Auth |
|-------|------------------------|------|------|
| `/` | `pages/index.js` → `LuxeMauriceTenantPresentation` | `tenant_personas`, published card media via CMP | Public |
| `/properties` | `pages/properties.js` → `LuxeMauricePropertiesDirectory` | `lux_listings` (published), governed card media | Public; Lux host only |
| `/property/[slug]` | `pages/property/[slug].js` → `LuxeMauricePropertyDetailPage` | `lux_listings` + CMP published hero/gallery | Public; `?preview=1` editor session |
| `/concierge` | `pages/concierge.js` | `leads` via `concierge-lead-create` | Public form |
| `/change` | `pages/change.js` | `cmp_tickets`, attachments, leads, TL audits | Tenant session + Dormant Gate |
| `/properties/admin` | `pages/properties/admin.js` | `lux_listings` CRUD + CMP slot publish | Allowlisted editors |

### 4.2 Core Prisma models (Lux)

- `lux_listings` — catalogue (slug, copy, visibility)
- `leads` — concierge enquiries + operator workflow JSON
- `cmp_tickets` / `cmp_ticket_attachments` — change programme + governed media bytes
- `tenant_hostnames` — `lux.corpflowai.com` → `luxe-maurice`

### 4.3 Programme gates still open (CorpFlow)

- First **real** client-published listing on production chrome
- Editor E2E verified with Jan on production
- Governed public imagery on a real listing
- Master programme ticket `cmo8mjijk0000jl04l1jz0v6d` **open**
- Content sprint parent `cmqa2y2ga0000l704glnfro1f` **open**

---

## 5. Module assessment — adopt / adapt / defer / reject

**Legend:** **Adopt** = already on CorpFlow or take as-is from client docs · **Adapt** = concept useful, CorpFlow implementation differs · **Defer** = post-MVP · **Reject** = conflicts with repositioning, governance, or stack

| # | Module | Client v1–v14 (hypothesis / v13–v14) | CorpFlow today | Tag | Reusable code % (direct) | Reusable reference % |
|---|--------|--------------------------------------|----------------|-----|--------------------------|----------------------|
| 1 | Public marketing / brand shell | Repeated redesigns across v1–v14 | Vision-aligned editorial brand (PR #343) | **Adapt** | 0–5% | 20% (copy/layout ideas only) |
| 2 | IDX / MLS / feed inventory | Likely in early packages | **Removed** — manual-first, no fake inventory | **Reject** | 0% | 0% |
| 3 | Private opportunities directory | Listing grid variants | `/properties` — published `lux_listings` only | **Adapt** | 0–5% | 15% (field labels) |
| 4 | Property memorandum detail | Detail templates | `/property/[slug]` — editorial layout | **Adapt** | 0–5% | 15% |
| 5 | Concierge / lead intake | Forms + CRM hooks | `/concierge` → `leads` | **Adapt** | 0–5% | 25% (intent taxonomy) |
| 6 | CRM operator desk | CRM UI in client packages | `/change` CRM strip + lead patch actions | **Adapt** | 0% | 30% (workflow ideas) |
| 7 | Property editor / admin | Admin panels in v4+ | `/properties/admin` + CMP listing-admin | **Adapt** | 0–5% | 20% |
| 8 | Media storage | v13 **storage buckets** | Postgres attachments + governed publish slots | **Adapt** | 0% | 40% (migration **order** only) |
| 9 | Media governance | Unknown in client packages | Review → link → publish pipeline | **Adopt** (CorpFlow) | N/A | N/A |
| 10 | Change / delivery control | Unlikely in client packages | `/change` + CMP sandbox | **Adopt** (CorpFlow) | N/A | N/A |
| 11 | Auth / tenants | Per-package auth | Sovereign session + tenant hostnames | **Adapt** | 0% | 10% |
| 12 | API catalogue (v14) | Full REST surface | `api/factory_router.js` + CMP router | **Defer** | 0% | 15% (requirements trace) |
| 13 | ER / data model (v14) | Client ER diagram | Prisma schema above | **Adapt** | 0% | 35% (field mapping for #537) |
| 14 | Marketing automation / funnels | v7–v10 likely | Not on Lux tenant; n8n factory-side only | **Defer** | 0% | 10% |
| 15 | AI chat / autonomous agents | v10–v12 likely | Groq refiner on `/change` only; no public chatbot | **Reject** (public) / **Defer** (internal) | 0% | 5% |
| 16 | WhatsApp / SMS | Possible in client packages | Not authorized on Lux without separate packet | **Defer** | 0% | 0% |
| 17 | Executive dashboard (v14) | Roadmap module | Not built on Lux | **Defer** | 0% | 20% (spec for 60–90d) |
| 18 | Owner experience portal (pillar 5) | May appear in v12–v14 | Future phase per repositioning | **Defer** | 0% | 15% |
| 19 | Deployment / Docker / K8s (v14) | Client deploy guide | Vercel + Neon production | **Reject** (for Lux runtime) | 0% | 0% |
| 20 | Monitoring / backup (v14) | Enterprise ops pack | CorpFlow factory monitors + separate runbooks | **Defer** | 0% | 10% |
| 21 | QA acceptance tests (v13) | **Explicit in handover** | Partial — programme docs + smoke scripts | **Adapt** | 0% | **50%** (map tests to routes) |
| 22 | Migration order (v13) | **Explicit in handover** | Content sprint C1–C5 programme | **Adapt** | 0% | **45%** |
| 23 | Payment / ERPNext / billing | Quote request in v13 | Quotation scope doc only; not issued | **Defer** | 0% | 10% |
| 24 | Legal / compliance pack (v14) | Enterprise narrative | `docs/compliance/*` CorpFlow baseline | **Defer** | 0% | 25% |

**Weighted direct runtime reuse (estimate):** **≤5%** — client packages are a parallel stack; recovery MVP should **adapt concepts** on CorpFlow, not merge trees.

---

## 6. Build and dependency risks (client packages)

| Risk | Severity | Notes |
|------|----------|-------|
| **Fourteen conflicting versions** | High | v1–v14 may not be incremental git history; operators may open wrong zip |
| **Unknown package manager / framework** | High | Not verified without Drive download (may mix React, Next, vanilla, Python) |
| **No CI evidence in repo** | Medium | Buildability unproven |
| **v14 “production ready” label** | High (expectation) | Commercial risk if Jan believes v14 equals deployable prod on CorpFlow |
| **Migration scripts target wrong schema** | High | v13 migration order may assume client ER, not `lux_listings` |
| **Duplicate feature implementations** | Medium | Same feature re-generated across versions with incompatible APIs |
| **Asset weight** | Medium | Large media in Drive packages — not for git ingest |

---

## 7. Security, auth, secrets, and data risks (client packages)

| Risk | Severity | Mitigation (recovery programme) |
|------|----------|--------------------------------|
| **Secrets in Drive trees** (.env, API keys) | Critical | Never commit; scan on supplement ingest |
| **Public bucket configs** (v13 storage) | High | Do not point CorpFlow at client buckets without review |
| **Weak or default credentials** in AI gen code | High | Reject for runtime; CorpFlow auth only |
| **No tenant isolation** in client code | High | CorpFlow `luxe-maurice` boundary is non-negotiable |
| **PII in QA fixtures** | Medium | Redact before any repo mirror |
| **Client package as attack surface** | Medium | Reference-only; no `npm install` from Drive in production path |
| **Dual-truth data** | High | Jan may edit listings in client admin while CorpFlow editor is canonical — MVP comms must clarify |

---

## 8. Gap matrix — client material vs CorpFlow routes

| Client expectation (v13/v14 hypothesis) | `/` | `/properties` | `/property/[slug]` | `/concierge` | `/change` | `/properties/admin` |
|---------------------------------------|-----|---------------|--------------------|--------------|-----------|----------------------|
| Editorial brand / vision deck | **Match** | **Match** | **Match** | **Match** | Partial (operator chrome) | N/A |
| Curated opportunities (no IDX) | **Match** | **Match** | **Match** | N/A | N/A | N/A |
| Real published listing with media | **Gap** | **Gap** | **Gap** | N/A | In progress (sprint) | **Gap** |
| QA journey pass (v13 tests) | Unknown | Unknown | Unknown | Unknown | Unknown | Unknown |
| Full API catalogue (v14) | N/A | N/A | N/A | Partial | Partial | Partial |
| Object-storage media | N/A | **Mismatch** | **Mismatch** | N/A | **Mismatch** (Postgres bytes) | **Mismatch** |
| CRM / lead pipeline | N/A | N/A | Link | **Match** | **Match** | N/A |
| Operator change / build pipeline | Unlikely | Unlikely | Unlikely | Unlikely | **CorpFlow-only** | N/A |
| Executive dashboard | N/A | N/A | N/A | N/A | **Gap** | N/A |
| Owner portal | N/A | N/A | N/A | N/A | **Gap** | Partial |
| Enterprise monitoring/backup | N/A | N/A | N/A | N/A | **Gap** (factory-level separate) | N/A |

**Summary:** Public **brand and route shape** align with repositioned CorpFlow. **Data, media plumbing, enterprise modules, and QA proof** diverge or are unfinished.

---

## 9. Recommendations for MVP reconciliation ([#537](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/537))

### 9.1 Authority rule (proposed for #537)

> **Production truth = CorpFlow `luxe-maurice` tenant.** Client v1–v14 is **reference and QA input**, not a second runtime.

### 9.2 Proposed MVP in-scope (from this audit)

1. **One** real private opportunity published end-to-end (listing + governed hero/gallery + concierge path) — maps v13 QA subset to CorpFlow routes.
2. **Homepage** with real card media (not placeholder).
3. **`/change`** as operator control plane — recovery ticket `cmr7a244f0000l505x5vne2s0` programme; not a demo of v14.
4. **Concierge** lead capture with operator workflow on `/change`.
5. **Editor** E2E for Jan on `/properties/admin`.

### 9.3 Proposed MVP out-of-scope (defer from v14)

- Full API catalogue parity
- Executive dashboard
- Owner experience portal
- IDX/MLS
- Public AI chatbot
- WhatsApp/SMS (separate authorization)
- Client Docker/K8s deployment path
- Enterprise monitoring/backup pack as Lux features

### 9.4 Inputs #537 should import from this audit

| Input | Use in #537 |
|-------|-------------|
| Gap matrix §8 | One-page MVP route checklist |
| Module table §5 | Explicit non-goals |
| v13 QA + migration (when ingested) | Acceptance test traceability matrix |
| ER field mapping (supplement) | `lux_listings` + attachment field reconciliation |
| Reuse percentages | Set expectation: **build on CorpFlow**, not port v14 |

### 9.5 Sequencing

```
#536 (this doc) → #537 MVP scope sign-off → #538 recovery note draft → Chunk 5 data pack → Chunk 6 first listing
```

---

## 10. Governance statement

- **Docs-only** — no runtime changes authorized by this file.
- **No production deploy** performed for this audit PR.
- **No env/secrets/DB/schema changes.**
- **No email/WhatsApp/SMS, ERPNext quotation, or client outreach.**
- **No merge** of client Drive code into CorpFlow production.

---

## 11. Related links

- WBS: `docs/LUX/LUXEMAURICE_RECOVERY_WBS_AND_MVP_PLAN.md`
- Repositioning: `docs/LUX/LUXEMAURICE_REPOSITIONING_2026_06_11.md`
- Media governance: `docs/LUX/LUX_MEDIA_GOVERNANCE.md`
- Client Drive v1–v14: [folder](https://drive.google.com/drive/folders/1DvxP5eU0KgVGLV5vYC2RkI4ZEggU-6Ju?usp=drive_link)
- Active recovery ticket: `cmr7a244f0000l505x5vne2s0` (sandbox PR [#535](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/535) — operator infra, not MVP)

---

## 12. Anton sign-off (required)

| Check | Status |
|-------|--------|
| Audit methodology acceptable (structural v1 without full Drive ingest) | ☐ |
| Module tags reviewed | ☐ |
| Gap matrix matches operator understanding | ☐ |
| Authorized to open [#537](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/537) reconciliation | ☐ |
| Drive supplement ingest scheduled | ☐ |

**Auditor:** Cursor (issue #536) · **Date:** 2026-07-06
