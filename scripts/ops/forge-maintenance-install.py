#!/usr/bin/env python3
"""Guarded activation. Default validates only; --apply installs this named checker."""
import hashlib
import json
import os
from pathlib import Path
import pwd
import shutil
import socket
import subprocess
import sys

STAGE=Path('/root/corpflowai-maintenance-stage-20261008')
LIB=Path('/usr/local/lib/corpflowai-maintenance')
UNIT=Path('/etc/systemd/system')
STATE=Path('/var/lib/corpflowai-maintenance')
HEALTH=Path('/home/anton/.local/bin/corpflowai-ops-backup-health-check.sh')
EXPECTED_HEALTH='87061c0241ca7296e21e4ab76803570b58c36fe9452b1563b4c18498812ed40d'
TIMER='corpflowai-forge-maintenance-collect.timer'
SERVICE='corpflowai-forge-maintenance-collect.service'

def run(args):
    return subprocess.run(args,check=True,text=True,capture_output=True,timeout=310).stdout

def main():
    assert os.geteuid()==0 and socket.gethostname()=='corpflow-exec-01-u69678'
    assert hashlib.sha256(HEALTH.read_bytes()).hexdigest()==EXPECTED_HEALTH
    files={LIB/'forge-maintenance-collect.py':STAGE/'forge-maintenance-collect.py',
           LIB/'forge-maintenance-review.py':STAGE/'forge-maintenance-review.py',
           UNIT/SERVICE:STAGE/SERVICE,UNIT/TIMER:STAGE/TIMER}
    assert not LIB.exists() and not STATE.exists() and not any(p.exists() for p in files), 'unexpected_existing_activation'
    run(['/usr/bin/python3',str(STAGE/'test-forge-maintenance.py')])
    run(['/usr/bin/bash','-n',str(STAGE/'health-maintenance-candidate.sh')])
    run(['/usr/bin/systemd-analyze','verify',str(STAGE/SERVICE),str(STAGE/TIMER)])
    if sys.argv[1:]!=['--apply']:
        print('PREPARE PASS; no runtime change'); return
    assert not (STAGE/'activation-started').exists()
    (STAGE/'activation-started').write_text('approved #1423 2026-10-08 08:20 Mauritius\n')
    original=STAGE/'health-before-maintenance.sh'; shutil.copy2(HEALTH,original); original.chmod(0o600)
    owner=pwd.getpwnam('anton'); health_changed=False
    try:
        LIB.mkdir(mode=0o755); STATE.mkdir(mode=0o755)
        for target,source in files.items():
            target.write_bytes(source.read_bytes()); target.chmod(0o644)
        run(['/usr/bin/systemctl','daemon-reload'])
        # Live read-only collection before activating the independent freshness check.
        run(['/usr/bin/systemctl','start',SERVICE])
        receipt=json.loads((STATE/'status.json').read_text())
        assert receipt['outcome']=='success' and receipt['checks_outcome']=='PASS', 'live_checker_not_healthy'
        HEALTH.write_bytes((STAGE/'health-maintenance-candidate.sh').read_bytes())
        HEALTH.chmod(0o755); os.chown(HEALTH,owner.pw_uid,owner.pw_gid); health_changed=True
        run(['/usr/bin/systemctl','enable','--now',TIMER])
        assert run(['/usr/bin/systemctl','is-enabled',TIMER]).strip()=='enabled'
        print('READ-ONLY MAINTENANCE ACTIVATED; Forge result='+receipt['forge_outcome'])
        print(run(['/usr/bin/systemctl','show',TIMER,'-p','NextElapseUSecRealtime','-p','Persistent']))
        print(json.dumps(receipt,sort_keys=True))
    except Exception:
        subprocess.run(['/usr/bin/systemctl','disable','--now',TIMER],capture_output=True)
        subprocess.run(['/usr/bin/systemctl','stop',SERVICE],capture_output=True)
        if health_changed:
            HEALTH.write_bytes(original.read_bytes()); HEALTH.chmod(0o755); os.chown(HEALTH,owner.pw_uid,owner.pw_gid)
        for target in files: target.unlink(missing_ok=True)
        subprocess.run(['/usr/bin/systemctl','daemon-reload'],capture_output=True)
        print('ACTIVATION FAILED; exact runtime files/checker rolled back; receipt evidence preserved')
        raise

if __name__=='__main__': main()
