# Launch products — buyer-to-delivery continuity v1

**Status:** Current-`main` acceptance record for [#1218](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1218).

**Environment:** `corpflow_test` / current public CorpFlowAI apex (`corpflowai.com`) + authenticated proof surfaces.

**Anchor sentinel:** `<!-- LAUNCH_PRODUCT_BUYER_TO_DELIVERY_CONTINUITY_V1 -->`

<!-- LAUNCH_PRODUCT_BUYER_TO_DELIVERY_CONTINUITY_V1 -->

**Current-main SHA:** `b731411734edb01b7dbb8d7e20247c5a7805983a`

**Sources already on that SHA:** merged [#1167](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1167) buyer-path correction, [#1173](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1173) enquiry→Prospect/Commercial, [#1168](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1168) ERPNext safe quotation slice, [#1169](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1169) Tenant delivery progress.

This packet proves Lead Rescue and Website Rescue behave as **one revenue-to-delivery product path** on current `main`. It does **not** submit a live enquiry, mutate Postgres or ERPNext, send externally, or decide public launch / `client_production`.

## Target continuity

```text
public buyer path
  → named product / proof / demo
  → qualified-enquiry entry point
  → canonical Prospect / Commercial identity
  → authoritative ERPNext quotation reference where already recorded
  → Tenant delivery progress / review
```

## Route sequence (live public)

| Step | Lead Rescue | Website Rescue |
|------|-------------|----------------|
| Gateway | `https://corpflowai.com/` | `https://corpflowai.com/` |
| Named landing | `https://corpflowai.com/lead-rescue` | `https://corpflowai.com/website-rescue` |
| Proof / demo | Intro + morning walkthrough on the landing | `https://corpflowai.com/demo/website-rescue` |
| Primary CTA | **Start my 48-hour setup** | **Request discovery** |
| Enquiry entry | `https://corpflowai.com/contact?offer=ai-lead-rescue#discovery` | In-page `#discovery` on `/website-rescue`, plus `https://corpflowai.com/contact?offer=premium-landing-page-rescue#discovery` |
| Staff Prospect | `/app/prospects/[id]` (Core only) | same |
| Staff Commercial | `/app/commercial` and `/app/commercial/[id]` (Core only) | same |
| Tenant progress | `/app/tenant` → Requests & Progress | same |
| Review follow-up | `/change?from=tenant-workspace` | same |

Do **not** record `/offers/ai-lead-rescue`, `/offers/premium-landing-page-rescue`, or `aileadrescue.corpflowai.com` as the launch-product path. `/offers/website-rescue` permanently redirects to `/website-rescue`.

## Fixture identifiers (existing synthetic / proof only)

Enquiry → Prospect / Commercial (no quotation fabricated):

| Synthetic id | Product in Prospect | Source | Consent | Urgency | Commercial product | Quotation |
|---|---|---|---|---|---|---|
| `syn-1171-lr-enquiry` | `ai-lead-rescue` | `/contact?offer=ai-lead-rescue` | true | `this-month` | `lead-rescue` | none — `MISSING_PROPOSAL` |
| `syn-1171-wr-enquiry` | `corpflow-rapid-delivery` | `/website-rescue` | true | `asap` | `website-rescue` | none — `MISSING_PROPOSAL` |

Already-recorded ERPNext quotation pointers (read-only; same name through Commercial):

| Synthetic id | Product | Authoritative quotation | Tenant progress id |
|---|---|---|---|
| `syn-772-lr-ada` | Lead Rescue | `SAL-QTN-2026-00001` | Staff-only commercial/prospect. Lead Rescue **tenant** progress uses the bound #715 record below, not this marketing-lead id. |
| `syn-716-wr-cleared` | Website Rescue | `SAL-QTN-2026-00004` | Same prospect id in Tenant Requests & Progress (`Getting started`) |
| `syn-1151-wr-tenant-progress` (Pia) | Website Rescue | `SAL-QTN-2026-00005` | Same prospect id in Tenant Requests & Progress (`Preview ready`) |

Lead Rescue tenant delivery bind (explicit; not guessed from email/name):

| Side | Identifier |
|---|---|
| Tenant / request | `corpflowai` / `syn_lr_delivery_corpflowai_001` |
| #715 delivery record | `synthetic-lr-client-review` |
| Join | `console_json.lead_rescue_delivery.record_id` + request `tenant_id` |

`SAL-QTN-2026-00005` is also the recorded CF1018 selling-slice draft MUR quotation (#1168). This packet **reuses that recorded name**; it does not create a second ledger row.

Isolation foil (must never appear to Tenant — CorpFlowAI): `syn-1151-wr-other-tenant` / `syn_slice1_req_other_001`.

## Live GET (2026-08-27 UTC, Production serving `b731411734ed…`)

GitHub Production deployment `6122881088` is **success** for this SHA. Vercel inspection: `https://vercel.com/corpflowai/corpflow-ai-command-center/7wksP4BnKrpNPPvqY5mV3UM5zgDs`.

| URL | HTTP | Notes |
|-----|------|-------|
| `https://corpflowai.com/` | **200** | Nav/footer **Lead Rescue** + **Website Rescue** (named paths). Primary CTA **Request a qualified conversation**. No SKU titles in footer. |
| `https://corpflowai.com/lead-rescue` | **200** | H1 *Stop losing leads because follow-up is too slow.*; CTA **Start my 48-hour setup** |
| `https://corpflowai.com/website-rescue` | **200** | H1 *Turn a weak landing page into a credible enquiry path — fast.*; CTA **Request discovery**. No *Starting path:* |
| `https://corpflowai.com/demo/website-rescue` | **200** `noindex` | Harbour Hospitality fictional demo; enquiry labelled **Request discovery — Website Rescue** |
| `https://corpflowai.com/contact?offer=ai-lead-rescue#discovery` | **200** | Heading **Request AI Lead Rescue**; no-auto-send copy |
| `https://corpflowai.com/contact?offer=premium-landing-page-rescue#discovery` | **200** | Heading **Request Website Rescue**; no-auto-send copy |
| `https://corpflowai.com/offers/website-rescue` | **308** → `/website-rescue` | Named-path redirect |
| `https://core.corpflowai.com/api/factory/health` | **200** | Internal health only — not proof of the buyer path |
| Unauthenticated `/api/app/prospect`, `/commercial`, `/delivery`, `/prospects`, `/queue`, `/requests` | **401** `authentication_required` | No fixture ids leaked |
| Unauthenticated HTML `/app/prospects`, `/app/commercial`, `/app/delivery`, `/app/tenant` | **200** shell only | No `syn-772-lr-ada` / `SAL-QTN-` in the document |

This packet did **not** POST `/api/tenant/intake`. Desktop (~1440) and mobile (~390) walks click one primary CTA per named product and stop at the labelled enquiry. They do not submit.

## Role boundary

| Actor | May see | Must not see |
|-------|---------|--------------|
| Public buyer | Named landings, proof/demo, labelled enquiry | Staff Prospect / Commercial / Delivery, quotation names, operator notes |
| Tenant (`typ=tenant`) | Requests & Progress stage / next action / deliberately exposed review evidence; `/change?from=tenant-workspace` | `/app/prospects`, `/app/commercial`, `/app/delivery`, commercial notes, quotation/invoice names, other-tenant rows |
| Core / operator | Canonical Prospect + Commercial + recorded ERPNext quotation GET | Must not mutate ERPNext or fabricate a missing quote |

Tenant nav stays **Requests & Progress** + **Service & change**. Navigation does not create a ticket or a second CRM/client/commercial/delivery record.

## Verdict

**LAUNCH PRODUCT BUYER-TO-DELIVERY CONTINUITY USABLE**

No single continuity blocker required a runtime fix on this SHA. The four landed slices already share identities: labelled enquiry rows stay one Prospect/Commercial record; Ada/Wren/Pia quotation names stay the recorded ERPNext references; Website Rescue tenant progress uses the same prospect id; Lead Rescue tenant progress uses the explicit #715 bind.

## Quality gate (self-check)

Not a new buyer-facing page. Continuity proof of already-shipped named products.

- Audience: Anton / operator accepting launch-product readiness.
- Stage: revenue / client acceptance.
- Commercial outcome: one coherent path from named offer to tenant review.
- Score (operator evidence): Strategic 2, Message 2, Proof 2, Scannability 2, Visual 1 (no redesign), Conversion 2, Channel 2 → **13 / 14**.

Promptfoo / AI eval: **NOT APPLICABLE** — no AI behaviour, prompts, drafting, model routing, tenancy-prompt handling, escalation, or protected-action AI handling changed.
