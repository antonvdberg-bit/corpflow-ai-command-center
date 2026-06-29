# Action plan — CorpFlowAI WhatsApp Inbound Response Engine (v1)

**Packet family:** `CorpFlowAI-WhatsApp-Inbound-Response-Engine`
**Status:** PLANNING ONLY — no runtime authorized. Each stage below is a **separate** packet requiring Anton's explicit approval before execution.
**Type:** Multi-stage capability plan (docs-only at this point)
**Standard:** `docs/execution/CORPFLOW_EXECUTION_PACKET_STANDARD.md`
**Policy:** `docs/execution/CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md` (Tier 2 runtime work is **not** in the autonomous-allowed set; it gates on Anton).
**Decision record:** `docs/decisions/20260629-whatsapp-tier1-tier2-capability.md` (`JE-2026-06-29-1`)
**Technical design:** `docs/product/CORPFLOWAI_WHATSAPP_TIER2_RESPONSE_ENGINE_DESIGN_V1.md`
**Audience:** Anton (approver), Cursor / Codex Cloud (executors under approval), future contractors.

---

## 1. Goal

Establish the **foundation** for CorpFlowAI WhatsApp capability:

- **Tier 1** (manual WhatsApp entry) is usable immediately and needs no integration.
- **Tier 2** (Inbound WhatsApp Response Engine) has a clear, gated, security-reviewed path from decision → test number → inbound capture → operator review/alert → (only after approval) outbound → (only after approval) client-number migration.
- **Tier 3** (campaigns / shared-inbox SaaS / marketing automation / advanced analytics / multi-agent routing) stays deferred.

North-star outcome: when a client (Living Word, a Lead Rescue prospect, or a future tenant) needs WhatsApp, we can stand up a **safe inbound response engine on a CorpFlowAI test number** with operator review and alerting — **without** broadcasting, without unofficial automation, and without touching a client's own number until a deliberate, approved migration.

## 2. Definition of Done (for THIS planning packet)

- [x] Decision recorded (Tier 1 / Tier 2 / Tier 3 + vendor route) — `docs/decisions/20260629-whatsapp-tier1-tier2-capability.md`.
- [x] This action plan exists with Stage 0–5 gates, risk controls, and a preview/verification plan.
- [x] Tier 2 technical design exists (webhook verification, event schema, tenant routing, operator queue, alerting, 24-hour window, no canonical writes by default, audit fields, env var **names** without values).
- [x] Acceptance criteria + tests proposed (in the design doc).
- [x] `artifacts/chat_history.md` updated; `JOURNAL.md` row appended.
- [x] No runtime code, no secrets, no env var values, no DB migration, no live WhatsApp wiring.

**Out of scope (this packet):** any runtime code, any webhook wired to a real number, any secret, any vendor contract, any Tier 3 work.

## 3. Tier summary (decision recap)

| Tier | What it is | Status | Gate to start |
|------|-----------|--------|---------------|
| **Tier 1** | Manual entry: WhatsApp website button, QR code, prefilled `wa.me` link, manual operator reply. No API. | **Available now** | Marketing-doctrine review when buyer-facing. |
| **Tier 2** | Inbound Response Engine: official Cloud API / BSP, CorpFlowAI test number first, inbound webhook capture, tenant routing, operator queue, internal alerting, manual/approved replies. No broadcasts, no templates until approved. | **Planning authorized; runtime gated per stage** | Stage 0 → Stage 5 below. |
| **Tier 3** | Campaigns, shared-inbox SaaS, marketing automation, advanced analytics, multi-agent routing. | **Deferred — no work** | Separate future decision; not in this plan. |

## 4. Implementation gates — Stage 0 → Stage 5

Each stage is a **distinct packet**. A stage may not begin until the prior stage is `COMPLETE` (live-verified where applicable) **and** Anton explicitly approves the next stage. No stage auto-promotes.

### Stage 0 — Decision and vendor route

- **Goal:** Confirm the tier model (done by the linked ADR) and choose the **vendor route**: WhatsApp Cloud API (direct, Meta-hosted) **vs** a named official BSP.
- **Deliverables:** a short vendor-route decision (cost, verification requirements, data-residency, exit/portability, security-review surface) appended to the ADR or a follow-up ADR; **no contract, no signup, no paid commitment** in this stage's analysis.
- **Hard rules:** official Platform / BSP only; no unofficial automation; no secrets; no paid dependency adopted.
- **Exit gate:** Anton selects the route and explicitly approves Stage 1.

### Stage 1 — CorpFlowAI test number setup (no secrets committed)

- **Goal:** Stand up a **CorpFlowAI-owned test/business number** on the chosen route (operator task), and document the setup steps so they are reproducible.
- **Deliverables:** operator runbook (test number, Meta Business / app setup steps, where credentials live — **Infisical / Vercel env, never the repo**); placeholder env var **names** added to `.env.template` only when the runtime packet lands, never values.
- **Hard rules:** **no credentials, tokens, verification codes, or Meta app secrets in the repo, PR, logs, JOURNAL, or chat history.** No client/church number. No live message yet.
- **Exit gate:** test number exists and is owned by CorpFlowAI; credentials stored in the secrets manager only; Anton approves Stage 2.

### Stage 2 — Inbound webhook capture

- **Goal:** Implement the **webhook verification endpoint** + **inbound message capture** for the test number (see design doc § webhook + § event schema).
- **Deliverables:** verification (GET challenge) endpoint; signed inbound (POST) handler with signature validation; inbound events persisted as **non-canonical** audit records / `automation_events`; **no replies sent**.
- **Hard rules:** signature/secret validation on every inbound; tenant scope derived server-side; **no canonical writes by default**; no outbound; no PII in analytics; security review per `SECURITY_REVIEW_CHECKLIST.md`.
- **Exit gate:** live-verified inbound capture on the **test number** (Delivery Reality Audit); Anton approves Stage 3.

### Stage 3 — Operator review and internal alert

- **Goal:** Tenant-aware **routing**, an **operator review queue**, and **internal alerting** to the existing notification spine.
- **Deliverables:** routing rules (by tenant / number / keyword); operator queue surface (CorpFlow-native, not third-party); alert on inbound via `CORPFLOW_AUTOMATION_FORWARD_URL` / Telegram per existing patterns; **24-hour response-window tracking** displayed to operators.
- **Hard rules:** manual/operator-approved responses only; no auto-reply; no canonical writes by default; no broadcast.
- **Exit gate:** operator can see, route, and be alerted to inbound messages on the test number, with window state visible; Anton approves Stage 4.

### Stage 4 — Outbound / template messaging (only after approval)

- **Goal:** Enable **operator-approved outbound** replies within the 24-hour customer-care window, and (separately) **approved message templates** for outside-window replies.
- **Deliverables:** outbound send path gated behind an explicit operator approval action and a kill-switch env; template registry tied to Meta-approved templates only; per-send audit record.
- **Hard rules:** **no marketing broadcasts**; templates only after Meta approval **and** Anton approval; outbound disabled by default (kill-switch off in production until flipped); rate-limited; full audit trail.
- **Exit gate:** controlled outbound proven on the test number with approval gates and audit; Anton approves Stage 5.

### Stage 5 — Client/church number migration (only after approval)

- **Goal:** Migrate a **specific client (e.g. a tenant) or church number** onto the engine — **only** with that client's documented consent and Anton's explicit approval.
- **Deliverables:** per-client migration checklist (number ownership/transfer, consent, privacy notice, rollback); for Living Word specifically, satisfy `GATE-PRIVACY` (board-approved consent) and `GATE-PILOT` first; live-verified cutover with rollback ready.
- **Hard rules:** **no client/church number migrated before this stage**; no migration without consent + approval; preserve all Living Word PR #482 protections until each is explicitly lifted with its own gate.
- **Exit gate:** the named client's WhatsApp inbound is live-verified with operator review/alerting and a tested rollback; recorded in a Delivery Reality Audit.

## 5. Risk controls (apply to every Tier 2 stage)

| Risk | Control |
|------|---------|
| Unofficial automation creep | Official Cloud API / BSP only; any WhatsApp-Web-automation dependency is forbidden and is a review blocker. |
| Secret leakage | No tokens / verification codes / Meta app credentials in repo, PR, logs, JOURNAL, or chat history; secrets in Infisical / Vercel env only; env var **names** only in docs. |
| Premature outbound / spam | Outbound disabled by default (kill-switch); no templates until Meta + Anton approval; no broadcasts at any stage in this plan. |
| Webhook abuse / spoofing | Signature validation on every inbound; reject unverified payloads; rate-limit; tenant scope derived server-side. |
| Canonical data corruption | **No canonical writes by default**; inbound stored as non-canonical audit/event records; explicit operator action required for any canonical effect. |
| Client-number risk | No client/church number touched before Stage 5; consent + approval + rollback required. |
| Privacy / Mauritius DPA | Retention policy defined in the runtime packet; PII never in analytics props; Living Word `GATE-PRIVACY` / `GATE-PILOT` preserved. |
| Vendor lock-in | Vendor route is a deliberate Stage 0 decision; abstract send/receive behind a thin server helper so BSP ↔ Cloud API is swappable. |

## 6. Living Word Mauritius — protections preserved (unchanged)

This plan does **not** alter the Living Word member-update pilot. All PR #482 protections remain: admin-gated, non-public, `noindex`, test-bannered, synthetic records only, in-memory persistence only, `review_required: true`, `canonical_write: false`, blank-overwrite protection verified, excluded-field rejection verified, no DB/Prisma migration, no GHL calls/writes/import, no WordPress/DNS/outbound messaging/public cutover. WhatsApp Tier 2 will not route to, message, or write any Living Word member or number during planning, and any future Living Word WhatsApp use is a Stage 5 item gated additionally by `GATE-PRIVACY` and `GATE-PILOT`.

## 7. Preview / verification plan (for the eventual runtime stages)

- **Stage 2–4 runtime work** is built **preview-first** on a CorpFlowAI **test number**; production env flags stay **off** until Anton flips them.
- Each runtime stage records a **Delivery Reality Audit** (local → merged → deployed → live-verified) per `.cursor/rules/delivery-reality.mdc`. Webhook health alone is **not** completion.
- `npm test` + `npm run build` green on the branch before any merge; security review per `docs/operations/SECURITY_REVIEW_CHECKLIST.md` for every stage touching `api/`, `lib/server/`, webhooks, or `.env.template`.
- **This planning packet's** verification is limited to: `npm test` + `npm run build` pass on the docs branch, CI green, and Anton's review. No live WhatsApp verification is in scope here.

## 8. Status block

- **Stage 0:** PENDING (vendor route not yet selected).
- **Stage 1–5:** NOT STARTED — gated on the prior stage + Anton's explicit approval.
- **This planning packet:** ready for review. No runtime, no secrets, no migration.

## 9. Change log

- **v1 — 2026-06-29** — Initial action plan. Docs-only. Stage 0–5 gates defined. No runtime authorized.
