# Cursor Economic Execution Gate

Issue: #1254

## Purpose

Preserve the CorpFlowAI delivery factory while preventing uncontrolled autonomous Cursor spend. The control objective is not the cheapest model per request; it is the lowest expected total cost to a verified successful outcome.

## Master mode

The authoritative repository variable is `CORPFLOW_CURSOR_MODE` with three supported values:

- `PARKED` — autonomous remote Cursor execution is denied.
- `LOCAL_ONLY` — autonomous remote Cursor execution is denied; normal operator-initiated Cursor Desktop use is outside this gate.
- `FACTORY_ARMED` — autonomous remote Cursor execution may proceed through the existing factory, subject to all existing governance, WIP, tier and authorization controls.

Missing, blank, invalid or unreadable mode fails closed as `PARKED`.

Changing this repository variable is a protected operator configuration action and requires Anton approval. This implementation does not create or change the live variable.

## Choke points

The Factory Handoff resolves the repository variable before it can publish a real handoff. If the mode is not `FACTORY_ARMED`, it emits `has_handoff=0` and fails closed before the webhook or correlated Cloud Agent step can run.

All Cursor Cloud Agents API write requests made from the GitHub factory context also pass the same gate. This covers agent creation, follow-up runs and CI repair/fallback agents. Read-only Cloud Agent GET requests remain available for status evidence.

Existing Cloud Agent environments are not deleted or modified.

## Economic routing

V1 uses deterministic task classes:

| Complexity | Preferred tier | Initial attempts | Follow-ups | Elapsed budget |
| --- | --- | ---: | ---: | ---: |
| simple | LOW | 1 | 0 | 20 min |
| moderate | MEDIUM | 1 | 1 | 45 min |
| difficult | HIGH | 1 | 1 | 90 min |

Explicit labels use `complexity:simple`, `complexity:moderate`, or `complexity:difficult`. Unclassified work preserves the pre-existing #1249 tier behavior rather than silently escalating the whole factory.

MEDIUM and HIGH continue to require the durable controller evidence already enforced by the existing Cursor execution-tier policy. HIGH still requires explicit durable approval.

The objective field emitted by the router is `lowest_expected_total_cost_to_verified_success`.

## Cost-per-success doctrine

Model choice must be evaluated using accepted outcomes rather than sticker price. Evidence should support comparison of:

- task class;
- model/tier used;
- initial attempts;
- follow-ups/retries;
- elapsed budget;
- CI result when available;
- operator rescue required;
- verified successful outcome;
- actual cost when available from Cursor usage evidence.

No new database, dashboard, Temporal service or paid tooling is introduced for V1. GitHub remains the durable control/evidence plane.

## Failure behavior

When a task reaches its bounded execution envelope, automation must stop and surface the blocker. It must not keep retrying, spawn unbounded follow-ups, or silently escalate to a more expensive model.

## Activation sequence

1. Merge the verified implementation PR only after review.
2. Separately obtain Anton approval to create/change `CORPFLOW_CURSOR_MODE`.
3. Set the mode to `LOCAL_ONLY` first.
4. Re-enable dormant workflows one at a time behind the gate.
5. Prove that `LOCAL_ONLY` produces no paid remote Cursor execution.
6. Only then consider a controlled `FACTORY_ARMED` test with an explicit budget.

No production deployment, DB/schema/data change, secret change, payment action, external send, workflow re-enable, or live repository-variable mutation is authorized by #1254 itself.
