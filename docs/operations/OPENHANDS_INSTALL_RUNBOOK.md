# OpenHands install runbook (Phase 1 package — operator runbook)

**Status: INSTALLATION NOT AUTHORIZED.** This runbook describes the steps an operator (Anton, at an L3 SSH
keyboard, per `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.4) would follow **if and
only if**:

1. `docs/decisions/20260804-openhands-on-exec01.md` (ADR) flips PROPOSED → ACCEPTED on Anton's merge, **and**
2. `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` flips AWAITING_APPROVAL → APPROVED on Anton's
   merge — **including** the § 1.1a dedicated-Docker-daemon carve-out condition and Anton's explicit acceptance
   of the per-sandbox resource-limit gap (see `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` § 2.2), **and**
3. Anton gives a separate, explicit **go** for this specific install session (the ADR + packet merge is the
   carve-out; the install itself is Gate 2 of `docs/operations/OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md`).

None of the three conditions above are satisfied as of 2026-08-04. **Do not run any command in this runbook
against `corpflow-exec-01-u69678` (or any host) until all three are true.**

**Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743) · **Docker isolation follow-up:** [#747](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/747) · **Parent:** [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661)

**Companion docs:**

- `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` — the dedicated-rootless-daemon design § 3 of this runbook
  installs, before the app itself. Read before running any command below.
- `docs/operations/OPENHANDS_ARCHITECTURE.md` — target flow this runbook installs.
- `docs/operations/OPENHANDS_SECURITY_MODEL.md` — threat model referenced throughout.
- `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` — day-to-day operation once (if) installed.
- `docs/operations/OPENHANDS_ROLLBACK_AND_UNINSTALL.md` — the reverse of every step below.
- `ops/openhands/README.md`, `ops/openhands/compose.yaml`, `ops/openhands/VERSIONS.md`, `ops/openhands/.env.example` — the reviewed package this runbook installs.
- `docs/execution/OPENHANDS_SYNTHETIC_VALIDATION_PLAN.md` — the five packets used at § 15 below.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.4 — the Cursor-drafts / Anton-pastes collaboration pattern this runbook is written for.

**Entry point once authorized:** `scripts/ops/openhands/install.sh --check | --install | --verify | --rollback`.
`--check` is read-only and safe to run at any time (including today, pre-authorization) — it never mutates host
state. `--install` refuses unless `OPENHANDS_INSTALL_APPROVED=YES` **and** `--i-understand-protected-action` are
both supplied, and per `ops/openhands/README.md` even that combination is not, by itself, sufficient
authorization — the ADR + packet gate above must already be merged.

---

## 0. Hard limits (apply to every section below)

- Cursor does not SSH to the box and does not run any command in this runbook. Per § 5.4 of the boundary doc,
  Cursor's role is to keep this runbook accurate; Anton's role is to paste the commands.
- Every command targets **only** resources named `corpflowai-openhands*` (enforced by the allowlist in
  `scripts/ops/openhands/lib/common.sh`). Nothing here touches `uptime-kuma`, ERPNext containers, `corpflowai-beszel`
  (if later installed), backup timers, or any unrelated Docker resource.
- No command in this runbook opens a public port. Every bind is `127.0.0.1:<port>`.
- No command in this runbook sets `POSTGRES_URL`, `MASTER_ADMIN_KEY`, `VERCEL_TOKEN`, or any CorpFlowAI
  production secret name inside the OpenHands package's env or config.
- Secret **values** are never pasted into this runbook, into chat, into a PR, or into a JOURNAL row. Every place
  a real value is needed, this runbook uses the placeholder `<ENTER_DIRECTLY_IN_APPROVED_SECRET_STORE>` — the
  same convention already used in `ops/openhands/.env.example`.
- **Docker isolation (2026-08-04, #747):** every `docker` / `docker compose` command in this runbook that
  targets OpenHands resources must have `DOCKER_HOST=unix://$HOME/corpflowai-openhands/docker/docker.sock`
  exported first. There is no ambient-default-daemon fallback anywhere in this runbook. The box's **primary**
  Docker socket (`/var/run/docker.sock`) is never touched by any command below — if a command in this runbook
  would need to run against the primary daemon to install OpenHands, that is itself a sign this runbook has
  drifted from the authorized design (`docs/operations/OPENHANDS_DOCKER_ISOLATION.md`) and installation must
  stop pending review.

---

## 1. Prerequisites

- [ ] ADR `docs/decisions/20260804-openhands-on-exec01.md` status = ACCEPTED.
- [ ] Authorization packet `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` status = APPROVED,
  including the § 1.1a dedicated-Docker-daemon condition and Anton's explicit, recorded acceptance of the
  per-sandbox resource-limit gap (`docs/operations/OPENHANDS_DOCKER_ISOLATION.md` § 2.2).
- [ ] `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 has a **second** named row for OpenHands (not
  just the pending-proposal note this Phase 1 packet adds — an actual merged carve-out row).
- [ ] Anton has given an explicit separate go-ahead for the install session itself.
- [ ] Anton has a scoped GitHub credential ready (fine-grained PAT or GitHub App install — see
  `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 5) and an LLM API key or ChatGPT subscription login ready in
  his approved secret store — never typed into this runbook.
- [ ] This runbook is on `main` (or the approved merge SHA) on the box's repo clone.
- [ ] The box's Docker Engine supports rootless mode for the operator's Linux user (checked in § 3 below, not
  assumed here).

## 2. Capacity inspect (mandatory, before any install decision)

Reconciles the three-way contradiction recorded in `docs/operations/OPENHANDS_ARCHITECTURE.md` § 5.1.

```bash
cd ~/corpflow-ai-command-center   # or wherever the box's clone lives
git pull
bash scripts/ops/openhands/inspect-host-capacity.sh > /tmp/openhands-capacity-report.md
cat /tmp/openhands-capacity-report.md
```

This script is **read-only** — safe to run even before Anton's approval, and safe to run repeatedly.

**Capacity source of truth (unambiguous rule):** the **live output of this script, run against this box, at
install time** is the **sole** authoritative capacity figure for the install decision. None of the following is
authoritative on its own — they are prior context to compare against, not a number to pick from:

- the historical `2 vCPU / 2 GB` row in `MONITORING_ARCHITECTURE.md` § 11.3 (expected to be **wrong** — stale),
- the post-resize `4 vCPU / 7,751 MiB` row in `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.1 (the most
  recent *documented* resize event, but still not a live reading),
- Anton's informal Beszel-style observation (~6 CPU / ~25.7 GiB) (an *observation*, not a live-verified figure
  captured by an authorized tool).

**Decision rule:** proceed only if the **script's live output** has **at least** the v1 ceiling headroom from
`OPENHANDS_ARCHITECTURE.md` § 5 (~3 CPU / ~8 GiB, unchanged by the Docker-isolation follow-up — the
`corpflowai-openhands.slice` ceiling in `OPENHANDS_DOCKER_ISOLATION.md` § 2 is this same figure, now
systemd-enforced) available **above** every other workload already running on the box (Uptime Kuma, ERPNext
sandbox/production-shell if present, restic jobs, the repo clone's own `npm ci` / `npm test` runs). If the live
figure is lower than the historical stale row, **stop** — something is wrong with either the script or the
host, and that is worth a JOURNAL row before continuing. Do not substitute any of the three context rows above
for a live run, even if the live run is inconvenient to obtain.

## 3. Dedicated Docker daemon setup (before any app work — new, 2026-08-04 / #747)

Per `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` and `ops/openhands/daemon/README.md` (the package-side
companion — read it for the exact env vars and file map), OpenHands runs against a **dedicated, rootless**
Docker daemon — never the box's primary daemon. This section stands up that daemon; § 4 onward stands up the
app **against** it. Use the reviewed package's own files rather than improvising equivalents — they already
encode the naming/path conventions the rest of this package's scripts assume.

```bash
# 3.0 — load the shared env vars (OPENHANDS_HOME, OPENHANDS_DOCKER_SOCK, OPENHANDS_DOCKER_HOST,
# OPENHANDS_DOCKER_DATA_ROOT) so every subsequent command uses the same, single-source-of-truth paths:
REPO="$HOME/corpflow-ai-command-center"
source "$REPO/scripts/ops/openhands/lib/common.sh"
echo "OPENHANDS_HOME=$OPENHANDS_HOME"   # sanity check only — never echo a secret this way

# 3.1 — directories (dedicated daemon's own socket dir and data root; NOT the app's state/workspace dirs, see § 4)
mkdir -p "$(dirname "$OPENHANDS_DOCKER_SOCK")" "$OPENHANDS_DOCKER_DATA_ROOT"
chmod 700 "$(dirname "$OPENHANDS_DOCKER_SOCK")" "$OPENHANDS_DOCKER_DATA_ROOT"

# 3.2 — confirm rootless Docker prerequisites (per ops/openhands/daemon/README.md; read-only check)
dockerd-rootless-setuptool.sh check || true
# If this reports missing prerequisites (newuidmap/newgidmap, slirp4netns/vpnkit, subuid/subgid ranges),
# STOP and resolve them per upstream docs before continuing — do not improvise a workaround.

# 3.3 — daemon.json: copy the reviewed example and fill in the real paths (never commit the filled copy)
cp "$REPO/ops/openhands/daemon/daemon.json.example" "$(dirname "$OPENHANDS_DOCKER_SOCK")/daemon.json"
# Edit that copy so its data-root / hosts entries match $OPENHANDS_DOCKER_DATA_ROOT / $OPENHANDS_DOCKER_SOCK —
# see the example file's own inline comments for the exact keys to fill.

# 3.4 — systemd units: copy the reviewed units into the user's systemd tree (do NOT author new ones by hand)
mkdir -p "$HOME/.config/systemd/user"
cp "$REPO/scripts/ops/systemd/corpflowai-openhands.slice" "$HOME/.config/systemd/user/"
cp "$REPO/scripts/ops/systemd/corpflowai-openhands-dockerd.service" "$HOME/.config/systemd/user/"
systemctl --user daemon-reload
systemctl --user enable --now corpflowai-openhands-dockerd.service
# The unit's own [Service] section already sets DOCKER_HOST / OPENHANDS_HOME and Slice=corpflowai-openhands.slice
# — do not duplicate those via a separate manual `dockerd-rootless-setuptool.sh install` step.

# 3.5 — verify the dedicated daemon answers ONLY on its own socket, and the primary daemon is untouched
bash "$REPO/scripts/ops/openhands/verify-dedicated-daemon.sh"
# Expected: PASS — live `docker info` DockerRootDir check confirms $OPENHANDS_DOCKER_DATA_ROOT, not /var/lib/docker.

unset DOCKER_HOST OPENHANDS_DOCKER_HOST
docker ps --filter 'name=uptime-kuma' --format '{{.Names}} {{.Status}}'
# Expect: uptime-kuma still visible via the box's PRIMARY daemon (ambient default), unaffected by 3.1-3.4 —
# proves the dedicated daemon is additive, not a replacement of the primary daemon Kuma/ERPNext use.
```

**Do not proceed to § 4 until § 3.5's `verify-dedicated-daemon.sh` run PASSes.** If it fails for any reason
(including `DockerRootDir` showing `/var/lib/docker` or any path other than `$OPENHANDS_DOCKER_DATA_ROOT`), the
dedicated-daemon setup did not take effect — stop, do not install the app against what would silently be the
primary daemon.

## 4. Directories and permissions (app-level)

```bash
mkdir -p "$HOME/corpflowai-openhands/state"
mkdir -p "$HOME/corpflowai-openhands/workspace"
chmod 700 "$HOME/corpflowai-openhands" "$HOME/corpflowai-openhands/state" "$HOME/corpflowai-openhands/workspace"
```

Named, dedicated directories only — never a bind mount of the operator's home directory root or an existing
project checkout, per `ops/openhands/compose.yaml`'s inline comments. These are separate from § 3's
`docker`/`docker-data` directories (the dedicated daemon's own socket/storage), which must already exist and be
verified before this step.

## 5. Image pull (pinned tags only)

```bash
export DOCKER_HOST="unix://$HOME/corpflowai-openhands/docker/docker.sock"
docker pull docker.openhands.dev/openhands/openhands:1.8
docker pull ghcr.io/openhands/agent-server:1.26.0-python
docker image inspect docker.openhands.dev/openhands/openhands:1.8 --format '{{.Id}}'
docker image inspect ghcr.io/openhands/agent-server:1.26.0-python --format '{{.Id}}'
```

Confirm both tags pulled match `ops/openhands/VERSIONS.md`. **Never** pull or reference `latest`. If upstream
docs show different recommended pins at install time, stop and update `VERSIONS.md` first (its own pin policy
requires this). Both images land in the **dedicated** daemon's data root (`$HOME/corpflowai-openhands/docker-data`)
because `DOCKER_HOST` is exported above — they are never pulled into the primary daemon's storage.

## 6. Config

```bash
REPO="$HOME/corpflow-ai-command-center"
cp "$REPO/ops/openhands/compose.yaml" "$HOME/corpflowai-openhands/compose.yaml"
cp "$REPO/ops/openhands/.env.example" "$HOME/corpflowai-openhands/.env"
chmod 600 "$HOME/corpflowai-openhands/.env"
```

If `config/openhands/config.example.toml` exists in the package at install time, copy it the same way into
`$HOME/corpflowai-openhands/config.toml` and edit **on the box only**.

Before continuing, confirm the copied compose file matches the current authorized design — **no**
`/var/run/docker.sock` (primary socket) mount, **no** `host.docker.internal` `extra_hosts` entry (removed per
`docs/operations/OPENHANDS_DOCKER_ISOLATION.md` § 3 — there is no approved need for the control plane to reach a
host-loopback service), healthcheck target is `http://127.0.0.1:3000/health` (not bare `/`), and
`MAX_CONCURRENT_CONVERSATIONS=1` is set. If the copied file still shows any of these as the superseded design,
**stop** — the package in `ops/openhands/` has not caught up to `OPENHANDS_DOCKER_ISOLATION.md` yet and must be
fixed before this runbook is followed further.

## 7. Secret entry (placeholders only — no values in this runbook)

Edit `$HOME/corpflowai-openhands/.env` **on the box**, replacing each placeholder **in the approved secret
store's copy**, never by typing a real value into a chat session or a PR:

```text
LLM_API_KEY=<ENTER_DIRECTLY_IN_APPROVED_SECRET_STORE>
LLM_BASE_URL=<ENTER_DIRECTLY_IN_APPROVED_SECRET_STORE>
LLM_MODEL=<ENTER_DIRECTLY_IN_APPROVED_SECRET_STORE>
GITHUB_TOKEN=<ENTER_DIRECTLY_IN_APPROVED_SECRET_STORE>
```

Cost governance and alerting fields (`OPENHANDS_MONTHLY_COST_CEILING_USD`, `OPENHANDS_COST_SOFT_STOP_PCT`,
`OPENHANDS_COST_FAIL_CLOSED_PCT`, `OPENHANDS_ALERTS_ENABLED`, `TELEGRAM_BOT_TOKEN`,
`TELEGRAM_ALERT_CHAT_ID`) follow `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md`. Leave
`OPENHANDS_ALERTS_ENABLED=0` until the operating runbook's monitoring section is reviewed live.

Run the negative check before starting anything:

```bash
bash scripts/ops/openhands/verify-no-production-access.sh
```

Expect this to **fail closed** (non-zero exit) if any CorpFlowAI production secret name is present anywhere in
the package's config.

## 8. Start

```bash
export DOCKER_HOST="unix://$HOME/corpflowai-openhands/docker/docker.sock"
cd "$HOME/corpflowai-openhands"
docker compose -p corpflowai-openhands up -d
docker ps --filter 'name=corpflowai-openhands' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Expected `PORTS` column for the app container: `127.0.0.1:3000->3000/tcp`. If it shows anything else (a public
address, no address, a different port), **stop and roll back** — do not proceed to § 10.

Additionally confirm the container's Docker-socket mount resolves to the **dedicated** daemon's socket, not the
primary one. `ops/openhands/compose.yaml` deliberately mounts the socket at a container-internal path that is
**not** `/var/run/docker.sock` (default `/run/openhands-docker/docker.sock`, via `OPENHANDS_DOCKER_SOCK_IN_CONTAINER`)
— precisely so no log line inside the container can be misread as "this is the primary daemon":

```bash
docker inspect corpflowai-openhands-app --format '{{range .Mounts}}{{if eq .Destination "/run/openhands-docker/docker.sock"}}{{.Source}}{{end}}{{end}}'
# Expect: /home/<user>/corpflowai-openhands/docker/docker.sock (or equivalent full path under
# $OPENHANDS_HOME) — NEVER /var/run/docker.sock on the host side.
```

Or, more robustly, run the package's own live check:

```bash
bash scripts/ops/openhands/verify-dedicated-daemon.sh
```

## 9. Health

```bash
export DOCKER_HOST="unix://$HOME/corpflowai-openhands/docker/docker.sock"
bash scripts/ops/openhands/health-check.sh
```

Expected: silent success (exit 0, minimal output) when healthy; noisy, explicit failure output when not — per
the operating runbook's "silent success / exception" monitoring posture (§ 9 of
`docs/operations/OPENHANDS_OPERATING_RUNBOOK.md`). The health check targets the app's own `/health` endpoint
(not bare `/`) per `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` § 4 — a `200` on `/` alone is not sufficient
evidence of a healthy backend.

## 10. Private-bind verification (mandatory before any further step)

```bash
# On box:
curl -fsS --max-time 5 -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/health
# Expect 200

bash scripts/ops/openhands/verify-private-bind.sh
```

```bash
# Off box (operator's phone tether or a different network) — must FAIL to connect:
curl -I --connect-timeout 8 http://<EXEC01_PUBLIC_IP>:3000
# Expect timeout / connection refused — the same class of K2 signal proven for Uptime Kuma
```

## 11. Persistence

```bash
export DOCKER_HOST="unix://$HOME/corpflowai-openhands/docker/docker.sock"
docker compose -p corpflowai-openhands restart corpflowai-openhands-app
sleep 15
docker ps --filter 'name=corpflowai-openhands' --format 'table {{.Names}}\t{{.Status}}'
```

Confirm the container comes back healthy and that any conversation/task state created before the restart is
still visible in the UI (via the SSH tunnel) — proves the named volumes
(`corpflowai-openhands-state`, `corpflowai-openhands-workspace`) survive a container restart, not just a
process restart.

## 12. Sandbox boundary verification

```bash
export DOCKER_HOST="unix://$HOME/corpflowai-openhands/docker/docker.sock"
bash scripts/ops/openhands/verify-sandbox-boundary.sh
```

Expected: fails (non-zero) if the compose config or a spawned sandbox uses `privileged: true`, host networking,
a mount broader than the named, dedicated workspace volume, **or a bind mount of the primary host Docker socket**
(the last check added for the #747 isolation follow-up). This check exists **because** the Docker-socket
mount is an accepted, documented residual risk (see `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 3 and
`docs/operations/OPENHANDS_DOCKER_ISOLATION.md`) — the script verifies the *rest* of the boundary stays tight
even though the dedicated daemon's own socket cannot be fully sandboxed away.

## 13. GitHub

Once a scoped GitHub App or fine-grained PAT is installed (per
`docs/operations/OPENHANDS_SECURITY_MODEL.md` § 5), confirm from the OpenHands UI (via the SSH tunnel) that it
can read `antonvdberg-bit/corpflow-ai-command-center` issues and open a branch — **do not** yet let it open a
real PR until § 15 (synthetic task).

## 14. Model

Confirm the configured LLM provider (per `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md`) responds to a
trivial prompt from inside the OpenHands UI. Record which provider/model was used — never the API key — in the
evidence capture at § 16.

## 15. Synthetic task

Run **exactly one** packet from `docs/execution/OPENHANDS_SYNTHETIC_VALIDATION_PLAN.md` (packet 1,
"Documentation correction," is the recommended first run — lowest risk). Confirm:

- a real branch name matching the `openhands/*` prefix convention (per
  `docs/operations/OPENHANDS_OPERATING_CHARTER.md` as updated by this packet),
- a real commit,
- a **draft** pull request (never a ready-for-review or auto-merge PR),
- CI runs the same as any other PR.

## 16. Evidence

```bash
export DOCKER_HOST="unix://$HOME/corpflowai-openhands/docker/docker.sock"
bash scripts/ops/openhands/collect-sanitized-evidence.sh > /tmp/openhands-install-evidence.md
```

Record in a JOURNAL row and a bridge #249 STATUS comment (no secret values, ever):

- container names + statuses + ports (loopback only),
- image digests pulled,
- capacity report from § 2 (live script output, not a static number),
- confirmation the Docker-socket mount resolved to the dedicated daemon's socket (§ 8), not the primary one,
- the dedicated daemon's `docker info --format '{{.DockerRootDir}}'` output (§ 3.5),
- the synthetic task's branch name, commit SHA, and draft PR URL,
- model/provider name used (not the key),
- cost recorded for the one synthetic task (if the provider surfaces it).

## 17. Failure

If any step above fails or produces an unexpected result:

1. **Stop.** Do not proceed to the next section.
2. Do not attempt to "fix forward" by loosening a boundary check (e.g. do not remove
   `verify-private-bind.sh` from the flow because it failed, and do not fall back to the primary Docker socket
   because the dedicated-daemon setup in § 3 is inconvenient — either is the check working as intended, not a
   bug to route around).
3. Run `docs/operations/OPENHANDS_ROLLBACK_AND_UNINSTALL.md` § 2 (stop) at minimum; go to § 3 (full uninstall)
   if the failure suggests a boundary violation (e.g. a public port was briefly bound, or the app container was
   found mounting the primary Docker socket).
4. Post a `HOST_MISMATCH`-style STATUS to #249 if the failure is about *where* something ran rather than *what*
   happened, per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 7.

## 18. Rollback

See `docs/operations/OPENHANDS_ROLLBACK_AND_UNINSTALL.md` § 2 for the ≤ 60 s stop path and § 3 for the full
uninstall path. Both are scoped to `corpflowai-openhands*` resources only and operate against the **dedicated**
daemon (`DOCKER_HOST` set), never the primary one.

## 19. Uninstall

See `docs/operations/OPENHANDS_ROLLBACK_AND_UNINSTALL.md` § 3–§ 6 (§ 6 covers removing the dedicated daemon
itself).

---

## 20. Change log

- **2026-08-04** — Initial runbook authored alongside the Phase 1 documentation set for #743. No execution.
  Installation remains **NOT AUTHORIZED** — see the status banner at the top of this file.
- **2026-08-04 (PR #747, Docker isolation follow-up)** — Added § 3 *Dedicated Docker daemon setup* as a
  mandatory step before any app-level installation; renumbered subsequent sections accordingly. § 2's decision
  rule restated so that only the **live** `inspect-host-capacity.sh` output is the capacity source of truth (the
  historical/post-resize/observational figures are context, never a substitute). § 6 now requires confirming the
  compose file has no `host.docker.internal` entry and targets `/health` (not bare `/`) before proceeding. § 8/9
  add explicit `DOCKER_HOST` exports and a mount-source check proving the app's Docker-socket mount resolves to
  the dedicated daemon, never the primary one. § 12 notes the sandbox-boundary script's new primary-socket
  check. Installation remains **NOT AUTHORIZED**.
