# OpenHands rollback and uninstall (Phase 1 package)

**Status:** DRAFT procedure for a **not-yet-installed** package — nothing to roll back yet. Written now so that
the reverse of every install step is reviewed **before** approval, not improvised after a problem.
**Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743)

**Companion docs:**

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

**Forbidden rollback commands (same list as the Beszel pilot doc, restated here for OpenHands):**
`docker system prune`, deleting all unused volumes, stopping all containers, removing shared networks without
proof of exclusive ownership.

## 2. Stop (≤ 60 s, fully reversible)

```bash
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
`corpflowai-openhands-workspace`) are preserved. Restarting (`docker compose -p corpflowai-openhands up -d`)
resumes from the same state.

## 3. Full uninstall (containers + network removed, volumes preserved by default)

```bash
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
`is_allowed_resource_name()` — this is the enforcement mechanism, not just a documented promise.

## 4. Deliberate volume deletion (only if Anton explicitly requests it)

```bash
# ONLY when Anton explicitly asks to wipe OpenHands state/workspace data:
docker compose -p corpflowai-openhands down -v
rm -rf "$HOME/corpflowai-openhands/state" "$HOME/corpflowai-openhands/workspace"
```

This is **irreversible** for the local conversation history / cached config (state volume) and any uncommitted
in-flight task edits (workspace volume). Per `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` § 6, workspace data
is disposable by design and state-volume loss only affects conversation continuity — neither holds CorpFlowAI
production data, so this step never risks Postgres/GitHub data loss.

## 5. Repo-level rollback (revert the Phase 1 package PR)

If the **package itself** (compose files, scripts, config, docs) needs to be reverted at the repo level:

```bash
git revert <merge-commit-sha>
```

This is independent of § 2–§ 4 above — reverting the repo PR does not, by itself, stop or remove anything
running on a box (there is nothing running as of this Phase 1 packet). If a future install has happened, the box
must be rolled back via § 2/§ 3 **separately** from any repo-level revert, mirroring the Kuma ADR's explicit
"repo state only — does not stop a running install on the box" distinction.

## 6. Never-prune-unrelated checklist (run after any rollback/uninstall step)

```bash
# Prove survivors are healthy and untouched:
docker ps --filter 'name=uptime-kuma' --format '{{.Names}} {{.Status}} {{.Ports}}'
# Expect: uptime-kuma still Up (healthy) on 127.0.0.1:3001, unaffected

systemctl --user list-timers --all 2>/dev/null | grep -E 'backup-health|corpflowai-ops-restic' || true
# Expect: restic/backup-health timers unchanged

docker ps --format 'table {{.Names}}\t{{.Status}}'
# Compare to the pre-rollback list — only corpflowai-openhands* rows should have changed status

curl -fsS -o /dev/null -w '%{http_code}\n' https://core.corpflowai.com/api/factory/health
curl -fsS -o /dev/null -w '%{http_code}\n' https://corpflowai.com/
# Expect: 200 for both — proves CorpFlowAI production routes were never reachable from, or affected by,
# this box-local package in the first place
```

## 7. What is explicitly NOT affected by any step in this doc

- Core / tenant marketing surfaces (`corpflowai.com`, `lux.corpflowai.com`, `core.corpflowai.com`) — no
  connection exists between this package and Vercel Production at any layer.
- Postgres / Neon — no connection string is ever present in this package's config (§ 4 of the security model).
- Uptime Kuma (#13), Backup Monitor (#14), ERPNext sandbox/production-shell state, restic → R2 jobs, n8n — all
  live on the same box but in entirely separate Docker Compose projects, named resources, and (where relevant)
  credential stores.
- GitHub repository state (issues, branches other than `openhands/*`, PRs other than OpenHands-authored drafts)
  — none of it is deleted by rolling back or uninstalling the box-side package; at most, an in-flight
  OpenHands-authored branch/draft-PR is left as-is (a human can close it manually if desired) — uninstalling the
  box package does not auto-delete GitHub state.

## 8. Change log

- **2026-08-04** — Initial rollback/uninstall doc authored alongside the Phase 1 documentation set for #743.
  Nothing has been installed; nothing has been rolled back. This doc exists for review before any install
  approval.
