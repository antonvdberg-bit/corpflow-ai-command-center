import datetime as dt
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

def module(name):
    spec=importlib.util.spec_from_file_location(name,Path(__file__).resolve().parents[1]/(name+'.py'))
    m=importlib.util.module_from_spec(spec); spec.loader.exec_module(m); return m

c=module('forge-maintenance-collect'); r=module('forge-maintenance-review')

class MaintenanceTests(unittest.TestCase):
    def health(self,now,**extra):
        row={'finished_utc':now.isoformat(),'outcome':'success','forge_outcome':'PASS'}
        row.update(extra); return c.status_health(row,now)
    def test_healthy_receipt(self):
        self.assertEqual(self.health(dt.datetime.now(dt.timezone.utc)),'')
    def test_missing_run(self):
        now=dt.datetime.now(dt.timezone.utc)
        self.assertIn('36 hours',self.health(now,finished_utc=(now-dt.timedelta(hours=37)).isoformat()))
    def test_collection_failure(self):
        self.assertIn('failed',self.health(dt.datetime.now(dt.timezone.utc),outcome='failure'))
    def test_deferred_resource_is_not_forge_pass(self):
        now=dt.datetime.now(dt.timezone.utc)
        self.assertEqual(self.health(now,forge_outcome='DEFERRED_RESOURCE',forge_deferred_since_utc=now.isoformat()),'')
    def test_prolonged_resource_deferral_alerts(self):
        now=dt.datetime.now(dt.timezone.utc)
        self.assertIn('48 hours',self.health(now,forge_outcome='DEFERRED_RESOURCE',forge_deferred_since_utc=(now-dt.timedelta(hours=49)).isoformat()))
    def test_reject_invented_model_evidence(self):
        with self.assertRaises(ValueError): r.verify({'tasks':[{'id':'D99','result':'PASS'}]},[{'id':'D01','result':'PASS'}])
    def test_preserve_failed_source_verdict(self):
        tasks=[{'id':'D01','result':'FAIL'}]
        self.assertTrue(r.verify({'tasks':tasks},tasks))
        with self.assertRaises(ValueError): r.verify({'tasks':[{'id':'D01','result':'PASS'}]},tasks)
    def test_reject_extra_fields(self):
        with self.assertRaises(ValueError): r.verify({'tasks':[],'command':'restart'},[])
    def test_future_timestamp_fails(self):
        now=dt.datetime.now(dt.timezone.utc)
        with self.assertRaises(ValueError): c.age((now+dt.timedelta(minutes=6)).isoformat(),now)
    def test_missing_timezone_fails(self):
        with self.assertRaises(ValueError): c.age('2026-10-08T00:00:00',dt.datetime.now(dt.timezone.utc))
    def test_laptop_real_ack_schema(self):
        now=dt.datetime.now(dt.timezone.utc)
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'ack.json'; p.write_text(json.dumps({'version':1,'last_verified_copy_utc':now.isoformat(),'sha256':'abc'}))
            self.assertTrue(c.backup_check(p,now,True))
    def test_stale_laptop_rejected(self):
        now=dt.datetime.now(dt.timezone.utc)
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'ack.json'; p.write_text(json.dumps({'version':1,'last_verified_copy_utc':(now-dt.timedelta(days=8)).isoformat(),'sha256':'abc'}))
            self.assertFalse(c.backup_check(p,now,True))
    def test_erp_requires_remote_verification(self):
        now=dt.datetime.now(dt.timezone.utc)
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'status.json'; p.write_text(json.dumps({'outcome':'success','last_success_utc':now.isoformat(),'remote_verified':False}))
            self.assertFalse(c.backup_check(p,now))
    def test_atomic_write_and_symlink_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            p=Path(tmp)/'status.json'; c.atom(p,{'good':True}); self.assertEqual(json.loads(p.read_text()),{'good':True})
            q=Path(tmp)/'link'; q.symlink_to(p)
            with self.assertRaises(RuntimeError): c.atom(q,{'bad':True})

if __name__=='__main__': unittest.main()
