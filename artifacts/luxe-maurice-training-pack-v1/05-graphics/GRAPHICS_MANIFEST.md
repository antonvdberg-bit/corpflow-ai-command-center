# Graphics Manifest — LuxeMaurice Training Pack v1

| Filename | Live route | Session | Training data visible | Purpose | Used in | Capture status | Redaction status |
|----------|------------|---------|----------------------|---------|---------|----------------|------------------|
| `01-landing-page.png` | `/client/luxe-maurice-ai` | Signed out | None | Hero and channel overview | Client guide §1; Video 1 scene 1 | CAPTURED · READY_FOR_ANTON_REVIEW | None required |
| `02-private-opportunities.png` | `/client/luxe-maurice-ai/properties` | Signed out | None | Access catalogue | Client guide §2; Video 1 scene 2 | CAPTURED · READY_FOR_ANTON_REVIEW | None required |
| `03-private-access-request-form.png` | `/client/luxe-maurice-ai/buyer` | Signed out | Optional (empty form OK) | Request form layout | Client guide §3; Video 1 scene 3 | CAPTURED · READY_FOR_ANTON_REVIEW | None required |
| `04-request-submitted-reference.png` | `/client/luxe-maurice-ai/buyer` | Signed out | Fictional training user + LM-REQ | Confirmation and reference | Client guide §6; Video 1 scene 5 | CAPTURED · PRIVACY_REVIEWED · READY_FOR_ANTON_REVIEW | PRIVACY_REVIEWED — training row only |
| `05-advisor-sign-in-prompt.png` | `/client/luxe-maurice-ai/crm` | Signed out | None | Privacy posture — no persisted client detail | Advisor guide §2, §6; Video 2 scene 5 | CAPTURED · PRIVACY_REVIEWED · READY_FOR_ANTON_REVIEW | PRIVACY_REVIEWED |
| `06-advisor-pipeline-live-request.png` | `/client/luxe-maurice-ai/crm` | Signed-in LuxeMaurice tenant | LuxeMaurice Training User / training@example.invalid / LM-REQ-PGVZ7HMI | Persisted request card under Received for advisor review | Advisor guide §3–4; optional Video 2 scene 2–3 | CAPTURED · BROWSER_CHROME_CROPPED · FOCUSED_TO_TRAINING_REQUEST · PRIVACY_REVIEWED · READY_FOR_ANTON_REVIEW | Browser chrome removed and frame focused on the training request under Received for advisor review; fictional training data only; PRE_CROP preserved under `05-graphics/source-review/` |
| `07-demonstration-records.png` | `/client/luxe-maurice-ai/crm` | Signed out | Sample layout only | Demonstration records section | Advisor guide §5; Video 2 scene 4 | CAPTURED · READY_FOR_ANTON_REVIEW | None required |
| `08-change-console-lead-workflow.png` | `/change` | Operator /change session | LuxeMaurice Training User / training@example.invalid | Focused lead + OPERATOR ACTIONS (select lead → list collapses) | Operator guide §4–6; Video 3 scene 2–4 | CAPTURED · PRIVACY_REVIEWED · CROPPED_TO_TRAINING_LEAD_AND_OPERATOR_ACTIONS · READY_FOR_ANTON_REVIEW | CROPPED_TO_TRAINING_LEAD_AND_OPERATOR_ACTIONS — training lead + operator actions only |
| `09-change-content-sprint-upload.png` | `/change` | No live session required | No client PII; C1/C2 workflow labels only | Illustrated existing Add content + Upload content workflow | Content update guide §2 | GENERATED_FROM_EXISTING_UI_COPY · PRIVACY_REVIEWED | Clearly labelled illustrated guide; no live data |
| `10-change-attachment-review-publish.png` | `/change` | No live session required | Fictional attachment only | Illustrated existing attachment review, property link, and image publish controls | Content update guide §2 | GENERATED_FROM_EXISTING_UI_COPY · PRIVACY_REVIEWED | Clearly labelled illustrated guide; no live data |
| `11-properties-admin-listing-editor.png` | `/properties/admin` | No live session required | Fictional training listing only | Illustrated existing listing editor and visibility controls | Content update guide §1 | GENERATED_FROM_EXISTING_UI_COPY · PRIVACY_REVIEWED | Clearly labelled illustrated guide; no live data |

---

## Review edition presentation

- The **review edition** (`review/LUXEMAURICE_TRAINING_PACK_REVIEW.md` / `.html`) and **Jan delivery package** reference PNGs from **`05-graphics/captures/`** (and copies under `client-delivery-preparation/graphics/` when packaging).
- **`05-graphics/source-review/`** (when present) holds internal pre-crop / browser-chrome source captures for operators only. **Do not** include `source-review` in the Jan-facing package.

---

## Capture status values

- **CAPTURED** — PNG present in the pack
- **BROWSER_CHROME_CROPPED** — browser chrome removed for training presentation
- **FOCUSED_TO_TRAINING_REQUEST** — graphic 06 focused on Received for advisor review + training request card
- **CROPPED_TO_TRAINING_LEAD_AND_OPERATOR_ACTIONS** — graphic 08 focused to training lead + OPERATOR ACTIONS
- **PRIVACY_REVIEWED** — inspected for fictional training data only; no real client PII
- **READY_FOR_ANTON_REVIEW** — available in the review edition for Anton’s final client-send review
- **GENERATED_FROM_EXISTING_UI_COPY** — illustrated guide built from the existing route/control labels; not represented as a live screenshot
- **PENDING_RECAPTURE** — PNG missing or needs a fresh capture

Graphics 01–08 are captures. Graphics 09–11 are privacy-safe illustrated guides generated from the existing route/control labels so the client can see the workflow without exposing production data. Graphic **06** crop is complete.

---

## Authenticated captures (06 and 08)

| | 06 | 08 |
|---|----|----|
| **Presentation file** | `captures/06-advisor-pipeline-live-request.png` | `captures/08-change-console-lead-workflow.png` |
| **Source used** | Authenticated Advisor Pipeline training row; browser chrome removed; focused to training request card | Operator capture after focused-lead behaviour; cropped to training lead + OPERATOR ACTIONS |
| **Privacy** | Fictional training request only | Fictional training lead + operator actions; no unrelated lead rows |
| **Status** | BROWSER_CHROME_CROPPED · FOCUSED_TO_TRAINING_REQUEST · PRIVACY_REVIEWED · READY_FOR_ANTON_REVIEW | CROPPED_TO_TRAINING_LEAD_AND_OPERATOR_ACTIONS · PRIVACY_REVIEWED · READY_FOR_ANTON_REVIEW |

---

## Automated capture command (public surfaces)

```text
node scripts/luxe-maurice-training-pack-capture.mjs
```

Captures 01, 02, 03, 05, 07 when production is reachable.

Optional 04:

```text
LUX_TRAINING_SUBMIT_FORM=1 node scripts/luxe-maurice-training-pack-capture.mjs
```

Authenticated captures 06 and 08 remain **manual**. Graphics 09–11 are generated illustrated guides.
