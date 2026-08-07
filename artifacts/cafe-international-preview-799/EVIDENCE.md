# Café International preview — evidence (#799 / #797)

**Commit:** `c7e008b355ee3abb5709a02c8e7037c792795f8e`  
**PR:** https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/799  

## Preview URLs

| URL | Status |
|-----|--------|
| `https://corpflow-ai-command-center-git-cursor-cafe-in-2d7b2b-corpflowai.vercel.app/demo/cafe-international` | Deployed (Vercel Preview Ready) but **Vercel Authentication** redirects anonymous visitors to login — **not client-handable** until bypass or merge to Production |
| Local verification | `http://127.0.0.1:3010/demo/cafe-international` — **PASS** (agent cloud) |
| After Anton merge to `main` | Expected client-handable: `https://corpflowai.com/demo/cafe-international` |

## PASS/FAIL checks

| Check | Result |
|-------|--------|
| Unit tests `cafe-international-preview.test.mjs` | **PASS** 7/7 |
| `npm run build` includes café demo routes | **PASS** |
| Homepage hero + brand | **PASS** |
| Booking = phone + chat bridge | **PASS** |
| Takeaway = WhatsApp + phone only (no chat) | **PASS** |
| Canonical facts (Trou aux Biches, hours, +230 5765 8735, since 2009) | **PASS** |
| No Grand Baie invention | **PASS** |
| Menu categories crawlable HTML; no invented MUR prices | **PASS** |
| `noindex` | **PASS** |
| No chatbot component activation | **PASS** |
| Mobile dock Menu / Book / Takeaway | **PASS** (screenshot) |
| Anonymous Vercel preview usable by owners | **FAIL** (Deployment Protection) |

## Screenshots

Under `artifacts/cafe-international-preview-799/screenshots/`:

- `home-desktop.png` / `home-mobile.png`
- `menu-desktop.png`
- `takeaway-desktop.png`
- `contact-desktop.png`

## Remaining release blockers only

1. **Anton:** merge #799 **or** provide Vercel protection bypass so Dion/Anna-Marie can open the preview without a Vercel login.  
2. Owner menu sheet snapshot (dish names / MUR prices) — content fill, not a journey blocker.  
3. Optional later: #764 tenant hostname (not required for this path preview).

## Owner-review questions (max 5)

1. Does the homepage feel like Café International (flame grill + local favourite), not a generic template?  
2. Is **Book a table** (phone / chat) vs **Takeaway** (WhatsApp / phone) clear enough?  
3. Are address, hours, and +230 5765 8735 correct?  
4. Are menu categories right before we load the owner sheet item/price snapshot?  
5. Anything that must change before you would show this to staff or guests?
