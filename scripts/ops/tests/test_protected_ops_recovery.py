import importlib.util
from pathlib import Path
import sqlite3
import tempfile
import unittest

spec=importlib.util.spec_from_file_location("ops",Path(__file__).resolve().parents[1]/"protected-ops-recovery-snapshot.py")
ops=importlib.util.module_from_spec(spec); spec.loader.exec_module(ops)

class SnapshotTests(unittest.TestCase):
    def test_online_wal_snapshot_integrity_and_corruption_rejection(self):
        with tempfile.TemporaryDirectory() as d:
            root=Path(d); source=root/"live.db"
            conn=sqlite3.connect(source)
            try:
                conn.execute("PRAGMA journal_mode=WAL")
                conn.execute("CREATE TABLE t(value)")
                conn.execute("INSERT INTO t VALUES(42)"); conn.commit()
                config=root/"config"; config.write_text("fixture")
                folder=ops.make_snapshot(root/"out",{"test.db":source},[config],False)
                ops.verify(folder)
                with sqlite3.connect(folder/"test.db") as dst:
                    self.assertEqual(dst.execute("SELECT value FROM t").fetchall(),[(42,)])
                self.assertEqual((folder/"test.db").stat().st_mode & 0o777,0o600)
                (folder/"test.db").write_bytes(b"corrupt")
                with self.assertRaises(RuntimeError): ops.verify(folder)
            finally:
                conn.close()
    def test_missing_database_fails(self):
        with tempfile.TemporaryDirectory() as d:
            with self.assertRaises(RuntimeError):
                ops.sqlite_snapshot(Path(d)/"missing",Path(d)/"out.db")
    def test_linked_source_rejected(self):
        with tempfile.TemporaryDirectory() as d:
            p=Path(d); target=p/"source"; target.write_text("fixture"); link=p/"link"; link.symlink_to(target)
            with self.assertRaises(RuntimeError): ops.sqlite_snapshot(link,p/"out.db")

if __name__=="__main__": unittest.main()
