# Run only in the named Frappe bench environment after authorized preview acceptance.
# Public logo data URI input is not a credential. Set ERPCF_PUBLIC_LOGO_B64 to the pinned PNG bytes.
import os
LOGO=os.environ['ERPCF_PUBLIC_LOGO_B64']
import frappe,json,hashlib,base64,io,contextlib
from pathlib import Path
from pypdf import PdfReader
EXPECTED={
 'CorpFlowAI Professional Quotation':'d89ef5fdb9c48563ec951b45e0deec5d068c3af16848830a60bc715d055de687',
 'CorpFlowAI Professional Sales Invoice':'c0d07b17270331800e637dcec167810ed48b35138df74162190cb72cff022b34',
 'CorpFlowAI Professional Sales Order':'a1d948763bebd1eb033ecfba3d0f76cafbb08135bff91a81bd5bdde6f7484605'}
CSS="""
.cfq .label { border:0; border-radius:0; padding:0; text-align:left; white-space:normal; }
.cfq .meta { margin:10px 0 !important; }
.cfq .parties { margin-bottom:10px !important; }
.cfq .parties td { padding:10px 14px !important; }
.cfq .brand-bar { padding-bottom:9px !important; }
.cfq .items { margin-bottom:10px !important; }
.cfq .items td { padding:8px !important; }
.cfq .terms { margin-top:10px !important; padding-top:8px !important; }
.cfq .footer { margin-top:10px !important; }
.print-format { min-height:0 !important; height:auto !important; }
"""
frappe.init(site='corpflowai-hosted-restore.localhost',sites_path='/home/frappe/frappe-bench/sites');frappe.connect();frappe.set_user('Administrator')
folder=Path('/home/frappe/frappe-bench/sites/corpflowai-hosted-restore.localhost/private/erp-cutover-rollback-20261008')
folder.mkdir(mode=0o700,exist_ok=False)
logo=base64.b64decode(LOGO)
assert hashlib.sha256(logo).hexdigest()=='87c841ed0977c5c843e009e96ef50851f69a8f1d18298cb609492d94fc89b834'
docs={name:frappe.get_doc('Print Format',name) for name in EXPECTED}
assert all(hashlib.sha256(d.html.encode()).hexdigest()==EXPECTED[name] for name,d in docs.items())
before={name:d.as_dict() for name,d in docs.items()}
backup=folder/'print-formats-before.json';backup.write_text(json.dumps(before,default=str));backup.chmod(0o600)
receipt=[]
try:
 for name,d in docs.items():
  assert d.html.count('https://corpflowai.com/brand/corpflowai/corpflowai-mark.png')==1
  d.html=d.html.replace('https://corpflowai.com/brand/corpflowai/corpflowai-mark.png','data:image/png;base64,'+LOGO)
  if name=='CorpFlowAI Professional Quotation':
   assert d.html.count('</style>')==1
   d.html=d.html.replace('</style>',CSS+'</style>',1)
  d.save(ignore_permissions=True)
  receipt.append({'name':name,'before_sha256':EXPECTED[name],'after_sha256':hashlib.sha256(d.html.encode()).hexdigest()})
 for dt,name,pf,label in [('Quotation','SAL-QTN-2026-00006','CorpFlowAI Professional Quotation','quotation'),('Sales Invoice','ACC-SINV-2026-00001','CorpFlowAI Professional Sales Invoice','invoice')]:
  with contextlib.redirect_stdout(io.StringIO()),contextlib.redirect_stderr(io.StringIO()):
   data=frappe.get_print(dt,name,print_format=pf,as_pdf=True)
  r=PdfReader(io.BytesIO(data)); assert len(r.pages)==1 and sum(len(p.images) for p in r.pages)>=1
  p=folder/(label+'-verified.pdf');p.write_bytes(data);p.chmod(0o600)
  receipt.append({'document':label,'pages':len(r.pages),'images':sum(len(p.images) for p in r.pages),'sha256':hashlib.sha256(data).hexdigest()})
 frappe.db.commit()
except Exception:
 frappe.db.rollback(); raise
p=folder/'receipt.json';p.write_text(json.dumps(receipt));p.chmod(0o600)
print(json.dumps({'outcome':'PASS','receipt':receipt,'quotation_count':frappe.db.count('Quotation'),'invoice_count':frappe.db.count('Sales Invoice')}))
frappe.destroy()
