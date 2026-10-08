#!/usr/bin/env python3
"""Consistent, protected recovery artifacts for the existing encrypted Borg job."""
import datetime as dt
import hashlib
import json
import os
from pathlib import Path
import shutil
import socket
import sqlite3
import subprocess
import sys
import tarfile
import time

ROOT = Path('/root/corpflowai-ops-recovery/daily')
DBS = {
    'kuma.db': Path('/home/anton/uptime-kuma-data/kuma.db'),
    'beszel-data.db': Path('/var/lib/docker/volumes/corpflowai-beszel-data/_data/data.db'),
    'beszel-auxiliary.db': Path('/var/lib/docker/volumes/corpflowai-beszel-data/_data/auxiliary.db'),
}
CONFIG = [Path(x) for x in [
    '/etc/caddy/Caddyfile', '/var/lib/caddy/.local/share/caddy',
    '/home/anton/corpflow-nebula/config', '/etc/nebula',
    '/home/anton/uptime-kuma/compose.yml',
    '/home/anton/corpflowai-beszel/compose.yaml',
    '/var/lib/docker/volumes/corpflowai-beszel-data/_data/id_ed25519',
    '/root/erpnext-hosted-restore-20261007/compose.yaml',
    '/etc/systemd/system/corpflowai-forge-maintenance-collect.service',
    '/etc/systemd/system/corpflowai-forge-maintenance-collect.timer',
    '/usr/local/lib/corpflowai-maintenance',
]]

def digest(path):
    h = hashlib.sha256()
    with path.open('rb') as f:
        for chunk in iter(lambda: f.read(1048576), b''): h.update(chunk)
    return h.hexdigest()

def sqlite_snapshot(source, target, seconds=120):
    if source.is_symlink() or not source.is_file(): raise RuntimeError('invalid_database_source')
    start = time.monotonic()
    def progress(*args):
        if time.monotonic() - start > seconds: raise RuntimeError('snapshot_deadline')
    with sqlite3.connect(source.as_uri()+'?mode=ro', uri=True, timeout=5) as src:
        with sqlite3.connect(target) as dst:
            src.backup(dst, pages=256, progress=progress, sleep=0.05)
            if dst.execute('PRAGMA quick_check').fetchall() != [('ok',)]:
                raise RuntimeError('snapshot_integrity_failed')
    target.chmod(0o600)

def make_snapshot(root=ROOT, databases=DBS, config=CONFIG, include_metadata=True):
    os.umask(0o077)
    root.mkdir(mode=0o700, parents=True, exist_ok=True)
    if root.is_symlink(): raise RuntimeError('unsafe_root')
    root.chmod(0o700)
    if shutil.disk_usage(root).free < 1024**3: raise RuntimeError('insufficient_snapshot_space')
    name=dt.datetime.now(dt.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    pending=root/('.pending-'+name); folder=root/name
    pending.mkdir(mode=0o700)
    try:
        for label,source in databases.items(): sqlite_snapshot(source,pending/label)
        archive=pending/'protected-config.tar.gz'
        with tarfile.open(archive,'w:gz',dereference=False) as tar:
            for p in config:
                if not p.exists() or p.is_symlink(): raise RuntimeError('missing_or_linked_configuration')
                tar.add(p,arcname=str(p).lstrip('/'))
        archive.chmod(0o600)
        if include_metadata:
            # Protected recovery metadata, never printed or supplied to Forge.
            result=subprocess.run(['docker','inspect','uptime-kuma','corpflowai-beszel-hub',
                                   'corpflow-nebula-lighthouse','corpflow-local-llm'],
                                  capture_output=True,timeout=30,check=True)
            if len(result.stdout)>4*1024**2: raise RuntimeError('metadata_limit')
            (pending/'protected-container-metadata.json').write_bytes(result.stdout)
            (pending/'protected-container-metadata.json').chmod(0o600)
        files=[{'name':p.name,'bytes':p.stat().st_size,'sha256':digest(p)} for p in sorted(pending.iterdir())]
        manifest={'version':1,'created_utc':dt.datetime.now(dt.timezone.utc).isoformat(),
                  'scope':'kuma-beszel-nebula-caddy-deployment-config','files':files,
                  'excluded':['ollama-model-weights','original-erp-database','core-neon','n8n',
                              'complete-host-image','independent-offline-key-escrow']}
        (pending/'manifest.json').write_text(json.dumps(manifest,sort_keys=True)+'\n')
        (pending/'manifest.json').chmod(0o600)
        pending.rename(folder)
        return folder
    except Exception:
        shutil.rmtree(pending)
        raise

def verify(folder):
    manifest=json.loads((folder/'manifest.json').read_text())
    for row in manifest['files']:
        if Path(row['name']).name != row['name']: raise RuntimeError('unsafe_manifest_path')
        p=folder/row['name']
        if p.is_symlink() or p.stat().st_size!=row['bytes'] or digest(p)!=row['sha256']:
            raise RuntimeError('artifact_hash_mismatch')
        if p.suffix=='.db':
            with sqlite3.connect(p.as_uri()+'?mode=ro',uri=True) as c:
                if c.execute('PRAGMA quick_check').fetchall()!=[('ok',)]: raise RuntimeError('db_integrity_failed')
    with tarfile.open(folder/'protected-config.tar.gz') as tar:
        for item in tar:
            if item.name.startswith('/') or '..' in Path(item.name).parts: raise RuntimeError('unsafe_archive_member')
    return manifest

def main():
    if os.geteuid()!=0 or socket.gethostname()!='corpflow-exec-01-u69678': return 1
    try:
        if sys.argv[1:]==['--create']:
            folder=make_snapshot(); verify(folder)
            print(json.dumps({'folder':str(folder)})); return 0
        if len(sys.argv)==3 and sys.argv[1]=='--verify':
            verify(Path(sys.argv[2])); print('Protected ops artifact integrity: PASS'); return 0
        return 2
    except Exception:
        print('Protected ops snapshot: FAIL; private details suppressed',file=sys.stderr); return 1

if __name__=='__main__': sys.exit(main())
