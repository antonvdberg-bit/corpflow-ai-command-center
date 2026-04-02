# Lux Mauritius tenant site — v1 acceptance (internal)

**Tenant:** `luxe-maurice` · **Primary host:** `lux.corpflowai.com` (CorpFlow-managed).

Use this list before telling the client the homepage is ready or before a deliberate ship push.

## Content & layout

- [ ] Hero: correct **headline** (H1), **tagline**, and **CTA** label + target (`#enquire` or external).
- [ ] Nav shows **logo** if `logo_url` is set; otherwise **wordmark** from draft title.
- [ ] **Hero background** uses client image URL when set; fallback image is acceptable only as placeholder.
- [ ] White section **band title** matches client wording.
- [ ] **Property / development cards** render from JSON (or single placeholder when empty).
- [ ] **Why …** full-width card title + body match approved copy.
- [ ] Footer shows **email · phone** when set in draft contact block.
- [ ] Browser **tab title** (`meta.page_title`) is appropriate.

## Ops & data

- [ ] `GET /api/tenant/site` on the tenant host returns `tenant_id: luxe-maurice` and merged `site` (no missing nested defaults after partial saves).
- [ ] Enquiry `POST /api/tenant/intake` creates a row in `leads` with correct `tenant_id` (and optional n8n forward if configured).
- [ ] `/change` and `/lux-guide` open on the **same host** the client will use.

## Editor workflow

- [ ] `/lux-editor`: **Load draft** then **Save** round-trip preserves nested fields (hero, media, sections).
- [ ] Invalid property-card JSON shows a clear error; valid array saves and renders.

## Optional (post–v1)

- [ ] FR/RU copy via `website_draft.i18n` and `?lang=` (not required to block v1 if EN-only is agreed).
