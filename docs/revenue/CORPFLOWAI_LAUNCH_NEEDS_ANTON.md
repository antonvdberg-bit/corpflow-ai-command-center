# CorpFlowAI Launch — NEEDS_ANTON decision gates

**Status:** Operator decision register · **Updated:** 2026-07-14  
**Owner:** Anton  
**Anchor:** `<!-- CORPFLOWAI_LAUNCH_NEEDS_ANTON_V1 -->`

<!-- CORPFLOWAI_LAUNCH_NEEDS_ANTON_V1 -->

Only **real** Anton gates appear here. Cursor and agents must **stop and ask** when a row is `OPEN`. Do **not** request secrets, credentials, or bank account numbers in this table or in repo docs.

**NO IMPLEMENTATION AUTHORIZED** until the relevant row is `APPROVED` or `DONE`.

---

## Decision register

| ID | Stream | Decision or action | Recommended default | Deadline / urgency | Consequence if delayed | Status |
| -- | ------ | ------------------ | ------------------- | ------------------ | ---------------------- | ------ |
| **NA-001** | B | **Anton avatar/voice consent for HeyGen** — may CorpFlow use Anton's likeness/voice for approved marketing video assets? | **Defer** until first proof video need is concrete; use screen-led product walkthrough without personal avatar until decided | P0 — while HeyGen access remains | Avatar videos blocked; kit still usable for screen/B-roll scripts | **OPEN** |
| **NA-002** | A | **Approve first ERPNext posting environment** — sandbox rehearsal only vs production shell for first buyer-facing Quotation PDF | **Sandbox for rehearsal; manual pro-forma template for external send** until Phase D MUST items (M-1–M-9) + HB-1–4 close | P0 — before first MUR sprint invoice to real buyer | Wrong-environment PDF sent to buyer; GL/revenue posted prematurely | **OPEN** |
| **NA-003** | C | **Approve first social profile creation** — LinkedIn / Meta / YouTube / Instagram manual setup | **LinkedIn Company Page first** (B2B); Meta/IG after hold review; YouTube when first video ready | P1 — before public social amplification | Social → website funnel incomplete; warm intro only | **OPEN** |
| **NA-004** | E | **Approve first manual outreach batch** — which prospects, which draft, which offer link | **One warm-network prospect + one approved draft + single `/offers/*` or discovery link** | P0 — week 1 after drafts merge | No pipeline; month-end target at risk | **OPEN** |
| **NA-005** | B/C/D | **Confirm logo / CTA / contact for media** — canonical logo, primary CTA wording, `support@corpflowai.com` | **Use existing public merchant identity**; CTA = Request Discovery → `corpflowai.com/contact#discovery` | P0 — before export/publish | Inconsistent buyer-facing identity | **OPEN** |
| **NA-006** | A | **Bank clearance always Anton** — manual bank verification remains operator-only | **SHOULD REMAIN MANUAL** — Anton verifies cleared funds; POP screenshot alone is never sufficient | **Standing rule** | Premature delivery start; dispute risk | **APPROVED** (standing) |
| **NA-007** | A | **Mauritius-licensed accountant engagement** for CoA review + VAT posture (HB-2, HB-3) | Engage after first paying pilot or first MUR deposit | P1 — blocks Phase D | Production ERPNext posting deferred | **OPEN** |
| **NA-008** | A | **Redacted SBM bank CSV** for sandbox reconciliation test (HB-4) | Anton exports redacted statement; Cursor imports in sandbox only | P1 — before Phase D | Bank recon unverified on real statement shape | **OPEN** |
| **NA-009** | D/E | **Case study / anonymised proof permission** for public surfaces | **Anonymised vertical proof first** without client name until written permission | P1 — before proof upgrade | Proof density stays generic | **OPEN** |
| **NA-010** | D | **Approve Production deploy** of insights/video hub after Preview verification | Merge after Preview smoke; Production only with Anton approval + Delivery Reality Audit | P1 — after Stream D Preview green | Insights/video surface stays Preview-only | **OPEN** |
| **NA-011** | A | **Phase D operator authorisation row** in `docs/decisions/JOURNAL.md` (HB-1) | Write JE only after HB-2–4 DONE | P2 — before production ERPNext install | Unauthorised production financial system change | **OPEN** |
| **NA-012** | C | **Meta paid-ads hold** — organic profile setup ≠ ads; paid ads blocked until payment portal ready | **Do not run paid ads** | P2 — until payment portal path ready | Budget burn without conversion | **APPROVED** (hold) |
| **NA-013** | B | **Complete HeyGen/Canva capture queue while access is temporary** — record voice/avatar choice, export masters | Follow `artifacts/corpflowai-launch-media/ANTON-CAPTURE-CHECKLIST.md` priority order | **P0 — temporary access window** | Lost professional tooling; delayed launch media | **OPEN** |

---

## How to use this table

1. **Agents:** If your task touches a row marked **OPEN**, stop and surface the ID to Anton.
2. **Anton:** Update **Status** to `APPROVED`, `DONE`, or `DEFERRED` with date in commit message or Bridge #249.
3. **NA-006** is a standing rule — do not automate bank clearance or delegate without explicit re-authorisation.
4. **No secrets:** Bank verification happens on Anton's banking dashboard; never paste account numbers into repo, tickets, or chat logs.

---

## Cross-references

- `docs/revenue/CORPFLOWAI_COMMERCIAL_LAUNCH_PROGRAMME.md` — programme streams
- `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` — HB-1–4 detail
- `docs/finance/PAYMENT_READINESS_2026_06_01.md` — payment route + ads hold
- `docs/revenue/templates/deposit-received-manual-verification.md` — bank verification checklist
