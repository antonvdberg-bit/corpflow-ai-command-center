# Reference-tenant client journey acceptance v1

**Issue:** [#1120](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1120)
**Parent:** [#773](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/773)
**Reuses:** [#884](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/884) / PR #884 expose-for-review · [#1077](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1077) request/review/change continuity · [#1104](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1104) Tenant Workspace simplification
**Environment:** `corpflow_test` after merge/publish. This packet does not authorize `client_production`.
**No schema. No env/secrets. No deploy. No external send. No factory/relay work. No second client portal.**

<!-- REFERENCE_TENANT_CLIENT_JOURNEY_ACCEPTANCE_V1 -->

## 0. What is true when this slice is done

A CorpFlowAI reference-tenant user can complete one client-side journey:

`Tenant sign-in → /app/tenant → Requests & Progress → exposed component → comment / approve / request changes → Core sees the decision → Service & change reaches /change`

Tenant chrome shows only client-appropriate context. There is no Choose workspace chip, no staff chooser, no proof-harness advertising, and no internal data-source label.

## 1. Product repairs in this packet

The #884 / #1077 / #1104 runtime already implements the journey. This packet repairs the remaining **client-facing** defects:

| Surface | Before | After |
| --- | --- | --- |
| Unauthenticated `/app/tenant` | Staff workspace chooser + proof-harness hint | Tenant sign-in only |
| Signed-in Tenant chrome | Internal `data source` label | Requests, review, and service copy only |
| `/app/commercial`, `/app/delivery` | Unclassified | Staff-only fail-closed (not tenant routes) |

## 2. Journey contract (unchanged systems)

1. Tenant signs in with existing `typ=tenant` session. CorpFlowAI is a normal tenant.
2. A live Tenant session on `/app` continues at `/app/tenant`.
3. Nav is **Requests & Progress** plus **Service & change**.
4. Review controls render only when `exposed_for_client_review === true` (#884). Internal components stay view-only.
5. Comment / approve / request changes persist through `POST /api/app/component-review` into existing `cmp_tickets.console_json`.
6. Core request detail shows `latest_client_decision`.
7. Service & change is a GET to `/change?from=tenant-workspace`. Navigation does not create a ticket.
8. Tenant cannot operate `/app/core`, `/app/commercial`, `/app/delivery`, Operating Workspace APIs, or GitHub/PR/agent/internal-note fields.

## 3. Explicit non-actions

- No new tenant/auth model
- No second review or portal system
- No factory / relay / orchestrator / watchdog work
- No schema / migration / env / secrets
- No replacement of `/change`
- No merge, deploy, payment, or live send

## 4. Verification

```bash
node --test \
  node-tests/tenant-client-journey-acceptance.test.mjs \
  node-tests/tenant-workspace-simplification.test.mjs \
  node-tests/tenant-journey-continuity.test.mjs \
  node-tests/app-slice3-review-persistence.test.mjs \
  node-tests/app-slice1-access.test.mjs
```

Promptfoo / AI eval: **NOT APPLICABLE** — client chrome, route classification, and existing review contract only. No AI behaviour, prompts, drafting, model routing, tenancy-prompt handling, or protected-action AI handling changed.

## 5. corpflow_test URLs (after merge/publish)

- `https://core.corpflowai.com/app/tenant`
- `https://core.corpflowai.com/app` (tenant session redirects)
- `https://core.corpflowai.com/change?from=tenant-workspace`
- `https://lux.corpflowai.com/change`

## 6. Delivery Reality (this packet)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a (awaiting review + merge + deploy)
- Commit deployed: n/a
- Live URLs tested: current corpflow_test GET baseline (this commit not live yet)
- Expected vs actual result: Client journey + tenant chrome locally; live verification after publish
- Client-facing flow usable: PARTIAL until merge + corpflow_test publish
- Final verdict: PARTIAL
```
