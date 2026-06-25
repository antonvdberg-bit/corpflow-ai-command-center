# Self-hosted ops stack v1 (Phase 1 baseline)

**Status:** v1 — 2026-06-15 — Phase 1 baseline (Step 1 + Step 2 only).
**Owner:** Anton (operator) for hosts/secrets/credentials; Cursor for repo-side wiring + this doc.
**Scope:** Approved supporting-services stack that runs **alongside** the existing CorpFlow production app — it does **not** replace it.

---

## 1. Doctrine

This is the **approved Phase 1 self-hosted supporting-services stack** for CorpFlow. Its purpose is narrow:

- **It supports the existing CorpFlow production app; it does not replace it.**
- **CorpFlow remains one production Next.js app and one production Postgres**, wired through `POSTGRES_URL` (Neon, per `docs/operations/POSTGRES_PROVIDER.md`). This packet does **not** create a second production app, a second production Postgres, or a parallel auth/tenancy surface.
- The self-hosted ops server may run the following **supporting services** 24/7:
  - **n8n** — receives accepted CorpFlow automation envelopes and CMP mirror events; routes them to operator notifications, spreadsheets, or future adapters.
  - **Uptime Kuma** — independent 24/7 monitoring for production app, client hosts, and self-hosted services.
  - **(Future, gated)** restic backup discipline — **not** in this packet. See § 4.
- **No real secrets belong in git.** This doc uses **placeholders only** (`<PRODUCTION_ORIGIN>`, `<CLIENT_ORIGIN>`, `<N8N_ORIGIN>`, `<CORPFLOW_AUTOMATION_INGEST_SECRET>`, etc.). Real values live in Vercel env, GitHub repo secrets, the operator's password manager, or the self-hosted server's local config — never here.
- **One outbound surface, one inbound surface, one DB.** The automation forward channel and the outbound email channel are operationally **separate** (see § 2.2). They share no secret, no path, and no n8n branch.

### What this packet is NOT

- Not a second production app or a second production Postgres.
- Not a replacement for the Vercel-hosted Next.js production app.
- Not a place to run Langfuse, Chatwoot, Open WebUI, Coolify, agent frameworks, or any new app-runtime dependency. Those are explicitly out of scope for Phase 1.
- Not a restic implementation. Step 3 (`restic backup and restore discipline`) is gated on Step 1 + Step 2 being present and verified — it is **not** in this baseline doc.
- Not a place to widen production auth or modify production HTTP endpoints.

### Phase 1 service inventory

| Service | Purpose | Phase 1 status |
|---|---|---|
| n8n | Automation-forward consumer (envelopes from `CORPFLOW_AUTOMATION_FORWARD_URL`) + outbound email Gmail OAuth (`N8N_EMAIL_WEBHOOK_URL`) | **Step 1** — verify (this doc) |
| Uptime Kuma | Independent uptime probes for production app, client hosts, self-hosted services | **Step 2** — plan (this doc) |
| restic | Backup/restore discipline for self-hosted volumes + ops-relevant configs | **Step 3** — deferred until Steps 1 + 2 are verified |

---

## 2. Step 1 — n8n automation-forward verification

**Purpose.** n8n receives accepted CorpFlow automation envelopes and CMP mirror events from the production app and turns them into operator-visible signal (Telegram / email / spreadsheet rows / future adapters), without putting that fan-out logic into the app tier.

This is the **machine-facing** half of the spine. The **human-facing** half is Change Console (`/change`). Both write into the same Postgres tables (`automation_events`, `cmp_tickets`); only n8n turns them into outside-world side effects.

### 2.1 Allowed Phase 1 responsibilities (n8n branches)

In Phase 1, n8n is allowed to consume the automation forward for the following operator-only signal flows:

| Branch | Trigger event_type | What it does |
|---|---|---|
| Lead Rescue intake notification | `corpflow.lead_rescue.intake_received` | Operator notification on a new AI Lead Rescue intake. Envelope `payload.notification_text` is pre-formatted; structured fields (`payload.prospect.*`, `payload.admin_detail_url`, `payload.lead_id`) are also present for spreadsheet rows or CRM mirrors. Idempotency key `lead-rescue:intake:<lead_id>`. |
| CMP build approved notification | `cmp.build.approved` | Operator notification when a CMP ticket transitions to Build (after `approve-build`). Includes GitHub dispatch snapshot for follow-up. |
| CMP GitHub callback / preview ready notification | `cmp.github.callback` | Operator (and optional client-channel) notification when GitHub Actions reports PR + preview URL ready. |
| CMP estimate recorded notification | `cmp.estimate.recorded` | Optional spreadsheet / CRM row when a ticket cost is preview-recorded. |

**Password reset email is explicitly out of scope for the automation-forward channel.** It uses a separate workflow with its own webhook URL and its own shared secret (see § 2.2).

The full envelope shape and the canonical n8n recipe are in `docs/n8n/automation-forward-recipe.md`. The producer-side contract is in `docs/automation-framework.md` § "Optional forward".

### 2.2 Channel separation — automation-forward vs outbound email

These two channels **must remain separate** in n8n. They use different env vars, different shared secrets, different webhook paths, and different downstream branches.

| | Automation-forward channel | Outbound email channel |
|---|---|---|
| Producer env (URL) | `CORPFLOW_AUTOMATION_FORWARD_URL` | `N8N_EMAIL_WEBHOOK_URL` |
| Producer env (secret) | `CORPFLOW_AUTOMATION_FORWARD_SECRET` | `N8N_EMAIL_WEBHOOK_SECRET` |
| Header on POST | `x-corpflow-automation-forward-secret` | `x-corpflow-email-secret` |
| n8n webhook path | e.g. `/webhook/corpflow-automation` | e.g. `/webhook/corpflow-email` |
| Default sender alias | n/a (operational signal) | `EMAIL_FROM` (e.g. `support@corpflowai.com`), enforced again by the Gmail node |
| Canonical doc | `docs/automation-framework.md`, `docs/n8n/automation-forward-recipe.md` | `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`, `docs/n8n/password-reset-email-recipe.md` |
| Audience | Operator-only by default; `operator_escalation` per Comms v1 | Client-facing transactional email |

A regression where the same n8n webhook handles both is treated as a security defect, because a leak of one secret would compromise both channels.

### 2.3 Env vars consumed (already in `.env.template`)

This step uses **only** env var names that are already present in the repo's `.env.template`. No new names are introduced.

| Env var | Role | Where set |
|---|---|---|
| `CORPFLOW_AUTOMATION_INGEST_SECRET` | Header `x-corpflow-automation-secret` on `POST /api/automation/ingest`. Required for non-factory-master ingest. | Vercel Production env |
| `CORPFLOW_AUTOMATION_FORWARD_URL` | Production URL of the n8n Webhook node that consumes the automation forward (path `/webhook/<your-path>`). | Vercel Production env |
| `CORPFLOW_AUTOMATION_FORWARD_SECRET` | Random string; sent on the forward POST as header `x-corpflow-automation-forward-secret`. n8n's first node validates equality. | Vercel Production env + n8n |
| `CORPFLOW_AUTOMATION_CMP_MIRROR` | When unset or `true`, CMP lifecycle events (`cmp.ticket.created`, `cmp.estimate.recorded`, `cmp.build.approved`, `cmp.github.callback`) are mirrored to `automation_events` and forwarded. Set `false` to disable. | Vercel Production env |
| `N8N_EMAIL_WEBHOOK_URL` | Production URL of the **separate** n8n Webhook for outbound email (Gmail OAuth). Not used by Step 1's verification. | Vercel Production env |
| `N8N_EMAIL_WEBHOOK_SECRET` | Header `x-corpflow-email-secret` on the email webhook. Distinct from the forward secret. | Vercel Production env + n8n |
| `EMAIL_FROM` | Default From hint for the n8n Gmail node (e.g. `support@corpflowai.com`). Not used by Step 1's verification. | Vercel Production env |

### 2.4 Verification command (placeholder shape)

Use a **harmless** event type that does **not** match any high-risk prefix (`billing.`, `payment.`, `money.`, `delete.`, `destroy.`, `publish.public.`, `external.deploy.prod`, `invoice.pay`, `refund.`), so no approval secret is needed and no business action fires.

Recommended: `ops.self_hosted.test.v1`.

PowerShell (operator workstation, no secrets in the doc):

```powershell
$origin   = "<PRODUCTION_ORIGIN>"
$secret   = "<CORPFLOW_AUTOMATION_INGEST_SECRET>"
$body     = @{
  event_type      = "ops.self_hosted.test.v1"
  tenant_id       = "global"
  source          = "self-hosted-ops-stack-v1-step-1"
  idempotency_key = "self-hosted-ops-stack-v1-step-1-$(Get-Date -UFormat %s)"
  payload         = @{ note = "Step 1 verification — placeholder, no secrets" }
} | ConvertTo-Json -Depth 4

Invoke-WebRequest `
  -Method POST `
  -Uri "$origin/api/automation/ingest" `
  -Headers @{ "x-corpflow-automation-secret" = $secret; "Content-Type" = "application/json" } `
  -Body $body
```

curl equivalent:

```bash
curl -sS -X POST "<PRODUCTION_ORIGIN>/api/automation/ingest" \
  -H "x-corpflow-automation-secret: <CORPFLOW_AUTOMATION_INGEST_SECRET>" \
  -H "Content-Type: application/json" \
  -d '{
        "event_type": "ops.self_hosted.test.v1",
        "tenant_id": "global",
        "source": "self-hosted-ops-stack-v1-step-1",
        "idempotency_key": "self-hosted-ops-stack-v1-step-1-001",
        "payload": { "note": "Step 1 verification — placeholder, no secrets" }
      }'
```

The `payload` object must contain **no real secrets, no client PII, no production tokens**. It is operator self-tooling only.

### 2.5 Verification checklist (Step 1)

Mark each item with the operator-visible evidence that supports it.

- [ ] **Event accepted by API** — `POST /api/automation/ingest` returns HTTP 2xx with a JSON body that includes the row id (or `deduped: true` on replays of the same `idempotency_key`).
- [ ] **Event appears in `automation_events`** — visible via `GET /api/automation/events?tenant_scope=global&limit=10` (factory-master only — admin session cookie or `MASTER_ADMIN_KEY` / `x-session-token`). Newest first; the `ops.self_hosted.test.v1` row appears at the top.
- [ ] **Event visible through the existing factory-only events endpoint** — `GET /api/automation/events` returns the row with `event_type: "ops.self_hosted.test.v1"`, `tenant_scope: "global"`, `risk_tier: "low"`, and the chosen `idempotency_key`.
- [ ] **Event reaches n8n when `CORPFLOW_AUTOMATION_FORWARD_URL` is configured** — the n8n executions list shows a new run for the corpflow-automation webhook within seconds; the run's incoming JSON has `event_type === "ops.self_hosted.test.v1"`. If `CORPFLOW_AUTOMATION_FORWARD_SECRET` is set, the n8n IF/Function node validating `x-corpflow-automation-forward-secret` passes.
- [ ] **No secrets logged or committed** — neither the request body, nor n8n's incoming-headers preview, nor any commit added in this packet contains real values for `CORPFLOW_AUTOMATION_INGEST_SECRET`, `CORPFLOW_AUTOMATION_FORWARD_SECRET`, `N8N_EMAIL_WEBHOOK_SECRET`, or any other secret. Grep the diff for the names is fine; grep for the values must return zero hits.
- [ ] **Channel separation preserved** — the n8n workflow used by `CORPFLOW_AUTOMATION_FORWARD_URL` does **not** route any branch through the email-webhook path or share its secret. The outbound email workflow is a different webhook node (`N8N_EMAIL_WEBHOOK_URL`).

### 2.6 Rollback / disable

- **Disable forward only** (n8n stays up, app tier ignores it): unset `CORPFLOW_AUTOMATION_FORWARD_URL` in Vercel env. Ingest continues to write to `automation_events`; no outbound POST is attempted.
- **Disable CMP mirror** (rare, breaks operator visibility): set `CORPFLOW_AUTOMATION_CMP_MIRROR=false`. CMP routes still work; lifecycle is no longer mirrored to `automation_events`.
- **Rotate forward secret**: update `CORPFLOW_AUTOMATION_FORWARD_SECRET` in Vercel + n8n at the same time. There is no canary — first failed run after rotation surfaces in n8n's executions tab as a 401 / IF-mismatch.

---

## 3. Step 2 — Uptime Kuma monitoring

**Purpose.** Independent 24/7 monitoring for the production CorpFlow app, mapped client hosts, and the self-hosted services on the ops server. Uptime Kuma is **complementary** to the in-repo monitoring architecture (`docs/operations/MONITORING_ARCHITECTURE.md` § 2 — the 12 monitors today): it gives us a **third location** that probes from outside both Vercel and GitHub Actions, closing blind spot # 7 ("no third-location uptime") in that doc.

Kuma does **not** replace any in-repo monitor. It runs in parallel.

### 3.1 Recommended monitors (placeholder shape)

All targets are **placeholders unless already public and documented in the repo today**. Replace with real values in the operator's local Kuma config — never in this doc.

| Monitor | Target | Type | Why |
|---|---|---|---|
| Production health | `<PRODUCTION_ORIGIN>/api/factory/health` | HTTP(s) — expect 200, JSON `ok:true` | Factory readiness signal (matches `MONITORING_ARCHITECTURE.md` Monitor #2). |
| Change Console | `<PRODUCTION_ORIGIN>/change` | HTTP(s) — expect 200 | Operator surface; catches middleware / edge regressions that Monitor #2 misses. |
| Apex marketing root | `https://corpflowai.com/` | HTTP(s) — expect 200, apex marketing HTML markers | Already in `MONITORING_ARCHITECTURE.md` § 5 always-on minimum; Kuma adds third-location coverage. |
| Tenant client host (one) | `<CLIENT_ORIGIN>/` | HTTP(s) — expect 200, content marker (e.g. tenant-specific string) | Catches tenant fallback to apex (blind spot # 3 in `MONITORING_ARCHITECTURE.md` § 6). |
| n8n reachability | `<N8N_ORIGIN>/` or a safe n8n health/test endpoint | HTTP(s) — expect 200 (or n8n's own health route) | Confirms the automation-forward consumer is actually up. **Do not** point Kuma at the webhook-trigger production URL (that would create real automation events; use n8n's own health endpoint or a placeholder Webhook node configured for GET that returns 200). |
| Uptime Kuma status page | (internal-only) | n/a | Optional. If enabled, it is for **internal use only** — never linked from a public marketing surface. Public status communication for clients goes through the existing channels (`/change`, operator email), not Kuma. |

### 3.2 Alert routing

- **Primary path:** Uptime Kuma's own alert channels (Telegram bot, email/SMTP, operator-only). Configure these inside Kuma; the values live in Kuma's local config, **not** in this repo.
- **Telegram** — recommended for parity with `MONITORING_ARCHITECTURE.md` § 4.1, but Kuma uses **its own** Telegram bot config; do not reuse the in-repo `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ALERT_CHAT_ID` values inside Kuma if it can be avoided (separate failure domain is the point).
- **n8n forwarding** may be used **only if it does not create a circular dependency for critical outage alerts.** In particular: if the alert path goes Kuma → n8n → Telegram, and n8n is the thing that's down, the operator never learns. Kuma's primary alert (Telegram or email) **must** be a path that does not depend on n8n. n8n forwarding from Kuma is acceptable as a **secondary** routing for non-critical signals (e.g. status-page summaries, daily roll-ups).

### 3.3 Verification checklist (Step 2)

- [ ] **Production health monitor green** — Kuma's `<PRODUCTION_ORIGIN>/api/factory/health` monitor shows 200 + healthy state for ≥ 1 hour after first save.
- [ ] **`/change` monitor green** — `<PRODUCTION_ORIGIN>/change` returns 200 with the expected HTML markers (no Vercel `MIDDLEWARE_INVOCATION_FAILED`, no 5xx).
- [ ] **At least one client host green** — `<CLIENT_ORIGIN>/` returns 200 with a tenant-correct content marker (e.g. tenant name string), confirming the tenant resolution chain (`docs/operations/TENANT_CLIENT_LOGIN.md`).
- [ ] **n8n monitor green** — `<N8N_ORIGIN>/` or the chosen n8n health/test endpoint returns 200. The probe does **not** trigger a real `corpflow-automation` workflow run.
- [ ] **Test alert delivered to operator** — operator forces a fail (briefly point one monitor at a non-existent path), confirms Telegram or email alert lands, then restores the monitor.
- [ ] **No credentials committed** — the Kuma database file and any export are kept off the repo. The repo doc references **only** placeholders. `git diff` for this packet contains no Telegram tokens, no SMTP passwords, no Kuma admin credentials.
- [ ] **No circular dependency for critical outage** — primary alert channel (Telegram or SMTP) is verified to **not** depend on n8n; e.g. by performing the test alert above with n8n intentionally stopped.

### 3.4 Cross-reference with the in-repo monitoring architecture

Kuma adds external probing; it does not replace any of the 12 monitors in `docs/operations/MONITORING_ARCHITECTURE.md` § 2. Specifically:

- It **does not** replace the **Factory control loop** (Monitor #1) — Kuma cannot check `origin/main` SHA vs Vercel Production deployment SHA.
- It **does not** replace **Production Pulse runtime** (Monitor #3) — Kuma does not open a Postgres query.
- It **does not** replace **CMP delivery monitor** (Monitor #4) — Kuma does not understand CMP ticket state.
- It **does** add coverage for blind spot # 7 ("no third-location uptime") and partial coverage for blind spot # 3 ("tenant resolution failure looks like apex 200") if the client-host monitor includes a content marker assertion.

When Kuma graduates to scheduled work that emits alerts, it should be added to `MONITORING_ARCHITECTURE.md` § 2 as a new row in the same PR (per the § 9 add-a-new-monitor recipe).

---

## 4. Step 3 — restic backup and restore discipline (deferred, NOT in this packet)

Step 3 is **not** in this baseline doc. It is gated on Steps 1 and 2 being present, verified, and recorded as such in `docs/CORPFLOW_SHARED_TODO.md`.

When Step 3 is authored, it must:

- Reference the service inventory in § 1 of this doc as the canonical scope of "what gets backed up."
- Document a **restore drill** that targets a **disposable directory or disposable server path** — never production volumes, never the production Postgres.
- Reuse Postgres backup guidance from `docs/operations/POSTGRES_PROVIDER.md` (Neon-managed); this packet does **not** add a second production database, and Step 3 must not either.
- Use **placeholders only** for repository names, bucket names, restic passwords, and any other credentials. Real values go in the operator's local config or password manager.
- Target the **approved object-storage destination** named in § 5 (**Cloudflare R2**, S3-compatible `s3:` backend) — the provider choice is already settled, so Step 3 does not need to re-decide it. Note: § 5 is a **destination decision only**; it does **not** lift this Step 3 execution hold.
- Not include any `.env` file in git.

Until Step 3 is authored and verified, the repo's existing backup posture is:

- Postgres: managed by Neon (point-in-time + branching as documented in `docs/operations/POSTGRES_PROVIDER.md`).
- Self-hosted services on the ops server: **not** yet under restic discipline (Phase 1 baseline limit).

---

## 5. Cloudflare R2 — object storage for ops backups and internal artifacts

**Status:** **destination decision only** (provider chosen) — added 2026-06-25. This section names **Cloudflare R2** as the **approved object-storage destination** for self-hosted ops backups and internal artifacts. It does **not** lift the Step 3 (restic) execution hold in § 4, does **not** authorize any install by Cursor, and does **not** change the production app or the production Postgres.

> **Scope discipline (read once).** Choosing the destination ≠ authorizing the backup tooling to run. restic implementation (§ 4 Step 3) remains **eligible / not initiated** under Anton's standing hold (*"do not proceed to restic"* until separate authorization — see `docs/CORPFLOW_SHARED_TODO.md`). When that hold is lifted and Step 3 is authored, **R2 is the bucket destination it should target** — operators do not need to re-litigate the provider choice.

### 5.1 Why R2 (provider decision)

- **S3-compatible API** — works with restic's `s3:` backend and standard S3 tooling without a proprietary client or new app-runtime dependency.
- **No egress fees** — restore drills and periodic verification reads do not incur per-GB egress charges, which keeps restore-testing cheap and therefore likely to actually happen.
- **Operator-owned account** — the R2 bucket lives in the operator's Cloudflare account, alongside the existing CorpFlow DNS surface, not inside the production app's trust boundary.

This is an **ops/infrastructure destination choice**. It is deliberately kept **out of** the production Next.js app and **out of** the production Postgres trust boundary.

### 5.2 Approved Phase 1 uses (ops backups + internal artifacts only)

R2 is approved as the destination for the following, **once the relevant tooling is separately authorized** (e.g. § 4 Step 3 restic):

- **restic backup repository** for self-hosted server data (the volumes/configs enumerated in § 1's service inventory — n8n, Uptime Kuma, reverse proxy, etc.).
- **n8n workflow / config exports** — JSON workflow exports and n8n config snapshots from the ops server.
- **Uptime Kuma data backups** — host-side `tar` of `~/uptime-kuma-data/` (the external backup path already referenced in `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md`), pushed to R2.
- **Docker Compose / reverse-proxy config backups** — the compose files and proxy config that define the self-hosted stack.
- **Internal marketing / media artifacts where appropriate** — internal-only working media and large internal artifacts that should not live in git. (Internal staging, **not** a public CDN — see § 5.3.)
- **Restore-test evidence files** — the non-secret evidence captured during restore drills (snapshot ids, `restic check` output, file hashes, timestamps).

### 5.3 Explicitly NOT approved yet (do not treat as authorized)

- **No production app file storage** — the production Next.js app does **not** read from or write to R2. No SDK, no runtime credential, no app code path.
- **No client upload storage** — client-supplied files are out of scope for this Phase 1 destination decision.
- **No public asset CDN** — R2 is for internal ops artifacts; do **not** document or configure a public bucket policy. Public buckets are **not** approved.
- **No direct production `POSTGRES_URL` backup target** — Postgres backups remain managed by **Neon** (`docs/operations/POSTGRES_PROVIDER.md`). Sending production database dumps to R2 requires a **separate approved runbook** and is **not** authorized by this section.
- **No credentials in repo** — R2 account id, bucket name, endpoint URL, access key, and secret key live in the operator's password manager / Infisical / the server's local config. Never in git, never in this doc (see § 5.4 placeholders).
- **No MCP / tool integration** — no MCP server, agent tool, or automation is wired to R2 by this section.

This list preserves the existing boundaries: **one production app, one production Postgres via `POSTGRES_URL`** (Neon). This section adds **no** second production app and **no** second production database.

### 5.4 Setup guidance — placeholders only (no real values)

When the operator provisions the bucket (operator-owned action, not a Cursor action), the following values are needed. **These are placeholders** — real values are entered into the operator's password manager / server-local config / Infisical, never into this repo:

| Placeholder | What it is | Where it lives |
|---|---|---|
| `<R2_ACCOUNT_ID>` | Cloudflare account id that owns the R2 bucket | Operator password manager / Infisical |
| `<R2_BUCKET_NAME>` | Bucket name for ops backups + internal artifacts (e.g. an `ops-backups`-style name) | Operator password manager / Infisical |
| `<R2_ENDPOINT_URL>` | S3-compatible endpoint, shape `https://<R2_ACCOUNT_ID>.r2.cloudflarestorage.com` | Operator password manager / Infisical |
| `<R2_ACCESS_KEY_ID>` | R2 API token access key id (scoped to the one bucket) | Operator password manager / Infisical / server-local env (not repo) |
| `<R2_SECRET_ACCESS_KEY>` | R2 API token secret access key | Operator password manager / Infisical / server-local env (not repo) |

These are **not** CorpFlow app env var names and are **not** added to `.env.template`. They are server-side / operator-side configuration for the ops box only.

### 5.5 restic verification guidance (when § 4 Step 3 is authorized)

This is the **destination-side verification shape** for the eventual restic packet. It is documented here so the provider choice and its proof are co-located. **None of these commands are run by Cursor**; they are operator steps on the ops server once Step 3 is authorized.

restic addresses R2 through its `s3:` backend, e.g. repository `s3:<R2_ENDPOINT_URL>/<R2_BUCKET_NAME>` with `AWS_ACCESS_KEY_ID=<R2_ACCESS_KEY_ID>` / `AWS_SECRET_ACCESS_KEY=<R2_SECRET_ACCESS_KEY>` exported in the operator shell (never in git).

1. **Initialize the repository against R2 from the server** — `restic init` against `s3:<R2_ENDPOINT_URL>/<R2_BUCKET_NAME>`. Confirms credentials + endpoint reach the bucket.
2. **Run one backup** — `restic backup <disposable-or-ops-config-path>`. First snapshot for a harmless/ops path (not production volumes, not the production Postgres).
3. **List snapshots** — `restic snapshots`. Confirms the snapshot landed in R2 and is enumerable.
4. **Verify repository integrity** — `restic check`. Confirms repository structure + pack integrity in R2.
5. **Restore one harmless test file into a disposable directory** — `restic restore <snapshot-id> --target <disposable-dir> --include <one-harmless-file>`. Restore target is a **disposable directory** — never a production volume, never the production Postgres.
6. **Record evidence without secrets** — capture snapshot id, `restic check` verdict line, restored-file hash, and timestamps into the ops evidence artifact (e.g. under `artifacts/self-hosted-ops-stack-v1/`). Evidence contains **no** access key, secret key, endpoint host with credentials, or repository password.

When this runs, it satisfies the § 4 Step 3 restore-drill requirement and the `docs/CORPFLOW_SHARED_TODO.md` P1 item. Until then, R2 is a **chosen destination on paper only** — nothing is provisioned or backed up by this section.

---

## 6. Cross-links (canonical docs this baseline points at)

- `.env.template` — single source of truth for all env var **names** referenced above. Real values live in Vercel / GitHub repo secrets / operator's password manager, never in git.
- `docs/automation-framework.md` — `POST /api/automation/ingest` contract, high-risk prefix list, optional forward semantics.
- `docs/n8n/automation-forward-recipe.md` — n8n consumer workflow shape, branch list, channel-separation note (§ 4 of that doc).
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — outbound email canonical model (the **other** n8n channel).
- `docs/n8n/password-reset-email-recipe.md` — wire-level recipe for the outbound email channel (separate from this doc's Step 1).
- `docs/operations/MONITORING_ARCHITECTURE.md` — the 12 in-repo monitors today; § 5 always-on minimum live URLs; § 6 known blind spots that Kuma helps cover (# 3, # 7).
- `docs/operations/POSTGRES_PROVIDER.md` — Neon-only mandate; referenced from the doctrine ("one production Postgres via `POSTGRES_URL`") and from § 4 (Step 3 deferred).
- `docs/operations/TENANT_CLIENT_LOGIN.md` — tenant resolution model that Step 2's client-host monitor verifies indirectly.
- `docs/CORPFLOW_SHARED_TODO.md` — P1 checklist items that track Step 1 / Step 2 / Step 3 evidence, plus the Cloudflare R2 backup-destination item (§ 5).
- `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md` — § 5 names R2 as the destination for the host-side `tar` of `~/uptime-kuma-data/` referenced there (no S3 export from inside Kuma).

---

## 7. Change log

- **2026-06-25** — Added § 5 (renumbered Cross-links → § 6, Change log → § 7). Names **Cloudflare R2** as the approved object-storage **destination** for self-hosted ops backups + internal artifacts. Destination decision only — does **not** lift the Step 3 (restic) execution hold (§ 4), does **not** authorize any install by Cursor, adds **no** app integration, **no** secrets, **no** new CorpFlow env var names, and **no** `.env.template` change. One production app + one production Postgres via `POSTGRES_URL` (Neon) preserved.
- **2026-06-15** — Initial Phase 1 baseline. Step 1 (n8n automation-forward verification) + Step 2 (Uptime Kuma monitoring) authored. Step 3 (restic) explicitly deferred (§ 4). All env var names cross-checked against `.env.template`; no new names introduced.
