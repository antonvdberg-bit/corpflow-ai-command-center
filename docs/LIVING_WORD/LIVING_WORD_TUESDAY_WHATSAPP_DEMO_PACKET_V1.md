# Living Word Mauritius — Tuesday WhatsApp demo packet (v1)

**Status:** Demo authorization packet. **Tier 2 inbound slice authorized for Living Word 7 July demo** (operator-confirmed 2026-07-01). Runtime implementation is a **separate PR** gated on Meta setup + secrets + deploy.
**Demo date:** **Tuesday 7 July 2026** (2026-07-07).
**Tenant:** `living-word-mauritius` only.
**WhatsApp number:** Anton / CorpFlow **operator pilot number** (not church number; not Stage 5 migration).
**Command log:** [#249](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/249).

**Anchor sentinel:** `<!-- LIVING_WORD_TUESDAY_WHATSAPP_DEMO_PACKET_V1 -->`

<!-- LIVING_WORD_TUESDAY_WHATSAPP_DEMO_PACKET_V1 -->

## 0. What this demo is

A **live, in-room test** with **1–2 willing participants** who send a **real WhatsApp** message to the CorpFlow pilot number. CorpFlow **captures inbound** (Tier 2 slice), shows it in the **operator queue**, and walks through **member-update identify → review** for that person. **Every touchpoint is clearly marked as testing.** The session closes with a **feedback invitation**.

This is **not** production launch, **not** church-number migration, and **not** automated marketing.

---

## 1. Mandatory testing labels (non-negotiable)

Every participant-facing surface must carry equivalent wording. Do not shorten or drop the TEST marker.

| Surface | Required marker |
|---|---|
| WhatsApp **first reply** (operator or approved outbound) | `[LIVING WORD — TEST DEMO]` prefix |
| WhatsApp **final message** | Same prefix + feedback CTA (§4) |
| `/site-preview` | Existing orange ribbon (unchanged) |
| Member-update form | Banner: *TEST DEMO — not a production church record* |
| Operator queue / admin | Badge: `TEST_DEMO` on all demo threads |
| Verbal intro in room | "This is a controlled test, not the live church system." |

**Logo:** use the church logo **only alongside** the TEST prefix — never alone as if production.

**Asset path (sandbox):** `/assets/tenants/living-word-mauritius/living-word-church-logo.png`

---

## 2. Participants (operator-held — not in repo)

Anton has collected willing names. **Do not commit real names, phones, or emails to the repo, PR, or chat history.**

### 2.1 How to register participants

1. Post a **private** table on **#249** (or operator-only channel) with: full name, WhatsApp mobile, email (if any), consent yes/no.
2. Cursor seeds them via **operator-run step** or a **gitignored local seed file** — not a committed file.
3. Each participant receives the **pre-demo consent text** (§3.1) before the session.

### 2.2 Participant roster template (fill on #249)

```text
| # | Full name | WhatsApp (E.164) | Email | Consent (Y/N) | Notes |
|---|-----------|------------------|-------|---------------|-------|
| 1 |           |                  |       |               |       |
| 2 |           |                  |       |               |       |
```

---

## 3. WhatsApp message templates

Use these verbatim except `[Name]` / `[Date]`. Attach logo image on **first** and **final** operator messages when sending from WhatsApp app (Tier 1 reply) or via approved outbound (Tier 2 Stage 4, if enabled).

### 3.1 Pre-demo consent (send to each participant before 7 July)

```text
[LIVING WORD — TEST DEMO]

Hi [Name] — thank you for agreeing to help us test a new member-update process on Tuesday 7 July.

This is a CONTROLLED TEST on CorpFlow's pilot WhatsApp number — not the church's live system. Your message will be seen by church staff running the demo only.

Reply YES to confirm you understand this is a test.
```

### 3.2 Welcome (first reply when they message in the room)

Send **logo image** + text:

```text
[LIVING WORD — TEST DEMO]

Thank you, [Name]. We received your test message on our pilot system (not production).

A team member will walk through updating your details with you now. Nothing you send today becomes a final church record without staff review.
```

### 3.3 During demo (optional, if needed)

```text
[LIVING WORD — TEST DEMO]

We're now showing how your details would be matched and reviewed in our system. This is still a test.
```

### 3.4 Final message (mandatory — includes feedback invitation)

Send **logo image** + text:

```text
[LIVING WORD — TEST DEMO]

Thank you for helping us test today ([Date]). This was a pilot on CorpFlow's test channel — not the live Living Word WhatsApp or website.

We'd really value your feedback:
• What felt clear or confusing?
• Would you use WhatsApp for member updates if the church offered it?
• Any suggestions for our team?

Reply here with any thoughts — or speak to us after the session. God bless.
```

---

## 4. Live demo flow (7 July, ~20 min)

| Step | Who | What happens |
|---|---|---|
| 1 | Anton | Intro: TEST DEMO, not production |
| 2 | Participant | Scans QR / opens `wa.me` link → sends WhatsApp to **pilot number** |
| 3 | CorpFlow | Inbound captured → operator queue (`living-word-mauritius`) |
| 4 | Anton (screen) | Shows inbound in CorpFlow queue |
| 5 | Anton | Opens member-update (admin) → identify participant → **matched** → submit → **review_required** |
| 6 | Anton (phone) | Sends **welcome** (§3.2) with logo |
| 7 | Anton | Narrates GHL Phase 2 shape (Personal → Location → Team) per field map doc |
| 8 | Anton (phone) | Sends **final message** (§3.4) with logo + feedback invitation |
| 9 | Anton | Thanks participant; reminds them it was a test |

**QR / link:** generated after pilot number is confirmed — `https://wa.me/<E164>?text=<url-encoded TEST prefix + intent>`.

---

## 5. Logo usage in workflow elements

| Element | Logo use |
|---|---|
| WhatsApp welcome + final messages | Attach `living-word-church-logo.png` with TEST-prefixed text |
| `/site-preview` (optional) | May add small logo in TEST ribbon area in a follow-up UI PR |
| Operator queue | Text badge only — no logo without TEST label |
| Printed QR in room | Logo + "TEST DEMO" + QR |

**Provenance:** operator-supplied Living Word Church logo (2026-07-01). Tenant-scoped path only.

---

## 6. Technical slice (separate implementation PR)

Authorized scope for **Tier 2 demo slice** (Stages 2–3 compressed):

- Inbound webhook (verify + signed POST) → `automation_events` (`whatsapp.inbound.message.v1`)
- Operator queue view (factory/tenant admin)
- Route inbound to `living-word-mauritius`
- Optional Telegram alert (no PII in alert body)
- Demo participant seed (operator-provided, not in repo)
- **No** Stage 4 outbound automation unless separately approved before 7 July
- **No** DB migration (use `automation_events` per design doc §8.1)
- **No** church number migration (Stage 5)

**Blocked until Anton completes:**

| Gate | Action |
|---|---|
| Meta Business + WhatsApp Cloud API app | Create / confirm |
| Pilot number on Cloud API | Register operator number |
| Webhook URL + verify token | Point to production route after deploy |
| Secrets in Infisical/Vercel only | `CORPFLOW_WHATSAPP_*` names per design doc §9 |
| Merge + Production deploy | Anton |
| Participant roster on #249 | Names + phones + consent |

---

## 7. What requires Anton (unchanged hard gates)

- Meta / WhatsApp Business setup on **operator pilot number**
- Secrets / env (never in repo)
- Production deploy of webhook PR
- Merge all PRs
- Post participant names on #249 (not in repo)
- Send pre-demo consent (§3.1) to each participant
- Manual WhatsApp replies (§3.2–3.4) until outbound Stage 4 is approved
- `GATE-PRIVACY` / `GATE-PILOT` before any production church-number or real canonical write

---

## 8. Cross-references

- `docs/LIVING_WORD/LIVING_WORD_TUESDAY_DEMO_READINESS_V1.md`
- `docs/LIVING_WORD/LIVING_WORD_TUESDAY_DEMO_SCRIPT_V1.md`
- `docs/LIVING_WORD/LIVING_WORD_GHL_LEGACY_ONBOARDING_AND_UPDATE_FIELD_MAP_V1.md`
- `docs/decisions/20260629-whatsapp-tier1-tier2-capability.md`
- `docs/product/CORPFLOWAI_WHATSAPP_TIER2_RESPONSE_ENGINE_DESIGN_V1.md`
- `docs/execution/CORPFLOWAI_WHATSAPP_INBOUND_RESPONSE_ENGINE_ACTION_PLAN_V1.md`
- `public/assets/tenants/living-word-mauritius/living-word-church-logo.png`

---

## 9. Status block

- **Demo authorization:** YES (operator, 2026-07-01) — Tier 2 inbound slice for 7 July with TEST labeling + feedback CTA + logo.
- **Participant names:** collected by Anton — **post roster on #249**; do not commit to repo.
- **Implementation PR:** pending Meta setup + participant roster.
- **Verdict:** PARTIAL — packet documented; live demo requires webhook deploy + participant seed + manual WhatsApp script.
