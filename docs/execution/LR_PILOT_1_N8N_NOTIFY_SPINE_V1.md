# LR Pilot #1 — n8n notify-only spine v1 (Stage 6: intake received)

**Status:** **OPERATOR-TESTED / WORKING (2026-06-29).** Built and verified on `corpflow-exec-01-u69678` via Option A (grafted into the existing automation-forward workflow). See **§7.1 Recorded operator evidence**. Stage 6 only. Notify/remind only — no automated outreach, no customer-facing message, no payment/ERPNext/DB-schema/app-code change. The n8n workflow itself is built by the operator in the n8n UI on `corpflow-exec-01-u69678` (loopback-only); this repo holds the **build instructions + evidence template + rollback**, never secrets.

**Anchor sentinel:** `<!-- LR_PILOT_1_N8N_NOTIFY_SPINE_V1 -->`

<!-- LR_PILOT_1_N8N_NOTIFY_SPINE_V1 -->

**Doctrine anchors:** `docs/marketing-automation-arm.md` §8–§9 (n8n = notify/reminder spine; outreach human-approved), `docs/n8n/automation-forward-recipe.md` §1+§3 (envelope + branch), `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` §1+§9 (intake event + Friday-safe runtime), `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` (L1 repo vs L3 box; n8n build is operator-owned).

---

## 1. Scope

| In scope (v1) | Out of scope (v1) |
|---|---|
| One n8n branch that fires on the **already-live** forwarded event `corpflow.lead_rescue.intake_received` and sends **one internal notification** to Anton/operator: "review intake within 2 business hours". | Stages 1–5 and 7–10 of the full pilot spine; Tasks-tab append (deferred — needs Google credentials); any send/approve/payment automation; WhatsApp/SMS; ERPNext; DB schema; app code; new app env vars. |

The trigger already exists: `CORPFLOW_AUTOMATION_FORWARD_URL` is configured (`forward_url_configured: true`) and n8n already receives the `corpflow.automation.envelope.v1` envelope with the forward-secret IF-node validated. This packet adds **one branch** after that existing validation — **no new app code, no new env var, no new forward secret.**

## 2. Trigger

- **Source:** the existing automation-forward Webhook workflow in n8n (the one already validating `x-corpflow-automation-forward-secret`).
- **Branch filter (IF / Switch node):**
  - `{{ $json.body.event_type }}` **equals** `corpflow.lead_rescue.intake_received`
  - (use `{{ $json.event_type }}` instead if the preview pane shows n8n did not wrap the body — confirm in the n8n execution preview).
- **Idempotency:** the event carries idempotency key `lead-rescue:intake:<lead_id>`; retries must not double-notify. Add a dedup guard keyed on `payload.lead_id` (e.g. a "seen lead_ids" static-data check or a 1-row cache) so a re-forward does not re-alert.

## 3. Field mapping (envelope → notification)

The event payload (under `body.payload`) is built by `buildAiLeadRescueIntakeNotification` in `lib/cmp/_lib/ai-lead-rescue-operator.js`. **Use only the five allowed fields below.** Do **not** pipe the full pre-formatted `payload.notification_text` — it also contains email/phone/region, which exceed this notification's intended content.

| Notification field | n8n expression | Notes |
|---|---|---|
| Business name | `{{ $json.body.payload.prospect.business_name }}` | falls back to `(not provided)` server-side |
| First name (if available) | `{{ ($json.body.payload.prospect.contact_name || '').split(' ')[0] }}` | only `contact_name` exists; take the first token |
| Lead / intake reference | `{{ $json.body.payload.lead_id }}` | cuid; the canonical reference |
| Admin detail URL | `{{ $json.body.payload.admin_detail_url }}` | absolute when `CORPFLOW_PUBLIC_BASE_URL` is set; else a path |
| Action required | literal: `Review within 2 business hours` | matches server `next_action` |

**Minimal message template (paste into the notification node):**

```text
New AI Lead Rescue intake — action required
Business: {{ $json.body.payload.prospect.business_name }}
First name: {{ ($json.body.payload.prospect.contact_name || '').split(' ')[0] }}
Ref: {{ $json.body.payload.lead_id }}
Review: {{ $json.body.payload.admin_detail_url }}
Action: Review within 2 business hours
```

No email, phone, card, banking, health, or OTP data appears in the message (PII minimisation per the activity-log rules).

## 4. Notification destination (operator-held credential required)

Pick one internal channel. **The credential lives in the operator's n8n credential store / Infisical — never in this repo.**

| Option | n8n node | Operator prerequisite |
|---|---|---|
| **Telegram (recommended)** | Telegram → Send Message | An n8n **Telegram credential** (bot token) + operator **chat id**. This is **separate** from the in-repo `TELEGRAM_BOT_TOKEN` (unset, Packet 6.5) and separate from Uptime Kuma's own bot. Confirm an existing n8n Telegram credential or create a dedicated one via BotFather. |
| Internal email | n8n Gmail/SMTP (internal recipient only) | Must stay **distinct** from the customer `N8N_EMAIL_WEBHOOK_URL` path (channel separation, `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`). Internal recipient = Anton only. |

**Tasks-tab append:** **deferred for v1.** It needs a Google Sheets credential + a tab schema; per the approved scope, skip it and use notification-only. Add it in a later slice.

## 5. Operator build steps (n8n UI, on the box)

There are two ways to land the same three nodes. **Option A is recommended** because it reuses the already-configured `CORPFLOW_AUTOMATION_FORWARD_URL` with no env change.

### 5.0 Importable template

An importable, **inactive**, secret-free template ships at:

- `docs/execution/n8n-templates/LR_Pilot_1_Intake_Received_Notify_v1.json`

It contains a Webhook → IF (`event_type == corpflow.lead_rescue.intake_received`) → Telegram (internal notify) chain with **placeholder** credential references only:

| Placeholder in the JSON | What the operator replaces it with |
|---|---|
| `REPLACE_WITH_OPERATOR_TELEGRAM_CREDENTIAL_ID` | the n8n Telegram credential **id** (operator-held; created/selected inside n8n) |
| `REPLACE_WITH_OPERATOR_TELEGRAM_CREDENTIAL_NAME` | the n8n Telegram credential **display name** |
| `REPLACE_WITH_OPERATOR_CHAT_ID` | the operator Telegram **chat id** |
| `REPLACE_OR_REUSE_EXISTING_FORWARD_WEBHOOK` | (Option A) ignore — copy the IF + Telegram nodes into the existing forward workflow instead |

The JSON stores **no token, no chat-id value, no secret**, and `active: false`.

### 5.1 Option A — graft into the existing forward workflow (recommended)

1. SSH local-port-forward to the n8n UI on `corpflow-exec-01-u69678` (loopback `127.0.0.1` only; no public exposure).
2. Import `LR_Pilot_1_Intake_Received_Notify_v1.json` (Workflows → Import from File) to read the exact node config, **or** open the existing automation-forward workflow directly.
3. In the **existing** automation-forward workflow, after the forward-secret validation node, add the **IF** branch `event_type == corpflow.lead_rescue.intake_received` (§2) and the **Telegram** node (§3) from the template.
4. Attach the operator Telegram credential and set the chat id (§4).
5. Add the dedup guard on `payload.lead_id` (§2).
6. Save and **activate** the existing workflow. No new webhook URL, no env change.

### 5.2 Option B — standalone (isolated test only)

1. Import the template as its own workflow. It keeps its own Webhook (`path: lr-pilot1-intake-notify`).
2. Attach the operator Telegram credential + chat id.
3. Use it for **isolated test** via pinned/sample payload only. It will **not** receive live production events unless `CORPFLOW_AUTOMATION_FORWARD_URL` is re-pointed — which is an **env change and out of scope** for v1. Prefer Option A for the live wiring.

In both options the live branch is named **`lr-pilot1-intake-notify-v1`** (or kept as the imported workflow name `LR Pilot 1 - Intake Received Notify v1`).

## 6. Test (one intake)

1. Submit one test intake on `https://corpflowai.com/lead-rescue` (or `https://aileadrescue.corpflowai.com`) with an obvious test business name (e.g. `TEST Pilot1 Notify`). No card/banking fields exist on the page.
2. Confirm in n8n **Executions** that the branch ran and the notification node succeeded.
3. Confirm the notification arrived in the chosen channel showing business name, first name, ref, admin URL, action line.
4. Optionally mark/delete the test lead in `/admin/lead-rescue/[id]` afterwards (operator housekeeping; not required for the test).

## 7. Evidence template (operator fills after the test)

```text
Workflow name:            lr-pilot1-intake-notify-v1
Trigger used:             existing automation-forward Webhook → IF event_type == corpflow.lead_rescue.intake_received
Notification destination: <Telegram chat | internal email> (channel name only, no token/chat-id value)
Test intake timestamp:    <ISO 8601>
Notification fired:       YES / NO
n8n execution id:         <id>
Task row created:         NO (deferred for v1 — notification only)
Rollback method:          deactivate/delete branch lr-pilot1-intake-notify-v1 (§8)
```

Do **not** record bot tokens, chat-id values, forward-secret values, or full payload JSON with email/phone in the evidence.

## 7.1 Recorded operator evidence (2026-06-29)

Operator (Anton) built the branch via **Option A** (grafted into the existing automation-forward workflow) and ran a live test. Result: **WORKING.**

```text
Workflow:                 existing automation-forward workflow + grafted IF/Code/Telegram branch
Trigger used:             existing automation-forward Webhook → IF event_type == corpflow.lead_rescue.intake_received
IF branch matched:        YES (corpflow.lead_rescue.intake_received)
Code node:                produced the Telegram message
Notification destination: Telegram → Anton's private chat (bot @CorpFlow_Sentry_bot; chat-id value not recorded)
Telegram API response:    ok: true
Notification fired:       YES
Message content verified: business name, contact name, lead reference, admin detail URL, "Review within 2 business hours"
Customer-facing send:     NONE
Other systems touched:    none (no payment, no WhatsApp/SMS, no ERPNext, no DB schema, no app code, no env change)
Task row created:         NO (deferred for v1 — notification only)
Rollback method:          deactivate/remove the grafted branch (§8)
```

`@CorpFlow_Sentry_bot` is the bot **username** (a public handle), not a secret. No bot token, chat-id value, or forward-secret value is recorded here.

> **Security note (forward secret exposure):** during this test the **automation-forward secret was exposed** in chat/screenshots. `CORPFLOW_AUTOMATION_FORWARD_SECRET` (and its matching n8n validation value) must be **rotated**. The rotation plan is prepared and awaiting operator approval before execution — see `docs/runbooks/SECURITY_OR_INCIDENT.md` and the rotation sequence handed to the operator. **Do not** treat this secret as trustworthy until rotation completes.

## 8. Rollback

- **Disable:** toggle the `lr-pilot1-intake-notify-v1` branch off (or set the workflow inactive). The notification silently stops; the upstream automation-forward and the app are unaffected.
- **Remove:** delete the branch nodes. No repo, env, secret, or production-app dependency is introduced by this slice, so there is nothing to revert in the repo.
- The app continues to emit the event regardless (existing behaviour); only the n8n notification is added/removed.

## 9. Hard boundaries honoured

No automated outreach. No customer-facing message. No WhatsApp/SMS. No payment action. No ERPNext action. No DB schema change. No production app-code change. No new app env vars (reuses the already-configured forward path). No secrets in repo/docs/chat. No MailApp/GmailApp/UrlFetchApp in app code. No direct production DB write from n8n. No approval/send automation. n8n only **notifies**.

## 10. Operator-held actions required to finish (cannot be done from the repo / L1)

1. n8n UI access on `corpflow-exec-01-u69678` (SSH local-port-forward; loopback only).
2. An n8n notification credential (Telegram bot token + chat id, or internal email) — confirm existing or create; held in the operator credential store, never in repo.
3. Build + activate the §5 branch and run the §6 test intake; fill the §7 evidence.

## 11. Cross-references

- `docs/execution/n8n-templates/LR_Pilot_1_Intake_Received_Notify_v1.json` — importable, inactive, secret-free workflow template (this packet).
- `docs/n8n/automation-forward-recipe.md` — envelope shape + the `corpflow.lead_rescue.intake_received` branch.
- `docs/finance/AI_LEAD_RESCUE_INVOICE_WORKFLOW_AUDIT.md` §1 — intake event chain and payload provenance.
- `lib/cmp/_lib/ai-lead-rescue-operator.js` — `buildAiLeadRescueIntakeNotification` (payload fields).
- `lib/server/tenant-intake.js` — event emission on `/lead-rescue` intake.
- `docs/marketing-automation-arm.md` §9 — n8n notify-only boundary.
- `docs/operations/SERVER_AGENT_ACCESS_AND_EXECUTION_BOUNDARY_V1.md` — L1 vs L3; n8n build is operator-owned.
