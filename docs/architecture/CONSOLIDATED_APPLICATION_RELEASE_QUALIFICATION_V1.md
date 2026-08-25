# CorpFlowAI consolidated application — release qualification v1

**Issue:** [#1075](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1075)  
**Parent:** [#772](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/772)  
**Environment:** `corpflow_test`  
**Status:** Qualification of current `main` as one coherent application. Defect correction only.  
**Machine copy:** `lib/app/consolidated-release-qualification.js`

<!-- CONSOLIDATED_APPLICATION_RELEASE_QUALIFICATION_V1 -->

## Verdict

**`CORPFLOWAI CONSOLIDATED APPLICATION READY FOR OPERATOR REVIEW`**

This is operator review of the **current-main product**, not a client_production launch and not a merge instruction.

Dedicated Commercial (`/app/commercial`, #1004 / PR #1045) and Delivery (`/app/delivery`, #1005 / PR #1048) routes are **NOT LIVE**. The staff journey uses the current-main stand-ins: Prospect commercial clearance, Website Rescue delivery on Prospect detail, and `/change` for tenant service/change. Those later slices were **not duplicated**.

## Probe (live corpflow_test)

| Item | Value |
| ---- | ----- |
| Factory host | `https://core.corpflowai.com` |
| Lux host | `https://lux.corpflowai.com` |
| Commit on Production spine | `b82979d7518f40f9ec3f32435ed5540c80240416` |
| GitHub Production deployment | `6082122270` |
| Probed | 2026-08-25 |

Unauthenticated GET of canonical `/app/*` and `/change` returned **HTML 200**. Admin desks returned **307 to login**. `/app/commercial` and `/app/delivery` returned **404**. Authenticated visual walkthrough on live hosts still needs an operator Core/Tenant session (this packet used synthetic proof handlers plus live HTTP).

## What was not duplicated

Open implementation PRs at qualification time — tested around, not re-implemented:

| Issue | PR | Topic |
| ----- | -- | ----- |
| #1004 | #1045 | Commercial summary route |
| #1005 | #1048 (draft) | Delivery summary route |
| #1006 | #1047 (draft) | Tenant Workspace simplification |
| #1072 | #1076 | Prospect-to-client-to-delivery continuity |
| #1073 | #1077 | Tenant request/review/change continuity |
| #1074 | #1084 | Legacy desk retirement wave 1 |

## Route matrix

| Path | LIVE | Purpose | Auth / tenant | Source of truth | Desktop / mobile | Defects | Legacy |
| ---- | ---- | ------- | ------------- | --------------- | ---------------- | ------- | ------ |
| `/app` | LIVE 200 | Workspace chooser | Public doors; separate sign-in | none | PASS wrap | none | Replaces `/change`-as-home |
| `/app/core` | LIVE 200 | Operating Workspace | Core only; Tenant 403 | `cmp_tickets` | PASS | none | Product name over Core shell |
| `/app/tenant` | LIVE 200 | Tenant Workspace | Tenant bound; Core cannot enter | `cmp_tickets` client-safe | PASS | Placeholder nav (#1006) | Client-safe progress in-shell |
| `/app/today` | LIVE 200 | Today / My Work | Core only | `leads` | PASS overflow-x | none | My Work no longer unfiltered Requests |
| `/app/queue` | LIVE 200 | Action Queue | Core only | `leads` | PASS | none | Reduces Rapid Delivery desk |
| `/app/workbench` | LIVE 200 | Prospect Workbench | Core only | `leads` | PASS | none | Reduces Lead Rescue desk |
| `/app/pipeline` | LIVE 200 | Pipeline | Core only | `leads` / `canonical_stage` | PASS lane scroll | none | Replaces `/change/revenue` as canonical |
| `/app/prospects` | LIVE 200 | Prospect list | Core only | `leads` | PASS | none | Shared list |
| `/app/prospects/[id]` | LIVE 200 | Shared detail + commercial + Website Rescue delivery | Core only | `leads` + JSON | PASS | missing-record back path fixed here | Shared over product-desk detail |
| `/app/clients` | LIVE 200 | Clients summary | Core only | `company_master` | PASS | none | No second Client table |
| `/app/clients/[id]` | LIVE 200 | Client summary | Core only | `company_master` + related `leads` | PASS | none | Links prospect / `/change` |
| `/app/commercial` | **NOT LIVE** 404 | Later slice | — | — | 404 now offers Open workspace | Open PR #1045 | — |
| `/app/delivery` | **NOT LIVE** 404 | Later slice | — | — | 404 now offers Open workspace | Draft PR #1048 | — |
| `/change` | LIVE 200 (core + lux) | Ticket / change / service | Tenant or admin | `cmp_tickets` | PASS | none | Canonical tickets |
| `/change/revenue` | LIVE 200 | Optional checklist | mixed | localStorage | PASS; links to `/app/pipeline` | Do not demo as pipeline | MIGRATE (#1074) |
| `/change-v2` | LIVE 200 | Experimental | mixed | `cmp_tickets` | PASS; links to `/change` | Not canonical | Not promoted |
| `/admin/lead-rescue` | AUTH 307 | Temporary desk | admin SSR | `leads` | n/a unauth | Still live; #1074 owns retirement | MIGRATE to `/app/workbench` |
| `/admin/rapid-delivery` | AUTH 307 | Temporary desk | admin SSR | `leads` | n/a unauth | Still live; #1074 owns retirement | MIGRATE to `/app/queue` |
| `/admin/company-master` | AUTH 307 | Evidence editor | admin SSR | `company_master` | n/a unauth | none | REUSE; summary is `/app/clients` |

## Integrated proof

**A. Staff** (synthetic proof fixtures): Today → Queue → Prospect `syn-772-lr-ada` (Ada Spa, commercial clearance on the same `leads` row) → Client `cmp_ada_spa_synthetic` (related prospect is that same id) → Commercial stand-in on Prospect detail → Delivery stand-in via Website Rescue panel `syn-716-wr-cleared` and `/change`.

**B. Tenant** (synthetic proof fixtures): `/app` → `/app/tenant` Requests & Progress → exposed `landing_copy` approve → `/change` as the canonical ticket sibling. Tenant nav still omits staff prospect/queue/clients routes.

**C. Fail closed:** Tenant actor receives 403 `core_access_denied` on all staff `/api/app/{today,queue,workbench,pipeline,prospects,prospect,clients,client,component-expose}` routes. Other-tenant request id returns 404. Core cannot call Tenant review.

**D. One source of truth each:** prospects = `leads`; clients = `company_master`; tickets = `cmp_tickets`. `/change/revenue` localStorage is not canonical. No second CRM.

**E. Release-blocking defects in this PR:** unknown `/app` `/admin` `/change` URLs no longer strand on a homepage-only 404; missing Prospect detail has a path back. Remaining later-slice gaps are listed as NOT LIVE / open PRs, not as this packet’s blocker.

## Operator demo path (synthetic)

Proof query is **local / Preview harness only**. On live `corpflow_test`, sign in with Core or Tenant and omit `?proof=1`.

1. Open `/app`. Choose **Operating Workspace**.
2. **My Work** → `/app/today`.
3. **Action Queue** → `/app/queue`. Open **Ada Spa**.
4. Confirm identity + **Commercial clearance** on `/app/prospects/syn-772-lr-ada`.
5. **Clients** → `/app/clients/cmp_ada_spa_synthetic`. Related prospect is Ada Spa. Use **Delivery / Change** only as the tenant service sibling.
6. Open `/app/prospects/syn-716-wr-cleared` for **Website Rescue onboarding and delivery**.
7. Choose workspace again → **Tenant Workspace** → Requests & Progress → approve exposed Landing copy.
8. Open `/change` (same ticket family; not a second project system).

Do **not** demo `/change/revenue` as the pipeline, `/change-v2` as production, or `/admin/lead-rescue` / `/admin/rapid-delivery` as the canonical desks.

## Loading / empty / error / mobile

Canonical `/app` pages use `AppLoadState` for loading and error, sign-in for unauthenticated, access-denied for the wrong workspace, and list empty states. Chrome and nav wrap; tables and the pipeline board scroll horizontally under 640px.

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: 6082122270 (GitHub Production for probed main; this PR is not that commit)
- Commit deployed (probed current main): b82979d7518f40f9ec3f32435ed5540c80240416
- Live URLs tested: https://core.corpflowai.com/app, /app/core, /app/tenant, /app/today, /app/queue, /app/workbench, /app/pipeline, /app/prospects, /app/clients, /change, /change/revenue, /change-v2; https://lux.corpflowai.com/, /change, /app, /app/tenant; /app/commercial and /app/delivery 404; admin desks 307 login
- Expected vs actual result: Canonical routes live HTML 200; commercial/delivery summaries not on main; staff/tenant synthetic journeys pass; fail-closed holds
- Client-facing flow usable: YES for operator review of current-main product on corpflow_test (authenticated visual still operator-owned)
- Final verdict: PARTIAL for live authenticated operator demo; qualification verdict READY FOR OPERATOR REVIEW
```

Promptfoo / AI eval: **NOT APPLICABLE** — no AI behaviour, prompts, drafting, model routing, tenancy of AI outputs, or protected-action AI handling changed.

## Anton action

NONE until a genuine merge / deploy / release decision.
