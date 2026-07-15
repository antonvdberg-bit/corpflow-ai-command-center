# CorpFlowAI brand assets (runtime)

Host-gated favicon and app icons for the CorpFlowAI business website.

## Canonical source

- **Canonical master:** `corpflowai-favicon-approved-source.png`
- Supplied by Anton on PR #608 (approved raster attached as `android-chrome-512x512` / related pack).
- An earlier SVG recreation was **rejected** and removed.
- Derivatives are high-quality downsamples only. Transparent corners from the source pack were filled with **opaque white** (no teal/navy/theme canvas; artwork pixels unchanged).

## Host policy

- Linked only via `components/public/CorpFlowBrandMetadata.js` after `shouldEmitCorpFlowBrandAssets(host)`.
- Do **not** copy these to `public/favicon.ico` (shared deployment would leak the mark to Core/tenants).
- Header/footer continue to use the typographic wordmark.

See `docs/brand/CORPFLOWAI_ASSET_INVENTORY.md`.
