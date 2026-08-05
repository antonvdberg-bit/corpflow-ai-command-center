# OpenHands security model (Phase 1 package)

**Status:** DRAFT threat model for a **not-yet-installed** package. Describes the accepted risks, mitigations,
and least-privilege design this package uses **if** it is ever authorized and installed. No installation has
occurred. **Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743)
· **Docker isolation follow-up:** [#747](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/747)
— § 3 below reflects the **dedicated rootless Docker daemon** design that supersedes this doc's original
"mount the primary host socket, accept the risk" posture. Read § 3 together with
`docs/operations/OPENHANDS_DOCKER_ISOLATION.md`, the authoritative design doc for that change.

**Companion docs:**

- `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` — the authoritative Docker-isolation design (dedicated
  rootless daemon, socket path, systemd slice, residual risks) that § 3 below summarizes.
- `docs/operations/OPENHANDS_ARCHITECTURE.md` — the flow this model protects.
- `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` — where each control below is verified at install time.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — the box's general L3 boundary; § 5.5 is
  the carve-out mechanism this package would use.
- `docs/decisions/20260615-uptime-kuma-on-exec01.md` § 4 — the threat-model format this doc mirrors.
- `ops/openhands/compose.yaml` — the file every control below is implemented in.

---

## 1. Purpose

State the **honest blast radius** of running OpenHands' control plane on `corpflow-exec-01-u69678`, so Anton's
approval (ADR + authorization packet) is an informed one — not a rubber stamp on an unreviewed Docker socket
mount. This doc does not soften the Docker-socket risk; it names it plainly and describes what is, and is not,
mitigated.

## 2. Private bind

| Control | Detail |
|---|---|
| Publish rule | `ports: ["127.0.0.1:3000:3000"]` in `ops/openhands/compose.yaml` — loopback only, never `0.0.0.0` or a bare port. |
| UI access | SSH local-port-forward only (`ssh -L 3000:127.0.0.1:3000 …`) — same pattern as Uptime Kuma (`:3001`) and the Beszel pilot design (`:8090`). |
| Verification | `scripts/ops/openhands/verify-private-bind.sh` (fails closed if the app would be reachable on a non-loopback address); off-box `curl` timeout check at install runbook § 9. |
| DNS / reverse proxy | Forbidden in v1. No hostname is ever mapped to this service. |

## 3. Docker-socket risk — honest blast radius (dedicated rootless daemon design)

**Superseded posture (2026-08-04, PR #747):** the original Phase 1 package mounted the box's **primary**
`/var/run/docker.sock` read-write into the control-plane container and named that as an accepted risk. That
design is **no longer the authoritative design** — see
`docs/operations/OPENHANDS_DOCKER_ISOLATION.md` for the full rationale. This section states the current design
and its honest residual risk; it does not restate the superseded design as a live option.

**Current design:** OpenHands' control plane spawns one sandbox container per task via a Docker daemon — this is
an upstream architectural requirement of OpenHands `1.8`, not a misconfiguration in this package, and it is
**not optional** if sandboxed task execution is wanted at all. What changed is **which** daemon:

- The control plane talks to a **dedicated, rootless Docker daemon** — socket
  `$HOME/corpflowai-openhands/docker/docker.sock`, data root `$HOME/corpflowai-openhands/docker-data` — that
  exists **only** for OpenHands. It is not the box's primary daemon, and no other box workload (Uptime Kuma,
  ERPNext, Beszel, etc.) shares it.
- **The primary host Docker socket (`/var/run/docker.sock`) is FORBIDDEN in active config.** No compose file,
  script, or runbook step in this package may mount, reference, or fall back to the primary socket. Every
  command sets `DOCKER_HOST=unix://$HOME/corpflowai-openhands/docker/docker.sock` explicitly — there is no
  ambient-default-daemon path.
- A systemd **user** slice, `corpflowai-openhands.slice` (`MemoryMax=4G`, `CPUQuota=200%`), bounds the dedicated
  daemon and everything it runs — the **total** ceiling for the control plane plus one concurrent sandbox.

**What this actually means, stated without euphemism:**

- Any process with access to a Docker socket can ask *that* daemon to do essentially anything the daemon itself
  can do — including starting a new, unrelated **privileged** container, bind-mounting host paths the daemon
  process can see, or reading/writing any volume the daemon can see. This equivalence (**Docker-socket access is
  daemon-root-equivalent access**) is unchanged by moving to a dedicated daemon — what changes is *which*
  daemon, and therefore *which* other containers, is reachable.
- **What IS newly mitigated by the dedicated-daemon design:** a compromised OpenHands control-plane process (via
  a supply-chain issue in the pinned image, or a prompt-injection-driven abuse of its own tool-calling that
  reaches the Docker API) can, at most, reach the **dedicated** daemon's own containers/images/volumes. It has
  **no** path to Uptime Kuma's container, ERPNext's sandbox/production-shell containers, or any other box
  workload, because those live on the box's separate primary daemon, which the dedicated daemon has no
  connection to. Rootless mode further means the dedicated daemon itself is not running as Linux `root`,
  narrowing what even a fully successful daemon-API abuse can reach on the host filesystem outside the daemon's
  own rootless user-namespace mapping.
- **What is NOT mitigated — residual risk, disclosed, not solved:**
  - Within the dedicated daemon's own scope, Docker-socket access remains daemon-root-equivalent. This design
    narrows the blast radius to "OpenHands' own dedicated daemon," not to zero.
  - **No per-sandbox 4 GiB `HostConfig` limit is natively available in the OSS OpenHands `1.8` Docker self-host
    path** (OpenHands Enterprise's Kubernetes runtime has a `MEMORY_LIMIT` equivalent; the Docker path in `1.8`
    does not). With concurrency capped at 1 (`MAX_CONCURRENT_CONVERSATIONS=1`), a single misbehaving sandbox can
    in the worst case consume up to the **entire** 4 GiB / 200% slice ceiling before the slice itself intervenes
    — there is no smaller per-task cap inside that ceiling. This gap must be **explicitly accepted by Anton** as
    a named carve-out condition (`OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` § 1.1a); the carve-out stays
    blocked otherwise. See `OPENHANDS_DOCKER_ISOLATION.md` § 2.2 for the full statement.
  - `cap_drop: [ALL]` and similar Linux-capability hardening **inside** the OpenHands control-plane container
    still do not meaningfully reduce the residual within-daemon risk, for the same reason as before: the attack
    path is "ask the daemon to do it," not "do it directly from inside this container's own namespace."
  - The box's ERPNext sandbox/production-shell state, restic backup jobs, and the repo clone remain reachable
    **only** via the primary daemon, which this design keeps entirely out of OpenHands' reach — but a full
    compromise of the dedicated daemon's host-side process still runs on the same physical/VM host as those
    workloads, so host-level (not daemon-level) compromise scenarios are not addressed by this design alone.
- **What IS mitigated (unchanged from before, still true):**
  - `no-new-privileges:true` is applied (prevents this specific container from gaining new privileges via
    `setuid`/`setgid` binaries even though it doesn't fully close the socket-mount path).
  - The container never runs `privileged: true` itself.
  - The box holds **zero** CorpFlowAI production secrets (§ 4) — so even full compromise of the dedicated
    daemon does not, on its own, hand over `POSTGRES_URL`, `MASTER_ADMIN_KEY`, or any Vercel/GitHub-Actions-level
    credential (those live only in Vercel/GitHub's own encrypted stores, per
    `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 4).
  - The GitHub credential OpenHands holds is itself least-privilege (§ 5) — full compromise yields, at worst,
    that scoped credential, not an organization-wide token.
- **Socket proxy — evaluated and rejected as the primary control for this round:** a docker-socket-proxy (e.g.
  `linuxserver/socket-proxy`) narrows the *API surface* a caller can use, but still fronts a single daemon; if
  that daemon is the primary one, a proxy misconfiguration or compromise still exposes every other box workload.
  A socket proxy remains a reasonable **defense-in-depth addition on top of** the dedicated daemon in a future
  round, narrowing the dedicated daemon's own API surface further — but it is not, by itself, a substitute for
  daemon-level isolation, and is not the Phase 1 boundary. See `OPENHANDS_DOCKER_ISOLATION.md` § 6 for the full
  comparison.

**Bottom line for Anton's approval decision:** approving this package means accepting that the OpenHands control
plane is, in practice, as trusted as root **within its own dedicated Docker daemon** on `corpflow-exec-01-u69678`
— not, as in the original design, as trusted as root on the whole box's primary daemon. The mitigations above
bound the *consequences* of that trust further than before (no production secrets on the box, least-privilege
GitHub credential, loopback-only network exposure, structural separation from every other box workload) — they
do not eliminate the *fact* of daemon-scoped trust, and they do not close the per-sandbox resource-limit gap
above. Both residual items require Anton's explicit, informed acceptance, not a rubber stamp.

## 4. No production Postgres, no privileged mode, no host networking for the app

| Control | Detail |
|---|---|
| No `privileged: true` | Never set on the OpenHands app service, at any phase. |
| No host networking for the app | `networks: [corpflowai-openhands-net]` — a dedicated bridge network, not `network_mode: host`. (Contrast: the Beszel *agent* pilot design uses host networking for accurate host metrics — a different tool, a different tradeoff, not reused here.) |
| No `POSTGRES_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING` | Never present in `ops/openhands/.env.example` or any real `.env` derived from it. Checked by `scripts/ops/openhands/verify-no-production-access.sh`. |
| No `MASTER_ADMIN_KEY`, `VERCEL_TOKEN`, `CORPFLOW_AUTOMATION_INGEST_SECRET`, `CORPFLOW_AUTOMATION_FORWARD_SECRET`, `CORPFLOW_CRON_SECRET` / `CRON_SECRET` | Explicitly listed as forbidden in `ops/openhands/.env.example`'s "Explicit exclusions" section; same negative-check script. |
| No tenant data | OpenHands never receives a DB export, a content snapshot, or tenant secrets — its only inputs are the GitHub repo (public code + issues) and the operator's own prompts. |

## 5. Mount exclusions

| Mount | Rule |
|---|---|
| `$HOME/corpflowai-openhands/docker/docker.sock` (dedicated daemon's host-side socket, bind-mounted at the container-internal path `/run/openhands-docker/docker.sock` — deliberately **not** `/var/run/docker.sock`, so no log line or tool output inside the container can be misread as "this is the primary daemon"; configurable via `OPENHANDS_DOCKER_SOCK_IN_CONTAINER`) | Documented residual risk (§ 3) — required by upstream, narrowed to a dedicated daemon (§ 3, `OPENHANDS_DOCKER_ISOLATION.md`), not eliminated. |
| Primary host `/var/run/docker.sock` | **Forbidden.** Never mounted, never referenced, never a fallback for any script or compose file in this package. |
| `corpflowai-openhands-state` (named volume) | Persistent app state only (conversation history, config cache). Never a bind mount of the operator's real home directory. |
| `corpflowai-openhands-workspace` (named volume) | Task working tree only. Never `/` or `/home`. If a bind mount is substituted at install time, it must point at a dedicated, empty directory created for this purpose — never at an existing project checkout. |
| Everything else | No other host path is mounted into the control plane. Sandbox containers spawned by the control plane inherit their own scoped workspace, not the control plane's mounts. |

## 6. Sandbox separation

- Each task runs in its **own** ephemeral sandbox container (`ghcr.io/openhands/agent-server:1.26.0-python`),
  spawned per-task and disposable — not a long-lived shared container that accumulates state across unrelated
  packets.
- Concurrency is capped at **1** sandbox at a time in v1 (`docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` § 3) —
  deliberately, to bound both resource use and blast radius while the pattern is unproven.
- `scripts/ops/openhands/verify-sandbox-boundary.sh` fails closed if a spawned sandbox (or the base compose
  config) uses `privileged: true`, host networking, or a mount broader than the named workspace volume.
- Sandbox resource limits (2 CPU / 4 GiB typical, 6 GiB hard max per `OPENHANDS_ARCHITECTURE.md` § 5) are
  **operator policy today, not upstream-enforced** in app `1.8` — a real gap, tracked as a required item before
  any Phase 2+ expansion beyond one concurrent sandbox.

## 7. GitHub least-privilege — fine-grained PAT vs GitHub App

| Dimension | Fine-grained PAT | GitHub App (recommended) |
|---|---|---|
| Scope | Per-repo, per-permission — good | Per-repo (installation-scoped), per-permission — good |
| Revocation | Operator revokes the PAT in GitHub settings; OpenHands loses access instantly | Operator uninstalls the App from the repo, or the App's private key is rotated; access revoked instantly |
| Identity in PR/commit history | Commits/PRs show as the PAT owner's personal account (Anton) unless a machine user is created | Commits/PRs show as the App's own bot identity — clearer audit trail, distinguishes OpenHands-authored PRs from Anton's own commits at a glance |
| Expiry discipline | Fine-grained PATs support expiry dates — good, but easy to silently renew without re-review | App installation has no forced expiry, but permissions are reviewed as a discrete "installation" event, which tends to force periodic re-review anyway |
| Blast radius if leaked | Whatever scopes were granted, tied to a token string that must be handled as carefully as a password | Private key + installation ID; same handling care, but GitHub's App model is designed for exactly this "third-party automation" use case |
| **Recommendation** | Acceptable fallback if a GitHub App is not practical to set up quickly | **Preferred** — cleaner audit identity, purpose-built for automation, easier to scope precisely |

### 7.1 Recommended GitHub App permissions (least-privilege)

| Permission | Level | Why |
|---|---|---|
| Contents | **Write** | Needed to create branches and commits on `openhands/*` branches. |
| Issues | **Read** | Needed to read the work packets it is dispatched. Never write — OpenHands does not post issue comments beyond what a draft PR itself carries. |
| Pull requests | **Write** | Needed to open **draft** PRs and push follow-up commits in response to review feedback. |
| Administration | **None** | Never granted. No repo-settings changes, no branch-protection changes, no collaborator changes. |
| Secrets | **None** | The App never reads GitHub Actions secrets or repository secrets — it has no reason to, and no permission grants it that access in GitHub's App model. |
| Merge to `main` | **Not applicable / not used** | Branch protection on `main` (already in place for this repo) continues to require human review + merge. The App's `pull_requests: write` scope allows opening/updating PRs, not merging protected branches — and this package's own scripts/runbooks additionally never invoke a merge action. |

Scope the App installation to **only** `antonvdberg-bit/corpflow-ai-command-center` — never "all repositories."

## 8. Revocation and rotation (no secret values)

| Credential | Rotation trigger | Steps (no values recorded anywhere) |
|---|---|---|
| GitHub App private key / fine-grained PAT | Suspected leak, routine quarterly review, or package uninstall | Operator regenerates/revokes via GitHub Settings → Developer settings (App) or → Personal access tokens (PAT); updates `$HOME/corpflowai-openhands/.env` on the box directly; restarts the container (`docker compose -p corpflowai-openhands restart`). No repo change needed — the token name, never the value, is the only thing that ever appears in `ops/openhands/.env.example`. |
| LLM API key | Suspected leak, provider-side rotation policy, or switching providers | Operator generates a new key at the provider console; updates `.env` on the box; restarts the container. If switching providers entirely, also update `LLM_BASE_URL` / `LLM_MODEL` per `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md`. |
| ChatGPT subscription login (if that path is ever used instead of an API key) | Password rotation, session revocation from the ChatGPT account's own security settings | Operator re-authenticates via the app's login flow; no token is stored in this repo either way. |
| Telegram bot token (if `OPENHANDS_ALERTS_ENABLED=1` is ever set) | Suspected leak or routine rotation | Rotate via Telegram BotFather; update `.env` on the box; no repo change. **Must be a dedicated bot, never the in-repo `TELEGRAM_BOT_TOKEN`** — same failure-domain-isolation rule Uptime Kuma follows. |
| Anything found in `ops/openhands/.env.example`'s "Explicit exclusions" list | N/A — these must never be set in the first place | If one is ever found present, treat as a security incident per `docs/runbooks/SECURITY_OR_INCIDENT.md`, not a routine rotation. |

## 9. Explicit non-generalization

This threat model is written for **OpenHands alone**. It does not authorize, imply, or generalize to any other
self-hosted tool. Per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5's own rule: *"if you are about to
write 'this is similar to the Kuma exception, so we can also …', stop."* The same applies here in reverse — this
OpenHands review does not make a future tool's Docker-socket mount easier to approve by precedent; each tool
gets its own ADR, its own threat model, its own packet.

## 10. Change log

- **2026-08-04** — Initial security model authored alongside the Phase 1 documentation set for #743. No
  installation. No carve-out granted by this doc.
- **2026-08-04 (PR #747, Docker isolation follow-up)** — § 3 rewritten around the **dedicated rootless Docker
  daemon** design (supersedes "mount the primary host socket, accept the risk"); § 5 updated to name the
  dedicated socket path and explicitly forbid the primary socket. New residual risk disclosed and not solved:
  no native per-sandbox 4 GiB `HostConfig` limit in the OSS `1.8` Docker path — total ceiling enforced only by
  the `corpflowai-openhands.slice` systemd slice (`MemoryMax=4G`, `CPUQuota=200%`). Socket-proxy alternative
  evaluated and rejected as insufficient on its own. See `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` for the
  full design. No installation. No carve-out granted by this doc.
