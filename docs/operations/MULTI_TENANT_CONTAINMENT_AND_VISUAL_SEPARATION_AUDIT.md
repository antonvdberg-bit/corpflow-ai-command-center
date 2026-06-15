# Multi-tenant containment and visual-separation audit (read-only, design-only)

Status: **Design / audit only.** This document is the output of a read-only repo audit. It does not authorise code, schema, DB, DNS, Vercel, tenant-row, or auth changes. Every implementation packet (MT-1 … MT-8 in §11) is gated by Anton's explicit approval and the standards in `.cursor/rules/security-sensitive-changes.mdc`, `docs/operations/SECURITY_REVIEW_CHECKLIST.md`, and `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`.

## Stream boundary and approved vocabulary (2026-06-15 07 UTC+4)

This document belongs to the **CorpFlow multi-tenant platform stream** — the same stream as `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`. It is intentionally separate from any single tenant's delivery stream. The platform stream owns the cross-tenant contamination model, the visual-separation requirements, the tenant isolation tests, the audit trail requirements, and the Core Capability / Tenant Deployment / Tenant Override / Promotion to Core model defined in §5.

Living Word Mauritius and LuxeMaurice are referenced throughout this document only as **illustrative tenants** — the same way "Tenant A" and "Tenant B" might be used in a generic spec. No edit to this document or to anything generated from this thread may mutate Living Word artifacts, the T1 Delivery Reality Audit (`artifacts/quality-audits/2026-06-11-living-word-mauritius/`), Living Word chatbot scope, Living Word sandbox scope, or any Living Word tenant data unless Anton explicitly instructs that.

### Approved nouns (binding across this doc and the credential doc)

| Noun | Meaning | Examples in this repo |
|---|---|---|
| **Core Capability** | Reusable, CorpFlow-owned functional unit. Lives in `lib/`, `api/`, `pages/`, `components/`; configuration *defaults* live in `automation_playbooks` (when `tenant_scope='factory'`), `docs/`, and seeders. Code is shared by all tenants. | The `/change` Change Console route; the CMP router; the persistent `<TenantChromeHeader />`; the public-site renderer in `lib/server/tenant-site-public.js`. |
| **Tenant Deployment** | The tenant-specific *activation* of a Core Capability. A capability with zero tenant deployments is shipped but unused; a capability with N deployments is in production for N tenants. | A `tenants` row + a `tenant_hostnames` row + a `tenant_personas` row together constitute a Tenant Deployment of the public-site + login + Change Console capabilities for that tenant. |
| **Tenant Override** | A tenant-specific *difference* on top of a Tenant Deployment — config value, visual asset, instruction, process step, or workflow variant. Overrides live on the same tenant row (e.g. `tenant_personas.personaJson.website_draft`) or in a tenant-scoped child table. | LuxeMaurice's gold theme + multilingual i18n; a tenant's logo uploaded under `tenant_personas.personaJson.media.logo_url`. |
| **Promotion to Core** | An anonymised improvement that started life as a Tenant Override and is rolled up into the Core Capability — typically as a new default in `automation_playbooks` (`tenant_scope='factory'`) or a new field shape in a seeder. Promotion always passes through Anton; the source tenant is anonymised; other tenants get the new default only via a separate forward-promotion packet. | Future MT-8 work: a CRM stage definition that a tenant refined, anonymised and promoted to become the Core default for new tenant onboardings. |

The audit doc and the credential doc are co-canonical for this vocabulary. Any future ambiguity ("is X a Capability or an Override?") is resolved by reading §5 of this audit doc.

### What this stream does NOT touch

- **No chatbot work.** The chatbot scope (Living Word chatbot, Lux concierge, future tenant chatbots) is a separate stream. This stream only documents that the **chatbot configuration** is a Tenant Override that today lives hardcoded in `api/factory_router.js → handleChat` and *should* live in `tenant_personas.personaJson.chatbot` (audit doc §3 R-7; MT-8 packet). The stream does **not** write or modify any chatbot prompt content, persona, or conversation data.
- **No tenant sandbox creation.** Living Word's sandbox is owned by its own delivery stream; this stream does not create, mutate, or seed it.
- **No tenant delivery artifact mutation.** Files under `artifacts/quality-audits/<tenant>/` are tenant delivery artifacts; this stream reads them for context only.
- **No DB write.** Every MT packet's implementation is gated by `.cursor/rules/security-sensitive-changes.mdc` and Anton's explicit approval; this audit doc is design-only.
- **No auth / session code change.** Every change to `lib/server/auth.js`, `lib/server/session.js`, `lib/cmp/router.js` gates is gated by the credential doc IM-5 / IM-6 packets, each with its own approval.
- **No blurring with tenant delivery work.** A change cannot land via this stream if its main effect is to deliver value for one tenant; such a change belongs to that tenant's delivery stream and may consume the Core Capability that this stream ships.

Author: Cursor (session 2026-06-15 06 UTC+4), at Anton's direction.

Audience: Anton (PM); Cursor / future contractors / future internal agents who will implement MT-1 … MT-8; security reviewer who will sign off before any auth / session / containment change ships.

Companion docs (read these alongside this audit, in this order):

- `docs/operations/TENANT_CLIENT_LOGIN.md` — canonical tenancy + login model **today**.
- `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` — operator credential / session design (Core-centralised picker, host-acting-tenant alignment, IM-1 … IM-5 packets).
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` — production bar (Reliable, Secure, Observable, Repeatable, Operable).
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — mandatory before any auth / session / containment change.
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet shape MT-1 … MT-8 must follow.
- `docs/CORE/TENANT_BOUNDARIES_AND_ADMIN_RULES.md` — core vs tenant surface rules, Dormant Gate, admin sessions.
- `.cursor/rules/delivery-reality.mdc` and `.cursor/rules/predeploy-decision-checks.mdc` — every MT packet is `COMPLETE` only after live verification.

This audit is the **MT-1** deliverable in §11. Subsequent packets (MT-2 … MT-8) are spec'd here but not started.

---

## 1. Executive summary

CorpFlow today runs a **single Vercel deployment** that serves **multiple tenant subdomains** under `*.corpflowai.com`. Tenancy is resolved per request from `Host` via `lib/server/host-tenant-context.js` (sync) and `tenant_hostnames` in Postgres (`api/factory_router.js → attachTenantFromHostPg`). Sessions are signed cookies on the parent domain `*.corpflowai.com`, of two `level`s in `auth_users`: `tenant` (bound to exactly one `tenant_id`) and `admin` (factory operator, no native multi-tenant acting model yet).

The active tenants we discovered in the repo (§2 lists them precisely):

- `corpflowai` / `root` — apex marketing tenant (`corpflowai.com`, `www.corpflowai.com`).
- `luxe-maurice` — first real client (`lux.corpflowai.com`, optional alias `luxe.corpflowai.com`).
- `living-word-mauritius` — second real client (`living-word-mauritius.corpflowai.com`), onboarded 2026-06-11 / T1.
- `*.vercel.app` previews — used for client review of preview deployments via signed `cf_preview=`.
- Core / factory plane on `core.corpflowai.com` — listed in `CORPFLOW_CORE_HOSTS`; surface is `'core'`, never a tenant.

The model is moving from "one client credential per host" toward an operator multi-tenant credential (`OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`). That migration changes who can act inside which tenant, but the **containment surface is much wider than auth alone**. This audit enumerates every place tenant data, tenant content, tenant visuals, tenant approvals, tenant CRM, and tenant evidence are produced, queried, copied, or rendered, and classifies each into Core-standard / tenant-scoped / operator-scoped / factory-only.

**Top contamination risks today** (full list in §8):

1. **Live `/change` SSR does not enforce host ↔ session alignment.** `pages/change.js` is the Next.js route that production serves. It renders client-side only, consumes `/api/auth/me` and `/api/ui/context`, and does **not** redirect on `tenant_host_session_mismatch`. Only the legacy static `public/change.html` honours that flag (line 5253). The 2026-06-15 04:12 UTC+4 Living Word incident in `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` §1.2 is the exact failure mode this audit must close.
2. **No `acting_tenant_id`.** `lib/server/auth.js` issues admin sessions with `{ typ: 'admin', username, user_id }` and tenant sessions with `{ typ: 'tenant', tenant_id, ... }`. There is no server-side `acting_tenant_id` field, no host-acting-tenant alignment gate, and no operator-tenant membership table. Every "operator acts in tenant X" today is faked via a per-tenant `bootstrap+<tenant>@corpflowai.com` `level=tenant` row.
3. **Admin sessions bypass tenant scoping on ticket reads.** `lib/cmp/router.js → resolveTenantIdForScopedTicketRead` returns `null` for admin sessions (line 1865) and `resolveCmpTicketListScope` returns `{ kind: 'core' }` for admin sessions (line 1888) — i.e. admin sees every tenant's tickets. That is desired today for factory ops but is a contamination footgun the moment an operator is "acting in" Tenant A and the UI still shows Tenant B's data because there is no acting filter.
4. **Tenant chrome (CSS + titles) runs client-side from `/api/tenant/site`.** `public/assets/corpflow/tenant-chrome.js` only paints theme variables and document titles on `/login`, `/change`, `/lux-guide`. There is **no visible tenant name banner**, **no acting-as-operator banner**, **no host-prefix breadcrumb**, and **no "Switch workspace" affordance** today. Operators have no reliable visual cue that they are on tenant A vs tenant B beyond colour and title — and colour can fail to load (network) or look similar across tenants.
5. **Tenant-data tables exist with `tenantId` nullable on rows that should always carry it.** `cmp_tickets.tenant_id`, `lead.tenant_id`, `cmp_ticket_attachments.tenant_id`, `telemetry_events.tenant_id`, `automation_events.tenant_id` are all `String?` (nullable) in `prisma/schema.prisma`. `tenant_id = null` is used to mean "Core / factory-scoped". That overload makes "this row has no tenant on purpose" indistinguishable from "this row lost its tenant by accident". Real fix requires either NOT NULL plus a sentinel value, or a separate `tenant_scope` enum.
6. **No `operator_tenant_memberships`.** Operators can act anywhere today (any admin can do anything in any tenant context once they bypass the missing alignment gate). The IM-2 / MT-2 work to add explicit membership is a prerequisite for any auditable "Anton can access Luxe + Living Word from Core picker" claim.
7. **Chatbot system prompt is hardcoded and tenant-blind.** `api/factory_router.js → handleChat` uses a single system prompt: *"You are the Serenity Wellness Concierge … in Mauritius."* This is sent for every tenant. It is not a containment leak (no cross-tenant data flows through it), but it is a containment **violation** of the visual / brand separation rule: a chatbot answering for Living Word Mauritius does not announce itself as a wellness concierge. New tenants must not silently inherit Lux's persona text.
8. **`tenant_id` derivation from subdomain can drift from the canonical tenant_id.** `host-tenant-context.js` derives `tenant_id` from subdomain when no `tenant_hostnames` row matches (e.g. `lux.corpflowai.com` → `lux` instead of `luxe-maurice`). `auth.js` line 191 deliberately ignores the request's `tenant_id` and uses `auth_users.tenant_id`, which is correct. But other read paths can still pick up the wrong slug.

This audit's purpose is to make every one of these structurally impossible, in a sequenced, reviewable, rollback-safe way (§11 packets).

---

## 2. Tenant-specific URLs today (discovered in code + Postgres scripts)

Discovered by reading `lib/cmp/router.js`, `lib/server/host-tenant-context.js`, `lib/server/tenant-site-public.js`, `scripts/upsert-luxe-maurice-hostnames.mjs`, `scripts/upsert-living-word-mauritius-tenant.mjs`, and `.env.template`. Live mapping is in Postgres `tenant_hostnames` and is the source of truth; this is the audit's read of how the code resolves each host.

| Host | Surface | tenant_id | Source of mapping | Notes |
|---|---|---|---|---|
| `core.corpflowai.com` | **core** | `null` | `CORPFLOW_CORE_HOSTS` in env (`lib/server/host-tenant-context.js` → `parseHostList`) | Factory / operator plane. **No** client `tenant_id` derived from this host. Future Core picker host. Must never be mapped to a tenant in `tenant_hostnames`. |
| `corpflowai.com`, `www.corpflowai.com` | tenant | `root` (or `corpflowai` when `CORPFLOW_TENANT_HOST_MAP` overrides) | `CORPFLOW_DEFAULT_TENANT_ID=root` in `.env.template`; `lib/server/host-tenant-context.js → isApexHostname` short-circuit; `lib/cmp/router.js → resolveTenantFromHost` hardcodes `corpflowai.com` → `corpflowai` for boundary checks | Apex marketing. Note `host-tenant-context.js` returns `root`, while `lib/cmp/router.js → resolveTenantFromHost` (used only for CMP boundary) returns `corpflowai`. These two answers must converge (see §9, table row for `tenants`). |
| `lux.corpflowai.com` | tenant | `luxe-maurice` | `scripts/upsert-luxe-maurice-hostnames.mjs` writes `tenant_hostnames`; also hardcoded in `lib/cmp/router.js → resolveTenantFromHost` line 273 | Official production host for the first paying client. |
| `luxe.corpflowai.com` | tenant | `luxe-maurice` | Same script as above, "optional alias" | Optional alias; both domains added to the same Vercel project. |
| `living-word-mauritius.corpflowai.com` | tenant | `living-word-mauritius` | `scripts/upsert-living-word-mauritius-tenant.mjs` writes `tenant_hostnames` | Onboarded T1 on 2026-06-11. Subject of the 2026-06-15 incident in `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` §1.2. |
| `*.vercel.app` (any preview deployment) | tenant (when `cf_preview=` token verifies) | derived from `cf_preview` (signed by `CORPFLOW_TENANT_PREVIEW_SECRET`) | `lib/server/tenant-preview-token.js`, consumed by `pages/index.js`, `lib/server/tenant-site-public.js`, `public/change.html` | Used for client review of preview deployments. The signed token is the only thing that turns a `*.vercel.app` URL into a tenant surface. |
| `localhost`, `127.0.0.1` | tenant (default) | `CORPFLOW_DEFAULT_TENANT_ID=root` | Same as apex fallback | Dev only. |

### Hostname → routing tree (read order in `api/factory_router.js → applyCorpflowHostTenantResolution`)

1. Sync `buildCorpflowHostContext` (`host-tenant-context.js`):
   - if `host ∈ CORPFLOW_CORE_HOSTS` → `surface='core'`, `tenant_id=null`.
   - else if `CORPFLOW_TENANT_HOST_MAP` matches → `tenant_id = map[host]`.
   - else if apex → `tenant_id = CORPFLOW_DEFAULT_TENANT_ID`.
   - else if `host.endsWith(.${rootDomain})` and subdomain has no `.` → `tenant_id = prefix + sub` (subdomain heuristic; this is where `lux` can drift from `luxe-maurice`).
2. Async `attachTenantFromHostPg` (`api/factory_router.js`):
   - if `tenant_hostnames` has a matching enabled row → **override** with that `tenant_id`, set `req.corpflowTenantIdSource = 'postgres'`. This is the authoritative path for Lux and Living Word.
   - apex is **not** overridden from `tenant_hostnames` unless `CORPFLOW_APEX_ALLOW_DB_HOST_OVERRIDE=true`.
3. `reconcileCorpflowTenantContextWithSession`:
   - on `surface='tenant'` and **non-authoritative** binding (i.e. subdomain heuristic), tenant session's `tenant_id` overrides the derived id. Authoritative bindings (`apex`, `postgres`, `env_map`) are **not** overridden by session — this is the protection against a Lux session painting the CorpFlow apex.

### Future hosts named in this audit (not yet wired, design-only)

- `core.corpflowai.com/change?mode=switch` — Core picker page per `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` §4.
- `core.corpflowai.com/api/operator/switch-tenant`, `core.corpflowai.com/api/operator/leave-tenant` — Core-host-scoped switch endpoints per §6.2 / §6.3 of that doc.

---

## 3. Data classification matrix

Classification key:

- **Core-standard / shared** — one row exists for the whole platform; no `tenant_id` column or `tenant_id=null` is intentional. Reads are factory-only or anonymous-safe.
- **Tenant-scoped required** — every row must carry a non-null `tenant_id`. Reads filter by effective tenant. Cross-tenant reads are forbidden except for explicit factory-only aggregation.
- **Tenant-scoped with optional promotion to Core template** — row lives under a tenant, but a deliberate promotion path moves a curated version to a Core default (versioned, reviewed) that future tenants can inherit. Tenant edits never silently flow back to Core.
- **Operator-scoped** — keyed by operator identity (`auth_users.id` where `level='admin'`), not by tenant. Cross-tenant by design (e.g. the operator membership matrix).
- **Factory-only / admin-only** — readable / writable only with an admin session or factory-master token. Tenants and operators acting in tenant context cannot read.

**Bridge to the approved vocabulary (§5):** `Core-standard / shared` rows are part of a **Core Capability** (either the capability's defaults or its global state). `Tenant-scoped required` rows are part of a **Tenant Deployment** — either the deployment's identity (e.g. `tenant_hostnames`) or a **Tenant Override** on top of it (e.g. `tenant_personas.personaJson.theme`). `Tenant-scoped with optional promotion to Core template` rows are Tenant Overrides that may be candidates for **Promotion to Core**. `Factory-only / admin-only` is an *audience restriction* on a Core Capability, not a separate class.

Tables and surfaces from `prisma/schema.prisma`, `lib/server/`, `lib/cmp/`, `lib/automation/`, `lib/factory/`, plus the future tables proposed in `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`.

| Data type | Today's table / surface | Today's `tenant_id` column shape | Classification | Notes / containment failure if missing |
|---|---|---|---|---|
| Tenants registry | `tenants` (Prisma `Tenant`, `tenant_id @unique`, `slug @unique`) | identity row, no `tenant_id` column needed | Factory-only (writes); anonymous-safe (read of name/slug via `/api/tenant/site`) | Apex tenant id is inconsistent today: `host-tenant-context.js` returns `root`; `cmp/router.js → resolveTenantFromHost` returns `corpflowai`. Must converge before any "act on apex tenant" decision. |
| Tenant hostnames | `tenant_hostnames` (Prisma `TenantHostname`, `host @unique`, `tenantId`, `enabled`) | non-null tenant_id required | Factory-only (writes via `lib/server/tenant-host-map.js`); anonymous-safe (read by `attachTenantFromHostPg`) | Must never have a row mapping `core.corpflowai.com` → any tenant. Audit on every deploy. |
| Tenant persona (theme, website draft, billing flag, token balance, autonomy) | `tenant_personas` (Prisma `TenantPersona`, `tenant_id @unique`) | non-null | Tenant-scoped required (with optional promotion of *defaults*) | `personaJson.website_draft` is the **content** layer for tenant marketing; merged into `defaultPublicSite` in `lib/server/tenant-site-public.js`. Promotion: defaults can become Core template; tenant edits must never silently overwrite defaults for other tenants. |
| Auth users (clients + operators) | `auth_users` (Prisma `AuthUser`, `username @unique`, `level`, `tenant_id?`) | nullable; required for `level='tenant'`, must be null for `level='admin'` | Tenant-scoped (for `tenant` rows); Operator-scoped (for `admin` rows) | Today `tenant_id` is nullable but the auth code at `lib/server/auth.js` line 192 requires it for `level='tenant'`. Add a DB CHECK constraint (`level='admin' OR tenant_id IS NOT NULL`) before relying on it for containment. |
| Operator tenant memberships (proposed; does not exist yet) | `operator_tenant_memberships` (per `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` §2.3) | non-null | Operator-scoped | The authoritative server-side check for "is operator X allowed to act in tenant Y". MT-2. |
| Operator acting-tenant session field (proposed; does not exist yet) | `session.acting_tenant_id` (server-set only) | session field, not a DB row | Operator-scoped | The thing the host-acting-tenant alignment rule (§3.4 of credential doc) compares to `host_tenant_id`. MT-2. |
| CMP tickets (change requests, intake, approvals, history) | `cmp_tickets` (Prisma `CmpTicket`, `tenant_id?`, `console_json`) | nullable; `null` is overloaded to mean "Core / factory-scoped" | Tenant-scoped required for client work; Factory-only for Core work | Overload of `tenant_id=null` is the highest-priority cleanup. Either flip to NOT NULL + sentinel (`__core__`), or add `tenant_scope` enum. MT-6. |
| CMP ticket history / activity inside `console_json` | `cmp_tickets.console_json.history[]` | inherits parent ticket's `tenant_id` | Tenant-scoped required | Each operator-authored history entry must record `actor_user_id` + `acting_tenant_id` (per credential doc §7.2). |
| Approvals (workflow_state transitions, approve-build, client_decisions) | `cmp_tickets.console_json.client_view.workflow_state`, plus CMP actions `approve-build`, `submit-client-decisions`, `client-decisions-link-mint` | tenant-scoped via parent ticket | Tenant-scoped required | An approval written against the wrong tenant ticket cannot be undone audit-cleanly. Gate must read `effective_tenant_id` not body. MT-2 + MT-7. |
| Promotion / GitHub PR / Vercel deployment metadata | `cmp_tickets.console_json.promotion.*`, `console_json.preview_url`, `client_view.automation.client_site_preview_url` | tenant-scoped via parent ticket | Tenant-scoped required | Preview URL for Tenant A must never appear inside Tenant B's ticket render. Cross-render is more likely under admin sessions (no scoping). MT-6 tests. |
| Preview URLs (signed `cf_preview=` tokens) | `lib/server/tenant-preview-token.js`; embedded in `client_view.automation.client_site_preview_url` | encoded in token | Tenant-scoped required | Verified by `CORPFLOW_TENANT_PREVIEW_SECRET` (same value Production + Preview). Token-to-tenant binding is what makes `*.vercel.app` usable for client review. |
| Evidence / audit artifacts | `artifacts/`, `automation_events`, `telemetry_events`, `technical_lead_audits`, optional CMP `console_json.evidence[]` | mixed | Tenant-scoped required (events) / Factory-only (cross-tenant aggregates) | `technical_lead_audits` is keyed by `ticket_id` only — relies on ticket's `tenant_id` for scoping. |
| Telemetry events | `telemetry_events` (Prisma `TelemetryEvent`, `tenant_id?`, `factory_id?`, `event_type`) | nullable | Tenant-scoped required (when tenant context exists) or Factory-only | Add `actor_user_id` (proposed in credential doc §7.2). |
| Automation events (ingest + emitted) | `automation_events` (Prisma `AutomationEvent`, `tenant_id?`, `tenant_scope`, `idempotency_key`) | nullable; `tenant_scope` enum present | Tenant-scoped required (when tenant_scope='tenant'); Factory-only otherwise | `tenant_scope` is the right shape; replicate this on `cmp_tickets` (`tenant_scope` enum) to remove the `tenant_id=null` overload. |
| Automation playbooks (operator runbooks, integration patterns) | `automation_playbooks` (`tenant_scope`, `slug`, `body_md`) | scoped by `tenant_scope` (no `tenant_id` column today) | Core-standard / shared (with optional tenant overlay later) | Library is currently global. Promotion model already in shape (scope = factory). |
| Lux property catalogue (rich CMS-like rows) | `lux_listings` (Prisma `LuxListing`, `tenant_id`, `slug`, `visibility_status`, etc.) | non-null required (good) | Tenant-scoped required | Public reads at `lib/server/lux-listings-public.js` are visibility-filtered + host-bound. Schema is the correct shape for a tenant-scoped CMS table. |
| Lux property media (attachments tied to listings) | `lux_property_*` handlers in `lib/server/` | tenant-scoped via listing row | Tenant-scoped required | Reads gated server-side by host + visibility. |
| CMP ticket attachments | `cmp_ticket_attachments` (Prisma `CmpTicketAttachment`, `tenant_id?`, `ticket_id` cascade) | nullable | Tenant-scoped required | Same overload problem as `cmp_tickets`. Attachment endpoints in `lib/server/change-attachments.js` should always derive from parent ticket's tenant. |
| Visual assets (binary uploads, logos, hero images, drone shots, renders) | `cmp_ticket_attachments` + `lux_listings.media_refs_json` + tenant `personaJson.media`, `theme` | tenant-scoped via parent | Tenant-scoped required (with optional template-asset promotion) | A logo / hero / palette uploaded to tenant A must never appear on tenant B's site. MT-5 visual baseline. |
| Tenant content briefs (`description`, `brief`, `title` on tickets) | `cmp_tickets.title`, `cmp_tickets.description`, `cmp_tickets.brief` | tenant-scoped via parent | Tenant-scoped required | Operators typing a tenant brief while "acting in" the wrong tenant is the highest-frequency contamination path. MT-2 alignment + MT-5 visual cue. |
| Chatbot configuration (system prompt, persona, allowed topics) | **Does not exist as data today** — `api/factory_router.js → handleChat` hardcodes the Serenity Wellness Concierge prompt for all tenants | n/a | Tenant-scoped required (proposed: `tenant_personas.personaJson.chatbot`) | Move chatbot config under `tenant_personas.personaJson.chatbot` (existing column). Reject empty config explicitly rather than falling back to the Lux-era prompt. |
| Chatbot conversations / leads from chatbot | `cmp` action `concierge-lead-create` → `leads` table (Prisma `Lead`, `tenant_id?`) | nullable | Tenant-scoped required | Lead row's `tenant_id` is set from the host context (`req.corpflowContext.tenant_id`) at write time. Must verify the alignment rule (host = acting tenant) before write. |
| Concierge lead operator patches | CMP action `concierge-lead-operator-patch` | tenant-scoped via lead row | Tenant-scoped required | Per-lead workflow state (`leads.qualification_json`) lives in tenant context. |
| CRM configuration (segments, owners, lead stage definitions, sales pipeline) | `growth_segments` (Prisma `GrowthSegment`, `tenant_id` non-null, `unique (tenant_id, slug)`) | non-null required (good) | Tenant-scoped required (with optional Core template) | Schema shape is correct (unique on `(tenant_id, slug)`). Promotion path: template segments live in Core, tenants instantiate from template at onboarding. |
| CRM records (companies) | `growth_companies` (`tenant_id` non-null, `segment_id` FK) | non-null required (good) | Tenant-scoped required | Indexes correct. |
| CRM records (contacts) | `growth_contacts` (`tenant_id` non-null, `company_id` FK) | non-null required (good) | Tenant-scoped required | `consent_basis` field present — important for compliance per-tenant. |
| CRM records (touchpoints / outreach) | `growth_touchpoints` (`tenant_id` non-null, `contact_id` FK) | non-null required (good) | Tenant-scoped required | Outbound channel + scheduled_at; never share across tenants. |
| Lux lead CRM stages and operator queue | `lib/cmp/_lib/lux-lead-operator-workflow.js` | inherits from `leads.tenant_id` | Tenant-scoped required | Today the Lux-specific stages live in code (`LUX_LEAD_CRM_STAGES`). For multi-tenant, either keep Lux-specific in `lib/cmp/_lib/lux-*` (Core-standard, hardcoded), or move per-tenant stage definitions into `tenant_personas.personaJson.crm.lead_stages`. |
| Tokens / billing | `token_debits` (`tenant_id` non-null), `tenant_personas.token_credit_balance_usd`, `tenant_personas.billing_exempt` | non-null required (good) | Tenant-scoped required | `billing_exempt` is intentionally per-tenant. Never copy across tenants. |
| Provider handoff docs (per-client migration packets) | `artifacts/quality-audits/<date>-<tenant>/*` (e.g. provider-handoff.md, estate-map.md) | filesystem path | Tenant-scoped required (audit artifact) | Filesystem hygiene; one folder per tenant. Already followed for Living Word T1. |
| Deployment notes / verdict / Delivery Reality Audit blocks | CMP `console_json.delivery_reality_audit`, GitHub PR descriptions, `automation_events` | tenant-scoped via parent ticket | Tenant-scoped required | A Delivery Reality Audit for Tenant A's deploy must never paste into Tenant B's ticket. |
| Recovery vault (password-reset tokens etc.) | `recovery_vault_entries` (`category`, `payload_json`) | none on the row; `tenant_id` lives inside `payload_json` | Tenant-scoped required (logical, via payload) | Audit reads filter by `payload.path.tenant_id` (`lib/server/auth.js` line 81). Consider promoting `tenant_id` to a column for indexability. |
| Search / SEO / Plausible analytics config | `docs/analytics/CORPFLOW_ANALYTICS_V1.md`; Plausible domain per tenant | external | Tenant-scoped required | One Plausible site per public tenant host. Never share an analytics ID across tenants. |
| Operator audit trail (who acted, when, where) | **Does not exist yet as a first-class shape** — `automation_events.payload_json.operator_*` is informal | n/a | Operator-scoped | MT-7. Add `actor_user_id` column to `automation_events` and `telemetry_events`. Required for "Anton-via-Core picker switched to Living Word at T1" forensics. |

---

## 4. Tenant containment rules

These rules are the binding output of this audit. Every MT packet (§11) must reference them. They are written so a reviewer (or future agent) can answer YES / NO / PARTIAL for each on a diff.

### 4.1 Schema rules

1. **Every tenant-owned row must carry `tenant_id`.** No tenant-scoped table may have a row where `tenant_id` is meant to be present and is `null`. Where today's schema allows `null` to mean "Core / factory-scoped", that overload must be resolved either by NOT NULL + a sentinel value or by an explicit `tenant_scope` enum, applied per table.
2. **Tenant-scoped tables get a tenant-safe unique constraint.** Slugs, names, and other "human" identifiers must be unique **within a tenant**, not globally. The pattern is `@@unique([tenantId, slug])` already used in `growth_segments`, `lux_listings`, and `tenant_personas` (single-row-per-tenant). Audit any table that lacks this when introducing a tenant-scoped human identifier.
3. **Cross-table tenant integrity.** Child tables (e.g. `growth_touchpoints` → `growth_contacts` → `growth_companies` → `growth_segments`) must all carry `tenant_id` themselves, not rely on join-time inference. This costs a small amount of denormalisation but makes every query a single-table tenant filter.
4. **Operator identity is its own column, not a free-text string in `payload_json`.** `automation_events.actor_user_id` and `telemetry_events.actor_user_id` (MT-7) are the schema home for operator attribution.

### 4.2 Query rules

5. **Every tenant query must filter by `effective_tenant_id`.** "Filter by" means a `where: { tenantId: effective_tenant_id }` (or equivalent raw SQL bound parameter). A query that omits the filter is an error, not a default.
6. **`effective_tenant_id` is a derived value, never an input.** Handlers must compute it from `(session, host)` and reject any client-supplied `tenant_id` that conflicts. The current `auth.js` pattern (line 193: "Password proves identity; scope is always `auth_users.tenant_id` (ignore request `tenant_id` mismatch).") is the correct discipline; extend it to admin sessions via `session.acting_tenant_id`.
7. **Operator sessions derive `effective_tenant_id` from server-side `session.acting_tenant_id`, never from a client-provided tenant id in body / query / header / route param.** Reject `tenant_id` in any operator-facing API body unless the handler explicitly documents why it is safe (factory-only path).
8. **Factory / core views may aggregate tenants, but tenant views may not.** A tenant ticket-list query on a tenant host or under `acting_tenant_id=X` returns rows for X only. Aggregation across tenants happens only on factory-only endpoints (admin session + `acting_tenant_id === null`).
9. **Host-acting-tenant alignment is enforced server-side before any tenant-scoped DB read.** Per `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` §3.4: `if effective_tenant_id !== host_tenant_id → 409 or redirect to Core picker`. This rule replaces today's `tenant_host_session_mismatch` flag (which is computed but not enforced on the live SSR `/change`).

### 4.3 Authoring / promotion rules

10. **Core-standard templates may be copied / promoted into tenant-specific configs, but must not overwrite tenant-specific customisations without explicit approval.** Promotion is a deliberate, versioned action with an audit row (`automation_events.event_type = 'cmp.template.promoted'`), not a silent overwrite. See §5.
11. **Tenant-specific improvements never silently merge back into Core.** A change that should become a Core template requires its own promotion packet with diff visibility.
12. **`tenant_personas.personaJson` is per-tenant authoritative.** It is the home for tenant chrome (theme), tenant content (website draft), tenant chatbot config (proposed), tenant CRM defaults (proposed). Operators editing it must be in `acting_tenant_id === tenant_id` context (alignment rule).

### 4.4 Operator rules

13. **No new "operator can act anywhere" capability.** Every operator action in a tenant context requires an `operator_tenant_memberships` row, validated per request (not cached on session login), per credential doc §5.7.
14. **Operator sessions never silently inherit the tenant context of the last login.** When an admin signs in, `acting_tenant_id` is `null` until the Core picker mutates it. Today's flow, where an admin who happened to land on `lux.corpflowai.com/login` ends up acting in Lux because of host context, is replaced by "always start at the picker" (per credential doc §4.2).
15. **No tenant-host endpoint may mutate `acting_tenant_id`.** Switching is Core-host-scoped (credential doc §5.6, §6.2). Tenant hosts only surface a redirect link.

### 4.5 Visual rules

16. **Every tenant-rendered surface must visibly identify the tenant.** Theme is not enough. Name + accent + (logo if available) + host. See §6.
17. **Operator-attribution banners on tenant hosts.** When an admin session is acting inside tenant X on tenant X's host, the chrome shows `Acting as <operator email> in <tenant name>`. Tenant clients never see this banner.
18. **No tenant picker on tenant hosts.** Only a redirect-only "Change tenant" link back to Core, and only for operators with more than one membership.

### 4.6 Audit rules

19. **Every audit row carries both `actor_user_id` and `tenant_id` (when applicable).** Operator switch events (`cmp.operator.switched_tenant`) and operator-mediated CMP actions both populate `actor_user_id` (the persistent operator identity), not the per-tenant `bootstrap+` row.
20. **Audit rows are append-only, idempotent on `idempotency_key`.** Already the pattern for `automation_events`. Extend to operator switch events.

---

## 5. Core standardisation / promotion model

Anton stated the principle: **build once in Core, deploy per tenant; tenant-specific improvements get deliberately promoted back to Core when they should become standard; never silent.** This section names the concrete path using the four approved nouns from the stream-boundary preamble: **Core Capability**, **Tenant Deployment**, **Tenant Override**, **Promotion to Core**.

### 5.1 The four classes — using the approved nouns (r2)

| Class | Approved noun | Lives where | Examples in this repo | Inheritance / promotion path |
|---|---|---|---|---|
| **Core Capability** (code) | `Core Capability` | Code in `lib/cmp/`, `lib/server/`, `lib/automation/`, `pages/`, `public/`, `components/` | Change Console, intake flow, AI estimate, approve-build, attachments, technical-lead audits, GitHub PR / Vercel preview wiring, password reset, the persistent `<TenantChromeHeader />` | New Tenant Deployments inherit the capability automatically when they are onboarded; no per-tenant choice. |
| **Core Capability** (default content / config) | `Core Capability` | A versioned document in `docs/` plus a seeder script that creates the per-tenant default rows on onboarding; rows in `automation_playbooks` (`tenant_scope='factory'`) | Standard CRM lead stages (proposed), standard tenant theme defaults in `defaultPublicSite`, standard chatbot fallback prompt (proposed), standard website draft skeleton | Each Tenant Deployment gets a *copy* of the defaults at onboarding. Tenant edits become Tenant Overrides. Re-promotion of an updated default happens via an explicit forward-promotion packet that diffs the change and rolls it forward to chosen tenants. |
| **Tenant Deployment** | `Tenant Deployment` | A `tenants` row + a `tenant_hostnames` row + a `tenant_personas` row + any tenant-scoped child rows (`growth_segments`, `cmp_tickets`, `lux_listings`, etc.) | LuxeMaurice's full set of rows; Living Word's full set of rows; future tenants' full set of rows | Created at onboarding from the Core Capability defaults; mutated through the lifetime of the tenant as Tenant Overrides accumulate. |
| **Tenant Override** | `Tenant Override` | `tenant_personas.personaJson` (theme, website_draft, future chatbot config, CRM overrides), `tenants` row fields, tenant-scoped child rows | LuxeMaurice's gold theme + multilingual i18n (FR/RU); LuxeMaurice's acquisition page; a future tenant's logo URL; future per-tenant CRM stages | Lives only inside one Tenant Deployment. May *inspire* a future Promotion to Core but never silently affects other Deployments. |
| **Tenant-coupled code** (transitional anti-pattern) | "Tenant Override masquerading as a Core Capability" | `lib/cmp/_lib/lux-*`, `components/Lux*`, `pages/concierge.js`, `pages/about.js`, any `if (tenant_id === '<x>') { … }` branch | Lux property editor, Lux media governance, Lux content sprint panel, Lux operator queue grouping | Code keyed off a specific `tenant_id`. The Core Capability shape has not yet been factored out. Treat as transitional: when a similar need lands for a second tenant, factor into a Core Capability + Tenant Overrides before duplicating. No new parallel `lib/cmp/_lib/<tenant>-*/` tree may be added without an explicit migration note. |

### 5.2 Promotion to Core mechanics (canonical for MT-8)

A **Promotion to Core** is a packet (per `CORPFLOW_EXECUTION_PACKET_STANDARD.md`) that turns an improvement first observed in one Tenant Override into a new default on the Core Capability. Required artefacts:

1. **Source-of-truth doc** — the new Core Capability default, versioned in `docs/`, with a frozen version string. Tenant-specific names, brand, and content are **anonymised** in the doc; the doc must read as "this is the new Core default", not "this is what Tenant X does".
2. **Seeder / migration script** — writes the new default into the chosen Tenant Deployments' `tenant_personas.personaJson.<section>` (deep-merge, not overwrite; existing Tenant Override fields win unless the packet declares "force overwrite" with Anton's explicit confirmation per row).
3. **Audit row** — `automation_events.event_type = 'cmp.capability.promoted_to_core'` (renamed from r1's `cmp.template.promoted` to use the approved noun), payload includes the Core Capability version, target `tenant_id`s, before/after diff hash.
4. **Anonymisation review** — Anton signs off that the promoted artefact carries no tenant-identifying content (brand name, contact details, specific opportunity names, persona text that would only make sense for the source tenant).

Forward propagation: once the new Core Capability default exists, individual Tenant Deployments adopt it via a separate **forward-promotion packet** that opts each chosen tenant in. There is no "every tenant automatically inherits the new default" mode — adoption is always per-tenant and auditable.

Reverse direction (Tenant Override → Core Capability) is symmetric to the forward direction: a packet that diffs the Tenant Override against today's Core default, captures the rationale, **anonymises** the artefact, and writes a new Core Capability version. Other Tenant Deployments do not get the new default until a separate forward-promotion packet runs.

### 5.3 What today's repo already has

- `automation_playbooks` is a Core-shared library (`tenant_scope='factory'` rows live globally) — correct shape for **Core Capability default content / config**. Can be reused for chatbot prompts and CRM stage definitions once MT-8 ships.
- `tenant_personas.personaJson` is the right home for **Tenant Overrides**. The deep-merge pattern in `lib/server/tenant-site-public.js → mergeSiteDraft` is the model to copy for chatbot + CRM config merges.
- `defaultPublicSite` + `defaultLuxI18n` + `useNeutralOrgSiteDefaults` together implement a primitive Core Capability default + Tenant Override pattern. Generalise it.

### 5.4 What today's repo gets wrong (fix in MT-8)

- **Tenant-content masquerading as Core Capability code.** The Serenity Wellness Concierge system prompt is hardcoded in `api/factory_router.js → handleChat`. The handler is a Core Capability, but the prompt is a Tenant Override (specific to one tenant's vertical, brand, language). MT-8 moves the prompt to `tenant_personas.personaJson.chatbot.system_prompt` (a Tenant Override field) and ships a safe Core Capability default fallback for tenants that have not configured the override yet — a neutral "This tenant has not configured its assistant; please ask the operator team to enable it." NOT another tenant's persona. (This stream does not write or modify any specific tenant's chatbot content; that is the per-tenant delivery stream's job once MT-8 ships.)
- **Tenant-coupled code in `lib/cmp/_lib/lux-*`.** `LUX_LEAD_CRM_STAGES` is Lux-only. The right shape is a Core Capability default (CRM stages live in `automation_playbooks` `tenant_scope='factory'`) plus per-tenant Tenant Overrides in `tenant_personas.personaJson.crm.stages`. Today this is an acknowledged transitional anti-pattern (LuxeMaurice is the only tenant deep enough to have justified dedicated code). For any second tenant requesting CRM behaviour, the factoring happens first.

---

## 6. Visual separation requirements

Today's tenant chrome is too quiet. It applies a theme via CSS variables and changes the document title, but does not surface the tenant identity prominently enough to prevent the operator from typing into the wrong tenant. The 2026-06-15 incident is the proof.

### 6.1 Required visual elements on every tenant `/change` (and `/login`)

For every tenant surface in the browser (login, change console, tenant guide, future tenant pages):

| Element | Required for | Source | Today |
|---|---|---|---|
| Tenant name visible in page chrome (header / top bar) | All users on tenant host | `tenant.name` from `/api/tenant/site` | Wordmark element `cfTenantBrand` is rendered on `/login`, `/change`, `/lux-guide` but uppercased and small. Needs to be **prominent**, not optional decoration. |
| Tenant-specific colour / accent | All users | `site.theme.primary` etc. from `/api/tenant/site` | Set via CSS variables (`--cf-accent`, `--cf-tenant-bg`, `--cf-tenant-text`). Already correct. |
| Tenant logo / mark (when available) | All users | `site.media.logo_url` (or `tenant_personas.personaJson.media.logo_url`) | Schema field exists but not consistently rendered. MT-5. |
| Host displayed plainly | Operators | `req.host` | Today not shown. Add `<code>{host}</code>` near tenant name. Cheap, high signal. |
| Tenant id displayed for operators | Operators only | `session.acting_tenant_id` (future) or `req.corpflowContext.tenant_id` (today) | Today partially shown in change.js line 2450 as "Session: tenant (luxe-maurice)" — but only when session is `tenant`. Admin sessions show only "Session: admin". Add `acting_tenant_id` once it exists. |
| "Acting as `<operator email>` in `<tenant name>`" banner | Operators only (level=admin with `acting_tenant_id ≠ null`) | session + `/api/tenant/site` | Does not exist today. MT-5. Banner must be sticky-visible and tenant-coloured. |
| "Change tenant" redirect link | Operators with >1 membership | future `operator_memberships.length > 1` | Does not exist today. MT-4 (per credential doc §4.5). Redirect-only link to Core, no dropdown. |
| **No** tenant picker / dropdown on tenant hosts | Anyone | constant | Today there is no tenant picker anywhere. The MT-4 rule is to forbid one on tenant hosts (Core owns it; see §7). |
| **No** banner / list of other tenants | Anyone | constant | Today not violated (no list exists). Encode the rule in MT-5 so it stays that way. |

### 6.2 Core surfaces

Core (`core.corpflowai.com/change`) hosts the picker and Factory chrome. It must:

- Show "Factory tools" entry.
- Show the operator's membership list.
- Show "Leave tenant context" when `acting_tenant_id ≠ null`.
- **Not** render any tenant's branding (Core has no tenant context).
- **Not** show client-tenant theme variables (so an operator who recently was in Lux doesn't see Lux gold on Core).

### 6.3 Anonymous / non-tenant chrome

When `effective_tenant_id === null` and the surface is tenant:

- Render the login form (for tenant clients) or redirect to Core picker (for operators).
- Do not render any specific tenant's theme.
- `/api/tenant/site` returns `{ tenant: null, site: null }` and `tenant-chrome.js` correctly bails out — keep this behaviour.

### 6.4 Failure-mode tests for visual separation (MT-5)

- Two browser windows side by side, one on `lux.corpflowai.com/change`, one on `living-word-mauritius.corpflowai.com/change`, both with the same operator: the two pages must be **obviously different at a glance** (colour + name + host + "acting as" banner). This is the human containment check.
- The "Acting as Anton in Living Word Mauritius" banner is rendered even with theme assets failing to load (network), via SSR + bold-text fallback. CSS-only branding is fragile.

---

## 7. Tenant switcher architecture alignment

This section cross-references `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` and confirms the binding decisions for the switcher.

### 7.1 Authoritative decisions (from `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`)

| Decision | Source section | Status in that doc | Status in this audit |
|---|---|---|---|
| Core (`core.corpflowai.com`) owns the picker | §2.5, §4.1, §5.6 | Binding | Confirmed |
| Tenant hosts surface only a redirect-only "Change tenant" link | §4.5 | Binding | Confirmed |
| Picker reads `operator_tenant_memberships` (server-side) | §4.3 | Binding | Confirmed |
| Switching is `POST /api/operator/switch-tenant` on Core only | §6.2 | Binding | Confirmed; new gate `requireCoreHost` in §6.5 of credential doc |
| Switch sets `session.acting_tenant_id` and redirects to canonical tenant host (Option A) | §4.4 | Binding (Option A recommended over Option B) | Confirmed |
| Tenant clients (level=tenant) never see picker or "Change tenant" link | §4.1 | Binding | Confirmed |
| Host-acting-tenant alignment rule is enforced server-side on every tenant request | §3.4, §5.2 | Binding | Confirmed; **MT-6 must add this to `pages/change.js` (Next.js SSR), not just `public/change.html`** |
| Cookie domain remains `*.corpflowai.com` | §3.3, §9.6c | Binding (out of v1 scope to narrow) | Confirmed |
| Every operator action audits with `actor_user_id` + `acting_tenant_id` | §7.1, §7.2 | Binding | Confirmed; MT-7 |

### 7.2 Two open architectural points this audit adds

A. **Apex tenant id consistency.** `lib/server/host-tenant-context.js` returns `root` for apex, while `lib/cmp/router.js → resolveTenantFromHost` returns `corpflowai` for apex (hardcoded). The Core picker design assumes operators may have a membership on the apex tenant; the tenant_id name must converge. Recommended: standardise on `corpflowai` and remove the `CORPFLOW_DEFAULT_TENANT_ID=root` fallback (or set it to `corpflowai`). Open question OQ-4 in §13.

B. **Subdomain heuristic vs canonical tenant_id.** `host-tenant-context.js` derives `tenant_id` by stripping the subdomain when no `tenant_hostnames` row matches (`lux` from `lux.corpflowai.com`). This is a fallback for dev; in production, `tenant_hostnames` is authoritative (`req.corpflowTenantIdSource = 'postgres'`). The Core picker's "redirect to canonical tenant host" must resolve from `tenant_hostnames`, not the subdomain, to avoid emitting `lux.…` when the canonical is `luxe-maurice.…` (and vice versa).

### 7.3 Migration sequencing alignment

The credential doc's IM-1 … IM-5 packets and this audit's MT-1 … MT-8 packets are coordinated as follows. They are **not** the same packets (MT covers a wider surface than auth) but MT cannot start MT-2 until IM-1 ships.

| MT packet | Depends on | IM packet equivalent |
|---|---|---|
| MT-1 (this doc) | — | — |
| MT-2 (membership schema + acting-tenant session) | MT-1 | IM-1 + IM-2 |
| MT-3 (Core picker UI) | MT-2 | IM-3 (Core branch) |
| MT-4 (tenant-host "Change tenant" link) | MT-2, MT-3 | IM-3 (tenant-host branch) |
| MT-5 (tenant visual separation baseline) | MT-2 | — (this audit's own surface) |
| MT-6 (query containment tests / tenant isolation tests) | MT-2 | — (cross-cutting test packet) |
| MT-7 (audit trail population) | MT-2 | IM-4 |
| MT-8 (Promotion to Core mechanics) | MT-2 | — (this audit's own surface) |

---

## 8. Risk register (cross-tenant failure modes found in the repo)

| # | Risk | Where in code today | Likelihood | Impact | Mitigation packet | Owner |
|---|---|---|---|---|---|---|
| R-1 | Operator authenticates on Tenant A's host but session points at Tenant B (password manager autofill) — live `/change` renders Tenant B's data on Tenant A's host | `lib/server/auth.js` line 193 (correct), `pages/change.js` (lacks `tenant_host_session_mismatch` SSR guard); `public/change.html` line 5253 has it but is legacy | High (proven 2026-06-15 04:12 UTC+4 in `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` §1.2) | Critical (operator-visible cross-tenant view; possible erroneous ticket edits) | MT-2 (alignment rule server-side) + MT-3 (Core picker) + MT-6 (live tests) | Cursor (executor), Anton (approver) |
| R-2 | Wrong credential autofilled by browser password manager across `*.corpflowai.com` | Cookie / credential domain `*.corpflowai.com` | High | Critical | MT-2 + MT-3 (single operator credential, picker replaces autofill choice); narrowing cookie domain is rejected for v1 per credential doc §2.4 / §11 | Cursor + Anton |
| R-3 | Ticket created under wrong tenant because operator typed in the wrong /change | `lib/cmp/router.js → ticket-create` reads `req.corpflowContext.tenant_id` from host context | Medium (today) → High (under multi-tenant operator) | High (ticket cannot be moved tenant-cleanly without explicit reassignment + audit) | MT-2 alignment rule + MT-5 visual "acting as in <tenant>" + MT-6 tests | Cursor |
| R-4 | Approval applied to wrong tenant ticket (e.g. operator clicks approve-build on Lux ticket while context is Living Word) | CMP actions `approve-build`, `submit-client-decisions`, `client-decisions-link-mint` — all read from session / host without an explicit "acting tenant" cross-check | Medium → High | Critical (budget debit + production deploy under wrong tenant) | MT-2 + MT-6 negative test (approve-build cross-tenant must 409) | Cursor |
| R-5 | Preview URL from Tenant A shown to Tenant B | `cmp_tickets.console_json.client_view.automation.client_site_preview_url` + signed `cf_preview` tokens; ticket-get reads scoped to ticket's `tenant_id` | Low today (token is tenant-bound) → Medium if admin reads cross-tenant tickets in a "wrong acting context" | Medium | MT-2 alignment + MT-6 cross-tenant ticket-get test | Cursor |
| R-6 | Visual assets uploaded to Tenant A's ticket attachment, surfaced on Tenant B's site | `cmp_ticket_attachments.tenant_id` is nullable; attachment endpoints derive from parent ticket. Risk is that `tenant_id` overload (`null`) hides a bug | Low today (attachments scoped to ticket) → Medium when admin in wrong acting context | Medium | MT-2 + MT-5 + flip `cmp_ticket_attachments.tenant_id` to NOT NULL in MT-2 schema work | Cursor |
| R-7 | Chatbot config shared accidentally — every tenant gets the Wellness Concierge prompt | `api/factory_router.js → handleChat` hardcodes the system prompt | High (already true today for every tenant) | Low (no data leak, but brand contamination + wrong persona for non-Lux tenants) | MT-8 (move chatbot config to `tenant_personas.personaJson.chatbot`); fall back to a neutral generic prompt, never another tenant's | Cursor |
| R-8 | Chatbot conversations / leads written to wrong tenant | `concierge-lead-create` writes `leads.tenant_id` from `req.corpflowContext.tenant_id` (host context). Risk if host context is stale or if `tenant_id` is nullable on `leads` (it is — `Lead.tenantId String?`) | Medium | High | MT-2 alignment rule applied to `concierge-lead-create`; flip `leads.tenant_id` to NOT NULL with backfill in MT-2 | Cursor |
| R-9 | CRM / contact records (growth_*) shared accidentally across tenants | Schema already requires `tenant_id` on `growth_*` (good). Risk is in query paths missing the filter | Low (schema is correct) | High (PII leak under GDPR-style assumptions) | MT-6 — write tenant-isolation tests that scan every Prisma call site in `lib/server/growth-pipeline.js` and `lib/cmp/_lib/lux-lead-*` | Cursor |
| R-10 | Billing exemption copied accidentally to a new tenant | `tenant_personas.billing_exempt` is per-tenant; no copy path exists today | Low | Medium | Document explicitly that onboarding default is `billingExempt=true` (registration-moment posture, see `scripts/upsert-living-word-mauritius-tenant.mjs`); promote to `false` deliberately at v2 cutover | Anton |
| R-11 | `tenant_personas.personaJson` (instructions, persona text, website draft, future chatbot config) re-used blindly from another tenant | `tenant-site-public.js` does Lux-specific overrides for `luxe-maurice` only (line 515-522). If a new tenant gets a "copy from Lux" seeder, those overrides would carry copyright/brand contamination | Medium when a future packet adds a "clone from Lux" seeder | High (brand + contractual) | MT-8 template promotion model: explicit allow-list of fields, never blanket clone | Cursor |
| R-12 | Factory endpoint leaking tenant data | Factory endpoints (`api/factory/*`) are gated by admin session + factory-master token, but they read across tenants by design. Risk is one of them returning cross-tenant rows to a tenant-acting context | Low (admin-only) → Medium if `acting_tenant_id` is set and a factory endpoint still aggregates | Medium | Credential doc §5.4 + MT-2: factory endpoints require `acting_tenant_id === null`. Implement via `requireFactoryMasterOnly` extension. | Cursor |
| R-13 | API endpoint missing tenant_id filter (forgotten on a new endpoint) | Risk grows with code churn | Medium ongoing | High | MT-6 — automated lint / test that every Prisma call against tenant-scoped tables includes `where: { tenantId: ... }`; CI gate | Cursor |
| R-14 | Admin sees Tenant A's tickets while acting in Tenant B because `resolveCmpTicketListScope` returns `{ kind: 'core' }` for admin sessions | `lib/cmp/router.js` line 1888 | Medium under multi-tenant operator | High | MT-2 — when `session.level === 'admin'` and `acting_tenant_id ≠ null`, treat as `{ kind: 'tenant', tenantId: acting_tenant_id }`. Keep `{ kind: 'core' }` only when `acting_tenant_id === null`. | Cursor |
| R-15 | Apex tenant_id drifts between `root` and `corpflowai` | `host-tenant-context.js` vs `cmp/router.js → resolveTenantFromHost` disagree | Low | Medium (operator may have a membership on the "wrong" id and not see apex tenant in picker) | MT-2 — standardise on one apex tenant_id (OQ-4) | Cursor |
| R-16 | Subdomain heuristic infers a non-canonical tenant_id (`lux` vs `luxe-maurice`) on dev / staging | `host-tenant-context.js` lines 104-111 | Low in production (postgres override wins); Medium in dev | Medium (login fails confusingly) | MT-2 — Core picker redirect-after-switch uses canonical `tenant_hostnames.host`, not subdomain | Cursor |
| R-17 | Provider handoff doc (e.g. `provider-handoff.md`) accidentally references the wrong tenant's hostname | `artifacts/quality-audits/<tenant>/*` — filesystem hygiene | Low | Medium | Onboarding template includes a "search for any other tenant's name" check in the per-client migration audit (`docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md`) | Anton |
| R-18 | `actor_user_id` is absent today, so all bootstrap+<tenant> rows look like different identities | `automation_events`, `telemetry_events` schemas | High (already true) | Medium (forensics weakness; not a contamination leak) | MT-7 / IM-4 | Cursor |
| R-19 | Tenant client signs in on `lux.corpflowai.com/login` with a different tenant's email — today's auth.js binds to `auth_users.tenant_id`, but the host map check is skipped for password login when `mappedFromDb !== tenantId` and `isPasswordLogin` is true (see `auth.js` line 293) | `lib/server/auth.js` line 290-300 | Low (tenant clients only have one credential, so unlikely they have another tenant's password) | Medium | MT-6 — add a negative test that a tenant credential from Tenant A cannot create a session on Tenant B's host (today auth.js correctly binds the session to A's tenant, but page chrome will paint B's brand because host wins; same shape as R-1) | Cursor |
| R-20 | A `tenant_hostnames` row is accidentally written for `core.corpflowai.com` | `lib/server/tenant-host-map.js`, `tenant-host-map/upsert` CMP action | Low (today requires factory-master) | Critical (would convert Core into a tenant surface and break the picker) | MT-2 — add `requireCoreHostNotMapped` assert on every deploy; document in pre-deploy checklist | Cursor |

---

## 9. Query-level audit (per table)

For each tenant-relevant Prisma model in `prisma/schema.prisma` (plus the proposed `operator_tenant_memberships`), this section answers six questions. "Tenant-safe" indexes / constraints means they include `tenant_id` (or equivalent) in their key.

### Legend

- `carries_tenant_id` — Does the table have a `tenant_id` column?
- `nullable` — Is `tenant_id` nullable in the schema?
- `tenant_safe_unique` — Are unique constraints scoped per-tenant where they involve human identifiers?
- `queries_consistently_filter` — Do all query call sites in `lib/server/` and `lib/cmp/` include a `tenant_id` filter?
- `global_rows_today` — Does the table contain rows today that are intentionally global (no tenant)?
- `should_become_tenant_scoped` / `should_become_core_template` — Recommended classification change.

| Model / table | `carries_tenant_id` | `nullable` | `tenant_safe_unique` | `queries_consistently_filter` | `global_rows_today` | Recommendation |
|---|---|---|---|---|---|---|
| `Tenant` (`tenants`) | n/a (it IS the registry) | n/a | `tenant_id @unique`, `slug @unique` | n/a | Yes — one row per tenant | Keep. Reconcile apex id (`root` vs `corpflowai`). |
| `TenantHostname` (`tenant_hostnames`) | Yes | No | `host @unique` (global is correct: a host can map to only one tenant) | Yes (`attachTenantFromHostPg`) | No | Keep. Add deploy-time assert that `core.corpflowai.com` (and every entry in `CORPFLOW_CORE_HOSTS`) is absent. |
| `TenantPersona` (`tenant_personas`) | Yes | No | `tenant_id @unique` (one persona per tenant) | Yes | No | Keep. This is the home for tenant theme + chatbot config + CRM defaults. |
| `AuthUser` (`auth_users`) | Yes | **Yes (nullable)** | `username @unique` | Yes for tenant logins (`auth.js` line 192 requires `tenant_id` when `level='tenant'`) | Yes (admin rows have `tenant_id = null`) | Keep nullable (admin rows legitimately have null), but add a DB CHECK: `level='admin' OR tenant_id IS NOT NULL`. |
| `CmpTicket` (`cmp_tickets`) | Yes | **Yes (nullable)** | none | Mostly (admin sessions skip scope per §1 risk R-14) | Yes (Core / factory-scoped tickets use `tenant_id = null`) | **Resolve overload.** Add `tenant_scope` enum (`'factory'` / `'tenant'`); keep `tenant_id` non-null for `tenant_scope='tenant'` rows; flip via a migration that backfills `tenant_scope` from existing data. MT-2. |
| `CmpTicketAttachment` (`cmp_ticket_attachments`) | Yes | **Yes (nullable)** | none (parented by `ticket_id` cascade) | Yes (derived from parent ticket) | Tracks parent (some `null`) | **Flip to NOT NULL** by backfilling from parent ticket. MT-2. |
| `TechnicalLeadAudit` (`technical_lead_audits`) | No (only `ticket_id`) | n/a | none | Inherits via ticket | n/a | Acceptable today (tied to one ticket). Add `tenant_id` column for cheap factory queries if MT-7 needs it. |
| `LuxListing` (`lux_listings`) | Yes | No | `@@unique([tenantId, slug])`, `@@index([tenantId, visibilityStatus])` | Yes (host-bound public reads; admin reads scoped per §6 of `tenant_personas`) | No | Keep. Model for future per-tenant CMS tables. |
| `Lead` (`leads`) | Yes | **Yes (nullable)** | none | Concierge writes derive from host; admin reads cross-tenant | Some `null` (legacy / Phase 1) | **Flip to NOT NULL** with backfill. Concierge writes must reject if `tenant_id` cannot be derived. MT-2. |
| `TokenDebit` (`token_debits`) | Yes | No | none | Yes (`lib/factory/costing.js`) | No | Keep. |
| `TelemetryEvent` (`telemetry_events`) | Yes | **Yes (nullable)** | none | Mostly (factory-only aggregation reads cross-tenant) | Yes (factory-level telemetry) | Add `tenant_scope` enum like `automation_events`. Add `actor_user_id` (MT-7). |
| `RecoveryVaultEntry` (`recovery_vault_entries`) | No (`tenant_id` lives in `payload_json`) | n/a | none | Yes (`auth.js` line 81 filters by `payload.tenant_id`) | n/a | Promote `tenant_id` to a column for indexability (low priority). |
| `AutomationEvent` (`automation_events`) | Yes | **Yes (nullable)** | `@@unique([tenantScope, idempotencyKey])` | Yes (writes carry `tenant_scope`) | Yes (factory-level events) | Already correct shape. Add `actor_user_id` (MT-7). |
| `AutomationPlaybook` (`automation_playbooks`) | No (`tenant_scope` only) | n/a | `@@unique([tenantScope, slug])` | Yes | Yes (Core-shared playbooks) | Keep. Model for chatbot prompt templates and CRM stage templates if MT-8 promotes them here. |
| `GrowthSegment` (`growth_segments`) | Yes | No | `@@unique([tenantId, slug])` | Yes (`lib/server/growth-pipeline.js`) | No | Keep. |
| `GrowthCompany` (`growth_companies`) | Yes | No | none | Yes | No | Keep. |
| `GrowthContact` (`growth_contacts`) | Yes | No | none | Yes | No | Keep. |
| `GrowthTouchpoint` (`growth_touchpoints`) | Yes | No | none | Yes | No | Keep. |
| `operator_tenant_memberships` (proposed, MT-2) | Yes (`tenant_id`) | No | `@@unique([operator_user_id, tenant_id])` where `revoked_at IS NULL` | n/a (new) | n/a | Add per credential doc §2.3. |

### Cross-cutting observations

- `tenant_id` is nullable on five tables that all overload `null` to mean different things: `cmp_tickets` (Core ticket), `cmp_ticket_attachments` (legacy/derived), `leads` (legacy), `telemetry_events` (factory event), `automation_events` (factory event). `automation_events` solved this with a `tenant_scope` enum — replicate that pattern on the others.
- `tenant_safe_unique` is in good shape for `growth_*` and `lux_listings`. New tenant-scoped tables must follow that pattern.
- Query consistency is mostly good for tenant-client sessions. The hole is on admin sessions, which today read across tenants because `resolveCmpTicketListScope` returns `{ kind: 'core' }` for admins. MT-2 closes this by branching on `acting_tenant_id`.

---

## 10. UI audit

### 10.1 `/login`

| What is rendered | For tenant client | For CorpFlow operator | Visual cue today | Missing today |
|---|---|---|---|---|
| Tenant chrome (theme, tenant name, title) | Yes (on tenant host) | Same (operator sees tenant chrome on tenant host) | Theme via `tenant-chrome.js`; document title; `cfTenantBrand` wordmark | Operator-only banner. Operator can't tell at a glance "this is Living Word's login, not Lux's". |
| Tenant ID field | Locked to host's tenant (`mappedFromDb`) | Same | Lock + hint text | Once Core picker exists, operators rarely use `/login` on tenant hosts; this field becomes operator-irrelevant. |
| Factory tools column | Hidden | Shown when `level === 'admin'` after login (`login.html` line 869) | "factoryTools" panel appears | Currently appears on **tenant host login** after admin sign-in — visually confusing, mixes Lux chrome with Core links. MT-3 should hide it on tenant hosts; operator must go to Core. |
| Switch workspace button | Should not appear | Should not appear here | n/a | MT-4 puts it on `/change` (post-login), not `/login`. |

### 10.2 `/change` (live = `pages/change.js` Next.js SSR)

| What is rendered | For tenant client | For CorpFlow operator | Visual cue today | Missing today |
|---|---|---|---|---|
| Tenant chrome (CSS variables, document title, wordmark) | Yes | Yes (when on tenant host) | Theme + title + wordmark via `tenant-chrome.js` (CSR) | None of these are SSR — first paint is unbranded, then theme loads. Bad for "wrong tenant" detection. |
| Session indicator | "Session: tenant (luxe-maurice)" | "Session: admin" (no tenant context shown) | `pages/change.js` line 2447-2456 | Operator sees `admin` only — no indication of which tenant they're acting in. MT-5 adds `acting_tenant_id`. |
| Operator queue (cross-tenant view) | Per-tenant queue | **All tenants** (admin sees core kind) per `resolveCmpTicketListScope` | n/a | This is the contamination footgun. MT-2 + MT-5: when `acting_tenant_id` is set, restrict to that tenant; expose factory-cross-tenant view only when `acting_tenant_id === null`. |
| Host-session mismatch redirect | n/a (their session matches their host) | Should redirect to Core picker | `public/change.html` line 5253 redirects on `tenant_host_session_mismatch=true`. **`pages/change.js` does not** — and `pages/change.js` is the live route. | MT-6 ports the alignment check into `pages/change.js` (or moves the SSR enforcement into a middleware / API gate). |
| "Switch workspace" / "Change tenant" link | Should not appear | Should appear when `operator_memberships.length > 1` | Does not exist today | MT-4 — redirect-only link to Core, hidden from tenant clients. |
| "Acting as `<operator>` in `<tenant>`" banner | Should not appear | Should appear when `acting_tenant_id ≠ null` | Does not exist today | MT-5 — sticky banner with tenant accent colour. |

### 10.3 Core / factory pages (today on `core.corpflowai.com` and apex)

| What is rendered | For tenant client | For CorpFlow operator | Visual cue today | Missing today |
|---|---|---|---|---|
| Core tenant picker | Should not be reachable (tenant clients should be redirected to their own host) | Should appear post-login when `acting_tenant_id === null` | Does not exist today | MT-3. |
| Factory tools dashboard | Should not be reachable | Available | Today on `/factory/auth-users`, `/factory/approvals`, etc. + `factoryTools` panel on tenant `/login` (wrong place) | Move all factory tools under Core's `/change` Factory chrome; remove from tenant `/login`. |
| Tenant theme on Core | Should not apply | Should not apply | `tenant-chrome.js` calls `/api/tenant/site` which returns `tenant: null` on Core (correct) | Keep. |

### 10.4 Where "Change tenant" must appear vs must NOT appear

| Surface | Tenant client (level=tenant) | Operator (level=admin, 1 membership) | Operator (level=admin, ≥2 memberships) |
|---|---|---|---|
| `core.corpflowai.com/change` | Not reachable (host check redirects) | Picker shows: 1 tenant + Factory tools + Sign out | Picker shows: N tenants + Factory tools + Sign out |
| `core.corpflowai.com/change?mode=switch` | Not reachable | Same as above | Same as above |
| `lux.corpflowai.com/change` | No "Change tenant" button | No "Change tenant" button (only 1 membership) | "Change tenant" redirect link |
| `living-word-mauritius.corpflowai.com/change` | Same | Same | Same |
| `corpflowai.com/change` (apex) | Same (apex IS a tenant) | Same | "Change tenant" redirect link |
| `lux.corpflowai.com/login` | Tenant client login form | (Operator should rarely be here; if they are, redirect to Core) | Same |
| `corpflowai.com/` (marketing apex home) | Marketing page | Marketing page | Marketing page (no operator chrome on public marketing) |

---

## 11. Implementation packet proposal (MT-1 … MT-8)

Each packet follows `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`. Below is the spine; full packet docs (Goal / DoD / Scope / Constraints / Risks / Allowed actions / Approval gates / Verification evidence / Rollback / Owner / Status) are written when each packet is approved to start.

### MT-1 — Audit / design (this document)

- Goal: Produce the read-only audit + binding containment rules + packet plan in this file. No code, no schema, no DB writes.
- Definition of Done: this file merged on `main`; cross-linked from `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` companion docs list; Anton confirms the model.
- Scope: this doc only.
- Constraints: docs-only; no code; no DB; no env; no DNS.
- Approval gate: Anton confirms before MT-2 may start.
- Rollback: revert the PR.
- Owner: Cursor (executor), Anton (approver).
- Status: **draft, awaiting Anton review.**

### MT-2 — Schema for `user_tenant_memberships` + acting-tenant session + alignment rule

- Goal: Ship the membership table (renamed to `user_tenant_memberships` in `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` r2 — covers operators **and** multi-tenant clients), the `acting_tenant_id` session field, the `requireCoreHost` gate, the host-acting-tenant alignment rule on every tenant-scoped API, and the schema cleanups (`cmp_tickets`, `cmp_ticket_attachments`, `leads`, `telemetry_events` — NOT NULL or `tenant_scope` enum).
- DoD highlights: alignment rule blocks `tenant_host_session_mismatch` server-side on every tenant-scoped endpoint; admin sessions with `acting_tenant_id ≠ null` no longer see other tenants' tickets; `requireFactoryMasterOnly` rejects when `auth_users.factory_master !== true` OR when `acting_tenant_id !== null`.
- Scope: `prisma/schema.prisma`, new migration, `lib/server/auth.js` (session payload), `lib/server/session.js`, `lib/server/host-policy.*` (new `requireCoreHost`), `lib/server/effective-memberships.js` (new helper), `lib/cmp/router.js` (extend `resolveCmpTicketListScope`, `resolveTenantIdForScopedTicketRead`, `requireFactoryMasterOnly`), `api/operator/switch-tenant`, `api/operator/leave-tenant`, `api/membership/effective`, `api/membership/list`, `api/ui/context` (add `acting_tenant_id`, `operator_memberships`), `.env.template` (`CORPFLOW_CORE_HOST`).
- Approval gate: Anton approves before Preview deploy; Anton approves before Production deploy.
- Maps to: **IM-1 (schema) + IM-2 (read APIs) + IM-5 (session shape) + IM-6 (enforcement)** in `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` r2. (r1's two-packet mapping no longer matches; r2's 8-packet split is the source of truth.)

### MT-3 — Core tenant picker UI

- Goal: Render the picker on `core.corpflowai.com/change` (and `?mode=switch`) for admin sessions with `acting_tenant_id === null` **and** for multi-tenant client sessions with ≥2 memberships (client flavour per credential doc §4.8 — no "Factory tools" entry). Single-membership users (the dominant client shape) skip the picker entirely per §4.0.
- DoD highlights: Anton signs in on Core, picker lists every active tenant + Factory tools; "Switch to this tenant" calls `POST /api/operator/switch-tenant` and redirects to the canonical tenant host (Option A in credential doc §4.4); "Leave tenant context" returns operator to the picker; multi-tenant client sees the same page in client flavour without Factory tools.
- Scope: `pages/change.js` Core branch; helpers `lib/ui/operator-affordances.js` (Core host detection) and `lib/ui/picker-flavour.js` (operator vs client flavour decision).
- Maps to: **IM-3** in `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` r2.

### MT-4 — Tenant-host "Switch workspace" redirect-only link

- Goal: On tenant hosts, when the session user has ≥2 effective memberships (`getEffectiveMemberships(user_id)`), render a single navigation link "Switch workspace" → `https://<CORPFLOW_CORE_HOST>/change?mode=switch` inside the v1 tenant chrome (`components/TenantChromeHeader.js` slot `data-tenant-chrome-switcher-stub="pending-mt-4"`). No dropdown, no list of other tenants, no local switch endpoint. Applies symmetrically to operators and multi-tenant clients per credential doc §4.5.
- DoD highlights: single-tenant clients see no link; operators with exactly 1 membership and `factory_master=false` see no link; operators with `factory_master=true` (effective memberships > 1) see the link; multi-tenant clients see the link; tenant host HTML source contains no list of other tenants and no `tenant_id` other than the active one.
- Scope: `components/TenantChromeHeader.js` (consume the existing slot), `lib/ui/operator-affordances.js` (the single `coreSwitchUrl()` helper required by credential doc §9.6b).
- Maps to: **IM-4** in `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` r2.

### MT-5 — Tenant visual separation baseline

- Goal: Make tenant identity unambiguously visible on every tenant `/change` and `/login`: tenant name (large), host (small), accent colour (already), logo when available, "Acting as `<operator>` in `<tenant>`" banner for admin sessions.
- DoD highlights: side-by-side Lux + Living Word `/change` are visually obviously different; "Acting as" banner sticky-renders even with theme CSS failing; SSR fallback so first paint shows the tenant name (not a blank Lux-default).
- Scope: `pages/change.js` chrome; `public/assets/corpflow/tenant-chrome.js` (small additions for banner); `lib/server/tenant-site-public.js` (ensure name + logo_url in payload); SSR rendering of tenant name in `pages/change.js`.
- Maps to: no IM equivalent (UI-only).
- **Status (2026-06-15, v1 shipped locally — pending merge + Production verify):**
  - `lib/client/tenant-chrome-view-model.js` — pure decision helper (17 node-tests in `node-tests/tenant-chrome-view-model.test.mjs`).
  - `components/TenantChromeHeader.js` — sticky React header (accent strip, tenant name, host + tenant_id, optional logo, "Acting in `<tenant>` as `<operator>`" pill for admin sessions, red mismatch banner when `tenant_host_session_mismatch=true`).
  - `pages/change.js` — fetches `/api/tenant/site` once per tenant context and renders `<TenantChromeHeader />` above the page shell. Renders nothing on Core / unknown surface (factory plane stays neutral).
  - `api/factory_router.js → handleUiContext` — additive: now exposes `session.username` for admin sessions so the chrome can label the operator without a second round-trip to `/api/auth/me`.
  - **v1 scope deliberately excludes**: the tenant switcher button (MT-4), `acting_tenant_id` session field (MT-2), SSR-level enforcement of `tenant_host_session_mismatch` (MT-2 / MT-6), and any change to `public/change.html` (legacy path already redirects on mismatch).
  - **v1 approximation**: "operator acting in tenant X" is rendered as "admin session on tenant host X" (no `acting_tenant_id` yet). The chrome's marker `data-tenant-chrome-switcher-stub="pending-mt-4"` reserves the future switcher slot.
  - **Verification posture**: PARTIAL until merged + deployed to Vercel Production and live-checked on `lux.corpflowai.com/change` and `living-word-mauritius.corpflowai.com/change` per `.cursor/rules/delivery-reality.mdc`.

### MT-6 — Query containment tests / tenant-isolation tests

- Goal: Add automated and live tests for every tenant-isolation invariant. CI gates merges on these.
- DoD highlights:
  - Unit test: every `prisma.<tenantScopedModel>.findMany` call site in `lib/server/` and `lib/cmp/` includes a `where: { tenantId: ... }` clause (ESLint / AST rule or grep-based CI check).
  - Negative test: admin session with `acting_tenant_id = 'luxe-maurice'` calling `ticket-get` on a Living Word ticket id gets 404 / 403.
  - Negative test: tenant client of Lux calling `/api/cmp/ticket-list` on `living-word-mauritius.corpflowai.com` gets `TENANT_ID_HOST_MISMATCH` or 403.
  - Negative test: any POST to `/api/operator/switch-tenant` from `lux.corpflowai.com` or `living-word-mauritius.corpflowai.com` returns 403 `SWITCH_NOT_ALLOWED_FROM_HOST`.
  - Live test (smoke): preview deploy + Production deploy run a multi-tenant smoke that creates a ticket in Lux as operator, switches to Living Word, confirms Lux ticket is not visible, and asserts visual separation (different `cfTenantBrand` text in HTML).
- Scope: `node-tests/`, new `scripts/smoke-multi-tenant-isolation.mjs`, CI workflow extension.
- Maps to: no IM equivalent (cross-cutting test packet).

### MT-7 — Audit trail population

- Goal: Populate `actor_user_id` on every `automation_events`, `telemetry_events`, and CMP `console_json.history` row produced by an operator-mediated action. Expose operator-activity query view to factory master.
- DoD highlights: new audit rows always carry `actor_user_id`; switch events (`cmp.operator.switched_tenant` / `cmp.operator.left_tenant`) emit the canonical five-tuple from credential doc §7.3; factory master can query "operator X actions in last 30 days across all tenants".
- Scope: `lib/cmp/router.js` write paths, `lib/automation/internal.js`, telemetry helpers; `prisma/schema.prisma` (add `actor_user_id` column to `automation_events`, `telemetry_events`).
- Maps to: **IM-1 (columns) + IM-7 (population)** in `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` r2.

### MT-8 — Promotion to Core mechanics (chatbot prompt extraction is the first concrete promotion target)

- Goal: Implement the Promotion to Core mechanics defined in §5.2 — the seeder pattern, the `cmp.capability.promoted_to_core` audit row, and the deep-merge "Tenant Overrides win" guard. Use the chatbot system prompt as the first concrete promotion target: move the currently-hardcoded prompt out of `api/factory_router.js → handleChat` (where it is a Tenant Override masquerading as a Core Capability) into `tenant_personas.personaJson.chatbot.system_prompt` (a Tenant Override field), with a safe Core Capability fallback.
- DoD highlights: `api/factory_router.js → handleChat` reads from `tenant_personas.personaJson.chatbot.system_prompt`; absence falls back to a neutral generic prompt ("This tenant has not configured its assistant; please ask the operator team to enable it.") and **never** to another tenant's persona; new Tenant Deployments get a Core Capability default CRM stage shape at onboarding via `automation_playbooks` `tenant_scope='factory'`; every Promotion to Core writes a `cmp.capability.promoted_to_core` audit row carrying capability version + target `tenant_id`s + before/after diff hash + anonymisation-review sign-off identifier.
- Scope: `api/factory_router.js → handleChat`, `lib/server/tenant-site-public.js` (extend the deep-merge pattern from `mergeSiteDraft` to chatbot + CRM config sections), new seeder `scripts/seed-core-capability-defaults.mjs` (renamed from r1's `seed-tenant-template-defaults.mjs` to use the approved noun), docs in `docs/operations/`.
- **Stream boundary:** MT-8 is the Promotion-to-Core *mechanism*. It does **not** include writing or modifying any specific tenant's chatbot prompt content (that work, if and when authorised, belongs to the per-tenant delivery stream). MT-8 only ships: (a) the code path that reads from the new Tenant Override field; (b) the safe Core Capability fallback; (c) the seeder + audit row + anonymisation-review template for future promotions.
- Maps to: no IM equivalent.

### Order, dependencies, and rollback

- MT-1 ships first (this doc). MT-2 must ship before MT-3, MT-4, MT-5, MT-6, MT-7, MT-8.
- MT-2 is the highest-risk packet (touches schema + session payload). Rollback = revert schema migration (additive only) + revert PR; old admin sessions become invalid (acceptable).
- MT-3, MT-4, MT-5 are independent UI packets — can ship in any order after MT-2 lands.
- MT-6 ideally lands in parallel with MT-2 so the tests gate MT-2's correctness before MT-3 / MT-4 / MT-5.
- MT-7 can ship in parallel with MT-3 / MT-4 / MT-5.
- MT-8 ships last (depends on MT-2's `tenant_personas` access pattern being settled).

---

## 12. Tests required before shipping (cross-cuts MT-2, MT-3, MT-4, MT-5, MT-6)

These are the binding live + automated checks. Every packet that touches the surfaces listed in §4–§7 must demonstrate each test pass before its Delivery Reality Audit verdict can flip to COMPLETE (per `.cursor/rules/delivery-reality.mdc`).

### Automated tests (run in CI; gate merges)

1. **Membership-grant alignment.** Anton's `operator_tenant_memberships` rows include Luxe + Living Word + apex; he can `POST /api/operator/switch-tenant` to each (200) and to a non-existent / non-member tenant_id (403 `NO_MEMBERSHIP`).
2. **Tenant client cannot see switcher.** Sign in as the Lux client credential; `GET /api/ui/context` does **not** include `operator_memberships`; HTML source of `lux.corpflowai.com/change` contains no element with the "Change tenant" / "Switch workspace" selector.
3. **Tenant client cannot access another tenant by hostname.** Sign in as Lux client; navigate to `living-word-mauritius.corpflowai.com/change`; expect redirect to login (or to Lux's host) — never see Living Word content.
4. **Tenant client cannot access another tenant by query param.** Lux client calls `/api/cmp/ticket-get?ticket_id=<living-word-ticket-id>` — expect 404 / 403 (today's `resolveTenantIdForScopedTicketRead` already enforces this for tenant sessions; verify the negative path).
5. **Ticket created in Lux never appears in Living Word.** Create a ticket as operator acting in Lux; switch to Living Word; assert ticket is not in `ticket-list` and `ticket-get` on its id returns 404.
6. **Approval in Living Word cannot mutate Lux ticket.** Operator acting in Living Word; `POST /api/cmp/approve-build?ticket_id=<lux-ticket-id>` — expect 403 `EFFECTIVE_TENANT_MISMATCH` (new) or 404. Today's CMP routes return scoped data only when `resolveCmpTicketListScope` returns `{ kind: 'tenant' }`, but the explicit cross-tenant write rejection is a new property added by MT-2.
7. **Chatbot config for tenant A never loads tenant B config.** Stub `tenant_personas.personaJson.chatbot.system_prompt = 'Lux assistant'` for Lux only. Call `/api/chat?message=...` with `Host: living-word-mauritius.corpflowai.com` — expect the **neutral fallback**, not "Lux assistant" and not the Wellness Concierge string.
8. **Tenant visuals differ visibly.** `node-tests/multi-tenant-visual.test.mjs` parses the rendered HTML of `lux.corpflowai.com/change` and `living-word-mauritius.corpflowai.com/change` (or SSR snapshot) and asserts: different `cfTenantBrandText`, different `--cf-accent`, different document title.
9. **Audit log records `actor_user_id` and `acting_tenant_id`.** After each test that triggers a CMP write, assert the resulting `automation_events` row has both fields populated.
10. **Switch endpoint Core-host-scoped.** Per credential doc §9.6a: send valid signed session + CSRF + body to `POST /api/operator/switch-tenant` with `Host: lux.corpflowai.com` — expect 403 `SWITCH_NOT_ALLOWED_FROM_HOST`. Repeat for Living Word host.
11. **Apex tenant id stability.** Single assert: `lib/server/host-tenant-context.js → buildCorpflowHostContext({ host: 'corpflowai.com' }).tenant_id === resolveTenantFromHost({ headers: { host: 'corpflowai.com' } }).tenant_id`.

### Live tests (run on Preview + Production per `.cursor/rules/predeploy-decision-checks.mdc`)

12. **Anton can access Luxe + Living Word from Core picker.** Sign in on Core with the admin credential; picker lists both; switching to each lands on the correct host with the correct tenant content and chrome.
13. **Anton cannot access a tenant not in his membership matrix.** Manually remove Lux from `operator_tenant_memberships` (soft via `revoked_at`); attempt to switch to Lux; expect 403 `NO_MEMBERSHIP`; Lux disappears from picker on next page load.
14. **Tenant client live login isolation.** Sign in as `bootstrap+living-word-mauritius@corpflowai.com` on `living-word-mauritius.corpflowai.com/login`; land on `/change`; visual chrome says Living Word; no "Change tenant" button; cannot read Lux ticket via any HTTP probe.
15. **No tenant-host autofill cross-tenant.** From a browser whose password manager has Lux + Living Word credentials saved, open `living-word-mauritius.corpflowai.com/login` in a fresh window: even if autofill picks Lux, the post-login state lands on Core picker (since the alignment rule rejects acting-in-Lux on Living Word's host).
16. **Production smoke before COMPLETE verdict.** Per delivery-reality.mdc: capture deployment ID + commit + HTTP 200 from each of `https://lux.corpflowai.com/change`, `https://living-word-mauritius.corpflowai.com/change`, `https://core.corpflowai.com/change`, plus the negative `https://core.corpflowai.com/api/operator/switch-tenant` from a tenant host.

---

## 13. Open questions for Anton (decisions needed before MT-2 starts)

These are decisions only Anton can make; Cursor will not assume defaults.

- **OQ-1.** **Cookie domain narrowing.** `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md` §11 explicitly rejects narrowing the cookie domain in v1 (keeps `*.corpflowai.com`). This audit agrees. Confirm: no v1 work narrows the cookie domain; we rely on host-acting-tenant alignment as the protection. **Default if no answer:** keep `*.corpflowai.com` per credential doc.
- **OQ-2.** **Apex tenant id name.** Two names are in flight: `root` (in `host-tenant-context.js` via `CORPFLOW_DEFAULT_TENANT_ID`) and `corpflowai` (hardcoded in `cmp/router.js → resolveTenantFromHost`). Which is canonical? Recommendation: standardise on `corpflowai` and migrate any `root`-keyed rows; remove `CORPFLOW_DEFAULT_TENANT_ID=root` from `.env.template`.
- **OQ-3.** **Apex tenant as a real client tenant.** Does the apex `corpflowai.com` itself host operator-only content (Core tools served at apex `/change`), or is it strictly marketing (operators always go to `core.corpflowai.com`)? Recommendation: apex is marketing only; Core is `core.corpflowai.com`. Operators visiting `corpflowai.com/change` get redirected to Core. This is the cleanest model and matches credential doc §4.7.
- **OQ-4.** **Membership matrix for Anton at MT-1 cutover.** Confirm: Anton's `operator_tenant_memberships` rows at MT-2 ship should include `luxe-maurice`, `living-word-mauritius`, and `corpflowai` (or whatever apex id OQ-2 settles on). Any others (test tenants, fixture rows) explicitly excluded.
- **OQ-5.** **Bootstrap+<tenant>@corpflowai.com row deprecation timing.** Credential doc IM-5 disables these rows after MT-3 lands and Anton is using the picker. Confirm the timeline: one billing cycle disabled, then deleted. Audit references survive because we keep the row, just block login.
- **OQ-6.** **Chatbot fallback prompt wording.** MT-8 replaces the Wellness Concierge hardcoded prompt with a neutral fallback. What is the neutral fallback wording? Proposal: *"This workspace has not configured its assistant yet. Please contact the operator team for help."* This must not promise capabilities, must not impersonate another tenant's brand.
- **OQ-7.** **Promotion model approval authority.** MT-8 introduces the template-promotion path. Who approves a template promotion? Recommendation: Anton (single approver) for v1; once a second operator joins, add a peer-review requirement.
- **OQ-8.** **CRM stage templates ownership.** Lux's current `LUX_LEAD_CRM_STAGES` lives in code. For a second tenant: keep Lux-only in code and start a clean default in `tenant_personas`, or factor a shared default? Recommendation: ship MT-8 with a Core-standard default in `automation_playbooks` (tenant_scope='factory') and leave Lux's specialised stages in code. Document the divergence.
- **OQ-9.** **Test fixture tenants.** Do we need a dedicated test tenant (e.g. `tenant_id='__test__'`) for MT-6's smoke tests so we don't pollute Lux / Living Word data during automation? Recommendation: yes; create `__test__` tenant in MT-2's seeder, membership granted to Anton, hostname `__test__.vercel.preview.corpflowai.com` (or a Preview-only host), guarded so it cannot accept production traffic.
- **OQ-10.** **Membership grant / revoke UX.** Credential doc §9.4 names CMP actions `operator.grant-membership` / `operator.revoke-membership` (factory-master-only). Should these be CLI-only (script under repo control) or also a Core UI panel? Recommendation: CLI-only for v1 (one operator); add UI later when more operators exist.

---

## Status / What I checked / What I changed / Root cause / Verification / Deployment state

This block matches the user request for the standard close.

**Status:** MT-1 (this audit) is **draft, awaiting Anton review**. Read-only packet; nothing in code, schema, DB, DNS, Vercel, env, tenant rows, or production data has been mutated. The audit document is the only artefact produced.

**What I checked:**

- Canonical docs (read in full): `docs/operations/TENANT_CLIENT_LOGIN.md`, `docs/operations/OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`, `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md`, `docs/operations/SECURITY_REVIEW_CHECKLIST.md`, `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`, `docs/CORE/TENANT_BOUNDARIES_AND_ADMIN_RULES.md`.
- Schema (read in full): `prisma/schema.prisma` (all 17 models).
- Code (read in full): `lib/server/auth.js`, `lib/server/host-tenant-context.js`, `lib/server/tenant-host-session-gate.js`, `lib/server/tenant-site-public.js`, `public/assets/corpflow/tenant-chrome.js`, `api/factory_router.js`. Targeted reads of `lib/cmp/router.js` (gates `requireDormantGate`, `requireFactoryMasterOnly`, `enforceCmpTenantBoundary`, `resolveTenantFromHost`, `resolveCmpTicketListScope`, `resolveTenantIdForScopedTicketRead`, `FACTORY_ONLY_CMP_ACTIONS`, `TENANT_SCOPED_CMP_ACTIONS`), `pages/change.js` (no SSR / `getServerSideProps`; pure CSR; session indicator at line 2447), `public/change.html` (host-session-mismatch redirect at line 5253), `public/login.html` (factory-tools toggle at line 869 and forced-factory-admin mode at line 426).
- Onboarding scripts (read in full): `scripts/upsert-luxe-maurice-hostnames.mjs`, `scripts/upsert-living-word-mauritius-tenant.mjs`. Recent untracked diagnostic scripts noted in git status (not modified).
- Env: `.env.template` (`CORPFLOW_CORE_HOSTS`, `CORPFLOW_DEFAULT_TENANT_ID`, `CORPFLOW_ROOT_DOMAIN`, `CORPFLOW_TENANT_HOST_MAP`, `CORPFLOW_ORG_TENANT_IDS`, `CORPFLOW_APEX_ALLOW_DB_HOST_OVERRIDE`).
- Greps (repo-wide, paths returned as files-with-matches): `tenant_id` / `tenantId`, `tenant_hostnames`, `auth_users`, `tenant_personas`, `cmp_tickets`, `/change`, `tenant-chrome`, `login_route`, `level === 'admin'`, `factory`, `lifecycle`, `approvals`, `promotion`, `preview_url`, `chatbot`, `crm`, plus the specific gates `requireDormantGate|requireFactoryMasterOnly|requireTenantSession|FACTORY_ONLY_CMP_ACTIONS|enforceCmpTenantBoundary`.

**What I changed:** Only this file (`docs/operations/MULTI_TENANT_CONTAINMENT_AND_VISUAL_SEPARATION_AUDIT.md`) is newly written. No code, no schema, no migrations, no DB rows, no env vars, no DNS, no Vercel settings, no tenant data.

**Root cause (of the contamination risks identified):** Today's platform has tenant-resolution-from-host (good) and per-row `tenant_id` scoping on most tables (mostly good), but lacks (a) an explicit server-side `acting_tenant_id` on operator sessions, (b) a host-acting-tenant alignment gate enforced on the **live** `/change` SSR route (the legacy `public/change.html` has it; the Next.js `pages/change.js` does not), (c) an `operator_tenant_memberships` table, (d) visible tenant identity in chrome strong enough to prevent operator typing errors, and (e) NOT NULL semantics on `tenant_id` for tables that overload `null` to mean "Core". The 2026-06-15 04:12 UTC+4 incident (autofilled Lux credential on Living Word's host, page rendered Lux content) is the visible symptom of items (a) + (b) + (d).

**Verification:** This audit produces **no runtime artefacts** to verify in production. Verification is documentary:

- File present at `docs/operations/MULTI_TENANT_CONTAINMENT_AND_VISUAL_SEPARATION_AUDIT.md` with the 13 required sections.
- Cross-links resolve (`OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`, `TENANT_CLIENT_LOGIN.md`, `SECURITY_REVIEW_CHECKLIST.md`, `PRODUCTION_GRADE_CLIENT_OUTCOMES.md`, `CORPFLOW_EXECUTION_PACKET_STANDARD.md`, `CORE/TENANT_BOUNDARIES_AND_ADMIN_RULES.md`, `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc`).
- Containment rules in §4 do not contradict `OPERATOR_MULTI_TENANT_CREDENTIAL_V1.md`'s §3.4 alignment rule, §5 server-side isolation rules, §6 API behaviour, or §9 security review triggers.

**Deployment state:** Not applicable — docs-only audit. No Vercel deployment, no commit on `main` yet, no production verification required. Per `.cursor/rules/delivery-reality.mdc`, this packet is **PARTIAL** until the PR merges and the file is reachable on the default branch; it becomes **COMPLETE** when Anton confirms the model in §13's open questions and the next packet (MT-2) is opened for review. No live production URL change. No Vercel deployment ID. No CI gate beyond `npm run build` (docs-only changes do not trip security-sensitive paths in `.cursor/rules/security-sensitive-changes.mdc`).

**Next gate (do not proceed past without Anton):** Anton answers OQ-1 … OQ-10 in §13, then MT-2 packet is drafted per `CORPFLOW_EXECUTION_PACKET_STANDARD.md` §2 and approved separately.
