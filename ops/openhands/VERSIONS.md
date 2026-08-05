# OpenHands — version pin record

**Status:** INACTIVE — record only, nothing installed. Controlling issue: [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743).

**Date checked:** 2026-08-04

## Selected versions

| Component | Image | Tag pinned | Notes |
|---|---|---|---|
| OpenHands app / control plane | `docker.openhands.dev/openhands/openhands` | `1.8` | UI + orchestrator; serves on container port `3000` |
| Agent server (sandbox runtime image) | `ghcr.io/openhands/agent-server` | `1.26.0-python` | Referenced via `AGENT_SERVER_IMAGE_REPOSITORY` / `AGENT_SERVER_IMAGE_TAG` env vars, not pulled directly by the control-plane compose file — the app pulls it at sandbox-spawn time |

No `latest` tag is used anywhere in this package. Both tags above are exact, reproducible pins as of the date
checked.

## Reasons for these pins

- `1.8` is the most recent tagged OpenHands app release documented on `docs.openhands.dev` as of 2026-08-04 that
  publishes the standard web UI on port `3000` and supports the split app/agent-server image model.
- `1.26.0-python` is the matching agent-server tag documented as compatible with app `1.8` in the same official
  docs pass. The `-python` variant is the general-purpose sandbox runtime (vs. minimal/other language variants)
  and is the default recommended by upstream for mixed-language repositories such as this one (JS/TS + Python
  under `core/engine/`).
- Pinning both images independently (rather than trusting `latest`/`main`) is required by
  `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` (idempotency, reproducibility) and by this package's own
  constraint set (no `latest`).

## Sources (official docs, checked 2026-08-04)

- `docs.openhands.dev` — installation / Docker deployment guide (app image tag `1.8`, UI port `3000`).
- `docs.openhands.dev` — agent-server / runtime image reference (`ghcr.io/openhands/agent-server:1.26.0-python`).
- `docs.openhands.dev` — Docker-socket requirement for sandbox container spawning (control plane spawns sibling
  containers per task using the host Docker daemon).

No third-party mirrors, blog posts, or unofficial registries were used to select these pins.

## Compatibility assumptions

- Host: `corpflow-exec-01-u69678` (Ubuntu server, x86_64). This package assumes a Docker Engine + Docker Compose
  v2 plugin already present (verified read-only by `scripts/ops/openhands/preflight.sh`, never installed by
  this package).
- The app image `1.8` is assumed compatible with the agent-server tag `1.26.0-python` per the same-dated docs
  pass. If upstream docs are re-checked at install time and show a different recommended agent-server tag for
  app `1.8` (or a newer app release), this file must be updated **before** any install, and the new pins must go
  through the same review as this package.
- No GPU is assumed or required.
- Outbound network access to the operator's chosen LLM API provider is assumed necessary for the app to
  function; this package does not select a provider (see `.env.example` and `config/openhands/config.example.toml`
  placeholders).

## Docker isolation design (security follow-up for PR #747 — issue #743)

**Full investigation record:** `docs/operations/OPENHANDS_DOCKER_ISOLATION.md`. Summary below.

PR #747's original design mounted the **primary host** Docker socket (`/var/run/docker.sock`) directly into the
control-plane container so it could spawn sandbox containers. That is a host-root-equivalent blast radius on
compromise and is now **forbidden** in this package. Four options were evaluated for the replacement:

| # | Option | Verdict |
|---|---|---|
| 1 | **Dedicated rootless Docker daemon** (own socket, own `--data-root`, own systemd slice) | **SELECTED** |
| 2 | Docker socket-proxy in front of the primary socket | **REJECTED** for an initial carve-out — no evaluated proxy ACL can allow `ContainerCreate` (required to spawn sandboxes) while disallowing arbitrary `HostConfig.Binds` in the same request |
| 3 | Primary host socket, direct mount (PR #747's original design) | **FORBIDDEN** going forward |
| 4 | Kubernetes / gVisor / Firecracker-style per-task VM isolation | **NOT AVAILABLE** — that depth of native per-sandbox isolation is an OpenHands **Enterprise** (k8s-backed) capability, not available on the OSS `1.8` Docker path this package targets |

**What changed as a result:**

- `compose.yaml` mounts **only** a dedicated socket (`$OPENHANDS_HOME/docker/docker.sock` by default, never
  `/var/run/docker.sock`) and sets `DOCKER_HOST` accordingly. See `ops/openhands/daemon/README.md`.
- `extra_hosts: [host.docker.internal:host-gateway]` was **removed entirely**. Outbound calls to the operator's
  chosen LLM API provider use normal container egress; no host-loopback service is required for that path.
- `scripts/ops/openhands/lib/common.sh`'s `openhands_docker()` wrapper forces every OpenHands-owned Docker/Compose
  command onto the dedicated daemon and fails closed if `DOCKER_HOST` (or the configured socket path) resolves to
  the primary socket.
- A new `scripts/ops/systemd/corpflowai-openhands.slice` + `corpflowai-openhands-dockerd.service` pair (both
  INACTIVE) define the dedicated daemon's own systemd unit and the combined resource ceiling.
- `scripts/ops/openhands/verify-dedicated-daemon.sh` (new) is a **live** check — it inspects a running dedicated
  daemon (if any) to confirm its `DockerRootDir` is under `OPENHANDS_HOME` and that it cannot see any other
  CorpFlowAI-managed container (Uptime Kuma, Beszel, n8n, ERPNext).

**Docker Engine API operations OpenHands needs** (all against the dedicated daemon only): `Container` create /
start / stop / remove / inspect / logs / wait (to spawn and manage each sandbox); `Image` pull (to fetch the
agent-server image); `Network` create (per-sandbox network, if the app creates one); `Volume` create (per-task
workspace, if the app uses a named volume rather than the fixed `corpflowai-openhands-workspace`). None of these
require, or are granted, access to the primary host daemon.

**Health endpoint:** `http://127.0.0.1:3000/health` (official liveness endpoint, not the bare `/` root) — see
`ops/openhands/compose.yaml` healthcheck and `scripts/ops/openhands/health-check.sh`.

**Capacity source of truth:** `scripts/ops/openhands/inspect-host-capacity.sh` only (read-only; reports PRIMARY
host daemon inventory and DEDICATED daemon inventory in clearly separated sections). No other script or doc in
this package is a capacity source of truth.

**Sandbox resource-limit enforcement matrix:**

| Limit | Mechanism | Enforced by | Residual risk |
|---|---|---|---|
| Concurrent sandbox tasks | `MAX_CONCURRENT_CONVERSATIONS=1` (app env) | Application-level, not kernel-enforced | App bug could exceed 1; total-ceiling slice below is the backstop |
| Per-task wall-clock timeout | `SANDBOX_TIMEOUT=600` (app env) | Application-level | Same as above |
| Per-task iteration ceiling | `MAX_ITERATIONS=40` (app env) | Application-level | Same as above |
| Combined RAM / CPU / task-count ceiling for dedicated daemon + control plane + every sandbox | `corpflowai-openhands.slice` (`MemoryMax=4G`, `MemoryHigh=3584M`, `CPUQuota=200%`, `TasksMax=1024`) + daemon `cgroup-parent=corpflowai-openhands-containers.slice` | **Kernel cgroup**, real hard limit when `verify-cgroup-placement.sh` passes | Residual: no per-sandbox HostConfig cap in OSS 1.8 |
| Per-sandbox native RAM/CPU limit (e.g. 4 GiB per spawned container via `HostConfig`) | **Not available** in the OSS `1.8` Docker deployment path | N/A | **Residual risk**: a single misbehaving sandbox could theoretically consume up to the full slice ceiling before the kernel OOMs it; this is bounded by the slice total, not by a per-container cap. Native per-sandbox `HostConfig` resource limits are an OpenHands **Enterprise** (k8s-backed runtime) feature per the docs pass above, not present in the OSS Docker path. |

## Known limitations (as of this pin, 2026-08-04)

- Resource use of spawned sandbox containers is **not** enforced per-container by the app itself in this pinned
  version — see the enforcement matrix above. The kernel-enforced combined ceiling
  (`scripts/ops/systemd/corpflowai-openhands.slice`) is the real backstop; concurrency=1 + per-task timeout are
  application-level policy, not kernel-enforced.
- No production-grade auth/session hardening is assumed out of the box; loopback-only binding is this package's
  substitute control until (and unless) a proper auth layer is reviewed separately.
- This package has not been run end-to-end (no install has happened); version compatibility is based on reading
  official docs only, not on a live smoke test. Any install runbook must re-verify against a real pull + boot
  before being marked reviewed. In particular, whether rootless Docker's `daemon.json` honors a `cgroup-parent`
  key the same way a rootful daemon would is **unverified** — see `ops/openhands/daemon/daemon.json.example`'s
  `_cgroup_parent_note`; the systemd slice wrapping the dockerd unit itself is the mechanism this package actually
  relies on, independent of that unresolved question.

## Pin policy

- Patch-level bumps within `1.8.x` (app) or `1.26.0-x` (agent-server, if such point releases exist) may be
  reviewed and applied at the next authorized install review without re-opening the full ADR, provided the
  official docs for that patch do not change the Docker-socket requirement, the port, or the security posture
  described here.
- Minor or major version bumps (e.g. `1.8` → `1.9` or `1.26.0-python` → `1.27.x-python`) require re-reading the
  official `docs.openhands.dev` pages for that release and updating this file's "Sources" and "Compatibility
  assumptions" sections before the new pin is used anywhere in this package.
- `latest`, `main`, `nightly`, or any floating tag must never appear in `compose.yaml`, `compose.override.example.yaml`,
  `.env.example`, or any script in this package.
