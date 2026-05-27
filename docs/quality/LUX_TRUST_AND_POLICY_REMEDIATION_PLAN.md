# Lux trust + policy surfaces — remediation plan (design-only v1)

**Status:** v1 design (2026-05-27). **No runtime code yet.** This document is the bounded design that a future implementation packet will execute under approval.

**Audience:** Cursor (implements once approved), Anton (legal-content owner + production-deploy approver).

**Companion docs (read first):**

- `artifacts/quality-audits/2026-05-27-luxe-maurice-quality-v1.md` § 2.6 + fix #5 / fix #6 — the source of this plan.
- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` § 3.6 *Trust architecture* + § 3.9 *Content completeness* — the dimensions this plan moves.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — buyer-trust + clarity-beats-decoration doctrine.
- `docs/operations/TENANT_CLIENT_LOGIN.md` — tenancy model + host derivation.
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` § *Trustworthy* — trust outcomes definition.
- `pages/privacy.js`, `pages/terms.js`, `pages/about.js`, `pages/contact.js`, `pages/refund-policy.js` (apex sources of truth today).
- `pages/sitemap.xml.js` (host-aware sitemap generator).

---

## 1. The problem (one paragraph)

The 2026-05-27 v1 Lux quality audit (§ 2.6) confirmed via direct probes that `lux.corpflowai.com/privacy`, `/terms`, `/about`, `/contact`, and `/refund-policy` all return **HTTP 200** with bodies **byte-equal to the apex variants** (e.g. `lux/privacy` and `corpflowai.com/privacy` both serve **6,196 bytes**; `lux/terms` and `corpflowai.com/terms` both serve **7,175 bytes**). The Next.js app routes these top-level pages **host-agnostically** — a Lux visitor reaches a working `/privacy` URL, but the page they see is CorpFlowAI's privacy policy and contact details, not a Lux-tenant-appropriate version.

This is a **trust defect**, not a routing defect. A high-net-worth Lux buyer who clicks "Privacy" in the footer expects a Lux-branded document. A CorpFlowAI-branded document at that URL erodes trust — the buyer perceives Lux as a CorpFlowAI white-label rather than a coherent independent brand.

---

## 2. Why this is a design-only doc (not a fix PR)

Three reasons this packet stops at design:

1. **Legal content cannot be authored by Cursor.** Privacy policy, terms of service, and refund policy are legal documents. Anton (or counsel) owns the copy. Cursor wires routing + Head + footer, but the words inside must be approved.
2. **Multiple implementation paths have different long-term costs.** Section 4 below names three options with different trade-offs in code complexity, future-tenant scalability, and SEO. A design pass that picks one *before* writing code avoids re-doing the wiring twice.
3. **The §3 hard gate in `CORPFLOW_AUTONOMOUS_ACTIONS_POLICY.md`** — auth/identity logic is host-derived. Modifications to per-host page rendering brush against tenancy boundaries. Cursor designs; Anton approves; Cursor implements under approved scope.

---

## 3. Required Lux-native surfaces

Per the audit's fix #5 + fix #6, the five routes that must serve Lux-branded content when the request hostname is `lux.corpflowai.com`:

| Route | Today (lux.*) | Required state | Audit § ref | Quality dim impact |
|---|---|---|---|---|
| `/privacy` | Apex content | Lux-branded privacy policy (operator + tenant info section names Lux specifics; data-handling clauses identical or scoped) | §3.6 +1.5 | §3.6 *Trust architecture* |
| `/terms` | Apex content | Lux-branded terms of service (entity name, jurisdiction, scope of service: concierge offer) | §3.6 +1.5 | §3.6 *Trust architecture* |
| `/about` | Apex content (CorpFlowAI's about) | Lux-branded about page: who runs Lux, operational credentials, "Operated by CorpFlowAI" footer disclosure | §3.6 +1, §3.9 +1 | §3.6 + §3.9 *Content completeness* |
| `/contact` | Apex content (CorpFlowAI contact info) | Lux-branded contact page surfacing the publishable Lux alias (`concierge@luxemaurice.com` or equivalent — operator-owned) | §3.6 +1.5 | §3.6 |
| `/refund-policy` | Apex content (CorpFlowAI refund policy) | Either a Lux-specific refund policy reflecting concierge offer terms, OR an explicit `404 / not applicable to Lux services` if no refund applies | §3.9 +0.5 | §3.9 |

**Total expected score swing: +5 to +6 points on the next Lux audit** (compatible with audit § 9 *Lux ceiling once measurements land*).

---

## 4. Implementation options (three; recommended is Option A)

### Option A — Tenant-host-aware rendering in the existing pages (RECOMMENDED)

**Shape:** keep `pages/privacy.js`, `pages/terms.js`, `pages/about.js`, `pages/contact.js`, `pages/refund-policy.js` as the single route source per page. Read the **request hostname** via `getServerSideProps` (or `getStaticProps` with `getStaticPaths` host fallback), look up the tenant content from a per-tenant content map (`config/tenant-policies/<tenant_slug>.json` or equivalent), and render the matched variant. Falls back to the apex variant when no match.

**Pros:**

- One route per page; one place to edit Head, footer, layout chrome.
- New tenants need only a JSON file added under `config/tenant-policies/`; no new routes.
- SEO: canonical resolves cleanly to `https://lux.corpflowai.com/privacy` (host-aware canonical from `req.headers.host`).
- Sitemap generation in `pages/sitemap.xml.js` stays host-aware (already is) — the Lux sitemap can list these pages explicitly once the variant exists.
- Cursor can implement the routing layer; Anton (or counsel) provides the content JSON files.

**Cons:**

- Renders policy text from data, which must be reviewed for completeness against the legal model used (e.g. data-controller language). Mitigated by structuring the JSON to mirror the apex page sections, so the legal model stays identical and only operator-name + scope-of-service text varies.
- Misconfigured tenancy (wrong host header → wrong tenant content) would leak the wrong policy. Mitigated by deriving tenant from `tenant_hostnames` (existing tenancy table) rather than from request headers alone — re-using the existing tenancy boundary instead of inventing a new one.

**Files touched (preview, not exhaustive):**

- `pages/privacy.js`, `pages/terms.js`, `pages/about.js`, `pages/contact.js`, `pages/refund-policy.js` — add `getServerSideProps` reading host, dispatch to content variant, set host-aware canonical.
- `config/tenant-policies/luxe-maurice.json` (new) — Lux policy text in structured form.
- `lib/cmp/_lib/tenant-content-resolver.js` (new, naming TBD) — host-to-tenant resolver consuming `tenant_hostnames`.
- `pages/sitemap.xml.js` — extend Lux branch to list the 5 policy pages explicitly.
- Tests under `tests/policy-pages.test.mjs` — verify host-aware dispatch.

### Option B — Dedicated `pages/lux-*.js` routes mounted via host-based middleware

**Shape:** add `pages/lux-privacy.js`, `pages/lux-terms.js`, etc. Use `middleware.js` (Next.js edge middleware) to rewrite `/privacy` → `/lux-privacy` when the request hostname is `lux.corpflowai.com`. The apex `/privacy` route continues to serve apex content via the original `pages/privacy.js`.

**Pros:**

- Cleanest separation: per-tenant pages are physically separate files, easier for non-Cursor humans to edit.
- No content JSON layer; markup + copy live together in JSX.

**Cons:**

- N tenants × M policy pages → N×M files. Does not scale beyond 2-3 tenants.
- Middleware rewrites add a host-resolution layer on every request to those paths.
- Sitemap generation must know about the rewrite, otherwise `lux.corpflowai.com/sitemap.xml` would list `/privacy` while the rendered content lives at `/lux-privacy` — confusing for Google.

**When this would be the right call:** if the Lux content is so divergent from the apex content that sharing structure makes no sense (e.g. an entirely different product offering, different legal model).

### Option C — CMS/data-driven per-tenant content (deferred)

**Shape:** policy text is stored in a CMS or a DB table (`tenant_content`). Pages read content by `(tenant_id, page_slug)` and render. CMS UI lets Anton (or a delegate) edit without a PR.

**Pros:**

- Editor flow without code changes.
- Scales to many tenants and many content pages.

**Cons:**

- New schema (`tenant_content` table or external CMS dependency) and new editor UI surface.
- Larger PR surface for a v1.
- v1 doesn't have a CMS dependency; introducing one for this single use case is the wrong order of operations.

**Verdict on C:** deferred to v2 (when CMS demand grows beyond legal pages). The Option A JSON files are an intentional transition step that a future CMS adapter can swap behind the same `tenant-content-resolver.js` interface.

### Recommendation

**Adopt Option A.** Implementation packet `lux-trust-policy-impl-v1` (proposed name) ships in three sub-PRs:

1. **PR α — resolver + tests.** Adds `lib/cmp/_lib/tenant-content-resolver.js` + per-tenant JSON loader + unit tests. No page edits yet.
2. **PR β — page rewrites.** Modifies the 5 policy pages to use the resolver, sets host-aware canonical, adds tests verifying apex still serves apex content.
3. **PR γ — Lux JSON files + sitemap update.** Adds `config/tenant-policies/luxe-maurice.json` with Anton-approved content; updates `pages/sitemap.xml.js` Lux branch.

---

## 5. SEO implications

### 5.1 Canonical and host

Each variant must emit a **host-aware canonical**:

- `https://lux.corpflowai.com/privacy` → `<link rel="canonical" href="https://lux.corpflowai.com/privacy">`.
- `https://corpflowai.com/privacy` → `<link rel="canonical" href="https://corpflowai.com/privacy">`.

Both are simultaneously canonical for *their host*. Google treats them as separate URLs on separate properties.

### 5.2 Duplicate content risk

If the Lux JSON simply re-paraphrases the apex policy, Google may detect duplicate-content overlap across `lux.*` and apex. Mitigation: the Lux JSON should differ where the brand differs (entity name, contact alias, service description) while preserving the legal-clause structure. The structural overlap is acceptable; the brand-identifying surface text should be distinct.

### 5.3 Sitemap listing

`pages/sitemap.xml.js` Lux branch should list the 5 policy pages once they have Lux-branded content. Pre-content shipping, leave them out of the sitemap (they currently are not in the Lux sitemap, per the 2026-05-27 audit). After PR γ, add them with `<priority>0.3</priority>` (legal-page convention, never homepage-level priority).

### 5.4 Lux Search Console (deferred)

`docs/operations/SEARCH_CONSOLE_EXECUTION_PACKET.md` intentionally defers Lux Search Console verification to a future packet (post-apex-complete). When Lux Search Console comes online, the 5 Lux-branded policy pages should be indexed alongside `/`, `/concierge`, and the property pages.

---

## 6. Trust-score implications (v1 quality system §3.6)

Per `CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` § 3.6, the rows credited by this work:

| Row | Today (Lux) | After PR α + β + γ | Notes |
|---|---|---|---|
| Privacy policy reachable from footer at a working tenant-appropriate route | 0 | 1 | Path exists today (audit § 2.6); content alignment is the missing piece. |
| Terms of service reachable | 0 | 1 | Same. |
| Operated-by ownership statement (footer) | 0 | 1 | Audit fix #7. Lives in `pages/about.js` or footer chrome; one-line copy from doctrine. |
| Publishable contact alias on `/contact` (concierge@…) | 0 | 1 | Anton sets the alias; Cursor wires the footer + `/contact` page. |
| Refund / cancellation policy reachable (or explicit not-applicable) | 0 | 0.5 | Score awarded for explicit declaration either way. |

**Expected §3.6 swing: +4.5 points** (from current 7/10 → projected 10/10 once also coupled with fix #7 and fix #8 from the audit).

The §3.9 *Content completeness* dimension also gains the "Policy routes mounted with tenant-appropriate content" row — projected **+1.5 points**.

**Combined expected Lux score swing: +5.5 to +6 points**, consistent with the audit § 9 estimate.

---

## 7. Rollout order (PR α → PR β → PR γ)

This sequence ensures every PR is independently revertable without breaking the apex.

### PR α — resolver + tests (Cursor-owned, Anton approves merge)

- New file `lib/cmp/_lib/tenant-content-resolver.js`.
- New file `config/tenant-policies/_template.json` (empty template + JSON schema).
- New tests under `tests/tenant-content-resolver.test.mjs`.
- No `pages/*.js` change.
- Apex pages unaffected.
- Build + test gates: `npm test`, `npm run build`.

### PR β — host-aware rendering wired into the 5 pages

- Modifies `pages/privacy.js`, `pages/terms.js`, `pages/about.js`, `pages/contact.js`, `pages/refund-policy.js` to consume the resolver.
- When no tenant content match → falls back to apex content (today's behaviour). This makes PR β a no-op for the Lux host until PR γ ships the JSON.
- Adds host-aware `<link rel="canonical">`.
- Tests: verify apex content path still resolves; verify the fallback behavior.

### PR γ — Lux content + sitemap update

- `config/tenant-policies/luxe-maurice.json` with Anton-approved (or counsel-approved) text.
- `pages/sitemap.xml.js` Lux branch adds the 5 routes.
- Smoke test on Lux preview deployment per `.cursor/rules/predeploy-decision-checks.mdc` § *Lux `/change` UI / layout work*-style discipline (mandatory live verification, this time on `/privacy`, `/terms`, etc., not on `/change`).
- Live production verification per `delivery-reality.mdc` § *Live production surface checks*.

---

## 8. Migration risks

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Wrong tenant content leaks to apex | Low | High (legal exposure) | PR β tests assert apex host always serves apex content. PR γ ships only after PR β tests are green and Anton merges. |
| `tenant_hostnames` lookup fails on edge (cold function) | Low | Medium (page renders apex fallback for Lux visitors) | Resolver caches host→tenant map (in-process); cache miss falls back to apex content (safer default). Audit logs the cache-miss. |
| Sitemap referencing tenant content before content ships | Low | Low (Google sees a 200 with apex content, slightly off-brand but not broken) | Order: PR β → PR γ → sitemap edit; sitemap edit is in PR γ itself, gated on JSON file existing. |
| Duplicate-content SEO penalty across apex + Lux | Low | Low (legal pages rarely rank competitively) | §5.2 mitigation. Monitor `corpflow_search_visibility_apex` and `lux_search_visibility` in Search Console reports separately. |
| Counsel-flagged language in JSON content | Medium | High | Anton routes the JSON content through counsel review before PR γ. Cursor does not author legal text. |

---

## 9. What gets done (Definition of Done for the implementation packet that follows)

When `lux-trust-policy-impl-v1` ships (PR α + β + γ all merged + Lux production live-verified):

- [ ] Resolver + tests in PR α merged.
- [ ] Host-aware rendering in PR β merged; apex unaffected.
- [ ] `luxe-maurice.json` shipped in PR γ with Anton-approved content for all 5 pages.
- [ ] `lux.corpflowai.com/privacy`, `/terms`, `/about`, `/contact`, `/refund-policy` all return Lux-branded content (byte-different from apex).
- [ ] Apex pages unchanged (byte-equal to pre-PR-β).
- [ ] Lux sitemap updated to list the 5 policy pages.
- [ ] Lux audit re-run via `corpflow-exec-01` shows §3.6 + §3.9 rows credited.
- [ ] Delivery Reality Audit recorded per `.cursor/rules/delivery-reality.mdc`.

---

## 10. Out of scope (named explicitly)

These are explicitly **not** part of this remediation plan and are tracked elsewhere:

- Concierge page Head fix (audit fix #2; separate packet candidate).
- Dead `vercel.json` static rewrites cleanup (audit fix #3; separate packet candidate).
- Telegram alert wiring (audit fix #4; packet `telegram-alert-wiring`).
- `og:image` canonical 1200×630 (audit fix #8; tied to operator-supplied image asset).
- Lighthouse mobile run (audit fix #1; operator browser session).
- Lux favicon (audit item #10; cosmetic).

When this remediation plan ships, the Lux audit's items #5 (Lux-branded policy pages), #6 (publishable contact alias), #7 (operated-by statement), and #9 (`/about` on Lux) are closed.

---

## 11. Cross-references

- `artifacts/quality-audits/2026-05-27-luxe-maurice-quality-v1.md` — origin of fixes #5–#9.
- `docs/quality/CORPFLOW_WEBSITE_QUALITY_SYSTEM_V1.md` — § 3.6 + § 3.9 rubric.
- `docs/marketing/BRAND_AND_CONVERSION_DOCTRINE.md` — brand coherence + trust principles.
- `docs/operations/TENANT_CLIENT_LOGIN.md` — `tenant_hostnames` is the host-to-tenant source of truth.
- `docs/strategy/PRODUCTION_GRADE_CLIENT_OUTCOMES.md` — production-grade *Trustworthy* outcome definition.
- `pages/privacy.js`, `pages/terms.js`, `pages/about.js`, `pages/contact.js`, `pages/refund-policy.js`, `pages/sitemap.xml.js` — runtime sources of truth.
- `.cursor/rules/predeploy-decision-checks.mdc` — live verification floor for the implementation packet.
- `.cursor/rules/delivery-reality.mdc` — Delivery Reality Audit format for the implementation packet.

---

*Design-only as of 2026-05-27. No code change in this PR. Implementation packet `lux-trust-policy-impl-v1` will be opened separately under Anton's approval.*
