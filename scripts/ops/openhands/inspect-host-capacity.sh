#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — read-only host capacity capture
#
# STATUS: INACTIVE package (issue #743). This script is READ-ONLY. It never
# installs, starts, stops, or modifies anything. Safe to run on any host,
# including one that has never heard of OpenHands.
#
# Purpose: capture CPU, RAM, swap, disk, Docker system state, running
# containers, networks, volumes, listening ports, load, and (if available)
# pressure stats — as markdown-friendly output for a PR/issue evidence
# comment or for sizing review against the resource envelope documented in
# ops/openhands/VERSIONS.md (control ~1 CPU / 2 GiB; sandbox guidance 2 CPU /
# 4 GiB, hard max 6 GiB; concurrency 1; total ceiling ~8 GiB).
#
# NEVER prints secrets or env var VALUES. Only presence-style facts about the
# host and Docker are printed.
#
# Usage:
#   bash scripts/ops/openhands/inspect-host-capacity.sh
#   bash scripts/ops/openhands/inspect-host-capacity.sh > capacity-report.md
#
# Exit codes:
#   0 — report generated (best-effort; missing tools are noted, not fatal)
#   2 — usage error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

usage() {
  cat <<'USAGE'
Usage: inspect-host-capacity.sh [--help]

Read-only host capacity capture for OpenHands sizing review. Prints a
markdown-friendly report to stdout. Never modifies anything. Never prints
secrets or env var values.
USAGE
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  usage
  exit 0
fi
if [[ "$#" -gt 0 ]]; then
  warn "unexpected argument(s): $*"
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
  # Usage: run_or_note "description" cmd args...
  local desc="$1"
  shift
  if command -v "$1" >/dev/null 2>&1; then
    "$@" 2>&1 || printf '(command exited non-zero: %s)\n' "$*"
  else
    printf '(%s unavailable — command not found: %s)\n' "${desc}" "$1"
  fi
}

main() {
  printf '# OpenHands host capacity report (read-only)\n'
  printf '\nGenerated: %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf 'Host: %s\n' "$(hostname 2>/dev/null || echo unknown)"
  printf 'Project (not necessarily installed): %s\n' "${OPENHANDS_PROJECT}"

  section "CPU"
  if command -v lscpu >/dev/null 2>&1; then
    lscpu 2>&1 | code_block
  else
    nproc --all 2>&1 | { printf 'nproc --all: '; cat; } | code_block
  fi

  section "Architecture / kernel"
  { uname -a 2>&1 || true; } | code_block

  section "Memory"
  if command -v free >/dev/null 2>&1; then
    free -h 2>&1 | code_block
  else
    printf '(free unavailable)\n'
  fi

  section "Swap"
  if [[ -r /proc/swaps ]]; then
    cat /proc/swaps | code_block
  else
    printf '(/proc/swaps unavailable)\n'
  fi

  section "Disk"
  { df -h 2>&1 || true; } | code_block

  section "Load average"
  if [[ -r /proc/loadavg ]]; then
    cat /proc/loadavg | code_block
  else
    { uptime 2>&1 || true; } | code_block
  fi

  section "Pressure (PSI, if available)"
  if [[ -r /proc/pressure/cpu || -r /proc/pressure/memory || -r /proc/pressure/io ]]; then
    for f in /proc/pressure/cpu /proc/pressure/memory /proc/pressure/io; do
      if [[ -r "${f}" ]]; then
        printf '%s:\n' "${f}"
        cat "${f}"
      fi
    done | code_block
  else
    printf '(/proc/pressure not available on this kernel)\n'
  fi

  section "Docker version — PRIMARY host daemon (read-only host-wide inventory, NOT OpenHands' own daemon)"
  run_or_note "docker" docker version 2>&1 | code_block

  section "Docker system df — PRIMARY host daemon"
  run_or_note "docker" docker system df -v 2>&1 | code_block

  section "Running containers — PRIMARY host daemon (all projects — read-only listing)"
  run_or_note "docker" docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>&1 | code_block

  section "Docker networks — PRIMARY host daemon"
  run_or_note "docker" docker network ls 2>&1 | code_block

  section "Docker volumes — PRIMARY host daemon"
  run_or_note "docker" docker volume ls 2>&1 | code_block

  section "Existing corpflowai-openhands resources on the PRIMARY daemon (should ALWAYS be none — see the dedicated-daemon section below for the real inventory; a hit here would itself be a Docker-isolation-design violation per docs/operations/OPENHANDS_DOCKER_ISOLATION.md)"
  if command -v docker >/dev/null 2>&1; then
    printf 'Containers matching name=corpflowai-openhands:\n'
    docker ps -a --filter "name=${OPENHANDS_PROJECT}" --format '{{.Names}}\t{{.Image}}\t{{.Status}}' 2>&1 || true
    printf 'Networks matching name=corpflowai-openhands:\n'
    docker network ls --filter "name=${OPENHANDS_PROJECT}" --format '{{.Name}}' 2>&1 || true
    printf 'Volumes matching name=corpflowai-openhands:\n'
    docker volume ls --filter "name=${OPENHANDS_PROJECT}" --format '{{.Name}}' 2>&1 || true
  else
    printf '(docker unavailable — cannot check)\n'
  fi | code_block

  section "OpenHands DEDICATED daemon inventory (read-only — the actual OpenHands resource usage; see docs/operations/OPENHANDS_DOCKER_ISOLATION.md)"
  # Deliberately uses a plain DOCKER_HOST-prefixed `docker` call here rather
  # than the fail-closed openhands_docker() wrapper: this section is a
  # best-effort, never-crashes report generator, and openhands_docker()'s
  # die()-on-misconfiguration behavior is appropriate for scripts that
  # MUTATE state (install/rollback/uninstall), not for a read-only inventory
  # dump. The dedicated-vs-primary distinction is still fully honored — this
  # section only ever targets OPENHANDS_DOCKER_HOST, never the ambient/primary
  # daemon — it just does not abort the whole report if that target happens
  # to be unreachable or misconfigured.
  if [[ ! -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
    printf '(dedicated Docker socket not present at %s — dedicated daemon not installed/running; this is the expected state for this INACTIVE package)\n' "${OPENHANDS_DOCKER_SOCK}"
  elif ! command -v docker >/dev/null 2>&1; then
    printf '(docker unavailable — cannot check)\n'
  else
    printf 'Dedicated daemon info (DockerRootDir, should be under OPENHANDS_HOME):\n'
    DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker info -f '{{.DockerRootDir}}' 2>&1 || printf '(dedicated daemon info failed — may not be running)\n'
    printf 'Containers on the dedicated daemon:\n'
    DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}' 2>&1 || printf '(dedicated daemon ps failed)\n'
    printf 'Networks on the dedicated daemon:\n'
    DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker network ls 2>&1 || printf '(dedicated daemon network ls failed)\n'
    printf 'Volumes on the dedicated daemon:\n'
    DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker volume ls 2>&1 || printf '(dedicated daemon volume ls failed)\n'
    printf 'System df on the dedicated daemon:\n'
    DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker system df -v 2>&1 || printf '(dedicated daemon system df failed)\n'
  fi | code_block

  section "Listening ports (loopback vs. non-loopback)"
  if command -v ss >/dev/null 2>&1; then
    ss -Hltnp 2>&1 || ss -Hltn 2>&1
  elif command -v netstat >/dev/null 2>&1; then
    netstat -ltnp 2>&1 || netstat -ltn 2>&1
  else
    printf '(neither ss nor netstat available)\n'
  fi | code_block

  section "Notes"
  printf -- '- This report is read-only and never mutates host state.\n'
  printf -- '- No environment variable values are printed by this script.\n'
  printf -- '- Sizing reference: ops/openhands/VERSIONS.md (control ~1 CPU / 2 GiB; sandbox guidance 2 CPU / 4 GiB, hard max 6 GiB; concurrency 1; total ceiling ~8 GiB).\n'
}

main "$@"
