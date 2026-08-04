#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — rollback (stop/disable only)
#
# STATUS: INACTIVE package (issue #743). This script STOPS and DISABLES
# (removes container, keeps volumes) only the named corpflowai-openhands*
# resources. It never touches any other container, network, or volume on the
# host, and never runs `docker system prune` or any wildcard operation.
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

usage() {
  cat <<'USAGE'
Usage: rollback.sh --confirm

Stops and removes ONLY the named corpflowai-openhands-app container (via
`docker compose down`, no -v, so named volumes are preserved). Never touches
any other container. Never runs docker system prune. Requires --confirm plus
an interactive typed confirmation.
USAGE
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --confirm)
      CONFIRMED=1
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

main() {
  if ! command -v docker >/dev/null 2>&1; then
    say "no-op: docker not present — nothing to roll back"
    exit 0
  fi

  if ! docker inspect "${OPENHANDS_PROJECT}-app" >/dev/null 2>&1; then
    say "no-op: container ${OPENHANDS_PROJECT}-app does not exist — nothing to roll back"
    exit 0
  fi

  if ! confirm "About to stop/remove ONLY container '${OPENHANDS_PROJECT}-app' (named volumes preserved). Continue?"; then
    die "confirmation declined — aborting"
  fi

  if [[ -f "${COMPOSE_FILE}" ]] && docker compose version >/dev/null 2>&1; then
    say "running: docker compose -p ${OPENHANDS_PROJECT} -f ${COMPOSE_FILE} down"
    docker compose -p "${OPENHANDS_PROJECT}" -f "${COMPOSE_FILE}" down || {
      say "FAIL: docker compose down failed"
      exit 1
    }
  else
    warn "compose file or docker compose plugin unavailable — falling back to a direct, name-scoped docker stop/rm"
    if ! is_allowed_resource_name "${OPENHANDS_PROJECT}-app"; then
      die "safety check failed: ${OPENHANDS_PROJECT}-app is not in the allowlist"
    fi
    docker stop "${OPENHANDS_PROJECT}-app" 2>/dev/null || true
    docker rm "${OPENHANDS_PROJECT}-app" 2>/dev/null || true
  fi

  say "ok: rollback complete — named volumes (corpflowai-openhands-state, corpflowai-openhands-workspace) were preserved"
}

main
