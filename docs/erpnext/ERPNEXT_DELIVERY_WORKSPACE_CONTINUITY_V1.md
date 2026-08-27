# Delivery Workspace ERPNext Project / Issue continuity v1

**Status:** Operator Delivery surface projects existing ERPNext Project/Issue references. **DELIVERY -> ERPNEXT PROJECT/SUPPORT CURRENT-MAIN USABLE** when the recorded #1097/#1144 contract is present on exact current `main`.
**Source issue:** [#1184](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1184) (repair of [#1156](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1156); supersedes unmergeable PR #1158 and paused [#1170](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1170) for implementation capacity only)
**Parents:** [#918](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/918), [#1097](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1097) / [#1134](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1134), [#1005](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1005) / [#1140](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1140)
**Merged foundations:** PR #1144 ERPNext Projects/Support; PR #1142 Operating Workspace Delivery; PR #1161 Operating action overview; PR #1162 Commercial quotation evidence
**Environment:** `corpflow_test` + hosted ERPNext **GET / read-only**
**Owner:** Cursor (implementation); Anton (merge only)
**Machine contract:** `config/erpnext-projects-support-ops.v1.json` + `fixtures/erpnext-projects-support-ops/synthetic-delivery.json`
**Helper:** `lib/erpnext/delivery-continuity.js`
**Surface:** `/app/delivery` (staff / Operating Workspace only)

**Anchor:** `<!-- ERPNEXT_DELIVERY_WORKSPACE_CONTINUITY_V1 -->`

<!-- ERPNEXT_DELIVERY_WORKSPACE_CONTINUITY_V1 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1184
```

## What an operator should see

On **Delivery** (`/app/delivery`), the existing synthetic delivery record resolves to the already-recorded ERPNext Project and Issue:

| CorpFlowAI record | ERPNext record | Meaning |
|-------------------|----------------|---------|
| `cf1097-synthetic-delivery` | Project `PROJ-0001` | Authoritative project identifier + current safe status |
| `cf1097-synthetic-support` | Issue `ISS-2026-00001` | Authoritative support identifier + current safe status |

Open **Open reference** on that row (or `/app/delivery?item=erpnext:cf1097-synthetic-delivery`) to see the identifiers, bounded status, and the existing Client / Change Console links. ERPNext remains the project/support system of record. Delivery does **not** become a second project or helpdesk.

Lead Rescue / Website Rescue / Change rows stay **Not linked** unless they already carry `qualification_json.erpnext.delivery` or `console_json.erpnext.delivery` with this same contract. The page does **not** guess a join from a client name.

## Audit (before this packet)

| Store | Existing Project/Issue pointer? |
|-------|----------------------------------|
| Delivery Workspace projector | No — #1142 showed stage/owner/blocker only |
| Proof prospects (Ada Spa, Bea, Wren) | Customer-bridge pointer only (`CF880 …`). **No** Project/Issue |
| Company Master / Clients fixtures | `erpnext_customer` unused for Projects |
| Change / request fixtures | No `console_json.erpnext.delivery` |
| Live Postgres `qualification_json.erpnext.delivery` | **Not written** by #1097 (`postgres_persist: not_written`) |
| Existing contract | **Yes** — `corpflow.delivery.erpnext.v1` + `PROJ-0001` / `ISS-2026-00001` |

This packet therefore reuses the recorded contract. It does not invent a new mapping and does not PATCH Postgres.

## Rules

- ERPNext Project/Issue win as the commercial delivery/support record (#918 `project_task_timesheet`, `issue_support`).
- CorpFlowAI keeps `/change` execution, prospect/client context, and Technical Lead evidence.
- GET / read-only ERPNext only. No Project, Task, Issue, or Timesheet write.
- No task list, Issue description, or support history is copied into Postgres or into the Delivery payload.
- Tenant Workspace stays fail-closed. Staff-only ERPNext/project oversight is not added to `/app/tenant`.
- No schema, no sync engine, no second project/helpdesk app.

## Exact routes and records

```text
Route: /app/delivery
Proof: /app/delivery?proof=1
Drilldown: /app/delivery?item=erpnext:cf1097-synthetic-delivery
API: GET /api/app/delivery
Delivery record: erpnext:cf1097-synthetic-delivery
delivery_ref: cf1097-synthetic-delivery
cmp_ticket_id: cf1097-synthetic-support
ERPNext Project: PROJ-0001
ERPNext Issue: ISS-2026-00001
Customer: CF920 Synthetic Website Project Ltd
```

## Operator evidence (local)

Desktop + mobile screenshots and JSON: `artifacts/erpnext/delivery-workspace-continuity-1156/`.

Expected vs actual (proof harness + hosted ERPNext GET):

| Check | Expected | Actual |
|-------|----------|--------|
| Synthetic delivery row | Linked to `PROJ-0001` / `ISS-2026-00001` | Linked, identifiers shown |
| Bounded status | Existing Project/Issue status only | **Open** / **Open** |
| Ada / Bea / Wren | Not linked | Not linked |
| Tenant session | 403, no ERPNext oversight | 403 (`core_access_denied`) |
| ERPNext write | None | `mutated: false`; create/update throw `ERPNEXT_WRITE_FORBIDDEN` |
| Live GET (hosted test) | HTTP 200, identifiers only | Project 200 / Issue 200, `status_source: erpnext_get` |

Final packet verdict: **DELIVERY -> ERPNEXT PROJECT/SUPPORT CONTINUITY USABLE**

Delivery Reality remains **PARTIAL** until this PR is merged, published to the corpflow_test spine, and `/app/delivery` is live-verified there. This packet does not deploy.

## Non-actions

- No ERPNext mutation
- No production / client_production deploy
- No DB / schema / data mutation
- No env / secrets / access change
- No payment, send, paid tool, DNS, or public launch
- No new sync engine or project/helpdesk system
