"""
Vanguard Verify-Rigor (Ethical Sentinel + Budget Gate)

CLI tool that evaluates a change request using:
1) Hard Budget Cap (reject if cost_estimate_usd > cap)
2) Ethical Ambiguity Score (Gemini 1.5 Pro -> 1..10; fallback heuristic)
3) Escalation rules (if score > 7: block build + priority executive notification)

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
from typing import Any, Dict, Optional, Tuple


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


def verify_rigor(v: VerifyInput) -> Tuple[bool, Dict[str, Any]]:
    """
    Execute budget gate + ethical scoring + escalation rules.
    """
    from core.services.vanguard_telemetry import emit_cost_overrun, emit_logic_failure

    hard_cap_usd = float(os.getenv("HARD_BUDGET_CAP_USD", "25000"))

    # Always compute ethical score for every request.
    ethical_score = _gemini_ethical_score(v.description)

    # Escalation path (ethical)
    if ethical_score > 7:
        emit_logic_failure(
            source="vanguard/verify-rigor.py:ethical-sentinel",
            severity="fatal",
            error=Exception(f"Ethical Ambiguity Score {ethical_score} > 7"),
            recommended_action="Block build; route to human review and request clarification.",
            cmp={"ticket_id": v.ticket_id or "n/a", "action": v.action},
            meta={"ethical_score": ethical_score, "client_id": v.client_id},
        )

        # Priority notification to executives
        _maybe_notify_executives(
            priority=True,
            description=v.description[:500],
            score=ethical_score,
        )

    # Hard budget gate (cost)
    budget_reject = v.cost_estimate_usd > hard_cap_usd
    if budget_reject:
        emit_cost_overrun(
            expected_usd=hard_cap_usd,
            actual_usd=v.cost_estimate_usd,
            budget_key="cmp.full_market_value_usd",
            breakdown={"action": v.action, "client_id": v.client_id, "ticket_id": v.ticket_id},
            tenant_id=v.client_id or None,
        )

    # Final decision
    if budget_reject:
        return (
            False,
            {
                "ok": False,
                "budget_cap_usd": hard_cap_usd,
                "cost_estimate_usd": v.cost_estimate_usd,
                "ethical_score": ethical_score,
                "reject_reason": "High-Cost Alert: cost_estimate exceeded HARD_BUDGET_CAP_USD.",
                "rejected_by": ["budget_cap"] + (["ethical_ambiguity"] if ethical_score > 7 else []),
            },
        )

    if ethical_score > 7:
        return (
            False,
            {
                "ok": False,
                "budget_cap_usd": hard_cap_usd,
                "cost_estimate_usd": v.cost_estimate_usd,
                "ethical_score": ethical_score,
                "reject_reason": "Ethical Sentinel: Ethical Ambiguity Score > 7 blocked the build.",
                "rejected_by": ["ethical_ambiguity"],
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
    parser.add_argument("--description", type=str, required=True)
    parser.add_argument("--cost_usd", type=float, required=True)
    parser.add_argument("--client_id", type=str, default="root")
    parser.add_argument("--action", type=str, required=True)
    parser.add_argument("--ticket_id", type=str, default="n/a")
    args = parser.parse_args()

    payload: VerifyInput = VerifyInput(
        description=args.description or "",
        cost_estimate_usd=float(args.cost_usd),
        client_id=args.client_id or "root",
        action=args.action,
        ticket_id=args.ticket_id or "n/a",
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

