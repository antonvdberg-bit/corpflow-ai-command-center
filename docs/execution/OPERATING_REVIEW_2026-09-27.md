# Operating Review — Delivery Estate, Commercial Readiness and Capacity — 2026-09-27

**Controller:** #1351  
**Architecture controller:** #772  
**Mode:** read-only review; no production/client mutation  
**Operator instruction:** no Cursor for this cycle.

## 1. Executive conclusion

CorpFlowAI has enough operating infrastructure to deliver. The primary risk is now **work fragmentation and priority inflation**, not lack of tooling.

At review time:
- 53 open GitHub issues;
- 0 open PRs before this operating-cycle branch;
- 22 open issues labelled `priority:P0`;
- 5 open issues labelled `priority:P1`;
- 13 open issues with no update since before 2026-08-28;
- 2 open issues with no update since before 2026-07-29;
- 1 open issue labelled `dispatch:blocked` (#772).

This is too much simultaneous “priority” surface for a revenue-first delivery business. The next control improvement is not another dashboard; it is to compact the estate around client/revenue outcomes and demote/close stale execution vehicles where evidence supports it.

## 2. Application direction

#772 remains the correct product direction:
- one production application;
- one production Postgres;
- one authentication model;
- Operating Workspace and Tenant Workspace as deliberate contexts;
- external systems remain authoritative where appropriate;
- legacy/standalone routes are progressively classified CANONICAL / REUSE / MIGRATE / TEMPORARY / RETIRE.

Today's delivery templates explicitly adopt this rule. New client work should be described as an **application journey**, not a collection of pages.

## 3. Current client/demo estate

### CorpFlowAI public / Lead Rescue
**State:** SELLABLE / DELIVERY PATH EXISTS, with a public-site technical defect tracked separately.

Verified public content:
- Lead Rescue is presented at MUR 85,000 fixed;
- maximum three clients stated;
- diagnosis-first CTA;
- no public-page payment collection.

Commercial constraint: acquisition/conversion, not offer definition.

Technical constraint: corpflowai.com/core homepage stale Next.js asset 404 defect (#1349). The marketing HTML renders, but referenced build assets return 404. Repair is parked at the protected/code-action boundary.

### Café International
**State:** CLIENT REVIEW / REACTIVATION READY; do not rebuild again.

Verified:
- `https://core.corpflowai.com/demo/cafe-international` returns HTTP 200;
- page is explicitly a Website Rescue preview;
- robots are `noindex,nofollow`;
- prior Browser Verification Harness evidence is PASS.

Remaining work is client acceptance/reactivation and the retained GHL/contact/WhatsApp operating path. Treat this as a cutover/acceptance problem, not a page-building problem.

### Living Word Mauritius
**State:** STANDING / TEST TENANT / AUTH VERIFICATION REQUIRED.

Verified:
- member-update route returns HTTP 200;
- page explicitly states TEST TENANT / NOT PUBLIC;
- noindex/no-follow;
- synthetic-test-record posture.

Do not promote to public/live or interpret gated API behaviour as a generic page failure without authenticated verification.

### Business Admin Desk / CIPC Desk
**State:** NEEDS COMMERCIAL / APPLICATION CONSOLIDATION REVIEW.

Verified public/test route returns HTTP 200 and presents the company-administration proposition. Metadata remains noindex/noarchive/nofollow and includes mixed/legacy HeyGen metadata.

The business proposition is visible, but this should not continue as an independent mini-product/control plane. Future client/operator capability should migrate into #772 workspace structure. Retain public marketing only where commercially useful.

### Rare & Exclusive / Lux
**State:** LIVE SURFACE EXISTS; strategic ownership/transfer work remains separate.

Verified route returns HTTP 200 and presents the curated private-advisory proposition.

CorpFlowAI should not rebuild owner infrastructure inside Core. The agreed direction remains Jan-owned principal infrastructure with CorpFlowAI guidance. Treat any retained CorpFlowAI route as transitional/support evidence unless there is a separate approved business reason.

### AI Lead Rescue subdomain
**State:** REDUNDANT MARKETING ALIAS / CONSOLIDATION CANDIDATE.

Verified `aileadrescue.corpflowai.com` returns HTTP 200 but canonical metadata points to `https://corpflowai.com/lead-rescue`.

This is a good example of route proliferation that #772 should reduce. Keep only if it has a measured acquisition/compatibility reason; otherwise migrate/redirect/retire after verification.

### OrixHealth
**State:** QUALIFIED / DISCOVERY ACTIVE.

GitHub #1304 and current email confirm:
- pre-session questionnaire has been completed sufficiently for the next step;
- client confirmed the 2 October session;
- session should verify Zoho capability/gaps rather than repeat discovery.

No standalone demo should be built now. Next deliverable is a verified application/configuration journey and defensible quotation after the on-site review.

## 4. Revenue opportunities vs delivery capacity

### Immediate revenue-capable lane

**Lead Rescue**
- Public offer exists.
- Fixed price: MUR 85,000.
- Stated capacity: three clients.
- Delivery methodology is now standardized.
- Main gap: qualified diagnosis/prospect conversion, not product construction.

**Website Rescue**
- Proven visible delivery pattern exists via Café.
- Productization issue #654 remains open.
- Do not create another architecture programme; use the Café evidence and standardized Client Delivery Pack.

**OrixHealth**
- Real active prospect.
- Strongest current near-term custom/managed-services opportunity because client engagement and discovery are already active.
- Capacity requirement before 2 October is preparation and evidence structure, not implementation.

**Prestige**
- Proposal has been presented and client has asked for breathing room around month-end/travel.
- State: WAITING on client, not active implementation WIP.
- Do not spend build capacity until the client re-engages.

### Revenue-enabling, not client acquisition

**SBM/MPGS payment onboarding (#1334)**
- Important for payment capability but should not displace selling/delivery.
- Current email history shows SBM onboarding progressed materially and the bank has been awaiting/processing the way forward.
- Any payment activation/integration remains a protected action.
- Keep as a bounded enablement lane, not the centre of the operating day.

**ERPNext commercial rails (#551/#918)**
- Important because quotation/invoice/payment evidence should be standardized.
- Treat as enabling infrastructure to support sold work, not a reason to delay client review or quotation.

### Capacity rule

For the first 10 clients:
- no more than a small number of simultaneous implementation streams;
- WAITING clients do not consume build WIP;
- client review/cutover work outranks speculative feature work;
- every active client must have one visible next deliverable;
- no new custom platform lane while a review/quote/cutover can move revenue sooner.

## 5. GitHub estate health

### Current signal

The estate is over-labelled as urgent:
- 22 P0 issues out of 53 open issues is not a useful priority distinction.
- 13 issues are stale >30 days.
- 2 are deep-stale >60 days.

### Stale items requiring refresh/compaction

The oldest stale set includes:
- #486 Email automation design;
- #607 Gmail client-reply monitor;
- #735 Ops Health Backup indicator;
- #764 Café billing-exempt corpflow_test tenant;
- #249 Operator Bridge;
- #676 Anton Decision Inbox;
- #696 dedicated test users;
- #776 Company Master;
- #896 ordinary-delivery authorization governance;
- #948 continuous-improvement ledger;
- #1010 ERPNext WP7 closeout;
- #918 ERPNext reconciliation;
- #1013 Groq migration.

Disposition approach:
- do not close an ambiguous live obligation;
- first identify a surviving controller;
- move any current next action/evidence to that controller;
- close completed/superseded execution vehicles only when evidence is clear;
- demote governance/tooling items that are no longer genuinely P0.

### Likely consolidation themes

1. **Email automation** — #486/#607 should be reviewed against the current email-first client interaction model rather than carried as parallel generic automation projects.
2. **Café** — #764 should be reconciled into #760/#1329 if tenant provisioning is already completed/superseded.
3. **Operator/governance surfaces** — #249/#676/#896/#948 should be checked against current controllers #1262/#1264/#1351 and the one-application direction.
4. **ERPNext** — #1010/#918/#551 should be reduced to the minimum surviving commercial/production obligations.
5. **Platform migrations** — #1013 should remain P0 only if the old model/runtime is still actually present and risky.

No ambiguous issue was closed during this cycle.

## 6. Laptop / server operating model

### Verified current workstation

Remote Desktop Commander confirms:
- device `2024-LTPAvdBerg` online;
- Windows x64;
- Node.js 24.18.0;
- Python 3.14.2;
- `C:\CorpFlowAI-Work` exists with Browser/Evidence/Scripts and supporting operating folders.

Current model remains appropriate:
- laptop = build/test/control;
- server = production/live;
- GitHub = durable truth.

### Linux readiness

A Linux workstation remains viable:
- Remote Desktop Commander officially supports Linux;
- Playwright MCP extension/CDP patterns support Chrome/Chromium on Linux;
- Node/Python/Git/browser workflow is portable.

Recommendation: **do not migrate yet merely for architecture purity.**

Use a staged replacement test:
1. provision Linux candidate without changing production;
2. establish Git, browser profile, Playwright MCP, Remote Desktop Commander, GitHub/Vercel access;
3. run Browser Verification Harness equivalent;
4. prove server SSH through the approved secure path;
5. perform one complete preview/evidence workflow;
6. keep Windows laptop intact as fallback;
7. only then decide whether Linux becomes primary.

Do not make WSL a critical bridge if a native Linux machine is the intended destination.

### Server

Keep server responsibility narrow:
- production ERPNext;
- Nebula;
- Beszel;
- Uptime Kuma;
- approved live services.

Do not reintroduce OpenHands or move interactive development/runtime tooling onto the production server.

## 7. Operating decision for next cycle

Highest-value sequence:
1. prepare OrixHealth 2 October verification/quotation pack;
2. activate prospect/diagnosis conversion against the existing Lead Rescue offer;
3. reactivate Café only when client contact/acceptance can move;
4. compact stale P0/governance issues;
5. complete payment/commercial enablement only as needed to support actual sold work;
6. continue #772 consolidation through small slices, never ahead of client/revenue work.

## 8. Anton needed?

No immediate action is required for the documentation/process work.

Anton is needed only when:
- #1349 reaches an exact production repair action;
- client acceptance/cutover is ready;
- payment activation/integration is ready;
- external communication/send is required;
- a real commercial/quote decision needs approval;
- Linux cutover (not evaluation) is proposed.
