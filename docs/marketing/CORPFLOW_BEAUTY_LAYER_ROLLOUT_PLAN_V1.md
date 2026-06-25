# CorpFlowAI Human-First Beauty Layer — Site-Wide Rollout Plan v1

**Status:** Docs-only plan (authorizes no runtime change by itself).
**Owner:** Commercial / Brand / Product Delivery.
**Created:** 2026-06-25.
**Purpose:** Evaluate the workload and sequence for extending the Human-First Beauty Layer (photo + frosted-glass system) from Product A to the rest of CorpFlowAI's **public marketing** surfaces, without restyling the whole site at once and without touching operator/admin/tenant surfaces.

**Canonical references**
- Standard: `docs/marketing/CORPFLOW_VISUAL_STANDARD_HUMAN_FIRST_BEAUTY_LAYER.md`
- First adopter (reference implementation): `docs/product/PRODUCT_A_BEAUTY_LAYER_IMPLEMENTATION_PACKET_V1.md`, `components/ProductAUsClinicLanding.js`
- Asset governance: `docs/marketing/CORPFLOW_ASSET_GOVERNANCE.md`, schema `lib/visualAssets/schema.js`
- Quality gates: `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md`
- Primitives already shipped: `lib/ui/glass.js`, `components/beauty/{PhotoBackground,Scrim,GlassPanel,GlassCardGrid,HeroGlassBlock,CtaGlassBlock}.js`

---

## 1. What Product A already proved (reusable foundation)

The Product A work hardened the pieces every other page will reuse:
- A token system with elevation, sheen, and accessibility fallbacks (`lib/ui/glass.js`: `GLASS_TOKENS`, `glassPanelStyle`, `glassElevationShadow`, `glassElevationLift`, `GLASS_GLOBAL_CSS`).
- The **stacking-context recipe** that took two PRs to get right (`.page` forms its own context via `isolation: isolate`, no opaque page background, photo `z0` → scrim `z1` → content `z2`). This is the single most error-prone part and must not be re-derived per page.
- Responsive `<picture>` + AVIF/WebP/JPG derivatives + AVIF responsive `preload` for LCP.
- Footer-on-glass via the additive, default-off `flush` prop on `PublicSiteFooter`.
- An accepted premium warm CTA token (`GLASS_TOKENS.ctaWarm`).
- A static drift-guard test pattern (`node-tests/product-a-beauty-layer.test.mjs`).

**Implication:** the rollout is mostly *composition + governed assets per page*, not new system design — provided we extract a shared shell (see §4).

---

## 2. Surfaces that SHOULD receive the photo + glass treatment

Public, CorpFlow-branded marketing/conversion surfaces. Listed in priority order.

| Tier | Surface | Route | Component | Render | Notes |
|---|---|---|---|---|---|
| ✅ Done | Product A / US clinics | `/product-a/us-clinics` | `ProductAUsClinicLanding.js` | SSG | Reference implementation. |
| 1 | Apex marketing home | `/` (CorpFlow marketing mode only) | `CorpFlowPublicHome.js` | **SSR (host-aware)** | Highest traffic + first impression. Must only restyle the `corpflow_marketing` branch — **not** the tenant-site or AI-Lead-Rescue-host branches in `pages/index.js`. Already has a `core`/`shared` asset pool via `selectHomepageAssets`. |
| 2 | AI Lead Rescue | `/lead-rescue` (+ `aileadrescue.corpflowai.com`) | `AiLeadRescueLanding.js` | SSG (`/lead-rescue`) / SSR (host) | Conversion-critical. Already governed by `lead-rescue` + `shared` manifests (`selectLeadRescueAssets`). |
| 3 | Services | `/services` | `pages/services.js` | Static/SSG | Marketing/info. |
| 3 | Process | `/process` | `pages/process.js` | Static/SSG | Marketing/info. |
| 3 | About | `/about` | `pages/about.js` | Static/SSG | Marketing/info. |
| 3 | Standards | `/standards` | `pages/standards.js` | Static/SSG | Marketing/info (trust). |
| 4 | Onboarding | `/onboarding` | `pages/onboarding.js` | Static/SSG | Post-sale but public; lighter treatment. |
| 4 | Contact | `/contact` | `pages/contact.js` | Static/SSG | Lighter treatment; keep form clarity dominant. |

---

## 3. Surfaces that should be EXCLUDED

### 3a. Operator / admin / tenant-internal — **hard exclude** (out of scope by design)
Per the standard §"Does not apply to" and `CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` §2, these keep their own functional visual language:
- `/change`, `/change-v2`, `/client/change-decisions` (Change Console / operator)
- `/factory/living-word-workflows` (factory/operator)
- `/admin/lead-rescue`, `/admin/lead-rescue/[id]` (admin)
- `/properties/admin` (admin)
- `/site-preview`, `/chat-widget-demo` (internal/demo tooling)
- `/pay/return`, `/pay/cancel` (transactional callbacks)
- All `/api/*`, login/auth.

### 3b. Tenant / bespoke brand surfaces — **exclude (separate identities)**
These already have their own premium identities and must **not** be flattened into the CorpFlow glass system:
- `/concierge` — Luxe Maurice "Private Advisory" editorial brand (serif, gold/charcoal).
- `/properties`, `/property/[slug]` — Luxe Maurice private opportunities.
- `/france` — tenant lead surface (the standard explicitly lists France as a separate tenant brand).
- The **tenant-site** and **Luxe Maurice** branches of `pages/index.js` (host-resolved) — these render tenant drafts, not CorpFlow marketing.

### 3c. Legal / policy — **light treatment only (no full photo hero)**
- `/privacy`, `/terms`, `/refund-policy`, `/delivery-policy`, `/payment-security` (`PublicPolicyLayout`).
- Recommendation: **do not** apply a photographic hero (these are dense legal text where readability and print-friendliness dominate). At most, adopt the shared header/footer-on-glass chrome for consistency. Treat as optional Phase 5, low priority.

---

## 4. Should we build a `PublicMarketingPhotoGlassShell`? — **Yes.**

**Recommendation: extract a shared shell before Tier 1.** Rolling the photo+glass scaffolding into 6+ pages by copy-paste would re-spread the stacking-context bug and the preload/responsive-source boilerplate. A single shell collapses that risk.

Proposed component: `components/beauty/PublicMarketingPhotoGlassShell.js`

```jsx
<PublicMarketingPhotoGlassShell
  hero={{ base: '/assets/<surface>/<hero>-v1', sources, alt: '' }}
  scrimTone="dark"            // or "light"
  preload                      // emit AVIF responsive preload
  footer={<PublicSiteFooter flush extra="…" />}
>
  {/* page content in GlassPanels / GlassCardGrid */}
</PublicMarketingPhotoGlassShell>
```

Responsibilities (all already solved in Product A, just centralized):
- The `.page` wrapper with `position:relative; isolation:isolate;` and **no opaque background**.
- `PhotoBackground` (`zIndex 0`, `priority`, responsive `sources`) + `Scrim` (`zIndex 1`) + content shell (`zIndex 2`).
- Inject `GLASS_GLOBAL_CSS` + focus-ring CSS + the nav text-shadow helper once.
- Wrap the footer in a `glassFillSoft` low-elevation `GlassPanel`.
- Accept the per-page hero asset + alt + scrim tone.

**Phase 0** is therefore: extract the shell from Product A and re-point Product A at it with **zero visual change** (guarded by the existing Product A drift tests). Every later page consumes the shell.

---

## 5. Required image assets per page

Each in-scope surface needs **one governed, audience-appropriate hero photo**, processed exactly like Product A:
- Derivatives: `…-v1.{avif,webp,jpg}` (≈2400w desktop) + `…-v1-1280.{avif,webp,jpg}` (mobile), via `sharp`.
- A manifest under `data/visual-assets/` (`surface`, licence/owner/provenance, decorative `alt`, lifecycle, replacement note) validated by `lib/visualAssets/schema.js`.

| Surface | Suggested asset direction | Manifest surface |
|---|---|---|
| Apex home `/` | Premium, human, "businesses growing" — warm, credible, not SaaS-gradient | `core` (consumed by `selectHomepageAssets`) |
| `/lead-rescue` | Calm, trustworthy "no lead left behind" human/clinic-adjacent | `lead-rescue` |
| `/services` | Cohesive with home; abstract premium or workspace | `core`/`shared` |
| `/process` | Same family as services | `core`/`shared` |
| `/about` | Human/team-credibility (no fabricated people if not licensed) | `core`/`shared` |
| `/standards` | Quiet, trustworthy, document/quality motif | `core`/`shared` |
| `/onboarding`, `/contact` | Light, secondary; can reuse a shared neutral hero | `shared` |

**New surface enums** (`product-a` already added) likely needed in `VISUAL_ASSET_SURFACES`: confirm `core`, `shared`, `lead-rescue` cover the rest (they exist). Add a per-page id convention: `<surface>-hero-…-v1`.

**Governance gate (carry-over risk):** the Product A hero's original licence is still *unverified*. Before scaling, establish a hard rule: **no surface goes to production `published` lifecycle until licence/provenance is verified** (owned vs stock-licensed vs AI-generated-with-provenance).

---

## 6. Estimated implementation phases

| Phase | Scope | Rough size | Gate |
|---|---|---|---|
| **0** | Extract `PublicMarketingPhotoGlassShell`; re-point Product A (no visual change) | S (1 PR) | Product A drift tests stay green; visual diff = none |
| **1** | Apex home `/` (CorpFlow marketing branch only) + hero asset | M (1–2 PRs) | SSR tenant/lead-rescue branches unchanged; LCP/CLS check |
| **2** | `/lead-rescue` + hero asset | M (1 PR) | Conversion parity; intake/event contract untouched |
| **3** | `/services`, `/process`, `/about`, `/standards` + assets | M–L (batched, 1–2 PRs) | Per-page readability + mobile QA |
| **4** | `/onboarding`, `/contact` (lighter) + shared asset | S (1 PR) | Form clarity preserved |
| **5 (optional)** | Legal pages — chrome-only consistency, no photo hero | S | Print/readability unaffected |

Each runtime phase is **PARTIAL until production visual + (where forms exist) live intake QA pass**, per `.cursor/rules/delivery-reality.mdc`.

---

## 7. Risk areas

- **Readability / contrast.** Light photos (like the Product A medspa hero) need panel-driven contrast, not a heavy scrim. Reuse the dark frosted panels; tune scrim per asset; verify WCAG AA on every text-bearing surface. Any direct-on-photo copy (e.g. nav) needs a text-shadow, not a darker scrim.
- **Mobile-first.** Verify 360/390/414px: no horizontal scroll, tap targets ≥44px, mobile (1280w) derivatives served via `media` queries, glass legibility at small sizes.
- **LCP / CLS.** Hero is the LCP element on most pages — preload AVIF responsively, keep desktop hero <~120KB JPG-equivalent, keep the background `fixed`/out-of-flow to avoid CLS. Watch backdrop-blur GPU cost on low-end phones (cap blur, honor `prefers-reduced-transparency`).
- **SSR home complexity.** `pages/index.js` is host-aware SSR serving CorpFlow marketing **and** tenant sites **and** the AI-Lead-Rescue host. Restyle **only** `CorpFlowPublicHome`; never let the glass system bleed into tenant rendering. No added per-request DB/cost.
- **Asset governance.** Licence verification is the top blocker (see §5). Enforce manifest validation in CI; keep `draft` until vetted; never overwrite a published path (bump id).
- **Consistency / drift.** All visual values stay in `lib/ui/glass.js`; pages compose the shell, never re-implement scaffolding. Add a lightweight per-surface drift guard mirroring the Product A test.
- **Tenant brand bleed.** Hard guardrail: Lux/Concierge/France keep their own identities; the shell must not be imported into those routes.

---

## 8. Recommended rollout order (summary)

1. **Phase 0 — Shell extraction** (de-risk; no visual change).
2. **Phase 1 — Apex home `/`** (highest traffic / first impression).
3. **Phase 2 — `/lead-rescue`** (conversion-critical, asset pool ready).
4. **Phase 3 — `/services`, `/process`, `/about`, `/standards`** (batched).
5. **Phase 4 — `/onboarding`, `/contact`** (lighter).
6. **Phase 5 (optional) — legal pages** (chrome-only).

Do **not** restyle the whole site in one PR. One surface (or one tight batch) per gated PR, each with a Delivery Reality Audit and production visual QA before COMPLETE.

---

## 9. Definition of done (per surface)

A surface is done only when it is strategically clear, conversion-focused, fast, readable, mobile-ready, **and** visually beautiful within four seconds — using a governed (licence-verified) hero, the shared shell, AA contrast, no CLS regression, and an unchanged functional/intake contract.

## 10. Changelog
| Version | Date | Summary |
|---|---|---|
| v1 | 2026-06-25 | Initial rollout plan: in-scope vs excluded surfaces, `PublicMarketingPhotoGlassShell` recommendation, per-page assets, phases, risks, and order. |
