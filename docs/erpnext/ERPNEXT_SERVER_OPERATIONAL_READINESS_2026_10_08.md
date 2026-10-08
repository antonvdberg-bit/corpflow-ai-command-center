# ERPNext recovered-server operational readiness — 2026-10-08

Status: ERP server/laptop backup installation and isolated laptop-copy restore verification COMPLETE; wider ERP transition acceptance remains PARTIAL. Companion to [server recovery record](ERPNEXT_SERVER_RECOVERY_2026_10_07.md).

## Scope and execution route

Anton requested completion of the hosted-to-server transition. This first operational step changes only the restart policy of the existing recovered ERP services. It is not permission to submit financial records, enable communications, remove isolation or retire the hosted source.

Restart changes below were executed by the operator. Subsequent backup work used the explicitly authorized Desktop Commander → laptop Git SSH → server route, as recorded in the [server execution boundary](../operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md). The dated preparation sections below are historical; the completion evidence at the end states current status.

## Step 1 — inspect current state

In operator Git Bash:

```bash
ssh root@10.240.0.1 'docker inspect --format "{{.Name}} restart={{.HostConfig.RestartPolicy.Name}} running={{.State.Running}}" corpflowai-hosted-restore-db-1 corpflowai-hosted-restore-redis-cache-1 corpflowai-hosted-restore-redis-queue-1 corpflowai-hosted-restore-backend-1 corpflowai-hosted-restore-websocket-1 corpflowai-hosted-restore-frontend-1'
```

Expected prior recovery state: six running containers with restart=no. Inspect differing output before executing the update. The old v15 project is not part of this command.

## Step 2 — guarded restart-policy update

Run only after Step 1 agrees with the expected current state. This command backs up the actual current Compose file, validates a proposed configuration and checks that its only semantic change is restart policy. It then changes container policies without recreating/restarting containers and persists the validated Compose change.

It stops before mutation if the container set, policy, running state, Compose comparison or service enablement differs from expectations. Docker and Caddy must already be enabled. Failure during apply attempts to restore the prior file and policies; incomplete rollback is explicitly reported.

```bash
ssh root@10.240.0.1 'python3 -' <<'PY'
import copy, datetime, json, os, pathlib, re, subprocess
project = "corpflowai-hosted-restore"
root = pathlib.Path("/root/erpnext-hosted-restore-20261007")
active = root / "compose.yaml"
def run(args):
    return subprocess.run(args, check=True, text=True, capture_output=True).stdout
if os.geteuid() != 0:
    raise SystemExit("STOP: root operator session required")
original = active.read_text()
pattern = r'(?m)^(\s+restart:\s*)"no"(\s*)$'
pending_text, count = re.subn(pattern, r'\1"unless-stopped"\2', original)
if count != 4:
    raise SystemExit("STOP: expected four existing no-restart settings; inspect current file")
expected = {project + "-" + service + "-1" for service in
            ("db", "redis-cache", "redis-queue", "backend", "websocket", "frontend")}
names = set(run(["docker", "ps", "-a", "--filter",
                 "label=com.docker.compose.project=" + project,
                 "--format", "{{.Names}}"]).splitlines())
if names != expected:
    raise SystemExit("STOP: unexpected container set; no changes applied")
inspected = json.loads(run(["docker", "inspect", *sorted(names)]))
previous = {}
for container in inspected:
    name = container["Name"].lstrip("/")
    policy = container["HostConfig"]["RestartPolicy"]
    if policy["Name"] != "no" or not container["State"]["Running"]:
        raise SystemExit("STOP: unexpected policy or stopped container: " + name)
    previous[name] = "no"
for service in ("docker", "caddy"):
    if run(["systemctl", "is-enabled", service]).strip() != "enabled":
        raise SystemExit("STOP: " + service + " must be enabled before this step")
stamp = datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%SZ")
pending = root / ("compose.restart-pending-" + stamp + ".yaml")
backup = root / ("compose.before-restart-" + stamp + ".yaml")
pending.write_text(pending_text)
pending.chmod(0o600)
try:
    before = json.loads(run(["docker", "compose", "-f", str(active),
                             "config", "--format", "json"]))
    after = json.loads(run(["docker", "compose", "-f", str(pending),
                            "config", "--format", "json"]))
    check = copy.deepcopy(after)
    if after.get("x-app", {}).get("restart") != "unless-stopped":
        raise RuntimeError("unexpected shared app restart policy")
    check["x-app"]["restart"] = before["x-app"]["restart"]
    if set(before["services"]) != set(after["services"]):
        raise RuntimeError("service set changed")
    for service in before["services"]:
        if after["services"][service]["restart"] != "unless-stopped":
            raise RuntimeError("unexpected new restart policy")
        check["services"][service]["restart"] = before["services"][service]["restart"]
    if check != before:
        raise RuntimeError("configuration changes extend beyond restart policy")
    backup.write_text(original)
    backup.chmod(0o600)
    changed = []
    try:
        for name in sorted(names):
            run(["docker", "update", "--restart=unless-stopped", name])
            changed.append(name)
        os.replace(pending, active)
        active.chmod(0o600)
        verified = json.loads(run(["docker", "inspect", *sorted(names)]))
        for container in verified:
            if container["HostConfig"]["RestartPolicy"]["Name"] != "unless-stopped":
                raise RuntimeError("restart policy verification failed")
            if not container["State"]["Running"]:
                raise RuntimeError("container unexpectedly stopped")
        persisted = json.loads(run(["docker", "compose", "-f", str(active),
                                    "config", "--format", "json"]))
        if persisted != after:
            raise RuntimeError("persisted compose verification failed")
    except Exception:
        active.write_text(original)
        active.chmod(0o600)
        rollback_failed = []
        for name in changed:
            try:
                run(["docker", "update", "--restart=no", name])
            except Exception:
                rollback_failed.append(name)
        if rollback_failed:
            print("ROLLBACK INCOMPLETE: inspect containers " + ", ".join(rollback_failed))
        raise
    print("PASS: six running recovery containers use unless-stopped")
    print("PASS: Compose persists only the restart-policy change")
    print("No containers restarted; no workers, scheduler or network changes")
    print("Rollback configuration: " + str(backup))
finally:
    pending.unlink(missing_ok=True)
PY
```

Do not reboot the host for this step. A host-reboot recovery test needs a separate controlled maintenance window because other services share the server.

## Remaining operational steps

Restart policies, HTTPS availability, scheduled server backups, laptop rotation and isolated restore verification are now evidenced below. Remaining operational steps:

1. Arrange independent offline emergency key access and prove full replacement-machine recovery, including software availability.
2. Resolve PDF external-logo dependency and rendering differences before client document acceptance.
3. Reconcile restored integration settings, define required background workers and scheduler jobs, and enable only approved jobs after checking their external effects.
4. Verify n8n, Factory/GitHub, staging and authenticated Core quotation consumers through their actual runtime access paths.
5. Perform final source reconciliation, establish the single authoritative writer and retire hosted billing only after acceptance.

## Fresh evidence and access limits

2026-10-08: ERP ping and Core health returned HTTP 200. Vercel still reports the verified same-code production deployment READY.

The dedicated test-user packet #696 was superseded by its 2026-10-06 closeout. Its old variable names and scripts alone do not prove valid current test access. No test user has been provisioned, no credential values have been logged, and no authenticated Core verification is claimed by this runbook.

An automatic approval review rejected reading a test-admin password solely to inspect its presence. That rejected action was not retried. Current authorized session access is needed for the remaining Core-to-ERP quotation-flow proof.

n8n management access remains unverified. No workflow was changed or triggered.

## Verification and stop condition

The restart recipe is a historical reference; equivalent guarded operator commands were executed and verified below. The Compose transformation is checked against a semantic before/after comparison on the server before mutation. No unexecuted server check, scheduled backup, reboot recovery or overall completed cutover is claimed.

Operator guard correction: Compose retains the `x-app` extension in its JSON output. The semantic comparison now normalizes both service restart values and the shared app restart value before comparing. The first operator apply attempt stopped before mutation; inspection confirmed `x-app` was the only remaining differing section.

Execution evidence, 2026-10-08 02:41 Mauritius: operator applied the corrected guarded update and saved the active configuration. All six recovery containers reported restart=unless-stopped and running=true. Docker and Caddy reported enabled. The multi-line reference recipe was not itself executed verbatim; equivalent guarded operator commands and the subsequent inspection supplied the evidence. Host-reboot recovery is not yet tested.


## Daily ERP backup and existing failure-alert extension — prepared 2026-10-08

Status: EXECUTED under Anton's 2026-10-08 03:18 Mauritius approval; installation and one live backup/alert cycle verified below. This historical preparation contract is superseded by the completion evidence.

### Verified baseline

- Root cron already runs /opt/borg/backup.sh at 01:00 UTC (05:00 Mauritius).
- Borg remotely lists seven archives; the latest is 2026-10-07T01:09:54.000000. Its inventory predates and omits the new recovery/manual-backup folders.
- Borg create includes /root without an exclude option. Repository metadata reports repokey-blake2 encryption. Retention is --keep-within=7d.
- The Borg script has no fail-fast setting or failure trap; commands use semicolons. A wrapper must propagate intermediate failures rather than trust the script's last exit alone.
- Both pre/post hooks are 28 bytes; no ERP backup or database dump operation was identified.
- Anton's user-systemd backup-health timer is active/enabled, most recent successful run 2026-10-07 07:15:36 UTC. Daily heartbeat timer is also active/enabled, last successful run 03:34:38 UTC.
- Restic health logs show 105 snapshots and 185855 total bytes on 7 October, matching the heartbeat scope rather than ERP protection. The installed health checker has no ERP status check.
- The documented restic retention unit is not found; it is not repaired or treated as necessary to the separate Borg 7d policy in this packet.
- No Telegram delivery event was found in the bounded last-300 journal-record scan. Active timer/success logs do not prove current failure delivery.

### Concrete bounded change contract

Purpose: produce daily database/files/config backups of the recovered ERP, preserve them in the existing encrypted remote Borg repository, and include failures/missing/stale ERP protection in the existing Monitor #14 Telegram path.

Exact targets:
1. New root-owned wrapper /usr/local/sbin/corpflowai-erp-borg-backup.py.
2. Managed backups under /root/erpnext-server-backups/daily/ (0700 directories, 0600 artifacts and manifests).
3. Sanitized root-owned status /var/lib/corpflowai-erp-backup/status.json readable by the existing anton health monitor. Contains UTC attempt/success times, stage/result and archive identifier only; no key, credentials or ERP record content.
4. Existing installed /home/anton/.local/bin/corpflowai-ops-backup-health-check.sh: add ERP status/freshness checks using its existing add_failure/send_telegram/dedup path. Preserve restic checks.
5. Root crontab: replace only the existing 0 1 * * * Borg command with the new wrapper; preserve the schedule, other entries and original /opt/borg scripts.
6. Canonical repository script scripts/ops/backup-health-check.sh and a versioned wrapper implementation only under a separately accepted runtime implementation packet. Do not overwrite the differing installed checker blindly: installed SHA256 is c7c8cc867ee70b56771262d1f5ae7d9af801669d59dd9e84c2c6875199132eaa; reconcile its sanitized diff first.

Daily sequence:
- Acquire an exclusive lock; verify hostname, exact site/container, running backend, output permissions and available space.
- Run bench --site corpflowai-hosted-restore.localhost backup --with-files --compress --ignore-backup-conf in /home/frappe/frappe-bench in corpflowai-hosted-restore-backend-1.
- Collect exactly the newly produced database/public/private/config artifacts into a completed-run folder, with checksums and an atomic manifest. Never print configuration/key values. Fail on incomplete/empty/unexpected artifacts.
- Run the existing Borg script with checked fail-fast execution; preserve destination, credentials and 7d retention. Never expose its inline passphrase in outputs or copy it into repository code.
- Query the resulting remote archive inventory and verify membership of all four exact ERP artifacts and the manifest before publishing a successful off-server status.
- Keep seven completed local managed daily runs after successful verification. Preserve manual recovery backups and all original/source backup folders. Do not prune container backups indiscriminately.
- On any stage failure, publish a sanitized failure state and invoke the existing health monitor as anton. It must use the existing failure-only notifier and hour dedup; notification delivery failure remains observable and must not be converted to success.
- The independent daily health timer also fails for missing/malformed ERP status, most recent failed attempt, or last verified remote ERP backup older than 36 hours. It must catch a job that never started.

Acceptance:
- Guarded configuration/script backups and exact before/after diff.
- Shell/Python syntax checks; fixtures for missing/stale/failed/healthy ERP status, missing archive artifacts, stage failure propagation and notifier dry-run.
- One approved live backup cycle with verified remote membership.
- One clearly labelled operator test alert through the existing notifier; confirm delivery, then restore healthy state. No success spam.
- A separate isolated restore remains required for disaster-recovery acceptance; archive membership alone is insufficient.

Rollback: restore only the saved root crontab and existing health-check script; disable/remove the wrapper invocation, preserve produced backups and status evidence. No site overwrite, reboot, workers/scheduler activation, payment/vendor activity, secret rotation, new monitoring service or paid destination is included.


## Daily ERP backup and alert completion — 2026-10-08

Anton approved the specific daily ERP/Borg backup and existing Monitor #14 alert extension at 03:18 Mauritius. Controller execution used the existing laptop SSH route under this bounded authorization; no general agent/server administration permission is implied.

Installed:
- /usr/local/sbin/corpflowai-erp-borg-backup.py; root cron now invokes it at the existing 01:00 UTC / 05:00 Mauritius schedule.
- Four protected artifacts plus manifest under /root/erpnext-server-backups/daily/; seven completed managed local runs retained. Manual/source/pre-restore backups are preserved.
- Existing Borg destination, repokey-blake2 encryption and 7d remote retention reused.
- Sanitized status at /var/lib/corpflowai-erp-backup/status.json.
- Existing anton health checker extended for missing/malformed/failed/stale (>36h) ERP status, verified remote evidence and stuck (>3h) runs. Existing restic checks and failure-only Telegram dedup retained. The forced-failure branch now loads existing notifier credentials before sending; notifier timeouts are bounded.

Verification:
- Six Python fixture tests and shell syntax checks passed.
- Initial live preflight stopped before backup because the legacy Borg command places --progress before create. Its real failure alert was accepted (HTTP 200). The guard was corrected to parse the existing command's tokens; all compatibility checks passed before installing the correction.
- Full backup cycle then passed: attempt 2026-10-07T23:29:40+00:00; verified success 23:30:07 UTC / 03:30:07 Mauritius. Remote archive snapshot_2026-10-07-23.29.43 contains all four exact ERP artifacts with expected sizes and the manifest; manifest bytes were read back and matched.
- Normal combined health check exited 0 and sent no Telegram. A single clearly labelled TEST ONLY alert was accepted by Telegram (HTTP 200); recipient observation is not independently confirmed. Final normal health check returned 0; persisted ERP status remained success.
- ERP public HTTPS ping remained 200/pong.

Installed/versioned hashes:
- Wrapper SHA256 bb6255db9c365e416fca1da5c73fe44d52d0453758ed9f46cf258420fa4c2b7b (final cron-environment version).
- Health checker SHA256 583c8373e5adcfa57a51638c4a290a5fd2a864d489e30fba3b4854f63cd0b8a2.

Rollback originals: /root/erpnext-hosted-restore-20261007/backup-change-20261007T232435Z. Restore the saved root crontab and health-check script (including anton ownership/mode); leave backup artifacts intact. No reboot, ERP worker/scheduler activation, credentials rotation, site overwrite or hosted cancellation occurred.

This completes installation and one live execution of the approved daily-backup/alert change. The next unattended scheduled run has not yet been observed. A full isolated database restore from the new daily backup remains pending. Overall ERP migration acceptance remains PARTIAL.

### Final scheduled-environment verification

The wrapper explicitly sets a bounded executable PATH so cron can find the existing Borg, Docker and runuser commands. A second complete live run under minimal cron-style environment passed at 2026-10-07 23:37:57 UTC / 8 October 03:37:57 Mauritius. Remote archive snapshot_2026-10-07-23.37.32 contains the exact artifacts and matching manifest. Final inspection confirmed cron active, the single approved 01:00 UTC wrapper entry installed, persisted outcome success/remote_verified true, two completed managed runs, 0700 run folders and 0600 artifacts. The job runs entirely on the server and does not require the laptop to stay online. The first future unattended invocation remains unobserved; the full isolated restore remains outstanding. Versioned wrapper/checker and regression fixtures are included in the unmerged PR.


## Laptop recovery copies — historical implementation contract

Anton authorized the recommended laptop recovery extension on 8 October 2026 at 03:49 Mauritius. Scope: four rotating encrypted ERP recovery packages, an isolated restore using a downloaded laptop package, followed by read-only inventory of Core and n8n recovery coverage. No new paid destination is required.

The initial attempt was blocked by an offline laptop. After the operator restarted its Desktop Commander service and requested resumption, installation and recovery verification completed as recorded below. Server backup jobs remain independent of laptop availability.

### Implementation and acceptance contract

- Use the existing laptop SSH route and completed, remotely verified ERP backup runs. Inspect available laptop space and existing task/configuration before installation.
- Keep at most four distinct packages: latest verified, previous verified, weekly and monthly. Preserve existing manual migration/pre-restore copies. Duplicate logical slots may reference the same package.
- Include database, public files, private files, site configuration, checksums, pinned software identity and a recovery recipe. Encrypt the whole package: the site configuration remains sensitive even when its filename contains "-enc".
- Verify downloaded checksums before atomic promotion. Failed or partial downloads must not replace a good slot. Bound storage by measured package size and available capacity; record the resulting budget before enabling rotation.
- Run the laptop copy task when the laptop and VPN are available, with catch-up at login. Laptop absence must not block the server backup or imply server backup failure. Record laptop-copy failures/staleness separately, using the existing failure alert system without exposing secrets.
- Preserve recovery-key access independently of the package and the live ERP server. No plaintext keys in source control, task arguments, logs or chat. Offline emergency key availability requires a verified secure arrangement before cold-DR acceptance.
- Prove recovery using a package downloaded to the laptop: transfer that exact package into a distinct test location, decrypt privately, then restore into a separate Docker project with new volumes, no public ports, no external egress and no scheduler/workers. Check database records and public/private file recovery. Never restore onto either existing live ERP site.
- Record package identity, hash, test start/end time, restored counts/files, cleanup and measured recovery duration. Archive membership and checksum checks alone do not count as a restore.
- Optional disconnected USB storage is not installed or assumed. These data packages require access to the pinned container images unless an additional offline software bundle is explicitly prepared.

### Wider recovery inventory — evidence limits

| System | Current evidence | Remaining proof |
|---|---|---|
| Recovered ERPNext | Two server backup cycles and remote Borg artifact/manifest verification; existing failure notifier accepted test alert | Four laptop slots, independent emergency key access and full restore from laptop copy |
| Core / Neon Postgres | Repository names Neon as the approved database; POSTGRES_PROVIDER.md section 6 explicitly leaves project history window unread and restore drill unproven | Read current project plan/history window through authorized management access; establish export coverage and isolated restore evidence |
| n8n | Historical operations map places n8n on a separate host; ERP server backup scope does not establish n8n coverage | Verify actual database, workflows, credential data, encryption key preservation, deployment configuration, backup schedule/destination and isolated restore |
| Ops restic heartbeat | Existing heartbeat/health evidence covers small operations data | Do not count it as ERP, Core or n8n recovery coverage without exact inventory evidence |

Sources: docs/operations/POSTGRES_PROVIDER.md section 6; docs/operations/ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1.md (20 August historical evidence); docs/operations/SELF_HOSTED_OPS_STACK_V1.md (historical topology). Current October ERP backup evidence above supersedes older ERP/Monitor #14 install-pending descriptions. Historical plan limits are not treated as current account coverage.

The initial access dependency is resolved. No additional operator command or re-approval is required for this completed packet.


## Laptop recovery completion and first scheduled runs — 2026-10-08

This section supersedes earlier pending/offline descriptions. Scope remains ERP recovery protection; overall migration acceptance remains PARTIAL.

### Scheduled execution and storage

- Server cron started unattended at 01:00:01 UTC (05:00:01 Mauritius), completed at 01:09:16 UTC, and verified the four ERP artifacts and manifest in remote Borg archive `snapshot_2026-10-08-01.00.04`.
- Laptop task **CorpFlowAI ERP Laptop Recovery** ran on its actual daily 05:30 Mauritius schedule. Task result was 0 and state Ready; the server accepted its verified-copy acknowledgement at 01:30:34 UTC.
- Laptop destination: `C:\Users\anton\CorpFlowAI-Recovery\ERPNext`, with protected anton/SYSTEM access. A limited interactive-user task uses existing Python/Git SSH, login catch-up and three 15-minute retries. It requires a signed-in user, laptop availability and the existing VPN; server backups do not.
- Four logical slots are installed: latest, previous, weekly, monthly. At most four distinct packages are retained; slots can share a package. There are currently two packages totaling 2,948,773 bytes (about 2.8 MiB). Existing manual migration/pre-restore copies were preserved.
- The measured laptop free space was about 100 GiB. A 2 GiB per-package limit and free-space guard bound storage to four packages plus a temporary download. Hash and size verification precede atomic slot promotion.
- The whole recovery bundle is encrypted before leaving the server, including sensitive site configuration. No plaintext key is stored in task arguments, logs or source control.

Latest package: run `20261008T010001Z`, 1,474,389 bytes, SHA256 `d3a328a6a5b3a1be6ab9b9b1949902cd78fb9965be2c335036e5e969ba380877`.

### Existing failure alerts

The existing Monitor #14 failure-only Telegram/dedup path now checks missing, malformed, future-dated or more-than-seven-day-old laptop acknowledgements. Laptop failure status is separate from the server's 36-hour verified-backup freshness check. Reachable-server copy failures use the existing notifier; prolonged laptop absence is detected independently on the server.

The final normal combined health check exited 0. Public ERP ping returned pong. The prior labelled notifier test was accepted by Telegram; recipient observation remains unconfirmed. No new paid service or bot was introduced.

### Restore from an actual laptop copy

The encrypted package downloaded to the laptop was uploaded back into a root-only test location and verified again:

- Run `20261007T233730Z`, SHA256 `7dc5b9e8309f02a6effaf2f1874c151ff73b07d57ac37eb70a356013d1727093`.
- Disposable project `corpflowai-laptop-drtest-20261008`, site `laptop-drtest.localhost`, fresh volumes, pinned ERPNext/Frappe 16.50.0 image.
- Internal Docker network, no public ports, no workers/scheduler, no live ERP restore target.
- Verified 9 quotations, 3 sales invoices, 6 suppliers and quotation `SAL-QTN-2026-00006`.
- Verified all four private-file hashes against the archive, preserved application/backup encryption keys and disabled scheduler. The public archive contained no regular files.
- Corrected verification completed at 03:27:41 UTC (07:27:41 Mauritius). All disposable containers and volumes were removed; final independent inspection found none. Plaintext extraction folders and temporary test configuration/password files were removed. Sanitized receipt remains at `/root/erpnext-laptop-dr-test-20261008/receipt.json`.

The restore itself succeeded before verifier defects were corrected. Final verification resumed against the retained isolated test environment; standard private-file-only extraction was repeated during diagnosis. This is verified recovery evidence, not a claim that an unmodified recipe passed in one uninterrupted run. Full replacement-machine recovery time has not been measured.

The corrected versioned verifier handles original-site archive prefixes and Bench string output. Regression tests compile embedded Python as well as exercising rotation, health and backup failure cases: **15 tests passed**. Its cleanup path removes disposable resources on success or failure.

### Independent key access and remaining DR coverage

An exact-key retrieval from existing Infisical `ERPNEXT_HOSTED_BACKUP_ENCRYPTION_KEY` successfully decrypted the laptop package without printing or persisting the key. Retain this key while retained packages depend on it, despite its historical hosted name.

Offline emergency key escrow, disconnected USB copies, offline container-image availability and full replacement-machine recovery remain unproven. The current test's server-side decrypt used protected live configuration; the separate Infisical decrypt proves another key-access route, not offline escrow.

Core/Neon inventory remains limited to repository evidence: the actual current project history window and an isolated restore drill are unverified. n8n's database, workflows, credential data, encryption key, deployment configuration and backup/restore coverage remain unverified on its separate host. The small ops restic heartbeat is not evidence of those systems' protection.

Code and evidence are recorded in draft PR #1420; it remains unmerged. No live site was overwritten, no ERP workers were enabled, no hosted billing was cancelled and no Core/n8n infrastructure was changed.
