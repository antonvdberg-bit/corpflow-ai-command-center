# Packet: Authorize OpenHands private worker on `corpflow-exec-01-u69678` (Phase 1 → Phase 2 gate)

**Packet id:** `OPENHANDS_ON_EXEC01_AUTHORIZATION_V1`
**Date opened:** 2026-08-04
**Status: DRAFT — PENDING ANTON APPROVAL.** This packet does **not** install anything. It is the review
artifact that, **if merged by Anton**, becomes the § 5.5 carve-out that makes installation possible — the
install itself is a separate, further-gated action per `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md`.
**Owner:** Approver = Anton; Executor of THIS packet = Cursor (L1, docs-only); Reviewer = Anton.
**Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743) · **Parent:** [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661)

**Modeled on:** `docs/execution/UPTIME_KUMA_ON_EXEC01_AUTHORIZATION_PACKET.md` (the only prior packet that has
successfully carried a § 5.5 carve-out through this gate) — same structure, same rigor, **different tool,
different threat model, different (larger) blast radius** because of the Docker-socket mount (§ 4 below).

**Companion docs (canonical — read these to understand why every clause is what it is):**

- `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` (2026-08-04, PR #747 Docker-isolation security follow-up —
  the **dedicated rootless Docker daemon** design that § 1.1a below makes a hard carve-out condition; read this
  before § 5's risk table).
- `docs/decisions/20260804-openhands-on-exec01.md` (the ADR this packet satisfies; status: PROPOSED).
- `docs/operations/OPENHANDS_ARCHITECTURE.md` (target flow), `docs/operations/OPENHANDS_SECURITY_MODEL.md` (threat model — read § 3 before approving), `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` (the follow-up procedure this packet gates).
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` (packet shape) and `docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` (every § 2 checkbox addressed inline in § 6 below).
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5 (allowed L3 surfaces — this packet proposes a **second** § 5.5 row, alongside Uptime Kuma, not a replacement), § 5.3 (hard rules — narrow exception; the rules themselves stay), § 10 (the gate this packet satisfies).
- `docs/operations/MONITORING_ARCHITECTURE.md` § 11.2 (the pending future-packet row this Phase 1 documentation set adds).
- `ops/openhands/README.md`, `ops/openhands/compose.yaml`, `ops/openhands/VERSIONS.md` — the reviewed package this packet would authorize.

---

## 1. Goal

Authorize a single, narrow OpenHands control-plane container on `corpflow-exec-01-u69678` for the explicit and
only purpose of running the reviewed package at `ops/openhands/` as a private, internal delivery worker under
the #661 control-loop model — **without** lifting any § 5.3 hard rule beyond this one named container, and
**without** generalizing the existing Uptime Kuma carve-out.

This packet is **docs-only**. It does **not** install OpenHands. The install runbook
(`docs/operations/OPENHANDS_INSTALL_RUNBOOK.md`) is a separate, already-authored-but-gated follow-up that
becomes executable only after **both** this packet and the companion ADR are merged, **and** Anton gives a
further explicit go-ahead for the install session itself.

### 1.1 Required authorization language (canonical — cite this verbatim)

> **This packet authorizes only the minimum execution boundary change needed for the OpenHands control plane
> (image `docker.openhands.dev/openhands/openhands:1.8`, container `corpflowai-openhands-app`) to run as a
> private, loopback-bound delivery worker on `corpflow-exec-01-u69678`.**
>
> **It does not authorize general Docker usage, general scheduled jobs, additional self-hosted applications,
> backups/restic, chatbot/live-chat platforms, additional AI frameworks beyond this one named tool, or
> production shell access beyond the documented OpenHands installation/operation path. It does not widen,
> replace, or reinterpret the existing Uptime Kuma carve-out — OpenHands is a second, independent, equally
> narrow named exception, not an extension of Kuma's.**

This wording is the load-bearing carve-out language for OpenHands, mirroring (but not replacing) the Kuma
wording in `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5. It must be cited whenever this carve-out is
referenced. Any future packet that relaxes any clause above requires its own ADR + authorization packet + § 10
gate.

### 1.1a Dedicated Docker daemon — hard carve-out condition (2026-08-04, #747 Docker-isolation follow-up)

**This carve-out is conditioned on the dedicated-rootless-Docker-daemon design in
`docs/operations/OPENHANDS_DOCKER_ISOLATION.md`, not merely improved by it.**

- **Hard block:** if, at install time, the reviewed package still mounts the box's **primary**
  `/var/run/docker.sock` into the OpenHands control-plane container (rather than a dedicated daemon's own
  socket at `$HOME/corpflowai-openhands/docker/docker.sock`), the carve-out this packet would grant **does not
  apply** to that install. Installing against the primary socket is **out of scope for this authorization**,
  full stop — it would require its own, separately-reviewed ADR naming that materially larger blast radius,
  not a footnote here.
- **Residual per-sandbox resource-limit gap — Anton must accept explicitly, or the carve-out stays blocked.**
  `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` § 2.2 discloses that the OSS OpenHands `1.8` Docker self-host
  path has **no native per-sandbox 4 GiB `HostConfig` limit** (unlike OpenHands Enterprise's Kubernetes
  `MEMORY_LIMIT`). The `corpflowai-openhands.slice` systemd ceiling (`MemoryMax=4G`, `CPUQuota=200%`) bounds the
  **total** of control plane + one concurrent sandbox, not any individual sandbox. This packet does **not**
  treat that gap as pre-accepted by the rest of this document — Anton's approval of this packet must include an
  **explicit, recorded acknowledgment** of this specific gap (e.g. a sentence in the merge/approval comment, or
  a dedicated line in the JOURNAL row that closes this packet). Absent that explicit acknowledgment, the
  carve-out remains **AWAITING_APPROVAL** even if every other clause in this packet is otherwise satisfied.
- **Non-negotiation of § 1.1's scope.** This condition narrows what may be installed under this carve-out; it
  does not widen § 1.1's authorization boundary in any other respect (still one named container, still no
  general Docker usage, still no widening of the Kuma carve-out).

## 2. Definition of Done

- [ ] `docs/decisions/20260804-openhands-on-exec01.md` exists with status PROPOSED at PR-open and flips to
  ACCEPTED on Anton's merge.
- [x] `docs/operations/OPENHANDS_DOCKER_ISOLATION.md` exists, naming the dedicated-rootless-Docker-daemon design
  as the § 1.1a hard carve-out condition (2026-08-04, #747).
- [ ] This packet exists with all §§ 1–11 filled in.
- [ ] `docs/operations/MONITORING_ARCHITECTURE.md` § 11.2 has a **pending future packet** row for OpenHands,
  explicitly marked not-live, with the capacity contradiction recorded (see § 6.10 below). § 2 is **not**
  edited to add an active monitor row — there is nothing to monitor yet.
- [ ] `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 has a **pending proposed
  carve-out note** for OpenHands (not a live authorized-table row) pointing at this packet + the ADR, explicit
  that it is NOT authorized until Anton merges the authorization, and that Kuma remains the only *authorized*
  exception until then.
- [ ] `docs/decisions/JOURNAL.md` has a new `JE-2026-08-04-N` stub row recording "OpenHands package proposed,
  not installed."
- [ ] `npm test` passes locally on the PR branch.
- [ ] PR opened against `main`, CI green, awaiting Anton's review (the **AAP § 3 gate** — Anton's merge IS the
  authorization for the carve-out; a **separate** go-ahead is still required before any install command runs).

## 3. Scope

**In scope (this packet):** authorization-only docs change — this packet, the ADR, the pending
`MONITORING_ARCHITECTURE.md` row, the pending `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 note, the
JOURNAL stub. Zero install commands, zero L3 keystrokes, zero OpenHands container bytes on the box. Zero new
env var **values** (names only, already documented in `ops/openhands/.env.example`, which predates this packet
as a reviewed-but-inactive artifact).

**Out of scope (this packet):** running `docker compose up` for OpenHands; any `ssh` to the box; any GitHub
App/PAT creation; any LLM provider account activation; the install runbook's actual execution (it is authored,
not run); any change to the Uptime Kuma carve-out itself.

## 4. Constraints

- Docs-only PR. Zero edits to `api/` / `lib/` / `components/` / `pages/` / `prisma/` / `middleware*` /
  `.github/` / `node-tests/` / `tests/` / `core/engine/` / `.env*` / `vercel.json` / `next.config*` /
  `package*.json` / `tsconfig*`. (Note: `ops/openhands/**` and `scripts/ops/openhands/**` already exist in this
  branch as a **separate, prior** reviewed-but-inactive package — this packet's own diff does not need to
  create or modify them, only reference them.)
- Zero secrets in repo, logs, screenshots, PR body, JOURNAL row.
- Zero L3 commands executed by this packet.
- Zero new public exposure — this packet does not change any bind; the reviewed package already specifies
  `127.0.0.1:3000` only.
- Zero generalization — the carve-out this packet proposes names **OpenHands** specifically, and explicitly
  does not widen Kuma's.

## 5. Risks

| Risk | Blast radius | Mitigation |
|---|---|---|
| Anton approves the carve-out without fully internalizing the Docker-socket-mount risk (§ 3 of the security model) because it is buried in a long doc. | High (uninformed approval of a host-root-equivalent trust decision) | § 1.1's canonical paragraph and this table's row are the top-level flags; `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 3 states the risk in plain language with no euphemism, and the install runbook re-affirms it must be "reviewed and accepted by Anton before the socket mount is uncommented and used" (per `ops/openhands/compose.yaml`'s own header comment). |
| `MONITORING_ARCHITECTURE.md` pending row is misread as "already monitored" or "already live." | Medium (false sense of coverage) | Row is explicitly worded "pending future packet — not live," per § 2 of this packet's DoD — mirrors the Kuma pattern of an explicit not-yet-installed state. |
| The three-way capacity contradiction (§ 6.10) is quietly resolved in favor of whichever number makes install look easiest, without live verification. | Medium (under-provisioned or over-cautious install decision) | Install runbook § 2 makes `scripts/ops/openhands/inspect-host-capacity.sh` (read-only, already in the reviewed package) a mandatory pre-install step; this packet's DoD requires the contradiction be **recorded**, not resolved, here. |
| A future reader mistakes this second carve-out as evidence that "Docker is now generally OK" on the box. | High (governance drift — the exact failure mode `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 warns about) | § 1.1's explicit "does not widen, replace, or reinterpret the existing Uptime Kuma carve-out" sentence; § 9 below restates the non-generalization rule a second time. |
| OpenHands' GitHub credential, once live, is scoped more broadly than intended because a GitHub App was not actually configured with the least-privilege permissions in `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 7.1. | Medium (excess GitHub access) | Install runbook § 12 requires confirming the actual configured scopes before any real dispatch; this is a Gate 3 item in `docs/operations/OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md`, independent of this carve-out. |
| Cost runs past the USD 25/month ceiling before the fail-closed gate is proven to actually work. | Low–Medium (unexpected spend) | `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md` § 4's fail-closed behavior is a required install-time check, not an assumption; synthetic validation packets are run under the ceiling before any production dispatch. |
| A reader approves this packet without registering that § 1.1a's dedicated-daemon condition is a **hard block**, not a nice-to-have, and installs against the primary socket anyway. | High (the exact larger blast radius this follow-up exists to prevent) | § 1.1a states the hard block in plain language; `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` § 6 additionally requires confirming the copied compose file has no primary-socket mount **before** proceeding to Start; `scripts/ops/openhands/verify-sandbox-boundary.sh`'s target behavior (per `OPENHANDS_DOCKER_ISOLATION.md` § 7) is to fail closed on a primary-socket mount. |
| The per-sandbox resource-limit gap (§ 1.1a, `OPENHANDS_DOCKER_ISOLATION.md` § 2.2) is silently treated as accepted just because this packet exists, without Anton's explicit acknowledgment. | Medium (uninformed acceptance of a real resource-exhaustion risk) | § 1.1a requires an explicit, recorded acknowledgment as a condition of APPROVED status — a merged packet with no such record is not a satisfied condition, and the carve-out stays blocked per § 1.1a's own wording. |

## 6. Migration-to-server checklist (`docs/execution/MIGRATION_TO_SERVER_CHECKLIST.md` § 2, addressed as a plan)

This packet adds a proposed recurring server-side surface, so § 2 is addressed here **as a plan for the future
install**, not as evidence of a completed migration (nothing has been installed).

### 6.1 Credential placement

- [x] **Source of truth identified.** LLM API key, GitHub App private key/PAT, optional Telegram bot
  token/chat id (future alerting) — all named-only in `ops/openhands/.env.example`, all real values to live in
  Anton's approved secret store, never in this repo, never typed into chat.
- [x] **Target home chosen.** `$HOME/corpflowai-openhands/.env` on the box (`chmod 600`), derivative of the
  approved secret store — not Vercel env, not GitHub Actions secrets.
- [x] **No credential broadening.** OpenHands holds zero CorpFlowAI production secrets — explicit exclusion
  list already in `ops/openhands/.env.example` and enforced by `scripts/ops/openhands/verify-no-production-access.sh`.
- [x] **Rotation story.** Documented in `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 8 — no values, box-side
  edits + container restart only.

### 6.2 Parameterization / no machine-local state

- [x] No hard-coded Windows paths (the box is Linux). Named directories under `$HOME/corpflowai-openhands/`
  only. No hostnames baked into the compose file beyond `host.docker.internal` (documented, intentional).

### 6.3 Idempotency and safety

- [x] `docker compose up -d` against a pinned compose file is idempotent. Sandbox tasks are per-task, disposable
  — no half-states leak into CorpFlowAI (§ 6 of the security model).
- [x] No destructive default. The package's own scripts (`verify-*.sh`) are designed to fail closed rather than
  proceed on an ambiguous check.

### 6.4 Failure / retry behavior

- [x] Health-check timeout/retries per `ops/openhands/compose.yaml`'s `healthcheck:` block (30 s interval, 5 s
  timeout, 3 retries, 30 s start period).
- [x] Quiet success / loud (future) failure posture documented in
  `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` § 5 — not yet wired to a real alert channel in Phase 1.

### 6.5 Audit trail

- [x] Container logs via `json-file` driver, rotated (`max-size: 10m`, `max-file: 5`) per `compose.yaml`.
- [x] Task-level evidence (branch, commit, PR, model, cost) per
  `docs/execution/OPENHANDS_WORK_PACKET_TEMPLATE.md` § 2's "conditional" completion fields.
- [x] Never logged: secret values, env var values, LLM API responses containing credentials.

### 6.6 Schedule / trigger discipline

- [x] N/A for the control-plane container itself (`restart: unless-stopped`, not a cron). If the future
  `corpflowai-openhands-health.timer` is ever enabled, it requires its **own** review against this checklist's
  § 2.6 at that time — not authorized by this packet.

### 6.7 Rollback plan

- [x] See `docs/operations/OPENHANDS_ROLLBACK_AND_UNINSTALL.md` — stop ≤ 60 s, full uninstall ≤ 5 min, repo-level
  revert independent of box state.

### 6.8 Documentation discipline

- [x] Every doc in this Phase 1 set cross-references the others; `AGENTS.md` is **not** edited by this packet
  (out of the user-specified scope for this round) — a follow-up packet should add the Must-read row if/when
  the carve-out is actually accepted, mirroring the Kuma precedent.

### 6.9 Anti-patterns avoided

- ❌ "We'll fix the socket-mount risk manually later." → No: § 3 of the security model names it as an accepted,
  documented risk requiring explicit sign-off, not a TODO.
- ❌ "It's basically the same as Kuma so it's pre-approved." → No: § 1.1 and § 9 explicitly reject this.

### 6.10 Verification floor (for the future install packet — not this one)

For **this** authorization packet (docs-only): `npm test` passes, `npm run build` passes (sanity — no runtime
change), Delivery Reality Audit not applicable (zero customer-visible behavior change).

**Capacity contradiction — recorded here, not resolved:**

| Source | Claim |
|---|---|
| `MONITORING_ARCHITECTURE.md` § 11.3 (2026-05-27, stale) | `2 vCPU / 2 GB RAM / 38 GB disk` |
| `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.1 (post-resize, authoritative) | `4 vCPU / 7,751 MiB RAM / 150 GB disk` |
| Anton's Beszel-style observation (informal, not live-verified) | ~6 CPU / ~25.7 GiB RAM / ~17–14 GiB headroom |

The install runbook (`docs/operations/OPENHANDS_INSTALL_RUNBOOK.md` § 2) requires
`scripts/ops/openhands/inspect-host-capacity.sh` to be run live **before** any install proceeds — this packet
does not pre-judge which of the three numbers is correct. **The live script output, and only the live script
output, is the install-time capacity source of truth** — none of the three rows above is a substitute, even the
"authoritative post-resize" one, which is itself a documented event, not a live reading at install time.

## 7. Allowed actions (this packet)

- Read-only inspection of the repo (already done).
- Docs updates under `docs/decisions/`, `docs/execution/`, `docs/operations/`.
- Branch creation, `npm test` / `npm run build` for sanity, PR open (no merge by Cursor).

**Not allowed by this packet:** anything in § 3's out-of-scope list; any L3 SSH command; any `docker` command
on the box; any `.env*` edit with real values; any `.github/workflows/*` edit.

## 8. Approval gates

1. **Pre-merge gate (the AAP § 3 gate this packet exists for).** PR opened, CI green, awaiting Anton's review.
   Anton's merge flips the ADR PROPOSED → ACCEPTED and this packet DRAFT/AWAITING_APPROVAL → APPROVED — **that
   merge is the § 5.5 carve-out**, not yet the install.
2. **Pre-install gate (post-merge of THIS packet, separate from it).** The install runbook requires a further,
   explicit, separate Anton go-ahead for the install session itself — mirroring Kuma's two-step
   "packet-merge-is-carve-out, install-is-its-own-gate" pattern.
3. **Pre-secret-change gate.** N/A for this packet (no secrets touched). Becomes active at install time.
4. **Pre-DNS gate.** N/A (no public exposure; loopback-only by design, both in this packet and in the reviewed
   package).
5. **Pre-billing gate.** Active at the point an LLM provider account or GitHub App is actually created/paid —
   not touched by this packet.

**Default rule:** when uncertain whether to stop, stop.

## 9. Explicit non-generalization (re-stated)

- This carve-out, if approved, is for **the OpenHands control-plane container `corpflowai-openhands-app` alone**
  on **`corpflow-exec-01-u69678` alone**. It does not authorize a second OpenHands instance, a different AI
  agent framework, or any tool "similar to OpenHands."
- It does not widen, reinterpret, or piggyback on the existing **Uptime Kuma** carve-out — the two are
  independent named exceptions with independent threat models (Kuma has no Docker-socket mount; OpenHands does
  — see `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 3).
- It is for the reviewed package at `ops/openhands/` **as reviewed** — a materially different compose file,
  image tag, or mount set requires re-review, not a silent substitution under the same carve-out.
- If you are about to write "this is similar to the OpenHands exception, so we can also…" — **stop**. Open a
  new ADR.

## 10. Rollback plan (this packet)

**Repo state (Cursor at L1, ≤ 1 hour):** revert the merge commit. This packet + ADR + pending
`MONITORING_ARCHITECTURE.md` row + pending `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` note + JOURNAL
stub all roll back atomically. No runtime impact — nothing runs because of this packet.

**Live state on the box:** **none changed by this packet.** Nothing has been installed.

## 11. Owner

- **Approver:** Anton.
- **Executor (this packet):** Cursor at L1 (docs-only edits + PR open).
- **Executor (future install, if approved):** Anton at L3 keyboard, per § 5.4 of the boundary doc, pasting
  commands authored in `docs/operations/OPENHANDS_INSTALL_RUNBOOK.md`.
- **Reviewer:** Anton.

---

## Packet status

```text
Packet status:
- State: DRAFT (pre-PR)
- Started: 2026-08-04 (UTC+4)
- Last update: 2026-08-04 (UTC+4)
- Branch: ops/openhands-private-worker-package
- PR: #747 (Docker isolation security follow-up)
- Local checks: npm test = pending; npm run build = pending
- Live URLs tested: n/a (docs-only)
- Deployment ID: n/a
- Verdict: AWAITING_APPROVAL — § 1.1a (dedicated Docker daemon hard block + explicit per-sandbox gap
  acknowledgment) is a NEW condition as of this round and is not yet satisfied by anything short of Anton's own
  explicit acknowledgment at merge time.
- Notes: This packet does NOT install OpenHands. Anton's merge of this packet + the companion ADR is the § 5.5
  carve-out; a further, separate, explicit go-ahead is required before any command in
  docs/operations/OPENHANDS_INSTALL_RUNBOOK.md is run. As of this round, the carve-out ALSO requires (§ 1.1a)
  that the reviewed package implement the dedicated-rootless-Docker-daemon design in
  docs/operations/OPENHANDS_DOCKER_ISOLATION.md — a primary-socket mount is an automatic hard block, not a
  finding to note and proceed past.
```

## Change log

- **2026-08-04** — Packet authored (DRAFT → PENDING ANTON APPROVAL) alongside the companion ADR
  `docs/decisions/20260804-openhands-on-exec01.md` and the full Phase 1 documentation set for #743. No runtime,
  no L3, no secrets, no `.env.template`, no `vercel.json`, no CI workflow changes.
- **2026-08-04 (PR #747, Docker isolation follow-up)** — Added § 1.1a: the dedicated-rootless-Docker-daemon
  design (`docs/operations/OPENHANDS_DOCKER_ISOLATION.md`) is now a **hard carve-out condition** — a
  primary-socket mount at install time is out of scope for this authorization, and the disclosed per-sandbox
  resource-limit gap requires Anton's explicit, recorded acceptance before APPROVED status is meaningful. Added
  two new risk rows (§ 5) and a DoD checkbox confirming the isolation doc exists. No installation. No carve-out
  granted by this round of edits — status remains AWAITING_APPROVAL / PENDING ANTON APPROVAL.
