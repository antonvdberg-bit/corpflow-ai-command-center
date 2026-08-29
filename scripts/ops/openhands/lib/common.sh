#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — shared shell helpers
#
# STATUS: INACTIVE package (issue #743). This file is a library — it is
# meant to be `source`d by other scripts under scripts/ops/openhands/, not
# executed directly.
#
# Security follow-up for PR #747 (dedicated Docker isolation design — see
# docs/operations/OPENHANDS_DOCKER_ISOLATION.md and
# ops/openhands/compose.yaml "DOCKER ISOLATION DESIGN" header): this file is
# now also the single place that defines and enforces "OpenHands only ever
# talks to its own DEDICATED rootless Docker daemon, never the primary host
# daemon." Every script in this package that calls `docker` MUST go through
# openhands_docker() (or explicitly call openhands_assert_isolation_context()
# first) rather than invoking `docker` directly — see that function's doc
# comment below.
#
# Provides:
#   - say / warn / die                    — consistent prefixed logging
#   - confirm                             — interactive confirmation gate
#   - require_root_or_user                — fails if running as an unexpected user
#   - require_cmd                         — fails if a required binary is missing
#   - is_allowed_resource_name            — allowlist check for any docker resource
#                                            name a script is about to touch (rollback /
#                                            uninstall safety net)
#   - is_allowed_data_root_path           — allowlist check for a Docker data-root path
#   - is_primary_docker_socket_path       — true if a path IS the forbidden primary socket
#   - docker_host_targets_primary_socket  — true if a DOCKER_HOST value targets the primary socket
#   - openhands_assert_isolation_context  — fails closed (die) if the dedicated-daemon
#                                            context is misconfigured or points at primary
#   - openhands_docker                    — wrapper that forces DOCKER_HOST to the
#                                            dedicated socket before invoking `docker`
#
# Never print environment variable VALUES from this library or its callers.
# Presence-only logging (configured/MISSING) is fine; values are not.
#
# Usage (from another script in this package):
#   # shellcheck source=scripts/ops/openhands/lib/common.sh
#   source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"
#
# Usage (dedicated-daemon Docker calls — REQUIRED pattern):
#   openhands_docker ps --filter "name=${OPENHANDS_PROJECT}"
#   # NEVER: docker ps ...   (bypasses the dedicated-daemon enforcement)

set -euo pipefail

readonly OPENHANDS_PROJECT="corpflowai-openhands"
readonly OPENHANDS_LOG_PREFIX="[corpflowai-openhands]"

# ----------------------------------------------------------------------------
# Dedicated Docker daemon paths (security follow-up for PR #747 — see
# docs/operations/OPENHANDS_DOCKER_ISOLATION.md). ALL of these are
# overridable via environment for testing/CI, but the DEFAULT values below
# are what an actual install must use. None of these may ever resolve to the
# primary host socket — enforced by openhands_assert_isolation_context()
# below, not just by these defaults being "correct by convention."
# ----------------------------------------------------------------------------

OPENHANDS_HOME="${OPENHANDS_HOME:-${HOME:-/tmp}/corpflowai-openhands}"
export OPENHANDS_HOME
OPENHANDS_DOCKER_SOCK="${OPENHANDS_DOCKER_SOCK:-${OPENHANDS_HOME}/docker/docker.sock}"
export OPENHANDS_DOCKER_SOCK
OPENHANDS_DOCKER_HOST="${OPENHANDS_DOCKER_HOST:-unix://${OPENHANDS_DOCKER_SOCK}}"
export OPENHANDS_DOCKER_HOST
OPENHANDS_DOCKER_DATA_ROOT="${OPENHANDS_DOCKER_DATA_ROOT:-${OPENHANDS_HOME}/docker-data}"
export OPENHANDS_DOCKER_DATA_ROOT
OPENHANDS_WORKSPACE_DIR="${OPENHANDS_WORKSPACE_DIR:-${OPENHANDS_HOME}/workspace}"
export OPENHANDS_WORKSPACE_DIR

readonly OPENHANDS_PRIMARY_DOCKER_SOCK="/var/run/docker.sock"
readonly OPENHANDS_PRIMARY_DOCKER_DATA_ROOT="/var/lib/docker"

# Named-resource allowlist. Every visible resource on the dedicated daemon must
# be either a CorpFlowAI OpenHands control-plane resource, a dynamically-created
# OpenHands agent-server sandbox, or one of Docker's default networks. Dynamic
# agent-server containers are expected runtime children created by OpenHands and
# are therefore part of this package's isolated resource set.
readonly OPENHANDS_ALLOWED_RESOURCE_PREFIX="corpflowai-openhands"
readonly OPENHANDS_AGENT_SERVER_RESOURCE_PREFIX="oh-agent-server-"
readonly OPENHANDS_ALLOWED_RESOURCES=(
  "corpflowai-openhands-app"
  "corpflowai-openhands-net"
  "corpflowai-openhands-state"
  "corpflowai-openhands-workspace"
  "bridge"
  "host"
  "none"
)

readonly OPENHANDS_AGGREGATE_SLICE="${OPENHANDS_AGGREGATE_SLICE:-corpflowai-openhands.slice}"
readonly OPENHANDS_CGROUP_PARENT_SLICE="${OPENHANDS_CGROUP_PARENT_SLICE:-corpflowai-openhands-containers.slice}"
readonly OPENHANDS_MEMORY_MAX_BYTES_CEILING="${OPENHANDS_MEMORY_MAX_BYTES_CEILING:-4294967296}"
readonly OPENHANDS_CGROUP_PROBE_NAME="${OPENHANDS_CGROUP_PROBE_NAME:-corpflowai-openhands-cgroup-probe}"

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

is_allowed_resource_name() {
  local name="$1"
  local allowed
  for allowed in "${OPENHANDS_ALLOWED_RESOURCES[@]}"; do
    if [[ "${name}" == "${allowed}" ]]; then
      return 0
    fi
  done
  case "${name}" in
    "${OPENHANDS_ALLOWED_RESOURCE_PREFIX}"*|"${OPENHANDS_AGENT_SERVER_RESOURCE_PREFIX}"*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_allowed_data_root_path() {
  local path="$1"
  case "${path}" in
    "${OPENHANDS_HOME}"|"${OPENHANDS_HOME}"/*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

is_primary_docker_socket_path() {
  local path="$1"
  [[ "${path}" == "${OPENHANDS_PRIMARY_DOCKER_SOCK}" ]]
}

docker_host_targets_primary_socket() {
  local host_value="$1"
  case "${host_value}" in
    *"${OPENHANDS_PRIMARY_DOCKER_SOCK}"*)
      return 0
      ;;
    ""|unix://)
      return 1
      ;;
    *)
      return 1
      ;;
  esac
}

openhands_assert_isolation_context() {
  if is_primary_docker_socket_path "${OPENHANDS_DOCKER_SOCK}"; then
    die "refusing Docker operation: OPENHANDS_DOCKER_SOCK points at forbidden primary socket"
  fi
  if docker_host_targets_primary_socket "${OPENHANDS_DOCKER_HOST}"; then
    die "refusing Docker operation: OPENHANDS_DOCKER_HOST points at forbidden primary socket"
  fi
  if [[ ! -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
    die "refusing Docker operation: dedicated OpenHands Docker socket is missing"
  fi
}

openhands_docker() {
  openhands_assert_isolation_context
  DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker "$@"
}

openhands_repo_root() {
  git -C "$(cd "${SCRIPT_DIR:-$(dirname "${BASH_SOURCE[0]}")}" && pwd)" rev-parse --show-toplevel
}
