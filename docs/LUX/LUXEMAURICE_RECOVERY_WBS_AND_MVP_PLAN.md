# LuxeMaurice Recovery — WBS and Phased MVP Delivery Plan

**Status:** Planning / control document only. **No implementation authorized** by this file alone.  
**Parent control issue:** [GitHub #529](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/529)  
**Tenant:** `luxe-maurice` · **Production host:** [https://lux.corpflowai.com](https://lux.corpflowai.com) · **Control plane:** [https://lux.corpflowai.com/change](https://lux.corpflowai.com/change)  
**Last updated:** 2026-07-06

---

## 1. Executive summary

LuxeMaurice is no longer a normal feature stream inside CorpFlowAI. It is a **client recovery programme**.

The client (Jan / LuxeMaurice principal) is commercially at risk: delivery has been too slow, trust is eroding, and the client has **independently redesigned and generated a substantially different system** using other AI assistance (Drive packages v1–v14). CorpFlowAI must stop reacting to the next visible `/change` failure and instead:

1. Assess the **whole client profile** — live tenant, control plane, repo delivery, and client-supplied material.
2. Produce a **work breakdown structure (WBS)** with explicit prioritization.
3. Deliver in **sequential chunks** with verification and approval gates between each chunk.
4. Guide the client from a **scattered dual-track state** into one **productized, controlled MVP** on CorpFlowAI infrastructure.

This document is the **parent control artefact** for that programme. Child issues and PRs hang under **#529**. Isolated bug fixes (#523, #527, #528) remain valid but are **subordinate** to this plan — they do not define the programme.

**Operator rule from here:** No Lux work ships to production, no client-facing communication, and no commercial artefact (quotation, email blast) without an explicit chunk boundary and Anton approval gate in this plan.

---

## 2. Client-current-state assessment

### 2.1 What the client originally needed

Per approved repositioning (2026-06-11) and programme docs:

- A **Private Wealth & Lifestyle Platform** for Mauritius — not a generic property website or IDX feed.
- Five pillars: Discover Mauritius · Private Opportunities · Private Advisory & Concierge · Property Publishing Platform · Owner Experience Portal (future).
- **Manual-first curated private opportunities** with governed media, single named advisory contact, invitation-only tone.
- Brand fidelity: charcoal / ivory / gold editorial experience; “Private. Curated. Considered.”
- Operator-controlled publishing — nothing public without review and explicit publish.

Canonical references: `docs/LUX/LUXEMAURICE_REPOSITIONING_2026_06_11.md`, `docs/LUX/LUXEMAURICE_STRATEGIC_VISION_2030.md`, `docs/LUX/LUX_DELIVERY_PROGRAMME.md`.

### 2.2 What CorpFlowAI has delivered so far

| Area | State | Evidence |
|------|--------|----------|
| Public marketing shell | **Live** — `/`, `/properties`, `/property/[slug]`, `/concierge` on editorial brand (PR #343, live-verified 2026-06-11) | `https://lux.corpflowai.com/` |
| Concierge lead intake | **Live** — posts to CMP, CRM strip on `/change` | `pages/concierge.js`, `concierge-lead-create` |
| Property editor | **Auth-gated** — `/properties/admin` | `docs/LUX/39_LuxeMaurice_Phase_2_Build_Brief.md` |
| Media governance | **Partial** — review → link → publish pipeline on `/change`; no hard-delete by default | `docs/LUX/LUX_MEDIA_GOVERNANCE.md` |
| Change Console (Lux) | **Improved but not operationally complete** — create/withdraw (#523–#525), concierge chrome (#527), approve-build blocker (#528 / PR #530) | `https://lux.corpflowai.com/change` |
| Programme master ticket | **Still open** — `cmo8mjijk0000jl04l1jz0v6d` | §8 Reality Gate **PARTIAL** |
| First real client-published listing | **Not done** | Programme gate open |
| Editor E2E on production chrome | **Not fully verified** | Programme gate open |
| Governed public imagery on real listing | **Not done** | Programme gate open |
| Email to Jan on ticket events | **Code merged (#527); route not live-verified** | n8n `lux_ticket_update` branch TBD |
| ERPNext quotation | **Scope doc only** — no Quotation doctype issued | `docs/finance/LUXEMAURICE_CHANGE_CONSOLE_QUOTATION_SCOPE_V1.md` |
| Client billing posture | **Intended paying client** — `billing_exempt` clear script exists; production DB state operator-confirmed | `scripts/clear-luxe-maurice-billing-exempt.mjs` |

### 2.3 What the client has independently created / redesigned

Client-supplied material (external to this repo until ingested):

- **Drive folder — LuxeMaurice AI codebase packages v1–v14:**  
  [https://drive.google.com/drive/folders/1DvxP5eU0KgVGLV5vYC2RkI4ZEggU-6Ju?usp=drive_link](https://drive.google.com/drive/folders/1DvxP5eU0KgVGLV5vYC2RkI4ZEggU-6Ju?usp=drive_link)
- **v13 handover package** (operator summary): client status, developer instructions, quote request, QA acceptance tests, storage buckets, migration order, remaining human work.
- **v14 enterprise package** (operator summary): architecture, API catalogue, ER overview, deployment, testing, security, legal, monitoring, backup, roadmap, production readiness.

**Risk:** The client’s parallel track may define a **different architecture, data model, API surface, and MVP** than the CorpFlowAI tenant. Without reconciliation, CorpFlowAI could build against stale assumptions while the client expects the v13/v14 shape.

### 2.4 Where scope is scattered, duplicated, risky, or unclear

| Risk | Description |
|------|-------------|
| **Dual truth** | Live CorpFlow tenant vs client Drive v1–v14 — two “systems” in the client’s mind. |
| **Reactive fixes** | #523–#528 addressed symptoms without a consolidated MVP narrative. |
| **Programme vs recovery** | Master ticket + phase docs vs new client redesign — unclear which scope is authoritative until reconciliation. |
| **Data readiness** | Listings/properties not structured for first real published opportunity; placeholder slugs removed from sitemap. |
| **Control plane incomplete** | `/change` Proceed → `approve-build` blocked or opaque; undermines operator and client trust in “managed delivery.” |
| **Comms unverified** | Ticket email + future WhatsApp — code paths exist or planned; production delivery not proven. |
| **Commercial gap** | Quotation scope documented; no issued quote — client may perceive billing/delivery misalignment. |
| **Overbuild temptation** | v14 enterprise material describes full platform; MVP must be explicitly smaller. |

### 2.5 What must be reconciled before implementation resumes

1. **Scope authority** — Signed-off MVP definition: which elements come from CorpFlow live tenant, which from v13/v14, what is deferred.
2. **Data model alignment** — Property/listing fields, media buckets, migration order (v13) vs Prisma/CMP attachment model.
3. **Control plane trust** — `/change` must support create → estimate → proceed (approve-build) → audit without generic failures.
4. **Client expectation reset** — Written recovery note to Jan: what happened, what we are doing now, what MVP means, dates honest not aspirational.
5. **Notification + commercial paths** — n8n route verification and quotation creation are **gates**, not parallel side quests.
6. **Ingestion boundary** — What from Drive is **reference-only** in repo (`artifacts/`, docs) vs what becomes **production code** (separate authorized chunks).

---

## 3. Source inventory

### 3.1 CorpFlowAI live surface

| Asset | URL / path | Role |
|-------|------------|------|
| Tenant home | `https://lux.corpflowai.com/` | Acquisition / brand |
| Private Opportunities | `/properties` | Curated listings directory |
| Opportunity detail | `/property/[slug]` | Single listing |
| Private Advisory | `/concierge` | Lead intake |
| Property editor | `/properties/admin` | Operator publishing (auth) |
| Change Console | `/change` | Programme control plane |
| Login | `/login` | Tenant session boundary |

### 3.2 CorpFlowAI `/change` control plane (Lux)

| Capability | Issue / PR | Status |
|------------|------------|--------|
| Create ticket discoverability | #523, PR #524 | Merged — verify live |
| Withdraw / cancel open tickets | #523, PR #524 | Merged — verify live |
| Create-draft isolation | #525 | Merged |
| Desk contrast + Jan email code | #526 | Merged |
| Concierge chrome + notify prefs + handoff Groq | #527 | Merged |
| Approve-build failure / opaque errors | #528, PR #530 | Fix pending merge/deploy |
| Notification prefs UI | #527 | Merged — prefs in `tenant_personas.persona_json` |
| Groq handoff context | #527 | Requires Drive sync to `artifacts/luxe-maurice-ai-handoff/` |

### 3.3 Client Drive packages

| Source | Location | Intended use in recovery |
|--------|----------|---------------------------|
| AI codebase v1–v14 | [Drive folder](https://drive.google.com/drive/folders/1DvxP5eU0KgVGLV5vYC2RkI4ZEggU-6Ju?usp=drive_link) | Audit input — **not** auto-merged to production |
| Earlier handoff mirror | [luxemaurice-ai-handoff](https://drive.google.com/drive/folders/1CdKzjZApEn1ztChkDVxtfHkXp9dkpFkJ?usp=drive_link) | Groq refinement context (#527); reference only |
| v13 handover | Inside v1–v14 folder | QA tests, migration order, quote request, remaining human work |
| v14 enterprise | Inside v1–v14 folder | Architecture/API/security — informs MVP cut line, not Phase 1 build |

### 3.4 In-repo programme docs (canonical for CorpFlow delivery)

- `docs/LUX/LUX_DELIVERY_PROGRAMME.md` — phased gates, master ticket truth
- `docs/LUX/LUXEMAURICE_REPOSITIONING_2026_06_11.md` — active direction
- `docs/LUX/LUX_MEDIA_GOVERNANCE.md` — media rules
- `docs/LUX/LUX_PHASE3_FIRST_CRM_SLICE.md` — concierge CRM on `/change`
- `docs/finance/LUXEMAURICE_CHANGE_CONSOLE_QUOTATION_SCOPE_V1.md` — quotation line items (not issued)

### 3.5 Open issues and blockers

| Item | Issue | Owner | Blocker type |
|------|-------|-------|----------------|
| Recovery programme control | **#529** (this plan) | Anton + Cursor | Governance |
| Approve-build / Proceed | #528, PR #530 | Cursor | Control plane |
| Create/withdraw regression watch | #523 (closed) | Operator | Verification |
| Jan email live proof | — | Operator + n8n | Comms gate |
| ERPNext quotation | — | Anton / finance | Commercial gate |
| v1–v14 full audit | TBD child of #529 | Cursor | Scope reconciliation |
| First real published listing | Programme §8 | Jan + operator | MVP content |
| `billing_exempt` production state | Script ready | Anton | Commercial |

---

## 4. Work breakdown structure (WBS)

| ID | Workstream | Purpose |
|----|------------|---------|
| **R0** | Recovery governance & client expectation reset | Single programme parent (#529), stop reactive mode, recovery comms |
| **R1** | Current-state audit & technical baseline | Live URLs, repo, Drive v1–v14, gap matrix |
| **R2** | Productized MVP definition | One signed MVP scope; v13/v14 mapped to in/out |
| **R3** | Data & listing readiness | Structured properties, media, migration order |
| **R4** | Website / listings / buyer journey | Public surfaces aligned to MVP |
| **R5** | CRM & developer upload workflow | Concierge → CRM → property editor → publish |
| **R6** | AI scoring & approval controls | Groq refiner, estimate, ethical gate, human approve |
| **R7** | Email / WhatsApp notification controls | Verified routes; no uncontrolled send |
| **R8** | Executive dashboard | Operator/client visibility (MVP slice) |
| **R9** | Portal & commercial access preparation | Login, roles, billing posture, quotation |
| **R10** | Security / tenant boundary / compliance | Lux-only gates, audit, docs |
| **R11** | Launch readiness & client handover | QA pack from v13, training, sign-off |

**Dependency rule:** R0 → R1 → R2 before significant R3–R11 build. R5 depends on R3 + stable R1 control plane.

---

## 5. Prioritization rationale

**Why the first work is not “more features”:**

1. **Trust precedes features** — The client already has an alternative design; shipping another partial UI without a plan increases churn risk.
2. **Control plane precedes expansion** — `/change` is how CorpFlow proves managed delivery; Proceed/approve-build failure blocks the entire narrative.
3. **Reconciliation precedes build** — v14 describes an enterprise platform; building without MVP cut-line repeats slow delivery.
4. **Verify before comms** — Email to Jan and ERPNext quotation are **gates**; sending or quoting before proof damages credibility further.
5. **Smallest client-visible slice** — First MVP chunk must be something Jan can **see and approve** (e.g. one real curated listing end-to-end), not internal refactors.

**Priority order:**

1. Regain client control and trust (R0)
2. Stabilize `/change` as control plane (R1 + #528)
3. Reconcile scope (R1 + R2)
4. Define MVP (R2)
5. Build smallest valuable slice (R3 + R4 + R5 subset)
6. Expand (R6–R11)

---

## 6. Sequential delivery chunks

### Chunk 0 — Recovery control (this document)

| Field | Value |
|-------|--------|
| **Objective** | Establish #529 as parent; stop fragmented reactive work |
| **Inputs** | #529 brief, issues #523–#528, Drive links, programme docs |
| **Tasks** | Publish this WBS; open child issues; align operators |
| **Verification** | PR merged; Anton acknowledges plan |
| **Acceptance** | Anton can answer “what’s next for Lux?” from one doc |
| **Anton gate** | Approve plan before Chunk 1 execution |
| **Client-facing** | Internal only |
| **Dependencies** | None |

### Chunk 1 — Control plane stabilization

| Field | Value |
|-------|--------|
| **Objective** | `/change` supports trustworthy create → estimate → proceed path |
| **Inputs** | PR #530; production deploy approval |
| **Tasks** | Merge/deploy #530; live verify Proceed; smoke `npm run smoke:change-overflow` |
| **Verification** | Delivery Reality Audit on `lux.corpflowai.com/change`; no generic “Approve build failed” |
| **Acceptance** | Proceed succeeds OR shows explicit operator-safe reason; #528 closable |
| **Anton gate** | Production deploy approval |
| **Client-facing** | Internal demo optional |
| **Dependencies** | Chunk 0 approved |

### Chunk 2 — Current-state audit (v1–v14 + live tenant)

| Field | Value |
|-------|--------|
| **Objective** | Single gap matrix: CorpFlow live vs client packages |
| **Inputs** | Drive v1–v14 download; live URL checklist; repo map |
| **Tasks** | Child issue: full audit; produce `docs/LUX/LUXEMAURICE_RECOVERY_AUDIT_V1.md` (future) |
| **Verification** | Audit doc reviewed by Anton; no secrets in repo |
| **Acceptance** | Every v13/v14 module tagged: adopt / adapt / defer / reject |
| **Anton gate** | Audit sign-off |
| **Client-facing** | Internal only |
| **Dependencies** | Chunk 1 |

### Chunk 3 — Productized MVP definition

| Field | Value |
|-------|--------|
| **Objective** | One-page MVP: in-scope surfaces, data, roles, success metrics |
| **Inputs** | Audit; repositioning docs; v13 QA acceptance tests |
| **Tasks** | MVP scope doc; map v13 QA to CorpFlow routes |
| **Verification** | MVP doc linked from #529 |
| **Acceptance** | Explicit non-goals listed; Jan-facing summary draft ready |
| **Anton gate** | MVP scope approved before build chunks |
| **Client-facing** | Recovery note draft (not sent until Chunk 4 gate) |
| **Dependencies** | Chunk 2 |

### Chunk 4 — Client recovery communication (Jan)

| Field | Value |
|-------|--------|
| **Objective** | Reset expectations without overpromising |
| **Inputs** | MVP doc; honest delivery state |
| **Tasks** | Draft recovery note; Anton edit; optional call with Jan |
| **Verification** | Anton approves text before send |
| **Acceptance** | Client understands MVP, timeline, and single delivery track |
| **Anton gate** | **Required before send** |
| **Client-facing** | Yes — email or call |
| **Dependencies** | Chunk 3 |

### Chunk 5 — Data & listing readiness pack

| Field | Value |
|-------|--------|
| **Objective** | First real listing ready in editor (structured, media governed) |
| **Inputs** | v13 migration order; Jan-approved content |
| **Tasks** | Listing schema checklist; media upload → review → link |
| **Verification** | One listing draft in `/properties/admin`; not public until publish gate |
| **Acceptance** | Operator can complete v13 QA subset for one property |
| **Anton gate** | Content + publish approval |
| **Client-facing** | Preview URL for Jan |
| **Dependencies** | Chunk 3 |

### Chunk 6 — MVP Chunk 1 build (first client-visible slice)

| Field | Value |
|-------|--------|
| **Objective** | **One** curated private opportunity live end-to-end |
| **Inputs** | Chunk 5 data; brand doctrine |
| **Tasks** | Publish listing; verify `/properties`, `/property/[slug]`, concierge path |
| **Verification** | Live GET checks; programme §8 partial closure evidence |
| **Acceptance** | Jan recognizes listing; no placeholder inventory |
| **Anton gate** | Production publish approval |
| **Client-facing** | Yes — public listing |
| **Dependencies** | Chunks 1, 5 |

### Chunk 7 — Notification route verification

| Field | Value |
|-------|--------|
| **Objective** | Prove `lux_ticket_update` email before Jan test |
| **Inputs** | n8n workflow; `CORPFLOW_COMMUNICATIONS_V1.md` |
| **Tasks** | Add/route n8n branch; test ticket create/withdraw |
| **Verification** | Inbox proof; telemetry; no duplicate spam |
| **Acceptance** | Jan test only after this chunk green |
| **Anton gate** | Send test to Jan |
| **Client-facing** | Yes — transactional email |
| **Dependencies** | Chunk 1; not blocking Chunk 6 |

### Chunk 8 — ERPNext quotation (manual creation pack)

| Field | Value |
|-------|--------|
| **Objective** | Issued quotation/pro-forma exists (sandbox or manual PDF) |
| **Inputs** | `LUXEMAURICE_CHANGE_CONSOLE_QUOTATION_SCOPE_V1.md` |
| **Tasks** | Operator creates Quotation in ERPNext sandbox OR manual pro-forma |
| **Verification** | Document ID recorded in #529; not in git secrets |
| **Acceptance** | Anton has shareable quote link/PDF for Jan |
| **Anton gate** | Required before client send |
| **Client-facing** | Yes — commercial |
| **Dependencies** | MVP scope stable (Chunk 3) |

### Chunks 9–12 (30–90 day horizon)

- **Chunk 9** — CRM + developer upload workflow hardening (R5)
- **Chunk 10** — AI scoring & approval UX (R6)
- **Chunk 11** — Executive dashboard MVP (R8)
- **Chunk 12** — Launch readiness + v13 QA full pass (R11)

Each follows the same template: objective → inputs → tasks → verification → acceptance → Anton gate → client vs internal → dependencies. Detailed task lists live in child issues under #529.

---

## 7. Approval and governance model

| Stage | Who | What happens |
|-------|-----|----------------|
| **Internal review** | Cursor / implementer | PR + tests + preview evidence |
| **Preview verification** | Anton or delegate | Live or Vercel preview; smoke scripts where required |
| **Anton approval** | Anton | Merge + production deploy + client comms |
| **Optional client callback** | Jan | Demo MVP slice; no new scope without #529 update |
| **Production approval** | Anton explicit | Vercel Production deploy; record deployment ID + commit |
| **Post-deploy validation** | Operator | Delivery Reality Audit; client URLs; close child issue |

**Hard stops (no bypass):**

- Production deploy
- Env / secrets / DNS
- DB schema migration
- WhatsApp / SMS / bulk email
- ERPNext production invoice
- Public launch / marketing push
- Ingesting client Drive code into runtime without Chunk 2–3 authorization

**Tenant boundary:** Lux work stays on `luxe-maurice` / `lux.corpflowai.com`. Core factory actions remain on Core host / factory master session unless existing governance already permits.

---

## 8. Immediate 48-hour recovery plan

| Hour block | Action | Owner |
|------------|--------|-------|
| **0–8h** | Merge this WBS PR; link #529; open child issues (§11) | Cursor |
| **0–8h** | **Stop** random Lux feature PRs not tied to a chunk | All |
| **8–24h** | Review/merge PR #530; deploy with Anton approval; verify Proceed on production | Cursor + Anton |
| **8–24h** | Live re-verify #523 create/withdraw on `/change` | Operator |
| **24–48h** | Start Chunk 2 audit outline (Drive inventory checklist) | Cursor |
| **24–48h** | Draft Jan recovery note **internal only** — not sent | Cursor + Anton |
| **24–48h** | Define MVP Chunk 1 candidate (one listing) with Jan input | Anton |
| **Do not** | Jan email test until Chunk 7 | — |
| **Do not** | Present ERPNext quotation until Chunk 8 artefact exists | — |

---

## 9. 30 / 60 / 90-day recovery plan

### 30 days — Control + baseline + MVP definition

- #529 children open; Chunks 0–3 complete
- `/change` control plane stable (Chunk 1)
- v1–v14 audit doc (Chunk 2)
- Signed MVP scope (Chunk 3)
- Jan recovery note sent (Chunk 4)
- Listing readiness started (Chunk 5)
- Notification + quotation gates **scheduled**, not rushed

### 60 days — First valuable slice in production

- **One** real curated listing published (Chunk 6)
- CRM → editor → publish path demonstrated to Jan
- Preview/production smoke green for `/change`
- Executive dashboard **spec only** unless MVP scope expands
- Email route verified (Chunk 7) before broader comms automation

### 90 days — Controlled MVP launch

- Buyer journey complete for MVP listings set (not full catalogue)
- Approval-based communications (email; WhatsApp only if separately authorized)
- Executive dashboard MVP (operator-facing first)
- v13 QA subset passed on production
- Operational handover pack for Jan (editor + `/change` + concierge)
- Programme master ticket §8 gates re-evaluated with evidence

**Honesty clause:** Dates slip if audit reveals large v13/v14 divergence or client changes scope. Update #529 and this doc — do not silently narrow MVP.

---

## 10. Deferred / non-goals

Explicitly **out of MVP** unless Anton opens a new authorised chunk:

- Mobile app
- Blockchain / tokenization
- Franchise system
- Broad third-party portal integrations (Rightmove, etc.)
- IDX / MLS feeds (unless strategic decision reverses repositioning)
- Advanced automation (unattended AI publish, bulk outreach)
- Uncontrolled WhatsApp / SMS / email campaigns
- Uncontrolled ERPNext billing automation / production invoicing
- Owner Experience Portal full build (pillar 5 — future)
- Second production app or second production database
- Merging client Drive repo wholesale into CorpFlow runtime without audit

---

## 11. Follow-up issue map (proposed children of #529)

| Child issue (proposed title) | Maps to | Notes |
|----------------------------|---------|--------|
| Fix `/change` approve-build failure | #528, PR #530, Chunk 1 | Close when live verified |
| Confirm `/change` create/withdraw flow | #523, Chunk 1 | Regression watch |
| Full v1–v14 client codebase audit | Chunk 2 | Docs-only output first |
| Productized MVP scope reconciliation | Chunk 3 | Requires audit |
| Client data/listing readiness pack | Chunk 5 | Jan content dependency |
| Lux MVP Chunk 1 build plan | Chunk 6 | After MVP sign-off |
| Jan client recovery communication draft | Chunk 4 | Anton approves send |
| Notification / n8n `lux_ticket_update` verification | Chunk 7 | Before Jan email test |
| ERPNext quotation manual creation pack | Chunk 8 | Scope doc exists |
| Executive dashboard MVP spec | Chunk 11 / R8 | 60–90 day |
| v13 QA acceptance test mapping | Chunk 2–3 | Traceability matrix |

**Issue creation discipline:** Each child links to #529, cites WBS ID (R0–R11) and chunk number, and states client-facing vs internal outcome.

---

## Governance statement (this PR)

- **Planning / control only** — no runtime changes authorized by this document alone.
- **No production deploy performed** as part of this doc PR.
- **No env/secrets changed.**
- **No DB/schema change performed.**
- **No WhatsApp/SMS/email runtime triggered.**
- **No ERPNext quotation created.**
- **No client outreach performed.**

---

## Related links

- Parent issue: [https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/529](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/529)
- Change Console quotation scope (unissued): `docs/finance/LUXEMAURICE_CHANGE_CONSOLE_QUOTATION_SCOPE_V1.md`
- Delivery programme: `docs/LUX/LUX_DELIVERY_PROGRAMME.md`
- Client Drive v1–v14: [https://drive.google.com/drive/folders/1DvxP5eU0KgVGLV5vYC2RkI4ZEggU-6Ju?usp=drive_link](https://drive.google.com/drive/folders/1DvxP5eU0KgVGLV5vYC2RkI4ZEggU-6Ju?usp=drive_link)
