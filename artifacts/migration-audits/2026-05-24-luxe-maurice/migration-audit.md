# Migration audit — luxe-maurice — 2026-05-24

First real run of `docs/execution/CURRENT_CLIENT_MIGRATION_AUDIT_TEMPLATE.md`. Read-only. Cross-references the Packet 3.1 quality audit at `artifacts/quality-audits/2026-05-23-luxe-maurice/quality-score.md`.

## Header

```text
- Tenant ID: luxe-maurice
- Tenant display name: Luxe Maurice (marketing surface: "Luxurious Mauritius")
- Canonical hostname: lux.corpflowai.com
- Optional aliases: none currently active (luxe.corpflowai.com may exist as alias per `tenant_hostnames`; not verified anonymously this run)
- Plan / billing flag: paid (per /api/ui/context: billing_exempt:false)
- Audit date: 2026-05-24
- Auditor: Cursor (read-only public probes; no login attempted)
- Last operational change date: 2026-05-23 (last marketing-affecting deploy was the visual system on 2026-05-23 ~10:16Z, commit 01bcfd1b — see chat_history.md)
- Mode: read-only
```

## Section A — Identity and routing

| # | Item | Expected | Result | Notes |
|---|------|----------|--------|-------|
| A.1 | `tenant_id` matches subdomain prefix | `lux.*` ↔ `luxe-maurice` (named exception) | **PASS (named exception)** | `/api/tenant/site` and `/api/ui/context` both return `tenant_id:"luxe-maurice"` for hostname `lux.corpflowai.com`. The subdomain is `lux.` not `luxe-maurice.`; this is a named exception in `tenant_hostnames` (per `docs/operations/TENANT_CLIENT_LOGIN.md`). |
| A.2 | `tenant_hostnames` row exists for canonical hostname | YES | **PASS** | Inferred from successful tenant resolution at the live API; row contents not inspected anonymously. |
| A.3 | DNS for canonical hostname points to Vercel | YES | **PASS** | `nslookup lux.corpflowai.com` returns `64.29.17.1` and `216.198.79.1` (Vercel anycast). No CNAME indirection visible from the client. |
| A.4 | TLS certificate served, valid, not expiring < 30 days | YES | **PASS** | Cert: `CN=*.corpflowai.com`, issuer Let's Encrypt R12, NotBefore `2026-05-24 02:54:06`, NotAfter `2026-08-22 02:54:05` — **89 days** until expiry. Wildcard SAN covers `lux.corpflowai.com`. Cert was auto-renewed today. |
| A.5 | apex / `core.*` separation respected | apex does **not** serve this tenant; `core.*` is factory only | **PASS** | `https://corpflowai.com/lux` → 404 (apex does not route to tenant); `https://corpflowai.com/api/tenant/site` returns its own tenant resolution distinct from Lux. `core.corpflowai.com` is factory health/pulse only. |
| A.6 | Optional aliases listed in `tenant_hostnames` (if any) | matches docs | **OPERATOR-REQUIRED** | Cannot enumerate `tenant_hostnames` rows anonymously. Anton confirms by inspecting the table or factory admin surface. |

**Evidence:** anonymous `Invoke-WebRequest` against the URLs above; TLS handshake direct via TCP 443; `/api/tenant/site` JSON returning `host:"lux.corpflowai.com" tenant_id:"luxe-maurice"`.

## Section B — Login and tenant boundary

| # | Item | Expected | Result | Notes |
|---|------|----------|--------|-------|
| B.1 | `https://lux.corpflowai.com/login` returns 200 | YES | **PASS** | 200, 38,457 bytes. Title: `Login`. H1: `Log in to the change request area`. |
| B.2 | Login as a known tenant user works | YES | **OPERATOR-REQUIRED** | Agents do not run live logins per template footnote. Anton verifies during quarterly review. Last verified working on 2026-05-22 per chat_history.md (Phase A unblock). |
| B.3 | After login, `/api/auth/me` returns the correct `tenant_id` | YES | **OPERATOR-REQUIRED** | Tied to B.2. Anonymous `/api/ui/context` returns `tenant_id:"luxe-maurice"` correctly for the host, which is the upstream of `/api/auth/me`'s tenant resolution. |
| B.4 | Anonymous `/change` returns the tenant shell, not factory chrome | YES | **PASS with caveat** | `/change` returns 200 with 6,584 bytes — tenant-shell sized, not factory-sized (10× factory chrome would be larger). However the rendered HTML did not contain the tenant marketing branding tokens "luxurious"/"luxe" in a single-pass regex check; the tenant theme is applied via CSS variables / runtime data not text on this route. **Operator-required confirmation:** open `/change` in a browser session and confirm the tenant theme + `change_console_readiness` matches Lux. |
| B.5 | Password-reset flow available on `/login` | YES | **PASS** | `LOGIN_HAS_PASSWORD_RESET: True` — page contains "password reset" / "forgot password" copy. Implementation per `docs/n8n/password-reset-email-recipe.md`; live evidence on 2026-05-22 in chat_history.md (`password_reset_delivery_configured: true`). |
| B.6 | `MASTER_ADMIN_KEY` not required for any documented client task | YES | **PASS** | No documented client task requires factory master. Tenant operator surface is gated by `requireDormantGate` / tenant session per `lib/cmp/router.js`. |
| B.7 | No tenant data visible on the apex or `core.*` surfaces | YES | **PASS** | `https://corpflowai.com/api/tenant/site` returns a different tenant resolution (apex tenant); does not leak Lux data. `https://lux.corpflowai.com/admin` returns 404 — no admin surface exposed on the tenant marketing host. |

**Evidence:** anonymous probes; password-reset live evidence already in `artifacts/audits/2026-05-23-weekend/n8n-email.md`.

## Section C — Marketing surface and conversion

Cross-reference: **`artifacts/quality-audits/2026-05-23-luxe-maurice/quality-score.md`** (Packet 3.1, 2026-05-23).

| # | Item | Expected | Result | Notes |
|---|------|----------|--------|-------|
| C.1 | Quality audit total score | ≥ 75/100 | **44/100\*** | **FAIL** — drag is concentrated in §SEO (0/20). |
| C.2 | Conversion clarity sub-score | ≥ 14/20 | **18/20** | **PASS** — above-fold offer + buyer-intent CTA are excellent. |
| C.3 | Performance sub-score | ≥ 14/20 | **8/20\*** | **PARTIAL** — pending Lighthouse mobile. Cold full-fetch from auditor location 1094 ms / 36 KB. |
| C.4 | Accessibility sub-score | ≥ 14/20 | **6/20** | **FAIL** — no `lang` on `<html>`, no `<main>` landmark; structural items pending Lighthouse. |
| C.5 | SEO sub-score | ≥ 14/20 | **0/20** | **FAIL** — no `<meta name="description">`, no canonical, no OG/Twitter, `/sitemap.xml` 404, `/robots.txt` 404, `/favicon.ico` 404. |
| C.6 | Trust + governance sub-score | ≥ 14/20 | **12/20** | **PARTIAL** — TLS valid, HSTS present, but 404 page is generic Next.js `_error`, no `support@` mailto, no privacy link. |
| C.7 | Primary CTA describes buyer intent (not internal process) | YES | **PASS** | "Private concierge" / "Private enquiry" / "Request details" — buyer-intent throughout. |
| C.8 | No unsupported revenue or AI-magic claims | YES | **PASS** | Restrained: "exclusive luxury", "concierge", "developer-led". |

## Section D — Analytics, Search Console, indexing

Cross-reference: `docs/operations/ANALYTICS_SEARCH_CONSOLE_ROLLOUT_PLAN.md` §5 (Lux subdomain rollout) and the per-surface checklist `docs/execution/ANALYTICS_SEARCH_CONSOLE_INDEXING_CHECKLIST.md`.

| # | Item | Expected | Result | Notes |
|---|------|----------|--------|-------|
| D.1 | Analytics tool installed (Plausible/Fathom/Umami/GA4) | YES | **FAIL — not installed** | No analytics snippet present in the home HTML (no `plausible.io`, `fathom.cloud`, `googletagmanager`, `ga.js`, `gtag` markers). |
| D.2 | Live event observed since installation | YES | **N/A** | Blocked on D.1. |
| D.3 | Search Console verified for canonical host | YES | **OPERATOR-REQUIRED** | Cannot verify externally. Anton confirms in Search Console UI. Likely `FAIL` because D.4 (sitemap) is also failing. |
| D.4 | Sitemap submitted, status `Success` | YES | **FAIL** | `/sitemap.xml` returns 404 — the sitemap itself does not exist on the surface, so submission cannot have succeeded. |
| D.5 | `robots.txt` allows crawl on production routes, blocks `/change`, `/api/`, `/login`, `/admin*` | YES | **FAIL** | `/robots.txt` returns 404. There is no robots.txt at all, so neither allow nor block rules are in effect — crawlers fall back to defaults (everything crawlable, except `/api/` which Vercel may also expose). |
| D.6 | Top 5 URLs requested for indexing | YES | **N/A** | Blocked on D.3/D.4. |
| D.7 | No manual actions in Search Console | YES | **OPERATOR-REQUIRED** | Search Console UI only. |

## Section E — Off-laptop posture

| # | Item | Expected | Result | Notes |
|---|------|----------|--------|-------|
| E.1 | All recurring jobs for this client run server-side | YES | **PASS with one caveat** | Factory control loop now runs from GitHub Actions per Packet 2.2 (PR #217). Lux-specific recurring jobs: none documented. **Caveat:** the daily control-loop run currently fails on the `CORPFLOW_FACTORY_HEALTH_URL` secret value (recorded in `chat_history.md` 2026-05-24 entry). Operator-only fix — does not affect Lux marketing serving, but means the off-laptop drift monitor is not yet trustworthy until the secret is corrected. |
| E.2 | No script in `scripts/` is required for the client's day-to-day operation | YES | **PASS** | The Lux smoke harness `scripts/smoke-change-overflow.mjs` is operator-on-demand only (per `docs/runbooks/CHANGE_CONSOLE_INSPECTION.md`); not a daily client task. |
| E.3 | Operational documentation (login, password reset, where to file changes) is in repo, not in chat | YES | **PASS** | Login: `docs/operations/TENANT_CLIENT_LOGIN.md`. Password reset: `docs/n8n/password-reset-email-recipe.md`. Changes: `docs/runbooks/CHANGE_CONSOLE_INSPECTION.md`. |
| E.4 | Client-facing email events follow Communications v1 | YES | **PARTIAL** | `password_reset` is the only live event and it follows Communications v1. Other client-facing events (estimate ready, ticket closed) are not live yet — design exists, runtime not implemented. Acceptable per Phase 1 of `docs/communications/CORPFLOW_COMMUNICATIONS_V1.md`. |
| E.5 | Backups / DR posture for this tenant's data documented | YES | **PARTIAL** | Provider is documented (`docs/operations/POSTGRES_PROVIDER.md` — Neon, with naming-hazard warning). Tenant-level backup/DR runbook does not exist yet (Neon's branching/PITR is the upstream tool but it's not yet wired into a CorpFlow runbook). Candidate follow-up packet. |

## Section F — Risk and follow-up

### High-impact items that failed (each = candidate fix packet)

1. **Lux SEO surface absent** (D.4, D.5, C.5). `/robots.txt` and `/sitemap.xml` return 404; no per-route description meta; no canonical; no OG/Twitter cards. **Fix packet:** the Lux SEO fix PR already drafted in this cycle; merge is Anton's gate (production deploy of Lux). **Crosses §3 gate:** production deploy.
2. **Lux marketing 404 page is generic Next.js error** (C.6, Trust §2.5 row 4). **Fix packet:** add a `pages/404.js` (or tenant-aware variant) that renders the Lux header + a "Back to properties" CTA. Bundles cleanly with packet 1. **Crosses §3 gate:** production deploy.
3. **`<html lang>` missing + no `<main>` landmark + viewport `initial-scale=1` missing** (C.4). **Fix packet:** same SEO-fix PR; trivial diff. **Crosses §3 gate:** production deploy.
4. **Lux analytics not installed** (D.1). **Fix packet:** Packet 5.1 §4.3 — separate runtime PR for the snippet, after Anton picks the analytics provider in §4.1. **Crosses §3 gates:** analytics provider decision (cookie-consent surface), runtime deploy.
5. **Search Console verification missing for `lux.corpflowai.com`** (D.3). **Fix packet:** §5 of the rollout plan — Anton-only DNS TXT add. **Crosses §3 gate:** DNS change.
6. **Privacy notice + publishable contact alias missing** (C.6, Trust §2.5 rows 2 + 3 + 6). **Fix packet:** add `/privacy` page (placeholder copy is acceptable for v1) and a `concierge@…` mailto in the footer. Can ride with the SEO-fix PR or separate. **Crosses §3 gate:** production deploy.
7. **`CORPFLOW_FACTORY_HEALTH_URL` secret value misconfigured** (E.1 caveat). **Fix:** secret-value change in GitHub repo settings. **Crosses §3 gate:** secret change.

### Low-impact items

- Tenant-level backup/DR runbook (E.5). Defer to a later Packet under Goal 2.
- Tenant-level analytics goals defined (D.4 of rollout plan). Will be defined when D.1 lands.

### Open questions for Anton

- A.6: are there any active Lux aliases beyond `lux.corpflowai.com`? (e.g. `luxe.corpflowai.com`, custom domain).
- B.4: is the live `/change` rendering the tenant theme correctly? (auditor saw tenant-shell-sized HTML but no in-text branding markers).
- D.3: is the Search Console property already created and verified, or pending?
- E.5: any client-side request from Luxe team for explicit backup/DR documentation?

## Verdict

**PARTIAL** — A and B sections pass (with two operator-required confirmations); C **FAILs** on the total threshold (44/100\* < 75); D **FAILs** on installation and verification of analytics + Search Console; E mostly **PASSes** with two PARTIALs. Client-facing usage continues without disruption — every floor URL the audit hit returns 200, login + password reset are operational, the conversion path itself is doctrine-compliant. The gaps are all on **discoverability, monitoring, and operational backstop**, not on whether buyers can reach and convert today.

Per `delivery-reality.mdc`: this PARTIAL is the audit's verdict on the **state**, not on a specific change shipping or not. No prior fix packet is invalidated by this audit.

## Top three follow-up packets (recommended order)

1. **Lux SEO fix packet** (this cycle's drafting work) — bundles items F.1, F.2, F.3, F.6. Single runtime PR. Estimated lift on Quality score: 44 → ~70/100\*. Anton merge gate.
2. **`CORPFLOW_FACTORY_HEALTH_URL` secret fix** (item F.7) — operator-only secret-value change. 5 min. Closes the false-failure on the new daily control loop and unblocks live drift monitoring.
3. **Search Console verification + first indexing requests** (items F.4-pre-req) — Anton-only DNS TXT + Search Console UI. Does not need the SEO PR to land first, but pairs naturally with it.

## Cross-references

- Quality audit: `artifacts/quality-audits/2026-05-23-luxe-maurice/quality-score.md`.
- Live floor checks (post-#220): `chat_history.md` 2026-05-24 entry.
- Tenant routing canonical: `docs/operations/TENANT_CLIENT_LOGIN.md`.
- Postgres provider: `docs/operations/POSTGRES_PROVIDER.md`.
- Off-laptop posture: `docs/operations/FACTORY_CONTROL_LOOP.md`.
