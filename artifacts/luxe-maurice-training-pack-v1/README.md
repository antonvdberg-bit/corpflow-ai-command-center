# LuxeMaurice Training Pack v1

Version-controlled training materials for Jan and the LuxeMaurice team. Documents the **live** Private Access Request workflow as verified on production after PR #585 and PR #586.

**Production site:** `https://lux.corpflowai.com/client/luxe-maurice-ai`

---

## Pack contents

| Folder | Purpose |
|--------|---------|
| `01-client-review-guide/` | Client-facing journey — submit a Private Access Request |
| `02-advisor-workflow-guide/` | Advisor review workspace — read persisted requests |
| `03-operator-workflow-guide/` | Operator path via `/change` and `concierge-leads-list` |
| `04-training-video-scripts/` | Three 2–4 minute screen-recording scripts |
| `05-graphics/` | Screenshot manifest, capture checklist, PNG captures |
| `06-backend-status/` | What is live now vs planned future enhancements |

---

## Safe to send Jan (after Anton approval)

- `01-client-review-guide/CLIENT_PRIVATE_ACCESS_GUIDE.md`
- `02-advisor-workflow-guide/ADVISOR_REVIEW_GUIDE.md`
- `03-operator-workflow-guide/OPERATOR_CHANGE_WORKFLOW.md` — **review screenshots first**; operator section may contain unrelated data if not cropped
- `04-training-video-scripts/` — all three scripts
- `05-graphics/captures/` — **only Anton-approved PNGs** (fictional training data, no real PII)
- `06-backend-status/BACKEND_STATUS_AND_LIMITATIONS.md` — summary section suitable for Jan; full doc is operator-safe

## Do not send Jan without review

- This README (internal routing)
- Raw repository paths or internal file names in client emails
- `05-graphics/GRAPHICS_CAPTURE_CHECKLIST.md` (operator instructions)
- Uncropped `/change` captures showing unrelated client names or contact details
- Any screenshot that has not completed Anton’s final privacy review
- Any test output, CI logs, or implementation notes
- Secrets, tokens, environment variable names, or session cookies

---

## Approval checklist (Anton)

Complete before any client send:

```text
[ ] All graphics use fictional training data
[ ] No real PII is visible
[ ] Guides match current live behaviour
[ ] Limitations are stated truthfully
[ ] Anton approved pack for client send
[ ] No client send has occurred from this PR
```

---

## Graphics status

See `05-graphics/GRAPHICS_MANIFEST.md` for per-image capture status.

**All eight required screenshots are present** in `05-graphics/captures/` (completed 2026-07-14):

- `01`–`05`, `07` — public / signed-out captures (automated + training submission for 04)
- `06` — authenticated Advisor Pipeline with fictional training request (**CAPTURED · PRIVACY_REVIEWED**)
- `08` — `/change` focused training lead + OPERATOR ACTIONS after lead-focus behaviour (**CAPTURED · PRIVACY_REVIEWED · CROPPED_TO_TRAINING_LEAD_AND_OPERATOR_ACTIONS**)

All eight required graphics are present and ready for Anton’s final privacy and client-send review.

---

## Training data standard

Use this fictional request for demonstrations and screen recordings:

| Field | Value |
|-------|-------|
| Name | LuxeMaurice Training User |
| Email | training@example.invalid |
| Phone | leave blank |
| Category | Residences |
| Intent | Exploring — advisory introduction |
| Region | Mauritius |
| Notes | Training demonstration request — safe to use in LuxeMaurice training materials. |

---

## Current workflow (one line)

Private Access Request submitted → persisted in CorpFlowAI Postgres (`leads` table) → visible in Advisor Pipeline (authenticated) → operator stage/notes via `/change` `concierge-leads-list`.
