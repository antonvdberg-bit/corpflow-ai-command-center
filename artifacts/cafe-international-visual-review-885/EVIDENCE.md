# Café International — #885 owner favourites + Restaurant Guru evidence

**Final verdict:** READY FOR ANTON VISUAL REVIEW

## Identifiers

| Field | Value |
|-------|-------|
| Issue | #885 (source #872 / merged PR #873) |
| PR | #901 |
| Branch | `cursor/dispatcher-issue-885-de99` |
| Environment | corpflow_test |
| Local preview | `http://127.0.0.1:3010/demo/cafe-international` |
| Owner-handable after merge | `https://corpflowai.com/demo/cafe-international` |

## Acceptance checklist

| Requirement | Result | Evidence |
|-------------|--------|----------|
| Home category-led favourites + Sheet starting prices | PASS | home-featured-favourites.png + tests |
| Takeaway plural/category favourites + Sheet starting prices | PASS | takeaway-featured.png + tests |
| No fixed portion/size implied when sizes vary | PASS | all prices use `from Rs …`; no gram SKUs in cards |
| Restaurant Guru official award ribbon reused | PASS | `awards.infcdn.net/2024/circle_v2.css` + `#circle-r-ribbon` from live cafeinternational.net |
| RG proof near favourites/booking decision | PASS | home-rg-social-proof.png |
| Listing votes + aggregate sources + direct link | PASS | 971 votes snapshot 2026-08-12; Google/Trip/Facebook/Foursquare |
| RG treatment does not block page load | PASS | `rg-render-check.json` loadMs ≈ 1.4s; CSS/SVG only (no script loader) |
| Hero Best Steaks badge preserved | PASS | hasBadge=true; hero still uses badge PNG + listing link |
| Menu / Visit / About / channel boundaries preserved | PASS | regression tests |
| Desktop + mobile Home + Takeaway screenshots | PASS | `screenshots/` |
| Draft PR only / no agent merge | PASS | PR #901 draft |

## Restaurant Guru embed decision

**Identified official embed:** Best Steaks 2025 circle-ribbon already published on `cafeinternational.net` via GoHighLevel custom code:

- CSS: `https://awards.infcdn.net/2024/circle_v2.css` (public CDN, CORS `*`)
- Markup: `#circle-r-ribbon` SVG/HTML (static; click opens listing)

**Reused directly** beside Featured favourites. No paid dependency. No Awards Center account step required for this existing surface.

**Not used:** fabricated review scrapers, invented iframe feeds, or Awards Center–gated custom review widgets beyond the public award ribbon already on the live site.

## Favourites grounding (Sheet)

Home starting prices resolved from `fixtures/website-rescue/cafe-international-menu-preview.json`:

| Card | from Rs | Sheet basis |
|------|---------|-------------|
| Beef Steaks | 1,050 | min Fillet/Ribeye/Sirloin grill rows (Sirloin 250g) |
| Steak & Ribs | 1,450 | min Pork Ribs and Beef* platters (Sirloin combo) |
| Pork Ribs | 1,150 | min grill Pork Ribs sizes (500g) |
| Burgers | 180 | min Build a Burger rows |
| Buffalo Wings & Onion Rings | 200 | min(Onion Rings 200, Buffalo Wings starter 250) |
| Chicken Fillet | 650 | grill Chicken Fillet |

Takeaway:

| Card | from Rs | Sheet basis |
|------|---------|-------------|
| Burgers | 180 | Build a Burger min |
| Steaks | 1,050 | grill beef steak min |
| Buffalo Wings | 250 | starters Buffalo Wings |
| Onion Rings | 200 | starters Onion Rings |
| Greek Salads | 260 | Greek Salad Small |
| Pork Ribs | 1,150 | grill Pork Ribs min |

## Tests

```bash
node --test node-tests/cafe-international-preview.test.mjs
```

Result: **PASS** (27/27)

## Screenshots

Under `artifacts/cafe-international-visual-review-885/screenshots/`:

| File | What |
|------|------|
| `home-desktop-viewport.png` | Home first viewport |
| `home-featured-favourites.png` | Category favourites + RG proof |
| `home-rg-social-proof.png` | Official ribbon + votes panel |
| `home-mobile-viewport.png` | Mobile home |
| `home-mobile-favourites-rg.png` | Mobile favourites / RG |
| `home-mobile-rg-only.png` | Mobile RG panel focused |
| `takeaway-desktop-viewport.png` | Takeaway journey |
| `takeaway-featured.png` | Category takeaway favourites |
| `takeaway-mobile-viewport.png` | Mobile takeaway |
| `takeaway-mobile-featured.png` | Mobile takeaway favourites |

## corpflow_test runtime note

Draft PR only. Live apex demo still serves merged `main` until Anton merges and Vercel Production deploys. Local 200s + screenshots prove branch behaviour.

```text
Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: Static Website Rescue preview UI/content merchandising and third-party award/listing social proof only; no AI drafting, prompts, chatbot activation, model routing, escalation, tenancy, or protected-action handling changed.
- cases affected: none
- new cases added: none
- artifact path, if generated: artifacts/cafe-international-visual-review-885/
- live-model eval used: NO
```
