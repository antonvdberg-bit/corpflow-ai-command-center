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
3. Allowed decisions: `APPROVE`, `CHANGES`, `HOLD`, `ASK_AI`.
4. The submitted SHA must match the current head SHA. Mismatch → `STALE_SHA`. An older APPROVE does not apply to a new SHA.
5. Same actor + same decision + same target + same SHA is **idempotent** (no second write).
6. Next step is comment-only writeback (`github_comment_writeback` or `request_ai_review_comment`).
7. Merge, deploy, env/secrets, schema, payment, send, DNS, and other protected actions stay **blocked**.
8. Approving a review **does not** clear Issue #35.

Durable evidence marker: `### JAN DURABLE DECISION` with schema `corpflow.jan_durable_decision.v1`.

GitHub writeback (when `JAN_APPROVAL_MODE=live`) posts a comment **only** to the allowlisted Rare & Exclusive repo and the target issue/PR number, using the existing GitHub issue-comment path (`CMP_GITHUB_TOKEN` / `GITHUB_TOKEN`). Synthetic mode records the same comment body in the in-memory ledger.

## 5. What this MVP does not do

- Merge, deploy, production data, DB/schema, env/secrets, repo-admin, credentials, payment, paid services, DNS, legal/commercial send, or any destructive action
- Create an autonomous bypass around Jan
- Redesign the Rare & Exclusive product or become a general workflow platform

## 6. Local / test how to use

1. Sign in at `/login` as Jan (`jan@luxemaurice.com` on the Lux tenant).
2. Open `/rare-exclusive/review`.
3. See one synthetic review item and Issue #35 under **Before we can release**.
4. Choose one of the four actions.
5. Confirm the page says the decision was recorded and nothing was merged or released.

```bash
node --test node-tests/jan-approval-control.test.mjs
```

Evidence: `artifacts/jan-approval-mvp/`.

## 7. Exact next step for production hardening (not this packet)

1. Set `JAN_APPROVAL_MODE=live` on the CorpFlowAI test spine **after** Anton approves that env change.
2. Use a GitHub token scoped to issue comments on `antonvdberg-bit/rare-and-exclusive-collection` (existing factory GitHub token path — no new secret name required if `CMP_GITHUB_TOKEN` already covers that repo; otherwise a separately approved scoped token).
3. Replace the synthetic open-PR fixture with live open PRs from that repository.
4. Verify on `https://lux.corpflowai.com/rare-exclusive/review` (corpflow_test) that Jan can record a decision and the comment appears on the target PR.
5. Do **not** treat that as client_production, and do **not** auto-merge.

This packet does **not** perform that env change or live write.

## 8. Code

- `lib/server/jan-approval-control.js` — rules
- `lib/server/jan-approval-api.js` — HTTP
- `pages/rare-exclusive/review.js` — page
- `components/JanApprovalReviewPage.js` — UI
- `node-tests/jan-approval-control.test.mjs` — tests
