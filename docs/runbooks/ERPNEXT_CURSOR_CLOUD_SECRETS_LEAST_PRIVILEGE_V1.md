# ERPNext / Cursor Cloud secrets — least privilege (v1)

**Status:** Canonical operator runbook for [#899](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/899). Direct ERPNext API path is **PASS**. `MASTER_ADMIN_KEY` is **still PRESENT** on ordinary Factory Automation wakes as of the 2026-08-19 re-probe.  
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
| Cursor Dashboard → Cloud Agents → Secrets (team/general scope) | **Was YES on 2026-08-12.** Anton confirmed a UI delete on 2026-08-13. | That delete did **not** clear Factory Automation wakes. Re-check this scope. |
| Cursor Automation secrets for `CorpFlowAI Factory Wake Proof v2` (`30c07c9d-96f7-11f1-ba66-0e7d0216e441`) | **Likely remaining store** | 2026-08-19 Factory Automation wake `bc-c67a9751-28cb-47e6-918a-29a13c213561` still has `MASTER_ADMIN_KEY` **PRESENT** with no linked `environment.json` |
| Repo `environment.json` / linked Cursor environment | **No** | Fresh 2026-08-19 run: `environment-info` → `environment: null`, `build: null`; no repo `environment.json` |
| Factory dispatcher / `scripts/dispatcher-agent-activation.mjs` | **No** | Activator uses cron-style secrets only; does not push `MASTER_ADMIN_KEY` into agents |
| Infisical / SSH at Cursor runtime | **Not required** | Direct API secrets already inject when present in Cursor Secrets |

Automation in this repository **cannot** delete Cursor Dashboard or Automation Secrets. Removal is a UI action by Anton. Running pods keep already-injected secrets — a **fresh** wake is required after delete.

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

Anton already confirmed a Cloud Agents Secrets delete on 2026-08-13. The 2026-08-19 Factory Automation wake still received `MASTER_ADMIN_KEY`. Remaining click path:

1. Re-open [Cursor Dashboard → Cloud Agents → Secrets](https://cursor.com/dashboard/cloud-agents) and confirm **`MASTER_ADMIN_KEY`** is gone from the general/team Cloud Agents Secrets scope.
2. Open [CorpFlowAI Factory Wake Proof v2](https://cursor.com/automations/30c07c9d-96f7-11f1-ba66-0e7d0216e441). If that Automation (or any team/user Cursor Cloud secret scope that still applies to Automations-sourced agents) still lists **`MASTER_ADMIN_KEY`**, **delete / remove** that name.
3. Confirm these three names remain present for ERPNext work:
   - `ERPNEXT_BASE_URL`
   - `ERPNEXT_API_KEY`
   - `ERPNEXT_API_SECRET`
4. Save. Start a **fresh** Factory Automation wake (running pods keep already-injected secrets).
5. On the fresh run, confirm `MASTER_ADMIN_KEY` is **ABSENT**, then re-run:

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
