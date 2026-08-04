#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — verify sandbox / privilege boundary
#
# STATUS: INACTIVE package (issue #743). READ-ONLY. Inspects the compose file
# (and, if the dedicated daemon is reachable, the running container) for
# privileged mode, host networking, and overly broad bind mounts. Passes
# cleanly if OpenHands is not installed/running at all.
#
# Security follow-up for PR #747 (dedicated Docker isolation design — see
# docs/operations/OPENHANDS_DOCKER_ISOLATION.md): the ORIGINAL package
# treated the primary-socket mount (/var/run/docker.sock) as a known,
# accepted, NON-FAILING risk. That design is now FORBIDDEN. This script:
#   - FAILS (not "note", as before) if the compose file mounts the primary
#     socket outside of a documentation comment.
#   - FAILS if host networking or privileged mode is set (unchanged).
#   - Verifies the compose file's DOCKER_HOST env value is the dedicated,
#     in-container socket path — not /var/run/docker.sock.
#   - Verifies the running container (if reachable via the DEDICATED daemon
#     only — never the primary daemon) does not reference any docker
#     resource name outside this package's allowlist (lib/common.sh
#     is_allowed_resource_name), catching an install that accidentally wired
#     up an unrelated network/volume.
#
# What DOES fail this check:
#   - the compose file (outside comments) mounts /var/run/docker.sock
#   - privileged: true anywhere in the compose file or running container
#   - network_mode: host (or host networking) on the control-plane service
#   - any bind mount of "/" or a bare "/home" (whole-home-directory mount)
#   - security_opt missing no-new-privileges:true
#   - the compose file's DOCKER_HOST value is not the expected dedicated,
#     in-container socket path
#   - a running container references a network/volume name outside this
#     package's allowlist
#
# Usage:
#   bash scripts/ops/openhands/verify-sandbox-boundary.sh
#
# Exit codes:
#   0 — no violation found
#   1 — a violation found
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

Fails if the OpenHands compose definition (or, if running against the
DEDICATED daemon, the live container) uses the primary Docker socket,
privileged mode, host networking, a whole-home/root bind mount, or
references a docker resource name outside this package's allowlist.
Read-only.
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

noncomment_lines() {
  grep -Ev '^[[:space:]]*#' "$1" 2>/dev/null || true
}

check_compose_file() {
  if [[ ! -f "${COMPOSE_FILE}" ]]; then
    warn "compose file not found: ${COMPOSE_FILE} — nothing to check statically"
    return
  fi

  local active
  active="$(noncomment_lines "${COMPOSE_FILE}")"

  if printf '%s\n' "${active}" | grep -Eq '^\s*privileged:\s*true'; then
    VIOLATIONS+=("compose file sets privileged: true")
  fi

  if printf '%s\n' "${active}" | grep -Eq '^\s*network_mode:\s*host'; then
    VIOLATIONS+=("compose file sets network_mode: host")
  fi

  # Whole-root or whole-home bind mounts, e.g. "- /:/something" or "- /home:/something".
  if printf '%s\n' "${active}" | grep -Eq '^\s*-\s*/:[^/]'; then
    VIOLATIONS+=("compose file bind-mounts host root '/'")
  fi
  if printf '%s\n' "${active}" | grep -Eq "^\\s*-\\s*/home:"; then
    VIOLATIONS+=("compose file bind-mounts whole /home")
  fi

  if ! printf '%s\n' "${active}" | grep -Eq 'no-new-privileges:\s*true'; then
    VIOLATIONS+=("compose file does not set security_opt: no-new-privileges:true")
  fi

  # FORBIDDEN, not a documented/accepted risk (security follow-up for PR
  # #747): fails this check now, rather than only printing a NOTE.
  if printf '%s\n' "${active}" | grep -Fq '/var/run/docker.sock'; then
    VIOLATIONS+=("compose file references the FORBIDDEN primary socket /var/run/docker.sock outside of a documentation comment")
  fi

  if printf '%s\n' "${active}" | grep -Fq 'host.docker.internal'; then
    VIOLATIONS+=("compose file references host.docker.internal outside of a documentation comment — extra_hosts must be REMOVED")
  fi

  # DOCKER_HOST inside the compose file's own `environment:` block must be
  # the dedicated, in-container socket path, never the primary socket path.
  local docker_host_line
  docker_host_line="$(printf '%s\n' "${active}" | grep -E '^\s*DOCKER_HOST:' || true)"
  if [[ -z "${docker_host_line}" ]]; then
    VIOLATIONS+=("compose file does not set a DOCKER_HOST env value for the app service")
  elif printf '%s' "${docker_host_line}" | grep -Fq '/var/run/docker.sock'; then
    VIOLATIONS+=("compose file's DOCKER_HOST env value targets the FORBIDDEN primary socket")
  fi

  say "static compose check complete"
}

# Checks the running container ONLY via the DEDICATED daemon (openhands_docker
# wrapper) — never the primary daemon. If OPENHANDS_DOCKER_SOCK isn't a live
# socket yet, docker calls will simply fail to connect and this function
# treats that the same as "nothing live to check" (safe, expected pre-install
# state), not a violation.
check_running_container() {
  if ! command -v docker >/dev/null 2>&1; then
    warn "docker unavailable — skipping live container check"
    return
  fi
  if [[ ! -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
    say "dedicated Docker socket not present — nothing live to check (safe, expected pre-install state)"
    return
  fi
  if ! openhands_docker inspect "${OPENHANDS_PROJECT}-app" >/dev/null 2>&1; then
    say "no running/existing container named ${OPENHANDS_PROJECT}-app on the dedicated daemon — nothing live to check"
    return
  fi

  local privileged host_net
  privileged="$(openhands_docker inspect -f '{{.HostConfig.Privileged}}' "${OPENHANDS_PROJECT}-app" 2>/dev/null || echo "unknown")"
  host_net="$(openhands_docker inspect -f '{{.HostConfig.NetworkMode}}' "${OPENHANDS_PROJECT}-app" 2>/dev/null || echo "unknown")"

  if [[ "${privileged}" == "true" ]]; then
    VIOLATIONS+=("running container has Privileged=true")
  fi
  if [[ "${host_net}" == "host" ]]; then
    VIOLATIONS+=("running container has NetworkMode=host")
  fi

  # Every network/volume this container references (on the dedicated daemon)
  # must be in this package's allowlist — catches an install that
  # accidentally wired up an unrelated network or volume.
  local networks
  networks="$(openhands_docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "${OPENHANDS_PROJECT}-app" 2>/dev/null || true)"
  local n
  for n in ${networks}; do
    if ! is_allowed_resource_name "${n}"; then
      VIOLATIONS+=("running container is attached to an unrecognized network: ${n}")
    fi
  done

  local mounts
  mounts="$(openhands_docker inspect -f '{{range .Mounts}}{{if eq .Type "volume"}}{{.Name}} {{end}}{{end}}' "${OPENHANDS_PROJECT}-app" 2>/dev/null || true)"
  local v
  for v in ${mounts}; do
    if ! is_allowed_resource_name "${v}"; then
      VIOLATIONS+=("running container mounts an unrecognized volume: ${v}")
    fi
  done

  say "live container check complete (privileged=${privileged} network_mode=${host_net})"
}

main() {
  say "checking sandbox / privilege boundary (primary-socket mount is now FORBIDDEN, not an accepted risk)"
  check_compose_file
  check_running_container

  if [[ "${#VIOLATIONS[@]}" -eq 0 ]]; then
    say "PASS — no violation found"
    exit 0
  fi

  say "FAIL — ${#VIOLATIONS[@]} violation(s) found:"
  local v
  for v in "${VIOLATIONS[@]}"; do
    say "  - ${v}"
  done
  exit 1
}

main
