#!/usr/bin/env python3
import importlib.util
import json
import tempfile
import unittest
from datetime import datetime, timedelta, timezone
from pathlib import Path

from forge_maintenance_common import (
    capacity_lease,
    contains_secret_like,
    publish_receipt,
    receipt_payload,
    validate_receipt,
)


def load_script(name):
    path = Path(__file__).parents[1] / name
    spec = importlib.util.spec_from_file_location(name.replace("-", "_"), path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


collector = load_script("forge-maintenance-collect.py")
reviewer = load_script("forge-maintenance-review.py")


class Result:
    returncode = 0
    stdout = "10\n"
    stderr = ""


class ForgeMaintenanceTests(unittest.TestCase):
    def test_normal_and_degraded_collection_are_numeric_only(self):
        original = collector.EXPECTED_HOST
        collector.EXPECTED_HOST = collector.socket.gethostname()
        try:
            result = collector.collect(command_runner=lambda command, timeout: Result())
            self.assertEqual(result["status"], "PASS")
            self.assertTrue(all(isinstance(v, list) for v in result["evidence"].values()))
            broken = collector.collect(command_runner=lambda command, timeout: type(
                "Failed", (), {"returncode": 1, "stdout": "", "stderr": ""}
            )())
            self.assertEqual(broken["status"], "FAIL")
        finally:
            collector.EXPECTED_HOST = original

    def test_hostname_guard_and_secret_rejection(self):
        original = collector.EXPECTED_HOST
        collector.EXPECTED_HOST = "not-this-host"
        try:
            self.assertFalse(collector.collect()["host_match"])
        finally:
            collector.EXPECTED_HOST = original
        self.assertTrue(contains_secret_like({"note": "api_key=hidden"}))
        with self.assertRaises(ValueError):
            receipt_payload({"source_ids": [], "evidence": {"token": "x"}},
                            status="FAIL")

    def test_missing_stale_and_future_receipts(self):
        base = {"source_ids": ["disk_root_bytes"], "evidence": {"disk_root_bytes": [1]},
                "status": "PASS"}
        now = datetime.now(timezone.utc)
        for offset, expected in ((timedelta(minutes=-1), True),
                                 (timedelta(hours=-1), False),
                                 (timedelta(minutes=1), False)):
            payload = receipt_payload({**base, "collected_at": now.timestamp()},
                                      run_id="r", status="PASS")
            payload["created_at"] = (now + offset).isoformat()
            self.assertEqual(validate_receipt(payload, now=now)[0], expected)
        self.assertEqual(validate_receipt({}, now=now)[0], False)

    def test_lock_contention_and_stale_recovery(self):
        with tempfile.TemporaryDirectory() as directory:
            lock = Path(directory) / "lock"
            with capacity_lease("test", "one", lock_path=lock):
                with self.assertRaises(RuntimeError):
                    with capacity_lease("test", "two", lock_path=lock):
                        pass
            lock.write_text(json.dumps({"expires_at": 0}))
            with capacity_lease("test", "three", lock_path=lock):
                pass

    def test_erp_exclusion_defers_and_model_is_capped_at_two_attempts(self):
        with tempfile.TemporaryDirectory() as directory:
            exclusion = Path(directory) / "erp.restore"
            exclusion.touch()
            self.assertEqual(reviewer.review(
                receipt_payload({"source_ids": ["x"], "evidence": {"x": [1]},
                                 "status": "PASS"}, status="PASS"),
                exclusion_path=exclusion)["status"], "DEFERRED")
        calls = []
        def invalid_model(prompt):
            calls.append(prompt)
            return type("Failed", (), {"returncode": 0, "stdout": "{bad"})()
        payload = receipt_payload(
            {"source_ids": ["x"], "evidence": {"x": [1]}, "status": "PASS"},
            status="PASS")
        result = reviewer.review(payload, model_runner=invalid_model)
        self.assertEqual(result["attempts"], 2)
        self.assertEqual(len(calls), 2)

    def test_atomic_old_good_receipt_is_retained_on_failed_publish(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "receipt.json"
            history = Path(directory) / "history"
            good = receipt_payload({"source_ids": ["x"], "evidence": {"x": [1]},
                                    "status": "PASS"}, status="PASS")
            publish_receipt(good, path, history)
            with self.assertRaises(ValueError):
                publish_receipt({"schema": "wrong", "status": "PASS"}, path, history)
            self.assertEqual(json.loads(path.read_text())["schema"], good["schema"])


if __name__ == "__main__":
    unittest.main()
