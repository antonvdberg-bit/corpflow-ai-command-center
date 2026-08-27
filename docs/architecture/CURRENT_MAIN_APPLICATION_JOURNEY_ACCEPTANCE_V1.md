# Current-main application journey acceptance v1

**Issue:** [#1149](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1149)
**Parents:** [#772](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/772), [#1120](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1120), [#1004](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1004), [#1005](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1005)
**Merged foundations:** [#1124](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1124) Tenant journey, [#1122](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1122) Commercial Workspace, [#1142](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1142) Delivery Workspace
**Environment:** `corpflow_test`
**No schema. No env/secrets. No deploy. No external send. No factory/orchestration. No second tenant/client model.**

<!-- CURRENT_MAIN_APPLICATION_JOURNEY_ACCEPTANCE_V1 -->

## 0. What is true when this packet is done

The now-merged CorpFlowAI application on current `main` is usable as **one** client/operator journey:

`Tenant Workspace → Requests & Progress / controlled review → /change service request → Operating Workspace Commercial → Delivery → linked client/prospect evidence`

Merged code is not treated as completion. This packet proves live route presence, fail-closed staff surfaces, desktop/mobile chrome, and existing-record links.

## 1. Journey contract (unchanged systems)

1. Tenant signs in with existing `typ=tenant` session. CorpFlowAI is a normal reference tenant (`corpflowai`).
2. Tenant chrome is **Requests & Progress** plus **Service & change**. No Choose workspace, no staff Commercial/Delivery nav.
3. Review controls render only when `exposed_for_client_review === true` (#884). Internal components stay view-only.
4. Service & change is a GET to `/change?from=tenant-workspace`. Navigation does not create a ticket. `/change` remains canonical.
5. Staff Core/admin session opens `/app/commercial` and `/app/delivery` over existing #714 rail, Company Master identity, Lead Rescue / Website Rescue leads, and Change/request records.
6. Those staff rows link to existing `/app/prospects/[id]`, `/app/clients/[id]`, `/admin/company-master`, and `/change`. No duplicate business records.
7. Tenant cannot operate `/app/commercial`, `/app/delivery`, or other Operating Workspace APIs (403 `core_access_denied`).
8. Production (`VERCEL_ENV=production`) rejects `?proof=1`. Authenticated live exercise needs an existing tenant or Core session — this packet does not invent credentials.

## 2. Explicit non-actions

- No new tenant/auth model
- No second review, commercial, delivery, or client portal
- No factory / relay / orchestrator work
- No schema / migration / env / secrets
- No replacement of `/change`
- No merge, deploy, payment, or live send

## 3. Verification

```bash
node --test node-tests/current-main-application-journey-acceptance.test.mjs
node scripts/current-main-application-journey-probe-evidence.mjs
# optional local Next screenshots:
NEXT_PORT=3050 node scripts/current-main-application-journey-capture-screenshots.mjs
```

Promptfoo / AI eval: **NOT APPLICABLE** — route usability, workspace chrome, and existing fail-closed access only. No AI behaviour, prompts, drafting, model routing, tenancy-prompt handling, or protected-action AI handling changed.

## 4. corpflow_test URLs

- `https://core.corpflowai.com/app/tenant`
- `https://core.corpflowai.com/change?from=tenant-workspace`
- `https://core.corpflowai.com/app/commercial`
- `https://core.corpflowai.com/app/delivery`
- `https://lux.corpflowai.com/change`
- `https://core.corpflowai.com/api/factory/health`

## 5. Authenticated live boundary

`isProofModeAllowed()` is false on Vercel Production. Unauthenticated `GET /api/app/shell?proof=1` returns `401 authentication_required`. This packet reuses in-process / local proof fixtures (`slice1-proof-tenant`, `slice1-proof-core`, `syn-772-*`, `syn_slice1_req_corpflowai_001`) and does **not** create a login or mutate client records.

## 6. Verdict (this execution)

Current `main` SHA: `70dadee1034a283b3f8241b3f647e0679df31b4c`  
Production GitHub deployment: `6117822038` (success) serving that SHA.

**`CORPFLOWAI CURRENT-MAIN APPLICATION JOURNEY USABLE`**

Authenticated live Tenant/Core sessions were not invented. Production rejects `?proof=1`. Operator sign-in with an already-provisioned test identity remains the live authenticated path.

Evidence: `artifacts/current-main-application-journey-1149/`.
