# Technical design — CorpFlowAI WhatsApp Tier 2 Inbound Response Engine (v1)

**Status:** DESIGN PROPOSAL — no runtime authorized. No live WhatsApp code. No secrets. Env var **names** only (no values).
**Decision record:** `docs/decisions/20260629-whatsapp-tier1-tier2-capability.md` (`JE-2026-06-29-1`)
**Action plan + Stage gates:** `docs/execution/CORPFLOWAI_WHATSAPP_INBOUND_RESPONSE_ENGINE_ACTION_PLAN_V1.md`
**Audience:** Anton (approver), Cursor / Codex Cloud (implementation agents), future contractors.
**Canonical references (do not contradict):**
- `docs/automation-framework.md`, `docs/EXECUTION_BRAIN_VS_HANDS.md` — n8n + Postgres + CMP remain the governed spine; alerting reuses the existing forward path.
- `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md` — comms events model.
- `docs/operations/SECURITY_REVIEW_CHECKLIST.md`, `.cursor/rules/security-sensitive-changes.mdc` — webhook + secret handling is security-sensitive.
- `lib/cmp/README.md` — CMP/tenant gate patterns; operator queue must respect tenancy.
- `.cursor/rules/delivery-reality.mdc` — live-verified on the test number = done.

---

## § 0 — Scope and hard limits (this design)

This is a **design document**. The following must not happen as a result of it:

1. No webhook wired to a real WhatsApp number; no live send/receive.
2. No secrets, tokens, verification codes, Meta app credentials, or phone-number verification codes in repo, PR, logs, JOURNAL, or chat history.
3. No unofficial WhatsApp Web automation.
4. No DB/Prisma migration created or run; schema below is a **proposal**, gated.
5. No outbound / template messaging (Stage 4) and no client-number migration (Stage 5) designed for execution here.
6. No Tier 3 (campaign / shared-inbox / marketing-automation) capability.
7. Env var **names** below are net-new placeholders **without values**; they enter `.env.template` only via the runtime packet after security review.

The engine is built and verified **CorpFlowAI test number first** (Stage 1–4), preview-first, before any client/church number (Stage 5).

## § 1 — Architecture overview

```
WhatsApp Cloud API / BSP (official)
        │  (1) GET verify challenge        (2) POST inbound message (signed)
        ▼
┌─────────────────────────────────────────────────────────────┐
│ CorpFlowAI inbound webhook  (api route via factory/API router)│
│  - GET  : hub.challenge verification (token compare)          │
│  - POST : signature validation → parse → persist (NON-canonical)│
└─────────────────────────────────────────────────────────────┘
        │ normalized inbound event (whatsapp.inbound.message.v1)
        ▼
┌──────────────────────┐   tenant routing    ┌──────────────────────┐
│ Inbound event store   │ ──────────────────▶ │ Operator review queue │
│ (audit / automation_  │   (server-side)     │ (CorpFlow-native;     │
│  events; no canonical │                     │  tenant-scoped)       │
│  write by default)    │                     └──────────────────────┘
└──────────────────────┘                              │
        │ alert (reuse CORPFLOW_AUTOMATION_FORWARD_URL / Telegram)
        ▼                                              │
   Internal alert (operator)        24h window tracker ┘
                                    (display only in v1)

Outbound (Stage 4, gated, OFF by default) ── kill-switch + operator approval ── audit
```

**Key invariant:** the webhook has **no canonical write authority**. Inbound messages become **audit/event records** and an **operator queue item**. Any canonical effect (e.g. updating a member record) requires an explicit, separately-gated operator action — never the webhook automatically.

## § 2 — Webhook verification endpoint

WhatsApp Cloud API uses a two-part webhook contract:

### § 2.1 — Verification (GET)

- Meta sends `GET ?hub.mode=subscribe&hub.verify_token=<token>&hub.challenge=<n>`.
- The handler compares `hub.verify_token` to a server-side secret (env, never in repo). On match, echo `hub.challenge` with `200`; otherwise `403`.
- The verify token is **operator-provisioned** and stored in the secrets manager.

### § 2.2 — Inbound (POST)

- Every POST must pass **payload signature validation** (`X-Hub-Signature-256` HMAC-SHA256 over the raw body using the app secret) before parsing. Unverified payloads → `401/403`, logged (no secret in logs), no processing.
- After validation: parse, normalize to the event schema (§ 3), persist as a **non-canonical** record, enqueue for operator review (§ 5), and emit an alert (§ 6).
- Respond `200` quickly (ack) so the platform does not retry-storm; processing is best-effort/idempotent.

### § 2.3 — Idempotency

- WhatsApp may redeliver. Dedupe on the provider message id (`wa_message_id`) so a redelivery does not create duplicate queue items or alerts.

## § 3 — Inbound message event schema

Normalized envelope (consistent with the existing `corpflow.automation.envelope.v1` style). Proposed event type: **`whatsapp.inbound.message.v1`**.

```jsonc
{
  "schema": "whatsapp.inbound.message.v1",
  "id": "<corpflow-generated id>",
  "received_at": "<ISO-8601 UTC>",
  "tenant_scope": "<tenant-id | 'unrouted'>",      // derived server-side (§ 4)
  "channel": "whatsapp",
  "direction": "inbound",
  "provider": "<cloud_api | bsp:<name>>",
  "business_number_ref": "<opaque ref to the CorpFlowAI test/business number, NOT the raw number>",
  "wa_message_id": "<provider message id; idempotency key>",
  "from_ref": "<hashed/opaque sender ref>",        // NOT raw phone in audit/analytics
  "message": {
    "type": "<text | image | audio | document | location | interactive | unknown>",
    "text": "<message body if type=text; redacted/omitted in analytics>",
    "media_ref": "<opaque media handle if applicable>",
    "timestamp": "<provider ISO-8601>"
  },
  "window": {
    "opens_at": "<ISO-8601 when this inbound opened/refreshed the 24h care window>",
    "expires_at": "<opens_at + 24h>"
  },
  "audit": {
    "canonical_write": false,                       // ALWAYS false on inbound capture
    "review_required": true,                        // operator must review before any action
    "signature_validated": true,
    "source_ip_class": "<meta | bsp | other>",
    "ingest_route": "whatsapp_webhook_v1"
  }
}
```

Notes:
- **Raw phone numbers and message content are PII** — store the minimum needed; never place them in analytics props; redact in logs.
- `tenant_scope = "unrouted"` is valid and must be handled (queued to a default operator review, alerted) rather than dropped.

## § 4 — Tenant routing

Routing is **server-side** and deterministic:

1. **By business number** — each CorpFlowAI WhatsApp number maps to exactly one tenant (a `whatsapp_number → tenant_id` mapping, analogous to `tenant_hostnames`). The test number maps to a sandbox/internal tenant scope, **not** a client.
2. **By keyword / template** (optional, later) — within a tenant, route to a sub-queue by first-message intent.
3. **Fallback** — unknown number / unmatched → `tenant_scope = "unrouted"`, routed to a factory/operator default queue with an alert.

Routing must never widen tenancy: a message for tenant A can only ever appear in tenant A's queue (or the factory default). This mirrors the CMP tenant-gate discipline in `lib/cmp/README.md`.

## § 5 — Operator review queue

- **CorpFlow-native** (not a third-party shared inbox — Tier 3). Tenant-scoped list of inbound items with: sender ref, message preview, received time, **window state** (open / expiring / expired), routing tenant, and review status (`new | in_review | actioned | dismissed`).
- The queue is **read + triage** in v1 (Stage 3). Sending a reply is **Stage 4** and is gated separately (kill-switch + explicit operator approval).
- Operator actions are **audit-logged** (§ 8). No action mutates canonical client data by default.
- Surface is distinct from `/change` (delivery console) — do not conflate.

## § 6 — Alerting model

- On validated inbound, emit an internal alert via the **existing notification spine** — reuse `CORPFLOW_AUTOMATION_FORWARD_URL` / Telegram patterns from `docs/automation-framework.md`; do **not** invent a new webhook trust path.
- Alert payload carries **no PII** (no raw phone, no message text) — only tenant scope, channel, window-expiry bucket, and a queue deep link.
- Alert is **idempotent** per `wa_message_id`.
- Alert failure must not drop the inbound record — capture is independent of alert delivery.

## § 7 — 24-hour response-window tracking

WhatsApp's customer-care policy allows **free-form** replies only within **24 hours** of the customer's last message; outside the window, only **approved templates** may be sent.

- Each inbound sets/refreshes `window.opens_at` and `window.expires_at = opens_at + 24h` for that conversation (per sender + business number).
- v1 (Stage 3): **display only** — the operator queue shows window state (open / `< 1h` left / expired). No automated action.
- Stage 4: outbound free-form is permitted **only** while the window is open; outside it, only an approved template path (separately gated) may be used. The engine must compute window state server-side and refuse a free-form outbound attempt when expired.

## § 8 — No canonical writes by default + audit fields

- **Inbound capture writes only non-canonical records** (audit/event store). `audit.canonical_write` is **always `false`** on inbound.
- Any canonical effect (e.g. updating a Living Word member record) requires a **separate, explicitly-gated operator action** that runs through the existing reviewed write path (`review_required: true`), never the webhook.
- **Audit fields** persisted per inbound and per operator action:
  - `id`, `received_at`, `tenant_scope`, `wa_message_id`, `signature_validated`, `ingest_route`.
  - `canonical_write` (bool, default false), `review_required` (bool, default true), `review_status`, `reviewed_by`, `reviewed_at`.
  - `window_opens_at`, `window_expires_at`.
  - `alert_emitted` (bool), `alert_idempotency_key`.
  - For Stage 4 outbound (later): `outbound_approved_by`, `outbound_approved_at`, `template_id` (if any), `send_status`, `send_audit_id`.

### § 8.1 — Proposed persistence (gated; not created here)

A future DB-migration **proposal** (separate gate, like the Living Word migration proposal) may add:
- `whatsapp_inbound_events` (audit/event capture; non-canonical).
- `whatsapp_numbers` (number ↔ tenant routing map; no raw secrets).
- `whatsapp_operator_actions` (review/triage/approval audit trail).

Until that gate clears, capture may live in the existing `automation_events` table (non-canonical) exactly as the automation spine already does. **No migration is created or run by this design.**

## § 9 — Environment variable names (NAMES ONLY — no values)

Net-new placeholders; they enter `.env.template` **only** via the runtime packet after security review. **No values appear anywhere in this PR.** These are **not** the pre-existing Twilio-sandbox names (`EXEC_WHATSAPP_NUMBER`, `ADMIN_WHATSAPP_NUMBER`, `WHATSAPP_FROM`), which Tier 2 does not reuse.

| Env var name | Purpose (no value) | Stage |
|--------------|--------------------|-------|
| `CORPFLOW_WHATSAPP_TIER2_ENABLED` | Master kill-switch for the Tier 2 engine (default off in production). | 2 |
| `CORPFLOW_WHATSAPP_PROVIDER` | `cloud_api` or `bsp:<name>` — selects the adapter. | 0–2 |
| `CORPFLOW_WHATSAPP_VERIFY_TOKEN` | Webhook GET verification token (secrets manager only). | 2 |
| `CORPFLOW_WHATSAPP_APP_SECRET` | App secret for `X-Hub-Signature-256` HMAC validation. | 2 |
| `CORPFLOW_WHATSAPP_PHONE_NUMBER_ID` | Provider id for the CorpFlowAI **test** number. | 1–2 |
| `CORPFLOW_WHATSAPP_BUSINESS_ACCOUNT_ID` | WABA id (test). | 1–2 |
| `CORPFLOW_WHATSAPP_ACCESS_TOKEN` | Provider access token (secrets manager only). | 2 |
| `CORPFLOW_WHATSAPP_ALERT_FORWARD_URL` | Optional override; defaults to existing `CORPFLOW_AUTOMATION_FORWARD_URL`. | 3 |
| `CORPFLOW_WHATSAPP_OUTBOUND_ENABLED` | Stage 4 outbound kill-switch (default off; flipped only after approval). | 4 |
| `CORPFLOW_WHATSAPP_OUTBOUND_RATE_LIMIT_PER_HOUR` | Outbound rate cap. | 4 |

All secret-bearing names (`*_VERIFY_TOKEN`, `*_APP_SECRET`, `*_ACCESS_TOKEN`) live **only** in Infisical / Vercel env — never in the repo, never in a PR diff, never in logs.

## § 10 — Acceptance criteria

For the eventual runtime stages (each verified on the **test number**, preview-first):

**Stage 2 (inbound capture):**
- AC2.1 — GET verification echoes `hub.challenge` only when the verify token matches; otherwise `403`.
- AC2.2 — POST with an invalid/absent `X-Hub-Signature-256` is rejected (`401/403`), not processed, and no secret is logged.
- AC2.3 — A valid inbound text message is normalized to `whatsapp.inbound.message.v1` with `audit.canonical_write === false` and `audit.review_required === true`.
- AC2.4 — A redelivered message (same `wa_message_id`) does **not** create a duplicate record, queue item, or alert.
- AC2.5 — No canonical client record is created or modified by inbound capture.

**Stage 3 (routing, queue, alert, window):**
- AC3.1 — A message to the test number routes to the correct tenant scope; an unknown number routes to `unrouted` (not dropped).
- AC3.2 — A queue item appears for the operator with sender ref, preview, received time, window state, and `review_status = new`.
- AC3.3 — An internal alert is emitted with **no PII** in the payload, idempotent per `wa_message_id`.
- AC3.4 — Window `expires_at = opens_at + 24h`; queue shows `open / expiring / expired` correctly; a new inbound refreshes the window.
- AC3.5 — Alert-delivery failure does not lose the inbound record.

**Stage 4 (outbound, gated — only after approval):**
- AC4.1 — Outbound is disabled when `CORPFLOW_WHATSAPP_OUTBOUND_ENABLED` is off; no send is possible.
- AC4.2 — A free-form outbound is refused when the 24-hour window is expired.
- AC4.3 — Every outbound requires an explicit operator-approval action and is fully audit-logged (`outbound_approved_by`, `send_audit_id`).
- AC4.4 — Only Meta-approved templates can be sent outside the window; no broadcast path exists.

**Cross-cutting:**
- AC-X1 — No secrets in repo/PR/logs; security review passed.
- AC-X2 — No Living Word member or number is touched until Stage 5 with `GATE-PRIVACY` + `GATE-PILOT` + consent + approval.
- AC-X3 — Each stage records a Delivery Reality Audit; "webhook healthy" alone is not COMPLETE.

## § 11 — Test plan (proposed)

Unit / integration tests (Node test runner, alongside existing `node-tests/*.mjs`):

1. **Webhook verification** — token match → challenge echoed; token mismatch → 403.
2. **Signature validation** — valid HMAC accepted; tampered body / wrong signature rejected; missing signature rejected.
3. **Normalization** — raw Cloud-API sample payload → `whatsapp.inbound.message.v1`; assert `canonical_write=false`, `review_required=true`, window math, opaque refs (no raw phone in audit/analytics shape).
4. **Idempotency** — same `wa_message_id` twice → one record, one queue item, one alert.
5. **Routing** — known number → correct tenant; unknown → `unrouted`; assert no cross-tenant leakage.
6. **Queue** — inbound creates a `new` item with expected fields; review transitions (`new → in_review → actioned/dismissed`) are audit-logged.
7. **Alert payload** — assert **no** raw phone / message text in alert props; idempotent.
8. **Window** — `expires_at` = +24h; `open/expiring/expired` classification at boundary times.
9. **No-canonical-write guard** — assert inbound capture performs zero canonical writes (mirrors the Living Word blank-overwrite / excluded-field guard style).
10. **Outbound gating (Stage 4)** — disabled-by-flag blocks send; expired-window blocks free-form; approval + audit required; no broadcast path.

Fixtures use **synthetic** Cloud-API payloads only — no real numbers, no real tokens, no live calls.

## § 12 — Change log

- **v1 — 2026-06-29** — Initial Tier 2 design proposal. Docs-only. No runtime, no secrets, no migration.
