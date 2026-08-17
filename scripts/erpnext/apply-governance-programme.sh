#!/usr/bin/env bash
# CorpFlowAI — create/verify the internal ERPNext governance programme (#966).
#
# Canonical path: direct Frappe token auth using Cursor Cloud–injected secrets
# (names only; never logs values):
#   ERPNEXT_BASE_URL
#   ERPNEXT_API_KEY
#   ERPNEXT_API_SECRET
#
# Do NOT require MASTER_ADMIN_KEY, SSH, or Infisical at runtime.
# Authenticate as the CorpFlowAI Integration API identity
# (integrations@corpflowai.com).
#
# Creates or reuses one internal Project and Vision + Phase 0–10 Tasks.
# No custom DocTypes. No client portal. No Notification/Workflow enablement.
# No accounting/tax/bank/payment mutation. No external send.
#
# Usage:
#   bash scripts/erpnext/apply-governance-programme.sh --dry-run
#   bash scripts/erpnext/apply-governance-programme.sh
#
# Exit codes:
#   0 = dry-run OK, or live READY
#   1 = NOT READY / FAIL
#   2 = unexpected script error

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONFIG="${ROOT}/config/erpnext-governance-programme.v1.json"
ARTIFACT_DIR="${ROOT}/artifacts/erpnext/governance-programme-966"
DRY_RUN=0
if [[ "${1:-}" == "--dry-run" ]]; then
  DRY_RUN=1
fi

log() { printf '%s\n' "$*"; }

require_secret_present() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "absent"
  else
    echo "present"
  fi
}

list_injected_secret_names() {
  python3 - <<'PY'
import os
wanted = [
    "ERPNEXT_BASE_URL",
    "ERPNEXT_API_KEY",
    "ERPNEXT_API_SECRET",
    "MASTER_ADMIN_KEY",
    "ADMIN_PIN",
]
present = [n for n in wanted if os.environ.get(n)]
print(",".join(present) if present else "none")
PY
}

print_header() {
  log "ERPNext governance programme apply (#966)"
  log "access_path: direct Cursor Cloud secrets → Frappe token auth (no SSH/Infisical runtime bridge)"
  log "expected_identity: integrations@corpflowai.com (CorpFlowAI Integration)"
  log "ERPNEXT_BASE_URL: $(require_secret_present ERPNEXT_BASE_URL)"
  log "ERPNEXT_API_KEY: $(require_secret_present ERPNEXT_API_KEY)"
  log "ERPNEXT_API_SECRET: $(require_secret_present ERPNEXT_API_SECRET)"
  log "MASTER_ADMIN_KEY: $(require_secret_present MASTER_ADMIN_KEY) (must not be used as ERPNext auth)"
  log "injected_secret_names_checked: $(list_injected_secret_names)"
  log "auth_fallback_master_admin_key: forbidden"
  log "runtime_bridge_ssh: no"
  log "runtime_bridge_infisical: no"
  log "ERPNEXT_BASE_URL_value: not_printed"
  log "dry_run: ${DRY_RUN}"
  log "project_name: CorpFlowAI ERPNext Business-Critical Adoption Programme"
  log "forbidden: custom DocType, client portal, Project Update email, accounting/tax/bank, live send"
}

print_header

if [[ "$DRY_RUN" == "1" ]]; then
  log "mode: dry-run (no ERPNext call)"
  log "planned: search-before-create Project + Vision task Completed + Phase 0–10 Tasks"
  log "planned_attempt: Version / form timeline read-back after one internal note append"
  log "ERPNext governance programme: DRY-RUN"
  exit 0
fi

missing=()
[[ -z "${ERPNEXT_BASE_URL:-}" ]] && missing+=("ERPNEXT_BASE_URL")
[[ -z "${ERPNEXT_API_KEY:-}" ]] && missing+=("ERPNEXT_API_KEY")
[[ -z "${ERPNEXT_API_SECRET:-}" ]] && missing+=("ERPNEXT_API_SECRET")
if ((${#missing[@]} > 0)); then
  log "ERP GOVERNANCE RECORD ENVIRONMENT NOT READY — missing injected secrets: ${missing[*]}"
  log "Do not use MASTER_ADMIN_KEY as a substitute."
  exit 1
fi

mkdir -p "$ARTIFACT_DIR"

set +e
python3 - "$CONFIG" "$ARTIFACT_DIR" <<'PY'
import json, os, sys, urllib.parse, urllib.request, re, datetime
from pathlib import Path

config_path, artifact_dir = sys.argv[1], sys.argv[2]
base = os.environ["ERPNEXT_BASE_URL"].rstrip("/")
key = os.environ["ERPNEXT_API_KEY"]
secret = os.environ["ERPNEXT_API_SECRET"]
cfg = json.load(open(config_path, encoding="utf-8"))
stamp = datetime.datetime.now(datetime.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z")
evidence = {
    "schema": "corpflow.erpnext.governance_programme_apply.v1",
    "issue": 966,
    "generated_at_utc": stamp,
    "identity": None,
    "http": {},
    "created": [],
    "reused": [],
    "denied": [],
    "readback": {},
    "secrets_printed": False,
}

def redact(s, n=220):
    s = (s or "").replace("\n", " ")
    s = re.sub(r"[A-Za-z0-9_\-]{20,}", "***", s)
    s = re.sub(r"https?://[^\s\"']+", "[url]", s)
    return s[:n]

def req(method, path, payload=None):
    url = base + path
    data = None if payload is None else json.dumps(payload).encode("utf-8")
    headers = {
        "Authorization": f"token {key}:{secret}",
        "Accept": "application/json",
        "Content-Type": "application/json",
    }
    r = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(r, timeout=45) as resp:
            return resp.status, json.loads(resp.read().decode("utf-8", "replace") or "{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", "replace")
        try:
            parsed = json.loads(body)
        except Exception:
            parsed = {"_raw": redact(body)}
        return e.code, parsed
    except Exception as e:
        return 0, {"_raw": f"err:{type(e).__name__}"}

def log(msg):
    print(msg)

def enc(dt):
    return urllib.parse.quote(dt, safe="")

def list_names(dt, fields, filters=None, limit=50):
    q = f"/api/resource/{enc(dt)}?limit_page_length={limit}&fields={urllib.parse.quote(json.dumps(fields))}"
    if filters:
        q += "&filters=" + urllib.parse.quote(json.dumps(filters))
    code, data = req("GET", q)
    evidence["http"][f"GET {dt}"] = code
    rows = data.get("data") if code == 200 and isinstance(data, dict) else []
    return code, rows or []

def get_doc(dt, name):
    code, data = req("GET", f"/api/resource/{enc(dt)}/{enc(name)}")
    evidence["http"][f"GET {dt}/{name}"] = code
    row = data.get("data") if code == 200 and isinstance(data, dict) else None
    return code, row if isinstance(row, dict) else {}

def create(dt, payload):
    code, data = req("POST", f"/api/resource/{enc(dt)}", payload)
    evidence["http"][f"POST {dt}"] = code
    row = data.get("data") if isinstance(data, dict) else None
    if code in (200, 201) and isinstance(row, dict):
        evidence["created"].append({"doctype": dt, "name": row.get("name")})
        log(f"created: {dt} {row.get('name')}")
        return code, row
    evidence["denied"].append({"doctype": dt, "http": code, "body": redact(json.dumps(data))})
    log(f"create_failed: {dt} HTTP {code} {redact(json.dumps(data))}")
    return code, data

def put_doc(dt, name, payload):
    code, data = req("PUT", f"/api/resource/{enc(dt)}/{enc(name)}", payload)
    evidence["http"][f"PUT {dt}"] = code
    row = data.get("data") if isinstance(data, dict) else None
    if code in (200, 201) and isinstance(row, dict):
        log(f"updated: {dt} {name}")
        return code, row
    evidence["denied"].append({"doctype": dt, "http": code, "body": redact(json.dumps(data)), "op": "PUT"})
    log(f"update_failed: {dt} {name} HTTP {code} {redact(json.dumps(data))}")
    return code, data

code, data = req("GET", "/api/method/frappe.auth.get_logged_user")
user = data.get("message") if isinstance(data, dict) else ""
evidence["identity"] = user
log(f"authenticated_user: {user}")
log(f"http_auth_status: {code}")
if code != 200:
    log("NOT READY — authentication failed")
    raise SystemExit(1)

proj_name = cfg["project"]["project_name"]
task_specs = cfg["tasks"]

for dt in ["Project", "Task", "Project Type", "Version", "Notification", "Workflow"]:
    gcode, _rows = list_names(dt, ["name"])
    log(f"list {dt}: HTTP {gcode}")

proj_get = evidence["http"].get("GET Project")
task_get = evidence["http"].get("GET Task")
if proj_get == 403 or task_get == 403:
    log("NOT READY — PROJECT_TASK_WRITE_DENIED")
    log("anton_required_now: YES — Role Permissions Manager on role Sales Manager")
    Path(artifact_dir, "apply-log.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    raise SystemExit(1)

project_type = None
pt_code, project_types = list_names("Project Type", ["name"])
if pt_code == 200:
    names = [r.get("name") for r in project_types]
    for candidate in ("Internal", "ERP Implementation", "Implementation"):
        if candidate in names:
            project_type = candidate
            break
    log(f"project_type_selected: {project_type or 'none (standard-capability skip)'}")
else:
    log(f"project_type_list: HTTP {pt_code} (non-fatal)")

pc, projects = list_names(
    "Project",
    ["name", "project_name", "status", "customer", "collect_progress"],
    filters=[["project_name", "=", proj_name]],
)
project_id = None
if projects:
    project_id = projects[0].get("name")
    evidence["reused"].append({"doctype": "Project", "name": project_id})
    log(f"reused: Project {project_id}")
else:
    today = datetime.date.today()
    payload = {
        "doctype": "Project",
        "naming_series": cfg["project"]["naming_series"],
        "project_name": proj_name,
        "company": cfg["company"]["name"],
        "percent_complete_method": cfg["project"]["percent_complete_method"],
        "expected_start_date": today.isoformat(),
        "expected_end_date": (today + datetime.timedelta(days=365)).isoformat(),
        "collect_progress": 0,
        "notes": (
            f"{cfg['project']['notes_prefix']} | created={stamp} | "
            "VISION https://github.com/antonvdberg-bit/corpflow-ai-command-center/blob/main/docs/governance/erpnext/VISION_AND_INTENDED_USE.md"
        ),
    }
    if project_type:
        payload["project_type"] = project_type
    pc2, prow = create("Project", payload)
    if pc2 in (200, 201) and isinstance(prow, dict):
        project_id = prow.get("name")

if not project_id:
    log("NOT READY — PROJECT_NOT_VERIFIED")
    Path(artifact_dir, "apply-log.json").write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
    raise SystemExit(1)

_gc, project_row = get_doc("Project", project_id)
evidence["readback"]["project_customer"] = project_row.get("customer")
evidence["readback"]["collect_progress"] = project_row.get("collect_progress")
evidence["readback"]["project_type"] = project_row.get("project_type")
if project_row.get("customer"):
    log("warning: project has a customer; programme should stay internal (left untouched)")
if project_row.get("collect_progress") in (1, True, "1"):
    put_doc("Project", project_id, {"collect_progress": 0})

tc, existing_tasks = list_names(
    "Task",
    ["name", "subject", "status", "is_milestone", "project"],
    filters=[["project", "=", project_id]],
    limit=50,
)
by_subject = {t.get("subject"): t for t in existing_tasks if t.get("subject")}
task_ids = {}
prev = None
today = datetime.date.today()
for spec in task_specs:
    subject = spec["subject"]
    already = by_subject.get(subject)
    if already:
        task_id = already.get("name")
        evidence["reused"].append({"doctype": "Task", "name": task_id, "subject": subject})
        log(f"reused: Task {task_id} {subject}")
    else:
        start = today + datetime.timedelta(days=int(spec["seq"]) * 7)
        finish = start + datetime.timedelta(days=7)
        payload = {
            "doctype": "Task",
            "subject": subject,
            "project": project_id,
            "company": cfg["company"]["name"],
            "is_milestone": 1 if spec.get("is_milestone") else 0,
            "exp_start_date": start.isoformat(),
            "exp_end_date": finish.isoformat(),
            "description": (
                f"Internal #966 programme task. GitHub {', '.join(spec.get('github') or [])}. "
                "ERPNext is the operational record; GitHub is the durable ledger. "
                "No client portal. No external send. TEST-ONLY internal."
            ),
        }
        if prev:
            payload["depends_on"] = [{"task": prev}]
        tc2, trow = create("Task", payload)
        if tc2 in (200, 201) and isinstance(trow, dict):
            task_id = trow.get("name")
        else:
            task_id = None
    if task_id:
        task_ids[spec["id"]] = {"name": task_id, "subject": subject}
        prev = task_id

vision = task_ids.get("vision") or {}
vision_id = vision.get("name")
vision_status = None
if vision_id:
    _vc, vrow = get_doc("Task", vision_id)
    vision_status = vrow.get("status")
    desc = (
        "APPROVED — VERSION 2. Anton 2026-08-14 12:54 +04:00. "
        "Canonical: docs/governance/erpnext/VISION_AND_INTENDED_USE.md. "
        "Approval: GitHub #954 comment 5291438473. Published PR #957. Status PR #961. "
        "Do not rewrite historical #954 comments."
    )
    payload = {"description": desc}
    if str(vision_status or "").lower() != "completed":
        payload["status"] = "Completed"
    put_code, updated = put_doc("Task", vision_id, payload)
    if put_code in (200, 201) and isinstance(updated, dict):
        vision_status = updated.get("status") or vision_status
    if str(vision_status or "").lower() != "completed":
        # Some sites use Closed for done work.
        put_code2, updated2 = put_doc("Task", vision_id, {"status": "Closed"})
        if put_code2 in (200, 201) and isinstance(updated2, dict):
            vision_status = updated2.get("status") or vision_status

# Workstream C — one internal tracked change, then read Version / timeline.
version_proof = False
version_blocker = None
note_line = f"CF966 governance stamp {stamp} | GitHub #966 | INTERNAL append-only proof | do not send"
existing_notes = project_row.get("notes") or ""
if note_line not in existing_notes:
    new_notes = (existing_notes + "\n" + note_line).strip()
    put_doc("Project", project_id, {"notes": new_notes})

v_filters = [["ref_doctype", "=", "Project"], ["docname", "=", project_id]]
v_code, versions = list_names(
    "Version",
    ["name", "ref_doctype", "docname", "creation"],
    filters=v_filters,
    limit=20,
)
evidence["readback"]["version_http"] = v_code
evidence["readback"]["version_count"] = len(versions) if isinstance(versions, list) else 0
if v_code == 200 and versions:
    version_proof = True
    evidence["readback"]["version_names"] = [v.get("name") for v in versions[:5]]
    log(f"version_proof: Version doctype readable count={len(versions)}")
else:
    gd_path = (
        "/api/method/frappe.desk.form.load.getdoc?"
        + urllib.parse.urlencode({"doctype": "Project", "name": project_id})
    )
    gd_code, gd_data = req("GET", gd_path)
    evidence["http"]["GET getdoc Project"] = gd_code
    docinfo = gd_data.get("docinfo") if isinstance(gd_data, dict) else None
    versions2 = []
    if isinstance(docinfo, dict):
        versions2 = docinfo.get("versions") or docinfo.get("version_logs") or []
    if gd_code == 200 and versions2:
        version_proof = True
        evidence["readback"]["getdoc_version_count"] = len(versions2)
        log(f"version_proof: getdoc timeline readable count={len(versions2)}")
    else:
        version_blocker = "VERSION_TRAIL_UNREADABLE"
        log(f"version_proof: unread Version HTTP {v_code} getdoc HTTP {gd_code}")

# Notification / Workflow remain inspect-only.
log(f"notification_list: HTTP {evidence['http'].get('GET Notification')}")
log(f"workflow_list: HTTP {evidence['http'].get('GET Workflow')}")
log("external_sends: not_enabled")

tc, final_tasks = list_names(
    "Task",
    ["name", "subject", "status", "is_milestone"],
    filters=[["project", "=", project_id]],
    limit=50,
)
evidence["readback"]["project_http"] = proj_get
evidence["readback"]["task_http"] = task_get
evidence["readback"]["project_id"] = project_id
evidence["readback"]["task_count"] = len(final_tasks)
evidence["readback"]["tasks"] = [
    {"name": t.get("name"), "subject": t.get("subject"), "status": t.get("status"), "is_milestone": t.get("is_milestone")}
    for t in final_tasks
]
evidence["readback"]["vision_task_id"] = vision_id
evidence["readback"]["vision_task_status"] = vision_status
evidence["readback"]["version_proof"] = version_proof
evidence["readback"]["version_blocker"] = version_blocker
evidence["readback"]["portal_or_email_enabled"] = bool(project_row.get("collect_progress") in (1, True, "1"))

out = Path(artifact_dir) / "apply-log.json"
out.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
log(f"artifact: artifacts/erpnext/governance-programme-966/apply-log.json")
log(f"project: {project_id} tasks: {len(final_tasks)} vision: {vision_id} status={vision_status}")
log(f"version_proof: {version_proof} blocker: {version_blocker or 'none'}")

blockers = []
if not project_id:
    blockers.append("PROJECT_NOT_VERIFIED")
if len(final_tasks) < len(task_specs):
    blockers.append("PROGRAMME_TASKS_INCOMPLETE")
if not vision_id:
    blockers.append("VISION_TASK_MISSING")
if vision_id and str(vision_status or "").lower() not in ("completed", "closed"):
    blockers.append("VISION_TASK_NOT_COMPLETED")

if blockers:
    log(f"NOT READY — {blockers[0]}")
    log("anton_required_now: NO")
    raise SystemExit(1)

if not version_proof:
    log(f"version_capability_gap: {version_blocker or 'VERSION_TRAIL_UNREADABLE'}")
    log("version_capability_gap_action: do not enable site-wide tracking or grant System Manager for this proof")

log("ERP GOVERNANCE RECORD ENVIRONMENT READY")
log("anton_required_now: NO")
PY
apply_ec=$?
exit "$apply_ec"
