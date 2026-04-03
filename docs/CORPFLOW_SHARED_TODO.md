# CorpFlow shared to-do list

**Purpose:** One checklist the whole team (you + AI agents + contractors) can use.  
**How to use:** Edit in this repo, commit, push. Agents read `docs/CORPFLOW_SHARED_TODO.md` by path; you track the same file in GitHub or your IDE.

**Convention:** `- [ ]` open · `- [x]` done · `(owner)` optional · Priority: **P0** ship blockers, **P1** next, **P2** later.

---

## P0 — Spine & safety (now)

- [X] **Postgres tables (once per prod DB):** `POST /api/factory/postgres/ensure-schema` with factory master auth — step-by-step: `docs/operations/ENSURE_POSTGRES_SCHEMA.md`.
- [X] **Vercel — ingest:** set `CORPFLOW_AUTOMATION_INGEST_SECRET` (header `x-corpflow-automation-secret` on `POST /api/automation/ingest`). Optional: `CORPFLOW_AUTOMATION_APPROVAL_SECRET` for high-risk event types.
- [ ] **Vercel → n8n (“max n8n”, optional but recommended):** set `CORPFLOW_AUTOMATION_FORWARD_URL` to your **n8n Webhook** production URL. Set `CORPFLOW_AUTOMATION_FORWARD_SECRET` to a random string; in n8n, validate header **`x-corpflow-automation-forward-secret`** matches (see `docs/n8n/automation-forward-recipe.md`). Triggers on ingest + CMP mirror events (`cmp.ticket.created`, `cmp.estimate.recorded`, `cmp.build.approved`, `cmp.github.callback`, etc.).
- [ ] **n8n workflow:** implement branches from `docs/n8n/automation-forward-recipe.md` (e.g. log + notify on `cmp.build.approved` / `cmp.github.callback`).
- [ ] Document **who** holds `MASTER_ADMIN_KEY` rotation / break-glass (not in repo).

## P1 — Execution off laptop (see `docs/EXECUTION_BRAIN_VS_HANDS.md`)

- [x] Scheduled **GitHub Action** `.github/workflows/factory-health-ping.yml` (Mondays UTC).
- [ ] Set GitHub repo secret **`CORPFLOW_FACTORY_HEALTH_URL`** = e.g. `https://corpflowai.com/api/factory/health` so the ping hits prod.
  - **Reminder:** If you **split DNS, traffic, or deployments** (e.g. apex vs `core.*` on different projects, edge proxies, regional routing), **revisit this secret** — update it (or add a second check) so CI still monitors the URL that matters. See `docs/EXECUTION_BRAIN_VS_HANDS.md` § Factory health URL.
- [ ] Add **protected** Vercel route or cron (existing `vercel.json` crons) for periodic tasks you want without opening the laptop.
- [ ] Decide n8n hosting: same host 24/7 vs trigger-only; ensure `CORPFLOW_AUTOMATION_FORWARD_URL` is reachable from Vercel.
- [ ] (Optional GCP) Cloud Scheduler → HTTPS to factory endpoint with shared secret (uses existing Google Cloud account).

## P1 — Tenant surfaces (DB-driven, low drama → high leverage)

**Firm request + rubric:** `artifacts/firm_request_db-driven-staged-path.md` (factory vs brain, Luxe login ops).

- [ ] **Unify tenant site read** — one server helper for merged `{ tenant, site }` used by Next `getServerSideProps` and `GET /api/tenant/site`.
- [ ] **Cache public reads** — `Cache-Control` (and optional `ETag`) on `GET /api/tenant/site` for anonymous traffic.
- [ ] **Prisma / Postgres pooling** — align serverless client usage with Neon/Vercel guidance (document chosen pattern in `CONTEXT.md` or ops doc).
- [ ] (Optional) **ISR / edge** for tenant `/` when draft staleness is acceptable.

## P1 — AI provision & Change Console

- [ ] Factory HTML tail for `GET /api/automation/events` (operator view without curl).
- [ ] One **golden-path** vertical script: tenant + hostname + smoke ticket (extend `scripts/onboard-demo-tenants.ps1` pattern).
- [ ] Playbook seed: 3× `automation.playbook.upsert` via ingest (password reset, CMP forward, tenant onboarding).

## P2 — Websites & marketing (no new spend first)

- [ ] Single **marketing** source of truth: which pages are static on Vercel vs CMS later.
- [ ] Analytics: Plausible self-host later **or** GA4 on Workspace/GCP — pick one; add env + privacy note.
- [ ] Contact / lead form → existing `N8N_WEBHOOK_URL` path documented in one place.

## P2 — Sales & payments (when you’re ready)

- [ ] Payment provider choice (Stripe vs Paystack vs invoice-only) — **not** implemented until policy set.
- [ ] Map “token credits” / CMP debits to real invoices (manual first, automate later).
- [ ] DPA + data residency note for EU/Africa clients if needed.

## P2 — Google Workspace / GCP (paid, already owned)

- [ ] SMTP relay or send connector for **transactional** mail (password reset, alerts); document in playbook.
- [ ] Optional: Secret Manager for rotation-heavy secrets (parallel to Vercel env).

---

## Done (archive)

- [x] Automation spine: ingest, playbooks, risk gate, CMP mirror, `GET /api/automation/events`.
- [x] Docs: `docs/automation-framework.md`, `docs/n8n/automation-forward-recipe.md`, `docs/agent-integration-search-policy.md`.

---

*Last reviewed: 2026-04-03 — update this line when you change priorities.*
