# CorpFlowAI candidate brand asset inventory

**Status:** preview correction (opaque white alpha bake from Anton’s raster pack)  
**PR:** #608  
**Decision inputs:** Anton confirmed ownership of the split human/AI mark family, selected **mark-only** placement, rejected the recreated SVG, and required the shipped icons to **resemble the supplied graphics**. Transparent regions in the supplied PNGs caused browser-tab deviation; those pixels are baked to **opaque white** without redrawing the blue/teal tile or face art.

> Do not paste absolute local workstation paths into runtime code, manifests, or PR body deploy notes.

## Cause of display deviation

| Item | Detail |
|------|--------|
| Bad source (earlier) | `corpflowai-mark.svg` (agent recreation; rejected) |
| Supplied pack truth | Anton’s PNG pack uses **transparency** outside the rounded tile **and** for the left (human) face cutouts connected to the exterior |
| Observable failure | Browsers / dark chrome tools fill alpha as black (or collapse the mark); tab icon no longer resembles the supplied graphics |
| Wrong intermediate | Replacing the **blue tile** with white (“white-tile”) erased the supplied composition — rejected |
| Correction | Keep Anton’s raster colours and tile; composite **transparent pixels only** onto opaque white; prefer Anton’s exact `favicon-16` / `favicon-32` / Apple / Android sizes; cache-bust head tags |

## Canonical selection (current)

| Role | Selection | Why |
|------|-----------|-----|
| Favicon / app icon master | `corpflowai-favicon-approved-source.png` | Anton `android-chrome-512x512` with white alpha bake |
| Earlier SVG mark | **Removed** | Rejected recreation |
| Horizontal / stacked logos | Not integrated | Mark-only decision |
| Header / footer | Text wordmark unchanged | Explicit scope |

## Files shipped in-repo (`public/brand/corpflowai/`)

| File | Purpose |
|------|---------|
| `corpflowai-favicon-approved-source.png` | Canonical master (512×512), opaque white exterior |
| `corpflowai-mark.png` | Same master (runtime alias) |
| `favicon.ico` | Multi-size ICO (16 / 32 / 48) from baked Anton sizes |
| `favicon-16x16.png` | Tab icon — Anton’s 16×16 + white alpha bake |
| `favicon-32x32.png` | Tab icon — Anton’s 32×32 + white alpha bake |
| `apple-touch-icon.png` | Anton’s 180×180 + white alpha bake |
| `android-chrome-192x192.png` | Anton’s 192×192 + white alpha bake |
| `android-chrome-512x512.png` | Anton’s 512×512 + white alpha bake |
| `site.webmanifest` | CorpFlowAI name + navy theme `#06111f` (theme-color does **not** paint favicon pixels) |

Head tags append `?v=` (`CORPFLOW_BRAND_ASSET_VERSION` in `lib/public/corpflow-brand-assets.js`) so preview tabs discard stale icons.

## Host / tenant boundary

CorpFlowAI business hosts only via `shouldEmitCorpFlowBrandAssets`. Core, LuxeMaurice, Living Word Mauritius, and other tenant hosts **must not** inherit these icons. No root `public/favicon.ico`. No `_document.js` icon links.

## Explicit non-goals

- No header/footer image logo replacement
- No new brand palette
- No AI redraw / SVG reinterpretation of the mark
- No production deploy in this packet
