# OpenHands dedicated rootless Docker daemon (INACTIVE — package only)

**Status: INACTIVE.** Nothing in this directory is installed or running. Controlling issue:
[#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743) — security follow-up for PR #747.
Full investigation record: `docs/operations/OPENHANDS_DOCKER_ISOLATION.md`.

This directory documents and packages the **dedicated rootless Docker daemon** that OpenHands' control plane and
every sandbox container it spawns must use — **never** the primary host Docker daemon
(`/var/run/docker.sock`). See `ops/openhands/compose.yaml`'s "DOCKER ISOLATION DESIGN" header for the full rule
set this package implements.

## Why a dedicated rootless daemon (and not the alternatives)

`docs/operations/OPENHANDS_DOCKER_ISOLATION.md` records four options evaluated for #743's security follow-up.
Short version:

| Option | Verdict |
|---|---|
| **1. Dedicated rootless Docker daemon (this package)** | **SELECTED.** Own socket, own `--data-root`, own systemd slice. A compromise is contained to OpenHands' own daemon — it cannot see, touch, or resource-starve any other container/volume/image on the box (Uptime Kuma, n8n, Beszel, ERPNext-sandbox, the repo clone). Rootless mode means the daemon's own "root" maps to an unprivileged host UID, not real host root. |
| **2. Docker socket-proxy in front of the primary socket** | **REJECTED for an initial carve-out.** Even the narrowest proxy ACL sets (e.g. `linuxserver/socket-proxy`, Nginx-based proxies) that allow `POST /containers/create` still let a caller specify arbitrary `HostConfig.Binds` / `Mounts` in the request body — there is no safe default ACL in the tools evaluated that can allow "create a container" while disallowing "bind-mount `/`". A proxy narrows *which endpoints* are reachable, not *what those endpoints are asked to do*. Since OpenHands needs Create (to spawn sandboxes), a proxy alone does not close the host-bind-mount risk. Could be revisited as a **second** layer in front of the dedicated daemon in a future hardening pass, but is not a substitute for daemon isolation. |
| **3. Primary host socket, direct mount (PR #747's original design)** | **FORBIDDEN going forward.** Host-root-equivalent blast radius on compromise — see `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 3 (kept as historical record of the rejected default, not re-authored). |
| **4. Kubernetes / gVisor / Firecracker-style per-task VM isolation** | **NOT AVAILABLE.** Per-sandbox native `HostConfig` resource + syscall isolation of this depth is an OpenHands **Enterprise** capability (k8s-backed runtime), not available on the OSS `1.8` Docker path this package targets. Noted as a residual gap, not solved here. |

## What "dedicated" means in practice

- **Own Unix socket:** `$OPENHANDS_HOME/docker/docker.sock` (default `$HOME/corpflowai-openhands/docker/docker.sock`).
  Never `/var/run/docker.sock`.
- **Own data-root:** `$OPENHANDS_HOME/docker-data` (default `$HOME/corpflowai-openhands/docker-data`). Never
  `/var/lib/docker`. This is what actually makes isolation real — images, containers, networks, and volumes
  created against this daemon are physically stored under a path the primary daemon never reads.
- **Own systemd user service** (`scripts/ops/systemd/corpflowai-openhands-dockerd.service`, INACTIVE, not enabled
  by default) running `dockerd-rootless.sh` with `--config-file` / `--host` / `--data-root` under `$OPENHANDS_HOME`.
  **Does not** `EnvironmentFile=` `ops/openhands/.env` (application/model secrets). Optional daemon-only env:
  `ops/openhands/daemon/daemon.env.example` → `$OPENHANDS_HOME/docker/daemon.env` (paths only).
  **Does not** set `NoNewPrivileges=yes` — **incompatible** with stock `newuidmap`/`newgidmap` (see
  `OPENHANDS_DOCKER_ISOLATION.md` § 2.6). Sets `Delegate=yes` for cgroup v2 child management.
- **Own systemd slice** (`scripts/ops/systemd/corpflowai-openhands.slice`, INACTIVE) with
  `MemoryMax=8G`, `CPUQuota=300%`, `TasksMax=2048`. Sandbox placement under this slice is
  **PENDING RUNTIME VERIFICATION** at the install gate (disposable cgroup probe in
  `OPENHANDS_DOCKER_ISOLATION.md` § 2.5) — do not treat it as proven until that evidence exists.
- **Everything OpenHands touches — control plane AND every spawned sandbox — goes through this one dedicated
  daemon.** There is no split where sandboxes use one daemon and the control plane another; that would
  reintroduce a cross-daemon coordination risk for no isolation benefit.

## Why not systemd's own container support (e.g. `systemd-nspawn`, Podman-only paths)

Out of scope for this packet. OpenHands' upstream deployment path is Docker Compose against a Docker Engine API
(`docs.openhands.dev`, checked 2026-08-04) — swapping the container runtime entirely would be a much larger,
unreviewed change with no upstream-documented support. Rootless **Docker** (not Podman, not `systemd-nspawn`)
is the minimal change that achieves daemon-level isolation while staying on the runtime OpenHands actually
documents against.

## Install is gated — this package does not start anything

Same gating model as the rest of `ops/openhands/`:

1. Anton's explicit written approval.
2. A new named § 5.5-style carve-out ADR for OpenHands (`docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`).
3. `scripts/ops/openhands/install.sh --install` with `OPENHANDS_INSTALL_APPROVED=YES` and
   `--i-understand-protected-action` — which now ALSO requires
   `scripts/ops/openhands/verify-dedicated-daemon.sh` (or the dedicated-daemon preflight checks folded into
   `preflight.sh`) to pass before proceeding.

Even with rootless Docker installed and the daemon unit enabled, `install.sh --check` / `preflight.sh` will
continue to refuse `--install` without both gates above.

## File map

| File | Purpose |
|---|---|
| `README.md` | This file. |
| `daemon.json.example` | Example rootless-dockerd config: dedicated `data-root`, Unix-socket-only `hosts`, no TCP listener, `cgroup-parent` caveat documented. Placeholders only — copy and fill paths at install time, never commit a real `daemon.json` with host-specific absolute paths that leak the operator's home directory layout beyond what is already documented here. |
| `dockerd-rootless.service.example` | Points to `scripts/ops/systemd/corpflowai-openhands-dockerd.service` — the actual reviewed unit lives under `scripts/ops/systemd/` alongside the other OpenHands units so all systemd files stay in one directory; this file is a short pointer + rootless-install prerequisites, not a duplicate unit. |

## Rootless Docker prerequisites (documented, not installed by this package)

Per Docker's own rootless-mode documentation (`docs.docker.com/engine/security/rootless/`, general reference —
this package does not pin a Docker Engine version; that is the host's own package manager's job, verified
read-only by `scripts/ops/openhands/preflight.sh`):

- `newuidmap` / `newgidmap` (usually from the `uidmap` package) must be installed and setuid-root on the host.
- The operator's user needs entries in `/etc/subuid` and `/etc/subgid` (typically already present on modern
  Ubuntu for non-root users; verified read-only, never modified by any script in this package).
- `dockerd-rootless-setuptool.sh install` (upstream script, not vendored here) is the documented way to
  initialize a rootless daemon for a given user — this package's install runbook (when authorized) would run
  this with explicit `--skip-iptables` review depending on the host's `iptables`/`nft` posture, and with the
  socket/data-root flags pointed at `$OPENHANDS_HOME` rather than accepting the tool's own defaults
  (`$XDG_RUNTIME_DIR/docker.sock`, `~/.local/share/docker`), so that every OpenHands-related path is under the
  single reviewable `$OPENHANDS_HOME` tree.
- Rootless Docker uses `slirp4netns` or `vpnkit` (userland networking) or, on newer setups, `rootlesskit` with a
  configurable network mode for outbound connectivity — this is why LLM API egress from a rootless daemon still
  works despite no privileged host networking. No inbound port is exposed by the dedicated daemon itself; the
  only inbound-reachable thing stays the app container's own loopback-bound `127.0.0.1:3000` publish.

## Explicit non-generalization

This package is for OpenHands alone. It does not authorize, imply, or generalize a "just run everything rootless"
policy for other tools on `corpflow-exec-01-u69678`. Per
`docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5's own rule, each tool gets its own ADR,
its own threat model, its own packet.
