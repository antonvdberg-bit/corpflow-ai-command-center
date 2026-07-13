# Graphics Manifest — LuxeMaurice Training Pack v1

| Filename | Live route | Session | Training data visible | Purpose | Used in | Capture status | Redaction status |
|----------|------------|---------|----------------------|---------|---------|----------------|------------------|
| `01-landing-page.png` | `/client/luxe-maurice-ai` | Signed out | None | Hero and channel overview | Client guide §1; Video 1 scene 1 | CAPTURED | None required |
| `02-private-opportunities.png` | `/client/luxe-maurice-ai/properties` | Signed out | None | Access catalogue | Client guide §2; Video 1 scene 2 | CAPTURED | None required |
| `03-private-access-request-form.png` | `/client/luxe-maurice-ai/buyer` | Signed out | Optional (empty form OK) | Request form layout | Client guide §3; Video 1 scene 3 | CAPTURED | None required |
| `04-request-submitted-reference.png` | `/client/luxe-maurice-ai/buyer` | Signed out | Fictional training user + LM-REQ | Confirmation and reference | Client guide §6; Video 1 scene 5 | CAPTURED | Verify LM-REQ is training row only |
| `05-advisor-sign-in-prompt.png` | `/client/luxe-maurice-ai/crm` | Signed out | None | Privacy posture — no persisted PII | Advisor guide §2, §6; Video 2 scene 5 | CAPTURED | Verify no real PII |
| `06-advisor-pipeline-live-request.png` | `/client/luxe-maurice-ai/crm` | LuxeMaurice tenant | Training user only | Persisted request card | Advisor guide §3–4; Video 2 scene 3 | CAPTURE_REQUIRED | Crop to training row |
| `07-demonstration-records.png` | `/client/luxe-maurice-ai/crm` | Signed out | Sample layout only | Demonstration records section | Advisor guide §5; Video 2 scene 4 | CAPTURED | None required |
| `08-change-console-lead-workflow.png` | `/change` | Operator / tenant | Training lead only | Stage and notes workflow | Operator guide §5–6; Video 3 scene 2–4 | CAPTURE_REQUIRED | **REDACTION_REQUIRED** — crop unrelated leads |

---

## Capture status values

- **CAPTURE_REQUIRED** — PNG not yet in `captures/` or needs re-capture
- **CAPTURED** — PNG present and Anton-approved
- **REDACTION_REQUIRED** — PNG present but must be cropped/redacted before client send

Update this table when Anton drops files into `captures/` and changes status to `CAPTURED`.

---

## Automated capture command

```text
node scripts/luxe-maurice-training-pack-capture.mjs
```

Captures 01, 02, 03, 05, 07 automatically when production is reachable.

Optional 04:

```text
LUX_TRAINING_SUBMIT_FORM=1 node scripts/luxe-maurice-training-pack-capture.mjs
```

06 and 08 remain **manual** — authenticated operator capture.
