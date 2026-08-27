# Website Rescue — video production packet v1

**Status:** Phase A machine-executable packet for [#1143](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1143) / parent [#1078](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1078).  
**Reconciles:** [#700](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/700) Website Rescue video storyboard against the verified named path from [#1127](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1127) / PR [#1129](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/1129).  
**Environment:** repo / current `main` only. No live HeyGen call, no spend, no publication.  
**Anchor sentinel:** `<!-- WEBSITE_RESCUE_VIDEO_PRODUCTION_PACKET_V1 -->`

<!-- WEBSITE_RESCUE_VIDEO_PRODUCTION_PACKET_V1 -->

This is the **#700 Phase 4 production packet** for Website Rescue, updated only where the current verified screens changed. It is **not** a new marketing campaign and **not** a generic video platform.

## What changed versus the 2026 launch-media V03 sheet

The older kit at `artifacts/corpflowai-launch-media/05-OFFER-VIDEOS/premium-landing-page-rescue/` treated **Premium Landing Page Rescue** and `https://corpflowai.com/offers/premium-landing-page-rescue` as the recording identity.

Current verified buyer path (#1127 / PR #1129):

| Field | Record this | Do not record as the launch path |
|-------|-------------|-------------------------------|
| Product name | **Website Rescue** | SKU title **Premium Landing Page Rescue** |
| Landing | `https://corpflowai.com/website-rescue` | `https://corpflowai.com/offers/premium-landing-page-rescue` |
| Proof | `https://corpflowai.com/demo/website-rescue` | “Video coming soon” tiles |
| Primary CTA | **Request discovery** | Choose payment path / SKU-title CTA |
| Enquiry | `/website-rescue#discovery` (SKU lock remains `premium-landing-page-rescue`) | Submitting a live form on camera |

V03 remains historical. New renders must use the machine specs below.

## The two launch videos (#1078)

| Id | Title | Role | Duration | Spec |
|----|-------|------|----------|------|
| `cf-vid-wr-what-it-does` | Website Rescue — What It Does | launch | 60–90s | `data/video-factory/specs/cf-vid-wr-what-it-does.v1.json` |
| `cf-vid-wr-before-after-enquiry` | Website Rescue — Before, After and Enquiry Flow | launch | 60–90s | `data/video-factory/specs/cf-vid-wr-before-after-enquiry.v1.json` |
| `cf-vid-wr-calibration-20s` | 20–30 second calibration | calibration | 20–30s | `data/video-factory/specs/cf-vid-wr-calibration-20s.v1.json` (**blocked** until Phase B) |

Contract: `config/video-factory/video-spec.schema.json`.

## Recording-ready shot matrix (Website Rescue only)

Copied from the #1127 / PR #1129 verification matrix so this packet does not depend on that PR remaining open. Target duration 60–90 seconds per launch video (#700). Desktop ≈1440px and mobile ≈390px. Do **not** submit a live enquiry on camera.

| Shot | Screen | URL / in-page target | What to show | Do not show |
|------|--------|----------------------|--------------|-------------|
| 1 | Gateway | `https://corpflowai.com/` | Nav **Website Rescue** | SKU title as the product name |
| 2 | Product hero | `/website-rescue` | H1 enquiry-path rescue; **Request discovery**; starting-from MUR 45,000 after intent | `/offers/premium-landing-page-rescue` as the recording URL |
| 3 | Proof — demo | `/demo/website-rescue` | Before → After toggle; Harbour Hospitality fictional business | Live client site, invented metrics |
| 4 | Demo enquiry label | `#demo-enquiry` | Form heading **Request discovery — Website Rescue** | Submitting the form |
| 5 | Offer proof + FAQ | `/website-rescue` proof band | **Open the Website Rescue demo** link; included / not included | “Video coming soon” tiles as the product demo |
| 6 | Enquiry | `/website-rescue#discovery` | Labelled Website Rescue discovery; no-auto-send copy | Payment / card collection |

Video 1 uses shots 1, 2, 5, 6. Video 2 uses shots 1–6 with the demo as the centre.

## Safe-claims and privacy (non-negotiable)

- Required trust line: **We do not guarantee new revenue.**
- No invented testimonials, logos, conversion percentages, or client endorsements.
- Demo business **Harbour Hospitality Supplies** is fictional and must be labelled fictional on screen.
- No real tenant data, Telegram IDs, or private emails.
- Disclose **AI-assisted presenter**.
- Primary CTA remains **Request discovery** — never **Choose payment path**.

## Operator commands (zero-spend)

```bash
npm run video-factory:validate
npm run video-factory:heygen-dry-run -- --id cf-vid-wr-what-it-does
npm run video-factory:qc -- --id cf-vid-wr-what-it-does --fixture pass
```

Live vendor generate is refused with `LIVE_HEYGEN_CALL_BLOCKED`. Phase B activation is a separate protected packet: `docs/operations/HEYGEN_CALIBRATION_ACTIVATION_PACKET_V1.md`.

## Publication

Prepare-only. No website embed, no YouTube upload, no auto-publish. Anton approval remains the gate after QC.

## Quality gate (self-check)

- Audience: owner/manager buyers for Website Rescue.
- Stage: production spec / recording packet (not a live public page change).
- Commercial outcome: two implementation-ready launch videos plus a blocked calibration cut.
- Score: Strategic 2, Message 2, Proof 2, Scannability 2, Visual 1 (spec/docs only), Conversion 2, Channel 2 → **13 / 14**.
