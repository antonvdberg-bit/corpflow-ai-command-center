# Graphics — LuxeMaurice Training Pack v1

PNG screenshots for guides and video production.

## Folder layout

```text
05-graphics/
  README.md                      ← this file
  GRAPHICS_CAPTURE_CHECKLIST.md  ← click-by-click operator instructions
  GRAPHICS_MANIFEST.md           ← per-image metadata and status
  captures/                      ← drop approved PNGs here
```

## Capture tooling (free, in-repo)

Optional automated capture for **public / signed-out** surfaces:

```powershell
node scripts/luxe-maurice-training-pack-capture.mjs
```

Optional training form submission (fictional data only):

```powershell
$env:LUX_TRAINING_SUBMIT_FORM = "1"
node scripts/luxe-maurice-training-pack-capture.mjs
```

**Manual capture required** for authenticated surfaces (06, 08) — see checklist.

## Standards

- Desktop width **1440px** unless documenting mobile specifically
- Crop browser chrome where possible
- No bookmarks bar, extensions, or developer tools visible
- Fictional training data only in shared materials
- Redact or crop before sending to Jan

## Before client send

Anton must approve each PNG in `captures/` against `GRAPHICS_MANIFEST.md`.
