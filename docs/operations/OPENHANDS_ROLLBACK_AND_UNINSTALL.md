# OpenHands rollback and uninstall (Phase 1 package)

**Status:** DRAFT procedure for a **not-yet-installed** package — nothing to roll back yet. Written now so that
the reverse of every install step is reviewed **before** approval, not improvised after a problem.
**Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743) ·
**Docker isolation follow-up:** [#747](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/747)

**Companion docs:**

- `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` — the dedicated-rootless-daemon design this doc's § 2–§ 6 now
  target instead of the box's primary Docker daemon.
- `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` — the forward procedure this doc reverses.
- `docs/decisions/20260615-uptime-kuma-on-exec01.md` § 5 — the rollback-path format this doc mirrors.
- `scripts/ops/openhands/rollback.sh`, `scripts/ops/openhands/uninstall.sh` — the named entry points this doc describes.
- `scripts/ops/openhands/lib/common.sh` — the resource-name allowlist that makes "scoped to `corpflowai-openhands*` only" enforceable, not just a promise.

---

## 1. Guiding principle: fail-closed, scoped, never collateral

Every action below:

- targets **only** resources whose name is `corpflowai-openhands` or starts with `corpflowai-openhands` (the
  allowlist in `scripts/ops/openhands/lib/common.sh`'s `is_allowed_resource_name()`),
- **never** runs `docker system prune`, `docker stop $(docker ps -q)`, or any other blanket command that could
  touch an unrelated container,
- **never** touches Uptime Kuma (`uptime-kuma`), the ERPNext sandbox/production-shell containers, restic backup
  jobs/timers, `corpflowai-beszel` (if that pilot is later installed), or the repo clone itself,
- leaves Postgres/Neon, Vercel, GitHub, and every other CorpFlowAI production surface completely untouched —
  none of them are reachable from this package in the first place (`docs/operations/OPENHANDS_SECURITY_MODEL.md` § 4).
- **(2026-08-04, #747) targets the dedicated Docker daemon, never the primary one.** Every `docker` /
  `docker compose` command below has `DOCKER_HOST=unix://$HOME/corpflowai-openhands/docker/docker.sock` exported
  first. If a rollback/uninstall step would need the box's primary Docker daemon to complete, that is a sign
  something drifted from the authorized design (`docs/operations/OPENHANDS_DOCKER_ISOLATION.md`) — stop and
  review before running an unscoped command against the primary daemon "just to clean up."

**Forbidden rollback commands (same list as the Beszel pilot doc, restated here for OpenHands):**
`docker system prune`, deleting all unused volumes, stopping all containers, removing shared networks without
proof of exclusive ownership. This applies equally to the **dedicated** daemon — even though it has only one
tenant (OpenHands), a blanket `docker system prune` there is still unnecessary and untracked compared to the
named, scoped commands below.

## 2. Stop (≤ 60 s, fully reversible)

```bash
export DOCKER_HOST="unix://$HOME/corpflowai-openhands/docker/docker.sock"
cd "$HOME/corpflowai-openhands"
docker compose -p corpflowai-openhands stop
docker ps --filter 'name=corpflowai-openhands' --format 'table {{.Names}}\t{{.Status}}'
# Expect: containers present but Exited — not removed
```

Or via the package's own script:

```bash
bash scripts/ops/openhands/rollback.sh
```

This pauses the control plane and any live sandbox. All named volumes (`corpflowai-openhands-state`,
`corpflowai-openhands-workspace`) are preserved (in the dedicated daemon's own data root — see § 5). Restarting
(`docker compose -p corpflowai-openhands up -d`, with `DOCKER_HOST` still exported) resumes from the same state.

## 3. Full uninstall (containers + network removed, volumes preserved by default)

```bash
export DOCKER_HOST="unix://$HOME/corpflowai-openhands/docker/docker.sock"
cd "$HOME/corpflowai-openhands"
docker compose -p corpflowai-openhands down
# Removes the corpflowai-openhands-app container and corpflowai-openhands-net network.
# Does NOT remove named volumes by default (no -v flag).
```

Or:

```bash
bash scripts/ops/openhands/uninstall.sh
```

`uninstall.sh` must refuse to act on any resource that fails
`is_allowed_resource_name()` — this is the enforcement mechanism, not just a documented promise. It must also
refuse to run if `DOCKER_HOST` is unset or points at anything other than the dedicated socket path, so it can
never accidentally touch the primary daemon's containers.

## 4. Deliberate volume deletion (only if Anton explicitly requests it)

```bash
# ONLY when Anton explicitly asks to wipe OpenHands state/workspace data:
export DOCKER_HOST="unix://$HOME/corpflowai-openhands/docker/docker.sock"
docker compose -p corpflowai-openhands down -v
rm -rf "$HOME/corpflowai-openhands/state" "$HOME/corpflowai-openhands/workspace"
```

This is **irreversible** for the local conversation history / cached config (state volume) and any uncommitted
in-flight task edits (workspace volume). Per `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` § 6, workspace data
is disposable by design and state-volume loss only affects conversation continuity — neither holds CorpFlowAI
production data, so this step never risks Postgres/GitHub data loss.

## 5. Dedicated daemon teardown (only as part of a full package removal — new, 2026-08-04 / #747)

Only run this **after** § 3 (or § 4) has already removed the app container/network. Removing the dedicated
daemon while the app container still references its socket will fail closed, not silently orphan anything.

```bash
REPO="$HOME/corpflow-ai-command-center"
source "$REPO/scripts/ops/openhands/lib/common.sh"
openhands_docker ps -a   # expect empty — confirm nothing is left running on the dedicated daemon before stopping it

systemctl --user disable --now corpflowai-openhands-dockerd.service
systemctl --user stop corpflowai-openhands.slice 2>/dev/null || true

unset DOCKER_HOST OPENHANDS_DOCKER_HOST
rm -f "$HOME/.config/systemd/user/corpflowai-openhands-dockerd.service" "$HOME/.config/systemd/user/corpflowai-openhands.slice"
rm -rf "$(dirname "$OPENHANDS_DOCKER_SOCK")" "$OPENHANDS_DOCKER_DATA_ROOT"
systemctl --user daemon-reload
```

This step is **irreversible** for any image layer cached only in the dedicated daemon's own data root (a
future re-install simply re-pulls the pinned images — no data loss beyond re-download time). It has **zero**
effect on the box's primary Docker daemon, Uptime Kuma, or ERPNext — they were never reachable from, and never
shared any state with, the dedicated daemon in the first place (`docs/operations/OPENHANDS_DOCKER_ISOLATION.md`
§ 2).

## 6. Repo-level rollback (revert the Phase 1 package PR)

If the **package itself** (compose files, scripts, config, docs) needs to be reverted at the repo level:

```bash
git revert <merge-commit-sha>
```

This is independent of § 2–§ 4 above — reverting the repo PR does not, by itself, stop or remove anything
running on a box (there is nothing running as of this Phase 1 packet). If a future install has happened, the box
must be rolled back via § 2/§ 3 **separately** from any repo-level revert, mirroring the Kuma ADR's explicit
"repo state only — does not stop a running install on the box" distinction.

## 7. Never-prune-unrelated checklist (run after any rollback/uninstall step)

```bash
# Prove survivors are healthy and untouched — these run against the PRIMARY daemon (ambient default,
# no DOCKER_HOST export), since that is where Kuma/ERPNext/restic actually live:
docker ps --filter 'name=uptime-kuma' --format '{{.Names}} {{.Status}} {{.Ports}}'
# Expect: uptime-kuma still Up (healthy) on 127.0.0.1:3001, unaffected

systemctl --user list-timers --all 2>/dev/null | grep -E 'backup-health|corpflowai-ops-restic' || true
# Expect: restic/backup-health timers unchanged

docker ps --format 'table {{.Names}}\t{{.Status}}'
# Compare to the pre-rollback list on the PRIMARY daemon — expect zero rows changed (OpenHands never ran here)

# If § 5 (dedicated daemon teardown) was run, confirm the dedicated daemon itself is actually gone:
systemctl --user status corpflowai-openhands.slice 2>&1 | grep -qi 'not-found\|could not be found' \
  && echo 'dedicated slice removed, as expected' \
  || echo 'WARNING: corpflowai-openhands.slice still present — re-check § 5'

curl -fsS -o /dev/null -w '%{http_code}\n' https://core.corpflowai.com/api/factory/health
curl -fsS -o /dev/null -w '%{http_code}\n' https://corpflowai.com/
# Expect: 200 for both — proves CorpFlowAI production routes were never reachable from, or affected by,
# this box-local package in the first place
```

## 8. What is explicitly NOT affected by any step in this doc

- Core / tenant marketing surfaces (`corpflowai.com`, `lux.corpflowai.com`, `core.corpflowai.com`) — no
  connection exists between this package and Vercel Production at any layer.
- Postgres / Neon — no connection string is ever present in this package's config (§ 4 of the security model).
- Uptime Kuma (#13), Backup Monitor (#14), ERPNext sandbox/production-shell state, restic → R2 jobs, n8n — all
  live on the same box but in entirely separate Docker Compose projects, named resources, and (where relevant)
  credential stores. **(2026-08-04, #747)** they also live on an entirely separate **Docker daemon** (the box's
  primary one) from OpenHands' dedicated daemon — § 5's teardown has no path to reach them even in principle.
- GitHub repository state (issues, branches other than `openhands/*`, PRs other than OpenHands-authored drafts)
  — none of it is deleted by rolling back or uninstalling the box-side package; at most, an in-flight
  OpenHands-authored branch/draft-PR is left as-is (a human can close it manually if desired) — uninstalling the
  box package does not auto-delete GitHub state.

## 9. Change log

- **2026-08-04** — Initial rollback/uninstall doc authored alongside the Phase 1 documentation set for #743.
  Nothing has been installed; nothing has been rolled back. This doc exists for review before any install
  approval.
- **2026-08-04 (PR #747, Docker isolation follow-up)** — Added § 5 *Dedicated daemon teardown*; every
  `docker`/`docker compose` command in § 2–§ 4 now explicitly exports `DOCKER_HOST` at the dedicated socket
  path, never the primary daemon; § 7's checklist adds a check that the dedicated systemd slice is actually gone
  after a full teardown; § 8 notes the daemon-level (not just Compose-project-level) separation from Kuma/ERPNext.
  Renumbered §§ 5–8 to §§ 6–9 accordingly. Nothing has been installed; nothing has been rolled back.
