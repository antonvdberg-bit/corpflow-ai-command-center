#!/usr/bin/env bash
# CorpFlowAI — Temporal POC — read-only host capacity capture (#1025)
#
# STATUS: inspection helper. This script is READ-ONLY. It never installs,
# starts, stops, or modifies anything. Safe to run on any host, including
# one that has never heard of Temporal.
#
# Purpose: produce the live CPU/RAM/disk/Docker evidence required before any
# Temporal install decision. Cursor Cloud cannot SSH to corpflow-exec-01;
# Anton runs this at L3.
#
# NEVER prints secrets or environment variable VALUES.
#
# Usage:
#   bash scripts/ops/temporal/inspect-host-capacity.sh
#   bash scripts/ops/temporal/inspect-host-capacity.sh > temporal-capacity-report.md
#
# Exit codes:
#   0 — report generated (best-effort; missing tools are noted, not fatal)
#   2 — usage error

set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: inspect-host-capacity.sh [--help]

Read-only host capacity capture for Temporal POC sizing (#1025).
Prints a markdown-friendly report to stdout. Never modifies anything.
Never prints secrets or env var values.
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi
if [[ "$#" -gt 0 ]]; then
  printf 'unexpected argument(s): %s\n' "$*" >&2
  usage
  exit 2
fi

section() {
  printf '\n## %s\n\n' "$1"
}

code_block() {
  printf '```\n'
  cat
  printf '```\n'
}

run_or_note() {
  local desc="$1"
  shift
  if command -v "$1" >/dev/null 2>&1; then
    "$@" 2>&1 || printf '(command exited non-zero: %s)\n' "$*"
  else
    printf '(%s unavailable — command not found: %s)\n' "${desc}" "$1"
  fi
}

main() {
  printf '# Temporal host capacity report (read-only, #1025)\n'
  printf '\nGenerated: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'Host: %s\n' "$(hostname 2>/dev/null || echo unknown)"
  printf 'User: %s\n' "$(whoami 2>/dev/null || echo unknown)"
  printf 'Expected production-ops hostname: corpflow-exec-01-u69678\n'
  if [[ "$(hostname 2>/dev/null || true)" != "corpflow-exec-01-u69678" ]]; then
    printf '\n**HOST_MISMATCH:** this is not corpflow-exec-01-u69678. Do not treat these numbers as exec-01 evidence.\n'
  fi

  section "CPU"
  {
    printf 'nproc: %s\n' "$(nproc 2>/dev/null || echo unknown)"
    if command -v lscpu >/dev/null 2>&1; then
      lscpu
    fi
  } | code_block

  section "OS / kernel"
  {
    if [[ -r /etc/os-release ]]; then
      # shellcheck disable=SC1091
      . /etc/os-release
      printf 'PRETTY_NAME: %s\n' "${PRETTY_NAME:-unknown}"
    fi
    uname -a
  } | code_block

  section "Memory"
  run_or_note "free" free -h | code_block

  section "Swap"
  if command -v swapon >/dev/null 2>&1; then
    swapon --show 2>&1 | code_block
  elif [[ -r /proc/swaps ]]; then
    cat /proc/swaps | code_block
  else
    printf '(swap tools unavailable)\n'
  fi

  section "Root disk"
  {
    df -h / 2>&1 || true
    printf '\n'
    df -i / 2>&1 || true
  } | code_block

  section "Block devices"
  run_or_note "lsblk" lsblk -o NAME,SIZE,TYPE,FSTYPE,MOUNTPOINT | code_block

  section "Load"
  run_or_note "uptime" uptime | code_block

  section "vmstat (3 samples, 1s)"
  if command -v vmstat >/dev/null 2>&1; then
    vmstat 1 3 2>&1 | code_block
  else
    printf '(vmstat not installed — skipped; do not install packages)\n'
  fi

  section "iostat (if already installed)"
  if command -v iostat >/dev/null 2>&1; then
    iostat -xz 1 3 2>&1 | code_block
  else
    printf '(iostat not installed — skipped; do not install packages)\n'
  fi

  section "Pressure (PSI, if available)"
  if [[ -r /proc/pressure/memory || -r /proc/pressure/cpu || -r /proc/pressure/io ]]; then
    for f in /proc/pressure/cpu /proc/pressure/memory /proc/pressure/io; do
      if [[ -r "${f}" ]]; then
        printf '%s:\n' "${f}"
        cat "${f}"
      fi
    done | code_block
  else
    printf '(/proc/pressure not available)\n'
  fi

  section "Listening TCP ports (addresses/ports only)"
  if command -v ss >/dev/null 2>&1; then
    ss -Hltn 2>&1 | code_block
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ltn 2>&1 | code_block
  else
    printf '(neither ss nor netstat available)\n'
  fi

  section "Firewall (status only; no rules mutation)"
  if command -v ufw >/dev/null 2>&1; then
    { ufw status 2>&1 || printf '(ufw status not readable)\n'; } | code_block
  else
    printf '(ufw not present)\n'
  fi

  section "Docker version"
  run_or_note "docker" docker version | code_block

  section "Docker Compose version"
  if docker compose version >/dev/null 2>&1; then
    docker compose version 2>&1 | code_block
  else
    printf '(docker compose unavailable)\n'
  fi

  section "Running containers (names/status/ports)"
  run_or_note "docker" docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' | code_block

  section "docker stats --no-stream"
  run_or_note "docker" docker stats --no-stream --format 'table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.MemPerc}}' | code_block

  section "Restart policies (running containers)"
  if command -v docker >/dev/null 2>&1; then
    ids="$(docker ps -q 2>/dev/null || true)"
    if [[ -n "${ids}" ]]; then
      # shellcheck disable=SC2086
      docker inspect --format '{{.Name}} restart={{.HostConfig.RestartPolicy.Name}}' ${ids} 2>&1 | code_block
    else
      printf '(no running containers)\n'
    fi
  else
    printf '(docker unavailable)\n'
  fi

  section "Named compose projects of interest (presence only)"
  if command -v docker >/dev/null 2>&1; then
    {
      printf 'uptime-kuma:\n'
      docker ps -a --filter name=uptime-kuma --format '{{.Names}}\t{{.Status}}\t{{.Ports}}' 2>&1 || true
      printf 'erpnext / corpflowai sandbox or production:\n'
      docker ps -a --format '{{.Names}}\t{{.Status}}\t{{.Ports}}' 2>&1 | grep -Ei 'erpnext|frappe|corpflowai-(sandbox|production)' || printf '(no matching names in docker ps -a)\n'
      printf 'temporal (must be empty until a later authorized POC):\n'
      docker ps -a --filter name=temporal --format '{{.Names}}\t{{.Status}}\t{{.Ports}}' 2>&1 || true
    } | code_block
  else
    printf '(docker unavailable)\n'
  fi

  section "Notes"
  printf -- '- This report is read-only and never mutates host state.\n'
  printf -- '- No environment variable values are printed.\n'
  printf -- '- Stop-gate: do not install Temporal unless MemAvailable >= 4 GiB, free disk >= 20 GiB, and this hostname is corpflow-exec-01-u69678 or a dedicated sibling VM.\n'
  printf -- '- Canonical: docs/operations/TEMPORAL_HOST_FEASIBILITY_EVIDENCE_1025.md\n'
}

main "$@"
