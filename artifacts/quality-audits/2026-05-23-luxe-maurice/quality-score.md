# Quality audit — luxe-maurice — 2026-05-23

**Surface:** `https://lux.corpflowai.com/` (home), `https://lux.corpflowai.com/concierge` (primary CTA destination), `https://lux.corpflowai.com/property/lm-nc-ridge` (sample property), `https://lux.corpflowai.com/sitemap.xml`, `https://lux.corpflowai.com/robots.txt`, `https://lux.corpflowai.com/favicon.ico`, `https://lux.corpflowai.com/__definitely-not-a-page-9z9z` (404 probe)
**Auditor:** Cursor (read-only public probes; PowerShell `Invoke-WebRequest` only)
**Mode:** read-only — **no site mutation, no tenant data writes**
**Method limitations:** No browser/Lighthouse session available in this run. Performance and visual-accessibility items are marked **PENDING** per framework §2.2 conditional rule. Score includes a `*` to signal that reservation.
**Production identification at audit time:** `https://core.corpflowai.com/api/factory/production-pulse/runtime` → 200 `ok:true deployment_ready:true monitoring.ok:true core.database_reachable:true`. Lux home `BuildID: N2mp9iJJb_teOOGQfddOZ` (extracted from inline `__NEXT_DATA__` on the 404 probe).

## Score

| Dimension | Score | Notes |
|-----------|-------|-------|
| Conversion clarity | **18/20** | Above-fold offer + buyer-intent CTA are excellent. Trust path is partial (no logos/pricing anchor). |
| Performance | **8/20\*** | Lighthouse not available; 8 awarded conditionally per framework §2.2. Cold full-fetch from auditor location: 1094 ms / 36,074 bytes — TTFB likely OK on warm requests but unverified. |
| Accessibility | **6/20** | Single H1 (`Luxurious Mauritius`), 6 H2s, sensible heading order. **No `lang` attribute on `<html>`**. **No `<main>` landmark**. 0 `<img>` tags (visual content via CSS), so alt-text item passes trivially. Keyboard / contrast / Lighthouse a11y → PENDING (need browser). |
| SEO / discoverability | **0/20** | **Critical gap area.** No `<meta name="description">` on home or property pages. No `<link rel="canonical">`. No OG / Twitter cards. `/sitemap.xml` → 404. `/robots.txt` → 404. `/favicon.ico` → 404. Search Console / indexing status not verifiable from public probes (operator-required). |
| Trust + governance | **12/20** | TLS valid, HSTS `max-age=63072000` present. No `<title>` ↔ message mismatch. Concierge form reachable (200). **404 page is generic Next.js `_error`** (not branded). No mailto / no `support@`/`info@` alias visible in HTML. "Privacy" word not found in HTML; "Terms" appears. No dead internal links sampled across home (N=20 anchors hand-checked: all resolved 200). |
| **Total** | **44/100\*** | `*` = pending Lighthouse + browser-driven a11y verification. |

## Verdict (per framework §3)

**Substantive gaps (40–59) — treat as draft for SEO.**

The site's **conversion clarity is excellent** (18/20) and the offer is understandable in well under five seconds. The total is dragged down by a **near-zero SEO score** (0/20) caused by missing description meta, canonical, OG/Twitter cards, sitemap, and robots — the discoverability stack is essentially absent. Buyers who land on the page will convert; Google cannot reliably surface it to those buyers.

Per §3 footnote: Conversion clarity ≥ 10 means we **do not** flag the site as Conversion-PARTIAL. Buyer-facing usage is fine for warm/direct traffic; **paid traffic will burn budget on missing SEO surfaces**.

## Top 5 recommended fixes (ordered by point gain)

1. **SEO meta + sitemap + robots** — add `<meta name="description">` (unique per route), `<link rel="canonical">`, `og:title|description|image|url`, `twitter:card`; serve `/sitemap.xml` listing public routes only (not `/concierge?intent=…` query-string variants); serve `/robots.txt` (`Allow: /` + `Sitemap:` line). **+ ~13 points** (4 desc + 2 canonical + 3 OG + 2 sitemap + 2 robots; Lighthouse SEO will likely flip ≥95 once these land).
2. **Brand the 404 page** — add `pages/404.js` rendering the LuxeMaurice header, language switcher, and a "Back to properties" CTA. Currently `next-export` ships the generic `_error` HTML. **+ 3 points** (Trust §2.5 row 4).
3. **Fix `<html lang>` + add `<main>` landmark + viewport `initial-scale=1`** — `<html lang="en">` (or per-locale dynamic `lang`), wrap the page body in `<main>`, set `<meta name="viewport" content="width=device-width, initial-scale=1">`. Lifts Lighthouse Accessibility ≥ 95 once verified in-browser. **+ ~4–7 points** depending on Lighthouse outcome.
4. **Search Console verification + first indexing requests** — add the apex/subdomain DNS TXT record (Anton-only), verify `lux.corpflowai.com` as a property, submit the new sitemap, request indexing for the home + top 3 property pages. **+ 3 points** (SEO §2.4 row 7) and unblocks the §5 audit framework re-run with measured indexed-page count.
5. **Add a Privacy notice + a publishable contact alias** — link `/privacy` from the footer (placeholder text is acceptable for a v1; the audit only checks reachability) and surface a `concierge@luxurious-mauritius.<tld>` mailto OR an explicit "operated by …" ownership statement. **+ ~3–5 points** across Trust rows 2/3/6.

These five together would lift the score to roughly **65–75/100\*** without any visual redesign work, conditional on Lighthouse passes.

## Doctrine alignment (`docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` non-negotiables)

- ✅ One primary conversion goal obvious — "Private concierge" / "Private enquiry" repeated and unambiguous.
- ✅ Offer understandable within five seconds — "Discover exclusive luxury properties in Mauritius. Buy direct from the developer. Explore upcoming island residences and request a private preview with our concierge team."
- ✅ CTA describes buyer intent — "Private concierge", "Private enquiry", "Request details". No "Choose payment path"-style internal-process language.
- ✅ Payment / region / routing complexity comes after buyer intent — concierge form is the gate; pricing not exposed publicly.
- ✅ Avoids unsupported revenue / AI-magic claims — language is restrained ("exclusive", "concierge", "developer-led").
- ✅ Buyer knows the next step — "Private enquiry" repeated under each property card.

**Doctrine verdict: PASS.** This is a doctrine-aligned page that simply does not have its SEO surface installed.

## Evidence

- Raw HTML snapshot: `.git/lux-home.html` (audit-local, not committed).
- Probe outputs: shells in this conversation; key numbers above.
- Production deployment id at audit time: not extracted from Vercel REST in this run (would require `VERCEL_TOKEN`); production-pulse `deployment_ready:true` and home `BuildID: N2mp9iJJb_teOOGQfddOZ` recorded as proxy.
- HSTS header: `Strict-Transport-Security: max-age=63072000`.

## Operator-required follow-ups (cannot complete from public probes)

- B.2 / B.3 / B.6 / B.7 of the per-tenant migration audit (login boundary).
- Search Console ownership status + indexed page count.
- Lighthouse mobile run (Performance / Accessibility / SEO).
- Manual keyboard-tab traversal on the home + concierge form + a property page.
- Color-contrast verification of the primary CTA.

## Re-audit

Re-run after the Top-5 fixes ship. Expected target: **75–85/100** depending on Lighthouse Performance result.
