# CIPC Desk — internal pricing decision model v1

**Status:** Internal modelling overlay for GitHub **#989**.  
**Parents:** [#984](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/984), [#640](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/640).  
**Tenant / working name:** `cipc-desk` / **CIPC Desk**.  
**Environment:** `corpflow_test` operator surface only (`/change` for tenant `cipc-desk`).  
**Verdict:** Operators can compare clean-case direct-SME and partner PAYG candidates against #989 test bands with margin visibility and statutory-fee separation. **This is not public pricing. It is not a client quotation. Serah has not approved the cost/time numbers.**

<!-- CIPC_PRICING_MODEL_V1 -->

**Machine contract:** `config/cipc-pricing-model.v1.json` · `lib/cipc-desk/pricing-model.js`  
**Operator surface:** `/change` on the CIPC Desk host, logged-in session only (`components/CipcPricingOperatorPanel.js`).

**ANTON ACTION: NONE** for using this internal model. Anton (and Serah for service-scope/time) are needed only before any public price publication or client quotation.

---

## What is true when this pack is in use

Anton/CorpFlowAI can evaluate:

- clean-case **direct SME** service fees against the provisional #989 test bands;
- **Partner PAYG** wholesale candidates at a 20–35% discount, raised to the contribution-margin floor when the discount would go below cost;
- **Partner Capacity** as modelling-only — the monthly retainer stays operator-set until real pilot volume exists.

CIPC statutory fees are always shown separately and are **never** CorpFlowAI revenue.

The banner on every output is:

`INTERNAL MODEL — NOT APPROVED FOR PUBLICATION OR CLIENT QUOTATION`

---

## 1. What is evidence-backed vs TBC / synthetic

| Item | Status |
|------|--------|
| Direct-SME provisional test bands (AR R350–R650, BO R450–R850, director R450–R750, address/FYE R300–R600) | Evidence-backed from #989 market review (2026-08-19). **Still not approved public prices.** |
| Complex / historical / specialist = scoped quote, never fixed-price automation | Evidence-backed rule from #989 |
| Partner discount band 20–35% vs direct service fee | Evidence-backed commercial test range from #989 |
| Statutory CIPC fee = pass-through, not revenue | Evidence-backed rule from #989 |
| Operator hourly cost, specialist hourly cost, minutes per clean case, overhead allowance, 45% target contribution margin | **Synthetic TBC.** Not Serah-approved. Used only so the calculator can demonstrate the formulas. |
| Payment-processing allowance | Default **0 / not activated** |
| Minimum viable monthly partner value | **TBC until pilot volume** — the engine must not invent one |
| Rush / exception surcharge as a paid CIPC turnaround | **Forbidden.** Rush flags force `SCOPED_QUOTE_REQUIRED` |

If a required numeric assumption is missing, the engine returns `MISSING_ASSUMPTION` and does **not** invent a figure.

---

## 2. Formulas

All money is ZAR, rounded to cents. Statutory fees are excluded from every cost and margin formula.

1. **Internal delivery cost**  
   `(operator_minutes / 60) × operator_hourly_zar + (specialist_minutes / 60) × specialist_hourly_zar + overhead_allowance_zar + payment_processing_allowance_zar`  
   Payment processing is 0 unless explicitly activated.

2. **Service-fee floor for target contribution margin**  
   `internal_cost / (1 − target_contribution_margin_pct)`  
   Default modelled target is 45% (`synthetic_tbc`).

3. **Direct-SME comparison**  
   The modelled direct fee (config target, or an operator-proposed fee) is compared with the #989 band floor / target / ceiling. Being inside the market band does **not** waive the margin floor.

4. **Partner PAYG**  
   `direct_fee × (1 − discount_pct / 100)` with `discount_pct` in 20–35.  
   If that result is below the margin floor, the discount is **rejected** and the candidate is **raised** to the floor (`PARTNER_DISCOUNT_BREACHES_FLOOR`).

5. **Revenue**  
   `corpflowai_revenue_zar = service_fee` only.  
   `statutory_fee_passthrough` is informational.  
   `statutory_counted_as_revenue` is always `false`.

6. **Scoped quote**  
   Complex/historical/specialist matters, complex beneficial ownership, rush/exception flags, and any service with `fixed_price_eligible: false` return `SCOPED_QUOTE_REQUIRED` with `service_fee: null`.

---

## 3. Operator use

On `https://cipc.corpflowai.com/change` (logged in as CIPC Desk):

1. Select service and route (`direct_sme` / `partner_payg` / `partner_capacity`).
2. Optionally enter a statutory CIPC fee to see it listed as pass-through.
3. For Partner PAYG, set discount between 20% and 35%.
4. Mark complexity or rush when the matter is not a clean case.
5. Read cost, contribution, test band, partner candidate, and warnings.
6. **Do not** copy a number onto `/partners`, a specialist page, a client email, or a quotation.

There is no save, send, quote, or payment control on this panel.

---

## 4. Protected boundaries

This packet does **not** authorise:

- public price publication;
- changes to `/partners` or other public/client pricing copy;
- client quotation generation or send;
- live email / WhatsApp / SMS;
- payment activation;
- CIPC submission;
- schema, env, or secrets changes;
- a claim that Serah approved time or cost assumptions.

Remaining decisions before any public or client use:

1. Anton approves the commercial model (direct bands and partner discounts).
2. Serah confirms service-scope implications and whether the synthetic minutes/rates should be replaced with real assumptions.
3. A later packet may then publish or quote — this packet must not.

---

## 5. Delivery reality

This is an internal operator modelling tool. It is **PARTIAL** until Anton merges and the CIPC Desk `/change` panel is live-verified. It is never `COMPLETE` as public pricing, because public pricing is out of scope.
