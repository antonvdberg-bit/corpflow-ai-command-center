# Backend Status and Current Limitations

**LuxeMaurice AI — Private Access Request workflow**  
**As of:** production validation after PR #585 and PR #586  
**Site:** `https://lux.corpflowai.com/client/luxe-maurice-ai`

---

## Summary for Jan (operator-approved excerpt)

The **receive-and-review workflow is live**:

- Clients can submit Private Access Requests on the live site.
- Requests are stored securely and appear in the Advisor Pipeline for signed-in LuxeMaurice advisors.
- Operators manage stage and notes in Change Console.
- Further workflow automation and inline advisor actions remain **planned future enhancements**.

---

## Live now

| Capability | Status |
|------------|--------|
| Buyer form submission | **Live** — `POST /api/lux/luxe-maurice-ai/private-access-request` |
| Server-side persistence | **Live** — existing CorpFlowAI `leads` table |
| Tenant isolation | **Live** — tenant context forced to `luxe-maurice` server-side |
| Client reference | **Live** — displayed `LM-REQ-…` on successful submit |
| Advisor Pipeline list | **Live** — `GET /api/lux/luxe-maurice-ai/private-access-requests` (authenticated LuxeMaurice tenant session) |
| Signed-out privacy | **Live** — no persisted PII; sign-in prompt + Demonstration records only |
| Operator lead list | **Live** — `/change` → `concierge-leads-list` |
| Operator workflow updates | **Live** — `concierge-lead-operator-patch` (stage, notes, next action, owner) |
| Internal automation event | **Live** — recorded on create (no external send) |
| Storage model | **Live** — single CorpFlowAI Postgres; no second database; no external database project |

---

## Not live yet

| Capability | Status |
|------------|--------|
| Inline CRM status editing | **Not live** — v2 CRM is read-only |
| Advisor assignment in v2 CRM | **Not live** |
| Outbound email to client | **Not live** |
| Outbound WhatsApp | **Not live** |
| Outbound SMS | **Not live** |
| Automated client confirmation email | **Not live** |
| Automated advisor notification | **Not live** |
| Edit stage or notes in v2 CRM | **Not live** — use `/change` |
| Full backend automation | **Not complete** — receive-and-review only |

---

## Wording discipline

**Do say:**

- “The current receive-and-review workflow is live.”
- “Further workflow automation and inline advisor actions remain future delivery slices.”
- “Advisors review in the Advisor Pipeline; operators update workflow in Change Console.”

**Do not say:**

- “The backend is fully complete.”
- “Clients receive automatic email confirmation.”
- “Advisors can update status in the CRM page today.”

---

## Data path (technical — operator reference)

```text
/client/luxe-maurice-ai/buyer
  → POST private-access-request
  → leads row (tenant_id=luxe-maurice, intent=lux_private_access_request)
  → qualification_json.access_request (structured fields)

/client/luxe-maurice-ai/crm (tenant session)
  → GET private-access-requests
  → mapped advisor cards

/change (operator session)
  → concierge-leads-list
  → concierge-lead-operator-patch
```

---

## Training pack alignment

Guides and video scripts in this pack describe **only** the live capabilities above. Planned items are labelled **planned future enhancement** throughout.
