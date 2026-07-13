# LuxeMaurice — Operator Change Console Workflow

This guide describes the **current real operational path** for LuxeMaurice Private Access Requests after they are submitted on the live site.

**Operator console:** `https://lux.corpflowai.com/change` (or `https://core.corpflowai.com/change` with LuxeMaurice tenant context)

---

## End-to-end flow

```text
Private Access Request submitted (buyer form)
  → persisted in CorpFlowAI Postgres (existing leads table)
  → visible in LuxeMaurice Advisor Pipeline (authenticated tenant session)
  → operator uses /change concierge-leads-list for stage and notes workflow
```

---

## 1. Request arrives

When a client submits the Private Access Request form:

- Data is stored in the existing **`leads`** table with tenant `luxe-maurice`.
- Intent is recorded as a LuxeMaurice private access request.
- The client receives an **`LM-REQ-…`** reference on screen.
- An internal automation event is recorded (no outbound email or WhatsApp is sent automatically).

---

## 2. Advisor visibility

Advisors signed in to LuxeMaurice can open:

`https://lux.corpflowai.com/client/luxe-maurice-ai/crm`

They see persisted rows under **Received for advisor review**. This is the client-facing advisor workspace — read-only for workflow edits.

---

## 3. Open Change Console

Operators with appropriate access:

1. Sign in to CorpFlow (factory master or LuxeMaurice tenant session on the Lux host).
2. Open **`/change`**.
3. Locate the **LEADS** section.

The console loads leads via:

```text
GET /api/cmp/router?action=concierge-leads-list&limit=100
```

This returns LuxeMaurice leads including private access requests, with `operator_workflow` metadata for CRM-style triage.

---

## 4. Locate the request

In the LEADS list:

1. Find the lead by name, contact, or recent created time.
2. Private access requests use intent **`lux_private_access_request`**.
3. Use the **LM-REQ-…** reference from the client or Advisor Pipeline when matching.
4. By default, system-generated test rows may be hidden — use the show/hide control if you need to see all rows.

Select the lead to open the detail panel.

---

## 5. Review current stage

The lead detail shows **operator workflow** fields:

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

To save workflow changes, the console calls:

```text
POST /api/cmp/router?action=concierge-lead-operator-patch
```

Typical operator actions:

1. Set **stage** when the enquiry progresses.
2. Set **follow-up status** and **next action** date/note.
3. Assign **owner** if your team uses ownership.
4. Add **internal notes** through the workflow activity (as supported in the current UI).

Save changes. The lead’s `operator_workflow` in Postgres is updated.

**Important:** The v2 Advisor Pipeline (`/client/luxe-maurice-ai/crm`) does **not** support these edits today. All stage and notes management happens in **`/change`**.

---

## 7. Current boundary

| Live today | Not live yet |
|------------|--------------|
| Persisted submissions | Inline CRM status editing |
| Advisor Pipeline read view | Advisor assignment in v2 CRM |
| `/change` stage, notes, owner, next action | Outbound email / WhatsApp / SMS automation |
| `concierge-leads-list` and `concierge-lead-operator-patch` | Automated client confirmation messages |
| | Automated advisor notifications |

![Change Console lead workflow](../05-graphics/captures/08-change-console-lead-workflow.png)

*Figure 8 — Operator LEADS workflow in Change Console (crop to training request only before sharing)*

---

## Training and privacy

When capturing operator screenshots:

- Crop to the **LuxeMaurice Training User** row only.
- Do not share screenshots that show unrelated client names, emails, or phone numbers.
- Do not include session tokens, cookies, or browser developer tools.

---

## Quick reference

| Action | Route |
|--------|-------|
| List leads | `concierge-leads-list` |
| Update lead workflow | `concierge-lead-operator-patch` |
| Advisor read-only view | `/client/luxe-maurice-ai/crm` |
| Client submission | `/client/luxe-maurice-ai/buyer` |
