import datetime as dt
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest
from unittest import mock


def module(name, file):
    spec = importlib.util.spec_from_file_location(name, file)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


ROOT = Path(__file__).resolve().parents[1]
b = module("backup", str(ROOT / "erpnext-borg-backup.py"))
check_src = (ROOT / "backup-health-check.sh").read_text().split("<<'ERP_PY'\n", 1)[1].split("\nERP_PY", 1)[0]
scope = {"__name__": "fixture"}
exec(compile(check_src, "health-check-fixture", "exec"), scope)
check = scope["inspect_status"]


class BackupTests(unittest.TestCase):
    def test_borg_coverage_accepts_shell_formatting_and_rejects_exclusions(self):
        self.assertTrue(b.borg_covers_root("BORG_PASSPHRASE='fixture' borg create repo::daily '/root';"))
        self.assertTrue(b.borg_covers_root("BORG_PASSPHRASE='fixture' borg --progress create --stats --compression=zstd repo::daily /root;"))
        script = "borg create " + chr(92) + chr(10) + "repo::daily " + chr(92) + chr(10) + "/root;"
        self.assertTrue(b.borg_covers_root(script))
        self.assertFalse(b.borg_covers_root("borg create --exclude /root/a repo::daily /root;"))
        self.assertFalse(b.borg_covers_root("# borg create repo::daily /root\nborg create repo::daily /home"))

    def test_backup_requires_one_complete_generation(self):
        prefix = "20261008_024322-corpflowai-hosted-restore_localhost-"
        output = "\n".join(prefix+s for s in b.SUFFIXES).encode()
        self.assertEqual(len(b.backup_names(output)), 4)
        with self.assertRaises(b.BackupError):
            b.backup_names(output.replace((prefix+b.SUFFIXES[-1]).encode(), b""))
        with self.assertRaises(b.BackupError):
            b.backup_names(output + b"\n20261008_030000-corpflowai-hosted-restore_localhost-database-enc.sql.gz")

    def test_remote_membership_rejects_missing_and_wrong_size(self):
        expected = {"root/a": 123, "root/b": 456}
        rows = [{"path": "/root/a", "size": 123}, {"path": "root/b", "size": 456}]
        self.assertTrue(b.archive_membership(rows, expected))
        self.assertFalse(b.archive_membership(rows[:1], expected))
        rows[1]["size"] = 455
        self.assertFalse(b.archive_membership(rows, expected))

    def test_retention_preserves_nonmanaged_and_pending_directories(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            for n in range(1, 10):
                d = root/f"202610{n:02}T010000Z"
                d.mkdir()
                (d/"manifest.json").write_text("{}")
            for name in ["manual-recovery", ".pending-20261010T010000Z", "20261011T010000Z"]:
                (root/name).mkdir()
            b.managed_retention(root)
            self.assertFalse((root/"20261001T010000Z").exists())
            self.assertFalse((root/"20261002T010000Z").exists())
            self.assertTrue((root/"manual-recovery").exists())
            self.assertTrue((root/".pending-20261010T010000Z").exists())
            self.assertTrue((root/"20261011T010000Z").exists())

    def test_command_failure_does_not_expose_private_output(self):
        result = mock.Mock(returncode=1, stdout=b"private", stderr=b"private")
        with mock.patch.object(b.subprocess, "run", return_value=result):
            with self.assertRaises(b.BackupError) as error:
                b.command(["borg", "create"])
            self.assertNotIn("private", str(error.exception))

    def test_erp_health_fail_closed_and_time_rules(self):
        now = dt.datetime(2026, 10, 8, tzinfo=dt.timezone.utc)
        good = {"version": 1, "outcome": "success", "last_attempt_utc": now.isoformat(),
                "last_success_utc": now.isoformat(), "remote_verified": True, "archive": "daily"}
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)/"status.json"
            self.assertTrue(check(path, now))
            for changes, healthy in [({}, True), ({"outcome": "failed"}, False),
                                      ({"remote_verified": False}, False),
                                      ({"last_success_utc": (now-dt.timedelta(hours=37)).isoformat()}, False),
                                      ({"last_success_utc": (now+dt.timedelta(hours=1)).isoformat()}, False),
                                      ({"outcome": "running", "last_attempt_utc": (now-dt.timedelta(hours=4)).isoformat()}, False)]:
                path.write_text(json.dumps(good | changes))
                self.assertEqual(check(path, now) == "", healthy)
            path.write_text("{bad")
            self.assertTrue(check(path, now))


if __name__ == "__main__":
    unittest.main()
