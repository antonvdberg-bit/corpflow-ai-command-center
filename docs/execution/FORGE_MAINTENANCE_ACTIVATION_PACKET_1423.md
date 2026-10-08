# CODEX_PACKET_V1 — activate bounded Forge maintenance checks

Purpose:
Implement the missing unattended read-only maintenance evidence path identified in #1423. Preserve the existing Forge contracts and alert route.

Business outcome:
Remove recurring operator inspection work while detecting missed checks and protecting the working server. This activates daily checking only; it does not declare full-estate DR or the ERP migration complete.

Linked issue or ticket:
#1423; documentation PR #1424; current Forge baseline #1367/#1373; ERP backup evidence PR #1420.

Target branch suggestion:
impl/forge-maintenance-checks-1423. One implementation owner/claim. No parallel implementation while another executor owns this packet.

Concrete implementation need and routing:
Existing deterministic backup/health jobs do not collect full-host maintenance evidence or execute Forge verification. Live localhost inference is reachable, but no unattended maintenance runner/unit was found in bounded inspection. Forge's current LOW-tier contracts cannot safely implement privileged server integration. Controller completed inspection, contract preparation and doctrine reconciliation directly. Multi-file runner, scheduling, sanitization and alert integration require a bounded implementation executor; this is not a reason to create another control plane. Existing Forge may supply synthetic fixtures under its approved contracts, never host administration. Check current WIP/capacity before any Cursor dispatch; no automatic high-cost escalation.

Target files (implementation proposal, not installed):
- scripts/ops/forge-maintenance-collect.py
- scripts/ops/forge-maintenance-review.py
- scripts/ops/forge-maintenance-install.py
- scripts/ops/systemd/corpflowai-forge-maintenance-collect.service
- scripts/ops/systemd/corpflowai-forge-maintenance-collect.timer
- scripts/ops/tests/test_forge_maintenance.py
- scripts/ops/backup-health-check.sh (only narrow missing/stale/failed maintenance receipt integration; preserve all current checks)
- docs/operations/FORGE_SERVER_MAINTENANCE_WORKLOAD_V1.md
- docs/decisions/20261008-forge-maintenance-read-only-activation.md
- docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md (only named exception for this concrete read-only surface)
- docs/operations/MONITORING_ARCHITECTURE.md (existing monitor extension, no new monitor/bot)
- AGENTS.md (discovery link to workload, no global authority expansion)

Do not start from main's old backup-health checker blindly: reconcile the current installed/versioned laptop acknowledgement extension in PR #1420 first. Its current observed hash is 87061c0241ca7296e21e4ab76803570b58c36fe9452b1563b4c18498812ed40d. Preserve both ERP and laptop status rules and notifier timeout/dedup corrections.

Patch or full file contents — implementation contract:
1. Collector: hostname guard corpflow-exec-01-u69678; fixed read-only command allowlist, absolute binaries, no shell=True. Per-command ≤20 seconds; global ≤90 seconds. Capture numeric host metrics, failed-unit identifiers/result codes, expected service/container health/restart counts, resource limits, sanitized backup statuses, approved public endpoint GET/TLS results and exact observation IDs/times. No inspect of environment variables, credentials, config contents or raw application logs. A bounded root collector may read Docker metadata; Forge itself receives no Docker socket or root capabilities.
2. Output: root-owned /var/lib/corpflowai-maintenance, permission-separated sanitized current evidence readable by anton; atomically published only after validation, no symlink traversal or user-chosen command/path. Preserve prior completed receipt on failure. Keep 30 sanitized runs with a size cap; no live service or backup data pruning.
3. Forge reviewer: run as anton, use existing localhost Ollama and selected qwen2.5-coder:7b-instruct-q2_K model with existing 4 GiB/3 CPU cap; no model change/pull. Existing FORGE_PARSE_LOG then FORGE_VALIDATE_PACKET contracts, 60/30-second limits, at most two attempts total per contract, one job lock. No executed generated commands. Exact schema/source ID/due-task/threshold comparison controls acceptance. Record model/tokens/elapsed/resources where measurable; null is allowed, invented figures are not.
4. Load guard: actual/proven model resident-memory estimate plus ≥2 GiB headroom before inference; monitor availability and existing service probes. If sufficient headroom cannot be demonstrated, publish DEFERRED_RESOURCE rather than load the model. Never overlap inference with ERP restore, repository integrity work or another Forge job. Deterministic checks remain useful without inference; partial/deferred model review must not become Forge PASS.
5. Daily systemd timer: OnCalendar=*-*-* 18:00:00 UTC (22:00 Mauritius), RandomizedDelaySec=0, Persistent=false. Global task timeout five minutes; no day-time catch-up. Missed runs are surfaced by independent existing health check. Use a bounded privileged collector followed by an unprivileged reviewer, not a root model process. Low CPU/I/O priority. Do not create a new daemon, framework, remote SSH credential or paid dependency.
6. Evidence status: collection and Forge review results distinct; record each due daily task PASS/FAIL/BLOCKED/DEFERRED with observed evidence and one owner/next action. Weekly/monthly obligations may be assessed for due status, but this runner cannot execute upgrades, restores, reboots or repairs.
7. Alert integration: reuse existing failure-only Monitor #14/dedup; missing/malformed receipt or collection older than 36 hours fails, latest collection failure fails, model deferral is explicit and escalates only after an agreed bounded prolonged condition. Sanitize failure classes, never send raw model/log output. Independent checker must detect a job that never ran; it cannot rely only on runner self-alert. Existing healthy statuses stay silent.
8. Installer: prepare-only default. Verify exact host, all expected current hashes, installed paths and scheduler state; validate files, permissions, unit syntax and tests; back up touched files and record rollback before mutation. Any apply requires recorded exact consequential authorization. On failure restore only this packet's files/scheduler/checker state; preserve receipts and backups.
9. ADR/threat model: privileged collector/unprivileged model separation, sanitized files, fixed allowlist, local-only inference, time/resource guards, exact paths, no new secret. Governance docs must name this exception and preserve every unrelated hold.
10. Do not alter OS update timers, Ollama restart policy, live update set, backup inclusion or alert credentials within this first implementation. Those have separate exact plans; including them would expand the packet and block acceptance.

Verification commands:
- python3 -m unittest discover -s scripts/ops/tests -p 'test_forge_maintenance.py'
- python3 -m py_compile scripts/ops/forge-maintenance-collect.py scripts/ops/forge-maintenance-review.py scripts/ops/forge-maintenance-install.py
- bash -n scripts/ops/backup-health-check.sh
- systemd-analyze verify scripts/ops/systemd/corpflowai-forge-maintenance-collect.service scripts/ops/systemd/corpflowai-forge-maintenance-collect.timer
- node scripts/forge-validate-packet.mjs <sanitized synthetic test packet>
- Existing ERP/laptop backup-health fixtures must remain green.
All commands above are pre-apply validation; never claim these passed without actual execution.

Required acceptance:
- Synthetic fixtures: normal/degraded host, missing/stale/future receipt, failed collector, invalid model JSON, invented source ID, secret-like input rejection, two-attempt cap, resource deferral, lock contention, mid-run timeout, atomic old-good receipt retention and timezone/no daytime catch-up.
- Before live apply, exact reviewed diff and authorized install receipt.
- After authorized apply: one real collection and bounded Forge review, no production regression, timer next-run evidence, missing-run/failure delivery through existing notifier, normal health exit 0, privileged/unprivileged separation verified.
- Full live Forge PASS requires actual deterministic verified model response; installed timer alone is insufficient.
- If host lacks inference headroom, safely defer; do not upgrade hardware/model or weaken guard.
- Weekly/monthly/quarterly execution remains separate until each approved operation is evidenced.

Expected PR title:
Activate bounded read-only Forge maintenance checks and existing failure alerts (#1423).

Explicit non-actions:
No model/framework/paid service, no port/firewall/DNS/access or secrets change, no production DB/schema/data change, no package upgrade or service restart/reboot, no live restore, no workflow/payment/message trigger, no merge/deploy or billing cancellation. No direct API key export. No competing Cursor lane or second memory database.

Warnings / assumptions:
Desktop Commander laptop SSH inspection works, but server-local recurring execution is unproven. Ollama restart=no is a separate boot-recovery issue. Ops-volume backup coverage is incomplete. The first implementation does not fix all listed maintenance tasks. Existing ADR/surface documentation and exact apply boundary must be satisfied before introducing server-native scheduling.

Stop condition:
Reviewable, verified implementation PR and exact apply/rollback evidence packet; stop before unapproved server installation or merge. If current packet cannot be implemented within the file list or existing authority, return one exact blocker on #1423. Do not ask Anton to paste repeated commands.
