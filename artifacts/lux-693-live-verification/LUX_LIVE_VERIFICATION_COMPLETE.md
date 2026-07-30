# LUX LIVE VERIFICATION COMPLETE

**Issue:** [#693](https://github.com/antonvdberg-bit/corpflow-ai-command-center/issues/693)  
**Environment:** `corpflow_test` only (`https://lux.corpflowai.com`) — **not** client_production  
**Verified at (UTC):** 2026-07-30 ~03:02–03:30  
**Branch / repair PR:** `cursor/dispatcher-issue-693-32b4`  
**Agent run:** https://cursor.com/agents/bc-4f433ea1-051f-4ef5-9063-dad0bc46e7df  

Synthetic data only. No secrets. No live email / WhatsApp / SMS. No client outreach.

---

## Production identification

| Field | Value |
|-------|-------|
| Deployed commit SHA | `be5fa95ea0e4245f18c0493fd26b3118844498f0` |
| Includes merged #682 | **YES** (`d0f6d94e265724f3212d9e600e59ce598fce07f0` ancestor of Production tip) |
| Includes merged #692 | **YES** (Production tip = #692 merge commit) |
| GitHub Production deployment ID | `5668253349` |
| Deployment state | `success` (2026-07-30T02:48:30Z) |
| Vercel status target | https://vercel.com/corpflowai/corpflow-ai-command-center/ADvid2kfrXann36aQ5zGBCNNfCJV |
| Vercel environment URL | `https://corpflow-ai-command-center-5nfrzeluw-corpflowai.vercel.app` |
| Client-facing host | `https://lux.corpflowai.com` |

---

## URLs tested

| URL | HTTP | Result |
|-----|------|--------|
| https://lux.corpflowai.com/ | 200 | Homepage; private-curator positioning; monogram present |
| https://lux.corpflowai.com/concierge | 200 | Email + Telephone fields present |
| https://lux.corpflowai.com/properties | 200 | Private Opportunities framing; no portal/agency terms |
| https://lux.corpflowai.com/about | 200 | OK |
| https://lux.corpflowai.com/contact | 200 | OK |
| https://lux.corpflowai.com/property/lm-nc-ridge | 200 | Residence detail OK |
| https://lux.corpflowai.com/change | 200 | Shell loads; **login required** for leads CRM |
| https://core.corpflowai.com/api/factory/health | 200 | `ok: true` |

---

## Browser titles (live HTML)

| Route | Title | Monogram hijack |
|-------|-------|-----------------|
| `/` | Rare & Exclusive Collection · Private Wealth & Lifestyle Platform for Mauritius | No |
| `/concierge` | Private advisory · Rare & Exclusive Collection | No |
| `/properties` | Private Opportunities · Rare & Exclusive Collection | No |
| `/about` | About · Rare & Exclusive Collection | No |
| `/contact` | Contact · Rare & Exclusive Collection | No |
| `/property/lm-nc-ridge` | North Coast Ridge Residences · Private Opportunity · Rare & Exclusive Collection | No |
| `/change` | SSR title empty (client chrome); shell loads | No |

Evidence: `runtime/route-titles.json`

---

## Requirement pass/fail

| # | Requirement | Result | Evidence |
|---|-------------|--------|----------|
| 1 | Live deploy contains merged #682 and #692 | **PASS** | Production SHA `be5fa95…`; #682 + #692 ancestors |
| 2 | Public routes load; titles correct | **PASS** | All 200; titles match brand (no monogram hijack) |
| 3a | Valid email + telephone → success + Lux queue | **PASS** | Lead `cms6xiptm000bl204ls8c65b8` created (`runtime/valid-create.json`) |
| 3b | Missing email or telephone → clear validation | **PASS** | HTTP 400 `EMAIL_AND_TELEPHONE_REQUIRED` (`missing-email.json`, `missing-phone.json`) |
| 4a | Lead appears with source, email, telephone, created, stage, next action | **PARTIAL** | Create returns id/status/`new`; list/patch require Lux session — **auth blocker** (see below) |
| 4b | Stage progression `new → contacted → qualified → invited → closed` | **PARTIAL** | Stages encoded + unit-tested on deployed commit; **live authenticated progression not run** (no Lux session in agent env) |
| 4c | Operator notes save + persist after refresh | **BLOCKED** | Requires Lux tenant session |
| 4d | Private-client qualification save + reopen | **PARTIAL** | Unit tests PASS on shipped helpers; live UI not exercised without login |
| 4e | Missing-field flags + recommended next action | **PARTIAL** | Unit tests PASS; live UI not exercised |
| 4f | Residence shortlist association | **PARTIAL** | Unit tests PASS; live UI not exercised |
| 4g | Copy-ready invitation/shortlist draft | **PARTIAL** | Unit tests PASS; `send_disabled: true` in helper + `/change` UI copy |
| 4h | No live send action enabled | **PASS (code + unit)** | UI: “Send disabled — operator copy only”; draft `send_disabled: true` |
| 5 | Tenant isolation / no Core regression | **PASS with repair** | Lux list/patch unauth → 403; Core health OK; **defect found**: Core host create fell through to Lux — **repaired in this PR** (not yet on Production until merge+deploy) |
| 6 | Screenshots / structured runtime evidence | **PASS** | `screenshots/*.png` + `runtime/*.json` |

---

## Synthetic lead IDs

| ID | Host | Outcome | Notes |
|----|------|---------|-------|
| `cms6xiptm000bl204ls8c65b8` | lux.corpflowai.com | **Success** | Valid synthetic enquiry for Jan queue review |
| `cms6xiqgc000fl2043sfyo35l` | core.corpflowai.com | **Unwanted success (pre-repair)** | Created because create defaulted missing host tenant to `luxe-maurice`. Isolation repair in this PR rejects Core/unknown hosts with `TENANT_NOT_FOUND`. Mark as synthetic / ignore in Jan review. |

No real client data used (`@example.invalid` / synthetic names only).

---

## Screenshots / evidence links (in this PR)

- `artifacts/lux-693-live-verification/screenshots/home.png`
- `artifacts/lux-693-live-verification/screenshots/concierge.png`
- `artifacts/lux-693-live-verification/screenshots/properties.png`
- `artifacts/lux-693-live-verification/screenshots/about.png`
- `artifacts/lux-693-live-verification/screenshots/contact.png`
- `artifacts/lux-693-live-verification/screenshots/change.png` (unauthenticated shell — “Log in to view your queue”)
- `artifacts/lux-693-live-verification/runtime/*.json`
- Cloud artifact mirror: `/opt/cursor/artifacts/lux-693-verification/`

---

## Defects found and repair

### D1 — Core/unknown host concierge create → Lux queue (isolation)

- **Evidence:** `POST https://core.corpflowai.com/api/cmp/router?action=concierge-lead-create` returned 200 and lead `cms6xiqgc000fl2043sfyo35l` while Core `/api/tenant/site` reports `tenant_id: null`.
- **Cause:** `handleConciergeLeadCreate` used `getClientIdFromHostContext(req) || 'luxe-maurice'`.
- **Repair (this PR):** resolve tenant from host context / `resolveTenantFromHost`; return `404 TENANT_NOT_FOUND` when no mapped tenant host. Regression test `#693 concierge-lead-create must not default unknown/core hosts to luxe-maurice`.
- **Status:** Fixed in branch; **not live until this PR is merged and Production redeploys**. Lux public create path unchanged for `lux.corpflowai.com`.

### D2 — Authenticated `/change` CRM walkthrough not agent-runnable

- **Blocker type:** session / auth environment  
- **Evidence:** `GET /api/auth/me` → `logged_in: false`; `concierge-leads-list` → 403 Dormant Gate; `LUX_SMOKE_USERNAME` / `LUX_SMOKE_PASSWORD` **UNSET** in agent environment; `/change` screenshot shows “Log in to view your queue.”  
- **Owner:** Anton (provide smoke credentials to agent env) **or** Jan (run 5-minute sequence with his Lux login)  
- **Smallest action:** Jan logs into `https://lux.corpflowai.com/change` and runs the sequence below against synthetic lead `cms6xiptm000bl204ls8c65b8` (or a new synthetic concierge submit).

---

## Exact Jan test URL + 5-minute client test sequence

**Primary URL:** https://lux.corpflowai.com/  
**Public form:** https://lux.corpflowai.com/concierge  
**Operator desk:** https://lux.corpflowai.com/change  

Also see: `docs/LUX/JAN_TEST_PACKAGE_685.md`

### 5-minute sequence (synthetic data only)

1. Open https://lux.corpflowai.com/ — confirm private-curator first impression and correct tab title (not “monogram”).  
2. Open https://lux.corpflowai.com/concierge — try submit missing email or telephone → should block with a clear message.  
3. Submit a short **test** enquiry with both email and telephone (fictional). Confirm success / next-step message.  
4. Log into https://lux.corpflowai.com/change → LEADS · find the new enquiry (or `cms6xiptm000bl204ls8c65b8`). Confirm source, email, telephone, created time, stage, next action.  
5. Move stage `New → Contacted → Qualified → Invited` (optionally Closed); add an internal note; refresh — note should remain.  
6. Fill **Private-client qualification**; confirm Missing flags / Recommended next; Save; reopen.  
7. Open **Curated shortlist / invitation packet**; tick 1–2 residences; Copy draft text; confirm **Send disabled**.  

Reply pass/fail for Slices A / B / C per `docs/LUX/JAN_TEST_PACKAGE_685.md`.

---

## Delivery Reality Audit

```text
Delivery Reality Audit:
- Local fix exists: YES (Core→Lux create isolation repair + regression test + this evidence packet)
- Merged to main: NO for this repair PR; YES for #682/#692 (already on Production tip be5fa95)
- Production deployment ID: 5668253349
- Commit deployed: be5fa95ea0e4245f18c0493fd26b3118844498f0
- Live URLs tested: lux.corpflowai.com /, /concierge, /properties, /about, /contact, /property/lm-nc-ridge, /change; core.corpflowai.com/api/factory/health + isolation probes
- Expected vs actual result: Public + titles + concierge validation + successful Lux synthetic create PASS; authenticated CRM steps blocked without Lux session; Core create isolation defect found and patched in PR (pending merge/deploy)
- Client-facing flow usable: YES for public/concierge; /change CRM usable after Jan/Anton Lux login
- Final verdict: PARTIAL (agent) — public/form READY; CRM live auth walkthrough deferred to Jan login
```

---

## Final verdict

**READY FOR JAN** — on the Lux `corpflow_test` surface for public routes, titles, concierge email+telephone validation, and the operator CRM UI that ships on Production commit `be5fa95…`.

Caveats for Anton:

1. Agent could not complete authenticated CRM steps (no Lux session in env). Jan’s login closes that gap.  
2. Isolation repair for Core→Lux create is in this PR only — merge + Production deploy before treating that defect as live-fixed.  
3. Ignore / archive synthetic Core-leaked lead `cms6xiqgc000fl2043sfyo35l` if it appears in the Lux queue.

**Explicit non-actions:** no merge by agent, no deploy by agent, no env/secrets/DB/schema changes, no live client sends.
