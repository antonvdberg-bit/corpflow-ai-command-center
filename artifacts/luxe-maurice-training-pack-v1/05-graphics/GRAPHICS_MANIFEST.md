# Graphics Manifest — LuxeMaurice Training Pack v1

| Filename | Live route | Session | Training data visible | Purpose | Used in | Capture status | Redaction status |
|----------|------------|---------|----------------------|---------|---------|----------------|------------------|
| `01-landing-page.png` | `/client/luxe-maurice-ai` | Signed out | None | Hero and channel overview | Client guide §1; Video 1 scene 1 | CAPTURED | None required |
| `02-private-opportunities.png` | `/client/luxe-maurice-ai/properties` | Signed out | None | Access catalogue | Client guide §2; Video 1 scene 2 | CAPTURED | None required |
| `03-private-access-request-form.png` | `/client/luxe-maurice-ai/buyer` | Signed out | Optional (empty form OK) | Request form layout | Client guide §3; Video 1 scene 3 | CAPTURED | None required |
| `04-request-submitted-reference.png` | `/client/luxe-maurice-ai/buyer` | Signed out | Fictional training user + LM-REQ | Confirmation and reference | Client guide §6; Video 1 scene 5 | CAPTURED | PRIVACY_REVIEWED — training row only |
| `05-advisor-sign-in-prompt.png` | `/client/luxe-maurice-ai/crm` | Signed out | None | Privacy posture — no persisted PII | Advisor guide §2, §6; Video 2 scene 5 | CAPTURED | PRIVACY_REVIEWED |
| `06-advisor-pipeline-live-request.png` | `/client/luxe-maurice-ai/crm` | Signed-in LuxeMaurice tenant | LuxeMaurice Training User / training@example.invalid / LM-REQ-PGVZ7HMI | Persisted request card under Received for advisor review | Advisor guide §3–4; Video 2 scene 2–3 | CAPTURED · PRIVACY_REVIEWED · added 2026-07-14 | PRIVACY_REVIEWED — fictional training data only; crop browser chrome before client send if preferred |
| `07-demonstration-records.png` | `/client/luxe-maurice-ai/crm` | Signed out | Sample layout only | Demonstration records section | Advisor guide §5; Video 2 scene 4 | CAPTURED | None required |
| `08-change-console-lead-workflow.png` | `/change` | Operator /change session | LuxeMaurice Training User / training@example.invalid | Focused lead + OPERATOR ACTIONS (select lead → list collapses) | Operator guide §4–6; Video 3 scene 2–4 | CAPTURED · PRIVACY_REVIEWED · added 2026-07-14 | CROPPED_TO_TRAINING_LEAD_AND_OPERATOR_ACTIONS |

---

## Capture status values

- **CAPTURED** — PNG present in the pack
- **PRIVACY_REVIEWED** — inspected for fictional training data only; no real client PII
- **PENDING_RECAPTURE** — PNG missing or needs a fresh capture (not used while all eight graphics are present)

As of 2026-07-14, **all eight graphics are CAPTURED**. No graphics are pending recapture.

---

## Authenticated captures (06 and 08)

| | 06 | 08 |
|---|----|----|
| **Source used** | `docs/LUX/06-advisor-pipeline-live-request.png` | Operator paste after PR #589 focus behaviour (canonicalised as pack capture) |
| **File size** | 85,220 bytes | 131,582 bytes |
| **Dimensions** | 1280×386 | 540×720 |
| **Privacy** | Fictional training request only | Fictional training lead + operator actions; no unrelated lead rows |

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

Authenticated captures 06 and 08 remain **manual** for future recaptures — see `GRAPHICS_CAPTURE_CHECKLIST.md`.
