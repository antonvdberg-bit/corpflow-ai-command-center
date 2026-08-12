# ERPNext / Cursor Cloud secrets — least privilege (v1)

**Status:** Canonical operator runbook for [#899](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/899).  
**Supersedes (runtime path):** Infisical/SSH detour recorded in closed-unmerged PR [#895](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/895).  
**Anchor:** `<!-- ERPNEXT_CURSOR_CLOUD_SECRETS_LEAST_PRIVILEGE_V1 -->`

<!-- ERPNEXT_CURSOR_CLOUD_SECRETS_LEAST_PRIVILEGE_V1 -->

## 1. Purpose

Ordinary Cursor Cloud agents that do ERPNext commercial work must receive **only** the three direct API secret names:

- `ERPNEXT_BASE_URL`
- `ERPNEXT_API_KEY`
- `ERPNEXT_API_SECRET`

They must **not** receive `MASTER_ADMIN_KEY`.

`MASTER_ADMIN_KEY` is a factory control-plane credential. It is not required for ERPNext Frappe token auth and must not be injected into the broad Cursor Cloud execution environment.

## 2. Where injection happens (findings)

| Source | Injects `MASTER_ADMIN_KEY`? | Notes |
| --- | --- | --- |
| Cursor Dashboard → Cloud Agents → Secrets (team/general scope) | **YES (observed)** | Injected into ordinary repo-dispatched Cursor Cloud runs |
| Repo `environment.json` / linked Cursor environment | No linked environment on run `bc-a36314af-5d61-421c-8be3-b9ecad349924` | `environment-info` → `environment: null` |
| Factory dispatcher / `scripts/dispatcher-agent-activation.mjs` | **No** | Activator uses cron-style secrets only; does not push `MASTER_ADMIN_KEY` into agents |
| Infisical / SSH at Cursor runtime | **Not required** | Direct API secrets already inject when present in Cursor Secrets |

Automation in this repository **cannot** delete Cursor Dashboard Secrets. Removal is a one-time UI action by Anton.

## 3. Canonical ERPNext access path

```text
Cursor Cloud Secrets
  → ERPNEXT_BASE_URL + ERPNEXT_API_KEY + ERPNEXT_API_SECRET
  → Frappe Authorization: token <key>:<secret>
  → identity integrations@corpflowai.com (CorpFlowAI Integration)
```

Do **not** route ERPNext through SSH or Infisical at runtime when the three direct API secrets are already available to Cursor Cloud.

Probe:

```bash
bash scripts/erpnext/cursor-cloud-api-probe.sh
```

## 4. One-time Anton action (secret NAME only)

Do not paste any secret **value** into chat, GitHub, PR comments, or screenshots.

1. Open [Cursor Dashboard → Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents).
2. Locate **`MASTER_ADMIN_KEY`** in the **general / team** Cloud Agents Secrets scope used by ordinary repo-dispatched runs.
3. **Delete / remove** `MASTER_ADMIN_KEY` from that broad scope.
4. Confirm these three names remain present:
   - `ERPNEXT_BASE_URL`
   - `ERPNEXT_API_KEY`
   - `ERPNEXT_API_SECRET`
5. Save. Start a **fresh** Cursor Cloud run (running pods keep already-injected secrets).
6. On the fresh run, confirm `MASTER_ADMIN_KEY` is **ABSENT**, then re-run:

```bash
bash scripts/erpnext/cursor-cloud-api-probe.sh
```

Expected after correction:

```text
MASTER_ADMIN_KEY: absent
ERPNEXT_BASE_URL / ERPNEXT_API_KEY / ERPNEXT_API_SECRET: present
ERPNext access: PASS
authenticated_user: integrations@corpflowai.com
security_correction_#899: PASS
```

## 5. Narrow-scope rule (if needed later)

If a future **named** control-plane consumer truly requires factory-master capability from Cursor Cloud:

- Do **not** re-add `MASTER_ADMIN_KEY` to the general Secrets scope.
- Isolate it to that exact consumer / dedicated environment only.
- Prefer existing lower-privilege patterns (`CORPFLOW_CRON_SECRET` where routes already accept it) over broadening master-key blast radius.

As of #899, no ordinary ERPNext / dispatcher Cursor Cloud consumer requires `MASTER_ADMIN_KEY`.

## 6. Non-actions

- No secret values in repo, logs, artifacts, or PR text
- No Vercel / production env mutation from this runbook
- No Infisical/SSH runtime bridge for ERPNext when direct API secrets exist
- No ERPNext writes from the probe script
