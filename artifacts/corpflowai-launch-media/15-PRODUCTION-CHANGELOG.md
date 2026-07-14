# Production Changelog — Launch Media Kit

**Kit:** `artifacts/corpflowai-launch-media/`  
**Workstream:** Stream B · HeyGen + Canva launch factory  
**Issue:** #601

---

## 2026-07-14 — Stream B initial kit (draft)

**Author:** Cursor (draft assembly) · **Operator:** Anton (gates pending)

### Added

- `00-PRODUCTION-DASHBOARD.md` — operator single view  
- `01-BRAND-AND-MESSAGE-GUIDE.md` — messaging, CTAs, visual tokens  
- `02-HEYGEN-AVATAR-BRIEF.md` — avatar spec + consent path  
- `03-VOICE-AND-DELIVERY-GUIDE.md` — voice and pace guide  
- `04-FLAGSHIP-VIDEO/` — V01 script + production sheet  
- `05-OFFER-VIDEOS/` — V02–V04 per offer (3 folders)  
- `06-SHORT-FORM-CLIPS/` — S01–S06 scripts + production sheets  
- `07-PROCESS-EXPLAINER/` — V05  
- `08-DISCOVERY-JOURNEY-VIDEO/` — V06  
- `09-FOUNDER-INTRODUCTION/` — V07  
- `10-CANVA-TEMPLATES/` — C01–C12 specs  
- `11-THUMBNAILS-AND-COVERS/` — T01–T08 specs  
- `12-EXPORT-MATRIX.md`  
- `13-PUBLISHING-CHECKLIST.md`  
- `14-ASSET-MANIFEST.md`  
- `15-PRODUCTION-CHANGELOG.md` (this file)  
- `ANTON-CAPTURE-CHECKLIST.md`

### Canonical offer decisions

- All offer copy, prices, and slugs sourced from `lib/public/rapid-delivery-offers.js`.  
- **Third Mauritius sprint:** **Customer Recovery & Reputation Management Sprint** (`customer-reputation-recovery`).  
- **Did not invent** an "Automation Starter" offer — early draft outlines referenced a generic third slot; replaced with the live recovery sprint already on `/offers/customer-reputation-recovery`.  
- **USD 150 pilot** remains a separate wedge path; not conflated with MUR sprint pricing in offer or short assets.

### Brand tokens locked

- Accent teal: `#2dd4bf`  
- Dark background: `#06111f`  
- Primary text: `#eef6ff`  
- Link accent: `#7dd3fc`

### Status

- **Draft only** — no HeyGen renders, no Canva builds, no external publishing.  
- Operator gates A1–A6 open (see `ANTON-CAPTURE-CHECKLIST.md`).

### Not in scope (this changelog entry)

- App/runtime changes  
- New offer pages or pricing changes  
- Production deploy or live URL verification

---

## Template for future entries

```markdown
## YYYY-MM-DD — {summary}

### Changed
- {files}

### Operator notes
- {gates cleared / renders completed}

### Publish record (if applicable)
- Platform:
- URL:
- Delivery Reality verdict:
```
