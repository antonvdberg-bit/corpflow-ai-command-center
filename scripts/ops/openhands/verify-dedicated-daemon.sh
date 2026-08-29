#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — verify DEDICATED Docker daemon isolation
#
# STATUS: INACTIVE package (issue #743). READ-ONLY. Security follow-up for
# PR #747 (dedicated Docker isolation design — see
# docs/operations/OPENHANDS_DOCKER_ISOLATION.md). This is the LIVE
# verification companion to the static checks in preflight.sh and
# verify-sandbox-boundary.sh — it actually talks to the dedicated daemon (if
# one is reachable) and checks what it reports, rather than only inspecting
# files.
#
# Passes cleanly (exit 0) if the dedicated daemon is not running at all —
# that is the expected, safe state for this INACTIVE package before any
# authorized install. It does NOT pass cleanly if the daemon IS running but
# shows signs of being the wrong daemon (primary-socket-shaped, foreign
# data-root, or foreign containers visible).
#
# OpenHands dynamically creates agent-server containers named
# oh-agent-server-<opaque-id>. Those are expected runtime children of this
# dedicated daemon and are allowed here; they remain isolated because the
# foreign-name scan, dedicated data-root check, and dedicated socket check
# still fail closed.
#
# Usage:
#   bash scripts/ops/openhands/verify-dedicated-daemon.sh

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

usage() {
  cat <<'USAGE'
Usage: verify-dedicated-daemon.sh [--help]

Live verification that OpenHands' Docker context is a genuinely DEDICATED,
isolated rootless daemon — not the primary host daemon, and not sharing
state/visibility with any other CorpFlowAI-managed container. Passes
cleanly if the dedicated daemon is simply not running yet (expected
pre-install state). Read-only; never starts, stops, or modifies anything.
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

FAILURES=()

fail() {
  FAILURES+=("$1")
  say "FAIL: $1"
}

pass() {
  say "PASS: $1"
}

readonly FOREIGN_NAME_PATTERNS=(
  "uptime-kuma"
  "beszel"
  "n8n"
  "erpnext"
  "frappe"
)

check_socket_path_is_not_primary() {
  if is_primary_docker_socket_path "${OPENHANDS_DOCKER_SOCK}"; then
    fail "OPENHANDS_DOCKER_SOCK resolves to the PRIMARY host socket (${OPENHANDS_PRIMARY_DOCKER_SOCK}) — forbidden"
    return
  fi
  if docker_host_targets_primary_socket "${OPENHANDS_DOCKER_HOST}"; then
    fail "OPENHANDS_DOCKER_HOST targets the PRIMARY host socket — forbidden"
    return
  fi
  pass "OPENHANDS_DOCKER_SOCK / OPENHANDS_DOCKER_HOST are not the primary socket (static check)"
}

read_dedicated_data_root() {
  DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker info -f '{{.DockerRootDir}}' 2>/dev/null || printf ''
}

is_expected_agent_server_resource() {
  local name="$1"
  [[ "${name}" =~ ^oh-agent-server-[A-Za-z0-9]+$ ]]
}

main() {
  say "verifying dedicated Docker daemon isolation (docs/operations/OPENHANDS_DOCKER_ISOLATION.md)"

  check_socket_path_is_not_primary

  if ! command -v docker >/dev/null 2>&1; then
    say "docker unavailable — cannot perform live checks; static check result stands"
    if [[ "${#FAILURES[@]}" -eq 0 ]]; then
      exit 0
    fi
    exit 1
  fi

  if [[ ! -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
    say "PASS (not-applicable): dedicated Docker socket not present at OPENHANDS_DOCKER_SOCK — the dedicated daemon is not running yet, which is the expected, safe state for this INACTIVE package"
    if [[ "${#FAILURES[@]}" -eq 0 ]]; then
      exit 0
    fi
    say "FAIL — ${#FAILURES[@]} violation(s) found from static checks alone:"
    local v
    for v in "${FAILURES[@]}"; do say "  - ${v}"; done
    exit 1
  fi

  local data_root
  data_root="$(read_dedicated_data_root)"
  if [[ -z "${data_root}" ]]; then
    fail "dedicated Docker socket exists but 'docker info' against OPENHANDS_DOCKER_HOST did not return a DockerRootDir — daemon may be starting up, unhealthy, or unreachable due to permissions"
  elif ! is_allowed_data_root_path "${data_root}"; then
    fail "dedicated daemon reports DockerRootDir='${data_root}', which is NOT under OPENHANDS_HOME ('${OPENHANDS_HOME}') — this daemon is not the dedicated OpenHands daemon (or was started with the wrong --data-root)"
  else
    pass "dedicated daemon DockerRootDir is under OPENHANDS_HOME (${data_root})"
  fi

  local containers networks volumes
  containers="$(DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker ps -a --format '{{.Names}}' 2>/dev/null || printf '')"
  networks="$(DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker network ls --format '{{.Name}}' 2>/dev/null || printf '')"
  volumes="$(DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker volume ls --format '{{.Name}}' 2>/dev/null || printf '')"

  local all_names
  all_names="$(printf '%s\n%s\n%s\n' "${containers}" "${networks}" "${volumes}")"

  local pattern hit=0
  for pattern in "${FOREIGN_NAME_PATTERNS[@]}"; do
    if printf '%s' "${all_names}" | grep -Fqi "${pattern}"; then
      fail "dedicated daemon can see a resource matching foreign-tool name pattern '${pattern}' — isolation has failed (wrong DOCKER_HOST, wrong --data-root, or an actual shared/primary daemon)"
      hit=1
    fi
  done
  if [[ "${hit}" -eq 0 ]]; then
    pass "no foreign (non-OpenHands) resource names visible on the dedicated daemon"
  fi

  local n unexpected=0
  while IFS= read -r n; do
    [[ -z "${n}" ]] && continue
    if is_expected_agent_server_resource "${n}"; then
      continue
    fi
    if ! is_allowed_resource_name "${n}"; then
      fail "dedicated daemon shows an unrecognized resource name (not in this package's allowlist): ${n}"
      unexpected=1
    fi
  done <<< "${all_names}"
  if [[ "${unexpected}" -eq 0 ]]; then
    pass "every visible resource name on the dedicated daemon is within this package's allowlist, an expected OpenHands agent-server runtime child, or none exist"
  fi

  if [[ "${#FAILURES[@]}" -eq 0 ]]; then
    say "PASS — dedicated Docker daemon isolation verified"
    exit 0
  fi

  say "FAIL — ${#FAILURES[@]} violation(s) found:"
  local v
  for v in "${FAILURES[@]}"; do
    say "  - ${v}"
  done
  exit 1
}

main
