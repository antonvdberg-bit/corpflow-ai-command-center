#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — verify loopback-only bind
#
# STATUS: INACTIVE package (issue #743). READ-ONLY. Fails (non-zero exit) if
# OpenHands is listening anywhere other than 127.0.0.1. Passes cleanly (exit
# 0) if OpenHands is not running at all — "not installed" is a safe state,
# not a failure of this check.
#
# This script exists so any future install can be continuously re-verified
# against the loopback-only rule, not just checked once at install time.
#
# Note on the dedicated-daemon isolation design (docs/operations/
# OPENHANDS_DOCKER_ISOLATION.md): this check is host-port-based (ss/netstat
# against 127.0.0.1:${OPENHANDS_PORT}), not a Docker API call, so it does NOT
# go through the openhands_docker() wrapper in lib/common.sh — there is no
# daemon (primary or dedicated) to target. It is unaffected by which daemon
# spawned the listening process; the loopback-only rule applies identically
# either way. lib/common.sh is still sourced for say/warn/die logging only.
#
# Usage:
#   bash scripts/ops/openhands/verify-private-bind.sh
#   OPENHANDS_PORT=3000 bash scripts/ops/openhands/verify-private-bind.sh
#
# Exit codes:
#   0 — not listening at all, OR listening only on 127.0.0.1 (safe)
#   1 — listening on 0.0.0.0, ::, or any non-loopback address (FAIL)
#   2 — usage / tooling error (could not determine binding at all)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

OPENHANDS_PORT="${OPENHANDS_PORT:-3000}"

usage() {
  cat <<'USAGE'
Usage: verify-private-bind.sh [--help]

Fails if OpenHands (by port) is listening on 0.0.0.0, ::, or any address
other than 127.0.0.1/loopback. Passes if not listening at all, or listening
only on 127.0.0.1. Read-only.
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

is_loopback_addr() {
  local addr="$1"
  case "${addr}" in
    127.*|localhost|::1)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

main() {
  say "checking loopback-only bind for port ${OPENHANDS_PORT}"

  local listeners=""
  if command -v ss >/dev/null 2>&1; then
    listeners="$(ss -Hltn 2>/dev/null | awk -v p=":${OPENHANDS_PORT}" '$4 ~ p"$" {print $4}' || true)"
  elif command -v netstat >/dev/null 2>&1; then
    listeners="$(netstat -ltn 2>/dev/null | awk -v p=":${OPENHANDS_PORT}" '$4 ~ p"$" {print $4}' || true)"
  else
    die "neither ss nor netstat available — cannot verify bind (fail-closed: treat as unknown/error)"
  fi

  if [[ -z "${listeners}" ]]; then
    say "PASS — nothing is listening on port ${OPENHANDS_PORT} (OpenHands not running is a safe state)"
    exit 0
  fi

  local bad=0
  local line addr
  while IFS= read -r line; do
    [[ -z "${line}" ]] && continue
    # Local address is formatted like 127.0.0.1:3000, 0.0.0.0:3000, [::]:3000, or [::1]:3000
    addr="${line%:*}"
    addr="${addr#[}"
    addr="${addr%]}"
    if is_loopback_addr "${addr}"; then
      say "ok: listener on ${line} (loopback)"
    else
      say "BAD: listener on ${line} (NOT loopback)"
      bad=1
    fi
  done <<< "${listeners}"

  if [[ "${bad}" -eq 1 ]]; then
    say "FAIL — port ${OPENHANDS_PORT} has a non-loopback listener. This violates the loopback-only rule in ops/openhands/compose.yaml."
    exit 1
  fi

  say "PASS — all listeners on port ${OPENHANDS_PORT} are loopback-only"
  exit 0
}

main "$@"
