# CorpFlowAI SEO + AI Discoverability Plan v1

**Status:** Docs-only implementation specification.
**Source issue:** #1274
**Purpose:** Make CorpFlowAI's managed-business-function proposition easy for buyers, search engines and AI systems to understand without building speculative SEO infrastructure.

## 1. Principle

Do not optimize for algorithms before optimizing for clarity.

CorpFlowAI should publish original, useful, operational content that answers concrete business questions and clearly connects those answers to the managed functions CorpFlowAI operates.

The goal is not to produce large volumes of keyword pages. The goal is to create a compact body of authoritative material around:
- managed business functions;
- Managed Growth;
- lead/enquiry follow-up;
- customer retention and expansion;
- finance operations;
- business operations;
- management intelligence.

## 2. Current external guidance checked 2026-09-10

### Google Search

Google's 2026 Search Central guidance for generative AI features says established SEO best practices remain relevant and emphasizes useful, non-commodity content rather than content produced merely to target generative search.

Implementation implication:
- no separate “GEO platform” is required;
- prioritize crawlability, useful content, structured site architecture, original expertise and normal technical SEO.

### OpenAI / ChatGPT search

OpenAI's current publisher guidance says public websites can appear in ChatGPT search. For content to be discoverable for summaries/snippets/citations, publishers should not block `OAI-SearchBot`.

Implementation implication:
- verify `robots.txt` does not block OAI-SearchBot;
- ensure CDN/WAF/bot controls do not unintentionally reject it;
- public pages should return usable HTML and not require login;
- referral traffic from ChatGPT can be tracked in analytics where available.

Training and search crawling are separate considerations. A future policy decision can treat GPTBot independently from OAI-SearchBot.

### Microsoft / Bing / Copilot

Bing Webmaster Tools introduced AI Performance reporting in 2026 showing publisher citations in Copilot and Bing AI-generated experiences.

Implementation implication:
- verify Bing indexing / Webmaster Tools when convenient;
- use native/free AI citation reporting rather than buying a third-party monitoring product initially.

## 3. First content cluster

### Pillar page

**Managed Growth**

Proposed route:
`/managed-growth`

Primary intent:
Explain the full Find → Attract → Capture → Nurture → Convert → Retain → Expand → Recover operating function and route qualified buyers to a Growth Leakage Review.

### Supporting articles

1. `/insights/what-is-a-managed-business-function`
2. `/insights/managed-growth-for-smes`
3. `/insights/lead-generation-is-not-enough`
4. `/insights/revenue-lost-through-poor-follow-up`

## 4. Page-level metadata

### Managed Growth

**Title:** Managed Growth for SMEs | CorpFlowAI

**Meta description:** CorpFlowAI operates the growth function across prospecting, content, advertising, enquiry capture, nurturing, follow-up, retention, expansion and recovery.

**Canonical:** self-referencing production URL.

**Primary CTA:** Request a Growth Leakage Review

### What Is a Managed Business Function?

**Title:** What Is a Managed Business Function? | CorpFlowAI

**Meta description:** Learn how managed business functions give SMEs reliable growth, finance and operating capability without building a specialist department for every job.

### Managed Growth for SMEs

**Title:** Managed Growth for SMEs | CorpFlowAI

**Meta description:** Managed Growth connects prospecting, content, advertising, lead capture, nurturing, follow-up, retention and customer expansion into one operated business function.

### Lead Generation Is Not Enough

**Title:** Lead Generation Is Not Enough | CorpFlowAI

**Meta description:** Leads only matter if someone owns what happens next. Connect enquiry capture, qualification, follow-up, escalation and evidence into one managed process.

### Revenue Lost Through Poor Follow-Up

**Title:** How Much Revenue Are You Losing Through Poor Follow-Up? | CorpFlowAI

**Meta description:** Missed enquiries, stale quotes, cancellations and dormant customers can create hidden revenue leakage. Find the leak before buying more leads.

## 5. Information architecture and internal links

### Homepage

Must establish company-level category:
**Enterprise-grade business functions, operated for SMEs.**

Homepage should link prominently to:
- Managed Growth;
- Lead Rescue / current live revenue offer where still commercially active;
- Insights.

Do not make all four managed-function families equally deep at launch.

### Managed Growth page

Links to:
- all four flagship articles;
- Lead Rescue as a specific function/example;
- Growth Leakage Review CTA.

### Article 1 — Managed Business Function

Links to:
- Managed Growth;
- future Managed Finance Operations overview;
- future Managed Business Operations overview;
- future Management Intelligence overview;
- Growth Leakage Review.

### Article 2 — Managed Growth

Links to:
- Managed Growth pillar;
- Article 3;
- Article 4;
- Growth Leakage Review.

### Article 3 — Lead Generation Is Not Enough

Links to:
- Lead Rescue;
- Article 4;
- Managed Growth;
- Growth Leakage Review.

### Article 4 — Revenue Lost Through Poor Follow-Up

Links to:
- Lead Rescue / enquiry recovery where still valid;
- Managed Growth;
- Growth Leakage Review.

### Lead Rescue

Add a light contextual link back to Managed Growth:
“Lead Rescue is one managed-growth function. See the broader Managed Growth model.”

Do not weaken its single-offer conversion page with a large multi-service menu.

## 6. Structured data

Use only schema that truthfully matches visible page content.

Recommended candidates:
- `Organization` on appropriate site-wide/home context;
- `Article` for Insight articles;
- `Service` for Managed Growth if the public page clearly represents a service;
- `BreadcrumbList` where breadcrumbs exist visibly or semantically.

Do not invent ratings, reviews, prices, FAQs or business facts solely for schema.

Structured data is supporting metadata, not a substitute for visible useful content.

## 7. Article implementation requirements

Every article should include:
- one clear H1;
- short summary/standfirst;
- author or responsible organization;
- publication date;
- last-updated date when materially revised;
- semantic headings;
- readable body HTML;
- descriptive title and meta description;
- canonical URL;
- internal links;
- relevant CTA;
- article structured data where valid;
- social/Open Graph metadata using current CorpFlowAI brand asset strategy.

Do not hide primary article content behind JavaScript-only interactions.

## 8. Video discoverability

For each embedded video:
- provide a useful visible title;
- include supporting text explaining the concept;
- provide captions;
- publish a transcript or meaningful written companion where practical;
- use accurate poster/thumbnail metadata;
- link to the deeper article or service page;
- avoid publishing a video as an isolated media object with no context.

## 9. robots.txt and crawler policy

Audit first. Change only if needed.

Required checks:
- Googlebot not accidentally blocked from public marketing/Insights routes;
- Bingbot not accidentally blocked;
- `OAI-SearchBot` not blocked if CorpFlowAI wants ChatGPT-search discoverability;
- no broad `Disallow: /` or auth/WAF behavior affecting public pages;
- internal/admin/client-private routes remain protected through proper application/auth design rather than relying solely on crawler directives.

Search discoverability and model-training policy should not be conflated. A separate operator policy can decide whether GPTBot is allowed.

## 10. sitemap

Ensure the public sitemap includes:
- homepage;
- Managed Growth;
- Insights index if public;
- each published flagship article;
- current public commercial/service pages intended for indexing.

Exclude:
- admin/operator routes;
- private tenant material;
- preview URLs;
- duplicate/legacy redirect sources;
- transactional callback routes.

Use accurate `lastmod` only when the implementation can maintain it truthfully.

## 11. Search Console / Webmaster measurement

Use free/native measurement first.

### Google Search Console

Track:
- indexing state;
- search queries;
- impressions;
- clicks;
- country/device patterns;
- page performance;
- crawl/index problems.

### Bing Webmaster Tools

Track:
- indexation/crawl issues;
- search performance;
- AI Performance citations where available.

### Existing analytics

If already configured, distinguish traffic to:
- Managed Growth;
- each article;
- Growth Leakage Review CTA;
- Lead Rescue;
- referral sources including AI/search traffic where available.

Do not add a paid analytics/SEO platform for this initial sprint.

## 12. AI-discoverability content pattern

Pages should make claims explicit enough to extract correctly.

Prefer clear sentences such as:
- “CorpFlowAI operates managed business functions for SMEs.”
- “Managed Growth covers Find, Attract, Capture, Nurture, Convert, Retain, Expand and Recover.”
- “Lead Rescue is one specific managed-growth function.”

Avoid forcing crawlers or humans to infer the category from vague marketing language.

Useful article sections should answer direct questions:
- What is it?
- Who is it for?
- What does it do?
- What does it not do?
- What systems are involved?
- What remains human-controlled?
- How is success measured?

## 13. Country and vertical strategy

International content is the default.

Create local/vertical pages only when the page contains genuinely distinct value, for example:
- local regulatory/commercial context;
- industry-specific workflow;
- unique system/integration reality;
- specific buyer problem;
- local payment/onboarding constraint.

Do not clone the same article for Mauritius, South Africa, UK, Australia and other markets merely by swapping country names.

## 14. Content cadence

Initial target:
- publish pillar + four flagship pieces;
- then add one genuinely useful piece per commercial problem/insight, not an arbitrary weekly quota.

Possible next topics:
- “When should an SME outsource marketing instead of hiring a team?”
- “Marketing automation vs managed growth: what is the difference?”
- “Why existing customers may be the cheapest place to look for growth”
- “How to design authority limits for outsourced business functions”
- “What should an SME owner actually receive in a weekly operating report?”
- “Managed debtors: what should the function actually do?”

## 15. Technical audit checklist for implementation agent

Before changing runtime, report current state for:
- public page framework/routes;
- current Insights mechanism;
- `robots.txt`;
- sitemap implementation;
- metadata/head helper;
- canonical implementation;
- schema/JSON-LD support;
- analytics tags already present;
- Search Console verification references if visible in code (do not expose credentials);
- public-site rendering mode;
- existing reusable photo/glass shell/assets.

Then make only the changes required for the approved pages.

## 16. Acceptance checks

Preview must prove:
- all new pages return 200;
- no accidental `noindex`;
- unique title/description;
- self-canonical where appropriate;
- internal links are valid;
- CTA path works;
- article body is visible without client-side failure;
- sitemap contains intended pages;
- robots permits intended crawlers;
- no operator/admin/tenant route is exposed or altered;
- mobile/desktop visual QA passes;
- no paid tool or new infrastructure added.

## 17. Source references used for this implementation specification

External sources were checked on 2026-09-10:
- Google Search Central updates/generative AI optimization guidance;
- OpenAI Publishers and Developers FAQ for OAI-SearchBot and ChatGPT search eligibility;
- Bing Webmaster Blog announcement of AI Performance reporting.

These sources support implementation posture only; they should not be copied into buyer-facing marketing as claims.