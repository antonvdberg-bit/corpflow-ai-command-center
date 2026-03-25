"""
Vanguard Verify-Rigor (Ethical Sentinel + Budget Gate)

Evaluates change requests with:
1) Hard Budget Cap (reject if cost_estimate_usd > cap)
2) Ethical Ambiguity Score (1..10; Gemini 1.5 Pro or heuristic fallback)
3) Dual-key escalation:
   - If Ethical Ambiguity > 7:
     Step 1: Generate a Rigor Report
     Step 2: Send the report to the Client's Authorized Representative first
     Step 3: Escalate to CorpFlowAI Executive only after client acknowledgement
            OR if a high-risk threshold is hit

Security notes:
- This script must never print secrets.
- Any error output is redacted by design where possible.
"""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import traceback
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from datetime import datetime, timezone


REPO_ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(REPO_ROOT))


def _clamp(n: int, lo: int, hi: int) -> int:
    return max(lo, min(hi, n))


def _redact(value: str) -> str:
    s = value or ""
    s = re.sub(r"(?i)(token|api[_-]?key|secret)\s*=\s*[^ \n\r\t]+", r"\1=[REDACTED]", s)
    return s


def _parse_first_int_1_to_10(text: str) -> Optional[int]:
    m = re.search(r"\b([1-9]|10)\b", text or "")
    if not m:
        return None
    try:
        n = int(m.group(1))
        return _clamp(n, 1, 10)
    except Exception:
        return None


def _heuristic_ethical_score(description: str) -> int:
    """
    Deterministic fallback scoring when Gemini is unavailable.

    Returns:
        Integer score from 1..10.
    """
    d = (description or "").lower()
    keywords = [
        "fraud",
        "illegal",
        "scam",
        "coerce",
        "extort",
        "privacy",
        "pii",
        "blackmail",
        "steal",
        "bypass",
        "evade",
        "exploit",
        "manipulate",
        "unethical",
        "deceptive",
    ]
    hits = sum(1 for k in keywords if k in d)
    length_score = 0
    if len(d) > 180:
        length_score = 2
    if len(d) > 600:
        length_score = 3
    base = 2
    score = base + hits + length_score
    return _clamp(score, 1, 10)


def _gemini_ethical_score(description: str) -> int:
    """
    Attempt Gemini 1.5 Pro scoring.

    Falls back to heuristic if any error occurs.
    """
    try:
        # Core already uses GOOGLE_API_KEY as the auth env var.
        google_api_key = os.getenv("GOOGLE_API_KEY", "").strip()
        if not google_api_key:
            return _heuristic_ethical_score(description)

        gemini_model = os.getenv("ETHICS_GEMINI_MODEL", "gemini-1.5-pro").strip()
        if not gemini_model:
            gemini_model = "gemini-1.5-pro"

        from google import genai  # type: ignore

        client = genai.Client(api_key=google_api_key)

        prompt = f"""
You are an ethical compliance evaluator for a software change request.
Assign an "Ethical Ambiguity Score" from 1 to 10.

Definition:
1  = very clear / low risk / no ambiguous ethical or compliance concerns
10 = highly ambiguous, ethically risky, or potentially non-compliant actions implied

Return ONLY a single integer from 1..10.

Change request description:
{description}
""".strip()

        resp = client.models.generate_content(model=gemini_model, contents=prompt)
        text = getattr(resp, "text", None)
        if text is None:
            text = getattr(resp, "content", None)
        if text is None:
            text = str(resp)

        parsed = _parse_first_int_1_to_10(str(text))
        if parsed is None:
            return _heuristic_ethical_score(description)
        return parsed
    except Exception:
        return _heuristic_ethical_score(description)


def _maybe_notify_executives(priority: bool, description: str, score: int) -> None:
    """
    Best-effort executive escalation via WhatsApp bridge.

    If Twilio isn't installed or env vars are missing, we still emit telemetry elsewhere.
    """
    to_number = os.getenv("EXEC_WHATSAPP_NUMBER", "").strip()
    if not to_number:
        return

    # Existing repo has Twilio WhatsApp notifier; import lazily and tolerate missing deps.
    try:
        from core.services.whatsapp_notifier import send_whatsapp_alert  # type: ignore

        body = (
            f"🚨 CorpFlowAI Executives Alert\n\n"
            f"Priority: {priority}\n"
            f"Ethical Ambiguity Score: {score}/10\n"
            f"Client: {_redact(description[:200])}"
        )
        to_whatsapp = to_number.startswith("whatsapp:") and to_number or f"whatsapp:{to_number}"
        send_whatsapp_alert(body=body, to_whatsapp=to_whatsapp)
    except Exception:
        # Never fail the main gate because of notification transport.
        return


@dataclass
class VerifyInput:
    description: str
    cost_estimate_usd: float
    client_id: str
    action: str
    ticket_id: str
    authorized_rep_whatsapp_numbers: List[str]
    client_acknowledged: bool = False
    rigor_report_id: Optional[str] = None


def _pending_report_dir() -> Path:
    p = REPO_ROOT / "vanguard" / "audit-trail" / "pending_rigor_reports"
    p.mkdir(parents=True, exist_ok=True)
    return p


def _pending_report_path(client_id: str, report_id: str) -> Path:
    return _pending_report_dir() / client_id / f"{report_id}.json"


def _compute_report_id(v: VerifyInput, *, for_description: bool = True) -> str:
    """
    Create a stable report id for this request.

    Note: ack calls should pass the same `rigor_report_id` created in Step 1.
    """
    import hashlib

    base = f"{v.client_id}|{v.action}|{v.ticket_id}"
    if for_description:
        base += f"|{v.description}"
    digest = hashlib.sha256(base.encode("utf-8")).hexdigest()
    return digest[:24]


def _extract_change_summary(description: str, limit_chars: int = 1800) -> str:
    # Keep summaries safe: remove obvious token/key patterns.
    return _redact((description or "").strip())[:limit_chars]


def _send_report_to_authorized_reps(
    *,
    authorized_rep_whatsapp_numbers: List[str],
    report: Dict[str, Any],
    tenant_id: str,
) -> None:
    """
    Best-effort: send a report to client authorized representatives via WhatsApp.

    If WhatsApp transport isn't configured, we emit telemetry elsewhere.
    """
    if not authorized_rep_whatsapp_numbers:
        return

    try:
        from core.services.whatsapp_notifier import send_whatsapp_alert  # type: ignore

        rigor_report_id = str(report.get("report_id", "n/a"))
        score = int(report.get("ethical_score", 0))
        summary = str(report.get("change_summary", ""))[:600]

        for to in authorized_rep_whatsapp_numbers:
            to = str(to).strip()
            if not to:
                continue
            to_whatsapp = to.startswith("whatsapp:") and to or f"whatsapp:{to}"
            body = (
                "🛡️ Vanguard Rigor Report\n\n"
                f"Report ID: {rigor_report_id}\n"
                f"Ethical Ambiguity Score: {score}/10\n"
                f"Tenant: {_redact(tenant_id)}\n\n"
                f"Summary:\n{summary}"
            )
            send_whatsapp_alert(body=body, to_whatsapp=to_whatsapp)
    except Exception:
        # Never fail the main gate on notification transport.
        return


def verify_rigor(v: VerifyInput) -> Tuple[bool, Dict[str, Any]]:
    """
    Execute budget gate + ethical scoring + escalation rules.
    """
    from core.services.vanguard_telemetry import emit_cost_overrun, emit_logic_failure

    hard_cap_usd = float(os.getenv("HARD_BUDGET_CAP_USD", "25000"))
    high_risk_threshold = int(os.getenv("HIGH_RISK_ETHICAL_THRESHOLD", "9"))

    # Always compute ethical score for every request.
    pending_report: Optional[Dict[str, Any]] = None
    pending_loaded = False
    report_id: Optional[str] = v.rigor_report_id

    if v.rigor_report_id:
        try:
            p = _pending_report_path(v.client_id, v.rigor_report_id)
            if p.exists():
                pending_report = json.loads(p.read_text(encoding="utf-8"))
                pending_loaded = True
                report_id = v.rigor_report_id
        except Exception:
            pending_report = None

    # Load ethical/cost values from pending report if we can.
    if pending_report:
        ethical_score = int(pending_report.get("ethical_score", 0))
        cost_estimate_usd = float(pending_report.get("cost_estimate_usd", v.cost_estimate_usd))
        v.description = str(pending_report.get("description", v.description))
    else:
        ethical_score = _gemini_ethical_score(v.description)
        cost_estimate_usd = v.cost_estimate_usd

    # Escalation path (ethical)
    ethical_reject = ethical_score > 7
    executive_escalated = False
    requires_client_ack = False

    if ethical_reject:
        # Step 1: generate Rigor Report (unless already loaded for ack)
        if not pending_loaded or not pending_report:
            report_id = report_id or _compute_report_id(v, for_description=True)
            report: Dict[str, Any] = {
                "report_id": report_id,
                "client_id": v.client_id,
                "action": v.action,
                "ticket_id": v.ticket_id,
                "created_at": None,
                "ethical_score": ethical_score,
                "cost_estimate_usd": float(cost_estimate_usd),
                "hard_cap_usd": hard_cap_usd,
                "change_summary": _extract_change_summary(v.description),
                "authorized_rep_whatsapp_numbers": [],
                "notified_authorized_reps": False,
                "client_acknowledged": bool(v.client_acknowledged),
                "executive_escalated": False,
                "updated_at": None,
            }

            # Persist pending report (redacted; no secrets).
            try:
                p = _pending_report_path(v.client_id, str(report_id))
                p.write_text(
                    json.dumps(
                        {
                            **report,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "updated_at": datetime.now(timezone.utc).isoformat(),
                        },
                        ensure_ascii=False,
                    ),
                    encoding="utf-8",
                )
            except Exception:
                # Persistence failure should not leak secrets or crash.
                pass

            # Step 2: send report to client's Authorized Rep(s) first.
            _send_report_to_authorized_reps(
                authorized_rep_whatsapp_numbers=v.authorized_rep_whatsapp_numbers,
                report={**report, "report_id": report_id},
                tenant_id=v.client_id,
            )

            try:
                emit_logic_failure(
                    source="vanguard/verify-rigor.py:rigor-report",
                    severity="warning",
                    error=Exception(f"Rigor Report generated for ethical_score={ethical_score}"),
                    recommended_action="Client acknowledgement required or high-risk threshold escalates.",
                    cmp={"ticket_id": v.ticket_id or "n/a", "action": v.action},
                    meta={"ethical_score": ethical_score, "client_id": v.client_id, "report_id": report_id},
                )
            except Exception:
                pass

            # Determine Step 3 behavior
            requires_client_ack = not bool(v.client_acknowledged) and ethical_score < high_risk_threshold
        else:
            # Step 1 already happened; ack call only escalates.
            report = pending_report
            report_id = str(report.get("report_id") or v.rigor_report_id or "n/a")
            requires_client_ack = not bool(v.client_acknowledged)

    # Step 3: escalate to executives only after acknowledgement OR high-risk threshold.
    if ethical_reject and (bool(v.client_acknowledged) or ethical_score >= high_risk_threshold):
        if not executive_escalated:
            _maybe_notify_executives(
                priority=True,
                description=_extract_change_summary(v.description)[:500],
                score=ethical_score,
            )
            executive_escalated = True

    # Hard budget gate (cost)
    budget_reject = float(cost_estimate_usd) > hard_cap_usd
    if budget_reject:
        emit_cost_overrun(
            expected_usd=hard_cap_usd,
            actual_usd=cost_estimate_usd,
            budget_key="cmp.full_market_value_usd",
            breakdown={"action": v.action, "client_id": v.client_id, "ticket_id": v.ticket_id},
            tenant_id=v.client_id or None,
        )

    # Final decision
    if budget_reject or ethical_reject:
        reject_reason = "High-Cost Alert: cost_estimate exceeded HARD_BUDGET_CAP_USD."
        rejected_by: List[str] = []
        if budget_reject:
            rejected_by.append("budget_cap")
        if ethical_reject:
            rejected_by.append("ethical_ambiguity")
            # If escalation hasn't happened yet, focus on client acknowledgement in the user-facing string.
            if requires_client_ack:
                reject_reason = "Client acknowledgement required: a Rigor Report was sent to your Authorized Representative."
            else:
                reject_reason = "Ethical Sentinel triggered: Rigor Report reviewed with escalation in progress."

        return (
            False,
            {
                "ok": False,
                "budget_cap_usd": hard_cap_usd,
                "cost_estimate_usd": cost_estimate_usd,
                "ethical_score": ethical_score,
                "reject_reason": reject_reason,
                "requires_client_ack": bool(ethical_reject and requires_client_ack),
                "rigor_report_id": report_id,
                "executive_escalated": bool(executive_escalated),
                "rejected_by": rejected_by,
            },
        )

    return (
        True,
        {
            "ok": True,
            "budget_cap_usd": hard_cap_usd,
            "cost_estimate_usd": v.cost_estimate_usd,
            "ethical_score": ethical_score,
            "reject_reason": "",
            "rejected_by": [],
        },
    )


def main() -> None:
    parser = argparse.ArgumentParser(description="Vanguard Verify-Rigor CLI")
    parser.add_argument("--description", type=str, required=False, default="")
    parser.add_argument("--cost_usd", type=float, required=False, default=0)
    parser.add_argument("--client_id", type=str, default="root")
    parser.add_argument("--action", type=str, required=True)
    parser.add_argument("--ticket_id", type=str, default="n/a")
    parser.add_argument(
        "--authorized_rep_whatsapp_numbers",
        type=str,
        required=False,
        default="",
        help="Comma-separated whatsapp numbers (whatsapp:+<e164> or raw digits).",
    )
    parser.add_argument(
        "--client_acknowledged",
        action="store_true",
        help="When set, verifies client acknowledgement and escalates to executives.",
    )
    parser.add_argument(
        "--rigor_report_id",
        type=str,
        required=False,
        default=None,
        help="Pending report id created during Step 1.",
    )
    args = parser.parse_args()

    rep_numbers: List[str] = []
    if args.authorized_rep_whatsapp_numbers:
        rep_numbers = [s.strip() for s in str(args.authorized_rep_whatsapp_numbers).split(",") if s.strip()]

    payload: VerifyInput = VerifyInput(
        description=args.description or "",
        cost_estimate_usd=float(args.cost_usd),
        client_id=args.client_id or "root",
        action=args.action,
        ticket_id=args.ticket_id or "n/a",
        authorized_rep_whatsapp_numbers=rep_numbers,
        client_acknowledged=bool(args.client_acknowledged),
        rigor_report_id=args.rigor_report_id,
    )

    try:
        ok, result = verify_rigor(payload)
        # Print only JSON for easy parsing.
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        # Emit telemetry for failures, but do not leak secrets.
        try:
            from core.services.vanguard_telemetry import emit_logic_failure

            emit_logic_failure(
                source="vanguard/verify-rigor.py:unhandled",
                severity="fatal",
                error=e,
                recommended_action="Check verifier runtime, env vars (GOOGLE_API_KEY, HARD_BUDGET_CAP_USD).",
                cmp={"ticket_id": payload.ticket_id, "action": payload.action},
                meta={"client_id": payload.client_id},
            )
        except Exception:
            pass

        out = {
            "ok": False,
            "error": _redact(str(e)),
            "reject_reason": "Verifier crashed; build blocked by default.",
            "ethical_score": None,
            "budget_cap_usd": None,
            "cost_estimate_usd": payload.cost_estimate_usd,
            "rejected_by": ["verifier_error"],
            "trace": None,
        }
        print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()

