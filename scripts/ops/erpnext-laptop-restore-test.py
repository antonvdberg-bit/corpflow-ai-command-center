#!/usr/bin/env python3
"""Restore laptop-held encrypted package into disposable, network-isolated Docker stack.

Test key is supplied by the protected source config: this proves package recovery,
not independent offline key escrow. No live site/volume is used as a restore target.
"""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import sys
import tarfile
import time

ROOT=Path('/root/erpnext-laptop-dr-test-20261008')
PROJECT='corpflowai-laptop-drtest-20261008'
SITE='laptop-drtest.localhost'
BENCH='/home/frappe/frappe-bench'
IMAGE='frappe/erpnext@sha256:edf67a669bf1ca5850b38c8234292ec219b756bfed545b276e17325260b7cdea'

def run(args,timeout=1200):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout)
    if p.returncode:
        # Private local diagnostic only; never publish raw command output or key values.
        diagnostic=ROOT/'private-diagnostic.txt'; diagnostic.write_bytes(p.stderr); diagnostic.chmod(0o600)
        raise RuntimeError('command failed: '+args[0])
    return p.stdout

def sha(p):
    with p.open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()

def decrypt(source,out,key):
    r,w=os.pipe(); os.write(w,(key+'\n').encode()); os.close(w)
    try:
        p=subprocess.run(['gpg','--batch','--yes','--pinentry-mode','loopback','--passphrase-fd',str(r),'--output',str(out),'--decrypt',str(source)],pass_fds=(r,),stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=120)
        if p.returncode: raise RuntimeError('decrypt failed')
    finally: os.close(r)

def main():
    os.umask(0o077)
    assert os.geteuid()==0 and socket.gethostname()=='corpflow-exec-01-u69678'
    assert len(sys.argv)==3
    package=ROOT/'laptop-upload.tar.gpg'; expected=sys.argv[2]
    assert sys.argv[1]==str(package) and sha(package)==expected
    assert not (ROOT/'test-started').exists(), 'test already started'
    assert not run(['docker','ps','-aq','--filter','label=com.docker.compose.project='+PROJECT]).strip()
    assert not run(['docker','volume','ls','-q','--filter','label=com.docker.compose.project='+PROJECT]).strip()
    (ROOT/'test-started').write_text(dt.datetime.now(dt.timezone.utc).isoformat())
    started=time.monotonic(); stage='decrypt package'; compose=ROOT/'compose.json'; created=False
    receipt={'package_sha256':expected,'started_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'source':'laptop-upload','key_source':'protected live source config; independent key escrow not proven'}
    try:
        source=Path('/var/lib/docker/volumes/corpflowai-hosted-restore_sites/_data/corpflowai-hosted-restore.localhost/site_config.json')
        key=json.loads(source.read_text())['backup_encryption_key']
        plain=ROOT/'package.tar'; decrypt(package,plain,key)
        unpack=ROOT/'unpack'; unpack.mkdir(mode=0o700)
        with tarfile.open(plain) as tar:
            for item in tar.getmembers():
                if not item.isfile() or item.name.startswith('/') or '..' in Path(item.name).parts:
                    raise RuntimeError('unsafe package member')
            tar.extractall(unpack,filter='data')
        plain.unlink()
        manifest=json.loads((unpack/'backup/manifest.json').read_text())
        info=json.loads((unpack/'recovery.json').read_text()); assert info['image']==IMAGE
        assert len(manifest['files'])==4
        for item in manifest['files']:
            assert Path(item['name']).name==item['name']
            p=unpack/'backup'/item['name']; assert p.stat().st_size==item['bytes'] and sha(p)==item['sha256']
        cfg=json.loads(next((unpack/'backup').glob('*site_config_backup-enc.json')).read_text())
        assert cfg['backup_encryption_key']==key
        work=ROOT/'plain'; work.mkdir(mode=0o700)
        names={}
        for kind,suffix,out in [('db','database-enc.sql.gz','database.sql.gz'),('public','files-enc.tgz','public.tgz'),('private','private-files-enc.tgz','private.tgz')]:
            p=next(unpack/'backup'/x['name'] for x in manifest['files'] if x['name'].endswith(suffix) and (kind!='public' or not x['name'].endswith('private-files-enc.tgz')))
            decrypt(p,work/out,key); names[kind]=out
        # Restore config keys only; never bring across source database/host identities.
        (work/'keys.json').write_text(json.dumps({k:cfg[k] for k in ['encryption_key','backup_encryption_key'] if k in cfg}))
        dbpass=secrets.token_urlsafe(32); admin=secrets.token_urlsafe(32)
        (work/'dbpass').write_text(dbpass); (work/'adminpass').write_text(admin)
        # All volumes are fresh project-scoped Docker volumes; no source mount.
        data={'name':PROJECT,'services':{'db':{'image':'mariadb:11.8','environment':{'MARIADB_ROOT_PASSWORD':dbpass},'command':['--character-set-server=utf8mb4','--collation-server=utf8mb4_unicode_ci'],'volumes':['db-data:/var/lib/mysql'],'networks':['recovery']},'redis-cache':{'image':'redis:8.6-alpine','networks':['recovery']},'redis-queue':{'image':'redis:8.6-alpine','networks':['recovery']},'backend':{'image':IMAGE,'entrypoint':['/bin/sh','-c'],'command':['sleep infinity'],'volumes':['sites:'+BENCH+'/sites','logs:'+BENCH+'/logs',str(work)+':/recovery:ro'],'networks':['recovery']}},'volumes':{'db-data':{},'sites':{},'logs':{}},'networks':{'recovery':{'internal':True}}}
        # Read-only package input must be readable by image's frappe user; parent remains root-only on host.
        work.chmod(0o755)
        for p in work.iterdir(): p.chmod(0o444)
        compose.write_text(json.dumps(data)); stage='start isolated infrastructure'; created=True
        dc=['docker','compose','-p',PROJECT,'-f',str(compose)]
        run(dc+['up','-d'],120)
        backend=PROJECT+'-backend-1'; db=PROJECT+'-db-1'
        for _ in range(60):
            p=subprocess.run(['docker','exec',db,'healthcheck.sh','--connect','--innodb_initialized'],stdout=subprocess.PIPE,stderr=subprocess.PIPE)
            if p.returncode==0: break
            time.sleep(1)
        else: raise RuntimeError('database readiness timeout')
        # Setup configuration and execute Bench privately inside test container.
        code="""import json,pathlib,subprocess,os
root=pathlib.Path('/home/frappe/frappe-bench'); os.chdir(root)
common={'db_host':'db','db_port':3306,'redis_cache':'redis://redis-cache:6379','redis_queue':'redis://redis-queue:6379','redis_socketio':'redis://redis-queue:6379','socketio_port':9000}
(root/'sites/common_site_config.json').write_text(json.dumps(common))
def call(args):
 p=subprocess.run(args,capture_output=True,text=True)
 if p.returncode: raise RuntimeError('private Bench step failed')
 return p.stdout
dbpass=pathlib.Path('/recovery/dbpass').read_text(); admin=pathlib.Path('/recovery/adminpass').read_text()
call(['bench','new-site','laptop-drtest.localhost','--db-root-password',dbpass,'--admin-password',admin,'--install-app','erpnext'])
p=root/'sites/laptop-drtest.localhost/site_config.json'; cfg=json.loads(p.read_text()); cfg.update(json.loads(pathlib.Path('/recovery/keys.json').read_text())); cfg.update({'maintenance_mode':1,'pause_scheduler':1,'disable_scheduler':1,'mute_emails':1}); p.write_text(json.dumps(cfg))
call(['bench','--site','laptop-drtest.localhost','restore','/recovery/database.sql.gz','--db-root-password',dbpass,'--with-public-files','/recovery/public.tgz','--with-private-files','/recovery/private.tgz'])
call(['bench','--site','laptop-drtest.localhost','disable-scheduler'])
call(['bench','--site','laptop-drtest.localhost','migrate'])
call(['bench','--site','laptop-drtest.localhost','disable-scheduler'])
print('Isolated database/files restore and migration: PASS')
"""
        stage='restore isolated site'; print(stage,flush=True)
        run(['docker','exec','-w',BENCH,backend,'python','-c',code])
        stage='verify records and files'
        verify="""import frappe,json,pathlib,tarfile,hashlib
frappe.init(site='laptop-drtest.localhost',sites_path='sites'); frappe.connect()
counts={d:frappe.db.count(d) for d in ['Quotation','Sales Invoice','Supplier']}
assert counts=={'Quotation':9,'Sales Invoice':3,'Supplier':6}, 'count mismatch'
assert frappe.db.exists('Quotation','SAL-QTN-2026-00006')
cfg=json.loads(pathlib.Path('sites/laptop-drtest.localhost/site_config.json').read_text()); keys=json.loads(pathlib.Path('/recovery/keys.json').read_text()); assert all(cfg.get(k)==v for k,v in keys.items())
checked=0
site=pathlib.Path('sites/laptop-drtest.localhost')
for kind in ['public','private']:
 with tarfile.open('/recovery/'+kind+'.tgz') as tar:
  for member in tar.getmembers():
   if not member.isfile(): continue
   parts=pathlib.PurePosixPath(member.name).parts
   if '..' in parts: raise RuntimeError('unsafe file member')
   candidates=[site/member.name, site/kind/member.name,site/kind/'files'/member.name]
   found=next((p for p in candidates if p.is_file()),None)
   if found is None: raise RuntimeError('restored file missing')
   assert hashlib.sha256(found.read_bytes()).digest()==hashlib.sha256(tar.extractfile(member).read()).digest()
   checked+=1
assert cfg.get('pause_scheduler') or cfg.get('disable_scheduler')
print(json.dumps({'counts':counts,'quotation_reference':True,'restored_files_hash_verified':checked,'configuration_keys_preserved':True,'scheduler_disabled':True}))
frappe.destroy()
"""
        evidence=json.loads(run(['docker','exec','-w',BENCH,backend,BENCH+'/env/bin/python','-c',verify]).decode())
        inspection=json.loads(run(['docker','inspect',backend]).decode())[0]
        assert not inspection['HostConfig']['PortBindings']
        assert set(inspection['NetworkSettings']['Networks'])=={PROJECT+'_recovery'}
        network=json.loads(run(['docker','network','inspect',PROJECT+'_recovery']).decode())[0]; assert network['Internal']
        receipt.update(outcome='success',evidence=evidence,isolated_network=True,public_ports=False)
        print('PASS: laptop package database, files and configuration restored',flush=True)
    except Exception:
        receipt.update(outcome='failure',failed_stage=stage)
        print('FAIL at '+stage+'; private diagnostic output suppressed',flush=True)
    finally:
        if created:
            try: run(['docker','compose','-p',PROJECT,'-f',str(compose),'down','--volumes','--remove-orphans'],120); receipt['test_volumes_removed']=True
            except Exception: receipt['test_volumes_removed']=False
        receipt['elapsed_seconds']=round(time.monotonic()-started,1)
        receipt['finished_utc']=dt.datetime.now(dt.timezone.utc).isoformat()
        (ROOT/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
        for name in ['plain','unpack']:
            shutil.rmtree(ROOT/name,ignore_errors=True)
        (ROOT/'package.tar').unlink(missing_ok=True); compose.unlink(missing_ok=True)
        print(json.dumps(receipt),flush=True)
    return 0 if receipt.get('outcome')=='success' and receipt.get('test_volumes_removed') else 1

if __name__=='__main__': raise SystemExit(main())
