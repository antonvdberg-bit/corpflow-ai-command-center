# Paddle sandbox proof — raw webhook body fix

Source issue: #1398  
Branch: `cursor/factory-handoff-issue-1398-279b`  
Head: `16a885a8597c9e112d5611da0bc93389def14c4a`  
Pull request: https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1403  
Environment: `corpflow_test` / Paddle sandbox only

## What changed

Paddle sandbox deliveries were reaching `/api/paddle/webhook` and returning HTTP 400 `raw_body_and_signature_required`. Next.js parsed the JSON body before the shared `api/factory_router.js` handler ran, so the original bytes were gone. The fix turns off that parser for the single factory function, keeps the exact bytes on the Paddle webhook route, and parses every other route the same way Next did before. Signature checks stay fail-closed. The body is not rebuilt with `JSON.stringify`.

## Local evidence

`node --test node-tests/paddle-sandbox-webhook-raw-body.test.mjs node-tests/paddle-sandbox-state.test.mjs` — 12/12 pass.

Covered:

- the original Paddle bytes, including spacing that `JSON.stringify` would change, reach the webhook handler
- a valid signature is accepted
- an invalid signature is rejected and writes no state
- a parsed object is not reconstructed into a signature payload
- unrelated routes match Next.js body parsing, including invalid JSON and the 1mb limit

## Preview

Vercel Preview for this commit completed.

- Unique deployment: `https://corpflow-ai-command-center-8auexz4ad-corpflowai.vercel.app`
- Branch alias: `https://corpflow-ai-command-center-git-cursor-factory-22cb94-corpflowai.vercel.app`
- GitHub deployment: `6873114451`
- Commit: `16a885a8597c9e112d5611da0bc93389def14c4a`

An unauthenticated GET of `/api/paddle/status` on both URLs returned HTTP 302 to Vercel Authentication. This host does not have the protection-bypass secret or a Paddle sandbox API key, so the failed notifications were not redelivered from here and the live status JSON was not read.

## Verdict

PARTIAL. Do not treat this as sandbox PASS. `payment_confirmed`, subscription state, and `entitlement_eligible` are not proven on the live preview.

No merge to main. No production deployment.
