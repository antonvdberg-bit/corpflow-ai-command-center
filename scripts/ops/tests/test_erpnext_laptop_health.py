import contextlib
import datetime as dt
import io
import json
from pathlib import Path
import unittest
from unittest.mock import mock_open, patch

class LaptopHealthTests(unittest.TestCase):
    def verdict(self,data):
        source=(Path(__file__).resolve().parents[1]/'backup-health-check.sh').read_text()
        code=source.split("<<'LAPTOP_PY'\n")[1].split('\nLAPTOP_PY')[0]
        output=io.StringIO()
        with patch('builtins.open',mock_open(read_data=json.dumps(data))),contextlib.redirect_stdout(output):
            exec(code,{})
        return output.getvalue().strip()

    def data(self,days=0):
        return {'version':1,'sha256':'a'*64,'last_verified_copy_utc':(dt.datetime.now(dt.timezone.utc)-dt.timedelta(days=days)).isoformat()}

    def test_current_copy_is_healthy(self): self.assertEqual(self.verdict(self.data()),'')
    def test_offline_week_is_detected(self): self.assertIn('older than seven days',self.verdict(self.data(8)))
    def test_missing_schema_is_failure(self): self.assertIn('missing or invalid',self.verdict({}))
    def test_future_timestamp_is_failure(self): self.assertIn('future',self.verdict(self.data(-1)))

if __name__=='__main__': unittest.main()
