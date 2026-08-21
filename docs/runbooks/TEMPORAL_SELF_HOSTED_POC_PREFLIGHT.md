# Temporal self-hosted POC — read-only preflight (operator paste)

**Packet:** #1025  
**Status:** paste-ready, **read-only**. Does **not** install Temporal.  
**When to run:** Anton at L3 on `corpflow-exec-01-u69678`, after the Cursor Cloud `HOST_MISMATCH` stop gate.  
**Canonical evidence:** `docs/operations/TEMPORAL_HOST_FEASIBILITY_EVIDENCE_1025.md`

---

## 1. Purpose

Produce the **measured** CPU / RAM / disk / Docker evidence the Factory worker could not collect. Until this output exists, Temporal must **not** be installed on exec-01.

## 2. Hard rules

- Read-only: no `apt`, no `docker compose up`, no package install, no reboot, no firewall/DNS change, no env/secret edit.
- Do not paste `.env`, `POSTGRES_URL`, tokens, passwords, or Temporal DB credentials into GitHub or chat.
- If `hostname` is not `corpflow-exec-01-u69678`, **stop**. You are on the wrong machine.

## 3. Paste block

From Anton’s operator terminal:

```bash
ssh anton@<exec-01-host>
```

Then, from a clone of this repo on the box **or** after copying `scripts/ops/temporal/inspect-host-capacity.sh`:

```bash
hostname
whoami
bash scripts/ops/temporal/inspect-host-capacity.sh
```

If the script is not on the box, paste this equivalent (still read-only):

```bash
set -euo pipefail
echo "=== hostname / date ==="
hostname; date -u +%Y-%m-%dT%H:%M:%SZ
echo "=== OS ==="
. /etc/os-release 2>/dev/null && echo "$PRETTY_NAME" || cat /etc/os-release
uname -r
echo "=== CPU ==="
nproc
lscpu 2>/dev/null | awk -F: '/^CPU\(s\)|^Model name|^Architecture/{gsub(/^[ \t]+/,"",$2); print $1": "$2}'
echo "=== memory ==="
free -h
echo "=== swap ==="
swapon --show || true
echo "=== disk ==="
df -h /
df -i /
echo "=== lsblk ==="
lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT
echo "=== load ==="
uptime
echo "=== vmstat ==="
vmstat 1 3 || true
echo "=== iostat (if present; do not install) ==="
if command -v iostat >/dev/null 2>&1; then iostat -xz 1 3; else echo "(iostat not installed — skipped)"; fi
echo "=== listening ports (no secrets) ==="
ss -Hltn || netstat -ltn
echo "=== firewall (if readable) ==="
if command -v ufw >/dev/null 2>&1; then sudo -n ufw status 2>/dev/null || ufw status 2>/dev/null || echo "(ufw status not readable without sudo)"; else echo "(ufw not present)"; fi
echo "=== docker ==="
docker version --format '{{.Server.Version}}' 2>/dev/null || docker version
docker compose version 2>/dev/null || true
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'
echo "=== docker stats ==="
docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}'
echo "=== restart policies ==="
docker inspect --format '{{.Name}} restart={{.HostConfig.RestartPolicy.Name}}' $(docker ps -q) 2>/dev/null || true
echo "=== DONE — paste non-secret stdout only ==="
```

## 4. How to judge the output (do not install yet)

**STOP — do not install Temporal on this host** if any of:

- `MemAvailable` (from `free`) is under **4 GiB**
- free disk on `/` is under **20 GiB**
- 15-minute load is above `nproc` **and** both ERPNext compose projects show `Up`
- Temporal ports `7233` / `8233` already appear on a **non-loopback** address

**Option 2 may be reconsidered** only if all of:

- `MemAvailable` ≥ 4 GiB **after** current containers
- free disk ≥ 20 GiB
- Temporal would use the loopback compose in `ops/temporal/compose.example.yml`
- dedicated Temporal Postgres (not Neon)

Otherwise keep **Option 3**: sibling Hetzner CX32 (~€7.50/month, 4 vCPU / 8 GB). Buying that VM is a separate Anton payment action.

## 5. What happens after a passing live preflight

A **new** packet (not this one) would:

1. Record the live numbers in GitHub.
2. Choose exec-01-with-limits **or** the sibling VM.
3. Only then run the compose **on the chosen host**, still loopback-only.
4. Run the synthetic 3-workflow / wait-signal / restart proofs.

This runbook does not authorize that install.
