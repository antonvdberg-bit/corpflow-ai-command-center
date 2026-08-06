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
#   - say / warn / die                    — consistent, prefixed logging
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

# Base directory for everything OpenHands-related on the host: the dedicated
# daemon's socket, its data-root, and the task workspace bind-mount path (if
# one is ever used instead of the named corpflowai-openhands-workspace
# volume). Never the operator's real home directory root itself.
OPENHANDS_HOME="${OPENHANDS_HOME:-${HOME:-/tmp}/corpflowai-openhands}"
export OPENHANDS_HOME

# Host-side path to the DEDICATED daemon's Unix socket. NEVER
# /var/run/docker.sock — that is the forbidden primary socket (see
# OPENHANDS_PRIMARY_DOCKER_SOCK below).
OPENHANDS_DOCKER_SOCK="${OPENHANDS_DOCKER_SOCK:-${OPENHANDS_HOME}/docker/docker.sock}"
export OPENHANDS_DOCKER_SOCK

# The DOCKER_HOST value every script in this package must use for every
# `docker` / `docker compose` invocation against OpenHands' own resources.
# Derived from OPENHANDS_DOCKER_SOCK by default so the two never drift apart
# silently; an explicit OPENHANDS_DOCKER_HOST override is still honored (e.g.
# a future non-Unix-socket dedicated endpoint), but is still checked against
# the primary-socket forbidden pattern below either way.
OPENHANDS_DOCKER_HOST="${OPENHANDS_DOCKER_HOST:-unix://${OPENHANDS_DOCKER_SOCK}}"
export OPENHANDS_DOCKER_HOST

# Dedicated daemon's own --data-root. Never /var/lib/docker (the primary
# daemon's data-root) — this is what makes the two daemons' image/container/
# volume state physically non-overlapping, not just socket-separated.
OPENHANDS_DOCKER_DATA_ROOT="${OPENHANDS_DOCKER_DATA_ROOT:-${OPENHANDS_HOME}/docker-data}"
export OPENHANDS_DOCKER_DATA_ROOT

# Dedicated task workspace directory, used only if a bind mount is
# substituted for the named corpflowai-openhands-workspace volume at install
# time (see ops/openhands/compose.yaml SANDBOX_VOLUMES comment). Never the
# operator's home directory or an existing project checkout.
OPENHANDS_WORKSPACE_DIR="${OPENHANDS_WORKSPACE_DIR:-${OPENHANDS_HOME}/workspace}"
export OPENHANDS_WORKSPACE_DIR

# The forbidden primary host socket / data-root. Constants, not
# user-overridable — a script that could redefine "what counts as primary"
# via its own environment would defeat the entire point of this check.
readonly OPENHANDS_PRIMARY_DOCKER_SOCK="/var/run/docker.sock"
readonly OPENHANDS_PRIMARY_DOCKER_DATA_ROOT="/var/lib/docker"

# Named-resource allowlist. Every docker container / network / volume this
# package's scripts are permitted to stop, remove, or otherwise mutate MUST
# match one of these exact names or this prefix. This is the safety net that
# keeps rollback.sh / uninstall.sh from ever touching an unrelated resource
# (e.g. the Uptime Kuma container, or any client-tenant container). This
# allowlist is scoped to the DEDICATED daemon context — see
# openhands_assert_isolation_context() — so even a correctly-named resource
# is never mutated against the wrong daemon.
readonly OPENHANDS_ALLOWED_RESOURCE_PREFIX="corpflowai-openhands"
readonly OPENHANDS_ALLOWED_RESOURCES=(
  "corpflowai-openhands-app"
  "corpflowai-openhands-net"
  "corpflowai-openhands-state"
  "corpflowai-openhands-workspace"
  # Docker Engine always creates these three default networks on every daemon
  # (primary or dedicated). They are not CorpFlow foreign resources — treating
  # them as allowlist violations was a false-positive that blocked an otherwise
  # isolated dedicated-daemon verify (issue #743 install gate).
  "bridge"
  "host"
  "none"
)

# Cgroup placement (security follow-up — cgroup remediation after
# STOPPED — CGROUP VERIFICATION FAILED on corpflow-exec-01-u69678).
# Aggregate ancestor slice (dockerd Slice= + container parent nest under it).
readonly OPENHANDS_AGGREGATE_SLICE="${OPENHANDS_AGGREGATE_SLICE:-corpflowai-openhands.slice}"
# Daemon-level default cgroup-parent for every container (daemon.json).
readonly OPENHANDS_CGROUP_PARENT_SLICE="${OPENHANDS_CGROUP_PARENT_SLICE:-corpflowai-openhands-containers.slice}"
# Host-safe pilot MemoryMax ceiling (bytes). Must match
# scripts/ops/systemd/corpflowai-openhands.slice MemoryMax=4G. Fail closed if
# the live ancestor reports a higher Max (e.g. stale 8G unit still installed).
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

# Returns 0 if $1 is a Docker data-root path this package's scripts are
# allowed to treat as "the OpenHands dedicated daemon's data-root" — i.e. it
# is OPENHANDS_HOME itself or a path under it. Used by
# scripts/ops/openhands/verify-dedicated-daemon.sh and by rollback.sh /
# uninstall.sh's "refuse if docker info shows an unexpected data-root" check.
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

# Returns 0 (true) if $1 IS the forbidden primary host Docker socket path.
# Pure string comparison — does not resolve symlinks, because a script that
# needs symlink-resolution-level certainty should use
# openhands_assert_isolation_context, which does a live `docker info` check
# via verify-dedicated-daemon.sh instead of trusting a path string alone.
is_primary_docker_socket_path() {
  local path="$1"
  [[ "${path}" == "${OPENHANDS_PRIMARY_DOCKER_SOCK}" ]]
}

# Returns 0 (true) if $1 (a DOCKER_HOST-shaped value, e.g.
# "unix:///var/run/docker.sock") targets the forbidden primary socket, under
# any of its common spellings (unix:// prefix, bare path, or trailing
# slash-free form). Deliberately permissive in what it flags (fails closed)
# — a DOCKER_HOST value is short enough that a substring check on the
# well-known primary path is not going to false-positive on an unrelated,
# legitimately-named dedicated path (which is always under $OPENHANDS_HOME,
# never containing the literal string "/var/run/docker.sock").
docker_host_targets_primary_socket() {
  local host_value="$1"
  case "${host_value}" in
    *"${OPENHANDS_PRIMARY_DOCKER_SOCK}"*)
      return 0
      ;;
    ""|unix://)
      # Empty or malformed — treat as "not confirmed dedicated," which
      # openhands_assert_isolation_context() below separately fails on (a
      # missing/empty DOCKER_HOST is its own die(), not folded into this
      # boolean helper so callers can distinguish "empty" from "primary").
      return 1
      ;;
    *)
      return 1
      ;;
  esac
}

# Fails closed (die — exits the calling script) unless BOTH
# OPENHANDS_DOCKER_SOCK and OPENHANDS_DOCKER_HOST are set AND neither
# resolves, by path/string, to the forbidden primary host socket. This is a
# STATIC/string-level check, deliberately cheap (no `docker info` call) so it
# can run on every openhands_docker() invocation without added latency or
# noise — it is the fast-fail net, not the full live verification.
#
# For the full LIVE verification (actual `docker info` DockerRootDir /
# foreign-container check against a running dedicated daemon), see
# scripts/ops/openhands/verify-dedicated-daemon.sh — that script is the one
# that should be run at preflight/install time, not this function alone.
#
# Silent on success (no log line) — callers that want a visible PASS line
# should log it themselves after calling this, so repeated calls (e.g. from
# inside a loop in uninstall.sh) don't spam the log.
openhands_assert_isolation_context() {
  local sock="${OPENHANDS_DOCKER_SOCK:-}"
  local host="${OPENHANDS_DOCKER_HOST:-}"

  if [[ -z "${sock}" ]]; then
    die "OPENHANDS_DOCKER_SOCK is not set — refusing to guess a Docker socket path. This package never falls back to the primary daemon by omission."
  fi
  if is_primary_docker_socket_path "${sock}"; then
    die "OPENHANDS_DOCKER_SOCK resolves to the PRIMARY host socket (${OPENHANDS_PRIMARY_DOCKER_SOCK}) — FORBIDDEN. OpenHands must use its own dedicated rootless-daemon socket under \$OPENHANDS_HOME. See docs/operations/OPENHANDS_DOCKER_ISOLATION.md."
  fi

  if [[ -z "${host}" ]]; then
    die "OPENHANDS_DOCKER_HOST is not set — refusing to fall back to the ambient Docker context (docker context / DOCKER_HOST from the calling shell), which may be the primary daemon."
  fi
  if docker_host_targets_primary_socket "${host}"; then
    die "OPENHANDS_DOCKER_HOST ('${host}') targets the PRIMARY host Docker socket — FORBIDDEN for OpenHands. Set OPENHANDS_DOCKER_HOST=unix://\${OPENHANDS_HOME}/docker/docker.sock (or leave unset to use the default derived from OPENHANDS_DOCKER_SOCK)."
  fi

  return 0
}

# Wrapper that EVERY script in this package must use instead of calling
# `docker` (or `docker compose`) directly, so the dedicated-daemon context is
# enforced at the single point of invocation rather than trusted to have
# been set correctly upstream. Forces DOCKER_HOST for the duration of this
# one command only (does not mutate the caller's shell environment beyond
# the already-exported OPENHANDS_DOCKER_HOST).
#
# Usage:
#   openhands_docker ps -a --filter "name=${OPENHANDS_PROJECT}"
#   openhands_docker compose -p "${OPENHANDS_PROJECT}" -f "${COMPOSE_FILE}" up -d
#
# Does NOT wrap `docker compose` version/availability checks that don't need
# a live daemon connection (e.g. `docker compose version`) — those are safe
# to run directly since they never talk to any daemon, primary or dedicated.
openhands_docker() {
  openhands_assert_isolation_context
  DOCKER_HOST="${OPENHANDS_DOCKER_HOST}" docker "$@"
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
