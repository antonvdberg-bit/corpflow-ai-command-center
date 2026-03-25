"""
Vanguard Telemetry Emitter (v1)

This module provides a safe, dependency-light way to emit Vanguard telemetry
events for Factory health, logic failures, and cost overruns.

Telemetry is best-effort:
- Primary sink: append JSONL to `vanguard/audit-trail/telemetry-v1.jsonl`
- Optional sink: POST to `TELEMETRY_ENDPOINT_URL` if configured

Never include raw secrets in emitted error messages/stack traces.
"""

from __future__ import annotations

import json
import os
import traceback
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import requests


DEFAULT_TELEMETRY_FILE = "vanguard/audit-trail/telemetry-v1.jsonl"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _get_tenant_id() -> str:
    return os.getenv("TENANT_ID") or os.getenv("TENANT_SLUG") or "root"


def _get_factory_id() -> str:
    return os.getenv("FACTORY_ID") or "corpflow-factory"


def _redact(value: str) -> str:
    # Simple redaction: remove obvious token-like substrings.
    return (
        value.replace("Token ", "Token [REDACTED] ")
        .replace("Bearer ", "Bearer [REDACTED] ")
        .replace("api_key=", "api_key=[REDACTED]")
    )


def emit_event(event: Dict[str, Any]) -> Dict[str, Any]:
    """
    Emit a Vanguard telemetry event (best-effort).

    Args:
        event: Event dict. Must include `event_type`, `cmp`, and `payload`.

    Returns:
        The normalized event dict that was attempted to be emitted.
    """
    base_event: Dict[str, Any] = {
        "schema_version": "1",
        "event_type": event.get("event_type"),
        "occurred_at": _now_iso(),
        "factory_id": _get_factory_id(),
        "report_target": os.getenv("TELEMETRY_TARGET", "file_local"),
        "tenant_id": event.get("tenant_id") or _get_tenant_id(),
        "cmp": event.get("cmp") or {"ticket_id": "n/a", "action": "unknown"},
        "payload": event.get("payload") or {},
    }

    # Local JSONL sink
    try:
        telemetry_file = os.getenv("TELEMETRY_FILE_PATH", DEFAULT_TELEMETRY_FILE)
        os.makedirs(os.path.dirname(telemetry_file), exist_ok=True)
        with open(telemetry_file, "a", encoding="utf-8") as f:
            f.write(json.dumps(base_event, ensure_ascii=False) + "\n")
    except Exception:
        # Never allow telemetry emission to break the primary request.
        pass

    # Optional remote sink
    endpoint = os.getenv("TELEMETRY_ENDPOINT_URL", "").strip()
    if endpoint:
        try:
            requests.post(
                endpoint,
                json=base_event,
                timeout=3,
                headers={"Content-Type": "application/json"},
            )
        except Exception:
            pass

    return base_event


def emit_logic_failure(
    *,
    source: str,
    severity: str,
    error: Exception,
    recommended_action: str,
    cmp: Optional[Dict[str, str]] = None,
    meta: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Emit a `logic_failure` telemetry event.

    Args:
        source: File/module or endpoint origin.
        severity: info|warning|error|fatal
        error: The exception to serialize (redacted).
        recommended_action: Operator hint for CMP recovery.
        cmp: CMP context with `ticket_id` + `action`.
        meta: Extra metadata (no secrets).

    Returns:
        The emitted normalized event.
    """
    err_message = _redact(str(getattr(error, "message", error)))
    err_name = _redact(str(error.__class__.__name__))
    stack = _redact("".join(traceback.format_exception(type(error), error, error.__traceback__)))

    return emit_event(
        {
            "event_type": "logic_failure",
            "cmp": cmp or {"ticket_id": "n/a", "action": "unknown"},
            "payload": {
                "source": source,
                "severity": severity,
                "error_message": err_message,
                "error_class": err_name,
                "stack_trace_redacted": stack,
                "recommended_action": recommended_action,
                "meta": meta or {},
            },
        }
    )


def emit_cost_overrun(
    *,
    expected_usd: float,
    actual_usd: float,
    budget_key: str,
    breakdown: Optional[Dict[str, Any]] = None,
    tenant_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Emit a `cost_overrun` telemetry event (budget/cost gate failures).

    Args:
        expected_usd: Expected budget threshold (cap).
        actual_usd: Actual cost estimate that exceeded the cap.
        budget_key: Key describing what budget was applied.
        breakdown: Optional cost breakdown (must not include secrets).
        tenant_id: Optional tenant id override.

    Returns:
        The emitted normalized event dict.
    """
    overrun_usd = float(actual_usd) - float(expected_usd)
    payload = {
        "currency": "USD",
        "expected_usd": float(expected_usd),
        "actual_usd": float(actual_usd),
        "overrun_usd": overrun_usd,
        "budget_key": budget_key,
        "breakdown": breakdown or {},
    }
    return emit_event(
        {
            "event_type": "cost_overrun",
            "tenant_id": tenant_id or _get_tenant_id(),
            "cmp": {"ticket_id": "n/a", "action": "budget-gate"},
            "payload": payload,
        }
    )

