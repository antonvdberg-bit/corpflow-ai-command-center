# Forge server maintenance workload v1

Version: 2026-10-08-v1. Work owner: Forge; controller/acceptance: ChatGPT; consequential approvals: Anton. Work lineage: [#1423](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1423). Related evidence: completed host maintenance #1347 and ERP recovery draft PR #1420.

Status: **READ-ONLY SERVER CHECKER ACTIVE; whole-estate maintenance PARTIAL.** The bounded server collector and existing-alert extension are installed. OS retiming, disruptive updates, complete-estate recovery and an accepted Forge model review remain outstanding. A scheduled task is not proof of execution.

Recurring controller oversight was created and enabled on 8 October 2026 at 07:45 Mauritius, with daily flexible scheduling around 22:00, starting tonight. It reads #1423 and this branch (main after merge), records changed evidence only and remains exception-only for operator notifications. The hosted task has no first-run receipt yet. The prepared Forge envelope passes the existing registry validator; sanitized input is explicitly not attached, so this is format compatibility, not a claimed Forge run.

## Standing requirement

This is a mandatory repetitive workload requested by Anton on 8 October 2026. Every due task must finish with PASS, FAIL, BLOCKED or DEFERRED plus evidence, owner and next action. Silence, a missed run, a green model response or an unchecked box is not completion. Keep the standing issue open while the environment operates. Deduplicate each occurrence by task ID, local due date and host. No duplicate executor claim.

Use deterministic checks first. Forge uses the existing `FORGE_PARSE_LOG` and `FORGE_VALIDATE_PACKET` contracts to interpret sanitized evidence and validate completion. No new Forge root-administration contract is created. Patching, restarts and restore execution belong to an authorized deterministic runner/operator, never model-generated shell execution.

## Scope and current inventory

| Environment | Maintenance coverage | Current evidence / limitation |
|---|---|---|
| Ubuntu host `corpflow-exec-01-u69678` | OS/kernel, disk/inodes, memory/swap, clock, services, SSH, fail2ban, updates and boot recovery | Live read-only inspection on 8 October 03:39 UTC; 7.6 GiB RAM, 5.3 GiB available, 35 MiB swap, 101 GiB disk free; no reboot-required flag; 23 cached upgradable packages, not yet classified |
| Docker engine and every discovered project | Health/restarts, pinned image identity, mounts, restart policies, resource limits and configuration drift | Inventory includes recovered ERP, original v15 ERP, Ollama, Nebula, Beszel and Kuma; redis/mariadb health checked separately |
| Recovered ERPNext / Frappe | HTTPS, database/Redis/websocket, backup freshness, files/config keys, restoration, integration target drift | `https://erp.corpflowai.com`; v16.50.0; workers absent and scheduler disabled intentionally; a daily server and laptop backup plus isolated restore are proven in PR #1420 |
| Original v15 ERP project | Availability/inventory, isolation and resource cost | Preserve until an explicit retirement decision; do not enable/disable its existing workers or overwrite it |
| Caddy / DNS / TLS | Endpoint behavior, expiry, renewal errors, proxy target and unexpected exposure | Caddy active/enabled; aggregate access logging not configured in inspected Caddyfile; no measured quiet-hours claim |
| Nebula / private administration | VPN/SSH reachability, boot recovery and certificate expiry | Existing private route through laptop Git SSH; public fallback must be verified before a network/reboot change, not assumed |
| Ollama / Forge | Private exposure, resource cage, bounded contract success, model pinning, idle behavior | Existing LOW-tier worker; no automatic latest-model pull or promotion |
| Uptime Kuma / Beszel | Health, data/config recovery, alert independence and capacity history | Live healthy; ERP backup does not establish their database/volume recovery coverage |
| Borg / ERP backup / laptop recovery | Artifact membership, manifests, encryption, retention, freshness, usable restore and independent keys | Existing destination and alert route; seven managed server runs, remote 7-day retention; four laptop slots; offline emergency key escrow unresolved |
| Ops restic heartbeat | Snapshot freshness, repository integrity and exact scope | Small ops-data heartbeat; do not count it as full estate backup; documented retention-unit discrepancy remains unresolved |
| Core / Vercel / Neon | Safe health probes, exact deployed revision, provider incidents, backup window and recovery evidence | External dependencies; actual Neon history window/restore drill and authenticated Core→ERP consumer proof remain unverified |
| n8n, separate host | Reachability, queued/failed executions, DB/workflow/credential-key backups, version and restore | Exact current management access and recovery coverage unverified; never trigger a webhook as a health probe |
| Any newly discovered service/host | Owner, purpose, dependency, version, health probe, backup, restore and retirement status | Mandatory inventory addition; UNKNOWN is not silently excluded from estate status |

Temporal appeared in September historical evidence but was not present in the current running-container list. Its current existence/retirement must be reconciled; absence from `docker ps` alone is not proof of retirement. OpenHands is retired and must not be reintroduced.

## Schedule — Indian/Mauritius (UTC+04:00)

This is a provisional low-activity schedule. Anton works from 02:00; no disruptive job should spill into that period. Client geographies, workflows and live activity override the clock. Collect at least 14 days of aggregate hourly activity/headroom using existing telemetry; do not enable raw client/session logging to obtain it. If suitable activity evidence is unavailable, run read-only checks and defer disruption.

| Work | Mauritius time | Server UTC | State |
|---|---|---|---|
| Mandatory controller review / Forge evidence workload | Daily around 22:00, hosted review may start within an hour | Approximately 18:00–19:00 | Controller automation; verify individual execution receipts |
| Weekly deep checks and approved maintenance window | Sunday 23:00–23:45 | Sunday 19:00–19:45 | Reserved execution window; new server-local execution not activated |
| Monthly isolated ERP restore / wider DR coverage audit | First Sunday, replaces weekly window | First Sunday 19:00–19:45 | Requires reusable isolated verifier, fresh backup, capacity and authorized runner |
| Quarterly boot/DR recovery exercise | First Sunday Jan/Apr/Jul/Oct, replaces weekly/monthly window | Same window | Exact reboot/restore plan and recovery access required; never automatic host reboot |
| Existing journal housekeeping | Daily 00:02 | Previous day 20:02 | Existing root cron preserved |
| Existing weekly housekeeping | Monday 01:02 | Sunday 21:02 | Existing root cron preserved |
| Existing full ERP→remote Borg backup | Daily 05:00 | 01:00 | Active; server-independent from laptop |
| Existing laptop copy | Daily 05:30, login catch-up/retries | 01:30 | Active; signed-in laptop/VPN required |
| Existing backup health / restic heartbeat | Approximately 11:15 / 07:30, with timer jitter | 07:15 / 03:30 | Existing checks preserved; failure paths must remain independent of Forge |

First reserved weekly window: **11 October 2026 23:00 Mauritius**. First monthly window: **1 November 2026 23:00**. Do not run overlapping weekly/monthly/quarterly heavy jobs; the broader due bundle replaces the smaller one. A recovery drill and production patch/reboot must not compete for the same host window.

Observed OS upgrade timer next activation was 06:19:53 UTC / 10:19:53 Mauritius. APT periodic package-list refresh and unattended upgrade are enabled. Exact origin selection, restart/reboot policy and timer jitter still need review. Prepare a bounded retiming plan into the approved quiet window; do not disable existing security protection or silently change timers in this package. Built-in housekeeping/backup schedules remain authoritative until exact changes are applied and evidenced.

## Mandatory task catalogue

| ID / cadence | Required work and PASS evidence | Executor / escalation |
|---|---|---|
| D01 daily | Host health: capacity/inodes, load, swap-in/out trend, OOM count, clock, failed units and reboot flag. Compare against baseline, not cosmetic swap usage | Deterministic collector; Forge parses sanitized output; controller classifies incidents |
| D02 daily | All expected services/containers, health, unexpected stop/restart and new project drift. Check recovered scheduler/workers against intended disabled baseline | Collector; no automatic restart; one exact repair packet |
| D03 daily | ERP backup outcome/remote verification ≤36h; laptop acknowledgement ≤7d; exact configured retention and recent manifests. Distinguish missed job from failed job | Existing backup wrapper/health checker; alert through existing Monitor #14 |
| D04 daily | Safe GET endpoint/TLS checks for ERP, Core and currently approved client hosts, plus private service health; timestamp/status/expected marker. Endpoint alone does not prove authenticated business flow | Existing monitors; no order/payment/message/quotation write or workflow trigger |
| D05 daily | Review bounded sanitized errors and delivery state of existing failure notifier. Incident classification with source IDs; no raw logs/PII/secrets supplied to Forge | FORGE_PARSE_LOG; at most two attempts; escalate ambiguity |
| D06 daily | Workload receipts: every task due has evidence or explicit blocker/deferment, retries capped, no duplicate active claim. Missing fresh evidence cannot be PASS | FORGE_VALIDATE_PACKET; controller owns acceptance |
| W01 weekly | Updates/version drift: cached OS/security backlog, supported-version status, pinned images/digests, restart impact and compatibility. Separate base OS from Docker/network/DB/runtime updates | Forge validates plan; authorized operator applies exact approved batch only |
| W02 weekly | Security/access drift: failed login counts, expected privileged identities, SSH/fail2ban/VPN status, listening-port changes, certificate expiry, secret-reference validity without secret values | Read-only collector; no firewall/account/key changes by Forge |
| W03 weekly | Capacity/storage growth and 30-day projection, logs/container writable-layer sizes, backup storage and retention. Enumerate candidates for bounded cleanup with exact retention/protection exclusions | Deterministic analysis; no blanket prune, volume delete, cache flush or swap reset |
| W04 weekly | Backup coverage matrix for every service/host; data, config, deployment recipe and key access. Refresh exact destination/inventory evidence and schedule conflicts | Forge validates missing evidence; controller owns one remediation item per gap |
| W05 weekly | Read-only backup repository metadata/integrity checks appropriate to current tool scope; record lock conflicts, check age, last successful restore and corruption | Existing trusted wrapper with approved secret injection; no Forge credentials; resource/time gates |
| M01 monthly | Isolated restore of an actual recent laptop/off-server ERP package: 4 artifacts+manifest, checksum, expected record IDs/counts, file hashes, config keys, no ports/egress/workers, cleanup verified | Authorized deterministic runner; versioned repeatable verifier required; the dated October script is not an unattended monthly runner |
| M02 monthly | Rotate wider recovery proof across host configuration/Nebula/Caddy, Kuma/Beszel and external Core/n8n once exact scope/access is approved. Keep incomplete systems visible | Controller inventories; no production DB dump/restore or new destination assumed |
| M03 monthly | Independent recovery-key route, certificate renewal state, alert-path delivery exercise when authorized, retention/key dependency review and recovery instructions | No secret value to Forge; preserve historic key while retained backups depend on it |
| Q01 quarterly | Controlled replacement-host/boot recovery, VPN/SSH fallback, service ordering, images/config/key retrieval and objective RTO/RPO. Record measured times and unrecovered components | Exact consequential approval; coordinate shared client services; no automatic reboot |
| A01 annually | Reconcile ownership, dependency/support lifecycle, access recovery and cost/unused-resource inventory; retire only after accepted migration and exact approval | Controller/Anton decisions; no automatic billing cancellation |

Daily records follow the existing alert thresholds. Review checks warn at disk ≥80%, critical ≥90%, inode free ≤10%, sustained available RAM <2 GiB, active swap growth, OOM or newly failed critical service. These are proposed review thresholds, not installed monitor configuration. TLS expiry warns at ≤30 days and becomes critical at ≤14 days; unknown expiry is missing evidence. Service failure and backup corruption take priority over routine windows.

## Before starting a maintenance window

1. Verify host identity, approved runner, exact services/actions/versions, current claims and change ID. Use a global deterministic maintenance lock plus backup/repository locks; a lock conflict defers, never forces unlock.
2. Check no incident, client-critical delivery/deployment, payment reconciliation, workflow backlog or active critical transactions. Use aggregate session/job/traffic evidence from approved sources; zero observed log rows is not proof of zero users.
3. Verify a current recoverable backup for EACH affected service plus protected configuration/key route. ERP backup alone does not cover Docker, VPN, Kuma, Beszel, n8n or Core. No current recovery evidence => block disruptive changes to that service.
4. Check CPU/RAM/disk/I/O headroom. Before Forge inference preserve estimated model resident memory PLUS ≥2 GiB practical headroom; retain the existing 4 GiB/3 CPU cage, no increased limits. Never overlap model inference with restore or heavy repository check; deterministic collection can proceed without loading the model.
5. For disruptive/network work, verify out-of-band console and SSH fallback and a named recovery owner reachable during the window. A scheduled clock is not a guarantee Anton is available.
6. Capture pre-state, exact artifacts/config hashes, expected restart effects, rollback/forward-recovery recipe and post-state probes. OS/database downgrades are not assumed safe rollback.
7. Start only if the plan, verification and recovery allowance fit before 23:45. Stop new mutations at the cutoff; restore known working state or enter incident recovery. Do not abandon an impaired service merely because the window ended. Deferred work retains a due record and next owner/date; never spills into business hours automatically.

Apply one bounded batch at a time. Base OS first, network/tooling/Docker separately, application/DB upgrades separately. No `latest` promotion, blind full-upgrade, DB optimization/VACUUM/migration, firewall change or new resource without its exact reviewed consequence. Emergency security/outage work may need an urgent explicitly authorized window rather than waiting for Sunday.

Post-change evidence: private access recovered, expected services running/healthy, pinned versions and boot policies correct, TLS/ERP/Core/client probes, queue/backlog state, backup-health result, no unexpected failed units or resource regression. Observe for at least 10 minutes within the reserved allowance and compare with pre-state. Leave probes active during maintenance; no broad alert silence. Planned suppression, if ever needed, is scoped, expires automatically and retains host-unreachable/backup-failure alerts.

## Forge handover and deterministic acceptance

Reference registry: `lib/forge/task-contracts.js`; validator: `scripts/forge-validate-packet.mjs`. Registry schema does not itself provide OS scheduling, sanitization, a production command allowlist or complete semantic evidence validation. Those must be verified by the existing controller/runner; never infer that a packet validator PASS authorizes its prose actions.

The accompanying JSON envelope uses `FORGE_PARSE_LOG`, a maximum 60-second task and exact evidence/output paths. A second `FORGE_VALIDATE_PACKET` pass is limited to 30 seconds. Each allows at most two attempts, records model/runtime/elapsed/resource metrics where available, and yields to incidents/client work. Forge receives only a sanitized snapshot: numeric metrics, public service identifiers/status, hashes, task receipts and error classes. No SSH keys, Docker socket, root shell, configuration contents, DB credentials, raw client records, tokens, backup passphrase or notifier credentials.

Output must identify source IDs and observation times. A deterministic verifier compares each claimed result to its input and configured thresholds, rejects unknown IDs/invented evidence and ensures every due task is accounted for. Store only sanitized summary in GitHub; dynamic learning uses the existing Context/Agent Learning fabric when authorized/available. No exposed learning connector was available during preparation, so no transactional-memory write receipt is claimed. Controller owns that persistence gap; do not create a second memory system.

Existing Monitor #14 remains the primary backup failure route. New missed-maintenance/failed-verifier signals should extend that existing checker/notifier in place after bounded implementation acceptance; no second bot/dashboard/scheduler. Controller review itself is hosted oversight, not a substitute for independent server-native monitoring. Normal running remains quiet; deduplicate exceptions by host/task/incident. Alert only an actionable outage, corruption, material failure/staleness or genuine approval/access gate; do not resend an unchanged backlog nightly.

## Concrete activation work still required

Package readiness is distinct from full runtime activation. Before calling Forge's standing workload ACTIVE:

- Verify an existing unattended Forge runner/claim route and CURRENT learning retrieval; if absent, record that exact capability gap. Do not invent a successful dispatch.
- Integrate only a bounded sanitized read-only collector and the existing two Forge contracts with the existing server scheduler/alert mechanism. No new privileged Forge contract or service stack.
- Reconcile full estate backup coverage, actual unattended-upgrade restart/origin/timer settings and the failed `cloud-init-hotplugd.service`. Baseline expected failures require evidence/owner/expiry; do not just reset-failed or suppress them.
- Convert the date/host-fixed October restore recipe into a repeatable uniquely named isolated runner only if monthly automation is required; cleanup on failure, retained receipt and a distinct test project each run are mandatory.
- Validate schedule collision handling, CPU/RAM/load guards, no-secret sanitization, healthy/failed/missing/stale receipts, task dedup and old-good evidence retention.
- Demonstrate one daily Forge-verified receipt, one missed-run/failure through the existing alert path, one weekly preflight, and one isolated restore receipt. Record actual cron/timer/task identifiers, timezone, next runs and rollback configuration. Schedule presence alone is not acceptance.

The controller can prepare these changes directly where its existing tools suffice. If implementation beyond approved automation is needed, issue one bounded CODEX_PACKET_V1 with exact files, verifier and stop condition; why Cursor is needed must be stated. Do not dispatch multiple speculative infrastructure lanes or displace client delivery.

## Initial exceptions and closeout

Observed 8 October 2026: 23 cached upgradable packages (security classification unknown); `cloud-init-hotplugd.service` failed; upgrade timer outside proposed quiet window; no aggregate Caddy access logging; recovery coverage gaps above. September #1347 is completed historical maintenance, not a current 50-package backlog. Current running inventory supersedes September container assumptions.

Preparation changed documentation and recurring oversight only. Read-only host inspections passed; no packages, services, accounts, keys, firewall rules or server schedules were changed. Material learning: distinguish ERP protection from complete-estate recovery, distinguish a reserved window from active execution, and preserve deterministic/Forge authority boundaries. Supersession applies to stale inventory assumptions, not completed historical evidence.

Acceptance of this handover: tasks, cadence, scope, owners, approval boundaries, guard conditions, existing schedule collisions and unresolved runtime activation are all explicit. Operational verdict remains **PARTIAL** until activation evidence exists for the server-local recurring workload.

## Activation preflight refresh — 8 October 2026, after 08:09 Mauritius

Anton requested that outstanding work be completed now. Further read-only checks narrowed the work:

- Ollama is reachable at the existing localhost API, with the selected 7B model available and no model loaded. Existing cage is exactly 4 GiB / 3 CPU. Container restart policy is `no`; boot recovery requires a separately recorded policy change. No Forge/maintenance systemd unit was found, and bounded filename inspection found only the existing journal housekeeping scripts, not an unattended Forge runner. This is an exact implementation gap, not an SSH-login problem: Desktop Commander → laptop SSH inspection works without an operator command courier.
- APT cache currently contains 23 upgradable packages: six candidates also published in `noble-security`, plus 17 other candidates including Docker, Compose, tooling and kernel packages. This uses cached candidate origins, not a fresh metadata refresh or comprehensive vulnerability assessment. Security-origin candidates are libfreetype6, librsvg2-2, librsvg2-common, libsgutils2-1.46-2, sg3-utils and sg3-utils-udev. No update was installed.
- The update timer runs at 06:00 UTC with up to one hour jitter; metadata refresh uses 06:00/18:00 UTC with up to 12 hours jitter. Persistent catch-up is enabled. Both can run outside quiet hours. Preserve current allowed Ubuntu/security origins; retiming must address jitter/catch-up and APT lock interaction, not only a calendar line.
- Kuma data is `/home/anton/uptime-kuma-data`, Beszel hub data is a named Docker volume under `/var/lib/docker`, and Nebula configuration is `/home/anton/corpflow-nebula/config`. These are outside the observed Borg `/root` source. No independently verified backup of them is established by that source. Ollama model data is also a named volume; reconstructible software and essential deployment configuration must be distinguished.
- `cloud-init-hotplugd.service` failed at 00:52:01 UTC with exit status 1; bounded journal classification found traceback/hotplug failures, but cause/repair has not been verified. No reset-failed, restart or disable was performed.
- `docker ps -a` revealed no Temporal container and one long-exited successful ERP configurator; broader retirement/source reconciliation remains pending. The running-container list alone is not the entire service inventory.

One inspection stopped when server `rg` was unavailable. The bounded filename inspection was repeated with standard-library walking and completed; earlier successful metadata reads remain valid. No raw journal messages, configuration contents or keys were published.

Next execution packet: implement and verify the missing sanitized collector/Forge runner, its single daily server-native timer and existing-alert freshness integration. Keep OS-timer retiming, backup scope expansion and disruptive update/repair execution separate from that first activation so they do not enlarge its authority. No additional paid service is needed. See linked activation packet for exact acceptance and stop conditions.

## Runtime activation receipt — 8 October 2026, 08:29 Mauritius

The bounded read-only collector and anton-owned model reviewer were installed after 14 fixtures passed locally and on the server, Python/Bash syntax checks and systemd validation. Manual server receipt at 04:29:51 UTC: collection success; deterministic checks D01–D06 PASS; Forge DEFERRED_RESOURCE. Available RAM was 5,703,213,056 bytes, below the conservative 6,442,450,944-byte (6 GiB) threshold. No model was force-loaded or promoted. This is not Forge PASS and does not establish every subrequirement in the full catalogue.

`corpflowai-forge-maintenance-collect.timer` is enabled at 18:00 UTC / 22:00 Mauritius with Persistent=no, first scheduled run 8 October. Root-owned evidence/status are at `/var/lib/corpflowai-maintenance/`. Existing Monitor #14 now checks missing/failed/>36h receipts and prolonged (>48h) memory deferral; existing ERP/laptop/restic checks are preserved. The live combined health check exited zero. No new bot, paid service, root model authority, application restart or OS update. First unattended run and fresh end-to-end maintenance alert delivery remain unobserved.

This receipt supersedes earlier PREPARED/no-server-timer statements only for the bounded daily collector and alert integration. Weekly/monthly/quarterly mutations are still reserved plans. Read [activation ADR](../decisions/20261008-forge-maintenance-read-only-activation.md) for exact boundaries and rollback. Protected ops recovery expansion is separately bounded by [its ADR](../decisions/20261008-protected-ops-backup-expansion.md); its runtime receipt must be recorded separately.
