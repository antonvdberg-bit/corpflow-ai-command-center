#!/usr/bin/env python3
"""Review sanitized maintenance evidence with the existing local Forge only."""

import argparse
import json
import os
import subprocess
import time
from pathlib import Path

from forge_maintenance_common import (
    capacity_lease,
    contains_secret_like,
    read_json,
    receipt_payload,
    resource_guard,
    validate_receipt,
    publish_receipt,
)


MAX_ATTEMPTS = 2


def deterministic_review(collection):
    source_ids = collection.get("source_ids", [])
    evidence = collection.get("evidence", {})
    if not source_ids or set(source_ids) != set(evidence):
        return {"status": "FAIL", "reason": "source IDs do not match evidence"}
    if any(not isinstance(item, str) for item in source_ids):
        return {"status": "FAIL", "reason": "invalid source ID"}
    if collection.get("status") == "BLOCKED":
        return {"status": "BLOCKED", "reason": collection.get("reason", "blocked")}
    if collection.get("failures"):
        return {"status": "FAIL", "reason": "collector reported bounded failures"}
    return {"status": "PASS", "reason": "sanitized source IDs and numeric evidence validated"}


def invoke_ollama(prompt, timeout=90, runner=subprocess.run):
    """Optional model call; generated output is parsed, never executed."""
    return runner(
        ["/usr/bin/ollama", "run",
         os.environ.get("FORGE_MODEL", "qwen2.5-coder:7b-instruct-q2_K"), prompt],
        check=False, capture_output=True, text=True, timeout=timeout, shell=False,
    )


def review(receipt, exclusion_path=None, model_runner=invoke_ollama):
    valid, reason = validate_receipt(receipt)
    if not valid:
        return {"status": "BLOCKED", "reason": reason, "attempts": 0}
    collection = receipt["collection"]
    deterministic = deterministic_review(collection)
    if deterministic["status"] != "PASS":
        return {**deterministic, "attempts": 0}
    allowed, guard_reason = resource_guard(exclusion_path=exclusion_path)
    if not allowed:
        return {"status": "DEFERRED", "reason": guard_reason, "attempts": 0}
    # The deterministic result is authoritative. Model output is optional and bounded.
    prompt = json.dumps({"task": "review numeric maintenance evidence",
                         "source_ids": collection["source_ids"],
                         "evidence": collection["evidence"]}, sort_keys=True)
    for attempt in range(1, MAX_ATTEMPTS + 1):
        try:
            result = model_runner(prompt)
        except (OSError, subprocess.TimeoutExpired):
            continue
        if result.returncode != 0 or contains_secret_like(result.stdout):
            continue
        try:
            model_json = json.loads(result.stdout)
        except json.JSONDecodeError:
            continue
        if isinstance(model_json, dict) and model_json.get("source_ids") == collection["source_ids"]:
            return {"status": "PASS", "reason": "deterministic and model source validation passed",
                    "attempts": attempt}
    return {"status": "FAIL", "reason": "model review failed closed after two attempts",
            "attempts": MAX_ATTEMPTS}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--exclusion-file")
    args = parser.parse_args()
    input_path = Path(args.input)
    receipt = read_json(input_path)
    run_id = f"review-{int(time.time())}"
    try:
        with capacity_lease("forge-maintenance-review", run_id,
                            exclusion_path=args.exclusion_file):
            review_result = review(receipt, exclusion_path=args.exclusion_file)
    except RuntimeError as error:
        review_result = {"status": "DEFERRED", "reason": str(error), "attempts": 0}
    status = review_result["status"]
    output = receipt_payload(receipt["collection"], review_result, status=status,
                             run_id=run_id)
    publish_receipt(output, receipt_path=args.output,
                    history_dir=Path(args.output).parent / "history")
    print(json.dumps({"status": status, "run_id": run_id}))
    return 0 if status == "PASS" else 1


if __name__ == "__main__":
    raise SystemExit(main())
