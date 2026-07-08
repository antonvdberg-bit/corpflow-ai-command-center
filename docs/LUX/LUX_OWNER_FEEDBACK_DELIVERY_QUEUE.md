# LuxeMaurice owner feedback delivery queue

**Status:** Operator control surface (config-backed) · **NO PRODUCTION DEPLOY AUTHORIZED BY THIS DOC ALONE**  
**Parent programme:** [GitHub #529](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/529)  
**Route:** `/change/lux-feedback` (LuxeMaurice operator desk)  
**Config module:** `lib/client/lux-owner-feedback-queue.js`  
**Last updated:** 2026-07-08

---

## Purpose

Recover LuxeMaurice client confidence by converting owner feedback into a **visible, controlled delivery loop** instead of scattered chat or reactive fixes.

Anton, Cursor, and ChatGPT can open one desk to see:

- Owner feedback items (traced to repo / #529 sources)
- Priority and status
- Affected surface
- Proposed response
- Next visible fix
- Whether Anton approval is required before client send or production
- Preview evidence link (where applicable)
- Next **2–6 hour** delivery slice

---

## Exact owner feedback found?

**Yes — from documented programme sources**, not invented placeholders:

| Source | What was captured |
|--------|-------------------|
| GitHub #529 issue body + comments | Delivery too slow; client at risk; scattered v1–v14 redesign; reactive mode; governance gates |
| `docs/LUX/LUXEMAURICE_RECOVERY_WBS_AND_MVP_PLAN.md` | Blockers (email, ERPNext, approval rhythm) |
| `docs/LUX/LUXEMAURICE_RECOVERY_AUDIT_V1.md` | Dual-truth risk; no first real listing; editor E2E gap |
| `docs/LUX/LUX_CONTENT_POPULATION_SPRINT.md` | C1/C2/C4 awaiting Jan content |
| `docs/LUX/PHASE1_PRODUCTION_VERIFICATION_AND_CLIENT_NOTE.md` | Phase 1 approval before Phase 2 |
| Issue #528 reference on #529 | `/change` Proceed regression |

This is **not** live client-submitted runtime feedback. When Jan sends new feedback via call, email, or WhatsApp, operators add or update rows in `lib/client/lux-owner-feedback-queue.js` and note the capture date in this doc.

---

## Operator usage

1. Open **`https://lux.corpflowai.com/change/lux-feedback`** (or preview equivalent) while logged in on the Lux tenant host.
2. Review **P0** items and the **Next 2–6 hour delivery slice**.
3. Cross-check **Recovery ticket** `cmr7a244f0000l505x5vne2s0` in `/change`.
4. Use **Recovery review (client)** link `/client/recovery-roadmap` for Jan-facing alignment — mint decision link only after Anton preview approval.
5. Update config statuses when evidence changes (e.g. #528 fixed → move FB-006 to `responded`).

---

## Approval gates (summary)

| Action | Anton required? |
|--------|-----------------|
| View this queue | No |
| Merge PR to preview | No (CI + PR review) |
| Production deploy | **Yes** |
| Send client decision / recovery link to Jan | **Yes** |
| Jan email notification test | **Yes** (after n8n route verified) |
| ERPNext quotation to Jan | **Yes** (after real artifact exists) |

---

## Next recommended Lux visible fix

After this queue ships on **preview**:

1. Confirm `/change` Proceed stable (#528) on preview.
2. Anton previews `/client/recovery-roadmap` and mints private decision link.
3. Request Jan C1/C2 content inputs (internal handoff — no auto-send).

---

## Verification

```bash
npm test
npm run build
git diff --check
```

Manual: open `/change/lux-feedback` on Vercel preview — confirm Lux chrome, 10 feedback rows, slice section, approval summary, filters.

---

## Non-actions

- No production deploy without Anton approval
- No env/secrets, DB/schema, email/WhatsApp/SMS runtime, payment, or external client outreach from this slice
