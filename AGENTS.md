<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->

# CorpFlow AI Command Center — agent guide

This repository is the **CorpFlow AI Command Center**: **Next.js** (pages router), **Node** server/API routes, **Prisma** + **Postgres**, CMP/automation under `lib/cmp/` and `lib/automation/`. Ignore the **legacy Python / Antigravity template** section at the bottom unless you are explicitly working in `core/engine/` Python.

## Process (every commit / push)

1. **`docs/CORPFLOW_SHARED_TODO.md`** — § *Base process — commit, push, and documentation*.
2. **`.cursor/rules/commit-push-doc-constraints.mdc`** and **`.cursor/rules/security-sensitive-changes.mdc`** (always on).
3. Security-sensitive edits: **`docs/operations/SECURITY_REVIEW_CHECKLIST.md`**.

## Git note (default branch `main`)

If Git says **`ambiguous argument 'main'`**, a tracked path named **`main`** may exist at the repo root — see **`docs/operations/GIT_AND_MAIN_BRANCH.md`**. Prefer **`refs/heads/main`** in commands when needed.

## Must-read (by topic)

| Topic | Doc |
|--------|-----|
| Priorities & checklist | `docs/CORPFLOW_SHARED_TODO.md` |
| Production bar (reliable, secure, observable) | `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` |
| Host / apex / login / tenancy | `docs/operations/TENANT_CLIENT_LOGIN.md` |
| Security review triggers | `docs/operations/SECURITY_REVIEW_CHECKLIST.md` |
| Incident / rotation stub | `docs/runbooks/SECURITY_OR_INCIDENT.md` |
| Brain vs hands / automation | `docs/EXECUTION_BRAIN_VS_HANDS.md`, `docs/automation-framework.md` |
| n8n forward | `docs/n8n/automation-forward-recipe.md` |
| CMP API surface | `lib/cmp/README.md` |
| Vercel / cron / Technical Lead / Bugbot | `docs/VERCEL_DEPLOYMENT.md` |
| Env placeholders | `.env.template` |
| ADR-lite decisions | `docs/decisions/README.md` |
| Compliance starter | `docs/compliance/DATA_MAP_AND_SUBPROCESSORS.md` |

## Build / test (app)

```bash
npm ci
npm test
npm run build
```

Prisma client generates on `postinstall` / `npm ci`. CI runs Python tests under `core/engine/tests/` plus `npm test`, `npm audit`, and `npm run build` (see `.github/workflows/test.yml`).

### CI / supply chain (maintainers)

- Third-party Actions in workflows that install tooling or touch GitHub API are **pinned to full commit SHAs** (see YAML comments). Bump intentionally after review.
- Groq chat/completions use **`lib/server/groq-client.js`** — one URL + `resolveGroqModel('primary' | 'technical_lead_rephrase')` (TL rephrase: optional `CORPFLOW_TECHNICAL_LEAD_LLM_MODEL`, else built-in default — not `GROQ_MODEL_NAME`).
- **CMP action gates:** tenant session actions go through `requireDormantGate` / `requireFactoryMasterOnly` in `lib/cmp/router.js` — high-impact routes (`promote-merge`, `approve-build`, factory-only repair) stay separated from read-only analysis.

## Cursor Bugbot (optional, free tier)

Enable **[Cursor Bugbot](https://cursor.com/docs/bugbot#setup)** on the GitHub repo for PR-level review comments. Use it as a **fast second pair of eyes** alongside **Agent CI**; it does **not** replace deterministic checks or the **Technical Lead observer** (evidence persisted in Postgres — see below).

<!-- Optional tracked onboarding URL (same doc anchor): https://track.pstmrk.it/3s/cursor.com%2Fdocs%2Fbugbot%23setup/I76j/74HEAQ/AQ/1556dd49-ceef-4739-bd8c-e16116455257/1/rFvvTlI3G-#setup -->

## Technical Lead Phase A (observer) — how to proceed

**What it is today:** read-only cycles for **Approved / Build** tickets — `console_json` + GitHub PR/compare/check-runs + optional Vercel preview deployment rows + optional factory health. Outputs **gaps + summary** into **`technical_lead_audits`** (not only PR chatter).

**Operational checklist (production):**

1. **Schema:** `npx prisma migrate deploy` on the live DB (or `ensure-schema` if you rely on idempotent DDL); confirm table `technical_lead_audits` exists.
2. **Vercel env:** `CORPFLOW_CRON_SECRET` / **`CRON_SECRET`** (same value), GitHub + `GITHUB_REPO`/`CMP_GITHUB_*` as today, **`CORPFLOW_FACTORY_HEALTH_URL`** (origin or full health URL), **`VERCEL_*`** aligned with `promote-status` / `vercel-preview.js`.
3. **Cron:** `vercel.json` already schedules `/api/cron/technical-lead` daily — verify Vercel shows successful invocations after deploy.
4. **Read results:** `GET /api/factory/technical-lead/audits?ticket_id=…` (factory master) or query Postgres; locally `npm run technical-lead:run`.

**Phase B (implemented):** `technical-lead-latest` CMP action + **Factory oversight** panel on `/change`; **`config/technical-lead-checklist.v1.json`** (`disabled_rule_ids`); optional Groq rephrase via **`CORPFLOW_TECHNICAL_LEAD_LLM_SUMMARY`** (writes **`evidence_json.llm_summary_rephrase`** only; DB `summary_text` stays deterministic).

**Next (Phase C ideas):** richer gap detail in UI (expandable), per-tenant checklist paths, or ticket-level checklist overrides.

## Legacy: Python engine (`core/engine/`)

Some workflows still run **pytest** on `core/engine/tests/`. Only follow the Antigravity-style instructions below when editing that tree.

<details>
<summary>Legacy Antigravity / Python template (expand if needed)</summary>

- Optional reads: `mission.md`, `.antigravity/rules.md`, `CONTEXT.md`, `.cursorrules`
- Setup: `python -m venv venv`, `pip install -r requirements.txt`, `pip install -r core/engine/requirements.txt`
- Tests: `pytest core/engine/tests/`

</details>
