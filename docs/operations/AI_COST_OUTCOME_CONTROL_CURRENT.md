# CorpFlowAI AI Cost & Outcome Control — Current State

Authoritative controller: #1292
Canonical design: `docs/operations/AI_COST_OUTCOME_CONTROL_V1.md`
Foundation merged: PR #1293, merge commit `3fd527ecb9d34457220dd1ae47d43e897bbfa013`

## Current state

`FOUNDATION MERGED — LIVE ECONOMICS FEEDS NEXT`

The objective is to obtain initial insight and control, then move toward interactively managed optimization based on measured fact and data rather than hype, intuition or vendor preference.

Management loop:

`OBSERVE -> ATTRIBUTE -> COMPARE -> EXPLAIN -> RECOMMEND -> OPERATOR DECISION -> ADJUST -> VERIFY`

V1 remains human-managed. No autonomous budget, provider or model changes are authorized.

## Canonical ownership

- Langfuse: model/runtime telemetry, usage, cost where supported, latency, errors, evaluation.
- CorpFlowAI/Core: budget policy, execution tier, per-run envelope, allow/warn/approval/stop, business-outcome interpretation.
- ERPNext: vendor/subscription financial truth, cost centre/project/customer allocation, revenue/commercial truth.
- GitHub: work packet, issue, PR, CI, retry/rework and verified-delivery evidence.

No second accounting system, observability platform, task source of truth or production database.

## Historical disposition

- #1251 AI Cost Governance / Safety Brake — concept incorporated into #1292; no longer a separate implementation stream.
- #1282 Langfuse pilot — completed with ADOPT decision; Langfuse retained as commodity observability layer.
- #1249 / PR #1250 — retained as Cursor-specific LOW/MEDIUM/HIGH spend-control proof.
- #1254 — retained as Cursor economic execution gate and finite-run envelope.
- #1264 Token Economics wording — superseded by #1292 common AI economics programme.
- PR #1291 — retained only as the first Groq production telemetry adapter; not the programme itself.
- PR #1293 — merged foundation and current canonical code baseline.

## What is already on main

- canonical AI cost-source registry;
- `corpflow.ai_economic_event.v1` event contract;
- cost classes: fixed subscription, included capacity, variable usage, vendor job;
- measurement quality: exact, provider-reported, calculated, allocated, estimated, unknown;
- cash cost separated from economic consumption;
- deterministic `ALLOW | WARN | REQUIRE_APPROVAL | STOP` budget policy;
- 50/75/90/100 percent budget thresholds;
- finite per-run, retry and run-count envelopes;
- HIGH-tier approval rule;
- outcome/cost summary foundation;
- evidence-based optimization doctrine.

## Next execution sequence

1. Rebase/reconcile PR #1291 onto current main and map Groq telemetry into the canonical economic contract.
2. Validate production-safe Langfuse ingestion for real organic Groq calls; no synthetic paid call solely for proof.
3. Add Cursor usage/economic reconciliation using provider evidence plus GitHub run/PR/CI outcome evidence; retain #1249/#1254 as hard controls.
4. Define ERPNext monthly reconciliation for fixed subscriptions and provider actuals without creating a second ledger.
5. Produce the first compact operator economics report from trustworthy feeds.
6. Start human-managed optimization recommendations using comparable outcome evidence.
7. Add OpenAI/ElevenLabs/other providers only when materially active.

## Definition of useful first insight

The first operational report should answer:

- total measured AI cash cost;
- fixed subscriptions vs variable usage vs included capacity;
- top provider/model/workstream/product consumers;
- attributable vs unattributed spend;
- successful vs failed/reworked activity;
- cost per verified success where evidence exists;
- budget warnings/exceptions;
- measurement-confidence gaps;
- one or more evidence-backed optimization recommendations.

The optimization rule remains: prefer the lowest expected cost to a verified successful outcome, not the cheapest individual call.
