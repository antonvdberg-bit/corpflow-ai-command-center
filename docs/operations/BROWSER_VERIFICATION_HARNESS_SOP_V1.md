# Browser Verification Harness SOP v1

**Status:** Proposed canonical operating procedure  
**Controller:** #1348  
**Applies to:** preview, test, client-review and live verification of CorpFlowAI and tenant surfaces  
**Mode:** read-only

## Purpose

Use the existing local Browser Verification Harness as a consistent evidence gate. The harness does not approve a release by itself; it produces evidence for an operator/client approval decision.

## Invocation and evidence root

Canonical local script:
`C:\CorpFlowAI-Work\Browser\Scripts\Verify-Browser.ps1`

Evidence root:
`C:\CorpFlowAI-Work\Browser\Evidence`

Each run must use a unique folder:
`YYYYMMDD-HHMMSS-<tenant-or-surface>-<purpose>`

Examples:
- `20260927-103000-cafe-international-preview`
- `20260927-104500-corpflowai-public-live`

Required outputs:
- desktop full-page screenshot
- mobile full-page screenshot
- accessibility snapshot
- `summary.json`
- `report.md`
- sanitized `raw.log`

Never retain credentials, tokens, cookies, authorization headers or secret-bearing URLs in evidence.

## When to run

Run the harness:
1. when a visible slice first becomes reviewable;
2. before asking a client/operator to approve a preview;
3. after material changes to navigation, authentication, forms, client-facing content or integration paths;
4. immediately before a protected production-deploy approval request where a preview exists;
5. after approved production deployment/cutover;
6. after an incident or client-reported visible defect;
7. quarterly for active client surfaces where the normal migration audit requires a visual/runtime check.

Do not run repetitive evidence merely to create activity. Reuse a recent run if the exact SHA/deployment and target URL are unchanged.

## Minimum assertions

Every run should identify:
- exact URL;
- environment: preview / corpflow_test / client_production / internal;
- tenant/workspace context where applicable;
- expected visible text or selector;
- desktop and mobile rendering;
- console errors;
- failed network requests / HTTP 4xx or 5xx;
- obvious auth/tenant-boundary leakage;
- expected navigation shell;
- exact deployment/commit where obtainable.

## Verdict rules

### PASS

Use PASS only when:
- required URL loads;
- expected text/selector is present;
- no material console error is observed;
- no required static/runtime request fails;
- mobile and desktop render sufficiently for the intended review;
- no obvious tenant/workspace/auth boundary defect is visible;
- the tested journey reaches the intended review point.

PASS means **technical evidence gate passed**. It does not mean client acceptance, commercial approval, production approval or completion.

### WARN

Use WARN when the primary journey is usable but evidence reveals a non-blocking defect, uncertainty or dependency, for example:
- non-critical console warning;
- missing optional asset;
- visual polish issue;
- expected protected API returns 401/403 while the public shell is otherwise correct;
- incomplete evidence for a secondary path;
- a discrepancy that needs investigation but does not invalidate the tested review step.

Every WARN must name:
- exact finding;
- likely impact;
- owner;
- whether it blocks client review, approval or production.

### FAIL

Use FAIL when:
- target route does not load;
- required text/selector is absent;
- material static/runtime assets fail;
- required API/journey fails;
- broken navigation prevents the intended task;
- tenant/auth boundary appears incorrect;
- desktop/mobile rendering makes the intended client task unusable;
- evidence cannot establish which build/deployment is being reviewed.

FAIL blocks the relevant approval step until fixed or explicitly accepted as an exception by the decision owner.

## Approval use

Evidence flow:
`build -> preview -> harness -> callback/review -> approve -> deploy -> harness/live validation`

The harness never bypasses protected gates.

A production approval request should contain:
- target URL;
- commit/SHA;
- preview/deployment ID;
- harness verdict and evidence path;
- known WARN items;
- rollback/recovery note;
- explicit protected action requested.

## Application-consolidation check

For #772 alignment, every visible verification must also ask:
- Is this surface part of the canonical Operating Workspace or Tenant Workspace?
- Is it reusing an existing app capability rather than creating a new standalone mini-app?
- Which legacy/temporary route does it reduce, replace or leave intentionally temporary?
- Does it preserve one Postgres and one authentication model?

A technically PASS page that increases unnecessary route/product fragmentation is not automatically delivery-complete.

## GitHub recording

Record durable results in the governing delivery issue, not a new issue for every run.

Recommended comment shape:

```text
BROWSER VERIFICATION
Date:
Surface:
URL:
Environment:
SHA/deployment:
Purpose:
Verdict: PASS | WARN | FAIL
Desktop:
Mobile:
Console/network:
Tenant/workspace boundary:
Application-consolidation note:
Evidence path:
Blocker:
Next owner/action:
Anton needed? YES/NO
```

Create a separate defect issue only when the finding needs independent ownership, as with #1349.

## Read-only guardrail

The harness must not:
- submit forms;
- mutate configuration;
- change data;
- deploy;
- send email/SMS/WhatsApp;
- initiate payment;
- change DNS;
- alter secrets/env;
- perform production/server mutation.
