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
