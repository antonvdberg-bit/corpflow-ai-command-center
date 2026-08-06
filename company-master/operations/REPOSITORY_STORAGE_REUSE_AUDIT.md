# Company Master — repository and storage reuse audit

**Controller:** #765  
**PR:** #770  
**Scope:** Read-only repository inspection for Company Master v1 foundation.  
**Production actions performed:** none.

## 1. Existing tenant and company identifiers

| Surface | Path | Finding |
|--------|------|---------|
| Tenant model | `prisma/schema.prisma` → `Tenant` | Operational identity: unique `tenant_id`, `slug`, `name`. Not a legal company master. |
| Tenant hostnames | `TenantHostname` | Host → `tenant_id` routing. |
| Tenant persona | `TenantPersona` | Wallet/autonomy + `persona_json` (site drafts). Not governed legal identity. |
| Public merchant facts | `lib/public/merchant-identity.js` | Hard-coded CorpFlowAI Ltd legal name, BRN, address, support contacts for public compliance pages. |
| Growth / ABM | `GrowthCompany` / `GrowthContact.companyId` | Prospect pipeline IDs. **Do not reuse** as Company Master `company_id`. |
| Planned Company Master | `company-master/schemas/…` | Immutable `company_id` (`cmp_*`) with nullable `tenant_id` link. |

**Reuse decision:** Keep `tenant_id` for runtime tenancy. Introduce separate `company_id`. Link with nullable `tenant_id` when a tenant exists. Do not overload `tenants` or `growth_companies`.

## 2. Existing Postgres structures to reuse (not replace)

**Reuse as-is:**

- `tenants` / `tenant_hostnames` — routing and operational isolation
- Existing CMP ticket / attachment tables — ticket workflow only (not Company Master binaries)
- Single production Postgres (`POSTGRES_URL`) — future Company Master tables belong here after Phase 6 approval

**Do not stretch into Company Master:**

- `tenant_personas.persona_json` — website drafts / overrides
- `tenant_knowledge_atoms` — AI retrieval facts
- `chat_widget_configs` brand fields — UI chrome
- `cmp_ticket_attachments` — ticket binaries, not governed company asset catalogue
- `growth_companies` — outbound ABM

**Absent today:** no `Company`, `company_master_*`, governed field, asset catalogue, or evidence tables in Prisma. Future schema is a **gated production decision** (Phase 6), not part of this slice.

## 3. Existing file, image, Drive and storage references

| Area | Paths | Role vs Company Master |
|------|-------|------------------------|
| Static logos | `public/assets/logos/` (`LogoSQBK.png`, favicon, Lux monogram); duplicate `assets/logos/`, `core/web/assets/logos/` | Legacy/static. Not version-governed. |
| Legacy loaders | `public/assets/logos/theme.js` (+ duplicates); stub `brand-config.json` | Superseded; not live SSOT. |
| Visual asset manifests | `lib/visualAssets/*`, `data/visual-assets/*.manifest.json` | Marketing surface images. Keep separate from legal logos/docs. |
| Lux media adapter | `lib/server/lux-media-storage.js` | Adapter *pattern* for byte reads after gates; backend is ticket attachment bytes. Reuse pattern, not storage target. |
| Google Drive | Docs + synthetic `storage_provider: GOOGLE_DRIVE` | Intended binary store for Company Master; **no Drive SDK/adapter in app runtime yet**. |

## 4. Hard-coded logo or company information paths

- `lib/public/merchant-identity.js` → footers and policy pages (`components/PublicSiteFooter.js`, `pages/terms.js`, …)
- Static `/assets/logos/LogoSQBK.png` in legacy HTML proposals
- Lux mark via `components/LuxeMauriceBrandPrimitives.js` → `rare-exclusive-monogram.svg`
- Parallel hard-coded CorpFlowAI strings in some pay/ERPNext docs (not all import merchant-identity)

**Reuse decision:** Treat `merchant-identity.js` as interim public SSOT for CorpFlowAI until a Company Master-backed resolver is approved. Do not delete it in this slice.

## 5. Duplicate or conflicting implementations

1. Three `theme.js` logo loaders + stub `brand-config.json` vs Next.js inline brand styles  
2. `GrowthCompany.company_id` vs planned `cmp_*` Company Master IDs (different domains)  
3. Visual-asset manifests vs Company Master assets (overlapping language, different systems)  
4. Vanguard `tenant-persona-v1.json` registration fields vs DB `TenantPersona` (name collision, different purpose)

## 6. Recommended reuse versus replacement

| Concern | Recommendation |
|---------|----------------|
| `company_id` / `tenant_id` | **Reuse tenant_id; add company_id** with nullable link |
| `merchant-identity.js` | **Reuse now**; later consume approved-public Company Master fields |
| Visual assets | **Keep separate**; optional alias mapping later |
| Lux media storage adapter | **Reuse pattern** for future binary read gates; do not store CM binaries in ticket attachments |
| Persona / knowledge atoms / chat brand | **Do not promote** to Company Master |
| Google Drive / managed storage | **Reuse approved managed storage** for binaries; Postgres for metadata only |
| Legacy logos / brand-config | **Replace over time** with `logical_alias` resolution (e.g. `brand.logo.primary`) |

## 7. Exact remaining production decisions (Anton / Phase 6)

These are **not** authorised by this PR:

1. Postgres Company Master tables + migration on the existing Neon/`POSTGRES_URL` database  
2. Storage provider folder/object-key model and restricted-access groups (Drive or approved alternative)  
3. Upload/download controls, malware/content-type validation  
4. ERPNext field mappings that consume Company Master identity/assets  
5. `/change` Company Master operator UI projection  
6. Downstream resolver/API runtime endpoint  
7. Cache invalidation / refresh for non-legal derived surfaces  
8. Retention/access policy and backup/restore for restricted binaries  
9. First real company onboarding (migration of real data)

## 8. This slice confirmation

- Synthetic fixtures and deterministic libraries only  
- No production schema, data, Drive, ERPNext, Vercel, DNS, or `/change` runtime mutation  
- No secrets, credentials, binaries, or real restricted document contents committed  
