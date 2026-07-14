# LuxeMaurice — Operator Change Console Workflow

This guide describes the **current real operational path** for LuxeMaurice Private Access Requests after they are submitted on the live site.

**Operator console:** `https://lux.corpflowai.com/change` (or `https://core.corpflowai.com/change` with LuxeMaurice tenant context)

---

## End-to-end flow

```text
Private Access Request submitted (buyer form)
  → stored securely for LuxeMaurice
  → visible in LuxeMaurice Advisor Pipeline (authenticated tenant session)
  → operator uses /change LEADS for stage and notes workflow
```

---

## 1. Request arrives

When a client submits the Private Access Request form:

- The request is stored for tenant `luxe-maurice`.
- Intent is recorded as a LuxeMaurice private access request.
- The client receives an **`LM-REQ-…`** reference on screen.
- An internal event is recorded for operations (no outbound email, WhatsApp, or SMS is sent automatically).

---

## 2. Advisor visibility

Advisors signed in to LuxeMaurice can open:

`https://lux.corpflowai.com/client/luxe-maurice-ai/crm`

They see persisted rows under **Received for advisor review**. This is the advisor review workspace — **read-only** for workflow edits. Outbound messaging automation is **not live**.

---

## 3. Open Change Console

Operators with appropriate access:

1. Sign in to CorpFlow (factory master or LuxeMaurice tenant session on the Lux host).
2. Open **`/change`** (`https://lux.corpflowai.com/change`).
3. Locate **LEADS · LuxeMaurice CRM (concierge)**.

The console lists LuxeMaurice leads including private access requests, with operator workflow fields for triage.

---

## 4. Locate and focus the request

In the LEADS list:

1. Find the lead by name, contact, or recent created time.
2. Private access requests use intent for private access / concierge lead review.
3. Use the **LM-REQ-…** reference from the client or Advisor Pipeline when matching.
4. By default, demonstration and internal/test rows may be hidden — use **Show internal / test** if you need to see the training row.
5. **Select the lead.** The list focuses on that row (other leads are temporarily hidden) and **OPERATOR ACTIONS** appears directly underneath.

Focus controls:

| Control | Result |
|---------|--------|
| **Show all leads** | Restores the full list; the selected lead stays highlighted |
| **Clear selection** | Clears the selection and exits focus mode |
| **Focus list on this lead** | Re-collapses the list after browsing all leads |

![Change Console lead workflow](../graphics/08-change-console-lead-workflow.png)

*Figure 8 — Focused training lead with OPERATOR ACTIONS directly below*

---

## 5. Review current stage

With the lead focused, the **OPERATOR ACTIONS** panel shows workflow fields:

| Field | Meaning |
|-------|---------|
| **Stage** | CRM stage (e.g. new, contacted, qualified) |
| **Follow-up status** | Current follow-up posture |
| **Owner** | Assigned operator username |
| **Next action at** | Scheduled follow-up datetime |
| **Next action note** | Operator note for the next step |
| **Activity** | Chronological workflow history |

Read qualification details and client message in the lead record.

---

## 6. Update stage and notes

Typical operator actions:

1. Set **stage** when the enquiry progresses.
2. Set **follow-up status** and **next action** date/note.
3. Assign **owner** if your team uses ownership.
4. Add **internal notes** through the workflow activity (as supported in the current UI).

Save changes so the lead’s operator workflow is updated.

**Important:** The Advisor Pipeline (`/client/luxe-maurice-ai/crm`) does **not** support these edits today. All stage and notes management happens in **`/change`**.

---

## 7. Current boundary

| Live today | Not live yet |
|------------|--------------|
| Persisted submissions | Inline CRM status editing in Advisor Pipeline |
| Advisor Pipeline read view | Advisor assignment in Advisor Pipeline |
| `/change` stage, notes, owner, next action | Outbound email / WhatsApp / SMS automation |
| Focused lead list + OPERATOR ACTIONS below selection | Automated client confirmation messages |
| Human-led follow-up using submitted contact details | Automated advisor notifications |

---

## Training and privacy

When capturing operator screenshots:

- Select the **LuxeMaurice Training User** row so the list focuses.
- Capture the focused lead plus **OPERATOR ACTIONS** only.
- Do not share screenshots that show unrelated client names, emails, or phone numbers.
- Do not include session tokens, cookies, or browser developer tools.

---

## Quick reference

| Action | Where |
|--------|-------|
| List leads | Change Console · **LEADS · LuxeMaurice CRM (concierge)** |
| Focus a lead | Click the lead row |
| Show full list again | **Show all leads** |
| Clear selection | **Clear selection** |
| Re-focus after browsing | **Focus list on this lead** |
| Update lead workflow | OPERATOR ACTIONS |
| Advisor read-only view | `/client/luxe-maurice-ai/crm` |
| Client submission | `/client/luxe-maurice-ai/buyer` |
