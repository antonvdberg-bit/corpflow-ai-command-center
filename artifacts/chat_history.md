# CorpFlow AI Command Center — conversation history (human reference)

**Purpose:** Capture *decisions, direction, and “where things live”* from Cursor chats so you can orient quickly without rereading long threads. This file is **not** a full transcript.

**Operator context (read before technical work):** The primary stakeholder is **not a programmer**. Assistants should operate as a **top-tier software architect**, **development team lead**, and **senior engineer** in one: own trade-offs, explain in plain language, surface risks and next steps, and **not** assume prior implementation knowledge. Prefer **actionable guidance** and **explicit defaults** over open-ended questions unless a choice is truly business-owned (call those out clearly).

**How assistants should use it:** Read this file at the start of substantive work when the user asks for continuity or says “check history.”

**How you maintain it:** After important chats, paste a short summary here (or ask the assistant for a “history entry” prompt and paste the result into the next section). See **Include / omit** below.

**Cadence (human habit, not automatic):** Nothing in Vercel or the Factory app updates this file by itself. “Automated cadence” in practice means a **calendar reminder** (e.g. weekly or after each deploy) or a **recurring task** that says: *open `artifacts/chat_history.md` and add one bullet*. Optional: a GitHub Action that only **nags** if the file was not touched in N days (still requires you to write the text). This is **separate from Cursor**—Cursor does not append here unless you (or an assistant in a chat) edit the repo.

---

## Include / omit (keep this file safe and useful)

| Include | Omit |
|--------|------|
| What we decided and **why** (one or two sentences) | Passwords, API keys, tokens, private keys, full `.env` values |
| **Feature flags / env var names** (names only) | Long code dumps (link to files or commits instead) |
| **File paths** and major components touched | Personal data about clients or staff |
| **Production URLs / hostnames** (if non-sensitive) | Anything you would not paste in a shared Slack channel |
| **Commit messages or themes** when they mark a milestone | Verbatim multi-page assistant replies |

**Full history vs prune:** Starting **full** in a scratch note and then pruning into this file works well. This file should stay **short** (roughly one screen per month of work); archive older bullets to `artifacts/chat_history_archive.md` only if you need them later.

---

## Timeline (key themes)

### 2025–2026 — Cloud factory, governance, and Vercel hardening

- **Factory inventory & credentials:** Added structured artifacts (e.g. `FACTORY_INVENTORY.md`, `.env.template`, `vanguard/secrets-manifest.json`, telemetry schema) and removed or parameterized hardcoded IDs/URLs where found (Vercel deployer, Baserow sync, `vercel.json` placeholders).
- **CMP governance:** Tier/cluster gating, Dormant Gate (session token vs factory master), costing rigor hooks, token/credit guardrails, provisioning and billing sentinel/cron wiring discussed and implemented across multiple sessions.
- **Vercel / serverless reliability:** Work to make Node modules CJS-safe, include Prisma in the bundle, centralized runtime configuration, factory health diagnostics, Next/React pinning, and middleware export naming aligned with Next 15/16 (`proxy` vs `middleware`).

### Runtime configuration (“vanishing” env vars)

- **Mechanism:** `lib/server/runtime-config.js` — `cfg()` prefers individual `process.env` keys, then **`CORPFLOW_RUNTIME_CONFIG_JSON`** (single JSON blob, parsed once, BOM stripped). `POSTGRES_URL` also checks common Prisma/Vercel aliases.
- **Operations:** Changing Vercel env often requires a **redeploy** so the running deployment sees new values; manual “Redeploy” entries in Vercel match **syncing physical env with code expectations**.
- **Diagnostics:** Factory health reporting includes `runtime_config` parse status (see `api/factory_router.js` factory health handler).

### Tenancy and host boundary

- **CORE vs tenant:** `lib/server/host-tenant-context.js` — hosts listed in `CORPFLOW_CORE_HOSTS` are treated as factory/ops surfaces; tenant resolution uses optional `CORPFLOW_TENANT_HOST_MAP`, subdomain of `CORPFLOW_ROOT_DOMAIN`, and `CORPFLOW_DEFAULT_TENANT_ID` on apex.

### Sovereign Change / UAT / signoff (product direction)

- **Target experience (your words):** Clients activate an **update/change** path on the **published** site, describe requests in **plain language** (any language), an **AI** interprets and **chats** to refine the request, then a **factory-managed** process (build, test, etc.) runs until the client **approves** publishing to production.
- **What exists in code today (partial):** CMP **bubble** + **`ai-interview`** (clarification), **`costing-preview`**, **`approve-build`** (ticket/build pipeline); **sovereign** **`tenant-session-bootstrap`** + **`signoff`** promote **`pending_config` → `live_config`** in Baserow; host/CORE boundary and runtime config as above. **Gaps vs full vision** (typically not one switch): multilingual UX as a first-class product setting, on-site “overlay” chrome wired to every tenant theme, automated test gates as blocking steps, and n8n/GitHub Actions orchestration fully replacing placeholders (e.g. **`sandbox-start` 501**)—treat those as roadmap unless verified in deployment.
- **Design:** Security gate for sensitive CMP actions is server-side (Dormant Gate), not “the router as gate.” Per-tenant PINs and UAT (`pending_config` → `live_config`) were specified to avoid overloading `MASTER_ADMIN_KEY` and to keep **no network I/O** inside synchronous path parsing.
- **Implementation themes (when built):** `req.corpflowContext` from host; two-lane auth (factory master vs tenant sovereign session); Baserow timeouts; `recordSovereignAuditEvent` pattern; ghost/execution-only hosts via env-driven rewrites (`CORPFLOW_GHOST_HOSTS` / maps) and `public/log-stream.html`; admin UI surfaced only with `?admin=true` where specified.

### Session continuity (this workspace)

- **Cursor:** Past chat text is not auto-loaded into new threads; **agent transcripts** may exist under the IDE project’s agent-transcripts area for some sessions.
- **User preference:** Provide a short “state of the world” + point to this file for handoff.

### Current code layout (verify when refactoring)

- **Single Vercel Node entry:** `api/factory_router.js` receives all `/api/*` traffic via `vercel.json` rewrites (`__path` carries the suffix).
- **CMP implementation:** `lib/cmp/router.js` (actions such as `ai-interview`, `tenant-session-bootstrap`, `signoff`) with shared modules under **`lib/cmp/_lib/`** (not under `api/cmp/`).
- **Operational URLs (env only):** **Baserow** = `BASEROW_URL`. **n8n** lead intake = `N8N_WEBHOOK_URL` (`lib/server/main.js`). Optional **CMP automation ping** = `N8N_CMP_WEBHOOK_URL`. **GitHub sandbox branches** = `GITHUB_REPO` + `CMP_GITHUB_TOKEN` → `repository_dispatch` `cmp_sandbox_start`. **Do not** commit real factory hostnames in git—use `.env` / Vercel (see `.env.template` placeholders `YOUR_BASEROW_HOST`, `YOUR_N8N_HOST`).

---

## Source transcripts (optional cross-reference)

These IDs refer to Cursor **parent** agent session logs (not subagents). They are **optional**: use them when you want an assistant to search or summarize a *specific past Cursor session* by reading the matching `.jsonl` file under the IDE’s project `agent-transcripts` folder (filename = UUID). **Not every chat is logged**; missing IDs simply means there is no transcript file for that conversation.

| Topic (≤6 words) | Transcript ID |
|------------------|----------------|
| [Sovereign state implementation](f98ad7ae-4097-46bf-8696-76f5e8c021ad) | `f98ad7ae-4097-46bf-8696-76f5e8c021ad` |
| [Cloud factory governance audit](90e01088-dbf4-46d1-b6ba-15744c4c90e9) | `90e01088-dbf4-46d1-b6ba-15744c4c90e9` |
| [Deployment continuity March 2026](ff9c81ac-ed10-425f-869d-d339c9a9930c) | `ff9c81ac-ed10-425f-869d-d339c9a9930c` |
| [Session log (untitled)](f2d16c0b-16ea-4cd6-ac02-654307e8e984) | `f2d16c0b-16ea-4cd6-ac02-654307e8e984` |
| [Session log (untitled)](81011755-ee18-4cdf-99af-79d64ae1b085) | `81011755-ee18-4cdf-99af-79d64ae1b085` |

---

## Product / operator decisions (authoritative)

- **2026-03-30 — Onboarding playbook:** Limited to **factory operators only** (not every end client). Client sites use the **public embed** path (`change-overlay.js` + CMP bubble) pointed at the deployed Command Center API.
- **2026-03-30 — Hostnames in git:** **Option B** — no real Baserow/n8n factory URLs in committed files; real values live in **Vercel / `.env`** only.
- **2026-03-30 — Roadmap execution:** Ship **client overlay + i18n** and **automation (n8n + GitHub Actions)** as soon as practical; implementation tracked in repo (overlay loader, `ai-interview` locale, dispatch + workflow).

## Entries to append (newest at bottom)

<!-- Paste new bullets here, e.g. "2026-03-30: Confirmed production on commit b1891df; redeployed for env sync only." -->

- **2026-03-30 (post-decisions):** **Placeholder URLs (B)** across template/docs/code defaults (`BASEROW_URL` / `N8N_*` / Baserow client default `https://api.baserow.io`). **`N8N_WEBHOOK_URL`** required for `/api/main`; **`getN8nWebhookUrl()`** in `lib/server/config.js`. **i18n:** `lib/cmp/_lib/ai-interview.js` supports `locale` on `ai-interview` (en/es/fr/de/pt); **`public/assets/cmp/bubble.js`** mirrors locale via `data-cmp-locale` or `navigator.language`. **Client overlay:** `public/assets/corpflow/change-overlay.js` + `public/assets/corpflow/README.md`. **Automation:** `lib/cmp/_lib/github-dispatch.js` (`dispatchCmpSandboxStart`); **`approve-build`** and **`sandbox-start`** trigger `repository_dispatch` + optional **`N8N_CMP_WEBHOOK_URL`**; **`.github/workflows/cmp-branch.yml`** creates/pushes `cmp/{ticket_id}`. **Vercel secrets to set:** `CMP_GITHUB_TOKEN` (repo `contents:write`), `GITHUB_REPO=owner/repo`, plus existing Baserow/n8n URLs.

- **2026-03-30:** Consolidated Vercel serverless surface to a **single Node entry** (`api/factory_router.js`) to stay under Hobby **function-count** limits; `vercel.json` rewrites `/api/*` → `factory_router` with an `__path` parameter (CMP query strings preserved). Former per-route handlers live under `lib/server/`, CMP under `lib/cmp/`, factory helpers under `lib/factory/`; legacy FastAPI chat/health source moved to `lib/python/` while public `/api/chat` and `/api/health` are served from the router (e.g. Groq). **Docs:** `FACTORY_INVENTORY.md` and `SOVEREIGN_BLUEPRINT.md` gained a **Bypass Architecture: Unified Serverless Gateway** section so the operating manual matches the machinery.

- **2026-03-30:** Production health restored end-to-end: `CORPFLOW_RUNTIME_CONFIG_JSON` must be **strict JSON** (and **linked to the Vercel project** when stored as a team shared variable); runtime now **strips UTF-8 BOM** and `/api/factory/health` exposes **`parse_error` / `first_char`** when parse fails. **CORE vs tenant** is encoded in `lib/server/host-tenant-context.js` with env **`CORPFLOW_CORE_HOSTS`**, **`CORPFLOW_TENANT_HOST_MAP`**, and **`tenancy_boundary`** on factory health; ops on **`core.*`**, marketing tenant on apex via map. **Vercel CJS:** removed **`import.meta.url`** from server-side modules that were crashing (`billing-sentinel`, CMP `router`, `lib/factory/costing.js`). **Prisma:** `prisma` + `@prisma/client` in dependencies, **`postinstall`** + **`vercel-build`** run `prisma generate`. **Onboarding playbook:** Baserow tenant row → master provision PIN on **`/log-stream.html`** (CORE) → sovereign bootstrap on **`/?admin=true`** → UAT signoff (`pending_config` → `live_config`). Milestone commits on `main` include CORE boundary and runtime JSON diagnostics (themes: `feat: explicit CORE vs tenant host boundary`, `fix: surface runtime JSON parse errors + strip BOM`).

- **2026-03-30:** **CMP “nervous system” (Phases 1–2) + earlier routing fixes:** Agreed **Baserow** (URL from `BASEROW_URL`, self-hosted or Baserow Cloud) is the **system of record** for ticket workflow; **Vanguard** under `vanguard/` (schemas + future `audit-trail/{ticket_id}/`) holds **durable technical JSON**, with narrative sign-offs intended under `docs/audit-trail/{client_id}/{ticket_id}.md`; **sandbox = git branch + Vercel Preview** (deployment protection); **production** merges only via **GitHub Actions** bot after gates (**target** automation—confirm workflow is enabled and passing in GitHub). **Costing** is **USD-only**: full market value always recorded for audit; **`is_demo`** applies a **20% display discount** only in UI/API preview responses. **Built:** `vanguard/schema/*`, **`lib/cmp/_lib/`** (`baserow.js`, `costing-engine.js`, `cmp-fields.js`, `preview-heuristics.js`, etc.), CMP actions reached as **`/api/cmp/...`** through **`factory_router`** → **`lib/cmp/router.js`** (`ticket-create`, `ticket-get`, `costing-preview`, `approve-build`, …), **`public/assets/cmp/bubble.js`** (Shadow DOM + localStorage/cookie ticket id; not yet embedded in tier pages), and draft **`.github/workflows/cmp-branch.yml`**. **Earlier same initiative:** `vercel.json` rewrites for **`/legal`**, **`/medical`**, **`/lux`**, **`/master`**; canonical Master Control at **`public/master-control.html`** (removed duplicate under `public/admin/`); tier lead posts go through **`/api/main`** → **`N8N_WEBHOOK_URL`** (see **`lib/server/config.js`** / **`.env.template`**).

- **2026-03-30 (CMP bubble + API):** Injected **`/assets/cmp/bubble.js`** on **`/medical`** (proposal), **`/legal`**, **`/lux`**, and **`/`** (see `public/proposal-medspa.html`, `public/legal-demo.html`, `showcase/luxe-maurice-private/index.html`, `public/index.html`). Bubble uses **Shadow DOM**; **`pathnameBranding()`** sets costing inputs: **`/`** → **`internal`** tier + **`is_demo`** for displayed client price, **`/legal`** → **`enterprise`**, **`/lux`** → **`premium`**; explicit **`data-cmp-tier` / `data-cmp-is-demo`** override. **Phase 3 flow:** after submit, “AI analyzing” → **`POST …/ai-interview`** (three clarification questions from inferred complexity) → user continues → **`costing-preview`** → **`approve-build`**. **Vercel Hobby function cap:** CMP is **not** a separate `api/cmp/*.js` serverless route; **`factory_router`** dispatches to **`lib/cmp/router.js`** (actions via path/query). **`bubble.js`** uses URLs such as **`/api/cmp/...?action=…`** where needed so query strings are preserved under unified rewrites. **`sandbox-start`** triggers **`repository_dispatch`** when **`CMP_GITHUB_TOKEN`** + **`GITHUB_REPO`** are set (see **`.github/workflows/cmp-branch.yml`**). **`node_modules/`** is in **`.gitignore`**; **`git ls-files node_modules`** is empty in this repo (nothing to remove from the index). Vanguard JSON schemas remain under **`vanguard/schema/`**.
