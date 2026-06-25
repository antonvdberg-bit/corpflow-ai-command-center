# CorpFlowAI Asset Governance

**Status:** Scaffolding (v1) — non-breaking. Existing pages do not yet consume the manifest directory; this document is the contract for how every new asset enters and leaves the system.

**Audience:** Anyone adding, editing, or retiring a buyer-facing visual asset (photo, illustration, icon, video, lottie, social card) on a CorpFlowAI surface.

**Companion docs:**

- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`
- `docs/marketing/CORPFLOW_VISUAL_STANDARD_HUMAN_FIRST_BEAUTY_LAYER.md` — public marketing surfaces now *require* beautiful audience-appropriate photographic backgrounds; those photos are governed assets under this doc (licence, alt, lifecycle, no PII / no clinical details).
- `docs/marketing/CORPFLOW_CONTENT_MODEL.md`
- `docs/marketing/CORPFLOW_PROMPT_LIBRARY.md`
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md`
- `lib/visualAssets/schema.js` and `data/visual-assets/README.md`

## Goal

Every buyer-facing visual asset CorpFlowAI ships has, at all times:

- a stable **id** other content can reference,
- a clear **licence + owner**,
- meaningful **alt text** (or an explicit `decorative: true` flag),
- a defensible **lifecycle state** (`draft`, `vetted`, `published`, `retired`),
- for AI-generated assets, a complete **prompt provenance** record,
- no embedded **secret** or **PII**.

This document is the workflow that produces and preserves those properties.

## Where assets live

| Layer | Location | What lives here |
|-------|----------|------------------|
| Binary, repo-hosted | `public/assets/<surface>/...` | Small, version-controlled images, icons, lottie JSON |
| Binary, CDN-hosted | `cdn.corpflowai.com/...` (public bucket) | Larger images, social cards, video posters |
| Metadata | `data/visual-assets/<id>.manifest.json` | One manifest per asset, validated by `lib/visualAssets/schema.js` |
| Runtime | `lib/visualAssets/*` (planned) | Loader that reads manifests and returns render-ready props |
| Secrets / signed URLs | **Vercel env** (e.g. `CORPFLOW_ASSET_*`) | Never in this repo, never in a manifest |

The manifest is **always** the source of truth. If the binary moves, the manifest's `source.url` (or `source.path`) updates and a new `content_hash` is recorded; nothing else has to change.

## Required metadata (recap)

The full schema lives in `lib/visualAssets/schema.js`. Every manifest must declare:

- `schema_version` — matches `VISUAL_ASSET_SCHEMA_VERSION`.
- `id` — kebab-case, unique across the directory.
- `surface` — one of the surface keys in `CORPFLOW_CONTENT_MODEL.md`.
- `kind` — `image | illustration | icon | video | lottie | social_card`.
- `title` — short human label.
- `source` — `{ type, path|url, content_hash?, width?, height? }`.
- `licence` — `{ tier, owner, terms }`.
- `accessibility` — `{ alt (when applicable), lang?, decorative? }`.
- `usage` — `{ allowed_surfaces[], primary_cta?, notes? }`.
- `lifecycle` — `{ state, created_at?, reviewed_at?, retired_at? }`.
- `prompt_provenance` — required when `source.type === 'ai_generated'` or `licence.tier === 'ai_generated'`.

The validator returns `{ ok, errors[] }` and is run against every `*.manifest.json` in CI via `node-tests/visual-assets-schema.test.mjs`.

## Sourcing workflow

### Repo-hosted assets

1. Place the binary under `public/assets/<surface>/<id>.<ext>`.
2. Create `data/visual-assets/<id>.manifest.json` with `source.type = "repo"` and `source.path = "/public/assets/<surface>/<id>.<ext>"`.
3. Compute and record a `content_hash` (sha256 hex) so a re-uploaded binary triggers an obvious diff.
4. Open a PR; CI runs the schema validator and the brand-doctrine reviewer checks alt text + lifecycle + licence.

### CDN-hosted assets

1. Upload the binary to the public CorpFlowAI CDN bucket (path convention: `marketing/<surface>/<id>.<ext>`).
2. Verify the URL is publicly readable — no signed query string.
3. Create the manifest with `source.type = "cdn"` and `source.url = "https://cdn.corpflowai.com/..."`.
4. Record `content_hash` if the upload tool produced one; this protects against silent CDN swaps.

### Externally hosted (rare)

Allowed only when the asset cannot be re-hosted (e.g. third-party trust mark). `source.type = "external_public_url"` and the URL must still be public-readable.

### AI-generated assets

See `CORPFLOW_PROMPT_LIBRARY.md` for the full workflow. Minimum requirements:

- `source.type = "ai_generated"`.
- `licence.tier = "ai_generated"`, `owner = "CorpFlowAI"`.
- `prompt_provenance.prompt_id` must reference an entry in the prompt library.
- `prompt_provenance.model` and `model_version` must name the model and version used.
- `prompt_provenance.reviewed_by` must name the human reviewer.

## Lifecycle transitions

| From | To | Trigger | Required |
|------|----|---------|----------|
| (none) | `draft` | New manifest committed | All required fields present |
| `draft` | `vetted` | Brand-doctrine reviewer approves | `accessibility.alt` (unless `decorative: true`), licence terms, prompt provenance |
| `vetted` | `published` | Asset is wired into a live surface | `usage.allowed_surfaces` includes the live surface |
| any | `retired` | Replaced or revoked | `lifecycle.retired_at` set; manifest kept for audit |

A `published` asset that fails a later review goes back to `draft` — never silently to `retired`. Retirement requires an audit reason in `licence.terms` or a sibling note.

## What to never store in a manifest

Hard rules enforced by the validator (`validateNoSecrets`) and by review:

- **No API tokens, secrets, API keys, passwords, authorization headers.** Keys named `token`, `secret`, `api_key`, `apikey`, `password`, `authorization` are rejected anywhere in the document.
- **No signed/short-lived URLs.** URLs containing `token=`, `secret=`, `sig=`, `signature=`, or `key=` query parameters are rejected.
- **No PII.** Alt text, prompts, notes, reviewer fields must avoid full real names, phone numbers, emails (other than CorpFlowAI staff emails), addresses, government IDs. Use role labels ("Lux owner", "lead-rescue prospect").
- **No private medical / clinical details**, even if the surface targets a medical-niche client.

If a client sends one of these by accident (e.g. WhatsApp screenshot with a phone number), redact before creating the manifest.

## Retirement & takedown

- A reviewer or owner can request retirement at any time. Set `lifecycle.state = "retired"`, fill `lifecycle.retired_at`, and update any content row that referenced the manifest id (content references should never point to a `retired` manifest).
- If a third-party rights-holder requests takedown, retire the manifest the same day and notify the factory owner; do not just remove the binary.
- The retired manifest stays in the directory for audit. Re-generation requires a new `id`.

## Hosting & CDN expectations

- The CorpFlowAI CDN is a **public bucket**. Anything uploaded there should be safe to share with anyone on the internet.
- Private client material (NDA assets, draft visuals, client-private photos) must **not** be on the public CDN. Use repo `public/` only when the binary is small and we hold the licence; otherwise hold it outside this repo entirely.
- Cache control on the CDN is `public, max-age=31536000, immutable` — never overwrite a published path; bump the id (or append a hash to the filename) instead.

## CI & security review

- `node-tests/visual-assets-schema.test.mjs` runs on every push: schema, no secrets, AI-generated provenance.
- Any PR that adds or modifies a manifest with `licence.tier === "client_owned"` or `licence.tier === "stock_licensed"` must be reviewed against `docs/operations/SECURITY_REVIEW_CHECKLIST.md` for licence-leak risk.
- Adding a brand-new surface key updates the enum in `lib/visualAssets/schema.js` **and** the surface table in `CORPFLOW_CONTENT_MODEL.md` in the same PR.

## Delivery-reality reminder

Per `.cursor/rules/delivery-reality.mdc`: a manifest landing on `main` is not the same as the asset being correctly served on production. After deploy, verify the asset URL returns 200 with the expected `content_hash` (when set) before claiming the rollout is `COMPLETE`.
