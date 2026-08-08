# Café International — client visual review packet

**Gate:** READY FOR OWNER REVIEW (visual) — pending Anton merge / anonymous preview URL for Dion & Anna-Marie.

## Preview URL

| Surface | URL |
|---------|-----|
| Local (verified) | `http://127.0.0.1:3010/demo/cafe-international` |
| After merge to `main` (client-handable) | `https://corpflowai.com/demo/cafe-international` |
| Vercel Preview | Branch deploy URL once PR is up — may need protection bypass for owners |

Path: `/demo/cafe-international` · `noindex` · no chatbot activation · no WhatsApp automation · no DNS cutover.

## Screenshots

Under `artifacts/cafe-international-visual-review/screenshots/`:

| File | What |
|------|------|
| `home-desktop-viewport.png` | First viewport — flame-grill hero + glass CTAs |
| `home-mobile-viewport.png` | Mobile first viewport + Book / Takeaway dock |
| `home-desktop.png` / `home-mobile.png` | Full-page scroll |
| `menu-desktop.png` | Clean category rows + one WhatsApp CTA per section |
| `menu-mobile.png` | Mobile menu scan + category WhatsApp CTA |
| `takeaway-desktop.png` | Takeaway path visual |

### Menu UX update (2026-08-08)

- Per-item WhatsApp buttons **removed**
- One WhatsApp CTA per category (e.g. Order Starters / Grill Specials / Burgers on WhatsApp)
- Cleaner name / description / price hierarchy
- Book vs Takeaway journeys unchanged

## Before → After

**Before (prior preview / live feel):** text scaffold on dark gradient; little food imagery; takeaway mixed into chat on the live site; menu CSV from Drive was outdated.

**After:** client grill photography as full-bleed hero; appetite tiles (steak, burger, chicken, platter); patio Visit band; clear Book (phone + chat bridge) vs Takeaway (WhatsApp + phone); menu prices from the **live Menu-page Google Sheet** (same feed as `cafeinternational.net/menu-page`).

## What changed

1. Strong visual treatment using **owner Drive photos** (not generic stock).
2. Homepage is appetite-led within four seconds.
3. Journey split preserved and made visual.
4. Menu source corrected to live Sheet (193 items incl. Drinks) — Drive `CafeInternational_Menu - Sheet1.csv` marked outdated.
5. Facts kept: Trou aux Biches, hours, +230 5765 8735, since 2009. No invented prices.

## Why better

Owners can see in under 15 seconds that this looks like a real restaurant site, food looks appealing, and booking vs takeaway is obvious — not a text scaffold.

## Owner-review questions (max 5)

1. Does the homepage feel like *your* Café International (flame grill + Trou aux Biches), not a generic template?
2. Is **Book a table** (phone / chat) vs **Takeaway** (WhatsApp / phone) clear enough for guests?
3. Are address, hours, and +230 5765 8735 correct?
4. Are Menu-page Sheet prices current for guest-facing use?
5. Which of your Drive photos should stay / be swapped before staff see this?

## Menu source note

Canonical prices: live GHL `/menu-page` → published Google Sheet CSV.  
See `fixtures/website-rescue/cafe-international-menu-page-SOURCE.md`.

## Promptfoo / AI eval evidence

```text
Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: Preview UI + fixture/menu snapshot only; no AI drafting, prompts, chatbot activation, model routing, or protected-action claims changed.
- cases affected: none
- new cases added: none
- artifact path, if generated: n/a
- live-model eval used: NO
```
