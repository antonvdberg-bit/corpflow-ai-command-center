# LuxeMaurice AI — New Product Feedback Delivery Queue

**Status:** Operator control surface (config-backed) · **NO PRODUCTION DEPLOY AUTHORIZED BY THIS DOC ALONE**
**Route:** `/change/lux-feedback` (LuxeMaurice operator desk)
**Active product surface:** `/client/luxe-maurice-ai`
**Config module:** `lib/client/lux-owner-feedback-queue.js`
**PR slice:** [#580](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/580)
**Last updated:** 2026-07-08

---

## Line in the sand

**Active baseline:** new multi-channel private-access **LuxeMaurice AI** product at `/client/luxe-maurice-ai`.

**Not in scope for active delivery:** the old property-only Lux website stream (`lux.corpflowai.com/properties`, content sprint C1/C2 on tenant marketing, recovery-roadmap property framing).

| Reference | Role |
|-----------|------|
| **#529** | Historical recovery context only — old programme, property-site recovery, WBS |
| **#580** | Aligned to the **new LuxeMaurice AI product** feedback queue slice |

---

## Purpose

Give Anton, Cursor, and ChatGPT one operator desk for **new-product** owner feedback:

- Multi-channel categories (residences, yachts, aviation, island experiences, advisory, buyer flow, CRM)
- Website readiness and mobile readiness (P0)
- Proposed responses and next visible fixes on `/client/luxe-maurice-ai`
- Next **2–6 hour** delivery slice
- Approval gates
- **Historical / legacy** section — old property-only items do **not** drive the next slice

---

## New product categories

1. Residences / property (one channel, not the whole product)
2. Yachts
3. Aviation
4. Island experiences
5. Private advisory / concierge access
6. Buyer private-access request flow
7. Advisor / operator pipeline
8. Website readiness
9. Mobile readiness
10. Multi-channel / multi-directional product scope

---

## Operator usage

1. Open **`/change/lux-feedback`** on preview or Lux tenant host.
2. Read the **top baseline banner** — confirms new product, not old property site.
3. Review **P0** new-product items (website-ready, mobile-ready, multi-channel, not property-only, active surface).
4. Follow the **Next 2–6 hour delivery slice** — all outcomes must improve `/client/luxe-maurice-ai`.
5. Consult **Historical / legacy Lux context** only when a legacy item directly affects the new product.

---

## Next visible fix (must improve new product)

After this queue is on preview:

1. **Website-ready pass** on `/client/luxe-maurice-ai` — landing, properties directory, category detail pages.
2. **Multi-channel parity** — residences, yachts, aviation, island experiences, advisory all visible.
3. **Mobile-ready pass** on `/client/luxe-maurice-ai` and `/client/luxe-maurice-ai/buyer`.
4. **Buyer → CRM preview** — private-access request visible on `/client/luxe-maurice-ai/crm`.

Do **not** prioritize old `lux.corpflowai.com/properties` content sprint or recovery-roadmap unless Anton explicitly reconnects them to the new product.

---

## Approval gates

| Action | Anton required? |
|--------|-----------------|
| View this queue | No |
| Merge PR to preview | No (CI + PR review) |
| Production deploy | **Yes** |
| Client send / owner review link | **Yes** |

---

## Verification

```bash
npm test
npm run build
git diff --check
```

Manual: open `/change/lux-feedback` on Vercel preview — confirm baseline banner, new-product items, historical section separated, links to `/client/luxe-maurice-ai`.

---

## Non-actions

- No production deploy without Anton approval
- No env/secrets, DB/schema, email/WhatsApp/SMS runtime, payment, or external client outreach from this slice
