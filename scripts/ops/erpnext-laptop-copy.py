#!/usr/bin/env python3
"""Four bounded encrypted recovery slots using existing authenticated SSH."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

ROOT=Path.home()/'CorpFlowAI-Recovery'/'ERPNext'
SSH=r'C:\Program Files\Git\usr\bin\ssh.exe'
SCP=r'C:\Program Files\Git\usr\bin\scp.exe'
OPTIONS=['-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=10']
HOST='root@10.240.0.1'

def call(args,timeout=600,cwd=None):
    p=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.PIPE,timeout=timeout,cwd=cwd)
    if p.returncode: raise RuntimeError('remote operation failed')
    return p.stdout

def digest(p):
    with p.open('rb') as f: return hashlib.file_digest(f,'sha256').hexdigest()

def save(p,data):
    tmp=p.with_suffix(p.suffix+'.pending'); tmp.write_text(json.dumps(data,indent=2)+'\n',encoding='utf-8'); os.replace(tmp,p)

def advance_slots(prior,receipt):
    run=receipt['run']
    old=prior['slots']; slots=dict(old)
    current=old.get('latest')
    if current and current['run'] != run: slots['previous']=current
    slots['latest']=receipt
    when=dt.datetime.fromisoformat(receipt['created_utc']); week=list(when.isocalendar()[:2]); month=[when.year,when.month]
    if prior.get('weekly_period') != week: slots['weekly']=receipt
    if prior.get('monthly_period') != month: slots['monthly']=receipt
    return slots,week,month

def main():
    ROOT.mkdir(parents=True,exist_ok=True)
    # Windows kernel exclusive open prevents concurrent task/manual rotations.
    import msvcrt
    lock=(ROOT/'copy.lock').open('a+b'); lock.seek(0); lock.write(b'0'); lock.flush(); lock.seek(0)
    msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
    prior=json.loads((ROOT/'slots.json').read_text()) if (ROOT/'slots.json').exists() else {'version':1,'slots':{}}
    stamp=dt.datetime.now(dt.timezone.utc).isoformat(timespec='seconds')
    try:
        receipt=json.loads(call([SSH,*OPTIONS,HOST,'/usr/local/sbin/corpflowai-erp-laptop-package.py']))
        run=receipt['run']
        import re
        if not re.fullmatch(r'\d{8}T\d{6}Z',run) or receipt['path']!='/root/erpnext-server-backups/laptop-packages/'+run+'.tar.gpg':
            raise RuntimeError('unexpected package identity')
        # Explicit 2 GiB ceiling; four packages at most, plus one download.
        if not 0 < receipt['bytes'] <= 2*1024**3 or shutil.disk_usage(ROOT).free < receipt['bytes']*2+256*1024**2:
            raise RuntimeError('storage budget exceeded')
        packages=ROOT/'packages'; packages.mkdir(exist_ok=True)
        dest=packages/(run+'.tar.gpg')
        with tempfile.TemporaryDirectory(prefix='download-',dir=ROOT) as tmp:
            download=Path(tmp)/'package.gpg'
            call([SCP,*OPTIONS,HOST+':'+receipt['path'],'package.gpg'],cwd=tmp)
            if download.stat().st_size != receipt['bytes'] or digest(download) != receipt['sha256']:
                raise RuntimeError('download checksum failed')
            os.replace(download,dest)
        slots,week,month=advance_slots(prior,receipt)
        save(ROOT/'slots.json',{'version':1,'slots':slots,'weekly_period':week,'monthly_period':month,'last_verified_utc':stamp,'max_distinct_packages':4,'max_package_bytes':2*1024**3})
        keep={v['run']+'.tar.gpg' for v in slots.values()}
        for p in packages.glob('????????T??????Z.tar.gpg'):
            if p.name not in keep: p.unlink()
        call([SSH,*OPTIONS,HOST,'/usr/local/sbin/corpflowai-erp-laptop-package.py --ack '+run+' '+receipt['sha256']],timeout=60)
        save(ROOT/'status.json',{'outcome':'success','last_attempt_utc':stamp,'run':run,'sha256':receipt['sha256'],'bytes':receipt['bytes'],'distinct_packages':len(keep)})
        print('PASS: encrypted laptop package checksum verified; '+str(len(keep))+' distinct package(s), at most four retained')
    except Exception:
        save(ROOT/'status.json',{'outcome':'failure','last_attempt_utc':stamp,'previous_good_slots_preserved':True})
        # Reuse the existing failure-only notifier when VPN/server remain reachable.
        try:
            call([SSH,*OPTIONS,HOST,"runuser -u anton -- env HOME=/home/anton XDG_RUNTIME_DIR=/run/user/1000 BACKUP_HEALTH_FORCE_FAIL=1 'BACKUP_HEALTH_FORCE_REASON=ERP laptop recovery copy failed; previous copies preserved' /home/anton/.local/bin/corpflowai-ops-backup-health-check.sh"],timeout=60)
        except Exception: pass
        print('ERP laptop copy failed or server unavailable; prior good copies preserved',file=sys.stderr)
        raise SystemExit(1)
    finally:
        lock.seek(0); msvcrt.locking(lock.fileno(),msvcrt.LK_UNLCK,1); lock.close()

if __name__=='__main__': main()
