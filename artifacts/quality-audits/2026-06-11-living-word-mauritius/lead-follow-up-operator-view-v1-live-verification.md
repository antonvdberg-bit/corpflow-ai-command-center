# Living Word Lead Follow-up — Operator View v1 live verification

**Date:** 2026-06-19  
**Tenant:** `living-word-mauritius`  
**PR:** [#421](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/421) (merged)  
**Commit:** `ac187612e962161e7548fa41919e3edfdc2e70fa`  
**Production deployment:** GitHub Production `5119501806` (Vercel Ready)

---

## 1. Executive summary

Factory-only operator inbox for Living Word chatbot follow-up workflow steps is **live on Production**. Anton can open **`/factory/living-word-workflows`** after admin login on Core host, view open/completed/cancelled steps with full lead context, and mark steps **completed** or **cancelled** without any outbound messaging.

---

## 2. What was delivered

| Item | Detail |
|------|--------|
| **Operator page** | `https://core.corpflowai.com/factory/living-word-workflows` |
| **Auth** | Admin session gate (same as `/admin/lead-rescue`); unauthenticated → redirect to login |
| **List API** | `GET /api/factory/tenant-workflows/steps?tenant_id=living-word-mauritius&status=open` |
| **Update API** | `PATCH /api/factory/tenant-workflows/step-update` body: `{ tenant_id, step_id, status }` |
| **Schema changes** | **None** |
| **Outbound send** | **None** |

---

## 3. Operator page behaviour

- **Internal banner:** “CorpFlow operator · internal only” — not the public church site.
- **Status filter:** open · completed · cancelled · all
- **Per step card shows:** tenant, workflow key/name, step title/status, created time, lead name/email/WhatsApp, preferred method, recommended channel, message excerpt, source host/path, source event id, source thread id
- **Actions (open steps only):** Mark completed · Mark cancelled
- **Empty state:** helpful copy when no steps match filter
- **Noindex:** `robots: noindex,nofollow`

---

## 4. Live HTTP verification

| URL | Expected | Actual |
|-----|----------|--------|
| `https://living-word-mauritius.corpflowai.com/site-preview` | 200 | **200** |
| `https://core.corpflowai.com/api/factory/health` | 200 JSON ok | **200** |
| `https://core.corpflowai.com/factory/living-word-workflows` (no session) | Redirect to login | **307** → login |
| `GET …/api/factory/tenant-workflows/steps?…` (no auth) | Denied | **403** |

---

## 5. Data verification (Production Postgres)

| Check | Result |
|-------|--------|
| `chat_widget_configs.enabled` | **true** |
| `flow_version` | **3** |
| Open LWM follow-up steps (sample) | Lead fields render correctly in API serializer |
| Non-LWM workflow steps | **0** |
| Mark safe audit step completed | **OK** — see below |

**Safe completion test:**

| Field | Value |
|-------|--------|
| Step id | `cmqkbapmw000nxfnkm0os7gv8` |
| Run id | `cmqkbapmw000mxfnkfnalfewf` |
| Lead | CorpFlow Data Audit (`sandbox.data.audit@corpflow-test.invalid`) |
| Before | step `open`, run `open` |
| After | step `completed`, run `completed` |
| Source event | `cmqka5uao003ll204ozwkcmlg` (unchanged) |
| Source thread | `cmqka5rty002el2040ab91mgk` (unchanged) |

**Preserved rows:** `chat_widget_threads`, `chat_widget_messages`, and `automation_events` were **not deleted** (status update only on `workflow_steps` / `workflow_runs`).

---

## 6. Auth and tenant isolation

| Test | Result |
|------|--------|
| Unauthenticated API | **403** `factory_master_required` |
| Unauthenticated page | **Redirect** to `/login?next=…` |
| Patch wrong tenant | Blocked in tests (`step_not_found`) |
| Outbound side effects | **None** |

---

## 7. External systems

| System | Touched? |
|--------|----------|
| livingwordmauritius.com | **No** |
| network.livingwordmauritius.com | **No** |
| GoHighLevel | **No** |
| DNS | **No** |
| n8n | **No** |
| Email / SMS / WhatsApp send | **No** |

---

## 8. How Anton uses it

1. Sign in as **factory admin** on `https://core.corpflowai.com/login`
2. Open **`https://core.corpflowai.com/factory/living-word-workflows`**
3. Review open chatbot follow-ups; use **recommended channel** as routing hint only (manual follow-up)
4. Mark **completed** when handled, or **cancelled** if void
5. Switch filter to **completed** / **cancelled** to audit history

---

## 9. Rollback

1. Revert merge commit `ac187612` if UI/API must be removed (workflow tables remain).
2. Step/run status can be manually set back to `open` in Postgres if a completion was mistaken — do not delete audit rows.

---

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES (ac187612)
- Production deployment ID: 5119501806
- Live URLs tested:
  - https://living-word-mauritius.corpflowai.com/site-preview (200)
  - https://core.corpflowai.com/api/factory/health (200)
  - https://core.corpflowai.com/factory/living-word-workflows (307 unauth — login gate)
  - GET /api/factory/tenant-workflows/steps (403 unauth)
- Expected vs actual: operator inbox + complete/cancel without outbound — MATCH
- Client-facing flow usable: YES (sandbox chatbot still enabled)
- Final verdict: COMPLETE
```
