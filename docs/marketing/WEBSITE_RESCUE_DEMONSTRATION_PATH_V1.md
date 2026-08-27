# Website Rescue — Demonstration Path v1

**Status:** Verification record for #654.
**Anchor sentinel:** `<!-- WEBSITE_RESCUE_DEMONSTRATION_PATH_V1 -->`

<!-- WEBSITE_RESCUE_DEMONSTRATION_PATH_V1 -->

**Parent pack:** `docs/marketing/WEBSITE_RESCUE_PRODUCT_PACK_V1.md`  
**Quote packet:** `docs/marketing/WEBSITE_RESCUE_QUOTE_READY_PACKET_V1.md`  
**Issue:** [#654](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/654)

**Named buyer path:** [#710](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/710) / [#1127](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/1127)

## Public name (for demos)

| Audience | Say this | URL |
|----------|----------|-----|
| Buyer / prospect | **Website Rescue** | `https://corpflowai.com/website-rescue` |
| Sales walkthrough | Fictional before/after demo | `https://corpflowai.com/demo/website-rescue` |
| SKU alias (same product) | Premium Landing Page Rescue | `https://corpflowai.com/offers/premium-landing-page-rescue` |
| Operator / internal | **Website Rescue** (umbrella); T1/T2/T3 tiers | Product pack |

Record and sell the named landing `/website-rescue`. The SKU URL remains a live alias; do not lead a buyer-facing recording with the SKU title.

---

## Live GET checks

Re-run before each client demo. Record date in the operator note when quoting.

| URL | Expected |
|-----|----------|
| `https://corpflowai.com/offers/premium-landing-page-rescue` | **200** — H1 / “Premium Landing Page Rescue” / discovery CTA |
| `https://corpflowai.com/demo/website-rescue` | **200** after this PR deploys — `noindex`, before/after toggle, enquiry form |
| `https://core.corpflowai.com/admin/rapid-delivery` | Auth gate (login redirect if unauthenticated) |

**Verification commands:**

```bash
curl -sI "https://corpflowai.com/offers/premium-landing-page-rescue" | head -5
curl -sI "https://corpflowai.com/demo/website-rescue" | head -5
```

Expected: `HTTP/2 200` (or `HTTP/1.1 200`) on the offer page always; demo route **200** once Production includes this branch.

**Baseline offer check (2026-07-29 UTC, pre-merge of demo route):**

| URL | HTTP | Content check |
|-----|------|---------------|
| `https://corpflowai.com/offers/premium-landing-page-rescue` | **200** | Title/H1 present; `x-matched-path: /offers/premium-landing-page-rescue` |

---

## Demonstration flow (current path)

```text
1. GET https://corpflowai.com/offers/premium-landing-page-rescue  (200)
      ↓
2. Show before/after + FAQ + from MUR 45,000
      ↓
3. GET https://corpflowai.com/demo/website-rescue  (Preview/Production after merge)
      Toggle Before → After → product strip → #demo-enquiry
      ↓
4. Prospect submits discovery (offer page or demo form)
      ↓
5. Operator reviews /admin/rapid-delivery → Website Rescue operator pack
      ↓
6. Send T1 quote (quote-ready packet §11) or T2/T3 extension
      ↓
7. Client approves → 50% deposit (manual MUR, ERPNext)
      ↓
8. Assets + guided design options (delivery checklists §B/D)
      ↓
9. Preview (T1: 24–72 h) → structured feedback rounds
      ↓
10. Written production approval + balance payment
      ↓
11. Production release (DNS cutover = Anton W3 if applicable)
      ↓
12. Optional: Lead Rescue add-on quoted separately
```

## Before / after narrative (no invented metrics)

| Before (typical) | After (T1 deliverable) |
|------------------|-------------------------|
| Outdated or cluttered homepage | Single landing with clear Hook / Proof / Depth |
| No obvious next step | One primary buyer-action CTA |
| Poor mobile layout | Mobile-ready preview before release |
| Enquiries lost or unclear | Tested enquiry path to agreed destination |

Demo business name **Harbour Hospitality Supplies** is fictional. Use client-specific examples only with permission; do not publish private names on the offer page.

## Tier routing (discovery quick reference)

| Signal | Route |
|--------|-------|
| “Fix my homepage / landing” | **T1** — public offer |
| “We need 2–3 pages that match” | **T2** — brochure rescue quote |
| “The whole site is embarrassing” | **T3** — bounded rebuild quote after URL audit |
| “Leads go nowhere after the form” | Website Rescue + **Lead Rescue add-on** (separate quote) |

## Non-actions

- No private client data (including Carol opportunity details) in this record.
- No production DNS or deploy performed as part of documentation-only verification.
- No Lead Rescue (#653) file edits required to run this demo (cross-link only).
