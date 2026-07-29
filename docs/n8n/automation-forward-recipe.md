# n8n: receive CorpFlow automation envelopes (no extra SaaS)

When `CORPFLOW_AUTOMATION_FORWARD_URL` points at an **n8n Webhook** node, every accepted automation row (ingest API **and** CMP mirror events) triggers a POST you can branch on.

## 1) n8n workflow (minimal)

1. **Webhook** — Method `POST`, Path e.g. `corpflow-automation` (copy the “Production URL”).
2. **IF** — Condition on `{{ $json.body.event_type }}` or `{{ $json.event_type }}` (depending on whether n8n wraps the body; use the preview pane).
3. Branches:
   - **`cmp.build.approved`** → Telegram/email to operators (Slack **retired** — issue #658), or call GitHub API for follow-up.
   - **`cmp.github.callback`** → when `preview_url` is set, notify the client channel.
   - **`cmp.estimate.recorded`** → optional CRM row / spreadsheet (Google Sheets node).
   - **`corpflow.lead_rescue.intake_received`** → operator notification on a new AI Lead Rescue intake (`/lead-rescue`). The envelope **`payload`** already contains a pre-formatted **`notification_text`** field you can pipe straight into Telegram / email — no further templating needed. Structured fields are also present (`payload.prospect.*`, `payload.admin_detail_url`, `payload.lead_id`) for spreadsheet rows or CRM mirrors. Idempotency key is `lead-rescue:intake:<lead_id>` so retries do not double-notify.
   - **`corpflow.ops_alert.v1`** (envelope field) with **`kind`** in the four operator checkpoint kinds below → **Telegram to Anton only** when your existing Telegram credential is attached. Pipe **`message`** or **`meta.notification_text`** straight into the Telegram node (same pattern as Lead Rescue). **Do not** auto-send client email or WhatsApp from this branch.
   - **`intake.product_a.us_clinic.v1`** → Product A US clinic audit intake (`/product-a/us-clinics`). Branch to workflow **`product-a-us-clinic-intake-v1`**. Intake fields are in **`payload`** (flat `corpflow.product_a.intake.v1`). Full build runbook: **`docs/n8n/product-a-us-clinics-implementation-pack.md`**. Ops context: **`docs/product/PRODUCT_A_NON_GHL_DATA_WORKFLOW_PACKET.md`**. No auto-send to prospect — Gmail **drafts only**, operator approval required.

### 1.1 Mandatory fail-closed notification guard

The automation-forward webhook receives every accepted automation event, not only
Lead Rescue and checkpoint alerts. Never wire an IF node's false/default output
directly to Telegram.

Required order:

1. Authenticate at the Webhook node with n8n Header Auth. Authentication mismatch
   must stop before any Code or Telegram node.
2. Explicitly allow only:
   - `event_type == corpflow.lead_rescue.intake_received`, or
   - `envelope == corpflow.ops_alert.v1` with one of the four §5 checkpoint kinds.
3. Mark missing/unknown types or blank/whitespace text as `route: ignored` with
   empty `telegram_text`; route that control item directly to the response node,
   never Telegram.
4. Deduplicate on envelope `id` (or the lead/alert stable fallback) before sending.
5. Apply a burst cap before Telegram.
6. Use `={{ $json.telegram_text }}` (one leading `=`) and a final nonblank IF.
7. Respond with bounded 2xx after routing completes so sequential callers cannot
   overlap the static-data guard; authentication failures remain 4xx.

An inactive, secret-free test workflow implementing these guards is available at
`docs/n8n/templates/automation-forward-issue-611-safe-test.template.json`.
Import and exercise it only with n8n's test webhook and test Header Auth
credential. It does not authorize production activation.

**Incident #611:** the former production workflow used an inverted `notEquals`
authentication IF and passed unrelated standard envelopes into an Alerts Code
node that returned an item with blank text. Keep that workflow inactive until the
issue's test matrix passes and Anton explicitly approves reactivation.

### 1.2 Incident #611 reactivation gate

Do not reuse the exposed production webhook URL. Reactivation is an
operator-approved maintenance action, not part of the repository repair.

Before requesting Anton's approval:

1. Import the inactive safe-test template under a new test webhook path.
2. Attach test Header Auth and Telegram credentials inside n8n; never place their
   values in the export, issue, screenshots, or repository.
3. Run and record: one valid lead, one valid alert, missing text, unknown event,
   duplicate event, and a 12-event burst. Expected Telegram counts are
   `1, 1, 0, 0, 1 maximum, 5 maximum`.
   On Windows, run
   `powershell -ExecutionPolicy Bypass -File scripts/test-n8n-automation-forward-issue-611.ps1`;
   it prompts privately for the new test URL and Header Auth value and does not
   store either value in command history or the repository.
4. Confirm invalid Header Auth returns 4xx and authenticated ignored events return
   2xx without reaching Telegram. The test Webhook must use **Using Respond to
   Webhook Node**, with all notification and ignored branches ending at the one
   `Respond 200` node. Do not use **Immediately** or **When Last Node Finishes**;
   sequential matrix calls must wait for the static-data guard to finish.
5. Record sanitized execution IDs/timestamps and obtain Anton's explicit approval.

Only after approval: create a new production webhook path and forward secret,
update n8n Header Auth and the Vercel forward URL/secret in one maintenance
window, activate the hardened workflow, send one operator-only canary, and watch
executions plus Telegram for 15 minutes. Keep the old workflow inactive; never
reactivate it as-is. Roll back by deactivating the new workflow and removing the
new Vercel forward URL until the routing defect is corrected.

## 2) Vercel env

| Variable | Value |
|----------|--------|
| `CORPFLOW_AUTOMATION_FORWARD_URL` | Full webhook URL from n8n |
| `CORPFLOW_AUTOMATION_FORWARD_SECRET` | Random string; same value in n8n header check |

CorpFlow sends header `x-corpflow-automation-forward-secret` when the secret is set. In n8n, add a **IF** or **Function** node comparing it to your stored secret.

## 3) Envelope shape (`corpflow.automation.envelope.v1`)

```json
{
  "schema": "corpflow.automation.envelope.v1",
  "id": "clx…",
  "occurred_at": "2026-04-02T12:00:00.000Z",
  "tenant_id": "legal-demo",
  "tenant_scope": "legal-demo",
  "event_type": "cmp.build.approved",
  "correlation_id": null,
  "risk_tier": "low",
  "source": "cmp",
  "payload": { "ticket_id": "…", "dispatch_ok": true }
}
```

High-risk types from **external** ingest still require approval headers on the ingest API; CMP mirror events use trusted `cmp.*` / callback types only.

## 4) Outbound email is a separate workflow (not this recipe)

This recipe is for the **automation forward** channel (`CORPFLOW_AUTOMATION_FORWARD_URL` — operational envelopes / CMP mirror events). It is **not** the channel for client-facing transactional email.

For outbound email (`password_reset`, future `estimate_ready`, `concierge_lead_received`, etc.):

- Wire-level recipe: **`docs/n8n/password-reset-email-recipe.md`**.
- Canonical model (event catalog, sender aliases, approval rules, evidence): **`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`**.
- Env vars (preferred names): `N8N_EMAIL_WEBHOOK_URL`, `N8N_EMAIL_WEBHOOK_SECRET`, `EMAIL_FROM` (legacy `CORPFLOW_PASSWORD_RESET_WEBHOOK_*` still read as fallbacks).

Keep the two workflows in n8n distinct: different webhook paths, different shared secrets, different downstream branches.

## 5) Operator checkpoint alerts (Anton Telegram only)

When `CORPFLOW_AUTOMATION_FORWARD_URL` is configured, the app emits **`corpflow.ops_alert.v1`** envelopes **only** for these four **`kind`** values (see `lib/server/operator-checkpoint-alert.js`):

| `kind` | When emitted |
|--------|----------------|
| `production_validation_failure` | CMP delivery verdict blocked or Reality Gate failed after promote-merge (**corpflow_test** live URL — not client_production) |
| `client_approval_needed` | Preview URL first attached — client must review on `/change` |
| `production_approval_needed` | Client approved preview — **operator merge/promote to CorpFlowAI test spine (`corpflow_test`)**. Enum name kept for compatibility; **not** client_production authorization (#679) |
| `external_email_client_send_approval_needed` | Change Console AI reply withheld pending operator approval |

Publishing or validating a change on a CorpFlowAI-hosted **corpflow_test** URL is not by itself a heartbeat / Anton Decision Inbox exception. True **client_production** remains a separate, explicitly approved process.

**n8n branch (reuse existing automation-forward workflow + Telegram credential):**

1. After forward-secret validation, IF `envelope == corpflow.ops_alert.v1` (or top-level `kind` present).
2. IF `kind` is one of the four rows above.
3. Telegram → Send Message using `{{ $json.message }}` or `{{ $json.meta.notification_text }}` (pre-formatted; no secrets in body).

**Message shape (already formatted server-side):**

```text
CorpFlowAI checkpoint:
- What needs approval: …
- Link: …
- Risk: …
- Required answer: APPROVE / HOLD / FIX
```

**Do not** create a new Telegram bot or chat for this — reuse the operator Telegram credential already on the automation-forward workflow. **Do not** fan out to client channels from this branch.
