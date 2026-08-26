# Rare & Exclusive #35 — Factory decision packet (#1094)

**Status:** BLOCKED at the first executable boundary. No product PR was opened in `antonvdberg-bit/rare-and-exclusive-collection`.
**Date:** 2026-08-26
**Controller:** CorpFlowAI #1094 / work request `cfai-wr-b92f8c66-dc8f-4a21-a824-489a8de26789`
**Handoff run:** 32925158852
**Cursor agent:** `bc-b92f8c66-dc8f-4a21-a824-489a8de26789`

This packet is factory evidence only. It is **not** a Rare & Exclusive product change, **not** Issue #35 clearance, and **not** Jan approval.

---

## Required evidence

| Field | Value |
|---|---|
| Starting branch | `cursor/factory-handoff-issue-1094-9ba4` (CorpFlowAI Command Center) |
| Starting SHA | `e06999256806c27097a62ac75b6f26f9b0fb6294` (`origin/main` after refresh/rebase) |
| Exact root cause / current gap | Cursor Cloud GitHub identity and this environment can access **only** `antonvdberg-bit/corpflow-ai-command-center`. The required product repository `antonvdberg-bit/rare-and-exclusive-collection` is private and unresolved (`gh issue view` GraphQL repository-not-found; `git ls-remote` “Repository not found”; GitHub API HTTP 404 for repo / issue #35 / PR #33). `rare-exclusive-greenfield`, PR #33, issue #35, and the raw verification log were **not** readable, so the test-count correction and any repo-side verification change could not be made. |
| Files changed | This decision packet; pointer in `docs/CORPFLOW_SHARED_TODO.md`. No Rare & Exclusive product files. |
| Focused tests | n/a — no product code changed; raw R&E verification log inaccessible |
| Full test/build | Command Center PR #1096 CI on `daaf819ba4a2dd4bec3b4322b9100ba8042b67e1`: **11 checks, no failures** (`test`, `canonical-context-preflight`, `protected-doctrine-guard`, `vercel-env`, `remove-draft-gate`, Vercel, Vercel Preview Comments passed; `cipc-desk-preview-smoke` and `cmp-delivery-files` skipped as out of scope). Product test/build in R&E **not run** (repo inaccessible). |
| Corrected evidence / test count | **NOT CORRECTED** — raw verification log not available to this identity |
| Branch / PR / head SHA | Command Center PR [#1096](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1096) on `cursor/factory-handoff-issue-1094-9ba4`. **No** R&E branch/PR. |
| Exact remaining protected action | Install the Cursor GitHub App on `antonvdberg-bit/rare-and-exclusive-collection` **and** add that private repository to this Cloud Agent environment with clone + pull-request permissions. Repo-admin / environment-access change. Does **not** authorize merge, deploy, send, secrets rotation, or Issue #35 clearance. |
| Final verdict | **BLOCKED — Cursor Cloud has no clone/PR access to `antonvdberg-bit/rare-and-exclusive-collection`** |

---

## What was inspected (Command Center only)

Known R&E pointers already in this repo:

- Target repo / branch / baseline: `lib/server/jan-approval-control.js` — `antonvdberg-bit/rare-and-exclusive-collection`, `rare-exclusive-greenfield`, PR #33 merge `34293747bdda8dcd132a51d87f752d6755dbfd66`, Issue #35 as a separate release blocker.
- Jan surface: `/rare-exclusive/review` remains a product-decision page. Approving a review still does not clear Issue #35.
- Agent Relay (`docs/operations/CORPFLOW_AGENT_RELAY_GITHUB_APP_V1.md`): allowlisted for both repos, but **Contents read-only**. It cannot create the required R&E branch/PR. Relay secrets are not in this Cloud Agent environment and were not requested or inspected. Open PR #1095 (Phase 2 read contract) is also not a clone/PR path and was not used.

Contact capture / verification architecture **in Command Center** (Lux / Rare & Exclusive working surface):

- Private access intake (`lib/luxe-maurice-ai/private-access-request.js`, `POST /api/lux/luxe-maurice-ai/private-access-request`) captures name, email, optional phone onto existing `leads` after **format validation only**. Advisor status is `review_required`. There is no email OTP, magic link, or mobile/SMS proof.
- Live outbound email in this repo is n8n transactional (`password_reset`, `lux_ticket_update`). Those are **live send** paths (`approval:external-send`). There is no approved buyer “verify this email/mobile” event, and no approved SMS/mobile-verification provider.
- Qualification, access approval, and price disclosure remain separate in the Lux private-access path: capture ≠ advisor approval ≠ price disclosure.

The greenfield product implementation behind PR #33 / issue #35 lives in the inaccessible R&E repo. It was not inspected.

---

## What was not done (on purpose)

- No R&E clone, branch, or competing product PR.
- No fake verification, invented OTP/SMS provider, or invented send infrastructure.
- No merge, deploy, secrets/env change, schema/data mutation, external send, paid tool, DNS change, or public/client launch.
- Test-count in R&E release evidence was **not** rewritten from memory.

---

## Next permitted step (after the access gate)

Once Cursor Cloud can clone and open PRs in `rare-and-exclusive-collection`:

1. Inspect `rare-exclusive-greenfield` + PR #33 / issue #35 and correct the release-evidence test count from the **raw verification log**.
2. Re-check contact capture vs real email/mobile verification in that repo.
3. If real verification still requires a new provider, secret, paid service, live send, or production config: **stop again** and return one verification decision packet. Do not fake it.
4. Keep qualification, access approval, and price disclosure strictly separate.
5. Open **one** PR in the R&E repo only. Jan remains the product/release gate.

---

## Secondary boundary (do not treat as the current verdict)

Even after repo access is restored, **real** email/mobile verification is expected to hit `approval:external-send` and/or `approval:paid-tool` / env-secrets unless the R&E repo already has an approved, secret-free local/synthetic verifier that this packet could not see. That question cannot be answered until the product repo is readable.

Current verdict remains the access blocker above.
