# CorpFlowAI candidate brand asset inventory

**Status:** preview correction (white-background favicon)  
**PR:** #608  
**Decision inputs:** Anton confirmed ownership of the split human/AI mark family, selected **mark-only** placement, then rejected the recreated SVG/teal-reading favicon and required regeneration from the approved raster with a **preserved white background**.

> Do not paste absolute local workstation paths into runtime code, manifests, or PR body deploy notes.

## Cause of the rejected coloured-background favicon

| Item | Detail |
|------|--------|
| Bad source | `public/brand/corpflowai/corpflowai-mark.svg` (agent recreation; not Anton’s artwork) |
| Bad processing | SVG rendered to PNG with **transparent** corners outside the rounded tile |
| Observable failure | Browser tabs showed a solid teal/coloured square (no white surround); Anton rejected Preview evidence |
| Correction | Use Anton’s approved raster; composite transparent pixels to **opaque white** only; remove the SVG; regenerate all technical sizes |

## Canonical selection (current)

| Role | Selection | Why |
|------|-----------|-----|
| Favicon / app icon master | `corpflowai-favicon-approved-source.png` | Exact Anton-approved raster family from PR attachment, white surround preserved |
| Earlier SVG mark | **Removed** | Rejected recreation |
| Horizontal / stacked logos | Not integrated | Mark-only decision |
| Header / footer | Text wordmark unchanged | Explicit scope |

## Files shipped in-repo (`public/brand/corpflowai/`)

| File | Purpose |
|------|---------|
| `corpflowai-favicon-approved-source.png` | Canonical white-background master (512×512) |
| `corpflowai-mark.png` | Same master (runtime alias) |
| `favicon.ico` | Multi-size ICO (16 / 32 / 48) |
| `favicon-16x16.png` | Tab icon |
| `favicon-32x32.png` | Tab icon |
| `apple-touch-icon.png` | 180×180 |
| `android-chrome-192x192.png` | Manifest / Android |
| `android-chrome-512x512.png` | Manifest / Android |
| `site.webmanifest` | CorpFlowAI name + navy theme `#06111f` (theme-color does **not** paint the favicon image) |

## Host / tenant boundary

CorpFlowAI business hosts only via `shouldEmitCorpFlowBrandAssets`. Core, LuxeMaurice, Living Word Mauritius, and other tenant hosts **must not** inherit these icons. No root `public/favicon.ico`. No `_document.js` icon links.

## Explicit non-goals

- No header/footer image logo replacement
- No new brand palette
- No AI redraw / SVG reinterpretation of the mark
- No production deploy in this packet
