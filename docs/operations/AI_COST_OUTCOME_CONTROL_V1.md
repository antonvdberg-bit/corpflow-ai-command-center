# CorpFlowAI AI Cost & Outcome Control v1

Source issue: #1292

## Purpose

CorpFlowAI needs initial insight and control over AI cost so that optimization can be managed interactively from fact and data rather than hype, intuition or vendor preference.

The target is not a token dashboard. The target is a repeatable management loop:

`OBSERVE -> ATTRIBUTE -> COMPARE -> EXPLAIN -> RECOMMEND -> OPERATOR DECISION -> ADJUST -> VERIFY`

V1 is deliberately human-managed. It must not autonomously change budgets, providers or model tiers because a dashboard metric moved.

## Truth boundaries

| System | Owns |
|---|---|
| Langfuse | operational model traces, usage, cost where supported, latency, errors, evaluation |
| CorpFlowAI/Core | budget policy, execution tier, per-run envelope, allow/warn/approval/stop, business-outcome interpretation |
| ERPNext | vendor/subscription financial truth, cost centre/project/customer allocation, revenue/commercial truth |
| GitHub | engineering work packet, issue, PR, CI, retry/rework and verified delivery evidence |

Do not build a second accounting system, second observability platform, second task source of truth or second production database.

## Cost semantics

AI spend must not be reduced to one number when the economics are different.

### fixed_subscription
A committed cost paid regardless of marginal use, such as a seat or monthly plan.

### included_capacity
Economically consumed capacity that may have zero incremental cash cost at the moment of execution. This matters for comparing already-paid capacity with variable API spend.

### variable_usage
Token, request, minute, credit or provider-usage cost attributable to actual consumption.

### vendor_job
A bounded generative-media/agent/render job cost where token semantics are not useful.

Where relevant, record **cash cost** and **economic consumption** separately.

## Measurement quality

Every cost/usage fact carries one of:

- `exact` — exact value supplied by an authoritative source;
- `provider_reported` — provider-reported usage/cost accepted as operational evidence;
- `calculated` — derived from known measured inputs and a documented calculation;
- `allocated` — fixed cost allocated across work using an explicit allocation rule;
- `estimated` — estimate that must never be represented as exact;
- `unknown` — insufficient evidence.

Unknown is a valid business result. Do not fabricate precision to fill a dashboard.

## Current source integration map

| Source | Measurement path | Control path | V1 treatment |
|---|---|---|---|
| ChatGPT interactive | ERPNext subscription actual + explicit workstream allocation where useful | context/work-packet discipline | fixed/included cost; no invented per-chat cost |
| OpenAI API | provider usage + Langfuse + ERPNext monthly reconciliation | CorpFlow pre-run policy + provider safeguards | integrate when runtime exists |
| Cursor Desktop | provider usage/export where safely available + GitHub evidence | operator policy | import/reconcile, do not claim click-level hard stop |
| Cursor Cloud/Factory | provider usage + GitHub work/run/PR/CI evidence | #1249/#1254 economic gate | retain and map into common economics contract |
| Codex | provider/platform evidence + work packet | governed dispatch | attribute when used |
| Groq API | provider usage -> Langfuse -> financial reconciliation | pre-run envelope/provider cap | first live runtime adapter via #1291 |
| ElevenLabs Agents | conversation/usage/cost + vendor actual | provider caps + activation/kill switch | integrate when live |
| Anthropic/Gemini/OpenRouter | provider usage + Langfuse where used | pre-run policy/provider controls | add only when actually used |
| Generative media | vendor job cost + work packet | explicit job cap/approval | integrate when activated |

n8n, Temporal, Vercel, GitHub, ERPNext and Infisical are platform/infrastructure costs, not AI inference costs. They may later contribute to gross-margin analysis without being mislabeled as model spend.

## Canonical event contract

Code: `lib/server/ai-economic-control.js`

Registry: `lib/server/ai-cost-source-registry.js`

Schema name: `corpflow.ai_economic_event.v1`

Core fields:
- event ID and time;
- source/provider/tool/model;
- cost class;
- cash cost/currency;
- economic consumption/unit;
- provider/model usage where known;
- tenant/product/workflow/workstream/work-packet references where safe;
- ERPNext references where approved;
- context budget `S|M|L|XL`;
- execution tier `LOW|MEDIUM|HIGH`;
- retry/follow-up count;
- verified outcome and outcome reference;
- measurement quality.

Adapters must normalize into this contract. They must not each invent a competing cost schema.

## Budget/control mechanism

### Budget hierarchy

`CorpFlowAI monthly AI envelope -> cost centre/function -> client/product/project/workstream -> run/work packet`

The first implementation deliberately does not add a new database or mutate ERPNext. It provides the deterministic decision engine that future persisted policy can call.

### Default decision thresholds

| Projected budget use | Decision |
|---|---|
| < 50% | ALLOW |
| 50% to <75% | ALLOW + visible consumption |
| 75% to <90% | WARN; prefer economical execution |
| 90% to <100% | REQUIRE_APPROVAL unless explicitly approved |
| >=100% | STOP discretionary execution |

A critical service can cross the ceiling only with an explicit approved critical exception.

### Per-run envelope

Monthly budget is not sufficient protection. Every autonomous run should also carry finite limits where technically enforceable:
- expected run cost;
- maximum run cost/usage;
- run count/max runs;
- retry count/max retries;
- execution tier;
- criticality/exception evidence.

Exhausted run/retry/cost envelopes STOP before monthly budget logic.

A HIGH execution tier requires explicit approval even when budget remains. Provider-specific controls may be stricter; #1249/#1254 remains authoritative for Cursor.

### Missing budget

A governed variable execution with no budget does not silently proceed in the generic policy engine. It returns `REQUIRE_APPROVAL / budget_not_defined`.

This is deliberate: absence of a budget is a control gap, not evidence that the budget is infinite.

## Initial insight before automatic optimization

The first useful management view should answer:
- total measured AI cash cost;
- fixed subscription cost;
- variable consumption;
- included capacity used;
- attributable vs unattributed cost;
- successful work/outcomes;
- failed/reworked spend;
- cost per verified success where denominator evidence exists;
- top consuming provider/model/workstream/product;
- budget exceptions and near-ceiling events;
- measurement-confidence gaps.

A recommendation must always preserve the evidence behind it. Example:

> Workflow X used HIGH tier on 9 of 12 runs. First-pass success was not better than LOW/MEDIUM during the measured window. Premium spend was Y. Recommendation: move the default down one tier for the next N bounded runs and verify.

That is an optimization recommendation. “Model X is cheaper” without outcome evidence is not.

## Optimization decision standard

Before recommending a change, compare at minimum where available:
- cash cost;
- included capacity consumption;
- first-pass success;
- retries/follow-ups;
- elapsed time;
- CI/verification success;
- human correction/intervention;
- business/delivery outcome;
- measurement quality/confidence.

Prefer lowest **expected cost to verified successful outcome**, not the cheapest call.

## Relationship to existing controls

### #1249 / PR #1250
Keep. Cursor LOW/MEDIUM/HIGH authorization is a provider-specific implementation of the broader execution-tier principle.

### #1254
Keep. `PARKED | LOCAL_ONLY | FACTORY_ARMED`, finite retries/follow-ups and cost-per-success evidence remain authoritative for paid remote Cursor execution.

### #1282 / Langfuse
Keep Langfuse for commodity observability. It is not the budget authority or accounting ledger.

### PR #1291
Treat as the first Groq telemetry adapter only. It should ultimately emit/associate the same source/workflow/work-packet semantics defined here. Do not call the company-wide programme complete when Groq tracing works.

## Rollout order

1. common contract/source registry/policy engine — this PR;
2. reconcile PR #1291 as Groq adapter after CI/security repair;
3. connect other active OpenAI-compatible/API model calls to the common contract;
4. obtain trustworthy Cursor usage/reconciliation evidence;
5. reconcile actual fixed/provider spend with ERPNext financial truth;
6. add ElevenLabs when activated;
7. build one compact internal economics view only after feeds are trustworthy;
8. generate evidence-backed optimization recommendations;
9. only after repeated proof consider bounded automatic optimization, requiring separate approval.

## Non-goals

- no new AI gateway merely for metering;
- no new observability vendor;
- no standalone cost database;
- no generic BI/dashboard programme;
- no autonomous model/provider switching;
- no automatic budget changes;
- no invented provider costs;
- no client-facing cost product in this slice.

## Success criterion

The system is succeeding when management decisions become increasingly evidence-based. A mature decision should sound like:

> Over the last 30 comparable work packets, MEDIUM reduced rework enough to cost less per verified completion than LOW for this task class. Raise that class to MEDIUM by default, keep HIGH exception-only, and verify again after the next 20 runs.

That is the direction of travel: **measure -> control -> learn -> optimize -> verify**.
