# ERPNext recovered-server operational readiness — 2026-10-08

Status: RESTART UPDATE EXECUTED AND VERIFIED; backup and wider readiness work pending. Companion to [server recovery record](ERPNEXT_SERVER_RECOVERY_2026_10_07.md).

## Scope and execution route

Anton requested completion of the hosted-to-server transition. This first operational step changes only the restart policy of the existing recovered ERP services. It is not permission to submit financial records, enable communications, remove isolation or retire the hosted source.

Per [server execution boundary](../operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md) §5.4, the controller authors and reviews the command; the operator executes it in their SSH terminal. No agent SSH/server shell execution is claimed.

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

1. Confirm restart-policy evidence and permanent HTTPS checks after the operator update.
2. Inspect the installed Bench backup options and existing backup jobs without reading credential contents. Use the recovered site and preserve both original migration backups.
3. Prepare and run a fresh full recovered-site backup, verify database/archive integrity and configuration-key preservation, and test its restore in a separate isolated site.
4. Configure the agreed backup schedule and retention only after the manual backup/restore verifier passes. Local server backups alone do not cover server loss; an independent recovery destination remains required.
5. Resolve PDF external-logo dependency and rendering differences before client document acceptance.
6. Reconcile restored integration settings, define required background workers and scheduler jobs, and enable only approved jobs after checking their external effects.
7. Verify n8n, Factory/GitHub, staging and authenticated Core quotation consumers through their actual runtime access paths.
8. Perform final source reconciliation, establish the single authoritative writer and retire hosted billing only after acceptance.

## Fresh evidence and access limits

2026-10-08: ERP ping and Core health returned HTTP 200. Vercel still reports the verified same-code production deployment READY.

The dedicated test-user packet #696 was superseded by its 2026-10-06 closeout. Its old variable names and scripts alone do not prove valid current test access. No test user has been provisioned, no credential values have been logged, and no authenticated Core verification is claimed by this runbook.

An automatic approval review rejected reading a test-admin password solely to inspect its presence. That rejected action was not retried. Current authorized session access is needed for the remaining Core-to-ERP quotation-flow proof.

n8n management access remains unverified. No workflow was changed or triggered.

## Verification and stop condition

The restart recipe is controller-reviewed preparation; server execution and its result remain pending. The Compose transformation is checked against a semantic before/after comparison on the server before mutation. No unexecuted server check, scheduled backup, reboot recovery or overall completed cutover is claimed.

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
