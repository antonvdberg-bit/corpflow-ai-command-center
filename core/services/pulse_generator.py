"""
Knowledge Pulse Generator (Tiered Notifications)

Scans `core/knowledge_base/` for new "Core Learning" updates and emits
tenant-scoped notifications based on:
1) Tenant tier (`client_tier` in `vanguard/secrets-manifest.json`)
2) Tenant deployed functionality (access clusters)
3) Update applicability (files tagged with `Tenant:` and/or
   `deployed_functionality:` metadata; falls back to keyword heuristics)

Tenant isolation:
- Notifications are generated per tenant and only include updates that
  are applicable to that tenant (never mention other tenants' updates).
"""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional, Set, Tuple


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SECRETS_MANIFEST_PATH = REPO_ROOT / "vanguard" / "secrets-manifest.json"
KNOWLEDGE_BASE_DIR = REPO_ROOT / "core" / "knowledge_base"
PULSE_STATE_PATH = REPO_ROOT / "vanguard" / "pulse_state.json"
PULSE_OUTBOX_PATH = REPO_ROOT / "vanguard" / "audit-trail" / "pulse_outbox.jsonl"


CLUSTER_NORMALIZATION: Dict[str, str] = {
    # Back-compat: staff matrix uses "Operations" while earlier access clusters used "Comms".
    "Comms": "Comms",
    "Operations": "Operations",
}


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _read_json_file(path: Path) -> Optional[Dict[str, Any]]:
    try:
        if not path.exists():
            return None
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return None


def _write_json_file(path: Path, payload: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")


def _read_pulse_state() -> Dict[str, Any]:
    state = _read_json_file(PULSE_STATE_PATH)
    if not state:
        return {"tenants": {}}
    if not isinstance(state, dict):
        return {"tenants": {}}
    if "tenants" not in state or not isinstance(state["tenants"], dict):
        state["tenants"] = {}
    return state


def _write_pulse_state(state: Dict[str, Any]) -> None:
    _write_json_file(PULSE_STATE_PATH, state)


def _normalize_cluster_names(names: Iterable[str]) -> Set[str]:
    out: Set[str] = set()
    for n in names:
        if not n:
            continue
        out.add(str(n).strip())
    return out


def _extract_tenant_from_file(text: str) -> Optional[str]:
    # Example: "Tenant: luxe-maurice" near top.
    m = re.search(r"(?im)^Tenant:\s*(?P<id>[a-zA-Z0-9_\-]+)\s*$", text)
    if m:
        return m.group("id").strip()
    return None


def _extract_deployed_functionality_from_file(text: str) -> Optional[Set[str]]:
    # Support YAML-like snippets:
    # - deployed_functionality: ["Marketing","Financials"]
    # - deployed_functionality: [Marketing, Financials]
    # - deployed_functionality: newline then bullet list
    limited = "\n".join(text.splitlines()[:80])

    m1 = re.search(r"(?im)^deployed_functionality:\s*\[(?P<list>[^\]]*)\]", limited)
    if m1:
        raw = m1.group("list")
        items = [s.strip().strip('"').strip("'") for s in raw.split(",") if s.strip()]
        return _normalize_cluster_names(items)

    m2 = re.search(r"(?im)^deployed_functionality:\s*$", limited)
    if m2:
        after = limited[m2.end() :].splitlines()
        items: List[str] = []
        for line in after:
            line = line.strip()
            if not line.startswith("-"):
                break
            items.append(line.lstrip("-").strip().strip('"').strip("'"))
        if items:
            return _normalize_cluster_names(items)
    return None


def _derive_clusters_from_content(content: str) -> Set[str]:
    """Heuristic cluster derivation when explicit metadata is missing."""
    t = content.lower()
    clusters: Set[str] = set()

    # Financials
    if any(k in t for k in ["baserow", "cost", "budget", "pricing", "roi", "market value"]):
        clusters.add("Financials")

    # Marketing
    if any(k in t for k in ["marketing", "attribution", "lead source", "campaign", "utm", "referral"]):
        clusters.add("Marketing")

    # Comms / Operations
    if any(k in t for k in ["whatsapp", "telegram", "twilio", "supplier", "onboard", "notification"]):
        clusters.add("Comms")

    # Tech/Admin / Operations (optional)
    if any(k in t for k in ["mcp", "memory", "agent", "sandbox", "vercel", "router"]):
        clusters.add("Tech_Admin")

    # Safe fallback: treat as applicable to all known clusters.
    return clusters or {"Financials", "Marketing", "Comms", "Tech_Admin", "Operations"}


def _knowledge_base_updates() -> List[Path]:
    if not KNOWLEDGE_BASE_DIR.exists():
        return []
    files = sorted(KNOWLEDGE_BASE_DIR.glob("*.md"), key=lambda p: p.stat().st_mtime)
    return files


def _get_tenant_tier_and_clusters(manifest: Dict[str, Any], tenant_id: str) -> Tuple[str, Set[str]]:
    access = manifest.get("tenant_access", {}).get(tenant_id, {})
    tier = str(access.get("client_tier") or "PERIODIC").upper()
    clusters_block = access.get("access_clusters") or {}
    cluster_names: List[str] = []

    clusters = clusters_block.get("clusters")
    if isinstance(clusters, list):
        for c in clusters:
            if isinstance(c, dict) and c.get("name"):
                cluster_names.append(str(c["name"]))

    return tier, _normalize_cluster_names(cluster_names)


def _get_authorized_rep_contacts(tenant_id: str) -> List[str]:
    # Best-effort: load staff-matrix for tenant.
    # Contact details are optional; we only send via WhatsApp if present.
    sm_path1 = REPO_ROOT / "tenants" / tenant_id / "config" / "staff-matrix.json"
    sm_path2 = REPO_ROOT / "tenants" / tenant_id / "config" / "staff_matrix.json"
    sm = _read_json_file(sm_path1) or _read_json_file(sm_path2) or {}
    reps = sm.get("authorized_representatives") if isinstance(sm, dict) else []
    contacts: List[str] = []
    if isinstance(reps, list):
        for r in reps:
            if not isinstance(r, dict):
                continue
            cd = r.get("contact_details") or {}
            if not isinstance(cd, dict):
                continue
            num = cd.get("whatsapp_number")
            if num:
                contacts.append(str(num))
    return contacts


def _should_send_for_tier(*, tier: str, now: datetime, last_sent_at: Optional[datetime]) -> bool:
    if tier == "EVOLVING":
        # Real-time: caller decides if there are matching new updates.
        return True
    if tier == "STATIC":
        threshold = timedelta(days=30)
    else:
        # PERIODIC default
        threshold = timedelta(days=7)

    if last_sent_at is None:
        return True
    return (now - last_sent_at) >= threshold


def _read_update_file_text(p: Path, max_chars: int = 3000) -> str:
    try:
        txt = p.read_text(encoding="utf-8")
        return txt[:max_chars]
    except Exception:
        return ""


@dataclass(frozen=True)
class TenantPulse:
    tenant_id: str
    tier: str
    deployed_clusters: Set[str]


def _build_notification_message(*, tenant_id: str, update_files: List[Path]) -> str:
    # Keep it non-sensitive: no cross-tenant info; just file basenames/counts.
    lines = [
        "📡 Knowledge Pulse",
        f"Tenant: {tenant_id}",
        f"New updates: {len(update_files)}",
        "",
        "Updates:",
    ]
    for p in update_files[:20]:
        lines.append(f"- {p.name}")
    if len(update_files) > 20:
        lines.append(f"- ...and {len(update_files) - 20} more")
    return "\n".join(lines)


def _emit_outbox(*, tenant_id: str, message: str, update_files: List[Path]) -> None:
    payload = {
        "occurred_at": _now_utc().isoformat(),
        "tenant_id": tenant_id,
        "message_preview": message[:500],
        "update_files": [p.name for p in update_files],
    }
    try:
        PULSE_OUTBOX_PATH.parent.mkdir(parents=True, exist_ok=True)
        with open(PULSE_OUTBOX_PATH, "a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:
        pass


def _try_send_whatsapp(*, contacts: List[str], message: str) -> None:
    if not contacts:
        return
    try:
        from core.services.whatsapp_notifier import send_whatsapp_alert  # type: ignore

        for to in contacts:
            to = str(to).strip()
            if not to:
                continue
            to_whatsapp = to.startswith("whatsapp:") and to or f"whatsapp:{to}"
            send_whatsapp_alert(body=message, to_whatsapp=to_whatsapp)
    except Exception:
        # Best-effort only.
        return


def run_pulse_scan(*, dry_run: bool = False) -> Dict[str, Any]:
    now = _now_utc()
    manifest = _read_json_file(SECRETS_MANIFEST_PATH) or {}
    state = _read_pulse_state()

    updates = _knowledge_base_updates()

    # Preload update texts and derived clusters once.
    update_records: List[Dict[str, Any]] = []
    for p in updates:
        txt = _read_update_file_text(p)
        origin_tenant = _extract_tenant_from_file(txt)
        tags = _extract_deployed_functionality_from_file(txt)
        clusters = tags or _derive_clusters_from_content(txt)
        update_records.append(
            {
                "path": p,
                "name": p.name,
                "origin_tenant": origin_tenant,
                "clusters": clusters,
                "mtime": datetime.fromtimestamp(p.stat().st_mtime, tz=timezone.utc).isoformat(),
            }
        )

    results: Dict[str, Any] = {"sent_tenants": []}

    for tenant_id in (manifest.get("tenant_access") or {}).keys():
        tier, deployed_clusters = _get_tenant_tier_and_clusters(manifest, tenant_id)
        tenant_state = state["tenants"].get(tenant_id) or {}

        last_sent_at_raw = tenant_state.get("last_sent_at")
        last_sent_at: Optional[datetime] = None
        if last_sent_at_raw:
            try:
                last_sent_at = datetime.fromisoformat(str(last_sent_at_raw))
            except Exception:
                last_sent_at = None

        sent_files: Set[str] = set(tenant_state.get("sent_files") or [])
        matching_new_files: List[Path] = []

        for rec in update_records:
            if rec["name"] in sent_files:
                continue
            # Strong isolation: pattern exports should be tenant-scoped.
            # If `Tenant:` metadata is missing, skip by default.
            if rec["origin_tenant"] and rec["origin_tenant"] != tenant_id:
                continue
            if not rec["origin_tenant"]:
                continue

            overlap = rec["clusters"].intersection(deployed_clusters) if deployed_clusters else set()
            if not overlap:
                continue

            matching_new_files.append(rec["path"])

        if not matching_new_files:
            continue

        due = _should_send_for_tier(
            tier=tier, now=now, last_sent_at=last_sent_at
        )
        if not due:
            continue

        contacts = _get_authorized_rep_contacts(tenant_id)
        message = _build_notification_message(
            tenant_id=tenant_id, update_files=matching_new_files
        )

        _emit_outbox(tenant_id=tenant_id, message=message, update_files=matching_new_files)
        if not dry_run:
            _try_send_whatsapp(contacts=contacts, message=message)

        # Update state after sending.
        sent_names = [p.name for p in matching_new_files]
        tenant_state["last_sent_at"] = now.isoformat()
        tenant_state["sent_files"] = sorted(list((sent_files.union(set(sent_names)))))
        state["tenants"][tenant_id] = tenant_state
        results["sent_tenants"].append(tenant_id)

    _write_pulse_state(state)
    return results


def main() -> None:
    import argparse

    parser = argparse.ArgumentParser(description="Generate tiered knowledge pulses.")
    parser.add_argument("--dry-run", action="store_true", help="Do not send WhatsApp, only update outbox/state.")
    parser.add_argument("--once", action="store_true", help="Run once and exit (default).")
    args = parser.parse_args()

    run_pulse_scan(dry_run=bool(args.dry_run))


if __name__ == "__main__":
    main()

