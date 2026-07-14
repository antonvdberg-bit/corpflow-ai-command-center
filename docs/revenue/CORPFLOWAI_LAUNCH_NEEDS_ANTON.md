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
| **NA-001** | C | **Anton avatar/voice consent for HeyGen** — may CorpFlow use Anton's likeness/voice for approved marketing video assets? | **Defer** until first proof video need is concrete; use product walkthrough (`CF-VID-0001`) without avatar until decided | P1 — before any HeyGen avatar video ships | Avatar videos blocked; social proof relies on product walkthrough only | **OPEN** |
| **NA-002** | E | **Approve first ERPNext posting environment** — sandbox practice only vs production shell for first buyer-facing Quotation PDF | **Sandbox for rehearsal; manual pro-forma template for external send** until Phase D MUST items (M-1–M-9) + HB-1–4 close | P0 — before first MUR sprint invoice to real buyer | Wrong-environment PDF sent to buyer; GL/revenue posted prematurely | **OPEN** |
| **NA-003** | C | **Approve first social profile creation** — Meta / LinkedIn / other holds on business profile creation | **LinkedIn company page first** (B2B, warm-network); Meta deferred until offer PDF + live URL verify complete | P1 — before Wave 1 outreach amplification | Social → website funnel incomplete; rely on direct warm intro only | **OPEN** |
| **NA-004** | C | **Approve first manual outreach batch** — which prospects, which template, which offer link | **One warm-network prospect + `prospect-discovery-email.md` + single `/offers/*` link** | P0 — week 1 of programme | No pipeline; month-end target at risk | **OPEN** |
| **NA-005** | B/D | **Confirm logo / CTA / contact for media** — canonical logo asset, primary CTA wording, `support@corpflowai.com` as contact | **Use existing public merchant identity** (`docs/finance/PAY_SBM_2_PAGE_COMPLIANCE_COPY.md`); CTA = "Request Discovery Call" on offer pages | P0 — before offer PDF or social assets | Inconsistent buyer-facing identity | **OPEN** |
| **NA-006** | A/E | **Bank clearance always Anton** — confirm manual bank verification remains operator-only (no automation, no delegate without explicit re-authorisation) | **SHOULD REMAIN MANUAL** — Anton verifies cleared funds; POP screenshot alone is never sufficient | **Standing rule** — no deadline | Premature delivery start; revenue leakage / dispute risk | **APPROVED** (standing) |
| **NA-007** | E | **Mauritius-licensed accountant engagement** for CoA review + VAT posture (HB-2, HB-3) | Engage after first paying pilot or first MUR deposit — provide Phase C GL trail + §2.1 CoA draft | P1 — blocks Phase D | Production ERPNext posting indefinitely deferred | **OPEN** |
| **NA-008** | E | **Redacted SBM bank CSV** for sandbox reconciliation test (HB-4) | Anton exports redacted statement; Cursor imports in sandbox only | P1 — before Phase D authorisation | Bank recon workflow unverified on real statement shape | **OPEN** |
| **NA-009** | D | **Case study / anonymised proof permission** — may CorpFlow name or anonymise a client on public surfaces? | **Anonymised vertical proof first** ("Mauritius spa operator") without name until written permission | P1 — before homepage proof upgrade | Proof density stays generic | **OPEN** |
| **NA-010** | B | **Production live URL sign-off** — confirm `/offers/*` + `/contact` deployed and verified on `corpflowai.com` | Merge + deploy + Delivery Reality Audit per `.cursor/rules/delivery-reality.mdc` | P0 — immediate | Prospects hit stale or missing pages | **OPEN** |
| **NA-011** | E | **Phase D operator authorisation row** in `docs/decisions/JOURNAL.md` (HB-1) | Write `JE-YYYY-MM-DD-N` only after HB-2, HB-3, HB-4 are DONE | P2 — before any production ERPNext install | Unauthorised production financial system change | **OPEN** |
| **NA-012** | C | **Meta business account / ads hold** — separate from organic profile; paid ads remain blocked until payment portal live | **Do not run paid ads** (`PAYMENT_READINESS_2026_06_01.md` §5) | P2 — until SBM e-Commerce or Peach reply | Budget burn without conversion | **APPROVED** (hold) |

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
