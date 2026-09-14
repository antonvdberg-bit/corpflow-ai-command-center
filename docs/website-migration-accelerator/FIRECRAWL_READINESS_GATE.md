# Firecrawl Readiness Gate

Status: approved in principle under #1284; not yet activated.

## Approved role
Firecrawl may be used as a **public-site evidence collector** for WMA.

It may collect:
- discovered URLs
- clean page content / Markdown
- metadata
- headings
- links
- structured extraction
- screenshots where available

It must not:
- make commercial decisions
- contact prospects
- submit forms
- access private/login content
- mutate production systems
- create a second production database/app

## Preconditions before first use
- [ ] approved public target URL
- [ ] domain allowlist defined
- [ ] page/crawl cap defined
- [ ] free-tier use only
- [ ] approved execution/API path available
- [ ] API credential stored outside chat and GitHub
- [ ] no env/secrets change unless separately approved
- [ ] output mapped to `AUDIT_SCHEMA_v0_1.json`
- [ ] source URLs retained for attribution
- [ ] robots/access restrictions respected

## First test
Use one already-approved public WMA pilot/prospect site.

Compare against the existing manually derived inventory:
- coverage gained
- operator time saved
- metadata/link completeness
- structured-output quality
- false/missing findings
- credit usage

## Pass condition
Adopt Firecrawl into standard WMA delivery only if it materially improves coverage or operator time while preserving source attribution and staying inside the free tier for normal pilot-sized sites.

## Fail/defer condition
Defer if:
- an API path would require unapproved secrets/env work;
- extraction quality is materially worse than current evidence collection;
- cost becomes meaningful before commercial demand exists;
- it creates an infrastructure-maintenance obligation.

No package installation, paid plan, production route, database, or env-var change is authorised by this document.
