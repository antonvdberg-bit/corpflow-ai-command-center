# Managed Functions — Cursor implementation classification v1

**Status:** PREPARED / docs-only / no runtime authorization  
**Source issue:** #1274  
**Commercial/content source PR:** #1275  
**Prepared:** 2026-09-11

## Executive classification

The public implementation should **not** be treated as one large website project. The repository audit shows that CorpFlowAI already has the routing, public shell, Insights engine, metadata helper, sitemap integration, visual shell and governance needed for this sprint.

Recommended implementation is four bounded packets:

| Packet | Class | Purpose | Cursor work after this preparation |
|---|---|---|---|
| A | **S** | Publish four new Insights records using the existing engine | Structured content insertion + existing tests/build |
| B | **M** | Add `/managed-growth` and `/growth-leakage-review` public pages using existing public components | Two composition pages, no new platform/CMS/database |
| C | **S–M** | Reconcile apex homepage/About/Services/nav copy to the Managed Functions hierarchy | Bounded copy/import edits; preserve Lead Rescue conversion route |
| D | **S** | SEO/AI-discoverability verification + test coverage | robots confirmation, metadata/schema verification, sitemap assertions, internal-link checks |

**Overall:** `M` implementation programme only because it spans several public surfaces. It is **not an L-class build** and must not be allowed to expand into one.

## Packet A — four flagship Insights

### Classification: S

### Why
The engine already exists:
- repository-managed editorial source: `lib/public/insights-content.js`;
- index renderer: `pages/insights/index.js`;
- article renderer: `pages/insights/[slug].js`;
- static paths automatically derive from `INSIGHTS`;
- sitemap already imports `listInsightsForStaticPaths()`.

Therefore no CMS, DB, new dynamic routing, API, or sitemap architecture is needed.

### Exact intended changes
1. Add four `INSIGHT_RECORDS` entries in `lib/public/insights-content.js` from #1275 source copy.
2. Use current `INSIGHT_STATUS.PUBLISHED` only after operator publication approval; use `DRAFT` on preview branch if we want preview/noindex first.
3. Use existing `CorpFlowAI` author convention unless operator explicitly chooses founder attribution.
4. Reuse approved governed hero assets initially; do not create a visual-asset subproject merely to publish editorial content.
5. Confirm `/insights` and all four article routes render.
6. Confirm sitemap automatically includes published/static records.

### Explicitly excluded
- new CMS;
- MDX framework;
- database-backed content;
- search engine;
- content editor UI;
- translation system;
- automated publishing.

## Packet B — Managed Growth + Growth Leakage Review pages

### Classification: M

### Why
Two new buyer-facing pages are needed, but all page primitives already exist.

### Preferred routes
- `/managed-growth`
- `/growth-leakage-review`

### Reuse
Use existing:
- `components/public/CorpFlowPublicPhotoShell.js` for beautiful public-marketing shell;
- `components/public/PublicHero.js`;
- `components/public/OutcomeSection.js`;
- `components/public/PublicCtaBand.js`;
- `components/public/PublicTrustBand.js`;
- `lib/public/corpflow-public-market.js::buildPublicPageMeta`;
- existing CorpFlowAI styles and governed visual assets.

Do not build bespoke design primitives.

### Managed Growth page primary job
Explain the top-level managed commercial function and move a suitable buyer toward the Growth Leakage Review.

Primary CTA: **Request a Growth Leakage Review**.

Secondary path: relevant Insights.

### Growth Leakage Review page primary job
Explain the diagnostic, fit criteria, what will be reviewed, what the buyer receives, what it does not promise, and route the buyer into the existing contact/discovery mechanism unless a separately approved intake is later justified.

Do not create a new database intake workflow in this packet.

## Packet C — apex narrative reconciliation

### Classification: S–M

### Files already confirmed as relevant
- `components/CorpFlowPublicHome.js`
- `lib/public/corpflow-public-market.js`
- `pages/about.js`
- `pages/services.js`

### Required outcome
The apex site must stop implying that CorpFlowAI is only Lead Rescue / Website Rescue while **preserving Lead Rescue as the current concrete paid wedge**.

Hierarchy:
1. CorpFlowAI — enterprise-grade business functions, operated for SMEs.
2. Managed Growth — first commercial function family.
3. Lead Rescue — current bounded paid wedge within Managed Growth.
4. Website Rescue — complementary conversion-surface service, not the company definition.

### What must remain intact
- current Lead Rescue route and working conversion mechanism;
- current commercial terms until separately changed;
- existing payment/governance wording where required;
- tenant-host routing;
- Lux/Concierge/France visual and brand separation;
- `/change`, admin, factory and tenant-private surfaces;
- no revenue guarantee;
- no unapproved paid-media runtime.

### High-value specific correction
`pages/about.js` currently says:
> "CorpFlowAI is not a growth platform. It is an operations company."

Replace the contradiction while retaining the useful distinction from software platforms. Recommended meaning:
> "CorpFlowAI is not a growth-software platform. It is an operations company. We operate defined business functions using the appropriate mix of people, software, AI, automation and the systems the client already relies on."

## Packet D — SEO / AI discoverability

### Classification: S

### Existing positive state
`public/robots.txt` currently uses `User-agent: *` + `Allow: /` and blocks operator/private paths only. This does not currently single out or block OAI-SearchBot.

`pages/sitemap.xml.js` already:
- exposes apex public routes;
- includes `/insights`;
- dynamically adds records from `listInsightsForStaticPaths()`;
- keeps Lux sitemap separate by host.

### Required work
1. Add `/managed-growth` and `/growth-leakage-review` to apex sitemap paths.
2. Verify all four Insights appear via existing list function.
3. Verify page canonical/title/description via `buildPublicPageMeta`.
4. Add/verify structured data only where it creates real machine-readable value; do not add exotic GEO schema.
5. Ensure internal links form: homepage/services/about -> Managed Growth -> Insights -> Growth Leakage Review -> contact/discovery.
6. Verify `robots.txt` still blocks operator/private routes and does not accidentally block public managed-function content.
7. Add bounded regression tests for route/copy/metadata contracts.

## Spend-control stop conditions

Cursor must STOP and report instead of broadening if any packet appears to require:
- a new CMS;
- a new database table or schema migration;
- new Vercel project/app;
- paid SEO/content tooling;
- new analytics vendor;
- new outbound-email/WhatsApp/SMS runtime;
- new payment flow;
- changes to tenant branding/routing;
- a site-wide redesign;
- refactoring unrelated public pages;
- more than one new abstraction that is not already present.

## Recommended post-reset order

1. **Packet A — S**: four Insights records.
2. **Packet B — M**: Managed Growth + Growth Leakage Review pages.
3. Preview/visual review before narrative migration.
4. **Packet C — S–M**: homepage/About/Services/nav reconciliation.
5. **Packet D — S**: metadata/sitemap/robots/internal-link verification and tests.
6. Final preview -> Anton review -> explicit production approval -> deploy -> live validate.

Do not run packets in parallel if doing so increases Cursor generation/spend. One narrow packet at a time is preferred.