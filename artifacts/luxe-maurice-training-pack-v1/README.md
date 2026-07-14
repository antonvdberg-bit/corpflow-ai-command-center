# LuxeMaurice Training Pack v1

Version-controlled training materials for Jan and the LuxeMaurice team. Documents the **live** Private Access Request workflow as verified on production after PR #585, #586, #589, and #590.

**Production site:** `https://lux.corpflowai.com/client/luxe-maurice-ai`

---

## Anton: start review here

| Entry | Path |
|-------|------|
| **Review edition (Markdown)** | [`review/LUXEMAURICE_TRAINING_PACK_REVIEW.md`](./review/LUXEMAURICE_TRAINING_PACK_REVIEW.md) |
| **Review edition (HTML)** | [`review/LUXEMAURICE_TRAINING_PACK_REVIEW.html`](./review/LUXEMAURICE_TRAINING_PACK_REVIEW.html) |
| **Record changes (`AR-*`)** | [`review/ANTON_REVIEW_CHANGES.md`](./review/ANTON_REVIEW_CHANGES.md) |
| **How the review loop works** | [`review/README.md`](./review/README.md) |
| **Jan delivery package (drafts)** | [`client-delivery-preparation/`](./client-delivery-preparation/) |

**No external send has occurred.** Email, WhatsApp, and SMS have not been sent. Outbound messaging automation is not live. Anton approval is still required before any client send.

---

## Where to view

### Live surfaces (production)

Canonical routes only. Short aliases such as `/private-opportunities`, `/private-access`, and `/advisor/pipeline` are **not** live for this product surface.

| Surface | URL |
|---------|-----|
| Landing | `https://lux.corpflowai.com/client/luxe-maurice-ai` |
| Access catalogue | `https://lux.corpflowai.com/client/luxe-maurice-ai/properties` |
| Private Access Request form | `https://lux.corpflowai.com/client/luxe-maurice-ai/buyer` |
| Advisor review workspace | `https://lux.corpflowai.com/client/luxe-maurice-ai/crm` |
| Change Console (operator LEADS) | `https://lux.corpflowai.com/change` |

### Repo pack (review and packaging only)

```text
artifacts/luxe-maurice-training-pack-v1/
```

These repo artifacts are for **Anton review and packaging**. They are not public website pages. Guides and PNGs live in Git so the team can review and prepare a client send — they are not automatically published as HTML routes.

---

## Pack contents

| Folder | Purpose |
|--------|---------|
| `review/` | **Single Anton review entry** + change-request loop |
| `client-delivery-preparation/` | Draft Jan package, cover note, draft messages, checklist |
| `01-client-review-guide/` | Client-facing journey — submit a Private Access Request |
| `02-advisor-workflow-guide/` | Advisor review workspace — read persisted requests |
| `03-operator-workflow-guide/` | Operator path via `/change` with focused-lead OPERATOR ACTIONS |
| `04-training-video-scripts/` | Optional screen-recording scripts (not required for send while graphics 01–08 are complete) |
| `05-graphics/` | Screenshot manifest, capture checklist, PNG captures |
| `06-backend-status/` | What is live now vs planned future enhancements |

---

## Safe to send Jan (after Anton approval)

- Materials assembled under `client-delivery-preparation/` (guides, scripts, status, approved graphics)
- Source equivalents in `01`–`04` and `06` once Anton confirms they match the approved review edition
- `05-graphics/captures/` — **only Anton-approved PNGs** (fictional training data, no real PII)

## Do not send Jan without review

- This README (internal routing)
- Raw repository paths or internal file names in client emails
- `05-graphics/GRAPHICS_CAPTURE_CHECKLIST.md` (operator instructions)
- `05-graphics/source-review/` (internal source captures, when present)
- Uncropped `/change` captures showing unrelated client names or contact details
- Any screenshot that has not completed Anton’s final privacy review
- Any test output, CI logs, or implementation notes
- Secrets, tokens, environment variable names, or session cookies
- Draft email / WhatsApp text before Anton approves **actual external send**

---

## Anton review checklist

Complete before any client send. Leave items unchecked until Anton confirms.

```text
[ ] All eight graphics are present in 05-graphics/captures/
[ ] All graphics use fictional training data only
[ ] No unrelated client PII is visible in any graphic
[ ] Graphic 06 browser-chrome crop completed (BROWSER_CHROME_CROPPED · FOCUSED_TO_TRAINING_REQUEST)
[ ] Training guides and screenshot sequence (01–08) are ready and match live behaviour
[ ] Video recordings are optional (not required for client-send preparation; scripts remain for later use if wanted)
[ ] Limitations are stated truthfully (do not claim platform outbound messaging is enabled; Advisor Pipeline remains read-only)
[ ] Anton approved pack for client-send preparation
[ ] Anton approved actual external send
[ ] No client send has occurred
```

**Status:** All eight required graphics are present. Graphic **06** is cropped (`BROWSER_CHROME_CROPPED · FOCUSED_TO_TRAINING_REQUEST · PRIVACY_REVIEWED · READY_FOR_ANTON_REVIEW`). **Recorded videos are not required** — the screenshot progression plus guides are sufficient for client-send preparation. Final client-send approvals remain **required** — **no client send from this pack**.

---

## Graphics status

See `05-graphics/GRAPHICS_MANIFEST.md` for per-image capture status.

**All eight required screenshots are present** in `05-graphics/captures/` (completed 2026-07-14):

- `01`–`05`, `07` — public / signed-out captures
- `06` — authenticated Advisor Pipeline training request (**BROWSER_CHROME_CROPPED · FOCUSED_TO_TRAINING_REQUEST · PRIVACY_REVIEWED · READY_FOR_ANTON_REVIEW**)
- `08` — `/change` focused training lead + OPERATOR ACTIONS (**CROPPED_TO_TRAINING_LEAD_AND_OPERATOR_ACTIONS · PRIVACY_REVIEWED · READY_FOR_ANTON_REVIEW**)

**Videos:** Written scripts exist under `04-training-video-scripts/` for optional later recording. They are **not** a gate for client-send preparation while graphics 01–08 and the guides are complete.

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

Private Access Request submitted → stored for LuxeMaurice → visible in Advisor Pipeline (authenticated, read-only) → operator stage/notes via `/change` LEADS (select lead → focus → OPERATOR ACTIONS). Follow-up is human-led; platform outbound messaging is not live.
