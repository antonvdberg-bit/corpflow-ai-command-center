# Website Rescue — Demonstration Path v1

**Status:** Verification record for #654.
**Anchor sentinel:** `<!-- WEBSITE_RESCUE_DEMONSTRATION_PATH_V1 -->`

<!-- WEBSITE_RESCUE_DEMONSTRATION_PATH_V1 -->

**Parent pack:** `docs/marketing/WEBSITE_RESCUE_PRODUCT_PACK_V1.md`  
**Issue:** [#654](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/654)

## Public name (for demos)

| Audience | Say this | URL |
|----------|----------|-----|
| Buyer / prospect | **Premium Landing Page Rescue** | `https://corpflowai.com/offers/premium-landing-page-rescue` |
| Operator / internal | **Website Rescue** (umbrella); T1/T2/T3 tiers | This pack |

Do not use “Website Rescue” as the primary headline on buyer calls until Anton approves W2 rename.

---

## Live GET checks (2026-07-28, Agent 3 re-verify)

| URL | HTTP | Content check |
|-----|------|---------------|
| `https://corpflowai.com/offers/premium-landing-page-rescue` | **200** | Title and H1 present: “Premium Landing Page Rescue” / “Turn a weak landing page into a credible enquiry path — fast.” |
| `https://corpflowai.com/offers/premium-landing-page-rescue` | — | `x-matched-path: /offers/premium-landing-page-rescue` (Vercel) |

**Verification command (operator repeat):**

```bash
curl -sI "https://corpflowai.com/offers/premium-landing-page-rescue" | head -5
```

Expected: `HTTP/2 200` (or `HTTP/1.1 200`).

---

## Demonstration flow (current live path)

```text
1. GET https://corpflowai.com/offers/premium-landing-page-rescue  (200)
      ↓
2. Prospect reads outcome, audience, delivered outputs, from MUR 45,000
      ↓
3. Request Discovery Call (mailto CTA on page)
      ↓
4. Operator sends T1 quote (§5 of product pack) or T2/T3 extension quote
      ↓
5. Client approves → 50% deposit (manual MUR, ERPNext invoice)
      ↓
6. Client provides assets (onboarding checklist)
      ↓
7. Preview on managed surface (T1: 24–72 h)
      ↓
8. Structured feedback rounds (2× T1, 2× T2, 3× T3)
      ↓
9. Written production approval + balance payment
      ↓
10. Production release (DNS cutover = Anton gate if applicable)
      ↓
11. Optional: Lead Rescue add-on quoted separately (#653 workstream)
```

## Before / after narrative (no invented metrics)

| Before (typical) | After (T1 deliverable) |
|------------------|-------------------------|
| Outdated or cluttered homepage | Single landing with clear Hook / Proof / Depth |
| No obvious next step | One primary buyer-action CTA |
| Poor mobile layout | Mobile-ready preview before release |
| Enquiries lost or unclear | Tested enquiry path to agreed destination |

Use client-specific examples only with permission; do not publish private names on the offer page.

## Tier routing (discovery quick reference)

| Signal | Route |
|--------|-------|
| “Fix my homepage / landing” | **T1** — public offer |
| “We need 2–3 pages that match” | **T2** — brochure rescue quote |
| “The whole site is embarrassing” | **T3** — bounded rebuild quote after URL audit |
| “Leads go nowhere after the form” | Website Rescue + **Lead Rescue add-on** (separate quote) |

## Non-actions

- No private client data (including Carol opportunity details) in this record.
- No production DNS or deploy performed as part of this verification.
- No Lead Rescue (#653) file reads or edits required to run this demo.
