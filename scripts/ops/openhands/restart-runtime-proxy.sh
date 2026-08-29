#!/usr/bin/env bash
# CorpFlowAI — apply/restart the approved OpenHands runtime proxy repair (#1246).
# This script only recreates corpflowai-openhands-app on the dedicated rootless
# Docker daemon. It does not publish sandbox ports or touch the primary daemon.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=scripts/ops/openhands/lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

REPO_ROOT="$(openhands_repo_root)"
BASE_COMPOSE="${REPO_ROOT}/ops/openhands/compose.yaml"
PROXY_COMPOSE="${REPO_ROOT}/ops/openhands/compose.runtime-proxy.yaml"

if [[ "${OPENHANDS_RUNTIME_PROXY_RESTART_APPROVED:-}" != "YES" ]]; then
  die "refusing restart: set OPENHANDS_RUNTIME_PROXY_RESTART_APPROVED=YES only after explicit operator approval for #1246"
fi

[[ -f "${BASE_COMPOSE}" ]] || die "missing ${BASE_COMPOSE}"
[[ -f "${PROXY_COMPOSE}" ]] || die "missing ${PROXY_COMPOSE}"

say "verifying dedicated OpenHands daemon before runtime proxy restart"
bash "${SCRIPT_DIR}/preflight.sh" --install
bash "${SCRIPT_DIR}/verify-dedicated-daemon.sh"

say "validating merged compose configuration before mutation"
rendered="$(mktemp)"
trap 'rm -f "${rendered}"' EXIT
openhands_docker compose \
  -p "${OPENHANDS_PROJECT}" \
  -f "${BASE_COMPOSE}" \
  -f "${PROXY_COMPOSE}" \
  config >"${rendered}"

grep -q '127.0.0.1' "${rendered}" || die "merged compose lost loopback-only app bind"
grep -q 'runtime_proxy_router.py' "${rendered}" || die "runtime proxy router mount missing"
grep -q '/app/openhands/app_server/app.py' "${rendered}" || die "app.py override mount missing"
grep -q '/run/openhands-docker/docker.sock' "${rendered}" || die "dedicated Docker socket mount missing"
if grep -Eq 'published:[[:space:]]*"?800(0|2)"?' "${rendered}"; then
  die "refusing restart: merged compose publishes a sandbox port"
fi

say "recreating only corpflowai-openhands-app with the #1246 proxy overlay"
openhands_docker compose \
  -p "${OPENHANDS_PROJECT}" \
  -f "${BASE_COMPOSE}" \
  -f "${PROXY_COMPOSE}" \
  up -d --force-recreate corpflowai-openhands-app

say "waiting for OpenHands health"
for _ in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:3000/health >/dev/null 2>&1; then
    say "OpenHands health OK"
    break
  fi
  sleep 2
done
curl -fsS http://127.0.0.1:3000/health >/dev/null

say "verifying isolation boundaries after restart"
bash "${SCRIPT_DIR}/verify-private-bind.sh"
bash "${SCRIPT_DIR}/verify-sandbox-boundary.sh"
bash "${SCRIPT_DIR}/verify-dedicated-daemon.sh"

active_sandbox="$(openhands_docker ps --filter 'name=oh-agent-server-' --filter 'status=running' --format '{{.Names}}' | head -n 1)"
if [[ -n "${active_sandbox}" ]]; then
  say "verifying app-server proxy can reach the active private sandbox"
  openhands_docker exec corpflowai-openhands-app \
    curl -fsS "http://127.0.0.1:3000/runtime/${active_sandbox}/" >/dev/null
fi

say "OK — #1246 runtime proxy restart applied; browser-level validation still required before completion"
