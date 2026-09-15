# Firecrawl Operating Gate

Status: **ADOPTED / PRODUCTION-READY FOR BOUNDED WMA PUBLIC-SITE EXTRACTION** under #1284, #1287 and #1296.

## Approved role
Firecrawl is the WMA **public-site discovery and extraction layer**.

It may collect:
- discovered URLs;
- clean page content / Markdown;
- metadata;
- headings;
- links;
- structured extraction;
- screenshots where available.

It must not:
- make commercial decisions;
- contact prospects;
- submit forms;
- access private/login content;
- mutate production systems;
- create a second production database/app.

Playwright remains the deterministic browser/runtime verification layer. Firecrawl extraction success is not a substitute for rendered visual verification.

## Proven execution paths

### Interactive qualification / diagnostic path
Use the connected Firecrawl plugin for fast public-site discovery and targeted extraction when interactive operator/ChatGPT work is appropriate.

This path proved useful against CorpFlowAI and Explorers Mauritius, including route inventory, metadata/content extraction, legacy/duplicate route discovery and lead/contact-path analysis.

### Governed production evidence path
Use the manual WMA GitHub Actions workflow with:
- GitHub OIDC;
- dedicated WMA Infisical identity;
- WMA-scoped secret access;
- `FIRECRAWL_API_KEY` supplied at runtime by Infisical;
- bounded page cap;
- uploaded evidence artifact.

Approved WMA secret permissions are:
- **Describe Secret**;
- **Read Value**.

No Create, Modify or Remove permission is required.

## Production workload shape
A bulk concurrent `/crawl` job is not the WMA default because current Firecrawl concurrency limits can block it.

The standard WMA extraction shape is:

`map -> same-origin URL selection -> sequential scrape -> bounded 429 backoff -> evidence artifact`

This was introduced in PR #1295 after the concurrent-browser limit was observed.

## Runtime proof
WMA Firecrawl extraction run **#5** on `main` completed successfully after PR #1295, with an evidence artifact produced.

This proves the governed authentication/runtime path can complete without requiring high-concurrency bulk crawling or a paid-tier change.

## Normal run controls
- approved public HTTP/HTTPS target only;
- same-origin extraction only;
- bounded page cap (25 by default unless deliberately changed);
- no form submission;
- no login/private data;
- no production mutation;
- no paid-tier activation without explicit approval;
- retain source URLs/evidence attribution;
- keep Firecrawl output advisory/evidentiary, not autonomous commercial decision-making.

## Cost/capacity rule
Normal WMA work should remain bounded to available free/current-plan capacity while commercially sensible.

A 429/concurrency response is an operating constraint, not an automatic reason to upgrade. First reshape work through mapping, sequential extraction, lower caps and bounded retries. Any paid Firecrawl tier remains a separate operator approval.

## Adoption decision
**ADOPT.**

Firecrawl materially improves WMA discovery/extraction speed and coverage. The production architecture is intentionally small:

- Firecrawl = discovery/extraction;
- Playwright = deterministic rendered verification;
- GitHub Actions = governed repeatable run;
- Infisical = runtime secret source;
- GitHub = durable evidence and decision record.

## Reuse lesson
Future CorpFlowAI automations should follow `docs/operations/AUTOMATION_PROMOTION_STANDARD_V1.md`: prove value through the fastest safe path before investing in credential/infrastructure hardening, then productionise only the capability that has earned adoption.
