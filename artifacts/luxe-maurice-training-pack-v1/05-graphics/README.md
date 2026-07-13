# Graphics — LuxeMaurice Training Pack v1

PNG screenshots for guides and video production.

## Folder layout

```text
05-graphics/
  README.md                      ← this file
  GRAPHICS_CAPTURE_CHECKLIST.md  ← click-by-click operator instructions (retain for recapture)
  GRAPHICS_MANIFEST.md           ← per-image metadata and status
  captures/                      ← canonical PNG locations
```

## Capture status (2026-07-14)

**All eight required graphics are present** in `captures/`:

```text
01-landing-page.png
02-private-opportunities.png
03-private-access-request-form.png
04-request-submitted-reference.png
05-advisor-sign-in-prompt.png
06-advisor-pipeline-live-request.png   ← authenticated Advisor Pipeline (done)
07-demonstration-records.png
08-change-console-lead-workflow.png    ← focused /change lead + OPERATOR ACTIONS (done)
```

See `GRAPHICS_MANIFEST.md` for privacy review notes.

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

**Authenticated recapture** (06, 08) remains manual — follow `GRAPHICS_CAPTURE_CHECKLIST.md`. For 08, select the training lead so the list focuses and **OPERATOR ACTIONS** sits directly below (post focus-list behaviour).

## Standards

- Desktop width **1440px** unless documenting mobile specifically
- Crop browser chrome where possible
- No bookmarks bar, extensions, or developer tools visible
- Fictional training data only in shared materials
- Redact or crop before sending to Jan

## Before client send

Anton must approve each PNG in `captures/` against `GRAPHICS_MANIFEST.md`. The pack approval checklist in the root README remains unchecked until that review.
