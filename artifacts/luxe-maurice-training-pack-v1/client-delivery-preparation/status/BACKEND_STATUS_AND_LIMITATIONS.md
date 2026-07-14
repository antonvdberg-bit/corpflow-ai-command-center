# Backend Status and Current Limitations

**LuxeMaurice AI — Private Access Request workflow**  
**As of:** production validation after PR #585, #586, #589, and #590  
**Site:** `https://lux.corpflowai.com/client/luxe-maurice-ai`

---

## Summary for Jan (operator-approved excerpt)

The **receive-and-review workflow is live**:

- Clients can submit Private Access Requests on the live site.
- Requests are stored securely and appear in the Advisor Pipeline for signed-in LuxeMaurice advisors.
- Operators manage stage and notes in Change Console, including **focused selected-lead behaviour** (select a lead → list focuses → OPERATOR ACTIONS appears below).
- Further workflow automation and inline advisor actions remain **planned future enhancements**.
- Outbound email, WhatsApp, and SMS are **not live**. Follow-up is **human-led**.

---

## Live now

| Capability | Status |
|------------|--------|
| Buyer form submission | **Live** — Private Access Request on `/client/luxe-maurice-ai/buyer` |
| Server-side persistence | **Live** — CorpFlowAI storage for LuxeMaurice |
| Tenant isolation | **Live** — LuxeMaurice tenant context enforced server-side |
| Client reference | **Live** — displayed `LM-REQ-…` on successful submit |
| Advisor Pipeline list | **Live** — authenticated LuxeMaurice tenant session on `/client/luxe-maurice-ai/crm` |
| Signed-out privacy | **Live** — no persisted client detail; sign-in prompt + Demonstration records only |
| Operator lead list | **Live** — `/change` → LEADS · LuxeMaurice CRM (concierge) |
| Operator workflow updates | **Live** — stage, notes, next action, owner |
| Focused selected-lead list + OPERATOR ACTIONS | **Live** — select lead focuses the list; Show all leads / Clear selection / Focus list on this lead |
| Internal operations event on create | **Live** — recorded on create (**no external send**) |
| Storage model | **Live** — single CorpFlowAI database; no second client database required for this workflow |

---

## Not live yet

| Capability | Status |
|------------|--------|
| Inline CRM status editing | **Not live** — Advisor Pipeline is read-only |
| Advisor assignment in Advisor Pipeline | **Not live** |
| Outbound email to client | **Not live** |
| Outbound WhatsApp | **Not live** |
| Outbound SMS | **Not live** |
| Automated client confirmation email | **Not live** |
| Automated advisor notification | **Not live** |
| Edit stage or notes in Advisor Pipeline | **Not live** — use `/change` |
| Full backend messaging automation | **Not complete** — receive-and-review only |

---

## Wording discipline

**Do say:**

- “The current receive-and-review workflow is live.”
- “Further workflow automation and inline advisor actions remain future delivery slices.”
- “Advisors review in the Advisor Pipeline; operators update workflow in Change Console.”
- “Follow-up is human-led; platform outbound messaging is not live.”

**Do not say:**

- “The backend is fully complete.”
- “Clients receive automatic email confirmation.”
- “Advisors can update status in the CRM page today.”
- “WhatsApp / email / SMS is sent automatically.”

---

## Data path (operator reference)

```text
/client/luxe-maurice-ai/buyer
  → Private Access Request submit
  → LuxeMaurice lead stored with access-request details

/client/luxe-maurice-ai/crm (tenant session)
  → Advisor Pipeline cards for review (read-only)

/change (operator session)
  → LEADS · LuxeMaurice CRM (concierge)
  → select lead → focus → OPERATOR ACTIONS
  → stage / owner / next action / notes updates
```

---

## Training pack alignment

Guides and video scripts in this pack describe **only** the live capabilities above. Planned items are labelled **planned future enhancement** throughout. No material in this pack authorizes or records an external client send.
