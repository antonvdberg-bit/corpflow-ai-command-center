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

## Legacy: Python engine (`core/engine/`)

Some workflows still run **pytest** on `core/engine/tests/`. Only follow the Antigravity-style instructions below when editing that tree.

<details>
<summary>Legacy Antigravity / Python template (expand if needed)</summary>

- Optional reads: `mission.md`, `.antigravity/rules.md`, `CONTEXT.md`, `.cursorrules`
- Setup: `python -m venv venv`, `pip install -r requirements.txt`, `pip install -r core/engine/requirements.txt`
- Tests: `pytest core/engine/tests/`

</details>
