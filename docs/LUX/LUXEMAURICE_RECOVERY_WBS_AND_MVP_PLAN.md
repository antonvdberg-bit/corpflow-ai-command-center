# LuxeMaurice Recovery — WBS and Phased MVP Delivery Plan

**Status:** Docs / planning / control only. **NO IMPLEMENTATION AUTHORIZED** by this file alone unless Anton separately approves a delivery chunk.
**Parent control issue:** [GitHub #529](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/529)  
**Tenant:** `luxe-maurice` · **Production host:** [https://lux.corpflowai.com](https://lux.corpflowai.com) · **Control plane:** [https://lux.corpflowai.com/change](https://lux.corpflowai.com/change)  
**Last updated:** 2026-07-07

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

### Current control state (2026-07-07)

| Item | Current state | Recovery implication |
|------|---------------|----------------------|
| Parent programme | #529 remains **open** and is the only active LuxMaurice parent | All Lux recovery work must link back here |
| Prior `/change` blockage | #523 is **closed** | Create/withdraw stays on regression-watch, not a new feature stream |
| Concierge `/change` chrome / notification prefs | PR #527 is **merged** | Notification delivery remains unverified until n8n/inbox proof exists |
| Approve-build blocker | #528 is **closed** via PR #530 | Next gate is production/preview validation that the operator sees a useful safe reason or a valid Proceed path, not a generic banner |
| Audit and MVP reconciliation | #536 and #537 are **closed** with docs-only outputs | Treat `LUXEMAURICE_RECOVERY_AUDIT_V1.md` and `LUXEMAURICE_MVP_SCOPE_RECONCILIATION_V1.md` as current inputs |
| Jan recovery communication | #538 was **closed as not planned** | No client send or recovery note draft proceeds unless Anton explicitly reopens/authorizes it |

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
| Change Console (Lux) | **Improved but not operationally complete** — create/withdraw (#523–#525), concierge chrome (#527), approve-build guard/error-copy fix (#528 / PR #530); valid-state Proceed and smoke evidence remain gates | `https://lux.corpflowai.com/change` |
| Programme master ticket | **Still open** — `cmo8mjijk0000jl04l1jz0v6d` | §8 Reality Gate **PARTIAL** |
| First real client-published listing | **Not done** | Programme gate open |
| Editor E2E on production chrome | **Not fully verified** | Programme gate open |
| Governed public imagery on real listing | **Not done** | Programme gate open |
| Email to Jan on ticket events | **Code merged (#527); route not live-verified; no client send authorized** | n8n `lux_ticket_update` branch TBD |
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
| **Reactive fixes** | #523–#528 addressed symptoms; future work must now be chunked under #529 instead of continuing ad hoc. |
| **Programme vs recovery** | Master ticket + phase docs vs new client redesign — unclear which scope is authoritative until reconciliation. |
| **Data readiness** | Listings/properties not structured for first real published opportunity; placeholder slugs removed from sitemap. |
| **Control plane incomplete** | `/change` Proceed now has improved guard/error copy in repo via #530, but valid-state production/preview evidence still has to be recorded before it is trusted as the control plane. |
| **Comms unverified** | Ticket email + future WhatsApp — code paths exist or are discussed; production delivery is not proven and client sends are on hold. |
| **Commercial gap** | Quotation scope documented; no issued quote — client may perceive billing/delivery misalignment. |
| **Overbuild temptation** | v14 enterprise material describes full platform; MVP must be explicitly smaller. |

### 2.5 What must be reconciled before implementation resumes

1. **Scope authority** — Signed-off MVP definition: which elements come from CorpFlow live tenant, which from v13/v14, what is deferred.
2. **Data model alignment** — Property/listing fields, media buckets, migration order (v13) vs Prisma/CMP attachment model.
3. **Control plane trust** — `/change` must support create → estimate → proceed (approve-build) → audit without generic failures.
4. **Client expectation reset** — Structured Jan-facing plan can be drafted from #537 only after Anton authorizes the communication path; #538 is closed as not planned.
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

**Read-only live snapshot (2026-07-07):** `GET /`, `GET /change`, and `GET /concierge` on `https://lux.corpflowai.com` returned **200 text/html** from this workspace. This proves the public routes respond; it does **not** prove login, Proceed, notification delivery, editor E2E, or publish flow completion.

### 3.2 CorpFlowAI `/change` control plane (Lux)

| Capability | Issue / PR | Status |
|------------|------------|--------|
| Create ticket discoverability | #523, PR #524 | Merged — verify live |
| Withdraw / cancel open tickets | #523, PR #524 | Merged — verify live |
| Create-draft isolation | #525 | Merged |
| Desk contrast + Jan email code | #526 | Merged |
| Concierge chrome + notify prefs + handoff Groq | #527 | Merged |
| Approve-build failure / opaque errors | #528, PR #530 | Issue closed / PR merged; still needs controlled Proceed validation evidence |
| Notification prefs UI | #527 | Merged — prefs in `tenant_personas.persona_json` |
| Groq handoff context | #527 | Requires approved non-secret Drive sync to `artifacts/luxe-maurice-ai-handoff/` before relying on handoff-loaded telemetry |

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

### 3.5 Open issues, closed controls, and blockers

| Item | Issue | Owner | Blocker type |
|------|-------|-------|----------------|
| Recovery programme control | **#529** (this plan) | Anton + Cursor | Governance |
| Approve-build / Proceed evidence | #528 (closed), PR #530 (merged) | Cursor + Anton | Control plane verification |
| Create/withdraw regression watch | #523 (closed) | Operator | Verification |
| Concierge chrome / notification prefs | #527 (merged) | Operator + n8n | Comms gate; delivery unverified |
| Jan recovery communication | #538 (closed not planned) | Anton | Explicit hold; no send |
| ERPNext quotation | — | Anton / finance | Commercial gate; not generated |
| v1–v14 full audit | #536 (closed) | Cursor | Docs-only baseline; line-level Drive supplement still optional |
| MVP scope reconciliation | #537 (closed) | Anton + Cursor | Approval gate before build chunks |
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

### Chunk 1 — Control plane stabilization evidence

| Field | Value |
|-------|--------|
| **Objective** | Prove `/change` supports a trustworthy create → estimate → Proceed path, or blocks with a useful operator-safe reason |
| **Inputs** | #523, #527, #528, PR #530, live Lux session, relevant ticket state |
| **Tasks** | Confirm production contains PR #530; re-test create/withdraw; re-test Proceed in invalid and valid states; run required `/change` smoke when a preview/production check is in scope |
| **Verification** | Delivery Reality Audit on `lux.corpflowai.com/change`; no generic “Approve build failed”; explicit response path captured without secrets |
| **Acceptance** | Proceed succeeds only in a valid approved workflow state OR is disabled/blocked with explicit operator-safe reason; #528 remains closed with evidence attached to #529/child issue |
| **Anton gate** | Any production deploy/redeploy or client-visible demo requires Anton approval |
| **Client-facing** | Internal demo optional |
| **Dependencies** | Chunk 0 approved |

### Chunk 2 — Current-state audit (v1–v14 + live tenant)

| Field | Value |
|-------|--------|
| **Objective** | Single gap matrix: CorpFlow live vs client packages |
| **Inputs** | Drive v1–v14 download; live URL checklist; repo map |
| **Tasks** | Child issue #536 produced `docs/LUX/LUXEMAURICE_RECOVERY_AUDIT_V1.md`; optional supplement only if non-secret Drive artefacts are safely ingested |
| **Verification** | Audit doc exists; no secrets in repo; evidence limits stated |
| **Acceptance** | Major v13/v14 modules tagged adopt / adapt / defer / reject at module level; any deeper line-level reuse waits for a supplement |
| **Anton gate** | Audit sign-off before using Drive material as build input |
| **Client-facing** | Internal only |
| **Dependencies** | Chunk 1 |

### Chunk 3 — Productized MVP definition

| Field | Value |
|-------|--------|
| **Objective** | One-page MVP: in-scope surfaces, data, roles, success metrics |
| **Inputs** | Audit; repositioning docs; v13 QA acceptance tests |
| **Tasks** | Child issue #537 produced `docs/LUX/LUXEMAURICE_MVP_SCOPE_RECONCILIATION_V1.md`; map v13 QA subset to CorpFlow routes as follow-up when content arrives |
| **Verification** | MVP doc linked from #529 and this WBS |
| **Acceptance** | Explicit non-goals listed; “First Real Opportunity” slice is the controlled MVP candidate |
| **Anton gate** | MVP scope approved before build chunks |
| **Client-facing** | Jan-facing section exists in #537 as a source; not sent until a separate Anton gate |
| **Dependencies** | Chunk 2 |

### Chunk 4 — Client recovery communication (Jan) — on hold

| Field | Value |
|-------|--------|
| **Objective** | Reset expectations without overpromising |
| **Inputs** | MVP doc; honest delivery state |
| **Tasks** | **Held** after #538 was closed as not planned; if Anton reopens, draft from #537 with proof/limits and no send until approved |
| **Verification** | Anton approves text before send |
| **Acceptance** | If reopened, client understands MVP, sequencing, proof limits, and single delivery track |
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

This is a control window, not a promise to ship production functionality.

| Window | Action | Owner |
|--------|--------|-------|
| **Now** | Keep #529 as the only active Lux parent; reject new Lux side tracks that do not cite a WBS chunk | Anton + all executors |
| **Now** | Merge/update this WBS packet so the control state reflects #527, #528/#530, #536, #537, and #538 accurately | Cursor |
| **Now** | Use #536 and #537 as the current internal baseline; do not restart a separate planning stream | Cursor + Anton |
| **Next control check** | Verify `/change` create/withdraw and Proceed behavior with PR #530 present; record whether the result is success or explicit operator-safe block | Cursor + Anton |
| **Next control check** | Confirm the first MVP chunk remains **Release 1 — First Real Opportunity** from #537, not v14 wholesale rebuild | Anton |
| **If Anton reopens comms** | Draft a Jan-facing structured plan from #537; keep it internal until Anton approves exact send/call language | Cursor + Anton |
| **Do not** | Send Jan email tests, WhatsApp/SMS, or outreach until Chunk 7 / explicit Anton send gate | — |
| **Do not** | Create or present ERPNext quotation until Chunk 8 / Anton commercial gate | — |
| **Do not** | Deploy, change env/secrets, change DB/schema, or ingest Drive code into runtime from this WBS PR | — |

---

## 9. 30 / 60 / 90-day recovery plan

### 30-day control horizon — Control + baseline + MVP definition

- #529 remains the single recovery parent; old side tracks stay subordinate or closed
- `/change` control plane stable (Chunk 1)
- v1–v14 audit doc accepted as baseline (Chunk 2 / #536)
- Signed MVP scope accepted as build boundary (Chunk 3 / #537)
- Jan-facing communication either remains held (#538) or is reopened with Anton's explicit approval
- Listing readiness starts only against the signed “First Real Opportunity” slice (Chunk 5)
- Notification + quotation gates **scheduled**, not rushed

### 60-day control horizon — First valuable slice in production

- **One** real curated listing published (Chunk 6)
- CRM → editor → publish path demonstrated to Jan
- Preview/production smoke green for `/change`
- Executive dashboard **spec only** unless MVP scope expands
- Email route verified (Chunk 7) before broader comms automation

### 90-day control horizon — Controlled MVP launch

- Buyer journey complete for MVP listings set (not full catalogue)
- Approval-based communications (email; WhatsApp only if separately authorized)
- Executive dashboard MVP (operator-facing first)
- v13 QA subset passed on production
- Operational handover pack for Jan (editor + `/change` + concierge)
- Programme master ticket §8 gates re-evaluated with evidence

**Honesty clause:** These are control horizons, not delivery promises. If audit findings or client scope change the work, update #529 and this doc — do not silently narrow MVP.

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
| Fix `/change` approve-build failure | #528, PR #530, Chunk 1 | Closed; keep evidence under #529 |
| Confirm `/change` create/withdraw flow | #523, Chunk 1 | Regression watch |
| Full v1–v14 client codebase audit | #536, Chunk 2 | Closed docs-only output; optional supplement if Drive is safely ingested |
| Productized MVP scope reconciliation | #537, Chunk 3 | Closed docs-only output; Anton gate still required before build |
| Client data/listing readiness pack | Chunk 5 | Jan content dependency |
| Lux MVP Chunk 1 build plan | Chunk 6 | After MVP sign-off |
| Jan client recovery communication draft | #538, Chunk 4 | Closed not planned; reopen only by Anton |
| Notification / n8n `lux_ticket_update` verification | Chunk 7 | Before Jan email test |
| ERPNext quotation manual creation pack | Chunk 8 | Scope doc exists |
| Executive dashboard MVP spec | Chunk 11 / R8 | 60–90 day |
| v13 QA acceptance test mapping | Chunk 2–3 | Traceability matrix |

**Issue creation discipline:** Each child links to #529, cites WBS ID (R0–R11) and chunk number, and states client-facing vs internal outcome.

---

## Governance statement (this PR)

- **Docs / planning / control only** — no runtime changes authorized by this document alone unless Anton separately approves a delivery chunk.
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
