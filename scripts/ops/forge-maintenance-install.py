#!/usr/bin/env python3
"""Prepare and verify a Forge maintenance installation; never applies by default."""

import argparse
import json
import os
import platform
from pathlib import Path

from forge_maintenance_common import file_sha256


FILES = (
    "scripts/ops/forge_maintenance_common.py",
    "scripts/ops/forge-maintenance-collect.py",
    "scripts/ops/forge-maintenance-review.py",
    "scripts/ops/forge-maintenance-install.py",
    "scripts/ops/systemd/corpflowai-forge-maintenance.service",
    "scripts/ops/systemd/corpflowai-forge-maintenance.timer",
)


def preflight(repo_root, expected_host):
    root = Path(repo_root).resolve()
    result = {
        "mode": "prepare-only",
        "host": platform.node(),
        "expected_host": expected_host,
        "host_match": platform.node() == expected_host,
        "repo_root": str(root),
        "files": {},
        "apply_permitted": False,
        "rollback": [
            "stop and disable the timer (operator-approved action only)",
            "restore the backed-up unit/script paths",
            "daemon-reload and confirm timer inactive",
        ],
    }
    for relative in FILES:
        path = root / relative
        result["files"][relative] = {
            "exists": path.is_file(),
            "sha256": file_sha256(path) if path.is_file() else None,
        }
    result["state_path"] = os.environ.get(
        "FORGE_MAINTENANCE_STATE_DIR", "/var/lib/corpflowai/forge-maintenance"
    )
    return result


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--repo-root", default=Path(__file__).resolve().parents[2])
    parser.add_argument("--expected-host", default="corpflow-exec-01-u69678")
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--apply", action="store_true",
                        help="refused: activation requires a separately approved runbook")
    args = parser.parse_args()
    if args.apply:
        parser.error("--apply is intentionally disabled; this installer is prepare-only")
    result = preflight(args.repo_root, args.expected_host)
    output = Path(args.manifest)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(result, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    print(json.dumps({"status": "PREPARED", "manifest": str(output)}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
