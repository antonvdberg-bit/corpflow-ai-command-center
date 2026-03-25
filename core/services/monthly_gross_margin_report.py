"""
Monthly Gross Margin Report

Reads token debit ledger (`vanguard/audit-trail/token_debits.jsonl`) and
produces machine-readable financial metrics:
- Cash Flow (token debits) vs Accrued Profit
- Working Capital Efficiency (cross-client compute coverage estimate)
"""

from __future__ import annotations

import argparse
import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

from core.services.finops_engine import HUMAN_EQUIVALENT_USD


REPO_ROOT = Path(__file__).resolve().parent.parent.parent
LEDGER_PATH = REPO_ROOT / "vanguard" / "audit-trail" / "token_debits.jsonl"
OUT_DIR = REPO_ROOT / "vanguard" / "monthly_reports"


def _month_key_from_dt(dt: datetime) -> str:
    return dt.strftime("%Y-%m")


def _read_jsonl(path: Path) -> List[Dict[str, Any]]:
    if not path.exists():
        return []
    out: List[Dict[str, Any]] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            data = json.loads(line)
            if isinstance(data, dict):
                out.append(data)
        except Exception:
            continue
    return out


def generate_monthly_report(*, month_key: str) -> Dict[str, Any]:
    ledger = _read_jsonl(LEDGER_PATH)
    if not ledger:
        return {
            "month": month_key,
            "ok": False,
            "error": "No token debit ledger entries found",
        }

    per_tenant: Dict[str, Dict[str, float]] = {}
    total_cash_flow_usd = 0.0

    for rec in ledger:
        occurred_at = rec.get("occurred_at")
        try:
            dt = datetime.fromisoformat(str(occurred_at))
        except Exception:
            continue
        if _month_key_from_dt(dt) != month_key:
            continue

        tenant_id = str(rec.get("tenant_id") or "root")
        debit_usd = float(rec.get("debit_usd") or 0.0)
        invoice_usd = float(rec.get("invoice_usd") or debit_usd)

        if tenant_id not in per_tenant:
            per_tenant[tenant_id] = {
                "cash_flow_usd": 0.0,
                "accrued_profit_usd": 0.0,
                "invoice_usd": 0.0,
            }

        per_tenant[tenant_id]["cash_flow_usd"] += debit_usd
        per_tenant[tenant_id]["invoice_usd"] += invoice_usd

        # Accrued Profit:
        # In absence of per-token billing rates in this repo, we approximate
        # using the FINOPS opportunity-cost baseline. This is a placeholder
        # until actual token accounting lands.
        per_tenant[tenant_id]["accrued_profit_usd"] += max(0.0, HUMAN_EQUIVALENT_USD - debit_usd)
        total_cash_flow_usd += debit_usd

    total_cash_flow_usd = max(0.0, float(total_cash_flow_usd))

    report_tenants: List[Dict[str, Any]] = []
    for tenant_id, vals in per_tenant.items():
        cash_flow_usd = float(vals.get("cash_flow_usd") or 0.0)
        accrued_profit_usd = float(vals.get("accrued_profit_usd") or 0.0)

        # Cross-client compute coverage estimate:
        # With Cash-Positive kill switch enabled, tenants should fund their own
        # compute. Until we track "compute attribution" per action, we report 0
        # cross-coverage as the safe default.
        other_clients_compute_covered_usd_estimate = 0.0
        working_capital_efficiency = (
            other_clients_compute_covered_usd_estimate / cash_flow_usd if cash_flow_usd > 0 else 0.0
        )

        report_tenants.append(
            {
                "tenant_id": tenant_id,
                "cash_flow_usd": cash_flow_usd,
                "accrued_profit_usd": accrued_profit_usd,
                "working_capital_efficiency": working_capital_efficiency,
                "other_clients_compute_covered_usd_estimate": other_clients_compute_covered_usd_estimate,
            }
        )

    payload = {
        "schema_version": "1",
        "month": month_key,
        "total_cash_flow_usd": total_cash_flow_usd,
        "tenants": report_tenants,
    }

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    out_path = OUT_DIR / f"gross_margin_report_{month_key}.json"
    out_path.write_text(json.dumps(payload, ensure_ascii=False, indent=2), encoding="utf-8")
    return payload


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate monthly gross margin report from token_debits ledger.")
    parser.add_argument("--month", type=str, default="", help="Month key YYYY-MM (UTC). Defaults to current month.")
    args = parser.parse_args()

    month_key = args.month.strip()
    if not month_key:
        month_key = _month_key_from_dt(datetime.now(timezone.utc))

    out = generate_monthly_report(month_key=month_key)
    print(json.dumps(out, ensure_ascii=False))


if __name__ == "__main__":
    main()

