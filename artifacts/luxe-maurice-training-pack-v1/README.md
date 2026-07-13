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
- Screenshots marked `CAPTURE_REQUIRED` or `REDACTION_REQUIRED`
- `/change` captures showing unrelated client names or contact details
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

**Captured automatically (production, 2026-07-13):** `01`–`05`, `07` — via `node scripts/luxe-maurice-training-pack-capture.mjs` (04 used fictional training submission).

**Still requires manual capture (authenticated):**

- `06-advisor-pipeline-live-request.png` — LuxeMaurice tenant sign-in required
- `08-change-console-lead-workflow.png` — `/change` operator session; crop to training request only

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
