# Jan approval control surface v1 — Rare & Exclusive

**Status:** MVP for issue [#1080](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1080). Local/test surface only. **No production deployment.**  
**Owner:** Jan du Plessis (product/release decisions); CorpFlowAI/Cursor (control surface).  
**Anchor sentinel:** `<!-- JAN_APPROVAL_CONTROL_SURFACE_V1 -->`

<!-- JAN_APPROVAL_CONTROL_SURFACE_V1 -->

## 1. Business outcome

Jan can open one decision page, see what is waiting, and choose **Approve / Request changes / Hold / Ask AI** without copy-pasting GitHub comments, prompts, or version numbers.

Jan remains a **hard stop**. Automation may prepare, review, and route. It must not cross this gate without a recorded Jan decision bound to the **exact head SHA**. That record is **not** merge, deploy, or any other protected action.

## 2. Operating model (unchanged)

| Role | Authority |
|------|-----------|
| Jan + Jan’s ChatGPT | Product authority / architect / senior reviewer |
| Claude | Primary implementation worker for Rare & Exclusive product code |
| CorpFlowAI / Cursor | Automation, evidence routing, this control surface |
| Anton / factory | May look. May not impersonate Jan. Still owns merge and other protected gates |

## 3. What this MVP is

A tiny authenticated page plus two API routes:

| Surface | Purpose |
|---------|---------|
| `GET /rare-exclusive/review` | Decision page (product language, Rare & Exclusive visual shell) |
| `GET /api/factory/jan-approval` | Review items + Issue #35 release-blocker payload |
| `POST /api/factory/jan-approval/decision` | Record Jan’s decision against the exact SHA |

Initial integration target: `antonvdberg-bit/rare-and-exclusive-collection`.  
Build 3 baseline: PR #33 merged to `rare-exclusive-greenfield` at `34293747bdda8dcd132a51d87f752d6755dbfd66`.  
Mandatory pre-release blocker: **Issue #35** — shown separately from merge/review approval.

Default evidence source is **synthetic** so local/test works without live GitHub writes.

## 4. Decision rules

1. Only `jan@luxemaurice.com` on tenant `luxe-maurice` may record a decision.
2. Factory/admin sessions may view; they receive `JAN_GATE_REQUIRED` on POST.
3. Allowed decisions: `APPROVE`, `CHANGES`, `HOLD`, `REVIEW_FURTHER`. `CHANGES` requires actionable implementation reasons; `HOLD` requires a governance or external dependency.
4. Every evidence package binds the allowlisted repository, PR number, base SHA, head SHA, complete evidence manifest, and SHA-256 evidence hash. It includes PR metadata, changed files, full diff, selected changed-file contexts, comments and prior decisions, checks/workflow links, release-blocker state, and mergeability/branch-protection state where GitHub exposes it.
5. The submitted exact head SHA and evidence hash are mandatory. At decision time the bounded GitHub bridge re-reads the live PR head; mismatch → `STALE_SHA`. An older APPROVE does not apply to a new SHA.
6. An explicit narrow scope is mandatory: `review-approval-only` or `merge-only`. A scope is review evidence only: neither scope grants merge, deploy, release, production use, infrastructure authority, or clearance of Issue #35.
7. Same actor + same decision + same scope + same target + same SHA is **idempotent** (no second write). A short-lived, Jan-session-bound decision capability, nonce replay protection, and per-actor rate limit protect writeback.
8. Next step is comment-only writeback (`github_comment_writeback` or `request_ai_review_comment`). The API has no general-purpose GitHub comment endpoint.
7. Merge, deploy, env/secrets, schema, payment, send, DNS, and other protected actions stay **blocked**.
8. Approving a review **does not** clear Issue #35.

Durable evidence marker: `### JAN DURABLE DECISION` with schema `corpflow.jan_durable_decision.v1`.

GitHub writeback (when `JAN_APPROVAL_MODE=live`) posts a decision record **only** to the allowlisted Rare & Exclusive repo and reviewed PR number, using the bounded bridge. The session-bound capability is issued for 10 minutes; no permanent shared bearer credential is exposed to Jan or ChatGPT. Synthetic mode records the same structured audit record in the in-memory ledger.

Each audit record is exportable JSON and contains the manifest/hash, repository/PR/base/head SHAs, decision/scope/rationale, attributable Jan identity/session, timestamp, audit hash, and durable GitHub comment reference when created.

## 5. OpenAPI-facing contract

The machine-readable contract is `docs/operations/JAN_APPROVAL_BRIDGE_OPENAPI_V1.yaml`. The ChatGPT connection remains an adapter concern behind this bridge. A Custom GPT Action is **not** assumed to attach to an existing Jan conversation.

`GET /api/factory/jan-approval` returns only review evidence plus a short-lived `decision_capability` for the signed-in Jan session.

`POST /api/factory/jan-approval/decision` accepts only:

```json
{
  "item_id": "pr:34",
  "decision": "APPROVE | CHANGES | HOLD | REVIEW_FURTHER",
  "expected_head_sha": "<exact reviewed SHA>",
  "evidence_manifest": "<review-package SHA-256>",
  "approval_scope": "review-approval-only | merge-only",
  "note": "<bounded rationale>",
  "decision_capability": "<short-lived Jan-session capability>"
}
```

It rejects arbitrary repository, endpoint, comment-body, decision, scope, stale-SHA, replay, and rate-limit requests. It returns a structured review decision/audit record; it never accepts arbitrary GitHub write parameters.

## 6. What this MVP does not do

- Merge, deploy, production data, DB/schema, env/secrets, repo-admin, credentials, payment, paid services, DNS, legal/commercial send, or any destructive action
- Create an autonomous bypass around Jan
- Redesign the Rare & Exclusive product or become a general workflow platform

## 7. Local / test how to use

1. Sign in at `/login` as Jan (`jan@luxemaurice.com` on the Lux tenant).
2. Open `/rare-exclusive/review`.
3. See one synthetic review item and Issue #35 under **Before we can release**.
4. Choose one of the four actions.
5. Confirm the page says the decision was recorded and nothing was merged or released.

```bash
node --test node-tests/jan-approval-control.test.mjs
```

Evidence: `artifacts/jan-approval-mvp/`.

## 8. Exact next step for production hardening (not this packet)

1. Set `JAN_APPROVAL_MODE=live` on the CorpFlowAI test spine **after** Anton approves that env change.
2. Use a GitHub token scoped to issue comments on `antonvdberg-bit/rare-and-exclusive-collection` (existing factory GitHub token path — no new secret name required if `CMP_GITHUB_TOKEN` already covers that repo; otherwise a separately approved scoped token).
3. Replace the synthetic open-PR fixture with live open PRs from that repository.
4. Verify on `https://lux.corpflowai.com/rare-exclusive/review` (corpflow_test) that Jan can record a decision and the comment appears on the target PR.
5. Do **not** treat that as client_production, and do **not** auto-merge.

This packet does **not** perform that env change or live write.

## 9. Code

- `lib/server/jan-approval-control.js` — rules
- `lib/server/jan-approval-api.js` — HTTP
- `lib/server/jan-approval-github-bridge.js` — fixed allowlisted GitHub evidence/read and decision-write bridge
- `pages/rare-exclusive/review.js` — page
- `components/JanApprovalReviewPage.js` — UI
- `node-tests/jan-approval-control.test.mjs` — tests
