# Café International — #860 / #855 corrective pass evidence

**Final verdict:** READY FOR ANTON VISUAL REVIEW

## Identifiers

| Field | Value |
|-------|-------|
| Issue | #860 (source #855, controller #850) |
| Branch | `cursor/dispatcher-issue-860-3539` |
| Draft PR | https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/861 |
| Head SHA (pre-evidence polish) | see git log on branch |
| Environment | corpflow_test |
| Local preview | `http://127.0.0.1:3010/demo/cafe-international` |
| Owner-handable after merge | `https://corpflowai.com/demo/cafe-international` |

## Acceptance checklist

| Requirement | Result | Evidence |
|-------------|--------|----------|
| Nav Home \| Menu \| Visit \| Takeaway \| About | PASS | DOM + screenshots; no Steaks & Grill / Contact in primary nav |
| Visit = phone + website chat | PASS | Homepage journey + `/visit#book` |
| Takeaway = WhatsApp + phone only | PASS | Journey + takeaway page; chat not offered |
| Badge inside hero brand card | PASS | `badgeInsideGlass=true`; viewport screenshots |
| Real client food-motion | PASS | `food-motion.mp4` from Drive *Cafe International Real food.mp4* |
| Exact menu intro wording | PASS | menu-desktop.png |
| sr-only helper text not visible | PASS | `sr-only-check.json` clip/1×1 |
| Drinks fixture refreshed | PASS | Blue Marlin Small Rs 150; House Red glass Rs 280; 87 drinks |
| No agent merge / deploy / secrets / schema / sends | PASS | Draft PR only |

## Tests

```bash
node --test node-tests/cafe-international-preview.test.mjs
```

Result: **PASS** (20/20)

## Screenshots

Under `artifacts/cafe-international-visual-review-860/screenshots/`:

| File | What |
|------|------|
| `home-desktop-viewport.png` | Hero + glass brand card + badge inside card + approved nav |
| `home-mobile-viewport.png` | Mobile hero + Book/Takeaway dock → Visit/Takeaway |
| `home-desktop.png` / `home-mobile.png` | Full-page scroll |
| `home-food-motion.png` | Near-fold client food-motion frame |
| `home-journey.png` | Single Visit/Book + Takeaway section with hours folded in |
| `menu-desktop.png` | Exact approved intro wording |
| `menu-drinks-beers.png` / `menu-drinks-wines.png` | Refreshed drinks prices |
| `takeaway-desktop.png` | WhatsApp/phone takeaway path |
| `visit-desktop.png` | Enriched Visit / dine-in journey |

## Motion provenance

- Drive folder: https://drive.google.com/drive/folders/1Ws9ylnyusEz8LOfaUFz5ug6L1TPKsOUW
- Source used: `Cafe International Real food.mp4` (file id `1aMb5AW4BQGT4Y2xRG19OYn7L-v92faGO`)
- Web assets: `public/assets/cafe-international/client/food-motion.mp4` + `food-motion-poster.jpg`
- Visit atmosphere: `Cafe Int People Buzz.mp4` → `venue-buzz-motion.mp4`
- Named #855 candidates (`Upgrade 1 jun 26.mp4`, `Perfection Jun 26.mp4`, `Platter Party.mp4`) were **not present** in the Drive folder at capture (2026-08-10)

## corpflow_test runtime note

This packet opens a **draft PR only**. Live apex demo still serves merged `main` until Anton merges and Vercel Production deploys. Local 200s + screenshots prove the branch behaviour.

```text
Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: Static Website Rescue preview UI, fixtures, and client media only; no AI drafting, prompts, chatbot activation, model routing, escalation, tenancy, or protected-action handling changed.
- cases affected: none
- new cases added: none
- artifact path, if generated: artifacts/cafe-international-visual-review-860/
- live-model eval used: NO
```
