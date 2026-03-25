"""
FINOPS Engine (Opportunity Cost + ROI)

Used to enrich Vanguard `cost_overrun` events with:
- Opportunity Cost of not using AI vs token cost
- ROI derived from a fixed "Human Equivalent" baseline
- Margin-per-line capture (operational metric)
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Dict, Optional, Tuple


HUMAN_EQUIVALENT_USD: float = 44.00
MARGIN_PER_LINE_USD: float = 43.00


def compute_opportunity_cost_usd(*, token_cost_usd: float, human_equivalent_usd: float = HUMAN_EQUIVALENT_USD) -> float:
    """
    Compute opportunity cost of not using AI.

    Definition (factory convention):
    - If you do NOT use AI, you pay a human equivalent baseline.
    - If you DO use AI, you pay token cost.
    - The opportunity cost (benefit of AI vs human) is:
        human_equivalent - token_cost
    """
    return float(human_equivalent_usd) - float(token_cost_usd)


def compute_roi_percent(*, token_cost_usd: float, opportunity_cost_usd: float) -> Optional[float]:
    """
    ROI percent:
        roi% = (opportunity_cost / token_cost) * 100
    """
    token_cost_usd = float(token_cost_usd)
    if token_cost_usd <= 0:
        return None
    return (float(opportunity_cost_usd) / token_cost_usd) * 100.0


def compute_margin_reporting(*, breakdown: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
    """
    Capture the $43/line operational margin in cost reporting.

    If the caller provides an estimated line count in `breakdown`, we compute
    a total estimated margin. Otherwise, we still expose `margin_per_line_usd`
    as a constant reporting metric.
    """
    breakdown = breakdown or {}
    lines_estimate = breakdown.get("lines_estimate") or breakdown.get("lines") or breakdown.get("code_lines")

    try:
        if lines_estimate is None:
            estimated_lines = None
        else:
            estimated_lines = float(lines_estimate)
    except Exception:
        estimated_lines = None

    if estimated_lines is not None and estimated_lines > 0:
        estimated_margin_usd = float(MARGIN_PER_LINE_USD) * estimated_lines
    else:
        estimated_margin_usd = float(MARGIN_PER_LINE_USD)

    return {
        "margin_per_line_usd": float(MARGIN_PER_LINE_USD),
        "estimated_lines": estimated_lines,
        "estimated_margin_usd": float(estimated_margin_usd),
    }


def enrich_cost_overrun_payload(
    *,
    expected_usd: float,
    actual_usd: float,
    breakdown: Optional[Dict[str, Any]] = None,
) -> Dict[str, Any]:
    """
    Enrich cost-overrun payload with Opportunity Cost + ROI.
    """
    token_cost_usd = float(actual_usd)
    opportunity_cost_usd = compute_opportunity_cost_usd(token_cost_usd=token_cost_usd)
    roi_percent = compute_roi_percent(token_cost_usd=token_cost_usd, opportunity_cost_usd=opportunity_cost_usd)
    margin_report = compute_margin_reporting(breakdown=breakdown)

    return {
        "human_equivalent_usd": float(HUMAN_EQUIVALENT_USD),
        "token_cost_usd": token_cost_usd,
        "opportunity_cost_usd": float(opportunity_cost_usd),
        "roi_percent": roi_percent,
        **margin_report,
    }

