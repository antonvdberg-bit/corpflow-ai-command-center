# Backup health monitor (Monitor #14)

**Status:** Repo-authored **2026-07-27**; merged as PR #641; installed on `corpflow-exec-01-u69678`. **Parser stdin bug fixed in-repo 2026-07-27** (temp-file JSON path). Reinstall the script on the box from this repo version and re-verify the timer so git and L3 stay aligned.
**Owner:** Anton (server install, secrets, timer enable); Cursor (script + this doc).
**Packet id:** `Server-Backup-Health-Check-And-Alert-1` (named in `docs/operations/SERVER_SAFETY_BASELINE_AND_CHATWOOT_DECISION_V1.md` §8).
**Scope:** Independent **read-only** health check of the existing restic → Cloudflare R2 ops backup. Telegram **failure-only**. No production DB, no `POSTGRES_URL`, no new paid service, no Chatwoot/Langfuse/n8n/containers.

> **Monitor is not production-active until the user timer is enabled and verified on corpflow-exec-01-u69678.** After a script fix, reinstall `~/.local/bin/corpflowai-ops-backup-health-check.sh` from the merged repo and re-verify dry-run + timer.

---

## 1. Why this exists

Evidence search (2026-07-27) found:

| Surface | Finding |
|---|---|
| Backup **job** | **Exists** — restic heartbeat + retention user-systemd timers on `corpflow-exec-01-u69678` → R2 bucket `corpflowai-ops-backups` / prefix `self-hosted-ops/restic` (`docs/operations/SELF_HOSTED_OPS_R2_RESTIC.md`, operational record 2026-06-26). |
| Independent **health monitor** | **Did not exist** — failures only visible in `journalctl`; no Telegram on stale/missing snapshots (`SERVER_SAFETY_BASELINE_AND_CHATWOOT_DECISION_V1.md` §2–§3). |
| Uptime Kuma | Monitors public HTTP floors + n8n `/healthz` — **does not** check restic snapshot age or R2 repo health. |
| GitHub Actions / Vercel crons | No backup-health workflow or cron. |

**Current-state classification before this PR:** **C** — backup jobs exist, no independent health monitor.

This PR closes the **repo** gap (script + docs + Monitor #14 registration). **Production runtime** still requires the operator install packet below.

---

## 2. What the monitor checks

Script: `scripts/ops/backup-health-check.sh` (installed on the box as `~/.local/bin/corpflowai-ops-backup-health-check.sh`).

| Check | Pass | Fail / alert |
|---|---|---|
| restic env file present | `/home/anton/.config/restic/env` (mode 600) loads | missing → fail-closed |
| Repo reachable | `restic snapshots --json` exit 0 | non-zero → alert |
| Latest snapshot exists | count ≥ 1 (prefers tag `corpflowai-ops-heartbeat`) | none → alert |
| Recency | newest snapshot age ≤ **36h** (`BACKUP_HEALTH_MAX_AGE_HOURS`) | older → alert |
| Snapshot count plausible | count ≥ **2** (`BACKUP_HEALTH_MIN_SNAPSHOT_COUNT`) | below → retention suspicious |
| Size plausible | `restic stats --mode raw-data` total_size between min (1 KiB) and max (~50 GiB) | outside band → alert |
| Determinability | python3 available for age/size parse | missing parse ability → **fail-closed** |

Success: one quiet log line to journal + append to `~/.local/state/corpflowai-ops/backup-health.log`. **No Telegram.**

---

## 3. What it deliberately does NOT do

- Does **not** run `restic backup`, `forget`, or `prune` (those stay on the existing heartbeat/retention timers).
- Does **not** back up or touch production Postgres / `POSTGRES_URL`.
- Does **not** restore into production volumes (restore drills remain a separate future step from SERVER_SAFETY §4).
- Does **not** send hourly/daily success spam or heartbeats.
- Does **not** print secret values (presence-only boot line).
- Does **not** add paid SaaS, new containers, Chatwoot, Langfuse, Postiz, OpenJarvis, AgentSpan, or n8n changes.
- Does **not** claim live production monitoring until the timer is enabled on the box.

---

## 4. Telegram alert behaviour

- **Only on failure** (or `BACKUP_HEALTH_FORCE_FAIL=1` test).
- Payload shape matches `TELEGRAM_ALERT_WIRING_PACKET_V1.md` / `lib/server/ops-alerts.js`: plain text, ≤3500 chars, severity = error.
- Env names (values never in git): `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID` (same as factory control loop / ops-alerts — **not** `TELEGRAM_CHAT_ID`).
- Anti-spam: `kind=backup_health` × UTC hour file marker under `~/.cache/corpflowai-ops/backup-health/`.
- If secrets unset when an alert is needed: script logs `telegram: SKIPPED … alert NOT delivered` and still exits **1** (fail visible in journal).
- Dry-run: `BACKUP_HEALTH_DRY_RUN=1` prints the alert text and does **not** POST to Telegram.

---

## 5. Required env / secrets (names only)

Loaded from `/home/anton/.config/restic/env` (and optional `telegram.env`):

| Name | Purpose |
|---|---|
| `RESTIC_REPOSITORY` | R2 restic repo URL |
| `RESTIC_PASSWORD` | restic key |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_DEFAULT_REGION` | R2 S3 API |
| `R2_*` | as already used by heartbeat (presence validated elsewhere) |
| `TELEGRAM_BOT_TOKEN` | CorpFlow ops bot |
| `TELEGRAM_ALERT_CHAT_ID` | Operator alert chat |

Optional tunables: `BACKUP_HEALTH_MAX_AGE_HOURS`, `BACKUP_HEALTH_MIN_SNAPSHOT_COUNT`, `BACKUP_HEALTH_MIN_TOTAL_BYTES`, `BACKUP_HEALTH_MAX_TOTAL_BYTES`, `BACKUP_HEALTH_EXPECTED_TAG`, `BACKUP_HEALTH_DRY_RUN`, `BACKUP_HEALTH_FORCE_FAIL`, `BACKUP_HEALTH_SKIP_TELEGRAM`.

---

## 6. Schedule (intended)

| Item | Value |
|---|---|
| Timer unit | `corpflowai-ops-backup-health.timer` (template in `scripts/ops/systemd/`) |
| Service unit | `corpflowai-ops-backup-health.service` |
| When | **Daily 07:15 UTC** (+ up to 120s jitter) |
| Why that time | After overnight heartbeat; clear of 06:00 factory monitors (`MONITORING_ARCHITECTURE.md` §3) |

Requires `Linger=yes` for user `anton` (already true for restic timers per `SELF_HOSTED_OPS_R2_RESTIC.md`).

---

## 7. L3 operator install checklist (Anton-gated — approve before L3)

Cursor Web **cannot** SSH to `corpflow-exec-01` or place secrets. Copy/adapt from the merged repo on the box:

```bash
# On corpflow-exec-01 as anton — AFTER reviewing this doc and approving L3 install.

# 1) Ensure repo checkout is current (path may differ on box — adjust).
cd ~/corpflow-ai-command-center   # or the box's clone path
git fetch origin && git checkout refs/heads/main && git pull --ff-only origin main

# 2) Install script (executable, owner-only write).
install -d -m 755 ~/.local/bin
install -m 750 scripts/ops/backup-health-check.sh ~/.local/bin/corpflowai-ops-backup-health-check.sh

# 3) Confirm env file exists and contains the required NAMES only (values from Infisical — never echo).
#    Inspect with name-only checks such as:
#      rg -n '^(RESTIC_REPOSITORY|RESTIC_PASSWORD|AWS_ACCESS_KEY_ID|AWS_SECRET_ACCESS_KEY|AWS_DEFAULT_REGION|TELEGRAM_BOT_TOKEN|TELEGRAM_ALERT_CHAT_ID)=' ~/.config/restic/env ~/.config/restic/telegram.env 2>/dev/null
#    Either append to ~/.config/restic/env OR create ~/.config/restic/telegram.env mode 600:
#      TELEGRAM_BOT_TOKEN=...
#      TELEGRAM_ALERT_CHAT_ID=...
chmod 600 ~/.config/restic/env
test -f ~/.config/restic/telegram.env && chmod 600 ~/.config/restic/telegram.env

# 4) Install user systemd units.
mkdir -p ~/.config/systemd/user
cp scripts/ops/systemd/corpflowai-ops-backup-health.service ~/.config/systemd/user/
cp scripts/ops/systemd/corpflowai-ops-backup-health.timer ~/.config/systemd/user/
systemctl --user daemon-reload

# 5) Run dry-run (no Telegram).
BACKUP_HEALTH_DRY_RUN=1 ~/.local/bin/corpflowai-ops-backup-health-check.sh
echo "dry-run exit=$?"

# 6) Run forced-failure test ONCE to prove Telegram path.
BACKUP_HEALTH_FORCE_FAIL=1 ~/.local/bin/corpflowai-ops-backup-health-check.sh || true

# 7) Confirm the Telegram failure alert arrives, then check logs.
journalctl --user -u corpflowai-ops-backup-health.service -n 40 --no-pager

# 8) Enable and start user timer (THIS is when production monitoring starts).
systemctl --user enable --now corpflowai-ops-backup-health.timer
systemctl --user list-timers --all | grep backup-health || true
```

### Short operator checklist

1. Copy/install `scripts/ops/backup-health-check.sh` to `~/.local/bin/corpflowai-ops-backup-health-check.sh`.
2. Copy/install `scripts/ops/systemd/corpflowai-ops-backup-health.service` and `.timer` to `~/.config/systemd/user/`.
3. Confirm `~/.config/restic/env` exists and that the required names are present: `RESTIC_REPOSITORY`, `RESTIC_PASSWORD`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_ALERT_CHAT_ID`. Check names only; do **not** print values.
4. Run `BACKUP_HEALTH_DRY_RUN=1 ~/.local/bin/corpflowai-ops-backup-health-check.sh`.
5. Run `BACKUP_HEALTH_FORCE_FAIL=1 ~/.local/bin/corpflowai-ops-backup-health-check.sh` once.
6. Confirm the Telegram failure alert arrives.
7. Enable and start the user timer: `systemctl --user enable --now corpflowai-ops-backup-health.timer`.
8. Confirm timer presence: `systemctl --user list-timers --all | grep backup-health`.
9. Confirm logs: `journalctl --user -u corpflowai-ops-backup-health.service -n 40 --no-pager`.

### How to check last successful run

```bash
systemctl --user status corpflowai-ops-backup-health.timer --no-pager
systemctl --user status corpflowai-ops-backup-health.service --no-pager
journalctl --user -u corpflowai-ops-backup-health.service -n 40 --no-pager
tail -n 20 ~/.local/state/corpflowai-ops/backup-health.log
```

Expected on healthy days: service exit 0, log line containing `ok snapshots=…`, **no** Telegram message.

**Monitor is not production-active until the user timer is enabled and verified on corpflow-exec-01-u69678.**

### Rollback / disable

```bash
systemctl --user disable --now corpflowai-ops-backup-health.timer
# Optional: remove units from ~/.config/systemd/user/ and daemon-reload
```

Heartbeat + retention timers are **untouched** by rollback.

---

## 8. Remaining gaps (after timer is live)

- **Recurring restore drill** still not scheduled (SERVER_SAFETY §4) — monthly harmless restore to a disposable dir remains a follow-up.
- **Production Postgres backup** remains Neon-managed and out of scope.
- Repo docs historically listed restic as “not initiated” in older `CORPFLOW_SHARED_TODO` rows; the operational truth for ops backups is `SELF_HOSTED_OPS_R2_RESTIC.md` (2026-06-26). Do not re-litigate provider choice.
- This monitor cannot see whether Kuma’s own data volume was included in a given snapshot path set — it only proves the **restic repository** is healthy and recent.

---

## 9. Cross-links

- `docs/operations/SELF_HOSTED_OPS_R2_RESTIC.md` — backup mechanism.
- `docs/operations/SERVER_SAFETY_BASELINE_AND_CHATWOOT_DECISION_V1.md` — named gap + design.
- `docs/operations/MONITORING_ARCHITECTURE.md` — Monitor #14 row.
- `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md` — alert contract.
- `scripts/ops/backup-health-check.sh` — implementation.
- `scripts/ops/systemd/corpflowai-ops-backup-health.{service,timer}` — unit templates.

---

## 10. Change log

- **2026-07-27 (parser fix)** — L3 install on `corpflow-exec-01-u69678` discovered a stdin parser bug: `parse_snapshots_json` / `parse_stats_json` used heredoc + here-string patterns where Python consumed stdin for the code body, so restic JSON never reached `json.loads` (`PARSE_ERROR|Expecting value: line 1 column 1` despite `snapshot_count=34`). Repo script patched to write restic JSON to `mktemp` files and pass the path to Python. **Production monitor stays correct only after the server script is updated/reinstalled from this repo version and the timer is re-verified** (local L3 hotfix may already be in place — reinstall keeps box and git aligned).
- **2026-07-27** — Initial monitor authored in-repo. Runtime install on `corpflow-exec-01` deferred to Anton (commands in §7). No production deploy performed by Cursor Web.
