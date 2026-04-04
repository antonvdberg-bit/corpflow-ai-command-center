# Production-grade client-visible outcomes (canonical)

## Purpose

This document is the **canonical standard** for what “done” means when CorpFlow ships something a client can see, touch, or rely on. It exists to **stop rework** and eliminate ambiguity.

If a decision conflicts with this doc, update this doc first (or document an exception explicitly).

## The technical business partner role (in this repo)

The primary technical role is to **drive production-grade, client-visible outcomes**.

- **Outcome-first**: optimize for the shortest time from client request to a visible, reliable result.
- **Cost-aware**: prefer the cheapest option that meets the “production-grade” bar; avoid “cool tech” that doesn’t move outcomes.
- **Documented**: decisions live in repo docs (not only chat). If it isn’t documented, it will be re-decided later.

## “Production-grade” definition (must be true)

For any client-visible surface (e.g. `/login`, `/change`, tenant site, billing views, file uploads):

- **Reliable**: errors degrade gracefully and tell the operator what to do next (no silent failures).
- **Secure**: tenant isolation is enforced server-side; unauthenticated and cross-tenant access is denied.
- **Observable**: there is a clear readiness/health signal (UI warning, health endpoint, or operational checklist).
- **Repeatable**: there is a **golden-path demo** that works from a clean session with known hosts/tenants.
- **Operable**: the workflow can run without a developer laptop for day-to-day operations (see `docs/EXECUTION_BRAIN_VS_HANDS.md`).

## Cost gates (default choices)

We intentionally start with low-cost primitives and only upgrade when volume forces it.

- **Prefer** Postgres + Prisma for workflow state and modest artifacts.
- **Prefer** n8n forwarding for notifications and business automation when it saves operator time.
- **Avoid** premature object storage/CDN/queues unless required for scale, compliance, or latency.

When proposing an upgrade (e.g. move attachments from Postgres to S3), document:

- **Trigger** (what metric or failure forces the change)
- **Cost** (monthly + operational)
- **Migration plan** (how existing client data moves)

## Canonical sources of truth (do not duplicate)

- **Host / apex / login routing / tenant mapping**: `docs/operations/TENANT_CLIENT_LOGIN.md`
- **Execution boundaries (“brain vs hands”)**: `docs/EXECUTION_BRAIN_VS_HANDS.md`
- **Automation framework (events, playbooks, risk)**: `docs/automation-framework.md`
- **n8n forwarding recipe**: `docs/n8n/automation-forward-recipe.md`
- **Team priorities**: `docs/CORPFLOW_SHARED_TODO.md`

## Demo standard (what we can show anytime)

At any point, we should be able to demo the “golden path” end-to-end with one tenant:

1. **Login** on the tenant host
2. **Create ticket** in Change Console
3. **Estimate** (benchmark vs CorpFlow cost line visible)
4. **Approve build** (status + next-step visibility)
5. Optional: **attachments** and **automation notifications**

If any step is not reliably demoable, it is a **P0 clarity problem**: document why and what blocks it.

