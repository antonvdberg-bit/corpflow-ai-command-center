# Training Pack Review Edition — control surface

This folder is the **single control surface** for Anton’s review of the LuxeMaurice Training Pack. There is no custom review application and no separate database — repository files here govern review state.

**Status:** review / package only. **No external email, WhatsApp, or SMS has been sent.** Outbound messaging automation is not live.

---

## Entry points (start here)

| File | Purpose |
|------|---------|
| [`LUXEMAURICE_TRAINING_PACK_REVIEW.md`](./LUXEMAURICE_TRAINING_PACK_REVIEW.md) | Primary review document — capabilities, limitations, graphics 01–08, links, approval checklist |
| [`LUXEMAURICE_TRAINING_PACK_REVIEW.html`](./LUXEMAURICE_TRAINING_PACK_REVIEW.html) | Same review content as a local browser / print-to-PDF package (generated; open the file from disk) |
| [`ANTON_REVIEW_CHANGES.md`](./ANTON_REVIEW_CHANGES.md) | Where Anton records corrections (`AR-*` rows) and final decision checkboxes |

Companion package (drafts only until Anton approves external send):

- [`../client-delivery-preparation/`](../client-delivery-preparation/) — Jan-facing inventory, cover note, draft messages, delivery checklist

---

## How Anton records changes

1. Open [`ANTON_REVIEW_CHANGES.md`](./ANTON_REVIEW_CHANGES.md).
2. Replace or add rows under **Requested changes** using IDs `AR-001`, `AR-002`, …
3. Set **Status** on each row to `OPEN` while work is outstanding.
4. Optionally answer the **Review questions** in that file.
5. Leave **Final decision** checkboxes unchecked until the review loop is finished.
6. Do **not** check **Approved for actual external send** until you intentionally authorize a real client send.

---

## Change-response loop

When Anton adds or updates open `AR-*` items:

1. **Cursor reads** all `OPEN` rows in `ANTON_REVIEW_CHANGES.md`.
2. **Applies** the requested corrections in the training pack (guides, scripts, graphics notes, review edition, or client-delivery package as appropriate).
3. **Marks** each addressed item `RESOLVED` and fills the **Resolution** column.
4. **Regenerates** `LUXEMAURICE_TRAINING_PACK_REVIEW.html` from the Markdown sources.
5. **Reruns** pack tests (`node node-tests/luxe-maurice-training-pack.test.mjs` and related suite checks).
6. **Updates** the same PR with the revised review edition.

No custom review app is required. Repo files remain the control surface.

---

## What this folder is not

- Not a public website route
- Not automatic publication to Jan
- Not approval to send email / WhatsApp / SMS
- Not a substitute for live product verification on `https://lux.corpflowai.com/client/luxe-maurice-ai`

---

## Related pack locations

| Path | Role |
|------|------|
| [`../README.md`](../README.md) | Pack root — live URLs, training data standard, send boundaries |
| [`../05-graphics/captures/`](../05-graphics/captures/) | Jan-facing PNG captures (01–08) |
| [`../client-delivery-preparation/`](../client-delivery-preparation/) | Draft Jan package (send gated on Anton approval) |
