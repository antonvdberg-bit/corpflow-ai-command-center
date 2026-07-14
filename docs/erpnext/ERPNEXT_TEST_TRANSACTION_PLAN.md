# ERPNext test transaction plan — fictional / non-posting rehearsal

**Status:** Test plan · **Updated:** 2026-07-14  
**Owner:** Anton  
**Anchor:** `<!-- ERPNEXT_TEST_TRANSACTION_PLAN_V1 -->`

<!-- ERPNEXT_TEST_TRANSACTION_PLAN_V1 -->

**Fictional data only.** No real client names, no real bank details, no buyer-facing send from sandbox unless Anton explicitly authorises dry-run (S-6).

**NO IMPLEMENTATION AUTHORIZED** for production posting.

---

## 1. Objective

Rehearse the MUR sprint quote-to-cash path in **ERPNext sandbox** using synthetic Customer **"Test Buyer (CFLR-DRY-RUN)"** before first real buyer Quotation.

---

## 2. Test customer (fictional)

| Field | Value |
| ----- | ----- |
| Customer Name | Test Buyer (CFLR-DRY-RUN) |
| Contact | Alex Test |
| Email | dry-run.test@corpflowai.test |
| CF-… reference | CF-DRYRUN |
| Offer | AI Lead Rescue Sprint |
| Quote total | MUR 35,000 |
| Deposit | MUR 17,500 |

---

## 3. Test script

### Phase A — Customer & quotation (sandbox)

| # | Step | Anton ERPNext? | Expected result |
| - | ---- | -------------- | --------------- |
| A1 | Create Customer per §2 | **Yes — click-by-click** | Customer saved |
| A2 | Create Quotation — MUR 35,000, Lead Rescue Item | **Yes** | Quotation draft |
| A3 | Submit Quotation | **Yes** | docstatus=1 |
| A4 | Print PDF (if Print Format exists) | **Yes** | PDF renders or note gap |
| A5 | **Do not email PDF to any real address** | — | — |

### Phase B — Deposit invoice (sandbox)

| # | Step | Anton ERPNext? | Expected result |
| - | ---- | -------------- | --------------- |
| B1 | Create deposit SI MUR 17,500 | **Yes** | SI draft/submitted |
| B2 | Simulate "client paid" — no real transfer | — | N/A |
| B3 | Create Payment Entry MUR 17,500 | **Yes** | PE with reference_no |
| B4 | Allocate PE to deposit SI | **Yes** | SI status Paid |

### Phase C — Bank reconciliation (sandbox)

| # | Step | Anton ERPNext? | Expected result |
| - | ---- | -------------- | --------------- |
| C1 | Add synthetic CSV line Cr MUR 17,500 | Cursor or **Anton** | Import succeeds |
| C2 | Match to Payment Entry | **Yes** | Line matched |
| C3 | Confirm delta MUR 0.00 | **Yes** | Recon confirmed |

### Phase D — Delivery release simulation

| # | Step | Anton ERPNext? | Expected result |
| - | ---- | -------------- | --------------- |
| D1 | Complete DELIVERY_RELEASE_CHECKLIST (dry-run) | Anton | All boxes tickable |
| D2 | Create Project + 1 Task | **Yes** | Project exists |
| D3 | Mark task complete | **Yes** | Delivery simulated |

### Phase E — Balance & closeout (sandbox)

| # | Step | Anton ERPNext? | Expected result |
| - | ---- | -------------- | --------------- |
| E1 | Balance SI MUR 17,500 | **Yes** | SI created |
| E2 | Payment Entry + allocate | **Yes** | Paid in full |
| E3 | Run closeout checklist | Anton | Mapping complete |

### Phase F — Cleanup

| # | Step | Anton ERPNext? | Expected result |
| - | ---- | -------------- | --------------- |
| F1 | Cancel or retain test docs per sandbox policy | **Yes** | No pollution of production |
| F2 | Document screenshots in private operator folder | Anton | Evidence captured |

---

## 4. Pass / fail criteria

| Criterion | Pass |
| --------- | ---- |
| Customer → Quotation → deposit SI → PE → Paid | End-to-end without error |
| reference_no enforced on bank PE | Validation passes |
| Bank recon delta | MUR ≤ 0.01 |
| Clearance rule documentable | All three conditions met in test |
| No email to real client | Zero external send |

---

## 5. Where Anton click-by-click is required

All ERPNext UI steps marked **Yes** above require:

- SSH tunnel or local port-forward to sandbox (`127.0.0.1:8080`)
- Operator login (credentials off-repo)
- Anton or explicitly authorised operator

Cursor does **not** hold ERPNext credentials.

---

## 6. Automation assessment

| Step | Class |
| ---- | ----- |
| Full test script | MANUAL CONTROL |
| Sandbox bootstrap | REQUIRES ERPNext CONFIGURATION |
| Synthetic CSV generation | AUTOMATION CANDIDATE |
| Production repeat | REQUIRES APPROVAL (Phase D) |

---

## 7. Cross-references

- `docs/erpnext/CORPFLOWAI_QUOTE_TO_CASH_RUNBOOK.md`
- `docs/finance/ERPNEXT_PRODUCTION_READINESS_EVALUATION.md` — S-6 dry-run
- `artifacts/corpflowai-commercial-ops/DELIVERY_RELEASE_CHECKLIST.md`
