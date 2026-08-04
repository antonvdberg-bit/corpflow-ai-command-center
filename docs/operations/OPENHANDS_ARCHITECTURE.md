# OpenHands architecture (Phase 1 — target design, not yet installed)

**Status:** DRAFT — describes the **target flow** for a future, separately authorized install. Nothing in this
doc is live. OpenHands is **not installed** on `corpflow-exec-01-u69678` or anywhere else as of 2026-08-04.
**Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743)
**Parent:** [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661) — Active agent delivery control loop (Cursor, Codex, GitHub, n8n).
**Coordination:** [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) — Operator Bridge.

**Companion docs:**

- `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` — the dedicated-rootless-daemon design that § 2 below's flow
  diagram now assumes (2026-08-04, PR #747 Docker-isolation follow-up to #743).
- `docs/operations/OPENHANDS_OPERATING_CHARTER.md` — permanent operating model, work routing, protected actions.
- `docs/operations/OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md` — phased rollout (Phase 0–5) and Anton gates.
- `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` — the operator install steps this architecture describes.
- `docs/operations/OPENHANDS_SECURITY_MODEL.md` — threat model for the flow described here.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — L1/L2/L3 execution layers; § 5.5 carve-out mechanism this package would use.
- `ops/openhands/README.md` — the reviewed-but-inactive deployment package this doc describes at a component level.
- `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` — the DRAFT authorization gate for turning this design into a live install.

---

## 1. What this doc is for

This is the **component-level target architecture** for OpenHands as a private, server-hosted worker under the
existing CorpFlowAI dispatcher and control-loop model (#661). It answers "what would exist and how would the
bytes flow" **if** the authorization packet (#743's install gate) is approved. It does not itself authorize
anything — see § 6.

## 2. Target flow

```
GitHub work packet (issue, labeled + scoped per the Charter's work-packet contract)
        │
        ▼
Dispatcher / control loop (#661 — GitHub Actions + existing Cursor/Codex activation logic;
        NOT a new app — OpenHands is an additional worker adapter, same pattern as
        the existing Cursor/Codex adapters)
        │
        ▼  (packet assigned to OpenHands when it fits the Charter's "OpenHands should
        │   normally own" list and no collision with an active Cursor/Codex claim)
        ▼
OpenHands control plane (corpflowai-openhands-app container,
        loopback-bound 127.0.0.1:3000, private SSH-tunnel access only)
        │
        ▼  (control plane spawns one task sandbox via a DEDICATED, ROOTLESS Docker
        │   daemon — socket $HOME/corpflowai-openhands/docker/docker.sock, data root
        │   $HOME/corpflowai-openhands/docker-data — NEVER the box's primary
        │   /var/run/docker.sock. See docs/operations/OPENHANDS_DOCKER_ISOLATION.md.
        │   A systemd user slice, corpflowai-openhands.slice (MemoryMax=8G,
        │   CPUQuota=300%), bounds this daemon and everything it spawns — the
        │   total ceiling for control plane + one concurrent sandbox.)
        ▼
Task sandbox (ghcr.io/openhands/agent-server:1.26.0-python,
        ephemeral per task, disposable, holds the working tree for one packet only,
        spawned on the dedicated daemon — isolated from Uptime Kuma / ERPNext /
        any other box workload, which stay on the box's separate primary daemon)
        │
        ▼
Branch (openhands/<packet-id>-<short-slug>) + commits, scoped to the packet's allowed files
        │
        ▼
Draft pull request against `main` (never a direct push to `main`, never auto-merge)
        │
        ▼
CI (existing GitHub Actions checks — test.yml, vercel-env-check, CMP gates — unchanged,
        run the same way regardless of which worker opened the PR)
        │
        ▼
Review — Anton (or Cursor, for a specialist escalation) reviews the draft PR like any
        other PR. Merge remains a human/Anton action per the Charter's protected-action list.
```

**Every box in this flow already exists except the two OpenHands-specific boxes** (control plane + task
sandbox). The dispatcher, GitHub, CI, and review steps are the same infrastructure #661 already uses for Cursor
and Codex. OpenHands is designed to be a **third worker adapter**, not a parallel system.

**Isolation summary (2026-08-04, #747):** the control plane and its sandboxes run entirely inside a **dedicated
Docker daemon** that exists only for OpenHands — structurally separate from the box's primary Docker daemon that
Uptime Kuma and (if installed) ERPNext use. A compromise anywhere in the control-plane-to-sandbox path can reach
only the dedicated daemon's own containers/images/volumes; it has no daemon-level path to any other box
workload. This narrows, but does not eliminate, the Docker-socket risk inherent to spawning sandbox containers
at all — see `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` for the full design and its disclosed residual
risk (no native per-sandbox memory/CPU cap in the OSS `1.8` Docker path; the systemd slice's 8 GiB / 300% ceiling
is a **total**, not per-sandbox, limit).

## 3. What we deliberately do NOT create

Per the Charter's "not a client-facing product" framing and per #743's protected-boundary list, this package
does **not** introduce:

- **A second production application.** OpenHands' own UI (port 3000) is an internal operator/agent console, not
  a CorpFlowAI product surface. It is never mapped to a public hostname.
- **A second database.** OpenHands' own state (conversation history, task metadata) lives in its own container
  volumes (`corpflowai-openhands-state`, `corpflowai-openhands-workspace`) on the box. It never connects to
  `POSTGRES_URL` or any CorpFlowAI production database — see `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 4.
- **A second queue or dispatcher.** Work packets remain GitHub issues/branches/PRs — the same durable source of
  truth #661 already committed to. OpenHands does not get its own ticket system, its own webhook intake, or its
  own priority queue independent of GitHub.
- **A parallel CI or review path.** PRs opened by OpenHands go through the exact same CI workflows and the exact
  same Anton review gate as any other PR.

If a future proposal for OpenHands ever includes any of the four items above, treat it as **out of scope for
Phase 1** and require a fresh, separately-approved packet — the same "sameness is not authorization" discipline
`SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 applies to Uptime Kuma.

## 4. Private access model

- **No public exposure ever.** The control-plane UI binds `127.0.0.1:3000` only (`ops/openhands/compose.yaml`).
  There is no DNS record, no reverse proxy, no `0.0.0.0` bind, at any phase.
- **Operator UI access via SSH local-port-forward** — the same pattern already proven for Uptime Kuma
  (`ssh -L 3001:localhost:3001 …`) and scaffolded for Beszel (`ssh -L 8090:127.0.0.1:8090 …`):

  ```bash
  ssh -L 3000:127.0.0.1:3000 anton@<EXEC01_SSH_HOST>
  # then open http://127.0.0.1:3000 in a local browser
  ```

- **GitHub access is scoped, not broad.** The control plane authenticates to GitHub with a least-privilege
  credential (fine-grained PAT or, preferred, a GitHub App — see `docs/operations/OPENHANDS_SECURITY_MODEL.md`
  § 5), limited to `antonvdberg-bit/corpflow-ai-command-center`, with no admin scope and no merge-to-`main`
  capability.
- **LLM provider access is outbound-only.** The control plane calls out to an external LLM API (or, in a future
  evaluated path, a ChatGPT subscription-based Codex login — see
  `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md`). Nothing inbound reaches the box because of this egress;
  `ops/openhands/compose.yaml`'s network is `internal: false` specifically to allow this one outbound path, not
  to open any inbound listener. **(2026-08-04, #747)** the compose file's `host.docker.internal` mapping is
  removed — there is no approved need for the control plane to reach a host-loopback-bound service; the
  external LLM API call is a normal internet-egress path, not a host-loopback path. See
  `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` § 3 for the removal rationale.

## 5. Resource envelope (as documented in the reviewed package)

Per `ops/openhands/compose.yaml` and `ops/openhands/VERSIONS.md` (operator policy, not upstream-enforced in the
pinned app version `1.8`):

| Component | CPU | RAM | Notes |
|---|---|---|---|
| Control plane (`corpflowai-openhands-app`) | `1.0` (compose `cpus:` limit) | `2 GiB` (compose `mem_limit:`) | Enforced by the compose file today. |
| One task sandbox (guidance) | `2 CPU` | `4 GiB` typical, **6 GiB hard max** | **Not enforced by upstream `1.8`'s Docker self-host path** (Enterprise's Kubernetes runtime has a `MEMORY_LIMIT` equivalent; the Docker path does not) — documented as operator policy, not upstream-enforced. Disclosed residual gap, not solved in this round — see `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` § 2.2; requires Anton's explicit acceptance per `OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` § 1.1a. |
| Concurrency | **1 task sandbox at a time** (`MAX_CONCURRENT_CONVERSATIONS=1`, app-enforced env var) | — | Deliberate v1 ceiling — see `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` § 3. |
| Systemd ceiling (2026-08-04, #747) | `CPUQuota=300%` | `MemoryMax=8G` | Enforced by the `corpflowai-openhands.slice` systemd **user** slice wrapping the dedicated Docker daemon — a **total** ceiling for control plane + every concurrently-running sandbox, not a per-sandbox cap (see the row above). |
| **Total ceiling (v1)** | ~3 CPU | **~8 GiB** | Control plane + one concurrent sandbox. Because there is no per-sandbox cap, a single misbehaving sandbox can in the worst case consume up to this entire total before the slice intervenes. |

### 5.1 Capacity contradiction — record, do not resolve here

Three different capacity claims exist for `corpflow-exec-01-u69678` and **must not be silently reconciled**:

| Source | Claim | Status |
|---|---|---|
| `docs/operations/MONITORING_ARCHITECTURE.md` § 11.3 (authored 2026-05-27) | `2 vCPU / 2 GB RAM / 38 GB disk / 2 GB swap` | **Historical / stale.** Predates the 2026-05-31 resize (`JE-2026-05-31-2`). Left unedited by this packet — see `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.1 note acknowledging the same drift as a separate known follow-up. |
| `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.1 (post-resize) | `4 vCPU / 7,751 MiB RAM / 150 GB disk / 2 GB swap` | **Authoritative post-resize** — tied to `JE-2026-05-31-2`, an actual recorded resize event. |
| Anton's Beszel-style observation (informal, 2026-08 — not from an installed/authorized monitoring tool; Beszel itself is docs/scaffold-only per `docs/operations/BESZEL_SERVER_UTILISATION_PILOT.md`) | ~6 CPU, ~25.7 GiB RAM, ~17–18 GiB headroom | **Observational, NOT live-verified by this packet.** Higher than even the authoritative post-resize figure — either a further undocumented resize happened, or the observation source/method needs clarification. |

**This packet does not overwrite the historical row and does not treat the Beszel observation as ground truth.**
Per the install runbook (`docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` § 2), `scripts/ops/openhands/inspect-host-capacity.sh`
(already in the reviewed package, read-only) **must** be run on the actual host before any install decision, and
its output — not this table — is the tie-breaker. If the live figure differs materially from all three rows
above, that is itself evidence worth a JOURNAL row before proceeding.

## 6. What this doc does NOT do

- It does not authorize installation. See `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` (status:
  PENDING ANTON APPROVAL) and `docs/decisions/20260804-openhands-on-exec01.md` (ADR, status: PROPOSED).
- It does not grant a § 5.5 carve-out. `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 today names
  **Uptime Kuma alone**; this doc's flow becomes real only after a second, equally narrow, named carve-out is
  merged for OpenHands specifically.
- It does not change the #661 dispatcher's actual code. The "dispatcher" box in § 2 is descriptive of where a
  future OpenHands adapter would slot in, not a statement that the adapter exists yet.

## 7. Relationship to #661 and #249

- **#661** (parent) owns the overall multi-worker control-loop objective: keep independent work packets moving
  across Cursor, Codex, **and, if approved, OpenHands**, with GitHub as the source of truth. This doc's flow
  (§ 2) is the OpenHands-specific slice of that objective — it does not replace or duplicate #661's dispatcher,
  Postgres, or GitHub-as-source-of-truth decisions.
- **#249** (Operator Bridge) remains the coordination surface for STATUS updates, `HOST_MISMATCH` reporting (per
  `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 7), and Anton approval requests tied to this package —
  including the authorization packet in § 6 above.
- OpenHands, once (if ever) installed, is expected to be a **worker**, not a **decision-maker** — the Charter's
  operating model (Anton decides, ChatGPT orchestrates, OpenHands executes routine work, Cursor handles
  specialist work) is unchanged by this architecture doc.

## 8. Change log

- **2026-08-04** — Initial architecture doc authored alongside the Phase 1 documentation set for #743. No
  installation. No carve-out. No live verification possible (nothing is live).
- **2026-08-04 (PR #747, Docker isolation follow-up)** — § 2's flow diagram and prose updated to describe the
  **dedicated rootless Docker daemon** (supersedes an implicit primary-socket assumption); § 4 notes
  `host.docker.internal` removal; § 5's resource table adds the systemd-slice ceiling and the disclosed
  per-sandbox resource-limit gap. See `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` for the authoritative
  design. No installation. No carve-out. No live verification possible (nothing is live).
