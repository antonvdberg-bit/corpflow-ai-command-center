# Website Migration Accelerator (WMA)

Status: Production Delivery v1 (docs/process only)
Canonical control issue: #1284

## Purpose
Turn an authorised public website into an evidence-backed migration and lead-conversion packet before implementation begins.

## Standard delivery path
Intake -> public-site discovery -> content extraction -> visual review -> content classification -> lead-path audit -> technical/SEO audit -> rebuild planning -> client opportunity review -> implementation packet -> preview verification -> approval -> deployment handoff.

## Required outputs
1. Site inventory
2. Page map
3. Content extraction summary
4. SEO/metadata summary
5. Lead-form/contact-path audit
6. Visual/UX issues list
7. Migration/rebuild task list
8. Proposed target site structure
9. Client-facing opportunity review
10. Implementation packet
11. Verification checklist

## Role separation
- ChatGPT: audit reasoning, classification, commercial framing, governance and review.
- Firecrawl/crawler: public evidence collection only.
- Browser/Playwright: deterministic rendered/runtime evidence.
- Cursor: implementation when available.
- Anton: client-facing, commercial and production approvals.
- GitHub: durable source of truth.

## Production doctrine
Public URL -> evidence -> audit -> commercial recommendation -> approved scope -> preview -> verify -> approve -> deploy -> validate.

## Commercial model
- Free Prospect Snapshot
- Website Migration Diagnostic: MUR 7,500-12,500
- Website Rescue: MUR 45,000+
- Product A expansion only where evidence supports it: AI Lead Rescue, ElevenLabs receptionist, ERPNext Lead/Opportunity capture.

## Hard constraints
- No production deploy without explicit approval.
- No DNS/domain, env/secrets, DB/schema changes without explicit approval.
- No private/login scraping or client private data.
- No live form submissions by default.
- No outbound email/WhatsApp/SMS runtime without explicit approval.
- No production ERPNext writes or ElevenLabs activation without explicit approval.
- No paid Firecrawl tier or paid tool without explicit approval.
- No second production app or database.
- Keep Core, CorpFlowAI business systems and client tenant surfaces separate.

## Production v1 acceptance
- canonical docs/process in repo
- machine-readable audit schema
- quality/source-attribution gates
- browser-capable desktop/mobile verification path
- bounded Firecrawl free-tier extraction test or documented deferment
- first real prospect snapshot -> diagnostic decision
- first approved preview -> verify -> approve handoff

This workflow does not itself authorise production deployment.