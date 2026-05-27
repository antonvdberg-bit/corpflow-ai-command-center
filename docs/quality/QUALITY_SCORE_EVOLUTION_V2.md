# Quality score evolution plan — v2 design

**Status:** Design (2026-05-27). Supersedes v1 only when an explicit v2 cutover packet ships. v1 (`docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md`) remains the canonical scoring system **today**.

**Audience:** Cursor (designs + later implements scoring evolution), Anton (approves cutover, audits anti-gaming compliance).

**Companion docs (read first):**

- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — the rubric this doc evolves.
- `docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md` — what clients see; v2 must align with the client-facing metrics layer.
- `docs/operations/MONITORING_ARCHITECTURE.md` § 11.2 — future packet `exec01-quality-audit-runner` (the scheduled probe).
- `docs/operations/WEBSITE_QUALITY_REPORTING_STANDARD.md` — cadence and thresholds today.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — *Effectiveness beats decoration*; this doc operationalises that for the score.
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` — the production bar v2 must remain consistent with.

---

## 1. Why a v2 plan exists (one paragraph)

The v1 system (10 dimensions × 10 points = 100) was designed to be **legible** and **bounded** — every dimension has the same weight and every row has the same maximum. That design property was correct for v1; it removed scoring noise that came from the prior 5-dim framework (20 points per dim) where a single optional row could swing 4 points.

Three pressures will push the system to evolve over the next 6–12 months:

1. **Measurement coverage will grow** — Lighthouse, Search Console, and Plausible become available as live evidence sources (rather than the v1 placeholder rows that mark "PENDING" until measurement lands). When the evidence shifts from operator-judgement to instrument-output, the rubric's weighting needs to acknowledge which rows are now empirical.
2. **Conversion + publication activity become first-class** — once apex Search Console is verified, once one client-facing surface exists, and once the publication engine ships, the score must include "is this surface attracting real users and converting them" — not just "is the surface technically healthy."
3. **Score inflation is the failure mode to avoid** — Goodhart's law applies: when the score becomes the target, the surface gets gamed. This document's primary contribution is the **anti-gaming philosophy** that prevents that — see § 9.

v2 is not a rewrite of v1. It is a **structured evolution** with named gates and a deliberate transition window so per-tenant historical scores remain comparable across the cutover.

---

## 2. v2 design principles (the constraints)

The order is intentional. Earlier principles override later ones when they conflict.

1. **Anti-gaming first.** Any rubric change must pass the §9 anti-gaming test before merging.
2. **Buyer-meaningfulness, not technical purity.** A row that only matters to engineers (e.g. specific HTTP header presence) earns at most 0.5 points; a row that buyers can perceive (page loads fast, contact info reachable, trust signals visible) earns 1.0+.
3. **Empirical over judgement, when both exist.** If Lighthouse can measure a row, the Lighthouse number replaces the operator-judgement number — but the operator-judgement is preserved in evidence for audit comparison.
4. **Trend over snapshot.** A surface scoring 80/100 trending down is worse than one scoring 70/100 trending up. v2 introduces trend as a first-class signal — see §6.
5. **Per-tenant comparability is preserved.** A tenant's v2 score must be reconcilable with its v1 score for at least one snapshot, so historical comparisons survive the cutover.
6. **Critical-failure thresholds short-circuit.** A site that is unreachable, serves the wrong tenant content, or has a publicly-exposed admin surface scores **0/100** regardless of other dimensions. v1 implicitly allowed a broken site to score 50+ via partial credit; v2 closes that.
7. **No invisible scoring.** Every score change must trace to a named row with named evidence. No "operator vibe" adjustments; no unbounded subjective bonuses.

---

## 3. Dimension evolution (v1 → v2 weights)

The dimensions remain the same ten. The total stays 100. What changes is **intra-dimension row weighting** and the introduction of a **critical-failure short-circuit** at the dimension level.

### 3.1 Weight evolution table (planned, gated on §5 integrations landing)

| Dim | v1 weight | v2 weight | Change rationale |
|---|---|---|---|
| §3.1 SEO / indexing | 10 | **10** | Same total; intra-dim shifts from "head tag presence" rows to "Search Console-verified indexed" rows once SC integrates (§5.1). |
| §3.2 Accessibility | 10 | **10** | Same; intra-dim shifts from "manual checks" to "Lighthouse a11y score" once Lighthouse integrates (§5.2). |
| §3.3 Performance | 10 | **10** | Same; intra-dim TTFB row weight reduces from 4 to 2; Lighthouse Perf score row gains 2 (§5.2). |
| §3.4 Mobile usability | 10 | **10** | Same; intra-dim shifts toward Lighthouse mobile (§5.2). |
| §3.5 Conversion clarity | 10 | **10** | Same total; new row (1.0) for "Plausible-measured CTA click-through rate above tenant floor" once analytics integrates (§5.3). Other rows compress by 0.1 each. |
| §3.6 Trust architecture | 10 | **10** | Same total; new row (1.0) for "publishable owner identity + accessible operator on `/contact`" — formalises the audit fix #7 family. Other rows compress. |
| §3.7 Analytics / measurement | 10 | **10** | Same; intra-dim shifts from "Plausible installed" → "Plausible + Search Console BOTH have ≥30 days of data" (§5.3). |
| §3.8 Monitoring / runtime health | 10 | **10** | Same; new row (1.0) for "Telegram alert path verified live within the audit window" — credits the §3 wiring from `TELEGRAM_ALERT_WIRING_PACKET_V1.md`. |
| §3.9 Content completeness | 10 | **10** | Same; new row (1.0) for "Publication engine has produced ≥1 new buyer-facing post in the last 30 days" once publication engine ships (§5.5). |
| §3.10 Tenant routing / infrastructure correctness | 10 | **10** | Same; row weights stable. |
| **Total** | **100** | **100** | Total preserved across cutover. |

### 3.2 Critical-failure short-circuit (NEW in v2)

Score becomes **0/100** if *any* of these holds:

- The surface's primary buyer-facing URL is unreachable (HTTP 5xx) for >5 minutes during the audit.
- The surface serves the wrong tenant's content (host→tenant resolution failure detected).
- An operator-only namespace (`/change`, `/admin`, `/master`) is publicly indexable or serves with a 200 to anonymous traffic.
- Production database is unreachable for >5 minutes during the audit (per Production Pulse §3.3).

This short-circuit is a guardrail, not a typical outcome. In v1, a site with one broken row in each dimension could score 70+/100 even if the homepage was unreachable. v2 closes that.

### 3.3 What does NOT change in v2

- Dimension count (10) — adding dimensions invites scoring noise; consolidation goes the other way (none in v2).
- Total cap (100) — preserves intuitive interpretability.
- Thresholds: <60 remediation, 60-74 acceptable-with-risks, 75-84 production-ready, 85+ premium target.
- Client-facing vs. internal scoring split — internal still owns sub-rows; client-facing still shows dimension totals only.

---

## 4. Cutover gates (when v2 ships)

v2 is gated. Each gate must be satisfied before v2 becomes the canonical scoring system for new audits. Any partial gates leave the audit in v1.

### Gate G1 — measurement coverage

- [ ] Apex Search Console verified + indexed + ≥30 days of data per `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` Definition of Done.
- [ ] Lighthouse mobile baseline captured for apex + Lux (operator browser session, per audit fix #1).
- [ ] Plausible apex env flipped + apex has ≥30 days of data per `docs/analytics/CORPFLOW_ANALYTICS_V1.md`.

### Gate G2 — anti-gaming pre-check

- [ ] The §9 anti-gaming test (this doc) has been run dry against a synthetic "gamed" tenant manifest. Result: gamed manifest scores must be ≤45/100. If any gamed manifest scores ≥60, the rubric is not tight enough; fix before cutover.

### Gate G3 — historical comparability

- [ ] At least one tenant has had **both** a v1 and a v2 audit captured within 14 days of each other, with reconciliation table (per §11.7).
- [ ] Reconciliation delta is ≤ ±5 points (i.e. v2 didn't silently invent ±10 swings).

### Gate G4 — client-facing reporting alignment

- [ ] `docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md` updated to consume v2 scores in the same client report format. No client-visible re-formatting in the cutover PR.

### Gate G5 — operator approval

- [ ] Anton approves cutover after reviewing the reconciliation table.

When all five gates are satisfied, a single PR ships v2 + retires v1 + updates `AGENTS.md`. Pre-cutover, v2 lives only in this design doc.

---

## 5. Integration roadmap (when each measurement source comes online)

### 5.1 Search Console integration (gated on `search-console-apex` packet COMPLETE)

- Source: Search Console UI export (CSV) for v2.0; Search Console API for v2.1.
- Consumes: §3.1 *Indexed in Google for the canonical query*, *Performance impressions ≥ N over 30 days*, *Average position monitored*. Each row earns when measurement exists, not when the operator asserts the surface is "SEO-ready."
- Anti-gaming: impression-count rows must reference the **canonical buyer-intent query** for the surface, not the easiest-to-rank query. Tenant must declare the canonical query in `config/tenant-quality/<slug>.json` as part of v2 setup.

### 5.2 Lighthouse integration (gated on `exec01-quality-audit-runner` packet or manual operator-session baseline)

- Source: Lighthouse mobile + desktop runs, captured weekly per tenant.
- Consumes: §3.2 *A11y score*, §3.3 *Perf score + LCP + TBT + CLS*, §3.4 *Mobile usability sub-scores*.
- Anti-gaming: scores must be from **mobile, throttled 4G, cold cache** — the harshest standard profile. A site that scores 95 on desktop but 45 on mobile-throttled fails §3.3 + §3.4 — and that is the correct outcome (most buyers reach the site mobile-first).

### 5.3 Analytics integration (gated on `plausible-apex-only-rollout` complete + ≥30 days of data)

- Source: Plausible export (CSV) — apex initially, then per-tenant when tenant analytics ship.
- Consumes: §3.5 *Conversion clarity CTA CTR ≥ tenant floor*, §3.7 *Analytics has ≥30 days of data*.
- Anti-gaming: CTR row credits the **primary CTA-defined-in-doctrine**, not any clickable element. For AI Lead Rescue this is the buyer-intent CTA per `BRAND_AND_CONVERSION_DOCTRINE.md`, not "Choose payment path."

### 5.4 Conversion integration (gated on tenant-side lead capture system shipping)

- Source: CMP `automation_events` for `lead_captured` and downstream conversion events.
- Consumes: §3.5 new row *Lead-to-meeting rate or similar named conversion is measurable* (1.0 point, earned by measurement existing — not by hitting a target).
- Anti-gaming: this is a **measurability** row, not a **performance** row. Tenant earns the point by having the funnel instrumented; tenant does not lose the point for low conversion. (Low conversion is a backlog item, not a score deduction. See §9.)

### 5.5 Publication activity integration (gated on `publication-engine-v1-design` complete + ≥1 month of operation)

- Source: CMP or content table that records publication events.
- Consumes: §3.9 new row *Publication engine has produced ≥1 new buyer-facing post in the last 30 days* (1.0 point).
- Anti-gaming: "publication" must reach a real buyer-facing surface (sitemap-listed, internal-link reachable). A draft sitting in a CMS does not earn the point.

---

## 6. Trend scoring (NEW in v2)

Every dimension carries a **delta column** alongside its current score: the change vs. the same dimension's score 30 days prior.

- **+** if score increased by ≥1.0 point.
- **=** if score within ±1.0 point.
- **−** if score decreased by ≥1.0 point.

A surface trending downward in 3+ dimensions over 30 days enters **trend-attention** state in the client report regardless of absolute score. A surface trending upward in 3+ dimensions enters **trend-positive** state. Trend states are layered on top of the absolute thresholds (§ 4 thresholds preserved).

**Why this matters:** today (v1), a tenant that drifted from 85 → 75 in a month is treated the same as one stable at 75. v2 calls out the drift, because the drift is the operational signal — not the snapshot.

**Anti-gaming consideration:** a tenant cannot game the trend by deliberately under-scoring an earlier audit to manufacture an upward delta. Mitigation: every audit's evidence folder is immutable post-merge; backfilling lower scores requires explicit re-opening of the prior audit's PR.

---

## 7. Historical scoring snapshots (NEW in v2)

Each per-tenant audit produces:

1. The markdown report under `artifacts/quality-audits/<YYYY-MM-DD>-<tenant>-quality-vX.md` (today's format).
2. **NEW in v2:** a machine-readable JSON sidecar at `artifacts/quality-audits/<YYYY-MM-DD>-<tenant>-quality-vX.json`.

The JSON sidecar contains:

- `audit_date`, `tenant_slug`, `system_version` (e.g. `v2.0`), `total_score`.
- `dimensions[]` — array of 10 entries with `dim_id`, `score`, `subrows[]` with `id`, `score`, `evidence_ref`.
- `delta_vs[]` — array of {`compared_to_audit`, `delta_total`, `delta_per_dim`}.
- `critical_failures[]` — empty unless any §3.2 short-circuit fired.

The JSON enables **per-tenant historical charts** (CLIENT_PERFORMANCE_REPORTING_MODEL.md §6) without re-parsing the markdown. The markdown remains the human-readable canonical record.

---

## 8. Tenant benchmarking (NEW in v2, only when ≥3 tenants exist)

When the tenant fleet has ≥3 active tenants with v2 audits ≤30 days old:

- **Percentile per dimension** is calculated across the fleet.
- The tenant's report says e.g. "Conversion clarity 8/10 — fleet median 7/10, 75th percentile 9/10."

**Anti-gaming consideration:** percentile is informational, not scored. A tenant cannot lose points for being below the median; a tenant cannot gain points for being above the median. The benchmarking is a backlog-prioritisation signal, not a competitive signal.

Until ≥3 tenants exist, the benchmarking section is omitted from reports.

---

## 9. Anti-gaming philosophy (the centre of v2)

Goodhart's law: *"When a measure becomes a target, it ceases to be a good measure."* This section is the v2 system's primary defence.

### 9.1 The forbidden practices (auto-fail the row)

A tenant or operator that does any of these earns **zero points** in the affected row, regardless of any technical-checklist completion:

1. **Auto-injecting meta tags without buyer-meaningful content.** Example: shipping `<meta name="description" content="…">` whose body is keyword-stuffed AI-generated text that does not match the page's actual subject. Caught by: doctrine-aligned `<meta description>` must be operator-approved per audit row § 3.1.
2. **Padding the sitemap with thin pages.** Example: adding 50 `<loc>` entries to `pages/sitemap.xml.js` pointing at pages with <50 words of unique content each. Caught by: sitemap entries are counted only when the linked page has the §3.9 content completeness threshold met.
3. **Fabricating performance via cache headers only.** Example: setting `cache-control: max-age=31536000` on the home page so subsequent probes appear fast, while cold loads remain slow. Caught by: Lighthouse runs use a cold cache; sub-row credit comes from cold-Lighthouse, not from warm-cache TTFB.
4. **Hiding broken surfaces behind `robots.txt`.** Example: a `/lead-rescue` page is 500-ing, but the surface is `Disallow:`'d so it doesn't show in indexing reports. Caught by: §3.10 row *All non-Disallow'd URLs return 200/3xx* must pass; Disallow is not a way to hide a broken surface.
5. **Treating per-page `noindex` as completion.** Example: a privacy policy with broken content marked `noindex` to avoid Search Console flags. Caught by: §3.6 trust rows require the page to be both `index`-able AND tenant-appropriate; `noindex` privacy = zero credit.
6. **Conversion-rate manipulation via redefining the funnel.** Example: changing what counts as a "conversion" to one that the tenant trivially achieves (e.g. "page-view counted as conversion"). Caught by: §3.5 funnel rows reference the doctrine-defined buyer-intent CTA + downstream named events; tenant cannot redefine without an explicit `doctrine_revision` event logged in CMP.
7. **Trend manipulation by re-opening prior audits.** Example: lowering a prior audit's score to create an upward trend. Caught by: prior audits are immutable post-merge; any modification requires an explicit `audit_amendment` PR with rationale.
8. **Inflating monitoring coverage by counting one monitor as N.** Example: claiming the §3.8 monitoring row is satisfied because "one cron checks 5 things" when those 5 things are not separate failure modes. Caught by: §3.8 rows reference `MONITORING_ARCHITECTURE.md` § 2 monitor count, which is the canonical source.

### 9.2 The anti-gaming dry-run (Gate G2 of cutover)

Before v2 ships, Cursor constructs a **synthetic gamed tenant manifest** — a hypothetical tenant that passes every technical checklist while violating every doctrine principle:

- Auto-generated `<meta description>` for every page.
- Sitemap padded with 50 thin pages.
- Cache-control headers maxed.
- Broken pages hidden behind `robots.txt`.
- Privacy policy `noindex`'d.
- Conversion redefined as page-view.

Under v1, this tenant could score ~70+/100. Under v2, it must score **≤45/100**. If it does not, the rubric is not tight enough and v2 doesn't ship until the gaps close.

### 9.3 The buyer test (the anti-gaming heuristic)

Before adding any new scoring row to v2 or v3, ask:

> "If a real buyer reaches this surface, would they care whether this row is satisfied?"

If the answer is "no," the row is at most 0.5 points (or doesn't exist at all). If the answer is "yes, they would care," the row is 1.0+ points and the evidence must be buyer-perceivable (not just instrument-perceivable).

This heuristic is intentionally not auto-enforceable; it's an operator-conscience rule that the audit reviewer (Anton or Cursor) applies during PR review.

### 9.4 Score-ceiling discipline (per dimension)

No dimension may award **more than 10 points**. This sounds obvious, but the failure mode is: a dim adds 5 new sub-rows worth 1 point each, and the total quietly creeps to 15. The cutover PR's tests must assert per-dimension cap.

Code-level invariant (in the future `lib/quality/score-v2.js`): `assertEachDimAtOrUnder10(scoreObj)` runs after every score calculation.

---

## 10. Premium-tier scoring criteria (85+ in v2)

Today (v1), 85+ means "premium target." In v2, 85+ requires *all three* of:

1. **Absolute score ≥ 85** across the 10 dimensions.
2. **Trend-positive or trend-stable** (no dimension trending down ≥2 points over 30 days).
3. **Zero P0-fix backlog items** (the audit's top-fix list has no critical-severity items outstanding).

A tenant scoring 88 with three downward-trending dimensions does *not* qualify for premium-tier in v2 — the trend signal is the controlling factor.

This codifies the doctrine: *Conversion beats completeness*. A tenant whose surface is technically perfect today but degrading is in worse operational state than one at 80 trending up.

---

## 11. Cutover narrative (v1 → v2 transition)

### 11.1 Phase 0 — co-existence (today through Gate G1)

- v1 is the canonical system. v2 lives in this design doc.
- Every audit is v1 audit.
- v2 design is observed against new audits informally (anti-gaming dry-run, trend tracking) but does not score officially.

### 11.2 Phase 1 — first measurement landings (post-G1)

- Apex Search Console verified; Lighthouse baseline captured; Plausible has ≥30 days of data.
- Next per-tenant audit runs in **v1 system** with v2 evidence captured as a sidecar.

### 11.3 Phase 2 — anti-gaming validation (G2)

- The synthetic gamed manifest test runs. If ≤45/100, proceed; otherwise tighten rubric.

### 11.4 Phase 3 — dual-audit baseline (G3)

- For one tenant (likely Lux), run a v1 audit and a v2 audit within 14 days of each other.
- Capture the reconciliation table in `artifacts/quality-audits/<date>-<tenant>-quality-reconciliation.md`.
- Confirm |v1 − v2| ≤ 5 points.

### 11.5 Phase 4 — client-reporting alignment (G4)

- Update `CLIENT_PERFORMANCE_REPORTING_MODEL.md` §3.5 *Quality score* row to consume v2 scores in the same client-visible format. Client format unchanged.

### 11.6 Phase 5 — cutover (G5)

- One PR ships: `lib/quality/score-v2.js` + `config/tenant-quality/*.json` + `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V2.md` + retirement of v1 (marked archival, not deleted).
- `AGENTS.md` must-read row updates to point at v2.
- `MONITORING_ARCHITECTURE.md` § 11.2 future packet `exec01-quality-audit-runner` row updates.

### 11.7 Reconciliation table format (per Gate G3)

```markdown
| Dim | v1 score | v2 score | Δ | Reason for difference |
|---|---|---|---|---|
| §3.1 SEO/indexing | 6 | 7 | +1 | v2 credits Search Console indexed-count empirically; v1 capped at "head tags present." |
| ... | ... | ... | ... | ... |
| **Total** | **59** | **61** | **+2** | Δ ≤ 5; reconciles. |
```

---

## 12. What does NOT change at v2 (named explicitly)

To prevent scope creep, the cutover **does not** include any of these (they remain v1-style or are v3+ candidates):

- The dimension count stays at 10.
- The total cap stays at 100.
- Thresholds: <60 / 60-74 / 75-84 / 85+ preserved.
- Client-facing report format preserved.
- Per-tenant audit cadence preserved (per `WEBSITE_QUALITY_REPORTING_STANDARD.md`).
- The 5 audit dimensions of the old framework (`docs/execution/WEBSITE_QUALITY_MEASUREMENT_FRAMEWORK.md`) are NOT revived. The 10-dim system is the canonical evolution.

---

## 13. Future evolutions (v3+, sketched only)

Named here so v2 doesn't drift into them:

- **v3:** Score weighting based on tenant tier (e.g. a flagship tenant's §3.1 weighted higher than a staging tenant's). Today, all tenants share one rubric.
- **v3:** Per-region scoring (e.g. EU performance scored separately from US performance when traffic split warrants).
- **v3:** Composite scores across multiple URLs of the same tenant (today, score is per-surface; v3 could score per-tenant across all surfaces).
- **v3:** External benchmark comparison (e.g. compare CorpFlow tenants to industry-standard quality scores).

Each future evolution earns its own design doc.

---

## 14. Cross-references

- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — the rubric v2 evolves.
- `docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md` — consumes v2 in Phase 4.
- `docs/operations/WEBSITE_QUALITY_REPORTING_STANDARD.md` — cadence + thresholds.
- `docs/operations/MONITORING_ARCHITECTURE.md` § 11.2 — `exec01-quality-audit-runner` consumes v2 once cutover.
- `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` — gates G1 measurement coverage for §3.1.
- `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md` — gates G1 monitoring coverage for §3.8.
- `docs/quality/LUX_TRUST_AND_POLICY_REMEDIATION_PLAN.md` — feeds v2 §3.6 + §3.9 evidence.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — anti-gaming philosophy aligns.
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` — production bar v2 maintains.
- `artifacts/quality-audits/*.md` — historical record; v1 audits remain readable post-cutover.

---

*Design only as of 2026-05-27. No code change. v2 cutover is a separately-approved packet gated on G1-G5 above.*
