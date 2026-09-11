# Managed Functions — source-path audit and exact changeset v1

**Status:** PREPARED / docs-only  
**Source issue:** #1274  
**Prepared:** 2026-09-11

## Confirmed existing implementation surface

### Shared market copy/navigation/meta
`lib/public/corpflow-public-market.js`

Relevant existing exports:
- `CORPflow_PUBLIC_NAV`
- `CORPflow_HOMEPAGE_HERO`
- `CORPflow_BUYER_FIT`
- `buildPublicPageMeta()`

Current nav is Lead Rescue / Website Rescue / About / Contact. Managed Growth should be added deliberately without creating a large mega-menu.

### Apex homepage
`components/CorpFlowPublicHome.js`

Current composition already uses reusable primitives:
- `CorpFlowPublicPhotoShell`
- `PublicHero`
- `OutcomeSection`
- `PublicCtaBand`
- `PublicTrustBand`

This confirms that Managed Functions work should be a content/composition change, not a page-system rebuild.

### About
`pages/about.js`

Confirmed contradictions / stale positioning:
- metadata says CorpFlowAI helps selected owner-led businesses recover quiet enquiries and Lead Rescue is the current commercial focus;
- lead paragraph describes CorpFlowAI mainly through quiet-enquiry recovery;
- operating principle says "Bounded engagements, not platforms" and hardcodes Lead Rescue as the live commercial offer;
- founder note says "CorpFlowAI is not a growth platform. It is an operations company."

Keep the operations-company distinction; remove the implication that Managed Growth is inconsistent with it.

### Services
`pages/services.js`

Current page positions services primarily as:
- Lead Rescue;
- workflow setup/handover;
- optional monitoring.

This should become the smallest useful public map of managed functions, while retaining Lead Rescue as the current concrete commercial wedge.

### Insights repository source
`lib/public/insights-content.js`

Existing design is already the desired low-cost architecture:
- records live in Git;
- no database;
- no CMS;
- no remote content dependency;
- records include slug/title/summary/date/category/author/hero/status/SEO/offer/CTA/body.

### Insights index
`pages/insights/index.js`

Existing index renders `listPublishedInsights()` and therefore requires no new listing logic for new records.

### Insights article route
`pages/insights/[slug].js`

Existing renderer:
- builds metadata with `buildPublicPageMeta()`;
- supports canonical URLs;
- noindexes draft records;
- renders title/date/author/body;
- includes a next-step CTA;
- gets static paths from `INSIGHTS`.

No new article renderer should be built.

### Robots
`public/robots.txt`

Current state:
- `User-agent: *`
- `Allow: /`
- blocks operator/admin/private paths;
- advertises apex + Lux sitemaps.

No new robots architecture needed. Only verify the new public routes remain allowed.

### Sitemap
`pages/sitemap.xml.js`

Current state:
- host-aware apex vs Lux separation;
- apex static path list already includes `/insights`;
- individual Insight routes are generated from `listInsightsForStaticPaths()`.

Implementation implication:
- add only `/managed-growth` and `/growth-leakage-review` to `APEX_PATHS`;
- four new Insight records should flow automatically into sitemap output.

## Exact minimum runtime changes

### New files — expected
1. `pages/managed-growth.js`
2. `pages/growth-leakage-review.js`

### Existing files — expected edits
1. `lib/public/insights-content.js`
   - add four new article records;
   - use draft/published lifecycle appropriately;
   - optionally add a reusable Growth Leakage CTA constant if this reduces duplication without over-abstracting.

2. `lib/public/corpflow-public-market.js`
   - add Managed Growth to public navigation or replace one lower-priority item based on visual fit;
   - update homepage hero shared copy only if homepage composition continues to consume that export;
   - broaden `CORPflow_BUYER_FIT` away from Mauritius-only if public international posture is being activated at the same time.

3. `components/CorpFlowPublicHome.js`
   - make company-level proposition visible without erasing Lead Rescue current-offer block;
   - add path to Managed Growth / Growth Leakage Review;
   - preserve existing flagship video and current Lead Rescue offer section until separately superseded.

4. `pages/about.js`
   - replace stale company-definition paragraphs;
   - preserve legal/merchant identity and customer-service blocks unchanged.

5. `pages/services.js`
   - expose four managed-function families at overview level;
   - make Managed Growth first and concrete;
   - retain Lead Rescue as a current wedge / specific engagement;
   - do not imply Finance/Operations/Intelligence functions are already fully productized if they are not.

6. `pages/insights/index.js`
   - likely copy-only update to broaden the index heading/description from lead response/workflow notes to managed business functions;
   - no change to data flow.

7. `pages/insights/[slug].js`
   - preferably no structural change;
   - only adjust generic CTA copy if needed to support Growth Leakage Review consistently.

8. `pages/sitemap.xml.js`
   - add `/managed-growth` and `/growth-leakage-review` to `APEX_PATHS`.

### Tests — expected new/updated coverage
Use existing node-test patterns. Add only bounded assertions covering:
- Managed Growth route renders expected H1 / CTA;
- Growth Leakage Review route renders expected H1 / CTA and no payment collection claim;
- four Insight slugs exist and are available through the existing content API;
- sitemap contains two new static paths and new Insight paths;
- public nav has the chosen Managed Growth entry;
- About no longer contains the stale `CorpFlowAI is not a growth platform` sentence;
- no guaranteed-revenue language;
- Lead Rescue route / price / CTA contract remains unchanged unless a separately authorized commercial change is made.

## Copy migration rule

Do not replace every occurrence of Lead Rescue. Distinguish:

**Company-level copy** -> managed business functions / Managed Growth.

**Current-offer copy** -> Lead Rescue stays where it accurately describes the current paid wedge.

This prevents the common failure mode where a strategic repositioning accidentally removes the only concrete thing a buyer can currently buy.

## International posture rule

Company-level proposition should be international by default.

Do not silently remove Mauritius-specific commercial terms from the current Lead Rescue offer. International payment/contract rails are a separate commercial activation gate.

Correct distinction:
- **Discoverability / content:** international now.
- **Current specific Mauritius offer:** preserve accurate local terms until separately changed.
- **International paid activation:** only after payment/commercial controls are approved.

## Explicit no-touch surfaces

Do not touch in this sprint:
- `/change` or operator surfaces;
- `/admin/*`;
- factory routes;
- Core runtime/auth;
- Lux/Concierge/France tenant brand surfaces;
- payment callbacks;
- DB/schema;
- env/secrets;
- email/WhatsApp/SMS send runtime;
- ERPNext.

## Expected reviewable diff size

A well-controlled implementation should remain approximately:
- 2 new public page files;
- 6–8 small existing-file edits;
- 1–3 bounded test files.

If Cursor proposes materially more surface area, stop and re-evaluate before proceeding.