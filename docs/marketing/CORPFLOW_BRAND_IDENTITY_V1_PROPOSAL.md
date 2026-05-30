# CorpFlowAI brand identity v1 — proposal (`LR-Brand-Identity-1`)

**Status (2026-05-29):**
- **Phase A** (this proposal): MERGED via PR [#267](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/267) (commit `d6efbe01`); Anton's "use defaults" reply on Operator Bridge `#249` authorised Phase B to begin.
- **Phase B step 1** (mechanical: `brand-config.json` stub + doctrine supersession note + monitoring host graduation): IN PROGRESS in PR `feat/lr-brand-identity-2-step-1-docs-and-monitoring`. Docs + config only, no runtime regression risk.
- **Phase B step 2** (self-host Inter Variable): QUEUED — awaits its own gated PR after step 1 lands.
- **Phase B step 3** (favicon + apple-touch-icon + og-image via wordmark renderer pipeline): QUEUED — awaits its own gated PR after step 2 lands.
- **Phase C** (optional SVG mark — `LR-Brand-Identity-3`): NOT AUTHORISED.
- **Phase D** (optional walkthrough rebrand — `LR-Proof-1 Phase 3`): NOT AUTHORISED.

**Why split Phase B:** § 6 of this proposal listed three commits inside Phase B. Treating them as three small gated PRs keeps each diff reviewable, lets the doctrine supersession note ship the moment it is merged (no doctrine-runtime drift window), and isolates the binary-asset work (Inter `.woff2`, favicon/og PNGs) from the mechanical config work. Each step's `delivery-reality.mdc` audit is independently verifiable.

**Type:** standalone proposal; ran in parallel with `LR-Proof-1 Phase 2` (PR #266 — un-branded video integration). Both are now COMPLETE. This proposal is the canonical brand-identity reference for all subsequent CorpFlowAI buyer-facing surfaces.

**Authored:** 2026-05-29 by Cursor under Operator Bridge `#249`.
**Decision lineage:**
- Anton, 2026-05-29 (initial three decisions): "1. proceed with un-branded Phase 2 PR now 2. Yes please [draft this proposal] 3. teal `#2dd4bf`."
- Anton, 2026-05-29 (Phase B authorisation): "use defaults" — adopting Path A (wordmark only), self-host Inter, replace `brand-config.json` with stub, apply doctrine supersession in the Phase B PR, queue walkthrough rebrand as optional.

---

## 1. What this proposal is

A proposal to declare a **canonical CorpFlowAI brand identity v1** and to sequence the work needed to put that identity on every customer-facing surface.

It is **docs-only**. Merging it changes no runtime behaviour. It commits to one decision (the canonical accent colour) and queues a small, disciplined set of follow-up packets that *do* touch runtime — each of which will return through the normal gate-and-approve flow before any production deploy.

It does **not**:

- Add or change any inline style in `pages/*` or `components/*`.
- Add or change any image, font, or favicon under `public/`.
- Modify or retire `brand-config.json`.
- Change `BRAND_AND_CONVERSION_DOCTRINE.md` itself; instead, it captures a supersession note that document can adopt later.

## 2. Why now

Anton asked, after signing off the silent CF-VID-0001 walkthrough, "we may want to introduce some logos, corporate colouring etc."

A read-only audit of the repo (see § 4) revealed three honest facts:

1. The accent colour Anton sees on `corpflowai.com` and `corpflowai.com/lead-rescue` is **teal `#2dd4bf`**. That value is not in the doctrine doc; the doctrine doc names **signal-blue `#2563EB`**. Production diverged from doctrine at some point and has stayed that way. Visitors today see teal.
2. The doctrine recommends Inter, but **Inter is never loaded** anywhere. Every page falls through to the operating system's default sans (San Francisco / Segoe UI / Roboto). The declared `font-family: 'Inter, ...'` strings in our React components have been cosmetic, not effective.
3. There is **no logo image** in the active runtime. The apex brand presence is the literal text string "CorpFlowAI". There is no favicon, no apple-touch-icon, no SVG mark. `brand-config.json` references a `LogoSQBK.png` that does not exist on disk.

Treating "branding the video" as an isolated tweak would either (a) baking a logo PNG into the walkthrough that does not match the rest of the site, because the rest of the site has no logo, or (b) silently introducing an asset to one surface and not others. Both options break the brand-and-conversion doctrine principle "consistency beats decoration." This proposal is the larger, honest path.

## 3. Decisions Anton has already made

These are recorded so future agents do not re-litigate them.

| ID | Decision | Source |
|---|---|---|
| BI-D-1 | The canonical CorpFlowAI accent / primary CTA colour is **teal `#2dd4bf`**. This supersedes the signal-blue `#2563EB` value in `BRAND_AND_CONVERSION_DOCTRINE.md` § *Color direction*. | Anton, 2026-05-29, Operator Bridge `#249` |
| BI-D-2 | A docs-only brand identity proposal is preferred over inline runtime work today. | Same |
| BI-D-3 | The CF-VID-0001 walkthrough ships **un-branded** in PR #266; logo/colour overlays on the video are deferred to a later branding pass after the canonical mark exists. | Same |

All other decisions in this document are **recommendations awaiting Anton's review**, not facts.

## 4. Honest current-state inventory

A read-only inventory of the active runtime (apex marketing pages and the lead-rescue page; operator surfaces like `/change` are noted separately because their visual language is different by design).

### 4.1 Palette in production today

The actual values shipping on `corpflowai.com` and `corpflowai.com/lead-rescue`, grouped by role:

| Role | Hex | Notes |
|---|---|---|
| Primary CTA fill | `#2dd4bf` | apex `/`, `/lead-rescue`, `/contact` link, admin badges |
| Primary CTA text | `#031018` | dark ink on the teal CTA |
| Page background | `#06111f` → `#0b1f33` → `#101827` (gradient) | apex marketing surfaces |
| Section / card background | `#0a1429`, `#0e1b32` | tinted surfaces inside sections |
| Body text on dark | `#eef6ff` | primary copy |
| Secondary text | `#aebfd1` | section sub-copy |
| Tertiary text / footer | `#9fb2c8`, `#8899aa` | metadata, captions, admin lists |
| Lighter copy emphasis | `#c9d8e8`, `#dbe7f5` | hero leads, callouts |
| Eyebrow / link accent | `#7dd3fc` (sky-300) | by far the most-reused secondary colour, on every public page |
| Highlight tint | `rgba(45,212,191,0.34)`, `rgba(45,212,191,0.10)` | tinted teal callout cards |
| Status — success | `#6ee7b7`, `#5eead4` | mint pair |
| Status — error | `#fca5a5`, `#fda4af` | rose pair |
| Operator surface (`/change`) | sky-400 `#38bdf8`, slate `#020617`, `#0a1c2f`, etc. | distinct palette by design — does not need to change |

The only "doctrine" value that shipped was the dark-background family (`#07111F` and similar), which the runtime approximates with `#06111f`. Signal-blue `#2563EB` does not appear in any active component.

### 4.2 Typography in production today

- **No webfont is loaded anywhere.** No `next/font`, no `<link href="…googleapis…">`, no `@font-face`, no `<link rel="preload">` for fonts.
- Apex pages declare `font-family: 'Inter, ui-sans-serif, system-ui, ...'` but Inter falls through to `ui-sans-serif`/`system-ui`.
- Operator surface (`/change`) declares only the system stack and is consistent with what it renders.
- Effective body type on every public surface today: **the operating system's default sans** (San Francisco on Apple, Segoe UI on Windows, Roboto/Noto on Android). The page never actually shows Inter.

### 4.3 Logo and mark assets

- **No logo image is loaded** anywhere in the apex Next.js runtime. The brand presence is the literal text string `CorpFlowAI` (or `AI Lead Rescue` / `Powered by CorpFlowAI`).
- `brand-config.json` declares `/assets/logos/LogoSQBK.png`; that file does not exist on disk. The loader (`public/assets/logos/theme.js`) is legacy and is not invoked from any active Next.js page.
- `public/favicon.ico`, `public/apple-touch-icon.png`, and any `icon-*.png` are **all missing**. Browsers show their default tab icon for `corpflowai.com`.

### 4.4 Existing brand documentation

`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *Color direction* (`:128–146`) and § *Typography direction* (`:148–166`) are the only canonical statements of palette and typography in the repo today. This proposal supersedes the specific palette and typography values in those sections without rewriting the surrounding voice/aesthetic guidance.

## 5. Proposal: CorpFlowAI brand identity v1

The intent of v1 is to be **honest about what we already are** and **explicit about what is missing**, then to close the gaps in small, scoped packets.

### 5.1 Palette (canonical)

Per BI-D-1, the canonical accent / primary action colour is **teal `#2dd4bf`**. The palette below names every role we already render on apex marketing surfaces; it ratifies what production ships today.

| Role | Token | Hex | Use |
|---|---|---|---|
| Primary action | `--cf-primary` | `#2dd4bf` | All primary CTAs, status pills, link emphasis on dark |
| Primary action — text on fill | `--cf-on-primary` | `#031018` | Dark ink on the teal CTA fill |
| Background — base | `--cf-bg` | `#06111f` | Apex page background top of gradient |
| Background — deep | `--cf-bg-deep` | `#0b1f33` | Mid of gradient on long pages |
| Background — section | `--cf-surface` | `#0a1429` | Card and section backgrounds |
| Surface border | `--cf-border` | `rgba(255,255,255,0.08)` | Card edges, dividers |
| Text — body | `--cf-text` | `#eef6ff` | Primary body copy on dark |
| Text — secondary | `--cf-text-muted` | `#aebfd1` | Section sub-copy |
| Text — tertiary | `--cf-text-faint` | `#9fb2c8` | Metadata, captions, footer |
| Accent — link / eyebrow | `--cf-accent` | `#7dd3fc` | Inline links, eyebrow labels, accent highlights |
| Highlight — primary tint | `--cf-primary-tint` | `rgba(45,212,191,0.10)` | Card fills behind teal pills |
| Highlight — primary outline | `--cf-primary-outline` | `rgba(45,212,191,0.34)` | Glow / outline on primary cards |
| Status — success | `--cf-success` | `#6ee7b7` | "Replied", "Closed won" |
| Status — success-bright | `--cf-success-bright` | `#5eead4` | Affirmative numerics |
| Status — error | `--cf-error` | `#fca5a5` | "Failed", "Outstanding > 24h" |
| Status — warning | `--cf-warning` | `#f59e0b` | Urgency only |

**Operator surface (`/change`) is excluded** from the v1 palette by design. Its slate / sky-400 palette is appropriate for an internal operator workflow and signals visually that it is not a buyer-facing surface. Future work may unify the two palettes; v1 does not.

**Tenant surfaces (Lux, France, Concierge)** are also excluded. Tenant brands are intentionally separate (e.g. LuxeMaurice's serif + warm-stone palette in `lib/client/luxe-maurice-brand-theme.js`) and must not be flattened into the CorpFlowAI brand.

### 5.2 Typography

#### v1 declared family

```
'Inter', ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont,
'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif
```

This matches what apex components already declare. **Until Inter is actually loaded**, the effective face is the system sans. That is acceptable for v1: system stacks render fast, are always subsetted to the OS, and look professional on all common targets.

#### Sequencing for Inter

Loading Inter properly requires a small follow-up packet (`LR-Brand-Identity-2` — see § 7). Before we ship Inter we need to decide:

- **Self-host or Google Fonts CDN?** Self-host is preferable for privacy and no third-party dependency; Google Fonts is the lowest-effort option.
- **Variable font or fixed weights?** Variable font (`Inter-Variable.woff2`) is one file (~280 KB) and supports any weight 100–900 plus italic; fixed weights are ~30 KB each but require multiple files.
- **Which weights do we actually use?** A grep of `fontWeight:` literals across `components/*` will produce the answer; v1 estimates 400 (body), 600 (h2/h3), 800/900 (h1, CTA).

The proposal recommends **self-hosted Inter Variable** under `/public/assets/fonts/` with `font-display: swap`. This packet is sized at <1 day of work and will return through the normal approve/PR gate.

#### Display headings

No serif display face is proposed for CorpFlowAI v1. The brand voice ("focused, premium, structured, operational, calm, precise") reads as a sans, not a serif. LuxeMaurice's Georgia serif remains tenant-specific.

### 5.3 Logo and mark

Today CorpFlowAI has no logo. Two paths forward, sized differently:

- **Path A — wordmark only.** Treat the text string `CorpFlowAI` set in Inter Bold as the canonical wordmark. Add `apple-touch-icon`, `favicon.ico`, and an `og:image` that all use the wordmark on the canonical `#06111f` background. Smallest possible commitment. Probably the right answer for v1 because it is consistent with what the page already does.
- **Path B — wordmark + a simple SVG mark.** Add a minimal geometric mark (e.g. a thin-stroke icon evoking "control room" / "flow" / "node graph") next to the wordmark. The mark would be a single SVG, scalable, monochrome on the teal CTA, monochrome on the navy background.

The proposal recommends **Path A for v1**. Path B is a creative-direction packet that should not be force-fitted into a v1 declaration; Anton can authorise it later as `LR-Brand-Identity-3` if a mark is wanted.

### 5.4 Favicon and app icons

These are **missing in production today** and any browser tab on `corpflowai.com` shows the generic globe icon. Ship the smallest viable set in `LR-Brand-Identity-2`:

| File | Size | Notes |
|---|---|---|
| `/favicon.ico` | 32×32 (and 16×16 frame inside .ico) | Minimum browser tab icon |
| `/apple-touch-icon.png` | 180×180 | iOS / Safari home-screen icon |
| `/icon-192.png` | 192×192 | PWA-class clients (low priority) |
| `/icon-512.png` | 512×512 | PWA-class clients (low priority) |
| `/og-image.png` | 1200×630 | Social previews; can be the wordmark on `#06111f` |

These are static assets; they ship via a normal PR with no code logic.

### 5.5 Voice and aesthetic

Already covered by `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *Aesthetic direction* and § *Voice*. **No changes proposed.** This proposal deliberately limits its scope to the visual identity primitives (palette, type, mark, icons) so it can be reviewed and merged quickly without touching voice/copy.

## 6. Migration plan

Three phases, each scoped as its own packet so Anton can approve them independently.

### Phase A — `LR-Brand-Identity-1` (this proposal, docs-only)

- Merge this document.
- Append a short supersession note to `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` § *Color direction* pointing at this doc as the canonical palette source. (To be done in *this* PR if Anton approves the doctrine touch; otherwise queued as a one-line follow-up.)
- **No runtime change.** No live URL probe needed.
- Acceptance: PR merged; both docs cross-referenced; teal `#2dd4bf` is the documented canonical accent.

### Phase B — `LR-Brand-Identity-2` (runtime, small, gated)

Three small commits, each with its own verification:

1. **Ship favicon + apple-touch-icon + og-image.** Static files only; reference them from `pages/_document.js`. Live URL probe: `https://corpflowai.com/favicon.ico` returns 200, the browser tab shows the icon, social preview previewers show the OG card.
2. **Self-host Inter Variable.** Add `public/assets/fonts/Inter-Variable.woff2`, declare `@font-face` in `pages/_app.js` (or a `<style>` block in `_document.js`), keep `font-display: swap`. Live URL probe: DevTools Network tab shows one woff2 fetch on first load, body text renders in Inter (not the system sans), no CLS regression.
3. **Retire `brand-config.json`.** It is orphan legacy state with stale references. Either delete it, or replace its contents with a `// SUPERSEDED — see docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` stub (a one-line JSON file) so any out-of-tree consumer fails loudly rather than silently using the wrong primary colour.

Phase B is a normal feat PR with full Delivery Reality Audit and a live URL probe.

### Phase C — `LR-Brand-Identity-3` (creative direction, optional)

Only if Anton wants a logo mark beyond the wordmark. Treat as creative-direction work, not infrastructure. Out of scope for v1.

### Phase D — `LR-Proof-1 Phase 3` (optional, walkthrough rebrand)

Once Phase B ships and a wordmark/favicon exists, the CF-VID-0001 walkthrough can be re-rendered with a small "CorpFlowAI" wordmark in the bottom-right corner of every beat and a wordmark-on-navy first/last frame. The pipeline at `scripts/video/` already supports overlays via `show_overlay` actions. This packet would mostly be a YAML edit and a fresh workflow dispatch.

Phase D is also out of scope for v1 of this proposal; it is mentioned so the sequencing is honest.

## 7. Supersession note for `BRAND_AND_CONVERSION_DOCTRINE.md`

If Anton approves merging this proposal as-is, the recommended one-line edit to `BRAND_AND_CONVERSION_DOCTRINE.md` § *Color direction* is:

```diff
| Signal blue | `#2563EB` | Primary CTA |
+
+> Superseded 2026-05-29: the canonical CorpFlowAI accent / primary CTA is teal
+> `#2dd4bf`, ratifying the colour already shipping on `corpflowai.com`. See
+> `docs/marketing/CORPFLOW_BRAND_IDENTITY_V1_PROPOSAL.md` for the full v1 palette.
```

A parallel (smaller) note under § *Typography direction* clarifies that Inter is the chosen face but is not yet loaded; load is queued in `LR-Brand-Identity-2`.

The proposal authors recommend including these two notes **in this PR** so doctrine and reality stop disagreeing the moment the proposal merges. If Anton prefers to keep the doctrine doc untouched, the notes can be split into a follow-up.

## 8. Open questions for Anton

These are the only decisions blocking promotion of this proposal to Phase B work. Each has a default the agent will adopt unless Anton overrides.

1. **Logo path.** Path A (wordmark only) or Path B (wordmark + SVG mark)? *Default: Path A.*
2. **Inter delivery.** Self-host Inter Variable (privacy-friendly, no third-party CDN) or load from Google Fonts CDN (zero work)? *Default: self-host.*
3. **`brand-config.json` disposition.** Delete the file outright or replace with a one-line "SUPERSEDED" stub? *Default: replace with stub so any external grep does not 404.*
4. **Doctrine supersession in this PR.** Apply the two-line edit to `BRAND_AND_CONVERSION_DOCTRINE.md` in this same PR, or split into a follow-up? *Default: apply in this PR (one diff, one merge, no drift window).*
5. **Walkthrough rebrand timing.** After Phase B ships favicon + Inter, re-render CF-VID-0001 with a wordmark overlay (Phase D), or leave the silent un-branded cut as the v1 forever? *Default: queue Phase D as a one-day packet, but treat as optional.*

If Anton replies "use defaults," Phase A merges as proposed (minus Phase B work, which still requires a separate gate-and-approve), the doctrine supersession note is included in this PR, and Phase B / D are queued on Operator Bridge `#249` for the next approval cycle.

## 9. Verification (this PR)

Because this proposal is docs-only:

- `npm run check:marketing-quality-gate` — required, must pass.
- `npm test` — required, must pass (no behaviour changed).
- `npm run build` — required, must pass.
- Live URL probe — **not applicable** (docs-only). The Delivery Reality Audit on the PR will record `Live URLs tested: n/a — docs-only` and verdict `COMPLETE` once merged.

Phase B will require its own live URL probe per `delivery-reality.mdc`.

## 10. Acceptance criteria

This proposal is **complete and ready for Phase B planning** when:

1. PR is merged on `main`.
2. The canonical palette is referenced from at least one place outside this doc (the recommended doctrine supersession note, or a follow-up).
3. Operator Bridge `#249` records the proposal as the canonical brand identity v1 source of truth.
4. Phase B is queued with explicit Anton authorisation before any runtime change.

---

*This proposal is bound to the principle stated in `BRAND_AND_CONVERSION_DOCTRINE.md`: effectiveness beats decoration; clarity beats cleverness; conversion beats completeness. v1 ratifies what already converts (teal CTAs, restrained dark palette, system sans) and does not add visual weight that does not earn its place.*
