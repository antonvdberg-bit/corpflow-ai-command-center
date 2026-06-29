# Email automation — inbound/outbound workflow with human approval gates (v1)

**Status:** Docs/design only. **NO IMPLEMENTATION AUTHORIZED.** No runtime, no send, no Gmail wiring, no env/secrets.
**Owner:** Anton (operator) for provider setup, credentials, and all sends/approvals.
**Created:** 2026-06-30.
**Implements:** GitHub issue [#486](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/486).
**Operates under:** [#493](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/493) parallel execution board, **Lane E** (communications automation).
**Feeds into:** [#485](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/485) cloud-first / laptop-dependency removal (email handling moves off Anton's manual bridge).
**Anchor sentinel:** `<!-- EMAIL_AUTOMATION_INBOUND_OUTBOUND_V1 -->`

<!-- EMAIL_AUTOMATION_INBOUND_OUTBOUND_V1 -->

## 0. Problem statement

Outbound email can flow through n8n/Gmail where approved (`docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`), but **inbound replies** still depend on Anton manually checking and forwarding. The desired model:

- outbound drafts/sends where authorized,
- inbound reply detection,
- correlation between a sent message and its replies,
- markers/tags so replies route safely,
- internal notifications to Anton/operator (Telegram or task queue),
- **human approval before any customer/prospect-facing response is sent.**

This doc is the **design** for that model. It does not wire anything.

## 1. Relationship to existing outbound comms

| Layer | Canonical doc | This doc |
|---|---|---|
| Outbound event catalog, sender aliases, approval rules | `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` | Extends with **inbound + reply-correlation**; does not change §4 event names |
| n8n outbound wire recipe | `docs/n8n/password-reset-email-recipe.md` | Inbound uses a **separate** n8n workflow (notify-only spine) |
| Marketing Automation Arm outreach | `docs/marketing-automation-arm.md` §8 | Outreach stays **human-approved**; no automated cold outreach |

**One production app, one Postgres via `POSTGRES_URL`.** Inbound state in v1 lives on the **Google Workspace operating surface** (Gmail labels + Sheet register), not in production DB — unless a later packet explicitly approves DB writes.

## 2. Inbound options (evaluated)

| Option | How it works | Pros | Cons | v1 recommendation |
|---|---|---|---|---|
| **A — Gmail label + scheduled poll** | n8n Schedule → Gmail node searches `label:corpflow-inbound-replies newer_than:1d` → process new threads | Simple; no push infra; works with existing Workspace OAuth; easy to test | Not real-time (poll interval); must dedupe message IDs | **Recommended for v1 pilot** |
| **B — Gmail trigger / watch** | Gmail Push via Google Pub/Sub → n8n webhook | Near-real-time | Pub/Sub setup, watch renewal (7-day), more moving parts | **Phase 2** after poll path is stable |
| **C — IMAP trigger** | n8n IMAP Email Trigger on a dedicated mailbox | Provider-agnostic | App-password / IMAP creds; less aligned with Workspace OAuth already in use | **No-GO for v1** (duplicate credential path) |
| **D — Dedicated reply mailbox** | e.g. `replies@corpflowai.com` or `inbound@corpflowai.com` with forward-from outbound `Reply-To` | Clean separation; easy operator mental model | DNS/MX forwarder setup (Anton-gated); another alias to manage | **Optional enhancement** — use `Reply-To:` on approved outbound without a new mailbox in v1 |
| **E — Reply-To on outbound only** | Outbound sets `Reply-To: replies+{token}@corpflowai.com` (plus addressing) | Strong correlation without DB | Requires Workspace plus-addressing or catch-all rule | **Combine with A** as the marker strategy (§3) |

**v1 choice:** **Option A** (Gmail label poll) + **Option E** markers on outbound (`Reply-To` + footer token). No Pub/Sub, no IMAP, no new mailbox unless Anton approves later.

## 3. Marker / correlation strategy (recommended)

Use **multiple redundant correlators** so a reply can be matched even if one marker is stripped:

| Marker | Where | Format | Purpose |
|---|---|---|---|
| **Thread token in subject** | Outbound subject | `[CF-{event_id_short}]` prefix or suffix, e.g. `Re: [CF-a1b2c3] Your estimate is ready` | Human-visible; Gmail thread grouping |
| **Plain-text footer marker** | Outbound body (plain + HTML) | `CorpFlow ref: CF-{event_id}` on its own line, small gray in HTML | Survives forward; parser-friendly |
| **Gmail label (outbound)** | Applied by n8n after send | `corpflow/sent/{event_type}` | Audit trail in Gmail |
| **Gmail label (inbound)** | Applied by n8n on detected reply | `corpflow/inbound/pending-review` | Operator queue in Gmail UI |
| **Message-ID / In-Reply-To** | Email headers | Store outbound `Message-ID` in register row; match `In-Reply-To` / `References` on inbound | Standard RFC 5322 threading |
| **Register reference ID** | Google Sheet (`34_Communication_Event_Register`) | `event_id` (UUID) + `thread_id` + `outbound_message_id` | System of record for correlation |

**Parsing rule (v1):** inbound handler tries matchers in order: (1) `In-Reply-To` / `References` → register row; (2) footer `CorpFlow ref: CF-…`; (3) subject `[CF-…]`; (4) `Reply-To` plus-address token. If no match → label `corpflow/inbound/unmatched` + Telegram alert for operator triage.

**No secrets in markers.** Tokens are opaque IDs, not credentials.

## 4. Workflow states

States apply to each **communication thread** (one outbound event + its reply chain) on the operating surface:

```
outbound_drafted
  → outbound_approved (operator, if client-facing)
  → sent
  → reply_received
  → ai_summary_prepared (internal only)
  → operator_review_required
  → response_drafted (Gmail draft only — NOT sent)
  → approved_to_send (operator)
  → sent (outbound leg 2+)
  → closed | no_action | opt_out
```

| State | Meaning | Who advances | Auto? |
|---|---|---|---|
| `outbound_drafted` | Body exists in register; not sent | Cursor/n8n creates draft row | — |
| `outbound_approved` | Anton approved client-facing send | Anton | No |
| `sent` | n8n Gmail node delivered outbound | n8n + evidence in register | Auto after approval (or auto for system-transactional) |
| `reply_received` | Inbound matched to thread | n8n poll/trigger | Auto |
| `ai_summary_prepared` | Internal summary generated (no PII in Telegram) | n8n + optional LLM step | Auto; **summary never auto-sent to prospect** |
| `operator_review_required` | Waiting on Anton | System sets on every inbound | Auto |
| `response_drafted` | Gmail **draft** created for operator | n8n or manual | Auto-draft optional; **never auto-send** |
| `approved_to_send` | Anton explicitly approved reply | Anton | No |
| `closed` | Thread terminal; no further action | Anton | No |
| `no_action` | Inbound acknowledged; no reply needed | Anton | No |
| `opt_out` | Do-not-contact / suppression | Anton | No |

**Terminal states:** `closed`, `no_action`, `opt_out`. Terminal rows are never auto-reopened.

## 5. Architecture (v1 — notify-only n8n spine)

```text
OUTBOUND (existing path, extended with markers)
  CorpFlow event → register row → [approval if client-facing]
    → n8n email webhook → Gmail send (with markers + Reply-To)
    → store Message-ID + thread_id in register
    → label corpflow/sent/{event_type}

INBOUND (new path — design only)
  n8n Schedule (e.g. every 15 min)
    → Gmail: search label OR unmatched INBOX replies to known Reply-To
    → dedupe by Gmail message ID (n8n static data / Sheet column)
    → correlate to register row (§3)
    → optional: internal LLM summary (Google Acceleration Lane — no sensitive client data)
    → Telegram notify Anton (safe summary + link to Gmail thread + register event_id)
    → create Gmail **draft** reply (optional) — NOT send
    → label corpflow/inbound/pending-review
    → set register status = operator_review_required
```

**n8n boundary** (consistent with `docs/marketing-automation-arm.md` §9 and `CORPFLOW_COMMUNICATIONS_V1.md`):

- n8n **may:** poll Gmail, label, notify, create **drafts**, update Sheet register, schedule reminders.
- n8n **must not:** auto-send cold outreach, auto-send customer/prospect replies without `approved_to_send`, write production Postgres, expose secrets in logs.

## 6. Boundaries (hard)

- **No automated cold outreach sends.**
- **No automated customer/prospect reply sends without Anton approval.**
- **No WhatsApp/SMS** in this packet (see #492 for WhatsApp planning).
- **No payment actions.**
- **No production DB writes** unless a separate packet approves schema/register in Postgres (v1 uses Sheet + Gmail labels only).
- **No secrets** in repo/docs/logs/chat (OAuth tokens stay in n8n credential store / Infisical).
- **No `.env.template` edits** in this packet.
- Preserve **one app, one Postgres via `POSTGRES_URL`.**
- Do not reopen parked automation-forward-secret rotation.

## 7. First safe implementation slice (v1 pilot — separately authorized)

**Packet name (future):** `Email-Inbound-Reply-Detection-Pilot-1`

**Scope (smallest useful slice):**

1. Create Gmail labels: `corpflow/inbound/pending-review`, `corpflow/inbound/unmatched`, `corpflow/sent/*` (per event type as needed).
2. n8n workflow (inactive template first, like #495): Schedule → Gmail poll → correlate → Telegram notify → label → optional Gmail draft → **no send node on inbound branch**.
3. Register: extend `34_Communication_Event_Register` with columns `outbound_message_id`, `thread_id`, `inbound_status`, `last_inbound_at`, `summary_internal` (no PII in Sheet if avoidable — link to Gmail instead).
4. **Pilot traffic only:** replies to `support@corpflowai.com` threads that originated from approved outbound (not cold prospecting). Medspa outreach replies flow through the same machinery only **after** Anton-approved sends from the Marketing Automation Arm Sheet.
5. Telegram alert format (internal):

```text
CorpFlow Email — reply received
Thread: CF-{event_id_short}
From: {masked or "see Gmail"}
Subject: {subject line — no body}
Status: operator_review_required
Action: review in Gmail / Sheet; approve before any send
```

**Gates before activation:** Anton confirms Workspace OAuth in n8n, Telegram path, label names, and pilot scope on #249. Security review per `docs/operations/SECURITY_REVIEW_CHECKLIST.md` when any runtime workflow is activated.

## 8. Cloud-first / laptop dependency (#485)

| Today (laptop-bound) | v1 pilot target (cloud-side) |
|---|---|
| Anton checks Gmail manually | n8n scheduled poll on L2 (n8n host) |
| Anton copy/pastes reply context to ChatGPT | Internal summary in n8n (optional LLM) → Telegram |
| Anton forwards threads | Register + labels + Telegram link |
| Approval in chat | Approval recorded in Sheet + #249 decision comment |

**Bucket:** (2) *Can run cloud-side with small repo/process changes* — the process change is this design + n8n workflow; no app code required for the pilot.

## 9. Cross-references

- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — outbound event catalog, approval policy, register shape.
- `docs/n8n/password-reset-email-recipe.md` — outbound wire pattern (separate workflow from inbound).
- `docs/n8n/automation-forward-recipe.md` — operational envelopes (not email send).
- `docs/marketing-automation-arm.md` §8–§9 — outreach approval + n8n notify-only boundary.
- `docs/operations/TELEGRAM_ALERT_WIRING_PACKET_V1.md` — alert payload contract for inbound notifications.
- `docs/execution/LAPTOP_DEPENDENCY_BURN_DOWN_V1.md` — burn-down queue (#485).
- `docs/strategy/GOOGLE_ACCELERATION_LANE.md` — bounds on optional LLM summary step.

## 10. Status block

- **Delivery state:** Local → intended **Merged** after operator review. Docs/design only.
- **Implementation:** none. No runtime, no send, no Gmail wiring, no env/secrets, no DB.
- **Verdict:** PARTIAL by design — inbound/outbound human-approval workflow documented; pilot activation is a separate Anton-gated packet.
