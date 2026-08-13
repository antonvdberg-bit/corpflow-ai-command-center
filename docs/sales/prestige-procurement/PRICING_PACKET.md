# Prestige Procurement — pricing packet

**Status:** Internal calculation evidence for #919. **Recommendation for Anton — not an approved or sent price.**
**Anchor sentinel:** `<!-- PRESTIGE_PROCUREMENT_PRICING_PACKET_V1 -->`

<!-- PRESTIGE_PROCUREMENT_PRICING_PACKET_V1 -->

**Do not guess a round number and reverse-engineer hours.** Hours below come from the WBS. The MUR fee is hours × a project blended rate, plus contingency, with third-party costs **outside** the CorpFlowAI fee.

Website Rescue T1–T3 (MUR 45,000–120,000, roughly 8–45 hours) is a **different product**. This is a custom independent website with training and handover. Do not quote Prestige on the landing-rescue SKU.

---

## 1. Effort by phase (recommended WordPress base — eight pages)

Mid-case hours are the planning default. Low/high bound the recommendation range.

| Phase | Low h | Mid h | High h | Role mix |
|-------|------:|------:|-------:|----------|
| 1 Discovery & confirmation | 8 | 12 | 16 | Anton + delivery |
| 2 IA / content plan | 12 | 16 | 20 | Delivery |
| 3 UX/UI design | 24 | 32 | 40 | Design |
| 4 CMS / hosting foundation | 12 | 16 | 20 | Delivery |
| 5 Page/template implementation | 32 | 40 | 48 | Delivery |
| 6 Self-management features | 16 | 20 | 24 | Delivery |
| 7 Content population | 12 | 16 | 24 | Delivery (Prestige writes) |
| 8 QA / security / perf / a11y | 12 | 16 | 20 | Delivery |
| 9 Review & revisions | 12 | 16 | 20 | Design + delivery |
| 10 Cutover | 8 | 12 | 16 | Delivery |
| 11 Training / docs / handover | 12 | 16 | 20 | Delivery + Anton |
| 12 Acceptance / warranty admin | 4 | 6 | 8 | Delivery |
| **Total** | **164** | **218** | **276** | |

Mid **218 hours** is about **6 weeks of one focused maker**, spread over **8–12 calendar weeks** because of client review and content waits.

---

## 2. Rate basis (internal — not for the buyer slide)

Existing sprint economics (Website Rescue T3 upper band ≈ MUR 120,000 / ~45 h) imply ~MUR 2,600–2,700 per hour for short, high-intensity sprints.

A longer project should not be priced at the sprint peak hour rate (that would put the mid case near MUR 580,000 and likely lose a Mauritius SME conversation). It also should not be priced like a template brochure (that would be unpaid custom design).

| Input | Value used |
|-------|------------|
| Project blended rate | **MUR 1,250 / hour** |
| Why this rate | Below sprint peak; still covers design + implementation + training + warranty admin |
| Mid effort | 218 h |
| Raw recovery | 218 × 1,250 = **MUR 272,500** |
| Contingency / risk allowance | **~5%** on the recommended fee (scope wobble, extra revision friction) |
| **Recommended one-off fee** | **MUR 285,000** |

Low band (164 h × 1,250, rounded): **MUR 245,000** — only if Prestige accepts the leaner levers (fewer pages and/or theme-based design).
High band (custom design intact, more pages/content friction): **MUR 335,000**.

**Anton must approve the figure before any quotation is issued.** Until then, treat MUR 285,000 as the meeting recommendation.

---

## 3. Direct third-party costs (separated — Prestige pays)

These are **not** inside the MUR 285,000 CorpFlowAI fee unless Anton later includes a specific line in writing.

| Cost | Who pays | In CorpFlowAI fee? |
|------|----------|--------------------|
| Domain renewal | Prestige (existing registrar) | No |
| Hosting (WordPress host / Webflow plan) | Prestige | No |
| Premium theme or stock if we cannot use client assets | Prestige, quoted first | No |
| Google Workspace / Microsoft mailbox | Prestige | No |
| SSL | Usually included by host | No |
| Paid plugin beyond the approved free/maintained list | Only if Prestige agrees | No |
| Photography production | Prestige or separate quote | No |
| Legal review of privacy/terms | Prestige | No |

Indicative hosting only (not a quote): MUR ~400–2,500 / month depending on host class. CorpFlowAI will not subscribe “on their behalf.”

---

## 4. Optional items (priced separately)

Do not bundle these into the base fee.

| Optional item | Recommended add-on (MUR) | Notes |
|---------------|--------------------------|-------|
| Extra inner page beyond eight | 8,000–12,000 each | Same as Website Rescue extra-page band, customised |
| Full copywriting (all pages) | 25,000–45,000 | vs Prestige-supplied copy in base |
| Public product catalogue (no checkout) | 45,000–90,000 | Depends on SKU count |
| WooCommerce checkout / payments | Separate project | Out of this packet |
| EN+FR bilingual | 35,000–60,000 | Duplicate IA + editor training |
| Extra revision round | 4,000–7,000 | After the two included rounds |
| Original photography art direction | Time-and-materials | Written before spend |
| WhatsApp tap-to-chat button (manual) | 2,500 | No WhatsApp API |

---

## 5. Leaner and design-tool alternatives

Use these if Prestige cannot support MUR 285,000 — do not silently shrink scope inside Option A.

| Option | What they get | Recommended fee (MUR) |
|--------|---------------|------------------------|
| **A — Recommended** | Custom design + independent WordPress + training | **285,000** (range 245,000–335,000) |
| **B — Leaner** | Premium theme + brand customization; 5–8 pages; still independent WordPress | **165,000** (range 145,000–195,000) |
| **C — Webflow** | Custom Webflow design; Prestige pays Webflow hosting; weaker host portability | **225,000** (range 195,000–265,000) |

Option B is the honest discount path. Option C only if they accept vendor hosting.

---

## 6. Payment schedule (not 50/50)

50/50 leaves CorpFlowAI carrying design+build unpaid, or leaves Prestige paying too much before they have seen a site. Five gates follow the WBS and keep cash risk to about one phase.

Recommended fee **MUR 285,000**:

| Gate | When | % | MUR |
|------|------|--:|----:|
| 1 Mobilisation | Written acceptance + before discovery | 20% | 57,000 |
| 2 Design approval | Prestige accepts design | 20% | 57,000 |
| 3 Build milestone | Staging templates + self-management demonstrable | 25% | 71,250 |
| 4 Pre-launch | Written proceed-to-launch after review | 20% | 57,000 |
| 5 Handover | Written acceptance | 15% | 42,750 |
| **Total** | | **100%** | **285,000** |

Work for a phase does not start until the previous gate’s payment is **manually verified as cleared** (same clearance discipline as the quote-to-cash runbook: bank credit visible — not a proof-of-payment screenshot alone).

**Rejected as default:** 50/50, 100% upfront, or “pay at the end.”

If Anton prefers fewer invoices, the fallback is **three** invoices (30% mobilisation / 40% build / 30% handover) — still not 50/50. Five remains the recommendation.

---

## 7. Cash-risk note (operator)

| If we only take mobilisation | We can fund discovery + IA; we must not start heavy design without gate 2 in sight |
| If they stall after design | Gate 2 should already be paid; theme work waits |
| If they stall after staging | Gate 3 paid; cutover/training waits on gate 4 |
| Warranty | Included in the fee; not a sixth invoice; defects only |

---

## 8. VAT / tax

VAT/tax treatment pending accountant confirmation. Quotation draft must not claim to be a tax invoice.

---

## 9. What this packet does **not** do

- It does not create an ERPNext Item Price or submitted quotation.
- It does not authorise discounting below MUR 245,000 for Option A without Anton.
- It does not include hosting, domain, or stock in the CorpFlowAI total.
- It does not guarantee revenue, leads, or rankings.
