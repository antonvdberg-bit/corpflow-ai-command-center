# Marketing Collateral Inventory & Brand Hub Mapping (v1)

> **Status:** REFERENCE / INVENTORY — docs-only capture.
> **NO IMPLEMENTATION AUTHORIZED** beyond this document. No runtime code,
> dependencies, env vars, DB schema/migrations/data, Vercel config, GitHub
> settings, routes, deployment, secrets, analytics, or `tenant_id` handling are
> changed by this file.

Authorized by Operator Bridge issue
[#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249)
("Standardized Marketing Mechanism architecture after PR #452 merge" +
"Brand Hub folder structure complete"). Companion to the operating playbook
`docs/marketing-automation-arm.md` (merged via PR #452,
`cdf2dc9271705653c4ebfa6823361c6d44c785cd`).

This document inventories the marketing / sales / brand / collateral assets that
already exist in the repo, maps each to the Google Drive **"CorpFlowAI -
Marketing & Brand Hub"** folder where its human-facing form belongs, marks what
already exists, what needs adaptation for US medspa / Product A, and what is
missing — and proposes the smallest future activation path. It does **not**
duplicate the content of canonical docs; it references them.

---

## 1. Purpose

Consolidate the existing scattered marketing assets into a single standardized
mechanism so the working collateral library (Google Drive Brand Hub) is built by
**copying / summarizing / linking from canonical repo docs**, not by inventing
new collateral. The output is a clear "what we have / what to adapt / what is
missing / where it lives" map, plus a proposal-only future activation path.

---

## 2. Source-of-truth model

| Layer | Role | Authority |
|-------|------|-----------|
| **Repo docs** (`docs/**`) | Doctrine / canonical source of truth. | Wins on brand, copy, claims, quality, outreach rules. |
| **Google Drive "CorpFlowAI - Marketing & Brand Hub"** | Working collateral library for human-facing assets (logos, one-pagers, Vids scripts/exports, templates, onboarding docs, proof). | Working copies; never overrides repo doctrine. |
| **n8n** | Workflow spine (reminders / status / notifications). | Per `docs/marketing-automation-arm.md` §9 — reminders only, no automated cold outreach. |
| **Existing production app + Postgres (`POSTGRES_URL`)** | Possible **future** activation module only. | Proposal only (§9). No second app, no second DB, no CRM build. |

Rule: if Drive and repo disagree, **repo doctrine wins**. Drive holds the
presented / formatted version for humans.

---

## 3. Existing repo collateral inventory

Legend for **Status**: `EXISTS` (usable as-is or near as-is) · `ADAPT`
(exists but needs US medspa / Product A tailoring) · `GAP` (referenced or
needed but not yet present).

### 3.1 Brand, visual standard, identity

| Asset need | Existing repo source | Status | Role |
|------------|----------------------|--------|------|
| Brand identity (palette / type / inventory) | `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` | EXISTS (proposal) | Brand identity proposal. |
| Visual presentation standard | `docs/marketing/CORPFLOW_VISUAL_STANDARD_HUMAN_FIRST_BEAUTY_LAYER.md` | EXISTS | Human-first beauty layer standard. |
| Asset governance (licence/alt/lifecycle) | `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md` | EXISTS | Asset entry/exit contract. |
| Content model | `docs/marketing/CORPFLOW_CONTENT_MODEL.md` | EXISTS | Content structure model. |
| Prompt library (brand-safe generation) | `docs/marketing/CORPFLOW_PROMPT_LIBRARY.md` | EXISTS | Generation prompts. |
| Approved logos (binary) | `public/assets/logos/theme.js` (+ Anton's logos already in Drive `08`) | EXISTS | Logo theme tokens; binaries live in Drive. |
| Visual asset manifests | `data/visual-assets/*.manifest.json` (16 manifests) | EXISTS | Metadata source of truth for visuals. |

### 3.2 Marketing communication doctrine (canonical, non-negotiable)

| Asset need | Existing repo source | Status |
|------------|----------------------|--------|
| Brand / conversion doctrine | `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` | EXISTS |
| Non-negotiable communication standard | `docs/marketing/00_NON_NEGOTIABLE_MARKETING_COMMUNICATION_STANDARD.md` | EXISTS |
| Agent output contract | `docs/marketing/01_AGENT_OUTPUT_CONTRACT.md` | EXISTS |
| Multimodal content playbook | `docs/marketing/02_MULTIMODAL_CONTENT_PLAYBOOK.md` | EXISTS |
| Content atom schema | `docs/marketing/03_CONTENT_ATOM_SCHEMA.md` | EXISTS |
| Delivery quality gate | `docs/marketing/04_DELIVERY_QUALITY_GATE.md` | EXISTS |
| Agent compulsion mechanism | `docs/marketing/05_AGENT_COMPULSION_MECHANISM.md` | EXISTS |

### 3.3 Product A / Lead Rescue wedge

| Asset need | Existing repo source | Status |
|------------|----------------------|--------|
| Marketing Automation Arm operating playbook | `docs/marketing-automation-arm.md` | EXISTS |
| Product A US medspa prompt library | `docs/marketing/PRODUCT_A_US_MEDSPA_PROMPT_LIBRARY.md` | EXISTS |
| AI Lead Rescue first-paid-pilots launch pack | `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` | EXISTS |
| AI Lead Rescue marketing asset pack | `docs/marketing/AI_LEAD_RESCUE_MARKETING_ASSET_PACK.md` | EXISTS |
| AI Lead Rescue 14-day content calendar | `docs/marketing/AI_LEAD_RESCUE_14_DAY_CONTENT_CALENDAR.md` | ADAPT (Mauritius-leaning) |
| AI Lead Rescue first-7-days checklist | `docs/marketing/AI_LEAD_RESCUE_FIRST_7_DAYS_EXECUTION_CHECKLIST.md` | EXISTS |
| Product A hero clinic visual | `data/visual-assets/product-a-hero-clinic.manifest.json`, `public/assets/product-a/hero-clinic-placeholder.svg` | ADAPT (placeholder hero) |

### 3.4 Prospect audits

| Asset need | Existing repo source | Status |
|------------|----------------------|--------|
| Audit rubric (6 dimensions) | `docs/marketing-automation-arm.md` §7 | EXISTS |
| Prospect tracker field schema | `docs/marketing-automation-arm.md` §6 | EXISTS |
| Prospect list template | `docs/sales/AI_LEAD_RESCUE_PROSPECT_LIST_TEMPLATE.md` | ADAPT |
| Prospect Q&A | `docs/sales/AI_LEAD_RESCUE_PROSPECT_QA.md` | EXISTS |
| Standalone US-medspa audit worksheet / scoring sheet | — | GAP |

### 3.5 Outreach templates

| Asset need | Existing repo source | Status |
|------------|----------------------|--------|
| Outreach scripts | `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md` | ADAPT (medspa angle) |
| Discovery call script | `docs/sales/AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md` | EXISTS |
| Warm prospect action pack | `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_ACTION_PACK.md` | EXISTS |
| Warm prospect website add-on | `docs/sales/AI_LEAD_RESCUE_WARM_PROSPECT_WEBSITE_ADDON.md` | EXISTS |
| Cold outreach pack | `docs/sales/AI_LEAD_RESCUE_COLD_OUTREACH_PACK.md` | EXISTS (reference only — no automated cold send) |
| Pricing guide | `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` | EXISTS |
| Capability matrix | `docs/sales/AI_LEAD_RESCUE_CAPABILITY_MATRIX.md` | EXISTS |
| US-medspa-specific outreach template set | — | GAP (adapt from above) |

### 3.6 Google Vids / video

| Asset need | Existing repo source | Status |
|------------|----------------------|--------|
| Google Vids pilot scope | `docs/marketing-automation-arm.md` §10 | EXISTS |
| Multimodal / video rules | `docs/marketing/02_MULTIMODAL_CONTENT_PLAYBOOK.md` | EXISTS |
| Proof video pipeline proposal | `docs/marketing/LR_PROOF_2_VIDEO_PIPELINE_PROPOSAL.md` | EXISTS (proposal) |
| Google tooling safety lane | `docs/strategy/GOOGLE_ACCELERATION_LANE.md` | EXISTS |
| Product A explainer / audit-walkthrough / onboarding Vids scripts | — | GAP |

### 3.7 Case studies & proof

| Asset need | Existing repo source | Status |
|------------|----------------------|--------|
| Proof / validation asset plan | `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` | EXISTS (plan) |
| Proof email memo (1-1-1) | `docs/strategy/sources/2026-05-28-simplicity-1-1-1-proof-email-memo.md` | EXISTS |
| Real US medspa / Product A case study with metrics | — | GAP (no paying-client proof yet) |

### 3.8 Client onboarding

| Asset need | Existing repo source | Status |
|------------|----------------------|--------|
| Paid pilot onboarding | `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` | EXISTS |
| Operator runbook | `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` | EXISTS |
| Sales-to-delivery handoff | `docs/operations/AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` | EXISTS |
| Client-facing onboarding checklist (Product A) | — | GAP |

### 3.9 Strategy lens (governing, not collateral)

| Asset need | Existing repo source | Status |
|------------|----------------------|--------|
| Above-the-line strategy doctrine | `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` | EXISTS |
| Production-grade client outcomes | `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` | EXISTS |
| Lead Rescue integration roadmap | `docs/strategy/AI_LEAD_RESCUE_INTEGRATION_ROADMAP.md` | EXISTS |

> Note on Codex artifact: `docs/marketing/research/us-medspa-revenue-machine-inputs.md`
> (reported at short ref `9c7ecc9`) is **not present on `main`** and is treated as
> **not yet captured**. It is excluded from this inventory until Codex supplies a
> full branch / PR / SHA or re-outputs the artifact for Cursor to import in a
> separate docs-only PR.

---

## 4. Google Drive Brand Hub mapping

Map of repo source → Drive folder (folders already exist; do not recreate). The
**Action** column says what to do with the human-facing copy in Drive.

### 01 Brand Assets
| Repo source | Action |
|-------------|--------|
| `CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` | Summarize into a "Brand Basics" one-pager. |
| `CORPFLOW_CONTENT_MODEL.md`, `CORPFLOW_PROMPT_LIBRARY.md` | Link (reference index). |
| `data/visual-assets/*.manifest.json` | Link the manifest index; binaries by reference. |

### 02 Product A - Website + Lead Rescue
| Repo source | Action |
|-------------|--------|
| `docs/marketing-automation-arm.md` | Link as the operating playbook. |
| `PRODUCT_A_US_MEDSPA_PROMPT_LIBRARY.md` | Copy/summarize for a Product A one-pager. |
| `AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md`, `AI_LEAD_RESCUE_MARKETING_ASSET_PACK.md` | Summarize into Lead Rescue explainer + offer one-pager. |
| `data/visual-assets/product-a-hero-clinic.manifest.json` | Link; flag hero as placeholder needing real imagery. |

### 03 Prospect Audits
| Repo source | Action |
|-------------|--------|
| `marketing-automation-arm.md` §6–§7 (tracker + rubric) | Copy into a Drive audit worksheet template. |
| `AI_LEAD_RESCUE_PROSPECT_LIST_TEMPLATE.md`, `AI_LEAD_RESCUE_PROSPECT_QA.md` | Adapt to US medspa columns; copy. |

### 04 Google Vids Scripts and Exports
| Repo source | Action |
|-------------|--------|
| `marketing-automation-arm.md` §10, `02_MULTIMODAL_CONTENT_PLAYBOOK.md`, `LR_PROOF_2_VIDEO_PIPELINE_PROPOSAL.md`, `GOOGLE_ACCELERATION_LANE.md` | Summarize into a Vids script-pack brief; new scripts authored in Drive (GAP). |

### 05 Outreach Templates
| Repo source | Action |
|-------------|--------|
| `AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md`, `AI_LEAD_RESCUE_DISCOVERY_CALL_SCRIPT.md`, `AI_LEAD_RESCUE_WARM_PROSPECT_ACTION_PACK.md`, `AI_LEAD_RESCUE_PRICING_GUIDE.md` | Adapt to US medspa Product A; copy into a templates pack. Cold pack stays reference-only. |

### 06 Case Studies and Proof
| Repo source | Action |
|-------------|--------|
| `PROOF_VALIDATION_ASSET_PLAN_LR_V1.md`, `2026-05-28-simplicity-1-1-1-proof-email-memo.md` | Link as the proof plan; real case study is a GAP pending a paying pilot. |

### 07 Client Onboarding Assets
| Repo source | Action |
|-------------|--------|
| `AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md`, `AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`, `AI_LEAD_RESCUE_SALES_TO_DELIVERY_HANDOFF.md` | Summarize into a client-facing onboarding checklist (Product A). |

### 08 Approved Logos and Visual Standards
| Repo source | Action |
|-------------|--------|
| Logos (already in Drive), `public/assets/logos/theme.js`, `CORPFLOW_VISUAL_STANDARD_HUMAN_FIRST_BEAUTY_LAYER.md`, `CORPFLOW_ASSET_GOVERNANCE.md` | Link the visual standard + governance; keep approved logos as the authoritative copies. |

---

## 5. What already exists (do not recreate)

- Full marketing communication doctrine set (`00`–`05`).
- Brand / conversion doctrine, visual standard, asset governance, content model, prompt library.
- Marketing Automation Arm operating playbook (tracker + rubric + tool ownership).
- AI Lead Rescue commercial pack: launch/pilots, pricing, capability matrix, discovery script, warm-prospect packs, onboarding, operator runbook, handoff.
- Product A US medspa prompt library.
- Strategy lenses (above-the-line, production-grade outcomes, integration roadmap).
- Logo theme tokens + 16 visual-asset manifests; logos already in Drive `08`.

---

## 6. What needs adaptation for US medspa / Product A

- **Outreach scripts** — currently Lead-Rescue/Mauritius-leaning; retune for US medspa / aesthetic / elective clinics.
- **Prospect list template** — align columns to the §6 tracker fields and US fields (state, category, booking_url).
- **14-day content calendar** — re-angle from Mauritius property to US medspa.
- **Product A hero imagery** — replace placeholder SVG with a real, brand-compliant clinic hero (governed asset).
- **Pricing presentation** — confirm USD launch-pilot framing matches the first-paid-pilots launch pack for the medspa buyer.

---

## 7. What is missing (GAPs)

1. Standalone US-medspa **audit worksheet / scoring sheet** (derive from §6–§7).
2. **US-medspa-specific outreach template set** (adapt from existing scripts).
3. **Google Vids scripts**: Product A explainer, prospect audit walkthrough, client onboarding walkthrough.
4. **Real case study with metrics** — blocked until a paying Product A pilot exists.
5. **Client-facing onboarding checklist (Product A)** — internal runbooks exist; client-facing version does not.
6. **Collateral Index** in Drive linking approved assets back to repo source docs.

---

## 8. What should live in Drive vs repo

| Lives in **repo** (doctrine / canonical) | Lives in **Drive** (working collateral) |
|------------------------------------------|------------------------------------------|
| All doctrine + standards (`docs/marketing/00`–`05`, brand/conversion, visual standard, asset governance). | Brand Basics one-pager (summary of brand identity). |
| Operating playbook, prompt libraries, strategy lenses. | Product A + Lead Rescue one-pagers; outreach templates pack. |
| Sales scripts / pricing / onboarding runbooks (source). | Audit worksheet; Vids script pack; client onboarding checklist. |
| Visual asset manifests (metadata source of truth). | Approved logos + exported binaries; Vids exports; Collateral Index. |

Principle: **doctrine and structured source stay in the repo; presented,
human-facing, editable working copies live in Drive**, always traceable back to a
repo source.

---

## 9. Future DB-backed activation module — proposal only

**Not authorized for implementation in this PR.** Captured so the eventual module
is small and obvious rather than a guessed CRM rebuild.

- **If and only if** spreadsheet/Drive tracking becomes too brittle, propose a
  **small module inside the existing production app** using the **existing
  production Postgres via `POSTGRES_URL`**.
- Candidate scope (minimal): prospects, audits, assets, approval states, outreach
  tasks, follow-ups — mirroring the §6 tracker fields.
- **Hard constraints carried forward:** no second production app, no second
  production database, no custom CRM, no automated cold outreach, no new env vars
  or secrets in this proposal.
- Any DB work requires a **separate proposal PR + Anton approval** before
  implementation, following the security review checklist and delivery-reality
  rules.

---

## 10. Manual actions required from Anton (Drive / judgement only)

These need browser/Drive permissions or human judgement; they are not repo work:

1. Confirm whether Cursor should prepare summarized copies for the Drive folders
   (copy/summarize/link from canonical docs only) once this inventory is reviewed.
2. Provide or approve a real Product A clinic hero image to replace the placeholder.
3. Decide whether the Codex research artifact should be imported (supply full
   branch/PR/SHA) before it is referenced.
4. Confirm USD pricing framing for the US medspa buyer matches the launch pack.

---

## 11. Guardrails

- Docs-only. No runtime code, DB migrations, env vars, secrets, Vercel/GitHub
  settings, dependency changes, or production deployment.
- No second app, no second database, no CRM.
- No automated cold outreach — sending stays human-approved per
  `docs/marketing-automation-arm.md` §8–§9.
- Codex does not own PRs; Cursor owns repo/docs PR implementation.
- Repo doctrine remains canonical; Drive holds working copies only.
