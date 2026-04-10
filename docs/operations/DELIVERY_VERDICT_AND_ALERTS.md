# Delivery verdict + 24/7 alerts (CMP)

## What this does

When a ticket is in **Approved / Build**, the factory continuously computes a **delivery verdict** and persists it on the ticket (`cmp_tickets.console_json.client_view.delivery_verdict`) so **`/change`** can show progress without GitHub/Vercel tabs.

It also emits **alerts** when a ticket becomes blocked or needs attention.

## Delivery verdict (current rules)

Computed only when the ticket is **Approved / Build**.

- **Pass (`ok: true`)** when:
  - a GitHub PR exists for `cmp/<ticket_id>` → `main`
  - there is evidence of **file changes** (overseer files count > 0)
  - a **preview URL** is attached to the ticket
- **Blocked** reasons include:
  - `PR_NOT_FOUND`
  - `NO_FILE_CHANGES_YET`
  - `PREVIEW_URL_MISSING`
  - `GITHUB_ACTIONS_NEEDS_ATTENTION`

## Where it runs (24/7)

- **Vercel cron** calls `/api/cron/cmp-monitor` daily (see `vercel.json`), and it can also be run ad-hoc.
- **Recommended:** set `CMP_MONITOR_TICKET_IDS` to the active ticket(s) so the monitor focuses on what matters.

## Alerts (Telegram + email via n8n forward)

### Telegram

Env vars:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_ALERT_CHAT_ID`

Telegram alerts are best-effort and do not block the monitor.

### Email (and Telegram, Slack, etc.) via n8n

This repo forwards ops alerts to your orchestrator using the existing automation forward mechanism:

- `CORPFLOW_AUTOMATION_FORWARD_URL`
- `CORPFLOW_AUTOMATION_FORWARD_SECRET` (optional but recommended)

Envelope: `corpflow.ops_alert.v1`

In n8n: route `kind=cmp_delivery_blocked` to:

- **Email to:** `antonvdberg@corpflowai.com` (until you change it)
- **Telegram:** your bot/channel (optional if you want Telegram via n8n instead of direct)

## How to verify end-to-end

1. Pick a ticket in **Approved / Build**.
2. Ensure `CMP_MONITOR_TICKET_IDS` includes that ticket id in Vercel.
3. Wait for the monitor to run (or call it manually).
4. Open `/change` → **Build status** shows **Delivery verdict** with “on-track” or “blocked: …”.
5. If blocked, confirm:
   - Telegram alert (if configured)
   - n8n received `corpflow.ops_alert.v1` (and sent email)

