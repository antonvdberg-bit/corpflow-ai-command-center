# ADR — OpenHands on `corpflow-exec-01-u69678` (private delivery worker, Phase 1)

**Date:** 2026-08-04
**Status:** PROPOSED — pending Anton's merge of the authorization packet `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md`. Becomes ACCEPTED on merge. **Not yet authorized.** As of the #747 Docker-isolation follow-up (same date), this status remains PROPOSED — the isolation design in § 1.1 / § 2 below is a **hard condition** of any future ACCEPTED status, not a reason to accept early.
**Supersedes:** none.
**Related:** `JE-2026-08-04-N` (companion journal row); [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743) (controlling issue); [#747](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/747) (Docker-isolation security follow-up); [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661) (parent — active agent delivery control loop); [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249) (Operator Bridge coordination); `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` (the dedicated-rootless-Docker-daemon design this ADR's § 1.1/§ 2/§ 4 now require); `docs/operations/OPENHANDS_OPERATING_CHARTER.md` (doctrine that named OpenHands as a candidate third worker); `docs/decisions/20260615-uptime-kuma-on-exec01.md` (the only prior ADR to carry a § 5.5 carve-out — structural model for this one, **not** a precedent that widens to cover OpenHands).
**Authors:** Anton (operator) + Assistant (Cursor at L1).

---

## 1. Context

`docs/operations/OPENHANDS_OPERATING_CHARTER.md` and `docs/operations/OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md`
already establish the doctrine: OpenHands is a candidate **third worker** alongside Cursor and Codex Cloud in
the #661 control loop, taking on GitHub-issue-sourced work packets that Anton or ChatGPT route to it, and
returning draft PRs for human review — never merging its own work, never touching protected gates.

That doctrine is docs-only baseline. This ADR is the operational gate that would authorize the actual
**install** of the reviewed package at `ops/openhands/` on `corpflow-exec-01-u69678`.

`docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.3 lists the hard rule an OpenHands
install would lift:

- *"❌ No Docker / Ollama / Postgres install beyond the ERPNext sandbox + (authorised) production-shell scope."*

Unlike Uptime Kuma, OpenHands does **not** require the scheduled-jobs exception to be lifted for its Phase 1
shape — the control-plane container runs continuously (`restart: unless-stopped`), not on a cron/timer. If a
future health-check systemd timer (`scripts/ops/systemd/corpflowai-openhands-health.timer`, referenced in the
package but not enabled by this ADR) is ever turned on, **that** would require its own, separate review against
the scheduled-jobs rule — not authorized here.

Per § 10 of the boundary doc, lifting the Docker-install rule requires (in the same PR): an ADR (this doc), a
passed `MIGRATION_TO_SERVER_CHECKLIST.md`, a new pending `MONITORING_ARCHITECTURE.md` row, a pending note in
the boundary doc itself, a `JE-YYYY-MM-DD-N` row, and Anton's merge approval. This round produces all of those
as **pending/proposed** artifacts — none of them claim OpenHands is live.

### 1.1 Why this is not "just another Kuma"

Uptime Kuma has no host-level access beyond its own container and a loopback port. **OpenHands, by contract
with `docker.openhands.dev/openhands/openhands:1.8`, requires a Docker-socket mount on the control-plane
container so it can spawn per-task sandbox containers.** A process with access to a Docker socket has
**daemon-root-equivalent** capability — it can create privileged containers, mount arbitrary host paths the
daemon can see, and escape the container boundary. This is not a hypothetical; it is documented plainly in
`docs/operations/OPENHANDS_SECURITY_MODEL.md` § 3, and it is the single largest difference between this ADR and
the Kuma precedent. Anton must read and accept that section — not just this ADR — before approving.

**(2026-08-04, #747 Docker-isolation follow-up):** this ADR's authorization is now **conditioned** on that
socket being a **dedicated, rootless Docker daemon** (`$HOME/corpflowai-openhands/docker/docker.sock`,
never the box's primary `/var/run/docker.sock`) per `docs/operations/OPENHANDS_DOCKER_ISOLATION.md`. Mounting
the primary socket is out of scope for this ADR entirely — it would be a materially larger blast radius
requiring its own, separate ADR, not a variant of this one. The dedicated-daemon design narrows, but does not
eliminate, the daemon-root-equivalent risk above; § 4 below states the residual risk plainly, including a
disclosed gap (no native per-sandbox memory/CPU cap in the OSS `1.8` Docker path) that Anton must explicitly
accept, not merely notice, as a condition of any future ACCEPTED status.

## 2. Decision

**Authorize OpenHands to run as a single, narrow, packet-gated container on `corpflow-exec-01-u69678` for the
explicit and only purpose of acting as a private, internal delivery worker under the #661 control-loop model —
receiving GitHub-issue-sourced work packets and returning draft PRs for human review.**

Specifically:

- **Tool:** OpenHands (open source — `https://github.com/All-Hands-AI/OpenHands`), app image
  `docker.openhands.dev/openhands/openhands:1.8`, agent-server image
  `ghcr.io/openhands/agent-server:1.26.0-python`, both pinned per `ops/openhands/VERSIONS.md`. No alternative
  tool or image is authorized by this ADR.
- **Host:** `corpflow-exec-01-u69678` only (post-resize authoritative figure: 4 vCPU / 7,751 MiB RAM / 150 GB /
  2 GB swap per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.1 — see § 1.2 below on the outstanding
  capacity contradiction that must be live-verified before install, not resolved by this ADR).
- **Deployment shape:** control-plane container `corpflowai-openhands-app`, bound to **`127.0.0.1:3000`**
  loopback only, no public port. Operator UI access is via SSH local-port-forward (mirroring the pattern
  already proven for Kuma and ERPNext), e.g. `ssh -L 3000:localhost:3000 anton@<box-ip>`. Persistent state in a
  named volume/bind-mount under the operator's home directory. Per-task sandbox containers are spawned
  on-demand via a **dedicated, rootless Docker daemon** — socket `$HOME/corpflowai-openhands/docker/docker.sock`,
  data root `$HOME/corpflowai-openhands/docker-data`, **never** the box's primary `/var/run/docker.sock` — are
  ephemeral, and are torn down after each task per `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 6 and
  `docs/operations/OPENHANDS_DOCKER_ISOLATION.md`. A systemd user slice, `corpflowai-openhands.slice`
  (`MemoryMax=4G`, `CPUQuota=200%`), bounds the dedicated daemon's total resource use.
- **Concurrency:** exactly **one** task sandbox at a time (v1 hard ceiling, not an upstream default) — see
  `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` § 3.
- **Model/cost path:** API-key-based LLM access via LiteLLM (recommended fail-safe default), USD 25/month
  ceiling with fail-closed behavior at 100%, no auto top-up — see
  `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md`. This ADR does not authorize any spend by itself; the
  budget and provider account are separate operator actions at install time.
- **GitHub access:** least-privilege — a repo-scoped GitHub App (recommended) or fine-grained PAT limited to
  `contents: write`, `issues: read`, `pull_requests: write` on `antonvdberg-bit/corpflow-ai-command-center`
  only, no admin, no secrets scope, no merge permission on `main` — see
  `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 7.
- **Alert path:** silent-success / exception-only in Phase 1 (no Telegram wiring yet); future wiring, if added,
  must use OpenHands' own notification path or an explicit new integration — not a claim made by this ADR.

This decision would be the **second** named, narrow, packet-gated exception to the § 5.3 hard rules — alongside
Uptime Kuma, not in place of it. It does **not** generalize: any future tool requires its own ADR + authorization
packet + § 10 gate. The exception is the named container, not "Docker beyond ERPNext."

### 2.1 Canonical authorization language (cite verbatim — no paraphrase)

> **This packet authorizes only the minimum execution boundary change needed for the OpenHands control plane
> (image `docker.openhands.dev/openhands/openhands:1.8`, container `corpflowai-openhands-app`) to run as a
> private, loopback-bound delivery worker on `corpflow-exec-01-u69678`.**
>
> **It does not authorize general Docker usage, general scheduled jobs, additional self-hosted applications,
> backups/restic, chatbot/live-chat platforms, additional AI frameworks beyond this one named tool, or
> production shell access beyond the documented OpenHands installation/operation path. It does not widen,
> replace, or reinterpret the existing Uptime Kuma carve-out — OpenHands is a second, independent, equally
> narrow named exception, not an extension of Kuma's.**

The same wording appears in `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` § 1.1 and in the
pending § 5.5 note in `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md`. It is the load-bearing
carve-out: any future packet that relaxes any clause above requires its own ADR + § 10 gate.

### 1.2 Capacity contradiction — recorded, not resolved

| Source | Claim | Status |
|---|---|---|
| `MONITORING_ARCHITECTURE.md` § 11.3 (2026-05-27) | `2 vCPU / 2 GB RAM / 38 GB disk / 2 GB swap` | Historical/stale — predates the 2026-05-31 resize. |
| `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.1 (post-resize) | `4 vCPU / 7,751 MiB RAM / 150 GB disk / 2 GB swap` | Authoritative post-resize, tied to `JE-2026-05-31-2`. |
| Anton's Beszel-style observation (informal, 2026-08) | ~6 CPU, ~25.7 GiB RAM, ~17–14 GiB headroom | Observational only, not live-verified by this ADR. |

This ADR does **not** pick a winner. `scripts/ops/openhands/inspect-host-capacity.sh` (read-only, already in
the reviewed package) must be run live on the box before any install decision — see
`docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` § 2.

## 3. Credentials held on the box (named, narrow)

Inside the OpenHands control-plane container and its persistent volume only, once installed (not by this ADR):

- **LLM provider API key** (LiteLLM-compatible provider, e.g. Anthropic/OpenAI/Groq — exact provider chosen at
  install time), stored in the box-local `.env` (`chmod 600`), never in this repo.
- **GitHub App private key or fine-grained PAT**, scoped per § 2 above, stored the same way.
- **Optional** future Telegram bot token/chat id if alerting is wired later — not part of this ADR's scope.

Explicitly **not** on the box (re-stating § 5.3 hard rules this ADR does **not** lift beyond the one named
Docker exception):

- ❌ `POSTGRES_URL` / `DATABASE_URL` / `DIRECT_URL` / any CorpFlowAI DB connection string.
- ❌ `MASTER_ADMIN_KEY` / `SESSION_TOKEN` / any factory-master credential.
- ❌ `VERCEL_TOKEN` / `VERCEL_*` / any deploy capability.
- ❌ `CORPFLOW_AUTOMATION_INGEST_SECRET` / `CORPFLOW_AUTOMATION_FORWARD_SECRET`.
- ❌ `N8N_EMAIL_WEBHOOK_SECRET` or any Gmail OAuth token.
- ❌ Stripe / payment / banking credentials.
- ❌ Tenant data of any kind (no DB exports, no content snapshots, no client emails, no client phone numbers).
- ❌ The in-repo `TELEGRAM_BOT_TOKEN` / `TELEGRAM_ALERT_CHAT_ID`.
- ❌ Uptime Kuma's admin credentials or Telegram bot token (separate carve-out, separate credential surface).

## 4. Threat model

| Threat | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Docker-socket mount lets a compromised or misbehaving OpenHands process escalate to daemon-root-equivalent access. | Medium | **High** (full compromise of the dedicated Docker daemon's own scope — no longer full box compromise, see mitigation) | **(2026-08-04, #747)** Narrowed from the original "critical / full box compromise" rating by the dedicated-rootless-Docker-daemon design — see `docs/operations/OPENHANDS_DOCKER_ISOLATION.md`. A compromise can reach the dedicated daemon's own containers/images/volumes only; it has no daemon-level path to Kuma, ERPNext, or any other box workload, because they run on the box's separate primary daemon. Mitigations: no privileged flag on spawned sandboxes, no host-network mode for the app container, explicit mount exclusions (no `.ssh`, no CorpFlow secret paths, no other Docker volumes), least-privilege GitHub credential so even a full compromise cannot reach `main` directly, rootless mode so the dedicated daemon itself is not Linux `root`. **Residual, disclosed, not solved:** no native per-sandbox 4 GiB `HostConfig` cap in the OSS `1.8` Docker path — the systemd slice's 4 GiB / 200% ceiling is a total, not per-sandbox, limit; Anton must explicitly accept this specific gap per `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` § 1.1a. |
| Public-internet exposure of the OpenHands UI or agent-server port. | Low | High (unauthenticated task submission / code exfiltration) | Bind to `127.0.0.1:3000` only; UI access via SSH local-port-forward; no public DNS, no reverse proxy. Verified at install time per `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` § 6. |
| GitHub credential over-scoped beyond the documented least-privilege set. | Medium | High (unintended repo access, e.g. ability to touch other repos or merge to `main`) | Recommend a repo-scoped GitHub App with exactly `contents: write`, `issues: read`, `pull_requests: write`, no admin, no merge on `main`; install runbook requires confirming actual configured scopes before real dispatch. |
| LLM spend runs past the USD 25/month ceiling before the fail-closed gate is proven. | Low–Medium | Low–Medium (unexpected spend, not a security breach) | `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md` § 4 fail-closed behavior is a required install-time check; synthetic validation runs under the ceiling before production dispatch. |
| A sandbox task accidentally reaches CorpFlowAI production Postgres or another tenant's data because of a misconfigured mount or credential. | Low | Critical | Hard rule: **no production Postgres credential is ever placed on the box**, per § 3 above; sandbox containers get no host secrets by default; work packets that would require real client data are refused per `docs/execution/OPENHANDS_WORK_PACKET_TEMPLATE.md`'s `real_client_data_permitted: false` default. |
| A future reader treats this ADR as evidence that "Docker is now generally fine" on the box. | High (governance drift) | Medium–High | § 2's explicit non-generalization language; the pending § 5.5 note (not a live table row) added by the authorization packet; this ADR names OpenHands specifically and rejects extension to "similar" tools. |
| Concurrency creep — a future change silently raises the 1-task-at-a-time ceiling, multiplying the Docker-socket blast radius. | Low | Medium | `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` § 3 states concurrency = 1 as a v1 hard rule; any change requires its own review, not a quiet compose-file edit. |

## 5. Rollback path

1. **Disable the worker surface (operator, ≤ 60 s):** `docker compose -p corpflowai-openhands down` on the box
   (or `scripts/ops/openhands/install.sh --rollback`, once authored and reviewed). All task intake stops
   instantly. No CorpFlowAI app-tier impact — OpenHands is not in the request path of any production surface.
2. **Remove the install (operator, ≤ 5 min):** `docker compose -p corpflowai-openhands down -v`, remove the
   named data directory, remove the pinned images. The box returns to its pre-OpenHands state. See
   `docs/operations/OPENHANDS_ROLLBACK_AND_UNINSTALL.md` for the full, scoped procedure (never touches
   Kuma/ERPNext/Core/Postgres/n8n/backups).
3. **Revert this PR (Cursor at L1, ≤ 1 hour to author + Anton merge):** revert the merge commit of the
   authorization packet + this ADR. The pending `MONITORING_ARCHITECTURE.md` row + pending boundary-doc note +
   JOURNAL row all roll back atomically. This is repo state only — it does not stop a running install on the
   box (operator must run step 1/2 there).
4. **Per-row revocation (Cursor at L1, future packet):** a future superseding `JE-YYYY-MM-DD-N` row that
   explicitly references and reverses the OpenHands journal row, preferred if OpenHands is ever replaced or this
   carve-out is widened/narrowed.

The CorpFlow runtime, Vercel project, GitHub workflows, Postgres / Neon DB, Prisma schema, public pages, payment
posture, ERPNext production-shell state, ERPNext sandbox state, Uptime Kuma install/state, n8n state, Plausible
state, and DNS / mail-routing are all unchanged by either the (future) install or the rollback of this
authorization.

## 6. Alert path

Phase 1 posture is **silent success / exception-only** per `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` §
5 — there is no live Telegram/email wiring for OpenHands task outcomes in this round. Task-level outcomes are
recorded as evidence (branch, PR link, cost, model) rather than pushed as alerts. If a future packet adds a
notification path, it must be reviewed on its own terms (does it reuse the in-repo Telegram bot? does it create
a new one? does it depend on n8n?) rather than assumed here.

## 7. Consequences

**Positive:**

- Establishes a third, private, GitHub-issue-driven delivery worker alongside Cursor and Codex Cloud, per the
  #661 control-loop model and the doctrine already accepted in `docs/operations/OPENHANDS_OPERATING_CHARTER.md`.
- Proves the § 10 gate can be invoked a **second** time without collapsing into "Docker is now generally OK" —
  if this ADR is approved, it is evidence the boundary discipline scales to more than one named exception.
- Uses the already-paid-for `corpflow-exec-01-u69678` capacity rather than provisioning a new host.
- Documents, rather than hand-waves, the Docker-socket risk — future operators inherit an honest threat model,
  not an optimistic one.

**Negative / accepted:**

- A materially larger blast radius than Kuma: the Docker-socket mount is a real, accepted, host-root-equivalent
  risk, not a cosmetic one. This is the single biggest cost of this decision and is not minimized in this ADR.
- A second credential surface to rotate (LLM API key, GitHub App/PAT), independent of Kuma's.
- A second named exception to track in `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5, increasing the
  discipline burden of keeping "narrow, named, non-generalizing" true over time.
- Ongoing LLM spend (bounded at USD 25/month, fail-closed) — a new recurring cost line, however small.
- One additional doc set (this ADR + the authorization packet + six operational docs + two execution docs) to
  maintain alongside Kuma's.

## 8. Alternatives considered (and rejected for this round)

| Alternative | Why it was considered | Why rejected for this round |
|---|---|---|
| Run OpenHands without Docker-socket access (a "no sandbox" mode, if one exists upstream). | Would eliminate the single largest risk in this ADR. | Not confirmed as a supported, maintained mode in the pinned `1.8` app version per the official docs reviewed 2026-08-04; would need separate upstream research before being proposed as the actual install shape. Noted as a follow-up question for the install runbook, not resolved here. Unchanged by the #747 follow-up. |
| Docker socket proxy in front of the primary daemon (e.g. `linuxserver/socket-proxy`), instead of a dedicated daemon. | Narrows the API surface without needing a second daemon. | **Evaluated and rejected in the #747 follow-up** — see `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` § 6. Still fronts the primary daemon; a proxy compromise or misconfiguration still exposes every other box workload sharing that daemon. Remains a possible defense-in-depth addition **on top of** the dedicated daemon in a future round, not a substitute for it. |
| **Dedicated, rootless Docker daemon used only by OpenHands (selected, 2026-08-04 / #747).** | Structurally separates OpenHands' Docker blast radius from Kuma/ERPNext/every other box workload without provisioning a new host; rootless mode additionally removes host-root execution for the daemon process. | **Selected as the Phase 1 Docker-isolation shape.** Narrows but does not eliminate daemon-root-equivalent risk (§ 4); discloses a real, unsolved per-sandbox resource-limit gap requiring Anton's explicit acceptance (`docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` § 1.1a). See `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` for the full design and comparison against the alternatives in this table. |
| A dedicated, separate VM for OpenHands (isolate the Docker-socket blast radius away from Kuma/ERPNext). | Cleanest isolation; a compromise of the OpenHands host would not threaten Kuma's monitoring visibility. | Costs another paid host; Phase 1 budget assumption is "use the server we already provisioned." The dedicated-daemon design (row above) is judged sufficient narrowing for Phase 1; reconsider a dedicated VM if the dedicated-daemon boundary is later judged inadequate in practice. |
| ChatGPT Plus/Pro `subscription_login` path instead of API-key billing. | Simpler billing, potentially cheaper for light usage. | Business/Team plan support is **not documented** by upstream as of the 2026-08-04 research pass — verdict UNCLEAR; the API-key route is the fail-safe default per `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md` § 2. Plus/Pro subscription-login remains an optional, separately-validated path, not the default. |
| Do nothing in Phase 1; revisit after Uptime Kuma's carve-out has run longer and proven the § 10 gate is durable. | Lowest-risk option; lets one exception "bed in" before adding a second, riskier one. | Leaves the #661 third-worker doctrine as docs-only indefinitely; Anton has already asked for Phase 1 documentation to be produced now so the decision can be made deliberately, not by default. This ADR does not force approval — it only makes the decision reviewable. |
| Fine-grained PAT instead of a GitHub App. | Simpler to set up; no app registration flow. | `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 7 compares both and recommends the GitHub App for cleaner permission boundaries and easier revocation (uninstall the app vs. hunt down and revoke a PAT); PAT remains an acceptable fallback if the App path proves impractical at install time. |

## 9. References

- `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` (2026-08-04, #747 Docker-isolation follow-up — the dedicated
  rootless Docker daemon design that § 1.1 / § 2 / § 4 / § 8 above now require as a hard ADR condition).
- `docs/operations/OPENHANDS_OPERATING_CHARTER.md` (doctrine naming OpenHands as a candidate third worker).
- `docs/operations/OPENHANDS_ARCHITECTURE.md` (target flow, resource envelope, capacity contradiction detail).
- `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 3 (Docker-socket risk — read before approving), § 7 (GitHub
  least-privilege comparison).
- `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` (the gated follow-up procedure this ADR would unlock).
- `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md` (LLM provider verdict + cost ceiling).
- `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` (day-to-day operation, concurrency = 1).
- `docs/operations/OPENHANDS_ROLLBACK_AND_UNINSTALL.md` (scoped rollback procedure).
- `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` (the packet this ADR is a companion to).
- `docs/execution/OPENHANDS_WORK_PACKET_TEMPLATE.md`, `docs/execution/OPENHANDS_SYNTHETIC_VALIDATION_PLAN.md`
  (Phase 1 execution artifacts).
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.3 (the rule being lifted), § 5.4 (the
  L1 + L3 collaboration pattern the future install would follow), § 5.5 (the carve-out subsection — pending
  note added by the authorization packet, not yet a live row), § 10 (the gate this ADR satisfies).
- `docs/decisions/20260615-uptime-kuma-on-exec01.md` (structural model for this ADR — a different tool, a
  different and larger threat model; explicitly not a precedent that pre-approves OpenHands).
- `docs/operations/MONITORING_ARCHITECTURE.md` § 11.2 (pending future-packet row added by this round).
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` (packet structure followed by the authorization
  packet).
- `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` (every § 2 checkbox addressed inline in the authorization
  packet).
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` § 3 (Anton's merge of this PR is the AAP § 3 gate — a
  further, separate go-ahead is still required before any install command runs).
- [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743),
  [#747](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/747) (Docker-isolation follow-up),
  [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661),
  [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).
- `docs/decisions/JOURNAL.md` row `JE-2026-08-04-N` (companion journal row added by this round); row
  `JE-2026-08-04-2` (or next available) for the #747 Docker-isolation follow-up specifically.

## 10. Decision record

- **Status changes:** PROPOSED (2026-08-04, this commit) → **still PROPOSED** as of the #747 Docker-isolation
  follow-up (same date) — the dedicated-daemon condition in § 1.1/§ 2/§ 4/§ 8 is a hard requirement layered onto
  this still-pending decision, not itself an acceptance event → ACCEPTED (on Anton's merge of the authorization
  packet + this ADR, **with** the § 1.1a condition satisfied) → SUPERSEDED (by a future ADR if OpenHands is ever
  replaced or this carve-out is widened/narrowed).
- **Approver:** Anton (sole approver per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` § 3 for any L3
  surface change).
- **Reviewer:** Anton (operator).
- **Scope of this ADR:** authorization only. The actual install commands live in
  `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` (already authored in this round, but **gated** — it states
  plainly that installation is not authorized until this ADR + the authorization packet are merged, and a
  further, separate, explicit go-ahead is given for the install session itself).
