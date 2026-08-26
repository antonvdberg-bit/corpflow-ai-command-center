# Tenant request / review / change continuity v1

**Issue:** [#1073](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1073)
**Parent:** [#772](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/772)
**Related:** [#884](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/884) / merged PR [#884](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/884) expose-for-review · [#1006](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1006) Tenant Workspace simplification (chooser redirect + hide Operating Workspace chrome) · `/change`
**Environment:** `corpflow_test` after merge/deploy. This packet does not authorize `client_production`.
**No schema. No env/secrets. No deploy. No external send. No second ticket/request model.**

<!-- TENANT_REQUEST_REVIEW_CHANGE_CONTINUITY_V1 -->

## 0. What is true when this slice is done

A synthetic tenant user can complete one coherent journey:

`Request / progress → deliberately exposed review → comment / approve / request changes → service/change request through /change → return to Tenant Workspace`

They always know:

- where they are (Tenant Workspace chrome + tenant label);
- what they can act on (#884 review controls only on exposed components);
- how to raise or change a request (canonical `/change`, not a second app).

`/change` remains the canonical service/change surface. Navigation to `/change` does **not** create a ticket.

## 1. Tenant route / navigation matrix

Machine copy: `TENANT_ROUTE_NAV_MATRIX` in `lib/app/tenant-journey.js`.

| Route or nav | Disposition | Reason |
| --- | --- | --- |
| `/app/tenant` | **CANONICAL** | Tenant Workspace shell: requests, progress, #884 review |
| nav: Requests & Progress | **RETAINED** | In-shell client-safe requests / review |
| nav: Service & change | **CANONICAL** | In-nav link to `/change?from=tenant-workspace` |
| `/change` | **CANONICAL** | Existing tenant service/change; not replaced |
| nav: Home / Overview | **RETIRED** | Duplicated requests; leftover language |
| nav: My Work | **RETIRED** | Operating Workspace concept |
| nav: Documents / Reports / Support | **RETIRED** | Placeholders that treated `/change` as leftover |
| `/app/core`, `/app/today`, `/app/prospects`, `/app/workbench`, `/app/pipeline`, `/app/queue`, `/app/clients` | **STAFF_ONLY_FAIL_CLOSED** | Tenant session 403 |

## 2. Continuity contract

1. Tenant signs in with existing `typ=tenant` session (CorpFlowAI is a normal tenant).
2. `/api/app/requests` and `/api/app/request` project **tenant-safe** fields only (`projectTenantRequest`).
3. Review controls render only when `exposed_for_client_review === true` (#884). Internal components stay view-only.
4. Comment / approve / amend (`Request changes`) / reject persist through `POST /api/app/component-review` into existing `cmp_tickets.console_json`.
5. Service & change is a deliberate GET to `/change?from=tenant-workspace`. No Core/admin chrome on that entry. No ticket created by navigation.
6. `/change` shows a Tenant Workspace continuity banner and **Back to Tenant Workspace** (`/app/tenant?from=change`).
7. Staff-only Operating Workspace routes and cross-tenant records remain fail-closed.

## 3. Explicit non-actions

- No new tenant/auth model
- No portal redesign or broad design-system work
- No messaging automation
- No schema / migration
- No replacement of `/change`
- No duplicate ticket/request created by navigation alone
- No merge, deploy, secrets, payment, or live send

## 4. Verification

```bash
node --test \
  node-tests/tenant-journey-continuity.test.mjs \
  node-tests/workspace-context.test.mjs \
  node-tests/app-slice1-handlers.test.mjs \
  node-tests/app-slice1-access.test.mjs \
  node-tests/app-slice1-review.test.mjs \
  node-tests/app-slice3-review-persistence.test.mjs \
  node-tests/app-today-my-work.test.mjs
```

Promptfoo / AI eval: **NOT APPLICABLE** — nav/continuity and existing review contract only. No AI behaviour, prompts, drafting, model routing, or protected-action AI handling changed.

## 5. Delivery Reality (this packet)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a (awaiting review + merge + deploy)
- Commit deployed: n/a
- Live URLs tested: local harness + current corpflow_test GET baseline (this commit not live yet)
- Expected vs actual result: Tenant journey nav + /change handoff + #884 review persist locally
- Client-facing flow usable: PARTIAL until merge + corpflow_test publish
- Final verdict: PARTIAL
```
