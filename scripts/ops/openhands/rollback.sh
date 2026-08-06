#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — rollback (stop/disable only)
#
# STATUS: INACTIVE package (issue #743). This script STOPS and DISABLES
# (removes container, keeps volumes) only the named corpflowai-openhands*
# resources, on the DEDICATED daemon only. It never touches any other
# container, network, or volume on the host, and never runs `docker system
# prune` or any wildcard operation.
#
# Security follow-up for PR #747 (dedicated Docker isolation design — see
# docs/operations/OPENHANDS_DOCKER_ISOLATION.md):
#   - Every docker call in this script goes through openhands_docker()
#     (lib/common.sh), which fails closed if DOCKER_HOST would resolve to
#     the primary socket. This script does NOT touch the primary daemon at
#     any point.
#   - Before removing anything, prints the exact allowlisted targets it is
#     about to act on.
#   - Refuses to proceed if the dedicated daemon's own `docker info` reports
#     a data-root NOT under $OPENHANDS_HOME — that would mean DOCKER_HOST
#     is pointed at some other daemon (possibly the primary one, possibly a
#     third daemon entirely), and this script must not act against it.
#   - By default, stops ONLY the app container — the dedicated dockerd unit
#     itself is left running (rollback is meant to be reversible/quick; a
#     dockerd restart is a heavier, separate operation). Pass
#     --also-stop-daemon to additionally stop
#     corpflowai-openhands-dockerd.service (systemd --user), which is a
#     separate, explicit opt-in.
#
# Difference from uninstall.sh: rollback.sh is reversible (data volumes are
# preserved so the service can be brought back up); uninstall.sh additionally
# removes named volumes/networks.
#
# Requires --confirm on the command line. Also prompts interactively via
# lib/common.sh's confirm() as a second, human-facing check. Both gates must
# pass.
#
# Usage:
#   bash scripts/ops/openhands/rollback.sh --confirm
#   bash scripts/ops/openhands/rollback.sh --confirm --also-stop-daemon
#
# Exit codes:
#   0 — rollback completed (or no-op — nothing was running)
#   1 — rollback step failed
#   2 — usage error / --confirm not supplied / interactive confirmation declined

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="$(openhands_repo_root)"
COMPOSE_FILE="${REPO_ROOT}/ops/openhands/compose.yaml"
CONFIRMED=0
ALSO_STOP_DAEMON=0

usage() {
  cat <<'USAGE'
Usage: rollback.sh --confirm [--also-stop-daemon]

Stops and removes ONLY the named corpflowai-openhands-app container (via
`docker compose down` against the DEDICATED daemon, no -v, so named volumes
are preserved). Never touches any other container. Never runs docker system
prune. Requires --confirm plus an interactive typed confirmation.

  --also-stop-daemon   Additionally stop the dedicated rootless dockerd
                        systemd --user unit (corpflowai-openhands-dockerd.service).
                        Opt-in and separate from the default (app-only) rollback.
USAGE
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --confirm)
      CONFIRMED=1
      shift
      ;;
    --also-stop-daemon)
      ALSO_STOP_DAEMON=1
      shift
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      warn "unexpected argument: $1"
      usage
      exit 2
      ;;
  esac
done

if [[ "${CONFIRMED}" -ne 1 ]]; then
  die "refusing to run without --confirm (see usage with --help)"
fi

# Refuses to proceed if the dedicated daemon's reported data-root is not
# under OPENHANDS_HOME — this catches DOCKER_HOST being pointed at the
# primary daemon, a stray leftover daemon, or any other unexpected target,
# BEFORE any destructive action.
assert_dedicated_daemon_data_root() {
  if [[ ! -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
    say "no-op check: dedicated Docker socket not present — nothing to verify (daemon not running)"
    return 0
  fi

  # Explicit, UNREDIRECTED call first: if the isolation context itself is
  # misconfigured (e.g. OPENHANDS_DOCKER_HOST somehow points at the primary
  # socket), this dies loudly and immediately, in the main shell — not
  # swallowed by a `2>/dev/null` on some later command substitution.
  openhands_assert_isolation_context

  # Now that the context is confirmed dedicated, read DockerRootDir. A
  # failure HERE means "daemon unreachable," not "isolation misconfigured"
  # — safe to degrade to a warning rather than a hard failure.
  local data_root
  data_root="$(DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker info -f '{{.DockerRootDir}}' 2>/dev/null || echo "")"
  if [[ -z "${data_root}" ]]; then
    warn "could not read DockerRootDir from the dedicated daemon — proceeding with named-resource operations only, but this is worth investigating"
    return 0
  fi
  if ! is_allowed_data_root_path "${data_root}"; then
    die "refusing to proceed: dedicated daemon reports data-root '${data_root}', which is NOT under OPENHANDS_HOME ('${OPENHANDS_HOME}'). DOCKER_HOST may be pointed at an unexpected daemon. Investigate before retrying."
  fi
  say "dedicated daemon data-root confirmed under OPENHANDS_HOME (${data_root})"
}

print_allowlisted_targets() {
  # Exact allowlist names (must stay aligned with OPENHANDS_ALLOWED_RESOURCES
  # in lib/common.sh and lib/openhands/package-policy.js ROLLBACK_ALLOWED_*).
  say "allowlisted target(s) for this rollback:"
  say "  container: corpflowai-openhands-app"
  say "  network:   corpflowai-openhands-net (removed by compose down; recreated on next up)"
  say "  volumes preserved: corpflowai-openhands-state, corpflowai-openhands-workspace"
  if [[ "${ALSO_STOP_DAEMON}" -eq 1 ]]; then
    say "  also stopping: corpflowai-openhands-dockerd.service (systemd --user unit)"
  fi
}

main() {
  if ! command -v docker >/dev/null 2>&1; then
    say "no-op: docker not present — nothing to roll back"
    exit 0
  fi

  if [[ ! -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
    say "no-op: dedicated Docker socket not present at OPENHANDS_DOCKER_SOCK — nothing to roll back (daemon not running)"
    exit 0
  fi

  assert_dedicated_daemon_data_root

  if ! openhands_docker inspect "${OPENHANDS_PROJECT}-app" >/dev/null 2>&1; then
    say "no-op: container ${OPENHANDS_PROJECT}-app does not exist on the dedicated daemon — nothing to roll back"
    exit 0
  fi

  print_allowlisted_targets

  if ! confirm "About to stop/remove ONLY container '${OPENHANDS_PROJECT}-app' on the DEDICATED daemon (named volumes preserved). Continue?"; then
    die "confirmation declined — aborting"
  fi

  if [[ -f "${COMPOSE_FILE}" ]] && docker compose version >/dev/null 2>&1; then
    say "running: docker compose -p ${OPENHANDS_PROJECT} -f ${COMPOSE_FILE} down (against the dedicated daemon)"
    openhands_docker compose -p "${OPENHANDS_PROJECT}" -f "${COMPOSE_FILE}" down || {
      say "FAIL: docker compose down failed"
      exit 1
    }
  else
    warn "compose file or docker compose plugin unavailable — falling back to a direct, name-scoped docker stop/rm on the dedicated daemon"
    if ! is_allowed_resource_name "${OPENHANDS_PROJECT}-app"; then
      die "safety check failed: ${OPENHANDS_PROJECT}-app is not in the allowlist"
    fi
    openhands_docker stop "${OPENHANDS_PROJECT}-app" 2>/dev/null || true
    openhands_docker rm "${OPENHANDS_PROJECT}-app" 2>/dev/null || true
  fi

  if [[ "${ALSO_STOP_DAEMON}" -eq 1 ]]; then
    if command -v systemctl >/dev/null 2>&1; then
      say "stopping corpflowai-openhands-dockerd.service (systemd --user) per --also-stop-daemon"
      systemctl --user stop corpflowai-openhands-dockerd.service 2>&1 || warn "systemctl --user stop corpflowai-openhands-dockerd.service failed (may not be installed/enabled — this package never enables it itself)"
    else
      warn "systemctl unavailable — cannot stop the dedicated dockerd unit; skipping --also-stop-daemon step"
    fi
  fi

  say "ok: rollback complete — named volumes (corpflowai-openhands-state, corpflowai-openhands-workspace) were preserved"
}

main
