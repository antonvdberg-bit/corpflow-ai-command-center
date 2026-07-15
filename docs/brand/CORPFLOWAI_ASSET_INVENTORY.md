# CorpFlowAI candidate brand asset inventory

**Status:** preview integration (mark-only)  
**Decision inputs:** Anton confirmed ownership/approval of the split human/AI mark family and selected **mark-only** placement (favicon / app icons; retain text wordmark in header/footer).  
**Scope:** CorpFlowAI business surfaces only. No LuxeMaurice, Living Word Mauritius, Core, or other tenant branding changes.

> Do not paste absolute local workstation paths into runtime code, manifests, or PR body deploy notes.

## Canonical selection (this PR)

| Role | Selection | Why |
|------|-----------|-----|
| Icon / favicon master | Split human/AI rounded-square mark | Matches Anton’s proposed favicon; remains recognisable at 32×32 and acceptable at 16×16 on the contact sheet |
| Horizontal logo | Not integrated | Explicit Anton choice: keep existing text wordmark |
| Stacked logo | Not integrated | Same |
| Social OG card from logo | Not generated | Route-specific photographic OG images already exist; no approved composite OG treatment |

### Cloud-workspace note

Candidate source rasters were inventoried on the operator workstation during the planning pass. This cloud runner could not read that private Images folder, so a **lossless SVG recreation** of the approved mark (`public/brand/corpflowai/corpflowai-mark.svg`) was authored from the visual evidence of the approved icon family, then rasterised to the web set. Anton should confirm visual fidelity on the Preview URL before merge.

## Candidate inventory (planning pass)

Private/profile/personal photos were listed only as **out of scope / do not copy** and are not described further.

| Filename (basename) | Type | Dimensions | Transparency | Intended use | Classification |
|---------------------|------|------------|--------------|--------------|----------------|
| `android-chrome-512x512.png` | PNG | 512×512 | Yes (ARGB) | App icon master | **Canonical mark candidate** / favicon source |
| `android-chrome-192x192.png` | PNG | 192×192 | Yes | Android / PWA icon | Icon-only mark (derived pack) |
| `apple-touch-icon.png` | PNG | 180×180 | Yes | iOS home screen | Icon-only mark (derived pack) |
| `favicon-32x32.png` | PNG | 32×32 | Yes | Browser tab | Favicon candidate (recognisable) |
| `favicon-16x16.png` | PNG | 16×16 | Yes | Browser tab | Favicon candidate (muddy; regenerate) |
| `favicon.ico` | ICO | 48×48 shown | Yes | Legacy favicon | Favicon pack (regenerate multi-size) |
| `favicon.png` | PNG | 217×222 | Yes | Source mark / favicon | Icon-only mark |
| `favicon.jpg` | JPG | 218×222 | No | Low-quality source | Obsolete for final favicon (no alpha) |
| `Logo Small BK.jpg` | JPG | 2475×788 | No | Horizontal lockup on dark | Horizontal logo / dark-background variant |
| `Logo Small.jpg` | JPG | 824×224 | No | Horizontal lockup on light | Horizontal logo / light-background variant |
| `LogoSQBK.png` | PNG | 2475×2475 | Yes | Square/dark lockup | Horizontal-or-square dark variant (large) |
| `Logo SQ WBG.jpg` | JPG | 2834×2834 | No | Square on white | Light-background square / logo |
| `Logo SQ Justified WBG.png` | PNG | 4000×4000 | No | Stacked icon over wordmark | Stacked logo |
| `zm48z1sfvxrmt0cwk2maqhygkw_result_0.png` | PNG | 1896×1896 | No | Generated dark lockup | Duplicate / generative variant of horizontal dark lockup |
| `site.webmanifest` | JSON | n/a | n/a | PWA manifest stub | Incomplete (`name` empty; theme white) — superseded |
| `30741c5df87656e901b06c5ee6255120.ico/*` | PNG/ICO/XML | multiple | mixed | RealFaviconGenerator pack | Duplicate/obsolete generated pack |
| `Logo.pptx` | PPTX | n/a | n/a | Design source deck | Not a web runtime asset |
| `CorpFlowAI Website.png` / `Change Workflow.png` | PNG | large screenshots | mixed | Reference / slide art | Not favicon/logo masters |
| Profile / avatar images | JPG/PNG | various | mixed | People photography | **Out of scope — not copied** |

## Uncertainty flags

- No original SVG existed in the candidate folder; highest-quality runtime masters were raster.
- Multiple horizontal/stacked lockups overlap; without Anton’s mark-only decision they would be an approval gate.
- Generative-looking filenames (`zm48z…`, RealFavicon hash folder) are treated as **derived**, not masters.
- 16×16 from the old pack was muddy; this PR regenerates sizes from the mark master and includes a contact sheet for Anton review.

## Files shipped in-repo (`public/brand/corpflowai/`)

| File | Purpose |
|------|---------|
| `corpflowai-mark.svg` | Maintainable mark master (vector) |
| `corpflowai-mark.png` | 512×512 PNG mark |
| `favicon.ico` | Multi-size ICO (16 / 32 / 48 PNG frames) |
| `favicon-16x16.png` | Tab icon |
| `favicon-32x32.png` | Tab icon |
| `apple-touch-icon.png` | 180×180 |
| `android-chrome-192x192.png` | Manifest / Android |
| `android-chrome-512x512.png` | Manifest / Android |
| `site.webmanifest` | CorpFlowAI name + navy theme `#06111f` |

## Explicit non-goals

- No header/footer image logo replacement
- No new brand palette
- No root `public/favicon.ico` (would leak to every hostname)
- No Core / Lux / Living Word metadata changes
- No production deploy in this packet
