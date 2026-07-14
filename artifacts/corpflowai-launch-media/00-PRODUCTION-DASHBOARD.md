# CorpFlowAI Launch Media — Production Dashboard

**Status:** Draft production kit — **no publishing authorized**  
**Workstream:** Stream B (HeyGen + Canva launch media factory)  
**Branch:** `docs/corpflowai-launch-media-production-kit`  
**Owner:** Anton (operator gates) · Cursor (draft assembly)

---

## Purpose

Single operator view for producing CorpFlowAI launch video and static media using HeyGen (avatar) and Canva (graphics). This kit contains scripts, storyboards, template specs, and export rules only — **no renders, no Canva login, no publish actions**.

---

## Kit inventory

| ID | Asset | Folder | Duration | Primary platform | Status |
|----|-------|--------|----------|------------------|--------|
| V01 | Flagship — bounded delivery in days | `04-FLAGSHIP-VIDEO/` | 75–90s | YouTube, LinkedIn, site hero | Draft |
| V02 | AI Lead Rescue Sprint | `05-OFFER-VIDEOS/ai-lead-rescue/` | 30–45s | Offer page, LinkedIn, IG Reels | Draft |
| V03 | Premium Landing Page Rescue | `05-OFFER-VIDEOS/premium-landing-page-rescue/` | 30–45s | Offer page, LinkedIn, IG Reels | Draft |
| V04 | Customer Recovery & Reputation Management Sprint | `05-OFFER-VIDEOS/customer-reputation-recovery/` | 30–45s | Offer page, LinkedIn, IG Reels | Draft |
| V05 | How CorpFlowAI delivery works | `07-PROCESS-EXPLAINER/` | 60s | YouTube, LinkedIn, site | Draft |
| V06 | What happens after discovery request | `08-DISCOVERY-JOURNEY-VIDEO/` | 45–60s | Contact funnel, LinkedIn | Draft |
| V07 | Founder / operator introduction | `09-FOUNDER-INTRODUCTION/` | 45–60s | About, LinkedIn, YouTube | Draft |
| S01–S06 | Six vertical shorts | `06-SHORT-FORM-CLIPS/` | 15–30s each | Reels, Shorts, TikTok, LI | Draft |
| C01–C15 | Canva template specs | `10-CANVA-TEMPLATES/` | n/a | Social, web, YouTube | Draft |
| T01–T08 | Thumbnail / cover specs | `11-THUMBNAILS-AND-COVERS/` | n/a | YouTube, social | Draft |

Full manifest: `14-ASSET-MANIFEST.md`  
Export dimensions and codecs: `12-EXPORT-MATRIX.md`  
Pre-publish gates: `13-PUBLISHING-CHECKLIST.md`

---

## Production pipeline (operator order)

```text
1. Anton gates (avatar, voice, consent, logo, CTA) — see NEEDS_ANTON below
2. HeyGen: create avatar from 02-HEYGEN-AVATAR-BRIEF + consent recording
3. HeyGen: assign voice per 03-VOICE-AND-DELIVERY-GUIDE
4. Per-video: paste script → apply production sheet → render master 16:9
5. Derive 1:1 and 9:16 cuts per 12-EXPORT-MATRIX.md
6. Canva: build templates from 10-CANVA-TEMPLATES/ specs
7. Thumbnails from 11-THUMBNAILS-AND-COVERS/
8. Run 13-PUBLISHING-CHECKLIST.md before any external post
```

---

## Brand quick reference

| Token | Value | Use |
|-------|-------|-----|
| Accent teal | `#2dd4bf` | Highlights, badges, progress |
| Dark background | `#06111f` | Video lower-thirds, Canva bg |
| Text | `#eef6ff` | Primary copy on dark |
| Link accent | `#7dd3fc` | URLs, secondary emphasis |

**Primary discovery CTA:** `https://corpflowai.com/contact#discovery`  
**Offer CTAs:** respective `/offers/*` pages (see `01-BRAND-AND-MESSAGE-GUIDE.md`)

---

## Live offers (Mauritius sprints)

| Offer | From | Deposit | URL |
|-------|------|---------|-----|
| AI Lead Rescue Sprint | MUR 35,000 | 50% before work | `/offers/ai-lead-rescue` |
| Premium Landing Page Rescue | MUR 45,000 | 50% before build | `/offers/premium-landing-page-rescue` |
| Customer Recovery & Reputation Management Sprint | MUR 45,000 | 50% before recovery | `/offers/customer-reputation-recovery` |

**USD 150 pilot** (AI Lead Rescue wedge) is a **separate path** — may appear briefly in flagship only; never mix as sprint price.

---

## NEEDS_ANTON — operator gates

These block **final render** and **external publish**. Recommended defaults apply if delayed (see `ANTON-CAPTURE-CHECKLIST.md`).

| Gate | What Anton provides | Blocks | Default if delayed |
|------|---------------------|--------|-------------------|
| **A1** | Approved HeyGen avatar + consent recording | HeyGen avatar creation | Use HeyGen stock professional avatar (male/female business casual); label synthetic in captions |
| **A2** | Approved voice + delivery style sign-off | Voice assignment | HeyGen default English (US) professional male; calm pace 140 wpm |
| **A3** | Founder intro: avatar-only vs live recording | V07 final master | Avatar-only draft; swap when live recording available |
| **A4** | Final logo lockup (SVG/PNG) | Canva brand kit import | Text wordmark "CorpFlowAI" in Inter Bold until logo supplied |
| **A5** | Final CTA URL confirmation per asset | Publish | Use kit defaults (`contact#discovery` + offer URLs above) |
| **A6** | Contact details on end cards (email/phone if any) | End-card publish | Discovery form only — no phone on video until confirmed |

**Capture checklist:** `ANTON-CAPTURE-CHECKLIST.md`

---

## Forbidden in all assets

- Guaranteed revenue or ROI claims  
- Fake testimonials or fabricated metrics  
- "AI replaces your staff" framing  
- Unauthorised client names or logos  
- Bank details or payment instructions in video  
- Payment claims beyond "50% deposit; work after cleared funds"

---

## Quality gate

Target **≥ 12/14** per `docs/marketing/04_DELIVERY_QUALITY_GATE.md` before publish.  
Doctrine: `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md`

---

## Changelog

See `15-PRODUCTION-CHANGELOG.md`
