#!/usr/bin/env python3
"""Build encrypted laptop ERP recovery package; emit sanitized download receipt."""
import datetime as dt
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import socket
import subprocess
import tarfile
import tempfile

ROOT = Path('/root/erpnext-server-backups')
IMAGE = 'frappe/erpnext@sha256:edf67a669bf1ca5850b38c8234292ec219b756bfed545b276e17325260b7cdea'

def sha(p):
    with p.open('rb') as f:
        return hashlib.file_digest(f, 'sha256').hexdigest()

def main():
    os.umask(0o077)
    if os.geteuid() != 0 or socket.gethostname() != 'corpflow-exec-01-u69678':
        raise RuntimeError('wrong host or account')
    status = json.loads(Path('/var/lib/corpflowai-erp-backup/status.json').read_text())
    if status.get('outcome') != 'success' or not status.get('remote_verified'):
        raise RuntimeError('latest server backup is not verified')
    attempt = dt.datetime.fromisoformat(status['last_attempt_utc'])
    if dt.datetime.now(dt.timezone.utc)-attempt > dt.timedelta(hours=36):
        raise RuntimeError('server backup too old')
    run = attempt.strftime('%Y%m%dT%H%M%SZ')
    folder = ROOT/'daily'/run
    manifest = json.loads((folder/'manifest.json').read_text())
    if len(manifest['files']) != 4:
        raise RuntimeError('incomplete artifact inventory')
    for item in manifest['files']:
        if Path(item['name']).name != item['name']:
            raise RuntimeError('unsafe artifact name')
        p = folder/item['name']
        if p.is_symlink() or p.stat().st_size != item['bytes'] or sha(p) != item['sha256']:
            raise RuntimeError('artifact checksum mismatch')
    spec=importlib.util.spec_from_file_location('erp_backup','/usr/local/sbin/corpflowai-erp-borg-backup.py')
    module=importlib.util.module_from_spec(spec); spec.loader.exec_module(module)
    if module.verify_remote(folder, manifest) != status['archive']:
        raise RuntimeError('remote archive identity changed')
    config_file=next(folder/x['name'] for x in manifest['files'] if 'site_config_backup' in x['name'])
    key=json.loads(config_file.read_text()).get('backup_encryption_key')
    if not isinstance(key,str) or not key or '\n' in key:
        raise RuntimeError('backup encryption key unavailable')
    outdir=ROOT/'laptop-packages'; outdir.mkdir(mode=0o700,exist_ok=True); outdir.chmod(0o700)
    output=outdir/(run+'.tar.gpg')
    if output.exists():
        if output.is_symlink() or output.stat().st_size == 0:
            raise RuntimeError('unsafe cached package')
        print(json.dumps({'version':1,'run':run,'created_utc':manifest['created_utc'],'path':str(output),'bytes':output.stat().st_size,'sha256':sha(output),'archive':status['archive']}))
        return
    fd,tmp=tempfile.mkstemp(prefix='.pending-',dir=outdir); os.close(fd)
    r,w=os.pipe(); os.write(w,(key+'\n').encode()); os.close(w)
    try:
        proc=subprocess.Popen(['gpg','--batch','--yes','--no-symkey-cache','--pinentry-mode','loopback','--passphrase-fd',str(r),'--symmetric','--cipher-algo','AES256','--output',tmp],stdin=subprocess.PIPE,stdout=subprocess.DEVNULL,stderr=subprocess.PIPE,pass_fds=(r,))
        os.close(r); r=None
        with tarfile.open(fileobj=proc.stdin,mode='w|') as tar:
            for item in manifest['files']:
                tar.add(folder/item['name'],arcname='backup/'+item['name'],recursive=False)
            tar.add(folder/'manifest.json',arcname='backup/manifest.json',recursive=False)
            for name in ['compose.yaml','prepare-recovery.sh','restore-recovery.sh']:
                p=Path('/root/erpnext-hosted-restore-20261007')/name
                tar.add(p,arcname='reference/'+name,recursive=False)
            recipe={'version':1,'site':manifest['site'],'image':IMAGE,'backup_run':run,'archive':status['archive'],'warning':'Reference scripts/config are historical. Restore only into NEW project/volumes; never execute them verbatim against live sites. Obtain backup encryption key independently from Infisical. Site config also preserves application encryption key. Disable scheduler/workers and external egress. Software images require separate retrieval.'}
            data=(json.dumps(recipe,indent=2)+'\n').encode(); info=tarfile.TarInfo('recovery.json'); info.size=len(data); info.mode=0o600; tar.addfile(info,io.BytesIO(data))
        proc.stdin.close()
        if proc.wait(timeout=120) != 0:
            raise RuntimeError('whole-package encryption failed')
        os.replace(tmp,output); output.chmod(0o600)
        receipt={'version':1,'run':run,'created_utc':manifest['created_utc'],'path':str(output),'bytes':output.stat().st_size,'sha256':sha(output),'archive':status['archive']}
        print(json.dumps(receipt))
        for old in sorted(outdir.glob('????????T??????Z.tar.gpg')):
            if old != output: old.unlink()
    finally:
        if r is not None: os.close(r)
        Path(tmp).unlink(missing_ok=True)

if __name__ == '__main__':
    try:
        import sys,re
        if len(sys.argv)==4 and sys.argv[1]=='--ack':
            run,digest=sys.argv[2:]
            assert os.geteuid()==0 and socket.gethostname()=='corpflow-exec-01-u69678'
            assert re.fullmatch(r'\d{8}T\d{6}Z',run) and re.fullmatch(r'[0-9a-f]{64}',digest)
            assert sha(ROOT/'laptop-packages'/(run+'.tar.gpg'))==digest
            p=Path('/var/lib/corpflowai-erp-backup/laptop-status.json'); tmp=p.with_suffix('.pending')
            tmp.write_text(json.dumps({'version':1,'last_verified_copy_utc':dt.datetime.now(dt.timezone.utc).isoformat(),'run':run,'sha256':digest})+'\n'); tmp.chmod(0o644); os.replace(tmp,p)
            print('Laptop copy acknowledgement recorded')
        else: main()
    except Exception:
        print('ERP laptop packaging failed; previous laptop copies remain intact',file=__import__('sys').stderr)
        raise SystemExit(1)
