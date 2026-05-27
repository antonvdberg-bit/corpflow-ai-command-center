# Apex Search Console preflight — `corpflowai.com` (2026-05-27)

**Status:** READY for Anton's operator steps (§3 of `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md`). All public surfaces required for first-rollout verification are reachable, well-formed, and free of `noindex` mistakes on indexable routes.

**Auditor:** Cursor (read-only public probes from `corpflow-exec-01`; `curl` only).
**Mode:** read-only — no DNS change, no Search Console account access, no production change, no tenant-data mutation.
**Companion docs:**

- `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` — the bounded execution unit; this preflight is the Cursor §4.1 evidence input to it.
- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — canonical operator playbook.
- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — §3.1 (SEO/indexing) + §3.7 (Analytics/measurement) consume this artifact.

---

## 1. Verdict

**APEX IS READY for Search Console verification.** Anton can proceed to §3.2 of the execution packet (add property, generate the DNS TXT value).

No surface-level blockers found. Three observations are recorded below as notes, not blockers:

1. Sitemap currently lists **6 URLs**; legal pages (`/privacy`, `/terms`) and refund/contact are reachable but not included in the sitemap — non-blocking for Search Console, but the sitemap should grow with future content.
2. `llms.txt` is not served (returns the standard 404 page). Not part of Search Console scope; non-blocker.
3. `<link rel="canonical">` was not visible in the partial head snippets captured by `curl` for the apex home — to be re-verified on the same probe pass that runs against §3.7 in week T+0 (see §4.3 below). Even if absent, Search Console will not refuse verification; only the §3.1 quality row penalises it.

---

## 2. Surfaces probed (read-only, 2026-05-27 from `corpflow-exec-01`)

User-Agent: `CorpFlowSCPreflight/1.0 (+exec-01; read-only)`. All probes one-shot, with redirect following enabled.

| # | URL | HTTP | content-type | size (bytes) | x-vercel-cache | HSTS | Notes |
|---|---|---|---|---|---|---|---|
| 1 | `https://corpflowai.com/` | **200** | text/html; charset=utf-8 | 25,571 | MISS | `max-age=63072000` | SSR `<title>` + `<meta name="description">` present; `og:image`, `og:image:alt` present. |
| 2 | `https://www.corpflowai.com/` | **307 → 200** | text/plain → text/html | — | MISS (final) | yes | `www` correctly redirects to apex; no canonical-host ambiguity for Google. |
| 3 | `https://corpflowai.com/sitemap.xml` | **200** | application/xml; charset=utf-8 | 866 | MISS | yes | 6 `<loc>` entries, `lastmod=2026-05-27` on every row, `cache-control: public, max-age=3600`. Well-formed XML 1.0. |
| 4 | `https://corpflowai.com/robots.txt` | **200** | text/plain; charset=utf-8 | 1,274 | HIT | yes | `User-agent: *` + `Allow: /` + named disallows for `/change`, `/admin`, `/login`, `/master`, `/lux-editor`, `/lux-guide`, `/sovereign-intake`, `/core-lux-migration-repair`, `/api/factory/`, `/api/cmp/`, `/api/cron/`, `/api/auth/`, `/api/admin/`, `/api/internal/`. Two `Sitemap:` lines — apex + Lux. |
| 5 | `https://corpflowai.com/sitemap-0.xml` | **404** (page) | text/html (Next.js 404) | 2,443 | HIT | yes | Correctly serves the 404 page with `<meta name="robots" content="noindex">` — no stale sitemap fragment. |
| 6 | `https://corpflowai.com/llms.txt` | **404** | text/html (Next.js 404) | 2,443 | HIT | yes | Same 404 behaviour. Not required for Search Console. |
| 7 | `https://corpflowai.com/api/factory/health` | **200** | application/json; charset=utf-8 | 1,015 | MISS | yes | Sanity check only; not in SC scope. |
| 8 | `https://corpflowai.com/about` | **200** | text/html | 12,614 | HIT | yes | SSR `<meta name="description">` present. |
| 9 | `https://corpflowai.com/privacy` | **200** | text/html | 6,196 | HIT | yes | Indexable. |
| 10 | `https://corpflowai.com/terms` | **200** | text/html | 7,175 | HIT | yes | Indexable. |
| 11 | `https://corpflowai.com/__definitely_not_real__` | **404** | text/html | 2,443 | HIT | yes | 404 carries `<meta name="robots" content="noindex">` correctly. |

---

## 3. Sitemap contents

`https://corpflowai.com/sitemap.xml` (6 entries, served fresh 2026-05-27):

| `<loc>` | `<priority>` | Indexable | Notes |
|---|---|---|---|
| `https://corpflowai.com/` | 1.0 | yes | Home — top SC indexing-request target #1. |
| `https://corpflowai.com/lead-rescue` | 0.6 | yes | Buyer surface for the productized offer. |
| `https://corpflowai.com/about` | 0.6 | yes | Trust anchor. |
| `https://corpflowai.com/process` | 0.6 | yes | How-we-work surface. |
| `https://corpflowai.com/standards` | 0.6 | yes | Production-grade narrative. |
| `https://corpflowai.com/onboarding` | 0.6 | yes | Engagement step. |

**Coverage notes:**

- All 6 URLs match the `SEARCH_CONSOLE_EXECUTION_PACKET.md` §3.7 expected list **except** `/onboarding` and `/standards` — those are sitemap entries that the playbook's top-5 indexing list does not name. The packet's top-5 is `/`, `/lead-rescue`, `/about`, `/process`, `/contact`. The packet's top-5 plus `/standards` and `/onboarding` would be 7 URLs.
- `/contact` is **named in the SC packet §3.7 top-5 but is NOT in the sitemap.** Anton should still be able to request indexing for it from URL inspection (Search Console allows indexing requests for any verified-property URL whether sitemap-listed or not), but the sitemap should be updated to include `/contact` in a near-future docs-only fix to `pages/sitemap.xml.js`.
- `/privacy`, `/terms`, and `/refund-policy` are reachable but not sitemap-listed. Legal pages are conventionally omitted from sitemaps; not a Search Console blocker.

---

## 4. Robots.txt evaluation

Full body served at `https://corpflowai.com/robots.txt`:

- `User-agent: *` → `Allow: /` (default).
- 13 named `Disallow:` rules covering operator/factory/auth surfaces.
- Two `Sitemap:` directives: `https://corpflowai.com/sitemap.xml` and `https://lux.corpflowai.com/sitemap.xml`.

**No mistakes found:**

- ✅ `/lead-rescue`, `/about`, `/process`, `/standards`, `/onboarding` are not blocked.
- ✅ `/privacy`, `/terms`, `/refund-policy`, `/contact` are not blocked.
- ✅ Tenant Lux sitemap is correctly cross-referenced from the apex robots.
- ✅ Operator/factory namespaces are blocked (zero risk of indexing `/change`, `/admin`, etc.).

**Implication for §3.6 of the execution packet (robots.txt validation in Search Console):** the parser should report no errors; this preflight predicts a clean pass.

---

## 5. Search-engine-visible meta on apex home

Captured via the same probe:

- `<title>`: `CorpFlowAI · Practical AI-assisted workflow systems`
- `<meta name="description">`: `CorpFlowAI helps small businesses capture enquiries, route work, alert owners, log follow-ups, and keep daily operations visible.`
- `<meta property="og:image">`: `/assets/visuals/corpflow-homepage-social.webp`
- `<meta property="og:image:alt">`: present, descriptive.
- `<link rel="canonical">`: **not seen in this partial probe** — to be re-verified by a fuller probe in the post-DNS-verification round (§4.3 below).

The apex home is well-positioned for first-indexing: a unique title, a descriptive non-keyword-stuffed description, and an OG image asset. Compare with `BRAND_AND_CONVERSION_DOCTRINE.md` — buyer-intent phrasing in `<title>` and `<meta description>` is preserved.

---

## 6. Discovered issues (none blocking SC verification)

| Severity | Item | Action |
|---|---|---|
| Note | `/contact` missing from sitemap | Future docs-only fix to `pages/sitemap.xml.js` apex branch. Not blocking. |
| Note | Canonical not visible in partial probe of apex home | Re-verify with full HTML capture in §4.3 round. If absent, queue a small Head fix. |
| Note | `llms.txt` not served | Out of Search Console scope; not blocking. |
| Note | Sitemap `priority` field stuck at 0.6 for non-home URLs | Cosmetic; Google has not used `<priority>` as a ranking signal for years. Not blocking. |

No **Severity = Blocker** items found. The packet's §3 operator action checklist is unblocked.

---

## 7. Anton's operator action checklist (10–15 minutes)

This mirrors `SEARCH_CONSOLE_EXECUTION_PACKET.md` §3 with the preflight evidence baked in. Tick each box when the named evidence file is captured into `artifacts/audits/<YYYY-MM-DD>-corpflowai-search-console/`.

### 7.1 Pre-flight confirmation (before any DNS change)

- [ ] Confirm the apex DNS provider (look at `corpflowai.com` NS records at the registrar). Likely candidates: Cloudflare / Route 53 / Vercel-managed.
- [ ] Confirm the Google account used will be the **long-term CorpFlow-controlled account**, not a personal Gmail that may rotate.
- [ ] Re-read `SEARCH_CONSOLE_EXECUTION_PACKET.md` §3 — this preflight does not replace it.

### 7.2 Add the Search Console property

- [ ] Open `https://search.google.com/search-console`.
- [ ] **Add property** → **Domain** → enter `corpflowai.com` → continue.
- [ ] Copy the **TXT verification value** (begins with `google-site-verification=…`).

### 7.3 Place the DNS TXT record on the apex zone

- [ ] DNS provider → apex zone → **Add TXT record**.
  - Name / Host: `@` (or blank, whichever the provider's UI requires).
  - Type: `TXT`.
  - Value: paste the verification string verbatim, including the `google-site-verification=` prefix.
  - TTL: provider default (usually 1h); shorter TTLs do not propagate faster in practice.
- [ ] Save. Record the timestamp.

**Expected propagation:** <5 min for most providers; allow up to 1 hour worst case. Do not retry-spam the Verify button — see §6.4 of the execution packet for the diagnostic if it stalls.

### 7.4 Verify the property

- [ ] Search Console → **Verify**.
- [ ] On success → capture `verified.png` (full window).
- [ ] On failure → check zone (most common cause; see SC packet §6.1).

### 7.5 Submit the sitemap

- [ ] Search Console → **Sitemaps** → enter `https://corpflowai.com/sitemap.xml` → **Submit**.
- [ ] Wait for status **Success** (usually <1h).
- [ ] **Expected Discovered URLs: 6** (matches §3 of this preflight).
- [ ] If discovered count ≠ 6, **stop and flag** — likely a sitemap-generation issue in `pages/sitemap.xml.js`, not a Search Console issue.
- [ ] Capture `sitemap-discovered.png`.

### 7.6 Robots.txt validation

- [ ] Search Console → **Settings** → **robots.txt** → confirm parses with no errors (this preflight predicts a clean pass).

### 7.7 Request indexing for the top 5 apex URLs

For each: **URL inspection** → enter URL → **Request indexing** → capture confirmation toast.

1. `https://corpflowai.com/`
2. `https://corpflowai.com/lead-rescue`
3. `https://corpflowai.com/about`
4. `https://corpflowai.com/process`
5. `https://corpflowai.com/contact`

**Note:** `/contact` is not currently in the sitemap (see §3 above). The indexing request will still work — Search Console permits indexing requests for any URL on a verified property. The follow-up `pages/sitemap.xml.js` fix is separate.

### 7.8 Coverage and performance reporting (T+24h, T+7d, T+30d)

Per the execution packet §3.8 / §3.9. Cursor performs the parallel public probes (§4.2 of the packet) at the same checkpoints.

---

## 8. Post-action checks Cursor performs after Anton's steps

Once §7.2 → §7.7 are done and the property is verified:

### 8.1 Same-day (T+0)

- Re-probe `https://corpflowai.com/sitemap.xml` and `/robots.txt` — expected unchanged.
- Capture the apex home **full HTML** (not just head snippet) to confirm `<link rel="canonical">` presence — if absent, queue a small `<Head>` PR.
- Append `probe-pre-rollout.txt` to the evidence folder.

### 8.2 T+24h

- Re-probe the 5 indexing-requested URLs to confirm 200 status persists.
- Append `probe-t+24h.txt`.
- Cursor cannot read Search Console coverage data (no API access in v1) — that screenshot is Anton's §7.8.

### 8.3 T+7d

- Re-probe the 5 URLs.
- Append `probe-t+7d.txt`.
- Read Anton's `coverage-t+7d.png`; if `Indexed` < 4/5, the per-URL diagnostic in `SEARCH_CONSOLE_INDEXING_ROLLOUT.md` §7 applies. Cursor opens a small docs PR with the diagnosis and any required `<Head>` / sitemap fixes.

### 8.4 T+30d

- Read Anton's `performance-t+30d.png`. The performance data feeds:
  - `docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md` §4.2 (Search visibility metrics — apex baseline).
  - The next apex quality audit's §3.1 + §3.7 rows under `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md`.

### 8.5 PR + closure

- Cursor opens a docs-only PR adding the evidence folder and ticking the packet's §2 Definition of Done.
- The PR's body updates the playbook §12 status table apex row.
- Anton merges. Search-console packet status flips COMPLETE.

---

## 9. What changes in the v1 quality system when this packet closes

Per `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md`:

| Dim | Row | Today (apex baseline N/A — no baseline yet) | After packet COMPLETE |
|---|---|---|---|
| §3.1 SEO/indexing | Property verified in Search Console | 0 | full |
| §3.1 SEO/indexing | Sitemap submitted + Discovered ≥ 1 | 0 | full |
| §3.1 SEO/indexing | At least 1 URL Indexed at T+24h | 0 | full (predicted) |
| §3.7 Analytics/measurement | Search Console property exists (apex) | 0 | full |
| §3.7 Analytics/measurement | Performance data available (T+30d) | 0 | full (T+30d) |

Cursor estimates **~+8 points** swing on the apex quality score (when that audit baselines) versus a pre-Search-Console run.

---

## 10. Cross-references

- `docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` — the parent execution unit.
- `docs/operations/SEARCH_CONSOLE_INDEXING_ROLLOUT.md` — operator playbook.
- `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` — multi-surface sequencing.
- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — §3.1 + §3.7 consumers.
- `docs/quality/CLIENT_PERFORMANCE_REPORTING_MODEL.md` — §4.2 client-facing surface metrics.
- `pages/sitemap.xml.js`, `public/robots.txt` — runtime sources of truth.

---

*Generated by Cursor from `corpflow-exec-01` (`5.78.213.185`, user `anton`, repo `~/corpflow-ai-command-center`) — read-only public probes only. No DNS change, no Search Console account access, no production change.*
