# CorpFlowAI brand assets — verification evidence (transparent-alpha repair)

**Branch:** `cursor/corpflowai-brand-assets-317d`  
**PR:** https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/608  

## Root cause

1. **Rejected earlier:** agent SVG recreation (`corpflowai-mark.svg`).
2. **Supplied pack:** Anton’s PNG/JPG attachments use **transparency** for exterior corners and connected human-face cutouts.
3. **Observable failure:** Browser tabs / dark tools did not match the supplied graphics (holes fill as black or the mark collapses).
4. **Wrong attempt avoided:** flattening the blue/teal tile to white erased the supplied composition.

## Correction

- Canonical master = Anton `android-chrome-512x512.png` with transparent pixels composited to **opaque white only** (no redraw).
- Tab / touch / Android sizes taken from Anton’s exact pack files, then the same white alpha bake.
- `favicon.ico` embeds baked 16 / 32 / 48 frames.
- Head tags + manifest use `?v=white-alpha-v5` so cached transparent icons are not reused.
- Theme-color remains navy for chrome UI only; it does **not** paint favicon pixels.

## Evidence files

- `01-approved-source-white-bg.png` (baked master)
- `android-chrome-512x512.png` / `android-chrome-192x192.png` / `apple-touch-icon.png`
- `favicon-16x16.png` / `favicon-32x32.png`
- `favicon-size-contact-sheet-white.png` (16/32/180 on light and dark)
- `approved-source/` — original Anton attachments used for the bake
- `browser-tab-screenshot.png` + strip (headed Chromium under Xvfb against local `next start`; viewport content — tab chrome not available in Playwright page screenshots)
- `favicon-tab-mock.png` + `favicon-size-light-dark-zoom.png` + `browser-tab-favicon-zoom.png` (served Anton-baked 16/32 on light and dark)
- `served-favicon-32.png` (bytes fetched from local `next start` at `?v=white-alpha-v5`)

## Host boundary

Unit tests assert Core / Lux / Living Word / other tenants do not emit `/brand/corpflowai` links; no root `favicon.ico`; Lux static HTML unchanged.

## Delivery Reality Audit

```text
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a (do not deploy)
- Commit: (see latest push on this branch)
- Preview URL: https://corpflow-ai-command-center-git-cursor-corpflo-0a45c3-corpflowai.vercel.app
- Do not reuse prior deployment IDs without a new Ready build for this commit
- Final verdict: PARTIAL (preview approval pending; no production)
```
