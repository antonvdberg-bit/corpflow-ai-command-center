# Grok 4.6 bounded factory pilot v1

**Status:** Pilot complete — recommendation ready for operator review.  
**Source issue:** [#1038](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1038)  
**Environment:** `local` (repo-only / synthetic). Not a `corpflow_test` runtime change and not `client_production`.  
**Owner:** Cursor Factory Automation (Grok 4.6). Anton action: none unless a later packet asks for spend, credentials, or a plan change.  
**Anchor:** `<!-- GROK_46_FACTORY_PILOT_V1 -->`

<!-- GROK_46_FACTORY_PILOT_V1 -->

## Verdict

`GROK 4.6 PILOT PASS — USE SELECTIVELY FOR LONG-HORIZON/HIGH-COMPLEXITY CURSOR WORK`

Use Cursor Grok 4.6 as an **executor/reviewer model inside Cursor** for long-horizon or high-complexity factory work. Do **not** buy Ultra. Do **not** enable extra on-demand spend for this finding. Do **not** launch Grok Bot. Do **not** make Grok a second dispatcher, queue, scheduler, or merge authority.

**NO IMPLEMENTATION AUTHORIZED for Grok Bot.**

## What this packet did

The assigned work was itself the bounded experiment:

1. Plan a harmless multi-step factory/control-plane self-check.
2. Execute it with Grok 4.6 through the existing **CorpFlowAI Cursor Factory Handoff** wake (MODE C webhook, source issue `#1038`).
3. Implement a deterministic evaluator plus tests.
4. Inject one intentional synthetic failure (Grok as a second dispatcher / spend authority) and prove the evaluator fails closed.
5. Correct that packet to executor-only and prove it passes.
6. Compare against existing GitHub factory evidence. No duplicate paid Composer rerun.

This is not a Grok Bot rollout and not a control-plane redesign.

## Control-plane ownership (unchanged)

```text
GitHub durable truth
  → Temporal may supervise
  → CorpFlowAI Cursor Factory Handoff is the only Cursor wake
  → Cursor executes
  → Grok 4.6 may be the model inside that Cursor run
```

Grok 4.6 must not become:

- a second dispatcher;
- a second work queue or source of truth;
- a competing scheduler;
- a Temporal replacement;
- an autonomous merge/deploy authority;
- a holder of new production credentials.

## This-run evidence

| Field | Value |
| ----- | ----- |
| Model actually used | `cursor-grok-4.6-high-fast` |
| Cursor agent ID | `bc-c89065e0-e4b8-445b-81b3-f1bab2d5e187` |
| Cursor run URL | `https://cursor.com/agents/bc-c89065e0-e4b8-445b-81b3-f1bab2d5e187` |
| Factory handoff run | `32554780542` |
| Automation ID | `30c07c9d-96f7-11f1-ba66-0e7d0216e441` |
| Launch path | Existing Factory Automation. No parallel agent-launch mechanism. |
| Follow-up / correction cycles | `0` human re-prompts |
| Operator interventions | `0` |
| Plan upgrade / Ultra / on-demand spend | none requested, none enabled |
| Browser / UI verification | n/a — control-plane/docs only |
| Instruction / scope deviations | none. Executed only `#1038`. No second issue. No self-merge. |

Observed factory inventory at inspect time: this run was the only `RUNNING` Automation job. Other recent factory agents were `IDLE` and also used `cursor-grok-4.6-high-fast`. Grok 4.6 is already the current Factory Automation default model, not a new paid selection.

## Pilot questions

| Question | Result on this bounded packet |
| -------- | ----------------------------- |
| Completion without human re-prompting | Yes. One wake produced plan, implementation, tests, and PR handoff. |
| Instruction adherence across the task | Yes. Source issue, ownership, guardrails, and one-PR rule held. |
| Self-verification before PR handoff | Yes. Deterministic proofs A–H plus focused `node:test`. |
| Architecture / control-plane review quality | Yes. Ownership encoded and tested; no second wake path added. |
| Browser / UI verification | Not exercised. This packet had no client-facing UI. |
| Correction after an intentional bounded failure | Yes, in-harness: second-dispatcher packet failed closed; executor-only rewrite passed. This was not a live red CI loop. |
| Operator intervention required | None. |

## Comparison against recent factory GitHub evidence

No duplicate paid Composer rerun was launched.

Accessible recent Factory Automation agents were already `cursor-grok-4.6-high-fast`. There was **no Composer-only factory Automation counterpart** in that window. Comparison therefore uses existing GitHub outcomes, not a second paid experiment.

| Evidence | Outcome | What it shows |
| -------- | ------- | ------------- |
| PR [#1007](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1007) / #997 | Merged | Substantial factory app work completed under the current factory path. |
| PR [#1002](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1002) / #995 | Open, later reconciled | Same-PR reconcile after Pipeline landed; no second PR. |
| PR [#1034](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1034) / #1032 | Open | Control-plane Temporal wrap with synthetic proofs; live worker not started. |
| PR [#1024](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1024) / #1023 | Merged | Thin scheduled fallback. Not a second dispatcher. |
| PR [#1030](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1030) / #1026 | Closed | Intentional first-PR red by design. Not a model-quality failure. |

**Comparison gap (honest):** this pilot measured *fitness* of Grok 4.6 on the existing factory path. It did **not** measure a head-to-head long-horizon advantage versus Composer because no Composer factory Automation counterpart was available without spending again.

That gap is why the recommendation is **selective use**, not “replace every model” and not “buy Ultra.”

## Synthetic proofs A–H

Implemented in `lib/server/grok-46-factory-pilot.js` and `node-tests/grok-46-factory-pilot.test.mjs`.

| Proof | Meaning |
| ----- | ------- |
| A | Model identity is Grok 4.6 on the existing Factory Automation launch path |
| B | Control-plane ownership stays GitHub / Temporal supervise / Handoff / Cursor |
| C | Instruction adherence: `#1038` only, one PR, no self-merge |
| D | Intentional second-dispatcher / spend packet fails closed |
| E | Corrected executor-only packet passes |
| F | Comparison uses existing GitHub evidence; duplicate paid rerun refused |
| G | Guardrails: no upgrade, no on-demand spend, no second dispatcher, no operator gate |
| H | Recommendation is one of the three allowed verdicts |

## Separate Grok Bot finding

Official Cursor model docs confirm **Grok 4.6** is in the Cursor Models pool on paid plans and is usable in Cloud Agents / Automations. That is the product this factory run used.

This worker did **not** see a Grok Bot product surface, did **not** subscribe, did **not** start a trial, and did **not** connect plugins.

Public vendor copy is not identical:

- SpaceXAI currently says Grok Bot is included with Cursor Pro+ / Teams / SuperGrok Plus.
- Issue #1038 recorded the earlier Cursor-docs position that ongoing Grok Bot access required Ultra, an eligible Premium team seat, or SuperGrok Heavy.

That disagreement is **evidence only**. It does not authorize Grok Bot, Ultra, a trial, or any plugin.

## What Anton should do

**Nothing** for this packet.

Later, if a long-horizon factory packet is hard, keep using Grok 4.6 on the existing Cursor Factory path. If someone proposes Grok Bot, Ultra, on-demand spend, a second dispatcher, or a new credential, that is a new protected/spend decision — not implied by this pilot.

## Explicit non-actions

- No Cursor plan upgrade
- No Ultra purchase
- No paid vendor / tool
- No on-demand spend enablement
- No production deploy
- No DB / schema / env / secrets change
- No external messaging, outreach, payment, or public launch
- No autonomous merge
- No new GitHub or server credential
- No Temporal / GitHub / Cursor ownership change
- No Grok Bot implementation

## Related

- `lib/server/grok-46-factory-pilot.js`
- `config/grok-46-factory-pilot.v1.json`
- `node-tests/grok-46-factory-pilot.test.mjs`
- `docs/decisions/20260822-grok-46-factory-pilot.md`
- `docs/operations/CORPFLOWAI_CURRENT_DELIVERY_REALITY.md`
- `docs/operations/CURSOR_ISSUE_DISPATCH_LIFECYCLE_V1.md`
