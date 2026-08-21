# Temporal host feasibility evidence (#1025)

**Status:** `STOP — EXISTING SERVER CAPACITY NOT PROVEN`  
**Date:** 2026-08-21  
**Owner:** Cursor Factory (inspection + evidence); Anton (L3 preflight or sibling-VM decision)  
**Source issue:** [#1025](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1025)  
**Environment:** `n/a` (ops-host inspection; no CorpFlowAI tenant URL and no `client_production` target)  
**Anchor:** `<!-- TEMPORAL_HOST_FEASIBILITY_EVIDENCE_1025 -->`

<!-- TEMPORAL_HOST_FEASIBILITY_EVIDENCE_1025 -->

> **This packet does not install Temporal.**  
> Anton authorized a bounded self-hosted POC **only after a measured live preflight proves safe headroom**. This Cursor Cloud worker could not inspect `corpflow-exec-01-u69678`. The mandatory stop gate therefore fires.

## 1. What this packet is

- Live attempt from Cursor Factory Automation to inspect `corpflow-exec-01-u69678`.
- Reconstruction of **last-known, dated, stale** host evidence already in GitHub.
- Conservative Temporal resource model for the issue’s 3–5 workstream / 10–20 workflow scenario.
- Option comparison and the cheapest sensible separate VM recommendation.
- A **read-only** operator-paste preflight so Anton can produce the missing live numbers without installing anything.
- A **loopback-only** Docker Compose scaffold that must **not** be started on exec-01 until a live preflight says otherwise.

## 2. What this packet is not

- Not a Temporal install.
- Not a § 5.5 carve-out. Uptime Kuma remains the only authorized extra container on exec-01.
- Not a new dispatcher, queue, Kubernetes, HA, Grafana/Prometheus, or second management platform.
- Not a paid-VM purchase. Recommending a Hetzner CX32 is **not** buying it.
- Not a production Postgres / Neon / CorpFlowAI schema change.
- Not a public Temporal UI/API, DNS, firewall, or reverse-proxy change.
- Not an operating-model rewrite. A future successful POC would still need a separate operating-model decision.

## 3. HOST_MISMATCH — exact missing access path

Cursor Cloud run `bc-c95becc6-3cc5-468d-93dd-ca3389ada0e3` (`https://cursor.com/agents/bc-c95becc6-3cc5-468d-93dd-ca3389ada0e3`) on 2026-08-21T02:13:47Z:

| Check | Result |
|---|---|
| `hostname` | `cursor` (not `corpflow-exec-01-u69678`) |
| `whoami` | `ubuntu` |
| `~/.ssh` | **absent** |
| SSH identity / `SSH_*` env names | **none** |
| `ssh` binary | present at `/usr/bin/ssh` — unusable without a key |
| GitHub Actions SSH-to-exec-01 path used by this worker | **none** |
| Secret values printed | **none** |

Per `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 7 this is `HOST_MISMATCH`.

**Exact missing access path (do not paste credentials into GitHub/chat):**

1. Anton opens his own SSH session: `ssh anton@<exec-01-host>` from his operator terminal (canonical L3 pattern).
2. Anton pastes the read-only block in `docs/runbooks/TEMPORAL_SELF_HOSTED_POC_PREFLIGHT.md` (or runs `bash scripts/ops/temporal/inspect-host-capacity.sh`).
3. Anton returns **non-secret** stdout (CPU/RAM/disk/docker names/ports/load). No `.env`, no DB URLs, no tokens.
4. Only then may a later packet decide Option 2 (exec-01 with limits) vs Option 3 (sibling VM).

Do **not** add an SSH key to Cursor Cloud, GitHub Actions, or this repo to “fix” the gap. That would be a new L2 credential-broadening surface.

## 4. Last-known host snapshot (stale — not a live preflight)

These numbers are **GitHub evidence**, not a 2026-08-21 measurement.

### 4.1 Authoritative post-resize identity (`JE-2026-05-31-2`, 2026-05-31)

- Host/provider: Hetzner / Elestio Ubuntu 24.04, hostname `corpflow-exec-01-u69678`, public IP recorded historically as `5.78.213.185`
- OS/kernel then: Ubuntu 24.04 / `6.8.0-117-generic`
- CPU: **4 vCPU**
- RAM: **7,751 MiB** total; **6,521 MiB available** at that probe
- Swap: **2,047 MiB**, unused at that probe
- Root disk: **150 GB**, **135 GB free** (7% used)
- Docker then: `Docker version 29.5.2`, Compose `v5.1.4`

Source: `docs/decisions/JOURNAL.md` `JE-2026-05-31-2` and `docs/operations/AGENTIC_MEMORY_V1_PROPOSAL.md` § 9 (probe 2026-05-31 22:47 UTC). That probe was **before** the ERPNext sandbox + production-shell stacks were the standing workload.

### 4.2 Known later workloads on the same box (still not live-verified today)

| Workload | Evidence date | Shape | Live CPU/RAM today |
|---|---|---|---|
| ERPNext sandbox (`erpnext-sandbox` / `corpflowai-sandbox.localhost`, host `:8080`) | 2026-06-01 (`JE-2026-06-01-1`) | ~9 Frappe containers | **unknown** |
| ERPNext production shell (`corpflowai-production`, host `:8081`) | 2026-06-05 (`JE-2026-06-05-7`) | 9/9 containers `Up` at that closure | **unknown** |
| Uptime Kuma | 2026-06-16 (`JE-2026-06-16-2`) | 1 container, `127.0.0.1:3001`, image `louislam/uptime-kuma:1.23.13` | **unknown** (expected small) |
| OpenHands | 2026-08-04 | **docs/scaffold only — not installed** | n/a |
| Beszel utilisation | #727 | **docs/scaffold only — not live** | n/a |
| n8n | standing doctrine | **not on exec-01** (separate host) | n/a |
| Production Postgres | standing doctrine | **Neon, external** — must not be Temporal persistence | n/a |

### 4.3 Unresolved capacity contradiction (must not be silently averaged)

From `docs/operations/OPENHANDS_ARCHITECTURE.md` § 5.1:

| Source | Claim | Status |
|---|---|---|
| `MONITORING_ARCHITECTURE.md` § 11.3 | 2 vCPU / 2 GB / 38 GB | Historical / stale (pre-resize) |
| `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.1 | 4 vCPU / 7,751 MiB / 150 GB | Authoritative **post-resize 2026-05-31** |
| Informal 2026-08 observation | ~6 CPU / ~25.7 GiB | **Not live-verified** |

Until `scripts/ops/temporal/inspect-host-capacity.sh` is run **on the box**, current headroom is **not proven**.

## 5. Conservative Temporal resource model

Target scenario from #1025 (lean, non-HA):

- 3–5 concurrent workstreams
- 10–20 active workflow executions
- 2–4 concurrent development jobs remain **external** (Cursor Cloud / GitHub Actions / Vercel) and are **not** charged to the server
- GitHub events + scheduled reconciliation stay small if the worker is synthetic/test-only

Postgres visibility store (no Elasticsearch) is the intended POC shape.

| Envelope | Steady | Burst | Disk |
|---|---|---|---|
| 1. Temporal Server + UI | 1.0 vCPU / 1.25 GiB | 1.5 vCPU / 1.75 GiB | 2 GB image/logs |
| 2. Dedicated Temporal Postgres | 0.5 vCPU / 0.5 GiB | 1.0 vCPU / 0.75 GiB | 5–10 GB data |
| 3. CorpFlowAI test worker(s) | 0.25 vCPU / 0.25 GiB | 0.5 vCPU / 0.5 GiB | <1 GB |
| 4. External Cursor/AI/build | **0 on this host** | **0 on this host** | n/a |
| **Total Temporal POC** | **~1.75 vCPU / ~2.0 GiB** | **~3.0 vCPU / ~3.0 GiB** | **~15 GB including headroom** |

**Minimum recommended free headroom before install:** **4 GiB RAM available**, **2 idle vCPU**, **20 GiB free disk**, after existing containers. That is the stop-gate floor. Do not install into swap.

## 6. Options

### Option 1 — existing server, shared resources, no extra limits

**Verdict: NO.** Even the 2026-05-31 7.5 GiB box is already carrying two ERPNext Docker projects plus Kuma. Sharing unconstrained Temporal with those stacks is how the box OOMs. Not acceptable without live proof that those stacks are down **and** 4 GiB remains free.

### Option 2 — existing server, Docker CPU/RAM limits, separate Temporal volume/DB

**Verdict: NOT PROVEN.** This is the only exec-01 shape Anton authorized *if* preflight passes. Last-known 7.5 GiB + two ERPNext stacks makes a pass **unlikely**, but the informal ~25 GiB observation could change that. Live `free` + `docker stats` is the tie-breaker. **Do not install on this evidence.**

### Option 3 — cheapest sensible separate small VM

**Verdict: YES — recommended path while exec-01 headroom is unproven.**

Indicative size/cost (public list, confirm in Hetzner console before buying; this packet does **not** purchase):

| Plan | Spec | Indicative 2026 list | Fit |
|---|---|---|---|
| CX22 | 2 vCPU / 4 GB / 40 GB | ~€4–6 / month | Too tight for Temporal + dedicated Postgres + UI + worker + 4 GiB headroom rule |
| **CX32** | **4 vCPU / 8 GB / 80 GB** | **~€7.50 / month** (range ~€7–13 by region/SKU) | **Smallest sensible POC host** |
| CX42 | 8 vCPU / 16 GB / 160 GB | ~€14–15 / month | Overkill for this POC |

Reuse the existing loopback + SSH-tunnel access pattern. No public Temporal ports. No CorpFlowAI production Postgres. Hourly billing means a failed POC can be deleted the same day.

**Exact remaining protected action if Anton chooses this path:** create/pay for that sibling VM. This packet does not do that.

### Option 4 — Temporal Cloud benchmark only

**Verdict: NOT SENSIBLE for this POC.** Temporal Cloud is a managed namespace with usage pricing typically starting around the low hundreds of USD/month plus actions. For 10–20 synthetic workflows the cost is far above a ~€7.50 CX32, and it does not answer “can we operate a lean self-hosted worker.” Keep as a later production alternative after a self-hosted POC, not as the first experiment.

## 7. Failure / security review (design, not live-proven)

| Failure | Workflow state | Recovery |
|---|---|---|
| Temporal container crash | Durable in Temporal Postgres | Automatic if `restart: unless-stopped` + DB healthy |
| Worker crash | Workflow waits for next poll | Automatic; in-flight activities retry per workflow policy |
| Temporal Postgres crash | Cluster unavailable until DB returns | Automatic restart; data survives dedicated volume |
| Host reboot | All containers stop | Automatic if Docker + restart policy; workflows resume from DB |
| Connectivity loss / missed GitHub event | Event not recorded unless an outbox exists | **Manual replay** of the synthetic event; POC must use an idempotent test event |
| Downstream Cursor/AI/Vercel failure | Workflow stays in wait/fail state | No automatic production deploy; POC must not call those as side effects |
| Disk full | Writes fail; worst case DB corruption | Stop + free disk; restore from volume backup |
| Total host loss | Data gone unless volume was backed up off-box | Restore from restic/R2 **only if** Temporal volumes were included — **not proven today** (`SELF_HOSTED_OPS_STACK_V1.md` Step 3 still not initiated) |
| Backup/restore of Temporal persistence | Proposed: dedicated Docker volume + `pg_dump` into the existing restic→R2 ops path **after** restic is authorized | **Not live.** Do not invent a second backup product |

**Security baseline required for any future POC:**

- Bind Temporal gRPC `127.0.0.1:7233` and UI `127.0.0.1:8233` only.
- Access UI via `ssh -L 8233:localhost:8233`.
- No public DNS, no reverse proxy, no `0.0.0.0` publish.
- Dedicated Temporal Postgres. **Never** Neon / `POSTGRES_URL`.
- No CorpFlow secrets in the Temporal project.
- Synthetic GitHub proof = **read-only** `gh api` GET or a local file drop. No issue mutation, no dispatch, no webhook that can start real factory work.

The scaffold in `ops/temporal/compose.example.yml` encodes the loopback + limits rules. It is **not** started by this packet.

## 8. Required evidence template (issue #1025)

```
Inspection timestamp: 2026-08-21T02:13:47Z
Cursor run/agent ID: bc-c95becc6-3cc5-468d-93dd-ca3389ada0e3
Host/provider: NOT INSPECTED LIVE. Last-known: Hetzner/Elestio corpflow-exec-01-u69678 (JE-2026-05-31-2)
OS: NOT INSPECTED LIVE. Last-known: Ubuntu 24.04
CPU: NOT INSPECTED LIVE. Last-known: 4 vCPU
RAM: NOT INSPECTED LIVE. Last-known: 7,751 MiB total
Swap: NOT INSPECTED LIVE. Last-known: 2,047 MiB
Root disk total/free: NOT INSPECTED LIVE. Last-known: 150 GB / 135 GB free (2026-05-31)
Current load: NOT INSPECTED LIVE
Current memory use: NOT INSPECTED LIVE
Current Docker workloads: NOT INSPECTED LIVE. Last-known standing: ERPNext sandbox + ERPNext production shell + Uptime Kuma
Current container CPU/RAM evidence: NOT INSPECTED LIVE
Persistence/backup baseline: production Postgres remains Neon; exec-01 restic→R2 Step 3 not initiated; Temporal volumes are not in any proven backup
Network/security baseline: NOT INSPECTED LIVE. Standing rule: Kuma 127.0.0.1:3001; no public Temporal port may be added

Estimated Temporal steady footprint: ~1.75 vCPU / ~2.0 GiB RAM / ~15 GB disk
Estimated Temporal burst footprint: ~3.0 vCPU / ~3.0 GiB RAM
Minimum recommended free headroom: 4 GiB RAM available + 2 idle vCPU + 20 GiB disk after existing containers

Option 1 verdict: NO
Option 2 verdict: NOT PROVEN — live preflight required
Option 3 indicative VM size/cost: Hetzner CX32 (4 vCPU / 8 GB / 80 GB, ~€7.50/month) — cheapest sensible dedicated POC host
Temporal Cloud benchmark: not sensible for this synthetic POC (managed usage pricing ≫ CX32)

Final infrastructure verdict:
NO — SEPARATE SMALL SERVER/VM RECOMMENDED

Exact blocker / protected action required: live L3 read-only preflight on corpflow-exec-01-u69678 (SSH from Anton’s terminal) — or Anton’s separate decision to create/pay a sibling CX32. No Temporal install, no paid VM, no secret mutation in this packet.
```

## 9. POC acceptance items 1–14 (honest)

| # | Required proof | This packet |
|---|---|---|
| 1 | Measured preflight + capacity verdict | **FAIL / STOP** — HOST_MISMATCH, no live numbers |
| 2 | Exact Docker topology / resource limits | Scaffold only: `ops/temporal/compose.example.yml` |
| 3 | Temporal/database/worker versions | Pins in the scaffold; not pulled/running |
| 4 | 3 concurrent synthetic workflows visible | **not run** |
| 5 | Durable wait → signal → resume | **not run** |
| 6 | Temporal container restart → recovery | **not run** |
| 7 | Worker restart → recovery | **not run** |
| 8 | Database persistence/restart proof | **not run** |
| 9 | Harmless GitHub test event/reconciliation | **not run** |
| 10 | CPU/RAM/disk idle vs burst | **not run** |
| 11 | Backup/restore approach | Documented as proposed; restic Step 3 not live |
| 12 | Security/exposure evidence | Scaffold is loopback-only; live bind not proven because nothing was started |
| 13 | Rollback/complete removal | `docker compose -p corpflowai-temporal down -v` in the runbook; nothing to roll back on the host |
| 14 | Final verdict | `FAIL — EXISTING SERVER CAPACITY NOT PROVEN` |

**POC verdict:** `FAIL — EXISTING SERVER CAPACITY NOT PROVEN`

This is **not** `SELF-HOSTED TEMPORAL POC PASS — READY FOR OPERATING-MODEL DECISION`.

## 10. Next owner

- **Cursor:** done for this run. Evidence PR only. Do not stay alive waiting for SSH.
- **Anton:** one of (a) paste the read-only preflight at L3 and return non-secret output, or (b) decide whether to pay for a sibling CX32, or (c) decline Temporal self-host.
- **ChatGPT:** may use this evidence for the architecture/cost recommendation; do not treat stale 2026-05-31 RAM as current.

## 11. Files in this packet

| Path | Role |
|---|---|
| `docs/operations/TEMPORAL_HOST_FEASIBILITY_EVIDENCE_1025.md` | Canonical evidence (this file) |
| `docs/runbooks/TEMPORAL_SELF_HOSTED_POC_PREFLIGHT.md` | Operator-paste read-only preflight |
| `scripts/ops/temporal/inspect-host-capacity.sh` | Same capture, script form |
| `ops/temporal/compose.example.yml` | Loopback + limits scaffold — **do not auto-deploy** |
| `ops/temporal/README.md` | Scaffold rules |
| `docs/decisions/20260821-temporal-self-hosted-poc-stop.md` | ADR-lite |
| `docs/decisions/JOURNAL.md` | `JE-2026-08-21-1` |
