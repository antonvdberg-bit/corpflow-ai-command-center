# Living Word Mauritius — Tuesday demo readiness plan + delivery board (v1)

**Status:** Docs-first plan only. **No runtime code, no production deploy, no env/secrets, no DB/schema, no WhatsApp/SMS/email send runtime, no payment, no paid tool, no public client-facing launch.**
**Tenant:** `living-word-mauritius` **only**.
**Owner:** Anton (operator) for every hard gate; Cursor for docs/PR execution.
**Created:** 2026-06-30.
**Demo date:** **Tuesday 7 July 2026** (2026-07-07) — confirmed by Anton, 2026-06-30.
**Command log:** GitHub issue [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (live). Doctrine reference: [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493). Recovery stocktake: [#507](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/507).
**Anchor sentinel:** `<!-- LIVING_WORD_TUESDAY_DEMO_READINESS_V1 -->`

<!-- LIVING_WORD_TUESDAY_DEMO_READINESS_V1 -->

## 0. One-paragraph reality

Most of the Tuesday demo **already exists and is live-verified on the sandbox**. The demo site (`/site-preview`), the guided chatbot v0 (8 paths), the DB-backed approved schedule, and the retrieval-AI v1 layer are all built and verified on `living-word-mauritius.corpflowai.com`. The Member Update Flow v1 (PR #482) is built admin-gated with synthetic data, **DB migration not applied** (gate). This plan therefore **assembles a demo from existing assets** and refines copy/UI — it does **not** build a new system. The risk is over-building under time pressure; the discipline is to keep Tuesday to a small, real, controlled-demo scope.

This plan **reuses and cross-links** the existing Living Word material under `artifacts/quality-audits/2026-06-11-living-word-mauritius/` (notably `demo-ready-sandbox-activation.md`, `member-update-flow-v1-sandbox-implementation-packet.md`, `retrieval-ai-v1-live-verification.md`, `member-update-flow-schema-form-design-v1.md`). Where this plan disagrees with a canonical doc or gate, **the canonical doc/gate wins**.

---

## 1. Tuesday demo objective

**What Anton must be able to present to the church by Tuesday:** a working, recognisable Living Word Mauritius experience on CorpFlow's sandbox that shows (a) a branded church site, (b) an approved, accurate service schedule, (c) a guided chatbot that answers common questions safely, and (d) the *shape* of a member-update / contact-update workflow with admin review — all clearly marked as a test environment, on the church's own tenant.

| Capability | Must be REAL by Tuesday | Acceptable as DEMO/MOCK |
|---|---|---|
| Branded demo site (`/site-preview`) | **Real** — already live (visual facsimile + orange TEST ribbon) | — |
| Approved schedule (Sunday service) | **Real** — 1 DB-backed approved row | Additional services may be shown as "pending approval" mock copy |
| Guided chatbot (8 paths) | **Real** — live-verified flow v2 | — |
| Retrieval-AI answer ("where/when") + safety refusal | **Real** — verified (PR #425) | Keep budget-capped; do not widen scope |
| Member/contact update flow | **Demo** — admin-gated, **synthetic data only**, operator-review shape | Form walkthrough with seeded test records; no real member data |
| Forms (member update, contact, etc.) | Member-update form **real (synthetic)**; others **mock copy** | Show the form shape, not live persistence |
| Notifications / export | **Mock** — narrate the manual operator loop | No real sends |

**Scope discipline:** the demo proves *the platform on the church's tenant*, not a finished product. Keep it to the four "real" capabilities above plus the synthetic member-update walkthrough.

---

## 2. Tenant and safety boundary

- **Living Word Mauritius only** (`living-word-mauritius`). No other tenant surface is touched.
- **Admin-gated / controlled-demo only.** The site is a `noindex,nofollow` sandbox with a fixed orange ribbon: *"TEST ENVIRONMENT — Not the live Living Word Mauritius website."* Member-update APIs require an admin `corpflow_session`.
- **No public client-facing launch** without Anton approval (no WordPress embed, no DNS, no GHL cutover).
- **No second app, no second database.** One app, one Postgres (`POSTGRES_URL`). The Living Word tenant surface stays separate from Core and CorpFlowAI business systems.
- **Host gate preserved:** `/site-preview` returns 404 on `lux.*` and `core.*` — LWM host only.
- **No real member data** in the demo (see §5). Synthetic seed only.

---

## 3. Demo site scope

### 3.1 Minimum demo surfaces (all already exist)

| Surface | URL | State | Source |
|---|---|---|---|
| Demo site | `https://living-word-mauritius.corpflowai.com/site-preview` | **Live (sandbox)** | `demo-ready-sandbox-activation.md` |
| Approved schedule block | same page | **Live** — 1 approved DB row (Sunday service) | `schedule-source-v1-live-verification.md` |
| Guided chatbot widget | loader on the same host | **Live** — flow v2, 8 paths | `demo-ready-sandbox-activation.md` §8 |
| Retrieval-AI answer + safety refusal | chat widget `/ask` | **Live-verified** | `retrieval-ai-v1-live-verification.md` |
| Member Update Flow (admin) | `/living-word-member-update.html` + admin APIs | **Built, synthetic, admin-gated** | PR #482 packet |

### 3.2 What already exists from the Member Update Flow v1 pilot (PR #482)

- Two-step **identify → confirm/update** form on the Living Word tenant route, admin-session gated.
- Match on synthetic seed (email → phone → name) returning `matched` / `unconfirmed` / `ambiguous`.
- Field allowlist/denylist enforced (no youth, prayer, medical/legal/financial, donation, business-network, free-text notes).
- Operator-review payload with `canonical_write: false` (no blind overwrite); `consent_acknowledged` required.
- 23 unit tests; `npm test` green at build time. **DB migration proposed but NOT applied** (gate).

### 3.3 What still needs building/refinement before Tuesday (small)

| Item | Type | Needed for Tuesday? |
|---|---|---|
| Demo copy polish on `/site-preview` (service-time wording, WordGroups, Business Network placeholders → approved wording) | Docs/copy + admin-gated UI | **Should-have** |
| Member-update form **preview smoke** with admin session (identify synthetic → submit → review payload) | Preview verification | **Must-have** (proves the walkthrough) |
| Demo script (the exact click path Anton follows) | Docs | **Must-have** — `docs/LIVING_WORD/LIVING_WORD_TUESDAY_DEMO_SCRIPT_V1.md` (demo date 2026-07-07) |
| GHL legacy field map (onboarding + update phases) | Docs | **Must-have** — `docs/LIVING_WORD/LIVING_WORD_GHL_LEGACY_ONBOARDING_AND_UPDATE_FIELD_MAP_V1.md` |
| Additional approved schedule rows | Operator (pastor-approved only) | Nice-to-have; do **not** approve unverified fixtures |
| Any new page/section | — | **No** — out of scope for Tuesday |

---

## 4. Chatbot scope

### 4.1 What the chatbot demonstrates by Tuesday

- **Guided assistant (flow v2):** 8 deterministic starter paths — Service times, Find us, Prayer, Contact, Volunteer, WordGroups, Youth/Children, Business Network.
- **Retrieval-AI answer (budget-capped):** a real "where/when" question answered from **approved atoms/schedules only**, plus a **safety refusal** on an emergency/clinical prompt. Already verified (PR #425).
- **Trust message:** "answers come only from approved church content," not open-ended AI.

### 4.2 Demo chatbot vs production chatbot

| Layer | Tuesday | Production (later, gated) |
|---|---|---|
| Guided/scripted assistant (FAQ paths) | **Yes** — live | Yes |
| Retrieval-AI over approved atoms (budget cap) | **Yes** — sandbox, capped | Yes, after copy + budget sign-off |
| Unrestricted/open AI | **No** | **No** (not planned) |
| External embed (WordPress) | **No** | Separate authorised packet |
| Outbound messaging from chat | **No** | Separate gate (A-sends) |

### 4.3 Hard gates before any real external church/member chatbot launch

1. Owner/board copy sign-off on flow + retrieval wording.
2. Approved knowledge atoms + schedule rows only (no unverified fixtures).
3. AI budget cap confirmed; kill-switch (`ai_enabled`) verified.
4. WordPress embed = separate authorised packet (no DNS/embed in this lane).
5. **No WhatsApp/SMS/email runtime or external sends** — none in scope here.

---

## 5. Data onboarding plan

### 5.1 Data needed for the demo

- 1+ **approved schedule row** (Sunday service — already present).
- A small set of **synthetic member records** for the member-update walkthrough (already seeded in-memory: `test.alpha@example.test`, etc.).
- Approved **knowledge atoms** for retrieval answers (already verified).

### 5.2 Acceptable demo data vs real church/member data

| Data | Demo (Tuesday) | Real (gated) |
|---|---|---|
| Schedule rows | Pastor-approved real rows OR clearly-marked pending mock | Pastor-approved only |
| Member records | **Synthetic seed only** | Real import behind `GATE-PILOT` + `GATE-PRIVACY` |
| Knowledge atoms | Approved church content | Approved church content |
| GHL contacts (642 live) | **Read-only probe already done; NO import** | Import only after privacy + pilot gates |

### 5.3 Safe intake/import checklist (for the demo — synthetic only)

- [ ] Use synthetic seed records only; no real names/emails/phones in repo or artifacts.
- [ ] No GHL writes, no GHL contact import, no canonical overwrite.
- [ ] `consent_acknowledged` required on any submit path shown.
- [ ] Operator review (`canonical_write: false`) on every update.
- [ ] **No production DB/schema change** — the Member Update Flow DB migration stays **un-applied** unless Anton separately approves the proposed SQL.
- [ ] No secrets, no real member data, in any commit or screenshot.

---

## 6. Forms required

| Form | Purpose | Tuesday | Notes |
|---|---|---|---|
| **Member update form** | Confirm/update member contact + classification | **Must-have (synthetic)** | Built in PR #482; allowlist enforced |
| Contact update | Update email/phone/preferred comms | **Must-have** — covered by member-update fields | Same form, identify path |
| Family / household | Link household members | **Later** | Not in v1 allowlist |
| Ministry / group interest (WordGroups) | Express interest in a group | **Mock copy for Tuesday** | Chatbot path exists; structured form later |
| Prayer / support request | Submit prayer/pastoral request | **Mock copy only** | Chatbot shows disclaimer; **no free-text capture in v1** |
| Volunteer / service interest | Express willingness to serve | **Mock copy / chatbot path** | `ready_to_serve` boolean exists in allowlist |
| Admin review (operator) | Review submitted updates before canonical write | **Must-have (shape)** | Operator-review payload exists; narrate the loop |

**Must-have for Tuesday:** member/contact update form (synthetic) + admin-review shape. Everything else is mock copy or chatbot-path-only and deferred to later packets.

---

## 7. Workflow map

```
[member/contact form submitted (synthetic)]
        │  admin-gated; consent_acknowledged required
        ▼
[operator review]  ── canonical_write:false; blank-overwrite-safe diff
        │
        ▼
[update / approval decision]  ── operator approves or rejects
        │
        ▼
[notification / export / reporting]  ── MANUAL for Tuesday (narrate); no real sends
```

| Step | Tuesday | Later (gated) |
|---|---|---|
| Form submitted | Real (synthetic data) | Real member data behind gates |
| Operator review | Real shape (review payload) | Same, at scale |
| Update / approval | **Manual** (no canonical write) | Canonical write after DB gate + approval |
| Notification / export | **Manual narration** | Internal-only automation after approval; **no external sends without Anton** |

**Automation stays internal-only** (operator workflow registry / `automation_events`) and only after approval. No external outbound in this lane.

---

## 8. Factory and `/change` relationship

- **How Living Word change requests should relate to Factory/`/change`:** because Living Word is a **client tenant**, client-visible change requests (new approved schedule, copy sign-off, chatbot wording, eventual public launch) should be represented as **CMP tickets** so `/change` shows the church a truthful workflow-state and the delivery verdict (`delivery-reality.mdc`) gates "Closed". This mirrors the finding in `docs/operations/AUTONOMOUS_THROUGHPUT_RECOVERY_AND_STOCKTAKE_V1.md` §8.
- **Are we bypassing/duplicating?** Today the Living Word pilot work has run as **internal delivery** (Cursor PRs + artifacts under `quality-audits/`), **not** through CMP/`/change`. That was right for sandbox R&D, but as Living Word moves toward a client-facing demo and launch, client-relevant changes should flow through CMP to avoid an off-ledger parallel track. We are **not** running a second control plane — we are **under-using CMP** for this tenant.
- **Smallest safe alignment step:** when the church gives demo feedback that becomes a client deliverable (e.g. "approve these service times," "sign off chatbot copy," "go live on WordPress"), open a **single CMP ticket** for that deliverable so `/change` + the delivery verdict track it. Keep **internal sandbox R&D** (synthetic data, plumbing) on #249 + artifacts. Do **not** retrofit CMP tickets for past sandbox work.

---

## 9. What can proceed WITHOUT Anton

Per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §2 — proceed and report:

- Docs-only PRs (this plan, demo script, copy drafts).
- Demo copy / wording refinement (service times, WordGroups, Business Network placeholders → approved wording — as drafts for owner sign-off).
- Admin-gated UI refinement (member-update form layout/labels) on a branch + Preview.
- Mock/demo data structure (synthetic seed shapes).
- Workflow maps and packet drafts.
- Non-runtime planning.
- Preview-only verification (admin-session smoke of the member-update form; read-only re-probe of `/site-preview` + chatbot).

## 10. What requires Anton

Per AAP §3 / Parallel Execution Board §7 — stop and ask:

- Production deploy / promote (any merge to a live surface).
- **Public client/church launch** (WordPress embed, DNS, GHL cutover).
- **Real member-data import** (`GATE-PILOT` + `GATE-PRIVACY`).
- **DB/schema** change (the Member Update Flow migration SQL stays un-applied until approved), env, secrets.
- **WhatsApp/SMS/email send runtime** or any external send.
- Payment or paid tools.
- Any **client-facing promise** (timelines, guarantees, go-live commitments).
- Merging any PR (Anton owns every merge).

---

## 11. Next 48-hour execution board

| Lane | Owner | Next action | Output expected | Hard gate | Anton needed |
|---|---|---|---|---|---|
| **Demo readiness plan (this doc)** | Cursor | Ship this docs PR; digest to #249 | Merged plan + board | Merge | Yes (merge only) |
| **Demo script** | Cursor | Write step-by-step demo runbook (reuse `demo-ready-sandbox-activation.md` §9) | Docs PR — exact click path | Merge | Yes (merge only) |
| **Member-update Preview smoke** | Cursor | Admin-session walkthrough on Preview (identify synthetic → submit → review payload) | Verified walkthrough notes | Preview only (no prod, no DB) | No (until merge/deploy) |
| **Demo copy refinement** | Cursor → Anton/owner sign-off | Draft approved-wording copy (services, WordGroups, Business Network) | Copy draft for sign-off | Owner sign-off before live | Yes (sign-off) |
| **Schedule rows** | Anton/pastor | Approve any additional real service rows | Approved DB rows | Pastor approval + DB | Yes |
| **Demo-morning verification** | Cursor | Re-probe `/site-preview` + chatbot + loader header; post "demo-ready" to #249 | One-line live confirmation | Read-only | No |
| **Demo-morning date** | — | **2026-07-07** | Re-probe on morning of 7 July | — | — |
| **CMP alignment (when feedback lands)** | Cursor | Open one CMP ticket for the first client deliverable | CMP ticket + `/change` row | Per §8 | At deliverable |

WIP stays within the Parallel Execution Board caps (≤2 open Cursor PRs).

---

## 12. PR sequence after this docs packet

Bounded, smallest-first. Each is a separate PR; none self-merges.

1. **PR A — Demo script (docs-only).** `docs/LIVING_WORD/LIVING_WORD_TUESDAY_DEMO_SCRIPT_V1.md` — exact click path, fallback if a surface is down, talking points (demo date **2026-07-07**). *Shipped in follow-up PR after #509.*
2. **PR A2 — GHL legacy field map (docs-only).** `docs/LIVING_WORD/LIVING_WORD_GHL_LEGACY_ONBOARDING_AND_UPDATE_FIELD_MAP_V1.md` — Phase 1 onboarding vs Phase 2 update workflow + operator field list mapped to Tuesday allowlist. *Shipped in same PR.*
3. **PR B — Demo copy refinement (admin-gated UI + copy).** Polish `/site-preview` placeholder wording → approved wording (draft, behind owner sign-off). *Small, low-risk; Preview-verified; Anton merges + owner signs off copy.*
4. **PR C — Member-update form demo refinement (admin-gated).** Label/layout polish + synthetic-seed walkthrough hardening; **no DB, no canonical write**. *Preview smoke required; Anton merges.*
5. **PR D — Demo content / mock-data structure (docs + synthetic seed).** Document the synthetic record set + mock form copy for the deferred forms (family/household, ministry interest, prayer, volunteer). *Docs/seed only; no real data.*

(Chatbot needs **no** new PR for Tuesday — it is already live-verified. A future "retrieval copy sign-off" PR is gated on owner approval, not Tuesday.)

---

## 13. Boundaries (carried from the request + operator rules)

- Docs-first PR. No runtime code in this PR beyond a cross-link/index change.
- No production deploy, no env/secrets, no DB/schema, no WhatsApp/SMS/email send runtime, no payment, no paid vendor/tool, no public client-facing launch, no self-merge.
- Living Word Mauritius tenant only; Core and CorpFlowAI business systems stay separate.
- One app, one Postgres. No second app, no second database.
- Reuse existing repo patterns/docs before inventing structure.

---

## 14. Cross-references

- `docs/LIVING_WORD/LIVING_WORD_TUESDAY_DEMO_SCRIPT_V1.md` — Tuesday demo click-path (2026-07-07).
- `docs/LIVING_WORD/LIVING_WORD_GHL_LEGACY_ONBOARDING_AND_UPDATE_FIELD_MAP_V1.md` — GHL Phase 1/2 + operator field list → CorpFlow allowlist.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/demo-ready-sandbox-activation.md` — current demo posture + rollback (primary reuse).
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/member-update-flow-v1-sandbox-implementation-packet.md` — Member Update Flow v1 build (PR #482) + gates.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/member-update-flow-schema-form-design-v1.md` — form schema + field allowlist/denylist.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/member-update-flow-v1-db-migration-proposal-v1.md` — DB migration **gate** (not applied).
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/retrieval-ai-v1-live-verification.md` — retrieval-AI v1 (PR #425) verification.
- `artifacts/quality-audits/2026-06-11-living-word-mauritius/pilot-privacy-consent-notice-draft-v1.md` — privacy/consent gate.
- `docs/operations/AUTONOMOUS_THROUGHPUT_RECOVERY_AND_STOCKTAKE_V1.md` §6 + §8 — recovery stocktake's Living Word demo path + Factory alignment.
- `docs/operations/PARALLEL_EXECUTION_BOARD_V1.md` — lanes / WIP / hard gates.
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — §2 allowed / §3 Anton-only.
- `.cursor/rules/delivery-reality.mdc` — only **live verified** is `COMPLETE`.

---

## 15. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs-first; nothing to deploy, nothing to live-verify (no surface changed by this PR).
- **Implementation:** none. No runtime code, no env, no secrets, no DB, no `POSTGRES_URL`, no DNS, no second app/database, no paid tool, no external send.
- **Verdict:** PARTIAL by design — the demo readiness plan + 48-hour board + PR sequence are documented; the demo itself runs on already-live sandbox assets; client-facing launch and real-data steps stay gated on Anton.
- **Decision provenance:** dispatched on #249 (2026-06-30); doctrine ref #493; recovery ref #507. This status block is the in-repo decision record.
