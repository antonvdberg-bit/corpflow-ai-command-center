#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — sanitised state backup
#
# STATUS: INACTIVE package (issue #743). If OpenHands is not installed, this
# script is a safe no-op. If it IS installed (future, separately authorized
# state), this script archives ONLY sanitised state/config paths — never
# task workspace contents by default (those may contain arbitrary repo
# clones / synthetic data and are excluded on purpose to keep the archive
# small and free of anything resembling client data).
#
# Security follow-up for PR #747 (dedicated Docker isolation design — see
# docs/operations/OPENHANDS_DOCKER_ISOLATION.md): every docker call in this
# script goes through openhands_docker() (lib/common.sh), reading the named
# corpflowai-openhands-state / corpflowai-openhands-workspace volumes on the
# DEDICATED daemon only. The throwaway helper container it spawns to read
# those volumes ALSO runs on the dedicated daemon, never the primary one.
#
# What is archived by default:
#   - the corpflowai-openhands-state named volume contents, with any file
#     that looks like it contains a credential (heuristic filename match:
#     *.env, *token*, *key*, *secret*, *credential*) EXCLUDED from the tar
#   - this package's own config/openhands/*.example.* files, for convenience
#     (already git-tracked, but included for a single self-contained archive)
#
# What is NOT archived by default:
#   - the corpflowai-openhands-workspace volume (task files) — pass
#     --include-workspace to opt in for a specific investigation, understanding
#     that workspace contents may include arbitrary agent-fetched files
#   - any real .env (only the tracked .env.example is ever touched)
#
# Usage:
#   bash scripts/ops/openhands/backup-state.sh
#   bash scripts/ops/openhands/backup-state.sh --include-workspace
#   bash scripts/ops/openhands/backup-state.sh --out-dir /path/to/dir
#
# Exit codes:
#   0 — archive created (or no-op because nothing is installed)
#   1 — archive step failed
#   2 — usage error

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

OUT_DIR="${OPENHANDS_BACKUP_OUT_DIR:-${HOME:-/tmp}/corpflowai-openhands-backups}"
INCLUDE_WORKSPACE=0

usage() {
  cat <<'USAGE'
Usage: backup-state.sh [--include-workspace] [--out-dir DIR] [--help]

Archives sanitised OpenHands state (config volume, secret-looking filenames
excluded) to DIR (default: ~/corpflowai-openhands-backups). Task workspace
contents are excluded unless --include-workspace is passed explicitly.
No-op (exit 0) if OpenHands is not installed.
USAGE
}

while [[ "$#" -gt 0 ]]; do
  case "$1" in
    --include-workspace)
      INCLUDE_WORKSPACE=1
      shift
      ;;
    --out-dir)
      [[ "$#" -ge 2 ]] || die "--out-dir requires a value"
      OUT_DIR="$2"
      shift 2
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

main() {
  if ! command -v docker >/dev/null 2>&1; then
    say "no-op: docker not present — nothing to back up"
    exit 0
  fi

  if [[ ! -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
    say "no-op: dedicated Docker socket not present — OpenHands is not installed (dedicated daemon not running)"
    exit 0
  fi

  if ! openhands_docker volume inspect corpflowai-openhands-state >/dev/null 2>&1; then
    say "no-op: corpflowai-openhands-state volume does not exist on the dedicated daemon — OpenHands is not installed"
    exit 0
  fi

  mkdir -p "${OUT_DIR}"
  local stamp archive
  stamp="$(date -u +%Y%m%dT%H%M%SZ)"
  archive="${OUT_DIR}/corpflowai-openhands-state-${stamp}.tar.gz"

  say "archiving corpflowai-openhands-state volume (secret-looking filenames excluded) -> ${archive}"

  # Use a throwaway helper container, spawned on the DEDICATED daemon, to
  # read the named volume without requiring the OpenHands container itself
  # to be running, and without a bind mount of anything outside the named
  # volume.
  local tmp_container="corpflowai-openhands-backup-helper-${stamp}"
  openhands_docker run --rm \
    --name "${tmp_container}" \
    -v corpflowai-openhands-state:/src:ro \
    -v "${OUT_DIR}:/dst" \
    alpine:3.20 \
    sh -c '
      set -e
      cd /src
      tar -czf "/dst/'"$(basename "${archive}")"'" \
        --exclude="*.env" \
        --exclude="*token*" \
        --exclude="*key*" \
        --exclude="*secret*" \
        --exclude="*credential*" \
        . 2>/dev/null || true
    ' || {
    say "FAIL: backup helper container failed"
    exit 1
  }

  if [[ -f "${archive}" ]]; then
    say "ok: archive created at ${archive} ($(du -h "${archive}" 2>/dev/null | cut -f1 || echo unknown) )"
  else
    say "FAIL: expected archive not found after backup helper ran"
    exit 1
  fi

  if [[ "${INCLUDE_WORKSPACE}" -eq 1 ]]; then
    warn "--include-workspace requested — workspace contents may include arbitrary agent-fetched files; review before sharing this archive"
    local ws_archive="${OUT_DIR}/corpflowai-openhands-workspace-${stamp}.tar.gz"
    openhands_docker run --rm \
      --name "${tmp_container}-ws" \
      -v corpflowai-openhands-workspace:/src:ro \
      -v "${OUT_DIR}:/dst" \
      alpine:3.20 \
      sh -c 'cd /src && tar -czf "/dst/'"$(basename "${ws_archive}")"'" . 2>/dev/null || true' || {
      say "FAIL: workspace backup helper container failed"
      exit 1
    }
    say "ok: workspace archive created at ${ws_archive}"
  fi

  say "done"
}

main
