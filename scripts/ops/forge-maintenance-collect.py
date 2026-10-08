#!/usr/bin/env python3
"""Collect a small, numeric-only read-only evidence packet for Forge."""

import argparse
import json
import os
import socket
import subprocess
import time
from pathlib import Path

from forge_maintenance_common import contains_secret_like, receipt_payload, publish_receipt


EXPECTED_HOST = os.environ.get("FORGE_MAINTENANCE_HOST", "corpflow-exec-01-u69678")
COMMANDS = {
    "disk_root_bytes": ("/usr/bin/df", "-B1", "/"),
    "memory_available_kb": ("/usr/bin/awk", "/MemAvailable:/ {print $2}", "/proc/meminfo"),
    "load_average": ("/usr/bin/uptime",),
}


def run_command(command, timeout):
    return subprocess.run(
        command, check=False, capture_output=True, text=True, timeout=timeout,
        shell=False,
    )


def numeric_lines(output):
    values = []
    for line in output.splitlines():
        token = line.strip().split()[-1] if line.strip() else ""
        try:
            values.append(float(token))
        except (ValueError, IndexError):
            continue
    return values


def collect(timeout=10, command_runner=run_command):
    host = socket.gethostname()
    if host != EXPECTED_HOST and os.environ.get("FORGE_MAINTENANCE_TEST_HOST") != "1":
        return {
            "status": "BLOCKED",
            "reason": "hostname guard rejected host",
            "host_match": False,
            "source_ids": [],
        }
    evidence = {}
    failures = []
    for source_id, command in COMMANDS.items():
        try:
            result = command_runner(command, timeout)
        except subprocess.TimeoutExpired:
            failures.append(f"{source_id}: timeout")
            continue
        if result.returncode != 0:
            failures.append(f"{source_id}: command failed")
            continue
        values = numeric_lines(result.stdout)
        if not values:
            failures.append(f"{source_id}: no numeric evidence")
            continue
        evidence[source_id] = values[:4]
    payload = {
        "collector": "forge-maintenance-collect",
        "collected_at": time.time(),
        "host": host,
        "source_ids": sorted(evidence),
        "evidence": evidence,
        "failures": failures,
        "status": "PASS" if not failures else "FAIL",
    }
    if contains_secret_like(payload):
        return {"status": "BLOCKED", "reason": "secret-like evidence rejected",
                "host_match": True, "source_ids": []}
    return payload


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--output", required=True)
    parser.add_argument("--timeout", type=float, default=10)
    args = parser.parse_args()
    collection = collect(args.timeout)
    run_id = f"collection-{int(time.time())}"
    payload = receipt_payload(collection, status=collection["status"], run_id=run_id)
    publish_receipt(payload, receipt_path=Path(args.output),
                    history_dir=Path(args.output).parent / "history")
    print(json.dumps({"status": payload["status"], "run_id": run_id}))
    # A failed collection is evidence for the reviewer, not a reason to skip it.
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
