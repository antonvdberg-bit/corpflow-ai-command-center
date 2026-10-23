# Neon / Infisical operator preflight — evidence before instructions

**Scope:** Controller and agent guidance for the existing Core Neon database; documentation only. This does not modify runtime database connections or authorize production mutations.

## Mandatory preflight

Before recommending a Neon click, database credential, connection change, migration or executor dispatch:

1. Read `AGENTS.md`, `docs/operations/COO_OPERATING_CONSTITUTION.md`, `docs/operations/CORPFLOWAI_CURRENT_DELIVERY_REALITY.md`, `docs/operations/ORGANIZATIONAL_MEMORY_AND_AGENT_BOOTSTRAP_V1.md`, `agent-context/README.md`, `docs/operations/POSTGRES_PROVIDER.md`, the relevant migration runbook and current GitHub issues/PRs. Record the actual names and current scopes before making operator instructions.
2. Distinguish **repo-documented intended configuration** from **observed live settings**. `prisma/schema.prisma` reads `POSTGRES_URL`. A separate `DIRECT_URL` or `POSTGRES_URL_NON_POOLING` name is not required by Prisma merely to run `migrate resolve`; use a validated direct URL as process-local `POSTGRES_URL` where authorised.
3. In Infisical, inspect the actual project, environment and secret **names only**, not values. The 23 October 2026 operator screenshots show `POSTGRES_URL` under Development and Production and `DATABASE_URL` and `PRISMA_DATABASE_URL` under Production. They did **not** show `DIRECT_URL` or `POSTGRES_URL_NON_POOLING` in the inspected inventory. This is a dated observation, not a permanent secret absence assertion.
4. In the Neon Console, identify the current UI from screenshot or current official product documentation rather than guessing menu names. On 23 October 2026, the observed **Connect to your branch** modal had branch `production`, database `neondb`, role `neondb_owner`, and **Connection pooling** toggle. Changing that modal toggle selects whether the *displayed/copied connection string* is pooled; it does **not** change the application's deployed pooling setup. Do not instruct an operator to search Branches/Databases overflow menus for a Connect option without evidence.
5. Separate runtime connection configuration from a one-time migration administrative process. Normal Core application `POSTGRES_URL` is pooled. Direct connections are appropriate for migration administration; **never persistently replace the pooled production secret or Vercel env** in order to run a one-off Prisma command. No credentials, URLs, secrets or password screenshots may be pasted into chat, PRs or issue comments.
6. Check existing executor claims and credentials/capabilities before dispatch. A cursor session lacking a non-pooled URL or workflow-file write access is an *executor environment blocker*, not evidence the underlying Neon credential is absent or the architecture needs rebuilding.
7. Hold exact protected approvals. Issue #1517 CEO approval is solely `npx prisma migrate resolve --applied 20261021140000_bad_purchase_ownership` on existing Core `neondb` after identity/schema/history preflight. **Do not** execute `prisma migrate deploy`, reapply ownership SQL, alter failed `20260514120000_lux_listings`, change flags/env/secrets or deploy. Verify the Prisma history record after any authorised command.

## Operator-interaction rule

Give **one screenshot-grounded step at a time**. If two navigation attempts contradict observed UI, stop guessing and use the vendor's current documentation/help. Never ask the CEO to create an integration, new secret, paid service, second database or PR until evidence proves the existing route cannot work and the protected action is approved.

## Incident and learning (23 October 2026)

The controller repeatedly routed Anton through nonexistent Neon menu paths, inferred a missing credential from an absent env alias, and initiated a workflow-development detour despite repo-first governance. The underlying Prisma history write remained unexecuted. Correction: verify repository instructions **before** operating guidance, distinguish observed runtime from intended names, and prefer the smallest existing secure execution route. No runtime change is implied by this guidance.
