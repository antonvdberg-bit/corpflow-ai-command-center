"""
Billing Sentinel (Cash-Positive Float)

Iterates through active tenant personas (`tenants/*/persona.json`) and checks:
token_credit_balance < 20% of monthly_retainer_usd.

On breach it emits:
- CRITICAL_INFLOW_REQUIRED telemetry event
- CMP outbox entry
- mock email/webhook notification artifact
"""

from __future__ import annotations

import json
import os
import urllib.request
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from core.services.vanguard_telemetry import emit_logic_failure


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
SECRETS_MANIFEST_PATH = REPO_ROOT / "vanguard" / "secrets-manifest.json"

def _postgres_url() -> str:
    """Return pooled Postgres URL when configured (operator visibility only)."""
    return (os.getenv("POSTGRES_URL") or os.getenv("DATABASE_URL") or "").strip()
OUTBOX_PATH = REPO_ROOT / "vanguard" / "audit-trail" / "cmp_inflow_required_outbox.jsonl"
STATE_PATH = REPO_ROOT / "vanguard" / "billing_sentinel_state.json"
MOCK_NOTIFICATIONS_PATH = REPO_ROOT / "vanguard" / "audit-trail" / "billing_mock_notifications.jsonl"


def _now_utc_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_json_file(path: Path) -> Optional[Dict[str, Any]]:
    try:
        if not path.exists():
            return None
        data = json.loads(path.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else None
    except Exception:
        return None


def _load_state() -> Dict[str, Any]:
    st = _read_json_file(STATE_PATH) or {}
    if not isinstance(st, dict):
        return {}
    return st


def _save_state(state: Dict[str, Any]) -> None:
    try:
        STATE_PATH.parent.mkdir(parents=True, exist_ok=True)
        STATE_PATH.write_text(json.dumps(state, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception:
        pass


def _current_month_key() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m")


def _iter_active_persona_files() -> List[Path]:
    tenants_root = REPO_ROOT / "tenants"
    if not tenants_root.exists():
        return []
    return sorted([p for p in tenants_root.glob("*/persona.json") if p.is_file()])


def _get_authorized_representative_whatsapp_numbers(tenant_id: str) -> List[str]:
    """
    Best-effort: look for staff-matrix files in tenant config.
    """
    p1 = REPO_ROOT / "tenants" / tenant_id / "config" / "staff-matrix.json"
    p2 = REPO_ROOT / "tenants" / tenant_id / "config" / "staff_matrix.json"
    sm = _read_json_file(p1) or _read_json_file(p2) or {}
    reps = sm.get("authorized_representatives") if isinstance(sm, dict) else None
    if not isinstance(reps, list):
        return []
    numbers: List[str] = []
    for r in reps:
        if not isinstance(r, dict):
            continue
        cd = r.get("contact_details") or {}
        if not isinstance(cd, dict):
            continue
        num = cd.get("whatsapp_number")
        if num:
            numbers.append(str(num))
    return numbers


def _notify_cmp_inflow_required(*, tenant_id: str, token_balance_usd: float, monthly_retainer_usd: float) -> None:
    payload = {
        "occurred_at": _now_utc_iso(),
        "tenant_id": tenant_id,
        "event": "CRITICAL_INFLOW_REQUIRED",
        "token_credit_balance_usd": float(token_balance_usd),
        "monthly_retainer_usd": float(monthly_retainer_usd),
        "threshold_usd": float(0.2 * monthly_retainer_usd),
        "message": "Top up token_credit_balance to re-enable autonomous execution.",
    }
    try:
        OUTBOX_PATH.parent.mkdir(parents=True, exist_ok=True)
        with OUTBOX_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:
        pass

    # Optional WhatsApp notification.
    try:
        from core.services.whatsapp_notifier import send_whatsapp_alert  # type: ignore

        contacts = _get_authorized_representative_whatsapp_numbers(tenant_id)
        for to in contacts:
            to = str(to).strip()
            if not to:
                continue
            to_whatsapp = to if to.startswith("whatsapp:") else f"whatsapp:{to}"
            send_whatsapp_alert(
                body=(
                    "Inflow Required (Cash-Positive guardrail)\n\n"
                    f"Tenant: {tenant_id}\n"
                    f"Token credits: ${token_balance_usd:.2f}\n"
                    f"20% threshold: ${0.2 * monthly_retainer_usd:.2f}\n\n"
                    "Please top up to re-enable expensive tool usage."
                ),
                to_whatsapp=to_whatsapp,
            )
    except Exception:
        pass


def _trigger_mock_email_webhook(*, tenant_id: str, token_balance_usd: float, monthly_retainer_usd: float) -> None:
    payload = {
        "occurred_at": _now_utc_iso(),
        "tenant_id": tenant_id,
        "event": "CRITICAL_INFLOW_REQUIRED",
        "channel": "mock_email_webhook",
        "subject": "Token credits critically low",
        "body": {
            "token_credit_balance_usd": float(token_balance_usd),
            "monthly_retainer_usd": float(monthly_retainer_usd),
            "threshold_usd": float(0.2 * monthly_retainer_usd),
        },
    }

    try:
        MOCK_NOTIFICATIONS_PATH.parent.mkdir(parents=True, exist_ok=True)
        with MOCK_NOTIFICATIONS_PATH.open("a", encoding="utf-8") as f:
            f.write(json.dumps(payload, ensure_ascii=False) + "\n")
    except Exception:
        pass

    webhook = (os.getenv("MOCK_BILLING_WEBHOOK_URL") or "").strip()
    if webhook:
        try:
            req = urllib.request.Request(
                webhook,
                data=json.dumps(payload).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            urllib.request.urlopen(req, timeout=3).read()
        except Exception:
            pass


def check_billing_sentinel(*, minimum_retainer_usd: float = 0.0) -> Dict[str, Any]:
    state = _load_state()

    month_key = _current_month_key()
    triggered: List[str] = []

    for persona_path in _iter_active_persona_files():
        tenant_id = persona_path.parent.name
        persona = _read_json_file(persona_path) or {}
        if not isinstance(persona, dict):
            persona = {}
        if persona.get("active") is False:
            continue

        token_balance = float(persona.get("token_credit_balance", 0.0) or 0.0)
        monthly_retainer_usd = persona.get("monthly_retainer_usd")

        if monthly_retainer_usd is None:
            default_retainer = float(os.getenv("DEFAULT_MONTHLY_RETAINER_USD", "0.0"))
            monthly_retainer_usd = default_retainer

        try:
            monthly_retainer_usd = float(monthly_retainer_usd or 0.0)
        except Exception:
            monthly_retainer_usd = 0.0

        if monthly_retainer_usd <= float(minimum_retainer_usd):
            continue

        threshold_usd = 0.2 * monthly_retainer_usd
        if token_balance < threshold_usd:
            prev = state.get(tenant_id) or {}
            last_notified_month = prev.get("last_notified_month")
            if last_notified_month == month_key:
                continue

            _notify_cmp_inflow_required(
                tenant_id=tenant_id,
                token_balance_usd=token_balance,
                monthly_retainer_usd=monthly_retainer_usd,
            )
            try:
                from core.services.vanguard_telemetry import emit_event  # type: ignore

                emit_event(
                    {
                        "event_type": "CRITICAL_INFLOW_REQUIRED",
                        "tenant_id": tenant_id,
                        "cmp": {"ticket_id": "n/a", "action": "billing-sentinel"},
                        "payload": {
                            "severity": "critical",
                            "token_credit_balance_usd": token_balance,
                            "monthly_retainer_usd": monthly_retainer_usd,
                            "threshold_usd": threshold_usd,
                            "recommended_action": "Immediate top-up required.",
                        },
                    }
                )
            except Exception:
                emit_logic_failure(
                    source="core/services/billing_sentinel.py",
                    severity="warning",
                    error=Exception("CRITICAL_INFLOW_REQUIRED"),
                    recommended_action="Inflow required: client must top up token credits.",
                    cmp={"ticket_id": "n/a", "action": "billing-sentinel"},
                    meta={
                        "tenant_id": tenant_id,
                        "token_credit_balance_usd": token_balance,
                        "monthly_retainer_usd": monthly_retainer_usd,
                        "threshold_usd": threshold_usd,
                    },
                )

            _trigger_mock_email_webhook(
                tenant_id=tenant_id,
                token_balance_usd=token_balance,
                monthly_retainer_usd=monthly_retainer_usd,
            )
            state[tenant_id] = {"last_notified_month": month_key}
            triggered.append(tenant_id)

    _save_state(state)
    return {
        "ok": True,
        "month": month_key,
        "triggered_tenants": triggered,
        "postgres_url_configured": bool(_postgres_url()),
    }


def main() -> None:
    out = check_billing_sentinel()
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()

