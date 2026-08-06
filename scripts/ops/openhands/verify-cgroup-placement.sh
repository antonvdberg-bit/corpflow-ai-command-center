#!/usr/bin/env bash
# CorpFlowAI — OpenHands private worker — verify container cgroup placement
#
# STATUS: INACTIVE package (issue #743). Security remediation for
# STOPPED — CGROUP VERIFICATION FAILED: rootless containers previously landed
# under unrestricted user.slice/.../docker-<id>.scope instead of the OpenHands
# aggregate slice. This script fails closed unless a disposable probe's PID
# cgroup is beneath OPENHANDS_CGROUP_PARENT_SLICE (nested under
# OPENHANDS_AGGREGATE_SLICE) and the ancestor MemoryMax is within the
# host-safe ceiling (OPENHANDS_MEMORY_MAX_BYTES_CEILING / 4G).
#
# Usage:
#   bash scripts/ops/openhands/verify-cgroup-placement.sh
#   bash scripts/ops/openhands/verify-cgroup-placement.sh --help
#
# Exit codes:
#   0 — placement + ancestor limits verified
#   1 — placement outside approved boundary, limits missing/over-ceiling, or ambiguous
#   2 — usage / tooling error / dedicated daemon not reachable

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="$(openhands_repo_root)"
DAEMON_JSON="${OPENHANDS_HOME}/docker/daemon.json"
PROBE_IMAGE="${OPENHANDS_CGROUP_PROBE_IMAGE:-busybox:1.36}"

usage() {
  cat <<'USAGE'
Usage: verify-cgroup-placement.sh [--help]

Starts a disposable lightweight container on the DEDICATED OpenHands daemon,
inspects the container PID cgroup (not only the dockerd process), verifies it
is beneath the reviewed OpenHands container slice, verifies ancestor MemoryMax
is present and <= the host-safe ceiling, then removes the probe.

Fails closed on ambiguous or unrestricted placement. Never touches the primary
Docker daemon.
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

cleanup_probe() {
  openhands_docker rm -f "${OPENHANDS_CGROUP_PROBE_NAME}" >/dev/null 2>&1 || true
}

require_cmd docker
openhands_assert_isolation_context

if [[ ! -S "${OPENHANDS_DOCKER_SOCK}" ]]; then
  die "dedicated Docker socket missing — start corpflowai-openhands-dockerd.service before this verify"
fi

# Expected parent must match installed unit name + live/daemon.json config.
EXPECTED_PARENT="${OPENHANDS_CGROUP_PARENT_SLICE}"
EXPECTED_AGGREGATE="${OPENHANDS_AGGREGATE_SLICE}"

unit_parent="${REPO_ROOT}/scripts/ops/systemd/${EXPECTED_PARENT}"
unit_agg="${REPO_ROOT}/scripts/ops/systemd/${EXPECTED_AGGREGATE}"
if [[ ! -f "${unit_parent}" ]]; then
  die "expected container-slice unit missing in package: scripts/ops/systemd/${EXPECTED_PARENT}"
fi
if [[ ! -f "${unit_agg}" ]]; then
  die "expected aggregate-slice unit missing in package: scripts/ops/systemd/${EXPECTED_AGGREGATE}"
fi

if [[ -f "${DAEMON_JSON}" ]]; then
  if ! grep -Fq "native.cgroupdriver=systemd" "${DAEMON_JSON}"; then
    fail "live daemon.json missing native.cgroupdriver=systemd"
  else
    pass "live daemon.json sets native.cgroupdriver=systemd"
  fi
  if ! grep -Fq "\"cgroup-parent\": \"${EXPECTED_PARENT}\"" "${DAEMON_JSON}" \
    && ! grep -Fq "\"cgroup-parent\":\"${EXPECTED_PARENT}\"" "${DAEMON_JSON}"; then
    fail "live daemon.json cgroup-parent is not ${EXPECTED_PARENT}"
  else
    pass "live daemon.json cgroup-parent is ${EXPECTED_PARENT}"
  fi
  if grep -Eq '"data-root"|"hosts"' "${DAEMON_JSON}"; then
    fail "live daemon.json must not set data-root/hosts when the systemd unit already passes --data-root/--host (Docker rejects duplicates)"
  else
    pass "live daemon.json does not duplicate data-root/hosts CLI flags"
  fi
else
  fail "live daemon.json missing at ${DAEMON_JSON}"
fi

# Example file in package must document the same required keys (static gate).
example_json="${REPO_ROOT}/ops/openhands/daemon/daemon.json.example"
if ! grep -Fq "native.cgroupdriver=systemd" "${example_json}"; then
  fail "daemon.json.example missing native.cgroupdriver=systemd"
fi
if ! grep -Fq "\"cgroup-parent\": \"${EXPECTED_PARENT}\"" "${example_json}"; then
  fail "daemon.json.example missing cgroup-parent ${EXPECTED_PARENT}"
fi

driver="$(openhands_docker info -f '{{.CgroupDriver}}' 2>/dev/null || true)"
if [[ "${driver}" != "systemd" ]]; then
  fail "dedicated daemon CgroupDriver is '${driver:-empty}', expected systemd"
else
  pass "dedicated daemon CgroupDriver=systemd"
fi

root_dir="$(openhands_docker info -f '{{.DockerRootDir}}' 2>/dev/null || true)"
if ! is_allowed_data_root_path "${root_dir}"; then
  fail "dedicated daemon DockerRootDir '${root_dir}' is not under OPENHANDS_HOME"
else
  pass "dedicated daemon DockerRootDir under OPENHANDS_HOME"
fi

# Disposable probe — ALWAYS remove, even on failure.
trap cleanup_probe EXIT
cleanup_probe
say "pulling probe image ${PROBE_IMAGE} (dedicated daemon only)"
openhands_docker pull "${PROBE_IMAGE}" >/dev/null
openhands_docker run -d --name "${OPENHANDS_CGROUP_PROBE_NAME}" "${PROBE_IMAGE}" sleep 120 >/dev/null
PID="$(openhands_docker inspect -f '{{.State.Pid}}' "${OPENHANDS_CGROUP_PROBE_NAME}")"
if [[ -z "${PID}" || "${PID}" == "0" ]]; then
  fail "probe container PID unavailable"
  say "FAIL — ${#FAILURES[@]} violation(s)"
  exit 1
fi
CG="$(tr '\0' '\n' < "/proc/${PID}/cgroup" 2>/dev/null || true)"
say "probe PID=${PID}"
say "probe cgroup=${CG}"

if [[ -z "${CG}" ]]; then
  fail "could not read /proc/${PID}/cgroup — ambiguous"
elif ! printf '%s' "${CG}" | grep -Fq "${EXPECTED_PARENT}"; then
  fail "probe cgroup does not contain required parent ${EXPECTED_PARENT}"
elif ! printf '%s' "${CG}" | grep -Fq "${EXPECTED_AGGREGATE}"; then
  fail "probe cgroup does not contain aggregate ancestor ${EXPECTED_AGGREGATE}"
elif printf '%s' "${CG}" | grep -Eq '/user\.slice/[^/]+/user@[0-9]+\.service/user\.slice/docker-' \
  && ! printf '%s' "${CG}" | grep -Fq "${EXPECTED_PARENT}"; then
  fail "probe appears under unrestricted user.slice docker scope"
else
  pass "probe PID cgroup is beneath ${EXPECTED_AGGREGATE}/${EXPECTED_PARENT}"
fi

# Dockerd itself must still be under the aggregate slice (not a substitute for container check).
if command -v systemctl >/dev/null 2>&1; then
  dockerd_slice="$(systemctl --user show corpflowai-openhands-dockerd.service -p Slice --value 2>/dev/null || true)"
  if [[ "${dockerd_slice}" != "${EXPECTED_AGGREGATE}" ]]; then
    fail "dockerd unit Slice='${dockerd_slice}' expected '${EXPECTED_AGGREGATE}'"
  else
    pass "dockerd unit Slice=${EXPECTED_AGGREGATE}"
  fi
  mem_max="$(systemctl --user show "${EXPECTED_AGGREGATE}" -p MemoryMax --value 2>/dev/null || true)"
  mem_high="$(systemctl --user show "${EXPECTED_AGGREGATE}" -p MemoryHigh --value 2>/dev/null || true)"
  tasks_max="$(systemctl --user show "${EXPECTED_AGGREGATE}" -p TasksMax --value 2>/dev/null || true)"
  cpu_quota="$(systemctl --user show "${EXPECTED_AGGREGATE}" -p CPUQuotaPerSecUSec --value 2>/dev/null || true)"
  say "ancestor limits: MemoryMax=${mem_max} MemoryHigh=${mem_high} TasksMax=${tasks_max} CPUQuotaPerSecUSec=${cpu_quota}"
  if [[ -z "${mem_max}" || "${mem_max}" == "infinity" ]]; then
    fail "aggregate slice MemoryMax missing or infinity — resource boundary unproven"
  elif [[ "${mem_max}" =~ ^[0-9]+$ ]] && (( mem_max > OPENHANDS_MEMORY_MAX_BYTES_CEILING )); then
    fail "aggregate MemoryMax=${mem_max} exceeds host-safe ceiling ${OPENHANDS_MEMORY_MAX_BYTES_CEILING}"
  else
    pass "aggregate MemoryMax within host-safe ceiling (${mem_max} <= ${OPENHANDS_MEMORY_MAX_BYTES_CEILING})"
  fi
  if [[ -z "${tasks_max}" || "${tasks_max}" == "infinity" ]]; then
    fail "aggregate TasksMax missing or infinity"
  else
    pass "aggregate TasksMax=${tasks_max}"
  fi
else
  fail "systemctl unavailable — cannot prove ancestor slice limits"
fi

cleanup_probe
trap - EXIT
pass "probe removed"

if [[ "${#FAILURES[@]}" -eq 0 ]]; then
  say "PASS — container cgroup placement and ancestor limits verified"
  exit 0
fi

say "FAIL — ${#FAILURES[@]} violation(s):"
for v in "${FAILURES[@]}"; do say "  - ${v}"; done
exit 1
