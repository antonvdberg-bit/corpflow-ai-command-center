"""
Delegated Authority Matrix (DAM) gatekeeper

Utility that checks whether a requested agent-tool call is authorized for
the tenant's tier before execution.
"""

from __future__ import annotations

import json
import os
from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from core.services.vanguard_telemetry import emit_logic_failure


REPO_ROOT = Path(__file__).resolve().parent
DAM_PATH = REPO_ROOT / "vanguard" / "dam-v1.json"
SECRETS_MANIFEST_PATH = REPO_ROOT / "vanguard" / "secrets-manifest.json"


class DamViolationError(PermissionError):
    """Raised when DAM denies a requested high-risk action."""


@lru_cache(maxsize=1)
def _load_dam() -> Dict[str, Any]:
    if not DAM_PATH.exists():
        return {"schema_version": "1", "high_risk_actions": []}
    try:
        return json.loads(DAM_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {"schema_version": "1", "high_risk_actions": []}


@lru_cache(maxsize=1)
def _load_manifest() -> Dict[str, Any]:
    if not SECRETS_MANIFEST_PATH.exists():
        return {}
    try:
        return json.loads(SECRETS_MANIFEST_PATH.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _get_tenant_tier(tenant_id: str) -> str:
    manifest = _load_manifest()
    tier = (
        manifest.get("tenant_access", {})
        .get(tenant_id, {})
        .get("client_tier", "PERIODIC")
    )
    tier = str(tier).upper()
    if tier not in {"STATIC", "PERIODIC", "EVOLVING"}:
        return "PERIODIC"
    return tier


def _tool_name_matches(tool_name: str, keywords: List[str]) -> bool:
    t = (tool_name or "").lower()
    for kw in keywords:
        if kw and kw.lower() in t:
            return True
    return False


@dataclass(frozen=True)
class DamDecision:
    allowed: bool
    matched_action_key: Optional[str] = None
    tenant_tier: str = "PERIODIC"
    reason: str = ""


def check_dam_authorization(
    *,
    tenant_id: str,
    tool_name: str,
    action_id: str,
    requested_action: Optional[str] = None,
    tenant_tier: Optional[str] = None,
) -> DamDecision:
    """
    Check DAM and return a decision.

    Raises:
        DamViolationError: when denied.
    """
    tier = (tenant_tier or _get_tenant_tier(tenant_id)).upper()
    dam = _load_dam()
    high_risk_actions = dam.get("high_risk_actions") or []

    normalized_tool = str(requested_action or tool_name or "")

    for entry in high_risk_actions:
        action_key = str(entry.get("action_key") or "")
        match_any = entry.get("match_any") or {}
        keywords = (match_any.get("tool_name_keywords") or []) if isinstance(match_any, dict) else []
        allowed_tiers = entry.get("allowed_tiers") or []

        if keywords and _tool_name_matches(normalized_tool, keywords):
            if tier in allowed_tiers:
                return DamDecision(
                    allowed=True,
                    matched_action_key=action_key,
                    tenant_tier=tier,
                    reason="Allowed by DAM.",
                )

            reason = (
                f"DAM Violation: action='{action_key}' requires one of {allowed_tiers} "
                f"but tenant tier is {tier}. tool_name='{tool_name}'."
            )
            emit_logic_failure(
                source="gatekeeper.py:DAM",
                severity="fatal",
                error=Exception(reason),
                recommended_action="Human authorization required for this delegated high-risk action.",
                cmp={"ticket_id": "n/a", "action": "dam-violation"},
                meta={"tenant_id": tenant_id, "tenant_tier": tier, "action_id": action_id, "tool_name": tool_name},
            )
            return DamDecision(
                allowed=False,
                matched_action_key=action_key,
                tenant_tier=tier,
                reason=reason,
            )

    # Not a matched high-risk action -> allow.
    return DamDecision(allowed=True, tenant_tier=tier, reason="Not a matched high-risk action.")


def enforce_dam_or_raise(
    *,
    tenant_id: str,
    tool_name: str,
    action_id: str,
    requested_action: Optional[str] = None,
    tenant_tier: Optional[str] = None,
) -> DamDecision:
    """Enforce DAM and raise when denied."""
    decision = check_dam_authorization(
        tenant_id=tenant_id,
        tool_name=tool_name,
        action_id=action_id,
        requested_action=requested_action,
        tenant_tier=tenant_tier,
    )
    if not decision.allowed:
        raise DamViolationError(decision.reason)
    return decision

