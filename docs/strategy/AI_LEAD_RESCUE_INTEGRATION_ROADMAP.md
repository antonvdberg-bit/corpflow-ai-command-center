# AI Lead Rescue — Integration Roadmap

**Audience:** Anton (project manager) and any operator deciding what to build, what to buy, what to defer, and what to refuse for AI Lead Rescue.

**Status:** Strategy roadmap. Docs-only. **No build authorisation.** A roadmap entry being listed below does NOT mean it has been authorised — each future build requires its own packet under `docs/execution/` and explicit Anton DECISION per `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`.

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_INTEGRATION_ROADMAP_V1 -->`

<!-- AI_LEAD_RESCUE_INTEGRATION_ROADMAP_V1 -->

## What this doc is for

A **decision lens** for capacity allocation: when a prospect or operator asks *"why don't you connect X?"* or *"can you build Y?"*, this roadmap shows whether X / Y is **First-pilot scope**, **Manual-first**, **Quick add-on**, **Custom build candidate**, or explicitly **Not now**, with reasons.

The roadmap is bounded by:

- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — strategic guardrail (managed workflows above the line; generic AI as fuel below).
- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 13 *What NOT to build yet* — the doctrine line on capacity allocation before 4 paying pilots are running cleanly.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — security-sensitive triggers.

The doctrine line is: **first 4 paying pilots before any expansion build.** Nothing below the *First pilot* and *Manual-first* sections may proceed to production without that proof, with the explicit Anton DECISION ladder defined in `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` § 3.

## How to read this roadmap

Each bucket below answers a different question.

| Bucket | The question it answers | Authorisation status |
|---|---|---|
| **First pilot** | What ships in the USD 150 / 48-hour / 7-day scope? | Already in scope, no further authorisation needed. |
| **Manual-first** | What is delivered by hand during the pilot window? | Already in scope, manual. Stays manual until ≥ 4 paying pilots proven. |
| **Quick add-on** | What could be added inside ~1 week of operator effort for a paying pilot that asks? | Each one requires a separate packet + Anton DECISION before build starts. |
| **Custom build** | What could be quoted as a separately-paid engagement? | Each one requires a paid-discovery packet, a security review where relevant, and Anton DECISION before build starts. |
| **Not now** | What is explicitly held off the roadmap, even when a prospect asks? | Forbidden by doctrine in the first-paid-pilots window. |
| **Compliance / security review required** | What categories trigger an automatic security/privacy review *before* any of the above buckets applies? | Mandatory gate (`docs/operations/SECURITY_REVIEW_CHECKLIST.md`). |

## First pilot (already in scope)

These ship inside the standard USD 150 / 48-hour pilot. No further authorisation needed for the operator to deliver them on a paying pilot.

| Item | Source of truth |
|---|---|
| Public intake form at `https://corpflowai.com/lead-rescue` | Live production; intake handler emits `corpflow.lead_rescue.intake_received` automation event. |
| Operator-side Telegram alert per new intake | `docs/n8n/automation-forward-recipe.md` § 1 + operator's existing Telegram bot routing. |
| Google Sheet lead log (Tab 1 *Leads*, Tab 2 *Activity*) | `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 5. |
| Buyer-side daily summary (WhatsApp + email, manually composed) | `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 6. |
| Operator follow-up board (5 statuses on the buyer Sheet) | Pilot-onboarding § 5 Tab 1 `current_status` column. |
| Operator cockpit Activity Log per lead | `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § *How to use the activity log* + § *Activity log lifecycle scope*. |
| Manual pro-forma invoice path (USD 150 / MUR equivalent) | `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` § 5. SBM wire is the warm-network primary route. |
| 13-item Setup Checklist on `/admin/lead-rescue/[id]` | `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` § *How to use the setup checklist*. |
| 7-day monitoring window | Pilot-onboarding § 11 *48-hour setup definition of done* + § 12 *End-of-pilot recap*. |

## Manual-first integrations (in scope, manual)

These are part of every pilot but are **deliberately manual** until at least 4 paying pilots have run end-to-end (`docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 8). Automation comes after the operator has felt the manual workflow's pain points 4× and knows what to automate first.

| Item | Why manual now | Trigger to revisit |
|---|---|---|
| WhatsApp follow-up tracking | Operator paraphrases each reply into a `prospect_replied` Activity Log entry. No bulk-send, no auto-reply. | ≥ 4 paying pilots completed with consistent WhatsApp follow-up patterns. |
| Facebook / Instagram DM follow-up | Operator monitors Meta Business Suite or buyer forwards new DMs by email. | Same trigger as above. |
| Email enquiry capture | Operator subscribes to a forward of the buyer's enquiry inbox for the pilot week; manually mirrors enquiries into the Sheet. | Same. |
| Multilingual summary drafting (English / French / Creole) | Operator uses translation tools internally; reviews every non-English summary before sending. **No customer-facing automated replies in any language.** | After 4 paying pilots, review the proportion of non-English pilots and decide whether to templatise. |
| Client website contact form forwarding | Operator adds operator-side email as a recipient on the buyer's existing form-handler. | Quick add-on path below — when a paying pilot asks for an embed widget. |
| Operator-composed daily summary | Operator writes from the Sheet per pilot per day. | Same — codify a template after 4 pilots. |
| Buyer-side Sheet creation | Operator clones from a template per pilot. | Codify into a Sheet generator after 4 pilots. |

These stay manual. The discipline is intentional: automating a workflow you don't yet understand produces a fragile system. The first 4 pilots are the *learning loop*, not the *automation loop*.

## Quick add-ons (feasible in ~1 week if a paying pilot asks)

Each of these could be added inside ~1 week of operator effort, separately scoped per paying pilot. **Not standard pilot scope.** Each requires a separate packet + Anton DECISION before build starts.

| Item | Scope sketch | Anti-doctrine guardrail |
|---|---|---|
| Client-website embed / intake form | A small JS / iframe widget the buyer adds to their site, posting into the AI Lead Rescue intake. | Must respect single-offer rule; widget routes to `https://corpflowai.com/lead-rescue` or a tenant-branded variant, not a fragmented one-off intake. |
| Simple email parser | A scheduled job that reads a forwarded enquiry-mailbox and mirrors into the Sheet (regex / template-based, not LLM-based). | No client-facing auto-reply. Operator reviews every parsed row. |
| Telegram alert refinements (channel routing, custom alert formats per pilot) | Adds buyer-specific alert routing / formatting rules on the operator-side Telegram bot. | No buyer-side Telegram surface by default — operator-side only (pilot-onboarding § 4). |
| Google Sheet dashboard refinements | Sheet-side formula / Apps Script enhancements (response-time histogram, weekly recap tab, conditional formatting on the follow-up board). | Apps Script stays Sheet-side, not a separate runtime. Does not store PII beyond what the Sheet already holds. |
| Tenant-branded landing page variant | A tenant-branded variant of `/lead-rescue` for a specific buyer (different brand wordmark, same offer). | Single-offer rule still applies; tenant brand follows `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md`. |
| Concierge / routing chatbot on apex | Narrow apex-only chatbot that helps prospects find the right page / asks two routing questions before the intake form. | NEVER the strategic moat. NEVER unattended on client-facing surfaces. Per above-the-line doctrine § *Immediate implication* 6. |
| Buyer-side Telegram bot (opt-in) | For a buyer who specifically wants Telegram instead of WhatsApp / email. | Opt-in only; default remains WhatsApp + email. |
| Templated multilingual summary (English / French) | A French-summary template the operator personalises per pilot. | Operator-reviewed before send; not auto-translated. Creole stays draft-only. |

The bar for quick-add-on work: a **paying pilot must ask**, and the work must be done inside ~1 week. If estimated effort exceeds ~1 week, it's a custom build instead.

## Custom build candidates (separately-paid engagements)

Multi-week engagements, separately quoted, with a paid discovery phase first per `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` § *Immediate implication* 5 and `docs/strategy/GOOGLE_ACCELERATION_LANE.md` § Day 6. Each requires its own packet + security review where relevant + Anton DECISION before build starts.

| Item | Scope sketch | Required guardrails before quoting |
|---|---|---|
| **WhatsApp Cloud API integration** | Full Meta WhatsApp Business Platform integration — verified business, phone number, message templates, BSP relationship or direct Cloud API onboarding. | Meta verification timeline (often weeks), template approval, opt-in compliance, separate cost-of-service model. Cannot be a flat USD 150 pilot. |
| **SMS provider integration** | SMS gateway (Twilio / Vonage / local Mauritius provider), phone number provisioning, opt-in / unsubscribe compliance, per-message cost passed through. | Per-message billable; opt-in compliance (esp. MU / EU / US); UI for opt-out. |
| **Android forwarding app** | A small Android app that forwards SMS / call notifications / WhatsApp notifications from the buyer's owner-phone to the operator's intake system. | Privacy: explicit written owner consent for personal-phone notification forwarding. Permissions: Google Play notification-listener / accessibility restrictions; sideload may be required. Reliability: background-process kill behaviour varies by manufacturer; maintenance burden across Android version changes. Separate security/privacy review per `docs/operations/SECURITY_REVIEW_CHECKLIST.md`. |
| **Client-specific CRM integration** | A one-off integration with a buyer's existing CRM (HubSpot / Salesforce / Pipedrive / Frappe CRM / Zoho / proprietary). | Field-mapping discovery; sandbox testing; security review (CRM API tokens never logged); never positioned as a CRM replacement. |
| **Secure bank-statement automation** | Bank-statement → ERP automation, document-to-ERP workflows, finance / admin exception queues. Per `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` § *Secure Workflow Automation*. | Mandatory paid discovery (per Google Acceleration Lane § Day 6). Risk map + data-flow diagram + feasibility checklist + paid discovery scope. Real bank data NEVER goes through Google tools. Architecture stays CorpFlowAI-controlled (Postgres + n8n + ERPNext where applicable). |
| **Property listing workflow** | Viewing-scheduling visibility, owner reporting, multi-listing pipeline view. Per above-the-line doctrine § *Strategic product lines* 1. | Property niche only; not a generic CRM rebuild. |
| **Clinic admin workflow** | Appointment-enquiry follow-up + admin visibility. **Never** medical advice / clinical triage / patient-record handling. | Security/privacy review per `docs/operations/SECURITY_REVIEW_CHECKLIST.md`. Every output explicit: *"new-enquiry response, not patient records or medical data"*. |
| **Targeted warm-outreach support (operator-coached, manual)** | Operator-coached outreach tooling for a paying buyer's own warm-network outreach — never bulk-spam. | Hand-personalised only; no bulk-send tools; no scraped lists. |
| **Managed paid-acquisition service** | Buyer hires CorpFlowAI to manage their paid acquisition (Meta / Google / LinkedIn ads). Per above-the-line § *Strategic product lines* 1 (managed lead / growth ops). | NEVER quoted as part of AI Lead Rescue pilot. Separate offer. Never revenue-guaranteed. |
| **Owner-phone forwarder app (variant of Android app above for iOS)** | Same shape, iOS-specific permissions and App Store restrictions; likely harder than Android. | Same privacy / permissions / reliability bar as Android, plus App Store review. |
| **Google Business Profile API direct ingest** | GBP message API ingestion into the daily lead list. | API availability varies by region; verify per buyer. |
| **Meta Messenger / Instagram Platform integration** | Direct Meta Messenger / Instagram API integration (not Business Suite forwarding). | App-review process via Meta; verification timeline weeks; opt-in / no-auto-reply discipline. |
| **Facebook Lead Ads API direct ingest** | Lead Ads → daily lead list direct ingest. | Buyer's Meta account access; opt-in / data-handling per Meta's Lead Ads terms. We do NOT run the ads on the buyer's behalf as part of this. |
| **Real-time follow-up board view** | A buyer-side live dashboard (browser) replacing or augmenting the Sheet. | NEVER positioned as a CRM. Read-only by default; minimal feature surface; deliberately not a CRM rebuild. |
| **Quote-pipeline visibility (contractor niche)** | Quote-pipeline view that surfaces quote-stage transitions for contractor businesses. | Contractor niche only; not a CRM. |

## Not now (explicitly held)

These are forbidden by doctrine in the first-paid-pilots window. **Even if a prospect asks**, the operator declines politely and refers to the doctrine line.

| Item | Doctrine source | Operator line on the call |
|---|---|---|
| Bulk email engine | `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 13 — *"forbidden by doctrine; warm-network only"*. | *"We don't run bulk outbound. The pilot is for enquiries that are coming in to you. If you need cold-bulk outreach, we're not the right partner."* |
| Paid ad automation | `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 13 — *"forbidden as default by THIS PR"*. | *"We don't run your paid ads. The pilot consumes enquiries you already generate."* |
| Full CRM rebuild | `docs/strategy/CORPFLOWAI_CRM_REUSE_AUDIT_V1.md` — NO-GO. | *"We are not a CRM. The pilot sits alongside whatever CRM you have or don't have."* |
| Frappe CRM install (as part of AI Lead Rescue scope) | `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 13 — *"DEFER — 30-day pilot candidate, not first-paid-pilots layer"*. | *"That's a separate engagement. Not part of the pilot."* |
| Twenty CRM install | CRM Reuse Audit — NO-GO. | Same. |
| Generic chatbot platform | `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` § *Below the line* — *"Generic AI chatbot"* is below the line. | *"This is not a chatbot. AI Lead Rescue is a managed lead-response operating workflow."* |
| Unattended AI replies to clients | Above-the-line doctrine — managed workflow with human review; not unattended AI. | *"We don't auto-reply to your customers. Customer-facing replies stay with you."* |
| Scraping contacts at scale | `docs/sales/AI_LEAD_RESCUE_PROSPECT_LIST_TEMPLATE.md` § 4 — forbidden sources. | *"We don't scrape contacts. The pilot is warm-network only at this stage."* |
| Self-serve Stripe / card-on-page checkout | `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 13 — *"held; manual pro-forma is the canonical payment path until the doctrine changes via a separate JOURNAL row"*. | *"No card on the public page. Manual pro-forma after we review your intake. That's by design."* |
| Multi-tenant CRM rebuild | CRM Reuse Audit. | *"Out of scope."* |
| Second productized service line (restaurant marketing, etc.) | `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` § 13 — *"held until pilot wedge is proven"*. | *"Different offer; not part of AI Lead Rescue. Talk to us about it separately."* |

The trigger to **revisit** any *Not now* item: **at least 4 paying AI Lead Rescue pilots running cleanly** (per § 1 of the First-Paid-Pilots playbook). Revisit is via a separate JOURNAL row and a separate authorisation packet — **not** a chat-based decision.

## Compliance / security review required (mandatory gate)

The following categories trigger an **automatic** security / privacy review per `docs/operations/SECURITY_REVIEW_CHECKLIST.md` **before** any of the above buckets applies. Even a *quick add-on* shape gets stopped here if it touches one of these categories.

| Category | Why it triggers a review |
|---|---|
| **Medical / health enquiries** | Patient data, clinical decision adjacency, regional health-data regulations. AI Lead Rescue scope for clinics is *appointment-enquiry follow-up only*; anything beyond that requires review. |
| **Financial data** | Bank statements, transaction records, accounting data. Strategy-doctrine *Secure Workflow Automation* product line — paid discovery + review required before build. |
| **Bank statements** | Subcategory of financial data; sensitivity warrants its own review. Google AI tools NEVER touch real bank data per `docs/strategy/GOOGLE_ACCELERATION_LANE.md` § *Data safety rules*. |
| **Minors / children data** | Higher-than-default protection bar in most jurisdictions; explicit guardian-consent flows required. |
| **Regulated industries** | Legal practice, accounting practice, financial advice, healthcare, gambling, defence-adjacent. Each carries its own regulatory regime; review confirms which apply. |
| **Customer PII beyond basic lead contact info** | National ID / passport / NIC / NID, salary / payroll, health information, full address + ID combinations, biometric data. The first-pilot Sheet design (`docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` § 5) **deliberately excludes** all of these from buyer-shared surfaces. |

Review process (summary; canonical version in `docs/operations/SECURITY_REVIEW_CHECKLIST.md`):

1. Identify the data category at proposal time.
2. Document the data flow on a one-page risk map (data in / data at rest / data out / audit trail).
3. Confirm CorpFlowAI architecture (Postgres / n8n / ERPNext / CorpFlowAI app) handles it without Google tools touching real data.
4. Confirm authentication, authorisation, audit-trail discipline (tenant isolation server-side; no secrets in client; webhook HMAC; parameterized SQL).
5. Authorise via separate packet + Anton DECISION before build starts.

If the review surfaces any unresolved risk, the engagement is declined or scoped down to remove the risk. **Never** proceed with an unreviewed regulated-data flow.

## How to use this roadmap on a prospect call

1. Prospect asks for X.
2. Find X in the buckets above.
3. If **First pilot** or **Manual-first** — yes, we deliver it inside the pilot.
4. If **Quick add-on** — *"feasible as a paid add-on after the pilot lands; let me come back with a 1-business-day quote"*.
5. If **Custom build** — *"feasible as a separate engagement; we start with a paid discovery to scope it properly"*.
6. If **Not now** — politely decline; refer to the doctrine line; do not invent a workaround.
7. If the request touches **Compliance / security review** — *"this touches regulated data; let me come back tomorrow with the review path before I quote anything"*.

If the prospect asks something not in the matrix, **do not invent an answer**. Log the gap and revisit the roadmap in a follow-up docs PR.

## Roadmap maintenance

This roadmap is maintained in this repo and refreshed on each AI Lead Rescue strategic event:

- Every paying pilot completed → review the `Manual-first` bucket for automation candidates.
- Every prospect-asked-for capability that wasn't in the matrix → add a row (in the right bucket) in a follow-up PR.
- Every doctrine change in the above-the-line doctrine → review every bucket.
- After **4 paying pilots**, the *Not now* bucket is reviewed in full and a separate JOURNAL row decides which items can move to *Quick add-on* / *Custom build*.

## Cross-references

- `docs/strategy/ABOVE_THE_LINE_STRATEGY_DOCTRINE.md` — strategic guardrail.
- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — Google AI tools as fuel; data-safety rules.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — single-offer rule, allowed claims.
- `docs/marketing/AI_LEAD_RESCUE_FIRST_PAID_PILOTS.md` — § 13 *What NOT to build yet*.
- `docs/sales/AI_LEAD_RESCUE_CAPABILITY_MATRIX.md` — per-capability decision guide (companion).
- `docs/sales/AI_LEAD_RESCUE_PROSPECT_QA.md` — prospect Q&A guide.
- `docs/sales/AI_LEAD_RESCUE_PRICING_GUIDE.md` — pricing detail + custom-quote rules.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` — operator cockpit + Activity log lifecycle scope.
- `docs/operations/AI_LEAD_RESCUE_PAID_PILOT_ONBOARDING.md` — paid-pilot intake checklist.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md` — security review triggers (mandatory).
- `docs/strategy/CORPFLOWAI_CRM_REUSE_AUDIT_V1.md` — CRM decision (NO-GO / DEFER).
- `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` — what may run without further approval, what must stop and ask.
- `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md` — packet shape required for new builds.
