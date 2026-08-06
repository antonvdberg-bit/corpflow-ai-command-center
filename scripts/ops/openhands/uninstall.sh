#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — uninstall (full named removal)
#
# STATUS: INACTIVE package (issue #743). Removes ONLY the named
# corpflowai-openhands* containers, network, and volumes — on the DEDICATED
# daemon only. Never touches any other resource on the host. Never runs
# `docker system prune`, `docker volume prune`, or any other wildcard/blanket
# cleanup command.
#
# Security follow-up for PR #747 (dedicated Docker isolation design — see
# docs/operations/OPENHANDS_DOCKER_ISOLATION.md):
#   - Every docker call in this script goes through openhands_docker()
#     (lib/common.sh), which fails closed if DOCKER_HOST would resolve to
#     the primary socket.
#   - Prints the exact allowlisted targets before destroying anything.
#   - Refuses to proceed if the dedicated daemon's `docker info` reports a
#     data-root NOT under $OPENHANDS_HOME.
#   - By default, does NOT stop the dedicated dockerd unit itself (removing
#     containers/volumes does not require stopping the daemon that manages
#     them). Pass --confirm-daemon to ALSO stop AND disable the dedicated
#     dockerd systemd --user unit as a separate, explicit opt-in step —
#     matching the "uninstall may go further than rollback" expectation.
#
# By default offers to run backup-state.sh first (evidence-preservation
# option); pass --skip-evidence-archive to skip it explicitly.
#
# Requires --confirm on the command line plus an interactive typed
# confirmation (lib/common.sh confirm()).
#
# Usage:
#   bash scripts/ops/openhands/uninstall.sh --confirm
#   bash scripts/ops/openhands/uninstall.sh --confirm --skip-evidence-archive
#   bash scripts/ops/openhands/uninstall.sh --confirm --confirm-daemon
#
# Exit codes:
#   0 — uninstall completed (or no-op — nothing installed)
#   1 — an uninstall step failed
#   2 — usage error / --confirm not supplied / interactive confirmation declined

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="$(openhands_repo_root)"
COMPOSE_FILE="${REPO_ROOT}/ops/openhands/compose.yaml"
CONFIRMED=0
SKIP_EVIDENCE_ARCHIVE=0
CONFIRM_DAEMON=0

# Exact, explicit allowlist of resources this script is permitted to remove.
# Deliberately not using the prefix-match fallback from lib/common.sh here —
# uninstall is destructive, so this list is intentionally exhaustive and
# reviewed, not open-ended.
readonly REMOVABLE_CONTAINERS=("corpflowai-openhands-app")
readonly REMOVABLE_NETWORKS=("corpflowai-openhands-net")
readonly REMOVABLE_VOLUMES=("corpflowai-openhands-state" "corpflowai-openhands-workspace")

usage() {
  cat <<'USAGE'
Usage: uninstall.sh --confirm [--skip-evidence-archive] [--confirm-daemon]

Removes ONLY named corpflowai-openhands-app container, corpflowai-openhands-net
network, and corpflowai-openhands-state / corpflowai-openhands-workspace
volumes — on the DEDICATED daemon only. Never touches any other Docker
resource. Never runs a prune command. Requires --confirm plus interactive
confirmation.

  --confirm-daemon   ALSO stop and disable the dedicated rootless dockerd
                       systemd --user unit (corpflowai-openhands-dockerd.service).
                       Separate, explicit opt-in — the daemon is otherwise
                       left running after a resource-level uninstall.
USAGE
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --confirm)
      CONFIRMED=1
      shift
      ;;
    --skip-evidence-archive)
      SKIP_EVIDENCE_ARCHIVE=1
      shift
      ;;
    --confirm-daemon)
      CONFIRM_DAEMON=1
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

# Same data-root guard as rollback.sh — see that script's comment for the
# rationale. Duplicated rather than shared as a one-liner so each script's
# failure message stays specific to its own operation.
assert_dedicated_daemon_data_root() {
  if [[ ! -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
    return 0
  fi

  # Explicit, UNREDIRECTED call first — see rollback.sh's identical comment
  # for the rationale (die() inside a redirected command substitution would
  # otherwise be silently swallowed instead of aborting loudly).
  openhands_assert_isolation_context

  local data_root
  data_root="$(DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker info -f '{{.DockerRootDir}}' 2>/dev/null || echo "")"
  if [[ -z "${data_root}" ]]; then
    warn "could not read DockerRootDir from the dedicated daemon — proceeding with named-resource operations only"
    return 0
  fi
  if ! is_allowed_data_root_path "${data_root}"; then
    die "refusing to proceed: dedicated daemon reports data-root '${data_root}', which is NOT under OPENHANDS_HOME ('${OPENHANDS_HOME}'). DOCKER_HOST may be pointed at an unexpected daemon. Investigate before retrying."
  fi
}

print_allowlisted_targets() {
  say "allowlisted target(s) for this uninstall (PERMANENT removal):"
  local n
  for n in "${REMOVABLE_CONTAINERS[@]}"; do say "  container: ${n}"; done
  for n in "${REMOVABLE_NETWORKS[@]}"; do say "  network:   ${n}"; done
  for n in "${REMOVABLE_VOLUMES[@]}"; do say "  volume:    ${n}"; done
  if [[ "${CONFIRM_DAEMON}" -eq 1 ]]; then
    say "  also stopping+disabling: corpflowai-openhands-dockerd.service (systemd --user unit)"
  fi
}

main() {
  if ! command -v docker >/dev/null 2>&1; then
    say "no-op: docker not present — nothing to uninstall"
    exit 0
  fi

  if [[ ! -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
    say "no-op: dedicated Docker socket not present at OPENHANDS_DOCKER_SOCK — nothing to uninstall (daemon not running)"
    exit 0
  fi

  assert_dedicated_daemon_data_root

  local anything_exists=0
  local name
  for name in "${REMOVABLE_CONTAINERS[@]}"; do
    openhands_docker inspect "${name}" >/dev/null 2>&1 && anything_exists=1
  done
  for name in "${REMOVABLE_NETWORKS[@]}"; do
    openhands_docker network inspect "${name}" >/dev/null 2>&1 && anything_exists=1
  done
  for name in "${REMOVABLE_VOLUMES[@]}"; do
    openhands_docker volume inspect "${name}" >/dev/null 2>&1 && anything_exists=1
  done

  if [[ "${anything_exists}" -eq 0 ]]; then
    say "no-op: no corpflowai-openhands resources found on the dedicated daemon — nothing to uninstall"
    exit 0
  fi

  print_allowlisted_targets

  if ! confirm "About to PERMANENTLY remove ONLY the named corpflowai-openhands container/network/volumes above, on the DEDICATED daemon. Continue?"; then
    die "confirmation declined — aborting"
  fi

  if [[ "${SKIP_EVIDENCE_ARCHIVE}" -eq 0 ]]; then
    say "creating a sanitised state archive before removal (skip with --skip-evidence-archive)"
    bash "${SCRIPT_DIR}/backup-state.sh" || warn "backup-state.sh failed — continuing uninstall anyway (explicit --confirm was given)"
  else
    say "skipping evidence archive (--skip-evidence-archive)"
  fi

  if [[ -f "${COMPOSE_FILE}" ]] && docker compose version >/dev/null 2>&1; then
    say "running: docker compose -p ${OPENHANDS_PROJECT} -f ${COMPOSE_FILE} down -v (against the dedicated daemon)"
    openhands_docker compose -p "${OPENHANDS_PROJECT}" -f "${COMPOSE_FILE}" down -v || {
      say "compose down -v failed — falling back to explicit named removal"
    }
  fi

  for name in "${REMOVABLE_CONTAINERS[@]}"; do
    if ! is_allowed_resource_name "${name}"; then
      die "safety check failed: ${name} is not in the resource allowlist"
    fi
    if openhands_docker inspect "${name}" >/dev/null 2>&1; then
      openhands_docker rm -f "${name}" 2>/dev/null || true
      say "removed container: ${name}"
    fi
  done

  for name in "${REMOVABLE_NETWORKS[@]}"; do
    if ! is_allowed_resource_name "${name}"; then
      die "safety check failed: ${name} is not in the resource allowlist"
    fi
    if openhands_docker network inspect "${name}" >/dev/null 2>&1; then
      openhands_docker network rm "${name}" 2>/dev/null || true
      say "removed network: ${name}"
    fi
  done

  for name in "${REMOVABLE_VOLUMES[@]}"; do
    if ! is_allowed_resource_name "${name}"; then
      die "safety check failed: ${name} is not in the resource allowlist"
    fi
    if openhands_docker volume inspect "${name}" >/dev/null 2>&1; then
      openhands_docker volume rm "${name}" 2>/dev/null || true
      say "removed volume: ${name}"
    fi
  done

  if [[ "${CONFIRM_DAEMON}" -eq 1 ]]; then
    if command -v systemctl >/dev/null 2>&1; then
      say "stopping + disabling corpflowai-openhands-dockerd.service (systemd --user) per --confirm-daemon"
      systemctl --user stop corpflowai-openhands-dockerd.service 2>&1 || warn "systemctl --user stop corpflowai-openhands-dockerd.service failed (may not be installed/enabled)"
      systemctl --user disable corpflowai-openhands-dockerd.service 2>&1 || warn "systemctl --user disable corpflowai-openhands-dockerd.service failed (may not be installed/enabled)"
    else
      warn "systemctl unavailable — cannot stop/disable the dedicated dockerd unit; skipping --confirm-daemon step"
    fi
  else
    say "note: the dedicated rootless dockerd unit itself was left running (pass --confirm-daemon to also stop+disable it)"
  fi

  say "ok: uninstall complete — only named corpflowai-openhands* resources on the dedicated daemon were touched"
}

main
