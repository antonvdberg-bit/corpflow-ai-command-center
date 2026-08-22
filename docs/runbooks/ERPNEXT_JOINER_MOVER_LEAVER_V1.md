# ERPNext joiner / mover / leaver v1

**Status:** One-page operator procedure for the vendor-hosted ERPNext test site.  
**Date (UTC):** 2026-08-20  
**Source issue:** [#1019](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1019)  
**Owner:** Anton  
**Anchor:** `<!-- ERPNEXT_JOINER_MOVER_LEAVER_V1 -->`

<!-- ERPNEXT_JOINER_MOVER_LEAVER_V1 -->

**Environment:** vendor-hosted ERPNext used for CorpFlowAI commercial **`corpflow_test`** work. This is not `client_production`.

**NO IMPLEMENTATION AUTHORIZED** from this page. It does not create users, change roles, enable 2FA, or reset passwords. Cursor Factory must not execute these clicks unless a later issue names the exact user action.

CorpFlowAI is a one-human company today (Version 2). This procedure still exists so a joiner, a role change, or a leaver is not improvised. Do **not** build a second identity system, SSO product, or custom DocType for this.

---

## 1. Owner

| Role | Who | ERPNext representation |
|------|-----|------------------------|
| Privileged human / site owner | Anton | Administrator / System Manager on the vendor site (inventory still a desk click — see WP6 control 3) |
| Integration / API identity | Factory / Cursor Cloud | `integrations@corpflowai.com` — **not** System Manager |
| Accountant | External accountant, when appointed | Read-oriented role when Phase 2 accounting starts — **not** this page |

Secrets stay in the approved Cursor / operator vault. Never paste password, API key, or OTP values into git or chat.

---

## 2. Joiner (new human or new API identity)

Use standard ERPNext **User**. Desk path: **Users and Permissions → User → New**.

1. Create the User with the work email. Enable **Desk Access** only if they need the desk.
2. Assign a **Role Profile** (do not stack extra roles that the profile will overwrite). Typical:
   - Operator / Anton: keep privileged roles on the existing Administrator account; do not duplicate System Manager onto a second daily login without a recorded reason.
   - Accountant (future): read-oriented profile; not System Manager.
   - Integration: keep `integrations@corpflowai.com`; do not mint a second API user for the same bridge.
3. For any privileged human: enrol **Two Factor Auth** before they handle real books (System Settings site-wide + the User security section). Enabling 2FA is a protected click.
4. For an API user: generate API Key / API Secret in the User form, store **names** in docs and **values** only in Cursor Secrets / vault (`ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`). Do not grant System Manager to API users.
5. Record the User’s purpose on GitHub (issue/PR), not a parallel HR app.

Frappe Cloud team members (dashboard login) are a **separate** joiner if the person also needs hosting-console access. Same owner: Anton.

---

## 3. Mover (role or job change)

Desk path: **User → Role Profile / Roles**.

1. Change the **Role Profile** to match the new job. Do not leave a stale System Manager grant “just in case”.
2. If the person should lose API access, **regenerate/revoke API keys** on that User (values never printed).
3. If the person should lose Frappe Cloud dashboard access, remove them in the cloud dashboard Users / Team page.
4. Do not use `MASTER_ADMIN_KEY` as a substitute ERPNext identity.

Factory packets must not perform mover clicks. A named GitHub issue must authorize the exact User and the exact roles added or removed.

---

## 4. Leaver (person or integration retirement)

Prefer **Disable** over Delete so audit rows keep a name.

1. **User → enabled = 0** (Disable).
2. Revoke / regenerate API keys on that User.
3. Remove Frappe Cloud dashboard membership if present.
4. Remove Cursor Cloud secret **names** that belonged only to that identity (UI delete; no values in git). Keep `ERPNEXT_BASE_URL` / `ERPNEXT_API_KEY` / `ERPNEXT_API_SECRET` if a replacement integration user is already in place.
5. Do not delete historical Customers, Quotations, or Projects because a person left.

If Anton is incapacitated, Version 2 already accepts single-human risk with compensating GitHub history — this runbook does not invent a second approver.

---

## 5. What this runbook is not

- Not an SSO / Google Workspace / Microsoft Entra project.
- Not a custom ERPNext DocType or CorpFlowAI User table.
- Not permission to grant System Manager to `integrations@corpflowai.com`.
- Not a substitute for the WP6 privileged-inventory and 2FA desk clicks.

Canonical evidence packet: `docs/operations/ERPNEXT_WP6_IDENTITY_ROLES_2FA_ACCESS_CLOSURE_V1.md`.
