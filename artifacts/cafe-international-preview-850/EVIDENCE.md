# Café International — #850 owner-review evidence

**Verdict:** READY FOR OWNER REVIEW  
**Owner-handable URL:** https://corpflowai.com/demo/cafe-international  
**Draft PR:** https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/851  
**Commit SHA:** `2feb0343301863cd0811552f49608bbf10b7df1d` (implementation: `3d9dbbd06c8f93452c8cf09c2553faa90d326ca1`)

## Surfaces (all 200)

| Path | Role |
|------|------|
| `/demo/cafe-international` | Homepage |
| `/demo/cafe-international/menu` | Crawlable menu |
| `/demo/cafe-international/steaks-and-grill` | Grill destination |
| `/demo/cafe-international/takeaway` | WhatsApp + phone only |
| `/demo/cafe-international/about` | Since 2009 story |
| `/demo/cafe-international/visit` | Address + hours |
| `/demo/cafe-international/contact` | Booking vs takeaway |

## Local verification (this PR)

Base: `http://127.0.0.1:3010`  
Screenshots: `artifacts/cafe-international-preview-850/screenshots/`  
Checks JSON: `artifacts/cafe-international-preview-850/checks.json`

| Check | Result |
|-------|--------|
| Unit tests `cafe-international-preview.test.mjs` | **PASS** 12/12 |
| Agent CI `test` on PR #851 | **PASS** |
| Homepage owner story + menu preview | **PASS** |
| Menu crawlable HTML (203 items / 192 prices) | **PASS** |
| Menu JSON-LD + Restaurant `hasMenu` | **PASS** |
| Booking = phone + chat bridge | **PASS** |
| Takeaway = WhatsApp + phone; no chat CTA | **PASS** |
| Facts: Royal Road / Trou aux Biches / +230 5765 8735 | **PASS** |
| `noindex` / no chatbot activation | **PASS** |
| Desktop + mobile screenshots | **PASS** |
| Anonymous Vercel Preview for owners | **FAIL** (Deployment Protection → Vercel login) |
| Apex demo URL anonymous | **PASS** (`corpflowai.com`) |

## Booking / takeaway separation proof

- Homepage + Contact: booking actions include `tel:+23057658735` and chat bridge to `https://cafeinternational.net/`
- Takeaway page + Contact takeaway panel: `wa.me/23057658735` + phone only
- Takeaway copy explicitly forbids website chat; no “Book via website chat” CTA on takeaway

## Menu crawlability proof

- Server-rendered category HTML with `data-cafe-menu-item` / `data-cafe-menu-price`
- Greek Salad Small = MUR 260 from live Menu-page Sheet fixture
- Menu JSON-LD `Menu` / `MenuSection` / `MenuItem` + MUR offers
- Homepage `data-cafe-home-menu-preview` shows 6 real priced samples

## #764 dependency (exact)

- No live Postgres write in this packet
- Hostname `cafe-international.corpflowai.com` still pending protected tenant provisioning
- Owner review uses path-based `/demo/cafe-international` so delivery does not wait on #764

## Protected chatbot note

- Preview does not embed or activate chatbot components
- Booking chat is an explicit bridge link only; prompts/providers/WhatsApp automation unchanged

## Screenshots

| File | What |
|------|------|
| `home-desktop-viewport.png` | First viewport — flame-grill hero |
| `home-mobile-viewport.png` | Mobile hero + Menu / Book / Takeaway dock |
| `home-desktop.png` / `home-mobile.png` | Full-page home incl. owner story + menu preview |
| `menu-desktop.png` / `menu-mobile.png` | Crawlable categories + Order on WhatsApp |
| `takeaway-desktop.png` | WhatsApp/phone takeaway path |
| `contact-desktop.png` | Booking vs takeaway split |

## Promptfoo / AI eval evidence

```text
Promptfoo / AI eval evidence:
- npm run eval:ai: NOT APPLICABLE
- reason if NOT APPLICABLE: Static Website Rescue preview UI + fixtures/schema only; no AI drafting, prompts, chatbot activation, model routing, escalation, or protected-action handling changed.
- cases affected: none
- new cases added: none
- artifact path, if generated: artifacts/cafe-international-preview-850/
- live-model eval used: NO
```

## Final line for #850

`CAFE INTERNATIONAL PREVIEW READY FOR OWNER REVIEW — https://corpflowai.com/demo/cafe-international`
