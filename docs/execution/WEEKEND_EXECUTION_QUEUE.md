# CorpFlow Weekend Execution Queue (v1)

**Status:** Active queue (started 2026-05-23)
**Audience:** Anton (approver), Cursor agents (executor)
**Companion docs:** `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`, `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`
**Cross-refs:** `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc`, `docs/EXECUTION_BRAIN_VS_HANDS.md`, `docs/CORPFLOW_SHARED_TODO.md`

---

## How this file works

This is the **live queue** of approved or pending packets for autonomous execution. It is intentionally short and operational, not a backlog.

- Anton drafts and approves packets here. Once a packet is `APPROVED`, an agent may execute under `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`.
- Each packet uses the structure from `CORPFLOW_EXECUTION_PACKET_STANDARD.md` §2.
- Packets stay here until they reach `COMPLETE` or `FAILED`. Then they move to the **Archive** at the bottom (or are summarized in `artifacts/chat_history.md`).
- If a packet is `BLOCKED`, the blocker is named and the packet stays visible until resolved.

**Branch / PR convention:** docs-only packets land on `docs/<short-name>` branches; runtime packets land on `feat/<short-name>` or `fix/<short-name>`. Cursor never merges its own PRs.

---

## Goal 1 — Stabilize permanent infrastructure and reduce Anton as runtime bottleneck

**Why this goal:** Today, parts of CorpFlow's "always-on" surface still depend on Anton's laptop, undocumented decisions, or implicit knowledge. The first weekend queue moves the **brain** off Anton's laptop and into the **repo + cloud** so future autonomous packets have stable ground to stand on.

**North star outcome:** Any approved Cursor agent (or contractor) can land a docs-only or non-production packet end-to-end, with evidence, **without Anton being awake**. Production deploys, secrets, DNS, billing, and auth still gate on Anton — by design.

---

### Packet 1.1 — Confirm Infisical → Vercel env sync model

- **Goal:** Document the canonical Infisical → Vercel env sync path so any operator (Anton or otherwise) can reproduce a redeploy that picks up new secret values without tribal knowledge.
- **Definition of Done:**
  - [ ] A canonical doc exists (target path: `docs/operations/SECRETS_SYNC.md`) describing: source of truth (Infisical), how values flow into Vercel Production / Preview / Development, when a Vercel **Redeploy** is required, and how Agent CI consumes Infisical via OIDC where applicable.
  - [ ] Cross-links exist from `docs/VERCEL_DEPLOYMENT.md`, `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`, and `AGENTS.md` Must-read table.
  - [ ] No secret **values** in the doc — only env var names and process steps.
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: docs only.
  - Out: changing Infisical project settings, adding/rotating any secret, changing Vercel project env, changing CI workflows.
- **Constraints:**
  - Docs-only PR.
  - Do not paste secret values anywhere.
  - Do not modify `.env.template` beyond pointing at the new doc.
- **Risks:**
  - Doc captures an outdated or partial flow → Anton catches in PR review.
  - Doc is too prescriptive and will rot → keep it short, link to live screens, mark "verify before trusting".
- **Allowed actions:** read repo, edit docs, branch, PR, `npm test`, `npm run build`. No Vercel writes, no Infisical writes.
- **Approval gates:** pre-merge (Anton).
- **Verification evidence:** PR URL, CI status, diff of the new doc and cross-links.
- **Rollback plan:** revert PR; no runtime impact.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING (awaiting Anton's `APPROVED` mark)

---

### Packet 1.2 — Confirm Neon / Postgres canonical provider docs merged

- **Goal:** Make Postgres provider truth (Neon) explicit and discoverable in repo, so other docs (`CORPFLOW_COMMUNICATIONS_V1.md`, `EXECUTION_BRAIN_VS_HANDS.md`) stop referencing a doc that does not yet exist.
- **Definition of Done:**
  - [ ] `docs/operations/POSTGRES_PROVIDER.md` exists and names: provider (Neon), how `POSTGRES_URL` is sourced (env-only, never committed), pooling guidance for serverless, and `ensure-schema` vs `prisma migrate deploy` discipline.
  - [ ] Existing references in `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` and `docs/CORPFLOW_SHARED_TODO.md` continue to resolve (link target now exists).
  - [ ] `AGENTS.md` Must-read table includes a "Postgres provider" row pointing at the new doc.
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: docs only.
  - Out: changing Prisma schema, running migrations, changing `POSTGRES_URL` value, changing pooling code.
- **Constraints:**
  - Docs-only PR.
  - Do not include the Postgres connection string anywhere.
  - Do not commit the Neon project ID if it is treated as sensitive in this workspace; reference it by env var name only.
- **Risks:**
  - Doc claims a pooling pattern that does not match runtime → mark as "current convention; verify in `lib/server/`".
- **Allowed actions:** read repo, edit docs, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, CI status, diff.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING

---

### Packet 1.3 — Confirm n8n email / password-reset golden path documented

- **Goal:** Lock in the operational doc trail for the only live transactional email path (`password_reset`) so a contractor could rebuild the n8n workflow from scratch using only `docs/n8n/password-reset-email-recipe.md` and `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`.
- **Definition of Done:**
  - [ ] `docs/n8n/password-reset-email-recipe.md` accurately describes: webhook URL env name (`N8N_EMAIL_WEBHOOK_URL`), shared secret env name (`N8N_EMAIL_WEBHOOK_SECRET`), header name (`x-corpflow-email-secret`), payload schema (`corpflow.email.password_reset.v1`), Gmail OAuth account, sender alias (`support@corpflowai.com`), and a step-by-step **rebuild from scratch** path.
  - [ ] Doc names the **expected failure mode** when env values drift (HTTP 401 from n8n, no Gmail send).
  - [ ] Doc names where the evidence lands (`automation_events` row + n8n execution URL).
  - [ ] Cross-link from `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` is intact.
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: doc edits to `docs/n8n/password-reset-email-recipe.md` and any cross-links.
  - Out: editing the n8n workflow itself, sending live test emails, changing any secret, editing `lib/server/email-delivery.js` or `lib/server/password-reset-delivery.js`.
- **Constraints:**
  - Docs-only PR.
  - No client-facing test sends, even to Anton's address; verification is via the existing `automation_events` history, not a fresh send.
- **Risks:**
  - Doc references a Gmail account that has rotated → flagged in PR review.
- **Allowed actions:** read repo, edit docs, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge. **Hard stop** if the work would require sending a live email (per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §3.8).
- **Verification evidence:** PR URL, CI status, diff.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING

---

### Packet 1.4 — Audit production deployment health (read-only)

- **Goal:** Produce a one-page snapshot of current production health (deployment ID, deployed commit, factory health JSON, live HTML for client URLs) and check it against the floor in `predeploy-decision-checks.mdc`.
- **Definition of Done:**
  - [ ] New report at `artifacts/production-health-snapshots/2026-05-23-production-health.md` (or similar dated path) capturing:
    - Vercel Production deployment ID + deployed commit SHA.
    - `https://core.corpflowai.com/api/factory/health` → status + key fields.
    - `https://core.corpflowai.com/api/factory/production-pulse/runtime` → status + key fields.
    - `https://lux.corpflowai.com/` → status + first bytes of HTML / observed title.
    - `https://lux.corpflowai.com/change` → status + observed shell.
  - [ ] Each row labeled PASS / FAIL against the floor in `predeploy-decision-checks.mdc` § *Minimum live GET checks*.
  - [ ] **No secrets, tokens, or session cookies** in the snapshot.
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: read-only HTTP probes against documented public production URLs, snapshot doc, link from `docs/CORPFLOW_SHARED_TODO.md`.
  - Out: any write to production, changing health endpoints, changing Vercel project, mutating CMP.
- **Constraints:**
  - Read-only verification only (per `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` §2.1, §2.7).
  - Do not include any tenant data beyond what is anonymously visible.
- **Risks:**
  - Probe captures a transient 5xx and is interpreted as a real outage → label "single observation, repeat before declaring outage".
- **Allowed actions:** anonymous `curl` / `Invoke-WebRequest` to documented public URLs, edit docs/artifacts, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge. If any required URL is **failing**, raise as `BLOCKED` and tag Anton — **do not** attempt to redeploy or rollback.
- **Verification evidence:** PR URL, CI status, the snapshot doc itself.
- **Rollback plan:** revert PR; snapshot is purely informational.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING

---

### Packet 1.5 — Identify remaining laptop / local dependencies

- **Goal:** Enumerate every step in current "production" workflows that still requires Anton's laptop (a local script, a manual paste, a credential only on disk) so we can plan their migration off-laptop.
- **Definition of Done:**
  - [ ] New doc `docs/execution/LAPTOP_DEPENDENCIES_AUDIT.md` listing each laptop-bound step:
    - What it does.
    - What file or tool it lives in (e.g. `scripts/*.ps1`, local `.env`, browser session).
    - Who can do it today (only Anton, vs. anyone with repo access).
    - Proposed off-laptop home (GitHub Actions, Vercel cron, n8n, doc/runbook).
    - Severity (P0 = blocks 24/7 execution, P1 = inconvenient, P2 = nice-to-have).
  - [ ] Doc links from `docs/EXECUTION_BRAIN_VS_HANDS.md` and `docs/CORPFLOW_SHARED_TODO.md`.
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: read repo, list `scripts/`, list local-only references, write the audit doc.
  - Out: changing or moving any of those scripts; that is a separate packet per item.
- **Constraints:**
  - Docs-only PR.
  - Do not capture secret values, hostnames marked sensitive, or local paths that include personal info.
- **Risks:**
  - Audit misses a hidden dependency → flagged as "v1 audit; expect at least one omission".
- **Allowed actions:** read repo, edit docs, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, CI status, the audit doc.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING

---

### Packet 1.6 — Define migration-to-server checklist

- **Goal:** For each laptop-bound step found in 1.5, define the **standard checklist** that must be satisfied before it can be migrated to a server (GitHub Actions, Vercel cron, n8n, or VPS) — so future packets implementing those migrations are routine, not bespoke.
- **Definition of Done:**
  - [ ] New doc `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` covering:
    - Where the credential lives now vs. target (Infisical / Vercel env / GitHub secret).
    - How the script is parameterized (no machine-local paths, no laptop-only env vars).
    - Idempotency expectations.
    - Failure / retry behavior.
    - Where the audit trail lands (`automation_events`, GitHub Actions log, n8n execution URL).
    - Rollback plan for the migrated job.
  - [ ] Doc cross-links from `docs/EXECUTION_BRAIN_VS_HANDS.md` and `docs/execution/LAPTOP_DEPENDENCIES_AUDIT.md` (1.5).
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: docs only.
  - Out: actually migrating any script. Each migration is a separate packet.
- **Constraints:**
  - Docs-only PR.
  - Do not copy credential values or hostnames marked sensitive.
- **Risks:**
  - Checklist becomes too generic to be useful → keep tied to the categories in 1.5.
- **Allowed actions:** read repo, edit docs, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, CI status, doc diff.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING

---

### Packet 1.7 — Define evidence format for future autonomous work

- **Goal:** Make the **evidence shape** for autonomous packets uniform, so Anton can review a packet's outcome in seconds, not minutes, and so agents stop reinventing the report shape.
- **Definition of Done:**
  - [ ] New doc `docs/execution/EVIDENCE_FORMAT.md` defining:
    - The Markdown skeleton an agent uses to report results in a PR description.
    - Required fields: branch, base/head SHA, PR URL, CI run URL, `npm test` / `npm run build` results, Vercel deployment ID (if any), live URLs tested with HTTP status, `Delivery Reality Audit` block (per `delivery-reality.mdc`).
    - Forbidden content: any secret value, full session cookie, full request/response with PII, full `Authorization` headers.
    - A short example for a docs-only packet and a runtime packet.
  - [ ] `CORPFLOW_EXECUTION_PACKET_STANDARD.md` §2.8 Verification evidence references this doc.
  - [ ] `npm test` and `npm run build` pass on the PR branch.
  - [ ] PR opened against `main`, CI green.
- **Scope:**
  - In: docs only.
  - Out: changing CI workflows or PR templates yet (those are follow-up packets once the format is stable).
- **Constraints:**
  - Docs-only PR.
- **Risks:**
  - Format becomes too rigid and slows packets down → mark as v1, expect refinement.
- **Allowed actions:** read repo, edit docs, branch, PR, `npm test`, `npm run build`.
- **Approval gates:** pre-merge.
- **Verification evidence:** PR URL, CI status, doc diff.
- **Rollback plan:** revert PR.
- **Owner:** Approver = Anton. Executor = Cursor. Reviewer = Anton.
- **Status:** PENDING

---

## Queue summary (Goal 1)

| # | Packet | State | Risk | Approval gates beyond pre-merge |
|---|--------|-------|------|---------------------------------|
| 1.1 | Confirm Infisical → Vercel env sync model | PENDING | Doc accuracy | None (docs-only) |
| 1.2 | Confirm Neon / Postgres canonical provider docs merged | PENDING | Doc drift | None (docs-only) |
| 1.3 | Confirm n8n email / password-reset golden path documented | PENDING | Doc drift | Hard stop on any live email send |
| 1.4 | Audit production deployment health (read-only) | PENDING | Misread transient 5xx | Hard stop on attempting fix |
| 1.5 | Identify remaining laptop / local dependencies | PENDING | Incomplete audit | None (docs-only) |
| 1.6 | Define migration-to-server checklist | PENDING | Over-generic | None (docs-only) |
| 1.7 | Define evidence format for future autonomous work | PENDING | Over-rigid | None (docs-only) |

**All seven Goal 1 packets are docs-only by design.** They establish the ground (process + visibility) before any autonomous packet starts touching runtime code.

---

## Archive

(Empty — first queue, started 2026-05-23.)
