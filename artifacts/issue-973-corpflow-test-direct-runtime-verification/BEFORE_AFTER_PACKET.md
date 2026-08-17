# #973 before/after evidence packet — corpflow_test preview gate

**Status:** Example packet for issue #973 (not a live client change).  
**Environment:** `corpflow_test`  
**Protected consequence:** none

## Before (redundant preview gate)

A Lux `/change` layout packet was treated as incomplete unless:

1. Vercel Preview for the branch was `READY` (`*.vercel.app`).
2. `npm run smoke:change-overflow` passed against that preview URL (bypass secret required).
3. Only then could the PR merge.
4. After merge, the same smoke had to pass on `https://lux.corpflowai.com`.

That duplicated verification, conflicted with preview-skip policy (`lib/server/vercel-preview-deploy-policy.js`), and asked operators for preview evidence on a host that is already the agreed test environment.

Example packet that would have been blocked:

```text
environment: corpflow_test
workKind: runtime
previewUrl: (empty — ordinary cursor branch has no preview deploy)
liveTestUrl: https://lux.corpflowai.com/change
deterministicTestsPassed: true
old_gate: INCOMPLETE because preview missing
```

## After (direct test-runtime verification)

Canonical sequence:

```text
build -> test-runtime publish where required -> verify on corpflow_test -> operator review -> next action
```

Same packet now:

```text
environment: corpflow_test
workKind: runtime
previewUrl: (empty)
liveTestUrl: https://lux.corpflowai.com/change
deterministicTestsPassed: true
evaluateDeliveryEvidencePacket: COMPLETE
reason: corpflow_test_live_verified_without_preview
preview_required: false
```

Evaluator: `lib/server/corpflow-test-evidence-policy.js`.

## Still fail-closed

| Packet | Result |
|--------|--------|
| Docs/config only, tests passed, no URL | COMPLETE — no invented runtime URL |
| corpflow_test runtime, preview only, no live test URL | INCOMPLETE — live test host still required |
| client_production without exact authorization | FAIL_CLOSED |
| client_production authorized but only a preview URL | FAIL_CLOSED — preview does not satisfy |

## Operator wording to stop using

Do **not** write: “blocked waiting for preview URL” or “merge only after `*.vercel.app` smoke” for CorpFlowAI test-only work.

Do write: “verify on the live corpflow_test URL after test-runtime publish; preview optional.”
