# Lead Rescue + Website Rescue — buyer-path verification v1

**Status:** Current-`main` verification record for [#1127](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1127).  
**Environment:** `corpflow_test` / current public CorpFlowAI apex (`corpflowai.com`).  
**Anchor sentinel:** `<!-- LEAD_RESCUE_WEBSITE_RESCUE_BUYER_PATH_VERIFICATION_V1 -->`

<!-- LEAD_RESCUE_WEBSITE_RESCUE_BUYER_PATH_VERIFICATION_V1 -->

**Parents:** #710, #711, #712, #700 · **Product sources:** #653 Lead Rescue, #654 Website Rescue

This packet proves the two approved launch-product buyer paths are understandable, navigable, and recording-ready. It does **not** submit a live enquiry, mutate Postgres, send externally, or decide public launch.

## Canonical routes (current `main`)

Target path:

`CorpFlowAI gateway → Lead Rescue or Website Rescue offer → proof/demo → one primary CTA → qualified-enquiry entry point`

| Step | Lead Rescue | Website Rescue |
|------|-------------|----------------|
| Gateway | `https://corpflowai.com/` | `https://corpflowai.com/` |
| Named landing | `https://corpflowai.com/lead-rescue` | `https://corpflowai.com/website-rescue` |
| Proof / demo | Intro video + morning walkthrough on the landing | `https://corpflowai.com/demo/website-rescue` |
| Primary CTA | **Start my 48-hour setup** | **Request discovery** |
| Enquiry entry | `https://corpflowai.com/contact?offer=ai-lead-rescue#discovery` | In-page `#discovery` on `/website-rescue`, plus `https://corpflowai.com/contact?offer=premium-landing-page-rescue#discovery` |

**Do not record as the launch-product path**

| URL | Why |
|-----|-----|
| `https://corpflowai.com/offers/ai-lead-rescue` | MUR sprint SKU — different price and name from the USD 150 Lead Rescue landing |
| `https://corpflowai.com/offers/premium-landing-page-rescue` | Live SKU alias; named buyer path is `/website-rescue` |
| `https://aileadrescue.corpflowai.com/` | Host alias for Lead Rescue; apex `/lead-rescue` is the recording URL |
| `https://corpflowai.com/lead-rescue/property-mauritius` | Vertical wedge, not the launch-product path |

`/offers/website-rescue` permanently redirects to `/website-rescue`.

## Live GET (2026-08-27 UTC, current Production spine)

| URL | HTTP | Notes |
|-----|------|-------|
| `https://corpflowai.com/` | **200** | Gateway; nav Lead Rescue + Website Rescue; primary CTA **Request a qualified conversation** |
| `https://corpflowai.com/lead-rescue` | **200** | H1 *Stop losing leads because follow-up is too slow.*; CTA **Start my 48-hour setup** |
| `https://corpflowai.com/website-rescue` | **200** | H1 *Turn a weak landing page into a credible enquiry path — fast.*; CTA **Request discovery** |
| `https://corpflowai.com/demo/website-rescue` | **200** `noindex` | Fictional Harbour Hospitality before/after; enquiry labelled **Request discovery — Website Rescue** |
| `https://corpflowai.com/contact?offer=ai-lead-rescue#discovery` | **200** | Heading **Request AI Lead Rescue**; locked product; no-auto-send copy |
| `https://corpflowai.com/contact?offer=premium-landing-page-rescue#discovery` | **200** | Heading **Request Website Rescue**; locked product; no-auto-send copy |
| `https://corpflowai.com/contact?offer=website-rescue#discovery` | **200** | Alias locks the same Website Rescue SKU |
| `https://corpflowai.com/offers/website-rescue` | **308** → `/website-rescue` | Named-path redirect |
| `https://corpflowai.com/media/corpflowai/ai-lead-rescue-sprint-intro-1080p.mp4` | **200** `video/mp4` | Lead Rescue intro |
| `https://corpflowai.com/assets/video/lead-rescue/lead-rescue-walkthrough-v1.mp4` | **200** `video/mp4` | Morning-view walkthrough |
| `https://corpflowai.com/media/corpflowai/corpflowai-flagship-homepage-final-1080p.mp4` | **200** `video/mp4` | Gateway flagship (not a product video) |
| `https://core.corpflowai.com/api/factory/health` | **200** | Internal health only — not proof of buyer-path delivery |

No buyer-path page exposed Twilio / Resend / WhatsApp send. Enquiry copy states nothing is sent automatically to email, WhatsApp or SMS. This packet did **not** POST `/api/tenant/intake`.

## Five-second check

| Surface | Target buyer | Problem | Outcome | Next action | One primary CTA |
|---------|--------------|---------|---------|-------------|-----------------|
| Gateway `/` | Owner / manager SMB | Work not captured, routed, followed up | Managed workflow improvement | Request a qualified conversation **or** open a named product | **Request a qualified conversation** |
| `/lead-rescue` | Businesses missing WhatsApp / web / DM enquiries | Follow-up is too slow | USD 150 / 48-hour capture, alert, log, daily summary | Start setup via locked enquiry | **Start my 48-hour setup** |
| `/website-rescue` | Businesses with a weak / outdated site | Offer and enquiry path are hidden | Bounded landing rescue with a working enquiry path | Request discovery | **Request discovery** |

## Defect classification

| Class | Defect | Disposition |
|-------|--------|-------------|
| **Conversion-blocking (fixed in this PR)** | Gateway footer listed SKU titles **AI Lead Rescue Sprint** and **Premium Landing Page Rescue** (`/offers/*`), competing with named nav products and mixing USD 150 Lead Rescue with the MUR sprint | Footer now uses `CORPflow_PUBLIC_LAUNCH_PRODUCTS` → `/lead-rescue` and `/website-rescue` |
| **Conversion-blocking (fixed in this PR)** | `/website-rescue` hero said **Starting path: Premium Landing Page Rescue** in the first screen | Named landing no longer leads with the SKU title |
| Non-blocking / recording note | Website Rescue “Video coming soon” YouTube placeholders on the offer page | Do not record those tiles as product proof. Record `/demo/website-rescue` |
| Non-blocking | `/offers/ai-lead-rescue` MUR sprint remains a live SKU page | Keep out of nav/footer; do not use in launch-product videos |
| Non-blocking | Website Rescue also offers **Open contact page** as a secondary enquiry route | Primary CTA remains **Request discovery** → `#discovery` |

No automatic email / WhatsApp / SMS send is exposed on these buyer paths.

## Recording-ready screen / shot matrix

Target duration per product video: 60–90 seconds (#700). Record the **live named path**, not SKU aliases. Do not submit a live enquiry on camera unless a marked `TEST-` intake and cleanup are separately approved.

### Lead Rescue video

| Shot | Screen | URL / in-page target | What to show | Do not show |
|------|--------|----------------------|--------------|-------------|
| 1 | Gateway | `https://corpflowai.com/` | Nav **Lead Rescue**; optional flagship video only as context | Footer SKU names (after this PR: named products only) |
| 2 | Product hero | `/lead-rescue` | H1, USD 150 / 48-hour badge, **Start my 48-hour setup** | `/offers/ai-lead-rescue`, MUR 35,000 |
| 3 | Proof — intro | Same page · *See AI Lead Rescue in action* | Click-to-play intro MP4 (no autoplay) | Relabel as a live client recording |
| 4 | Proof — morning view | Same page · walkthrough | `lead-rescue-walkthrough-v1.mp4` (representational, captioned) | Real tenant data / Telegram IDs |
| 5 | How it works + FAQ | `#how-it-works` / `#faq` | Capture → alert → log → daily summary; no revenue guarantee | Payment UI, card fields |
| 6 | Enquiry | `/contact?offer=ai-lead-rescue#discovery` | Heading **Request AI Lead Rescue**; locked product; no-auto-send copy | Submitting the form in this packet |

### Website Rescue video

| Shot | Screen | URL / in-page target | What to show | Do not show |
|------|--------|----------------------|--------------|-------------|
| 1 | Gateway | `https://corpflowai.com/` | Nav **Website Rescue** | SKU title **Premium Landing Page Rescue** as the product name |
| 2 | Product hero | `/website-rescue` | H1 enquiry-path rescue; **Request discovery**; starting-from MUR 45,000 after intent | `/offers/premium-landing-page-rescue` as the recording URL |
| 3 | Proof — demo | `/demo/website-rescue` | Before → After toggle; Harbour Hospitality fictional business | Live client site, invented metrics |
| 4 | Demo enquiry label | `#demo-enquiry` | Form heading **Request discovery — Website Rescue** | Submitting the form |
| 5 | Offer proof + FAQ | `/website-rescue` proof band | **Open the Website Rescue demo** link; included / not included | “Video coming soon” tiles as if they were the product demo |
| 6 | Enquiry | `/website-rescue#discovery` or `/contact?offer=premium-landing-page-rescue#discovery` | Labelled Website Rescue discovery; no-auto-send copy | Payment / card collection |

Desktop (≈1440px) and mobile (≈390px) should both show: one obvious product, one primary CTA, working proof, labelled enquiry. Header **Menu** is the mobile nav control on the gateway and Website Rescue.

## Verdict (application / recording)

| Product | Verdict |
|---------|---------|
| Lead Rescue | **BUYER PATH READY / RECORDING READY** — use `/lead-rescue` and locked contact enquiry. Gateway footer SKU collision is corrected in this PR (live until merge still shows SKU titles). |
| Website Rescue | **BUYER PATH READY / RECORDING READY** — use `/website-rescue` and `/demo/website-rescue`. Hero SKU-title collision is corrected in this PR (live until merge still shows *Starting path: Premium Landing Page Rescue*). |

**Delivery Reality:** local fix exists on this branch. Not merged, not deployed, not live-verified for the footer/hero copy change. Operational completion stays **PARTIAL** until Anton merges and the Production spine serves this commit.

## Quality gate (self-check)

- Audience: owner/manager buyers for the two launch products.
- Stage: conversion / recording.
- Commercial outcome: a navigable enquiry path that can be recorded without mixed product names.
- Score (copy/navigation only): Strategic 2, Message 2, Proof 2, Scannability 2, Visual 1 (no redesign), Conversion 2, Channel 2 → **13 / 14**.
