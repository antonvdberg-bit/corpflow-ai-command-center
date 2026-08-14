#!/usr/bin/env bash
# CorpFlowAI — apply/prove ERPNext Prestige operating foundation (#920).
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
# Creates only synthetic standard records for the Prestige *flow*:
# Lead → Opportunity → Customer/Contact/Address → Item → draft MUR Quotation,
# then attempts Project Template / Project / Task / Issue.
# Does not submit, send, pay, mutate tax/bank, or create Prestige Procurement.
#
# Usage:
#   bash scripts/erpnext/apply-prestige-foundation.sh --dry-run
#   bash scripts/erpnext/apply-prestige-foundation.sh
#
# Exit codes:
#   0 = dry-run OK, or live READY
#   1 = NOT READY / FAIL
#   2 = unexpected script error

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
CONFIG="${ROOT}/config/erpnext-prestige-foundation.v1.json"
ARTIFACT_DIR="${ROOT}/artifacts/erpnext/prestige-foundation-920"
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

CLICK_PATH=$(cat <<'EOF'
Smallest Anton click path (UI-only; no secrets, no schema):
1. ERPNext Desk as Administrator.
2. Home → Users → Role Permissions Manager.
3. Role = Sales Manager (already held by integrations@corpflowai.com).
4. DocType = Project: Read, Create, Write (permlevel 0).
5. DocType = Project Template: Read, Create, Write.
6. DocType = Task: Read, Create, Write.
7. DocType = Issue: Read, Create, Write.
8. DocType = Issue Type: Read, Create, Write.
9. Save. Do not assign System Manager. Do not change Role Profile Accounts.
10. Re-run: bash scripts/erpnext/apply-prestige-foundation.sh
Why: list/create of Project, Project Template, Task, Issue, Issue Type returned HTTP 403.
Standard pattern matches #881: grant onto a role the integration identity already holds.
EOF
)

print_header() {
  log "ERPNext Prestige foundation apply (#920)"
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
  log "synthetic_customer: CF920 Synthetic Website Project Ltd"
  log "forbidden_live_client: Prestige Procurement"
  log "item: CF-WS-CUSTOM-PROJECT (no list price; not Website Rescue T1)"
}

print_header

if [[ "$DRY_RUN" == "1" ]]; then
  log "mode: dry-run (no ERPNext call)"
  log "planned: Lead + Opportunity + Customer/Contact/Address + Item Group/Item + draft MUR Quotation"
  log "planned_attempt: 12-phase Project Template + Project + Task deps/dates + Timesheet Project/Task link + Issue Type/Issue (search-before-create)"
  log "ERPNext Prestige foundation: DRY-RUN"
  exit 0
fi

missing=()
[[ -z "${ERPNEXT_BASE_URL:-}" ]] && missing+=("ERPNEXT_BASE_URL")
[[ -z "${ERPNEXT_API_KEY:-}" ]] && missing+=("ERPNEXT_API_KEY")
[[ -z "${ERPNEXT_API_SECRET:-}" ]] && missing+=("ERPNEXT_API_SECRET")
if ((${#missing[@]} > 0)); then
  log "ERPNext Prestige foundation NOT READY — missing injected secrets: ${missing[*]}"
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
evidence = {
    "schema": "corpflow.erpnext.prestige_foundation_apply.v1",
    "issue": 920,
    "generated_at_utc": datetime.datetime.now(datetime.UTC).replace(microsecond=0).isoformat().replace("+00:00", "Z"),
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

code, data = req("GET", "/api/method/frappe.auth.get_logged_user")
user = data.get("message") if isinstance(data, dict) else ""
evidence["identity"] = user
log(f"authenticated_user: {user}")
log(f"http_auth_status: {code}")
if code != 200:
    log("ERPNext Prestige foundation NOT READY — authentication failed")
    raise SystemExit(1)

roles_code, roles_data = req("POST", "/api/method/frappe.core.doctype.user.user.get_roles", {})
roles = roles_data.get("message") if isinstance(roles_data, dict) else []
log(f"roles: {', '.join(roles) if isinstance(roles, list) else 'unread'}")

# Phase 1 — commercial foundation read-back
c_code, company = req("GET", "/api/resource/Company/" + enc("CorpFlowAI LTD"))
company_row = company.get("data") if c_code == 200 else {}
log(
    "company: {name} currency={cur} tax_id={tax} letter_head={lh} email={email}".format(
        name=company_row.get("name"),
        cur=company_row.get("default_currency"),
        tax=company_row.get("tax_id"),
        lh=company_row.get("default_letter_head"),
        email=company_row.get("email"),
    )
)
company_ok = (
    company_row.get("default_currency") == "MUR"
    and company_row.get("tax_id") == "28466939"
    and "C25228280" in str(company_row.get("registration_details") or "")
)
evidence["readback"]["company_currency_mur"] = company_ok
if not company_ok:
    log("ERPNext Prestige foundation NOT READY — Company identity/currency mismatch")
    raise SystemExit(1)

pl_code, price_lists = list_names(
    "Price List",
    ["name", "currency", "selling", "enabled"],
)
pl_names = {row.get("name"): row for row in price_lists}
mur_pl = pl_names.get("Standard Selling") or {}
usd_pl = pl_names.get("Standard Selling USD") or {}
mur_ok = mur_pl.get("currency") == "MUR" and mur_pl.get("selling") == 1
usd_ok = usd_pl.get("currency") == "USD" and usd_pl.get("selling") == 1
log(f"price_list_mur: {'ok' if mur_ok else 'MISSING'} currency={mur_pl.get('currency')}")
log(f"price_list_usd: {'ok' if usd_ok else 'MISSING'} currency={usd_pl.get('currency')}")
evidence["readback"]["mur_price_list_ok"] = mur_ok
evidence["readback"]["usd_price_list_ok"] = usd_ok
if not mur_ok or not usd_ok:
    log("ERPNext Prestige foundation NOT READY — selling Price Lists incomplete")
    raise SystemExit(1)

lh_code, letter_heads = list_names("Letter Head", ["name"])
log(f"letter_heads: {[r.get('name') for r in letter_heads]}")
evidence["readback"]["letter_head"] = "Company Letterhead - Grey" in [r.get("name") for r in letter_heads]

syn = cfg["synthetic"]
item_spec = cfg["item"]
customer_name = syn["customer"]
if customer_name == "Prestige Procurement":
    log("refusing live Prestige customer name")
    raise SystemExit(1)

# Item group + item (no list price)
ig_code, groups = list_names("Item Group", ["name", "parent_item_group"])
if not any(g.get("name") == item_spec["item_group"] for g in groups):
    create("Item Group", {
        "doctype": "Item Group",
        "item_group_name": item_spec["item_group"],
        "parent_item_group": item_spec["parent_item_group"],
        "is_group": 0,
    })
else:
    evidence["reused"].append({"doctype": "Item Group", "name": item_spec["item_group"]})
    log(f"reused: Item Group {item_spec['item_group']}")

it_code, items = list_names("Item", ["name", "item_code", "item_group", "stock_uom"])
if not any(i.get("item_code") == item_spec["item_code"] for i in items):
    ic, irow = create("Item", {
        "doctype": "Item",
        "item_code": item_spec["item_code"],
        "item_name": item_spec["item_name"],
        "item_group": item_spec["item_group"],
        "stock_uom": item_spec["stock_uom"],
        "is_stock_item": 0,
        "is_sales_item": 1,
        "is_purchase_item": 0,
        "include_item_in_manufacturing": 0,
        "description": (
            "SYNTHETIC / standard service item for one-off custom website projects. "
            "Rate is quotation-time. Not Website Rescue T1. Not a Prestige list price. GitHub #920."
        ),
    })
    if ic not in (200, 201):
        log("ERPNext Prestige foundation NOT READY — custom website Item create failed")
        raise SystemExit(1)
else:
    evidence["reused"].append({"doctype": "Item", "name": item_spec["item_code"]})
    log(f"reused: Item {item_spec['item_code']}")
evidence["readback"]["item_ok"] = True

# Do not create Item Price for this SKU.
ip_code, prices = list_names(
    "Item Price",
    ["name", "item_code", "price_list", "price_list_rate"],
    filters=[["item_code", "=", item_spec["item_code"]]],
)
if prices:
    log(f"item_price_unexpected: {len(prices)} rows on {item_spec['item_code']} (left untouched)")
else:
    log("item_price: none for CF-WS-CUSTOM-PROJECT (expected)")

# Phase 2 — CRM synthetic path
lead_code, leads = list_names(
    "Lead",
    ["name", "lead_name", "company_name", "email_id", "status"],
    filters=[["email_id", "=", syn["contact_email"]]],
)
lead_name = None
if leads:
    lead_name = leads[0].get("name")
    evidence["reused"].append({"doctype": "Lead", "name": lead_name})
    log(f"reused: Lead {lead_name}")
else:
    lc, lrow = create("Lead", {
        "doctype": "Lead",
        "first_name": "Alex",
        "last_name": "Synthetic",
        "lead_name": "Alex Synthetic",
        "company_name": syn["lead_company"],
        "email_id": syn["contact_email"],
        "status": "Open",
        "type": "Client",
        "territory": syn["territory"],
    })
    if lc not in (200, 201) or not isinstance(lrow, dict):
        log("ERPNext Prestige foundation NOT READY — Lead create failed")
        raise SystemExit(1)
    lead_name = lrow.get("name")

opp_code, opps = list_names(
    "Opportunity",
    ["name", "party_name", "opportunity_from", "status", "title"],
    filters=[["party_name", "=", lead_name]],
)
opp_name = None
if opps:
    opp_name = opps[0].get("name")
    evidence["reused"].append({"doctype": "Opportunity", "name": opp_name})
    log(f"reused: Opportunity {opp_name}")
else:
    oc, orow = create("Opportunity", {
        "doctype": "Opportunity",
        "naming_series": "CRM-OPP-.YYYY.-",
        "opportunity_from": "Lead",
        "party_name": lead_name,
        "opportunity_type": "Sales",
        "status": "Open",
        "company": "CorpFlowAI LTD",
        "transaction_date": datetime.date.today().isoformat(),
        "currency": "MUR",
        "conversion_rate": 1,
        "title": "CF920 synthetic custom website",
    })
    if oc not in (200, 201) or not isinstance(orow, dict):
        log("ERPNext Prestige foundation NOT READY — Opportunity create failed")
        raise SystemExit(1)
    opp_name = orow.get("name")

cust_code, customers = list_names(
    "Customer",
    ["name", "customer_name", "default_currency", "disabled", "lead_name"],
    filters=[["customer_name", "=", customer_name]],
)
customer_id = None
enabled = [c for c in customers if not c.get("disabled")]
if enabled:
    customer_id = enabled[0].get("name")
    evidence["reused"].append({"doctype": "Customer", "name": customer_id})
    log(f"reused: Customer {customer_id}")
else:
    cc, crow = create("Customer", {
        "doctype": "Customer",
        "customer_name": customer_name,
        "customer_type": "Company",
        "customer_group": syn["customer_group"],
        "territory": syn["territory"],
        "default_currency": "MUR",
        "default_price_list": "Standard Selling",
        "lead_name": lead_name,
        "customer_details": (
            "corpflow.prestige_foundation.v1 | issue=920 | synthetic=true | "
            "TEST-ONLY DO NOT SEND | not Prestige Procurement"
        ),
    })
    if cc not in (200, 201) or not isinstance(crow, dict):
        log("ERPNext Prestige foundation NOT READY — Customer create failed")
        raise SystemExit(1)
    customer_id = crow.get("name")

# Contact
ct_code, contacts = list_names(
    "Contact",
    ["name", "email_id", "company_name"],
    filters=[["email_id", "=", syn["contact_email"]]],
)
contact_id = None
if contacts:
    contact_id = contacts[0].get("name")
    evidence["reused"].append({"doctype": "Contact", "name": contact_id})
    log(f"reused: Contact {contact_id}")
else:
    ctc, ctrow = create("Contact", {
        "doctype": "Contact",
        "first_name": "Alex",
        "last_name": "Synthetic",
        "company_name": customer_id,
        "status": "Open",
        "is_primary_contact": 1,
        "is_billing_contact": 1,
        "email_id": syn["contact_email"],
        "email_ids": [{"email_id": syn["contact_email"], "is_primary": 1}],
        "links": [{"link_doctype": "Customer", "link_name": customer_id}],
    })
    if ctc in (200, 201) and isinstance(ctrow, dict):
        contact_id = ctrow.get("name")
    else:
        log("contact create failed (non-fatal if Customer exists)")

# Address
ad_code, addresses = list_names(
    "Address",
    ["name", "address_title", "address_type"],
    filters=[["address_title", "=", customer_id]],
)
address_id = None
if addresses:
    address_id = addresses[0].get("name")
    evidence["reused"].append({"doctype": "Address", "name": address_id})
    log(f"reused: Address {address_id}")
else:
    ac, arow = create("Address", {
        "doctype": "Address",
        "address_title": customer_id,
        "address_type": "Billing",
        "address_line1": syn["address_line1"],
        "city": syn["city"],
        "country": syn["country"],
        "is_primary_address": 1,
        "is_shipping_address": 1,
        "links": [{"link_doctype": "Customer", "link_name": customer_id}],
    })
    if ac in (200, 201) and isinstance(arow, dict):
        address_id = arow.get("name")

if contact_id or address_id:
    req("PUT", f"/api/resource/Customer/{enc(customer_id)}", {
        "customer_primary_contact": contact_id,
        "customer_primary_address": address_id,
    })

# Draft MUR quotation — never submit; never use sprint SKU or 285000
qt_code, quotes = list_names(
    "Quotation",
    ["name", "party_name", "currency", "grand_total", "docstatus", "status"],
    filters=[["party_name", "=", customer_id]],
)
quote_id = None
existing_draft = next((q for q in quotes if q.get("docstatus") == 0), None)
if existing_draft:
    quote_id = existing_draft.get("name")
    evidence["reused"].append({"doctype": "Quotation", "name": quote_id})
    log(f"reused: Quotation {quote_id} docstatus={existing_draft.get('docstatus')}")
else:
    schedule = "; ".join(cfg.get("payment_schedule_text") or [])
    qc, qrow = create("Quotation", {
        "doctype": "Quotation",
        "quotation_to": "Customer",
        "party_name": customer_id,
        "company": "CorpFlowAI LTD",
        "currency": "MUR",
        "conversion_rate": 1,
        "selling_price_list": "Standard Selling",
        "order_type": "Sales",
        "letter_head": "Company Letterhead - Grey",
        "tc_name": "CF882 CorpFlowAI Commercial Terms",
        "terms": (
            "SYNTHETIC CF920 foundation proof. Not Prestige commercial pricing. "
            f"Proposed payment shape if later approved: {schedule}. "
            "TEST-ONLY DO NOT SEND. Do not submit."
        ),
        "items": [{
            "item_code": item_spec["item_code"],
            "qty": 1,
            "rate": syn["quotation_rate_mur"],
            "description": (
                "SYNTHETIC CF920 custom website foundation proof. "
                "Not Website Rescue T1. Not MUR 285000 Prestige recommendation."
            ),
        }],
    })
    if qc not in (200, 201) or not isinstance(qrow, dict):
        log("ERPNext Prestige foundation NOT READY — draft MUR Quotation failed")
        raise SystemExit(1)
    quote_id = qrow.get("name")
    if int(qrow.get("docstatus") or 0) != 0:
        log("ERPNext Prestige foundation NOT READY — quotation was not left draft")
        raise SystemExit(1)

evidence["readback"]["crm_ok"] = bool(lead_name and opp_name and customer_id)
evidence["readback"]["quotation_draft"] = bool(quote_id)
evidence["readback"]["ids"] = {
    "lead": lead_name,
    "opportunity": opp_name,
    "customer": customer_id,
    "contact": contact_id,
    "address": address_id,
    "quotation": quote_id,
    "item": item_spec["item_code"],
}

def get_doc(dt, name):
    code, data = req("GET", f"/api/resource/{enc(dt)}/{enc(name)}")
    evidence["http"][f"GET {dt}/{name}"] = code
    row = data.get("data") if code == 200 and isinstance(data, dict) else None
    return code, row if isinstance(row, dict) else {}

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

# Phase 3/4 — Project / Task / Issue after Sales Manager grant
for dt in ["Project", "Project Template", "Task", "Issue", "Issue Type", "Employee", "Activity Type", "Workflow", "Notification"]:
    gcode, _rows = list_names(dt, ["name"])
    log(f"list {dt}: HTTP {gcode}")

proj_get = evidence["http"].get("GET Project")
task_get = evidence["http"].get("GET Task")
pt_get = evidence["http"].get("GET Project Template")
issue_get = evidence["http"].get("GET Issue")
issue_type_get = evidence["http"].get("GET Issue Type")
permission_blocked = 403 in (proj_get, task_get, pt_get, issue_get, issue_type_get)

template_task_ids = []
project_id = None
project_template_id = None
issue_id = None
issue_type_id = None
project_task_ids = []
timesheet_id = None
timesheet_linked = False

if permission_blocked:
    # Keep a single probe create so the 403 is recorded, then stop mutating.
    create("Task", {
        "doctype": "Task",
        "subject": "CF920 Discovery & requirements confirmation",
        "description": "Permission probe. GitHub #920. TEST-ONLY.",
    })
    create("Project Template", {
        "doctype": "Project Template",
        "name": syn["project_template"],
        "tasks": [{"subject": "placeholder"}],
    })
    create("Project", {
        "doctype": "Project",
        "naming_series": "PROJ-.####",
        "project_name": syn["project_name"],
        "company": "CorpFlowAI LTD",
        "customer": customer_id,
    })
    create("Issue", {
        "doctype": "Issue",
        "subject": syn["issue_subject"],
        "customer": customer_id,
        "description": "Permission probe. GitHub #920. TEST-ONLY.",
    })
else:
    issue_type_name = "CF920 Website Support"
    it_code, issue_types = list_names("Issue Type", ["name"], filters=[["name", "=", issue_type_name]])
    if issue_types:
        issue_type_id = issue_types[0].get("name")
        evidence["reused"].append({"doctype": "Issue Type", "name": issue_type_id})
        log(f"reused: Issue Type {issue_type_id}")
    else:
        ic, irow = create("Issue Type", {
            "doctype": "Issue Type",
            "name": issue_type_name,
            "description": "Synthetic #920 website-support type. TEST-ONLY. Not a live Prestige queue.",
        })
        if ic in (200, 201) and isinstance(irow, dict):
            issue_type_id = irow.get("name") or issue_type_name
        else:
            log("Issue Type create failed (Issue may still be created without type)")

    prev_template_task = None
    for spec in cfg["project_template_tasks"]:
        subject = f"CF920 {spec['subject']}"
        t_code, existing_tasks = list_names(
            "Task",
            ["name", "subject", "is_template", "project"],
            filters=[["subject", "=", subject], ["is_template", "=", 1]],
        )
        task_id = None
        if existing_tasks:
            task_id = existing_tasks[0].get("name")
            evidence["reused"].append({"doctype": "Task", "name": task_id})
            log(f"reused: template Task {task_id} {subject}")
        else:
            payload = {
                "doctype": "Task",
                "subject": subject,
                "description": f"GitHub #920 synthetic template task {spec['seq']}. TEST-ONLY.",
                "is_template": 1,
                "is_milestone": 1 if spec.get("milestone") else 0,
                "start": (int(spec["seq"]) - 1) * 5,
                "duration": 5,
                "company": "CorpFlowAI LTD",
            }
            if prev_template_task:
                payload["depends_on"] = [{"task": prev_template_task}]
            tc, trow = create("Task", payload)
            if tc in (200, 201) and isinstance(trow, dict):
                task_id = trow.get("name")
        if task_id:
            template_task_ids.append({"seq": spec["seq"], "name": task_id, "subject": subject, "milestone": bool(spec.get("milestone"))})
            prev_template_task = task_id

    pt_name = syn["project_template"]
    ptc, templates = list_names("Project Template", ["name"], filters=[["name", "=", pt_name]])
    if templates:
        project_template_id = templates[0].get("name")
        evidence["reused"].append({"doctype": "Project Template", "name": project_template_id})
        log(f"reused: Project Template {project_template_id}")
    elif template_task_ids:
        ptc2, ptrow = create("Project Template", {
            "doctype": "Project Template",
            "name": pt_name,
            "tasks": [{"task": row["name"]} for row in template_task_ids],
        })
        if ptc2 in (200, 201) and isinstance(ptrow, dict):
            project_template_id = ptrow.get("name") or pt_name

    today = datetime.date.today()
    end = today + datetime.timedelta(days=60)
    pc, projects = list_names(
        "Project",
        ["name", "project_name", "customer", "status"],
        filters=[["project_name", "=", syn["project_name"]]],
    )
    if projects:
        project_id = projects[0].get("name")
        evidence["reused"].append({"doctype": "Project", "name": project_id})
        log(f"reused: Project {project_id}")
    else:
        payload = {
            "doctype": "Project",
            "naming_series": "PROJ-.####",
            "project_name": syn["project_name"],
            "company": "CorpFlowAI LTD",
            "customer": customer_id,
            "percent_complete_method": "Task Completion",
            "expected_start_date": today.isoformat(),
            "expected_end_date": end.isoformat(),
            "notes": "GitHub #920 synthetic project. TEST-ONLY. Not Prestige Procurement.",
        }
        if project_template_id:
            payload["project_template"] = project_template_id
        pc2, prow = create("Project", payload)
        if pc2 in (200, 201) and isinstance(prow, dict):
            project_id = prow.get("name")

    if project_id:
        _gc, project_row = get_doc("Project", project_id)
        evidence["readback"]["project_customer"] = project_row.get("customer")
        evidence["readback"]["project_template_on_project"] = project_row.get("project_template")
        tc, project_tasks = list_names(
            "Task",
            ["name", "subject", "is_milestone", "exp_start_date", "exp_end_date", "depends_on_tasks", "is_template"],
            filters=[["project", "=", project_id]],
            limit=50,
        )
        project_task_ids = [t.get("name") for t in project_tasks if t.get("name")]
        if len(project_task_ids) < 12:
            prev = None
            for spec in cfg["project_template_tasks"]:
                subject = f"CF920 {spec['subject']}"
                already = next((t for t in project_tasks if t.get("subject") == subject), None)
                if already:
                    prev = already.get("name")
                    continue
                start = today + datetime.timedelta(days=(int(spec["seq"]) - 1) * 5)
                finish = start + datetime.timedelta(days=5)
                payload = {
                    "doctype": "Task",
                    "subject": subject,
                    "project": project_id,
                    "company": "CorpFlowAI LTD",
                    "is_milestone": 1 if spec.get("milestone") else 0,
                    "exp_start_date": start.isoformat(),
                    "exp_end_date": finish.isoformat(),
                    "expected_time": 8,
                    "description": f"GitHub #920 synthetic project task {spec['seq']}. TEST-ONLY.",
                }
                if prev:
                    payload["depends_on"] = [{"task": prev}]
                tc2, trow = create("Task", payload)
                if tc2 in (200, 201) and isinstance(trow, dict):
                    prev = trow.get("name")
                    project_task_ids.append(prev)
            tc, project_tasks = list_names(
                "Task",
                ["name", "subject", "is_milestone", "exp_start_date", "exp_end_date", "depends_on_tasks"],
                filters=[["project", "=", project_id]],
                limit=50,
            )
            project_task_ids = [t.get("name") for t in project_tasks if t.get("name")]
        evidence["readback"]["project_tasks"] = [
            {
                "name": t.get("name"),
                "subject": t.get("subject"),
                "is_milestone": t.get("is_milestone"),
                "exp_start_date": t.get("exp_start_date"),
                "exp_end_date": t.get("exp_end_date"),
                "depends_on_tasks": t.get("depends_on_tasks"),
            }
            for t in project_tasks
        ]

    # Timesheet: reuse the existing draft probe and link Project/Task. Do not submit.
    ts_code, timesheets = list_names(
        "Timesheet",
        ["name", "docstatus", "parent_project"],
        filters=[["name", "=", "TS-2026-00001"]],
    )
    first_project_task = project_task_ids[0] if project_task_ids else None
    if timesheets and project_id:
        timesheet_id = timesheets[0].get("name")
        _tsc, ts_row = get_doc("Timesheet", timesheet_id)
        logs = ts_row.get("time_logs") or []
        if logs:
            logs[0]["project"] = project_id
            if first_project_task:
                logs[0]["task"] = first_project_task
            logs[0]["is_billable"] = 0
        ptc, updated = put_doc("Timesheet", timesheet_id, {
            "parent_project": project_id,
            "customer": customer_id,
            "time_logs": logs,
        })
        if ptc in (200, 201) and isinstance(updated, dict):
            log0 = (updated.get("time_logs") or [{}])[0]
            timesheet_linked = bool(updated.get("parent_project") == project_id and log0.get("project") == project_id)
            evidence["readback"]["timesheet_parent_project"] = updated.get("parent_project")
            evidence["readback"]["timesheet_task"] = log0.get("task")
            evidence["readback"]["timesheet_docstatus"] = updated.get("docstatus")
    elif project_id:
        tsc, tsrow = create("Timesheet", {
            "doctype": "Timesheet",
            "naming_series": "TS-.YYYY.-",
            "company": "CorpFlowAI LTD",
            "customer": customer_id,
            "parent_project": project_id,
            "time_logs": [{
                "activity_type": "Execution",
                "hours": 1,
                "project": project_id,
                "task": first_project_task,
                "description": "CF920 synthetic timesheet. TEST-ONLY. Do not bill.",
                "is_billable": 0,
            }],
        })
        if tsc in (200, 201) and isinstance(tsrow, dict):
            timesheet_id = tsrow.get("name")
            log0 = (tsrow.get("time_logs") or [{}])[0]
            timesheet_linked = bool(tsrow.get("parent_project") == project_id and log0.get("project") == project_id)
            evidence["readback"]["timesheet_parent_project"] = tsrow.get("parent_project")
            evidence["readback"]["timesheet_task"] = log0.get("task")
            evidence["readback"]["timesheet_docstatus"] = tsrow.get("docstatus")
    evidence["readback"]["timesheet_create_http"] = evidence["http"].get("PUT Timesheet") or evidence["http"].get("POST Timesheet")

    isc, issues = list_names(
        "Issue",
        ["name", "subject", "customer", "project", "status", "issue_type"],
        filters=[["subject", "=", syn["issue_subject"]]],
    )
    if issues:
        issue_id = issues[0].get("name")
        evidence["reused"].append({"doctype": "Issue", "name": issue_id})
        log(f"reused: Issue {issue_id}")
    else:
        payload = {
            "doctype": "Issue",
            "subject": syn["issue_subject"],
            "customer": customer_id,
            "description": "GitHub #920 synthetic support Issue. TEST-ONLY. Not a live client ticket.",
            "status": "Open",
            "priority": "Medium",
            "company": "CorpFlowAI LTD",
        }
        if project_id:
            payload["project"] = project_id
        if issue_type_id:
            payload["issue_type"] = issue_type_id
        ic2, irow = create("Issue", payload)
        if ic2 in (200, 201) and isinstance(irow, dict):
            issue_id = irow.get("name")
    if issue_id:
        _ic, issue_row = get_doc("Issue", issue_id)
        evidence["readback"]["issue_status"] = issue_row.get("status")
        evidence["readback"]["issue_customer"] = issue_row.get("customer")
        evidence["readback"]["issue_project"] = issue_row.get("project")
        evidence["readback"]["issue_type"] = issue_row.get("issue_type")
        evidence["readback"]["issue_via_customer_portal"] = issue_row.get("via_customer_portal")

# Fill GET codes into evidence for the mapper
evidence["readback"]["project_http"] = proj_get
evidence["readback"]["project_template_http"] = pt_get
evidence["readback"]["task_http"] = task_get
evidence["readback"]["issue_http"] = issue_get
evidence["readback"]["issue_type_http"] = issue_type_get
evidence["readback"]["timesheet_project_linked"] = timesheet_linked
evidence["readback"]["project_task_count"] = len(project_task_ids)
ids = evidence["readback"].get("ids") or {}
ids.update({
    "lead": lead_name,
    "opportunity": opp_name,
    "customer": customer_id,
    "contact": contact_id,
    "address": address_id,
    "quotation": quote_id,
    "item": item_spec["item_code"],
    "project": project_id,
    "project_template": project_template_id,
    "issue": issue_id,
    "issue_type": issue_type_id,
    "timesheet": timesheet_id or "TS-2026-00001",
    "template_tasks": [row["name"] for row in template_task_ids],
    "project_tasks": project_task_ids,
})
evidence["readback"]["ids"] = ids

# Phase 5 — notifications remain inspect-only / disabled
log(f"workflow_list: HTTP {evidence['http'].get('GET Workflow')}")
log(f"notification_list: HTTP {evidence['http'].get('GET Notification')}")
log("external_sends: not_enabled")
log("customer_portal: Issue.via_customer_portal read-back only; ERPNext portal not enabled")

rb = evidence["readback"]
blockers = []
if rb.get("project_http") == 403 or rb.get("task_http") == 403 or rb.get("project_template_http") == 403:
    blockers.append("PROJECT_TASK_WRITE_DENIED")
if rb.get("issue_http") == 403 or rb.get("issue_type_http") == 403:
    blockers.append("ISSUE_WRITE_DENIED")
if not blockers:
    if not project_id:
        blockers.append("PROJECT_NOT_VERIFIED")
    if not project_template_id:
        blockers.append("PROJECT_TEMPLATE_NOT_VERIFIED")
    if len(project_task_ids) < 12:
        blockers.append("PROJECT_TASKS_INCOMPLETE")
    if not issue_id:
        blockers.append("ISSUE_NOT_VERIFIED")
    if timesheet_linked is False:
        blockers.append("TIMESHEET_PROJECT_LINK_FAILED")

out = Path(artifact_dir) / "apply-log.json"
out.write_text(json.dumps(evidence, indent=2) + "\n", encoding="utf-8")
log(f"artifact: artifacts/erpnext/prestige-foundation-920/apply-log.json")
log(f"crm_ok: {rb.get('crm_ok')} quotation: {quote_id} item: {item_spec['item_code']}")
log(f"project: {project_id} template: {project_template_id} project_tasks: {len(project_task_ids)}")
log(f"issue: {issue_id} issue_type: {issue_type_id} timesheet_linked: {timesheet_linked}")
log(f"project_http: {rb.get('project_http')} task_http: {rb.get('task_http')} issue_http: {rb.get('issue_http')}")

if "PROJECT_TASK_WRITE_DENIED" in blockers or "ISSUE_WRITE_DENIED" in blockers:
    log("ERPNext PRESTIGE FOUNDATION NOT READY — Project/Task/Issue Role Permission grant is UI-only")
    log("anton_required_now: YES — Role Permissions Manager on role Sales Manager")
    raise SystemExit(1)

if blockers:
    log(f"ERPNext PRESTIGE FOUNDATION NOT READY — {blockers[0]}")
    log("anton_required_now: NO")
    raise SystemExit(1)

log("ERPNext PRESTIGE FOUNDATION READY")
log("anton_required_now: NO")
PY
apply_ec=$?
if [[ "$apply_ec" -ne 0 ]]; then
  log ""
  log "${CLICK_PATH}"
fi
exit "$apply_ec"
