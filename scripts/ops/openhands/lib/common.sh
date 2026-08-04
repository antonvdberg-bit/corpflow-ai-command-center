#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — shared shell helpers
#
# STATUS: INACTIVE package (issue #743). This file is a library — it is
# meant to be `source`d by other scripts under scripts/ops/openhands/, not
# executed directly.
#
# Provides:
#   - say / warn / die           — consistent, prefixed logging
#   - confirm                    — interactive confirmation gate
#   - require_root_or_user       — fails if running as an unexpected user
#   - require_cmd                — fails if a required binary is missing
#   - is_allowed_resource_name   — allowlist check for any docker resource
#                                  name a script is about to touch (rollback /
#                                  uninstall safety net)
#
# Never print environment variable VALUES from this library or its callers.
# Presence-only logging (configured/MISSING) is fine; values are not.
#
# Usage (from another script in this package):
#   # shellcheck source=scripts/ops/openhands/lib/common.sh
#   source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

set -euo pipefail

readonly OPENHANDS_PROJECT="corpflowai-openhands"
readonly OPENHANDS_LOG_PREFIX="[corpflowai-openhands]"

# Named-resource allowlist. Every docker container / network / volume this
# package's scripts are permitted to stop, remove, or otherwise mutate MUST
# match one of these exact names or this prefix. This is the safety net that
# keeps rollback.sh / uninstall.sh from ever touching an unrelated resource
# (e.g. the Uptime Kuma container, or any client-tenant container).
readonly OPENHANDS_ALLOWED_RESOURCE_PREFIX="corpflowai-openhands"
readonly OPENHANDS_ALLOWED_RESOURCES=(
  "corpflowai-openhands-app"
  "corpflowai-openhands-net"
  "corpflowai-openhands-state"
  "corpflowai-openhands-workspace"
)

say() {
  printf '%s %s\n' "${OPENHANDS_LOG_PREFIX}" "$*"
}

warn() {
  printf '%s WARN: %s\n' "${OPENHANDS_LOG_PREFIX}" "$*" >&2
}

die() {
  printf '%s ERROR: %s\n' "${OPENHANDS_LOG_PREFIX}" "$*" >&2
  exit 1
}

# Interactive confirmation gate. Returns 0 (proceed) only if the user types
# the expected phrase exactly. Scripts that call this must still separately
# enforce any --confirm / approval-env-var gate; this is a human-facing double
# check, not the primary authorization mechanism.
#
# Usage: confirm "Really remove corpflowai-openhands resources?"
confirm() {
  local prompt="$1"
  local reply=""
  printf '%s %s [type YES to continue]: ' "${OPENHANDS_LOG_PREFIX}" "${prompt}"
  read -r reply || true
  if [[ "${reply}" != "YES" ]]; then
    say "confirmation not received — aborting"
    return 1
  fi
  return 0
}

# Fails if the effective user is not one of the expected identities. Pass the
# allowed user name(s) as arguments (e.g. require_root_or_user "anton" "root").
# With no arguments, only checks that a non-empty user is resolvable.
require_root_or_user() {
  local current
  current="$(id -un 2>/dev/null || echo "")"
  if [[ -z "${current}" ]]; then
    die "could not resolve current user"
  fi
  if [[ "$#" -eq 0 ]]; then
    return 0
  fi
  local allowed
  for allowed in "$@"; do
    if [[ "${current}" == "${allowed}" ]]; then
      return 0
    fi
  done
  die "unexpected user '${current}' — expected one of: $*"
}

require_cmd() {
  local c="$1"
  if ! command -v "${c}" >/dev/null 2>&1; then
    die "required command not found: ${c}"
  fi
}

# Returns 0 if $1 is a name this package's scripts are allowed to mutate.
# Accepts either an exact match against OPENHANDS_ALLOWED_RESOURCES, or a name
# that starts with OPENHANDS_ALLOWED_RESOURCE_PREFIX (covers future named
# volumes/containers added to compose.yaml without needing this file edited
# for every minor addition — the prefix itself is still narrow and unique to
# this package).
is_allowed_resource_name() {
  local name="$1"
  local allowed
  for allowed in "${OPENHANDS_ALLOWED_RESOURCES[@]}"; do
    if [[ "${name}" == "${allowed}" ]]; then
      return 0
    fi
  done
  case "${name}" in
    "${OPENHANDS_ALLOWED_RESOURCE_PREFIX}"*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Presence-only helper for logging whether an env var is set, WITHOUT ever
# printing its value.
presence() {
  local name="$1"
  if [[ -n "${!name:-}" ]]; then
    printf 'configured'
  else
    printf 'MISSING'
  fi
}

# Resolves the repo root relative to this file, for scripts that need to
# reference ops/openhands/compose.yaml by absolute path regardless of caller cwd.
openhands_repo_root() {
  local here
  here="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
  printf '%s' "${here}"
}
