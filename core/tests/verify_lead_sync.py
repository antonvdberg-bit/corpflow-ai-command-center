"""Smoke-check lead pipeline: Factory admin-leads (Postgres) or local capture file."""

import json
import os
from pathlib import Path

import requests

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
_CAPTURE = REPO_ROOT / "vanguard" / "audit-trail" / "python_lead_capture.jsonl"


def verify_sync() -> None:
    """Prefer FACTORY_BASE_URL + /api/admin-leads; else report local JSONL capture."""
    base = (os.getenv("FACTORY_BASE_URL") or os.getenv("VERCEL_URL") or "").strip()
    if base and not base.startswith("http"):
        base = f"https://{base}"

    if base:
        url = f"{base.rstrip('/')}/api/admin-leads"
        print(f"Checking Postgres-backed leads via {url} ...")
        try:
            r = requests.get(url, timeout=20)
            r.raise_for_status()
            data = r.json()
            leads = data.get("leads") or []
            stats = data.get("stats") or {}
            print(f"OK — count={stats.get('count', len(leads))} totalLeak={stats.get('totalLeak', 'n/a')}")
            if leads:
                first = leads[0]
                print(f"Latest: {first.get('name', first.get('email', 'n/a'))}")
            return
        except Exception as e:
            print(f"admin-leads check failed ({e}); trying local capture file...")

    if _CAPTURE.is_file():
        lines = _CAPTURE.read_text(encoding="utf-8").strip().splitlines()
        print(f"Local capture file ({_CAPTURE}): {len(lines)} line(s)")
        if lines:
            try:
                last = json.loads(lines[-1])
                print(f"Last entry tenant_id={last.get('tenant_id')} name={last.get('name')}")
            except json.JSONDecodeError:
                print("Last line is not valid JSON.")
        return

    print(
        "No FACTORY_BASE_URL/VERCEL_URL or local capture file.\n"
        "Set FACTORY_BASE_URL to your deployed host, or run the response engine "
        "without N8N_WEBHOOK_URL to append vanguard/audit-trail/python_lead_capture.jsonl."
    )


if __name__ == "__main__":
    verify_sync()
