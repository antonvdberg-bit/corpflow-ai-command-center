# Self-hosted ops — Cloudflare R2 + restic backup (heartbeat + retention)

**Status:** v1 — 2026-06-26 — **operational** for self-hosted ops backups and internal artifacts. Closes the R2/restic setup workstream that started as the destination decision in `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 5.
**Owner:** Anton (operator) for the server, secrets, and timer execution; Cursor for this doc.
**Scope:** Self-hosted ops backups + internal artifacts only — runs **alongside** the existing CorpFlow production app. It does **not** touch the production app, Vercel, or the production Postgres.

> **Provenance.** This doc records the *completed* state. The provider/destination decision is `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` § 5 (Cloudflare R2 chosen, restic verification shape) and the P1 tracking item in `docs/CORPFLOW_SHARED_TODO.md`. This file is the operational runbook for the now-configured restic backup on `corpflow-exec-01-u69678`.

---

## 1. Doctrine

- restic backs up **self-hosted ops data and internal artifacts** only (the supporting-services stack enumerated in `SELF_HOSTED_OPS_STACK_V1.md` § 1 — n8n exports, Uptime Kuma data, compose/reverse-proxy config, internal media, restore-test evidence).
- **CorpFlow remains one production Next.js app and one production Postgres via `POSTGRES_URL`** (Neon, per `docs/operations/POSTGRES_PROVIDER.md`). This workstream did **not** add a second app, a second database, or any app integration.
- **The production database is explicitly out of scope.** No production DB dump is sent to R2 by this configuration. Backing up the production database requires a **separate, explicitly approved runbook** (see § 7 Hard Boundaries).
- **No real secrets in git.** R2 account id, bucket name with credentials, access keys, restic password, and endpoint values live in **Infisical** and are loaded server-side from a mode-`600` env file. They are **never** committed and are **not** reproduced in this doc.

---

## 2. Destination + repository

| Item | Value | Notes |
|---|---|---|
| Object storage | **Cloudflare R2** | S3-compatible; approved destination per `SELF_HOSTED_OPS_STACK_V1.md` § 5. |
| Bucket | `corpflowai-ops-backups` | Single ops-backup bucket. **Not** public; **not** for client uploads or app file storage. |
| restic repository prefix | `self-hosted-ops/restic` | Repository lives under `<bucket>/self-hosted-ops/restic` via the restic `s3:` backend. |
| Region | `auto` | R2 uses `AWS_DEFAULT_REGION=auto`. |

Real values (account id, full endpoint host, access keys, restic password, exact `RESTIC_REPOSITORY` URL) are **not** recorded here by design — they are placeholders/Infisical-held only. See `SELF_HOSTED_OPS_STACK_V1.md` § 5.4 for the placeholder set.

---

## 3. Server + credentials posture

| Item | Value |
|---|---|
| Server | `corpflow-exec-01-u69678` (Hetzner via Elestio, per `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5) |
| User | `anton` |
| Secret store | **Infisical** (canonical); synced into the server-side env file |
| Server-side env file | `/home/anton/.config/restic/env` — **mode `600`** (owner read/write only) |
| restic env directory | `/home/anton/.config/restic/` — **mode `700`** (owner only) |
| User lingering | `Linger=yes` (so the user systemd timers run without an active login session) |

The env file holds the R2/restic variables (`R2_*`, `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`). Its **contents are never printed, exported, or committed** — presence/shape are validated with named `printenv` lookups only, never an environment dump.

---

## 4. Scheduled units (user systemd)

restic runs as **user systemd** timers under `anton` (enabled by `Linger=yes`), not as root cron and not as a system service.

### 4.1 Heartbeat (proves the repo is writable + reachable)

| Item | Value |
|---|---|
| Script | `/home/anton/.local/bin/corpflowai-ops-restic-heartbeat.sh` |
| Timer | `corpflowai-ops-restic-heartbeat.timer` |
| Service | `corpflowai-ops-restic-heartbeat.service` |
| restic tag | `corpflowai-ops-heartbeat` |
| Purpose | Periodic harmless backup of a small ops/heartbeat path to confirm credentials, endpoint, and repository remain healthy. |

### 4.2 Retention / prune

| Item | Value |
|---|---|
| Script | `/home/anton/.local/bin/corpflowai-ops-restic-retention.sh` |
| Timer | `corpflowai-ops-restic-retention.timer` |
| Service | `corpflowai-ops-restic-retention.service` |
| Policy | **keep 7 daily, 4 weekly, 6 monthly**, with **prune** |
| Purpose | Enforce snapshot retention and reclaim space, keeping the repository bounded. |

---

## 5. Verified state (completed)

The following were verified on `corpflow-exec-01-u69678` during setup. Evidence is recorded without secrets (no keys, no endpoint host with credentials, no repository password).

- [x] **Env presence + shape** — all required `R2_*` / `RESTIC_*` / `AWS_*` variables present; `R2_BUCKET_NAME=corpflowai-ops-backups`; `R2_ENDPOINT_URL` matches `https://*.r2.cloudflarestorage.com`; `RESTIC_REPOSITORY` matches `s3:https://*.r2.cloudflarestorage.com/corpflowai-ops-backups/self-hosted-ops/restic*`; `AWS_DEFAULT_REGION=auto`. (Validated via named `printenv` lookups only.)
- [x] **Harmless write/read/restore passed** — one harmless test file was backed up, listed, and restored into a **disposable directory** (never production volumes, never the production Postgres).
- [x] **Retention / prune passed** — the retention policy (7 daily / 4 weekly / 6 monthly + prune) ran successfully against the repository.
- [x] **Linger enabled** — `Linger=yes` for `anton`, so the timers fire without an interactive session.
- [x] **Env file hardening** — `/home/anton/.config/restic/env` is mode `600`; `/home/anton/.config/restic/` is mode `700`.
- [x] **Production DB backup not enabled** — no production database dump path is configured; `POSTGRES_URL` was not touched.
- [x] **No app / Vercel / env-template change** — production app runtime, Vercel env, and `.env.template` were not modified.

---

## 6. Final Verification

Operator-safe, **read-only** commands to re-confirm the configured state on `corpflow-exec-01-u69678` (run as `anton`). None of these print secret values.

```bash
loginctl show-user anton -p Linger
systemctl --user status corpflowai-ops-restic-heartbeat.timer --no-pager
systemctl --user status corpflowai-ops-restic-retention.timer --no-pager
systemctl --user list-timers --all | grep corpflowai-ops-restic || true
journalctl --user -u corpflowai-ops-restic-heartbeat.service -n 30 --no-pager
journalctl --user -u corpflowai-ops-restic-retention.service -n 40 --no-pager
```

Expected: `Linger=yes`; both timers `active (waiting)` / loaded and enabled; `list-timers` shows the two `corpflowai-ops-restic` timers; the journals show successful recent heartbeat and retention runs with no credential values in the logs.

---

## 7. Hard Boundaries

- **Do not back up the production database** without separate explicit approval (requires its own approved runbook).
- **Do not touch `POSTGRES_URL`** without separate explicit approval.
- **Do not integrate R2 into the production app** — no SDK, no runtime credential, no app code path.
- **Do not add R2/restic secrets to Vercel.**
- **Do not expose `/home/anton/.config/restic/env`** — never print, export, copy off-box, or commit its contents.
- **Do not commit secrets** — account id, access keys, restic password, and endpoint values stay in Infisical / the server-side env file.
- **Do not use public bucket policies** — the bucket is private.
- **Do not use this bucket for client uploads or app file storage** — ops backups and internal artifacts only.

---

## 8. Cross-links

- `docs/operations/SELF_HOSTED_OPS_STACK_V1.md` — § 5 R2 destination decision + restic verification shape; § 1 service inventory (what gets backed up); § 4 Step 3 restic gating.
- `docs/operations/POSTGRES_PROVIDER.md` — Neon-managed production Postgres; production DB backup is out of scope here.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — `corpflow-exec-01-u69678` posture and L3 operator-driven execution model.
- `docs/CORPFLOW_SHARED_TODO.md` — P1 Cloudflare R2 backup-destination item this workstream closes.

---

## 9. Change log

- **2026-06-26** — Initial operational record. R2 bucket `corpflowai-ops-backups` + restic repository prefix `self-hosted-ops/restic` configured on `corpflow-exec-01-u69678`; heartbeat + retention user-systemd timers active with `Linger=yes`; harmless write/read/restore and retention/prune verified. Secrets in Infisical, loaded from mode-`600` `/home/anton/.config/restic/env` (dir mode `700`). Production DB backup remains out of scope; `POSTGRES_URL`, production app, Vercel, and `.env.template` unchanged.
