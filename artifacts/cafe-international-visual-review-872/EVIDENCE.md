# Café International — #872 / #871 corrective pass evidence

**Final verdict:** READY FOR ANTON VISUAL REVIEW

## Identifiers

| Field | Value |
|-------|-------|
| Issue | #872 (source #871, baseline PR #861, controller #850) |
| Branch | `cursor/dispatcher-issue-872-1985` |
| Environment | corpflow_test |
| Local preview | `http://127.0.0.1:3010/demo/cafe-international` |
| Owner-handable after merge | `https://corpflowai.com/demo/cafe-international` |

## Acceptance checklist

| Requirement | Result | Evidence |
|-------------|--------|----------|
| Hero brand card uses available ~1100px container width (not ~640px) | PASS | `hero-layout-check.json` glassWidth ≈ 1146; screenshots |
| Best Steaks badge integrated at far right on desktop | PASS | `badgeInsideGlass=true`, `badgeOnRight=true`; home-hero-brand-card.png |
| Mobile stacked badge treatment | PASS | home-mobile-viewport.png |
| foodMotion + venueBuzzMotion audio track verification | PASS | ffprobe: **video-only, no audio** on both files — muted autoplay unchanged; no unmute control added |
| Homepage Featured favourites (no unsupported demand claims) | PASS | home-featured-favourites.png + tests |
| Takeaway one browse → WhatsApp/phone → collect journey | PASS | takeaway-desktop/mobile screenshots |
| Platters meaningful takeaway prominence | PASS | takeaway-featured.png + platters-first selector |
| About includes restaurant-front exterior | PASS | venue-patio.jpg on About; about-desktop/mobile |
| Menu + Visit preserved | PASS | menu/visit viewport screenshots + regression tests |
| No agent merge / deploy / secrets / schema / sends | PASS | Draft PR only |

## Media audio verification (#871 §2)

```text
ffprobe -show_entries stream=codec_type food-motion.mp4
→ video

ffprobe -show_entries stream=codec_type venue-buzz-motion.mp4
→ video
```

Neither current source file contains an audio track. Muted autoplay / loop / playsInline behaviour is left unchanged. Anton can source alternate footage with audio later if desired.

## Tests

```bash
node --test node-tests/cafe-international-preview.test.mjs
```

Result: **PASS** (26/26)

## Screenshots

Under `artifacts/cafe-international-visual-review-872/screenshots/`:

| File | What |
|------|------|
| `home-desktop-viewport.png` | Wide hero brand card + badge on far right |
| `home-mobile-viewport.png` | Stacked mobile hero + badge |
| `home-hero-brand-card.png` | Brand card + CTAs + Best Steaks trust marker |
| `home-featured-favourites.png` | Featured favourites / Popular picks |
| `takeaway-desktop-viewport.png` | Coherent browse/order/collect journey |
| `takeaway-featured.png` | Platters prominence + featured picks |
| `takeaway-mobile-viewport.png` | Mobile takeaway journey |
| `about-desktop-viewport.png` | Restaurant-front exterior imagery |
| `about-mobile-viewport.png` | Mobile About exterior + Since 2009 |
| `menu-desktop-viewport.png` / `visit-desktop-viewport.png` | Regression surfaces |

## corpflow_test runtime note

This packet opens a **draft PR only**. Live apex demo still serves merged `main` until Anton merges and Vercel Production deploys. Local 200s + screenshots prove the branch behaviour.

```text
Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: Static Website Rescue preview UI/content and client media presentation only; no AI drafting, prompts, chatbot activation, model routing, escalation, tenancy, or protected-action handling changed. Existing booking chat-bridge and takeaway WhatsApp/phone channel rules unchanged.
- cases affected: none
- new cases added: none
- artifact path, if generated: artifacts/cafe-international-visual-review-872/
- live-model eval used: NO
```
