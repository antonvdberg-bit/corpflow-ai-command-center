# CIPC Desk — internal pricing decision model v1

**Status:** Internal modelling overlay for GitHub **#989**.  
**Parents:** [#984](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/984), [#640](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/640).  
**Tenant / working name:** `cipc-desk` / **CIPC Desk**.  
**Environment:** `corpflow_test` operator surface only (`/change` for tenant `cipc-desk`).  
**Verdict:** The current measured pilot accepts private, session-only operator inputs for provisional service-fee modelling. Historical rates, times, bands, and discount examples remain dated, synthetic, and unapproved. **This is not public pricing. It is not a client quotation.**

<!-- CIPC_PRICING_MODEL_V1 -->

**Machine contract:** `config/cipc-pricing-model.v1.json` · `lib/cipc-desk/pricing-model.js`  
**Operator surface:** `/change` on the CIPC Desk host, logged-in session only (`components/CipcPricingOperatorPanel.js`).

**Current status:** `INTERNAL PILOT — PRICES AND TIMINGS PROVISIONAL`. Process-pilot approval is separate from final commercial approval. The pilot cannot publish, quote, send, submit, or pay.

---

## What is true when this pack is in use

The explicit **Historical example — unapproved** mode retains the earlier synthetic calculator for comparison only. The **Current measured pilot** mode is the only current mode and requires the operator to enter, for this session:

- candidate net service fee, fully loaded human hourly rate, AI/tool cost;
- ordinary human review/submission/confirmation/follow-up minutes;
- exception frequency and extra human minutes;
- payment charge on the full amount collected, allocated overhead, and chosen contribution threshold;
- optional statutory pass-through, which is never service revenue.

Inputs are cleared on mode, audience, or service changes. They are not stored in localStorage, telemetry, APIs, or a database. There is no default discount and no automatic fee recommendation.

The banner on every output is:

`INTERNAL MODEL — NOT APPROVED FOR PUBLICATION OR CLIENT QUOTATION`

---

## 1. Pilot catalogue and boundaries

The pilot catalogue includes existing-entity onboarding; new-company onboarding
plus one registration bundle; registration excluding setup; annual return with
current BO; simple BO; one director appointment/resignation; address; share
certificate from a verified register; name reservation; and financial year end.
Address and FYE are separate services. Bundle components are counted once.
Complex specialist work is scoped quote only.

One simple entity file is the onboarding lane. An already usable verified file
does not receive a duplicate setup fee. Cleanup or complex scope requires a
separate pre-agreed quote. Initial BO remains separate. A share certificate is
a company-record task, not a CIPC filing. The ordinary annual-return lane
requires current BO. No legal, fee, or turnaround guarantee is made.

Pilot audiences are direct small business, professional partner, and
multi-company portfolio. Retainers and discounted tiers require measured-volume
evidence and operator inputs; no volume minimum is invented.

## 2. What is evidence-backed vs TBC / synthetic

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

## 3. Formulas

All money is ZAR, rounded to cents. Statutory fees are excluded from every cost and margin formula.

1. **Measured pilot expected human minutes**
   `ordinary_human_minutes + exception_frequency × exception_extra_human_minutes`

2. **Measured pilot variable cost**
   `(expected_human_minutes / 60) × fully_loaded_human_hourly_rate + AI/tool_cost + payment_charge`

3. **Measured pilot threshold**
   `required_service_fee = variable_cost / (1 − contribution_threshold)`

4. **Candidate handling**
   Contribution is `net_service_fee − variable_cost`, and margin is contribution
   divided by net service fee. Allocated overhead is shown separately and
   subtracted only for “contribution after allocated overhead”; this is not
   whole-business net profit. If the candidate fails the threshold it remains
   unchanged and the result is `REVISE`.

5. **Stress comparison**
   Stress minutes and exception assumptions are separately entered. Missing
   inputs remain `MISSING_INPUT`; confirmed zero is valid. Statutory amounts are
   never subtracted again from an already-net service fee, while payment charge
   is included in cost.

Historical formulas remain documented below in the dated historical mode and
must not be treated as current approved pricing.

---

## 4. Operator use

On `https://cipc.corpflowai.com/change` (logged in as CIPC Desk):

1. Select service and route (`direct_sme` / `partner_payg` / `partner_capacity`).
2. Optionally enter a statutory CIPC fee to see it listed as pass-through.
3. For Partner PAYG, set discount between 20% and 35%.
4. Mark complexity or rush when the matter is not a clean case.
5. Read cost, contribution, test band, partner candidate, and warnings.
6. **Do not** copy a number onto `/partners`, a specialist page, a client email, or a quotation.

There is no save, send, quote, or payment control on this panel.

---

## 5. Evidence checklist and protected boundaries

Before any commercial approval, evidence is still required for completed
routine cases/onboarding, measured review and follow-ups, permitted filing
channel, authority/mandate and confirmation, tax treatment, and available
specialist hours and queue capacity. Actual case and financial records belong
in ERPNext; this calculator creates none.

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

## 6. Delivery reality

This is an internal operator modelling tool. Sanitized deterministic evidence
is in `artifacts/business-admin-desk-pricing-pilot/README.md`. The delivery
verdict is **PARTIAL** until the authenticated test route and deployed commit
are verified. It is never `COMPLETE` as public pricing, because public pricing
is out of scope.
