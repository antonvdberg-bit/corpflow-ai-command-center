# Living Word Mauritius — TEST DEMO form chain status

**Status:** **CLOSED** — Tuesday TEST DEMO delivered (2026-07-07). No further demo requirements unless Anton opens a new packet.

**Label:** `[LIVING WORD — TEST DEMO]` on every surface.

**Tenant:** `living-word-mauritius` only.

---

## Delivery Reality Audit (closure)

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES (#557–#561)
- Production deployment: Vercel Production on commit 4c58c891 (PR #561 merge)
- Live URLs tested:
  - https://living-word-mauritius.corpflowai.com/site-preview — 200, Elementor teal/white palette live
  - https://living-word-mauritius.corpflowai.com/living-word/demo — 200
  - GET demo-form-chain/status — ok:true, demo_chain_verdict:READY
- Expected vs actual: Branded sandbox, ask-only chatbot, form chain, email path — match intent
- Client-facing flow usable: YES (TEST DEMO scope; orange ribbon; synthetic data only)
- Final verdict: COMPLETE (TEST DEMO lane)
```

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
| Sandbox site | `/site-preview` (host-gated); **`/` redirects here** on `living-word-mauritius.corpflowai.com` |
| Status API | `GET /api/factory_router?__path=tenant/living-word/demo-form-chain/status` |
| Form 1 API | `POST /api/factory_router?__path=tenant/living-word/demo-form-chain/form-1` |
| Form 2 session | `GET /api/factory_router?__path=tenant/living-word/demo-form-chain/form-2-session&token=` |
| Form 2 submit | `POST /api/factory_router?__path=tenant/living-word/demo-form-chain/form-2` |

**Logo:** `/assets/tenants/living-word-mauritius/living-word-church-logo.png`

---

## Merged delivery (reference)

| PR | Summary |
|----|---------|
| #557 | Form chain + email link + demo routes |
| #558 | Form 1/2 GHL-shaped fields |
| #559 | Tenant `/` → `/site-preview` |
| #560 | Ask-only chatbot UX |
| #561 | Site palette aligned to live Elementor (teal/white) |

---

## Test data rules (unchanged — still enforced)

- **Emails:** `@example.test` only (e.g. `test.alpha@example.test`)
- **Phone / address:** synthetic demo values only
- **No real member data**
- **No canonical member writes**
- **No GHL writes**
- **No DB persistence** (in-memory sessions, 24h TTL)
- **No public launch**

---

## What is explicitly out of scope (post-demo)

- WhatsApp / SMS runtime for this chain
- GHL or canonical member writes
- WordPress embed / DNS cutover / public launch
- Real member-data import
- Member Update Flow DB migration (separate gated packet — PR #482)
- Additional demo copy polish unless owner opens a new deliverable

---

## Safety statement

**No** WhatsApp, SMS, GHL, canonical member writes, public launch, payment actions, new env vendors, or DB/schema changes in this packet. TEST DEMO lane is **closed**.
