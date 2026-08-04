# OpenHands install runbook (Phase 1 package — operator runbook)

**Status: INSTALLATION NOT AUTHORIZED.** This runbook describes the steps an operator (Anton, at an L3 SSH
keyboard, per `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.4) would follow **if and
only if**:

1. `docs/decisions/20260804-openhands-on-exec01.md` (ADR) flips PROPOSED → ACCEPTED on Anton's merge, **and**
2. `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` flips AWAITING_APPROVAL → APPROVED on Anton's
   merge, **and**
3. Anton gives a separate, explicit **go** for this specific install session (the ADR + packet merge is the
   carve-out; the install itself is Gate 2 of `docs/operations/OPENHANDS_IMPLEMENTATION_AND_OPERATIONS_RUNBOOK.md`).

None of the three conditions above are satisfied as of 2026-08-04. **Do not run any command in this runbook
against `corpflow-exec-01-u69678` (or any host) until all three are true.**

**Controlling issue:** [#743](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/743) · **Parent:** [#661](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/661)

**Companion docs:**

- `docs/operations/OPENHANDS_ARCHITECTURE.md` — target flow this runbook installs.
- `docs/operations/OPENHANDS_SECURITY_MODEL.md` — threat model referenced throughout.
- `docs/operations/OPENHANDS_OPERATING_RUNBOOK.md` — day-to-day operation once (if) installed.
- `docs/operations/OPENHANDS_ROLLBACK_AND_UNINSTALL.md` — the reverse of every step below.
- `ops/openhands/README.md`, `ops/openhands/compose.yaml`, `ops/openhands/VERSIONS.md`, `ops/openhands/.env.example` — the reviewed package this runbook installs.
- `docs/execution/OPENHANDS_SYNTHETIC_VALIDATION_PLAN.md` — the five packets used at § 12 below.
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

---

## 1. Prerequisites

- [ ] ADR `docs/decisions/20260804-openhands-on-exec01.md` status = ACCEPTED.
- [ ] Authorization packet `docs/execution/OPENHANDS_ON_EXEC01_AUTHORIZATION_PACKET.md` status = APPROVED.
- [ ] `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.5 has a **second** named row for OpenHands (not
  just the pending-proposal note this Phase 1 packet adds — an actual merged carve-out row).
- [ ] Anton has given an explicit separate go-ahead for the install session itself.
- [ ] Anton has a scoped GitHub credential ready (fine-grained PAT or GitHub App install — see
  `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 5) and an LLM API key or ChatGPT subscription login ready in
  his approved secret store — never typed into this runbook.
- [ ] This runbook is on `main` (or the approved merge SHA) on the box's repo clone.

## 2. Capacity inspect (mandatory, before any install decision)

Reconciles the three-way contradiction recorded in `docs/operations/OPENHANDS_ARCHITECTURE.md` § 5.1.

```bash
cd ~/corpflow-ai-command-center   # or wherever the box's clone lives
git pull
bash scripts/ops/openhands/inspect-host-capacity.sh > /tmp/openhands-capacity-report.md
cat /tmp/openhands-capacity-report.md
```

This script is **read-only** — safe to run even before Anton's approval, and safe to run repeatedly. Compare its
CPU/RAM/disk output against:

- the historical `2 vCPU / 2 GB` row in `MONITORING_ARCHITECTURE.md` § 11.3 (expected to be **wrong** — stale),
- the authoritative post-resize `4 vCPU / 7,751 MiB` row in `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 5.1,
- Anton's informal Beszel-style observation (~6 CPU / ~25.7 GiB).

**Decision rule:** proceed only if the live figure has **at least** the v1 ceiling headroom from
`OPENHANDS_ARCHITECTURE.md` § 5 (~3 CPU / ~8 GiB) available **above** every other workload already running on
the box (Uptime Kuma, ERPNext sandbox/production-shell if present, restic jobs, the repo clone's own `npm ci` /
`npm test` runs). If the live figure is lower than the historical stale row, **stop** — something is wrong with
either the script or the host, and that is worth a JOURNAL row before continuing.

## 3. Directories and permissions

```bash
mkdir -p "$HOME/corpflowai-openhands/state"
mkdir -p "$HOME/corpflowai-openhands/workspace"
chmod 700 "$HOME/corpflowai-openhands" "$HOME/corpflowai-openhands/state" "$HOME/corpflowai-openhands/workspace"
```

Named, dedicated directories only — never a bind mount of the operator's home directory root or an existing
project checkout, per `ops/openhands/compose.yaml`'s inline comments.

## 4. Image pull (pinned tags only)

```bash
docker pull docker.openhands.dev/openhands/openhands:1.8
docker pull ghcr.io/openhands/agent-server:1.26.0-python
docker image inspect docker.openhands.dev/openhands/openhands:1.8 --format '{{.Id}}'
docker image inspect ghcr.io/openhands/agent-server:1.26.0-python --format '{{.Id}}'
```

Confirm both tags pulled match `ops/openhands/VERSIONS.md`. **Never** pull or reference `latest`. If upstream
docs show different recommended pins at install time, stop and update `VERSIONS.md` first (its own pin policy
requires this).

## 5. Config

```bash
REPO="$HOME/corpflow-ai-command-center"
cp "$REPO/ops/openhands/compose.yaml" "$HOME/corpflowai-openhands/compose.yaml"
cp "$REPO/ops/openhands/.env.example" "$HOME/corpflowai-openhands/.env"
chmod 600 "$HOME/corpflowai-openhands/.env"
```

If `config/openhands/config.example.toml` exists in the package at install time, copy it the same way into
`$HOME/corpflowai-openhands/config.toml` and edit **on the box only**.

## 6. Secret entry (placeholders only — no values in this runbook)

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

## 7. Start

```bash
cd "$HOME/corpflowai-openhands"
docker compose -p corpflowai-openhands up -d
docker ps --filter 'name=corpflowai-openhands' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'
```

Expected `PORTS` column for the app container: `127.0.0.1:3000->3000/tcp`. If it shows anything else (a public
address, no address, a different port), **stop and roll back** — do not proceed to § 9.

## 8. Health

```bash
bash scripts/ops/openhands/health-check.sh
```

Expected: silent success (exit 0, minimal output) when healthy; noisy, explicit failure output when not — per
the operating runbook's "silent success / exception" monitoring posture (§ 9 of
`docs/operations/OPENHANDS_OPERATING_RUNBOOK.md`).

## 9. Private-bind verification (mandatory before any further step)

```bash
# On box:
curl -fsS --max-time 5 -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/
# Expect 200 or a login/redirect code — not "connection refused"

bash scripts/ops/openhands/verify-private-bind.sh
```

```bash
# Off box (operator's phone tether or a different network) — must FAIL to connect:
curl -I --connect-timeout 8 http://<EXEC01_PUBLIC_IP>:3000
# Expect timeout / connection refused — the same class of K2 signal proven for Uptime Kuma
```

## 10. Persistence

```bash
docker compose -p corpflowai-openhands restart corpflowai-openhands-app
sleep 15
docker ps --filter 'name=corpflowai-openhands' --format 'table {{.Names}}\t{{.Status}}'
```

Confirm the container comes back healthy and that any conversation/task state created before the restart is
still visible in the UI (via the SSH tunnel) — proves the named volumes
(`corpflowai-openhands-state`, `corpflowai-openhands-workspace`) survive a container restart, not just a
process restart.

## 11. Sandbox boundary verification

```bash
bash scripts/ops/openhands/verify-sandbox-boundary.sh
```

Expected: fails (non-zero) if the compose config or a spawned sandbox uses `privileged: true`, host networking,
or a mount broader than the named, dedicated workspace volume. This check exists **because** the Docker-socket
mount is an accepted, documented risk (see `docs/operations/OPENHANDS_SECURITY_MODEL.md` § 3) — the script
verifies the *rest* of the boundary stays tight even though the socket itself cannot be fully sandboxed.

## 12. GitHub

Once a scoped GitHub App or fine-grained PAT is installed (per
`docs/operations/OPENHANDS_SECURITY_MODEL.md` § 5), confirm from the OpenHands UI (via the SSH tunnel) that it
can read `antonvdberg-bit/corpflow-ai-command-center` issues and open a branch — **do not** yet let it open a
real PR until § 14 (synthetic task).

## 13. Model

Confirm the configured LLM provider (per `docs/operations/OPENHANDS_MODEL_AND_COST_POLICY.md`) responds to a
trivial prompt from inside the OpenHands UI. Record which provider/model was used — never the API key — in the
evidence capture at § 15.

## 14. Synthetic task

Run **exactly one** packet from `docs/execution/OPENHANDS_SYNTHETIC_VALIDATION_PLAN.md` (packet 1,
"Documentation correction," is the recommended first run — lowest risk). Confirm:

- a real branch name matching the `openhands/*` prefix convention (per
  `docs/operations/OPENHANDS_OPERATING_CHARTER.md` as updated by this packet),
- a real commit,
- a **draft** pull request (never a ready-for-review or auto-merge PR),
- CI runs the same as any other PR.

## 15. Evidence

```bash
bash scripts/ops/openhands/collect-sanitized-evidence.sh > /tmp/openhands-install-evidence.md
```

Record in a JOURNAL row and a bridge #249 STATUS comment (no secret values, ever):

- container names + statuses + ports (loopback only),
- image digests pulled,
- capacity report from § 2,
- the synthetic task's branch name, commit SHA, and draft PR URL,
- model/provider name used (not the key),
- cost recorded for the one synthetic task (if the provider surfaces it).

## 16. Failure

If any step above fails or produces an unexpected result:

1. **Stop.** Do not proceed to the next section.
2. Do not attempt to "fix forward" by loosening a boundary check (e.g. do not remove
   `verify-private-bind.sh` from the flow because it failed — that is the check working as intended).
3. Run `docs/operations/OPENHANDS_ROLLBACK_AND_UNINSTALL.md` § 2 (stop) at minimum; go to § 3 (full uninstall)
   if the failure suggests a boundary violation (e.g. a public port was briefly bound).
4. Post a `HOST_MISMATCH`-style STATUS to #249 if the failure is about *where* something ran rather than *what*
   happened, per `SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` § 7.

## 17. Rollback

See `docs/operations/OPENHANDS_ROLLBACK_AND_UNINSTALL.md` § 2 for the ≤ 60 s stop path and § 3 for the full
uninstall path. Both are scoped to `corpflowai-openhands*` resources only.

## 18. Uninstall

See `docs/operations/OPENHANDS_ROLLBACK_AND_UNINSTALL.md` § 3–§ 5.

---

## 19. Change log

- **2026-08-04** — Initial runbook authored alongside the Phase 1 documentation set for #743. No execution.
  Installation remains **NOT AUTHORIZED** — see the status banner at the top of this file.
