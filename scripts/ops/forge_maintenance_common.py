#!/usr/bin/env python3
"""Shared fail-closed primitives for the bounded Forge maintenance lane."""

import errno
import fcntl
import hashlib
import json
import os
import re
import tempfile
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path


DEFAULT_STATE_DIR = Path(os.environ.get(
    "FORGE_MAINTENANCE_STATE_DIR", "/var/lib/corpflowai/forge-maintenance"
))
LOCK_PATH = DEFAULT_STATE_DIR / "forge-capacity.lock"
RECEIPT_PATH = DEFAULT_STATE_DIR / "latest-receipt.json"
HISTORY_DIR = DEFAULT_STATE_DIR / "history"
RECEIPT_SCHEMA = "corpflowai.forge-maintenance.receipt.v1"
STATUSES = {"PASS", "FAIL", "BLOCKED", "DEFERRED"}
SECRET_PATTERN = re.compile(
    r"(?i)(api[_-]?key|secret|password|token|private[_-]?key|"
    r"authorization\s*[:=]|bearer\s+[a-z0-9._-]{12,})"
)


def utc_now():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def json_safe(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"))


def contains_secret_like(value):
    return bool(SECRET_PATTERN.search(json_safe(value)))


def atomic_json_write(path, payload, mode=0o640):
    """Publish JSON without replacing a valid old receipt on write failure."""
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temp_name = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    try:
        os.fchmod(fd, mode)
        with os.fdopen(fd, "w", encoding="utf-8") as handle:
            json.dump(payload, handle, indent=2, sort_keys=True)
            handle.write("\n")
            handle.flush()
            os.fsync(handle.fileno())
        os.replace(temp_name, path)
    except Exception:
        try:
            os.unlink(temp_name)
        except FileNotFoundError:
            pass
        raise


def read_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def receipt_payload(collection, review=None, status="BLOCKED", run_id=None):
    if status not in STATUSES:
        raise ValueError(f"invalid status: {status}")
    payload = {
        "schema": RECEIPT_SCHEMA,
        "run_id": run_id or f"forge-maintenance-{int(time.time())}",
        "created_at": utc_now(),
        "status": status,
        "collection": collection,
        "review": review or {"status": "NOT_RUN"},
    }
    if contains_secret_like(payload):
        raise ValueError("secret-like content rejected from receipt")
    return payload


def publish_receipt(payload, receipt_path=RECEIPT_PATH, history_dir=HISTORY_DIR):
    if payload.get("schema") != RECEIPT_SCHEMA or contains_secret_like(payload):
        raise ValueError("receipt failed schema or secret-safety validation")
    atomic_json_write(receipt_path, payload)
    history_dir = Path(history_dir)
    history_dir.mkdir(parents=True, exist_ok=True)
    stamp = payload["created_at"].replace(":", "").replace("+00:00", "Z")
    atomic_json_write(history_dir / f"{stamp}-{payload['run_id']}.json", payload)
    for old in sorted(history_dir.glob("*.json"))[:-30]:
        old.unlink(missing_ok=True)


def validate_receipt(payload, now=None, max_age_seconds=900):
    if payload.get("schema") != RECEIPT_SCHEMA:
        return False, "schema mismatch"
    if payload.get("status") not in STATUSES:
        return False, "invalid status"
    if contains_secret_like(payload):
        return False, "secret-like content"
    try:
        created = datetime.fromisoformat(payload["created_at"])
        current = now or datetime.now(timezone.utc)
        age = (current - created).total_seconds()
    except (KeyError, TypeError, ValueError):
        return False, "invalid timestamp"
    if age < 0:
        return False, "future receipt"
    if age > max_age_seconds:
        return False, "stale receipt"
    return True, "fresh"


def _erp_excluded(exclusion_path):
    return Path(exclusion_path).exists() if exclusion_path else False


def resource_guard(min_available_mb=512, exclusion_path=None):
    """Return (allowed, reason) without starting a model or second Forge lane."""
    if _erp_excluded(exclusion_path or os.environ.get("FORGE_ERP_EXCLUSION_FILE")):
        return False, "ERP restore/recovery exclusion active"
    try:
        available_mb = int(Path("/proc/meminfo").read_text().split("MemAvailable:")[1]
                           .split()[0]) // 1024
        if available_mb < min_available_mb:
            return False, f"memory headroom {available_mb}MB below {min_available_mb}MB"
    except (FileNotFoundError, IndexError, ValueError):
        return False, "memory headroom unavailable"
    try:
        load1 = os.getloadavg()[0]
        cpu_count = os.cpu_count() or 1
        if load1 > max(1.0, cpu_count * 0.75):
            return False, f"load headroom insufficient ({load1:.2f})"
    except OSError:
        return False, "load headroom unavailable"
    return True, "resource headroom available"


@contextmanager
def capacity_lease(owner, run_id, ttl_seconds=360, lock_path=LOCK_PATH,
                   exclusion_path=None):
    """Acquire the single Forge lane; stale leases are replaced deterministically."""
    lock_path = Path(lock_path)
    lock_path.parent.mkdir(parents=True, exist_ok=True)
    with open(lock_path, "a+", encoding="utf-8") as handle:
        try:
            fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as error:
            if error.errno in (errno.EACCES, errno.EAGAIN):
                raise RuntimeError("Forge capacity lock contention") from error
            raise
        handle.seek(0)
        raw = handle.read().strip()
        if raw:
            try:
                prior = json.loads(raw)
                if prior.get("expires_at", 0) > time.time():
                    raise RuntimeError("Forge capacity lease active")
            except json.JSONDecodeError:
                pass
        if _erp_excluded(exclusion_path or os.environ.get("FORGE_ERP_EXCLUSION_FILE")):
            raise RuntimeError("ERP restore/recovery exclusion active")
        lease = {
            "owner": owner,
            "run_id": run_id,
            "started_at": utc_now(),
            "expires_at": time.time() + ttl_seconds,
        }
        handle.seek(0)
        handle.truncate()
        json.dump(lease, handle, sort_keys=True)
        handle.flush()
        os.fsync(handle.fileno())
        try:
            yield lease
        finally:
            handle.seek(0)
            handle.truncate()
            handle.flush()


def file_sha256(path):
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()
