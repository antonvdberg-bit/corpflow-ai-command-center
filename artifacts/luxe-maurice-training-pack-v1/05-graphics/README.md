# Graphics — LuxeMaurice Training Pack v1

PNG screenshots for guides, the review edition, and Jan delivery packaging.

## Folder layout

```text
05-graphics/
  README.md                      ← this file
  GRAPHICS_CAPTURE_CHECKLIST.md  ← click-by-click operator instructions (internal; not for Jan)
  GRAPHICS_MANIFEST.md           ← per-image metadata and status
  captures/                      ← Jan-facing / review-edition PNG locations (canonical)
  source-review/                 ← optional internal pre-crop sources only (not for Jan)
```

## Captures vs source-review

| Location | Audience | Use |
|----------|----------|-----|
| **`captures/`** | Anton review edition + Jan package | Final training PNGs. Captures 01–08 plus illustrated existing-workflow guides 09–11. |
| **`source-review/`** | Operators only (when present) | Pre-crop / browser-chrome sources retained for comparison. **Never** place in the Jan-facing package. |

---

## Graphics status (2026-07-15)

**All eleven required graphics are present** in `captures/`:

```text
01-landing-page.png
02-private-opportunities.png
03-private-access-request-form.png
04-request-submitted-reference.png
05-advisor-sign-in-prompt.png
06-advisor-pipeline-live-request.png   ← BROWSER_CHROME_CROPPED · FOCUSED_TO_TRAINING_REQUEST · PRIVACY_REVIEWED · READY_FOR_ANTON_REVIEW
07-demonstration-records.png
08-change-console-lead-workflow.png    ← CROPPED_TO_TRAINING_LEAD_AND_OPERATOR_ACTIONS · PRIVACY_REVIEWED · READY_FOR_ANTON_REVIEW
09-change-content-sprint-upload.png    ← ILLUSTRATED EXISTING /change WORKFLOW · PRIVACY_REVIEWED
10-change-attachment-review-publish.png ← ILLUSTRATED EXISTING GOVERNANCE CONTROLS · PRIVACY_REVIEWED
11-properties-admin-listing-editor.png ← ILLUSTRATED EXISTING EDITOR CONTROLS · PRIVACY_REVIEWED
```

See `GRAPHICS_MANIFEST.md` for privacy and crop notes. Graphics 09–11 are clearly labelled illustrated guides generated from the existing UI/control labels; they are not presented as live-data screenshots.

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

**Authenticated recapture** (06, 08) remains manual — follow `GRAPHICS_CAPTURE_CHECKLIST.md`. For 08, select the training lead so the list focuses and **OPERATOR ACTIONS** sits directly below (focused-lead behaviour).

## Standards

- Desktop width **1440px** unless documenting mobile specifically
- Crop browser chrome where practical (06 completed)
- No bookmarks bar, extensions, or developer tools visible
- Fictional training data only in shared materials
- Redact or crop before sending to Jan

## Before client send

Anton must approve each PNG in `captures/` against `GRAPHICS_MANIFEST.md` and the review edition checklist. Approval and send checkboxes remain unchecked until that review. **No external send has occurred.**
