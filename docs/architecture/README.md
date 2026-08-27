# Architecture docs

| Doc | Purpose |
| --- | ------- |
| [SLICE1_CORE_TENANT_SHELL_V1.md](./SLICE1_CORE_TENANT_SHELL_V1.md) | #778 runtime slice — separately authenticated `/app/core` + `/app/tenant` + Requests & Progress (synthetic) |
| [SLICE2_AUTHENTICATED_LIVE_REQUEST_WORKSPACE_V1.md](./SLICE2_AUTHENTICATED_LIVE_REQUEST_WORKSPACE_V1.md) | #877 — authenticated live request workspace (session path default; `cmp_tickets_read` when Postgres available) |
| [SLICE3_GOVERNED_CLIENT_REVIEW_V1.md](./SLICE3_GOVERNED_CLIENT_REVIEW_V1.md) | #883 — Core expose + Tenant comment/approve; persists via existing `cmp_tickets.console_json` |
| [OPERATING_TENANT_WORKSPACE_CONSOLIDATION_V1.md](./OPERATING_TENANT_WORKSPACE_CONSOLIDATION_V1.md) | #772 / #994 / #996 / #997 / #995 / #999 / #1004 / #1005 / #1159 / #1160 / #1170 — Operating / Tenant Workspace + Prospect Operations + Today / My Work + shared Prospect detail + Prospect Workbench + Pipeline + Action Queue + Clients + Commercial + Delivery + action overview + ERPNext quotation evidence + ERPNext Project/Issue continuity |
| [TENANT_REQUEST_REVIEW_CHANGE_CONTINUITY_V1.md](./TENANT_REQUEST_REVIEW_CHANGE_CONTINUITY_V1.md) | #1073 — Tenant Workspace request / review / `/change` continuity (no second ticket model) |
| [TENANT_WORKSPACE_SIMPLIFICATION_V1.md](./TENANT_WORKSPACE_SIMPLIFICATION_V1.md) | #1006 — Tenant-only chrome, `/app` tenant-session redirect, hide Operating Workspace chooser |
| [REFERENCE_TENANT_CLIENT_JOURNEY_ACCEPTANCE_V1.md](./REFERENCE_TENANT_CLIENT_JOURNEY_ACCEPTANCE_V1.md) | #1120 — Product acceptance of the CorpFlowAI reference-tenant client journey |
| Central app route & capability matrix (#773 audit) | See open PR #774 — `CORPFLOW_CENTRAL_APP_ROUTE_CAPABILITY_MATRIX_V1.md` (merge separately) |
