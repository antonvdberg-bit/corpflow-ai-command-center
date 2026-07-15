# CorpFlowAI brand assets — verification evidence (white-background correction)

**Branch:** `cursor/corpflowai-brand-assets-317d`  
**PR:** https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/608  

## Root cause (coloured / teal-looking favicon)

1. **Bad source:** `corpflowai-mark.svg` — agent recreation (rejected by Anton).
2. **Bad processing:** SVG → PNG kept **transparent** corners outside the rounded tile.
3. **Observable failure:** Browser tabs rendered a solid teal/coloured square without a readable white surround.

## Correction

- Canonical master is now Anton’s approved raster as `corpflowai-favicon-approved-source.png`.
- Transparent pixels were filled with **opaque white** only (no redraw; no colour rewrite of artwork).
- Rejected SVG removed.
- Regenerated: `favicon.ico` (16/32/48), `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png`, `android-chrome-192x192.png`, `android-chrome-512x512.png`.
- `theme-color` metadata remains navy for chrome UI only; it does **not** paint favicon pixels.

## Evidence files

- `01-approved-source-white-bg.png`
- `android-chrome-512x512.png` / `android-chrome-192x192.png` / `apple-touch-icon.png`
- `favicon-16x16.png` / `favicon-32x32.png`
- `favicon-size-contact-sheet-white.png` (16/32/180 on light and dark)
- `browser-tab-screenshot.png` + `browser-tab-strip.png` + `browser-tab-favicon-zoom.png` (headed Chromium under Xvfb against local `next start`)

## Host boundary

Unit tests continue to assert Core / Lux / Living Word / other tenants do not emit `/brand/corpflowai` links; no root `favicon.ico`; Lux static HTML unchanged.

## Delivery Reality Audit

```text
- Local fix exists: YES
- Merged to main: NO
- Production deployment ID: n/a (do not deploy)
- Commit: f539e14852454c110655c561a3716a1f214171b4
- Asset correction commit: 92136afa64a3e0b2bca00b5942d06b1f4e4970fc
- Preview deployment ID: AutKRbCFPeR7MdbtDzPSWwRm3BTk
- Preview URL: https://corpflow-ai-command-center-git-cursor-corpflo-0a45c3-corpflowai.vercel.app
- Do not reuse: FA2M9YQBR9FunS1Z2RYaXv5Y6NSr or earlier
- Final verdict: PARTIAL (preview approval pending)
```
