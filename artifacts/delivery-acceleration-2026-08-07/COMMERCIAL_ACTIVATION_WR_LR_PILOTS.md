# Commercial activation packet — one WR + one LR pilot

**Date:** 2026-08-07  
**Status:** Operator-ready for Anton approval only. **Do not send externally.** No paid accounts. No protected actions executed.

LR/WR unit-gate remains **PASS** (see prior 7 Aug packet). No further technical refinement in this packet.

---

## 1) Website Rescue pilot — Café International

| Field | Value |
|-------|-------|
| Target / profile | Dion & Anna-Marie — Café International (Trou aux Biches grill); existing client migration Pilot 01 (#760) |
| Offer | Website Rescue / Premium Landing Page Rescue (existing public offer) |
| Client-facing URL / demo | **Preview (this PR):** `/demo/cafe-international` on Vercel preview after deploy; public offer: `https://corpflowai.com/offers/premium-landing-page-rescue` + fictional demo `https://corpflowai.com/demo/website-rescue` |
| Price / proposal | Use existing WR commercial path (#714 rail). No new price invented here. |
| Missing blocker | Owner review of Café preview; optional later: #764 tenant hostname (not required for this path-based preview) |
| Exact next human action | Anton opens preview URL → sends **owner-review questions** (max 5, in PR) to Dion/Anna-Marie via his usual channel — **or** approves next build fill (menu sheet snapshot) |

---

## 2) Lead Rescue pilot — first paid / warm network

| Field | Value |
|-------|-------|
| Target / profile | One warm-network prospect who is losing/mishandling enquiries (launch pack: USD 150 / 48-hour setup) |
| Offer | AI Lead Rescue — `https://corpflowai.com/lead-rescue` |
| Client-facing URL / demo | `https://corpflowai.com/lead-rescue` + intake; deep-link from home: `/contact?path=client-lead-service#discovery` (**#794 live PASS**) |
| Price / proposal | **USD 150 launch pilot** (approved launch pack). Manual pro-forma path. |
| Missing blocker | Anton chooses the specific warm contact and sends; no cold scrape / bulk send |
| Exact next human action | Anton picks one name from warm network → uses outreach script in `docs/sales/AI_LEAD_RESCUE_OUTREACH_SCRIPTS.md` → books 15-min discovery |

---

## Explicit non-actions

- No external send from this agent  
- No GoHighLevel / chatbot / WhatsApp automation changes  
- No DNS / client-domain cutover  
- No production DB/schema/env/secrets changes  
