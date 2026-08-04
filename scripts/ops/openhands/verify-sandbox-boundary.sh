#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — verify sandbox / privilege boundary
#
# STATUS: INACTIVE package (issue #743). READ-ONLY. Inspects the compose file
# (and, if present, the running container) for privileged mode, host
# networking, and overly broad bind mounts. Passes cleanly if OpenHands is
# not installed/running at all.
#
# Known-accepted risk (does NOT fail this check): the Docker-socket mount
# (/var/run/docker.sock) is required by upstream OpenHands to spawn sandbox
# containers and is documented as a RISK in ops/openhands/compose.yaml and
# ops/openhands/VERSIONS.md. This script reports it loudly but does not treat
# it as a failure, since removing it would break the intended architecture —
# the risk is accepted-pending-review, not hidden.
#
# What DOES fail this check:
#   - privileged: true anywhere in the compose file or running container
#   - network_mode: host (or host networking) on the control-plane service
#   - any bind mount of "/" or a bare "/home" (whole-home-directory mount)
#   - security_opt missing no-new-privileges:true
#
# Usage:
#   bash scripts/ops/openhands/verify-sandbox-boundary.sh
#
# Exit codes:
#   0 — no disallowed boundary violation found (Docker-socket RISK, if
#       present, is reported but does not fail)
#   1 — a disallowed violation found (privileged, host networking, or a
#       whole-home/root bind mount)
#   2 — usage / tooling error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="$(openhands_repo_root)"
COMPOSE_FILE="${REPO_ROOT}/ops/openhands/compose.yaml"

usage() {
  cat <<'USAGE'
Usage: verify-sandbox-boundary.sh [--help]

Fails if the OpenHands compose definition (or, if running, the live
container) uses privileged mode, host networking, or a whole-home/root bind
mount. The Docker-socket mount is reported as a known/accepted risk and does
NOT fail this check. Read-only.
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

VIOLATIONS=()

check_compose_file() {
  if [[ ! -f "${COMPOSE_FILE}" ]]; then
    warn "compose file not found: ${COMPOSE_FILE} — nothing to check statically"
    return
  fi

  if grep -Eq '^\s*privileged:\s*true' "${COMPOSE_FILE}"; then
    VIOLATIONS+=("compose file sets privileged: true")
  fi

  if grep -Eq '^\s*network_mode:\s*host' "${COMPOSE_FILE}"; then
    VIOLATIONS+=("compose file sets network_mode: host")
  fi

  # Whole-root or whole-home bind mounts, e.g. "- /:/something" or "- /home:/something".
  if grep -Eq '^\s*-\s*/:[^/]' "${COMPOSE_FILE}"; then
    VIOLATIONS+=("compose file bind-mounts host root '/'")
  fi
  if grep -Eq "^\\s*-\\s*/home:" "${COMPOSE_FILE}"; then
    VIOLATIONS+=("compose file bind-mounts whole /home")
  fi

  if ! grep -Eq 'no-new-privileges:\s*true' "${COMPOSE_FILE}"; then
    VIOLATIONS+=("compose file does not set security_opt: no-new-privileges:true")
  fi

  if grep -Eq '/var/run/docker\.sock' "${COMPOSE_FILE}"; then
    say "NOTE (accepted risk, not a failure): compose file mounts /var/run/docker.sock — required by upstream for sandbox spawn. See ops/openhands/VERSIONS.md."
  fi

  say "static compose check complete"
}

check_running_container() {
  if ! command -v docker >/dev/null 2>&1; then
    warn "docker unavailable — skipping live container check"
    return
  fi
  if ! docker inspect "${OPENHANDS_PROJECT}-app" >/dev/null 2>&1; then
    say "no running/existing container named ${OPENHANDS_PROJECT}-app — nothing live to check"
    return
  fi

  local privileged host_net
  privileged="$(docker inspect -f '{{.HostConfig.Privileged}}' "${OPENHANDS_PROJECT}-app" 2>/dev/null || echo "unknown")"
  host_net="$(docker inspect -f '{{.HostConfig.NetworkMode}}' "${OPENHANDS_PROJECT}-app" 2>/dev/null || echo "unknown")"

  if [[ "${privileged}" == "true" ]]; then
    VIOLATIONS+=("running container has Privileged=true")
  fi
  if [[ "${host_net}" == "host" ]]; then
    VIOLATIONS+=("running container has NetworkMode=host")
  fi

  say "live container check complete (privileged=${privileged} network_mode=${host_net})"
}

main() {
  say "checking sandbox / privilege boundary (Docker-socket mount is a known accepted risk, reported separately)"
  check_compose_file
  check_running_container

  if [[ "${#VIOLATIONS[@]}" -eq 0 ]]; then
    say "PASS — no disallowed privilege/network/mount violation found"
    exit 0
  fi

  say "FAIL — ${#VIOLATIONS[@]} violation(s) found:"
  local v
  for v in "${VIOLATIONS[@]}"; do
    say "  - ${v}"
  done
  exit 1
}

main "$@"
