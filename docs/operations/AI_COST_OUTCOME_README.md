# AI Cost & Outcome Control docs

Use these in this order:

1. `AI_COST_OUTCOME_CONTROL_CURRENT.md` — current state, resume point and next sequence.
2. `AI_COST_OUTCOME_CONTROL_V1.md` — canonical v1 architecture, contract and policy semantics.
3. `AI_COST_OUTCOME_NEXT.md` — immediate implementation packet.
4. `AI_COST_OUTCOME_HISTORY.md` — predecessor/history map only.

Durable controller: #1292.

Do not reconstruct routine context from #1251 or #1282; both are historical predecessors. Retrieve them only when the rationale or pilot evidence is specifically needed.
