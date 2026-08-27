# Commercial Workspace → ERPNext quotation evidence acceptance (#1177)

**Status:** Live usability probed on current `main`. **No schema. No env/secrets. No ERPNext write. No Postgres mutation. No send. No new ledger.**  
**Issue:** [#1177](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1177)  
**Sources:** merged [#1162](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1162) (#1160 continuity) and [#1168](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1168) (#1166 selling slice)  
**Environment:** `corpflow_test` + hosted ERPNext GET/read-only  
**Owner:** Cursor  
**Anchor:** `<!-- ERPNEXT_COMMERCIAL_QUOTATION_EVIDENCE_ACCEPTANCE_1177 -->`

<!-- ERPNEXT_COMMERCIAL_QUOTATION_EVIDENCE_ACCEPTANCE_1177 -->

```text
Canonical Context Preflight: PASS
Operating model version: 2026-08-13-v1
Environment: corpflow_test
GitHub state refreshed: YES
Source item: #1177
```

## 0. What is true when this packet is done

An operator can open an **already-recorded** ERPNext Quotation from `/app/commercial`, understand bounded status (id, docstatus/status, currency/total), and reach printable/PDF evidence without copying ERPNext into a second ledger.

This packet does **not** create, submit, or send a Quotation, Sales Invoice, tax, or payment entry. It does not invent an ERPNext id.

## 1. Exact route / quotation / SHA

| Item | Value |
| --- | --- |
| Route | `/app/commercial` → `/app/commercial/syn-772-lr-ada` |
| Quotation reference used | `SAL-QTN-2026-00001` (Ada Spa proof fixture; hosted ERPNext GET) |
| Additional hosted GET | `SAL-QTN-2026-00005` (CF1018 selling slice; not copied into Postgres) |
| Missing-ref control | `/app/commercial/syn-772-rd-bea` → `quotation_reference_missing` |
| Current `main` SHA | `b731411734edb01b7dbb8d7e20247c5a7805983a` |
| Production GitHub deployment | `6122881088` (success) serving that SHA |
| Vercel Production URL (GitHub status) | `https://corpflow-ai-command-center-lym0w5syr-corpflowai.vercel.app` |

## 2. What was verified

1. **Hosted ERPNext GET/read-only** as `integrations@corpflowai.com`: `SAL-QTN-2026-00001` Draft / docstatus `0` / USD / 249; printable PDF `%PDF-` 37,950 bytes. `SAL-QTN-2026-00005` Draft / MUR / 45,000; PDF 36,114 bytes. Unknown names 404. No create/update/submit.
2. **Proof/harness drilldown** (existing `syn-772-lr-ada` only): Core proof opens bounded evidence + printable PDF href; returns to Commercial and Prospect. Desktop 1440×900 and mobile 390×844 overflow **0px**.
3. **Unlinked / invalid references fail closed:** Bea has no quotation path and no invented id. Path-like names are rejected. Tenant actors receive `403 core_access_denied`.
4. **Live corpflow_test gates:** `/app/commercial` and `/app/commercial/[id]` return HTML 200 (staff sign-in). Unauthenticated APIs return `401 authentication_required`. Production rejects `?proof=1`.

## 3. Exact live blocker

Read-only scan of corpflow_test `leads` (82 rows): **zero** stored `SAL-QTN-*` quotation names. Production denies the proof harness. A signed-in operator therefore sees Commercial rows with `Quotation —` and no drilldown, even though the synthetic Quotations exist in ERPNext.

This packet does **not** write a pointer onto a lead (Postgres mutation forbidden) and does **not** infer an ERPNext id onto a row that does not already store one.

```text
NOT READY — corpflow_test Commercial leads have no recorded ERPNext Quotation id
```

Harness/UI and hosted GET are proven. The missing live pointer is the one operator-usability blocker.

## 4. Explicit non-actions

- No ERPNext write, Sales Invoice submit, tax/accounting mutation, or Payment Entry
- No Postgres mutation / schema / env / secrets / access widening
- No `?proof=1` on Vercel Production
- No external send, public launch, paid tool, factory/orchestration, or new ledger

## 5. Verification

```bash
node --test node-tests/app-commercial-quotation-evidence-acceptance.test.mjs node-tests/app-commercial-quotation-evidence.test.mjs
node scripts/commercial-quotation-evidence-probe.mjs
node scripts/commercial-quotation-evidence-capture-screenshots.mjs
```

Promptfoo / AI eval: **NOT APPLICABLE** — staff-only Commercial/ERPNext GET drilldown acceptance. No AI prompts, drafting, chatbot, Lead Rescue/Website Rescue AI behaviour, model routing, or protected-action AI claims.

## 6. Evidence

`artifacts/commercial-quotation-evidence-1177/`
