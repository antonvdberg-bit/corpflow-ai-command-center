# Langfuse MCP operator-intelligence control

Source issue: #1300

## Purpose

Provide the final bounded Langfuse MCP operator-intelligence layer without creating a second observability platform or granting autonomous write access.

The default operating tier is read/query only. GitHub remains engineering/work-packet truth, ERPNext remains cash/commercial truth, provider evidence remains independent evidence, and unsupported precision remains UNKNOWN.

## Servers

- `langfuse-cloud` — authenticated project-scoped Langfuse Cloud MCP.
- `langfuse-docs` — public Langfuse documentation MCP.

The repository stores no Langfuse credential values.

`.cursor/mcp.json` expects the host environment to provide:

`LANGFUSE_MCP_AUTHORIZATION`

Its value must be the complete Basic Authorization header value required by Langfuse. Never commit, echo, screenshot, or paste that value into GitHub, prompts, docs, or chat.

## Default read/query tier

The repository `.cursor/permissions.json` allowlists only the current read/query tools needed for operator intelligence.

Excluded by default:
- prompt creation or label mutation;
- score creation/config mutation;
- comments creation;
- dataset/dataset-item/run mutation;
- annotation queue/item/assignment mutation;
- model mutation;
- evaluator/rule mutation;
- dashboard/widget/placement mutation;
- deletes;
- feedback submission;
- media retrieval.

Tool inventory must be refreshed dynamically during fit-for-use verification because Langfuse documents the MCP server as self-describing and evolving.

## Fit-for-use test matrix

Use real project evidence with bounded filters and small result windows.

1. Health
   - `getHealth`
   - PASS when authenticated project MCP responds successfully.

2. Cursor telemetry
   - `listObservations` scoped to production and `cursor.cloud_agent.run`.
   - Confirm the #1292 production observation is readable.
   - Do not retrieve raw private payloads.

3. AI economics
   - `getMetricsSchema` then `queryMetrics`.
   - Compare usage/token/cost evidence by workflow/model/provider.
   - Treat null/absent cost as UNKNOWN, not zero.

4. Release/change diagnosis
   - Query bounded pre/post time windows.
   - Drill from aggregate metrics to selected observations only.

5. Prompt/version intelligence
   - `listPrompts`, `getPrompt`, `getPromptUnresolved`.
   - Read only; do not create versions or change labels.

6. Quality/evaluation
   - Scores/configs, evaluators/rules, experiments.
   - Read only.

7. Regression readiness
   - Datasets/items/runs/run-items.
   - Read only; no upsert/create/delete.

8. Human review state
   - Annotation queues/items and existing comments.
   - Read only.

9. Dashboard/monitor intelligence
   - Read existing dashboards/widgets and monitors.
   - No dashboard/widget/placement mutation.

10. Docs
   - `searchLangfuseDocs`, `getLangfuseDocsPage`, `getLangfuseOverview`.
   - Docs `submitFeedback` is not allowlisted.

## Write-control proof

A normal autonomous Cursor session must not be able to run Langfuse mutation tools without an explicit approval path outside this default tier.

Representative tools that must not be allowlisted include:
- `createTextPrompt`
- `createChatPrompt`
- `updatePromptLabels`
- `createScore`
- `createComment`
- `upsertDataset`
- `upsertDatasetItem`
- `deleteDatasetItem`
- `createDatasetRunItem`
- `deleteDatasetRun`
- `createAnnotationQueue`
- `createAnnotationQueueItem`
- `updateAnnotationQueueItem`
- `deleteAnnotationQueueItem`
- `createAnnotationQueueAssignment`
- `deleteAnnotationQueueAssignment`
- `createScoreConfig`
- `updateScoreConfig`
- `deleteScoreConfig`
- `createModel`
- `deleteModel`
- `upsertEvaluator`
- `deleteEvaluator`
- `createEvaluationRule`
- `updateEvaluationRule`
- `deleteEvaluationRule`
- `createDashboard`
- `updateDashboard`
- `deleteDashboard`
- `createDashboardWidget`
- `updateDashboardWidget`
- `deleteDashboardWidget`
- dashboard placement mutations
- `submitFeedback`

## Revocation

Fastest revocation paths:
1. Disable/remove the `langfuse-cloud` server in Cursor.
2. Remove the host-side `LANGFUSE_MCP_AUTHORIZATION` value.
3. Revoke/rotate the underlying Langfuse project API key in Langfuse if compromise is suspected.
4. Keep the repo read allowlist in place; do not replace it with `langfuse-cloud:*`.

## Stop condition

Close #1300 when:
- authenticated project MCP is healthy;
- Docs MCP is healthy;
- the current tool inventory is inspected;
- representative operator queries work on real project evidence;
- #1292 Cursor telemetry is readable;
- mutation tools are not available for normal autonomous execution;
- no secret or project-data mutation occurred;
- a concise operator-intelligence report is produced.

Non-blocking enhancements belong after revenue work resumes.
