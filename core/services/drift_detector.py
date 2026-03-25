"""
Drift Detector (Router Graphrag)

Compares the current `vanguard/code-graph.json` to a 5-day-old backup.
If structural divergence > 15%, triggers Mandatory Red-Team Review and
notifies CorpFlowAI executive.
"""

from __future__ import annotations

import json
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Optional, Set, Tuple

from core.services.vanguard_telemetry import emit_logic_failure


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
CURRENT_PATH = REPO_ROOT / "vanguard" / "code-graph.json"
BACKUP_DIR = REPO_ROOT / "vanguard" / "code-graph.backups"


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _load_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _to_set(value: Any) -> Set[str]:
    if isinstance(value, list):
        return {str(x) for x in value if x is not None}
    return set()


def _jaccard(a: Set[str], b: Set[str]) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    inter = len(a.intersection(b))
    union = len(a.union(b))
    return inter / union if union else 0.0


def structural_divergence_pct(current: Dict[str, Any], backup: Dict[str, Any]) -> float:
    """
    Compute a combined divergence score across actions, requires, and imports sources.
    """
    cur_actions = _to_set(current.get("actions"))
    b_actions = _to_set(backup.get("actions"))

    cur_requires = _to_set(current.get("requires"))
    b_requires = _to_set(backup.get("requires"))

    cur_import_sources: Set[str] = set()
    for imp in current.get("imports") or []:
        if isinstance(imp, dict) and imp.get("source"):
            cur_import_sources.add(str(imp["source"]))

    b_import_sources: Set[str] = set()
    for imp in backup.get("imports") or []:
        if isinstance(imp, dict) and imp.get("source"):
            b_import_sources.add(str(imp["source"]))

    jac_actions = _jaccard(cur_actions, b_actions)
    jac_requires = _jaccard(cur_requires, b_requires)
    jac_imports = _jaccard(cur_import_sources, b_import_sources)

    similarity = (jac_actions + jac_requires + jac_imports) / 3.0
    divergence = (1.0 - similarity) * 100.0
    return float(divergence)


def _notify_executive(message: str) -> None:
    """
    Best-effort executive notification via WhatsApp bridge.
    """
    to_number = (str(__import__("os").getenv("EXEC_WHATSAPP_NUMBER", "")) or "").strip()
    if not to_number:
        return

    try:
        from core.services.whatsapp_notifier import send_whatsapp_alert  # type: ignore

        to_whatsapp = to_number.startswith("whatsapp:") and to_number or f"whatsapp:{to_number}"
        send_whatsapp_alert(body=message, to_whatsapp=to_whatsapp)
    except Exception:
        return


def run_drift_check(*, threshold_pct: float = 15.0) -> Dict[str, Any]:
    now = _now_utc()
    target_date = (now - timedelta(days=5)).strftime("%Y-%m-%d")
    backup_path = BACKUP_DIR / f"{target_date}.json"

    current = _load_json(CURRENT_PATH)
    backup = _load_json(backup_path)

    if current is None:
        emit_logic_failure(
            source="core/services/drift_detector.py:load_current",
            severity="fatal",
            error=Exception("Missing vanguard/code-graph.json"),
            recommended_action="Generate code-graph.json before running drift detection.",
            cmp={"ticket_id": "n/a", "action": "drift-detector"},
        )
        return {"ok": False, "error": "missing_current"}

    if backup is None:
        # Scaffold behavior: if backup missing, report but do not block.
        emit_logic_failure(
            source="core/services/drift_detector.py:load_backup",
            severity="warning",
            error=Exception(f"Missing backup: {backup_path}"),
            recommended_action="Ensure code-graph.backups/<date>.json exists for drift detection.",
            cmp={"ticket_id": "n/a", "action": "drift-detector"},
        )
        return {"ok": False, "error": "missing_backup", "backup_path": str(backup_path)}

    divergence = structural_divergence_pct(current=current, backup=backup)
    result = {
        "ok": True,
        "threshold_pct": float(threshold_pct),
        "divergence_pct": divergence,
        "current_path": str(CURRENT_PATH),
        "backup_path": str(backup_path),
    }

    if divergence > float(threshold_pct):
        emit_logic_failure(
            source="core/services/drift_detector.py:divergence",
            severity="fatal",
            error=Exception(f"Structural Divergence {divergence:.2f}% > {threshold_pct}%"),
            recommended_action="Mandatory Red-Team Review required before accepting router-dependent changes.",
            cmp={"ticket_id": "n/a", "action": "mandatory-red-team-review"},
            meta={"divergence_pct": divergence, "threshold_pct": threshold_pct},
        )
        _notify_executive(
            f"Mandatory Red-Team Review\n\nStructural Divergence: {divergence:.2f}%\nThreshold: {threshold_pct:.2f}%\nCurrent: {CURRENT_PATH.name}\nBackup: {backup_path.name}"
        )

    return result


def main() -> None:
    run_drift_check()


if __name__ == "__main__":
    main()

