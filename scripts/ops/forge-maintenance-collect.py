#!/usr/bin/env python3
"""Fixed read-only host collector. Only sanitized receipt files are written."""
import datetime as dt
import fcntl
import hashlib
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
import urllib.request

ROOT = Path('/var/lib/corpflowai-maintenance')
REVIEWER = '/usr/local/lib/corpflowai-maintenance/forge-maintenance-review.py'
HOST = 'corpflow-exec-01-u69678'
CRITICAL = ['docker','caddy','ssh','fail2ban']
EXPECTED = ['corpflowai-hosted-restore-'+s+'-1' for s in
            ['backend','db','frontend','websocket','redis-cache','redis-queue']]
GIB = 1024**3

def command(args, timeout=15):
    p = subprocess.run(args, capture_output=True, text=True, timeout=timeout,
                       env={'PATH':'/usr/sbin:/usr/bin:/sbin:/bin','LANG':'C.UTF-8'})
    if p.returncode:
        raise RuntimeError('read_only_probe_failed')
    if len(p.stdout)>1024*1024:
        raise RuntimeError('probe_output_limit')
    return p.stdout

def atom(path, data):
    if path.is_symlink():
        raise RuntimeError('unsafe_receipt_path')
    temp = path.with_suffix('.tmp')
    fd = os.open(temp, os.O_WRONLY|os.O_CREAT|os.O_TRUNC|os.O_NOFOLLOW, 0o644)
    with os.fdopen(fd,'w') as f:
        json.dump(data,f,sort_keys=True); f.write('\n'); f.flush(); os.fsync(f.fileno())
    os.chmod(temp,0o644); os.replace(temp,path)

def age(timestamp, now):
    when=dt.datetime.fromisoformat(timestamp.replace('Z','+00:00'))
    if when.tzinfo is None:
        raise ValueError('missing_timezone')
    seconds=(now-when).total_seconds()
    if seconds < -300:
        raise ValueError('future_timestamp')
    return seconds

def backup_check(path, now, laptop=False):
    data=json.loads(path.read_text())
    if laptop:
        return data.get('version')==1 and bool(data.get('sha256')) and age(data['last_verified_copy_utc'],now) <= 7*86400
    if data.get('outcome')!='success': return False
    return data.get('remote_verified') is True and age(data['last_success_utc'],now)<=36*3600

def probe_url(url):
    try:
        with urllib.request.urlopen(url,timeout=10) as r:
            return r.status==200
    except Exception:
        return False

def status_health(data, now):
    if age(data['finished_utc'],now)>36*3600:
        return 'Maintenance check has not completed within 36 hours'
    if data.get('outcome')!='success':
        return 'Maintenance collection or verified service checks failed'
    if data.get('forge_outcome')=='FAIL':
        return 'Forge maintenance verifier failed'
    if data.get('forge_outcome')=='DEFERRED_RESOURCE' and age(data['forge_deferred_since_utc'],now)>48*3600:
        return 'Forge review lacks safe memory headroom for more than 48 hours'
    if data.get('forge_outcome') not in ['PASS','DEFERRED_RESOURCE']:
        return 'Maintenance Forge verdict is missing or invalid'
    return ''

def collect(now):
    tasks=[]; metrics={}; warnings=[]
    def task(id, ok, details):
        tasks.append({'id':id,'result':'PASS' if ok else 'FAIL','evidence':details})
    mem={x.split(':')[0]:int(x.split()[1])*1024 for x in Path('/proc/meminfo').read_text().splitlines()}
    stat=os.statvfs('/'); used=1-stat.f_bavail/stat.f_blocks
    metrics.update(available_ram_bytes=mem['MemAvailable'], disk_used_fraction=round(used,4),
                   disk_available_bytes=stat.f_bavail*stat.f_frsize,
                   load_1m=os.getloadavg()[0], swap_used_bytes=mem['SwapTotal']-mem['SwapFree'])
    failed=command(['/usr/bin/systemctl','--failed','--no-legend','--no-pager'])
    # Identifiers only; never journal message contents.
    failed_units=[x.split()[1] if x.startswith('●') else x.split()[0] for x in failed.splitlines() if x.split()]
    metrics['failed_units']=failed_units
    if 'cloud-init-hotplugd.service' in failed_units:
        warnings.append('known_cloud_init_hotplug_failure_requires_diagnosis')
    task('D01',used<0.9 and mem['MemAvailable']>=2*GIB and
         not any(x.removesuffix('.service') in CRITICAL for x in failed_units),metrics)
    names=command(['/usr/bin/docker','ps','-a','--format','{{.Names}}']).splitlines()
    assert 0<len(names)<=100
    fmt='{"name":{{json .Name}},"state":{{json .State.Status}},"health":{{if .State.Health}}{{json .State.Health.Status}}{{else}}"not_configured"{{end}},"restart_count":{{.RestartCount}},"restart_policy":{{json .HostConfig.RestartPolicy.Name}}}'
    states=[json.loads(line) for line in command(['/usr/bin/docker','inspect','--format',fmt,*names]).splitlines()]
    for row in states: row['name']=row['name'].lstrip('/')
    active=[x for x in states if x['name']!='corpflowai-production-configurator-1']
    task('D02',set(EXPECTED).issubset(names) and all(x['state']=='running' and x['health'] not in ['unhealthy','starting'] for x in active)
         and not any(x['name'].startswith('corpflowai-hosted-restore-') and any(y in x['name'] for y in ['scheduler','queue-short','queue-long']) for x in states),states)
    try:
        erp=backup_check(Path('/var/lib/corpflowai-erp-backup/status.json'),now)
        laptop=backup_check(Path('/var/lib/corpflowai-erp-backup/laptop-status.json'),now,True)
        task('D03',erp and laptop,{'erp_verified_fresh':erp,'laptop_ack_fresh':laptop})
    except Exception as e:
        task('D03',False,{'error_class':type(e).__name__})
    endpoints={url:probe_url(url) for url in
               ['https://erp.corpflowai.com/api/method/ping','https://core.corpflowai.com/api/factory/health']}
    task('D04',all(endpoints.values()),endpoints)
    services={name:subprocess.run(['/usr/bin/systemctl','is-active',name],capture_output=True,text=True,timeout=5).stdout.strip() for name in CRITICAL}
    task('D05',all(x=='active' for x in services.values()),services)
    task('D06',True,{'due_task_count':6,'collector_contract':'fixed_read_only_v1'})
    return {'version':1,'host':HOST,'observed_at_utc':now.isoformat(),'tasks':tasks,'warnings':warnings}

def main():
    assert os.geteuid()==0 and socket.gethostname()==HOST
    os.umask(0o022)
    ROOT.mkdir(mode=0o755,exist_ok=True)
    assert not ROOT.is_symlink() and ROOT.stat().st_uid==0
    lock=os.open(ROOT/'run.lock',os.O_CREAT|os.O_RDWR|os.O_NOFOLLOW,0o600)
    try:
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    except BlockingIOError:
        print('DEFERRED_LOCK'); return 0
    now=dt.datetime.now(dt.timezone.utc); started=time.monotonic()
    status={'observed_at_utc':now.isoformat(),'host':HOST}
    try:
        evidence=collect(now); atom(ROOT/'evidence.json',evidence)
        raw=subprocess.run(['/usr/sbin/runuser','-u','anton','--','/usr/bin/python3',REVIEWER],
                           capture_output=True,text=True,timeout=195,
                           env={'PATH':'/usr/sbin:/usr/bin:/sbin:/bin','LANG':'C.UTF-8'})
        assert len(raw.stdout)<=65536
        review=json.loads(raw.stdout)
        assert review['outcome'] in ['PASS','FAIL','DEFERRED_RESOURCE']
        assert review['source_sha256']==hashlib.sha256((ROOT/'evidence.json').read_bytes()).hexdigest()
        ok=all(x['result']=='PASS' for x in evidence['tasks'])
        status.update(collection_outcome='success', checks_outcome='PASS' if ok else 'FAIL',
                      forge_outcome=review['outcome'], forge_review=review,
                      task_results=[{'id':x['id'],'result':x['result']} for x in evidence['tasks']],
                      warnings=evidence['warnings'],
                      outcome='success' if ok and review['outcome']!='FAIL' else 'failure')
        if review['outcome']=='DEFERRED_RESOURCE':
            previous=json.loads((ROOT/'status.json').read_text()) if (ROOT/'status.json').exists() else {}
            status['forge_deferred_since_utc']=previous.get('forge_deferred_since_utc') or now.isoformat()
    except Exception as error:
        status.update(outcome='failure',collection_outcome='failure',error_class=type(error).__name__)
    status['elapsed_seconds']=round(time.monotonic()-started,2)
    status['finished_utc']=dt.datetime.now(dt.timezone.utc).isoformat()
    atom(ROOT/'status.json',status)
    if status['outcome']!='success':
        # Existing checker owns notifier credentials and deduplication.
        subprocess.run(['/usr/sbin/runuser','-u','anton','--','/usr/bin/env',
                        'XDG_RUNTIME_DIR=/run/user/1000','DBUS_SESSION_BUS_ADDRESS=unix:path=/run/user/1000/bus',
                        '/usr/bin/systemctl','--user','start','--no-block','corpflowai-ops-backup-health.service'],
                       capture_output=True,timeout=10)
    print(json.dumps(status,sort_keys=True)); return 0 if status['outcome']=='success' else 1

if __name__=='__main__':
    if len(sys.argv)==2 and sys.argv[1]=='--health':
        try:
            message=status_health(json.loads((ROOT/'status.json').read_text()),dt.datetime.now(dt.timezone.utc))
        except Exception:
            message='Maintenance check receipt is missing or invalid'
        print(message); raise SystemExit(0)
    raise SystemExit(main())
