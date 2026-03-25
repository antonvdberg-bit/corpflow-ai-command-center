"""
Warranty Integrity Checker (Digital Notary + APP)

If the current codebase contains code not signed by the Factory or an
Authorized Human, set:
  WARRANTY_STATUS: VOID
in the tenant's dashboard.

This repository currently enforces signature presence via:
- `_ai_provenance` signature on vanguard/audit decision logs
- a lightweight git commit message check for `_ai_provenance`
  (scaffold for your commit workflow).
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional


REPO_ROOT = Path(__file__).resolve().parent


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sha256_hex(s: str) -> str:
    return hashlib.sha256(s.encode("utf-8")).hexdigest()


def _git_head_message() -> str:
    try:
        proc = subprocess.run(
            ["git", "log", "-1", "--format=%B"],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=10,
        )
        return (proc.stdout or "").strip()
    except Exception:
        return ""


def _verify_decision_log_provenance(decision: Dict[str, Any]) -> bool:
    prov = decision.get("_ai_provenance")
    if not isinstance(prov, dict):
        return False
    provenance_object = prov.get("provenance_object")
    signature = prov.get("signature")
    if not isinstance(provenance_object, dict):
        return False
    if not isinstance(signature, str) or not signature:
        return False

    # Mirror the agent's signature formula:
    # sha256(model_version|input_attribution_hash|human_review_status)
    model_version = str(provenance_object.get("model_version") or "")
    input_hash = str(provenance_object.get("input_attribution_hash") or "")
    human_review_status = str(provenance_object.get("human_review_status") or "")
    expected = _sha256_hex(f"{model_version}|{input_hash}|{human_review_status}")
    return expected == signature


def _check_audit_logs(tenant_id: str, limit: int = 100) -> List[str]:
    audit_dir = REPO_ROOT / "vanguard" / "audit"
    if not audit_dir.exists():
        return [f"Missing audit dir: {audit_dir}"]

    decision_files = sorted(
        [p for p in audit_dir.glob("*.json") if p.is_file()],
        key=lambda p: p.stat().st_mtime,
        reverse=True,
    )

    tenant_decisions: List[Path] = []
    for f in decision_files:
        if len(tenant_decisions) >= limit:
            break
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
            if isinstance(data, dict) and data.get("tenant_id") == tenant_id:
                tenant_decisions.append(f)
        except Exception:
            continue

    issues: List[str] = []
    for f in tenant_decisions:
        try:
            decision = json.loads(f.read_text(encoding="utf-8"))
            if not _verify_decision_log_provenance(decision):
                issues.append(f"Invalid/missing _ai_provenance in {f.name}")
        except Exception:
            issues.append(f"Unreadable decision log: {f.name}")

    if not tenant_decisions:
        issues.append(f"No decision logs found for tenant {tenant_id}.")

    return issues


def _write_dashboard(tenant_id: str, payload: Dict[str, Any]) -> None:
    p = REPO_ROOT / "tenants" / tenant_id / "dashboard.json"
    p.parent.mkdir(parents=True, exist_ok=True)
    current: Dict[str, Any] = {}
    try:
        if p.exists():
            current = json.loads(p.read_text(encoding="utf-8"))
            if not isinstance(current, dict):
                current = {}
    except Exception:
        current = {}

    current.update(payload)
    p.write_text(json.dumps(current, ensure_ascii=False, indent=2), encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description="Check warranty integrity (APP provenance).")
    parser.add_argument("--tenant_id", type=str, default=os.getenv("TENANT_ID") or os.getenv("TENANT_SLUG") or "root")
    args = parser.parse_args()

    tenant_id = str(args.tenant_id).strip() or "root"
    issues: List[str] = []

    head_message = _git_head_message()
    if "_ai_provenance" not in head_message:
        issues.append("HEAD commit message missing `_ai_provenance` marker.")

    issues.extend(_check_audit_logs(tenant_id))

    warranty_status = "OK" if not issues else "VOID"
    _write_dashboard(
        tenant_id,
        {
            "WARRANTY_STATUS": warranty_status,
            "checked_at": _utc_now_iso(),
            "warranty_issues": issues,
        },
    )

    # Print a small machine-readable summary.
    print(
        json.dumps(
            {"tenant_id": tenant_id, "WARRANTY_STATUS": warranty_status, "issue_count": len(issues)},
            ensure_ascii=False,
        )
    )


if __name__ == "__main__":
    main()

