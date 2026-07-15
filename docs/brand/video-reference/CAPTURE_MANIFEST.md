# CorpFlowAI flagship video — website capture manifest

**Status:** planning / reference only  
**Does not create the final video.**  
**Runtime capture helper:** reuse existing Playwright script `scripts/capture-corpflow-public-visuals-screenshots.mjs` (or a future thin extension). Do not introduce a paid screenshot service.

Approved Anton choice for website branding in the related PR: **mark-only favicon/app icons**; header/footer remain the text wordmark. Captures should reflect that live UI.

## Global capture rules

- Prefer **Production apex** (`https://corpflowai.com`) after brand assets are approved, or the **Vercel Preview** URL for the brand-assets PR while reviewing.
- Strip browser chrome; do not show personal profile photos, credentials, admin consoles, or `/change` operator UI.
- Overlay-safe area: keep the top 96 px and bottom 96 px of the frame relatively quiet (or leave room for a future CorpFlowAI wordmark in the lower-right). Prefer 16:9 (1920×1080) desktop and 9:16 (1080×1920) mobile only when specifically listed.
- Do not frame developer tools, Vercel auth gates, or signed `cf_preview` tenant surfaces as if they were CorpFlowAI marketing.

## Capture table

### 1. Homepage hero

| Field | Value |
|-------|-------|
| Route | `/` |
| Section | Hero (`PublicHero` — first viewport) |
| Why | Establishes brand, offer, and primary CTA for the flagship open |
| Viewport | Desktop 1440×900 (also optional mobile 390×844) |
| Device | Desktop primary |
| Recommended crop | First viewport only; include text wordmark, headline, primary CTA; avoid scrolling into offer cards |
| Overlay-safe area | Lower-right 280×100 px clear of CTA; headline remains readable |
| Must not show | Login, operator chrome, unrelated tenant pages |

### 2. Purchasable delivery-sprint cards

| Field | Value |
|-------|-------|
| Route | `/#offers` |
| Section | `OutcomeSection` id `offers` — “Three delivery sprints” |
| Why | Shows what is currently buyable / bookable |
| Viewport | Desktop 1440×900 |
| Device | Desktop |
| Recommended crop | Section title + three `OfferCard` tiles in one frame |
| Overlay-safe area | Top of section label + 80 px; avoid covering price text |
| Must not show | Internal cost notes, ERPNext, unpublished drafts |

### 3. Client buying / delivery process

| Field | Value |
|-------|-------|
| Route | `/` (homepage `DeliverySteps`) **or** `/process` |
| Section | Homepage delivery steps, or `/process` five-stage pilot timeline |
| Why | Explains how a buyer moves from discovery to delivery without hype |
| Viewport | Desktop 1440×900 |
| Device | Desktop |
| Recommended crop | On `/`: DeliverySteps block. On `/process`: timeline SVG + first two stage cards |
| Overlay-safe area | Right margin 160 px |
| Must not show | Payment credentials, bank details, operator monitoring screens |

### 4. Delivery-governance visual (Build → Preview → Verify → Approve → Deploy → Validate)

| Field | Value |
|-------|-------|
| Route | `/process` (public language) |
| Section | Five-stage engagement (`Intake review` → `Pilot review meeting`) and/or “What we do / do not do” |
| Why | Public-facing stand-in for delivery governance; **do not** record the factory `/change` console |
| Viewport | Desktop 1440×900 |
| Device | Desktop |
| Recommended crop | Stage list in one vertical scroll segment, or side-by-side do/don’t panels |
| Overlay-safe area | Left 120 px for beat labels |
| Must not show | CMP tickets, GitHub tokens, Vercel dashboards, factory health JSON, admin approvals UI |

> Note: Exact six-word operator slogan is internal delivery language. Public captures must use `/process` buyer wording rather than operator screens.

### 5. Discovery conversation CTA

| Field | Value |
|-------|-------|
| Route | `/` CTA band **or** `/contact#discovery` |
| Section | Homepage `PublicCtaBand` (“Ready to start a discovery conversation?”) or Contact discovery block |
| Why | Clear next action for the video close |
| Viewport | Desktop 1440×900; optional mobile 390×844 |
| Device | Desktop primary / mobile secondary |
| Recommended crop | CTA title + primary button; hide filled form PII |
| Overlay-safe area | Opposite the primary button |
| Must not show | Submitted lead details, email clients, WhatsApp inbox contents |

### 6. Client delivery example (gated)

| Field | Value |
|-------|-------|
| Route | `/client/luxe-maurice-ai` (candidate) |
| Section | Public client demo surface only |
| Why | Optional proof beat |
| Viewport | Desktop 1440×900 |
| Device | Desktop |
| Recommended crop | Public hero/header of the **demo-scoped** client surface |
| Overlay-safe area | Lower third clear of private property contact details |
| Must not show | Real client private data, Change Console, unpublished properties, credentials |
| Publication gate | **BLOCKED until Anton approves.** Homepage proof register still marks named publication as `NEEDS_ANTON`. Do not capture or publish this beat until cleared. Label any interim slate as “client delivery example — pending approval”. |

## Manual capture plan (if automation is insufficient)

1. Open the Preview or apex URL in a clean browser profile.
2. Set device toolbar sizes listed above.
3. Hide bookmarks bar; use full-page or section screenshots without OS UI.
4. Save PNGs under `artifacts/corpflowai-brand-assets-evidence/video-reference/` (gitignored or PR-attached, not required as production assets).
5. Record filename, route, viewport, and date in this folder’s PR notes.

## Automated helper (existing)

```bash
# Against local or Preview base URL — hero/process/contact surfaces already covered:
node scripts/capture-corpflow-public-visuals-screenshots.mjs "https://<preview-host>"
```

Extend that script later only if needed for `#offers` scroll targets; do not add a new paid service.
