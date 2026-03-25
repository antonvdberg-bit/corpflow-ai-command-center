"""
Tenant provisioning utility.

On first run for a tenant, ensure `tenants/<tenant_id>/persona.json` exists.
The initial persona uses:
- token_credit_balance from DEFAULT_TOKEN_CREDIT_BALANCE_USD
- monthly_retainer_usd mapped from vanguard/secrets-manifest.json (fallback env)
- current_rank = "Intern"
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Optional


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SECRETS_MANIFEST_PATH = REPO_ROOT / "vanguard" / "secrets-manifest.json"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_json(path: Path) -> Optional[Dict[str, Any]]:
    try:
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _map_monthly_retainer_usd(tenant_id: str) -> float:
    manifest = _read_json(SECRETS_MANIFEST_PATH) or {}
    tenant_access = (manifest.get("tenant_access") or {}).get(tenant_id) or {}

    # Preferred explicit key.
    raw = tenant_access.get("monthly_retainer_usd")
    # Optional fallback under workspace_identifiers for backward compatibility.
    if raw is None and isinstance(tenant_access.get("workspace_identifiers"), dict):
        raw = tenant_access["workspace_identifiers"].get("monthly_retainer_usd")

    if raw is None:
        raw = os.getenv("DEFAULT_MONTHLY_RETAINER_USD", "0")

    try:
        return float(raw)
    except Exception:
        return float(os.getenv("DEFAULT_MONTHLY_RETAINER_USD", "0"))


def ensure_tenant_persona(tenant_id: str) -> Dict[str, Any]:
    tenant_id = (tenant_id or "").strip() or "root"
    persona_path = REPO_ROOT / "tenants" / tenant_id / "persona.json"
    persona_path.parent.mkdir(parents=True, exist_ok=True)

    if persona_path.exists():
        return {
            "ok": True,
            "tenant_id": tenant_id,
            "created": False,
            "persona_path": str(persona_path),
        }

    token_default = float(os.getenv("DEFAULT_TOKEN_CREDIT_BALANCE_USD", "0"))
    monthly_retainer = _map_monthly_retainer_usd(tenant_id)

    persona = {
        "schema_version": "1",
        "tenant_id": tenant_id,
        "assistant_name": f"{tenant_id}-assistant",
        "specialized_expertise": ["general_operations"],
        "knowledge_boundaries": {
            "allowed_sources": [f"tenants/{tenant_id}/context", "core/knowledge_base"],
            "blocked_sources": [],
        },
        "autonomy_level": 1,
        "trust_score": 0,
        "current_rank": "Intern",
        "token_credit_balance": float(token_default),
        "monthly_retainer_usd": float(monthly_retainer),
        "active": True,
        "updated_at": _now_iso(),
    }
    persona_path.write_text(json.dumps(persona, ensure_ascii=False, indent=2), encoding="utf-8")

    return {
        "ok": True,
        "tenant_id": tenant_id,
        "created": True,
        "persona_path": str(persona_path),
        "token_credit_balance": persona["token_credit_balance"],
        "monthly_retainer_usd": persona["monthly_retainer_usd"],
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Provision tenant persona on first run.")
    parser.add_argument("--tenant_id", type=str, required=False, default=os.getenv("TENANT_ID") or "root")
    args = parser.parse_args()
    result = ensure_tenant_persona(args.tenant_id)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()

