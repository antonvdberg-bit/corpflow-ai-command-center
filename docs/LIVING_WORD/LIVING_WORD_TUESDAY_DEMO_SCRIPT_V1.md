# Living Word Mauritius — Tuesday demo script (v1)

**Status:** Docs-only runbook. **No runtime change.**
**Demo date:** **Tuesday 7 July 2026** (2026-07-07).
**Tenant:** `living-word-mauritius` only — controlled sandbox, admin-gated member-update walkthrough.
**Audience:** Church leadership (+ optional WordPress provider).
**Prerequisite plan:** `docs/LIVING_WORD/LIVING_WORD_TUESDAY_DEMO_READINESS_V1.md`
**Field map:** `docs/LIVING_WORD/LIVING_WORD_GHL_LEGACY_ONBOARDING_AND_UPDATE_FIELD_MAP_V1.md`
**Anchor sentinel:** `<!-- LIVING_WORD_TUESDAY_DEMO_SCRIPT_V1 -->`

<!-- LIVING_WORD_TUESDAY_DEMO_SCRIPT_V1 -->

## 0. Before you start (5 minutes)

- [ ] Open this script on a second screen or printout.
- [ ] Use **Chrome** (or Edge) — not in-app browser.
- [ ] Confirm you are logged in as **factory/tenant admin** if you will show the member-update form (admin `corpflow_session` required).
- [ ] **Do not** use real member data — synthetic seed only (`test.alpha@example.test` / `+23050000001`).
- [ ] Morning-of: Cursor posts a one-line **demo-ready** confirmation on #249 after re-probing URLs (read-only).

**If anything is down:** narrate from screenshots in `demo-ready-sandbox-activation.md`; do not improvise a public launch promise.

---

## 1. Opening (30 seconds)

> "This is our **test environment** on CorpFlow — not your live WordPress site. Everything you see runs on a sandbox we control, with an orange banner so nobody confuses it with production."

---

## 2. Demo site + schedule (~3 min)

1. Open **https://living-word-mauritius.corpflowai.com/site-preview**
2. Point to the orange ribbon: *"TEST ENVIRONMENT — Not the live Living Word Mauritius website."*
3. Scroll the page — explain it **looks like** Living Word but is hosted on CorpFlow's tenant, not `livingwordmauritius.com`.
4. Scroll to **Approved schedule** — show the **Sunday Service** row (DB-backed, pastor-approved). Say additional services need explicit approval before they appear.

**Fallback:** if schedule block empty, say "we only show pastor-approved rows — unapproved fixtures never render."

---

## 3. Chatbot — guided paths (~5 min)

1. Click the **chat bubble** (bottom-right). Wait up to ~60s if loader was recently toggled.
2. Show the **8 starter options**.
3. Walk through **four** paths (don't need all eight unless they ask):

| Menu option | What to show | Say |
|---|---|---|
| **Service times** | Guided routing | "Times come from **approved church records**, not invented AI." |
| **Prayer request** | Pastoral / crisis **disclaimer** | "We show the disclaimer **before** collecting anything — prayer free-text is **not** in the member-update form." |
| **Youth / Children** | Parent/guardian + age band | "Safeguard: we don't ask for a child's name in the band step." |
| **Contact** | Name capture shape | "This is how a visitor enquiry would enter the operator queue." |

4. Optional — **retrieval AI** (if `ai_enabled` on tenant): ask *"When is Sunday service?"* — answer should cite approved content; try an emergency-style prompt and show **safety refusal**.

> "This is a **guided assistant** with optional retrieval from approved content — not an open-ended ChatGPT on your website."

---

## 4. Member update flow — Phase 2 shape (~5 min)

**Framing (say this):**

> "In GoHighLevel you had two steps: a short **onboarding** form — name and member type — and later a **profile verification** survey that updated contact fields in batches. We're demoing the **update** shape on CorpFlow: identify yourself, confirm your details, submit for **staff review** — nothing overwrites your live GHL record automatically."

Reference the legacy workflow (Personal Info → Contact & Location → Team Active) using `LIVING_WORD_GHL_LEGACY_ONBOARDING_AND_UPDATE_FIELD_MAP_V1.md` §2 if they ask "where did our old automation go?"

### 4.1 Admin-gated form walkthrough

1. Open **https://living-word-mauritius.corpflowai.com/living-word-member-update.html** (admin session required).
2. **Step 1 — Identify:** enter synthetic email `test.alpha@example.test` → expect **matched**.
3. **Step 2 — Update:** show prefilled fields aligned with GHL **Action 1–3**:
   - Personal: name, email, phone, member type
   - Location: address, city
   - Team/comms: ready to serve, church comms opt-in
4. Check **consent** → **Submit**.
5. Show the **operator-review** response: `review_required: true`, `canonical_write: false`.

> "A staff member approves before anything is written to your canonical directory. **No SMS** is sent in this pilot — that was the last step in your old GHL workflow; we keep follow-up manual until messaging is approved."

**Do not** enter real member names, phones, or emails.

---

## 5. What we are NOT showing (say only if asked)

| Topic | One-line answer |
|---|---|
| Live WordPress / GHL embed | "Separate authorised step after you sign off this sandbox." |
| Real member import | "Privacy + pilot gates — synthetic demo only today." |
| Prayer free-text in update form | "Excluded — pastoral path uses chatbot disclaimer." |
| Donation / charity checkbox | "Financial — out of scope for this pilot." |
| Automated SMS after submit | "Not enabled — operator follow-up manual." |
| "I want to join" checkbox | "New-member onboarding — Phase 1 — next packet." |

---

## 6. Close (~1 min)

> "If this direction works for you, the next steps are: approve wording for service times and chatbot paths, decide which fields stay in the member-update form, and then a **separate decision** to embed on WordPress — not today."

Ask for feedback on **three** things only:

1. Schedule accuracy (Sunday service row).
2. Chatbot paths and tone (especially prayer + youth).
3. Member-update fields — anything missing from the old GHL update survey that staff still need?

---

## 7. Timing guide (total ~15–20 min)

| Block | Minutes |
|---|---|
| Open + site + schedule | 3 |
| Chatbot paths | 5 |
| Member update (synthetic) | 5 |
| Q&A + close | 5–7 |

---

## 8. Rollback (operator only — if something looks wrong)

```sql
UPDATE chat_widget_configs SET enabled = false WHERE tenant_id = 'living-word-mauritius';
```

Site-preview + schedule remain. See `demo-ready-sandbox-activation.md` §10.

---

## 9. Cross-references

- `artifacts/quality-audits/2026-06-11-living-word-mauritius/demo-ready-sandbox-activation.md` — original demo script + verification evidence.
- `docs/LIVING_WORD/LIVING_WORD_TUESDAY_DEMO_READINESS_V1.md` — plan + 48-hour board.
- `docs/LIVING_WORD/LIVING_WORD_GHL_LEGACY_ONBOARDING_AND_UPDATE_FIELD_MAP_V1.md` — GHL field map + Action 1/2/3 alignment.

---

## 10. Status block

- **Demo date:** 2026-07-07 (confirmed by Anton, 2026-06-30).
- **Delivery state:** Docs-only; intended merged before demo morning.
- **Verdict:** PARTIAL until demo-morning live re-probe posts **demo-ready** on #249.
