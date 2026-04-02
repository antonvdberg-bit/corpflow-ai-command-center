# CorpFlow shared to-do list

**Purpose:** One checklist the whole team (you + AI agents + contractors) can use.  
**How to use:** Edit in this repo, commit, push. Agents read `docs/CORPFLOW_SHARED_TODO.md` by path; you track the same file in GitHub or your IDE.

**Convention:** `- [ ]` open · `- [x]` done · `(owner)` optional · Priority: **P0** ship blockers, **P1** next, **P2** later.

---

## P0 — Spine & safety (now)

- [ ] Confirm prod Postgres has `automation_events` / `automation_playbooks` (`POST /api/factory/postgres/ensure-schema` once).
- [ ] Set `CORPFLOW_AUTOMATION_INGEST_SECRET` + optional `CORPFLOW_AUTOMATION_FORWARD_URL` / `CORPFLOW_AUTOMATION_FORWARD_SECRET` in Vercel (n8n webhook).
- [ ] Wire n8n workflow from `docs/n8n/automation-forward-recipe.md` (at least: log + notify on `cmp.build.approved` / `cmp.github.callback`).
- [ ] Document **who** holds `MASTER_ADMIN_KEY` rotation / break-glass (not in repo).

## P1 — Execution off laptop (see `docs/EXECUTION_BRAIN_VS_HANDS.md`)

- [x] Scheduled **GitHub Action** `.github/workflows/factory-health-ping.yml` (Mondays UTC).
- [ ] Set GitHub repo secret **`CORPFLOW_FACTORY_HEALTH_URL`** = `https://<your-apex>/api/factory/health` so the ping actually runs against prod.
- [ ] Add **protected** Vercel route or cron (existing `vercel.json` crons) for periodic tasks you want without opening the laptop.
- [ ] Decide n8n hosting: same host 24/7 vs trigger-only; ensure `CORPFLOW_AUTOMATION_FORWARD_URL` is reachable from Vercel.
- [ ] (Optional GCP) Cloud Scheduler → HTTPS to factory endpoint with shared secret (uses existing Google Cloud account).

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

*Last reviewed: 2026-04-02 — update this line when you change priorities.*
