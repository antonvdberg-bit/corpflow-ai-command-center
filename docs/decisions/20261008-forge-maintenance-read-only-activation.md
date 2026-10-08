# ADR: bounded read-only Forge maintenance activation

Date: 8 October 2026. Source: Anton's 08:20 Mauritius instruction to proceed and drive #1423 to completion ASAP. Scope is the prepared unattended checker, not production upgrades/reboots or complete-estate recovery acceptance.

Decision: reuse the existing host scheduler, localhost Ollama model, existing Forge contracts and Monitor #14 failure notifier. Install one root-owned fixed read-only collector and a reviewer launched as anton. Forge receives only task IDs/verdicts and no tools, credentials, logs, Docker socket or root shell. Inference is deferred below 6 GiB available RAM; it retains the existing 4 GiB/3 CPU model cage and the 2 GiB production reserve.

Exact runtime targets:
- /usr/local/lib/corpflowai-maintenance/forge-maintenance-collect.py
- /usr/local/lib/corpflowai-maintenance/forge-maintenance-review.py
- /var/lib/corpflowai-maintenance/evidence.json and status.json, root-owned sanitized readable receipts
- /etc/systemd/system/corpflowai-forge-maintenance-collect.service and .timer: 18:00 UTC / 22:00 Mauritius, no randomized/daytime catch-up; 300-second global timeout, low CPU/I/O priority, 128 MiB collector/reviewer memory cap
- Existing /home/anton/.local/bin/corpflowai-ops-backup-health-check.sh: add maintenance receipt failure/36h freshness and prolonged (>48h) resource-deferral checks, preserve all ERP/laptop/restic checks and notifier dedup

Threat model: only fixed commands, no shell-generated execution, Docker metadata formatted without environment/config output, no raw journal messages, strict output bounds and exact model-verdict comparison. Model execution is unprivileged and localhost only. Root atomically publishes sanitized status. No new network endpoint, secret, bot, dashboard or second memory database.

Validation: 14 local fixtures passed; server staging validates the same tests, Bash syntax, unit files and current checker hash before installation. Runtime checks/next-run evidence and rollback state must be recorded before claiming activation. Resource deferral is explicitly not Forge PASS.

Rollback: staged root-only directory /root/corpflowai-maintenance-stage-20261008 preserves prior checker and target existence metadata. Disable/remove only the new timer/service, restore the saved checker with anton ownership/mode, restore/remove only this packet's program files, daemon-reload; preserve status evidence and all existing backup data/jobs. Installation failure rolls back the same exact changes. No application service restart.

Excluded: updates, OS timer retiming, Ollama restart-policy change, migrations, production restore, ops backup expansion, port/firewall/DNS/secret changes, payments/outreach, paid services, merge or hosted retirement. Those remain separate bounded actions. Entire maintenance remains PARTIAL until remaining recovery and service exceptions are resolved.
