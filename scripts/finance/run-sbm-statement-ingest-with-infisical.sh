#!/usr/bin/env bash
set -euo pipefail
umask 077

readonly RUNTIME_ROOT="/home/anton/corpflow-finance-runtime"
readonly FINANCE_CODE_ROOT="${RUNTIME_ROOT}/code"
readonly FINANCE_DATA_ROOT="${RUNTIME_ROOT}/data"
readonly INFISICAL_BIN="${RUNTIME_ROOT}/infisical"
readonly CREDENTIAL_NAME="infisical-client-secret"

usage() {
  echo "usage: $0 --verify-secrets | --accept-one | --process-batch" >&2
  exit 2
}

require() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "MISSING_REQUIRED_RUNTIME_CONFIGURATION:${name}" >&2
    exit 2
  fi
}

[[ $# -eq 1 ]] || usage
case "$1" in
  --verify-secrets|--accept-one|--process-batch) ;;
  *) usage ;;
esac

require CREDENTIALS_DIRECTORY
require INFISICAL_UNIVERSAL_AUTH_CLIENT_ID
require INFISICAL_PROJECT_ID
require INFISICAL_ENVIRONMENT

readonly credential_path="${CREDENTIALS_DIRECTORY}/${CREDENTIAL_NAME}"
[[ -r "${credential_path}" && ! -L "${credential_path}" ]] || {
  echo "PROTECTED_CREDENTIAL_UNAVAILABLE" >&2
  exit 2
}
[[ -x "${INFISICAL_BIN}" ]] || {
  echo "INFISICAL_CLI_UNAVAILABLE" >&2
  exit 2
}
[[ -d "${FINANCE_CODE_ROOT}" && -d "${FINANCE_DATA_ROOT}" ]] || {
  echo "FINANCE_RUNTIME_UNAVAILABLE" >&2
  exit 2
}

export FINANCE_ROOT="${FINANCE_DATA_ROOT}"
export PATH="${RUNTIME_ROOT}/tools/usr/bin:${PATH}"
export INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET="$(<"${credential_path}")"
export INFISICAL_TOKEN="$("${INFISICAL_BIN}" login --method=universal-auth --plain --silent)"
unset INFISICAL_UNIVERSAL_AUTH_CLIENT_SECRET
trap 'unset INFISICAL_TOKEN' EXIT

cd "${FINANCE_CODE_ROOT}"
case "$1" in
  --verify-secrets)
    exec "${INFISICAL_BIN}" run --projectId="${INFISICAL_PROJECT_ID}" --env="${INFISICAL_ENVIRONMENT}" -- \
      /usr/bin/node scripts/finance/verify-sbm-runtime-secrets.mjs
    ;;
  --accept-one)
    exec "${INFISICAL_BIN}" run --projectId="${INFISICAL_PROJECT_ID}" --env="${INFISICAL_ENVIRONMENT}" -- \
      npm run finance:sbm-statement-ingest -- --lookback-days=210 --max-statements=1
    ;;
  --process-batch)
    exec "${INFISICAL_BIN}" run --projectId="${INFISICAL_PROJECT_ID}" --env="${INFISICAL_ENVIRONMENT}" -- \
      npm run finance:sbm-statement-ingest -- --lookback-days=210
    ;;
esac
