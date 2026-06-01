# AI Lead Rescue - Mauritius launch readiness inventory

**Status:** Inspection-only inventory. **Docs-only.** No runtime code, public page copy, payment configuration, ERPNext production setting, env var, secret, DNS record, Vercel config, GitHub setting, or DB schema is changed by this document. The current live `/lead-rescue` page wording is preserved as-is per `JE-2026-05-28-1` + `JE-2026-05-28-3`.

**Anchor sentinel:** `<!-- AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS_2026_06_01 -->`

<!-- AI_LEAD_RESCUE_MAURITIUS_LAUNCH_READINESS_2026_06_01 -->

**Author:** Cursor (assistant), under Anton's direct authorisation on Operator Bridge [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249). **Audience:** Anton (project manager / operator), preparing to send AI Lead Rescue outreach into Mauritius by Friday. Plain language, no jargon. Live verification was run from this workstation against `https://corpflowai.com` and `https://aileadrescue.corpflowai.com` on 2026-06-01.

## 0. One-paragraph executive summary

You can send Mauritius outreach on Friday using **only existing assets**. The `/lead-rescue` landing page is live, brand-doctrine compliant, and renders correctly on the apex (`https://corpflowai.com/lead-rescue`) and the dedicated subdomain (`https://aileadrescue.corpflowai.com`). The 52-second silent walkthrough video (CF-VID-0001) is wired into the page, served from the CDN, and disclosed as representational. The intake form posts to a working API and emits operator alerts. The three planned articles do **not** exist as drafts in the repo - they are launch-nice-to-have, not launch-blocking. The accounting story is the real constraint: ERPNext is sandbox-only and is **not** ready to issue real client invoices on Friday. The Friday-safe path is **manual PDF quote / pro-forma invoice issued after intake review, payment confirmed manually via SBM bank transfer (warm-network only) before the 48-hour setup clock starts**, exactly as the live page already promises. Outreach should lead with **missed enquiries / WhatsApp / follow-up** language, not with "AI", and target Mauritius warm-network buyers first.

## 1. Lead Rescue page readiness

**Verdict:** **READY for Mauritius warm-network outreach.** Live URLs return 200 with valid HTML and Vercel cache hits.

| Question | Finding |
|---|---|
| Production-ready? | **Yes.** `https://corpflowai.com/lead-rescue` returns `200 / text/html / x-vercel-cache=PRERENDER`; the dedicated host `https://aileadrescue.corpflowai.com/` returns `200`; both render the same `components/AiLeadRescueLanding.js` component. |
| Current offer | **AI Lead Rescue Setup - USD 150 launch pilot - 48-hour setup.** Single offer, per `JE-2026-05-28-1` *Single offer rule* and `BRAND_AND_CONVERSION_DOCTRINE.md` AI Lead Rescue doctrine. |
| Primary CTA | **Start my 48-hour setup** (anchor: `#intake`). Hero badge: *USD 150 launch pilot - 48-hour setup - no card on this page.* |
| Secondary CTA | **See how it works** (anchor: `#how-it-works`). |
| Intake flow | Form on the page captures `business_name / name / email / phone / lead_sources / message`; POSTs to `/api/tenant/intake` with `meta.product='ai-lead-rescue'`; server emits `tenant.lead.captured` + `corpflow.lead_rescue.intake_received` automation events; Telegram/email alert flows through n8n if configured (see `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`). |
| "USD 150 launch pilot" wording | **Present.** Live HTML contains the exact phrase "USD 150 launch pilot" (verified 2026-06-01). |
| "Invoice after intake review" | **Present.** Live HTML contains "invoiced after we review your intake" + "Invoiced after we review your intake. No card or banking details on this page." |
| Card / banking details collected on the page? | **No.** Live HTML contains "no card on this page" + "Do not enter card or banking details on this page." Form has only name / email / phone / business / lead-sources / message - **no payment fields**. |
| Risky or unsupported claims? | **None found.** "We do not guarantee new revenue" present (verbatim doctrine line). No revenue guarantees, no testimonials, no logos, no fake case studies. The "Representational example only" disclosure runs above the dashboard slot. |
| Mauritius-specific risk | The page does **not** mention Mauritius, MUR, EUR, Wise, or PayPal anywhere - confirmed by live grep. The single-USD-after-intake doctrine (`JE-2026-05-28-3`) was applied on 2026-05-28; no doctrine drift remains. |

### 1.1 Live verification (2026-06-01)

```text
GET  https://corpflowai.com/lead-rescue                          -> 200  text/html (40,620 B)  vercel-cache=PRERENDER
GET  https://aileadrescue.corpflowai.com/                        -> 200  text/html (40,783 B)  vercel-cache=MISS
HEAD .../assets/video/lead-rescue/lead-rescue-walkthrough-v1.mp4 -> 200  video/mp4 (665,092 B) vercel-cache=HIT
HEAD .../assets/video/lead-rescue/lead-rescue-walkthrough-v1.vtt -> 200  text/vtt  (450 B)     vercel-cache=HIT
HEAD .../assets/visuals/lead-rescue-hero-1920.webp               -> 200  image/webp (127,266 B) vercel-cache=HIT
HEAD .../assets/visuals/lead-rescue-social.webp                  -> 200  image/webp (51,450 B) vercel-cache=HIT

Doctrine sentinels in the live HTML:
  "USD 150 launch pilot"             present
  "no card on this page"             present
  "invoiced after we review intake"  present
  "We do not guarantee"              present
  video src wired into the HTML      present
  MUR / EUR / Wise / PayPal mentions absent (good - matches doctrine)
```

### 1.2 Pricing posture (do not change for Friday)

The live page already implements the canonical **single offer rule**: **USD 150 launch pilot, invoiced after intake review.** Anton's `JE-2026-06-01-4` notes a *transitional CTA pattern* recommendation ("Apply for the USD 150 launch pilot..."), but explicitly records it as **not yet adopted on the live page** and adoption requires a separate small operator-authorised packet. **For Friday: do not change the page copy.** The current wording is brand-doctrine compliant and consistent with manual SBM-wire / warm-network flow.

## 2. Video / validation asset status (CF-VID-0001)

**Verdict:** **READY and live.** CF-VID-0001 exists in the repo, is committed to the apex Vercel deployment, is wired into `/lead-rescue` in the dashboard slot, and serves with valid `video/mp4` content type plus a working WebVTT caption track.

| Question | Finding |
|---|---|
| Does CF-VID-0001 exist? | **Yes.** Walkthrough id `CF-VID-0001`. Final cut signed off by Anton on 2026-05-29 07:00 UTC (provenance file `final_cut_signed_off_at_iso`). |
| MP4 path (repo + live) | Repo: `public/assets/video/lead-rescue/lead-rescue-walkthrough-v1.mp4` (665,092 B, sha256 `8a465fbef40deddb4467f9cc560bec1697ad62f4091f3580a9bb1667f4e158dc`). Live: `https://corpflowai.com/assets/video/lead-rescue/lead-rescue-walkthrough-v1.mp4` (200 / `video/mp4` / Vercel HIT). |
| VTT (caption) path | Repo: `public/assets/video/lead-rescue/lead-rescue-walkthrough-v1.vtt` (450 B). Live: 200 / `text/vtt; charset=utf-8` / Vercel HIT. |
| Provenance JSON | `public/assets/video/lead-rescue/lead-rescue-walkthrough-v1.provenance.json` - records Playwright + FFmpeg server-render, workflow run id `26621869636`, real-tenant=false, real-Telegram=false, real-PII=false, AI tooling disclosed, human review required. |
| Manifest path | `data/visual-assets/lead-rescue-walkthrough-v1.manifest.json` - `kind=video`, `licence.tier=ai_generated`, `usage.notes=slot:lead_rescue_dashboard`, lifecycle=`vetted`, review_due `2026-11-29`. |
| Walkthrough YAML (source of truth) | `data/walkthroughs/lead-rescue-walkthrough-v1.yml` - 10 beats, 52-second target, captions match approved page claims, final disclosure card "Representational example only / No real client data, no real Telegram resources / Visual generated and assisted by AI tooling, reviewed by humans". |
| Wired into `/lead-rescue`? | **Yes.** `lib/visualAssets/selectLeadRescueAssets.js` lists `lead-rescue-walkthrough-v1` as the **first preferred id** for slot `lead_rescue_dashboard`. The video tag (with controls, no autoplay, no loop, captions track) is rendered by `components/VisualAssetRenderer.js` under the *"What you see every morning"* section. The MP4 URL appears in the live HTML response. |
| Live on production? | **Yes.** `https://corpflowai.com/lead-rescue` shows the walkthrough in the dashboard slot; the MP4 streams from the apex CDN. Also reachable on `https://aileadrescue.corpflowai.com/` (same component). |
| Synthetic / representational with disclosure? | **Yes.** Manifest licence terms: "AI-rendered representational walkthrough... never present as a real client view." On-page label above the video: *"Representational example only - counts, initials, and entries are illustrative, not live data."* Final 7-second disclosure card is burned into the video itself. `AssetProvenanceDisclosure` chip renders below the video because the manifest is `licence.tier=ai_generated`. |
| Friday-usable? | **Yes.** Safe to embed in a LinkedIn / WhatsApp / Telegram outreach message as a link to `https://corpflowai.com/lead-rescue` (page autoplay disabled - buyer chooses to play). Direct MP4 URL also works for embedded Telegram / Slack previews if you prefer. |

### 2.1 Direct shareable URLs (Friday-safe)

```text
Page (preferred):  https://corpflowai.com/lead-rescue#dashboard-visual
Page (alt host):   https://aileadrescue.corpflowai.com/
Direct MP4:        https://corpflowai.com/assets/video/lead-rescue/lead-rescue-walkthrough-v1.mp4
Captions VTT:      https://corpflowai.com/assets/video/lead-rescue/lead-rescue-walkthrough-v1.vtt
Social card image: https://corpflowai.com/assets/visuals/lead-rescue-social.webp
```

The page itself produces correct `og:title / og:description / og:image / twitter:card` tags pointing at the social card webp - link previews on LinkedIn / WhatsApp / Telegram will render cleanly.

## 3. Article status

**Verdict:** **NONE of the three planned articles exist.** Articles are **planned only, not launch-blocking.**

| Slug | Repo path search | State | Launch-blocking? |
|---|---|---|---|
| `why-small-businesses-lose-leads` | No match in `pages/` or `data/` (only mentioned in `artifacts/chat_history.md`) | **Planned only** | No |
| `what-happens-after-someone-submits-your-contact-form` | No match in `pages/` or `data/` (only mentioned in `artifacts/chat_history.md`) | **Planned only** | No |
| `hidden-cost-of-slow-lead-response` | No match in `pages/` or `data/` (only mentioned in `artifacts/chat_history.md`) | **Planned only** | No |

There is no `pages/articles/` directory and no `data/articles/` directory in the repo - the article scaffolding work itself was deferred per `JE-2026-05-28-1` ("PR LR-4 ... article scaffolding + first 3 articles for `/articles/<slug>` deferred to a separate small packet"). The marketing execution standards (`docs/marketing/01_AGENT_OUTPUT_CONTRACT.md`, `02_MULTIMODAL_CONTENT_PLAYBOOK.md`, `03_CONTENT_ATOM_SCHEMA.md`, `04_DELIVERY_QUALITY_GATE.md`, `05_AGENT_COMPULSION_MECHANISM.md`) are in place to produce articles to the right standard when authorised, but no article body has been written.

**Articles are planned only, not launch-blocking.** Friday outreach uses the live page + the walkthrough video as the validation asset; articles are nice-to-have for a follow-up nurture sequence after the first paying pilot.

## 4. Visual / social assets inventory

All Lead Rescue manifests live under `data/visual-assets/lead-rescue-*.manifest.json` and the actual binary files under `public/assets/visuals/` and `public/assets/video/lead-rescue/`. Provenance disclosure renders automatically for any `licence.tier=ai_generated` manifest, per `components/VisualAssetRenderer.js` + `components/AssetProvenanceDisclosure.js`.

### 4.1 Existing assets (READY for outreach)

| Asset id | Manifest path | Asset path | Kind | Provenance | Intended use | Suitable for outreach? |
|---|---|---|---|---|---|---|
| `lead-rescue-hero` | `data/visual-assets/lead-rescue-hero.manifest.json` | `public/assets/visuals/lead-rescue-hero-{1920,1280,768}.webp` | image | `licence.tier=ai_generated` (gpt-image-1, prompt `lead-rescue-hero-photography`); reviewed by anton@corpflowai.com 2026-05-21 | Above-fold hero on `/lead-rescue` (slot `lead_rescue_hero`) | Yes - calm desk-corner photo, no people, no logos. Brand-doctrine compliant. |
| `lead-rescue-process` | `data/visual-assets/lead-rescue-process.manifest.json` | `public/assets/visuals/lead-rescue-process.svg` | illustration | `licence.tier=corpflow_owned` (hand-crafted SVG, ~3 KB) | "How it works" 3-stage flow (slot `lead_rescue_process`) | Yes - on-page only; not strong as a standalone share asset. |
| `lead-rescue-dashboard` | `data/visual-assets/lead-rescue-dashboard.manifest.json` | `public/assets/visuals/lead-rescue-dashboard.svg` | illustration | `licence.tier=corpflow_owned` (representational SVG mockup, ~6 KB) | Fallback for the dashboard slot if the walkthrough is ever retired | Yes for on-page; the walkthrough video supersedes it for outreach. |
| `lead-rescue-walkthrough-v1` (CF-VID-0001) | `data/visual-assets/lead-rescue-walkthrough-v1.manifest.json` | `public/assets/video/lead-rescue/lead-rescue-walkthrough-v1.mp4` (+ `.vtt` + `.provenance.json`) | video | `licence.tier=ai_generated` (Playwright + FFmpeg server render, prompt `cf-vid-0001-lead-rescue-walkthrough-v1`); signed off by Anton 2026-05-29 | Dashboard slot on `/lead-rescue`; **the** validation asset | **Yes** - 52-second silent walkthrough; safe for LinkedIn / Facebook / WhatsApp / Telegram. Burned-in captions + WebVTT track for screen readers. |
| `lead-rescue-trust` | `data/visual-assets/lead-rescue-trust.manifest.json` | `public/assets/visuals/lead-rescue-trust.svg` | illustration | `licence.tier=corpflow_owned` (hand-crafted, ~2 KB) | Trust band below the reassurance section (slot `lead_rescue_trust_band`) | On-page only; updated 2026-05-28 to "USD INVOICE / AFTER INTAKE" per `JE-2026-05-28-3`. |
| `lead-rescue-social` | `data/visual-assets/lead-rescue-social.manifest.json` | `public/assets/visuals/lead-rescue-social.webp` (1200x800, 51,450 B) | social_card | `licence.tier=ai_generated` (gpt-image-1, prompt `lead-rescue-social-card-architectural`); reviewed by anton@corpflowai.com 2026-05-21 | `og:image` / `twitter:image` for `/lead-rescue` | **Yes** - this is the asset that renders in LinkedIn / Facebook / WhatsApp / Telegram link previews. |

### 4.2 Stale / example manifests (do not use)

| Asset id | Manifest path | Why noted | Action |
|---|---|---|---|
| `lead-rescue-social-card-hero` | `data/visual-assets/lead-rescue-card.example.manifest.json` | Points at a placeholder CDN URL (`https://cdn.corpflowai.com/marketing/lead-rescue/og-hero-v3.png`) with a placeholder content_hash. This is an **example / template manifest** the selector deprioritises behind `lead-rescue-social`. | None - the live page already uses `lead-rescue-social`. Recommend retiring the example file in a follow-up cleanup packet. |

### 4.3 Provenance discipline (no further action needed for Friday)

- Every AI-generated asset (`hero`, `social`, `walkthrough-v1`) renders an `AssetProvenanceDisclosure` chip beside it on the page, with model name + version + prompt id + reviewer email. This is required by the visual asset governance (`docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md`).
- The walkthrough video also burns the disclosure card into the final 7 seconds of the MP4 itself.
- **No fake testimonials, no client logos, no fabricated case studies** are present in any manifest - confirmed by manual scan of all seven manifests under `data/visual-assets/lead-rescue-*`.

## 5. Mauritius positioning recommendation

### 5.1 Lead with the problem, not with "AI"

The brand-conversion doctrine already says it: the H1 on the live page is *"Stop losing leads because follow-up is too slow."* not *"AI for your business."* This is the right posture for Mauritius.

| Frame | Use? | Why |
|---|---|---|
| "AI for your business" | **No** | Sets generic expectations, invites comparison to enterprise AI, attracts curiosity-tyre-kickers, not buyers. |
| **"Stop losing enquiries / WhatsApp / follow-up / daily lead list"** | **Yes** | Concrete, named pain. Mauritius small-business owners recognise this immediately - WhatsApp is the dominant lead channel, follow-up depends on memory, no one has a CRM. |
| "Don't lose another customer" | Maybe (tonal variant) | Slightly tabloid; works in Creole-flavoured English outreach but not in formal channels. |
| "Stop guessing which leads you missed yesterday" | Yes (operational variant) | Targets owners who know they have leakage but don't know how big it is. Pairs with the daily-summary outcome. |

The page itself is already framed correctly - **outreach should match the page voice, not introduce a different voice.** Lead with: *"Most small businesses don't lose leads because they lack a website. They lose leads because enquiries arrive in different places and follow-up depends on memory. We help you stop that, in 48 hours, for USD 150."*

### 5.2 Language and channel recommendation

| Surface | Language | Reason |
|---|---|---|
| `/lead-rescue` landing page | **English (current)** | English is the working language for Mauritian SMEs in services / professional / hospitality / property. The current copy is correct. **Do not translate the page for Friday.** |
| LinkedIn outreach (1:1 or Sales Navigator) | **English** | LinkedIn is English-default for the Mauritian professional segment; French-language LinkedIn outreach feels machine-translated unless natively written. |
| Facebook (organic + groups) | **English with French phrases mixed in** | Many Mauritian small-business pages run bilingual; matching the page tone is fine. **Do not** post pure-French outreach unless a native-French operator writes it. |
| WhatsApp 1:1 (warm contacts) | **English, very short** | First WhatsApp message: 2-3 lines plus the link. Do not send video as the first message - send the page URL and let them click. |
| Email outreach (cold) | **English** | Friday-safe is English; French / Creole variants are a nice-to-have for a follow-up batch, not launch-blocking. |
| Phone follow-up | **English with Creole switching as the contact prefers** | Standard Mauritian business norm; happens after intake submitted, not on the first contact. |

**Friday recommendation:** **all outreach in English.** French and Creole variants are a *follow-up batch* once the first 5-10 intakes have come in and we know what wording resonates. The doctrine and brand voice were written in English; introducing French / Creole now without native review risks doctrine drift.

### 5.3 Buyer segments most likely to understand and buy first

Ranked by likelihood of comprehension + purchase, given the **USD 150 launch pilot, manual SBM-wire** posture:

| Rank | Vertical | Why this rank | Most likely buyer phrase that lands |
|---:|---|---|---|
| **1** | **Property / real estate / rentals** | Highest enquiry volume, most missed leads; agents already triage by WhatsApp; the daily-summary outcome maps cleanly to "viewings booked vs viewings missed" | *"You missed three rental enquiries this week - here's how to stop that"* |
| **2** | **Clinics / wellness / dental / beauty** | Appointment-driven; missed enquiry = missed booking = direct revenue impact; owner is also receptionist on Saturdays | *"Every appointment request that arrives Friday night gets logged and replied to - even if your front desk is closed"* |
| **3** | **Contractors / home services / renovation / solar / security** | Quote-driven; lead value high (MUR 50k+); slow response loses to whoever calls back first; WhatsApp + Facebook are primary channels | *"Three quote requests came in last weekend - did you reply to all of them?"* |
| **4** | **Private schools / tutors** | Enrolment season is enquiry-heavy; parents WhatsApp directly; admin staff small; owner sees leakage end-of-month | *"Make sure no enrolment enquiry slips through the cracks during the busy season"* |
| **5** | **Accountants / consultants** | Fewer leads but each is high-value; respond slowly because work-in-progress comes first; will recognise the pattern | *"Capture every prospect enquiry, log it, follow up - not just the ones you remember"* |
| **6** | **Car dealers** | Strong intent, fast-moving, but most use existing CRMs (Carmusing etc.) - more competitive market for our offer | Tactical only - chase warm intros, not cold |
| **7** | **Luxury / property services / concierge** | High value but a smaller list; usually served by an existing operator network; often referred not paid-acquired | Warm-intros only |

**Friday recommendation:** **start with verticals 1, 2, 3** - that is where Mauritius warm-network density is highest and the buyer phrase translates without explanation. Verticals 4-7 are a second batch.

**Hard rule per `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` § 3:** until the **first paying pilot completes and the client gives written permission**, outreach cannot reference: *"Our clients have seen X percent more leads"* / *"Trusted by..."* / any specific client name / any star rating / any logo of a company that has not signed a permission line. The honest replacement, *"Built by an operating-systems team based in Mauritius, working with small businesses in Mauritius and internationally"* is allowed.

## 6. Accounting / invoicing readiness

**Verdict (operator-blunt):** **ERPNext is sandbox-only and is NOT production-ready for Friday.** A manual PDF quote / pro-forma invoice fallback is required and is well within doctrine. Friday outreach is not blocked.

### 6.1 ERPNext production readiness - point-by-point

| Question | Finding |
|---|---|
| Is ERPNext currently sandbox or production? | **Sandbox only.** Loopback `127.0.0.1:8080` on `corpflow-exec-01-u69678`, scheduler disabled, no public DNS, no Vercel route. Confirmed by `JE-2026-06-01-1`, `JE-2026-06-01-3`, `JE-2026-06-01-5`. |
| Can ERPNext generate invoices in principle? | **Yes.** `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` Cycle 1 + Cycle 2 generated two USD 150 Sales Invoices end-to-end (`ACC-SINV-2026-00001` / `ACC-SINV-2026-00002`); Payment Request + Payment Entry + FX clearing posted; reconciliation = MUR 0.00 delta. |
| Has the sandbox tested USD invoice + manual approval after intake? | **Yes.** Phase C cycle 1 = USD invoice -> manual submit (operator approval) -> Payment Request with bank-wire instructions -> Payment Entry against MU MUR bank with FX. Cycle 2 = USD invoice -> Payment Request with payment-link placeholder -> USD-to-USD receipt -> manual JE for withdrawal. Both cycles GREEN. |
| Named blocker(s) before ERPNext can be used for real invoices? | **Four named in `ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` § 7 + `JE-2026-06-01-3`:** (1) Multi-user role - **RESOLVED 2026-06-01** via Option B custom `Accountant Read-Only` Role + 9 Custom DocPerm rows (`JE-2026-06-01-5`). (2) Accountant CoA review - **PENDING** (a Mauritius-licensed accountant must sign off the Chart of Accounts in writing). (3) Real (redacted) MU bank CSV import test - **PENDING** (only synthetic CSV tested in Phase C). (4) VAT review or "below threshold; not yet needed" log entry - **PENDING**. **Phase D (production go-live) requires separate operator approval per `JE-2026-05-29-1` and is not authorised.** |
| What is still required before using ERPNext for real invoices? | Phase D operator approval -> production install (separate VM or graduate sandbox, with non-loopback DNS / TLS / scheduler enabled / live SMTP) -> CoA sign-off by accountant -> first real (redacted) MU bank statement reconciled -> VAT decision logged -> first real client raised end-to-end. **None of this is reachable by Friday.** |

### 6.2 Letterhead / branding fields (status check)

For a manual PDF invoice or quote on Friday, the operator can populate these fields by hand in the PDF; **none of this needs to live in ERPNext production for Friday outreach.**

| Field | Status |
|---|---|
| CorpFlowAI logo / wordmark | **Available.** Wordmark in `public/assets/logos/` plus the brand identity v1 proposal (`docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md`) ratifies the canonical wordmark + teal `#2dd4bf` colour. Operator can paste the wordmark into a PDF template manually. |
| Letterhead template | **Not present in repo.** A simple PDF letterhead can be assembled by hand for Friday using the wordmark + a footer ("CorpFlowAI Ltd. - Mauritius - support@corpflowai.com"). This is an operator-side asset, not a runtime artefact - safe to create outside the repo. |
| Company legal name | **CorpFlowAI Ltd** (per `docs/finance/PAYMENT_READINESS_2026_06_01.md` § 1: *"CorpFlowAI Ltd is the Mauritian-registered company"*). |
| Business registration / BRN | **Not in any repo doc.** Operator-side - Anton has the BRN; do not put it in repo. Add to the manual PDF template at the time of first invoice. |
| Company address (Mauritius) | **Not in any repo doc.** Operator-side - same posture as BRN. |
| Contact email | `support@corpflowai.com` (per `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` - the configured outbound sender alias). |
| Contact phone | **Not in any repo doc.** Operator-side. |
| Invoice numbering format | Sandbox uses `ACC-SINV-2026-NNNNN`; production format will be set in ERPNext production setup, not now. For manual Friday invoices, recommend `CFLR-2026-NN` (CorpFlowAI Lead Rescue, year, sequence) or similar - operator's choice. |
| Currency | **USD** (per single offer rule + Phase C cycles). |
| Payment instructions wording | Per `JE-2026-06-01-4` § 4.5 transitional pattern: *"USD invoice issued after intake review. Payment route confirmed on the invoice (currently SBM Bank Mauritius wire). Setup begins once payment is confirmed."* |
| Manual SBM bank-transfer instructions | **Operator-side - Anton has these.** Recommend a **separate password-protected PDF instruction sheet** sent only after intake approval; do not put SBM SWIFT / IBAN / account numbers in the public landing page or any file in this repo. |
| PayPal / Wise / SBM e-Commerce / Peach / MoR status | **Per `JE-2026-06-01-4`:** PayPal HOLD; Wise removed; SBM e-Commerce acquiring request sent (awaiting reply); Peach Payments support request sent (awaiting reply); MoR backup (Paddle / Lemon Squeezy / FastSpring / 2Checkout-Verifone) not yet investigated. **Friday-safe primary: manual SBM wire after intake review (Mauritius + warm-network only, per the §4.4 buyer-segment rule).** |
| VAT / tax wording | **Recommend the "below threshold; not yet applicable" posture** on the Friday PDF invoice: a footer line *"VAT: not yet applicable - to confirm with accountant"* avoids commitment and is honest given the pending VAT decision. **Confirm with Mauritius accountant before sending real invoices** - VAT registration in Mauritius applies above MUR 6 million annual turnover; pilot revenue is well under that, but the line should be reviewed by an accountant. |
| PDF invoice output quality | **Sandbox PDFs not extracted.** Phase C tested arithmetic + GL, not visual PDF rendering. **Recommend hand-built PDF for Friday** (Word / Pages / Google Doc -> export PDF) - operator has full control of layout, no risk of sandbox-quality formatting. |
| Quote / pro-forma capability | **Yes via manual PDF.** ERPNext sandbox can also produce Quotation doctype, but Friday-safe is hand-built PDF labelled "Quote" or "Pro-forma invoice" - same content, no payment commitment until invoice is issued. |

### 6.3 Friday-safe accounting fallback (recommended)

```text
Step 1.  Intake submitted on /lead-rescue (live).
Step 2.  Operator (Anton) reviews intake in /admin/lead-rescue/[id]
         within 2 business hours.
Step 3.  If approved: operator builds a manual PDF
         "Pro-forma invoice" (or "Quote") in Word / Pages / Google Doc:
           - CorpFlowAI Ltd. wordmark + footer
           - Buyer name / business / address from intake
           - Line item: "AI Lead Rescue Setup (USD 150 launch pilot)" - USD 150
           - Total: USD 150
           - VAT: "Not yet applicable - to confirm with accountant"
           - Payment instructions: "SBM Bank Mauritius wire details
             attached as a separate PDF after acceptance"
           - Note: "Setup begins after payment lands.
                   48-hour clock starts from confirmed payment."
Step 4.  Operator emails the PDF to the buyer from
         support@corpflowai.com (the disciplined alias - see
         docs/communications/CORPFLOW_COMMUNICATIONS_V1.md).
Step 5.  If buyer accepts: operator sends a separate password-protected
         PDF with SBM wire instructions (one-time message,
         not stored in any GitHub or shared drive).
Step 6.  Buyer wires; SBM confirms receipt; operator records
         payment in /admin/lead-rescue/[id] Commercial card
         (route="SBM wire", status="paid", invoice ref).
Step 7.  Setup checklist becomes visible (PAID_SETUP onwards) -
         48-hour clock starts.
```

**No real banking details, no SBM credentials, no SWIFT codes, no account numbers go anywhere near this repo.** They live in Anton's local files and are sent only after intake approval, only to confirmed buyers.

**Why not ERPNext for Friday?** Promoting the sandbox to production needs (a) a production install (separate VM or graduated host with public DNS + TLS + scheduler enabled), (b) accountant CoA sign-off, (c) real bank CSV reconciliation evidence, (d) a VAT decision recorded, plus operator approval for Phase D - none reachable in 4 days. The hand-built PDF route works **today** and is consistent with the live page wording.

## 7. Friday launch checklist

### 7.1 Must have before outreach (launch-blocking)

| # | Item | Status (today) | Owner |
|---:|---|---|---|
| 1 | Live `/lead-rescue` page returning 200 with USD 150 + intake form + walkthrough video | **READY** (verified live 2026-06-01) | Cursor (verification done) |
| 2 | Intake form posts to `/api/tenant/intake` and emits operator alert event | **READY** (handler in `lib/server/tenant-intake.js`) | Anton (confirm Telegram / email destination receives the test alert) |
| 3 | Walkthrough video (CF-VID-0001) playable on the page + direct MP4 URL works | **READY** | - |
| 4 | Manual PDF quote / pro-forma template ready (operator-side, see § 6.3) | **NOT READY** - Anton to assemble the template (Word / Pages / Google Doc) | Anton |
| 5 | Manual SBM-wire instruction PDF ready (operator-side, sent after intake approval only) | **NOT READY** - Anton to prepare a one-page PDF with SBM wire details (kept off-repo) | Anton |
| 6 | Outreach copy approved (LinkedIn / WhatsApp / email - English variants) | **NOT READY** - draft a short copy block per channel; can be adapted from the §4 hero supporting copy + the §5.1 framing | Anton (recommend a tiny copy packet on Thursday; Cursor can draft variants for review) |
| 7 | Vertical priority list + initial outreach list (10-30 names) | **NOT READY** - Anton's network knowledge; recommend 10 names from verticals 1-3 in §5.3 | Anton |
| 8 | `support@corpflowai.com` mailbox monitored Friday-Sunday | **READY** (per `CORPFLOW_COMMUNICATIONS_V1.md`) | Anton |
| 9 | `/admin/lead-rescue/[id]` operator console accessible from Anton's laptop / phone | **READY** (factory admin login) | Anton (do a dry-run intake from another browser / phone to confirm the flow on Thursday) |

### 7.2 Nice to have, not launch-blocking

| Item | Why | When |
|---|---|---|
| Three planned articles (`why-small-businesses-lose-leads`, `what-happens-after-someone-submits-your-contact-form`, `hidden-cost-of-slow-lead-response`) | Nurture sequence after first paying pilot | When article packet is authorised; at least one week of post-launch engagement data first |
| French / Creole outreach variants | Broader reach to non-English-default buyers | After first 5-10 intakes show what English wording resonates; native review required |
| PDF one-pager (offer summary) | Useful to send before the page link in formal contexts | Thursday optional; the page itself functions as a one-pager already |
| ERPNext production invoice automation | Removes manual PDF assembly; reconciliation automation | After Phase D approval + accountant CoA sign-off |
| Testimonials / proof blocks | Strongest conversion lift | After first paying pilot completes + named permission from client |
| CRM / Twenty pipeline | Operator-side polish | Optional; the existing `/admin/lead-rescue` console covers Friday |

### 7.3 Do not wait for (launch this week despite these)

| Item | Why fine to skip |
|---|---|
| Full accounting automation | ERPNext sandbox is fully validated for the workflow; production install is a Phase D + accountant decision, not a launch gate. Manual PDF works. |
| Wise automation | Wise removed from v1 plan per `JE-2026-06-01-4`. |
| VAT / e-invoicing implementation | Below threshold; the "not yet applicable - to confirm with accountant" footer is the honest, doctrine-compliant posture. |
| Published articles | Page proof + walkthrough video is sufficient first-cut validation per `PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` ranks 4 (validation asset) + 5 (internal artefacts) + 6 (structural numerical proof). |
| Full case studies | Can't exist before the first paying pilot. |
| Automated payment collection | Per `JE-2026-06-01-4`: SBM e-Commerce + Peach replies pending; manual SBM wire is the warm-network primary path. |

## 8. Risks and mitigations

| Risk | Likelihood | Impact | Mitigation (Friday-safe, no runtime change) |
|---|---|---|---|
| Cold international buyer from outreach lands on the page, expects one-click checkout, abandons | Medium | Low (we're targeting Mauritius warm-network primarily, not cold international) | Outreach segmentation: warm-network Mauritius first; do not send page link to cold international lists. Per `JE-2026-06-01-4` § 4.4 cold international = wait. |
| Manual PDF / SBM wire feels "small" to a buyer expecting a polished checkout | Medium | Low | Frame the manual route as **deliberate**: "We invoice after intake review so we only take on pilots we can deliver in 48 hours." This is the doctrine; lean into it. |
| Buyer asks "is this real or AI-generated?" about the walkthrough video | High (good question) | Low | The video itself answers - 7-second disclosure card + caption: "Visual generated and assisted by AI tooling, reviewed by humans. Representational example only. No real client data." Operator can also point at `https://corpflowai.com/assets/video/lead-rescue/lead-rescue-walkthrough-v1.provenance.json`. |
| Buyer wants a testimonial or case study before paying | High | Medium | Use the honest proof gap line from `PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` § 3: *"This is a launch pilot. We do not yet publish client cases. The first published case will appear after the first paying pilot completes - which is why the pilot price is USD 150 instead of the production price."* Discount-as-proof-substitute is a legitimate frame. |
| Buyer asks for MUR pricing or local currency invoice | Medium | Low | Doctrine: USD only on the public page (`JE-2026-05-28-1`); operator may issue MUR-equivalent invoice for Mauritius local clients on the Commercial card after qualification, recorded as an operator-side currency arrangement per `JE-2026-05-28-1`. **Do not** advertise MUR on the public page. |
| `/api/tenant/intake` Telegram / email alert silently fails on Friday | Low (but check) | High (you'd miss intakes) | **Anton: do a dry-run intake submission from a phone before sending outreach** to confirm the alert lands in Telegram / email. Operator runbook step. |
| Vercel deployment regression takes the page down | Low | High | Live monitoring already covers `https://corpflowai.com/` and `https://aileadrescue.corpflowai.com/` per `docs/operations/MONITORING_ARCHITECTURE.md` § 5 (always-on minimum, both apex and the dedicated subdomain). |
| Outreach copy makes a revenue claim or testimonial-style claim that violates doctrine | Low (if copy reviewed) | High (legal + brand) | **Run any outreach copy through the brand-conversion-doctrine review** before sending: no "guaranteed leads", no "X%", no specific client names without permission, no fabricated logos. Reuse the page's own H1 + supporting copy verbatim where possible. |
| ERPNext sandbox accidentally promoted or exposed before Phase D approval | Very low (loopback only, scheduler off) | High (live without controls) | Phase D is gated per `JE-2026-05-29-1`; Cursor will not act without explicit Anton approval. **Do not** open inbound firewall ports or DNS to `corpflow-exec-01-u69678` for Friday. |

## 9. Recommended next work packets (proposal-only, not authorised)

These are flagged so they can be sequenced after Friday outreach lands. **Each requires a separate Anton DECISION before any work begins.**

| Packet ID (proposed) | Scope (one line) | Trigger |
|---|---|---|
| **LR-Mauritius-Outreach-Copy-1** | Draft + review LinkedIn / WhatsApp / email outreach variants (English only) for verticals 1-3 + a short Thursday dry-run of the intake-to-Telegram pipeline. Docs-only. | Anton requests; recommended Thursday before Friday launch. |
| **LR-Manual-Invoice-Template-1** | Draft a CorpFlowAI-branded PDF pro-forma invoice template (Word + PDF export). Operator-side, kept off-repo (template lives in Anton's filesystem). | Anton requests; Thursday. |
| **LR-Articles-1** | Stand up `pages/articles/<slug>` scaffolding + the three planned articles, written to the Hook / Proof / Depth contract in `docs/marketing/01_AGENT_OUTPUT_CONTRACT.md`. | After first 5-10 intakes show what messaging resonates. Per `JE-2026-05-28-1` deferred-but-named. |
| **LR-First-Pilot-Permission-Line-1** | Add a one-line "may we name you in a future case study?" question to the operator runbook and a permission-line template to `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md`. Docs-only. | After first pilot signs the USD 150 invoice. Unlocks Rank 1-3 proof types in `PROOF_VALIDATION_ASSET_PLAN_LR_V1.md`. |
| **LR-Transitional-CTA-Adoption-1** | Apply the `JE-2026-06-01-4` § 4.5 transitional CTA wording to `pages/lead-rescue.js` + `components/AiLeadRescueLanding.js`. Small page-copy packet. | When SBM e-Commerce or Peach reply with "yes, here's the timeline" - the wording shift makes more sense once a real payment portal is on the horizon. **NOT for Friday.** |
| **ERPNext-Phase-D-Recommendation** | Compile go/no-go recommendation per `ERPNEXT_SANDBOX_PLAN_V1.md` § 10 - includes accountant CoA review prep, real (redacted) MU bank CSV import test packet, VAT decision draft. | Anton authorises Phase D per `JE-2026-05-29-1`. |
| **LR-French-Creole-Variants-1** | Native-reviewed French + Creole outreach copy variants for verticals 1-3. Docs-only. | After 1-2 weeks of English-only Mauritius outreach data. |
| **LR-Brand-Identity-Phase-B-Step-3** | Favicon + apple-touch-icon + og-image refresh per `CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` Phase B step 3. Already noted as unblocked but awaiting authorisation. | Anton authorises. Currently the live `og:image` is `lead-rescue-social.webp` which is already brand-doctrine compliant; this packet is a nice-to-have. |

## 10. Honest limits of this inventory

- **Cursor cannot send the outreach itself** - Anton is the operator who decides who gets the page link, who gets the manual PDF, and when.
- **Cursor cannot prepare the SBM wire instruction PDF** - that contains real banking details and lives off-repo with Anton.
- **Cursor cannot validate the Telegram / email alert** - Anton must run a dry-run intake from a phone on Thursday and confirm the alert arrives.
- **Cursor has not opened any package, no API call to SBM / Peach / Wise / PayPal / Stripe / Paddle was made** - those routing decisions are unchanged from `JE-2026-06-01-4` and remain operator follow-ups.
- **No customer-visible runtime change is proposed by this inventory.** The live page, the video, the manifests, and the operator console are all in their merged, deployed, live-verified state as of `aa984513` on `main` (HEAD verified 2026-06-01).
- **No new env var, secret, DNS record, Vercel config, GitHub setting, DB schema, Prisma migration, ERPNext production setting, payment configuration, KYC submission, or analytics change is proposed.** This is pure inventory.

## 11. Cross-references

- `pages/lead-rescue.js`, `components/AiLeadRescueLanding.js`, `components/VisualAssetRenderer.js`, `lib/visualAssets/selectLeadRescueAssets.js` - the live page + asset wiring.
- `data/walkthroughs/lead-rescue-walkthrough-v1.yml`, `data/visual-assets/lead-rescue-*.manifest.json` - source of truth for the walkthrough + visual assets.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *AI Lead Rescue doctrine* - single offer rule, payment-after-intake rule, USD 150 launch pilot wording.
- `docs/marketing/PROOF_VALIDATION_ASSET_PLAN_LR_V1.md` - approved proof-source typology, pre-proof rules, what we may and may not say until first paying pilot completes.
- `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` - canonical wordmark + teal `#2dd4bf` colour identity.
- `docs/operations/AI_LEAD_RESCUE_OPERATOR_RUNBOOK.md` - the 13-status pipeline, 13-item setup checklist, Telegram / email alert event flow.
- `docs/finance/PAYMENT_READINESS_2026_06_01.md` - SBM / Peach / MoR routing, market split (Mauritius warm-network vs cold international).
- `docs/finance/ERPNEXT_SANDBOX_PHASE_C_FINDINGS.md` - sandbox Phase C arithmetic GREEN, Phase D blockers named.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` - `support@corpflowai.com` is the disciplined outbound alias; n8n + Gmail OAuth is operational.
- `docs/operations/MONITORING_ARCHITECTURE.md` § 5 - both `/lead-rescue` hosts are on the always-on monitoring floor.
- `.cursor/rules/delivery-reality.mdc`, `.cursor/rules/predeploy-decision-checks.mdc` - live verification standard for any post-launch claim.
- `docs/decisions/JOURNAL.md` - relevant rows: `JE-2026-05-28-1` (single offer), `JE-2026-05-28-3` (LR-1 closure), `JE-2026-05-28-4` (marketing execution standards), `JE-2026-06-01-1` (ERPNext Phase B-a), `JE-2026-06-01-3` (Phase C), `JE-2026-06-01-4` (payment routing), `JE-2026-06-01-5` (C-1 Option B). New row to be added: `JE-2026-06-01-6` (this inventory).

## 12. Hard limits honoured

- No runtime code changed.
- No public page rewritten.
- No payment automation configured.
- No API key created or rotated.
- No secret read or logged.
- No ERPNext production setting changed.
- No Prisma migration run.
- No DB schema change.
- No Vercel config change.
- No GitHub settings change.
- No DNS change.
- No pricing change on the live page.
- No fake testimonial, fabricated logo, fake case study, or unsupported revenue claim authored.
- No env var added or removed.
- No analytics / Plausible / Search Console / Telegram / payment-settings touched.

