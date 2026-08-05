# Prospect Maturation — System Proof v1 (#713)

**Status:** Synthetic system-run evidence for the 12 Aug system gate. **No messaging runtime. No production deploy. No schema/env. No second CRM.**

**Issue:** #713 (WS2) · Parent #711 · Controller #710 · Unit baseline PR #746

**Anchor sentinel:** `<!-- PROSPECT_MATURATION_SYSTEM_PROOF_V1 -->`

<!-- PROSPECT_MATURATION_SYSTEM_PROOF_V1 -->

**Audience:** Operator / ChatGPT service-design reviewer verifying that fresh synthetic market enquiries can mature through the prospect lifecycle to proposal readiness without external sends.

**Machine runner:** `lib/prospects/system-proof.js` → `runProspectMaturationSystemProof()`  
**Unit contract:** `config/prospect-maturation.v1.json` / `config/prospect-draft-assets.v1.json` / `lib/prospects/maturation.js`  
**CLI:** `node scripts/prospect-maturation-system-proof.mjs`  
**Tests:** `node-tests/prospect-maturation-system-proof.test.mjs`  
**Fixtures:** `fixtures/prospect-maturation/*.json` (8 scenarios from unit gate)  
**Evidence artifact:** `artifacts/prospect-maturation-system-proof/latest-run.json`

---

## 0. Outcome

Prove **two complete synthetic maturation paths** (Lead Rescue + Website Rescue) from fresh enquiry → operator assignment → qualifying → discovery → proposal readiness, plus blocked-gate evidence, using the existing #746 unit helpers only.

This packet **consumes** the unit gate in PR #746. It does **not** redesign buyer routing (#749), Lead Rescue delivery (#715), or Website Rescue delivery (#716).

---

## 1. Boundaries

| In lane | Out of lane |
| ------- | ----------- |
| Fresh synthetic prospects (`PM-SYS-LR-001`, `PM-SYS-WR-001`) | Real client data / credentials |
| Canonical stage walks + entry criteria gates | WhatsApp / email / SMS **runtime** |
| Draft-only asset assertions (`send=false`) | New CRM / second database / schema |
| Overdue / stale / reactivation / missing-owner proofs | Production deploy / DNS / paid tools |
| Daily + weekly operator summary counts on fixtures | Buyer-facing UI changes |

**Messaging** remains draft-only. `external_sends_executed` must stay `[]`. Draft asset config must keep `$send: false`.

---

## 2. Synthetic records

| Field | Lead Rescue | Website Rescue |
| ----- | ----------- | -------------- |
| ID | `synthetic-pm-sys-713-lr-001` | `synthetic-pm-sys-713-wr-001` |
| Reference | `PM-SYS-LR-001` | `PM-SYS-WR-001` |
| Entry stage | `new` | `new` |
| Buyer need | `losing-enquiries` | `website-improvement` |
| Service interest | `lead_rescue` | `website_rescue` |
| Final stage | `proposal_sent` | `proposal_ready` |

Buyer-need / service-interest / product_service_path are retained for downstream handoff. No second product-classification step is simulated (aligned with #749).

---

## 3. Paths exercised

```text
Lead Rescue:
  new (missing owner/next_action)
    → assign operator fields
    → qualifying
    → discovery_booked (qualification_complete)
    → proposal_ready
    → proposal_sent
  + draft acknowledgement / proposal_handoff (send=false)
  + ai_lead_rescue qualification gate

Website Rescue:
  new
    → qualifying
    → discovery_booked
    → proposal_ready
  + website_rescue qualification gate
```

---

## 4. Gate-block proof (required)

The runner records that maturation **cannot** progress when:

1. Active prospect is missing `owner`
2. Active prospect is missing `next_action` / `next_action_due`
3. `new` → `qualifying` without owner
4. `new` → `proposal_sent` (invalid jump)
5. Move to `lost` without `closure_reason`

And that detection works for:

- overdue next action
- stalled / stale activity
- reactivation due after window
- lost with reason validates
- qualified Website Rescue fixture passes gate (via `organisation_name` → `business_name` adapter)

---

## 5. How to run

```bash
node --test node-tests/prospect-maturation.test.mjs node-tests/prospect-maturation-system-proof.test.mjs
node scripts/prospect-maturation-system-proof.mjs
```

Expected CLI: `ok: true`, artifact written, `external_sends_executed: []`.

---

## 6. Explicit non-actions

- No production deploy
- No env / secrets changes
- No Prisma / schema changes
- No email, WhatsApp, or SMS send
- No DNS / client cutover
- No merge of production-visible UI

---

## 7. Relationship to unit gate (#746)

| Layer | Artifact |
| ----- | -------- |
| Unit | PR #746 — lifecycle config, draft assets, maturation helpers, 8 fixtures |
| System (this doc) | Synthetic walks + gate proofs + evidence JSON |

Merge recommendation for #746 remains independent: this system-proof PR may stack on the same maturation code or land after #746 merges to `main`.
