import importlib.util
import ast
import pathlib
import unittest

spec=importlib.util.spec_from_file_location('copy',pathlib.Path(__file__).resolve().parents[1]/'erpnext-laptop-copy.py')
copy=importlib.util.module_from_spec(spec); spec.loader.exec_module(copy)

def receipt(day):
    return {'run':day.replace('-','')+'T010000Z','created_utc':day+'T01:00:00+00:00','sha256':'a'*64}

class RotationTests(unittest.TestCase):
    def test_embedded_restore_python_compiles(self):
        tree=ast.parse((pathlib.Path(__file__).resolve().parents[1]/'erpnext-laptop-restore-test.py').read_text())
        found=[]
        for node in ast.walk(tree):
            if isinstance(node,ast.Assign) and isinstance(node.value,ast.Constant) and isinstance(node.value.value,str):
                names=[target.id for target in node.targets if isinstance(target,ast.Name)]
                if names and names[0] in ['code','verify']:
                    compile(node.value.value,'embedded-'+names[0],'exec'); found.extend(names)
        self.assertEqual(set(found),{'code','verify'})
    def test_first_copy_initializes_three_slots_one_package(self):
        slots,week,month=copy.advance_slots({'slots':{}},receipt('2026-10-08'))
        self.assertEqual(set(slots),{'latest','weekly','monthly'})
        self.assertEqual(len({r['run'] for r in slots.values()}),1)

    def test_daily_keeps_first_weekly_monthly_and_previous(self):
        first=receipt('2026-10-08'); slots,w,m=copy.advance_slots({'slots':{}},first)
        slots,w,m=copy.advance_slots({'slots':slots,'weekly_period':w,'monthly_period':m},receipt('2026-10-09'))
        self.assertEqual(slots['previous'],first)
        self.assertEqual(slots['weekly'],first)
        self.assertEqual(slots['monthly'],first)

    def test_repeated_copy_does_not_destroy_previous(self):
        one,two=receipt('2026-10-08'),receipt('2026-10-09')
        slots,w,m=copy.advance_slots({'slots':{}},one)
        prior={'slots':slots,'weekly_period':w,'monthly_period':m}
        slots,w,m=copy.advance_slots(prior,two)
        slots,w,m=copy.advance_slots({'slots':slots,'weekly_period':w,'monthly_period':m},two)
        self.assertEqual(slots['previous'],one)

    def test_months_of_daily_runs_never_exceed_four_packages(self):
        import datetime as dt
        prior={'slots':{}}; start=dt.date(2026,10,8)
        for i in range(100):
            r=receipt((start+dt.timedelta(days=i)).isoformat())
            slots,w,m=copy.advance_slots(prior,r)
            self.assertLessEqual(len({x['run'] for x in slots.values()}),4)
            self.assertEqual(slots['latest'],r)
            prior={'slots':slots,'weekly_period':w,'monthly_period':m}

if __name__=='__main__': unittest.main()
