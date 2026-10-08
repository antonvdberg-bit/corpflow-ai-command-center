# Forge maintenance runner — activation packet

Status: review-ready, prepare-only. This packet does not authorize installation,
enablement, model changes, credential changes, or server access changes.

## Design

The collector is a bounded, read-only process with an exact hostname guard and
absolute command allowlist. It emits numeric evidence only. The reviewer runs
as the unprivileged `anton` user, validates the collector receipt, acquires the
single `forge-capacity.lock` lease, checks memory/load and the ERP restore
exclusion marker, then optionally calls the already-installed local Ollama
model. Model output is parsed as JSON and never executed; two attempts is the
hard cap. Collection and review statuses remain separate in the atomic receipt.

Monitor #14 remains the failure-only alert owner. A missed-run freshness check
must consume this receipt through the existing Monitor #14 path; no new bot or
monitor is introduced by this packet.

## Prepare-only verification

From the checked-out repository:

```bash
python3 scripts/ops/forge-maintenance-install.py \
  --repo-root "$PWD" \
  --manifest /tmp/forge-maintenance-install-manifest.json
```

The command records host, exact file hashes, expected state path, and rollback
steps. It refuses `--apply`.

## Separately approved server activation commands

Run only after the exact protected approvals listed below are recorded:

```bash
install -d -m 0750 /home/anton/.local/state/corpflowai/forge-maintenance
install -d -m 0750 /home/anton/.local/state/corpflowai/forge-maintenance/history
install -m 0644 scripts/ops/systemd/corpflowai-forge-maintenance.service \
  /home/anton/.config/systemd/user/corpflowai-forge-maintenance.service
install -m 0644 scripts/ops/systemd/corpflowai-forge-maintenance.timer \
  /home/anton/.config/systemd/user/corpflowai-forge-maintenance.timer
systemctl --user daemon-reload
systemd-analyze --user verify corpflowai-forge-maintenance.service corpflowai-forge-maintenance.timer
systemctl --user enable --now corpflowai-forge-maintenance.timer
systemctl --user status corpflowai-forge-maintenance.timer --no-pager
```

The service is `Persistent=false`, scheduled at 18:00 UTC (22:00 Mauritius),
uses a five-minute outer timeout, low CPU/I/O priority, and no root, Docker
socket, secrets, raw logs, or client data. The commands above are not executed
by this PR.

## Rollback

```bash
systemctl --user disable --now corpflowai-forge-maintenance.timer
rm -f /home/anton/.config/systemd/user/corpflowai-forge-maintenance.timer \
  /home/anton/.config/systemd/user/corpflowai-forge-maintenance.service
systemctl --user daemon-reload
```

Preserve the receipt history for incident review. Restore the prior unit/script
copies from the activation backup only if the preflight manifest identifies
them. Removing the timer does not remove existing backup-health Monitor #14.

## Remaining gates

- Anton approval for server installation and timer enablement.
- Operator confirmation that the `anton` user owns the checked-out path and
  that the Ollama endpoint/model already exists; no model pull is included.
- Operator confirmation of the ERP restore/recovery exclusion marker contract.
- Existing Monitor #14 owner must wire the independent freshness check using
  sanitized receipt fields only.
- Human merge approval and subsequent test-host/server verification remain
  separate from this implementation PR.
