# CorpFlowAI business brand icons

Canonical mark-only favicons for **CorpFlowAI business hosts** only.

- Master: `corpflowai-favicon-approved-source.png` (Anton pack + opaque white alpha bake).
- Do **not** add a root `public/favicon.ico` — that would leak onto Core / tenants.
- Emit only via `CorpFlowBrandMetadata` + `shouldEmitCorpFlowBrandAssets`.
- Do not redraw or SVG-trace this mark.
