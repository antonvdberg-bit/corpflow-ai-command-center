# LUX LIVE VERIFICATION COMPLETE — Issue #693

**Environment:** `corpflow_test` only (`https://lux.corpflowai.com`) — **not** client_production.  
**Source issue:** [#693](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/693)  
**Merged PRs under test:** [#682](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/682), [#692](https://github.com/antonvdberg-bit/corpflow-ai-command-center/pull/692)  
**Verified at (UTC):** 2026-07-30T03:02Z–03:04Z  
**Agent:** Cursor cloud `bc-56c800d1-7c1e-4a4c-b402-3cd0e27d545c`  
**Branch:** `cursor/dispatcher-issue-693-429a`

---

## Production identification

| Field | Value |
|-------|-------|
| Commit on Production | `be5fa95ea0e4245f18c0493fd26b3118844498f0` |
| Includes #682 (`d0f6d94e…`) | **YES** (git ancestor of tip) |
| Includes #692 (`be5fa95e…`) | **YES** (Production tip = #692 merge) |
| GitHub Production deployment ID | `5668253349` |
| Deployment state | `success` (2026-07-30T02:48:30Z) |
| Vercel environment URL | `https://corpflow-ai-command-center-5nfrzeluw-corpflowai.vercel.app` |
| Next.js `buildId` on lux `/change` | `Z8qWgEzWaS2HY7bcyUdmd` |
| Client-facing host verified | `https://lux.corpflowai.com` |

> Note: Vercel `dpl_…` ID was not available via GitHub Deployments API without a Vercel token. GitHub Production deployment `5668253349` + commit SHA + environment URL uniquely identify the Ready Production build.

---

## URLs tested

| URL | HTTP | Result |
|-----|------|--------|
| `https://lux.corpflowai.com/` | 200 | Lux Rare & Exclusive home |
| `https://lux.corpflowai.com/concierge` | 200 | Private advisory + form |
| `https://lux.corpflowai.com/properties` | 200 | Private Opportunities |
| `https://lux.corpflowai.com/about` | 200 | About |
| `https://lux.corpflowai.com/contact` | 200 | Contact |
| `https://lux.corpflowai.com/change` | 200 | Change Console shell; login required for CRM |
| `https://lux.corpflowai.com/api/tenant/site` | 200 | `tenant_id=luxe-maurice` |
| `https://lux.corpflowai.com/api/cmp/router?action=concierge-lead-create` | 200/400 | Valid create + validation (see below) |
| `https://lux.corpflowai.com/api/cmp/router?action=concierge-leads-list` | 403 | Session required (unauth) |
| `https://lux.corpflowai.com/api/cmp/router?action=concierge-lead-operator-patch` | 403 | Session required (unauth) |
| `https://core.corpflowai.com/api/factory/health` | 200 | `ok: true` |
| `https://core.corpflowai.com/api/cmp/router?action=concierge-leads-list` | 404 | `TENANT_NOT_FOUND` |
| `https://cipc.corpflowai.com/api/tenant/site` | 200 | `tenant_id=cipc-desk` (unchanged) |

---

## Pass/fail by requirement

| # | Requirement | Verdict | Evidence |
|---|-------------|---------|----------|
| 1 | Live deployed commit contains #682 and #692 | **PASS** | Production deployment `5668253349` → SHA `be5fa95e…`; #682 is ancestor |
| 2 | Public routes load; browser titles correct | **PASS** | Titles below; screenshots `01`–`05` |
| 3a | Valid email + telephone → success + Lux queue | **PASS** | Lead `cms6xh28y0000l204xahcu9o8` created `status=new` |
| 3b | Missing email or telephone → clear validation | **PASS** | API `400 EMAIL_AND_TELEPHONE_REQUIRED`; UI submit disabled without telephone (`07`) |
| 4a | Lead appears with source, email, telephone, created, stage, next action | **BLOCKED (auth)** | Unauth `/change` shows login wall; CRM list 403 without session |
| 4b | Stage progression `new → contacted → qualified → invited → closed` | **BLOCKED (auth)** / unit **PASS** | `node-tests` #673/#685 (14/14 pass); live CRM needs Lux session |
| 4c | Operator notes save + persist after refresh | **BLOCKED (auth)** | Same |
| 4d | Private-client qualification save + reopen | **BLOCKED (auth)** / unit **PASS** | #685 qualification tests pass |
| 4e | Missing-field flags + recommended next action | **BLOCKED (auth)** / unit **PASS** | #685 flag/recommend tests pass |
| 4f | Residence shortlist association | **BLOCKED (auth)** / unit **PASS** | #685 shortlist tests pass |
| 4g | Copy-ready invitation/shortlist draft renders | **BLOCKED (auth)** / unit **PASS** | Draft builder covered in unit tests |
| 4h | No live send action enabled | **PASS (code + unit)** | UI copy `Send disabled — operator copy only`; unit asserts string; no send runtime exercised |
| 5 | Tenant isolation; no Core/other-tenant regression | **PASS** | Lux CRM gated; Core health OK; CIPC remains `cipc-desk`; Core leads-list `TENANT_NOT_FOUND` |
| 6 | Screenshots / structured runtime evidence | **PASS** | This packet + `screenshots/` + `runtime-evidence.json` |

### Browser titles (live, Playwright)

| Route | Title |
|-------|-------|
| `/` | Rare & Exclusive Collection · Private Wealth & Lifestyle Platform for Mauritius |
| `/concierge` | Private advisory · Rare & Exclusive Collection |
| `/properties` | Private Opportunities · Rare & Exclusive Collection |
| `/about` | About · Rare & Exclusive Collection |
| `/contact` | Contact · Rare & Exclusive Collection |

No monogram SVG title hijack (defect repaired in #682) observed.

---

## Synthetic lead IDs

| Lead ID | Purpose | Host | Result |
|---------|---------|------|--------|
| `cms6xh28y0000l204xahcu9o8` | Valid email + telephone (#693) | `lux.corpflowai.com` | `200` / `status=new` / `2026-07-30T03:02:15.970Z` |
| _(none — rejected)_ | Missing telephone | `lux.corpflowai.com` | `400 EMAIL_AND_TELEPHONE_REQUIRED` |
| _(none — rejected)_ | Empty contact | `lux.corpflowai.com` | `400 contact is required` |

Synthetic contact shape only: `*.example.invalid` / `+23057000099`. No real client data.

**Incidental probes (not for Jan):** apex/core host creates also returned 200 because `concierge-lead-create` defaults `tenantId` to `luxe-maurice` when host context is empty (`lib/cmp/router.js`). Pre-existing behaviour; not a #682/#692 regression. Operator CRM list/patch remain gated to Lux host + session.

---

## Screenshots / evidence links (in-repo)

Path prefix: `artifacts/lux-693-live-verification/`

| File | Step |
|------|------|
| `screenshots/01-home.png` | Homepage composition + brand |
| `screenshots/02-concierge.png` | Concierge / private advisory |
| `screenshots/03-properties.png` | Properties |
| `screenshots/04-about.png` | About |
| `screenshots/05-contact.png` | Contact |
| `screenshots/06-change-unauth.png` | `/change` login wall (CRM not exposed unauth) |
| `screenshots/07-concierge-missing-phone.png` | Missing telephone — submit disabled |
| `screenshots/08-concierge-valid-ready.png` | Valid email+telephone — submit enabled |
| `runtime-evidence.json` | Structured API + deploy evidence |
| `screenshot-index.json` | Screenshot metadata |

Unit evidence: `node --test node-tests/lux-lead-qualification-shortlist-685.test.mjs node-tests/lux-concierge-operator-workflow-673.test.mjs` → **14/14 pass**.

---

## Defects found and repair PR

| Defect | Severity | Action |
|--------|----------|--------|
| None on public routes / titles / validation / Core health | — | No repair PR required |
| Authenticated CRM E2E not executable in this agent (no Lux tenant session credentials in environment) | Process / access | **Not a code defect.** Owner: Anton. Smallest action: complete Jan 5-minute sequence below while logged into Lux `/change`, or provide a short-lived Lux tenant session to re-run agent CRM checks |

---

## Exact Jan test URL + 5-minute client test sequence

**Primary URL:** https://lux.corpflowai.com/change  
**Public form:** https://lux.corpflowai.com/concierge  
**Canonical package:** `docs/LUX/JAN_TEST_PACKAGE_685.md`

### 5-minute sequence (synthetic data only)

1. Open https://lux.corpflowai.com/concierge — confirm tab title is *Private advisory · Rare & Exclusive Collection*.  
2. Submit with **both** email and telephone (fictional). Confirm success / next-step message.  
3. Retry without telephone — confirm submit blocked / clear validation.  
4. Log into https://lux.corpflowai.com/change → open **LEADS · LuxeMaurice CRM**.  
5. Find the synthetic lead — check email, telephone, source, stage, next action, created time.  
6. Move stage `New → Contacted → Qualified → Invited → Closed`; add an internal note; refresh — note persists.  
7. Fill **Private-client qualification**; confirm Missing flags / Recommended next; Save; reopen.  
8. **Curated shortlist** — tick 1–2 residences; Copy draft text; confirm **Send disabled** (nothing sent).

Reply with pass/fail for slices A / B / C (table in Jan package).

---

## Auth blocker (exact)

```text
BLOCKER: Authenticated Lux /change CRM walkthrough
Evidence:
  - GET https://lux.corpflowai.com/api/auth/me → {"ok":true,"logged_in":false}
  - GET concierge-leads-list (lux) → 403 Dormant Gate: session token required
  - POST concierge-lead-operator-patch (unauth) → 403 Dormant Gate
  - Screenshot 06-change-unauth.png → Login required; leads not listed
  - Cloud agent env has no Lux tenant session / password credentials (names checked; none present)
Owner: Anton
Smallest action: Log into lux.corpflowai.com/change (or hand Jan the session) and run the 5-minute sequence above on lead cms6xh28y0000l204xahcu9o8 (or a fresh synthetic enquiry). No code/deploy/env change required for this blocker.
```

---

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: N/A (verification-only; no runtime repair)
- Merged to main: YES (#682 d0f6d94e, #692 be5fa95e)
- Production deployment ID: 5668253349 (GitHub Production; env URL …-5nfrzeluw-…)
- Commit deployed: be5fa95ea0e4245f18c0493fd26b3118844498f0
- Live URLs tested: lux.corpflowai.com /, /concierge, /properties, /about, /contact, /change, concierge-lead-create, concierge-leads-list, concierge-lead-operator-patch, /api/tenant/site; core.corpflowai.com/api/factory/health; cipc.corpflowai.com/api/tenant/site
- Expected vs actual result: Public surface + titles + validation + deploy ancestry match intent; authenticated CRM E2E deferred to Lux session holder (Jan/Anton)
- Client-facing flow usable: YES for public concierge path; CRM usable after Lux login (gates verified)
- Final verdict: PARTIAL (ops) — public + deploy COMPLETE; authenticated CRM walkthrough pending session holder
```

---

## Final verdict

**READY FOR JAN**

Public routes, titles (#682), concierge email+telephone gate, synthetic lead intake, tenant CRM gates, and Core/CIPC isolation are live on Production `be5fa95e`. Authenticated CRM clicks (stages, notes, qualification, shortlist, copy draft) are the Jan 5-minute sequence — agent could not log in. No code defect found; no repair PR.

---

## Explicit non-actions

- No merge by this agent  
- No production deploy by this agent  
- No env/secrets, DB/schema, payment, or live email/WhatsApp/SMS  
- No client outreach / no send of Jan draft email  
- No client_production work  
