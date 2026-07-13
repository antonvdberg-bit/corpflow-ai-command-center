# Video 3 — Operator Workflow

**Target length:** 2–4 minutes  
**Audience:** CorpFlow / LuxeMaurice operators  
**Prerequisite:** Operator or LuxeMaurice tenant access to `/change`

---

## Scene 1 — Open Change Console

| | |
|---|---|
| **Screen** | `https://lux.corpflowai.com/change` |
| **Narrator** | “Operators manage lead workflow in Change Console. This is where stage, notes, and next actions are updated today.” |
| **Action** | Sign in if needed. Open `/change`. |
| **Result** | Change Console loads. |
| **Caution** | Crop recording to LEADS panel only. Hide unrelated tickets and client data. |

---

## Scene 2 — Locate the request

| | |
|---|---|
| **Screen** | LEADS section — list loaded via concierge-leads-list |
| **Narrator** | “Find the private access request by name, contact, or LM-REQ reference. Training example: LuxeMaurice Training User.” |
| **Action** | Scroll LEADS · New strip. Select the training lead row. |
| **Result** | Lead detail panel opens with operator workflow fields. |
| **Graphic** | `08-change-console-lead-workflow.png` |

---

## Scene 3 — Review current stage

| | |
|---|---|
| **Screen** | Lead detail — operator workflow |
| **Narrator** | “Review stage, follow-up status, owner, next action date, and activity history before making changes.” |
| **Action** | Point to stage label and activity list. |
| **Result** | Operator sees current state. |

---

## Scene 4 — Add or update notes

| | |
|---|---|
| **Screen** | Lead workflow edit controls |
| **Narrator** | “Update stage or next action as your process requires. Saving calls concierge-lead-operator-patch — the workflow is persisted in Postgres.” |
| **Action** | Change next action note to a training-safe example. Save. |
| **Result** | Success feedback in UI; activity log updates. |
| **Caution** | Use training lead only. Do not display unrelated client records. |

---

## Scene 5 — Explain the boundary

| | |
|---|---|
| **Screen** | Split or voice over — CRM vs Change |
| **Narrator** | “The v2 Advisor Pipeline shows requests for advisors but does not support editing yet. Operators work here in Change Console. Outbound email and WhatsApp are not automated — that remains a future delivery slice.” |
| **Action** | Optional: brief cut to Advisor Pipeline read-only view. |
| **Result** | Viewer understands split responsibilities. |
| **Boundary** | Do not imply full backend automation is complete. |

---

## Closing line

“Submit on the buyer form → review in Advisor Pipeline → manage stage and notes in Change Console.”
