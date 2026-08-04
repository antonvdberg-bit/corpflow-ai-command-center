# OpenHands private worker — deployment package (INACTIVE)

**Status: INACTIVE.** Nothing in this directory is installed, running, or authorized to run on
`corpflow-exec-01-u69678` (or any other host). This is a **review-ready package** only — files here
describe how an install *would* be shaped **if** a future, separate authorization packet approves it.

**Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743)

**Do not treat any file in this directory, or under `scripts/ops/openhands/`, `scripts/ops/systemd/corpflowai-openhands*`,
or `config/openhands/`, as evidence that OpenHands is installed, configured with real credentials, or reachable.**

## Why this is INACTIVE

Per `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.3–5.5, `corpflow-exec-01-u69678` has
**one** named, narrow, packet-gated Docker carve-out today: **Uptime Kuma** (`docs/decisions/20260615-uptime-kuma-on-exec01.md`).
That carve-out is explicit that "sameness is not authorization" — a new tool (OpenHands) requires its **own**
ADR, its **own** threat model, and its **own** authorization packet before any `docker compose up` runs on the box.
This package exists so that authorization decision can be made against a concrete, reviewed artifact instead of
a verbal description. **Installation requires Anton's explicit approval plus a new § 5.5-style carve-out entry —
neither exists yet.**

## File map

| File | Purpose |
|---|---|
| `ops/openhands/README.md` | This file — status, scope, do-not list |
| `ops/openhands/VERSIONS.md` | Pinned image versions, sources, compatibility notes, pin policy |
| `ops/openhands/compose.yaml` | Reviewed Docker Compose definition (loopback-only, not deployed) |
| `ops/openhands/compose.override.example.yaml` | Optional local-debug override example (still loopback) |
| `ops/openhands/.env.example` | Placeholder-only env file — copy, fill from an approved secret store, never commit |
| `scripts/ops/openhands/lib/common.sh` | Shared shell helpers (logging, confirm, resource-name allowlist) |
| `scripts/ops/openhands/inspect-host-capacity.sh` | Read-only host capacity capture (CPU/RAM/disk/docker) |
| `scripts/ops/openhands/preflight.sh` | Pre-install sanity checks (docker present, port free, disk headroom) |
| `scripts/ops/openhands/verify-private-bind.sh` | Fails if OpenHands would be reachable on a non-loopback address |
| `scripts/ops/openhands/verify-sandbox-boundary.sh` | Fails on privileged mode, host networking, or overly broad mounts |
| `scripts/ops/openhands/verify-no-production-access.sh` | Fails if compose/env reference production secrets or Postgres |
| `scripts/ops/openhands/health-check.sh` | Container + loopback HTTP health check (silent success, noisy fail) |
| `scripts/ops/openhands/backup-state.sh` | Archives sanitised OpenHands state (config, not task workspaces) |
| `scripts/ops/openhands/rollback.sh` | Stops/disables only named `corpflowai-openhands*` resources |
| `scripts/ops/openhands/uninstall.sh` | Removes only named `corpflowai-openhands*` containers/networks/volumes |
| `scripts/ops/openhands/collect-sanitized-evidence.sh` | Gathers redacted evidence for a PR/issue comment |
| `scripts/ops/openhands/install.sh` | Entry point — `--check` (default), `--install` (gated), `--verify`, `--rollback` |
| `scripts/ops/systemd/corpflowai-openhands.service` | User systemd unit wrapping `docker compose up -d` (not enabled) |
| `scripts/ops/systemd/corpflowai-openhands-health.service` | Oneshot health-check unit (not enabled) |
| `scripts/ops/systemd/corpflowai-openhands-health.timer` | Timer for the health unit (not enabled — Phase 2+) |
| `config/openhands/config.example.toml` | Example OpenHands `config.toml` (placeholders only) |
| `config/openhands/corpflowai-agent-instructions.md` | CorpFlowAI-specific operating rules for the OpenHands agent |
| `config/openhands/work-packet.schema.json` | JSON Schema for work packets dispatched to an OpenHands worker |
| `config/openhands/model-routing.example.yaml` | Example low-cost/high-cost model routing policy |
| `config/openhands/cost-policy.example.yaml` | Example monthly cost ceiling + soft/fail-closed thresholds |

## Do not

- Do **not** run `scripts/ops/openhands/install.sh --install` — it refuses unless
  `OPENHANDS_INSTALL_APPROVED=YES` **and** `--i-understand-protected-action` are both supplied, and even then
  it is not authorized by this package alone.
- Do **not** copy `.env.example` to a real `.env` with live credentials outside an approved secret store.
- Do **not** bind any port other than `127.0.0.1:3000`.
- Do **not** enable the systemd units under `scripts/ops/systemd/` on any host.
- Do **not** treat the Docker-socket mount in `compose.yaml` as low-risk — it is a documented RISK (see
  `VERSIONS.md` and inline compose comments), required by OpenHands to spawn sandbox containers.
- Do **not** point this package at `POSTGRES_URL`, `MASTER_ADMIN_KEY`, or any CorpFlowAI production secret.
- Do **not** generalize the existing Uptime Kuma carve-out to authorize this package — see
  `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 "Explicit non-generalization".

## Local validation (safe — does not start anything)

These commands only **parse/lint** the package; none of them start a container.

```bash
# Validate compose syntax (no containers started)
docker compose -f ops/openhands/compose.yaml config

# Validate the debug override merges cleanly
docker compose -f ops/openhands/compose.yaml -f ops/openhands/compose.override.example.yaml config

# Shell script lint (if shellcheck is installed)
shellcheck scripts/ops/openhands/*.sh scripts/ops/openhands/lib/*.sh

# JSON Schema sanity (if a JSON tool is available)
python3 -m json.tool config/openhands/work-packet.schema.json > /dev/null

# Read-only host capacity capture (safe to run anywhere; prints markdown, no secrets)
bash scripts/ops/openhands/inspect-host-capacity.sh

# Preflight checks (safe — read-only; will report docker/compose absent on a laptop, that's expected)
bash scripts/ops/openhands/preflight.sh
```

Expect `preflight.sh` to report missing prerequisites on a machine that never had OpenHands set up — that is
the correct, safe outcome. A clean `--check` run is not, by itself, authorization to `--install`.

## Path to authorization (not started by this package)

1. Anton reviews this package (compose, scripts, resource envelope, risk list).
2. A new ADR is opened under `docs/decisions/` naming OpenHands as a second named § 5.5 carve-out, with its
   own threat model (Docker-socket mount, sandbox spawn, outbound LLM API calls).
3. A dedicated install-runbook packet (mirroring `docs/runbooks/UPTIME_KUMA_ON_EXEC01_INSTALL_RUNBOOK_V1.md`)
   is authored and approved.
4. Only after 1–3 does `install.sh --install` become an authorized action, and only with
   `OPENHANDS_INSTALL_APPROVED=YES` set by Anton at execution time.
