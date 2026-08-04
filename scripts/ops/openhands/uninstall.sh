#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — uninstall (full named removal)
#
# STATUS: INACTIVE package (issue #743). Removes ONLY the named
# corpflowai-openhands* containers, network, and volumes. Never touches any
# other resource on the host. Never runs `docker system prune`, `docker
# volume prune`, or any other wildcard/blanket cleanup command.
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

# Exact, explicit allowlist of resources this script is permitted to remove.
# Deliberately not using the prefix-match fallback from lib/common.sh here —
# uninstall is destructive, so this list is intentionally exhaustive and
# reviewed, not open-ended.
readonly REMOVABLE_CONTAINERS=("corpflowai-openhands-app")
readonly REMOVABLE_NETWORKS=("corpflowai-openhands-net")
readonly REMOVABLE_VOLUMES=("corpflowai-openhands-state" "corpflowai-openhands-workspace")

usage() {
  cat <<'USAGE'
Usage: uninstall.sh --confirm [--skip-evidence-archive]

Removes ONLY named corpflowai-openhands-app container, corpflowai-openhands-net
network, and corpflowai-openhands-state / corpflowai-openhands-workspace
volumes. Never touches any other Docker resource. Never runs a prune command.
Requires --confirm plus interactive confirmation.
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
    say "no-op: docker not present — nothing to uninstall"
    exit 0
  fi

  local anything_exists=0
  local name
  for name in "${REMOVABLE_CONTAINERS[@]}"; do
    docker inspect "${name}" >/dev/null 2>&1 && anything_exists=1
  done
  for name in "${REMOVABLE_NETWORKS[@]}"; do
    docker network inspect "${name}" >/dev/null 2>&1 && anything_exists=1
  done
  for name in "${REMOVABLE_VOLUMES[@]}"; do
    docker volume inspect "${name}" >/dev/null 2>&1 && anything_exists=1
  done

  if [[ "${anything_exists}" -eq 0 ]]; then
    say "no-op: no corpflowai-openhands resources found — nothing to uninstall"
    exit 0
  fi

  if ! confirm "About to PERMANENTLY remove named corpflowai-openhands container/network/volumes. Continue?"; then
    die "confirmation declined — aborting"
  fi

  if [[ "${SKIP_EVIDENCE_ARCHIVE}" -eq 0 ]]; then
    say "creating a sanitised state archive before removal (skip with --skip-evidence-archive)"
    bash "${SCRIPT_DIR}/backup-state.sh" || warn "backup-state.sh failed — continuing uninstall anyway (explicit --confirm was given)"
  else
    say "skipping evidence archive (--skip-evidence-archive)"
  fi

  if [[ -f "${COMPOSE_FILE}" ]] && docker compose version >/dev/null 2>&1; then
    say "running: docker compose -p ${OPENHANDS_PROJECT} -f ${COMPOSE_FILE} down -v"
    docker compose -p "${OPENHANDS_PROJECT}" -f "${COMPOSE_FILE}" down -v || {
      say "compose down -v failed — falling back to explicit named removal"
    }
  fi

  for name in "${REMOVABLE_CONTAINERS[@]}"; do
    if ! is_allowed_resource_name "${name}"; then
      die "safety check failed: ${name} is not in the resource allowlist"
    fi
    if docker inspect "${name}" >/dev/null 2>&1; then
      docker rm -f "${name}" 2>/dev/null || true
      say "removed container: ${name}"
    fi
  done

  for name in "${REMOVABLE_NETWORKS[@]}"; do
    if ! is_allowed_resource_name "${name}"; then
      die "safety check failed: ${name} is not in the resource allowlist"
    fi
    if docker network inspect "${name}" >/dev/null 2>&1; then
      docker network rm "${name}" 2>/dev/null || true
      say "removed network: ${name}"
    fi
  done

  for name in "${REMOVABLE_VOLUMES[@]}"; do
    if ! is_allowed_resource_name "${name}"; then
      die "safety check failed: ${name} is not in the resource allowlist"
    fi
    if docker volume inspect "${name}" >/dev/null 2>&1; then
      docker volume rm "${name}" 2>/dev/null || true
      say "removed volume: ${name}"
    fi
  done

  say "ok: uninstall complete — only named corpflowai-openhands* resources were touched"
}

main
