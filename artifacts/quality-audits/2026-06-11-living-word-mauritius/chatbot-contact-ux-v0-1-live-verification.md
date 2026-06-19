# Living Word chatbot contact UX v0.1 — live verification

**Date:** 2026-06-19  
**Tenant:** `living-word-mauritius`  
**Live URL:** https://living-word-mauritius.corpflowai.com/site-preview  
**Mode:** production sandbox — guided chatbot flow v3, no AI, no external WordPress changes.

---

## 1. Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES
- Merged to main: YES (PR #413 + follow-up #414 preferred-method disambiguation)
- Production deployment ID: 5117053591 (GitHub Production)
- Commit deployed: 55e9dc98 (+ flow v3 DB update; pref-method fix in flow JSON via update script)
- Live URLs tested:
  - https://living-word-mauritius.corpflowai.com/site-preview (200)
  - https://living-word-mauritius.corpflowai.com/api/chat-widget/start + /step (contact path)
- Expected vs actual: contact flow captures all required fields; automation payload complete; post-submit menu works; back to menu works
- Client-facing flow usable: YES (sandbox demo chatbot)
- Final verdict: COMPLETE
```

---

## 2. What changed (product)

| Area | Change |
|---|---|
| Contact capture | First name, surname, email, WhatsApp/mobile, preferred contact method, message |
| Preferred methods | Email, WhatsApp, Phone call, SMS (no Facebook/Messenger) |
| Post-submit UX | Thank-you message + Back to main menu / Submit another request / Close chat |
| Automation payload | Adds `whatsapp_or_mobile`, `preferred_contact_method`, `first_name`, `surname`; keeps `name` + `phone` |
| Flow version | **3** (`living-word-flow-v3.js`) |
| Widget | `restartConversation()` + `closePanel()` for post-submit actions |

---

## 3. Source PRs

| PR | Summary |
|---|---|
| [#413](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/413) | Contact UX v0.1 code + migration + flow v3 |
| [#414](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/414) | Unique `next` ids per preferred-contact option (WhatsApp no longer stored as Email) |

---

## 4. Production DB steps

| Step | Result |
|---|---|
| Migration `20260619000000_chat_widget_contact_ux_v01` | `lead_surname`, `preferred_contact_method` columns added |
| `node scripts/update-chat-widget-flow-lwm-v0-1.mjs` | `flow_version=3`, flow JSON updated |

**Widget state:** `enabled=true` (demo posture preserved).

---

## 5. Live test lead (safe)

| Field | Value |
|---|---|
| Thread id | `cmqk6lggx002lky0429vwvmwz` |
| Automation event id | `cmqk6lipx003sky04jld3w1em` |
| First name | Sandbox |
| Surname | ContactUX |
| Email | contact.ux.v01@corpflow-test.invalid |
| WhatsApp/mobile | +230 5000 0101 |
| Preferred contact method | whatsapp |
| Message | CorpFlow contact UX v0.1 safe test lead — safe to ignore. |

**Automation payload lead block (verified):**

```json
{
  "name": "Sandbox ContactUX",
  "first_name": "Sandbox",
  "surname": "ContactUX",
  "email": "contact.ux.v01@corpflow-test.invalid",
  "phone": "+230 5000 0101",
  "whatsapp_or_mobile": "+230 5000 0101",
  "preferred_contact_method": "whatsapp",
  "request_type": "contact"
}
```

---

## 6. Verification checklist

| # | Check | Result |
|---|---|:---:|
| 1 | Contact asks first name | ✓ `contact-first-name` |
| 2 | Surname | ✓ `contact-surname` |
| 3 | Email | ✓ |
| 4 | WhatsApp/mobile | ✓ `contact-whatsapp` |
| 5 | Preferred contact method menu (4 options) | ✓ |
| 6 | Message | ✓ |
| 7 | Post-submit thank-you text | ✓ exact required wording on `request-complete` |
| 8 | Back to main menu | ✓ returns `welcome`, thread stays `active` |
| 9 | Submit another request | ✓ widget `restart` action calls new `/start` (client-side) |
| 10 | Close chat | ✓ widget `close` action hides panel (bubble remains) |
| 11 | Eight starter paths preserved | ✓ flow validation + welcome menu count |
| 12 | Prayer / youth / network posture unchanged | ✓ separate flows not modified structurally |
| 13 | Cross-tenant isolation | ✓ `non_lwm_threads = 0` |
| 14 | No external sites touched | ✓ |

---

## 7. Rollback

1. Revert merge commits on `main` and redeploy Production.
2. Restore flow v2 JSON via DB update (backup in `demo-ready-sandbox-activation` era).
3. Optional: `ALTER TABLE chat_widget_threads DROP COLUMN lead_surname, preferred_contact_method`.
4. Widget disable: `chat_widget_configs.enabled = false` for `living-word-mauritius`.

---

## 8. Scope honoured

- No AI / LLM
- No WordPress / GHL / DNS changes
- No schedule-source changes
- Luxe / `lux_listings` / multi-tenant operator work untouched
