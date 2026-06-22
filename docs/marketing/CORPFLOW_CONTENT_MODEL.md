# CorpFlowAI Content Model

**Status:** Scaffolding (v1) — non-breaking. Existing pages do not yet consume this model; runtime adoption will land in a later PR.

**Audience:** AI agents, developers, designers, marketers, operators.

**Companion docs:**

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — the operating doctrine every surface must honour.
- `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md` — how visual assets are sourced, attributed, retired.
- `docs/marketing/CORPFLOW_PROMPT_LIBRARY.md` — vetted prompts for AI-generated assets.
- `docs/marketing/PRODUCT_A_US_MEDSPA_PROMPT_LIBRARY.md` — canonical operator text prompts for Product A US clinic sales workflows (audit, Gmail drafts, follow-up, reply classification).
- `lib/visualAssets/schema.js` — programmatic schema for asset manifests.

## Why a content model

CorpFlowAI ships several buyer-facing surfaces that share copy patterns, conversion logic, and visual assets — Lux (`lux.corpflowai.com`), AI Lead Rescue (`/lead-rescue`), Concierge, Properties, France, the Change Console, and the CORE narrative pages. Today each page hard-codes its strings and images. As we onboard a CMS / DAM layer, we need:

- a **shared vocabulary** for surfaces, content types, and lifecycle states;
- **explicit per-surface conversion goals** so a content editor cannot accidentally weaken a CTA;
- **stable asset references** decoupled from the underlying CDN.

This model is the contract.

## Surfaces

| Surface key | Production host(s) | Primary buyer | Source of truth |
|-------------|--------------------|---------------|------------------|
| `lux` | `lux.corpflowai.com` (and optional alias `luxe.corpflowai.com`) | Lux Maurice prospects (villa / property enquiry) | `pages/index.js` for Lux tenant + tenant_hostnames row |
| `lead-rescue` | `corpflowai.com/lead-rescue` | SMB owners losing leads to slow follow-up | `pages/lead-rescue.js` + `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` |
| `concierge` | `corpflowai.com/concierge` | Higher-touch buyers wanting bespoke setup | `pages/concierge.js` |
| `properties` | `corpflowai.com/properties` | Mauritius property buyers | `pages/properties.js` + `pages/property/[slug].js` |
| `france` | `corpflowai.com/france` | French-market enquiries | `pages/france.js` |
| `change` | `corpflowai.com/change` | Existing CorpFlowAI clients reviewing change tickets | `pages/change.js` (factory + tenant gated) |
| `core` | (planned) `core.corpflowai.com/*` | Top-of-funnel buyers learning the CorpFlowAI promise | `docs/CORE/*` (in flight) |
| `shared` | Cross-surface | n/a | Reusable assets / copy fragments |

A surface key is the smallest unit that owns a conversion goal. Adding a new surface requires updating this table **and** the `VISUAL_ASSET_SURFACES` enum in `lib/visualAssets/schema.js`.

## Content types (v1)

Each surface assembles itself from a small number of content types. v1 covers the shapes the existing pages already use, with one schema per type. Field names are JSON-friendly (snake_case) for parity with the asset manifest schema.

### `Hero`

The single fold-one block. Exactly one per surface.

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | kebab-case, unique within surface |
| `surface` | yes | one of the surface keys above |
| `eyebrow` | no | short framing line, ≤ 60 chars |
| `headline` | yes | buyer-action-oriented, ≤ 80 chars |
| `subhead` | yes | clarifies the offer, ≤ 240 chars |
| `primary_cta` | yes | `{ label, action_intent, destination }` — `action_intent` describes the buyer intent ("get pilot quote"), NOT internal process |
| `secondary_cta` | no | same shape; reserved for "see how it works" / "talk to a human" |
| `asset_id` | no | references a manifest in `data/visual-assets/` |
| `proof_ref` | no | id of a `Proof` block to render adjacent |

### `Offer`

Concrete productised offer. Multiple allowed per surface.

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | kebab-case |
| `surface` | yes | |
| `title` | yes | name buyers will recognise |
| `outcome` | yes | one-sentence promise; what is true when this is done |
| `for_whom` | yes | who the offer is for; honest scoping |
| `not_for_whom` | no | explicit "don't buy this if…" — improves trust per doctrine |
| `price` | no | `{ amount, currency, cadence }` — display only; payment happens out-of-band |
| `inclusions` | yes | bulleted list of what the buyer gets |
| `delivery_window` | yes | e.g. "48 hours" |
| `next_step_cta` | yes | same shape as Hero CTA |

### `Proof`

Evidence, testimonial, case study, or factual claim with citation.

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | |
| `surface` | yes | |
| `kind` | yes | one of `testimonial`, `case_study`, `metric`, `source_citation` |
| `body` | yes | the quote / claim |
| `attribution` | yes | role + first name only by default (no full PII unless explicit consent on file) |
| `source_url` | no | for `source_citation` kind |
| `verified_at` | yes | ISO date of last consent / source check |

### `FAQ`

Buyer objection handler.

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | |
| `surface` | yes | |
| `question` | yes | written in buyer's voice |
| `answer` | yes | plain language, no hype, no defensiveness |
| `objection_handled` | yes | short label (e.g. "price-too-high", "no-tech-skills", "data-privacy") |

### `CallToActionBlock`

Standalone CTA strip. Used between Offers / Proof / FAQ.

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | |
| `surface` | yes | |
| `headline` | yes | re-states buyer intent |
| `primary_cta` | yes | same shape as Hero CTA |
| `urgency_note` | no | factual scarcity only (no countdown theatrics) |

### `Property` (Lux/Properties only)

Listing card. Defined in detail in the existing `lib/luxe-maurice/*` modules; the content model treats each property as a row that references one or more `VisualAsset` manifests for its imagery.

### `Article` (CORE narrative pages, planned)

Long-form explainer.

| Field | Required | Notes |
|-------|----------|-------|
| `id` | yes | |
| `surface` | yes | typically `core` |
| `title` | yes | |
| `slug` | yes | |
| `summary` | yes | ≤ 240 chars |
| `body_markdown` | yes | |
| `cover_asset_id` | no | references a manifest |
| `published_at` | yes | ISO date |
| `superseded_by` | no | id of a newer Article |

## Lifecycle states

All content rows share a single lifecycle vocabulary (same as `VISUAL_ASSET_LIFECYCLE_STATES`):

- `draft` — written but not buyer-ready.
- `vetted` — passed brand-doctrine review; may be staged.
- `published` — live on the surface.
- `retired` — removed from rotation; kept for audit.

Transitions require an actor label and timestamp.

## Asset references

Content rows reference visual assets by manifest **id**, never by raw URL. The manifest at `data/visual-assets/<id>.manifest.json` is the source of truth for the binary, the licence, the alt text, and the prompt provenance (for AI-generated assets). This indirection lets us:

- swap CDNs without editing content;
- enforce alt text and licence at validate-time, not at render-time;
- audit every asset across every surface from one directory.

The validator in `lib/visualAssets/schema.js` rejects manifests that carry secrets or signed URLs — those belong in runtime config.

## Conversion goal per surface (enforced by doctrine)

Every surface must declare **one** primary conversion goal. Examples:

- `lead-rescue` → "Get my pilot quote" (NOT "Choose payment path" — see doctrine).
- `lux` → "See availability" / "Request a stay".
- `concierge` → "Talk to a human".
- `core` → "See how it works".

If a content row's CTA contradicts the surface's primary goal, the brand-doctrine reviewer must reject it before `lifecycle.state = vetted`.

## Open items (v1.x)

- Wire a CMS adapter (Sanity / Notion / repo-only?) that emits these rows. Out of scope for the scaffolding PR.
- Add a `Translation` block for `france` (FR) and any future multilingual surfaces.
- Decide whether `Property` lives inside this model or remains in `lib/luxe-maurice/*` indefinitely.
