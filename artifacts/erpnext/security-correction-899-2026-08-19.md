# #899 fresh Factory Automation probe — 2026-08-19

Presence and HTTP status only. No secret values, no ERPNext hostname, no tokens.

- Cursor agent ID: `bc-c67a9751-28cb-47e6-918a-29a13c213561`
- Cursor agent URL: https://cursor.com/agents/bc-c67a9751-28cb-47e6-918a-29a13c213561
- Factory handoff run: `32233151156`
- Cursor Automation: `CorpFlowAI Factory Wake Proof v2` (`30c07c9d-96f7-11f1-ba66-0e7d0216e441`)
- Command: `bash scripts/erpnext/cursor-cloud-api-probe.sh`
- Mutation: none (GET-only)

```text
ERPNext Cursor Cloud API probe (read-only)
access_path: direct Cursor Cloud secrets → Frappe token auth (no SSH/Infisical runtime bridge)
expected_identity: integrations@corpflowai.com (CorpFlowAI Integration)
ERPNEXT_BASE_URL: present
ERPNEXT_API_KEY: present
ERPNEXT_API_SECRET: present
MASTER_ADMIN_KEY: present (must be absent for ordinary Cursor Cloud execution per #899)
injected_secret_names_checked: ERPNEXT_BASE_URL,ERPNEXT_API_KEY,ERPNEXT_API_SECRET,MASTER_ADMIN_KEY
mutation: forbidden (GET-only)
ERPNEXT_BASE_URL_value: not_printed
auth_uses_master_admin_key: no
runtime_bridge_ssh: no
runtime_bridge_infisical: no
authenticated_user: integrations@corpflowai.com
site_version_metadata: frappe=16.25.0, erpnext=16.26.2
doctype Company: REACHABLE HTTP 200
doctype Customer: REACHABLE HTTP 200
doctype Contact: REACHABLE HTTP 200
doctype Address: REACHABLE HTTP 200
doctype Lead: REACHABLE HTTP 200
doctype Opportunity: REACHABLE HTTP 200
doctype Customer Group: REACHABLE HTTP 200
doctype Territory: REACHABLE HTTP 200
doctype Item: REACHABLE HTTP 200
doctype Item Group: REACHABLE HTTP 200
doctype Item Price: REACHABLE HTTP 200
doctype Price List: REACHABLE HTTP 200
doctype Quotation: REACHABLE HTTP 200
doctype Sales Invoice: REACHABLE HTTP 200
doctype Payment Entry: REACHABLE HTTP 200
doctype Currency: REACHABLE HTTP 200
doctype Terms and Conditions: REACHABLE HTTP 200
doctype Payment Terms: DENIED HTTP 403
doctype File: REACHABLE HTTP 200
doctype Print Format: REACHABLE HTTP 200
doctype Project: REACHABLE HTTP 200
doctype Project Template: REACHABLE HTTP 200
doctype Task: REACHABLE HTTP 200
doctype Issue: REACHABLE HTTP 200
doctype Issue Type: REACHABLE HTTP 200

ERPNext access: PASS
authenticated_user: integrations@corpflowai.com
site_version_metadata: frappe=16.25.0, erpnext=16.26.2
http_auth_status: 200
MASTER_ADMIN_KEY: present
security_correction_#899: INCOMPLETE — MASTER_ADMIN_KEY still injected into this ordinary Cursor Cloud run (UI-only removal required)
exact_blocker: NONE (ERPNext direct API)
```

Canonical evidence: `docs/erpnext/ERPNEXT_CURSOR_CLOUD_SECURITY_CORRECTION_899.md`.
