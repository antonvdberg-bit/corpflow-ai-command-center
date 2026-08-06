# OpenHands Docker isolation — dedicated rootless daemon (Phase 1 security follow-up)

**Status:** DRAFT design doc for a **not-yet-installed** package. Describes the authoritative Docker-isolation
shape that supersedes the "mount the primary host socket, accept the risk" posture originally documented in
`docs/operations/OPENHANDS_SECURITY_MODEL.md` § 3 (2026-08-04, PR #747 initial package). Nothing in this doc is
live. **Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743) ·
**PR:** [#747](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/747) (Docker isolation security
follow-up).

**Companion docs:**

- `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 3 — the threat model this design changes; read both together.
- `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` — where the dedicated daemon is stood up, before the app itself.
- `docs/operations/OPENHANDS_ARCHITECTURE.md` — the target flow this design isolates.
- `docs/operations/OPENHANDS_ROLLBACK_AND_UNINSTALL.md` — how the dedicated daemon is torn down.
- `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md`, `docs/decisions/20260804-openhands-on-exec01.md` —
  the carve-out gate this design is a **hard condition** of, not an optional enhancement.
- `ops/openhands/compose.yaml`, `ops/openhands/daemon/README.md`, `scripts/ops/openhands/lib/common.sh`,
  `scripts/ops/systemd/corpflowai-openhands-dockerd.service`, `scripts/ops/systemd/corpflowai-openhands.slice` —
  the reviewed package that implements this design in the same PR (#747). `ops/openhands/daemon/README.md` is
  the package-side companion to this doc — it names the exact env vars (`OPENHANDS_HOME`,
  `OPENHANDS_DOCKER_SOCK`, `OPENHANDS_DOCKER_HOST`, `OPENHANDS_DOCKER_DATA_ROOT`), file map, and rootless-Docker
  prerequisites in more mechanical detail than this narrative doc repeats.

---

## 1. Why this doc exists

The original Phase 1 package (2026-08-04, first commit on this branch) mounted the **primary host Docker
socket** (`/var/run/docker.sock`) read-write into the OpenHands control-plane container, and named that as an
honestly-disclosed, accepted, host-root-equivalent risk with a socket-proxy or rootless daemon flagged as
**future** hardening, not built. Issue #743 follow-up (this PR, #747) promotes that "future hardening" to the
**required Phase 1 shape** — mounting the primary socket is no longer an accepted design; it is a **hard block**
on the carve-out (see `OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` § 1.1a).

This doc names the selected design (a **dedicated rootless Docker daemon used only by OpenHands**), states why
it was chosen over the alternatives, and states plainly what it does and does **not** fix.

## 2. Selected design: dedicated rootless Docker daemon

**Authoritative — supersedes any prior "mount `/var/run/docker.sock`" language in this doc set.**

| Control | Detail |
|---|---|
| Daemon | A **second**, rootless Docker daemon, installed and run under the operator's own unprivileged Linux user (rootless mode — see `dockerd-rootless-setuptool.sh` upstream), used **exclusively** by OpenHands. It is not the box's primary Docker daemon (the one Uptime Kuma's `docker.sock` reference and any future ERPNext container use); it is a fully separate daemon process, socket, and data root. |
| Socket | `$HOME/corpflowai-openhands/docker/docker.sock`. **Never** `/var/run/docker.sock`. The primary host socket is never mounted into, or reachable from, the OpenHands control-plane container in this design. |
| Data root | `$HOME/corpflowai-openhands/docker-data` — the dedicated daemon's own image/container/volume storage, isolated from the primary daemon's `/var/lib/docker`. Images pulled for the control plane and for spawned sandboxes live here, not in the primary daemon's storage. |
| Access | The OpenHands control-plane container's compose file mounts the dedicated daemon's host-side socket at a **container-internal path that is deliberately NOT `/var/run/docker.sock`** — `ops/openhands/compose.yaml` uses `/run/openhands-docker/docker.sock` inside the container (configurable via `OPENHANDS_DOCKER_SOCK_IN_CONTAINER`), specifically so no log line or tooling output inside the container can be misread as "this is the primary daemon." Every operator/script command against this daemon (compose up/down, `docker ps`, `docker system df`, evidence scripts) resolves `DOCKER_HOST` to the dedicated socket — either via `scripts/ops/openhands/lib/common.sh`'s `openhands_docker()` wrapper (the required pattern for every script in this package) or an explicit manual `DOCKER_HOST=unix://$HOME/corpflowai-openhands/docker/docker.sock` export for ad-hoc operator commands. There is no ambient/default-daemon fallback anywhere in this package — `openhands_assert_isolation_context()` fails closed if one is attempted. |
| Resource ceiling | A systemd **user** slice hierarchy: `corpflowai-openhands.slice` (aggregate `MemoryMax=4G`, `MemoryHigh=3584M`, `CPUQuota=200%`, `TasksMax=1024`) wraps the dockerd unit; `corpflowai-openhands-containers.slice` is the daemon-level `cgroup-parent` for every container (`native.cgroupdriver=systemd`). Host-safe for ~7.6 GiB boxes — **not** 8G. Install gate: `scripts/ops/openhands/verify-cgroup-placement.sh` must prove the probe PID cgroup is beneath the container slice. |
| Scope | The dedicated daemon has **no other tenants**. It is not shared with Kuma, ERPNext, Beszel, or any other box workload — those continue to use the box's primary Docker daemon (or their own tooling) unaffected. A compromise that reaches the dedicated daemon's API surface can, at most, control containers/images/volumes **within that daemon** — it has no path to the primary daemon's containers, images, or volumes, because it is a structurally separate process with its own Unix socket and its own on-disk state. |

### 2.1 What this design fixes, stated plainly

- **Before:** a compromised OpenHands control-plane process could ask the **primary** Docker daemon to do
  anything the daemon itself can do — including touching Uptime Kuma's container, ERPNext's containers, or any
  other box workload, because they all share the one primary daemon and its one socket.
- **After:** a compromised OpenHands control-plane process can only ask the **dedicated** daemon to do things —
  and that daemon has never heard of Kuma, ERPNext, or any other box workload. The blast radius of a Docker-API
  compromise is now bounded to OpenHands' own dedicated daemon, its own data root, and (per the slice) a bounded
  CPU/RAM ceiling — not the whole box.
- Rootless mode additionally means the dedicated daemon itself does not run as the Linux `root` user, further
  narrowing what even a fully successful "ask the daemon to misbehave" attack can reach on the host filesystem
  outside the daemon's own rootless user-namespace mappings.

### 2.2 What this design does NOT fix (residual risk — read before approving)

- **Docker-socket access is still host-daemon-equivalent access, scoped to the dedicated daemon.** Anyone with
  access to `$HOME/corpflowai-openhands/docker/docker.sock` can still ask that daemon to start a privileged
  container, mount host paths **that the daemon process itself can see** (bounded by rootless user-namespace
  mapping, not zero), or otherwise misuse the dedicated daemon's own scope. This is narrower than before, not
  eliminated.
- **No per-sandbox 4 GiB `HostConfig` limit is natively available in the OSS OpenHands `1.8` Docker
  self-host path.** OpenHands Enterprise's Kubernetes runtime exposes a `MEMORY_LIMIT` setting for spawned
  sandboxes; the **Docker** control-plane path in the pinned OSS `1.8` release does not expose an equivalent
  native per-sandbox memory/CPU flag as of the 2026-08-04 review. In practice this means:
  - The systemd slice's `MemoryMax=4G` / `CPUQuota=200%` is a **total** ceiling across the control plane and
    every concurrently-running sandbox, not a per-sandbox cap.
  - With concurrency capped at **1** (`MAX_CONCURRENT_CONVERSATIONS=1`, § 5 below), a single misbehaving sandbox
    can, in the worst case, consume up to the **entire** 4 GiB / 200% ceiling before the slice's own limit kills
    it — there is no smaller per-task blast radius inside that ceiling.
  - This is an **accepted, disclosed gap**, not a silent omission. The authorization packet
    (`OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` § 1.1a) requires Anton to **explicitly accept this specific
    gap** as a condition of the carve-out — the carve-out stays blocked otherwise. A future packet may close
    this gap if upstream OpenHands adds a native per-sandbox Docker resource flag, or if this package is later
    changed to inject `HostConfig` limits onto spawned sandbox containers itself (not attempted in this round —
    flagged as a follow-up, not solved here).
- **A socket-proxy layer was evaluated and rejected for this round** — see § 6.

### 2.3 Docker Engine API operations OpenHands needs (dedicated daemon only)

Exhaustive list of the Docker Engine API operation *classes* the control plane needs to function, all scoped to
the **dedicated** daemon — none of these are ever issued against the primary host daemon:

| Operation class | Why OpenHands needs it |
|---|---|
| `Container` create / start / stop / remove / inspect / logs / wait | Spawn, monitor, and tear down each per-task sandbox container |
| `Image` pull | Fetch the pinned agent-server (sandbox runtime) image (`ghcr.io/openhands/agent-server:1.26.0-python`, see `VERSIONS.md`) |
| `Network` create | Per-sandbox network, if the app creates one rather than reusing `corpflowai-openhands-net` |
| `Volume` create | Per-task workspace, if the app uses an app-managed named volume rather than the fixed `corpflowai-openhands-workspace` volume this package pre-declares |

No `Swarm`, `Plugin`, `Secrets`, `Config`, `Node`, or `Service` (Swarm-mode) endpoints are required — OpenHands
does not use Docker Swarm. This bounded operation list is also why § 6's socket-proxy option was evaluated at
all (a proxy's value proposition is narrowing the API surface to exactly this list) and why it was still judged
insufficient on its own (see the sharpened rejection reasoning in § 6): `Container create` is unavoidably in the
required list, and that single endpoint's request body can carry arbitrary `HostConfig.Binds` regardless of
which other endpoints a proxy denies — there is no evaluated proxy ACL that can safely allow Create without
also allowing an arbitrary bind-mount.

### 2.4 Resource enforcement matrix

Mirrors `ops/openhands/VERSIONS.md`'s matrix (kept in both places since `VERSIONS.md` is the pin/version record
and this doc is the isolation-design record — update both together if either changes):

| Limit | Mechanism | Enforced by | Residual risk |
|---|---|---|---|
| Concurrent sandbox tasks | `MAX_CONCURRENT_CONVERSATIONS=1` (app env) | Application-level | App bug could exceed 1; the slice below is the backstop |
| Per-task wall-clock timeout | `SANDBOX_TIMEOUT=600` (app env) | Application-level | Same as above |
| Per-task iteration ceiling | `MAX_ITERATIONS=40` (app env) | Application-level | Same as above |
| Combined RAM / CPU / task-count ceiling (dedicated daemon + expected sandboxes) | `corpflowai-openhands.slice` (`MemoryMax=4G`, `MemoryHigh=3584M`, `CPUQuota=200%`, `TasksMax=1024`) + daemon.json `cgroup-parent=corpflowai-openhands-containers.slice` + `native.cgroupdriver=systemd` + dockerd `Delegate=yes` | **Kernel cgroup** for dockerd **and** every container when `verify-cgroup-placement.sh` passes | Residual: no per-sandbox HostConfig cap in OSS 1.8 (§ 2.2) |
| Per-sandbox native RAM/CPU limit (e.g. a 4 GiB `HostConfig` cap per spawned container) | **Not available** in the OSS `1.8` Docker deployment path | N/A | **Residual** — see § 2.2; bounded by the slice total, not a per-container cap |

### 2.5 Systemd slice + daemon cgroup-parent (install gate)

**Do not claim sandboxes are contained under the OpenHands resource ceiling until `scripts/ops/openhands/verify-cgroup-placement.sh` passes on the real host.** Checking only the dockerd process cgroup is insufficient — the 2026-08-05 install attempt on `corpflow-exec-01-u69678` showed dockerd under `corpflowai-openhands.slice` while the probe container landed in unrestricted `user.slice/.../docker-<id>.scope`.

**Selected design (Option A — live-verified 2026-08-05):**

1. Aggregate user slice `corpflowai-openhands.slice` with host-safe `MemoryMax=4G` / `MemoryHigh=3584M` / `CPUQuota=200%` / `TasksMax=1024` (8G rejected: exceeds ~7.6 GiB physical RAM).
2. Child user slice `corpflowai-openhands-containers.slice` (systemd dash-nesting under the aggregate).
3. Dedicated rootless `daemon.json`: `"exec-opts": ["native.cgroupdriver=systemd"]` and `"cgroup-parent": "corpflowai-openhands-containers.slice"`.
4. Dockerd unit: `Slice=corpflowai-openhands.slice`, `Delegate=yes`. Do **not** duplicate `data-root`/`hosts` in daemon.json when the unit already passes them as CLI flags.

**Options evaluated:**

| Option | Result |
|---|---|
| **A. Daemon-level `cgroup-parent` + systemd cgroup driver + containers sub-slice** | **SELECTED.** Live probe PID cgroup: `.../corpflowai-openhands.slice/corpflowai-openhands-containers.slice/docker-<id>.scope`. Ancestor MemoryMax=4G visible. |
| **B. Relative parent under the dockerd service cgroup only** | Not required once A placed containers under the aggregate ancestor with hard limits. |
| **C. Per-container `--cgroup-parent` HostConfig** | Also works on this host, but OpenHands OSS sandbox spawn does not reliably expose HostConfig injection for every sandbox — not acceptable as the sole control. Kept as optional defense-in-depth, not the primary design. |

Install-gate proof (also automated by `verify-cgroup-placement.sh`):

```bash
systemctl --user show corpflowai-openhands-dockerd.service -p Slice -p Delegate
systemctl --user show corpflowai-openhands.slice -p MemoryMax -p MemoryHigh -p CPUQuotaPerSecUSec -p TasksMax
export DOCKER_HOST=unix://$HOME/corpflowai-openhands/docker/docker.sock
docker run -d --name corpflowai-openhands-cgroup-probe busybox:1.36 sleep 120
PID=$(docker inspect -f '{{.State.Pid}}' corpflowai-openhands-cgroup-probe)
tr '\0' '\n' < /proc/$PID/cgroup
# MUST contain corpflowai-openhands-containers.slice AND corpflowai-openhands.slice
docker rm -f corpflowai-openhands-cgroup-probe
bash scripts/ops/openhands/verify-cgroup-placement.sh
```

**Pass criteria:** probe PID cgroup contains `corpflowai-openhands-containers.slice` beneath `corpflowai-openhands.slice`; aggregate MemoryMax is set and ≤ 4G; primary daemon untouched. **Fail:** generic unrestricted `user.slice` docker scope; ignored cgroup-parent; infinity/missing MemoryMax; dockerd-only evidence.

### 2.6 NoNewPrivileges on the rootless dockerd unit — verdict

**Verdict: INCOMPATIBLE** with stock Docker rootless (`newuidmap` / `newgidmap` as documented by Docker Engine rootless mode).

- Official Docker rootless docs: rootless mode **requires** `newuidmap` and `newgidmap` to map subordinate UIDs/GIDs (the only SETUID/filecap helpers rootless mode uses).
- systemd `NoNewPrivileges=yes` sets `PR_SET_NO_NEW_PRIVS`, which blocks those helpers from gaining needed privileges (`rootless-containers/rootlesskit#551` — failure writing `uid_map`: Operation not permitted).
- Therefore `scripts/ops/systemd/corpflowai-openhands-dockerd.service` **must not** set `NoNewPrivileges=yes`. The unit documents this explicitly. The OpenHands **app** container may still use compose `security_opt: no-new-privileges:true` (separate from the dockerd unit).

### 2.7 Daemon vs application secret separation

| Surface | May load | Must never load |
|---|---|---|
| `corpflowai-openhands-dockerd.service` | `%h` path `Environment=` lines; optional `%h/corpflowai-openhands/docker/daemon.env` (paths only) | `ops/openhands/.env`, `LLM_*`, `GITHUB_TOKEN`, OAuth, `POSTGRES_*`, client secrets |
| `corpflowai-openhands.service` (app) | `ops/openhands/.env` (app + model + GitHub placeholders filled from secret store) | Must not be shared into dockerd |
| `ops/openhands/daemon/daemon.env.example` | Non-secret path overrides only | Any application/model secret |

Deterministic tests fail if the dockerd unit references `ops/openhands/.env` or application secret variable names.

## 3. `host.docker.internal` removed

The original compose file's `extra_hosts: ["host.docker.internal:host-gateway"]` entry is **removed**. There is
no approved use case for the control plane to reach a service bound to the host's own loopback interface:

- The control plane's only outbound need is the external LLM provider API — a normal internet egress path, not
  a host-loopback path. `networks: corpflowai-openhands-net` with `internal: false` already covers this; no
  `host.docker.internal` mapping is needed for it.
- Keeping `host.docker.internal` around "in case a locally hosted LLM gateway is ever used" (the original
  file's comment) is exactly the kind of unused, unreviewed surface this follow-up is meant to close. If a future
  packet has a real, reviewed need for the control plane to reach a host-bound service, it must add the mapping
  back **with a named justification in that packet**, not inherit it from this round by default.
- Removing it also means a compromised control-plane process cannot use `host.docker.internal` as a pivot to
  probe the host's own loopback-bound services (Uptime Kuma on `:3001`, any future Beszel hub on `:8090`, etc.) —
  a small but real narrowing of the attack surface, consistent with the rest of this doc's "narrow, don't
  assume" posture.

### 3.1 Dynamic sandbox spawn (OpenHands 1.8 app_server) — Option D override

**Finding (live pilot + in-container source):** dynamically spawned `oh-agent-server-*`
containers are created by `DockerSandboxService.start_sandbox()` in
`/app/openhands/app_server/sandbox/docker_sandbox_service.py`. Upstream 1.8:

| Field | Upstream default | CorpFlowAI required |
|---|---|---|
| Network | `network_mode=None` → daemon **default bridge** | `corpflowai-openhands-net` only |
| ExtraHosts | `host.docker.internal:host-gateway` | `[]` |
| Webhook callback | `http://host.docker.internal:{port}/api/v1/webhooks` | `http://corpflowai-openhands-app:3000/api/v1/webhooks` |
| Health URL | rewrites to `host.docker.internal` | `http://{sandbox-name}:8000` (Docker DNS) |
| Published ports | random host ports | **none** |
| Per-sandbox limits | none on OSS Docker path | mem 512m / 0.5 CPU / PIDs 256 |

`SANDBOX_ADDITIONAL_NETWORKS` / `SANDBOX_LOCAL_RUNTIME_URL` are **not read** on this
app_server path (V0 runtime docs leftovers). Compose env alone cannot meet the boundary.

**Selected remediation (Option D):** bind-mount
`ops/openhands/runtime-overrides/docker_sandbox_service.py` over the upstream module.
Prefer deleting the override if a future upstream release gains first-class named-network
+ empty-ExtraHosts support.

**Verification:** `node-tests/openhands-sandbox-spawn-override.test.mjs`;
`scripts/ops/openhands/probe-sandbox-spawn-isolation.sh` (`POST /api/v1/sandboxes`, no model);
`verify-sandbox-boundary.sh` inspects live `oh-agent-server-*` when present.

This does **not** add `host.docker.internal`, `host-gateway`, host networking, or a route to
host-bound CorpFlowAI services.

## 4. Healthcheck: official `/health`, not bare `/`

The original compose file's healthcheck (`curl -fsS http://127.0.0.1:3000/`) is replaced with the OpenHands app's
own documented health endpoint:

```yaml
healthcheck:
  test: ["CMD", "curl", "-fsS", "http://127.0.0.1:3000/health"]
  interval: 30s
  timeout: 5s
  retries: 3
  start_period: 30s
```

Bare `/` on a web UI can return `200` for a login page, a redirect, or a client-rendered shell even when the
app's own backend is unhealthy — it is not a reliable liveness signal. `/health` is the app's purpose-built
liveness endpoint per upstream docs and is the correct target for both the compose-level `healthcheck:` block and
`scripts/ops/openhands/health-check.sh`.

## 5. Concurrency: `MAX_CONCURRENT_CONVERSATIONS=1`

The v1 hard ceiling of **one** task sandbox at a time (already stated in
`docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` § 3 as operator policy) is additionally encoded as an explicit
app-level environment variable, `MAX_CONCURRENT_CONVERSATIONS=1`, in the control-plane container's config —
turning a documented policy into an app-enforced setting where the upstream app supports it, rather than relying
solely on operator discipline. This does not change the § 4 residual-risk gap (the per-sandbox limit gap exists
independently of concurrency), but it does bound how many times that gap's worst case can occur simultaneously.

## 6. Alternatives considered (this round)

| Alternative | Why considered | Why rejected / not selected for Phase 1 |
|---|---|---|
| **Mount the primary host socket, accept the risk (original Phase 1 posture).** | Simplest to implement; matches upstream's default documented deployment. | Superseded by this follow-up — a compromise on the primary socket reaches every other box workload (Kuma, ERPNext, future tools), which is a materially larger blast radius than this package's own threat model was willing to accept once a narrower option (a dedicated daemon) was confirmed practical. |
| **Docker socket proxy (e.g. `linuxserver/socket-proxy` or `tecnativa/docker-socket-proxy`) in front of the primary socket.** | Narrows the *API surface* (e.g. allow `POST /containers/create` and `start`/`stop`, deny `SWARM`/`PLUGIN`/`SECRETS` endpoints) without a second daemon. | **Rejected for an initial carve-out.** Two independent reasons: (1) Even a well-configured proxy still fronts the **primary** daemon — a proxy misconfiguration, a proxy compromise, or an overly-permissive allow-list still exposes every other box workload that shares that primary daemon; a proxy narrows *what* can be asked, not *which* daemon (and therefore *which* other containers) is being asked. (2) Even in isolation, `ContainerCreate` — an endpoint OpenHands unavoidably needs (§ 2.3) — accepts a request body that can specify arbitrary `HostConfig.Binds` / `Mounts`. None of the proxy tools evaluated ship a default ACL that can allow "create a container" while disallowing "bind-mount `/`"; the proxy narrows *endpoints*, not *what those endpoints are asked to do*. So a proxy cannot, by itself, safely allow Create without also allowing an arbitrary host bind-mount. The dedicated-daemon design achieves a strictly stronger property regardless of either limitation: even a **fully** compromised OpenHands control plane cannot reach Kuma's or ERPNext's containers, because there is no daemon-level path between them at all. A socket proxy remains a reasonable **defense-in-depth addition on top of** the dedicated daemon in a future round (narrowing the dedicated daemon's own API surface further), but it is not, by itself, a substitute for daemon-level isolation. |
| **Dedicated rootless Docker daemon (selected).** | Structurally separates OpenHands' Docker blast radius from every other box workload; rootless mode additionally removes host-root execution for the daemon process itself. | **Selected.** See § 2. Does not eliminate Docker-socket risk in an absolute sense (§ 2.2), but bounds it to a daemon with exactly one tenant, one data root, and one systemd-slice resource ceiling. |
| **A fully separate VM for OpenHands (isolate at the hypervisor level, not just the daemon level).** | Cleanest possible isolation — a compromise of OpenHands could not threaten the box at all, not even the dedicated daemon's own data root on shared disk. | Not selected for Phase 1 — same reasoning as the original ADR's "dedicated VM" alternative (`docs/decisions/20260804-openhands-on-exec01.md` § 8): costs another paid host; Phase 1 budget assumption is "use the server we already provisioned." The dedicated-daemon design is judged sufficient narrowing for this phase; a dedicated VM remains available as a future escalation if the dedicated-daemon boundary is ever judged inadequate in practice. |
| **Native OpenHands "no sandbox" mode (if one exists upstream).** | Would eliminate the Docker-socket requirement entirely. | Not confirmed as a supported, maintained mode in the pinned `1.8` release per the same 2026-08-04 docs research the original ADR recorded — unchanged by this follow-up. Still an open upstream question, not resolved here. |

## 7. Enforcement — scripts, not just documentation

Unlike a purely aspirational design note, the package-side commits in this PR (#747) implement the enforcement
mechanism described here directly in `scripts/ops/openhands/lib/common.sh`:

- **`openhands_assert_isolation_context()`** — fails closed (`die`) unless both `OPENHANDS_DOCKER_SOCK` and
  `OPENHANDS_DOCKER_HOST` are set and neither resolves, by path/string, to the forbidden primary socket
  (`/var/run/docker.sock`) or its data-root (`/var/lib/docker`). This is a cheap, static, string-level check run
  on every invocation — not a substitute for the live check below.
- **`openhands_docker()`** — the required wrapper every script in this package must call instead of invoking
  `docker`/`docker compose` directly; it calls the assertion above and then forces `DOCKER_HOST` to the
  dedicated socket for that one command only.
- **`scripts/ops/openhands/verify-dedicated-daemon.sh`** — the **live** verification (a real `docker info`
  `DockerRootDir` check against a running dedicated daemon), required before `install.sh --install` proceeds,
  per `ops/openhands/daemon/README.md` § "Install is gated."
- **`scripts/ops/openhands/verify-sandbox-boundary.sh`** — additionally fails closed if the compose config or a
  spawned sandbox shows a mount resolving to the primary socket, not just `privileged: true` / host networking
  as it already checked before this follow-up.
- **`scripts/ops/openhands/collect-sanitized-evidence.sh`** — captures the dedicated daemon's own `docker
  version` / `docker system df` output as install evidence, via the same wrapper, never against the primary
  daemon.

See `ops/openhands/daemon/README.md` for the full package-side file map (`daemon.json.example`,
`dockerd-rootless.service.example`) and `scripts/ops/systemd/corpflowai-openhands-dockerd.service` /
`scripts/ops/systemd/corpflowai-openhands.slice` for the reviewed-but-inactive systemd units. This doc is the
narrative/decision record for Anton's review; those files are the literal implementation.

## 8. What this doc does NOT do

- It does not authorize installation. Nothing changes about the ADR/authorization-packet gate — see
  `docs/decisions/20260804-openhands-on-exec01.md` (status: PROPOSED) and
  `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` (status: AWAITING_APPROVAL / carve-out condition
  updated by this PR).
- It does not claim the per-sandbox resource-limit gap (§ 2.2) is solved. It is disclosed and requires Anton's
  explicit, separate acceptance as a named carve-out condition.
- It does not claim a socket proxy is worthless — only that it is **insufficient on its own**, and not selected
  as the Phase 1 boundary. A future packet may add one **in addition to** the dedicated daemon.
- It does not change the capacity-contradiction resolution rule: the live output of
  `scripts/ops/openhands/inspect-host-capacity.sh` remains the sole install-time capacity source of truth, per
  `docs/operations/OPENHANDS_ARCHITECTURE.md` § 5.1 and `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` § 2 —
  unaffected by this Docker-isolation change.

## 9. Change log

- **2026-08-05** — Cgroup placement remediation (#743 / #747): daemon-level
  `cgroup-parent=corpflowai-openhands-containers.slice` + `native.cgroupdriver=systemd`;
  aggregate ceiling reduced to host-safe `MemoryMax=4G` / `CPUQuota=200%` after live
  capacity inspect on `corpflow-exec-01-u69678`; `verify-cgroup-placement.sh` added
  (fails closed on unrestricted `user.slice` docker scopes). OpenHands app still not installed.
- **2026-08-04** — Initial isolation design doc authored for the #747 Docker-isolation security follow-up to
  #743. Supersedes the "mount the primary socket, accept the risk" posture in the original Phase 1 package.
  No installation. No carve-out granted by this doc. Residual per-sandbox resource-limit gap disclosed, not
  solved — requires Anton's explicit acceptance per `OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` § 1.1a.
