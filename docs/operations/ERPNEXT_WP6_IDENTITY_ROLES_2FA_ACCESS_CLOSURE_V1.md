# ERPNext WP6 — identity, roles, 2FA and least-privilege access closure v1

**Status:** Decision-ready closure of remaining WP6 access-control evidence. **No identity or permission mutation.**  
**Date (UTC):** 2026-08-20  
**Source issue:** [#1019](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1019)  
**Parent programme:** [#953](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/953)  
**Security/access baseline (do not redo):** [#899](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/899), [#956](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/956) / [PR #958](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/958), [#1010](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1010) / [PR #1011](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1011)  
**Owner:** Anton (exact protected actions); Cursor Factory (this refresh)  
**Cursor agent ID:** `bc-9ed5377c-e753-4e20-806f-47a51e54221b`  
**Cursor agent URL:** https://cursor.com/agents/bc-9ed5377c-e753-4e20-806f-47a51e54221b  
**Factory handoff run:** `32322775166`  
**Anchor:** `<!-- ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1 -->`

<!-- ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1019
```

**Environment classification:** this packet is docs + read-only live probe. Surfaces inspected are CorpFlowAI-hosted **`corpflow_test`** plus the **vendor-hosted ERPNext** used for commercial test work. None of those are `client_production`.

**NO IMPLEMENTATION AUTHORIZED** beyond this closure record and the joiner/mover/leaver runbook. This document does **not** authorize credential resets, secret changes, new users, role/permission mutation, 2FA enablement, provider account changes, schema/custom DocTypes, DB mutation, package upgrade, payment, external send, public launch, or merge.

Marks used here (issue #1019 vocabulary):

| Mark | Meaning |
|------|---------|
| **PROVEN** | Independent evidence from this run’s read-only probe and/or current governance docs, dated. |
| **REQUIRES PROTECTED ACTION — \<one exact action\>** | Ordinary discovery is complete. The next step is one named consequential operator/provider action. |

This packet does **not** reopen the broad #956 inventory. `#899` is **not** re-investigated; `MASTER_ADMIN_KEY` presence on this run is incidental only. No regression was observed (the name is **absent**).

---

## 0. Executive verdict

```text
WP6 ACCESS CONTROL CLOSURE READY FOR REVIEW
```

That verdict means every required WP6 control is classified. It does **not** mean privileged 2FA, login policy, or Administrator ownership are live-proven.

| # | Control | Mark |
|---|---------|------|
| 1 | Authenticated integration identity + non-secret role/permission summary | **PROVEN** |
| 2 | Least-privilege vs approved bridge work (findings reported; no mutation) | **PROVEN** |
| 3 | Administrator / System Manager account inventory and ownership | **REQUIRES PROTECTED ACTION — Anton opens ERPNext desk as Administrator → Users and Permissions → User, records which accounts hold Administrator and System Manager (count + ownership in the operator vault; do not paste personal emails into git), and confirms the Frappe Cloud site owner** |
| 4 | 2FA state for privileged users | **REQUIRES PROTECTED ACTION — Anton opens ERPNext desk as Administrator → Settings → System Settings → Security and records whether Two Factor Auth is enabled; then opens each privileged User and records 2FA enrolled yes/no** |
| 5 | Password / login-attempt / session controls | **REQUIRES PROTECTED ACTION — Anton opens the same System Settings → Security tab and records consecutive-login, session-expiry, deny-multiple-sessions, and password-policy values (names/on-off only; no secrets)** |
| 6 | `MASTER_ADMIN_KEY` absent on this fresh worker | **PROVEN** (absent; incidental; #899 not reopened) |
| 7 | Joiner / mover / leaver owner + runbook | **PROVEN** |
| 8 | Control / evidence registers updated where state changed | **PROVEN** |

Prestige fast lane is **not** blocked by this packet.

---

## 1. What this packet reused (not redone)

| Source | Reused as |
|--------|-----------|
| #899 / PR #1000 | Direct Frappe token path; `integrations@corpflowai.com`; do not use `MASTER_ADMIN_KEY` as ERPNext auth |
| #956 / PR #958 | Privileged 2FA / System Settings unread (403); least-privilege containment |
| #1010 / PR #1011 | Fresh 2026-08-20 incidental `MASTER_ADMIN_KEY` **absent**; vendor-hosted family; do not reopen backup/patch inventory |
| #881 catalogue | Historical Accounts role-profile set; Item Price grant already applied |
| #920 / PR #944 | Sales Manager grant for Project / Task / Issue — keep; do not add System Manager |

---

## 2. Live / read-only evidence this run (2026-08-20)

Command: `bash scripts/erpnext/wp6-access-control-probe.sh`  
Artifact: `artifacts/erpnext/wp6-access-1019/probe-log.txt`  
Identity: `integrations@corpflowai.com`  
Host family: `vendor_hosted_frappe_family` (hostname not recorded)

```text
authenticated_user: integrations@corpflowai.com
identity_match_expected: yes
http_auth_status: 200
frappe=16.25.0 erpnext=16.26.2 email_delivery_service=0.0.1 branch=HEAD
own_user_doc: HTTP 200 (role child table unread; role_profile none on GET)
get_roles_get: HTTP 200
own_roles (effective): Accounts Manager, Accounts User, All, Desk User, Guest, Item Manager, Purchase Manager, Purchase User, Sales Manager, Sales User, Stock Manager, Stock User
own_holds_administrator: no
own_holds_system_manager: no
System Settings list HTTP 500 / doc HTTP 403
Role / Has Role / DocPerm / Custom DocPerm / Role Profile / User Permission HTTP 403
Activity Log / Error Log / Version / Scheduled Job Type HTTP 403
user_list HTTP 200 — 2 enabled rows; user_type empty on list; other usernames not printed
has_role_system_manager HTTP 403
has_role_administrator HTTP 403
Customer, Contact, Address, Lead, Opportunity, Item, Item Price, Price List, Quotation, Project, Task, Issue: HTTP 200
Payment Terms: HTTP 403
MASTER_ADMIN_KEY: absent
ADMIN_PIN: absent
mutation: none
secret values printed: no
other usernames printed: no
```

---

## 3. Control close-out

### 1. Integration identity and roles — **PROVEN**

| Field | This run |
|-------|----------|
| Authenticated user | `integrations@corpflowai.com` |
| Auth | HTTP 200 `frappe.auth.get_logged_user` |
| Effective roles (`get_roles` GET) | `Accounts Manager`, `Accounts User`, `All`, `Desk User`, `Guest`, `Item Manager`, `Purchase Manager`, `Purchase User`, `Sales Manager`, `Sales User`, `Stock Manager`, `Stock User` |
| Administrator | **no** |
| System Manager | **no** |
| User document GET | HTTP 200; `roles` child and `role_profile_name` unread on this identity (field-level). Effective roles come from `get_roles`. |

Roles relevant to the approved bridge work (Customer, Contact, Address, Lead, Opportunity, Item/Price, Quotation, Project/Task, Issue):

| Area | Effective access this run | Notes |
|------|---------------------------|-------|
| Customer / Contact / Address | GET HTTP 200 | WP1 Customer bridge path |
| Lead / Opportunity | GET HTTP 200 | CRM on-ramp used by #920 |
| Item / Item Price / Price List | GET HTTP 200 | #881 catalogue; Item Price was 403 before the Desk grant |
| Quotation | GET HTTP 200 | Draft commercial path |
| Project / Task / Issue | GET HTTP 200 | #920 Sales Manager grant |
| Payment Terms | GET HTTP 403 | Unchanged containment |
| Role / DocPerm / System Settings | HTTP 403 | Cannot self-grant |

### 2. Least-privilege vs approved bridge work — **PROVEN**

The integration identity is **not** Administrator and **not** System Manager. It cannot read Role, Has Role, DocPerm, Custom DocPerm, Role Profile, User Permission, System Settings, Activity Log, Error Log, or Version. That is the intended containment: this identity can do commercial bridge work and **cannot** audit or widen itself.

**Unnecessary privilege findings (report only; not mutated):**

The live role set still matches the historical **Accounts** profile used for #880 / #881 / #882 commercial work, plus `Sales Manager` from #920. Relative to the *approved bridge* (Customer identity + catalogue + draft quotation + Project/Task/Issue), these roles are broader than strictly required:

| Role | Why it is extra for the bridge | Why this packet did not remove it |
|------|--------------------------------|-----------------------------------|
| `Stock Manager` / `Stock User` | CorpFlowAI sells services, not stock | Removal is a role mutation (protected). May be inherited from the Accounts profile. |
| `Purchase Manager` / `Purchase User` | Buying / AP is not started | Same. Do not strip without a named follow-up. |
| `Accounts Manager` | Broader than Customer-bridge read; can typically post accounting documents in ERPNext | Needed historically for commercial drafts; stripping it is a protected permission change. |

No Role Permissions Manager click, no Custom DocPerm, no User role change, and no Role Profile rewrite was performed.

Exact later action if Anton wants a tighter identity (not performed): in ERPNext desk as Administrator, clone or edit the integration user’s Role Profile so it keeps `Sales User`, `Sales Manager`, `Item Manager`, and `Accounts User` (if still needed for Customer/Quotation) and drops Stock/Purchase/Accounts Manager — then a later GET-only `get_roles` probe records the new list. **Do not grant System Manager to get that proof.**

### 3. Privileged account inventory — **REQUIRES PROTECTED ACTION**

Safe evidence this identity can see:

| Probe | Result | What it does *not* prove |
|-------|--------|---------------------------|
| Own roles | Not Administrator / not System Manager | Who else is |
| User list | HTTP 200, **2** enabled rows; integration identity included; other names **not printed** | `user_type` was empty on the list, so the second row is **not** classified here. Administrator may be hidden from this identity. |
| Has Role `System Manager` / `Administrator` | HTTP 403 | Holder count unread |

**REQUIRES PROTECTED ACTION — Anton opens ERPNext desk as Administrator → Users and Permissions → User, records how many enabled System Users hold Administrator and/or System Manager, who owns them (Anton vs leftover vendor user), and whether the Frappe Cloud site owner matches. Put personal emails in the operator vault, not git. Do not create, disable, or reset users in that click unless a separate packet says so.**

### 4. 2FA — **REQUIRES PROTECTED ACTION**

`enable_two_factor_auth` lives on System Settings. This identity: System Settings document HTTP **403** (list HTTP **500**, same class as #1010). User OTP secrets must never be printed.

Exact operator path (Frappe v16 desk):

1. Log in as Administrator (or another already-privileged human).
2. **Settings → System Settings → Security** (sometimes labelled *Session Settings*).
3. Record whether **Enable Two Factor Auth** is on.
4. Open each privileged User → **Settings / Security** and record whether 2FA is enrolled (yes/no only).
5. If the site is on Frappe Cloud, also confirm the cloud-dashboard member login 2FA for the owner account (dashboard Users / Team; names only).

**REQUIRES PROTECTED ACTION — Anton records privileged 2FA state (site-wide + each privileged User) on that path, or enables it if currently off. This factory packet must not enable 2FA.**

### 5. Password / login-attempt / session controls — **REQUIRES PROTECTED ACTION**

The same Security tab holds consecutive-login, lockout wait, session expiry, deny-multiple-sessions, and password-policy fields. Unread here (403).

**REQUIRES PROTECTED ACTION — Anton opens Settings → System Settings → Security and records (on/off or number only): Allow Consecutive Login Attempts / login after fail, Session Expiry, Deny Multiple Sessions, password policy / minimum score. No password values. This packet must not change those settings.**

### 6. `MASTER_ADMIN_KEY` presence — **PROVEN**

This fresh Factory Automation worker: **`MASTER_ADMIN_KEY` absent**. `ADMIN_PIN` absent. Three ERPNext API names present. Auth did not use the factory-master key.

This matches the incidental #1010 WP7 result on 2026-08-20. It does **not** reopen #899. No regression (present-again) was observed.

### 7. Joiner / mover / leaver — **PROVEN**

Owner: **Anton** (one-human company; accountant remains a future named user, not a second identity system).

Canonical runbook: [`docs/runbooks/ERPNEXT_JOINER_MOVER_LEAVER_V1.md`](../runbooks/ERPNEXT_JOINER_MOVER_LEAVER_V1.md)

That page uses standard ERPNext User + Role Profile + API Key capability already in the product. No new identity store, no SSO project, no custom DocType.

### 8. Registers — **PROVEN**

Updated in this packet where the mark actually changed: `CONTROL_REGISTER.md` (C-ACC-01, C-ACC-03, C-ACC-04, C-ACC-05), `IMPLEMENTATION_EVIDENCE_INDEX.md` Phase 3, `RISK_REGISTER.md` R-ERP-10 current-absence evidence, `IMPLEMENTATION_BASELINE_V1.md` Phase 3 rows, `JOURNAL.md` `JE-2026-08-20-2`.

---

## 4. Anton required

**YES** — only these exact consequential actions (ordinary docs/PR review is separate):

1. Privileged User inventory in ERPNext desk (control 3).
2. Record or enable privileged 2FA (control 4).
3. Record System Settings Security login/session/password policy (control 5).
4. (Optional, later) Tighten the integration Role Profile by dropping Stock/Purchase/Accounts Manager if Anton wants a narrower bridge identity. That is a **role mutation** and needs its own exact approval.

Do **not** treat this PR merge as any of those actions. Do **not** grant System Manager to the integration user to finish the unread rows.

---

## 5. Protected boundaries honoured

- No credential reset, secret value change, or new Cursor/Frappe Cloud user.
- No role, Role Profile, DocPerm, or Custom DocPerm write.
- No 2FA enablement.
- No schema / custom DocType / DB mutation.
- No package upgrade, payment, send, or `client_production`.
- No secret **values**, other users’ emails, tokens, or hostnames in this file, tests, JOURNAL, or artifacts.
- `#899` not reopened.

**Protected gate encountered:** **YES** — stopped at the exact actions in §4. Ordinary discovery, docs, tests, and PR are complete.

---

## 6. Cross-links

- `docs/runbooks/ERPNEXT_JOINER_MOVER_LEAVER_V1.md`
- `docs/erpnext/ERPNEXT_CURSOR_CLOUD_SECURITY_CORRECTION_899.md`
- `docs/runbooks/ERPNEXT_CURSOR_CLOUD_SECRETS_LEAST_PRIVILEGE_V1.md`
- `docs/operations/ERPNEXT_SERVER_BACKUP_SECURITY_DR_AUDIT_V1.md` (#956)
- `docs/operations/ERPNEXT_WP7_PATCH_BACKUP_RESTORE_MONITORING_CLOSURE_V1.md` (#1010)
- `docs/governance/erpnext/CONTROL_REGISTER.md`
- `docs/erpnext/ERPNEXT_PRODUCT_CATALOGUE_V1.md` (historical Accounts profile)
- `scripts/erpnext/wp6-access-control-probe.sh`

---

## 7. Change log

- **2026-08-20** — Initial WP6 closure for #1019. Verdict: **WP6 ACCESS CONTROL CLOSURE READY FOR REVIEW**.
