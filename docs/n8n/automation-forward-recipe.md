# n8n: receive CorpFlow automation envelopes (no extra SaaS)

When `CORPFLOW_AUTOMATION_FORWARD_URL` points at an **n8n Webhook** node, every accepted automation row (ingest API **and** CMP mirror events) triggers a POST you can branch on.

## 1) n8n workflow (minimal)

1. **Webhook** — Method `POST`, Path e.g. `corpflow-automation` (copy the “Production URL”).
2. **IF** — Condition on `{{ $json.body.event_type }}` or `{{ $json.event_type }}` (depending on whether n8n wraps the body; use the preview pane).
3. Branches:
   - **`cmp.build.approved`** → Slack/Telegram/email to operators, or call GitHub API for follow-up.
   - **`cmp.github.callback`** → when `preview_url` is set, notify the client channel.
   - **`cmp.estimate.recorded`** → optional CRM row / spreadsheet (Google Sheets node).

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

## 4) Same webhook for password reset (optional)

You can reuse n8n for `CORPFLOW_PASSWORD_RESET_WEBHOOK_URL` with a **different** path and workflow. Keep secrets distinct per workflow.
