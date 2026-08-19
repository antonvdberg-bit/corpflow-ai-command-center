# CIPC campaign MVP — control flow and first 10 prospects

**Status:** Operator control-flow pack for GitHub **#985**. Parent **#984**.  
**Tenant:** `cipc-desk` / CIPC Desk (internal working name).  
**Environment:** `corpflow_test`. **Not a public launch.** **Not `client_production`.**  
**Machine contract:** `config/cipc-campaign-mvp.v1.json` · `lib/cipc-desk/campaign-mvp.js`  
**Reuse:** existing Postgres `leads` + `qualification_json.cipc_campaign` + `/change`. No second CRM.

<!-- CIPC_CAMPAIGN_MVP_V1 -->

**ANTON ACTION:** none to start ordinary work. Anton is required only for the **first outbound batch send** (email / WhatsApp / SMS), public launch, fee publication, schema, secrets, or `client_production`.

---

## What is true when this pack is in use

The first 10 verified accounting / advisory prospects from #985 are loaded as campaign records and shown on the existing operator control plane (`/change` on the CIPC Desk host). Each row has a segment, fit score, evidence URL, one Group A draft, and a human approval gate. **Nothing is sent.**

```text
prospect_verified → segment_assigned → fit_scored → decision_maker_verified
  → message_drafted → operator_approved → ready_to_send
  → sent → replied → qualified / nurture / closed
```

This packet stops at **ready_to_send**. `sent` is a protected consequence.

## Operator surface

| Need | Where it lives |
| ---- | -------------- |
| Campaign board | `/change` on `https://cipc.corpflowai.com/change` (logged-in CIPC Desk session) |
| List API | `GET /api/cmp/router?action=cipc-campaign-list` |
| Persist onto existing `leads` | `POST /api/cmp/router?action=cipc-campaign-hydrate` (idempotent) |
| Approve / reject / do-not-contact | `POST /api/cmp/router?action=cipc-campaign-operator-patch` |
| Validation page for drafts | `https://cipc.corpflowai.com/partners` (#986) |

Until this PR is merged and published to the CorpFlowAI test spine, the live `/change` board will not yet show the new panel. That is expected. Config-backed records are still the source for the first 10.

## First 10 (2026-08-19 verified research)

All **Group A** (accounting / advisory). Unverified decision-maker names and emails stay blank. JBS has phone + website form only (no published email in #985).

Fit score uses only the declared signals in the config (existing secretarial/CIPC base +25, SME accounting/advisory +20, remote delivery +15, boutique/small-mid +15, capacity need +10, named owner/partner +10, outsourcing/extension language +5). No invented overlap.

## Draft rules

- One draft per prospect from the approved **Group A** framework.
- Lead with fractional / white-label **capacity behind the practice**.
- Do **not** lead with job-seeking, “CIPC clerk”, or commodity filing language.
- Experience line is the same pending-confirmation line as the partner funnel.
- CTA points at a conversation or `https://cipc.corpflowai.com/partners`.
- Every draft is marked **not sent**.

## Approval gate

1. Operator reviews the draft on `/change`.
2. Operator may **approve**, **reject**, or **do not contact**.
3. Approve moves the row to `ready_to_send`.
4. Duplicate website/email rows are suppressed and cannot be approved.
5. **Send stays blocked** until Anton approves the first outbound batch.

## Persistence (no new table)

Hydrate writes the same 10 records onto the existing `leads` table for tenant `cipc-desk`, with state under `qualification_json.cipc_campaign`. Duplicate match is prospect id, then email, then website host. Empty email is stored as empty — it is **not** replaced with a fake address.

## Explicit non-actions

- No second CRM, app, or database
- No Prisma schema / new columns
- No paid enrichment
- No live email / WhatsApp / SMS
- No public launch or indexing change
- No invented prospect data

## Marketing / Sales Quality Gate

Definition of done: first-wave partners can be reviewed, scored, and held behind a human send gate.  
Audience: owners/partners of South African accounting/advisory firms.  
Stage: awareness → consideration (first touch draft only).  
Commercial outcome: operator-approved first batch, not a send.  
Primary asset: control board + 10 Group A drafts.  
Validation asset: `/partners`.  
Proof status: partial — experience line pending exact public wording; no client logos.

Quality-gate target: **12/14** (visual 1/2 because these are operator email drafts, not a designed landing page; proof 1/2 until the experience line is confirmed).

## Delivery Reality

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: NO (PR only)
- Production deployment ID: n/a until merge + Vercel Production Ready
- Commit deployed: n/a
- Live URLs tested: n/a until publish — expected `/change` panel after corpflow_test deploy
- Expected vs actual result: 10 records + drafts + approval gate in tests; send blocked
- Client-facing flow usable: n/a (operator pack; public partner page is #986)
- Final verdict: PARTIAL (awaiting merge, deploy, live /change check)
```

Environment: **corpflow_test**. This is not client production.
