# Living Word Mauritius — TEST DEMO form chain status

**Status:** TEST DEMO implementation (PR branch `feat/living-word-demo-email-form-chain`). **Not merged. Not deployed to production unless separately approved.**

**Label:** `[LIVING WORD — TEST DEMO]` on every surface.

**Tenant:** `living-word-mauritius` only.

---

## Demo flow (end-to-end)

1. Open **demo hub** — `/living-word/demo` (status panel + chatbot)
2. Optional: open **sandbox site** — `/site-preview` on `living-word-mauritius.corpflowai.com`
3. Open **Form 1** — `/living-word/form-1`
4. Enter name, phone, email (`@example.test` only), member type, consent
5. Submit Form 1 → system creates tokenized Form 2 session (in-memory)
6. System sends **TEST DEMO email** with Form 2 hyperlink via **existing n8n transactional path** (`N8N_EMAIL_WEBHOOK_URL`)
7. If email path unavailable → **BLOCKED_PENDING_EXISTING_EMAIL_PATH**; Form 2 link shown on screen + preview in status API
8. Recipient opens **Form 2** from email — `/living-word/form-2?token=…`
9. Complete multi-step Form 2 (contact, personal info, team Y/N screens) and submit
10. Submit → operator-review JSON only (**no canonical write**)

---

## URLs / routes

| Surface | Route |
|---------|--------|
| Demo hub + status | `/living-word/demo` |
| Form 1 | `/living-word/form-1` |
| Form 2 (tokenized) | `/living-word/form-2?token=<from-form-1-or-email>` |
| Sandbox site | `/site-preview` (host-gated) |
| Status API | `GET /api/factory_router?__path=tenant/living-word/demo-form-chain/status` |
| Form 1 API | `POST /api/factory_router?__path=tenant/living-word/demo-form-chain/form-1` |
| Form 2 session | `GET /api/factory_router?__path=tenant/living-word/demo-form-chain/form-2-session&token=` |
| Form 2 submit | `POST /api/factory_router?__path=tenant/living-word/demo-form-chain/form-2` |

**Logo:** `/assets/tenants/living-word-mauritius/living-word-church-logo.png`

---

## Test data rules

- **Emails:** `@example.test` only (e.g. `test.alpha@example.test`)
- **Phone / address:** synthetic demo values only
- **No real member data**
- **No canonical member writes**
- **No GHL writes**
- **No DB persistence** (in-memory sessions, 24h TTL)
- **No public launch**

---

## Email behavior

| Item | Value |
|------|--------|
| Path | Existing `sendN8nTransactionalEmail` → n8n webhook (`N8N_EMAIL_WEBHOOK_URL` / legacy password-reset webhook) |
| Subject | `[LIVING WORD — TEST DEMO] Your second form is ready` |
| Body | TEST DEMO label, short explanation, Form 2 hyperlink |
| WhatsApp | **Excluded** — copy notes WhatsApp can replace this later once approved |
| SMS | **Excluded** |
| Fallback | If webhook not configured or send fails → `BLOCKED_PENDING_EXISTING_EMAIL_PATH` + preview in status API and Form 1 response |

---

## Verification status

| Check | Expected |
|-------|----------|
| Form 1 TEST DEMO label | Visible in ribbon + page title |
| Form 2 TEST DEMO label | Visible in ribbon + page title |
| Form 1 → Form 2 unlock | Token + path returned on submit |
| Email payload | Contains `form2_url` + `test_demo_label` |
| No WhatsApp/SMS/GHL | Handlers return `whatsapp: false`, `sms: false`, `ghl_write: false` |
| Email blocked fallback | Safe preview when `N8N_EMAIL_WEBHOOK_URL` unset |

**Verdict after merge/deploy:** operator must run live checks on `living-word-mauritius.corpflowai.com` before calling **COMPLETE**.

---

## What Anton must do for the demo

1. **Use Preview or production** after PR merge approval (this PR is **not auto-merged**).
2. **Email:** ensure `N8N_EMAIL_WEBHOOK_URL` (+ secret) is set in Vercel if live email send is required; otherwise use on-screen Form 2 link from Form 1 response.
3. **Walkthrough:** `/living-word/demo` → `/site-preview` → chatbot → `/living-word/form-1` with `test.alpha@example.test` → email or copy link → Form 2.
4. **Do not** enable WhatsApp runtime for this demo.
5. **Do not** treat submissions as real member updates — operator review / narration only.

---

## Known limitations

- In-memory sessions reset on cold start / new serverless instance
- Email recipients restricted to `@example.test`
- No persistence to Postgres or GHL
- Separate from admin-gated `/living-word-member-update.html` pilot (PR #482)
- WhatsApp demo packet remains optional and **not** wired to this chain

---

## Safety statement

**No** WhatsApp, SMS, GHL, canonical member writes, public launch, payment actions, new env vendors, or DB/schema changes in this packet.
