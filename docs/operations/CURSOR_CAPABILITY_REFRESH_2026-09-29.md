# Cursor Capability Refresh & Engineering Factory Simplification — 2026-09-29

**Status:** Evidence-based audit; no runtime change.  
**Owner:** CorpFlowAI COO / Anton.  
**Objective:** Preserve GitHub governance and existing investment while replacing custom orchestration only where current Cursor-native capability is practically equivalent or better.

## Executive Summary

The current CorpFlowAI factory is **not obsolete**, but Cursor's 2026 Cloud Agents, Automations and PR subscriptions now cover more of the execution/lifecycle loop than when the factory was designed.

The safest simplification boundary is:

- **Retain CorpFlowAI/GitHub** for work eligibility, prioritisation, protected-action gates, WIP/capacity policy, audit trail and final release authority.
- **Move more PR-local engineering lifecycle work to Cursor native capability**: isolated cloud execution, branch/PR creation, CI follow-up, bot/review comment handling, bounded repair and artifacts.
- **Do not replace GitHub governance with Cursor Automations.**
- **Do not introduce another orchestrator.**
- **Do not adopt self-hosted agents unless a real network/perimeter constraint appears.** Cursor itself recommends managed Cloud Agents for most teams.
- First pilot should target the duplicated **post-PR babysitting/repair loop**, not dispatch/governance.

The highest-value low-risk pilot is to let one bounded, non-production Cursor-created PR use Cursor's native PR subscription/autofix behaviour through CI and review feedback while CorpFlowAI records the result in GitHub. Compare this against the current lifecycle poll/repair path before removing anything.

## CURRENT STATE

```text
GitHub issue / approved packet
        |
        v
CorpFlowAI eligibility + priority + WIP policy
        |
        v
Cursor Factory Handoff (GitHub Actions)
        |
        v
Cursor Automation / Cloud Agent
        |
        +--> branch / code / tests
        |
        +--> PR when produced
        |
        v
CorpFlowAI lifecycle poller
        |
        +--> provider status
        +--> PR/SHA/check verification
        +--> stale/repair handling
        +--> GitHub lifecycle comments
        +--> operator-review label
        |
        v
n8n exception-only notification
        |
        v
Anton only for genuine decision / protected action / release
```

### Current component list

| Component | Current purpose | Evidence-based view |
|---|---|---|
| GitHub issues/labels | Durable scope, priority, approval, review state | RETAIN |
| Cursor Factory Handoff | Select eligible work and wake Cursor | RETAIN FOR NOW |
| Verified WIP/capacity guard | Prevent uncontrolled parallel execution | RETAIN, but align with COO capacity policy rather than fixed one-lane ideology |
| Cursor Cloud Agent | Isolated implementation/test execution | RETAIN / EXPAND native use |
| Cursor lifecycle poller | Completion/status supervision | PARTIALLY DUPLICATED by native Cloud Agent state/subscriptions |
| Custom stale/repair loop | Re-run/follow-up on failures | PILOT replacement with native PR subscription/autofix |
| PR/SHA/check verification | Independent completion integrity | RETAIN independently |
| Queue reconcile | Backfill eligible work after capacity release | RETAIN FOR NOW |
| n8n heartbeat/exception notifier | Exception-only escalation | RETAIN, do not make planner |
| COO read surface | Operator visibility over governed runs | RETAIN only as read surface; do not expand |
| Codex specialist path | Specialist fallback/research path | DEFER; not part of Cursor simplification |
| OpenHands | Historical executor | RETIRED — no action |

## Cursor Capability Assessment

| Cursor capability | Classification | CorpFlowAI implication |
|---|---|---|
| Cloud Agents in isolated managed VMs | USE NOW | Already aligned; should remain primary implementation runtime |
| GitHub/issue/PR triggered Cloud Agents | USE NOW | Can reduce wake/handoff glue where trigger semantics match governance |
| Automations with GitHub/webhook/schedule triggers | PILOT | Powerful, but must not bypass GitHub eligibility/approval rules |
| Issue-comment / PR-review-comment triggers | PILOT | Useful for bounded follow-up and review repair |
| PR subscriptions / automatic follow-up | USE NOW / PILOT | Strong candidate to replace custom PR babysitting and CI repair loops |
| Automatic CI + bot comment repair on agent-created PRs | PILOT FIRST | Highest-value simplification target |
| /babysit or equivalent PR-health automation | PILOT | Same target as above; prove on one non-production PR |
| Cloud subagents / parallel isolated work | USE SELECTIVELY | Useful for bounded parallel research/repair, but COO capacity policy remains authoritative |
| Saved Cloud environments / Builds | USE NOW | Reduces setup variance and repeated install work |
| Multi-repo Cloud environments | DEFER | Use only for real cross-repo delivery; no need to expand architecture now |
| Cursor Cloud MCP diagnostics / artifacts | USE NOW | Prefer native run evidence before building more custom observability |
| Hooks in Cloud Agents | PILOT | Good for repo policy/test enforcement without another service |
| Environment-scoped secrets | USE NOW | Prefer scoped secrets; do not create second secret store |
| Network allowlists / private connectivity | DEFER until needed | Managed agents remain lower-ops path |
| Self-hosted Cloud Agents | NOT SUITABLE NOW | Adds worker fleet, patching, secrets and operational burden without a current perimeter requirement |
| Native spend limits / usage controls | USE NOW | Keep spend envelope in Cursor; GitHub records policy/evidence rather than becoming billing authority |
| Service-account Automations | DEFER / PILOT later | Useful if team identity becomes necessary; avoid more trust relationships now |

## Custom-vs-Native Replacement Matrix

| Current Component | Purpose | Cursor Native Alternative | Recommendation | Risk | Migration Effort |
|---|---|---|---|---|---|
| Factory Handoff | Governed work pickup | GitHub-triggered Automation / issue comment / API start | RETAIN FOR NOW; pilot only after trigger equivalence proven | High if governance bypassed | M |
| Queue Reconcile | Re-awaken eligible work | Automations/subscriptions | RETAIN FOR NOW | Medium | M |
| Lifecycle status poller | Track run completion | Native agent state + subscriptions + Cloud diagnostics | SIMPLIFY AFTER PILOT; keep independent reconciliation | Medium | M |
| Custom stale follow-up | Repair stalled/failed work | Native follow-up / PR subscription | PILOT REPLACEMENT | Low–Medium | S |
| Custom PR CI repair | Fix CI after implementation | Native PR subscription/autofix, /babysit | PILOT FIRST | Low | S |
| Custom review-comment repair | Address reviewer/bot comments | PR review triggers + subscriptions | PILOT FIRST | Low | S |
| Completion evidence synthesis | Produce PR/SHA/check evidence | Cursor artifacts + GitHub checks | RETAIN independent verifier; consume native artifacts | Low | S |
| COO run visibility API | Read governed run state | Cursor Cloud diagnostics + GitHub | RETAIN bounded; stop expanding | Low | None |
| n8n lifecycle watching | Notify exceptions | Cursor notifications could overlap | RETAIN exception-only until native notification proves equivalent | Low | S |
| Secrets bridge/custom secret handling | Runtime credentials | Cursor environment-scoped secrets/OIDC | PREFER NATIVE where safe; no migration without approval | High | M |

## TARGET STATE

```text
CorpFlowAI Controller / GitHub
  - priority
  - approved scope
  - eligibility
  - WIP / spend policy
  - protected gates
  - acceptance criteria
          |
          v
Cursor native execution
  - isolated environment
  - implementation
  - tests
  - branch + PR
  - PR subscription
  - CI/comment repair
  - artifacts / readiness evidence
          |
          v
Independent GitHub verification
  - scope
  - checks
  - security
  - PR/SHA evidence
  - PASS / CHANGES
          |
          v
Human only for real decisions
  - material scope/architecture
  - spend expansion
  - secrets/access
  - production release
  - legal/commercial
```

## Anton Intervention Audit

| Current intervention | Target |
|---|---|
| Copy/paste work instructions into Cursor | ELIMINATE |
| Manually wake ordinary approved work | ELIMINATE where trigger equivalence is proven |
| Relay outputs between Cursor/GitHub | ELIMINATE |
| Check whether Cursor woke up | AUTOMATE / exception-only |
| Diagnose ordinary stalled PR repair | AUTOMATE using native subscription/autofix first |
| Manually move routine lifecycle state | ELIMINATE |
| Re-explain repository context | ELIMINATE via AGENTS.md/repo instructions/environment |
| Approve ordinary reversible technical work | ELIMINATE |
| Approve production release / secrets / spend / material architecture | RETAIN |

## Secrets / Governance Impact

Target principle: **fewer trust relationships**.

- Keep GitHub as authority for approved scope and auditable delivery state.
- Use the Cursor GitHub App rather than personal credentials for repository access.
- Prefer Cursor environment-scoped secrets for Cloud Agent runtime needs.
- Prefer short-lived/OIDC access where a supported external system requires cloud identity.
- Do not add a second secret store.
- Do not expose secrets in prompts, issues, PRs, logs or artifacts.
- Do not move production credentials into Cursor merely for convenience.
- Do not adopt self-hosted workers unless managed Cloud Agents cannot meet a documented security/network requirement.

## Cost / Complexity Comparison

The proposed direction should reduce:
- custom lifecycle code;
- scheduled polling;
- repair orchestration;
- manual intervention;
- duplicated run-state interpretation.

It may increase native Cloud Agent runtime usage during autonomous CI/review follow-up. The relevant metric is therefore not raw token cost; it is **cost per successfully verified work package**.

Required pilot measurements:
- number of custom workflow executions;
- Cursor agent runs/follow-ups;
- provider-reported cost where available;
- human interventions;
- elapsed time from implementation start to review-ready PR;
- failed/repeated repair attempts;
- final verified result.

## Prioritised Simplification Backlog

1. **PILOT: Native PR subscription/autofix versus custom PR babysitting.**
2. Consolidate lifecycle status polling to reconciliation/fallback only if pilot passes.
3. Test Cursor GitHub trigger equivalence for one governed issue without removing Factory Handoff.
4. Replace duplicated review-comment repair with native Cursor PR triggers if pilot proves reliable.
5. Reassess Queue Reconcile only after native pickup is proven against CorpFlowAI eligibility/WIP rules.
6. Prefer Cursor artifacts/Cloud diagnostics over additional custom observability.
7. Review n8n overlap last; retain exception-only notification until proven redundant.
8. Self-hosted agents remain deferred.

## Recommended First Pilot

### Scope

Use one bounded non-production/internal PR (not OrixHealth and not a protected production change). Let Cursor create or take ownership of the PR and use native PR subscription/autofix behaviour to:

- observe CI;
- address one synthetic failing check or bounded review comment;
- update the same branch/PR;
- reach review-ready state;
- produce native artifacts/evidence.

CorpFlowAI remains responsible for final GitHub verification.

### Expected benefit

Prove whether Cursor can replace the custom PR-health/repair portion of the factory without touching work eligibility, approvals, production controls or GitHub source-of-truth semantics.

### Implementation steps

1. Select a low-risk internal test issue/PR.
2. Record baseline current factory path.
3. Enable/use native PR subscription or /babysit for that PR.
4. Introduce one bounded synthetic CI/review condition.
5. Observe whether Cursor repairs it without Anton intervention.
6. Independently verify PR/SHA/checks in GitHub.
7. Compare intervention count, time, cost and failure modes.
8. PASS: prepare a small PR removing or downgrading only the duplicated custom repair path to fallback.
9. FAIL: retain current path; record exact native gap.

### Affected repo/workflows

Pilot should initially avoid modifying production workflows. Candidate later cleanup targets if PASS:
- `.github/workflows/cursor-agent-lifecycle-status.yml`
- custom stale/follow-up logic in Cursor lifecycle code
- any PR-health-specific repair branch in the factory controller

### Risks

- Native subscription may not expose enough deterministic evidence for governance.
- Native follow-up may spend more agent runtime than the custom bounded repair.
- Trigger identity/permissions may differ from the current GitHub App path.
- Cursor may repair CI correctly but fail CorpFlowAI's completion-integrity requirements.

### Rollback

No removal during pilot. Existing lifecycle/repair path remains intact. If native behaviour fails, stop using it and keep current factory unchanged.

### PASS evidence

- same PR reaches green/review-ready state;
- no Anton courier intervention;
- no protected action;
- GitHub retains complete PR/SHA/check evidence;
- native run/cost evidence captured;
- fewer custom repair steps than baseline;
- no reduction in security/governance.

## Decision Required from Anton

**None for this audit.**

A later account-level Cursor Automation, service-account, secrets or access change still requires explicit approval where it changes trust, credentials, spend authority or production access.

## Immediate operating decision

Do **not** start this pilot ahead of the OrixHealth Friday delivery path. The pilot is Lane B internal simplification and must yield to active client/revenue work under the COO Operating Constitution.
