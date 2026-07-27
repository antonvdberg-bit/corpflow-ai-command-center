#!/usr/bin/env bash
# CorpFlowAI — backup-health monitor (Monitor #14)
#
# Independent daily check against the existing restic → Cloudflare R2 ops backup
# on corpflow-exec-01-u69678. Alerts Telegram ONLY on failure / suspicious state.
# Success is silent (log line only). Fail-closed: inability to determine health = alert.
#
# Canonical doc: docs/operations/BACKUP_HEALTH_MONITOR.md
# Backup mechanism: docs/operations/SELF_HOSTED_OPS_R2_RESTIC.md
# Design origin: docs/operations/SERVER_SAFETY_BASELINE_AND_CHATWOOT_DECISION_V1.md §3
#
# Does NOT:
#   - run restic backup / prune / forget
#   - touch POSTGRES_URL or production DB
#   - print secret values
#   - send success / heartbeat spam
#   - install Chatwoot, Langfuse, or any unrelated tool
#
# Usage:
#   ./scripts/ops/backup-health-check.sh
#   BACKUP_HEALTH_DRY_RUN=1 ./scripts/ops/backup-health-check.sh
#   BACKUP_HEALTH_FORCE_FAIL=1 ./scripts/ops/backup-health-check.sh   # test alert path
#
# Required env (names only — values never logged):
#   RESTIC_REPOSITORY, RESTIC_PASSWORD, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY
#   (normally loaded from /home/anton/.config/restic/env)
# Telegram alert env (same names as lib/server/ops-alerts.js):
#   TELEGRAM_BOT_TOKEN, TELEGRAM_ALERT_CHAT_ID
#
# Exit codes:
#   0 — healthy (or dry-run healthy)
#   1 — unhealthy / fail-closed / forced fail (alert attempted unless dry-run)
#   2 — usage / local precondition error before checks (still fail-closed alert when possible)

set -euo pipefail

readonly KIND="backup_health"
readonly SCRIPT_NAME="backup-health-check"
readonly LOG_PREFIX="[corpflowai-ops ${SCRIPT_NAME}]"

# Tunables (override via env; defaults match SERVER_SAFETY §3)
MAX_AGE_HOURS="${BACKUP_HEALTH_MAX_AGE_HOURS:-36}"
MIN_SNAPSHOT_COUNT="${BACKUP_HEALTH_MIN_SNAPSHOT_COUNT:-2}"
MIN_TOTAL_BYTES="${BACKUP_HEALTH_MIN_TOTAL_BYTES:-1024}"
# Soft upper bound — absurd growth only. Default ~50 GiB. Override if legitimate growth exceeds.
MAX_TOTAL_BYTES="${BACKUP_HEALTH_MAX_TOTAL_BYTES:-53687091200}"
EXPECTED_TAG="${BACKUP_HEALTH_EXPECTED_TAG:-corpflowai-ops-heartbeat}"
RESTIC_ENV_FILE="${BACKUP_HEALTH_RESTIC_ENV_FILE:-${HOME}/.config/restic/env}"
DEDUP_DIR="${BACKUP_HEALTH_DEDUP_DIR:-${HOME}/.cache/corpflowai-ops/backup-health}"
LOG_DIR="${BACKUP_HEALTH_LOG_DIR:-${HOME}/.local/state/corpflowai-ops}"
DRY_RUN="${BACKUP_HEALTH_DRY_RUN:-0}"
FORCE_FAIL="${BACKUP_HEALTH_FORCE_FAIL:-0}"
SKIP_TELEGRAM="${BACKUP_HEALTH_SKIP_TELEGRAM:-0}"

FAILURES=()
NOTES=()
SNAPSHOT_COUNT=""
LATEST_TIME=""
LATEST_ID=""
TOTAL_SIZE=""
REPO_REACHABLE="unknown"

log() {
  # Quiet success path: always write a single-line status suitable for journalctl.
  printf '%s %s\n' "${LOG_PREFIX}" "$*"
}

add_failure() {
  FAILURES+=("$1")
}

add_note() {
  NOTES+=("$1")
}

presence() {
  # Print configured/missing for a named env var — never the value.
  local name="$1"
  if [[ -n "${!name:-}" ]]; then
    printf 'configured'
  else
    printf 'MISSING'
  fi
}

load_restic_env() {
  if [[ ! -f "${RESTIC_ENV_FILE}" ]]; then
    add_failure "restic env file missing: ${RESTIC_ENV_FILE}"
    return 1
  fi
  # shellcheck disable=SC1090
  set -a
  # Source without echoing. Caller must never `set -x` around this.
  # shellcheck source=/dev/null
  source "${RESTIC_ENV_FILE}"
  set +a
  return 0
}

require_cmd() {
  local c="$1"
  if ! command -v "${c}" >/dev/null 2>&1; then
    add_failure "required command not found: ${c}"
    return 1
  fi
  return 0
}

# Parse restic snapshots --json for count + newest time.
# Uses python3 if available (preferred); else a minimal awk/date fallback for count only.
# Important: JSON is written to a temp file and passed by path. Do NOT pipe/here-string JSON
# into a python <<'PY' heredoc — the heredoc owns stdin, so json.loads gets empty input
# (L3 install regression 2026-07-27: PARSE_ERROR|Expecting value: line 1 column 1).
parse_snapshots_json() {
  local json="$1"
  if command -v python3 >/dev/null 2>&1; then
    local tmp rc=0
    tmp="$(mktemp "${TMPDIR:-/tmp}/corpflowai-backup-health-snaps.XXXXXX")" || return 2
    printf '%s' "${json}" > "${tmp}"
    # Do not use stdin for JSON: the <<'PY' heredoc owns stdin. Pass path via argv.
    python3 - "$EXPECTED_TAG" "${tmp}" <<'PY' || rc=$?
import json, sys
from datetime import datetime, timezone

tag = sys.argv[1]
path = sys.argv[2]
try:
    with open(path, "r", encoding="utf-8") as fh:
        raw = fh.read()
    data = json.loads(raw)
except Exception as e:
    print(f"PARSE_ERROR|{e}", file=sys.stderr)
    sys.exit(2)
if not isinstance(data, list):
    print("PARSE_ERROR|not a list", file=sys.stderr)
    sys.exit(2)

def match(s):
    tags = s.get("tags") or []
    return (not tag) or (tag in tags)

snaps = [s for s in data if match(s)]
# Fall back to all snapshots if tag filter yields nothing (tag may vary; fail later on empty).
use = snaps if snaps else data
print(f"COUNT|{len(use)}")
if not use:
    print("LATEST|")
    print("ID|")
    sys.exit(0)

def parse_ts(s):
    t = s.get("time") or ""
    # restic: 2026-06-26T12:34:56.789012345Z
    t = t.replace("Z", "+00:00")
    if "." in t:
        head, rest = t.split(".", 1)
        # keep up to 6 fractional digits for fromisoformat
        frac = ""
        tz = "+00:00"
        for i, ch in enumerate(rest):
            if ch.isdigit():
                frac += ch
            else:
                tz = rest[i:]
                break
        frac = (frac + "000000")[:6]
        t = f"{head}.{frac}{tz}"
    return datetime.fromisoformat(t)

newest = max(use, key=parse_ts)
print(f"LATEST|{newest.get('time','')}")
print(f"ID|{newest.get('short_id') or newest.get('id','')[:8]}")
PY
    rm -f "${tmp}"
    return "${rc}"
  fi
  # Minimal fallback: count array elements roughly; cannot age-check without python3.
  local count
  count="$(printf '%s' "${json}" | grep -o '"time"' | wc -l | tr -d ' ')"
  printf 'COUNT|%s\n' "${count}"
  printf 'LATEST|\n'
  printf 'ID|\n'
  if [[ "${count}" == "0" ]]; then
    return 0
  fi
  add_note "python3 missing — snapshot age check unavailable (fail-closed)"
  add_failure "cannot determine backup age without python3"
  return 0
}

parse_stats_json() {
  local json="$1"
  if command -v python3 >/dev/null 2>&1; then
    local tmp rc=0
    tmp="$(mktemp "${TMPDIR:-/tmp}/corpflowai-backup-health-stats.XXXXXX")" || return 2
    printf '%s' "${json}" > "${tmp}"
    # Do not use stdin for JSON: the <<'PY' heredoc owns stdin. Pass path via argv.
    python3 - "${tmp}" <<'PY' || rc=$?
import json, sys
path = sys.argv[1]
try:
    with open(path, "r", encoding="utf-8") as fh:
        raw = fh.read()
    data = json.loads(raw)
except Exception as e:
    print(f"PARSE_ERROR|{e}", file=sys.stderr)
    sys.exit(2)
# restic stats --mode raw-data → total_size; --mode restore-size similar
size = data.get("total_size")
if size is None:
    size = data.get("total_size", 0)
print(f"SIZE|{int(size or 0)}")
PY
    rm -f "${tmp}"
    return "${rc}"
  fi
  add_note "python3 missing — size check skipped with fail-closed"
  add_failure "cannot determine backup size without python3"
  printf 'SIZE|\n'
  return 0
}

age_hours() {
  # Args: ISO-ish restic timestamp. Prints integer hours since then (UTC).
  local ts="$1"
  python3 - "$ts" <<'PY'
import sys
from datetime import datetime, timezone
t = sys.argv[1].replace("Z", "+00:00")
if "." in t:
    head, rest = t.split(".", 1)
    frac = ""
    tz = "+00:00"
    for i, ch in enumerate(rest):
        if ch.isdigit():
            frac += ch
        else:
            tz = rest[i:]
            break
    frac = (frac + "000000")[:6]
    t = f"{head}.{frac}{tz}"
dt = datetime.fromisoformat(t)
if dt.tzinfo is None:
    dt = dt.replace(tzinfo=timezone.utc)
now = datetime.now(timezone.utc)
hours = int((now - dt).total_seconds() // 3600)
print(hours)
PY
}

dedup_should_skip() {
  # Anti-spam: kind × hour bucket. Returns 0 if we should skip sending again this hour.
  mkdir -p "${DEDUP_DIR}"
  local bucket
  bucket="$(date -u +%Y%m%d%H)"
  local marker="${DEDUP_DIR}/${KIND}.${bucket}"
  if [[ -f "${marker}" ]]; then
    return 0
  fi
  return 1
}

dedup_mark() {
  mkdir -p "${DEDUP_DIR}"
  local bucket
  bucket="$(date -u +%Y%m%d%H)"
  local marker="${DEDUP_DIR}/${KIND}.${bucket}"
  : > "${marker}"
  # Best-effort prune older markers (keep ~48h).
  find "${DEDUP_DIR}" -type f -name "${KIND}.*" -mtime +2 -delete 2>/dev/null || true
}

send_telegram() {
  local text="$1"
  if [[ "${SKIP_TELEGRAM}" == "1" ]]; then
    log "telegram: SKIPPED (BACKUP_HEALTH_SKIP_TELEGRAM=1)"
    return 0
  fi
  if [[ "${DRY_RUN}" == "1" ]]; then
    log "telegram DRY-RUN (not sent):"
    printf '%s\n' "${text}" | while IFS= read -r line; do log "  ${line}"; done
    return 0
  fi
  local token="${TELEGRAM_BOT_TOKEN:-}"
  local chat="${TELEGRAM_ALERT_CHAT_ID:-}"
  if [[ -z "${token}" || -z "${chat}" ]]; then
    log "telegram: SKIPPED (TELEGRAM_BOT_TOKEN or TELEGRAM_ALERT_CHAT_ID unset) — alert NOT delivered"
    return 1
  fi
  if dedup_should_skip; then
    log "telegram: SKIPPED (anti-spam dedup kind=${KIND} this UTC hour)"
    return 0
  fi
  if ! command -v python3 >/dev/null 2>&1; then
    log "telegram: SKIPPED (python3 required to JSON-encode payload) — alert NOT delivered"
    return 1
  fi
  # Cap at 3500 chars (same as ops-alerts.js / post-control-loop helper).
  text="${text:0:3500}"
  local payload http
  payload="$(TELEGRAM_ALERT_CHAT_ID="${chat}" python3 -c '
import json, os, sys
text = sys.stdin.read()
print(json.dumps({"chat_id": os.environ["TELEGRAM_ALERT_CHAT_ID"], "text": text}))
' <<<"${text}")" || {
    log "telegram: FAILED to build JSON payload"
    return 1
  }
  http="$(curl -sS -o /tmp/corpflowai-backup-health-tg.out -w '%{http_code}' \
    -X POST "https://api.telegram.org/bot${token}/sendMessage" \
    -H 'Content-Type: application/json' \
    --data-binary "${payload}")" || true
  # Never log token/chat/response body. Presence + HTTP code only.
  if [[ "${http}" == "200" ]]; then
    log "telegram: ok http=200"
    dedup_mark
    return 0
  fi
  log "telegram: FAILED http=${http:-?} (body not logged)"
  return 1
}

build_alert_text() {
  local lines=()
  lines+=("CorpFlowAI alert: backup health FAILED on corpflow-exec-01 (kind=${KIND}).")
  lines+=("Recommended action: SSH as anton, inspect restic timers/journals, then re-run backup-health-check.sh.")
  lines+=("Evidence: journalctl --user -u corpflowai-ops-restic-heartbeat.service -n 50 --no-pager")
  local f
  for f in "${FAILURES[@]}"; do
    lines+=("! ${f}")
  done
  if [[ -n "${SNAPSHOT_COUNT}" ]]; then
    lines+=("snapshots=${SNAPSHOT_COUNT} latest_id=${LATEST_ID:-?} latest_time=${LATEST_TIME:-?} total_bytes=${TOTAL_SIZE:-?} repo_reachable=${REPO_REACHABLE}")
  fi
  local n
  for n in "${NOTES[@]}"; do
    lines+=("note: ${n}")
  done
  printf '%s\n' "${lines[@]}"
}

write_quiet_success_log() {
  mkdir -p "${LOG_DIR}"
  local stamp
  stamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"
  printf '%s ok snapshots=%s latest_id=%s latest_time=%s total_bytes=%s max_age_h=%s\n' \
    "${stamp}" "${SNAPSHOT_COUNT}" "${LATEST_ID}" "${LATEST_TIME}" "${TOTAL_SIZE}" "${MAX_AGE_HOURS}" \
    >> "${LOG_DIR}/backup-health.log"
}

run_checks() {
  if [[ "${FORCE_FAIL}" == "1" ]]; then
    add_failure "BACKUP_HEALTH_FORCE_FAIL=1 (operator test)"
    return 0
  fi

  require_cmd curl || true
  require_cmd restic || true
  require_cmd python3 || true

  if ! load_restic_env; then
    return 0
  fi

  # Presence-only boot line (never values).
  log "boot: RESTIC_REPOSITORY=$(presence RESTIC_REPOSITORY) RESTIC_PASSWORD=$(presence RESTIC_PASSWORD) AWS_ACCESS_KEY_ID=$(presence AWS_ACCESS_KEY_ID) AWS_SECRET_ACCESS_KEY=$(presence AWS_SECRET_ACCESS_KEY) TELEGRAM_BOT_TOKEN=$(presence TELEGRAM_BOT_TOKEN) TELEGRAM_ALERT_CHAT_ID=$(presence TELEGRAM_ALERT_CHAT_ID) dry_run=${DRY_RUN}"

  if [[ -z "${RESTIC_REPOSITORY:-}" || -z "${RESTIC_PASSWORD:-}" ]]; then
    add_failure "restic credentials incomplete after sourcing env (names only checked)"
    return 0
  fi

  if ! command -v restic >/dev/null 2>&1; then
    return 0
  fi

  local snap_json snap_rc
  set +e
  snap_json="$(restic snapshots --json 2>/tmp/corpflowai-restic-snapshots.err)"
  snap_rc=$?
  set -e
  if [[ "${snap_rc}" -ne 0 ]]; then
    REPO_REACHABLE="no"
    add_failure "restic snapshots exited ${snap_rc} (repo unreachable or credentials bad — stderr not logged)"
    return 0
  fi
  REPO_REACHABLE="yes"

  local parsed
  set +e
  parsed="$(parse_snapshots_json "${snap_json}")"
  local parse_rc=$?
  set -e
  if [[ "${parse_rc}" -ne 0 ]]; then
    add_failure "failed to parse restic snapshots JSON (fail-closed)"
    return 0
  fi

  SNAPSHOT_COUNT="$(printf '%s\n' "${parsed}" | awk -F'|' '/^COUNT\|/{print $2; exit}')"
  LATEST_TIME="$(printf '%s\n' "${parsed}" | awk -F'|' '/^LATEST\|/{print $2; exit}')"
  LATEST_ID="$(printf '%s\n' "${parsed}" | awk -F'|' '/^ID\|/{print $2; exit}')"

  if [[ -z "${SNAPSHOT_COUNT}" || "${SNAPSHOT_COUNT}" == "0" ]]; then
    add_failure "no restic snapshots found (expected tag=${EXPECTED_TAG} or any snapshot)"
    return 0
  fi

  if [[ "${SNAPSHOT_COUNT}" -lt "${MIN_SNAPSHOT_COUNT}" ]]; then
    add_failure "snapshot count ${SNAPSHOT_COUNT} < min ${MIN_SNAPSHOT_COUNT} (retention may be broken)"
  fi

  if [[ -z "${LATEST_TIME}" ]]; then
    add_failure "latest snapshot timestamp missing (fail-closed)"
  else
    local hours
    set +e
    hours="$(age_hours "${LATEST_TIME}")"
    local age_rc=$?
    set -e
    if [[ "${age_rc}" -ne 0 || -z "${hours}" ]]; then
      add_failure "could not compute snapshot age from timestamp (fail-closed)"
    elif [[ "${hours}" -gt "${MAX_AGE_HOURS}" ]]; then
      add_failure "latest snapshot is ${hours}h old (max ${MAX_AGE_HOURS}h); stale backup"
    else
      add_note "latest snapshot age=${hours}h (ok)"
    fi
  fi

  # Size / plausible volume
  local stats_json stats_rc
  set +e
  stats_json="$(restic stats --mode raw-data --json 2>/tmp/corpflowai-restic-stats.err)"
  stats_rc=$?
  set -e
  if [[ "${stats_rc}" -ne 0 ]]; then
    add_failure "restic stats exited ${stats_rc} (fail-closed on size)"
  else
    local size_line
    set +e
    size_line="$(parse_stats_json "${stats_json}")"
    local size_rc=$?
    set -e
    if [[ "${size_rc}" -ne 0 ]]; then
      add_failure "failed to parse restic stats JSON (fail-closed)"
    else
      TOTAL_SIZE="$(printf '%s\n' "${size_line}" | awk -F'|' '/^SIZE\|/{print $2; exit}')"
      if [[ -z "${TOTAL_SIZE}" ]]; then
        add_failure "total_size missing from stats (fail-closed)"
      elif [[ "${TOTAL_SIZE}" -lt "${MIN_TOTAL_BYTES}" ]]; then
        add_failure "repo total_size=${TOTAL_SIZE} bytes below min ${MIN_TOTAL_BYTES} (implausible)"
      elif [[ "${TOTAL_SIZE}" -gt "${MAX_TOTAL_BYTES}" ]]; then
        add_failure "repo total_size=${TOTAL_SIZE} bytes above max ${MAX_TOTAL_BYTES} (implausible / runaway)"
      else
        add_note "total_size=${TOTAL_SIZE} bytes (plausible)"
      fi
    fi
  fi

  # Optional: journal success hint (best-effort, non-fatal if journalctl unavailable)
  if command -v journalctl >/dev/null 2>&1; then
    if journalctl --user -u corpflowai-ops-restic-heartbeat.service -n 5 --no-pager 2>/dev/null \
      | grep -qiE 'error|failed|Fatal'; then
      add_note "recent heartbeat journal contains error-like lines (see journalctl)"
      # Do not auto-fail solely on journal text — restic snapshots are source of truth.
    fi
  fi
}

main() {
  log "start dry_run=${DRY_RUN} force_fail=${FORCE_FAIL} max_age_h=${MAX_AGE_HOURS} min_snapshots=${MIN_SNAPSHOT_COUNT}"

  run_checks

  if [[ "${#FAILURES[@]}" -eq 0 ]]; then
    log "ok snapshots=${SNAPSHOT_COUNT} latest_id=${LATEST_ID} latest_time=${LATEST_TIME} total_bytes=${TOTAL_SIZE}"
    write_quiet_success_log
    exit 0
  fi

  log "FAIL count=${#FAILURES[@]}"
  local i
  for i in "${FAILURES[@]}"; do
    log "fail: ${i}"
  done

  local alert
  alert="$(build_alert_text)"
  send_telegram "${alert}" || true
  exit 1
}

main "$@"
