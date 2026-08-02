# #704 — Lux operator control space vs public client site

**Status:** preview / PR evidence (not production deploy)  
**NO IMPLEMENTATION AUTHORIZED beyond the Lux-conditional `/change` orientation panel.**

## Before / after (distinction)

| Surface | Who | Look / message |
|--------|-----|----------------|
| Public client site (`/`, `/concierge`, `/properties`) | Buyers | Ivory/sand editorial marketing — **unchanged by this slice** |
| Operator control space (`/change` for `luxe-maurice`) | Jan / operators | Charcoal desk + **teal steel orientation banner** stating this is **not** the public client site, plus a 6-step functional test checklist |

## What this slice adds

- `lib/client/lux-operator-control-orientation.js` — copy + checklist constants
- `components/LuxOperatorControlOrientationPanel.js` — Lux-only banner on `/change`
- `pages/change.js` — mounts panel when `luxChangeChrome` is active; clarifies header copy
- `node-tests/lux-operator-control-orientation-704.test.mjs` — acceptance guards

## What this slice does **not** change

- Public Lux marketing components / copy / visuals
- Shared Core/CRM/auth/schema/infrastructure
- Concierge email+telephone validation (#673)
- Lead status workflow stages (#673/#675) — only linked from the checklist

## Runtime evidence checklist (preview)

1. Open Lux preview `/change` while authenticated as `luxe-maurice`.
2. Confirm banner `data-testid="lux-operator-control-orientation"` is visible.
3. Confirm “This is not the public client site.” callout.
4. Confirm checklist links to `/concierge` and `#lux-crm-leads-workspace`.
5. Open `/` and `/concierge` — ivory/sand public presentation unchanged.
