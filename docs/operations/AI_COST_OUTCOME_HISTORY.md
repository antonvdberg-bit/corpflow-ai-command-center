# AI Cost / Token Economics — History Map

This file exists only to prevent old exploratory issues from being mistaken for current execution authority.

## Current authority

- #1292 — **CorpFlowAI AI Cost & Outcome Control** — current programme/controller.
- PR #1293 — merged foundation on main.
- `docs/operations/AI_COST_OUTCOME_CONTROL_CURRENT.md` — compact current-state/resume document.
- `docs/operations/AI_COST_OUTCOME_CONTROL_V1.md` — canonical v1 design and control semantics.

## Predecessors

| Item | Historical role | Current disposition |
|---|---|---|
| #1249 / PR #1250 | Cursor model-tier spend control | RETAIN — provider-specific enforcement |
| #1251 | AI Cost Governance / Safety Brake product concept | SUPERSEDED by #1292 |
| #1254 | Cursor Economic Execution Gate | RETAIN — Cursor-specific execution control |
| #1264 Token Economics section | broad future measurement concept | SUPERSEDED by #1292 |
| #1282 | Langfuse pilot | COMPLETED — verdict ADOPT |
| PR #1291 | Groq production observability adapter | ACTIVE ADAPTER WORK only; not programme authority |
| PR #1293 | common source/event/budget foundation | MERGED / CURRENT BASELINE |

## Decision chronology

1. Cursor spend-control work proved that deterministic execution tiers and hard stops are necessary.
2. #1251 proposed generalising the pattern into AI Cost Governance / Safety Brake.
3. #1282 evaluated Langfuse and concluded that CorpFlowAI should not build a duplicate LLM-observability platform.
4. Anton directed the work away from provider-by-provider study and toward a business-wide cost/outcome system.
5. #1292 became the single programme for measurement, budgeting, control and evidence-based optimization.
6. PR #1293 merged the common source registry, economic-event contract and deterministic budget-policy foundation.

Historical issues remain available through GitHub history. They should not be loaded into routine implementation context unless a specific decision needs forensic reconstruction.
