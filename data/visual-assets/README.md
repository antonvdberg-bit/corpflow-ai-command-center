# `data/visual-assets/` — manifest directory

This directory holds **visual-asset manifests**, one JSON file per asset, that describe how CorpFlowAI surfaces (lux, lead-rescue, concierge, properties, change, core) reference photos, illustrations, icons, video, lottie, and social cards.

It does **not** hold binary content. Binaries live in the repo under explicit static paths (e.g. `public/`) or behind a public CDN URL. Manifests carry only **metadata** — id, surface, kind, source pointer, licence, accessibility, lifecycle, usage rules, and prompt provenance for AI-generated assets.

## Why a manifest directory

Today every page hard-codes its own `<img src>` and `alt` strings. As we add CMS-driven surfaces (CORE assimilation, Lux media property publishing, lead-rescue social cards, etc.), we need:

- one **shared schema** so the same hero photo can be safely reused across Lux and CORE;
- a **lifecycle** for assets (draft → vetted → published → retired);
- explicit **licence and attribution** for every asset, including AI-generated ones;
- a place to record **prompt provenance** for AI-generated assets so we can re-generate, audit, or retire them deterministically.

## Adding a new manifest

1. Pick a kebab-case id, max 80 chars, unique across the directory.
2. Name the file `<id>.manifest.json` (or `.example.manifest.json` for scaffolding examples).
3. Set `schema_version` to the current value exported by `lib/visualAssets/schema.js` (`VISUAL_ASSET_SCHEMA_VERSION`).
4. Fill every required field (see `docs/marketing/CORPFLOW_CONTENT_MODEL.md` and `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md`).
5. Run `npm test` — the validator in `node-tests/visual-assets-schema.test.mjs` loads every `*.manifest.json` here and asserts it parses against the schema.

## Hard rules

- **No secrets.** No API tokens, signed URLs, session cookies, passwords, or authorization headers. The validator rejects keys named `token`, `secret`, `api_key`, `apikey`, `password`, `authorization`, and rejects URLs containing `token=`, `sig=`, etc.
- **No PII** in `alt` text, prompts, or notes — never include a real client's full name, phone, or email here; use role labels (e.g. "Lux owner").
- **Public-readable URLs only.** Signed/short-lived URLs belong in runtime config, not in manifests.
- **AI-generated assets must declare `prompt_provenance`** (model + prompt id from `docs/marketing/CORPFLOW_PROMPT_LIBRARY.md`).

## Example manifests in this directory

| File | Surface | Kind | What it demonstrates |
|------|---------|------|----------------------|
| `lux-hero.example.manifest.json` | `lux` | image | Repo-hosted hero photo with explicit licence + alt |
| `lead-rescue-card.example.manifest.json` | `lead-rescue` | social_card | AI-generated social card with full prompt provenance |
| `core-promise-icon.example.manifest.json` | `core` | icon | CDN-hosted SVG icon shared across surfaces |

These are **scaffolding examples**. They do not yet drive any rendered page; runtime consumers will be wired in a later PR.
