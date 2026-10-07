#!/usr/bin/env python3
"""Approved recovered-ERP backup through the existing Borg pipeline.

No credentials or ERP document contents are logged. Run as root on the named host.
"""
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import shlex
import shutil
import socket
import subprocess
import sys
import tempfile

HOST = "corpflow-exec-01-u69678"
CONTAINER = "corpflowai-hosted-restore-backend-1"
SITE = "corpflowai-hosted-restore.localhost"
BENCH = "/home/frappe/frappe-bench"
SOURCE = BENCH + "/sites/" + SITE + "/private/backups/"
DAILY = Path("/root/erpnext-server-backups/daily")
STATUS = Path("/var/lib/corpflowai-erp-backup/status.json")
HEALTH = "/home/anton/.local/bin/corpflowai-ops-backup-health-check.sh"
SUFFIXES = ("site_config_backup-enc.json", "database-enc.sql.gz", "files-enc.tgz", "private-files-enc.tgz")


class BackupError(Exception):
    pass


def utcnow():
    return dt.datetime.now(dt.timezone.utc)


def stamp():
    return utcnow().isoformat(timespec="seconds")


def command(args, *, env=None, timeout=1800):
    """Capture all output privately; failures expose only command class/stage."""
    try:
        result = subprocess.run(args, env=env, stdout=subprocess.PIPE,
                                stderr=subprocess.PIPE, timeout=timeout, check=False)
    except (OSError, subprocess.TimeoutExpired):
        raise BackupError("command unavailable or timed out") from None
    if result.returncode != 0:
        raise BackupError("command returned nonzero")
    return result.stdout


def backup_names(output):
    pattern = r"\d{8}_\d{6}-corpflowai-hosted-restore_localhost-(?:" + "|".join(re.escape(s) for s in SUFFIXES) + r")"
    names = sorted(set(re.findall(pattern, output.decode("utf-8", errors="replace"))))
    prefixes = set()
    mapping = {}
    for suffix in SUFFIXES:
        matches = [n for n in names if n.split("-corpflowai-hosted-restore_localhost-", 1)[1] == suffix]
        if len(matches) != 1:
            raise BackupError("incomplete backup summary")
        mapping[suffix] = matches[0]
        prefixes.add(matches[0][:-len(suffix)])
    if len(names) != 4 or len(prefixes) != 1:
        raise BackupError("inconsistent backup prefix")
    return mapping


def digest(path):
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(block)
    return h.hexdigest()


def atomic_json(path, data, mode):
    if path.is_symlink() or path.parent.is_symlink():
        raise BackupError("unsafe output path")
    fd, name = tempfile.mkstemp(prefix=".status-", dir=path.parent)
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as stream:
            os.fchmod(stream.fileno(), mode)
            json.dump(data, stream, sort_keys=True)
            stream.write("\n")
            stream.flush()
            os.fsync(stream.fileno())
        os.replace(name, path)
    finally:
        if os.path.exists(name):
            os.unlink(name)


def borg_access():
    # Reuse the existing local credentials in memory, never copy them into this program.
    lex = shlex.shlex(Path("/opt/borg/backupList.sh").read_text(), posix=True, punctuation_chars=";&|")
    lex.whitespace_split = True
    tokens = list(lex)
    if not (len(tokens) == 5 and tokens[0].startswith("BORG_PASSPHRASE=")
            and tokens[1:3] == ["borg", "list"] and tokens[4] == ";"):
        raise BackupError("existing Borg access recipe changed")
    env = dict(os.environ)
    env["BORG_PASSPHRASE"] = tokens[0].split("=", 1)[1]
    return tokens[3], env


def archive_membership(entries, expected):
    found = {x.get("path", "").lstrip("/"): x for x in entries}
    return all(p in found and found[p].get("size") == size for p, size in expected.items())


def borg_covers_root(script):
    script = script.replace(chr(92) + chr(10), "")
    lex = shlex.shlex(script, posix=True, punctuation_chars=";&|")
    lex.whitespace_split = True
    tokens = list(lex)
    for index in range(len(tokens) - 1):
        if tokens[index] != "borg":
            continue
        create_index = index + 1
        while create_index < len(tokens) and tokens[create_index] == "--progress":
            create_index += 1
        if create_index >= len(tokens) or tokens[create_index] != "create":
            continue
        args = []
        for token in tokens[create_index + 1:]:
            if token in [";", "&", "&&", "|", "||"]:
                break
            args.append(token)
        return "/root" in args and not any(t.startswith("--exclude") for t in args)
    return False


def verify_remote(folder, manifest):
    repo, env = borg_access()
    raw = command(["borg", "list", "--json", "--lock-wait", "5", repo], env=env, timeout=300)
    archives = json.loads(raw).get("archives", [])
    if not archives:
        raise BackupError("no remote archives")
    archive = max(archives, key=lambda a: a.get("time", ""))["name"]
    target = repo + "::" + archive
    raw = command(["borg", "list", "--json-lines", "--lock-wait", "5", target], env=env, timeout=300)
    entries = [json.loads(line) for line in raw.splitlines() if line.strip()]
    expected = {str(folder / x["name"]).lstrip("/"): x["bytes"] for x in manifest["files"]}
    expected[str(folder / "manifest.json").lstrip("/")] = (folder / "manifest.json").stat().st_size
    if not archive_membership(entries, expected):
        raise BackupError("remote archive missing expected artifact or size")
    # Read back the manifest from the remote archive and compare bytes, without extracting to disk.
    raw = command(["borg", "extract", "--stdout", "--lock-wait", "5", target,
                   str(folder / "manifest.json").lstrip("/")], env=env, timeout=300)
    if raw != (folder / "manifest.json").read_bytes():
        raise BackupError("remote manifest differs")
    if not re.fullmatch(r"[A-Za-z0-9_.:-]{1,200}", archive):
        raise BackupError("unexpected archive identifier")
    return archive


def managed_retention(root, keep=7):
    complete = sorted(p for p in root.iterdir() if p.is_dir() and not p.is_symlink()
                      and re.fullmatch(r"\d{8}T\d{6}Z", p.name) and (p / "manifest.json").is_file())
    for folder in complete[:-keep]:
        shutil.rmtree(folder)


def notify_failure(stage):
    # Existing notifier, user, credentials, dedup and failure-only path.
    # Force a failure alert even if status could not be written (e.g. disk full).
    args = ["runuser", "-u", "anton", "--", "env", "HOME=/home/anton",
            "XDG_RUNTIME_DIR=/run/user/1000", "BACKUP_HEALTH_FORCE_FAIL=1",
            "BACKUP_HEALTH_FORCE_REASON=ERP backup failed at " + stage + "; inspect the guarded ERP backup job", HEALTH]
    try:
        result = subprocess.run(args, stdout=subprocess.PIPE, stderr=subprocess.PIPE, timeout=120)
        text = result.stdout.decode("utf-8", errors="replace")
        delivered = "telegram: ok http=200" in text
        deferred = "anti-spam dedup" in text
        print("ERP backup failure notification: " + ("accepted" if delivered else "deduplicated" if deferred else "NOT CONFIRMED"))
    except (OSError, subprocess.TimeoutExpired):
        print("ERP backup failure notification: NOT CONFIRMED")


def main():
    if os.geteuid() != 0 or socket.gethostname() != HOST:
        print("ERP backup refused: host or execution identity mismatch")
        return 1
    os.umask(0o077)
    lockfd = os.open("/run/lock/corpflowai-erp-backup.lock", os.O_CREAT | os.O_RDWR | os.O_NOFOLLOW, 0o600)
    lock = os.fdopen(lockfd, "w")
    try:
        fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
    except BlockingIOError:
        print("ERP backup refused: another managed backup is running")
        return 1
    STATUS.parent.mkdir(mode=0o755, parents=True, exist_ok=True)
    STATUS.parent.chmod(0o755)
    state = {"version": 1, "last_attempt_utc": stamp(), "last_success_utc": None,
             "outcome": "running", "stage": "preflight", "remote_verified": False}
    if STATUS.exists():
        try:
            previous = json.loads(STATUS.read_text())
            for key in ["last_success_utc", "archive", "remote_verified"]:
                if key in previous:
                    state[key] = previous[key]
        except (ValueError, OSError):
            pass
    stage = "preflight"
    try:
        atomic_json(STATUS, state, 0o644)
        running = command(["docker", "inspect", "--format", "{{.State.Running}}", CONTAINER], timeout=30)
        if running.strip() != b"true":
            raise BackupError("ERP backend not running")
        if shutil.disk_usage("/root").free < 256 * 1024 * 1024:
            raise BackupError("insufficient free space")
        # Guard the unchanged legacy job before calling bash -e. No arbitrary shell content is introduced.
        script = Path("/opt/borg/backup.sh").read_text()
        if "set +e" in script or not borg_covers_root(script):
            raise BackupError("existing Borg pipeline coverage changed")
        borg_access()  # Validate access recipe before creating artifacts.
        DAILY.mkdir(mode=0o700, parents=True, exist_ok=True)
        DAILY.chmod(0o700)
        run_id = utcnow().strftime("%Y%m%dT%H%M%SZ")
        pending = DAILY / (".pending-" + run_id)
        folder = DAILY / run_id
        pending.mkdir(mode=0o700)
        stage = "erp_backup"
        state["stage"] = stage
        atomic_json(STATUS, state, 0o644)
        output = command(["docker", "exec", "-w", BENCH, CONTAINER, "bench", "--site", SITE,
                          "backup", "--with-files", "--compress", "--ignore-backup-conf"])
        names = backup_names(output)
        files = []
        stage = "collect_artifacts"
        for suffix, name in names.items():
            path = pending / name
            command(["docker", "cp", CONTAINER + ":" + SOURCE + name, str(path)], timeout=300)
            path.chmod(0o600)
            os.chown(path, 0, 0)
            if path.is_symlink() or not path.is_file() or path.stat().st_size == 0:
                raise BackupError("invalid backup artifact")
            files.append({"name": name, "bytes": path.stat().st_size, "sha256": digest(path)})
        config = json.loads((pending / names["site_config_backup-enc.json"]).read_text())
        if not config.get("encryption_key") or not config.get("backup_encryption_key"):
            raise BackupError("configuration missing recovery key")
        manifest = {"version": 1, "site": SITE, "created_utc": stamp(), "files": files}
        atomic_json(pending / "manifest.json", manifest, 0o600)
        os.rename(pending, folder)
        stage = "borg_backup"
        state["stage"] = stage
        atomic_json(STATUS, state, 0o644)
        command(["/bin/bash", "-e", "/opt/borg/backup.sh"], timeout=7200)
        stage = "verify_remote"
        archive = verify_remote(folder, manifest)
        stage = "local_retention"
        managed_retention(DAILY)
        state.update(outcome="success", stage="complete", last_success_utc=stamp(),
                     remote_verified=True, archive=archive)
        atomic_json(STATUS, state, 0o644)
        print("ERP backup: PASS; four artifacts and manifest verified in encrypted remote archive")
        return 0
    except Exception:
        # Never stringify exceptions that could contain credentials, paths from shell output or ERP content.
        state.update(outcome="failed", stage=stage)
        try:
            atomic_json(STATUS, state, 0o644)
        except Exception:
            pass
        print("ERP backup: FAIL at " + stage + "; private output suppressed")
        notify_failure(stage)
        return 1
    finally:
        lock.close()


if __name__ == "__main__":
    sys.exit(main())
