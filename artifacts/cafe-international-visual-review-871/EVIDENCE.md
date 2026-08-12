# Café International — #871 live verification evidence

**Final verdict:** READY FOR ANTON VISUAL REVIEW

## Identifiers

| Field | Value |
|-------|-------|
| Issue | #871 (clean dispatch successor #872; baseline PR #861; controller #850) |
| Implementation PR | [#873](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/873) (merged) |
| Merge commit | `d8614884d048ca078cdea1035b92198b2f478edb` |
| This branch | `cursor/dispatcher-issue-871-f0d7` — live verification / closure evidence only |
| Environment | corpflow_test |
| Live preview | https://corpflowai.com/demo/cafe-international |

## Why this packet is evidence-only

Issue #871 was initially mis-classified with a false-positive secrets gate. Anton opened clean dispatch #872; Cursor implemented and merged PR #873. This activation of #871 finds the approved corrective UI already on `main` and live on apex. No second UI redesign is required. This PR adds fresh live screenshots + measurement so #871 can be closed against observable corpflow_test truth.

## Acceptance checklist (live)

| Requirement | Result | Evidence |
|-------------|--------|----------|
| Hero brand card uses available ~1100px container width (not ~640px) | PASS | `hero-layout-check.json` glassWidth=1146, containerWidth=1100 |
| Best Steaks badge integrated at far right on desktop | PASS | `badgeInsideGlass=true`, `badgeOnRight=true`; home-desktop-viewport.png |
| Mobile stacked badge treatment | PASS | home-mobile-viewport.png |
| foodMotion + venueBuzzMotion audio track verification | PASS | ffprobe: **video-only, no audio** on both — muted autoplay unchanged; no unmute control |
| Homepage Featured favourites (no unsupported demand claims) | PASS | live heading `Featured favourites`; prior unit tests on main |
| Takeaway one browse → WhatsApp/phone → collect journey | PASS | takeaway-desktop/mobile screenshots |
| Platters meaningful takeaway prominence | PASS | PLATTERS & GRILL tile + platters-first featured picks |
| About includes restaurant-front exterior | PASS | venue-patio.jpg on About; about-desktop/mobile |
| Menu + Visit preserved | PASS | regression suite on main (26/26) + live nav intact |
| No agent merge / deploy / secrets / schema / sends | PASS | evidence PR only |

## Media audio verification (#871 §2)

```text
ffprobe food-motion.mp4   → streams: video/h264 only
ffprobe venue-buzz-motion.mp4 → streams: video/h264 only
```

Neither current source file contains an audio track. Muted autoplay / loop / playsInline behaviour remains unchanged. Anton can source alternate footage with audio later if desired.

## Tests

```bash
node --test node-tests/cafe-international-preview.test.mjs
```

Result on this activation: **PASS** (26/26)

## Screenshots (live apex)

Under `artifacts/cafe-international-visual-review-871/screenshots/`:

| File | What |
|------|------|
| `home-desktop-viewport.png` | Wide hero brand card + badge on far right |
| `home-mobile-viewport.png` | Stacked mobile hero + badge |
| `takeaway-desktop-viewport.png` | Coherent browse/order/collect journey |
| `takeaway-mobile-viewport.png` | Mobile takeaway journey |
| `about-desktop-viewport.png` | Restaurant-front exterior imagery |
| `about-mobile-viewport.png` | Mobile About exterior |

Prior branch screenshots from the implementation PR remain at `artifacts/cafe-international-visual-review-872/`.

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES (already on main via PR #873)
- Merged to main: YES
- Production deployment ID: Vercel Production spine serving apex (x-vercel-cache: PRERENDER on demo routes)
- Commit deployed: includes merge d8614884 (corrective pass present in live HTML)
- Live URLs tested:
  - https://corpflowai.com/demo/cafe-international → 200, Featured favourites, hero brand row
  - https://corpflowai.com/demo/cafe-international/takeaway → 200, takeaway journey, WhatsApp/phone only
  - https://corpflowai.com/demo/cafe-international/about → 200, venue-patio exterior
- Expected vs actual result: all #871 approved UI/content changes present live
- Client-facing flow usable: YES (corpflow_test demo path)
- Final verdict: PARTIAL — READY FOR ANTON VISUAL REVIEW (owner visual sign-off remaining; not client_production)
```

```text
Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: Static Website Rescue preview UI/content verification only; no AI drafting, prompts, chatbot activation, model routing, escalation, tenancy, or protected-action handling changed in this evidence packet (and none changed in implementation PR #873 beyond existing booking chat-bridge / takeaway WhatsApp-phone channel rules).
- cases affected: none
- new cases added: none
- artifact path, if generated: artifacts/cafe-international-visual-review-871/
- live-model eval used: NO
```
